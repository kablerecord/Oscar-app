/**
 * UIP Type Definitions
 * Core types for User Intelligence Profile system
 * @see docs/architecture/UIP_SPEC.md
 */

import {
  UIPTier,
  UIPDomain,
  UIPSource,
  UIPSignalCategory,
  PrivacyTier,
} from '@prisma/client'

// Re-export Prisma enums for convenience
export { UIPTier, UIPDomain, UIPSource, UIPSignalCategory, PrivacyTier }

// ============================================
// Domain Value Types
// ============================================

/**
 * Identity Context domain value
 */
export interface IdentityContextValue {
  name?: string
  preferredName?: string
  role?: string
  industry?: string
  lifestage?: string // "student", "early_career", "senior", "founder", "retired"
  timezone?: string
  locale?: string
}

/**
 * Goals & Values domain value
 */
export interface GoalsValuesValue {
  activeGoals: Array<{
    id: string
    goal: string
    timeframe: 'short' | 'medium' | 'long'
    priority: number // 1-10
  }>
  valueFilters: {
    speedVsSafety: number // -1 (safety) to 1 (speed)
    qualityVsLeverage: number // -1 (leverage) to 1 (quality)
    depthVsBreadth: number // -1 (breadth) to 1 (depth)
  }
  constraints: string[]
  successDefinition?: string
}

/**
 * Cognitive Processing Style domain value
 */
export interface CognitiveStyleValue {
  abstractVsConcrete: number // -1 (concrete) to 1 (abstract)
  linearVsAssociative: number // -1 (associative) to 1 (linear)
  verbalVsVisual: number // -1 (visual) to 1 (verbal)
  reflectiveVsAction: number // -1 (action) to 1 (reflective)
}

/**
 * Communication Preferences domain value
 */
export interface CommunicationPrefsValue {
  verbosity: 'concise' | 'moderate' | 'detailed'
  preferredFormat: 'bullets' | 'prose' | 'mixed'
  optionsVsRecommendation: number // -1 (single rec) to 1 (many options)
  tonePreference: 'directive' | 'exploratory' | 'supportive'
  proactivityTolerance: number // 0 (never interrupt) to 1 (always proactive)
}

/**
 * Expertise Calibration domain value
 */
export interface ExpertiseCalibrationValue {
  expertDomains: string[] // Domains where user is expert
  learningDomains: string[] // Domains where user is learning
  domainScores: Record<string, number> // Domain -> expertise level (0-1)
  vocabularyLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
}

/**
 * Behavioral Patterns domain value
 */
export interface BehavioralPatternsValue {
  preferredSessionTime?: string // "morning", "afternoon", "evening", "night"
  typicalSessionLength: number // Minutes
  modeDistribution: {
    quick: number
    thoughtful: number
    contemplate: number
    council: number
  }
  retryRate: number // 0-1
  refinementRate: number // 0-1
  averageLatencyTolerance: number // Seconds
}

/**
 * Relationship State domain value
 */
export interface RelationshipStateValue {
  trustMaturity: number // 0-1 (new user to established)
  autonomyTolerance: number // 0-1 (low to high autonomy)
  correctionRate: number // How often they correct OSQR
  acceptanceRate: number // How often they accept suggestions
  feedbackFrequency: number // How often they give explicit feedback
  sessionCount: number
  totalDurationMinutes: number
}

/**
 * Decision Friction Profile domain value
 */
export interface DecisionFrictionValue {
  hesitationPoints: string[] // Topics where user hesitates
  overAnalysisRate: number // 0-1
  momentumTriggers: string[] // What prompts action
  decisionBacklogSize: number
  averageDecisionTime: number // Days
}

/**
 * Union type for all domain values
 */
export type DomainValue =
  | IdentityContextValue
  | GoalsValuesValue
  | CognitiveStyleValue
  | CommunicationPrefsValue
  | ExpertiseCalibrationValue
  | BehavioralPatternsValue
  | RelationshipStateValue
  | DecisionFrictionValue

// ============================================
// Signal Types
// ============================================

/**
 * Base signal structure
 */
export interface UIPSignalBase {
  signalType: string
  category: UIPSignalCategory
  strength: number // 0-1
  sessionId?: string
  messageId?: string
  timestamp: Date
}

/**
 * Mode selection signal
 */
export interface ModeSelectionSignal extends UIPSignalBase {
  signalType: 'mode_selection'
  category: 'MODE_SELECTION'
  data: {
    mode: 'quick' | 'thoughtful' | 'contemplate' | 'council'
    context?: string
  }
}

/**
 * Session timing signal
 */
export interface SessionTimingSignal extends UIPSignalBase {
  signalType: 'session_timing'
  category: 'SESSION_TIMING'
  data: {
    startTime: string // ISO string
    endTime?: string
    durationMinutes?: number
    dayOfWeek: number
    hourOfDay: number
  }
}

/**
 * Message style signal
 */
export interface MessageStyleSignal extends UIPSignalBase {
  signalType: 'message_style'
  category: 'MESSAGE_STYLE'
  data: {
    wordCount: number
    sentenceCount: number
    avgWordsPerSentence: number
    hasStructure: boolean // bullets, numbered lists
    hasTechnicalTerms: boolean
    questionCount: number
    tone: 'formal' | 'casual' | 'technical' | 'mixed'
  }
}

/**
 * Feedback signal (corrections, praise, frustration)
 */
export interface FeedbackSignal extends UIPSignalBase {
  signalType: 'feedback_signal'
  category: 'FEEDBACK_SIGNALS'
  data: {
    feedbackType: 'correction' | 'praise' | 'frustration' | 'acceptance' | 'rejection'
    explicit: boolean // User explicitly stated vs inferred
    context?: string
  }
}

/**
 * Preference statement signal
 */
export interface PreferenceStatementSignal extends UIPSignalBase {
  signalType: 'preference_statement'
  category: 'PREFERENCE_STATEMENTS'
  data: {
    domain: UIPDomain
    preference: string
    explicit: boolean
  }
}

/**
 * Question sophistication signal
 */
export interface QuestionSophisticationSignal extends UIPSignalBase {
  signalType: 'question_sophistication'
  category: 'QUESTION_SOPHISTICATION'
  data: {
    complexity: number // 0-1
    domain?: string
    requiresExpertise: boolean
    isFollowUp: boolean
  }
}

/**
 * Retry pattern signal
 */
export interface RetryPatternSignal extends UIPSignalBase {
  signalType: 'retry_pattern'
  category: 'RETRY_PATTERN'
  data: {
    action: 'retry' | 'abort' | 'refine' | 'accept'
    attemptNumber: number
    context?: string
  }
}

/**
 * Goal reference signal
 */
export interface GoalReferenceSignal extends UIPSignalBase {
  signalType: 'goal_reference'
  category: 'GOAL_REFERENCES'
  data: {
    goalText: string
    timeframe?: 'short' | 'medium' | 'long'
    isNew: boolean
    isProgress: boolean
  }
}

/**
 * Decision mention signal
 */
export interface DecisionMentionSignal extends UIPSignalBase {
  signalType: 'decision_mention'
  category: 'DECISION_MENTIONS'
  data: {
    decisionText: string
    isMade: boolean // Decision made vs still deciding
    isRepeated: boolean // Mentioned before
  }
}

/**
 * Union type for all signals
 */
export type UIPSignalData =
  | ModeSelectionSignal
  | SessionTimingSignal
  | MessageStyleSignal
  | FeedbackSignal
  | PreferenceStatementSignal
  | QuestionSophisticationSignal
  | RetryPatternSignal
  | GoalReferenceSignal
  | DecisionMentionSignal

// ============================================
// Profile Types
// ============================================

/**
 * Assembled UIP for context injection
 */
export interface AssembledUIP {
  // Identity
  name?: string
  role?: string
  expertise: {
    expert: string[]
    learning: string[]
  }

  // Communication preferences
  verbosity: 'concise' | 'moderate' | 'detailed'
  tone: 'directive' | 'exploratory' | 'supportive'
  proactivity: number

  // Cognitive style
  explanationStyle: 'theory-first' | 'example-first' | 'balanced'
  detailLevel: 'high-level' | 'moderate' | 'detailed'

  // Relationship
  trustLevel: 'new' | 'developing' | 'established'
  autonomyLevel: 'low' | 'medium' | 'high'

  // Active context
  activeGoals: string[]
  recentDecisions: string[]

  // Confidence
  overallConfidence: number
  lastUpdated: Date
}

/**
 * Profile summary for system prompt injection
 */
export interface UIPContextSummary {
  shouldPersonalize: boolean
  summary: string // Human-readable summary for system prompt
  adapters: {
    suggestedMode?: 'quick' | 'thoughtful' | 'contemplate'
    verbosityMultiplier: number // 0.5 (concise) to 2.0 (detailed)
    proactivityLevel: number // 0 (never) to 1 (always)
    autonomyLevel: number // 0 (always ask) to 1 (full autonomy)
  }
  confidence: number
}

// ============================================
// Elicitation Types
// ============================================

/**
 * Elicitation question definition
 */
export interface ElicitationQuestion {
  id: string
  domain: UIPDomain
  question: string
  shortForm: string // For UI display
  priority: number // Higher = ask earlier
  phase: 1 | 2 | 3 | 4 // Which onboarding phase
  skipCondition?: (profile: AssembledUIP) => boolean // When to skip
}

/**
 * Elicitation decision
 */
export interface ElicitationDecision {
  shouldAsk: boolean
  question?: ElicitationQuestion
  reason: string
}

// ============================================
// Decay and Confidence
// ============================================

/**
 * Confidence thresholds for behavior
 */
export const CONFIDENCE_THRESHOLDS = {
  ACT_WITHOUT_ASKING: 0.8,
  ACT_WITH_UNCERTAINTY: 0.6,
  ASK_BEFORE_ACTING: 0.4,
  TREAT_AS_UNKNOWN: 0.3,
} as const

/**
 * Initial confidence by source
 */
export const SOURCE_CONFIDENCE = {
  EXPLICIT_PKV: 1.0,
  ELICITATION: 0.95,
  BEHAVIORAL_REPEATED: 0.8,
  BEHAVIORAL_SINGLE: 0.5,
  DOC_STYLE: 0.6,
} as const

/**
 * Default decay rates by domain tier
 */
export const DEFAULT_DECAY_RATES = {
  FOUNDATION: 0.1, // Slow decay - identity is stable
  STYLE: 0.2, // Moderate decay
  DYNAMICS: 0.3, // Faster decay - behavior shifts
} as const

// ============================================
// Domain Metadata
// ============================================

/**
 * Domain configuration
 */
export const DOMAIN_CONFIG: Record<UIPDomain, {
  tier: UIPTier
  decayRate: number
  privacyMinimum: PrivacyTier
  description: string
}> = {
  IDENTITY_CONTEXT: {
    tier: 'FOUNDATION',
    decayRate: 0.1,
    privacyMinimum: 'B',
    description: 'Name, role, industry, timezone',
  },
  GOALS_VALUES: {
    tier: 'FOUNDATION',
    decayRate: 0.2,
    privacyMinimum: 'B',
    description: 'Active goals, values, constraints',
  },
  COGNITIVE_STYLE: {
    tier: 'STYLE',
    decayRate: 0.15,
    privacyMinimum: 'B',
    description: 'Abstract vs concrete, linear vs associative',
  },
  COMMUNICATION_PREFS: {
    tier: 'STYLE',
    decayRate: 0.2,
    privacyMinimum: 'B',
    description: 'Verbosity, tone, proactivity tolerance',
  },
  EXPERTISE_CALIBRATION: {
    tier: 'STYLE',
    decayRate: 0.3,
    privacyMinimum: 'B',
    description: 'Expert vs learning domains',
  },
  BEHAVIORAL_PATTERNS: {
    tier: 'DYNAMICS',
    decayRate: 0.4,
    privacyMinimum: 'A',
    description: 'Session timing, mode usage, retry patterns',
  },
  RELATIONSHIP_STATE: {
    tier: 'DYNAMICS',
    decayRate: 0.1,
    privacyMinimum: 'B',
    description: 'Trust maturity, autonomy tolerance',
  },
  DECISION_FRICTION: {
    tier: 'DYNAMICS',
    decayRate: 0.3,
    privacyMinimum: 'B',
    description: 'Hesitation points, over-analysis patterns',
  },
}
