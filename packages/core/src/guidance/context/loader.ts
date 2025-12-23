/**
 * Context Loader - Load guidance at response generation start
 *
 * Retrieves and prepares MentorScript items for inclusion in context.
 */

import type {
  MentorScriptItem,
  ContextBudgetResult,
  GuidanceConfig,
  ProjectGuidance,
} from '../types';
import { DEFAULT_GUIDANCE_CONFIG } from '../types';
import { getProjectGuidance } from '../storage';
import { selectMentorScriptItems, formatBudgetSummary } from './budget';
import { scoreAndSortItems, formatScoreBreakdown } from './scoring';

/**
 * Context loading result
 */
export interface LoadedContext {
  projectId: string;
  items: MentorScriptItem[];
  formattedGuidance: string;
  budgetResult: ContextBudgetResult;
  debug: {
    totalItems: number;
    loadedCount: number;
    excludedCount: number;
    summary: string;
  };
}

/**
 * Load project guidance for a given task
 */
export function loadProjectGuidance(
  projectId: string,
  currentTask: string,
  contextBudget: number,
  config: Partial<GuidanceConfig> = {}
): LoadedContext | null {
  const guidance = getProjectGuidance(projectId);

  if (!guidance || guidance.mentorScripts.length === 0) {
    return null;
  }

  const budgetResult = selectMentorScriptItems(
    guidance.mentorScripts,
    currentTask,
    contextBudget,
    config
  );

  const formattedGuidance = formatMentorScriptItems(budgetResult.loadedItems);

  return {
    projectId,
    items: budgetResult.loadedItems,
    formattedGuidance,
    budgetResult,
    debug: {
      totalItems: guidance.mentorScripts.length,
      loadedCount: budgetResult.loadedItems.length,
      excludedCount: budgetResult.excludedItems.length,
      summary: formatBudgetSummary(budgetResult),
    },
  };
}

/**
 * Format MentorScript items for inclusion in prompt
 */
export function formatMentorScriptItems(items: MentorScriptItem[]): string {
  if (items.length === 0) {
    return '';
  }

  const lines = ['## Project Guidance', ''];

  for (const item of items) {
    lines.push(`- ${item.rule}`);
  }

  return lines.join('\n');
}

/**
 * Format items with source indicators
 */
export function formatMentorScriptItemsDetailed(
  items: MentorScriptItem[]
): string {
  if (items.length === 0) {
    return '';
  }

  const lines = ['## Project Guidance', ''];

  for (const item of items) {
    const sourceIcon = item.source === 'user_defined' ? '✏️' : '💡';
    lines.push(`${sourceIcon} ${item.rule}`);
  }

  return lines.join('\n');
}

/**
 * Get items most relevant to a task (without budget constraints)
 */
export function getMostRelevantItems(
  projectId: string,
  currentTask: string,
  maxItems: number = 5,
  config: Partial<GuidanceConfig> = {}
): MentorScriptItem[] {
  const guidance = getProjectGuidance(projectId);

  if (!guidance || guidance.mentorScripts.length === 0) {
    return [];
  }

  const scoredItems = scoreAndSortItems(
    guidance.mentorScripts,
    currentTask,
    config
  );

  return scoredItems.slice(0, maxItems).map((si) => si.item);
}

/**
 * Debug: Get scoring details for all items
 */
export function getItemScoringDetails(
  projectId: string,
  currentTask: string,
  config: Partial<GuidanceConfig> = {}
): string[] {
  const guidance = getProjectGuidance(projectId);

  if (!guidance || guidance.mentorScripts.length === 0) {
    return [];
  }

  const scoredItems = scoreAndSortItems(
    guidance.mentorScripts,
    currentTask,
    config
  );

  return scoredItems.map(
    (si) => `${formatScoreBreakdown(si)}: "${si.item.rule.substring(0, 50)}..."`
  );
}

/**
 * Check if any guidance exists for project
 */
export function hasProjectGuidance(projectId: string): boolean {
  const guidance = getProjectGuidance(projectId);
  return guidance !== null && guidance.mentorScripts.length > 0;
}

/**
 * Get guidance summary for debugging
 */
export function getGuidanceSummary(
  projectId: string
): {
  exists: boolean;
  itemCount: number;
  version: number;
  lastUpdated: Date | null;
} | null {
  const guidance = getProjectGuidance(projectId);

  if (!guidance) {
    return {
      exists: false,
      itemCount: 0,
      version: 0,
      lastUpdated: null,
    };
  }

  return {
    exists: true,
    itemCount: guidance.mentorScripts.length,
    version: guidance.version,
    lastUpdated: guidance.lastUpdated,
  };
}
