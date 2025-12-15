/**
 * Insight Queue System - Proactive Insights Push Layer
 *
 * Manages the delivery of TIL insights to users.
 * Key principles:
 * 1. Never interrupt - insights wait for natural breaks
 * 2. Priority-based - most valuable insights surface first
 * 3. Learning - tracks engagement to improve relevance
 * 4. Expiring - stale insights are auto-dismissed
 */

import { Insight } from './insights-generator'

// ============================================
// Types
// ============================================

export type InsightTrigger = 'session_start' | 'idle' | 'contextual' | 'feature_open' | 'manual'

export type InsightCategory =
  | 'contradiction'     // User said X before, now doing Y
  | 'clarify'           // User seems stuck or confused - offer help
  | 'next_step'         // Natural momentum opportunity
  | 'recall'            // Relevant past context to surface

export interface QueuedInsight {
  id: string
  workspaceId: string

  // Content
  type: InsightCategory
  title: string
  message: string

  // Delivery control
  priority: number              // 1-10, higher = more important
  trigger: InsightTrigger       // When to show
  minIdleSeconds?: number       // For idle trigger: minimum seconds before showing
  contextTags?: string[]        // For contextual: topics that activate this

  // Lifecycle
  createdAt: Date
  expiresAt: Date
  deliveredAt?: Date
  dismissedAt?: Date
  engagedAt?: Date

  // Engagement tracking
  engagementType?: 'expanded' | 'acted' | 'dismissed' | 'ignored'
  feedbackRating?: number       // -1 to 1 (not useful to very useful)

  // Source data for "tell me more"
  sourceData?: Record<string, unknown>
  expandedContent?: string      // Full context if user wants more
}

export interface InsightDeliveryState {
  pending: QueuedInsight[]
  activeInsight: QueuedInsight | null
  lastDeliveryAt: Date | null
  sessionInsightsDelivered: number
  userPreferences: InsightPreferences
  // Interrupt budget tracking
  interruptBudget: InterruptBudget
  // Engagement confidence
  engagementState: EngagementState
}

export interface InterruptBudget {
  hourlyLimit: number          // Default: 3 pulses per hour
  usedThisHour: number
  hourStartedAt: Date
}

export type EngagementLevel = 'deep' | 'active' | 'idle' | 'away'

export interface EngagementState {
  level: EngagementLevel
  lastActivityAt: Date
  typingVelocity: number       // chars per second (rolling average)
  messagePace: number          // seconds between messages (rolling avg)
  recentKeystrokes: number[]   // timestamps of recent keystrokes for velocity calc
}

export type BubbleMode = 'on' | 'off' | 'quiet'

export interface InsightPreferences {
  enabled: boolean
  bubbleMode: BubbleMode        // on = proactive, off = disabled, quiet = low-priority only
  maxPerSession: number         // 0 = unlimited
  maxPerHour: number            // Interrupt budget (default: 3)
  minIntervalMinutes: number    // Minimum time between insights
  preferredTriggers: InsightTrigger[]
  mutedCategories: InsightCategory[]
  // Category engagement rates for preference learning
  categoryEngagement: Record<InsightCategory, { shown: number; engaged: number }>
}

export interface InsightFeedback {
  insightId: string
  action: 'expand' | 'act' | 'dismiss' | 'ignore'
  rating?: number               // -1 to 1
  reason?: string               // Why dismissed/rated
  timestamp: Date
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_INSIGHT_PREFERENCES: InsightPreferences = {
  enabled: true,
  bubbleMode: 'on',
  maxPerSession: 10,
  maxPerHour: 3,              // Interrupt budget
  minIntervalMinutes: 10,
  preferredTriggers: ['session_start', 'idle', 'contextual'],
  mutedCategories: [],
  categoryEngagement: {
    contradiction: { shown: 0, engaged: 0 },
    clarify: { shown: 0, engaged: 0 },
    next_step: { shown: 0, engaged: 0 },
    recall: { shown: 0, engaged: 0 },
  },
}

const DEFAULT_INTERRUPT_BUDGET: InterruptBudget = {
  hourlyLimit: 3,
  usedThisHour: 0,
  hourStartedAt: new Date(),
}

const DEFAULT_ENGAGEMENT_STATE: EngagementState = {
  level: 'active',
  lastActivityAt: new Date(),
  typingVelocity: 0,
  messagePace: 0,
  recentKeystrokes: [],
}

export const INSIGHT_EXPIRY_HOURS: Record<InsightCategory, number> = {
  contradiction: 24,      // Fresh contradictions need addressing soon
  clarify: 24,            // Clarification offers are time-sensitive
  next_step: 48,          // Next steps have a window
  recall: 72,             // Recalls can stay relevant longer
}

// Priority weights for scoring
const PRIORITY_WEIGHTS = {
  recency: 0.25,          // How recent the insight was generated
  magnitude: 0.30,        // How significant the finding
  mscAlignment: 0.20,     // Does it relate to user's MSC items
  actionability: 0.15,    // Can the user do something with it
  novelty: 0.10,          // Is this a new type of insight for this user
}

// ============================================
// In-Memory Queue (for session-level state)
// ============================================

const sessionQueues = new Map<string, InsightDeliveryState>()

function getOrCreateSessionQueue(workspaceId: string): InsightDeliveryState {
  if (!sessionQueues.has(workspaceId)) {
    sessionQueues.set(workspaceId, {
      pending: [],
      activeInsight: null,
      lastDeliveryAt: null,
      sessionInsightsDelivered: 0,
      userPreferences: { ...DEFAULT_INSIGHT_PREFERENCES },
      interruptBudget: { ...DEFAULT_INTERRUPT_BUDGET },
      engagementState: { ...DEFAULT_ENGAGEMENT_STATE },
    })
  }
  return sessionQueues.get(workspaceId)!
}

/**
 * Check and reset interrupt budget if hour has passed
 */
function checkInterruptBudget(queue: InsightDeliveryState): boolean {
  const now = new Date()
  const hoursSinceReset = (now.getTime() - queue.interruptBudget.hourStartedAt.getTime()) / (1000 * 60 * 60)

  // Reset budget if hour has passed
  if (hoursSinceReset >= 1) {
    queue.interruptBudget.usedThisHour = 0
    queue.interruptBudget.hourStartedAt = now
  }

  // Check if we have budget remaining
  return queue.interruptBudget.usedThisHour < queue.interruptBudget.hourlyLimit
}

/**
 * Consume one interrupt from the budget
 */
function consumeInterruptBudget(queue: InsightDeliveryState): void {
  checkInterruptBudget(queue) // Ensure budget is current
  queue.interruptBudget.usedThisHour++
}

/**
 * Update engagement state based on user activity
 */
export function updateEngagementState(
  workspaceId: string,
  activity: {
    type: 'keystroke' | 'message_sent' | 'idle_check'
    timestamp?: Date
    charsTyped?: number
  }
): EngagementLevel {
  const queue = getOrCreateSessionQueue(workspaceId)
  const state = queue.engagementState
  const now = activity.timestamp || new Date()

  state.lastActivityAt = now

  if (activity.type === 'keystroke' && activity.charsTyped) {
    // Track keystroke for velocity calculation
    state.recentKeystrokes.push(now.getTime())

    // Keep only last 20 keystrokes for rolling average
    if (state.recentKeystrokes.length > 20) {
      state.recentKeystrokes = state.recentKeystrokes.slice(-20)
    }

    // Calculate typing velocity (chars per second)
    if (state.recentKeystrokes.length >= 2) {
      const timeSpan = (state.recentKeystrokes[state.recentKeystrokes.length - 1] - state.recentKeystrokes[0]) / 1000
      if (timeSpan > 0) {
        state.typingVelocity = activity.charsTyped / timeSpan
      }
    }
  }

  if (activity.type === 'message_sent') {
    // Update message pace (time since last message)
    // This would need previous message timestamp tracking
    state.recentKeystrokes = [] // Reset keystroke tracking after message
  }

  // Determine engagement level based on velocity
  if (state.typingVelocity > 3) {
    state.level = 'deep'  // Fast typing = deep focus
  } else if (state.typingVelocity > 1) {
    state.level = 'active'
  } else {
    // Check idle time
    const idleSeconds = (now.getTime() - state.lastActivityAt.getTime()) / 1000
    if (idleSeconds > 300) {
      state.level = 'away'  // 5+ minutes = away
    } else if (idleSeconds > 30) {
      state.level = 'idle'
    } else {
      state.level = 'active'
    }
  }

  return state.level
}

/**
 * Get current engagement state
 */
export function getEngagementState(workspaceId: string): EngagementState {
  const queue = getOrCreateSessionQueue(workspaceId)
  return queue.engagementState
}

/**
 * Check if it's appropriate to surface an insight based on engagement
 */
export function canSurfaceInsight(workspaceId: string): { canSurface: boolean; reason?: string } {
  const queue = getOrCreateSessionQueue(workspaceId)
  const prefs = queue.userPreferences
  const state = queue.engagementState

  // Check bubble mode
  if (prefs.bubbleMode === 'off') {
    return { canSurface: false, reason: 'Bubble is disabled' }
  }

  // Never interrupt deep focus
  if (state.level === 'deep') {
    return { canSurface: false, reason: 'User in deep focus' }
  }

  // Check interrupt budget
  if (!checkInterruptBudget(queue)) {
    return { canSurface: false, reason: 'Interrupt budget exhausted' }
  }

  // In quiet mode, only surface high-priority insights
  if (prefs.bubbleMode === 'quiet') {
    return { canSurface: true, reason: 'Quiet mode - high priority only' }
  }

  return { canSurface: true }
}

// ============================================
// Queue Management
// ============================================

/**
 * Queue an insight for delivery
 * Called by cognitive-tracker when a significant pattern is detected
 */
export function queueInsight(
  workspaceId: string,
  insight: Omit<QueuedInsight, 'id' | 'workspaceId' | 'createdAt' | 'expiresAt'>
): QueuedInsight {
  const queue = getOrCreateSessionQueue(workspaceId)

  const queuedInsight: QueuedInsight = {
    ...insight,
    id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    workspaceId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + INSIGHT_EXPIRY_HOURS[insight.type] * 60 * 60 * 1000),
  }

  // Add to pending queue
  queue.pending.push(queuedInsight)

  // Keep queue manageable (max 20 pending)
  if (queue.pending.length > 20) {
    // Remove lowest priority expired ones first
    queue.pending = queue.pending
      .filter(i => i.expiresAt > new Date())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 20)
  }

  console.log(`[TIL/InsightQueue] Queued insight: ${queuedInsight.type} - "${queuedInsight.title}" (priority: ${queuedInsight.priority})`)

  return queuedInsight
}

/**
 * Get the next insight to deliver based on current context
 */
export function getNextInsight(
  workspaceId: string,
  trigger: InsightTrigger,
  context?: {
    idleSeconds?: number
    currentTopic?: string
    isConversationActive?: boolean
    isFocusMode?: boolean        // User in contemplation/focus mode
  }
): QueuedInsight | null {
  const queue = getOrCreateSessionQueue(workspaceId)
  const prefs = queue.userPreferences

  // Check if insights are enabled
  if (!prefs.enabled) {
    return null
  }

  // Never interrupt active conversation
  if (context?.isConversationActive) {
    return null
  }

  // Focus mode integration - bubble goes dormant
  if (context?.isFocusMode) {
    return null
  }

  // Check engagement-based surfacing
  const surfaceCheck = canSurfaceInsight(workspaceId)
  if (!surfaceCheck.canSurface) {
    console.log(`[TIL/InsightQueue] Cannot surface: ${surfaceCheck.reason}`)
    return null
  }

  // Check session limit
  if (prefs.maxPerSession > 0 && queue.sessionInsightsDelivered >= prefs.maxPerSession) {
    return null
  }

  // Check minimum interval
  if (queue.lastDeliveryAt) {
    const minutesSinceLast = (Date.now() - queue.lastDeliveryAt.getTime()) / (1000 * 60)
    if (minutesSinceLast < prefs.minIntervalMinutes) {
      return null
    }
  }

  // Check if trigger is enabled
  if (!prefs.preferredTriggers.includes(trigger)) {
    return null
  }

  // Filter eligible insights
  const now = new Date()
  const eligible = queue.pending.filter(insight => {
    // Not expired
    if (insight.expiresAt <= now) return false

    // Not already delivered
    if (insight.deliveredAt) return false

    // Category not muted
    if (prefs.mutedCategories.includes(insight.type)) return false

    // In quiet mode, only high priority (7+) insights
    if (prefs.bubbleMode === 'quiet' && insight.priority < 7) return false

    // Trigger matches
    if (insight.trigger !== trigger) return false

    // Idle time check
    if (trigger === 'idle' && insight.minIdleSeconds) {
      if (!context?.idleSeconds || context.idleSeconds < insight.minIdleSeconds) {
        return false
      }
    }

    // Context tag check
    if (trigger === 'contextual' && insight.contextTags) {
      if (!context?.currentTopic) return false
      const topicLower = context.currentTopic.toLowerCase()
      if (!insight.contextTags.some(tag => topicLower.includes(tag.toLowerCase()))) {
        return false
      }
    }

    return true
  })

  if (eligible.length === 0) {
    return null
  }

  // Sort by priority (highest first), then by category engagement rate
  eligible.sort((a, b) => {
    // Primary: priority
    if (b.priority !== a.priority) return b.priority - a.priority

    // Secondary: category engagement rate (prefer categories user engages with)
    const aRate = getCategoryEngagementRate(prefs, a.type)
    const bRate = getCategoryEngagementRate(prefs, b.type)
    return bRate - aRate
  })

  return eligible[0]
}

/**
 * Get engagement rate for a category (engaged / shown)
 */
function getCategoryEngagementRate(prefs: InsightPreferences, category: InsightCategory): number {
  const stats = prefs.categoryEngagement[category]
  if (!stats || stats.shown === 0) return 0.5 // Default 50% if no data
  return stats.engaged / stats.shown
}

/**
 * Mark insight as delivered (shown to user)
 */
export function markDelivered(workspaceId: string, insightId: string): void {
  const queue = getOrCreateSessionQueue(workspaceId)
  const insight = queue.pending.find(i => i.id === insightId)

  if (insight) {
    insight.deliveredAt = new Date()
    queue.activeInsight = insight
    queue.lastDeliveryAt = new Date()
    queue.sessionInsightsDelivered++

    // Consume interrupt budget
    consumeInterruptBudget(queue)

    // Track category stats
    const categoryStats = queue.userPreferences.categoryEngagement[insight.type]
    if (categoryStats) {
      categoryStats.shown++
    }

    console.log(`[TIL/InsightQueue] Delivered insight: ${insight.id} (budget: ${queue.interruptBudget.usedThisHour}/${queue.interruptBudget.hourlyLimit})`)
  }
}

/**
 * Record user engagement with an insight
 */
export function recordEngagement(
  workspaceId: string,
  feedback: InsightFeedback
): void {
  const queue = getOrCreateSessionQueue(workspaceId)
  const insight = queue.pending.find(i => i.id === feedback.insightId) || queue.activeInsight

  if (insight && insight.id === feedback.insightId) {
    insight.engagementType = feedback.action === 'expand' ? 'expanded' :
                             feedback.action === 'act' ? 'acted' :
                             feedback.action === 'dismiss' ? 'dismissed' : 'ignored'

    if (feedback.action === 'expand') {
      insight.engagedAt = feedback.timestamp
    } else if (feedback.action === 'dismiss') {
      insight.dismissedAt = feedback.timestamp
    }

    if (feedback.rating !== undefined) {
      insight.feedbackRating = feedback.rating
    }

    // Track category engagement for preference learning
    // 'expand' and 'act' count as engaged, 'dismiss' and 'ignore' don't
    if (feedback.action === 'expand' || feedback.action === 'act') {
      const categoryStats = queue.userPreferences.categoryEngagement[insight.type]
      if (categoryStats) {
        categoryStats.engaged++
      }
    }

    // Clear active insight after engagement
    if (queue.activeInsight?.id === feedback.insightId) {
      queue.activeInsight = null
    }

    console.log(`[TIL/InsightQueue] Recorded engagement: ${feedback.action} for ${feedback.insightId}`)
  }
}

/**
 * Dismiss the current active insight
 */
export function dismissActiveInsight(workspaceId: string, reason?: string): void {
  const queue = getOrCreateSessionQueue(workspaceId)

  if (queue.activeInsight) {
    recordEngagement(workspaceId, {
      insightId: queue.activeInsight.id,
      action: 'dismiss',
      reason,
      timestamp: new Date(),
    })
  }
}

/**
 * Get current pending insights count
 */
export function getPendingCount(workspaceId: string): number {
  const queue = getOrCreateSessionQueue(workspaceId)
  const now = new Date()
  return queue.pending.filter(i => !i.deliveredAt && i.expiresAt > now).length
}

/**
 * Get the active insight if any
 */
export function getActiveInsight(workspaceId: string): QueuedInsight | null {
  const queue = getOrCreateSessionQueue(workspaceId)
  return queue.activeInsight
}

/**
 * Check if there are pending insights
 */
export function hasPendingInsights(workspaceId: string): boolean {
  return getPendingCount(workspaceId) > 0
}

// ============================================
// Preferences Management
// ============================================

/**
 * Update user preferences for insight delivery
 */
export function updatePreferences(
  workspaceId: string,
  updates: Partial<InsightPreferences>
): InsightPreferences {
  const queue = getOrCreateSessionQueue(workspaceId)
  queue.userPreferences = { ...queue.userPreferences, ...updates }
  return queue.userPreferences
}

/**
 * Get current preferences
 */
export function getPreferences(workspaceId: string): InsightPreferences {
  const queue = getOrCreateSessionQueue(workspaceId)
  return queue.userPreferences
}

/**
 * Mute a specific category
 */
export function muteCategory(workspaceId: string, category: InsightCategory): void {
  const queue = getOrCreateSessionQueue(workspaceId)
  if (!queue.userPreferences.mutedCategories.includes(category)) {
    queue.userPreferences.mutedCategories.push(category)
  }
}

/**
 * Unmute a category
 */
export function unmuteCategory(workspaceId: string, category: InsightCategory): void {
  const queue = getOrCreateSessionQueue(workspaceId)
  queue.userPreferences.mutedCategories = queue.userPreferences.mutedCategories.filter(c => c !== category)
}

// ============================================
// Prioritization Algorithm
// ============================================

/**
 * Calculate priority score for an insight
 * Used when queuing new insights
 */
export function calculatePriority(
  insight: Partial<QueuedInsight>,
  context: {
    mscItems?: string[]           // User's current MSC items
    recentInsightTypes?: InsightCategory[]  // Recently delivered types
    userEngagementHistory?: { type: InsightCategory; rating: number }[]
    confidence?: number           // How confident we are in this insight (0-1)
  }
): number {
  let score = 5 // Base score of 5/10

  // Recency bonus (newer source data = higher priority)
  score += PRIORITY_WEIGHTS.recency * 2

  // Category-based priority (contradictions and clarify are higher priority)
  switch (insight.type) {
    case 'contradiction':
      score += PRIORITY_WEIGHTS.magnitude * 4 // Contradictions are high priority
      break
    case 'clarify':
      score += PRIORITY_WEIGHTS.magnitude * 3 // User seems stuck
      break
    case 'next_step':
      score += PRIORITY_WEIGHTS.magnitude * 2 // Natural momentum
      break
    case 'recall':
      score += PRIORITY_WEIGHTS.magnitude * 1 // Helpful but less urgent
      break
  }

  // MSC alignment (if insight relates to user's tracked items)
  if (context.mscItems && insight.contextTags) {
    const mscMatch = context.mscItems.some(item =>
      insight.contextTags!.some(tag => item.toLowerCase().includes(tag.toLowerCase()))
    )
    if (mscMatch) {
      score += PRIORITY_WEIGHTS.mscAlignment * 4
    }
  }

  // Confidence bonus
  if (context.confidence !== undefined) {
    score += (context.confidence - 0.5) * 2 // -1 to +1 adjustment
  }

  // Actionability bonus
  if (insight.expandedContent) {
    score += PRIORITY_WEIGHTS.actionability * 2
  }

  // Novelty (penalize if we've shown this type recently)
  if (context.recentInsightTypes?.includes(insight.type as InsightCategory)) {
    score -= PRIORITY_WEIGHTS.novelty * 2 // Reduce priority for recent types
  }

  // Historical engagement (if user likes this type, boost it)
  if (context.userEngagementHistory) {
    const typeHistory = context.userEngagementHistory.filter(h => h.type === insight.type)
    if (typeHistory.length > 0) {
      const avgRating = typeHistory.reduce((sum, h) => sum + h.rating, 0) / typeHistory.length
      score += avgRating * 2 // -2 to +2 adjustment
    }
  }

  // Clamp to 1-10 range
  return Math.max(1, Math.min(10, Math.round(score)))
}

// ============================================
// Session Reset
// ============================================

/**
 * Reset session-level state (call on new session)
 */
export function resetSession(workspaceId: string): void {
  const queue = getOrCreateSessionQueue(workspaceId)
  queue.sessionInsightsDelivered = 0
  queue.lastDeliveryAt = null
  queue.activeInsight = null

  // Keep pending insights but mark as fresh for new session
  console.log(`[TIL/InsightQueue] Session reset for workspace: ${workspaceId}`)
}

/**
 * Clear all insights for a workspace
 */
export function clearQueue(workspaceId: string): void {
  sessionQueues.delete(workspaceId)
  console.log(`[TIL/InsightQueue] Queue cleared for workspace: ${workspaceId}`)
}
