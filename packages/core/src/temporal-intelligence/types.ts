/**
 * Temporal Intelligence - Type Definitions
 *
 * Implements OSQR's ability to exist across time rather than responding only in the moment.
 */

// ============================================================================
// Temporal References
// ============================================================================

/**
 * Urgency category for temporal references
 */
export type UrgencyCategory = 'TODAY' | 'TOMORROW' | 'THIS_WEEK' | 'THIS_MONTH' | 'LATER';

/**
 * Temporal reference extracted from text
 */
export interface TemporalReference {
  rawText: string;                    // "next week", "Friday", "June 15"
  parsedDate?: Date;                  // If resolvable to specific date
  isVague: boolean;                   // true for "soon", "next week"
  urgencyCategory: UrgencyCategory;
}

// ============================================================================
// Commitment Source
// ============================================================================

/**
 * Source type for commitments
 */
export type CommitmentSourceType =
  | 'email'
  | 'text'
  | 'voice'
  | 'document'
  | 'calendar'
  | 'manual';

/**
 * Source of a commitment
 */
export interface CommitmentSource {
  type: CommitmentSourceType;
  sourceId: string;                   // Reference to original
  extractedAt: Date;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Time reference category
 */
export type TimeReferenceType = 'future' | 'past' | 'hypothetical';

/**
 * Validation result from judge model
 */
export interface ValidationResult {
  isActionable: boolean;
  timeReference: TimeReferenceType;
  conflictsWith?: string[];           // IDs of conflicting calendar items
  adjustedConfidence: number;
  judgeReasoning: string;
}

// ============================================================================
// Dependencies
// ============================================================================

/**
 * Dependency status
 */
export type DependencyStatus =
  | 'pending'
  | 'suggested'
  | 'scheduled'
  | 'completed'
  | 'dismissed';

/**
 * Inferred dependency
 */
export interface Dependency {
  action: string;                     // "book flight"
  confidence: number;                 // 0.95 for travel, 0.60 for gift
  suggestedDeadline?: Date;
  status: DependencyStatus;
}

/**
 * Chain of dependencies for a commitment
 */
export interface DependencyChain {
  primaryEvent: string;               // "wedding in Austin"
  inferredDependencies: Dependency[];
}

// ============================================================================
// Commitment
// ============================================================================

/**
 * Commitment extracted from any source
 */
export interface Commitment {
  id: string;
  commitmentText: string;             // Exact quote from source
  who: string;                        // Person responsible
  what: string;                       // Action required
  when: TemporalReference;            // Date/time info
  source: CommitmentSource;
  confidence: number;                 // 0-1 extraction confidence
  reasoning: string;                  // Why classified this way
  createdAt: Date;
  validated: boolean;
  validationAdjustments?: ValidationResult;
  dependencies?: DependencyChain;
}

/**
 * Commitment extraction from LLM
 */
export interface CommitmentExtraction {
  commitmentText: string;
  who: string;
  what: string;
  when: TemporalReference;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// Priority Scoring
// ============================================================================

/**
 * Priority score components
 */
export interface PriorityComponents {
  urgency: number;                    // 0-1
  importance: number;                 // 0-1
  decay: number;                      // 0-1
  userAffinity: number;               // 0-1
}

/**
 * Priority score for a commitment
 */
export interface PriorityScore {
  commitmentId: string;
  totalScore: number;                 // 0-1 weighted average
  components: PriorityComponents;
  calculatedAt: Date;
}

// ============================================================================
// Interrupt Budget
// ============================================================================

/**
 * Interrupt budget tracking for a day
 */
export interface InterruptBudget {
  userId: string;
  date: string;                       // YYYY-MM-DD
  morningDigestSent: boolean;
  morningDigestItems: string[];       // Commitment IDs
  realtimeInterruptsUsed: number;
  realtimeInterruptMax: number;       // Default 2, learnable
  eveningReviewEnabled: boolean;
  eveningReviewSent: boolean;
  forcedInterrupts: string[];         // Safety valve items
}

// ============================================================================
// User Preferences
// ============================================================================

/**
 * Temporal preferences (learned and configured)
 */
export interface TemporalPreferences {
  userId: string;

  // Configured
  quietHoursStart: string;            // "21:00"
  quietHoursEnd: string;              // "07:00"
  quietHoursCriticalException: boolean;
  criticalCategories: string[];       // ["financial", "health", "family"]
  focusModeReduceSuggestions: boolean;
  focusModeSyncCalendar: boolean;
  focusModeBatchUntilEnd: boolean;

  // Learned
  preferredDigestTime: string;        // Learned from engagement
  realtimeTolerance: number;          // Adjusted based on dismissal rate
  categoryWeights: Record<string, number>;  // Learned importance by category
  typicalActionDelay: Record<string, number>;  // Hours until user acts, by type
}

/**
 * Default temporal preferences
 */
export const DEFAULT_TEMPORAL_PREFERENCES: Omit<TemporalPreferences, 'userId'> = {
  quietHoursStart: '21:00',
  quietHoursEnd: '07:00',
  quietHoursCriticalException: true,
  criticalCategories: ['financial', 'health', 'family'],
  focusModeReduceSuggestions: true,
  focusModeSyncCalendar: true,
  focusModeBatchUntilEnd: true,
  preferredDigestTime: '07:00',
  realtimeTolerance: 0.5,
  categoryWeights: {},
  typicalActionDelay: {},
};

// ============================================================================
// Learning Loop
// ============================================================================

/**
 * Engagement type
 */
export type EngagementType =
  | 'opened'
  | 'tapped'
  | 'acted'
  | 'dismissed'
  | 'snoozed';

/**
 * Explicit feedback type
 */
export type ExplicitFeedback = 'stop_this_type' | 'more_like_this';

/**
 * Notification type
 */
export type NotificationType = 'digest' | 'realtime' | 'evening' | 'passive';

/**
 * Notification outcome tracking
 */
export interface NotificationOutcome {
  commitmentId: string;
  notificationType: NotificationType;
  surfacedAt: Date;
  userEngaged: boolean;
  engagementType?: EngagementType;
  timeToEngagement?: number;          // Milliseconds
  explicitFeedback?: ExplicitFeedback;
}

// ============================================================================
// Interrupt Decisions
// ============================================================================

/**
 * Interrupt action type
 */
export type InterruptAction =
  | 'REALTIME_INTERRUPT'
  | 'FORCED_INTERRUPT'
  | 'SUGGEST_ONE_TAP'
  | 'BUBBLE_NOTIFICATION'
  | 'STORE_SILENT'
  | 'BATCH_UNTIL_FOCUS_END'
  | 'BUNDLED_URGENT';

/**
 * Decision about how to surface a commitment
 */
export interface InterruptDecision {
  commitmentId: string;
  action: InterruptAction;
  reason: string;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Daily digest trigger
 */
export interface DailyDigestTrigger {
  userId: string;
  triggerTime: Date;
}

/**
 * Content ingestion trigger
 */
export interface ContentIngestionTrigger {
  userId: string;
  sourceType: CommitmentSourceType;
  content: string;
  sourceId: string;
  receivedAt: Date;
}

/**
 * Passive queue request
 */
export interface PassiveQueueRequest {
  userId: string;
  filter?: {
    category?: string;
    urgency?: UrgencyCategory;
    minPriority?: number;
  };
}

/**
 * Bubble suggestion sent to UI
 */
export interface BubbleSuggestion {
  id: string;
  type: 'realtime' | 'digest_item' | 'one_tap' | 'notification';
  commitment: Commitment;
  priorityScore: number;
  suggestedAction: string;            // "Add to calendar", "Set reminder"
  oneTapPayload?: CalendarEvent;      // Pre-filled if one-tap
  dismissAction: string;
}

/**
 * Calendar event creation
 */
export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  sourceCommitmentId: string;
  autoCreated: boolean;               // true if confidence > 0.85
  description?: string;
}

/**
 * Morning digest payload
 */
export interface MorningDigest {
  userId: string;
  date: string;
  items: BubbleSuggestion[];
  summary: string;                    // "Here's what needs attention today"
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Temporal intelligence configuration
 */
export interface TemporalConfig {
  autoExecuteThreshold: number;       // Default: 0.85
  suggestThreshold: number;           // Default: 0.70
  bubbleThreshold: number;            // Default: 0.50
  defaultRealtimeMax: number;         // Default: 2
  defaultDigestSize: number;          // Default: 5
  digestTime: string;                 // Default: "07:00"
  calendarWriteEnabled: boolean;      // Default: true
}

/**
 * Default configuration
 */
export const DEFAULT_TEMPORAL_CONFIG: TemporalConfig = {
  autoExecuteThreshold: 0.85,
  suggestThreshold: 0.70,
  bubbleThreshold: 0.50,
  defaultRealtimeMax: 2,
  defaultDigestSize: 5,
  digestTime: '07:00',
  calendarWriteEnabled: true,
};

// ============================================================================
// Categories
// ============================================================================

/**
 * Commitment category
 */
export type CommitmentCategory =
  | 'financial'
  | 'legal'
  | 'family'
  | 'health'
  | 'work_client'
  | 'work_internal'
  | 'personal'
  | 'social'
  | 'unknown';

/**
 * Default importance weights by category
 */
export const DEFAULT_CATEGORY_IMPORTANCE: Record<CommitmentCategory, number> = {
  financial: 1.0,
  legal: 1.0,
  family: 1.0,
  health: 1.0,
  work_client: 0.7,
  work_internal: 0.6,
  personal: 0.4,
  social: 0.4,
  unknown: 0.3,
};
