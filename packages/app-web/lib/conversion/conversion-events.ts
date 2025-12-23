/**
 * OSQR Conversion Events Tracking
 *
 * Implements the conversion strategy from conversion-strategy-v1.md spec:
 * - Trial tracking with day counts
 * - Feature gates with graceful messaging
 * - Upgrade moment detection
 * - Value reinforcement after delivered value
 *
 * Philosophy: "Companion suggesting, not vendor selling"
 */

// ============================================
// Tier Definitions (aligned with TIERS config)
// ============================================

export type UserTier = 'starter' | 'trial' | 'pro' | 'master' | 'enterprise'

export interface TierInfo {
  tier: UserTier
  displayName: string
  price: number
  futurePrice: number
  isFounderPricing: boolean
  features: string[]
}

export const TIER_INFO: Record<UserTier, TierInfo> = {
  starter: {
    tier: 'starter',
    displayName: 'OSQR Starter',
    price: 20,
    futurePrice: 20,
    isFounderPricing: false,
    features: [
      '5 documents in vault',
      '10 queries per day',
      'Basic memory',
      'Quick mode only',
    ],
  },
  trial: {
    tier: 'trial',
    displayName: 'Pro Trial',
    price: 0,
    futurePrice: 0,
    isFounderPricing: false,
    features: [
      'Full Pro features for 14 days',
      '25 documents in vault',
      '100 queries per day',
      'Thoughtful mode',
    ],
  },
  pro: {
    tier: 'pro',
    displayName: 'OSQR Pro',
    price: 49,
    futurePrice: 79,
    isFounderPricing: true,
    features: [
      '25 documents in vault',
      '100 queries per day',
      'Thoughtful + Contemplate modes',
      'Full PKV memory',
    ],
  },
  master: {
    tier: 'master',
    displayName: 'OSQR Master',
    price: 149,
    futurePrice: 249,
    isFounderPricing: true,
    features: [
      '100 documents in vault',
      'Unlimited queries',
      'Council Mode (3 models debate)',
      'Priority support',
    ],
  },
  enterprise: {
    tier: 'enterprise',
    displayName: 'OSQR Enterprise',
    price: 0, // Custom
    futurePrice: 0,
    isFounderPricing: false,
    features: [
      'Unlimited everything',
      'Custom integrations',
      'Dedicated support',
      'On-premise option',
    ],
  },
}

// ============================================
// Conversion Event Types
// ============================================

export type ConversionEventType =
  // Trial events
  | 'trial_started'
  | 'trial_day_7_checkpoint'
  | 'trial_day_13_warning'
  | 'trial_ended'
  | 'trial_converted'

  // Upgrade prompt events
  | 'upgrade_prompt_shown'
  | 'upgrade_prompt_dismissed'
  | 'upgrade_prompt_clicked'
  | 'upgrade_completed'

  // Feature gate events
  | 'feature_gate_hit'
  | 'feature_gate_upgrade_clicked'
  | 'feature_gate_stayed'

  // Limit events
  | 'document_limit_hit'
  | 'query_limit_hit'
  | 'mode_limit_hit'

  // Value events
  | 'value_delivered' // Deep analysis, useful insight
  | 'value_reinforced' // Post-value acknowledgment

  // Engagement events
  | 'habit_formed' // 3+ days consecutive use
  | 'memory_demonstrated' // OSQR referenced past conversation
  | 'thoughtful_mode_success'
  | 'council_mode_success'

  // Founder pricing
  | 'founder_pricing_mentioned'

export interface ConversionEvent {
  id: string
  userId: string
  workspaceId: string
  type: ConversionEventType
  tier: UserTier
  timestamp: Date
  metadata?: {
    feature?: string
    fromTier?: UserTier
    toTier?: UserTier
    message?: string
    dayNumber?: number
    queriesUsed?: number
    documentsUsed?: number
  }
}

// ============================================
// Trial State
// ============================================

export interface TrialState {
  isActive: boolean
  startDate: Date
  endDate: Date
  daysRemaining: number
  dayNumber: number
  hasSeenDay7Checkpoint: boolean
  hasSeenDay13Warning: boolean
}

export function calculateTrialState(trialStartDate: Date | null): TrialState | null {
  if (!trialStartDate) return null

  const now = new Date()
  const start = new Date(trialStartDate)
  const end = new Date(start)
  end.setDate(end.getDate() + 14) // 14-day trial

  const dayNumber = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const daysRemaining = Math.max(0, 14 - dayNumber + 1)
  const isActive = now <= end

  return {
    isActive,
    startDate: start,
    endDate: end,
    daysRemaining,
    dayNumber,
    hasSeenDay7Checkpoint: false, // Will be set from stored state
    hasSeenDay13Warning: false,
  }
}

// ============================================
// Upgrade Moment Detection
// ============================================

export interface UpgradeMoment {
  type: 'natural_pause' | 'limit_hit' | 'feature_gate' | 'value_delivered' | 'trial_ending'
  shouldShow: boolean
  timing: 'immediate' | 'after_response' | 'next_session'
  feature?: string
  message: string
  alternativeMessage?: string // "Stay on current tier" option
}

export function detectUpgradeMoment(context: {
  tier: UserTier
  trial?: TrialState | null
  documentsUsed: number
  queriesUsedToday: number
  lastActionType: 'deep_analysis' | 'quick_chat' | 'upload' | 'mode_switch' | 'other'
  requestedFeature?: string
  isTaskComplete: boolean
}): UpgradeMoment | null {
  const { tier, trial, documentsUsed, queriesUsedToday, lastActionType, requestedFeature, isTaskComplete } = context

  // NEVER interrupt mid-task (from spec)
  if (!isTaskComplete && lastActionType !== 'other') {
    return null
  }

  // Trial ending (Day 13) - highest priority
  if (trial?.isActive && trial.dayNumber >= 13 && !trial.hasSeenDay13Warning) {
    return {
      type: 'trial_ending',
      shouldShow: true,
      timing: 'after_response',
      message: `Your trial ends tomorrow. Here's what changes if you don't continue:\n\n- I forget our conversation history\n- You lose access to Thoughtful and Contemplate modes\n- Document limit drops to Lite levels\n\nPro is $49/month. Want to keep going?`,
      alternativeMessage: 'Stay on Lite',
    }
  }

  // Document limit hit
  const docLimits: Record<UserTier, number> = {
    starter: 5,
    trial: 25,
    pro: 25,
    master: 100,
    enterprise: 9999,
  }

  if (documentsUsed >= docLimits[tier]) {
    const nextTier = tier === 'starter' || tier === 'trial' ? 'pro' : 'master'
    return {
      type: 'limit_hit',
      shouldShow: true,
      timing: 'immediate',
      feature: 'documents',
      message: `I'm at capacity. ${TIER_INFO[nextTier].displayName} holds ${docLimits[nextTier]} documents — worth it if you're building a real knowledge base.`,
      alternativeMessage: `Stay on ${TIER_INFO[tier].displayName}`,
    }
  }

  // Query limit approaching (for Starter)
  const queryLimits: Record<UserTier, number> = {
    starter: 10,
    trial: 100,
    pro: 100,
    master: 999,
    enterprise: 9999,
  }

  if (tier === 'starter' && queriesUsedToday >= queryLimits.starter) {
    return {
      type: 'limit_hit',
      shouldShow: true,
      timing: 'after_response',
      feature: 'queries',
      message: "I've used my deep thinking for today. Pro gets 100 queries. Back at full capacity tomorrow, or upgrade now.",
      alternativeMessage: "I'll wait until tomorrow",
    }
  }

  // Feature gate (mode access)
  if (requestedFeature) {
    const featureGates: Record<string, { minTier: UserTier; message: string }> = {
      thoughtful_mode: {
        minTier: 'pro',
        message: "That needs Thoughtful Mode — I'd use Claude AND GPT-4o together. That's Pro. Want to try it?",
      },
      contemplate_mode: {
        minTier: 'pro',
        message: "Contemplate Mode lets me think deeply on this. That's a Pro feature.",
      },
      council_mode: {
        minTier: 'master',
        message: "That's a Council Mode question — I'd bring in multiple models to debate it. That's a Master feature. Want me to try with what I have, or is this worth the upgrade?",
      },
    }

    const gate = featureGates[requestedFeature]
    if (gate && !tierHasAccess(tier, gate.minTier)) {
      return {
        type: 'feature_gate',
        shouldShow: true,
        timing: 'immediate',
        feature: requestedFeature,
        message: gate.message,
        alternativeMessage: 'Try without it',
      }
    }
  }

  // Value delivered - subtle acknowledgment
  if (lastActionType === 'deep_analysis' && isTaskComplete) {
    return {
      type: 'value_delivered',
      shouldShow: tier === 'starter' || tier === 'trial',
      timing: 'after_response',
      message: "That analysis took everything I had. Worth keeping access to.",
      alternativeMessage: undefined, // No alternative needed, just subtle mention
    }
  }

  return null
}

// ============================================
// Tier Access Helpers
// ============================================

function tierHasAccess(currentTier: UserTier, requiredTier: UserTier): boolean {
  const tierOrder: UserTier[] = ['starter', 'trial', 'pro', 'master', 'enterprise']
  return tierOrder.indexOf(currentTier) >= tierOrder.indexOf(requiredTier)
}

export function getRecommendedUpgradeTier(currentTier: UserTier): UserTier {
  switch (currentTier) {
    case 'starter':
    case 'trial':
      return 'pro'
    case 'pro':
      return 'master'
    default:
      return 'master'
  }
}

// ============================================
// Conversion Messages (from spec)
// ============================================

export const CONVERSION_MESSAGES = {
  // Good phrasings (from spec)
  feature_gate: (feature: string, tier: UserTier) =>
    `That needs ${feature}. Want me to try without it, or is this worth ${TIER_INFO[tier].displayName}?`,

  limit_hit: (resource: string, tier: UserTier) =>
    `I've hit my ${resource} limit. ${TIER_INFO[tier].displayName} unlocks more — or I reset tomorrow.`,

  value_delivered: "That analysis took everything I had. Worth keeping access to.",

  trial_ending: (daysLeft: number) =>
    daysLeft === 1
      ? "Your trial ends tomorrow. Here's what we've built together..."
      : `${daysLeft} days left on your trial. We've been working together for a week now.`,

  post_upgrade: "Good call. Here's what I couldn't show you before...",

  founder_pricing: "Quick note — you're on founder pricing. $49/month locks in forever, even when it goes to $79. Just so you know.",

  // Handling objections (from spec)
  objections: {
    too_expensive: "I get it. Here's the math: you've used me {X} times this week. That's ${perUse}. Worth it for what you're getting?",
    think_about_it: "Take your time. Lite isn't going anywhere, and your memory persists either way.",
    not_using_enough: "Fair. Stay on Lite until you're hitting limits. You'll know when it's time.",
    can_i_try_first: "That's what the trial is for. Want 14 days of Pro to see if it fits?",
    dont_need_unlimited: "You might be right. Lite works until it doesn't. Upgrade's there when you want it.",
    memory_question: "Yes. Memory persists across all tiers. You just get fewer queries and documents on Lite.",
  },

  // Never use these (from spec)
  badPhrasings: [
    "Upgrade now to unlock!",
    "Don't miss out on Pro!",
    "Limited time pricing!",
    "You really should upgrade for best results.",
    "I could help more if you upgraded...",
  ],
}

// ============================================
// Event Logging
// ============================================

export function createConversionEvent(
  userId: string,
  workspaceId: string,
  type: ConversionEventType,
  tier: UserTier,
  metadata?: ConversionEvent['metadata']
): ConversionEvent {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    workspaceId,
    type,
    tier,
    timestamp: new Date(),
    metadata,
  }
}

// In-memory event log (in production, this would go to analytics)
const eventLog: ConversionEvent[] = []

export function logConversionEvent(event: ConversionEvent): void {
  eventLog.push(event)
  // In production: send to analytics service
  console.log('[ConversionEvent]', event.type, event.metadata || '')
}

export function getConversionEvents(userId: string): ConversionEvent[] {
  return eventLog.filter(e => e.userId === userId)
}

// ============================================
// Post-Upgrade Experience
// ============================================

export interface PostUpgradeAction {
  type: 'run_deep_analysis' | 'show_cross_connections' | 'demonstrate_mode' | 'show_held_insights'
  description: string
}

export function getPostUpgradeActions(
  fromTier: UserTier,
  toTier: UserTier
): PostUpgradeAction[] {
  const actions: PostUpgradeAction[] = []

  if (toTier === 'pro' && (fromTier === 'starter' || fromTier === 'trial')) {
    actions.push({
      type: 'run_deep_analysis',
      description: 'Run deeper analysis on existing documents',
    })
    actions.push({
      type: 'demonstrate_mode',
      description: 'Demonstrate Thoughtful Mode with their data',
    })
  }

  if (toTier === 'master') {
    actions.push({
      type: 'show_cross_connections',
      description: 'Show cross-document connections',
    })
    actions.push({
      type: 'demonstrate_mode',
      description: 'Demonstrate Council Mode',
    })
  }

  actions.push({
    type: 'show_held_insights',
    description: 'Surface held-back insights',
  })

  return actions
}

// ============================================
// Churn Prevention Checks (from spec)
// ============================================

export interface ChurnCheck {
  day: number
  check: string
  action: string
}

export const CHURN_PREVENTION_SCHEDULE: ChurnCheck[] = [
  {
    day: 3,
    check: 'Has user returned?',
    action: 'If not, proactive "I found something in your documents..."',
  },
  {
    day: 7,
    check: 'Feature usage',
    action: 'If not using tier features, demonstrate them',
  },
  {
    day: 14,
    check: 'Pattern established?',
    action: 'If sparse usage, "Want to schedule check-ins?"',
  },
  {
    day: 30,
    check: 'Renewal approaching',
    action: 'No mention — if value exists, they stay',
  },
]

export function getChurnPreventionAction(
  daysSinceUpgrade: number,
  hasReturnedSincePurchase: boolean,
  isUsingTierFeatures: boolean
): ChurnCheck | null {
  if (daysSinceUpgrade === 3 && !hasReturnedSincePurchase) {
    return CHURN_PREVENTION_SCHEDULE[0]
  }

  if (daysSinceUpgrade === 7 && !isUsingTierFeatures) {
    return CHURN_PREVENTION_SCHEDULE[1]
  }

  if (daysSinceUpgrade === 14 && !isUsingTierFeatures) {
    return CHURN_PREVENTION_SCHEDULE[2]
  }

  return null
}
