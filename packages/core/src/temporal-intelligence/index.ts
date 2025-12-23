/**
 * Temporal Intelligence Module
 *
 * OSQR's ability to exist across time rather than responding only in the moment.
 * Extracts commitments from any source, scores priority, manages interrupt budget,
 * infers dependencies, and learns from outcomes.
 *
 * @module temporal-intelligence
 */

// Types
export * from './types';

// Extraction Layer - Extract commitments from content
export {
  classifyInput,
  processIngestionTrigger,
  containsCommitmentSignals,
  getClassificationThreshold,
  meetsClassificationThreshold,
  type ClassificationResult,
} from './extraction/classifier';

export {
  extractCommitments,
  extractTemporalReference,
  parseDate,
  determineUrgencyCategory,
  isVagueReference,
  extractWho,
  extractWhat,
  calculateExtractionConfidence,
  mergeCommitments,
} from './extraction/extractor';

export {
  validateCommitment,
  validateCommitments,
  calculateOverallConfidence,
  determineTimeReference,
  isActionable,
  calculateSchemaCompleteness,
  calculateHedgingScore,
  filterActionable,
  filterByConfidence,
} from './extraction/validator';

// Scoring Layer - Calculate priority scores
export {
  calculatePriorityScore,
  calculatePriorityScores,
  calculateUrgency,
  calculateImportance,
  calculateDecay,
  calculateAffinity,
  inferCategory,
  sortByPriority,
  filterByPriority,
  getTopPriority,
  formatPriorityBreakdown,
} from './scoring/priority';

// Budget Layer - Manage interrupt budget
export {
  getBudget,
  saveBudget,
  canSendRealtimeInterrupt,
  recordRealtimeInterrupt,
  recordForcedInterrupt,
  markDigestSent,
  getRemainingInterrupts,
  isInQuietHours,
  isCritical,
  determineInterruptAction,
  processInterruptQueue,
  bundleInterrupts,
  resetBudget,
  clearAllBudgets,
} from './budget/manager';

export {
  generateMorningDigest,
  generateDigestSummary,
  getSuggestedAction,
  createBubbleSuggestion,
  shouldSendDigest,
  getUndigestedItems,
  generateEveningReview,
} from './budget/digest';

// Inference Layer - Infer dependencies
export {
  inferDependencies,
  getHighConfidenceDependencies,
  getDependenciesDueSoon,
  getPendingDependencies,
  markDependencyCompleted,
  markDependencyDismissed,
  formatDependencyChain,
  enrichWithDependencies,
  enrichAllWithDependencies,
} from './inference/dependencies';

// Learning Layer - Track outcomes and learn preferences
export {
  recordOutcome,
  recordEngagement,
  recordDismissal,
  recordFeedback,
  getOutcomesForCommitment,
  getRecentOutcomes,
  calculateEngagementRate,
  calculateDismissalRate,
  getAverageTimeToEngagement,
  countNegativeFeedback,
  countPositiveFeedback,
  getOutcomesByEngagement,
  adjustPreferencesFromOutcomes,
  clearOutcomes,
  getAllOutcomes,
} from './learning/outcomes';

// Settings Layer - User preferences and configuration
export {
  getPreferences,
  updatePreferences,
  setQuietHours,
  setCriticalCategories,
  enableFocusMode,
  disableFocusMode,
  updateCategoryWeight,
  updateTypicalActionDelay,
  updateRealtimeTolerance,
  updatePreferredDigestTime,
  resetPreferences,
  clearAllPreferences,
  getGlobalConfig,
  updateGlobalConfig,
  resetGlobalConfig,
} from './settings/config';
