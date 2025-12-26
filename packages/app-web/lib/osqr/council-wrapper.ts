/**
 * Council Mode Wrapper - Integration with @osqr/core
 *
 * This wrapper provides multi-model deliberation for Contemplate mode.
 * Council Mode dispatches queries to multiple AI models (Claude, GPT-4, Gemini)
 * and synthesizes their responses into a unified, higher-quality answer.
 *
 * Used by:
 * - Contemplate mode (full council deliberation)
 * - "See what another AI thinks" feature (partial council)
 * - Auto-trigger on high-stakes queries
 */

import { Council } from '@osqr/core';
import { featureFlags } from './config';

// Type aliases for cleaner code
type ModelResponse = Parameters<typeof Council.synthesize>[1][0];
type CouncilDeliberation = NonNullable<Awaited<ReturnType<typeof Council.executeCouncil>>['deliberation']>;
type UserTier = 'free' | 'pro' | 'enterprise';

export interface CouncilDecision {
  shouldTrigger: boolean;
  reason: string;
  confidence: number;
  triggerType?: string;
}

export interface CouncilResponse {
  synthesizedAnswer: string;
  modelOpinions: Array<{
    model: string;
    content: string;
    confidence: number;
    reasoning: string;
  }>;
  consensus: {
    level: 'full' | 'partial' | 'none';
    agreementScore: number;
    divergentPoints: string[];
  };
  processingTimeMs: number;
}

/**
 * Check if a query should trigger council mode
 */
export function shouldTriggerCouncil(
  query: string,
  context?: {
    conversationHistory?: Array<{ role: string; content: string }>;
    userTier?: 'free' | 'pro' | 'enterprise';
  }
): CouncilDecision {
  if (!featureFlags.enableCouncilMode) {
    return {
      shouldTrigger: false,
      reason: 'Council mode disabled by feature flag',
      confidence: 1.0,
    };
  }

  try {
    // Use the simple shouldTriggerCouncil check
    const result = Council.shouldTriggerCouncil(query);

    if (result) {
      // Get more details from evaluateCouncilTrigger
      const evaluation = Council.evaluateCouncilTrigger(query);
      return {
        shouldTrigger: evaluation.shouldTrigger,
        reason: evaluation.reason,
        confidence: 0.8, // Default confidence
      };
    }

    return {
      shouldTrigger: false,
      reason: 'Query does not meet council trigger criteria',
      confidence: 1.0,
    };
  } catch (error) {
    console.error('[OSQR] Council trigger check failed:', error);
    return {
      shouldTrigger: false,
      reason: 'Council trigger check failed',
      confidence: 0,
    };
  }
}

/**
 * Run full council deliberation
 */
export async function runDeliberation(
  query: string,
  options?: {
    models?: string[];
    context?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    timeout?: number;
  }
): Promise<CouncilResponse> {
  if (!featureFlags.enableCouncilMode) {
    return {
      synthesizedAnswer: 'Council mode is not available.',
      modelOpinions: [],
      consensus: {
        level: 'none',
        agreementScore: 0,
        divergentPoints: [],
      },
      processingTimeMs: 0,
    };
  }

  const startTime = Date.now();

  try {
    // Execute council deliberation
    const result = await Council.executeCouncil(query, undefined, {
      forceCouncil: true,
      resilientMode: true,
    });

    if (!result.triggered || !result.deliberation) {
      return {
        synthesizedAnswer: result.reason || 'Council did not trigger',
        modelOpinions: [],
        consensus: {
          level: 'none',
          agreementScore: 0,
          divergentPoints: [],
        },
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Convert deliberation to our response format
    return convertDeliberationToResponse(result.deliberation, startTime);
  } catch (error) {
    console.error('[OSQR] Council deliberation failed:', error);
    return {
      synthesizedAnswer: 'Council deliberation failed. Please try again.',
      modelOpinions: [],
      consensus: {
        level: 'none',
        agreementScore: 0,
        divergentPoints: [],
      },
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Synthesize responses from multiple models
 * Used by "See what another AI thinks" feature
 */
export async function synthesizeResponses(
  query: string,
  responses: Array<{
    model: string;
    content: string;
    confidence: number;
  }>
): Promise<{
  answer: string;
  confidence: number;
  agreement: string;
}> {
  if (!featureFlags.enableCouncilMode) {
    // Fallback: return highest confidence response
    const sorted = [...responses].sort((a, b) => b.confidence - a.confidence);
    return {
      answer: sorted[0]?.content || 'No responses to synthesize.',
      confidence: sorted[0]?.confidence || 0,
      agreement: 'none',
    };
  }

  try {
    // Convert to @osqr/core model response format
    const modelResponses: ModelResponse[] = responses.map((r) => ({
      modelId: r.model,
      modelDisplayName: r.model,
      content: r.content,
      summary: r.content.slice(0, 200),
      confidence: {
        rawScore: r.confidence,
        normalizedScore: r.confidence,
        reasoningDepth: 0.5,
      },
      sourcesCited: [],
      reasoningChain: [],
      latencyMs: 0,
      tokensUsed: 0,
      timestamp: new Date().toISOString(),
      status: 'success' as const,
    }));

    // Use @osqr/core synthesis
    const synthesis = await Council.synthesize(query, modelResponses);

    // Calculate average confidence
    const avgConfidence =
      modelResponses.reduce((sum, r) => sum + r.confidence.normalizedScore, 0) /
      modelResponses.length;

    return {
      answer: synthesis.finalResponse,
      confidence: avgConfidence,
      agreement: 'partial', // Simplified - could parse transparency flags
    };
  } catch (error) {
    console.error('[OSQR] Response synthesis failed:', error);
    // Fallback to simple selection
    const sorted = [...responses].sort((a, b) => b.confidence - a.confidence);
    return {
      answer: sorted[0]?.content || 'Synthesis failed.',
      confidence: sorted[0]?.confidence || 0,
      agreement: 'none',
    };
  }
}

/**
 * Format council discussion for display
 */
export function formatCouncilDiscussion(response: CouncilResponse): string {
  const parts: string[] = ['## Council Deliberation\n'];

  // Add model opinions
  if (response.modelOpinions.length > 0) {
    parts.push('### Model Perspectives\n');
    for (const opinion of response.modelOpinions) {
      const confidencePercent = (opinion.confidence * 100).toFixed(0);
      parts.push(`**${opinion.model}** (${confidencePercent}% confidence):`);
      parts.push(opinion.content);
      if (opinion.reasoning) {
        parts.push(`*Reasoning: ${opinion.reasoning}*`);
      }
      parts.push('');
    }
  }

  // Add consensus analysis
  parts.push('### Consensus Analysis\n');
  const consensusLabel =
    response.consensus.level === 'full'
      ? 'Full Agreement'
      : response.consensus.level === 'partial'
        ? 'Partial Agreement'
        : 'Disagreement';
  parts.push(
    `**Level:** ${consensusLabel} (${(response.consensus.agreementScore * 100).toFixed(0)}%)`
  );

  if (response.consensus.divergentPoints.length > 0) {
    parts.push('\n**Points of Divergence:**');
    for (const point of response.consensus.divergentPoints) {
      parts.push(`- ${point}`);
    }
  }

  // Add synthesized answer
  parts.push('\n### Synthesized Answer\n');
  parts.push(response.synthesizedAnswer);

  // Add timing
  parts.push(`\n*Deliberation completed in ${response.processingTimeMs}ms*`);

  return parts.join('\n');
}

/**
 * Get available models for council
 * Returns the list of models that can be used based on tier
 */
export function getAvailableModels(tier?: 'free' | 'pro' | 'enterprise'): string[] {
  if (!featureFlags.enableCouncilMode) {
    return [];
  }

  // Model count available per tier:
  // - free: 2 models
  // - pro: 3 models
  // - enterprise: unlimited
  const defaultModels = ['claude-sonnet', 'gpt-4o', 'gemini-pro'];

  try {
    const modelCount = Council.getAvailableModels(mapTierToCore(tier || 'free'));
    return defaultModels.slice(0, modelCount);
  } catch {
    return defaultModels;
  }
}

/**
 * Check if user can use council mode based on tier
 */
export function canUserUseCouncil(
  tier: 'free' | 'pro' | 'enterprise',
  councilUsesToday?: number
): boolean {
  if (!featureFlags.enableCouncilMode) {
    return false;
  }

  try {
    const result = Council.canUseCouncil(mapTierToCore(tier), councilUsesToday || 0);
    return result.allowed;
  } catch {
    // Fallback: pro and enterprise can use council
    return tier === 'pro' || tier === 'enterprise';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map app tier to @osqr/core tier
 */
function mapTierToCore(tier?: 'free' | 'pro' | 'enterprise'): UserTier {
  switch (tier) {
    case 'free':
      return 'free';
    case 'pro':
      return 'pro';
    case 'enterprise':
      return 'enterprise';
    default:
      return 'free';
  }
}

/**
 * Convert @osqr/core deliberation to our response format
 */
function convertDeliberationToResponse(
  deliberation: CouncilDeliberation,
  startTime: number
): CouncilResponse {
  // Extract model opinions from responses
  const modelOpinions = deliberation.responses.map((r: ModelResponse) => ({
    model: Council.getModelDisplayName(r.modelId) || r.modelId,
    content: r.content,
    confidence: r.confidence?.normalizedScore || 0.5,
    reasoning: r.summary || r.content.slice(0, 200) + '...', // Use summary or brief excerpt
  }));

  // Map agreement level
  let consensusLevel: 'full' | 'partial' | 'none' = 'none';
  const agreementLevel = deliberation.agreement?.level;
  if (agreementLevel === 'high') {
    consensusLevel = 'full';
  } else if (agreementLevel === 'moderate' || agreementLevel === 'low') {
    consensusLevel = 'partial';
  } else if (agreementLevel === 'split') {
    consensusLevel = 'none';
  }

  // Extract divergent points
  const divergentPoints =
    deliberation.agreement?.divergentPoints?.map((dp: { topic: string }) => dp.topic) || [];

  return {
    synthesizedAnswer: deliberation.synthesis?.finalResponse || 'No synthesis available',
    modelOpinions,
    consensus: {
      level: consensusLevel,
      agreementScore: (deliberation.agreement?.score || 0) / 100, // Convert from percentage
      divergentPoints,
    },
    processingTimeMs: Date.now() - startTime,
  };
}
