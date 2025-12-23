/**
 * Commitment Validator - Judge model validation
 *
 * Validates extracted commitments for actionability and accuracy.
 */

import type {
  Commitment,
  ValidationResult,
  TimeReferenceType,
} from '../types';

/**
 * Past tense patterns
 */
const PAST_PATTERNS = [
  /\b(did|was|were|had|went|sent|met|finished|completed)\b/i,
  /\b(yesterday|last week|last month)\b/i,
  /\b(already|previously)\b/i,
];

/**
 * Hypothetical patterns
 */
const HYPOTHETICAL_PATTERNS = [
  /\b(would|could|might|may|if)\b/i,
  /\b(perhaps|maybe|possibly)\b/i,
  /\b(thinking about|considering)\b/i,
];

/**
 * Determine time reference type
 */
export function determineTimeReference(text: string): TimeReferenceType {
  // Check for past references
  if (PAST_PATTERNS.some((p) => p.test(text))) {
    return 'past';
  }

  // Check for hypothetical
  if (HYPOTHETICAL_PATTERNS.some((p) => p.test(text))) {
    return 'hypothetical';
  }

  return 'future';
}

/**
 * Check if commitment is actionable
 */
export function isActionable(commitment: Commitment): boolean {
  // Must have a meaningful action
  if (!commitment.what || commitment.what.length < 5) {
    return false;
  }

  // Check time reference
  const timeRef = determineTimeReference(commitment.commitmentText);
  if (timeRef === 'past') {
    return false;
  }

  // Hypothetical needs higher confidence
  if (timeRef === 'hypothetical' && commitment.confidence < 0.7) {
    return false;
  }

  return true;
}

/**
 * Validate a commitment
 */
export function validateCommitment(commitment: Commitment): ValidationResult {
  const timeReference = determineTimeReference(commitment.commitmentText);
  const actionable = isActionable(commitment);

  // Calculate adjusted confidence
  let adjustedConfidence = commitment.confidence;

  // Reduce confidence for hypothetical
  if (timeReference === 'hypothetical') {
    adjustedConfidence *= 0.7;
  }

  // Reduce for past
  if (timeReference === 'past') {
    adjustedConfidence *= 0.1;
  }

  // Boost for future with specific date
  if (timeReference === 'future' && !commitment.when.isVague && commitment.when.parsedDate) {
    adjustedConfidence = Math.min(1, adjustedConfidence * 1.2);
  }

  // Generate reasoning
  let reasoning = '';
  if (!actionable) {
    if (timeReference === 'past') {
      reasoning = 'Commitment refers to past event, not actionable';
    } else if (timeReference === 'hypothetical') {
      reasoning = 'Commitment is hypothetical with low confidence';
    } else {
      reasoning = 'Commitment lacks clear actionable content';
    }
  } else {
    reasoning = `Commitment validated as ${timeReference} with ${commitment.what.length > 30 ? 'detailed' : 'brief'} action`;
  }

  return {
    isActionable: actionable,
    timeReference,
    adjustedConfidence,
    judgeReasoning: reasoning,
  };
}

/**
 * Calculate schema completeness for confidence scoring
 */
export function calculateSchemaCompleteness(commitment: Commitment): number {
  let score = 0;
  const fields = ['who', 'what', 'commitmentText'] as const;

  for (const field of fields) {
    if (commitment[field] && commitment[field].trim() !== '') {
      score += 0.25;
    }
  }

  // Check when
  if (commitment.when && commitment.when.rawText) {
    score += 0.25;
  }

  // Bonus for specific (non-vague) date
  if (commitment.when && !commitment.when.isVague && commitment.when.parsedDate) {
    score = Math.min(1, score + 0.1);
  }

  return score;
}

/**
 * Calculate hedging score from reasoning text
 */
export function calculateHedgingScore(reasoning: string): number {
  const hedgingPatterns = /might be|possibly|not sure|unclear|maybe|could be/gi;
  const matches = (reasoning.match(hedgingPatterns) || []).length;
  return Math.max(0, 1 - matches * 0.15);
}

/**
 * Calculate overall confidence score using four signals
 */
export function calculateOverallConfidence(
  commitment: Commitment,
  validation: ValidationResult,
  retrievalMatch: boolean
): number {
  const COT_WEIGHT = 0.25;
  const SCHEMA_WEIGHT = 0.25;
  const RETRIEVAL_WEIGHT = 0.25;
  const JUDGE_WEIGHT = 0.25;

  // 1. CoT Self-Doubt Signal
  const cotScore = calculateHedgingScore(commitment.reasoning);

  // 2. Schema Validation Pass
  const schemaScore = calculateSchemaCompleteness(commitment);

  // 3. Retrieval Grounding
  const retrievalScore = retrievalMatch ? 0.85 : 0.40;

  // 4. Judge Model Validation
  const judgeScore = validation.adjustedConfidence;

  return (
    cotScore * COT_WEIGHT +
    schemaScore * SCHEMA_WEIGHT +
    retrievalScore * RETRIEVAL_WEIGHT +
    judgeScore * JUDGE_WEIGHT
  );
}

/**
 * Validate multiple commitments
 */
export function validateCommitments(
  commitments: Commitment[],
  retrievalMatches: Record<string, boolean> = {}
): Map<string, ValidationResult & { overallConfidence: number }> {
  const results = new Map<string, ValidationResult & { overallConfidence: number }>();

  for (const commitment of commitments) {
    const validation = validateCommitment(commitment);
    const retrievalMatch = retrievalMatches[commitment.id] ?? false;
    const overallConfidence = calculateOverallConfidence(
      commitment,
      validation,
      retrievalMatch
    );

    results.set(commitment.id, {
      ...validation,
      overallConfidence,
    });
  }

  return results;
}

/**
 * Filter to actionable commitments only
 */
export function filterActionable(commitments: Commitment[]): Commitment[] {
  return commitments.filter((c) => {
    const validation = validateCommitment(c);
    return validation.isActionable;
  });
}

/**
 * Get commitments above confidence threshold
 */
export function filterByConfidence(
  commitments: Commitment[],
  minConfidence: number
): Commitment[] {
  return commitments.filter((c) => {
    const validation = validateCommitment(c);
    return validation.adjustedConfidence >= minConfidence;
  });
}
