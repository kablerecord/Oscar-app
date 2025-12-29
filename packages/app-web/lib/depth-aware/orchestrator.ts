/**
 * Depth-Aware Intelligence Orchestrator (Phase 7)
 *
 * Main entry point for the depth-aware intelligence system.
 * Coordinates all layers and returns structured results for OSQR.
 *
 * Flow:
 * 1. Check answer cache (Layer 1)
 * 2. If no cache hit, check escalation signals (Layer 2)
 * 3. If escalation needed and consented, run retrieval (Layer 3)
 * 4. Return structured result with metadata
 *
 * @see docs/builds/DEPTH_AWARE_INTELLIGENCE_BUILD.md
 */

import { findCachedAnswer, cacheAnswer, type CacheHit } from './answer-cache'
import { getUserInventory, findRelevantDocuments, type DocumentInventoryEntry } from './vault-inventory'
import { shouldEscalate, buildEscalationContext, type EscalationDecision } from './escalation'
import { validateCachedAnswer, type ValidationResult } from './validation'
import { retrieveAndSummarize, type RetrievalResult } from './retrieval-agent'

// =============================================================================
// TYPES
// =============================================================================

export interface DepthAwareOptions {
  userId: string
  question: string
  mode: 'quick' | 'thoughtful' | 'contemplate' | 'council'
  conversationHistory?: Array<{ role: string; content: string }>
  skipCache?: boolean
  forceRetrieval?: boolean
  cacheNewAnswers?: boolean
}

export interface DepthAwareResult {
  // What happened
  cacheHit: CacheHit | null
  escalationDecision: EscalationDecision | null
  retrievalResult: RetrievalResult | null
  validationResult: ValidationResult | null

  // Computed outputs
  cachedAnswer: string | null
  vaultContext: string | null
  vaultAwareness: VaultAwareness

  // Response metadata
  metadata: ResponseMetadata
}

export interface VaultAwareness {
  totalDocuments: number
  relevantDocuments: number
  documentsSearched: boolean
  escalationOffered: boolean
  escalationAccepted: boolean
}

export interface ResponseMetadata {
  knowledgeSource: 'cache' | 'reasoning' | 'vault' | 'hybrid'
  cacheHit: boolean
  cacheValidated: boolean
  layersUsed: number[] // [1], [1, 2], [1, 2, 3]
  latencyMs: number
  suggestedPrompt?: string
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Get depth-aware context for a question
 *
 * This is the main entry point called by OSQR's ask route.
 */
export async function getDepthAwareContext(
  options: DepthAwareOptions
): Promise<DepthAwareResult> {
  const startTime = Date.now()
  const {
    userId,
    question,
    mode,
    conversationHistory,
    skipCache = false,
    forceRetrieval = false,
    cacheNewAnswers = true,
  } = options

  // Initialize result
  const result: DepthAwareResult = {
    cacheHit: null,
    escalationDecision: null,
    retrievalResult: null,
    validationResult: null,
    cachedAnswer: null,
    vaultContext: null,
    vaultAwareness: {
      totalDocuments: 0,
      relevantDocuments: 0,
      documentsSearched: false,
      escalationOffered: false,
      escalationAccepted: false,
    },
    metadata: {
      knowledgeSource: 'reasoning',
      cacheHit: false,
      cacheValidated: false,
      layersUsed: [1],
      latencyMs: 0,
    },
  }

  try {
    // Get vault inventory for awareness
    const inventory = await getUserInventory(userId)
    result.vaultAwareness.totalDocuments = inventory.length

    // =========================================================================
    // LAYER 1: Answer Cache
    // =========================================================================

    if (!skipCache) {
      const cacheHit = await findCachedAnswer(question, userId, {
        includeGlobal: true,
        maxAgeDays: 30,
        minConfidence: 0.5,
      })

      if (cacheHit) {
        result.cacheHit = cacheHit
        result.metadata.cacheHit = true

        // Validate if needed
        if (cacheHit.needsValidation) {
          const validation = await validateCachedAnswer(
            cacheHit.questionText,
            cacheHit.answerText,
            question
          )
          result.validationResult = validation
          result.metadata.cacheValidated = true

          if (validation.isValid && validation.confidence > 0.7) {
            // Cache is valid - use it
            result.cachedAnswer = cacheHit.answerText
            result.metadata.knowledgeSource = 'cache'
            result.metadata.latencyMs = Date.now() - startTime
            return result
          }
          // Cache invalid - continue to escalation check
        } else {
          // Cache doesn't need validation - use it
          result.cachedAnswer = cacheHit.answerText
          result.metadata.knowledgeSource = 'cache'
          result.metadata.latencyMs = Date.now() - startTime
          return result
        }
      }
    }

    // =========================================================================
    // LAYER 2: Escalation Check
    // =========================================================================

    // Build escalation context
    const escContext = await buildEscalationContext(
      userId,
      mode,
      conversationHistory
    )

    // Check if we should escalate
    const escalation = await shouldEscalate(question, userId, escContext)
    result.escalationDecision = escalation
    result.metadata.layersUsed = [1, 2]

    // Update vault awareness
    result.vaultAwareness.relevantDocuments = escalation.relevantDocuments.length
    result.vaultAwareness.escalationOffered = escalation.shouldEscalate && escalation.requiresConsent

    // If escalation suggested, include prompt
    if (escalation.suggestedPrompt) {
      result.metadata.suggestedPrompt = escalation.suggestedPrompt
    }

    // =========================================================================
    // LAYER 3: Deep Retrieval (if escalation triggered)
    // =========================================================================

    const shouldRetrieve = forceRetrieval ||
      (escalation.shouldEscalate && !escalation.requiresConsent) // Auto-escalate for Contemplate/Council

    if (shouldRetrieve && escalation.relevantDocuments.length > 0) {
      result.vaultAwareness.documentsSearched = true
      result.vaultAwareness.escalationAccepted = true
      result.metadata.layersUsed = [1, 2, 3]

      // Retrieve and summarize
      const retrieval = await retrieveAndSummarize(question, userId, {
        documentIds: escalation.relevantDocuments.map(d => d.documentId),
        maxChunks: mode === 'council' ? 15 : 10,
        maxResponseTokens: mode === 'council' ? 2000 : 1500,
        includeMetadata: true,
      })

      result.retrievalResult = retrieval

      if (!retrieval.isEmpty) {
        result.vaultContext = retrieval.summary
        result.metadata.knowledgeSource = result.cachedAnswer ? 'hybrid' : 'vault'
      }
    }

    // Final metadata
    result.metadata.latencyMs = Date.now() - startTime

    return result
  } catch (error) {
    console.error('[DepthAware] Orchestrator error:', error)

    // Return minimal result on error
    result.metadata.latencyMs = Date.now() - startTime
    return result
  }
}

// =============================================================================
// CACHE NEW ANSWER
// =============================================================================

/**
 * Cache a new answer after OSQR generates it
 * Called after successful response generation
 */
export async function cacheGeneratedAnswer(
  question: string,
  answer: string,
  userId: string,
  options: {
    conversationId?: string
    sourceDocumentIds?: string[]
  } = {}
): Promise<string | null> {
  try {
    const cacheId = await cacheAnswer(question, answer, {
      scope: 'USER',
      userId,
      sourceDocumentIds: options.sourceDocumentIds || [],
      conversationId: options.conversationId,
    })

    console.log(`[DepthAware] Cached answer for: ${question.slice(0, 50)}...`)
    return cacheId
  } catch (error) {
    console.error('[DepthAware] Failed to cache answer:', error)
    return null
  }
}

// =============================================================================
// CONSENT HANDLING
// =============================================================================

/**
 * Handle user consent for escalation
 * Called when user says "yes, review my documents"
 */
export async function handleEscalationConsent(
  question: string,
  userId: string,
  relevantDocuments: DocumentInventoryEntry[]
): Promise<RetrievalResult> {
  return retrieveAndSummarize(question, userId, {
    documentIds: relevantDocuments.map(d => d.documentId),
    maxChunks: 10,
    maxResponseTokens: 1500,
    includeMetadata: true,
  })
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Format depth-aware context for OSQR prompt
 */
export function formatForPrompt(result: DepthAwareResult): string {
  const sections: string[] = []

  // Add cached answer context if available
  if (result.cachedAnswer && result.metadata.knowledgeSource === 'cache') {
    sections.push(`## Previously Answered
You have answered a similar question before. The previous answer was:

${result.cachedAnswer}

Consider whether this still applies or needs updating.`)
  }

  // Add vault context if available
  if (result.vaultContext) {
    sections.push(`## From User's Knowledge Vault

${result.vaultContext}`)
  }

  // Add vault awareness note if relevant docs exist but weren't searched
  if (
    !result.vaultAwareness.documentsSearched &&
    result.vaultAwareness.relevantDocuments > 0 &&
    result.escalationDecision?.suggestedPrompt
  ) {
    sections.push(`## Vault Awareness
${result.escalationDecision.suggestedPrompt}`)
  }

  return sections.join('\n\n---\n\n')
}

/**
 * Build response metadata for API response
 */
export function buildResponseMetadata(result: DepthAwareResult): {
  depthAware: {
    knowledgeSource: string
    cacheHit: boolean
    vaultAwareness: {
      relevantDocuments: number
      documentsSearched: boolean
      escalationOffered: boolean
    }
    latencyMs: number
  }
} {
  return {
    depthAware: {
      knowledgeSource: result.metadata.knowledgeSource,
      cacheHit: result.metadata.cacheHit,
      vaultAwareness: {
        relevantDocuments: result.vaultAwareness.relevantDocuments,
        documentsSearched: result.vaultAwareness.documentsSearched,
        escalationOffered: result.vaultAwareness.escalationOffered,
      },
      latencyMs: result.metadata.latencyMs,
    },
  }
}
