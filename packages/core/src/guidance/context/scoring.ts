/**
 * Item Scoring - Relevance scoring for context selection
 *
 * Implements the scoring algorithm with four factors:
 * - Relevance (40%): Semantic similarity to current task
 * - Priority (25%): User-defined priority
 * - Frequency (20%): How often the rule has been applied
 * - Recency (15%): How recently the rule was created
 */

import type { MentorScriptItem, ItemScore, GuidanceConfig } from '../types';
import { DEFAULT_GUIDANCE_CONFIG } from '../types';

// Scoring weights
const RELEVANCE_WEIGHT = 0.40;
const PRIORITY_WEIGHT = 0.25;
const FREQUENCY_WEIGHT = 0.20;
const RECENCY_WEIGHT = 0.15;

// Frequency cap for normalization
const FREQUENCY_CAP = 100;

/**
 * Calculate recency score with exponential decay
 * 1.0 at day 0, ~0.5 at day 30, ~0.1 at day 90
 */
export function calculateRecencyScore(
  created: Date,
  config: Partial<GuidanceConfig> = {}
): number {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  const daysSinceCreation =
    (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysSinceCreation / cfg.recencyDecayDays);
}

/**
 * Calculate semantic similarity between rule and task
 * This is a simplified implementation - in production would use embeddings
 */
export function calculateSemanticSimilarity(rule: string, task: string): number {
  const ruleWords = new Set(
    rule
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
  );
  const taskWords = new Set(
    task
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
  );

  // Jaccard similarity
  const intersection = new Set([...ruleWords].filter((x) => taskWords.has(x)));
  const union = new Set([...ruleWords, ...taskWords]);

  if (union.size === 0) {
    return 0;
  }

  // Boost for exact matches
  const baseScore = intersection.size / union.size;

  // Keyword boosting
  const codeKeywords = ['code', 'function', 'file', 'debug', 'error', 'fix'];
  const formatKeywords = ['format', 'style', 'structure', 'layout'];
  const interactionKeywords = ['ask', 'question', 'clarify', 'explain'];

  let boost = 0;

  if (codeKeywords.some((k) => taskWords.has(k) && ruleWords.has(k))) {
    boost += 0.2;
  }
  if (formatKeywords.some((k) => taskWords.has(k) && ruleWords.has(k))) {
    boost += 0.15;
  }
  if (interactionKeywords.some((k) => taskWords.has(k) && ruleWords.has(k))) {
    boost += 0.15;
  }

  return Math.min(1, baseScore + boost);
}

/**
 * Calculate overall score for a MentorScript item
 */
export function calculateItemScore(
  item: MentorScriptItem,
  currentTask: string,
  config: Partial<GuidanceConfig> = {}
): ItemScore {
  // Calculate individual factors
  const relevance = calculateSemanticSimilarity(item.rule, currentTask);
  const priority = item.priority / 10; // Normalize to 0-1
  const frequency = Math.min(item.appliedCount / FREQUENCY_CAP, 1); // Cap at 100
  const recency = calculateRecencyScore(item.created, config);

  // Calculate weighted score
  const score =
    relevance * RELEVANCE_WEIGHT +
    priority * PRIORITY_WEIGHT +
    frequency * FREQUENCY_WEIGHT +
    recency * RECENCY_WEIGHT;

  return {
    item,
    score,
    breakdown: {
      relevance,
      priority,
      frequency,
      recency,
    },
  };
}

/**
 * Score all items and sort by score descending
 */
export function scoreAndSortItems(
  items: MentorScriptItem[],
  currentTask: string,
  config: Partial<GuidanceConfig> = {}
): ItemScore[] {
  return items
    .map((item) => calculateItemScore(item, currentTask, config))
    .sort((a, b) => b.score - a.score);
}

/**
 * Get score breakdown as human-readable string
 */
export function formatScoreBreakdown(itemScore: ItemScore): string {
  const { breakdown, score } = itemScore;
  return (
    `Score: ${(score * 100).toFixed(1)}% ` +
    `(R:${(breakdown.relevance * 100).toFixed(0)}% ` +
    `P:${(breakdown.priority * 100).toFixed(0)}% ` +
    `F:${(breakdown.frequency * 100).toFixed(0)}% ` +
    `Rc:${(breakdown.recency * 100).toFixed(0)}%)`
  );
}

/**
 * Get top N items by score
 */
export function getTopScoredItems(
  items: MentorScriptItem[],
  currentTask: string,
  count: number,
  config: Partial<GuidanceConfig> = {}
): ItemScore[] {
  return scoreAndSortItems(items, currentTask, config).slice(0, count);
}

/**
 * Filter items by minimum score threshold
 */
export function filterByMinScore(
  items: MentorScriptItem[],
  currentTask: string,
  minScore: number,
  config: Partial<GuidanceConfig> = {}
): ItemScore[] {
  return scoreAndSortItems(items, currentTask, config).filter(
    (is) => is.score >= minScore
  );
}
