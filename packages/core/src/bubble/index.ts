/**
 * Bubble Interface
 *
 * OSQR's proactive intelligence layer for surfacing information,
 * suggestions, and reminders without being asked.
 *
 * @module bubble
 */

// ============================================
// TYPES
// ============================================

export type {
  // Temporal Input
  TimeWindow,
  TemporalItemType,
  TemporalItem,

  // Bubble Item
  BubbleState,
  BubbleCategory,
  BubbleAction,
  BubbleItem,

  // Context
  UserContext,

  // History
  BubbleHistoryAction,
  BubbleHistory,

  // Feedback
  BubbleFeedback,

  // Focus Mode
  FocusModeName,
  BubbleVisualState,
  FocusModeConfig,

  // Budget
  DailyBudget,
  HourlyBudget,
  EmergencyConfig,
  InterruptBudget,
  BudgetConsumptionResult,

  // User State
  BubblePreferences,
  DeferredItem,
  BubbleUserState,

  // Actions
  DeferOption,
  BubbleActions,

  // Sync
  SyncPersistence,
  SyncAction,
  SyncEventType,
  BubbleSyncEvent,

  // Voice & Haptics
  VoiceCue,
  HapticType,
  HapticPattern,

  // Scoring
  ConfidenceWeights,
  ConfidenceBreakdown,

  // Errors
  BubbleErrorComponent,
  BubbleErrorSeverity,
  BubbleError,

  // Engine
  BubbleEngineConfig,
  BubbleEngineState,
} from './types';

// ============================================
// CONSTANTS
// ============================================

export {
  DEFAULT_CONFIDENCE_WEIGHTS,
  SCORE_THRESHOLDS,
  BUDGET_DEFAULTS,
  CATEGORY_WEIGHT_BOUNDS,
  DEFAULT_ENGINE_CONFIG,
  FOCUS_MODES,
  TIME_SENSITIVITY,
  SYNC_ACTIONS,
  HAPTIC_PATTERNS,
  VOICE_CONFIG,
  ANIMATION_TIMING,
  DEFAULT_USER_STATE,
  ERROR_CODES,
} from './constants';

// ============================================
// SCORING
// ============================================

export {
  calculateConfidenceScore,
  calculateConfidenceBreakdown,
  calculateTimeSensitivity,
  calculateContextRelevance,
  calculateHistoricalEngagement,
  isWithinWindow,
  hasTopicOverlap,
  hasEntityOverlap,
  getVisualState,
  formatConfidenceBreakdown,
} from './scoring';

// ============================================
// BUDGET
// ============================================

export {
  // Interrupt Budget
  createInterruptBudget,
  shouldResetDaily,
  shouldResetHourly,
  resetDailyBudget,
  resetHourlyBudget,
  applyResets,
  getHourlyLimit,
  calculateCost,
  canConsumeBudget,
  consumeBudget,
  setDailyTotal,
  setEmergencyBypass,
  getBudgetUtilization,
  formatBudgetStatus,

  // Focus Mode
  getFocusMode,
  getAllFocusModes,
  getVisualStateFromScore,
  isStateAllowed,
  shouldSurfaceItem,
  showPassiveIndicators,
  isSoundEnabled,
  isHapticEnabled,
  getEffectiveVisualState,
  filterItemsForFocusMode,
  getQueuedItems,
  isValidFocusMode,
  getNextFocusMode,
  getFocusModeDescription,
  getFocusModeDisplayName,
  createCustomFocusMode,
} from './budget';

// ============================================
// GENERATION
// ============================================

export {
  generateMessage,
  mapToCategory,
  transformToBubble,
  transformBatch,
  formatRelativeTime,
  truncateMessage,
} from './generation';

// ============================================
// FEEDBACK
// ============================================

export {
  createHistoryEntry,
  adjustCategoryWeight,
  processDismiss,
  processEngage,
  processDefer,
  calculateDeferDate,
  isItemDeferred,
  getReadyDeferredItems,
  cleanupDeferredItems,
  getCategoryEngagementRate,
  getCategoryResponseTime,
  processHelpfulFeedback,
  resetCategoryWeights,
  getCategoryWeight,
} from './feedback';

// ============================================
// ENGINE
// ============================================

export {
  BubbleEngine,
  createBubbleEngine,
} from './engine';

export type {
  BubbleEngineEvent,
  BubbleEngineListener,
} from './engine';

// ============================================
// DEFAULT EXPORT
// ============================================

import { BubbleEngine, createBubbleEngine } from './engine';

export default {
  BubbleEngine,
  createBubbleEngine,
};
