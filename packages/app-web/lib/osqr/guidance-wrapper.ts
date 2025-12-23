/**
 * Guidance Wrapper - Stub Implementation
 *
 * NOTE: @osqr/core package is not yet available.
 * This file provides stub implementations.
 */

import { featureFlags, guidanceConfig } from './config';

export interface GuidanceItem {
  id: string;
  type: 'rule' | 'preference' | 'constraint';
  content: string;
  priority: number;
  scope: string;
  active: boolean;
}

export interface GuidanceContext {
  items: GuidanceItem[];
  tokenCount: number;
  atLimit: boolean;
  suggestedConsolidations?: string[];
}

export function getProjectGuidance(_projectId: string): GuidanceContext {
  return {
    items: [],
    tokenCount: 0,
    atLimit: false,
  };
}

export function getRelevantGuidance(
  _projectId: string,
  _query: string,
  _maxItems: number = 5
): GuidanceItem[] {
  return [];
}

export function formatGuidanceForPrompt(_items: GuidanceItem[]): string {
  return '';
}

export function checkLimits(_projectId: string): {
  nearSoftLimit: boolean;
  atHardLimit: boolean;
  itemsRemaining: number;
} {
  return {
    nearSoftLimit: false,
    atHardLimit: false,
    itemsRemaining: guidanceConfig.hardLimit,
  };
}

export function estimateTokens(content: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(content.length / 4);
}

export function getContextBudget(totalTokens: number): {
  guidanceBudget: number;
  remainingBudget: number;
} {
  const guidanceBudget = Math.floor(totalTokens * 0.7);
  return {
    guidanceBudget,
    remainingBudget: totalTokens - guidanceBudget,
  };
}
