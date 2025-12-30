/**
 * Feedback Detection Types
 *
 * Types for detecting and extracting feedback from natural language input.
 * This enables users to provide feedback conversationally rather than through UI buttons.
 */

/**
 * Feedback sentiment detected from natural language
 */
export type FeedbackSentiment = 'positive' | 'negative' | 'neutral' | 'mixed';

/**
 * Feedback categories that can be detected
 */
export type FeedbackCategory =
  | 'general'           // General product feedback
  | 'response_quality'  // Feedback about a specific response
  | 'feature_request'   // Requesting new functionality
  | 'bug_report'        // Reporting something broken
  | 'praise'            // Explicit positive feedback
  | 'complaint';        // Explicit negative feedback

/**
 * Confidence level for detection
 */
export type DetectionConfidence = 'high' | 'medium' | 'low';

/**
 * Result of feedback intent detection
 */
export interface FeedbackDetectionResult {
  /** Whether feedback intent was detected */
  isFeedback: boolean;
  /** Confidence in the detection */
  confidence: DetectionConfidence;
  /** Raw confidence score (0-1) */
  confidenceScore: number;
  /** Matched patterns that triggered detection */
  matchedPatterns: string[];
}

/**
 * Extracted feedback content from natural language
 */
export interface ExtractedFeedback {
  /** The detected sentiment */
  sentiment: FeedbackSentiment;
  /** Category of feedback */
  category: FeedbackCategory;
  /** The core feedback message (cleaned/extracted) */
  content: string;
  /** Original user input */
  originalInput: string;
  /** Specific aspects mentioned (e.g., "response time", "accuracy") */
  aspects: string[];
  /** Confidence in sentiment detection */
  sentimentConfidence: DetectionConfidence;
  /** Whether this references a specific message/response */
  referencesSpecificResponse: boolean;
}

/**
 * Complete feedback analysis result
 */
export interface FeedbackAnalysis {
  /** Detection result */
  detection: FeedbackDetectionResult;
  /** Extracted feedback (null if not detected as feedback) */
  feedback: ExtractedFeedback | null;
  /** Timestamp of analysis */
  analyzedAt: Date;
}

/**
 * Configuration for feedback detection
 */
export interface FeedbackDetectionConfig {
  /** Minimum confidence score to consider as feedback (0-1) */
  minConfidenceThreshold: number;
  /** Whether to detect implicit feedback (e.g., "that was wrong") */
  detectImplicitFeedback: boolean;
  /** Whether to detect response-specific feedback */
  detectResponseFeedback: boolean;
  /** Custom patterns to include in detection */
  customPatterns?: RegExp[];
  /** Patterns to exclude from detection */
  excludePatterns?: RegExp[];
}

/**
 * Default configuration
 */
export const DEFAULT_FEEDBACK_CONFIG: FeedbackDetectionConfig = {
  minConfidenceThreshold: 0.5,
  detectImplicitFeedback: true,
  detectResponseFeedback: true,
};
