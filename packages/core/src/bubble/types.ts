/**
 * Bubble Interface Types
 *
 * OSQR's proactive intelligence layer for surfacing information,
 * suggestions, and reminders without being asked.
 */

// ============================================
// TEMPORAL INTELLIGENCE INPUT
// ============================================

/**
 * Time window for optimal surfacing
 */
export interface TimeWindow {
  start: Date;
  end: Date;
}

/**
 * Types of temporal items
 */
export type TemporalItemType =
  | 'deadline'
  | 'commitment'
  | 'reminder'
  | 'connection'
  | 'pattern';

/**
 * Input from Temporal Intelligence Layer
 */
export interface TemporalItem {
  id: string;
  type: TemporalItemType;
  content: string;
  source: string;
  priority: number;               // 0-100 from Temporal Intelligence
  deadline?: Date;
  dependencies?: string[];
  entities?: string[];            // People, projects, companies
  topics?: string[];              // Keywords, themes
  optimalWindow?: TimeWindow;
  detectedAt?: number;            // Timestamp when OSQR learned this
  relatedTasks?: string[];
  project?: string;
}

// ============================================
// BUBBLE ITEM
// ============================================

/**
 * State of a bubble item
 */
export type BubbleState =
  | 'pending'
  | 'surfaced'
  | 'dismissed'
  | 'engaged'
  | 'deferred';

/**
 * Bubble item categories
 */
export type BubbleCategory =
  | 'deadline'
  | 'commitment'
  | 'reminder'
  | 'connection'
  | 'pattern'
  | 'meeting_reminder'
  | 'general';

/**
 * Action attached to a bubble
 */
export interface BubbleAction {
  label: string;
  handler?: () => void;
}

/**
 * Bubble-ready format for display
 */
export interface BubbleItem {
  id: string;
  temporalItemId: string;

  // Display
  message: string;
  subtext?: string;

  // Scoring
  confidenceScore: number;        // 0-100, calculated by Bubble
  basePriority: number;           // From Temporal Intelligence

  // Actions
  primaryAction?: BubbleAction;

  // Metadata
  category: BubbleCategory;
  surfacedAt?: number;
  state: BubbleState;

  // Original temporal item reference
  temporalItem?: TemporalItem;
}

// ============================================
// USER CONTEXT
// ============================================

/**
 * Current user context for relevance scoring
 */
export interface UserContext {
  activeProject: string | null;
  recentTopics: string[];
  recentEntities: string[];
  activeTask: string | null;
  currentTime: number;
}

// ============================================
// BUBBLE HISTORY
// ============================================

/**
 * User action on a bubble
 */
export type BubbleHistoryAction = 'dismissed' | 'engaged' | 'deferred';

/**
 * Historical record of bubble interaction
 */
export interface BubbleHistory {
  itemId: string;
  category: BubbleCategory;
  confidenceScore: number;
  action: BubbleHistoryAction;
  timestamp: Date;
  timeToAction: number;           // ms from surface to action
  source?: string;
  wasEngaged?: boolean;
}

// ============================================
// FEEDBACK
// ============================================

/**
 * Feedback types for bubble interactions
 */
export type BubbleFeedback =
  | 'helpful'
  | 'less_like_this'
  | 'wrong_time'
  | 'not_relevant';

// ============================================
// FOCUS MODE
// ============================================

/**
 * Focus mode names
 */
export type FocusModeName = 'available' | 'focused' | 'dnd';

/**
 * Visual bubble states allowed per focus mode
 */
export type BubbleVisualState = 'passive' | 'ready' | 'active' | 'priority';

/**
 * Focus mode configuration
 */
export interface FocusModeConfig {
  name: FocusModeName;
  bubbleStates: BubbleVisualState[];
  hourlyLimit: number;
  passiveIndicators: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  queueAll?: boolean;
}

// ============================================
// INTERRUPT BUDGET
// ============================================

/**
 * Daily budget tracking
 */
export interface DailyBudget {
  total: number;
  used: number;
  remaining: number;
  lastReset: Date;
  resetTime: string;
}

/**
 * Hourly budget tracking
 */
export interface HourlyBudget {
  focused: number;
  available: number;
  current: number;
  windowStart: Date;
}

/**
 * Emergency bypass configuration
 */
export interface EmergencyConfig {
  enabled: boolean;
  threshold: number;
}

/**
 * Complete interrupt budget structure
 */
export interface InterruptBudget {
  daily: DailyBudget;
  hourly: HourlyBudget;
  emergency: EmergencyConfig;
}

/**
 * Budget consumption result
 */
export interface BudgetConsumptionResult {
  allowed: boolean;
  cost: number;
  reason: string;
}

// ============================================
// USER PREFERENCES
// ============================================

/**
 * User bubble preferences
 */
export interface BubblePreferences {
  focusMode: FocusModeName;
  dailyBudget: number;            // 10-30, default 15
  soundEnabled: boolean;
  hapticEnabled: boolean;
}

/**
 * Deferred item tracking
 */
export interface DeferredItem {
  itemId: string;
  deferredAt: Date;
  deferredUntil: Date;
}

/**
 * Complete bubble user state (persisted to Memory Vault)
 */
export interface BubbleUserState {
  preferences: BubblePreferences;
  categoryWeights: Record<string, number>;
  budget: {
    daily: {
      total: number;
      used: number;
      lastReset: Date;
    };
    hourly: {
      current: number;
      windowStart: Date;
    };
  };
  deferred: DeferredItem[];
  history: BubbleHistory[];
}

// ============================================
// BUBBLE ACTIONS
// ============================================

/**
 * Defer timing options
 */
export type DeferOption = 'tonight' | 'tomorrow' | 'monday' | Date;

/**
 * Bubble interaction actions
 */
export interface BubbleActions {
  onExpand: () => void;
  onDismiss: (feedback?: BubbleFeedback | null) => void;
  onEngage: () => void;
  onDefer: (until: DeferOption) => void;
}

// ============================================
// SYNC
// ============================================

/**
 * Sync persistence types
 */
export type SyncPersistence =
  | 'permanent'
  | 'until_trigger'
  | 'until_changed'
  | 'until_reset';

/**
 * Sync action configuration
 */
export interface SyncAction {
  scope: 'global';
  persistence: SyncPersistence;
}

/**
 * Cross-device sync event types
 */
export type SyncEventType =
  | 'bubble_state_change'
  | 'focus_mode_changed'
  | 'budget_consumed';

/**
 * WebSocket sync event
 */
export interface BubbleSyncEvent {
  type: SyncEventType;
  action: string;
  itemId?: string;
  timestamp: number;
  deviceId: string;
  feedback?: BubbleFeedback;
}

// ============================================
// VOICE
// ============================================

/**
 * Voice cue configuration
 */
export interface VoiceCue {
  phrase: string | null;
  waitForResponse?: boolean;
  timeout?: number;
  directSurface?: boolean;
}

// ============================================
// MOBILE HAPTICS
// ============================================

/**
 * Haptic feedback pattern types
 */
export type HapticType = 'light' | 'medium' | 'heavy';

/**
 * Haptic pattern configuration
 */
export interface HapticPattern {
  type: HapticType;
  duration: number;
}

// ============================================
// SCORING
// ============================================

/**
 * Confidence score weights
 */
export interface ConfidenceWeights {
  basePriority: number;
  timeSensitivity: number;
  contextRelevance: number;
  historicalEngagement: number;
}

/**
 * Confidence score breakdown
 */
export interface ConfidenceBreakdown {
  basePriority: number;
  timeSensitivity: number;
  contextRelevance: number;
  historicalEngagement: number;
  categoryWeight: number;
  rawScore: number;
  finalScore: number;
}

// ============================================
// ERRORS
// ============================================

/**
 * Bubble error components
 */
export type BubbleErrorComponent =
  | 'scorer'
  | 'budget'
  | 'sync'
  | 'voice'
  | 'ui';

/**
 * Bubble error severity levels
 */
export type BubbleErrorSeverity = 'warning' | 'error' | 'critical';

/**
 * Bubble error structure
 */
export interface BubbleError {
  code: string;
  message: string;
  component: BubbleErrorComponent;
  severity: BubbleErrorSeverity;
  timestamp: Date;
  context?: Record<string, unknown>;
}

// ============================================
// ENGINE
// ============================================

/**
 * Bubble engine configuration
 */
export interface BubbleEngineConfig {
  weights: ConfidenceWeights;
  thresholds: {
    silent: number;               // Below this = no UI (default 40)
    passive: number;              // Above this = ambient indicator (default 40)
    ready: number;                // Above this = preview on hover (default 60)
    active: number;               // Above this = bubble surfaces (default 80)
    priority: number;             // Above this = immediate (default 95)
  };
  budget: {
    defaultDaily: number;
    minDaily: number;
    maxDaily: number;
    hourlyAvailable: number;
    hourlyFocused: number;
    emergencyThreshold: number;
  };
  categoryWeightBounds: {
    min: number;
    max: number;
  };
}

/**
 * Bubble engine state
 */
export interface BubbleEngineState {
  items: BubbleItem[];
  userState: BubbleUserState;
  focusMode: FocusModeConfig;
  budget: InterruptBudget;
  context: UserContext;
}
