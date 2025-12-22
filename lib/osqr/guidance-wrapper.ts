/**
 * Guidance Wrapper for oscar-app
 *
 * Wraps the @osqr/core Guidance system for MentorScript management.
 * This provides dynamic system prompt generation based on project context.
 */

import { Guidance } from '@osqr/core';
import { guidanceConfig, featureFlags } from './config';

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

/**
 * Get applicable guidance for a project context.
 */
export function getProjectGuidance(projectId: string): GuidanceContext {
  if (!featureFlags.enableGuidance) {
    return {
      items: [],
      tokenCount: 0,
      atLimit: false,
    };
  }

  try {
    const guidance = Guidance.getProjectGuidance(projectId);
    if (!guidance) {
      return {
        items: [],
        tokenCount: 0,
        atLimit: false,
      };
    }

    // Map MentorScriptItems to GuidanceItems
    const items: GuidanceItem[] = guidance.mentorScripts.map((script) => ({
      id: script.id,
      type: 'rule' as const,
      content: script.rule,
      priority: script.priority || 5,
      scope: 'project',
      active: true,
    }));

    // Calculate token count
    const tokenCount = Guidance.calculateTotalTokens(guidance.mentorScripts);

    // Check limits using the repository functions
    const atLimit = Guidance.isAtHardLimit(projectId, guidanceConfig);

    // Get consolidation suggestions if approaching limit
    const suggestion = Guidance.suggestConsolidation(guidance.mentorScripts, guidanceConfig);

    return {
      items,
      tokenCount,
      atLimit,
      suggestedConsolidations: suggestion.shouldSuggest ? [suggestion.message || ''] : undefined,
    };
  } catch (error) {
    console.error('[Guidance] Get project guidance error:', error);
    return {
      items: [],
      tokenCount: 0,
      atLimit: false,
    };
  }
}

/**
 * Get guidance relevant to a specific query.
 */
export function getRelevantGuidance(
  projectId: string,
  query: string,
  maxItems: number = 5
): GuidanceItem[] {
  if (!featureFlags.enableGuidance) return [];

  try {
    const guidance = Guidance.getProjectGuidance(projectId);
    if (!guidance) return [];

    // Select items based on the query context
    const result = Guidance.selectMentorScriptItems(
      guidance.mentorScripts,
      query,
      4096, // Context budget
      guidanceConfig
    );

    // Convert and limit
    return result.loadedItems.slice(0, maxItems).map((script) => ({
      id: script.id,
      type: 'rule' as const,
      content: script.rule,
      priority: script.priority || 5,
      scope: 'project',
      active: true,
    }));
  } catch (error) {
    console.error('[Guidance] Get relevant guidance error:', error);
    return [];
  }
}

/**
 * Format guidance items for inclusion in system prompt.
 */
export function formatGuidanceForPrompt(items: GuidanceItem[]): string {
  if (items.length === 0) return '';

  const lines: string[] = ['## Project Guidance\n'];

  // Group by type
  const rules = items.filter((i) => i.type === 'rule');
  const preferences = items.filter((i) => i.type === 'preference');
  const constraints = items.filter((i) => i.type === 'constraint');

  if (rules.length > 0) {
    lines.push('### Rules');
    rules.forEach((r) => lines.push(`- ${r.content}`));
    lines.push('');
  }

  if (preferences.length > 0) {
    lines.push('### Preferences');
    preferences.forEach((p) => lines.push(`- ${p.content}`));
    lines.push('');
  }

  if (constraints.length > 0) {
    lines.push('### Constraints');
    constraints.forEach((c) => lines.push(`- ${c.content}`));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Check if we're approaching guidance limits.
 */
export function checkLimits(projectId: string): {
  nearSoftLimit: boolean;
  atHardLimit: boolean;
  itemsRemaining: number;
} {
  try {
    const guidance = Guidance.getProjectGuidance(projectId);
    const itemCount = guidance?.mentorScripts.length || 0;

    return {
      nearSoftLimit: Guidance.isNearSoftLimit(itemCount, guidanceConfig),
      atHardLimit: Guidance.isAtHardLimitByCount(itemCount, guidanceConfig),
      itemsRemaining: Math.max(0, guidanceConfig.hardLimit - itemCount),
    };
  } catch (error) {
    console.error('[Guidance] Check limits error:', error);
    return {
      nearSoftLimit: false,
      atHardLimit: false,
      itemsRemaining: guidanceConfig.hardLimit,
    };
  }
}

/**
 * Estimate token usage for guidance content.
 */
export function estimateTokens(content: string): number {
  return Guidance.estimateTokens(content);
}

/**
 * Get the 70% context budget allocation.
 */
export function getContextBudget(totalTokens: number): {
  guidanceBudget: number;
  remainingBudget: number;
} {
  // 70% rule: guidance should use at most 70% of context
  const guidanceBudget = Math.floor(totalTokens * 0.7);
  return {
    guidanceBudget,
    remainingBudget: totalTokens - guidanceBudget,
  };
}
