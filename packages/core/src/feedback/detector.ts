/**
 * Feedback Intent Detector
 *
 * Detects whether user input contains feedback intent and classifies it.
 * Uses pattern matching for fast, deterministic detection without LLM calls.
 */

import type {
  FeedbackDetectionResult,
  FeedbackDetectionConfig,
  DetectionConfidence,
} from './types';
import { DEFAULT_FEEDBACK_CONFIG } from './types';
import {
  ALL_FEEDBACK_PATTERNS,
  EXCLUSION_PATTERNS,
  EXPLICIT_FEEDBACK_PATTERNS,
  type FeedbackPattern,
} from './patterns';

/**
 * Detect if input contains feedback intent
 */
export function detectFeedbackIntent(
  input: string,
  config: Partial<FeedbackDetectionConfig> = {}
): FeedbackDetectionResult {
  const finalConfig = { ...DEFAULT_FEEDBACK_CONFIG, ...config };
  const normalizedInput = normalizeInput(input);

  // Check exclusion patterns first
  if (shouldExclude(normalizedInput, finalConfig.excludePatterns)) {
    return createNegativeResult();
  }

  // Find matching patterns
  const matches = findMatchingPatterns(normalizedInput, finalConfig);

  if (matches.length === 0) {
    return createNegativeResult();
  }

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(matches, normalizedInput);
  const confidence = scoreToConfidence(confidenceScore);

  // Check against threshold
  if (confidenceScore < finalConfig.minConfidenceThreshold) {
    return {
      isFeedback: false,
      confidence: 'low',
      confidenceScore,
      matchedPatterns: matches.map((m) => m.description),
    };
  }

  return {
    isFeedback: true,
    confidence,
    confidenceScore,
    matchedPatterns: matches.map((m) => m.description),
  };
}

/**
 * Quick check for explicit feedback intent (high confidence only)
 */
export function hasExplicitFeedbackIntent(input: string): boolean {
  const normalizedInput = normalizeInput(input);

  return EXPLICIT_FEEDBACK_PATTERNS.some((pattern) =>
    pattern.pattern.test(normalizedInput)
  );
}

/**
 * Normalize input for consistent matching
 */
function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Collapse whitespace
}

/**
 * Check if input should be excluded from feedback detection
 */
function shouldExclude(
  normalizedInput: string,
  customExclusions?: RegExp[]
): boolean {
  const allExclusions = customExclusions
    ? [...EXCLUSION_PATTERNS, ...customExclusions]
    : EXCLUSION_PATTERNS;

  // Only exclude if the input is primarily a question/command
  // Allow feedback that happens to contain questions
  const exclusionMatches = allExclusions.filter((pattern) =>
    pattern.test(normalizedInput)
  );

  // If it matches multiple exclusions strongly, exclude it
  // But if it also has strong feedback patterns, let those through
  if (exclusionMatches.length >= 2) {
    // Check if there are any strong feedback patterns
    const hasFeedbackPattern = ALL_FEEDBACK_PATTERNS.some(
      (p) => p.weight >= 0.8 && p.pattern.test(normalizedInput)
    );
    return !hasFeedbackPattern;
  }

  return false;
}

/**
 * Find all matching feedback patterns
 */
function findMatchingPatterns(
  normalizedInput: string,
  config: FeedbackDetectionConfig
): FeedbackPattern[] {
  let patterns = [...ALL_FEEDBACK_PATTERNS];

  // Add custom patterns if provided
  if (config.customPatterns) {
    patterns = [
      ...patterns,
      ...config.customPatterns.map((p) => ({
        pattern: p,
        sentiment: 'neutral' as const,
        category: 'general' as const,
        weight: 0.8,
        description: 'Custom pattern',
      })),
    ];
  }

  // Filter out response-specific patterns if not enabled
  if (!config.detectResponseFeedback) {
    patterns = patterns.filter((p) => p.category !== 'response_quality');
  }

  // Filter out implicit feedback if not enabled
  if (!config.detectImplicitFeedback) {
    patterns = patterns.filter((p) => p.weight >= 0.9);
  }

  return patterns.filter((pattern) => pattern.pattern.test(normalizedInput));
}

/**
 * Calculate confidence score based on matched patterns
 */
function calculateConfidenceScore(
  matches: FeedbackPattern[],
  normalizedInput: string
): number {
  if (matches.length === 0) return 0;

  // Get the highest weight match
  const maxWeight = Math.max(...matches.map((m) => m.weight));

  // Boost for multiple matches (indicates stronger signal)
  const matchCountBoost = Math.min(matches.length * 0.05, 0.15);

  // Boost for explicit feedback patterns
  const hasExplicit = matches.some(
    (m) =>
      m.description.includes('intent') ||
      m.description.includes('label') ||
      m.weight === 1.0
  );
  const explicitBoost = hasExplicit ? 0.1 : 0;

  // Penalty for very short input (might be ambiguous)
  const lengthPenalty = normalizedInput.length < 20 ? 0.1 : 0;

  // Calculate final score
  const score = Math.min(
    1.0,
    maxWeight + matchCountBoost + explicitBoost - lengthPenalty
  );

  return Math.round(score * 100) / 100;
}

/**
 * Convert numeric score to confidence level
 */
function scoreToConfidence(score: number): DetectionConfidence {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

/**
 * Create a negative detection result
 */
function createNegativeResult(): FeedbackDetectionResult {
  return {
    isFeedback: false,
    confidence: 'low',
    confidenceScore: 0,
    matchedPatterns: [],
  };
}

export default {
  detectFeedbackIntent,
  hasExplicitFeedbackIntent,
};
