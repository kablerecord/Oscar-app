/**
 * Temporal Intelligence Layer (TIL) - Main Export
 *
 * J-1: Background Awareness System
 *
 * Tracks sessions, detects patterns, and generates proactive insights.
 */

// Re-export all TIL modules
export * from './session-tracker'
export * from './pattern-detector'
export * from './insights-generator'

// Import for internal use
import { recordEvent, getOrCreateSession } from './session-tracker'
import { getContextualInsights, formatInsightsForPrompt, getProactiveMessage } from './insights-generator'

/**
 * Track a conversation in TIL
 * Call this after every OSQR response
 */
export async function trackConversation(
  workspaceId: string,
  userMessage: string,
  osqrResponse: string
): Promise<void> {
  try {
    await recordEvent(workspaceId, {
      type: 'conversation',
      content: `${userMessage}\n\n${osqrResponse}`,
      metadata: {
        userMessageLength: userMessage.length,
        responseLength: osqrResponse.length,
      },
    })
  } catch (error) {
    console.error('[TIL] Failed to track conversation:', error)
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
