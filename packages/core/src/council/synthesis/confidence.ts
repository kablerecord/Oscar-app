/**
 * Confidence Normalization
 *
 * Derives confidence scores from response characteristics since models
 * don't provide consistent native confidence values.
 */

import type { ConfidenceFactors, ModelConfidence } from '../types';
import { CONFIDENCE_WEIGHTS } from '../config';

// ============================================
// HEDGING LANGUAGE DETECTION
// ============================================

const HEDGING_PATTERNS = [
  /\bi think\b/gi,
  /\bprobably\b/gi,
  /\bmight\b/gi,
  /\bcould be\b/gi,
  /\bpossibly\b/gi,
  /\bit's possible\b/gi,
  /\bi'm not sure\b/gi,
  /\bi believe\b/gi,
  /\bgenerally\b/gi,
  /\btypically\b/gi,
  /\busually\b/gi,
  /\boften\b/gi,
  /\bperhaps\b/gi,
  /\bmaybe\b/gi,
  /\bseem(?:s|ingly)?\b/gi,
  /\bappear(?:s)?\b/gi,
  /\blikely\b/gi,
  /\bunlikely\b/gi,
  /\buncertain\b/gi,
];

/**
 * Calculate hedging score from response text
 * Higher score = less hedging = more confident
 */
export function calculateHedgingScore(response: string): number {
  const wordCount = response.split(/\s+/).length;
  let hedgeCount = 0;

  HEDGING_PATTERNS.forEach((pattern) => {
    const matches = response.match(pattern);
    if (matches) hedgeCount += matches.length;
  });

  // Higher score = less hedging = more confident
  const hedgeRatio = hedgeCount / Math.max(wordCount, 1);
  return Math.max(0, Math.min(100, Math.round(100 - hedgeRatio * 500)));
}

// ============================================
// REASONING DEPTH ASSESSMENT
// ============================================

/**
 * Assess reasoning depth from response structure (1-5 scale)
 */
export function assessReasoningDepth(response: string): number {
  let score = 1; // Base score

  // Check for structured reasoning
  if (/\b(first|second|third|finally)\b/gi.test(response)) score += 1;
  if (/\b(because|therefore|thus|hence)\b/gi.test(response)) score += 1;
  if (/\b(however|although|on the other hand)\b/gi.test(response)) score += 0.5;
  if (/\b(for example|specifically|in particular)\b/gi.test(response))
    score += 0.5;

  // Check for consideration of alternatives
  if (/\b(alternatively|another option|could also)\b/gi.test(response))
    score += 0.5;

  // Check for explicit assumptions or caveats
  if (/\b(assuming|given that|if we assume)\b/gi.test(response)) score += 0.5;

  // Check for numbered steps or lists
  if (/\b[1-9]\.\s|\n-\s|\n\*\s/g.test(response)) score += 0.5;

  return Math.min(5, score);
}

// ============================================
// SOURCE CITATION DETECTION
// ============================================

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const CITATION_PATTERNS = [
  /\baccording to\b/gi,
  /\bcited\b/gi,
  /\breference(?:s|d)?\b/gi,
  /\bsource(?:s)?\b/gi,
  /\bstud(?:y|ies)\b/gi,
  /\bresearch(?:ers)?\b/gi,
  /\b\d{4}\b.*\bet al\b/gi, // Academic citation pattern
];

/**
 * Count source citations in response
 */
export function countSourceCitations(response: string): number {
  // Count URLs
  const urls = response.match(URL_PATTERN) || [];
  let count = urls.length;

  // Count citation patterns
  CITATION_PATTERNS.forEach((pattern) => {
    const matches = response.match(pattern);
    if (matches) count += matches.length;
  });

  return count;
}

// ============================================
// RESPONSE COMPLETENESS
// ============================================

/**
 * Assess response completeness (0-100)
 */
export function assessResponseCompleteness(response: string): number {
  let score = 50; // Base score

  // Length-based scoring
  const wordCount = response.split(/\s+/).length;
  if (wordCount >= 100) score += 20;
  else if (wordCount >= 50) score += 10;
  else if (wordCount < 20) score -= 20;

  // Check for conclusion/summary
  if (/\b(in summary|in conclusion|to summarize|overall)\b/gi.test(response))
    score += 10;

  // Check for actionable content
  if (
    /\b(I recommend|you should|consider|steps?|action)\b/gi.test(response)
  )
    score += 10;

  // Check for direct answer
  if (/\b(yes|no|the answer is|it is|they are)\b/gi.test(response))
    score += 10;

  return Math.max(0, Math.min(100, score));
}

// ============================================
// INTERNAL CONSISTENCY
// ============================================

/**
 * Assess internal consistency (0-100)
 * Looks for contradictions within the response
 */
export function assessInternalConsistency(response: string): number {
  let score = 100; // Start with full consistency

  // Check for self-contradiction patterns
  const contradictionPatterns = [
    /\b(but|however).*(not|never).*(but|however)/gi,
    /\bis\b.*(is not|isn't)\b.*same/gi,
    /\byes\b.*\bno\b.*\byes\b/gi,
  ];

  contradictionPatterns.forEach((pattern) => {
    if (pattern.test(response)) score -= 15;
  });

  // Check for conflicting modifiers
  if (/\b(always|never).*(sometimes|occasionally)/gi.test(response)) score -= 10;

  // Check for uncertain then certain language
  if (/\b(maybe|perhaps).*(definitely|certainly)/gi.test(response)) score -= 5;

  return Math.max(0, score);
}

// ============================================
// MAIN NORMALIZATION FUNCTIONS
// ============================================

/**
 * Analyze all confidence factors from a response
 */
export function analyzeConfidenceFactors(response: string): ConfidenceFactors {
  return {
    reasoningDepth: assessReasoningDepth(response),
    hedgingLanguage: calculateHedgingScore(response),
    sourceCitations: countSourceCitations(response),
    responseCompleteness: assessResponseCompleteness(response),
    internalConsistency: assessInternalConsistency(response),
  };
}

/**
 * Normalize confidence from factors to 0-100 score
 */
export function normalizeConfidence(
  response: string,
  factors?: ConfidenceFactors
): number {
  const f = factors || analyzeConfidenceFactors(response);

  // Normalize reasoning_depth from 1-5 to 0-100
  const reasoningNormalized = (f.reasoningDepth / 5) * 100;

  // Normalize source citations (cap at 10 = 100)
  const citationsNormalized = Math.min(f.sourceCitations * 10, 100);

  // Calculate weighted score
  const score =
    reasoningNormalized * CONFIDENCE_WEIGHTS.reasoningDepth +
    f.hedgingLanguage * CONFIDENCE_WEIGHTS.hedgingLanguage +
    citationsNormalized * CONFIDENCE_WEIGHTS.sourceCitations +
    f.responseCompleteness * CONFIDENCE_WEIGHTS.responseCompleteness +
    f.internalConsistency * CONFIDENCE_WEIGHTS.internalConsistency;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Build ModelConfidence object from response
 */
export function buildModelConfidence(response: string): ModelConfidence {
  const factors = analyzeConfidenceFactors(response);

  return {
    rawScore: null, // Models don't provide native confidence
    normalizedScore: normalizeConfidence(response, factors),
    reasoningDepth: factors.reasoningDepth,
  };
}

/**
 * Format confidence breakdown for debugging
 */
export function formatConfidenceBreakdown(
  response: string,
  factors?: ConfidenceFactors
): string {
  const f = factors || analyzeConfidenceFactors(response);
  const normalized = normalizeConfidence(response, f);

  return [
    `Confidence: ${normalized}%`,
    `  Reasoning Depth: ${f.reasoningDepth}/5`,
    `  Hedging Score: ${f.hedgingLanguage}/100`,
    `  Source Citations: ${f.sourceCitations}`,
    `  Completeness: ${f.responseCompleteness}/100`,
    `  Consistency: ${f.internalConsistency}/100`,
  ].join('\n');
}
