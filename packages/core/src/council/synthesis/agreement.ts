/**
 * Agreement Analysis
 *
 * Detects alignment vs. divergence across model responses.
 */

import type {
  ModelResponse,
  AgreementAnalysis,
  AgreementLevel,
  DivergentPoint,
  ModelPosition,
} from '../types';
import { DEFAULT_CONFIG } from '../config';

// ============================================
// DISAGREEMENT THRESHOLD
// ============================================

const DISAGREEMENT_THRESHOLD = DEFAULT_CONFIG.disagreementThreshold;

/**
 * Check if confidence delta indicates significant disagreement
 */
export function isSignificantDisagreement(
  confidenceA: number,
  confidenceB: number,
  factualContradiction: boolean = false
): boolean {
  // Factual contradiction always triggers disagreement view
  if (factualContradiction) return true;

  // Confidence delta check
  const delta = Math.abs(confidenceA - confidenceB);
  return delta >= DISAGREEMENT_THRESHOLD;
}

// ============================================
// CONTENT SIMILARITY
// ============================================

/**
 * Extract key concepts from response
 */
export function extractKeyConcepts(response: string): Set<string> {
  const concepts = new Set<string>();

  // Extract key phrases (simplified - in production would use NLP)
  const normalized = response.toLowerCase();

  // Extract nouns and key phrases (simple heuristic)
  const words = normalized.split(/\W+/).filter((w) => w.length > 3);
  words.forEach((w) => concepts.add(w));

  return concepts;
}

/**
 * Calculate Jaccard similarity between concept sets
 */
export function calculateConceptSimilarity(
  conceptsA: Set<string>,
  conceptsB: Set<string>
): number {
  const intersection = new Set([...conceptsA].filter((x) => conceptsB.has(x)));
  const union = new Set([...conceptsA, ...conceptsB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Calculate pairwise similarity between responses
 */
export function calculatePairwiseSimilarity(
  responses: ModelResponse[]
): number[][] {
  const concepts = responses.map((r) => extractKeyConcepts(r.content));
  const n = responses.length;
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (j < i) {
        matrix[i][j] = matrix[j][i];
      } else {
        matrix[i][j] = calculateConceptSimilarity(concepts[i], concepts[j]);
      }
    }
  }

  return matrix;
}

/**
 * Calculate average similarity across all response pairs
 */
export function calculateAverageSimilarity(
  responses: ModelResponse[]
): number {
  if (responses.length < 2) return 1;

  const matrix = calculatePairwiseSimilarity(responses);
  let sum = 0;
  let count = 0;

  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      sum += matrix[i][j];
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

// ============================================
// FACTUAL CONTRADICTION DETECTION
// ============================================

const FACTUAL_PATTERNS = [
  // Numbers
  /\b(\d+(?:\.\d+)?)\s*(?:percent|%|dollars?|\$|million|billion|years?|months?|days?|hours?)/gi,
  // Yes/No
  /\b(yes|no)\b/gi,
  // Definitive statements
  /\b(is|are|was|were)\s+(?:not\s+)?(true|false|correct|incorrect|right|wrong)\b/gi,
];

/**
 * Extract factual claims from response
 */
export function extractFactualClaims(response: string): string[] {
  const claims: string[] = [];
  const sentences = response.split(/[.!?]+/).filter((s) => s.trim());

  sentences.forEach((sentence) => {
    const hasFactual = FACTUAL_PATTERNS.some((p) => p.test(sentence));
    if (hasFactual) {
      claims.push(sentence.trim());
    }
  });

  return claims;
}

/**
 * Detect potential factual contradictions between responses
 */
export function detectFactualContradictions(
  responses: ModelResponse[]
): DivergentPoint[] {
  const contradictions: DivergentPoint[] = [];

  // Extract claims from each response
  const claimsByModel = responses.map((r) => ({
    modelId: r.modelId,
    claims: extractFactualClaims(r.content),
  }));

  // Simple contradiction detection: opposite yes/no
  const yesNoByModel = responses.map((r) => ({
    modelId: r.modelId,
    hasYes: /\byes\b/i.test(r.content),
    hasNo: /\bno\b/i.test(r.content),
  }));

  const yesModels = yesNoByModel.filter((m) => m.hasYes && !m.hasNo);
  const noModels = yesNoByModel.filter((m) => m.hasNo && !m.hasYes);

  if (yesModels.length > 0 && noModels.length > 0) {
    contradictions.push({
      topic: 'Direct yes/no disagreement',
      positions: [
        ...yesModels.map((m) => ({
          modelId: m.modelId,
          position: 'Yes',
          confidence:
            responses.find((r) => r.modelId === m.modelId)?.confidence
              .normalizedScore || 50,
        })),
        ...noModels.map((m) => ({
          modelId: m.modelId,
          position: 'No',
          confidence:
            responses.find((r) => r.modelId === m.modelId)?.confidence
              .normalizedScore || 50,
        })),
      ],
      resolution: 'presented_both',
      resolutionReasoning: 'Models gave opposite yes/no answers',
    });
  }

  return contradictions;
}

// ============================================
// ALIGNED POINTS EXTRACTION
// ============================================

/**
 * Extract points that all models agree on
 */
export function extractAlignedPoints(responses: ModelResponse[]): string[] {
  if (responses.length < 2) {
    return responses[0]?.summary ? [responses[0].summary] : [];
  }

  const aligned: string[] = [];

  // Extract key phrases from each response
  const phrasesByModel = responses.map((r) => {
    const phrases: string[] = [];
    const sentences = r.content.split(/[.!?]+/).filter((s) => s.trim());

    // Take first few sentences as key points
    sentences.slice(0, 3).forEach((s) => {
      if (s.length > 20 && s.length < 200) {
        phrases.push(s.trim());
      }
    });

    return phrases;
  });

  // Find phrases with high similarity across models
  const firstModelPhrases = phrasesByModel[0];
  firstModelPhrases.forEach((phrase) => {
    const phraseWords = new Set(phrase.toLowerCase().split(/\W+/));
    let alignedCount = 1;

    for (let i = 1; i < phrasesByModel.length; i++) {
      const hasMatch = phrasesByModel[i].some((otherPhrase) => {
        const otherWords = new Set(otherPhrase.toLowerCase().split(/\W+/));
        const similarity = calculateConceptSimilarity(phraseWords, otherWords);
        return similarity > 0.3;
      });

      if (hasMatch) alignedCount++;
    }

    if (alignedCount === responses.length) {
      aligned.push(phrase);
    }
  });

  // If no specific aligned phrases found, use summaries
  if (aligned.length === 0) {
    const summaries = responses.map((r) => r.summary).filter(Boolean);
    if (summaries.length > 0) {
      aligned.push('General approach aligned across models');
    }
  }

  return aligned;
}

// ============================================
// AGREEMENT LEVEL DETERMINATION
// ============================================

/**
 * Determine agreement level from score
 */
export function determineAgreementLevel(score: number): AgreementLevel {
  if (score >= 80) return 'high';
  if (score >= 60) return 'moderate';
  if (score >= 40) return 'low';
  return 'split';
}

/**
 * Calculate agreement score (0-100)
 */
export function calculateAgreementScore(responses: ModelResponse[]): number {
  if (responses.length < 2) return 100;

  // Base score from content similarity
  const contentSimilarity = calculateAverageSimilarity(responses) * 100;

  // Adjust for confidence alignment
  const confidences = responses.map((r) => r.confidence.normalizedScore);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const confidenceVariance =
    confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) /
    confidences.length;
  const confidenceAlignment = Math.max(0, 100 - Math.sqrt(confidenceVariance));

  // Check for contradictions
  const contradictions = detectFactualContradictions(responses);
  const contradictionPenalty = contradictions.length * 15;

  // Weighted score
  const score =
    contentSimilarity * 0.5 +
    confidenceAlignment * 0.3 -
    contradictionPenalty;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Analyze agreement across model responses
 */
export function analyzeAgreement(responses: ModelResponse[]): AgreementAnalysis {
  if (responses.length === 0) {
    return {
      level: 'split',
      score: 0,
      alignedPoints: [],
      divergentPoints: [],
    };
  }

  if (responses.length === 1) {
    return {
      level: 'high',
      score: 100,
      alignedPoints: [responses[0].summary || 'Single response'],
      divergentPoints: [],
    };
  }

  const score = calculateAgreementScore(responses);
  const level = determineAgreementLevel(score);
  const alignedPoints = extractAlignedPoints(responses);
  const divergentPoints = detectFactualContradictions(responses);

  // Add confidence-based divergences
  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      const confA = responses[i].confidence.normalizedScore;
      const confB = responses[j].confidence.normalizedScore;

      if (isSignificantDisagreement(confA, confB)) {
        // Check if already captured
        const exists = divergentPoints.some(
          (d) =>
            d.positions.some((p) => p.modelId === responses[i].modelId) &&
            d.positions.some((p) => p.modelId === responses[j].modelId)
        );

        if (!exists) {
          divergentPoints.push({
            topic: 'Confidence level divergence',
            positions: [
              { modelId: responses[i].modelId, position: 'Higher confidence', confidence: confA },
              { modelId: responses[j].modelId, position: 'Lower confidence', confidence: confB },
            ],
            resolution: confA > confB ? 'model_a_weighted' : 'model_b_weighted',
            resolutionReasoning: `${Math.abs(confA - confB)}% confidence difference`,
          });
        }
      }
    }
  }

  return {
    level,
    score,
    alignedPoints,
    divergentPoints,
  };
}

/**
 * Format agreement analysis for display
 */
export function formatAgreementSummary(analysis: AgreementAnalysis): string {
  const lines: string[] = [];

  lines.push(`Agreement Level: ${analysis.level} (${analysis.score}%)`);

  if (analysis.alignedPoints.length > 0) {
    lines.push('\nAligned Points:');
    analysis.alignedPoints.forEach((p) => lines.push(`  • ${p}`));
  }

  if (analysis.divergentPoints.length > 0) {
    lines.push('\nDivergent Points:');
    analysis.divergentPoints.forEach((d) => {
      lines.push(`  • ${d.topic}:`);
      d.positions.forEach((p) => {
        lines.push(`    - ${p.modelId}: ${p.position} (${p.confidence}%)`);
      });
      lines.push(`    Resolution: ${d.resolution}`);
    });
  }

  return lines.join('\n');
}
