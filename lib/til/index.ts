/**
 * Temporal Intelligence Layer (TIL) - Main Export
 *
 * J-1: Background Awareness System
 *
 * Tracks sessions, detects patterns, and generates proactive insights.
 * Extended with cognitive profiling for deep user understanding.
 */

// Re-export all TIL modules
export * from './session-tracker'
export * from './pattern-detector'
export * from './insights-generator'
export * from './cognitive-tracker'
export * from './insight-queue'

// Import for internal use
import { recordEvent, getOrCreateSession } from './session-tracker'
import { getContextualInsights, formatInsightsForPrompt, getProactiveMessage } from './insights-generator'
import { trackQuestion, trackResponseInteraction, getCognitiveProfile, formatProfileForContext } from './cognitive-tracker'

/**
 * Track a conversation in TIL
 * Call this after every OSQR response
 * Now includes cognitive profiling for 50+ behavioral dimensions
 */
export async function trackConversation(
  workspaceId: string,
  userMessage: string,
  osqrResponse: string,
  metadata?: {
    mode?: 'quick' | 'thoughtful' | 'contemplate'
    isFollowUp?: boolean
    previousTopic?: string
  }
): Promise<void> {
  try {
    // Track in session tracker (original)
    await recordEvent(workspaceId, {
      type: 'conversation',
      content: `${userMessage}\n\n${osqrResponse}`,
      metadata: {
        userMessageLength: userMessage.length,
        responseLength: osqrResponse.length,
        mode: metadata?.mode,
      },
    })

    // Track in cognitive profiler (new)
    await trackQuestion(workspaceId, userMessage, {
      responseMode: metadata?.mode || 'quick',
      isFollowUp: metadata?.isFollowUp || false,
      previousTopic: metadata?.previousTopic,
    })
  } catch (error) {
    console.error('[TIL] Failed to track conversation:', error)
  }
}

/**
 * Track user interactions with responses (copy, feedback, etc.)
 */
export async function trackInteraction(
  workspaceId: string,
  action: 'copy' | 'thumbs_up' | 'thumbs_down' | 'flag' | 'alt_opinion' | 'artifact_open'
): Promise<void> {
  try {
    await trackResponseInteraction(workspaceId, action)
  } catch (error) {
    console.error('[TIL] Failed to track interaction:', error)
  }
}

/**
 * Get cognitive profile context for OSQR prompts
 */
export async function getCognitiveContext(workspaceId: string): Promise<string | null> {
  try {
    const profile = await getCognitiveProfile(workspaceId)
    if (profile && profile.dataPoints >= 5) {
      return formatProfileForContext(profile)
    }
    return null
  } catch (error) {
    console.error('[TIL] Failed to get cognitive context:', error)
    return null
  }
}

/**
 * Track an MSC update in TIL
 */
export async function trackMSCUpdate(
  workspaceId: string,
  action: 'add' | 'update' | 'complete' | 'delete',
  item: { category: string; content: string }
): Promise<void> {
  try {
    await recordEvent(workspaceId, {
      type: 'msc_update',
      category: item.category,
      content: item.content,
      metadata: { action },
    })
  } catch (error) {
    console.error('[TIL] Failed to track MSC update:', error)
  }
}

/**
 * Get TIL insights to include in OSQR context
 */
export async function getTILContext(
  workspaceId: string,
  userMessage: string
): Promise<string | null> {
  try {
    const insights = await getContextualInsights(workspaceId, userMessage)
    if (insights.length > 0) {
      return formatInsightsForPrompt(insights)
    }
    return null
  } catch (error) {
    console.error('[TIL] Failed to get TIL context:', error)
    return null
  }
}

/**
 * Get a proactive message from TIL
 */
export async function getTILProactiveMessage(workspaceId: string): Promise<string | null> {
  try {
    return await getProactiveMessage(workspaceId)
  } catch (error) {
    console.error('[TIL] Failed to get proactive message:', error)
    return null
  }
}
