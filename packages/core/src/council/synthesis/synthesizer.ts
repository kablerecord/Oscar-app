/**
 * Oscar Synthesis Layer
 *
 * Core arbitration logic that synthesizes multi-model responses
 * into a unified Oscar response.
 */

import type {
  ModelResponse,
  CouncilDeliberation,
  SynthesisResult,
  ModelWeight,
  ArbitrationEntry,
  AgreementAnalysis,
  CouncilTriggerType,
} from '../types';
import { analyzeAgreement } from './agreement';
import { buildSynthesisPrompt } from './prompts';
import {
  getSpecialtyWeights,
  mapClassificationToQueryType,
  estimateCost,
  getModelDisplayName,
  QueryType,
} from '../config';

/**
 * Synthesis options
 */
export interface SynthesisOptions {
  queryClassification?: string[];
  resilientMode?: boolean;
  maxResponseLength?: number;
}

/**
 * Main synthesis function - creates a unified response from multiple model outputs
 */
export async function synthesize(
  originalQuery: string,
  responses: ModelResponse[],
  options: SynthesisOptions = {}
): Promise<SynthesisResult> {
  const arbitrationLog: ArbitrationEntry[] = [];
  const queryClassification = options.queryClassification || ['general'];

  // Step 1: Log dispatch
  arbitrationLog.push({
    step: 1,
    action: 'dispatch',
    reasoning: `Query classified as: ${queryClassification.join(', ')}`,
    outcome: `${responses.length} model(s) responded`,
  });

  // Step 2: Calculate weights based on query type
  const queryType = mapClassificationToQueryType(queryClassification);
  const weights = calculateModelWeights(responses, queryType);

  arbitrationLog.push({
    step: 2,
    action: 'weight',
    reasoning: `Query type "${queryType}" matched to specialty weights`,
    outcome: weights.map((w) => `${getModelDisplayName(w.modelId)}: ${w.adjustedWeight}%`).join(', '),
  });

  // Step 3: Analyze agreement
  const agreement = analyzeAgreement(responses);

  arbitrationLog.push({
    step: 3,
    action: 'analyze',
    reasoning: 'Compared aligned vs divergent points across responses',
    outcome: `Agreement: ${agreement.level} (${agreement.score}%)`,
  });

  // Step 4: Resolve divergences
  const transparencyFlags: string[] = [];

  if (agreement.divergentPoints.length > 0) {
    arbitrationLog.push({
      step: 4,
      action: 'resolve',
      reasoning: `${agreement.divergentPoints.length} divergence(s) detected`,
      outcome: agreement.divergentPoints
        .map((d) => `${d.topic}: ${d.resolution}`)
        .join('; '),
    });

    // Add transparency flags for significant disagreements
    agreement.divergentPoints.forEach((d) => {
      if (d.resolution === 'presented_both') {
        transparencyFlags.push(d.topic.toLowerCase().replace(/\s+/g, '_'));
      }
    });
  }

  // Step 5: Generate synthesized response
  const finalResponse = generateSynthesis(responses, agreement, weights, options);

  arbitrationLog.push({
    step: 5,
    action: 'synthesize',
    reasoning: 'Generated unified response from model outputs',
    outcome: `${finalResponse.split(/\s+/).length} words, ${transparencyFlags.length} flag(s)`,
  });

  return {
    finalResponse,
    arbitrationLog,
    weightsApplied: weights,
    transparencyFlags,
  };
}

/**
 * Calculate model weights based on query type and confidence
 */
export function calculateModelWeights(
  responses: ModelResponse[],
  queryType: QueryType
): ModelWeight[] {
  const specialtyWeights = getSpecialtyWeights(queryType);

  return responses.map((response) => {
    // Get base weight from specialty mapping
    let baseWeight: number;
    if (response.modelId.includes('claude')) {
      baseWeight = specialtyWeights.claude;
    } else if (response.modelId.includes('gpt')) {
      baseWeight = specialtyWeights.gpt4;
    } else if (response.modelId.includes('gemini')) {
      baseWeight = specialtyWeights.gemini;
    } else {
      baseWeight = 33; // Equal weight for unknown models
    }

    // Adjust based on confidence
    const confidenceAdjustment = (response.confidence.normalizedScore - 75) / 50;
    const adjustedWeight = Math.round(baseWeight * (1 + confidenceAdjustment * 0.1));

    return {
      modelId: response.modelId,
      baseWeight,
      adjustedWeight: Math.max(5, Math.min(95, adjustedWeight)), // Clamp between 5-95
      adjustmentReason:
        confidenceAdjustment > 0
          ? 'Higher confidence'
          : confidenceAdjustment < 0
          ? 'Lower confidence'
          : undefined,
    };
  });
}

/**
 * Generate the final synthesized response
 */
function generateSynthesis(
  responses: ModelResponse[],
  agreement: AgreementAnalysis,
  weights: ModelWeight[],
  options: SynthesisOptions
): string {
  const parts: string[] = [];

  // Successful responses only
  const successfulResponses = responses.filter((r) => r.status === 'success');

  if (successfulResponses.length === 0) {
    return 'I apologize, but I was unable to gather perspectives from the council at this time. Please try again or ask your question directly.';
  }

  if (successfulResponses.length === 1) {
    // Single response - use it with disclaimer
    parts.push(successfulResponses[0].content);
    parts.push(
      '\n\n📊 **Council Note**: This response came from a single model. Full council deliberation was not available.'
    );
    return parts.join('');
  }

  // Sort by adjusted weight
  const sortedByWeight = [...successfulResponses].sort((a, b) => {
    const weightA = weights.find((w) => w.modelId === a.modelId)?.adjustedWeight || 0;
    const weightB = weights.find((w) => w.modelId === b.modelId)?.adjustedWeight || 0;
    return weightB - weightA;
  });

  // High agreement - synthesize smoothly
  if (agreement.level === 'high') {
    // Lead with highest-weighted response's key points
    const primary = sortedByWeight[0];
    parts.push(primary.content);

    // Add consensus note
    parts.push(
      `\n\n📊 **Council Note**: All ${successfulResponses.length} models aligned on this recommendation.`
    );
  } else if (agreement.level === 'moderate' || agreement.level === 'low') {
    // Lead with primary recommendation
    const primary = sortedByWeight[0];
    parts.push(primary.content);

    // Surface key points from other models if they add value
    const otherInsights = sortedByWeight
      .slice(1)
      .filter((r) => r.summary !== primary.summary)
      .map((r) => `${getModelDisplayName(r.modelId)}: ${r.summary}`);

    if (otherInsights.length > 0 && agreement.divergentPoints.length > 0) {
      parts.push(`\n\n📊 **Council Note**: ${agreement.level} agreement (${agreement.score}%).`);

      // Highlight main disagreement
      const mainDivergence = agreement.divergentPoints[0];
      if (mainDivergence) {
        parts.push(
          ` Models differed on ${mainDivergence.topic}. The primary recommendation above reflects the highest-weighted perspective.`
        );
      }
    }
  } else {
    // Split council - present both sides
    parts.push(
      'The models reached different conclusions on this question. Here is a synthesis with the key disagreements noted:'
    );
    parts.push('');

    // Primary recommendation
    const primary = sortedByWeight[0];
    parts.push(`**Primary Recommendation (${getModelDisplayName(primary.modelId)}):**`);
    parts.push(primary.summary);
    parts.push('');

    // Alternative view
    if (sortedByWeight.length > 1) {
      const secondary = sortedByWeight[1];
      parts.push(`**Alternative View (${getModelDisplayName(secondary.modelId)}):**`);
      parts.push(secondary.summary);
      parts.push('');
    }

    // Disagreement details
    parts.push('📊 **Key Disagreements:**');
    agreement.divergentPoints.forEach((d) => {
      parts.push(`• ${d.topic}`);
      d.positions.forEach((p) => {
        parts.push(`  - ${getModelDisplayName(p.modelId)}: ${p.position}`);
      });
    });
  }

  let result = parts.join('\n');

  // Truncate if needed
  if (options.maxResponseLength && result.length > options.maxResponseLength) {
    result = result.slice(0, options.maxResponseLength - 3) + '...';
  }

  return result;
}

/**
 * Build a complete CouncilDeliberation object
 */
export function buildCouncilDeliberation(
  queryId: string,
  originalQuery: string,
  responses: ModelResponse[],
  synthesis: SynthesisResult,
  agreement: AgreementAnalysis,
  trigger: CouncilTriggerType,
  queryClassification: string[] = ['general']
): CouncilDeliberation {
  // Calculate totals
  const totalLatencyMs = Math.max(...responses.map((r) => r.latencyMs));
  const totalCostEstimate = responses.reduce((sum, r) => {
    const inputTokens = Math.ceil(r.tokensUsed * 0.3);
    const outputTokens = Math.ceil(r.tokensUsed * 0.7);
    return sum + estimateCost(r.modelId, inputTokens, outputTokens);
  }, 0);

  return {
    queryId,
    originalQuery,
    queryClassification,
    responses,
    agreement,
    synthesis,
    totalLatencyMs,
    totalCostEstimate,
    councilModeTrigger: trigger,
  };
}

/**
 * Create a fallback synthesis when council fails
 */
export function createFallbackSynthesis(
  reason: string,
  partialResponses: ModelResponse[] = []
): SynthesisResult {
  const arbitrationLog: ArbitrationEntry[] = [
    {
      step: 1,
      action: 'fallback',
      reasoning: reason,
      outcome: 'Council deliberation incomplete',
    },
  ];

  let finalResponse: string;
  if (partialResponses.length > 0) {
    finalResponse = partialResponses[0].content;
    finalResponse +=
      '\n\n📊 **Council Note**: Full council deliberation was not completed. This response is from a single model.';
  } else {
    finalResponse =
      "I apologize, but I couldn't gather perspectives from the council in time. Let me answer directly based on my training.";
  }

  return {
    finalResponse,
    arbitrationLog,
    weightsApplied: [],
    transparencyFlags: ['council_failed'],
  };
}

export default {
  synthesize,
  calculateModelWeights,
  buildCouncilDeliberation,
  createFallbackSynthesis,
};
