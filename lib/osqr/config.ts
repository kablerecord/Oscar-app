/**
 * OSQR Core Configuration
 *
 * Configuration for the @osqr/core brain library.
 * This file centralizes all oscar-app specific settings.
 */

import { Throttle } from '@osqr/core'
import { getPrismaBudgetAdapter } from './budget-persistence'

// ============================================================================
// Persistence Adapter Initialization
// ============================================================================

let persistenceInitialized = false

/**
 * Initialize the budget persistence adapter.
 * This connects osqr/core's throttle system to Prisma for persistent storage.
 * Called lazily on first throttle operation.
 */
export function initializeBudgetPersistence(): void {
  if (persistenceInitialized) return

  try {
    const adapter = getPrismaBudgetAdapter()
    Throttle.setPersistenceAdapter(adapter)
    persistenceInitialized = true
    console.log('[OSQR] Budget persistence adapter initialized (Prisma)')
  } catch (error) {
    console.error('[OSQR] Failed to initialize budget persistence:', error)
    // Continue with in-memory storage as fallback
  }
}

/**
 * Check if persistence is initialized.
 */
export function isBudgetPersistenceInitialized(): boolean {
  return persistenceInitialized
}

/**
 * Router configuration for oscar-app
 */
export const routerConfig = {
  escalationThreshold: 0.7,
  highConfidenceThreshold: 0.95,
  maxEscalations: 2,
  maxValidationRetries: 3,
  classificationTimeoutMs: 3000,
  routingTimeoutMs: 1000,
  validationTimeoutMs: 5000,
  enableValidation: true,
  enableMrpGeneration: true,
  enableCostTracking: true,
};

/**
 * Memory vault configuration for oscar-app
 */
export const vaultConfig = {
  maxWorkingMemoryTokens: 4096,
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  defaultRetrievalLimit: 10,
  recencyBoostDays: 7,
  minUtilityThreshold: 0.3,
};

/**
 * Guidance configuration for oscar-app
 */
export const guidanceConfig = {
  maxTokens: 4096,
  softLimit: 15,
  hardLimit: 25,
  scoringWeights: {
    recency: 0.3,
    relevance: 0.5,
    priority: 0.2,
  },
};

/**
 * Temporal intelligence configuration
 */
export const temporalConfig = {
  digestTime: '08:00',
  eveningReviewTime: '18:00',
  maxDailyBubbles: 10,
  defaultDigestSize: 5,
  interruptCooldownMinutes: 15,
};

/**
 * Bubble interface configuration
 */
export const bubbleConfig = {
  maxBubblesPerSession: 10,
  minConfidenceThreshold: 0.6,
  focusModeEnabled: true,
  defaultFocusMode: 'normal' as const,
};

/**
 * Document Indexing configuration
 */
export const documentIndexingConfig = {
  maxChunkSize: 1000,
  chunkOverlap: 100,
  generateEmbeddingsByDefault: true,
  detectRelationshipsByDefault: true,
  supportedTypes: ['markdown', 'plaintext', 'code', 'json', 'yaml', 'html', 'pdf', 'docx'] as const,
};

/**
 * Throttle configuration
 */
export const throttleConfig = {
  // Default to 'pro' tier for development
  defaultTier: 'pro' as const,
  // Grace period before enforcing limits (ms)
  warmupPeriodMs: 60000,
  // Show warning when this percentage of budget remains
  warningThreshold: 0.2,
};

/**
 * Environment-based feature flags
 *
 * All integrations verified and enabled as of 2025-12-19.
 * New features added: Document Indexing (I-8), Cross-Project Memory (I-9), Throttle (I-10)
 */
export const featureFlags = {
  // Core features - all enabled after type verification
  enableConstitutionalValidation: true, // I-1: Constitutional Framework - ENABLED
  enableRouterMRP: true, // I-2: Router/MRP Integration - ENABLED
  enableSmartRouting: true, // I-2: Router/MRP Integration - ENABLED
  enableMemoryVault: true, // I-3: Memory Vault Integration - ENABLED
  enableCouncilMode: true, // I-4: Council Mode Integration - ENABLED
  enableGuidance: true, // I-5: Project Guidance Integration - ENABLED
  enableTemporalIntelligence: true, // I-6: Temporal Intelligence - ENABLED
  enableBubbleInterface: true, // I-7: Bubble Interface - ENABLED

  // New features - Phase 2 integration
  enableDocumentIndexing: true, // I-8: Document Indexing Subsystem - ENABLED
  enableCrossProjectMemory: true, // I-9: Cross-Project Memory Extension - ENABLED
  enableThrottle: true, // I-10: Throttle Architecture - ENABLED

  // Debug flags
  logConstitutionalViolations: process.env.NODE_ENV === 'development',
  logRouterDecisions: process.env.NODE_ENV === 'development',
  logThrottleDecisions: process.env.NODE_ENV === 'development',
  logDocumentIndexing: process.env.NODE_ENV === 'development',
};
