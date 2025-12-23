/**
 * Confidence Score Calculator
 *
 * The brain of the Bubble - calculates when to surface items
 * for maximum timing magic.
 *
 * CONFIDENCE SCORE =
 *   (Base Priority × 0.35) +
 *   (Time Sensitivity × 0.25) +
 *   (Context Relevance × 0.25) +
 *   (Historical Engagement × 0.15)
 */

import type {
  TemporalItem,
  UserContext,
  BubbleHistory,
  BubbleUserState,
  ConfidenceBreakdown,
  ConfidenceWeights,
  TimeWindow,
} from '../types';
import { DEFAULT_CONFIDENCE_WEIGHTS, TIME_SENSITIVITY } from '../constants';

/**
 * Calculate confidence score for a Bubble item
 */
export function calculateConfidenceScore(
  item: TemporalItem,
  currentContext: UserContext,
  userHistory: BubbleHistory[],
  userPreferences: BubbleUserState,
  weights: ConfidenceWeights = DEFAULT_CONFIDENCE_WEIGHTS
): number {
  const breakdown = calculateConfidenceBreakdown(
    item,
    currentContext,
    userHistory,
    userPreferences,
    weights
  );
  return breakdown.finalScore;
}

/**
 * Calculate full confidence breakdown for debugging/transparency
 */
export function calculateConfidenceBreakdown(
  item: TemporalItem,
  currentContext: UserContext,
  userHistory: BubbleHistory[],
  userPreferences: BubbleUserState,
  weights: ConfidenceWeights = DEFAULT_CONFIDENCE_WEIGHTS
): ConfidenceBreakdown {
  const basePriority = item.priority;
  const timeSensitivity = calculateTimeSensitivity(item, currentContext.currentTime);
  const contextRelevance = calculateContextRelevance(item, currentContext);
  const historicalEngagement = calculateHistoricalEngagement(item, userHistory);

  const rawScore =
    basePriority * weights.basePriority +
    timeSensitivity * weights.timeSensitivity +
    contextRelevance * weights.contextRelevance +
    historicalEngagement * weights.historicalEngagement;

  // Apply user category weight override
  const category = item.type;
  const categoryWeight = userPreferences.categoryWeights[category] || 1.0;
  const adjustedScore = rawScore * categoryWeight;

  const finalScore = Math.min(100, Math.max(0, Math.round(adjustedScore)));

  return {
    basePriority,
    timeSensitivity,
    contextRelevance,
    historicalEngagement,
    categoryWeight,
    rawScore,
    finalScore,
  };
}

/**
 * Time Sensitivity: Is NOW the right moment?
 */
export function calculateTimeSensitivity(
  item: TemporalItem,
  currentTime: number
): number {
  // Deadline proximity
  if (item.deadline) {
    const hoursUntil = (item.deadline.getTime() - currentTime) / (1000 * 60 * 60);

    if (hoursUntil <= 0) return 100;  // Overdue
    if (hoursUntil < TIME_SENSITIVITY.critical) return 100;
    if (hoursUntil < TIME_SENSITIVITY.today) return 80;
    if (hoursUntil < TIME_SENSITIVITY.soon) return 60;
    if (hoursUntil < TIME_SENSITIVITY.thisWeek) return 40;
    return TIME_SENSITIVITY.default;
  }

  // Optimal timing windows
  if (item.optimalWindow && isWithinWindow(currentTime, item.optimalWindow)) {
    return 85;
  }

  // Decay - how long has OSQR known without surfacing?
  if (item.detectedAt) {
    const daysSinceDetected =
      (currentTime - item.detectedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceDetected > TIME_SENSITIVITY.decayDays) {
      return Math.min(70, 40 + daysSinceDetected * 5);
    }
  }

  return 30; // Default for non-time-sensitive items
}

/**
 * Check if current time is within optimal window
 */
export function isWithinWindow(currentTime: number, window: TimeWindow): boolean {
  return currentTime >= window.start.getTime() && currentTime <= window.end.getTime();
}

/**
 * Context Relevance: Does this relate to current activity?
 */
export function calculateContextRelevance(
  item: TemporalItem,
  currentContext: UserContext
): number {
  let score = 0;

  // Same project
  if (item.project && item.project === currentContext.activeProject) {
    score += 40;
  }

  // Related topic (keyword/semantic match)
  if (hasTopicOverlap(item.topics, currentContext.recentTopics)) {
    score += 30;
  }

  // Mentioned entity (person, company, etc.)
  if (hasEntityOverlap(item.entities, currentContext.recentEntities)) {
    score += 20;
  }

  // User explicitly working on related task
  if (
    currentContext.activeTask &&
    item.relatedTasks?.includes(currentContext.activeTask)
  ) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Check for topic overlap
 */
export function hasTopicOverlap(
  itemTopics: string[] | undefined,
  contextTopics: string[]
): boolean {
  if (!itemTopics || itemTopics.length === 0) return false;
  const lowerContextTopics = contextTopics.map((t) => t.toLowerCase());
  return itemTopics.some((t) => lowerContextTopics.includes(t.toLowerCase()));
}

/**
 * Check for entity overlap
 */
export function hasEntityOverlap(
  itemEntities: string[] | undefined,
  contextEntities: string[]
): boolean {
  if (!itemEntities || itemEntities.length === 0) return false;
  const lowerContextEntities = contextEntities.map((e) => e.toLowerCase());
  return itemEntities.some((e) => lowerContextEntities.includes(e.toLowerCase()));
}

/**
 * Historical Engagement: Has user engaged with similar items?
 */
export function calculateHistoricalEngagement(
  item: TemporalItem,
  userHistory: BubbleHistory[]
): number {
  const similarItems = userHistory.filter(
    (h) => h.category === item.type || h.source === item.source
  );

  if (similarItems.length === 0) {
    return 50; // No data, neutral
  }

  const engagementRate =
    similarItems.filter((i) => i.wasEngaged || i.action === 'engaged').length /
    similarItems.length;

  return Math.round(engagementRate * 100);
}

/**
 * Get visual state based on confidence score
 */
export function getVisualState(
  score: number,
  thresholds: { silent: number; passive: number; ready: number; active: number; priority: number }
): 'silent' | 'passive' | 'ready' | 'active' | 'priority' {
  if (score >= thresholds.priority) return 'priority';
  if (score >= thresholds.active) return 'active';
  if (score >= thresholds.ready) return 'ready';
  if (score >= thresholds.passive) return 'passive';
  return 'silent';
}

/**
 * Format confidence breakdown for display
 */
export function formatConfidenceBreakdown(breakdown: ConfidenceBreakdown): string {
  const lines: string[] = [];

  lines.push(`Confidence Score: ${breakdown.finalScore}%`);
  lines.push('');
  lines.push('Components:');
  lines.push(`  Base Priority: ${breakdown.basePriority}% (weight: 0.35)`);
  lines.push(`  Time Sensitivity: ${breakdown.timeSensitivity}% (weight: 0.25)`);
  lines.push(`  Context Relevance: ${breakdown.contextRelevance}% (weight: 0.25)`);
  lines.push(`  Historical Engagement: ${breakdown.historicalEngagement}% (weight: 0.15)`);
  lines.push('');
  lines.push(`Raw Score: ${breakdown.rawScore.toFixed(1)}%`);
  lines.push(`Category Weight: ${breakdown.categoryWeight.toFixed(2)}x`);
  lines.push(`Final Score: ${breakdown.finalScore}%`);

  return lines.join('\n');
}

export default {
  calculateConfidenceScore,
  calculateConfidenceBreakdown,
  calculateTimeSensitivity,
  calculateContextRelevance,
  calculateHistoricalEngagement,
  getVisualState,
  formatConfidenceBreakdown,
};
