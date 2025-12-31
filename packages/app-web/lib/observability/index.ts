/**
 * OSQR Observability System
 *
 * Centralized logging and observability for OSQR operations:
 * - Routing decisions
 * - Model calls and responses
 * - Constitutional checks
 * - TIL extractions
 * - Errors and costs
 *
 * In development, logs to console. In production, could be extended
 * to send to external services (DataDog, Sentry, etc.)
 */

// ============================================================================
// Types
// ============================================================================

export type EventType =
  | 'routing_decision'
  | 'model_call'
  | 'model_response'
  | 'constitutional_check'
  | 'til_extraction'
  | 'til_outcome'
  | 'embedding_generated'
  | 'semantic_search'
  | 'error'
  | 'cost_incurred'

export interface OSQREvent {
  type: EventType
  timestamp: Date
  userId?: string
  sessionId?: string
  projectId?: string
  data: Record<string, unknown>
}

export interface RoutingDecision {
  taskType: string
  complexity: number
  selectedModel: string
  selectedMode: string
  confidence: number
  reasons: string[]
}

export interface ModelCall {
  model: string
  provider: 'anthropic' | 'openai' | 'google' | 'xai' | 'groq'
  inputTokens: number
  promptLength: number
  purpose: string
}

export interface ModelResponse {
  model: string
  provider: 'anthropic' | 'openai' | 'google' | 'xai' | 'groq'
  outputTokens: number
  inputTokens: number
  durationMs: number
  success: boolean
  error?: string
}

export interface ConstitutionalCheck {
  phase: 'input' | 'output'
  passed: boolean
  violations: string[]
  confidence: number
}

export interface TILExtraction {
  commitmentCount: number
  actionCount: number
  reminderCount: number
  durationMs: number
}

export interface EmbeddingEvent {
  model: string
  textLength: number
  batchSize: number
  durationMs: number
  cached: boolean
}

export interface SemanticSearchEvent {
  query: string
  resultCount: number
  topSimilarity: number
  durationMs: number
  source: 'memory_vault' | 'document_index' | 'cross_project'
}

export interface CostEvent {
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
  estimatedCostUSD: number
  purpose: string
}

// ============================================================================
// Pricing (approximate as of Dec 2024)
// ============================================================================

const MODEL_PRICING: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  // Anthropic
  'claude-opus-4-20250514': { inputPer1k: 0.015, outputPer1k: 0.075 },
  'claude-sonnet-4-20250514': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-3-5-haiku-20241022': { inputPer1k: 0.001, outputPer1k: 0.005 },
  // OpenAI
  'gpt-4o': { inputPer1k: 0.005, outputPer1k: 0.015 },
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'text-embedding-3-small': { inputPer1k: 0.00002, outputPer1k: 0 },
  'text-embedding-ada-002': { inputPer1k: 0.0001, outputPer1k: 0 },
  // Google
  'gemini-1.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'gemini-1.5-flash': { inputPer1k: 0.000075, outputPer1k: 0.0003 },
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) {
    // Default to GPT-4o pricing as a conservative estimate
    return (inputTokens * 0.005 + outputTokens * 0.015) / 1000
  }
  return (inputTokens * pricing.inputPer1k + outputTokens * pricing.outputPer1k) / 1000
}

// ============================================================================
// Observability Class
// ============================================================================

class OSQRObservability {
  private events: OSQREvent[] = []
  private sessionCosts: Map<string, number> = new Map()

  /**
   * Log a generic event
   */
  async log(event: Omit<OSQREvent, 'timestamp'>): Promise<void> {
    const fullEvent: OSQREvent = {
      ...event,
      timestamp: new Date(),
    }

    this.events.push(fullEvent)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[OSQR ${event.type.toUpperCase()}]`
      console.log(prefix, JSON.stringify(event.data, null, 2))
    }

    // In production, could send to external service
    // await this.sendToExternalService(fullEvent)
  }

  /**
   * Log a routing decision
   */
  async logRoutingDecision(decision: RoutingDecision, userId?: string, sessionId?: string): Promise<void> {
    await this.log({
      type: 'routing_decision',
      userId,
      sessionId,
      data: {
        taskType: decision.taskType,
        complexity: decision.complexity,
        selectedModel: decision.selectedModel,
        selectedMode: decision.selectedMode,
        confidence: decision.confidence,
        reasons: decision.reasons,
      },
    })

    console.log(
      `[OSQR Router] ${decision.taskType} (complexity: ${decision.complexity}) → ${decision.selectedModel} via ${decision.selectedMode}`
    )
  }

  /**
   * Log a model call (before the API request)
   */
  async logModelCall(call: ModelCall, userId?: string, sessionId?: string): Promise<void> {
    await this.log({
      type: 'model_call',
      userId,
      sessionId,
      data: {
        model: call.model,
        provider: call.provider,
        inputTokens: call.inputTokens,
        promptLength: call.promptLength,
        purpose: call.purpose,
      },
    })

    console.log(
      `[OSQR Model Call] ${call.provider}/${call.model} - ${call.purpose} (~${call.inputTokens} tokens)`
    )
  }

  /**
   * Log a model response (after the API request)
   */
  async logModelResponse(response: ModelResponse, userId?: string, sessionId?: string): Promise<void> {
    const cost = estimateCost(response.model, response.inputTokens, response.outputTokens)

    await this.log({
      type: 'model_response',
      userId,
      sessionId,
      data: {
        model: response.model,
        provider: response.provider,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        durationMs: response.durationMs,
        success: response.success,
        error: response.error,
        estimatedCostUSD: cost,
      },
    })

    // Track session costs
    if (sessionId) {
      const currentCost = this.sessionCosts.get(sessionId) || 0
      this.sessionCosts.set(sessionId, currentCost + cost)
    }

    const status = response.success ? 'OK' : `ERROR: ${response.error}`
    console.log(
      `[OSQR Model Response] ${response.provider}/${response.model} - ${response.durationMs}ms, ` +
        `${response.inputTokens}/${response.outputTokens} tokens, $${cost.toFixed(6)} - ${status}`
    )
  }

  /**
   * Log a constitutional check
   */
  async logConstitutionalCheck(
    check: ConstitutionalCheck,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.log({
      type: 'constitutional_check',
      userId,
      sessionId,
      data: {
        phase: check.phase,
        passed: check.passed,
        violations: check.violations,
        confidence: check.confidence,
      },
    })

    const status = check.passed ? 'PASSED' : `BLOCKED (${check.violations.length} violations)`
    console.log(`[OSQR Constitutional] ${check.phase.toUpperCase()} ${status}`)
  }

  /**
   * Log TIL extraction
   */
  async logTILExtraction(extraction: TILExtraction, userId?: string, sessionId?: string): Promise<void> {
    await this.log({
      type: 'til_extraction',
      userId,
      sessionId,
      data: {
        commitmentCount: extraction.commitmentCount,
        actionCount: extraction.actionCount,
        reminderCount: extraction.reminderCount,
        durationMs: extraction.durationMs,
      },
    })

    console.log(
      `[OSQR TIL] Extracted: ${extraction.commitmentCount} commitments, ` +
        `${extraction.actionCount} actions, ${extraction.reminderCount} reminders (${extraction.durationMs}ms)`
    )
  }

  /**
   * Log embedding generation
   */
  async logEmbedding(event: EmbeddingEvent, userId?: string, sessionId?: string): Promise<void> {
    await this.log({
      type: 'embedding_generated',
      userId,
      sessionId,
      data: {
        model: event.model,
        textLength: event.textLength,
        batchSize: event.batchSize,
        durationMs: event.durationMs,
        cached: event.cached,
      },
    })

    if (process.env.NODE_ENV === 'development') {
      const cacheStatus = event.cached ? '(cached)' : ''
      console.log(
        `[OSQR Embedding] ${event.batchSize} texts, ${event.textLength} chars, ` +
          `${event.durationMs}ms ${cacheStatus}`
      )
    }
  }

  /**
   * Log semantic search
   */
  async logSemanticSearch(event: SemanticSearchEvent, userId?: string, sessionId?: string): Promise<void> {
    await this.log({
      type: 'semantic_search',
      userId,
      sessionId,
      data: {
        query: event.query.slice(0, 100), // Truncate for logging
        resultCount: event.resultCount,
        topSimilarity: event.topSimilarity,
        durationMs: event.durationMs,
        source: event.source,
      },
    })

    console.log(
      `[OSQR Search] ${event.source}: ${event.resultCount} results (top: ${event.topSimilarity.toFixed(3)}) in ${event.durationMs}ms`
    )
  }

  /**
   * Log an error
   */
  async logError(
    error: Error,
    context: Record<string, unknown>,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.log({
      type: 'error',
      userId,
      sessionId,
      data: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        ...context,
      },
    })

    console.error(`[OSQR Error] ${error.name}: ${error.message}`, context)
  }

  /**
   * Log a cost event
   */
  async logCost(cost: CostEvent, userId?: string, sessionId?: string): Promise<void> {
    await this.log({
      type: 'cost_incurred',
      userId,
      sessionId,
      data: {
        model: cost.model,
        provider: cost.provider,
        inputTokens: cost.inputTokens,
        outputTokens: cost.outputTokens,
        estimatedCostUSD: cost.estimatedCostUSD,
        purpose: cost.purpose,
      },
    })
  }

  /**
   * Get total cost for a session
   */
  getSessionCost(sessionId: string): number {
    return this.sessionCosts.get(sessionId) || 0
  }

  /**
   * Get recent events (for debugging)
   */
  getRecentEvents(limit = 100): OSQREvent[] {
    return this.events.slice(-limit)
  }

  /**
   * Clear events (for testing)
   */
  clearEvents(): void {
    this.events = []
    this.sessionCosts.clear()
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const observability = new OSQRObservability()

// Re-export types for convenience
export type { RoutingDecision as RoutingDecisionData }
export type { ModelCall as ModelCallData }
export type { ModelResponse as ModelResponseData }
