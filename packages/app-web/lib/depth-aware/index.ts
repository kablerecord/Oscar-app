/**
 * Depth-Aware Intelligence System (V1.6)
 *
 * A three-layer knowledge system that allows OSQR to know what it knows
 * without constantly re-computing:
 *
 * - Layer 1: Always-On (milliseconds) - Vault inventory, answer cache
 * - Layer 2: Awareness Scan (fast) - Topic overlap, relevance detection
 * - Layer 3: Deep Retrieval (expensive) - Full PKV search with sub-agent
 *
 * @see docs/builds/DEPTH_AWARE_INTELLIGENCE_BUILD.md
 */

// =============================================================================
// VAULT INVENTORY (Layer 1 & 2)
// =============================================================================

export {
  indexDocument,
  getUserInventory,
  findRelevantDocuments,
  rebuildClusters,
  deleteDocumentInventory,
  type DocumentInventoryEntry,
  type RelevanceResult,
} from './vault-inventory'

// =============================================================================
// ANSWER CACHE (Layer 1)
// =============================================================================

export {
  findCachedAnswer,
  cacheAnswer,
  invalidateByDocument,
  invalidateByTopic,
  invalidateStale,
  evictLRU,
  getCacheStats,
  type CacheHit,
  type CacheOptions,
  type CacheStats,
} from './answer-cache'

// =============================================================================
// ESCALATION DETECTION (Layer 2)
// =============================================================================

export {
  shouldEscalate,
  detectEscalationSignals,
  type EscalationDecision,
  type EscalationReason,
  type EscalationContext,
} from './escalation'

// =============================================================================
// VALIDATION & INVALIDATION (Layer 1 maintenance)
// =============================================================================

export {
  validateCachedAnswer,
  calculateConfidence,
  runConfidenceDecay,
  type ValidationResult,
} from './validation'

// =============================================================================
// RETRIEVAL SUB-AGENT (Layer 3)
// =============================================================================

export {
  retrieveAndSummarize,
  type RetrievalResult,
  type RetrievalOptions,
} from './retrieval-agent'

// =============================================================================
// ORCHESTRATOR (Main entry point)
// =============================================================================

export {
  getDepthAwareContext,
  cacheGeneratedAnswer,
  handleEscalationConsent,
  formatForPrompt,
  buildResponseMetadata,
  type DepthAwareResult,
  type DepthAwareOptions,
  type VaultAwareness,
  type ResponseMetadata,
} from './orchestrator'

// =============================================================================
// GLOBAL CACHE SEEDING (Phase 8)
// =============================================================================

export {
  seedGlobalCache,
  getGlobalCacheStats,
  reviewGlobalCache,
  GLOBAL_QUESTIONS,
} from './global-cache-seed'
