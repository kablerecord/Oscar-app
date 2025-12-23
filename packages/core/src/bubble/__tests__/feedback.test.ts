/**
 * Bubble Feedback Handler Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
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
} from '../feedback';
import type { BubbleItem, BubbleUserState } from '../types';
import { DEFAULT_USER_STATE, CATEGORY_WEIGHT_BOUNDS } from '../constants';

// Test fixtures
const createBubbleItem = (overrides: Partial<BubbleItem> = {}): BubbleItem => ({
  id: 'bubble-1',
  temporalItemId: 'item-1',
  message: 'Test message',
  confidenceScore: 75,
  basePriority: 70,
  category: 'deadline',
  state: 'surfaced',
  surfacedAt: Date.now() - 5000,
  temporalItem: {
    id: 'item-1',
    type: 'deadline',
    content: 'Test',
    source: 'test',
    priority: 70,
  },
  ...overrides,
});

const createUserState = (overrides: Partial<BubbleUserState> = {}): BubbleUserState => ({
  ...DEFAULT_USER_STATE,
  ...overrides,
});

describe('History Entry Creation', () => {
  it('creates dismiss history entry', () => {
    const item = createBubbleItem();
    const entry = createHistoryEntry(item, 'dismissed', 3000, 'less_like_this');

    expect(entry.itemId).toBe('bubble-1');
    expect(entry.category).toBe('deadline');
    expect(entry.confidenceScore).toBe(75);
    expect(entry.action).toBe('dismissed');
    expect(entry.timeToAction).toBe(3000);
    expect(entry.wasEngaged).toBe(false);
    expect(entry.source).toBe('test');
  });

  it('creates engaged history entry', () => {
    const item = createBubbleItem();
    const entry = createHistoryEntry(item, 'engaged', 1500);

    expect(entry.action).toBe('engaged');
    expect(entry.wasEngaged).toBe(true);
  });

  it('creates deferred history entry', () => {
    const item = createBubbleItem();
    const entry = createHistoryEntry(item, 'deferred', 2000);

    expect(entry.action).toBe('deferred');
    expect(entry.wasEngaged).toBe(false);
  });
});

describe('Category Weight Adjustment', () => {
  it('increases weight for helpful feedback', () => {
    const weights = { deadline: 1.0 };
    const adjusted = adjustCategoryWeight(weights, 'deadline', 'helpful');

    expect(adjusted.deadline).toBe(1.1);
  });

  it('increases weight slightly for engagement', () => {
    const weights = { deadline: 1.0 };
    const adjusted = adjustCategoryWeight(weights, 'deadline', 'engaged');

    expect(adjusted.deadline).toBe(1.05);
  });

  it('decreases weight for less_like_this', () => {
    const weights = { deadline: 1.0 };
    const adjusted = adjustCategoryWeight(weights, 'deadline', 'less_like_this');

    expect(adjusted.deadline).toBe(0.85);
  });

  it('decreases weight slightly for wrong_time', () => {
    const weights = { deadline: 1.0 };
    const adjusted = adjustCategoryWeight(weights, 'deadline', 'wrong_time');

    expect(adjusted.deadline).toBe(0.95);
  });

  it('decreases weight for not_relevant', () => {
    const weights = { deadline: 1.0 };
    const adjusted = adjustCategoryWeight(weights, 'deadline', 'not_relevant');

    expect(adjusted.deadline).toBe(0.9);
  });

  it('respects minimum weight bound', () => {
    const weights = { deadline: CATEGORY_WEIGHT_BOUNDS.min };
    const adjusted = adjustCategoryWeight(weights, 'deadline', 'less_like_this');

    expect(adjusted.deadline).toBe(CATEGORY_WEIGHT_BOUNDS.min);
  });

  it('respects maximum weight bound', () => {
    const weights = { deadline: CATEGORY_WEIGHT_BOUNDS.max };
    const adjusted = adjustCategoryWeight(weights, 'deadline', 'helpful');

    expect(adjusted.deadline).toBe(CATEGORY_WEIGHT_BOUNDS.max);
  });

  it('uses default weight for new categories', () => {
    const weights = {};
    const adjusted = adjustCategoryWeight(weights, 'reminder', 'helpful');

    expect(adjusted.reminder).toBe(1.1);
  });
});

describe('Process Dismiss', () => {
  it('creates history entry on dismiss', () => {
    const state = createUserState();
    const item = createBubbleItem();

    const newState = processDismiss(state, item, 3000, null);

    expect(newState.history).toHaveLength(1);
    expect(newState.history[0].action).toBe('dismissed');
  });

  it('adjusts weight with feedback', () => {
    const state = createUserState();
    const item = createBubbleItem({ category: 'commitment' });

    const newState = processDismiss(state, item, 3000, 'less_like_this');

    expect(newState.categoryWeights.commitment).toBeLessThan(1.0);
  });

  it('does not adjust weight without feedback', () => {
    const state = createUserState({ categoryWeights: { deadline: 1.0 } });
    const item = createBubbleItem();

    const newState = processDismiss(state, item, 3000, null);

    expect(newState.categoryWeights.deadline).toBe(1.0);
  });

  it('keeps only last 100 history entries', () => {
    const state = createUserState({
      history: Array(100).fill(null).map((_, i) => ({
        itemId: `item-${i}`,
        category: 'deadline' as const,
        confidenceScore: 70,
        action: 'dismissed' as const,
        timestamp: new Date(),
        timeToAction: 1000,
        wasEngaged: false,
      })),
    });
    const item = createBubbleItem();

    const newState = processDismiss(state, item, 3000, null);

    expect(newState.history).toHaveLength(100);
  });
});

describe('Process Engage', () => {
  it('creates engaged history entry', () => {
    const state = createUserState();
    const item = createBubbleItem();

    const newState = processEngage(state, item, 1500);

    expect(newState.history).toHaveLength(1);
    expect(newState.history[0].action).toBe('engaged');
    expect(newState.history[0].wasEngaged).toBe(true);
  });

  it('boosts category weight on engagement', () => {
    const state = createUserState({ categoryWeights: { deadline: 1.0 } });
    const item = createBubbleItem();

    const newState = processEngage(state, item, 1500);

    expect(newState.categoryWeights.deadline).toBe(1.05);
  });
});

describe('Defer Date Calculation', () => {
  it('calculates tonight date', () => {
    const date = calculateDeferDate('tonight');
    const hours = date.getHours();

    // Should be 8 PM (or next day if past 8 PM)
    expect(hours === 20 || date.getDate() !== new Date().getDate()).toBe(true);
  });

  it('calculates tomorrow date', () => {
    const date = calculateDeferDate('tomorrow');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    expect(date.getDate()).toBe(tomorrow.getDate());
    expect(date.getHours()).toBe(9);
  });

  it('calculates monday date', () => {
    const date = calculateDeferDate('monday');

    expect(date.getDay()).toBe(1); // Monday
    expect(date.getHours()).toBe(9);
  });

  it('accepts custom date', () => {
    const custom = new Date('2025-06-15T14:00:00');
    const date = calculateDeferDate(custom);

    expect(date.getTime()).toBe(custom.getTime());
  });
});

describe('Process Defer', () => {
  it('creates deferred history entry', () => {
    const state = createUserState();
    const item = createBubbleItem();

    const newState = processDefer(state, item, 2000, 'tomorrow');

    expect(newState.history).toHaveLength(1);
    expect(newState.history[0].action).toBe('deferred');
  });

  it('adds item to deferred list', () => {
    const state = createUserState();
    const item = createBubbleItem();

    const newState = processDefer(state, item, 2000, 'tomorrow');

    expect(newState.deferred).toHaveLength(1);
    expect(newState.deferred[0].itemId).toBe('item-1');
  });
});

describe('Deferred Item Checks', () => {
  it('detects deferred item', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const state = createUserState({
      deferred: [
        { itemId: 'item-1', deferredAt: new Date(), deferredUntil: future },
      ],
    });

    expect(isItemDeferred(state, 'item-1')).toBe(true);
    expect(isItemDeferred(state, 'item-2')).toBe(false);
  });

  it('does not detect expired deferrals', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const state = createUserState({
      deferred: [
        { itemId: 'item-1', deferredAt: new Date(), deferredUntil: past },
      ],
    });

    expect(isItemDeferred(state, 'item-1')).toBe(false);
  });

  it('gets ready deferred items', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const state = createUserState({
      deferred: [
        { itemId: 'item-1', deferredAt: new Date(), deferredUntil: past },
        { itemId: 'item-2', deferredAt: new Date(), deferredUntil: future },
      ],
    });

    const ready = getReadyDeferredItems(state);

    expect(ready).toHaveLength(1);
    expect(ready[0].itemId).toBe('item-1');
  });

  it('cleans up expired deferrals', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const state = createUserState({
      deferred: [
        { itemId: 'item-1', deferredAt: new Date(), deferredUntil: past },
        { itemId: 'item-2', deferredAt: new Date(), deferredUntil: future },
      ],
    });

    const cleaned = cleanupDeferredItems(state);

    expect(cleaned.deferred).toHaveLength(1);
    expect(cleaned.deferred[0].itemId).toBe('item-2');
  });
});

describe('Engagement Statistics', () => {
  it('calculates engagement rate', () => {
    const state = createUserState({
      history: [
        { itemId: '1', category: 'deadline', confidenceScore: 80, action: 'engaged', timestamp: new Date(), timeToAction: 1000, wasEngaged: true },
        { itemId: '2', category: 'deadline', confidenceScore: 70, action: 'dismissed', timestamp: new Date(), timeToAction: 2000, wasEngaged: false },
        { itemId: '3', category: 'deadline', confidenceScore: 60, action: 'engaged', timestamp: new Date(), timeToAction: 1500, wasEngaged: true },
        { itemId: '4', category: 'reminder', confidenceScore: 50, action: 'engaged', timestamp: new Date(), timeToAction: 1000, wasEngaged: true },
      ],
    });

    const deadlineRate = getCategoryEngagementRate(state, 'deadline');
    const reminderRate = getCategoryEngagementRate(state, 'reminder');
    const emptyRate = getCategoryEngagementRate(state, 'commitment');

    expect(deadlineRate).toBeCloseTo(0.67, 1); // 2/3
    expect(reminderRate).toBe(1); // 1/1
    expect(emptyRate).toBe(0.5); // No data, neutral
  });

  it('calculates response time', () => {
    const state = createUserState({
      history: [
        { itemId: '1', category: 'deadline', confidenceScore: 80, action: 'engaged', timestamp: new Date(), timeToAction: 1000, wasEngaged: true },
        { itemId: '2', category: 'deadline', confidenceScore: 70, action: 'engaged', timestamp: new Date(), timeToAction: 2000, wasEngaged: true },
        { itemId: '3', category: 'deadline', confidenceScore: 60, action: 'dismissed', timestamp: new Date(), timeToAction: 5000, wasEngaged: false },
      ],
    });

    const responseTime = getCategoryResponseTime(state, 'deadline');
    const emptyTime = getCategoryResponseTime(state, 'commitment');

    expect(responseTime).toBe(1500); // (1000 + 2000) / 2 - dismissed not counted
    expect(emptyTime).toBeNull();
  });
});

describe('Helpful Feedback', () => {
  it('boosts category weight', () => {
    const state = createUserState({ categoryWeights: { deadline: 1.0 } });
    const item = createBubbleItem();

    const newState = processHelpfulFeedback(state, item);

    expect(newState.categoryWeights.deadline).toBe(1.1);
  });
});

describe('Category Weight Utilities', () => {
  it('resets category weights', () => {
    const state = createUserState({
      categoryWeights: { deadline: 1.2, reminder: 0.8 },
    });

    const reset = resetCategoryWeights(state);

    expect(reset.categoryWeights).toEqual({});
  });

  it('gets category weight with default', () => {
    const state = createUserState({
      categoryWeights: { deadline: 1.2 },
    });

    expect(getCategoryWeight(state, 'deadline')).toBe(1.2);
    expect(getCategoryWeight(state, 'reminder')).toBe(1.0);
  });
});
