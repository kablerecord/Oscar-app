/**
 * OSQR Constitutional Framework - Prompt Injection Detection
 *
 * Detects potential prompt injection attacks using pattern matching.
 * This is a v1.0 heuristic approach; ML-based detection is planned for v2.0.
 */

import {
  findPatternMatches,
  calculateInjectionScore,
  containsHighSeverityPattern,
  type PatternMatch,
  type PatternCategory,
} from './patterns';

// ============================================================================
// Types
// ============================================================================

export interface InjectionDetectionResult {
  /** 0-1 score, higher = more likely injection */
  score: number;
  /** Whether the input is considered an injection attempt */
  isInjection: boolean;
  /** Pattern matches found */
  matches: PatternMatch[];
  /** Categories of patterns matched */
  categories: PatternCategory[];
  /** High severity pattern detected (immediate rejection) */
  highSeverity: boolean;
  /** Confidence in the detection */
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================================================
// Configuration
// ============================================================================

/** Default threshold for injection detection */
export const DEFAULT_INJECTION_THRESHOLD = 0.75;

/** Score above which confidence is HIGH */
const HIGH_CONFIDENCE_THRESHOLD = 0.85;

/** Score above which confidence is MEDIUM */
const MEDIUM_CONFIDENCE_THRESHOLD = 0.5;

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Detect potential prompt injection in user input.
 *
 * @param input - User input to analyze
 * @param threshold - Score threshold (0-1) above which input is considered injection
 * @returns Detection result with score, matches, and confidence
 */
export function detectPromptInjection(
  input: string,
  threshold: number = DEFAULT_INJECTION_THRESHOLD
): InjectionDetectionResult {
  // Check for high-severity patterns first (immediate rejection)
  const highSeverity = containsHighSeverityPattern(input);
  if (highSeverity) {
    return {
      score: 1.0,
      isInjection: true,
      matches: [],
      categories: [],
      highSeverity: true,
      confidence: 'HIGH',
    };
  }

  // Find all pattern matches
  const matches = findPatternMatches(input);

  // Calculate injection score
  const score = calculateInjectionScore(matches);

  // Get unique categories
  const categories = [...new Set(matches.map((m) => m.category))];

  // Determine confidence level
  let confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  if (score >= HIGH_CONFIDENCE_THRESHOLD) {
    confidence = 'HIGH';
  } else if (score >= MEDIUM_CONFIDENCE_THRESHOLD) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  return {
    score,
    isInjection: score >= threshold,
    matches,
    categories,
    highSeverity: false,
    confidence,
  };
}

/**
 * Quick check if input contains any suspicious patterns.
 * Faster than full detection, useful for initial screening.
 */
export function containsSuspiciousPatterns(input: string): boolean {
  return containsHighSeverityPattern(input) || findPatternMatches(input).length > 0;
}

/**
 * Get a human-readable explanation of why input was flagged.
 * Useful for logging and debugging, NOT for user-facing messages
 * (to avoid educating attackers).
 */
export function getDetectionExplanation(result: InjectionDetectionResult): string {
  if (result.highSeverity) {
    return 'High-severity injection pattern detected (immediate rejection)';
  }

  if (result.matches.length === 0) {
    return 'No suspicious patterns detected';
  }

  const categoryDescriptions: Record<PatternCategory, string> = {
    ROLE_CONFUSION: 'role/context manipulation',
    DELIMITER_INJECTION: 'delimiter escape attempt',
    INSTRUCTION_OVERRIDE: 'instruction override attempt',
    IDENTITY_MASKING: 'identity masking request',
    DATA_EXFILTRATION: 'data access attempt',
    TOOL_CHAINING: 'suspicious tool chaining',
  };

  const descriptions = result.categories.map((c) => categoryDescriptions[c]);

  return `Detected: ${descriptions.join(', ')} (score: ${result.score.toFixed(2)}, confidence: ${result.confidence})`;
}

// ============================================================================
// Specialized Detection
// ============================================================================

/**
 * Detect identity masking attempts specifically.
 * Used by output validator to catch identity transparency violations.
 */
export function detectIdentityMasking(text: string): boolean {
  const result = detectPromptInjection(text, 0.5);
  return result.categories.includes('IDENTITY_MASKING');
}

/**
 * Detect data exfiltration attempts specifically.
 * Used for data sovereignty enforcement.
 */
export function detectDataExfiltration(text: string): boolean {
  // Check for high-severity data exfiltration patterns directly
  const highSeverityDataPatterns = [
    /\bdump\s+(the\s+)?(database|db|memory|pkv)/i,
    /\bshow\s+(me\s+)?all\s+users/i,
  ];

  if (highSeverityDataPatterns.some(p => p.test(text))) {
    return true;
  }

  // Also check via normal detection flow
  const result = detectPromptInjection(text, 0.3);
  return result.categories.includes('DATA_EXFILTRATION');
}

/**
 * Analyze input for multiple layers of deception.
 * Multi-turn attacks may use benign-looking messages that combine to form an attack.
 */
export function analyzeMultiTurnContext(
  currentInput: string,
  previousInputs: string[]
): InjectionDetectionResult {
  // Analyze current input
  const currentResult = detectPromptInjection(currentInput);

  // If current input is already flagged, return as-is
  if (currentResult.isInjection) {
    return currentResult;
  }

  // Check if combining with previous inputs raises suspicion
  const combined = [...previousInputs, currentInput].join('\n');
  const combinedResult = detectPromptInjection(combined);

  // If combined score is significantly higher, flag it
  const scoreDelta = combinedResult.score - currentResult.score;
  if (scoreDelta > 0.3 && combinedResult.isInjection) {
    return {
      ...combinedResult,
      confidence: 'MEDIUM', // Lower confidence for multi-turn detection
    };
  }

  return currentResult;
}
