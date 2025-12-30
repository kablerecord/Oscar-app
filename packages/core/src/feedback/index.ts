/**
 * Feedback Detection Module
 *
 * Detects and extracts feedback from natural language input.
 * Enables users to provide feedback conversationally rather than through UI buttons.
 *
 * @example
 * import { Feedback } from '@osqr/core';
 *
 * // Quick check
 * if (Feedback.isFeedback("That was really helpful!")) {
 *   // Handle as feedback
 * }
 *
 * // Full analysis
 * const result = Feedback.analyzeFeedback("I want to leave feedback: the response was great");
 * if (result.detection.isFeedback) {
 *   console.log(result.feedback?.sentiment);  // 'positive'
 *   console.log(result.feedback?.content);    // 'The response was great'
 * }
 */

// Types
export type {
  FeedbackSentiment,
  FeedbackCategory,
  DetectionConfidence,
  FeedbackDetectionResult,
  ExtractedFeedback,
  FeedbackAnalysis,
  FeedbackDetectionConfig,
} from './types';

export { DEFAULT_FEEDBACK_CONFIG } from './types';

// Patterns (for advanced usage/customization)
export type { FeedbackPattern } from './patterns';
export {
  EXPLICIT_FEEDBACK_PATTERNS,
  POSITIVE_FEEDBACK_PATTERNS,
  NEGATIVE_FEEDBACK_PATTERNS,
  FEATURE_REQUEST_PATTERNS,
  BUG_REPORT_PATTERNS,
  RESPONSE_SPECIFIC_PATTERNS,
  ASPECT_PATTERNS,
  ALL_FEEDBACK_PATTERNS,
  EXCLUSION_PATTERNS,
} from './patterns';

// Detection
export {
  detectFeedbackIntent,
  hasExplicitFeedbackIntent,
} from './detector';

// Extraction
export { extractFeedback } from './extractor';

// High-level API (main entry points)
export {
  analyzeFeedback,
  isFeedback,
  isExplicitFeedback,
  getDetectionResult,
  getFeedbackData,
  analyzeMultiple,
  filterFeedback,
} from './analyzer';
