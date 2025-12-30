/**
 * Feedback Content Extractor
 *
 * Extracts structured feedback data from natural language input.
 * Identifies sentiment, category, aspects, and cleans the content.
 */

import type {
  ExtractedFeedback,
  FeedbackSentiment,
  FeedbackCategory,
  DetectionConfidence,
  FeedbackDetectionConfig,
} from './types';
import { DEFAULT_FEEDBACK_CONFIG } from './types';
import {
  ALL_FEEDBACK_PATTERNS,
  POSITIVE_FEEDBACK_PATTERNS,
  NEGATIVE_FEEDBACK_PATTERNS,
  FEATURE_REQUEST_PATTERNS,
  BUG_REPORT_PATTERNS,
  RESPONSE_SPECIFIC_PATTERNS,
  ASPECT_PATTERNS,
  type FeedbackPattern,
} from './patterns';

/**
 * Extract structured feedback from user input
 */
export function extractFeedback(
  input: string,
  config: Partial<FeedbackDetectionConfig> = {}
): ExtractedFeedback {
  const finalConfig = { ...DEFAULT_FEEDBACK_CONFIG, ...config };
  const normalizedInput = input.toLowerCase().trim();

  // Find all matching patterns
  const matches = ALL_FEEDBACK_PATTERNS.filter((p) =>
    p.pattern.test(normalizedInput)
  );

  // Determine sentiment
  const { sentiment, confidence: sentimentConfidence } = analyzeSentiment(
    normalizedInput,
    matches
  );

  // Determine category
  const category = determineCategory(normalizedInput, matches);

  // Extract aspects mentioned
  const aspects = extractAspects(normalizedInput);

  // Check if references specific response
  const referencesSpecificResponse =
    finalConfig.detectResponseFeedback &&
    RESPONSE_SPECIFIC_PATTERNS.some((p) => p.pattern.test(normalizedInput));

  // Clean the content
  const content = cleanContent(input);

  return {
    sentiment,
    category,
    content,
    originalInput: input,
    aspects,
    sentimentConfidence,
    referencesSpecificResponse,
  };
}

/**
 * Analyze sentiment from input and matched patterns
 */
function analyzeSentiment(
  normalizedInput: string,
  matches: FeedbackPattern[]
): { sentiment: FeedbackSentiment; confidence: DetectionConfidence } {
  // Count sentiment signals
  const positiveMatches = matches.filter((m) => m.sentiment === 'positive');
  const negativeMatches = matches.filter((m) => m.sentiment === 'negative');

  // Also check for sentiment words not in patterns
  const positiveWords = countSentimentWords(normalizedInput, POSITIVE_WORDS);
  const negativeWords = countSentimentWords(normalizedInput, NEGATIVE_WORDS);

  const positiveScore =
    positiveMatches.reduce((sum, m) => sum + m.weight, 0) + positiveWords * 0.3;
  const negativeScore =
    negativeMatches.reduce((sum, m) => sum + m.weight, 0) + negativeWords * 0.3;

  // Determine sentiment
  let sentiment: FeedbackSentiment;
  let confidence: DetectionConfidence;

  if (positiveScore > 0 && negativeScore > 0) {
    // Mixed sentiment
    sentiment = 'mixed';
    confidence = 'medium';
  } else if (positiveScore > negativeScore) {
    sentiment = 'positive';
    confidence = positiveScore >= 0.8 ? 'high' : positiveScore >= 0.5 ? 'medium' : 'low';
  } else if (negativeScore > positiveScore) {
    sentiment = 'negative';
    confidence = negativeScore >= 0.8 ? 'high' : negativeScore >= 0.5 ? 'medium' : 'low';
  } else {
    sentiment = 'neutral';
    confidence = 'medium';
  }

  return { sentiment, confidence };
}

/**
 * Determine the feedback category
 */
function determineCategory(
  normalizedInput: string,
  matches: FeedbackPattern[]
): FeedbackCategory {
  // Check for specific categories in order of specificity
  if (BUG_REPORT_PATTERNS.some((p) => p.pattern.test(normalizedInput))) {
    return 'bug_report';
  }

  if (FEATURE_REQUEST_PATTERNS.some((p) => p.pattern.test(normalizedInput))) {
    return 'feature_request';
  }

  if (RESPONSE_SPECIFIC_PATTERNS.some((p) => p.pattern.test(normalizedInput))) {
    return 'response_quality';
  }

  // Check matched patterns for category
  const categoryVotes: Record<FeedbackCategory, number> = {
    general: 0,
    response_quality: 0,
    feature_request: 0,
    bug_report: 0,
    praise: 0,
    complaint: 0,
  };

  for (const match of matches) {
    categoryVotes[match.category] += match.weight;
  }

  // Find highest voted category
  let maxCategory: FeedbackCategory = 'general';
  let maxVotes = 0;

  for (const [category, votes] of Object.entries(categoryVotes)) {
    if (votes > maxVotes) {
      maxVotes = votes;
      maxCategory = category as FeedbackCategory;
    }
  }

  return maxCategory;
}

/**
 * Extract specific aspects mentioned in feedback
 */
function extractAspects(normalizedInput: string): string[] {
  const aspects: string[] = [];

  for (const { pattern, aspect } of ASPECT_PATTERNS) {
    if (pattern.test(normalizedInput)) {
      aspects.push(aspect);
    }
  }

  return Array.from(new Set(aspects)); // Deduplicate
}

/**
 * Clean the feedback content for storage
 */
function cleanContent(input: string): string {
  let content = input.trim();

  // Remove common prefixes
  const prefixes = [
    /^(feedback\s*:\s*)/i,
    /^(bug\s*:\s*)/i,
    /^(feature\s+request\s*:\s*)/i,
    /^(i\s+want\s+to\s+(give|leave|share)\s+(some\s+)?feedback\s*[.,:]\s*)/i,
    /^(here('s|\s+is)\s+(my|some)\s+feedback\s*[.,:]\s*)/i,
    /^(i\s+have\s+(some\s+)?feedback\s*[.,:]\s*)/i,
  ];

  for (const prefix of prefixes) {
    content = content.replace(prefix, '');
  }

  // Capitalize first letter
  if (content.length > 0) {
    content = content.charAt(0).toUpperCase() + content.slice(1);
  }

  return content;
}

/**
 * Count sentiment words in input
 */
function countSentimentWords(input: string, words: string[]): number {
  let count = 0;
  for (const word of words) {
    if (input.includes(word)) {
      count++;
    }
  }
  return count;
}

/**
 * Positive sentiment words
 */
const POSITIVE_WORDS = [
  'great',
  'good',
  'excellent',
  'amazing',
  'awesome',
  'fantastic',
  'wonderful',
  'perfect',
  'helpful',
  'useful',
  'love',
  'like',
  'nice',
  'best',
  'better',
  'thanks',
  'thank',
  'appreciate',
  'impressed',
  'brilliant',
  'superb',
];

/**
 * Negative sentiment words
 */
const NEGATIVE_WORDS = [
  'bad',
  'wrong',
  'terrible',
  'awful',
  'horrible',
  'poor',
  'worse',
  'worst',
  'broken',
  'useless',
  'hate',
  'dislike',
  'annoying',
  'frustrated',
  'disappointing',
  'disappointed',
  'confusing',
  'confused',
  'unhelpful',
  'slow',
  'bug',
  'error',
  'fail',
  'failed',
];

export default {
  extractFeedback,
};
