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

export type ResponseMode = 'quick' | 'thoughtful' | 'contemplate'

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
   * Quick mode: Fast response using dynamically routed model based on question type
   * "OSQR is the AI that knows when to think"
   *
   * Routes to optimal model based on question type:
   * - factual/summarization → Fast model (Haiku/GPT-4o-mini)
   * - creative → Claude (best at creative writing, tone, nuance)
   * - coding → GPT-4o or Claude Sonnet (strong at code)
   * - analytical/reasoning → Best available based on complexity
   *
   * Time: ~5-15 seconds depending on model selected
   */
  private static async quickResponse(request: Omit<OSQRRequest, 'mode'>): Promise<OSQRResponse> {
    const { userMessage, panelAgents, context, includeDebate, userId } = request

    // Route the question to determine optimal model
    const routingDecision = routeQuestion(userMessage)
    const { recommendedModel, questionType, confidence, shouldSuggestAltOpinion } = routingDecision

    console.log(`OSQR: Quick mode - routing "${questionType}" question to ${recommendedModel.model} (confidence: ${confidence})`)

    // Build the quick agent with the routed model
    const quickAgent: PanelAgent = {
      id: 'osqr-quick',
      name: 'OSQR Quick',
      provider: recommendedModel.provider,
      modelName: recommendedModel.model,
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
          provider: recommendedModel.provider,
          model: recommendedModel.model,
        },
        confidence,
        shouldSuggestAltOpinion,
      },
    }
  }

  /**
   * Get a question-type-specific system prompt for Quick mode
   */
  private static getQuickModePrompt(questionType: QuestionType): string {
    const basePrompt = `You are OSQR, a smart and helpful assistant. Answer naturally, like a person would.

You have context about the user. Use it when it's relevant, ignore it when it's not. You know the difference.`

    // Add question-type specific guidance
    const typeGuidance: Record<QuestionType, string> = {
      factual: `

This is a factual question. Be direct and precise. Give the answer first, then brief context if needed.`,
      creative: `

This is a creative task. Be imaginative and engaging. Show personality and craft something memorable.`,
      coding: `

This is a coding question. Be practical and precise. Show working code, explain key decisions, and anticipate common pitfalls.`,
      analytical: `

This is an analytical question. Structure your comparison clearly. Use concrete examples and highlight key tradeoffs.`,
      reasoning: `

This is a reasoning question. Walk through the logic step by step. Make your chain of thought visible.`,
      summarization: `

This is a summarization request. Be concise and capture the essential points. Structure for easy scanning.`,
      conversational: `

This is casual conversation. Be warm and personable. Match the user's energy.`,
      high_stakes: `

This is a high-stakes question. Be thoughtful and thorough. Acknowledge uncertainty, present multiple perspectives, and help the user think through implications.`,
    }

    return basePrompt + (typeGuidance[questionType] || '')
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
   * TODO: Implement streaming version
   */
  static async *askStream(request: OSQRRequest): AsyncIterable<string> {
    // For now, just yield the full response
    const response = await this.ask(request)
    yield response.answer
  }
}
