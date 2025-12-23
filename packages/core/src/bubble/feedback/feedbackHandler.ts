/**
 * Feedback Handler
 *
 * Processes user feedback on bubbles and adjusts category weights
 * for personalized surfacing behavior.
 */

import type {
  BubbleItem,
  BubbleHistory,
  BubbleFeedback,
  BubbleUserState,
  BubbleCategory,
  DeferOption,
  DeferredItem,
} from '../types';
import { CATEGORY_WEIGHT_BOUNDS } from '../constants';

/**
 * Weight adjustment amounts per feedback type
 */
const WEIGHT_ADJUSTMENTS: Record<BubbleFeedback | 'engaged', number> = {
  helpful: 0.1,           // User found it helpful - boost category
  engaged: 0.05,          // User engaged with it - slight boost
  less_like_this: -0.15,  // User doesn't want these - reduce category
  wrong_time: -0.05,      // Timing was off - slight reduction
  not_relevant: -0.1,     // Not relevant - reduce category
};

/**
 * Create a history entry for user action
 */
export function createHistoryEntry(
  item: BubbleItem,
  action: 'dismissed' | 'engaged' | 'deferred',
  timeToAction: number,
  feedback?: BubbleFeedback
): BubbleHistory {
  return {
    itemId: item.id,
    category: item.category,
    confidenceScore: item.confidenceScore,
    action,
    timestamp: new Date(),
    timeToAction,
    source: item.temporalItem?.source,
    wasEngaged: action === 'engaged',
  };
}

/**
 * Adjust category weight based on feedback
 */
export function adjustCategoryWeight(
  currentWeights: Record<string, number>,
  category: BubbleCategory,
  feedback: BubbleFeedback | 'engaged'
): Record<string, number> {
  const adjustment = WEIGHT_ADJUSTMENTS[feedback];
  const currentWeight = currentWeights[category] ?? CATEGORY_WEIGHT_BOUNDS.default;

  // Apply adjustment with bounds
  const newWeight = Math.min(
    CATEGORY_WEIGHT_BOUNDS.max,
    Math.max(CATEGORY_WEIGHT_BOUNDS.min, currentWeight + adjustment)
  );

  return {
    ...currentWeights,
    [category]: Math.round(newWeight * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Process dismiss action
 */
export function processDismiss(
  state: BubbleUserState,
  item: BubbleItem,
  timeToAction: number,
  feedback?: BubbleFeedback | null
): BubbleUserState {
  // Create history entry
  const historyEntry = createHistoryEntry(item, 'dismissed', timeToAction, feedback ?? undefined);

  // Adjust category weight if feedback provided
  const newWeights = feedback
    ? adjustCategoryWeight(state.categoryWeights, item.category, feedback)
    : state.categoryWeights;

  return {
    ...state,
    categoryWeights: newWeights,
    history: [...state.history.slice(-99), historyEntry], // Keep last 100
  };
}

/**
 * Process engage action
 */
export function processEngage(
  state: BubbleUserState,
  item: BubbleItem,
  timeToAction: number
): BubbleUserState {
  // Create history entry
  const historyEntry = createHistoryEntry(item, 'engaged', timeToAction);

  // Boost category weight slightly
  const newWeights = adjustCategoryWeight(state.categoryWeights, item.category, 'engaged');

  return {
    ...state,
    categoryWeights: newWeights,
    history: [...state.history.slice(-99), historyEntry],
  };
}

/**
 * Calculate defer target date
 */
export function calculateDeferDate(option: DeferOption): Date {
  if (option instanceof Date) {
    return option;
  }

  const now = new Date();

  switch (option) {
    case 'tonight': {
      const tonight = new Date(now);
      tonight.setHours(20, 0, 0, 0); // 8 PM today
      if (tonight <= now) {
        tonight.setDate(tonight.getDate() + 1); // Tomorrow if past 8 PM
      }
      return tonight;
    }
    case 'tomorrow': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
      return tomorrow;
    }
    case 'monday': {
      const monday = new Date(now);
      const daysUntilMonday = (1 + 7 - monday.getDay()) % 7 || 7;
      monday.setDate(monday.getDate() + daysUntilMonday);
      monday.setHours(9, 0, 0, 0); // 9 AM Monday
      return monday;
    }
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default: 24 hours
  }
}

/**
 * Process defer action
 */
export function processDefer(
  state: BubbleUserState,
  item: BubbleItem,
  timeToAction: number,
  until: DeferOption
): BubbleUserState {
  // Create history entry
  const historyEntry = createHistoryEntry(item, 'deferred', timeToAction);

  // Create deferred item
  const deferredItem: DeferredItem = {
    itemId: item.temporalItemId,
    deferredAt: new Date(),
    deferredUntil: calculateDeferDate(until),
  };

  return {
    ...state,
    history: [...state.history.slice(-99), historyEntry],
    deferred: [...state.deferred, deferredItem],
  };
}

/**
 * Check if an item is currently deferred
 */
export function isItemDeferred(
  state: BubbleUserState,
  temporalItemId: string
): boolean {
  const now = new Date();
  return state.deferred.some(
    (d) => d.itemId === temporalItemId && new Date(d.deferredUntil) > now
  );
}

/**
 * Get deferred items that are ready to resurface
 */
export function getReadyDeferredItems(state: BubbleUserState): DeferredItem[] {
  const now = new Date();
  return state.deferred.filter((d) => new Date(d.deferredUntil) <= now);
}

/**
 * Clean up expired deferred items
 */
export function cleanupDeferredItems(state: BubbleUserState): BubbleUserState {
  const now = new Date();
  const stillDeferred = state.deferred.filter(
    (d) => new Date(d.deferredUntil) > now
  );

  return {
    ...state,
    deferred: stillDeferred,
  };
}

/**
 * Get engagement rate for a category
 */
export function getCategoryEngagementRate(
  state: BubbleUserState,
  category: BubbleCategory
): number {
  const categoryHistory = state.history.filter((h) => h.category === category);

  if (categoryHistory.length === 0) {
    return 0.5; // Neutral if no data
  }

  const engaged = categoryHistory.filter((h) => h.wasEngaged).length;
  return engaged / categoryHistory.length;
}

/**
 * Get average time-to-action for a category
 */
export function getCategoryResponseTime(
  state: BubbleUserState,
  category: BubbleCategory
): number | null {
  const categoryHistory = state.history.filter(
    (h) => h.category === category && h.action !== 'dismissed'
  );

  if (categoryHistory.length === 0) {
    return null;
  }

  const totalTime = categoryHistory.reduce((sum, h) => sum + h.timeToAction, 0);
  return totalTime / categoryHistory.length;
}

/**
 * Process helpful feedback separately (explicit positive)
 */
export function processHelpfulFeedback(
  state: BubbleUserState,
  item: BubbleItem
): BubbleUserState {
  const newWeights = adjustCategoryWeight(
    state.categoryWeights,
    item.category,
    'helpful'
  );

  return {
    ...state,
    categoryWeights: newWeights,
  };
}

/**
 * Reset category weights to defaults
 */
export function resetCategoryWeights(state: BubbleUserState): BubbleUserState {
  return {
    ...state,
    categoryWeights: {},
  };
}

/**
 * Get category weight with default fallback
 */
export function getCategoryWeight(
  state: BubbleUserState,
  category: BubbleCategory
): number {
  return state.categoryWeights[category] ?? CATEGORY_WEIGHT_BOUNDS.default;
}

export default {
  createHistoryEntry,
  adjustCategoryWeight,
  processDismiss,
  processEngage,
  processDefer,
  calculateDeferDate,
  isItemDeferred,
  getReadyDeferredItems,
  cleanupDeferredItems,
  getCategoryEngagementRate,
  getCategoryResponseTime,
  processHelpfulFeedback,
  resetCategoryWeights,
  getCategoryWeight,
};
