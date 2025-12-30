/**
 * Feedback Analyzer
 *
 * High-level API that combines detection and extraction into a single analysis.
 * This is the main entry point for feedback processing.
 */

import type {
  FeedbackAnalysis,
  FeedbackDetectionConfig,
  FeedbackDetectionResult,
  ExtractedFeedback,
} from './types';
import { DEFAULT_FEEDBACK_CONFIG } from './types';
import { detectFeedbackIntent, hasExplicitFeedbackIntent } from './detector';
import { extractFeedback } from './extractor';

/**
 * Analyze input for feedback intent and extract structured data
 *
 * @example
 * const result = analyzeFeedback("That response was really helpful!");
 * if (result.detection.isFeedback) {
 *   console.log(result.feedback?.sentiment); // 'positive'
 *   console.log(result.feedback?.category);  // 'praise'
 * }
 */
export function analyzeFeedback(
  input: string,
  config: Partial<FeedbackDetectionConfig> = {}
): FeedbackAnalysis {
  const finalConfig = { ...DEFAULT_FEEDBACK_CONFIG, ...config };

  // First, detect if this is feedback
  const detection = detectFeedbackIntent(input, finalConfig);

  // If feedback detected, extract structured data
  let feedback: ExtractedFeedback | null = null;
  if (detection.isFeedback) {
    feedback = extractFeedback(input, finalConfig);
  }

  return {
    detection,
    feedback,
    analyzedAt: new Date(),
  };
}

/**
 * Quick check if input is feedback (no extraction)
 *
 * @example
 * if (isFeedback("I have some feedback")) {
 *   // Route to feedback handler
 * }
 */
export function isFeedback(
  input: string,
  config: Partial<FeedbackDetectionConfig> = {}
): boolean {
  const detection = detectFeedbackIntent(input, config);
  return detection.isFeedback;
}

/**
 * Check if input is explicit feedback request
 * (High confidence, user directly states feedback intent)
 *
 * @example
 * if (isExplicitFeedback("I want to leave feedback")) {
 *   // Definitely feedback, handle accordingly
 * }
 */
export function isExplicitFeedback(input: string): boolean {
  return hasExplicitFeedbackIntent(input);
}

/**
 * Get detection result only (without extraction)
 */
export function getDetectionResult(
  input: string,
  config: Partial<FeedbackDetectionConfig> = {}
): FeedbackDetectionResult {
  return detectFeedbackIntent(input, config);
}

/**
 * Extract feedback data (assumes input is already known to be feedback)
 */
export function getFeedbackData(
  input: string,
  config: Partial<FeedbackDetectionConfig> = {}
): ExtractedFeedback {
  return extractFeedback(input, config);
}

/**
 * Batch analyze multiple inputs
 */
export function analyzeMultiple(
  inputs: string[],
  config: Partial<FeedbackDetectionConfig> = {}
): FeedbackAnalysis[] {
  return inputs.map((input) => analyzeFeedback(input, config));
}

/**
 * Filter inputs to only those containing feedback
 */
export function filterFeedback(
  inputs: string[],
  config: Partial<FeedbackDetectionConfig> = {}
): string[] {
  return inputs.filter((input) => isFeedback(input, config));
}

export default {
  analyzeFeedback,
  isFeedback,
  isExplicitFeedback,
  getDetectionResult,
  getFeedbackData,
  analyzeMultiple,
  filterFeedback,
};
