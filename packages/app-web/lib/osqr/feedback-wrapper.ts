/**
 * Feedback Wrapper
 *
 * Wraps @osqr/core Feedback module for natural language feedback detection.
 * Enables users to provide feedback conversationally (e.g., "that was helpful")
 * instead of using the button.
 */

import { Feedback } from '@osqr/core';

export type FeedbackSentiment = 'positive' | 'negative' | 'neutral' | 'mixed';
export type FeedbackCategory =
  | 'general'
  | 'response_quality'
  | 'feature_request'
  | 'bug_report'
  | 'praise'
  | 'complaint';

export interface DetectedFeedback {
  isFeedback: boolean;
  confidence: 'high' | 'medium' | 'low';
  sentiment: FeedbackSentiment;
  category: FeedbackCategory;
  content: string;
  originalInput: string;
  referencesSpecificResponse: boolean;
}

/**
 * Detect if a message contains feedback intent
 * Returns structured feedback data if detected
 */
export function detectFeedback(message: string): DetectedFeedback | null {
  try {
    const analysis = Feedback.analyzeFeedback(message);

    if (!analysis.detection.isFeedback || !analysis.feedback) {
      return null;
    }

    return {
      isFeedback: true,
      confidence: analysis.detection.confidence,
      sentiment: analysis.feedback.sentiment,
      category: analysis.feedback.category,
      content: analysis.feedback.content,
      originalInput: analysis.feedback.originalInput,
      referencesSpecificResponse: analysis.feedback.referencesSpecificResponse,
    };
  } catch (error) {
    console.error('[Feedback Wrapper] Detection error:', error);
    return null;
  }
}

/**
 * Quick check if message is feedback (no extraction)
 */
export function isFeedbackMessage(message: string): boolean {
  try {
    return Feedback.isFeedback(message);
  } catch (error) {
    console.error('[Feedback Wrapper] isFeedback error:', error);
    return false;
  }
}

/**
 * Check if message is explicit feedback request
 * (High confidence - user directly states feedback intent)
 */
export function isExplicitFeedbackRequest(message: string): boolean {
  try {
    return Feedback.isExplicitFeedback(message);
  } catch (error) {
    console.error('[Feedback Wrapper] isExplicitFeedback error:', error);
    return false;
  }
}

/**
 * Generate a friendly response for feedback acknowledgment
 */
export function getFeedbackAcknowledgment(feedback: DetectedFeedback): string {
  const { sentiment, category } = feedback;

  if (category === 'bug_report') {
    return "Thanks for reporting that. I've logged the issue so we can look into it.";
  }

  if (category === 'feature_request') {
    return "Thanks for the suggestion! I've passed it along to the team.";
  }

  if (sentiment === 'positive') {
    return "Thanks for the feedback! Glad I could help.";
  }

  if (sentiment === 'negative') {
    return "Thanks for letting me know. I'll try to do better. Your feedback helps us improve.";
  }

  if (sentiment === 'mixed') {
    return "Thanks for the balanced feedback - it really helps us improve.";
  }

  return "Thanks for the feedback! I've recorded it.";
}
