/**
 * Escalation Detection Service (Phase 4)
 *
 * Determines when OSQR should escalate from Layer 1/2 to Layer 3 (deep retrieval).
 * Uses concrete rules, not fuzzy heuristics.
 *
 * Escalation triggers:
 * - Explicit reference to user's documents
 * - Document mentioned by name
 * - High topic overlap with vault contents
 * - Mode requires it (Contemplate/Council)
 * - High-stakes question detected
 * - Prior work exists on topic
 *
 * @see docs/builds/DEPTH_AWARE_INTELLIGENCE_BUILD.md
 */

import { findRelevantDocuments, type DocumentInventoryEntry } from './vault-inventory'

// =============================================================================
// TYPES
// =============================================================================

export type EscalationReason =
  | 'EXPLICIT_REFERENCE'    // "what did I decide about X"
  | 'DOCUMENT_MENTIONED'    // User mentioned a document by name
  | 'HIGH_TOPIC_OVERLAP'    // Query strongly matches vault topics
  | 'MODE_REQUIRES'         // Contemplate/Council mode
  | 'HIGH_STAKES_DETECTED'  // Decision, commitment, contradiction
  | 'PRIOR_WORK_EXISTS'     // User has written about this before

export interface EscalationDecision {
  shouldEscalate: boolean
  reason: EscalationReason | null
  confidence: number // 0-1, how confident we are in this decision
  relevantDocuments: DocumentInventoryEntry[]
  suggestedPrompt?: string
  requiresConsent: boolean // true for Thoughtful mode, false for Contemplate/Council
}

export interface EscalationContext {
  mode: 'quick' | 'thoughtful' | 'contemplate' | 'council'
  conversationHistory?: Array<{ role: string; content: string }>
  documentTitles?: string[] // User's document titles for name matching
}

// =============================================================================
// ESCALATION RULES
// =============================================================================

const ESCALATION_RULES = {
  // Patterns that always trigger escalation
  EXPLICIT_REFERENCE: {
    patterns: [
      /what did (i|we) (decide|write|say|think|conclude) about/i,
      /my (notes|documents|files|research|writing) on/i,
      /check my (vault|pkv|knowledge|files|documents)/i,
      /look through my/i,
      /search my (vault|documents|files|notes)/i,
      /find (in|from) my (notes|documents|vault)/i,
      /what (have i|did i) (save|write|document)/i,
      /review my (previous|past|earlier)/i,
      /based on my (notes|documents|research)/i,
      /according to my (files|vault|documents)/i,
    ],
  },

  // Topic overlap thresholds
  TOPIC_OVERLAP: {
    threshold: 0.75, // Cosine similarity
    escalationThreshold: 0.8, // Higher bar for auto-escalation
    minDocuments: 1,
  },

  // Mode-based escalation
  MODE_REQUIRES: {
    quick: false,
    thoughtful: false, // Offers but doesn't require
    contemplate: true,
    council: true,
  },

  // High-stakes question patterns
  HIGH_STAKES: {
    patterns: [
      /should (i|we) (decide|choose|go with|pick)/i,
      /help me decide/i,
      /which (option|choice|approach|path)/i,
      /compare (my|these|the) options/i,
      /analyze (my|this|the) (decision|choice|options)/i,
      /what are (my|the) options/i,
      /pros and cons/i,
      /trade.?offs?/i,
      /implications of/i,
      /research (about|on|for)/i,
      /deep dive (into|on)/i,
      /comprehensive (analysis|review|look)/i,
    ],
  },

  // Prior work indicators
  PRIOR_WORK: {
    patterns: [
      /continue (from|where|with)/i,
      /follow up on/i,
      /back to (my|the|our)/i,
      /as (i|we) discussed/i,
      /remember when (i|we)/i,
      /you (helped|told|suggested)/i,
      /last time/i,
      /previously/i,
      /earlier (i|we)/i,
    ],
  },
}

// =============================================================================
// MAIN ESCALATION CHECK
// =============================================================================

/**
 * Determine if a question should escalate to deep retrieval
 */
export async function shouldEscalate(
  question: string,
  userId: string,
  context: EscalationContext
): Promise<EscalationDecision> {
  const signals = detectEscalationSignals(question, context)

  // Quick mode: never escalate
  if (context.mode === 'quick') {
    return {
      shouldEscalate: false,
      reason: null,
      confidence: 1.0,
      relevantDocuments: [],
      requiresConsent: false,
    }
  }

  // Check mode-based requirement first
  if (ESCALATION_RULES.MODE_REQUIRES[context.mode]) {
    // Contemplate/Council: always check vault
    const relevanceResult = await findRelevantDocuments(userId, question)

    return {
      shouldEscalate: true,
      reason: 'MODE_REQUIRES',
      confidence: 1.0,
      relevantDocuments: relevanceResult.documents,
      suggestedPrompt: relevanceResult.suggestedPrompt,
      requiresConsent: false, // Auto-escalate for these modes
    }
  }

  // Check explicit reference patterns
  if (signals.explicitReference) {
    const relevanceResult = await findRelevantDocuments(userId, question)

    return {
      shouldEscalate: true,
      reason: 'EXPLICIT_REFERENCE',
      confidence: 0.95,
      relevantDocuments: relevanceResult.documents,
      suggestedPrompt: relevanceResult.suggestedPrompt,
      requiresConsent: context.mode === 'thoughtful',
    }
  }

  // Check if user mentioned a document by name
  if (context.documentTitles && context.documentTitles.length > 0) {
    const mentionedDoc = findMentionedDocument(question, context.documentTitles)
    if (mentionedDoc) {
      const relevanceResult = await findRelevantDocuments(userId, question)

      return {
        shouldEscalate: true,
        reason: 'DOCUMENT_MENTIONED',
        confidence: 0.9,
        relevantDocuments: relevanceResult.documents,
        suggestedPrompt: `I'll check your document "${mentionedDoc}" for relevant information.`,
        requiresConsent: context.mode === 'thoughtful',
      }
    }
  }

  // Check topic overlap with vault
  const relevanceResult = await findRelevantDocuments(userId, question)

  if (relevanceResult.shouldEscalate) {
    // High topic overlap found
    const reason: EscalationReason = signals.priorWork
      ? 'PRIOR_WORK_EXISTS'
      : 'HIGH_TOPIC_OVERLAP'

    return {
      shouldEscalate: true,
      reason,
      confidence: 0.8,
      relevantDocuments: relevanceResult.documents,
      suggestedPrompt: relevanceResult.suggestedPrompt,
      requiresConsent: context.mode === 'thoughtful',
    }
  }

  // Check high-stakes patterns
  if (signals.highStakes && relevanceResult.documents.length > 0) {
    return {
      shouldEscalate: true,
      reason: 'HIGH_STAKES_DETECTED',
      confidence: 0.75,
      relevantDocuments: relevanceResult.documents,
      suggestedPrompt: relevanceResult.suggestedPrompt,
      requiresConsent: true, // Always ask for high-stakes
    }
  }

  // No escalation needed
  return {
    shouldEscalate: false,
    reason: null,
    confidence: 0.85,
    relevantDocuments: relevanceResult.documents, // Still include for awareness
    requiresConsent: false,
  }
}

// =============================================================================
// SIGNAL DETECTION
// =============================================================================

export interface EscalationSignals {
  explicitReference: boolean
  documentMentioned: boolean
  highStakes: boolean
  priorWork: boolean
  patternMatches: string[]
}

/**
 * Detect escalation signals in a question (fast, no DB calls)
 */
export function detectEscalationSignals(
  question: string,
  _context: EscalationContext
): EscalationSignals {
  const signals: EscalationSignals = {
    explicitReference: false,
    documentMentioned: false,
    highStakes: false,
    priorWork: false,
    patternMatches: [],
  }

  // Check explicit reference patterns
  for (const pattern of ESCALATION_RULES.EXPLICIT_REFERENCE.patterns) {
    if (pattern.test(question)) {
      signals.explicitReference = true
      signals.patternMatches.push(`EXPLICIT: ${pattern.source}`)
      break
    }
  }

  // Check high-stakes patterns
  for (const pattern of ESCALATION_RULES.HIGH_STAKES.patterns) {
    if (pattern.test(question)) {
      signals.highStakes = true
      signals.patternMatches.push(`HIGH_STAKES: ${pattern.source}`)
      break
    }
  }

  // Check prior work patterns
  for (const pattern of ESCALATION_RULES.PRIOR_WORK.patterns) {
    if (pattern.test(question)) {
      signals.priorWork = true
      signals.patternMatches.push(`PRIOR_WORK: ${pattern.source}`)
      break
    }
  }

  return signals
}

/**
 * Find if user mentioned a document by name
 */
function findMentionedDocument(
  question: string,
  documentTitles: string[]
): string | null {
  const lowerQuestion = question.toLowerCase()

  for (const title of documentTitles) {
    // Check for exact match or close match
    const lowerTitle = title.toLowerCase()

    // Exact match
    if (lowerQuestion.includes(lowerTitle)) {
      return title
    }

    // Partial match (first few significant words)
    const titleWords = lowerTitle.split(/\s+/).filter(w => w.length > 3)
    if (titleWords.length >= 2) {
      const significantPart = titleWords.slice(0, 3).join(' ')
      if (lowerQuestion.includes(significantPart)) {
        return title
      }
    }
  }

  return null
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get list of document titles for a user (for mention detection)
 */
export async function getDocumentTitles(userId: string): Promise<string[]> {
  const { prisma } = await import('../db/prisma')

  const docs = await prisma.documentInventory.findMany({
    where: { userId },
    select: { title: true, fileName: true },
  })

  // Return both titles and filenames
  const titles = new Set<string>()
  for (const doc of docs) {
    if (doc.title) titles.add(doc.title)
    if (doc.fileName) titles.add(doc.fileName)
  }

  return Array.from(titles)
}

/**
 * Build escalation context from conversation
 */
export async function buildEscalationContext(
  userId: string,
  mode: EscalationContext['mode'],
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<EscalationContext> {
  const documentTitles = await getDocumentTitles(userId)

  return {
    mode,
    conversationHistory,
    documentTitles,
  }
}
