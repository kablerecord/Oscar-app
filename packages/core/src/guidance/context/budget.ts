/**
 * Context Budget - 70% Rule Implementation
 *
 * Manages context window budget for MentorScript items,
 * ensuring we use approximately 70% of available context.
 */

import type {
  MentorScriptItem,
  ContextBudgetResult,
  GuidanceConfig,
} from '../types';
import { DEFAULT_GUIDANCE_CONFIG } from '../types';
import { scoreAndSortItems } from './scoring';

/**
 * Estimate token count for text
 * Rough estimate: ~4 characters per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens for a MentorScript item
 * Includes rule text plus metadata overhead
 */
export function estimateItemTokens(item: MentorScriptItem): number {
  // Rule text + formatting overhead (bullet point, newline, etc.)
  const ruleTokens = estimateTokens(item.rule);
  const overhead = 5; // For "- " prefix and formatting
  return ruleTokens + overhead;
}

/**
 * Calculate total tokens for a list of items
 */
export function calculateTotalTokens(items: MentorScriptItem[]): number {
  return items.reduce((sum, item) => sum + estimateItemTokens(item), 0);
}

/**
 * Select MentorScript items within context budget
 * Implements the 70% rule from the spec
 */
export function selectMentorScriptItems(
  allItems: MentorScriptItem[],
  currentTask: string,
  contextBudget: number,
  config: Partial<GuidanceConfig> = {}
): ContextBudgetResult {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  const targetBudget = (contextBudget * cfg.contextBudgetPercent) / 100;

  // Score and sort items
  const scoredItems = scoreAndSortItems(allItems, currentTask, cfg);

  const loaded: MentorScriptItem[] = [];
  const excluded: MentorScriptItem[] = [];
  let usedTokens = 0;

  // Load items until budget reached
  for (const { item } of scoredItems) {
    const itemTokens = estimateItemTokens(item);

    if (usedTokens + itemTokens <= targetBudget) {
      loaded.push(item);
      usedTokens += itemTokens;
    } else {
      excluded.push(item);
    }
  }

  return {
    loadedItems: loaded,
    excludedItems: excluded,
    totalTokensUsed: usedTokens,
    budgetPercentage: contextBudget > 0 ? (usedTokens / contextBudget) * 100 : 0,
  };
}

/**
 * Check if we're near the soft limit for item count
 */
export function isNearSoftLimit(
  itemCount: number,
  config: Partial<GuidanceConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  return itemCount >= cfg.softLimit;
}

/**
 * Check if we're at the hard limit for item count
 */
export function isAtHardLimitByCount(
  itemCount: number,
  config: Partial<GuidanceConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  return itemCount >= cfg.hardLimit;
}

/**
 * Get remaining capacity before limits
 */
export function getRemainingCapacity(
  itemCount: number,
  config: Partial<GuidanceConfig> = {}
): { untilSoftLimit: number; untilHardLimit: number } {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  return {
    untilSoftLimit: Math.max(0, cfg.softLimit - itemCount),
    untilHardLimit: Math.max(0, cfg.hardLimit - itemCount),
  };
}

/**
 * Calculate optimal budget distribution
 */
export function calculateBudgetDistribution(
  items: MentorScriptItem[],
  contextBudget: number,
  config: Partial<GuidanceConfig> = {}
): {
  totalItemTokens: number;
  budgetUsedPercent: number;
  remainingBudget: number;
  averageItemTokens: number;
} {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  const targetBudget = (contextBudget * cfg.contextBudgetPercent) / 100;
  const totalItemTokens = calculateTotalTokens(items);

  return {
    totalItemTokens,
    budgetUsedPercent:
      targetBudget > 0 ? (totalItemTokens / targetBudget) * 100 : 0,
    remainingBudget: Math.max(0, targetBudget - totalItemTokens),
    averageItemTokens:
      items.length > 0 ? Math.round(totalItemTokens / items.length) : 0,
  };
}

/**
 * Format budget result as human-readable summary
 */
export function formatBudgetSummary(result: ContextBudgetResult): string {
  return (
    `Loaded ${result.loadedItems.length} items ` +
    `(${result.totalTokensUsed} tokens, ${result.budgetPercentage.toFixed(1)}% of budget). ` +
    `Excluded ${result.excludedItems.length} items.`
  );
}

/**
 * Suggest consolidation if approaching limits
 */
export function suggestConsolidation(
  items: MentorScriptItem[],
  config: Partial<GuidanceConfig> = {}
): {
  shouldSuggest: boolean;
  message?: string;
  itemCount: number;
  softLimit: number;
  hardLimit: number;
} {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  const itemCount = items.length;

  if (itemCount >= cfg.hardLimit) {
    return {
      shouldSuggest: true,
      message: `You've reached the maximum of ${cfg.hardLimit} guidance items. Consider consolidating similar rules.`,
      itemCount,
      softLimit: cfg.softLimit,
      hardLimit: cfg.hardLimit,
    };
  }

  if (itemCount >= cfg.softLimit) {
    const remaining = cfg.hardLimit - itemCount;
    return {
      shouldSuggest: true,
      message: `You have ${itemCount} guidance items. ${remaining} remaining before the limit. Consider consolidating similar rules.`,
      itemCount,
      softLimit: cfg.softLimit,
      hardLimit: cfg.hardLimit,
    };
  }

  return {
    shouldSuggest: false,
    itemCount,
    softLimit: cfg.softLimit,
    hardLimit: cfg.hardLimit,
  };
}
