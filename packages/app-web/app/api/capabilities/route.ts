import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { ProviderRegistry } from '@/lib/ai/providers'
import { generateImage } from '@/lib/render/image-generator'
import type { CapabilityType } from '@/components/oscar/CapabilityBar'

// ============================================================================
// Capability Router Types and Implementation
// ============================================================================

interface WebSearchSource {
  title: string
  url: string
  snippet: string
  publishedDate?: string
}

interface WebSearchResult {
  answer: string
  sources: WebSearchSource[]
  searchQueries: string[]
  tokensUsed?: number
}

interface CodeExecutionResult {
  success: boolean
  code: string
  language?: string
  output?: string
  error?: string
  executionTime: number
  visualizations?: { type: string; data: string; title?: string }[]
}

interface ResearchSource {
  title: string
  url: string
  snippet?: string
  citationIndex?: number
}

interface ResearchSection {
  heading: string
  content: string
}

interface ResearchReport {
  title: string
  summary: string
  sections: ResearchSection[]
  keyFindings: string[]
  sources: ResearchSource[]
  tokensUsed: number
  totalTimeMs: number
}

/**
 * Capability Router Configuration
 */
interface CapabilityRouterConfig {
  anthropicApiKey?: string
  openaiApiKey?: string
  googleApiKey?: string
  trackCosts?: boolean
}

/**
 * CapabilityRouter - Routes to AI capabilities
 */
class CapabilityRouter {
  private config: CapabilityRouterConfig

  constructor(config: CapabilityRouterConfig = {}) {
    this.config = config
  }

  /**
   * Perform web search using Claude's native web_search tool
   */
  async webSearch(query: string): Promise<WebSearchResult> {
    const apiKey = this.config.anthropicApiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        tools: [{ type: 'web_search', name: 'web_search' }],
        messages: [{ role: 'user', content: query }],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const message = await response.json()
    return this.parseWebSearchResponse(message)
  }

  private parseWebSearchResponse(message: any): WebSearchResult {
    const sources: WebSearchSource[] = []
    let answer = ''
    const searchQueries: string[] = []

    for (const block of message.content || []) {
      if (block.type === 'text') {
        answer += block.text
      } else if (block.type === 'tool_use' && block.name === 'web_search') {
        const query = block.input?.query as string
        if (query) searchQueries.push(query)
      } else if (block.type === 'web_search_tool_result') {
        for (const result of block.content || []) {
          if (result.type === 'web_search_result') {
            sources.push({
              title: result.title,
              url: result.url,
              snippet: '',
              publishedDate: result.page_age,
            })
          }
        }
      }
    }

    return {
      answer,
      sources,
      searchQueries,
      tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
    }
  }

  /**
   * Execute code using Claude's native code_execution tool
   */
  async executeCode(query: string): Promise<CodeExecutionResult> {
    const apiKey = this.config.anthropicApiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    const startTime = Date.now()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'code-execution-2025-01-24',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        tools: [{ type: 'code_execution', name: 'code_execution' }],
        messages: [
          {
            role: 'user',
            content: `Please write and execute Python code to accomplish this task: ${query}`,
          },
        ],
      }),
    })

    const executionTime = Date.now() - startTime

    if (!response.ok) {
      const error = await response.text()
      return {
        success: false,
        code: '',
        language: 'python',
        error: `API error: ${response.status} - ${error}`,
        executionTime,
      }
    }

    const message = await response.json()
    return this.parseCodeExecutionResponse(message, executionTime)
  }

  private parseCodeExecutionResponse(message: any, executionTime: number): CodeExecutionResult {
    let code = ''
    let output = ''
    let error: string | undefined
    const visualizations: { type: string; data: string; title?: string }[] = []

    for (const block of message.content || []) {
      if (block.type === 'text') {
        // Extract code from text if present
        const codeMatch = block.text.match(/```python\n([\s\S]*?)```/)
        if (codeMatch) {
          code = codeMatch[1]
        }
        output += block.text
      } else if (block.type === 'tool_use' && block.name === 'code_execution') {
        code = block.input?.code || code
      } else if (block.type === 'code_execution_tool_result') {
        const execResult = block.content
        if (execResult?.stdout) output = execResult.stdout
        if (execResult?.stderr) error = execResult.stderr
        if (execResult?.return_value) output += '\n' + execResult.return_value

        // Handle file outputs (charts, images)
        if (execResult?.files) {
          for (const file of execResult.files) {
            if (file.media_type?.startsWith('image/')) {
              visualizations.push({
                type: 'image',
                data: `data:${file.media_type};base64,${file.content}`,
                title: file.name,
              })
            }
          }
        }
      }
    }

    return {
      success: !error,
      code,
      language: 'python',
      output: error ? undefined : output.trim(),
      error,
      executionTime,
      visualizations: visualizations.length > 0 ? visualizations : undefined,
    }
  }

  /**
   * Perform deep research with sub-questions and synthesis
   */
  async deepResearch(options: {
    query: string
    depth?: 'quick' | 'standard' | 'comprehensive'
    useCouncil?: boolean
  }): Promise<ResearchReport> {
    const apiKey = this.config.anthropicApiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    const startTime = Date.now()
    const { query, depth = 'standard' } = options

    // Step 1: Generate sub-questions
    const subQuestionsResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `You are a research assistant. Break down this research query into ${depth === 'quick' ? '3' : depth === 'comprehensive' ? '7' : '5'} focused sub-questions that will help gather comprehensive information.

Query: ${query}

Return ONLY a JSON array of questions, no explanation. Example: ["Question 1?", "Question 2?"]`,
          },
        ],
      }),
    })

    if (!subQuestionsResponse.ok) {
      throw new Error(`Failed to generate sub-questions: ${await subQuestionsResponse.text()}`)
    }

    const subQuestionsData = await subQuestionsResponse.json()
    let subQuestions: string[] = []
    try {
      const text = subQuestionsData.content?.[0]?.text || '[]'
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        subQuestions = JSON.parse(jsonMatch[0])
      }
    } catch {
      subQuestions = [query]
    }

    // Step 2: Search each sub-question
    const allSources: ResearchSource[] = []
    const syntheses: string[] = []

    for (const subQ of subQuestions.slice(0, 5)) {
      try {
        const searchResult = await this.webSearch(subQ)
        for (const source of searchResult.sources) {
          allSources.push({
            title: source.title,
            url: source.url,
            snippet: source.snippet,
            citationIndex: allSources.length + 1,
          })
        }
        syntheses.push(`**${subQ}**\n${searchResult.answer}`)
      } catch {
        // Continue on individual search failures
      }
    }

    // Step 3: Synthesize into report
    const synthesisResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: `You are a research analyst. Synthesize the following research findings into a comprehensive report.

Original Query: ${query}

Research Findings:
${syntheses.join('\n\n---\n\n')}

Create a JSON report with this structure:
{
  "title": "Report title",
  "summary": "2-3 paragraph executive summary",
  "sections": [{"heading": "Section Title", "content": "Section content with [1] style citations"}],
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"]
}

Return ONLY the JSON, no other text.`,
          },
        ],
      }),
    })

    if (!synthesisResponse.ok) {
      throw new Error(`Failed to synthesize report: ${await synthesisResponse.text()}`)
    }

    const synthesisData = await synthesisResponse.json()
    let report: Partial<ResearchReport> = {}
    try {
      const text = synthesisData.content?.[0]?.text || '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0])
      }
    } catch {
      report = {
        title: `Research: ${query.slice(0, 50)}`,
        summary: syntheses.join('\n\n'),
        sections: [{ heading: 'Findings', content: syntheses.join('\n\n') }],
        keyFindings: ['Research synthesis complete'],
      }
    }

    const tokensUsed =
      (subQuestionsData.usage?.input_tokens || 0) +
      (subQuestionsData.usage?.output_tokens || 0) +
      (synthesisData.usage?.input_tokens || 0) +
      (synthesisData.usage?.output_tokens || 0)

    return {
      title: report.title || `Research: ${query}`,
      summary: report.summary || '',
      sections: report.sections || [],
      keyFindings: report.keyFindings || [],
      sources: allSources,
      tokensUsed,
      totalTimeMs: Date.now() - startTime,
    }
  }
}

// Singleton router instance
let capabilityRouter: CapabilityRouter | null = null

function getCapabilityRouter(): CapabilityRouter {
  if (!capabilityRouter) {
    capabilityRouter = new CapabilityRouter({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      googleApiKey: process.env.GOOGLE_AI_API_KEY,
      trackCosts: true,
    })
  }
  return capabilityRouter
}

/**
 * Capabilities API - Unified endpoint for AI capabilities
 *
 * This route orchestrates various AI capabilities based on user selection:
 * - auto: Let OSQR decide what capabilities to use based on query analysis
 * - web_search: Search the web for current information
 * - code_execution: Run code in a sandbox (E2B - future)
 * - image_generation: Generate images with DALL-E
 * - vision_analysis: Analyze images using vision models
 * - deep_research: Comprehensive multi-source research
 * - voice_input: Transcribe audio (handled by /transcribe)
 * - voice_output: Text-to-speech (handled by /speak)
 */

const RequestSchema = z.object({
  query: z.string().min(1),
  workspaceId: z.string(),
  capabilities: z.object({
    mode: z.enum(['auto', 'explicit']),
    enabledCapabilities: z.array(z.string()),
  }),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document', 'audio']),
    url: z.string(),
    name: z.string().optional(),
    mimeType: z.string().optional(),
  })).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

export interface CapabilityResponse {
  text: string
  codeOutput?: {
    code: string
    language: string
    output?: string
    error?: string
  }
  images?: {
    url: string
    prompt: string
    revisedPrompt?: string
  }[]
  sources?: {
    title: string
    url: string
    snippet: string
  }[]
  report?: {
    title: string
    summary: string
    sections: { heading: string; content: string }[]
    sources: { title: string; url: string }[]
  }
  audioOutput?: {
    url: string
    duration: number
  }
  metadata: {
    capabilitiesUsed: CapabilityType[]
    processingTimeMs: number
    estimatedCost?: number
  }
}

// Detect which capabilities are needed based on query content
function detectCapabilities(query: string, attachments?: { type: string }[]): CapabilityType[] {
  const capabilities: CapabilityType[] = []
  const q = query.toLowerCase()

  // Check for image attachments → vision analysis
  if (attachments?.some(a => a.type === 'image')) {
    capabilities.push('vision_analysis')
  }

  // Web search indicators
  const searchPatterns = [
    /\b(search|find|look up|latest|current|recent|today|news|weather)\b/i,
    /\b(what is|who is|when did|where is)\b.*\b(now|today|2024|2025)\b/i,
    /\b(stock|price|score|result)\b/i,
  ]
  if (searchPatterns.some(p => p.test(q))) {
    capabilities.push('web_search')
  }

  // Code execution indicators
  const codePatterns = [
    /\b(calculate|compute|run|execute|code|python|javascript)\b/i,
    /\b(sum|average|total|analyze data|chart|graph)\b/i,
    /\d+\s*[\+\-\*\/\^]\s*\d+/, // Math expressions
  ]
  if (codePatterns.some(p => p.test(q))) {
    capabilities.push('code_execution')
  }

  // Image generation indicators
  const imageGenPatterns = [
    /\b(generate|create|make|draw|design|render)\b.*\b(image|picture|photo|illustration|art)\b/i,
    /\b(image|picture|photo|illustration|art)\b.*\b(of|showing|with)\b/i,
    /^\/image\s/i,
  ]
  if (imageGenPatterns.some(p => p.test(q))) {
    capabilities.push('image_generation')
  }

  // Research indicators
  const researchPatterns = [
    /\b(research|analyze|compare|comprehensive|deep dive|investigate)\b/i,
    /^\/research\s/i,
    /\b(pros and cons|advantages|disadvantages|analysis)\b/i,
  ]
  if (researchPatterns.some(p => p.test(q))) {
    capabilities.push('deep_research')
  }

  return capabilities
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Auth check
    const session = await getServerSession()
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session?.user as { id?: string })?.id || session?.user?.email || 'dev-user'
    const body = await req.json()
    const { query, workspaceId, capabilities, attachments, conversationHistory } = RequestSchema.parse(body)

    // Determine which capabilities to use
    let capabilitiesToUse: CapabilityType[] = []

    if (capabilities.mode === 'auto') {
      // Auto-detect based on query analysis
      capabilitiesToUse = detectCapabilities(query, attachments)
    } else {
      // Use explicitly selected capabilities
      capabilitiesToUse = capabilities.enabledCapabilities as CapabilityType[]
    }

    // If no capabilities detected in auto mode, just do text response
    if (capabilitiesToUse.length === 0) {
      capabilitiesToUse = [] // Will fall through to standard text response
    }

    const response: CapabilityResponse = {
      text: '',
      metadata: {
        capabilitiesUsed: capabilitiesToUse,
        processingTimeMs: 0,
      },
    }

    // Process each capability
    const promises: Promise<void>[] = []

    // Image generation
    if (capabilitiesToUse.includes('image_generation')) {
      promises.push((async () => {
        const imagePrompt = query.replace(/^\/image\s*/i, '').trim()
        const result = await generateImage({ prompt: imagePrompt })
        if (result.success) {
          response.images = [{
            url: result.content.imageUrl,
            prompt: result.content.prompt,
            revisedPrompt: result.content.revisedPrompt,
          }]
          response.text += `\n\nI've generated an image based on your request: "${result.content.revisedPrompt || imagePrompt}"`
        } else {
          response.text += `\n\nI couldn't generate the image: ${result.error.message}`
        }
      })())
    }

    // Vision analysis
    if (capabilitiesToUse.includes('vision_analysis') && attachments?.some(a => a.type === 'image')) {
      promises.push((async () => {
        const imageAttachments = attachments.filter(a => a.type === 'image')

        // Use Claude or GPT-4V for vision
        const provider = ProviderRegistry.getProvider('anthropic', {
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          model: 'claude-sonnet-4-20250514',
        })

        const visionPrompt = `Analyze this image and answer the user's question: ${query}`

        // Note: This is a simplified implementation. Real vision API would use image URLs directly.
        const visionResponse = await provider.generate({
          messages: [
            { role: 'system', content: 'You are a helpful assistant that can analyze images.' },
            { role: 'user', content: `${visionPrompt}\n\n[Image: ${imageAttachments[0].url}]` },
          ],
          temperature: 0.3,
        })

        response.text += visionResponse
      })())
    }

    // Web search using Anthropic's native web_search tool
    if (capabilitiesToUse.includes('web_search')) {
      promises.push((async () => {
        try {
          const router = getCapabilityRouter()
          const searchResult = await router.webSearch(query)

          response.sources = searchResult.sources.map(s => ({
            title: s.title,
            url: s.url,
            snippet: s.snippet,
          }))

          response.text += `\n\n${searchResult.answer}`
        } catch (error) {
          console.error('[Web Search] Error:', error)
          response.text += `\n\n[Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}]`
        }
      })())
    }

    // Code execution using Claude's native code_execution tool
    if (capabilitiesToUse.includes('code_execution')) {
      promises.push((async () => {
        try {
          const router = getCapabilityRouter()
          const execResult = await router.executeCode(query)

          response.codeOutput = {
            code: execResult.code,
            language: execResult.language || 'python',
            output: execResult.output,
            error: execResult.error,
          }

          if (execResult.visualizations?.length) {
            // Add visualizations as images
            response.images = execResult.visualizations.map(v => ({
              url: v.data, // base64 data URL
              prompt: v.title || 'Code visualization',
            }))
          }

          response.text += `\n\nHere's the result:\n\`\`\`${execResult.language || 'python'}\n${execResult.code}\n\`\`\``
          if (execResult.output) {
            response.text += `\n\nOutput:\n\`\`\`\n${execResult.output}\n\`\`\``
          }
          if (execResult.error) {
            response.text += `\n\nError:\n\`\`\`\n${execResult.error}\n\`\`\``
          }
        } catch (error) {
          console.error('[Code Execution] Error:', error)
          response.text += `\n\n[Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}]`
        }
      })())
    }

    // Deep research using multi-source synthesis
    if (capabilitiesToUse.includes('deep_research')) {
      promises.push((async () => {
        try {
          const router = getCapabilityRouter()

          // Determine depth based on query or default to standard
          const depth = query.toLowerCase().includes('comprehensive') ? 'comprehensive' : 'standard'

          const report = await router.deepResearch({
            query: query.replace(/^\/research\s*/i, ''),
            depth,
            useCouncil: depth === 'comprehensive',
          })

          response.report = {
            title: report.title,
            summary: report.summary,
            sections: report.sections.map(s => ({
              heading: s.heading,
              content: s.content,
            })),
            sources: report.sources.map(s => ({
              title: s.title,
              url: s.url,
            })),
          }

          response.text += `\n\n## ${report.title}\n\n${report.summary}`

          if (report.keyFindings?.length) {
            response.text += `\n\n### Key Findings\n${report.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
          }
        } catch (error) {
          console.error('[Deep Research] Error:', error)
          response.text += `\n\n[Research failed: ${error instanceof Error ? error.message : 'Unknown error'}]`
        }
      })())
    }

    // Wait for all capability processing
    await Promise.all(promises)

    // If no specific capabilities, generate standard text response
    if (capabilitiesToUse.length === 0 || !response.text) {
      const provider = ProviderRegistry.getProvider('anthropic', {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: 'claude-sonnet-4-20250514',
      })

      const messages = [
        { role: 'system' as const, content: 'You are OSQR, a helpful AI assistant.' },
        ...(conversationHistory || []).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: query },
      ]

      const textResponse = await provider.generate({
        messages,
        temperature: 0.7,
      })

      response.text = textResponse
    }

    // Calculate processing time
    response.metadata.processingTimeMs = Date.now() - startTime

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Capabilities API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
