/**
 * OSQR Core Configuration
 *
 * Configuration for the OSQR brain components.
 * This file centralizes all oscar-app specific settings.
 *
 * @osqr/core is now integrated via workspace dependency.
 */

// ============================================================================
// Router Configuration
// ============================================================================

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
  defaultTier: 'pro' as const,
  warmupPeriodMs: 60000,
  warningThreshold: 0.2,
};

/**
 * Feature flags - @osqr/core features ENABLED via workspace dependency
 */
export const featureFlags = {
  // Core features - ENABLED (@osqr/core integrated)
  enableConstitutionalValidation: true,
  enableRouterMRP: true,
  enableSmartRouting: true,
  enableMemoryVault: true,
  enableCouncilMode: true,
  enableGuidance: true,
  enableTemporalIntelligence: true,
  enableBubbleInterface: true,
  enableDocumentIndexing: true,
  enableCrossProjectMemory: true,
  enableThrottle: true,

  // Debug flags
  logConstitutionalViolations: process.env.NODE_ENV === 'development',
  logRouterDecisions: process.env.NODE_ENV === 'development',
  logThrottleDecisions: process.env.NODE_ENV === 'development',
  logDocumentIndexing: process.env.NODE_ENV === 'development',
};
