/**
 * Bubble Interface Wrapper - TIL Integration
 *
 * Connects the Bubble UI to the Temporal Intelligence Layer (TIL).
 * Manages interrupt budgets, quiet hours, and suggestion display logic.
 *
 * ERROR RECOVERY: On any error, returns no suggestions (fail safe).
 */

import { featureFlags, bubbleConfig, temporalConfig } from './config'
import { prisma } from '@/lib/db/prisma'
import {
  getMorningDigest,
  getPreferences,
  recordOutcome,
  type ExtractedCommitment,
  type EngagementType,
  type NotificationType,
  type ExplicitFeedback,
} from './temporal-wrapper'

export type FocusModeType = 'available' | 'focused' | 'dnd'

export interface BubbleSuggestion {
  id: string
  type: 'reminder' | 'insight' | 'suggestion' | 'notification'
  title: string
  message: string
  priority: number
  commitmentId?: string
  action?: {
    label: string
    type: 'dismiss' | 'snooze' | 'act' | 'view'
  }
  actions?: string[] // ['act', 'dismiss', 'snooze']
  metadata?: Record<string, unknown>
  fallback?: boolean
  error?: string
}

export interface BubbleState {
  canShow: boolean
  currentFocusMode: FocusModeType
  bubblesShownToday: number
  remainingBudget: number
  nextAllowedTime?: Date
  isQuietHours?: boolean
  fallback?: boolean
  error?: string
}

// In-memory storage for session state
const userFocusModes = new Map<string, FocusModeType>()
const lastBubbleShownTime = new Map<string, Date>()

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(quietStart: string, quietEnd: string): boolean {
  try {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    const [startHour, startMin] = quietStart.split(':').map(Number)
    const [endHour, endMin] = quietEnd.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // Handle overnight quiet hours (e.g., 21:00 - 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  } catch {
    return false
  }
}

/**
 * Get the bubble state for a user, including TIL preferences
 */
export async function getBubbleState(userId: string): Promise<BubbleState> {
  try {
    if (!featureFlags.enableBubbleInterface || !featureFlags.enableTemporalIntelligence) {
      return {
        canShow: false,
        currentFocusMode: userFocusModes.get(userId) || 'available',
        bubblesShownToday: 0,
        remainingBudget: 0,
      }
    }

    // Get user preferences for quiet hours
    const prefs = await getPreferences(userId)
    const quietStart = prefs?.quietHoursStart || '21:00'
    const quietEnd = prefs?.quietHoursEnd || '07:00'
    const isQuiet = isInQuietHours(quietStart, quietEnd)

    // Get today's interrupt budget
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const budget = await prisma.tILInterruptBudget.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    })

    const bubblesShownToday = budget?.realtimeUsed || 0
    const maxBubbles = temporalConfig.maxDailyBubbles
    const remainingBudget = Math.max(0, maxBubbles - bubblesShownToday)

    // Check cooldown (minimum time between bubbles)
    const lastShown = lastBubbleShownTime.get(userId)
    const cooldownMs = temporalConfig.interruptCooldownMinutes * 60 * 1000
    const isInCooldown = lastShown && Date.now() - lastShown.getTime() < cooldownMs

    const focusMode = userFocusModes.get(userId) || 'available'
    const canShow =
      !isQuiet && !isInCooldown && remainingBudget > 0 && focusMode === 'available'

    return {
      canShow,
      currentFocusMode: focusMode,
      bubblesShownToday,
      remainingBudget,
      isQuietHours: isQuiet,
      nextAllowedTime: isInCooldown && lastShown
        ? new Date(lastShown.getTime() + cooldownMs)
        : undefined,
    }
  } catch (error) {
    console.error('[Bubble] getBubbleState error:', error)
    return {
      canShow: false,
      currentFocusMode: 'available',
      bubblesShownToday: 0,
      remainingBudget: 0,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if we can show a bubble to the user
 * Respects interrupt budget, quiet hours, and focus mode
 */
export async function canShowBubble(userId: string): Promise<boolean> {
  try {
    if (!featureFlags.enableBubbleInterface || !featureFlags.enableTemporalIntelligence) {
      return false
    }

    const state = await getBubbleState(userId)
    return state.canShow
  } catch (error) {
    console.error('[Bubble] canShowBubble error:', error)
    return false // Fail safe - don't show bubbles on error
  }
}

/**
 * Record that a bubble was shown to the user
 */
export async function recordBubbleShown(userId: string, category?: string): Promise<void> {
  try {
    // Update in-memory last shown time
    lastBubbleShownTime.set(userId, new Date())

    // Update database interrupt budget
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.tILInterruptBudget.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        realtimeUsed: { increment: 1 },
      },
      create: {
        userId,
        date: today,
        realtimeUsed: 1,
        digestSent: false,
        digestItemIds: [],
      },
    })

    console.log(`[Bubble] Recorded bubble shown for ${userId} (category: ${category || 'none'})`)
  } catch (error) {
    console.error('[Bubble] recordBubbleShown error:', error)
    // Fail silently - don't block on recording failure
  }
}

/**
 * Set the focus mode for a user
 */
export function setFocusMode(userId: string, mode: FocusModeType): void {
  try {
    userFocusModes.set(userId, mode)
    console.log(`[Bubble] Focus mode set to ${mode} for ${userId}`)
  } catch (error) {
    console.error('[Bubble] setFocusMode error:', error)
    // Fail silently
  }
}

/**
 * Get the current focus mode for a user
 */
export function getFocusMode(userId: string): FocusModeType {
  try {
    return userFocusModes.get(userId) || 'available'
  } catch (error) {
    console.error('[Bubble] getFocusMode error:', error)
    return 'available' // Default mode on error
  }
}

/**
 * Generate a bubble suggestion from a TIL commitment
 */
export function generateBubbleMessage(
  commitment: ExtractedCommitment,
  priority: number = 5
): BubbleSuggestion {
  try {
    const isUrgent = ['immediate', 'today'].includes(commitment.when.urgencyCategory)
    const type: BubbleSuggestion['type'] = isUrgent ? 'reminder' : 'suggestion'

    // Generate appropriate title based on urgency
    let title: string
    if (commitment.when.urgencyCategory === 'immediate') {
      title = 'Action Needed Now'
    } else if (commitment.when.urgencyCategory === 'today') {
      title = 'Due Today'
    } else if (commitment.when.urgencyCategory === 'this_week') {
      title = 'Coming Up This Week'
    } else {
      title = 'Reminder'
    }

    // Format the message with when context
    const whenText = commitment.when.rawText || 'soon'
    const message = `${commitment.what} (${whenText})`

    return {
      id: `bubble_${commitment.id}_${Date.now()}`,
      type,
      title,
      message,
      priority: Math.round(priority * 10), // Convert 0-1 to 0-10
      commitmentId: commitment.id,
      action: {
        label: isUrgent ? 'Act Now' : 'Got it',
        type: isUrgent ? 'act' : 'dismiss',
      },
      actions: ['act', 'dismiss', 'snooze'],
      metadata: {
        commitmentId: commitment.id,
        urgencyCategory: commitment.when.urgencyCategory,
        who: commitment.who,
        confidence: commitment.confidence,
      },
    }
  } catch (error) {
    console.error('[Bubble] generateBubbleMessage error:', error)
    return {
      id: `bubble_fallback_${Date.now()}`,
      type: 'notification',
      title: 'Reminder',
      message: commitment.what || 'You have a pending commitment',
      priority: 5,
      commitmentId: commitment.id,
      actions: ['act', 'dismiss', 'snooze'],
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Record user interaction with a bubble suggestion
 * This feeds back into TIL for learning
 */
export async function recordBubbleInteraction(
  suggestionId: string,
  action: 'act' | 'dismiss' | 'snooze' | 'view',
  options?: {
    commitmentId?: string
    timeToEngagement?: number
    feedback?: ExplicitFeedback
  }
): Promise<{ success: boolean }> {
  try {
    // Extract commitment ID from suggestion ID or use provided
    const commitmentId =
      options?.commitmentId ||
      suggestionId.replace(/^bubble_/, '').replace(/_\d+$/, '')

    if (!commitmentId) {
      console.warn('[Bubble] No commitment ID for interaction recording')
      return { success: false }
    }

    // Map bubble action to TIL engagement type
    const engagementMap: Record<string, EngagementType> = {
      act: 'acted',
      dismiss: 'dismissed',
      snooze: 'snoozed',
      view: 'opened',
    }

    const engagement = engagementMap[action] || 'opened'

    // Call TIL recordOutcome
    const result = await recordOutcome(commitmentId, engagement, {
      notificationType: 'realtime' as NotificationType,
      timeToEngagement: options?.timeToEngagement,
      feedback: options?.feedback,
    })

    console.log(`[Bubble] Recorded interaction: ${action} for ${commitmentId}`)
    return result
  } catch (error) {
    console.error('[Bubble] recordBubbleInteraction error:', error)
    return { success: false }
  }
}

/**
 * Get suggestions for the bubble UI
 * Combines TIL digest with filtering based on user state
 */
export async function getBubbleSuggestions(
  userId: string,
  maxResults: number = 5
): Promise<BubbleSuggestion[]> {
  try {
    if (!featureFlags.enableBubbleInterface || !featureFlags.enableTemporalIntelligence) {
      return []
    }

    // Get morning digest from TIL
    const digest = await getMorningDigest(userId)

    if (digest.items.length === 0) {
      return []
    }

    // Convert digest items to bubble suggestions
    const suggestions = digest.items.slice(0, maxResults).map((item) =>
      generateBubbleMessage(item.commitment, item.priorityScore)
    )

    return rankSuggestions(suggestions, maxResults)
  } catch (error) {
    console.error('[Bubble] getBubbleSuggestions error:', error)
    return []
  }
}

/**
 * Create a bubble engine (for compatibility with existing code)
 */
export function createBubbleEngine(_config?: Record<string, unknown>) {
  try {
    return { process: () => ({ suggestions: [] }) }
  } catch (error) {
    console.error('[Bubble] createBubbleEngine error:', error)
    return { process: () => ({ suggestions: [] }) } // Empty engine on error
  }
}

/**
 * Score a bubble suggestion for ranking
 */
export function scoreBubble(suggestion: BubbleSuggestion): number {
  try {
    const priorityScore = suggestion.priority / 10
    const typeScores: Record<string, number> = {
      reminder: 0.8,
      insight: 0.6,
      suggestion: 0.5,
      notification: 0.7,
    }
    const typeScore = typeScores[suggestion.type] || 0.5
    return priorityScore * 0.6 + typeScore * 0.4
  } catch (error) {
    console.error('[Bubble] scoreBubble error:', error)
    return 0 // Low score on error
  }
}

/**
 * Rank suggestions by score
 */
export function rankSuggestions(
  suggestions: BubbleSuggestion[],
  maxResults: number = 3
): BubbleSuggestion[] {
  try {
    return suggestions
      .map((s) => ({ suggestion: s, score: scoreBubble(s) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((item) => item.suggestion)
  } catch (error) {
    console.error('[Bubble] rankSuggestions error:', error)
    return [] // No suggestions on error
  }
}

/**
 * Format a bubble suggestion for UI display
 */
export function formatBubbleForUI(suggestion: BubbleSuggestion): {
  html: string
  text: string
} {
  try {
    const priorityClass =
      suggestion.priority >= 8
        ? 'urgent'
        : suggestion.priority >= 5
          ? 'normal'
          : 'low'
    return {
      html: `<div class="bubble bubble-${suggestion.type} priority-${priorityClass}"><h4>${suggestion.title}</h4><p>${suggestion.message}</p></div>`,
      text: `[${suggestion.title}] ${suggestion.message}`,
    }
  } catch (error) {
    console.error('[Bubble] formatBubbleForUI error:', error)
    return {
      html: '',
      text: '',
    }
  }
}
