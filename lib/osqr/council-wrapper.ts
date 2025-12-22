/**
 * Council Mode Wrapper - Stub Implementation
 *
 * NOTE: @osqr/core package is not yet available.
 * This file provides stub implementations.
 */

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

export function shouldTriggerCouncil(
  _query: string,
  _context?: {
    conversationHistory?: Array<{ role: string; content: string }>;
    userTier?: 'free' | 'pro' | 'enterprise';
  }
): CouncilDecision {
  return {
    shouldTrigger: false,
    reason: 'Council mode disabled (osqr-core not installed)',
    confidence: 1.0,
  };
}

export async function runDeliberation(
  _query: string,
  _options?: {
    models?: string[];
    context?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    timeout?: number;
  }
): Promise<CouncilResponse> {
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

export async function synthesizeResponses(
  _query: string,
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
  // Return highest confidence response
  const sorted = [...responses].sort((a, b) => b.confidence - a.confidence);
  return {
    answer: sorted[0]?.content || 'No responses to synthesize.',
    confidence: sorted[0]?.confidence || 0,
    agreement: 'none',
  };
}

export function formatCouncilDiscussion(_response: CouncilResponse): string {
  return '## Council Deliberation\n\nCouncil mode is not available.';
}
