/**
 * Council Mode Wrapper for oscar-app
 *
 * Wraps the @osqr/core Council for multi-model deliberation.
 * This replaces the current lib/ai/panel.ts and lib/ai/synthesis.ts logic.
 */

import { Council } from '@osqr/core';
import { featureFlags } from './config';

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
 * Check if council mode should trigger for a query.
 * Uses the evaluateCouncilTrigger function from @osqr/core
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
      reason: 'Council mode disabled',
      confidence: 1.0,
    };
  }

  try {
    // Use the shouldTriggerCouncil function which returns boolean
    const shouldTrigger = Council.shouldTriggerCouncil(query);

    return {
      shouldTrigger,
      reason: shouldTrigger ? 'Query meets council trigger conditions' : 'Query does not require council',
      confidence: 0.8,
      triggerType: shouldTrigger ? 'auto' : undefined,
    };
  } catch (error) {
    console.error('[Council] Trigger check error:', error);
    return {
      shouldTrigger: false,
      reason: 'Error checking trigger',
      confidence: 0,
    };
  }
}

/**
 * Run a full council deliberation using executeCouncil.
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
  const startTime = Date.now();

  if (!featureFlags.enableCouncilMode) {
    return {
      synthesizedAnswer: 'Council mode is disabled.',
      modelOpinions: [],
      consensus: {
        level: 'none',
        agreementScore: 0,
        divergentPoints: [],
      },
      processingTimeMs: 0,
    };
  }

  try {
    // Use executeCouncil which is the main entry point
    const result = await Council.executeCouncil(query, undefined, {
      forceCouncil: true,
      queryClassification: [],
    });

    if (!result.triggered || !result.deliberation) {
      return {
        synthesizedAnswer: result.reason || 'Council was not triggered.',
        modelOpinions: [],
        consensus: {
          level: 'none',
          agreementScore: 0,
          divergentPoints: [],
        },
        processingTimeMs: Date.now() - startTime,
      };
    }

    const deliberation = result.deliberation;

    return {
      synthesizedAnswer: deliberation.synthesis.finalResponse,
      modelOpinions: deliberation.responses.map((r) => ({
        model: r.modelId,
        content: r.content,
        confidence: r.confidence.normalizedScore / 100,
        reasoning: r.reasoningChain.join(' '),
      })),
      consensus: {
        level: deliberation.agreement.level === 'high' ? 'full' : deliberation.agreement.level === 'moderate' ? 'partial' : 'none',
        agreementScore: deliberation.agreement.score / 100,
        divergentPoints: deliberation.agreement.divergentPoints.map((dp) => dp.topic),
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[Council] Deliberation error:', error);
    return {
      synthesizedAnswer: 'An error occurred during deliberation.',
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
 * Synthesize multiple model responses into a unified answer.
 * Uses the synthesize function from @osqr/core
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
  try {
    // Convert to ModelResponse format
    const modelResponses = responses.map((r) => ({
      modelId: r.model,
      modelDisplayName: r.model,
      content: r.content,
      summary: r.content.slice(0, 200),
      confidence: {
        rawScore: null,
        normalizedScore: r.confidence * 100,
        reasoningDepth: 3,
      },
      sourcesCited: [] as string[],
      reasoningChain: [] as string[],
      latencyMs: 0,
      tokensUsed: 0,
      timestamp: new Date().toISOString(),
      status: 'success' as const,
    }));

    const result = await Council.synthesize(query, modelResponses, {});

    return {
      answer: result.finalResponse,
      confidence: 0.8,
      agreement: result.transparencyFlags.length === 0 ? 'high' : 'partial',
    };
  } catch (error) {
    console.error('[Council] Synthesis error:', error);
    // Fall back to highest confidence response
    const sorted = [...responses].sort((a, b) => b.confidence - a.confidence);
    return {
      answer: sorted[0]?.content || 'Unable to synthesize responses.',
      confidence: sorted[0]?.confidence || 0,
      agreement: 'none',
    };
  }
}

/**
 * Format council discussion for display.
 */
export function formatCouncilDiscussion(response: CouncilResponse): string {
  const lines: string[] = [];

  lines.push('## Council Deliberation\n');

  // Add model opinions
  lines.push('### Model Opinions\n');
  for (const opinion of response.modelOpinions) {
    lines.push(`**${opinion.model}** (confidence: ${(opinion.confidence * 100).toFixed(0)}%)`);
    lines.push(opinion.content);
    lines.push('');
  }

  // Add consensus summary
  lines.push('### Consensus');
  lines.push(`Level: ${response.consensus.level} (${(response.consensus.agreementScore * 100).toFixed(0)}% agreement)`);

  if (response.consensus.divergentPoints.length > 0) {
    lines.push('\n**Points of Divergence:**');
    for (const point of response.consensus.divergentPoints) {
      lines.push(`- ${point}`);
    }
  }

  return lines.join('\n');
}
