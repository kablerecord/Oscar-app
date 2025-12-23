/**
 * Interrupt Budget Manager
 *
 * Manages daily interrupt budget and decides how to surface commitments.
 */

import type {
  InterruptBudget,
  InterruptDecision,
  InterruptAction,
  PriorityScore,
  TemporalPreferences,
  TemporalConfig,
  Commitment,
} from '../types';
import {
  DEFAULT_TEMPORAL_PREFERENCES,
  DEFAULT_TEMPORAL_CONFIG,
} from '../types';

// In-memory budget storage (would be DB in production)
const budgetStore = new Map<string, InterruptBudget>();

/**
 * Get today's date string
 */
function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse time string to hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Check if current time is within quiet hours
 */
export function isInQuietHours(
  now: Date,
  prefs: Partial<TemporalPreferences> = {}
): boolean {
  const fullPrefs = { ...DEFAULT_TEMPORAL_PREFERENCES, ...prefs };
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = currentHours * 60 + currentMinutes;

  const start = parseTime(fullPrefs.quietHoursStart);
  const end = parseTime(fullPrefs.quietHoursEnd);
  const startTime = start.hours * 60 + start.minutes;
  const endTime = end.hours * 60 + end.minutes;

  // Handle overnight quiet hours (e.g., 21:00 - 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

/**
 * Check if commitment is critical
 */
export function isCritical(
  score: PriorityScore,
  criticalCategories: string[]
): boolean {
  // Critical if very high urgency and today
  return score.totalScore >= 0.9 && score.components.urgency >= 0.95;
}

/**
 * Get or create today's budget
 */
export function getBudget(
  userId: string,
  config: Partial<TemporalConfig> = {}
): InterruptBudget {
  const fullConfig = { ...DEFAULT_TEMPORAL_CONFIG, ...config };
  const dateStr = getDateString();
  const key = `${userId}:${dateStr}`;

  let budget = budgetStore.get(key);
  if (!budget) {
    budget = {
      userId,
      date: dateStr,
      morningDigestSent: false,
      morningDigestItems: [],
      realtimeInterruptsUsed: 0,
      realtimeInterruptMax: fullConfig.defaultRealtimeMax,
      eveningReviewEnabled: false,
      eveningReviewSent: false,
      forcedInterrupts: [],
    };
    budgetStore.set(key, budget);
  }

  return budget;
}

/**
 * Save budget
 */
export function saveBudget(budget: InterruptBudget): void {
  const key = `${budget.userId}:${budget.date}`;
  budgetStore.set(key, budget);
}

/**
 * Record a real-time interrupt
 */
export function recordRealtimeInterrupt(
  userId: string,
  commitmentId: string
): void {
  const budget = getBudget(userId);
  budget.realtimeInterruptsUsed++;
  saveBudget(budget);
}

/**
 * Record a forced interrupt
 */
export function recordForcedInterrupt(
  userId: string,
  commitmentId: string
): void {
  const budget = getBudget(userId);
  budget.forcedInterrupts.push(commitmentId);
  saveBudget(budget);
}

/**
 * Mark morning digest as sent
 */
export function markDigestSent(
  userId: string,
  itemIds: string[]
): void {
  const budget = getBudget(userId);
  budget.morningDigestSent = true;
  budget.morningDigestItems = itemIds;
  saveBudget(budget);
}

/**
 * Check if can send real-time interrupt
 */
export function canSendRealtimeInterrupt(userId: string): boolean {
  const budget = getBudget(userId);
  return budget.realtimeInterruptsUsed < budget.realtimeInterruptMax;
}

/**
 * Get remaining real-time interrupt capacity
 */
export function getRemainingInterrupts(userId: string): number {
  const budget = getBudget(userId);
  return Math.max(0, budget.realtimeInterruptMax - budget.realtimeInterruptsUsed);
}

/**
 * Determine interrupt action based on priority score
 */
export function determineInterruptAction(
  score: PriorityScore,
  budget: InterruptBudget,
  prefs: Partial<TemporalPreferences> = {},
  config: Partial<TemporalConfig> = {}
): InterruptAction {
  const fullConfig = { ...DEFAULT_TEMPORAL_CONFIG, ...config };
  const fullPrefs = { ...DEFAULT_TEMPORAL_PREFERENCES, ...prefs };

  // Very high priority, urgent today - real-time interrupt if budget allows
  if (score.totalScore >= 0.85 && score.components.urgency >= 0.95) {
    if (budget.realtimeInterruptsUsed < budget.realtimeInterruptMax) {
      return 'REALTIME_INTERRUPT';
    }
    // Safety valve
    return 'FORCED_INTERRUPT';
  }

  // High confidence - suggest one-tap action
  if (score.totalScore >= fullConfig.suggestThreshold) {
    return 'SUGGEST_ONE_TAP';
  }

  // Medium confidence - bubble notification
  if (score.totalScore >= fullConfig.bubbleThreshold) {
    return 'BUBBLE_NOTIFICATION';
  }

  // Low confidence - store silently
  return 'STORE_SILENT';
}

/**
 * Process interrupt queue
 */
export function processInterruptQueue(
  userId: string,
  prioritizedItems: PriorityScore[],
  prefs: Partial<TemporalPreferences> = {},
  config: Partial<TemporalConfig> = {}
): InterruptDecision[] {
  const fullPrefs = { ...DEFAULT_TEMPORAL_PREFERENCES, ...prefs };
  const budget = getBudget(userId, config);
  const decisions: InterruptDecision[] = [];
  const now = new Date();

  // Check quiet hours
  if (isInQuietHours(now, prefs)) {
    if (!fullPrefs.quietHoursCriticalException) {
      // Nothing surfaces during quiet hours
      return prioritizedItems.map((item) => ({
        commitmentId: item.commitmentId,
        action: 'STORE_SILENT' as InterruptAction,
        reason: 'Quiet hours active, no exception enabled',
      }));
    }
    // Filter to only critical items
    prioritizedItems = prioritizedItems.filter((item) =>
      isCritical(item, fullPrefs.criticalCategories)
    );
  }

  // Sort by priority score descending
  const sorted = [...prioritizedItems].sort(
    (a, b) => b.totalScore - a.totalScore
  );

  for (const item of sorted) {
    const action = determineInterruptAction(item, budget, prefs, config);
    let reason = '';

    switch (action) {
      case 'REALTIME_INTERRUPT':
        reason = 'High priority, urgent today';
        budget.realtimeInterruptsUsed++;
        break;
      case 'FORCED_INTERRUPT':
        reason = 'Budget exceeded but urgency requires surfacing';
        budget.forcedInterrupts.push(item.commitmentId);
        break;
      case 'SUGGEST_ONE_TAP':
        reason = 'High confidence, suggest with easy action';
        break;
      case 'BUBBLE_NOTIFICATION':
        reason = 'Medium confidence, surface in bubble';
        break;
      case 'STORE_SILENT':
        reason = 'Low confidence, keep in passive queue';
        break;
    }

    decisions.push({
      commitmentId: item.commitmentId,
      action,
      reason,
    });
  }

  // Save updated budget
  saveBudget(budget);

  // Bundle forced interrupts if too many
  if (budget.forcedInterrupts.length > 2) {
    return bundleInterrupts(decisions, budget.forcedInterrupts);
  }

  return decisions;
}

/**
 * Bundle multiple forced interrupts into one notification
 */
export function bundleInterrupts(
  decisions: InterruptDecision[],
  forcedIds: string[]
): InterruptDecision[] {
  const result: InterruptDecision[] = [];
  const bundled = new Set(forcedIds);

  // Replace individual forced interrupts with bundled
  let bundledDecision: InterruptDecision | null = null;

  for (const decision of decisions) {
    if (bundled.has(decision.commitmentId)) {
      if (!bundledDecision) {
        bundledDecision = {
          commitmentId: forcedIds.join(','),
          action: 'BUNDLED_URGENT',
          reason: `${forcedIds.length} urgent items bundled`,
        };
        result.push(bundledDecision);
      }
      // Skip individual
    } else {
      result.push(decision);
    }
  }

  return result;
}

/**
 * Reset budget for testing
 */
export function resetBudget(userId: string): void {
  const dateStr = getDateString();
  const key = `${userId}:${dateStr}`;
  budgetStore.delete(key);
}

/**
 * Clear all budgets for testing
 */
export function clearAllBudgets(): void {
  budgetStore.clear();
}
