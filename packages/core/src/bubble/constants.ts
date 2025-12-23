/**
 * Bubble Interface Constants
 *
 * Configuration defaults, thresholds, and focus mode configurations.
 */

import type {
  ConfidenceWeights,
  BubbleEngineConfig,
  FocusModeConfig,
  SyncAction,
} from './types';

// ============================================
// CONFIDENCE SCORING WEIGHTS
// ============================================

export const DEFAULT_CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  basePriority: 0.35,
  timeSensitivity: 0.25,
  contextRelevance: 0.25,
  historicalEngagement: 0.15,
};

// ============================================
// SCORE THRESHOLDS
// ============================================

export const SCORE_THRESHOLDS = {
  silent: 40,          // 0-40: No UI, logged only
  passive: 40,         // 41-60: Ambient indicator (glow, dot)
  ready: 60,           // 61-80: Preview on hover/tap
  active: 80,          // 81-95: Bubble surfaces with preview
  priority: 95,        // 96-100: Immediate, uses interrupt budget
} as const;

// ============================================
// BUDGET DEFAULTS
// ============================================

export const BUDGET_DEFAULTS = {
  defaultDaily: 15,
  minDaily: 10,
  maxDaily: 30,
  hourlyAvailable: 5,
  hourlyFocused: 2,
  emergencyThreshold: 98,
  resetHour: 0,        // Midnight local time
} as const;

// ============================================
// CATEGORY WEIGHT BOUNDS
// ============================================

export const CATEGORY_WEIGHT_BOUNDS = {
  min: 0.3,
  max: 1.5,
  default: 1.0,
} as const;

// ============================================
// DEFAULT ENGINE CONFIG
// ============================================

export const DEFAULT_ENGINE_CONFIG: BubbleEngineConfig = {
  weights: DEFAULT_CONFIDENCE_WEIGHTS,
  thresholds: SCORE_THRESHOLDS,
  budget: BUDGET_DEFAULTS,
  categoryWeightBounds: CATEGORY_WEIGHT_BOUNDS,
};

// ============================================
// FOCUS MODE CONFIGURATIONS
// ============================================

export const FOCUS_MODES: Record<string, FocusModeConfig> = {
  available: {
    name: 'available',
    bubbleStates: ['passive', 'ready', 'active', 'priority'],
    hourlyLimit: 5,
    passiveIndicators: true,
    soundEnabled: true,
    hapticEnabled: true,
  },
  focused: {
    name: 'focused',
    bubbleStates: ['passive', 'ready'],
    hourlyLimit: 2,
    passiveIndicators: true,
    soundEnabled: false,
    hapticEnabled: false,
  },
  dnd: {
    name: 'dnd',
    bubbleStates: [],
    hourlyLimit: 0,
    passiveIndicators: false,
    soundEnabled: false,
    hapticEnabled: false,
    queueAll: true,
  },
};

// ============================================
// TIME SENSITIVITY THRESHOLDS
// ============================================

export const TIME_SENSITIVITY = {
  critical: 2,         // Hours until deadline for 100 score
  today: 24,           // Hours for 80 score
  soon: 72,            // Hours for 60 score (3 days)
  thisWeek: 168,       // Hours for 40 score (7 days)
  default: 20,         // Default score for further out
  decayDays: 3,        // Days before decay kicks in
} as const;

// ============================================
// SYNC ACTION CONFIGURATIONS
// ============================================

export const SYNC_ACTIONS: Record<string, SyncAction> = {
  itemDismissed: {
    scope: 'global',
    persistence: 'permanent',
  },
  itemDeferred: {
    scope: 'global',
    persistence: 'until_trigger',
  },
  itemEngaged: {
    scope: 'global',
    persistence: 'permanent',
  },
  focusModeChanged: {
    scope: 'global',
    persistence: 'until_changed',
  },
  budgetConsumed: {
    scope: 'global',
    persistence: 'until_reset',
  },
};

// ============================================
// HAPTIC PATTERNS
// ============================================

export const HAPTIC_PATTERNS = {
  light: { type: 'light' as const, duration: 10 },
  medium: { type: 'medium' as const, duration: 20 },
  heavy: { type: 'heavy' as const, duration: 30 },
};

// ============================================
// VOICE CONFIGURATION
// ============================================

export const VOICE_CONFIG = {
  defaultTimeout: 10000,          // 10 seconds
  pauseDetection: 2000,           // 2 seconds pause before speaking
  triggerPhrases: {
    proceed: ['go ahead', 'tell me', 'what is it', 'yes'],
    dismiss: ['not now', 'later', 'dismiss', 'no'],
    defer: ['remind me later', 'tonight', 'tomorrow', 'monday'],
  },
} as const;

// ============================================
// ANIMATION TIMING
// ============================================

export const ANIMATION_TIMING = {
  bubbleRise: 300,               // ms
  pulseSlow: 2000,               // ms
  dismissSlide: 200,             // ms
  expandTransition: 250,         // ms
} as const;

// ============================================
// DEFAULT USER STATE
// ============================================

export const DEFAULT_USER_STATE = {
  preferences: {
    focusMode: 'available' as const,
    dailyBudget: BUDGET_DEFAULTS.defaultDaily,
    soundEnabled: true,
    hapticEnabled: true,
  },
  categoryWeights: {},
  budget: {
    daily: {
      total: BUDGET_DEFAULTS.defaultDaily,
      used: 0,
      lastReset: new Date(),
    },
    hourly: {
      current: 0,
      windowStart: new Date(),
    },
  },
  deferred: [],
  history: [],
};

// ============================================
// ERROR CODES
// ============================================

export const ERROR_CODES = {
  SCORER_FAILED: 'SCORER_FAILED',
  BUDGET_CORRUPT: 'BUDGET_CORRUPT',
  SYNC_DISCONNECTED: 'SYNC_DISCONNECTED',
  SYNC_CONFLICT: 'SYNC_CONFLICT',
  VOICE_RECOGNITION_FAILED: 'VOICE_RECOGNITION_FAILED',
  UI_RENDER_ERROR: 'UI_RENDER_ERROR',
  TEMPORAL_UNAVAILABLE: 'TEMPORAL_UNAVAILABLE',
  MEMORY_VAULT_UNAVAILABLE: 'MEMORY_VAULT_UNAVAILABLE',
} as const;
