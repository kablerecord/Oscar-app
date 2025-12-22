import { PanelOrchestrator, type PanelAgent, type PanelResponse } from './panel'
import { ProviderRegistry } from './providers'
import type { AIMessage, ProviderType } from './types'
import { getSynthesizerConfig, SETTING_DEFAULTS } from '@/lib/settings'
import { routeQuestion, type RoutingDecision, type QuestionType } from './model-router'
import { getOSQRIdentity, buildGKVIContext, getGlobalContext } from '@/lib/knowledge/gkvi'

/**
 * Get API key for a given provider
 */
function getApiKeyForProvider(provider: ProviderType): string {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || ''
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || ''
    case 'google':
      return process.env.GOOGLE_AI_API_KEY || ''
    case 'xai':
      return process.env.XAI_API_KEY || ''
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * OSQR - The main AI orchestrator
 *
 * OSQR acts as your personal AI assistant (like Jarvis from Iron Man).
 * When you ask OSQR a question:
 * 1. OSQR consults a panel of specialized AI agents
 * 2. The panel discusses and debates privately
 * 3. OSQR synthesizes their insights
 * 4. OSQR presents you with a single, refined answer
 */

export type ResponseMode = 'quick' | 'thoughtful' | 'contemplate' | 'council'

export interface OSQRRequest {
  userMessage: string
  panelAgents: PanelAgent[]
  context?: string // RAG context from knowledge base
  includeDebate?: boolean // Show panel discussion to user (debug mode)
  mode?: ResponseMode // Control response complexity and processing time
  userId?: string // Optional: user ID for personalized settings (synthesizer model, etc.)
  userLevel?: number // Optional: user's capability level (0-12) for GKVI context
}

export interface OSQRResponse {
  answer: string // OSQR's final synthesized answer
  panelDiscussion?: PanelResponse[] // Optional: panel responses (for transparency)
  roundtableDiscussion?: PanelResponse[] // Optional: panel reactions
  reasoning?: string // Optional: OSQR's reasoning process
  // New routing metadata - "OSQR knows when to think"
  routing?: {
    questionType: QuestionType
    modelUsed: { provider: ProviderType; model: string; name?: string }
    confidence: number // 0-1 scale
    shouldSuggestAltOpinion: boolean
  }
}

export class OSQR {
  /**
   * Build the OSQR system prompt dynamically from GKVI
   * This replaces the hardcoded prompt with modular, level-aware content
   */
  private static buildSystemPrompt(options: {
    userLevel?: number
    questionType?: string
  } = {}): string {
    // Get base OSQR identity
    const identity = getOSQRIdentity()

    // Get appropriate GKVI context based on user level and question type
    const gkviContext = buildGKVIContext({
      userLevel: options.userLevel,
      questionType: options.questionType,
    })

    // Always include artifacts guidance
    const artifactsGuidance = getGlobalContext('artifacts')

    return `${identity}

---

## OSQR CORE INDEX

${gkviContext}

---

${artifactsGuidance}`
  }

  // Keep a default prompt for backwards compatibility
  private static readonly OSQR_SYSTEM_PROMPT = OSQR.buildSystemPrompt()

  /**
   * Ask OSQR a question
   * OSQR will consult the panel and return a synthesized answer
   */
  static async ask(request: OSQRRequest): Promise<OSQRResponse> {
    const { userMessage, panelAgents, context, includeDebate = false, mode = 'thoughtful', userId } = request

    // Adjust processing based on response mode
    switch (mode) {
      case 'quick':
        return await this.quickResponse({ userMessage, panelAgents, context, includeDebate, userId })

      case 'contemplate':
        return await this.contemplativeResponse({ userMessage, panelAgents, context, includeDebate, userId })

      case 'thoughtful':
      default:
        return await this.thoughtfulResponse({ userMessage, panelAgents, context, includeDebate, userId })
    }
  }

  /**
   * Quick mode: Direct conversation with Claude Sonnet - like chatting on claude.ai
   *
   * No routing, no complex system prompts. Just Claude being Claude.
   * This gives users the same experience as chatting directly with Anthropic.
   *
   * Time: ~2-8 seconds (single model, no panel)
   */
  private static async quickResponse(request: Omit<OSQRRequest, 'mode'>): Promise<OSQRResponse> {
    const { userMessage, panelAgents, context, includeDebate, userId } = request

    // Still detect question type for metadata, but don't use it for routing
    const routingDecision = routeQuestion(userMessage)
    const { questionType, confidence, shouldSuggestAltOpinion } = routingDecision

    console.log(`OSQR: Quick mode - using Claude Sonnet 4 (like claude.ai)`)

    // Always use Claude Sonnet 4 - the same model users experience on claude.ai
    const quickAgent: PanelAgent = {
      id: 'osqr-quick',
      name: 'OSQR Quick',
      provider: 'anthropic',
      modelName: 'claude-sonnet-4-20250514',
      systemPrompt: this.getQuickModePrompt(questionType),
    }

    // Pass context - the model will naturally know when to use it
    const panelResponses = await PanelOrchestrator.askPanel({
      userMessage,
      agents: [quickAgent],
      context, // Include context - prompt will guide appropriate use
    })

    // Skip synthesis for simple questions - just return the agent response directly
    const answer = panelResponses[0]?.content || 'I apologize, but I encountered an error processing your question.'

    return {
      answer,
      panelDiscussion: includeDebate ? panelResponses : undefined,
      // Include routing metadata for the frontend
      routing: {
        questionType,
        modelUsed: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          name: 'Claude Sonnet 4',
        },
        confidence,
        shouldSuggestAltOpinion,
      },
    }
  }

  /**
   * Get a minimal system prompt for Quick mode
   * The goal is: fast, direct answers with NO commentary or fluff.
   */
  private static getQuickModePrompt(questionType: QuestionType): string {
    // Direct and clean - no commentary, no meta-observations about the user
    return `You are OSQR. Answer directly and concisely. Do NOT add commentary about patterns you notice, do NOT reference previous questions, and do NOT explain why you're answering a certain way. Just answer the question.`
  }

  /**
   * Thoughtful mode: Standard OSQR behavior with panel + roundtable
   * Best for: Most questions, balanced depth and speed
   * Time: ~20-40 seconds
   */
  private static async thoughtfulResponse(request: Omit<OSQRRequest, 'mode'>): Promise<OSQRResponse> {
    const { userMessage, panelAgents, context, includeDebate, userId, userLevel } = request

    // Step 1: Get initial responses from the panel
    console.log('OSQR: Thoughtful mode - consulting panel...')
    const panelResponses = await PanelOrchestrator.askPanel({
      userMessage,
      agents: panelAgents,
      context,
    })

    // Step 2: Run roundtable discussion with multiple agents
    let roundtableResponses: PanelResponse[] | undefined
    if (panelAgents.length > 1) {
      console.log('OSQR: Facilitating roundtable discussion...')
      roundtableResponses = await PanelOrchestrator.roundtable(
        {
          userMessage,
          agents: panelAgents,
          context,
        },
        panelResponses
      )
    }

    // Step 3: OSQR synthesizes the final answer
    console.log('OSQR: Synthesizing insights...')
    const finalAnswer = await this.synthesize({
      userMessage,
      panelResponses,
      roundtableResponses,
      context,
      userId,
      userLevel,
    })

    return {
      answer: finalAnswer,
      panelDiscussion: includeDebate ? panelResponses : undefined,
      roundtableDiscussion: includeDebate ? roundtableResponses : undefined,
    }
  }

  /**
   * Contemplate mode: Deep analysis with all agents + extended discussion
   * Best for: Complex decisions, strategic planning, nuanced topics
   * Time: ~60-90 seconds
   */
  private static async contemplativeResponse(request: Omit<OSQRRequest, 'mode'>): Promise<OSQRResponse> {
    const { userMessage, panelAgents, context, includeDebate, userId, userLevel } = request

    console.log('OSQR: Contemplate mode - deep analysis with full panel...')

    // Step 1: Get initial responses from ALL agents
    const panelResponses = await PanelOrchestrator.askPanel({
      userMessage,
      agents: panelAgents,
      context,
    })

    // Step 2: Extended roundtable discussion
    console.log('OSQR: Facilitating extended roundtable...')
    const roundtableResponses = await PanelOrchestrator.roundtable(
      {
        userMessage,
        agents: panelAgents,
        context,
      },
      panelResponses
    )

    // Step 3: Second round of discussion for deeper insights
    console.log('OSQR: Second round of deliberation...')
    const secondRoundResponses = await PanelOrchestrator.roundtable(
      {
        userMessage,
        agents: panelAgents,
        context,
      },
      roundtableResponses || panelResponses
    )

    // Step 4: OSQR synthesizes with extra depth instruction
    console.log('OSQR: Deep synthesis of all insights...')
    const finalAnswer = await this.synthesize({
      userMessage,
      panelResponses,
      roundtableResponses: secondRoundResponses,
      context,
      isDeepAnalysis: true,
      userId,
      userLevel,
    })

    return {
      answer: finalAnswer,
      panelDiscussion: includeDebate ? panelResponses : undefined,
      roundtableDiscussion: includeDebate ? secondRoundResponses : undefined,
    }
  }

  /**
   * OSQR synthesizes panel insights into a final answer
   */
  private static async synthesize(params: {
    userMessage: string
    panelResponses: PanelResponse[]
    roundtableResponses?: PanelResponse[]
    context?: string
    isDeepAnalysis?: boolean
    userId?: string // For user-specific synthesizer preferences
    userLevel?: number // For GKVI level-aware context
    questionType?: string // For GKVI question-type context
  }): Promise<string> {
    const { userMessage, panelResponses, roundtableResponses, context, isDeepAnalysis = false, userId, userLevel, questionType } = params

    // Build synthesis prompt
    const messages: AIMessage[] = []

    // System prompt - now built dynamically from GKVI
    const systemPrompt = this.buildSystemPrompt({ userLevel, questionType })
    messages.push({
      role: 'system',
      content: systemPrompt,
    })

    // Add user's original question
    messages.push({
      role: 'user',
      content: `User's question: ${userMessage}`,
    })

    // Add context if available
    if (context) {
      messages.push({
        role: 'system',
        content: `IMPORTANT - User's Knowledge Base Context:
This is information retrieved from the user's personal knowledge base - their own documents, projects, and history. This is about THEIR specific situation. When synthesizing the panel's responses, prioritize information from this context and reference specific details rather than giving generic advice.

--- KNOWLEDGE BASE ---
${context}
--- END KNOWLEDGE BASE ---`,
      })
    }

    // Add panel discussion summary
    const panelSummary = this.buildPanelSummary(panelResponses, roundtableResponses)
    messages.push({
      role: 'system',
      content: `Panel Discussion Summary:\n${panelSummary}`,
    })

    // Ask OSQR to synthesize
    const synthesisPrompt = isDeepAnalysis
      ? `Now synthesize all of this into your answer for me. This is a complex topic, so take your time to be thorough. What's your best answer after hearing from everyone?`
      : `Now give me your answer based on what the panel discussed. What do you think is the best response?`

    messages.push({
      role: 'user',
      content: synthesisPrompt,
    })

    // Get user's preferred synthesizer model (defaults to Claude)
    const synthConfig = userId
      ? await getSynthesizerConfig(userId)
      : { provider: 'anthropic' as const, model: SETTING_DEFAULTS.synthesizer_model as string }

    // Use the configured model for OSQR synthesis - Claude is the default voice of OSQR
    const osqrProvider = ProviderRegistry.getProvider(synthConfig.provider, {
      apiKey: getApiKeyForProvider(synthConfig.provider),
      model: synthConfig.model,
    })

    const answer = await osqrProvider.generate({
      messages,
      temperature: 0.7,
    })

    return answer
  }

  /**
   * Build a summary of the panel discussion
   */
  private static buildPanelSummary(
    panelResponses: PanelResponse[],
    roundtableResponses?: PanelResponse[]
  ): string {
    let summary = '=== Initial Panel Responses ===\n\n'

    panelResponses.forEach((response, idx) => {
      if (response.error) {
        summary += `Panel Member ${idx + 1}: [Error - ${response.error}]\n\n`
      } else {
        summary += `Panel Member ${idx + 1}:\n${response.content}\n\n`
      }
    })

    if (roundtableResponses && roundtableResponses.length > 0) {
      summary += '\n=== Roundtable Discussion (Reactions & Refinements) ===\n\n'

      roundtableResponses.forEach((response, idx) => {
        if (response.error) {
          summary += `Panel Member ${idx + 1}: [Error - ${response.error}]\n\n`
        } else {
          summary += `Panel Member ${idx + 1}:\n${response.content}\n\n`
        }
      })
    }

    return summary
  }

  /**
   * Stream OSQR's response (for better UX)
   * Runs panel discussions first (not streamed), then streams synthesis
   */
  static async *askStream(request: OSQRRequest): AsyncIterable<string> {
    const { userMessage, panelAgents, context, mode = 'thoughtful', userId, userLevel } = request

    switch (mode) {
      case 'quick':
        // Quick mode: stream directly from the provider
        yield* this.quickResponseStream({ userMessage, panelAgents, context, userId })
        break

      case 'contemplate':
        yield* this.contemplativeResponseStream({ userMessage, panelAgents, context, userId, userLevel })
        break

      case 'thoughtful':
      default:
        yield* this.thoughtfulResponseStream({ userMessage, panelAgents, context, userId, userLevel })
        break
    }
  }

  /**
   * Quick mode streaming: Direct streaming from Claude
   */
  private static async *quickResponseStream(request: Omit<OSQRRequest, 'mode' | 'includeDebate'>): AsyncIterable<string> {
    const { userMessage, context } = request
    const routingDecision = routeQuestion(userMessage)

    console.log(`OSQR: Quick mode streaming - using Claude Sonnet 4`)

    const provider = ProviderRegistry.getProvider('anthropic', {
      apiKey: getApiKeyForProvider('anthropic'),
      model: 'claude-sonnet-4-20250514',
    })

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: this.getQuickModePrompt(routingDecision.questionType),
      },
    ]

    if (context) {
      messages.push({
        role: 'system',
        content: `Context from user's knowledge base:\n${context}`,
      })
    }

    messages.push({ role: 'user', content: userMessage })

    // Use generateStream if available
    if (provider.generateStream) {
      yield* provider.generateStream({ messages, temperature: 0.3 })
    } else {
      // Fallback to non-streaming
      const response = await provider.generate({ messages, temperature: 0.3 })
      yield response
    }
  }

  /**
   * Thoughtful mode streaming: Panel discussion first, then stream synthesis
   */
  private static async *thoughtfulResponseStream(request: Omit<OSQRRequest, 'mode' | 'includeDebate'>): AsyncIterable<string> {
    const { userMessage, panelAgents, context, userId, userLevel } = request

    // Step 1: Get panel responses (not streamed - happens behind the scenes)
    console.log('OSQR: Thoughtful mode - consulting panel...')
    const panelResponses = await PanelOrchestrator.askPanel({
      userMessage,
      agents: panelAgents,
      context,
    })

    // Step 2: Roundtable (not streamed)
    let roundtableResponses: PanelResponse[] | undefined
    if (panelAgents.length > 1) {
      console.log('OSQR: Facilitating roundtable...')
      roundtableResponses = await PanelOrchestrator.roundtable(
        { userMessage, agents: panelAgents, context },
        panelResponses
      )
    }

    // Step 3: Stream the synthesis
    console.log('OSQR: Streaming synthesis...')
    yield* this.synthesizeStream({
      userMessage,
      panelResponses,
      roundtableResponses,
      context,
      userId,
      userLevel,
    })
  }

  /**
   * Contemplate mode streaming: Extended panel discussion, then stream synthesis
   */
  private static async *contemplativeResponseStream(request: Omit<OSQRRequest, 'mode' | 'includeDebate'>): AsyncIterable<string> {
    const { userMessage, panelAgents, context, userId, userLevel } = request

    console.log('OSQR: Contemplate mode - deep analysis...')

    // Step 1: Panel responses
    const panelResponses = await PanelOrchestrator.askPanel({
      userMessage,
      agents: panelAgents,
      context,
    })

    // Step 2: First roundtable
    console.log('OSQR: Extended roundtable...')
    const roundtableResponses = await PanelOrchestrator.roundtable(
      { userMessage, agents: panelAgents, context },
      panelResponses
    )

    // Step 3: Second roundtable for deeper insights
    console.log('OSQR: Second round of deliberation...')
    const secondRoundResponses = await PanelOrchestrator.roundtable(
      { userMessage, agents: panelAgents, context },
      roundtableResponses || panelResponses
    )

    // Step 4: Stream the synthesis
    console.log('OSQR: Streaming deep synthesis...')
    yield* this.synthesizeStream({
      userMessage,
      panelResponses,
      roundtableResponses: secondRoundResponses,
      context,
      isDeepAnalysis: true,
      userId,
      userLevel,
    })
  }

  /**
   * Stream the synthesis step
   */
  private static async *synthesizeStream(params: {
    userMessage: string
    panelResponses: PanelResponse[]
    roundtableResponses?: PanelResponse[]
    context?: string
    isDeepAnalysis?: boolean
    userId?: string
    userLevel?: number
    questionType?: string
  }): AsyncIterable<string> {
    const { userMessage, panelResponses, roundtableResponses, context, isDeepAnalysis = false, userId, userLevel, questionType } = params

    // Build synthesis prompt (same as non-streaming)
    const messages: AIMessage[] = []

    const systemPrompt = this.buildSystemPrompt({ userLevel, questionType })
    messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: `User's question: ${userMessage}` })

    if (context) {
      messages.push({
        role: 'system',
        content: `IMPORTANT - User's Knowledge Base Context:
This is information retrieved from the user's personal knowledge base - their own documents, projects, and history. This is about THEIR specific situation. When synthesizing the panel's responses, prioritize information from this context and reference specific details rather than giving generic advice.

--- KNOWLEDGE BASE ---
${context}
--- END KNOWLEDGE BASE ---`,
      })
    }

    const panelSummary = this.buildPanelSummary(panelResponses, roundtableResponses)
    messages.push({ role: 'system', content: `Panel Discussion Summary:\n${panelSummary}` })

    const synthesisPrompt = isDeepAnalysis
      ? `Now synthesize all of this into your answer for me. This is a complex topic, so take your time to be thorough. What's your best answer after hearing from everyone?`
      : `Now give me your answer based on what the panel discussed. What do you think is the best response?`

    messages.push({ role: 'user', content: synthesisPrompt })

    // Get user's preferred synthesizer model
    const synthConfig = userId
      ? await getSynthesizerConfig(userId)
      : { provider: 'anthropic' as const, model: SETTING_DEFAULTS.synthesizer_model as string }

    const osqrProvider = ProviderRegistry.getProvider(synthConfig.provider, {
      apiKey: getApiKeyForProvider(synthConfig.provider),
      model: synthConfig.model,
    })

    // Stream the response
    if (osqrProvider.generateStream) {
      yield* osqrProvider.generateStream({ messages, temperature: 0.7 })
    } else {
      // Fallback to non-streaming
      const answer = await osqrProvider.generate({ messages, temperature: 0.7 })
      yield answer
    }
  }
}
