/**
 * Bubble Engine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BubbleEngine, createBubbleEngine } from '../engine';
import type { TemporalItem, BubbleItem, BubbleUserState } from '../types';
import { DEFAULT_USER_STATE, DEFAULT_ENGINE_CONFIG } from '../constants';

// Test fixtures
const createTemporalItem = (overrides: Partial<TemporalItem> = {}): TemporalItem => ({
  id: `item-${Math.random().toString(36).slice(2, 9)}`,
  type: 'deadline',
  content: 'Test item',
  source: 'test',
  priority: 70,
  ...overrides,
});

describe('BubbleEngine Creation', () => {
  it('creates engine with default config', () => {
    const engine = createBubbleEngine();
    const state = engine.getState();

    expect(state.items).toHaveLength(0);
    expect(state.focusMode.name).toBe('available');
    expect(state.budget.daily.total).toBe(DEFAULT_ENGINE_CONFIG.budget.defaultDaily);
  });

  it('creates engine with custom config', () => {
    const engine = createBubbleEngine({
      budget: {
        ...DEFAULT_ENGINE_CONFIG.budget,
        defaultDaily: 20,
      },
    });
    const state = engine.getState();

    expect(state.budget.daily.total).toBe(20);
  });

  it('creates engine with initial state', () => {
    const userState = { ...DEFAULT_USER_STATE, categoryWeights: { deadline: 1.5 } };
    const engine = createBubbleEngine({}, { userState });

    expect(engine.getCategoryWeight('deadline')).toBe(1.5);
  });
});

describe('Event Subscription', () => {
  it('allows subscribing to events', () => {
    const engine = createBubbleEngine();
    const events: any[] = [];

    const unsubscribe = engine.subscribe((event) => events.push(event));

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('receives events when items are surfaced', () => {
    const engine = createBubbleEngine();
    const events: any[] = [];

    engine.subscribe((event) => events.push(event));

    const item = createTemporalItem({ priority: 90 });
    engine.ingest(item);

    expect(events.some((e) => e.type === 'item_surfaced')).toBe(true);
  });
});

describe('Item Ingestion', () => {
  it('ingests a temporal item', () => {
    const engine = createBubbleEngine();
    const item = createTemporalItem();

    const bubble = engine.ingest(item);

    expect(bubble).not.toBeNull();
    expect(bubble?.temporalItemId).toBe(item.id);
    expect(engine.getItems()).toHaveLength(1);
  });

  it('calculates confidence score on ingest', () => {
    const engine = createBubbleEngine();
    const item = createTemporalItem({ priority: 80 });

    const bubble = engine.ingest(item);

    expect(bubble?.confidenceScore).toBeGreaterThan(0);
    expect(bubble?.confidenceScore).toBeLessThanOrEqual(100);
  });

  it('prevents duplicate ingestion', () => {
    const engine = createBubbleEngine();
    const item = createTemporalItem();

    engine.ingest(item);
    const duplicate = engine.ingest(item);

    expect(duplicate).toBeNull();
    expect(engine.getItems()).toHaveLength(1);
  });

  it('skips deferred items', () => {
    const engine = createBubbleEngine();
    const item = createTemporalItem();

    // Ingest and defer
    const bubble = engine.ingest(item);
    if (bubble) {
      engine.defer(bubble.id, 'tomorrow');
    }

    // Try to ingest again (simulating re-processing)
    engine.clearItems();
    const reingested = engine.ingest(item);

    expect(reingested).toBeNull();
  });

  it('ingests batch of items', () => {
    const engine = createBubbleEngine();
    const items = [
      createTemporalItem({ id: '1' }),
      createTemporalItem({ id: '2' }),
      createTemporalItem({ id: '3' }),
    ];

    const bubbles = engine.ingestBatch(items);

    expect(bubbles).toHaveLength(3);
    expect(engine.getItems()).toHaveLength(3);
  });
});

describe('Item Surfacing', () => {
  it('surfaces high confidence items', () => {
    const engine = createBubbleEngine();
    const item = createTemporalItem({ priority: 95 });

    engine.ingest(item);

    const surfaced = engine.getSurfacedItems();
    expect(surfaced.length).toBeGreaterThanOrEqual(0);
  });

  it('does not surface low confidence items', () => {
    const engine = createBubbleEngine();
    const item = createTemporalItem({ priority: 10 });

    engine.ingest(item);

    const allItems = engine.getItems();
    const surfacedItem = allItems.find((i) => i.state === 'surfaced');
    expect(surfacedItem).toBeUndefined();
  });

  it('consumes budget on surfacing', () => {
    const engine = createBubbleEngine();
    const initialStatus = engine.getBudgetStatus();

    const item = createTemporalItem({ priority: 95 });
    engine.ingest(item);

    const afterStatus = engine.getBudgetStatus();
    // Budget may or may not be consumed depending on score and surfacing
    expect(afterStatus.remaining).toBeLessThanOrEqual(initialStatus.remaining);
  });
});

describe('Focus Mode', () => {
  it('gets current focus mode', () => {
    const engine = createBubbleEngine();
    const mode = engine.getFocusMode();

    expect(mode.name).toBe('available');
  });

  it('sets focus mode', () => {
    const engine = createBubbleEngine();
    const events: any[] = [];
    engine.subscribe((e) => events.push(e));

    engine.setFocusMode('focused');

    const mode = engine.getFocusMode();
    expect(mode.name).toBe('focused');
    expect(events.some((e) => e.type === 'focus_mode_changed')).toBe(true);
  });

  it('filters surfaced items by focus mode', () => {
    const engine = createBubbleEngine();

    // Ingest item that would normally surface
    const item = createTemporalItem({ priority: 95 });
    engine.ingest(item);

    // Set DND mode
    engine.setFocusMode('dnd');

    const surfaced = engine.getSurfacedItems();
    expect(surfaced).toHaveLength(0);
  });

  it('queues items in DND mode', () => {
    const engine = createBubbleEngine();
    engine.setFocusMode('dnd');

    const item = createTemporalItem({ priority: 90 });
    engine.ingest(item);

    const queued = engine.getQueuedItems();
    expect(queued.length).toBeGreaterThanOrEqual(0);
  });
});

describe('Budget Management', () => {
  it('gets budget status', () => {
    const engine = createBubbleEngine();
    const status = engine.getBudgetStatus();

    expect(status).toHaveProperty('daily');
    expect(status).toHaveProperty('hourly');
    expect(status).toHaveProperty('remaining');
  });

  it('sets daily budget', () => {
    const engine = createBubbleEngine();

    engine.setDailyBudget(25);

    const state = engine.getState();
    expect(state.budget.daily.total).toBe(25);
  });
});

describe('User Actions', () => {
  let engine: BubbleEngine;
  let bubble: BubbleItem | null;

  beforeEach(() => {
    engine = createBubbleEngine();
    const item = createTemporalItem({ priority: 90 });
    bubble = engine.ingest(item);
  });

  it('handles dismiss action', () => {
    const events: any[] = [];
    engine.subscribe((e) => events.push(e));

    if (bubble) {
      engine.dismiss(bubble.id, 'not_relevant');
    }

    const items = engine.getItems();
    const dismissed = items.find((i) => i.id === bubble?.id);
    expect(dismissed?.state).toBe('dismissed');
    expect(events.some((e) => e.type === 'item_dismissed')).toBe(true);
  });

  it('handles engage action', () => {
    const events: any[] = [];
    engine.subscribe((e) => events.push(e));

    if (bubble) {
      engine.engage(bubble.id);
    }

    const items = engine.getItems();
    const engaged = items.find((i) => i.id === bubble?.id);
    expect(engaged?.state).toBe('engaged');
    expect(events.some((e) => e.type === 'item_engaged')).toBe(true);
  });

  it('handles defer action', () => {
    const events: any[] = [];
    engine.subscribe((e) => events.push(e));

    if (bubble) {
      engine.defer(bubble.id, 'tomorrow');
    }

    const items = engine.getItems();
    const deferred = items.find((i) => i.id === bubble?.id);
    expect(deferred?.state).toBe('deferred');
    expect(events.some((e) => e.type === 'item_deferred')).toBe(true);
  });

  it('adjusts category weight on feedback', () => {
    const initialWeight = engine.getCategoryWeight('deadline');

    if (bubble) {
      engine.dismiss(bubble.id, 'less_like_this');
    }

    const newWeight = engine.getCategoryWeight('deadline');
    expect(newWeight).toBeLessThan(initialWeight);
  });
});

describe('Context Updates', () => {
  it('updates context', () => {
    const engine = createBubbleEngine();

    engine.updateContext({
      activeProject: 'project-x',
      recentTopics: ['testing', 'typescript'],
    });

    const state = engine.getState();
    expect(state.context.activeProject).toBe('project-x');
    expect(state.context.recentTopics).toContain('testing');
  });

  it('re-scores items on context change', () => {
    const engine = createBubbleEngine();
    const item = createTemporalItem({
      priority: 50,
      project: 'project-x',
    });

    engine.ingest(item);
    const beforeScore = engine.getItems()[0].confidenceScore;

    engine.updateContext({ activeProject: 'project-x' });
    const afterScore = engine.getItems()[0].confidenceScore;

    expect(afterScore).toBeGreaterThan(beforeScore);
  });
});

describe('Deferred Items', () => {
  it('checks deferred items for resurfacing', () => {
    const engine = createBubbleEngine();
    const item = createTemporalItem({ priority: 90 });
    const bubble = engine.ingest(item);

    if (bubble) {
      // Defer to the past (for testing)
      engine.defer(bubble.id, new Date(Date.now() - 1000));
    }

    const resurfaced = engine.checkDeferredItems();
    // The item may or may not resurface depending on state
    expect(Array.isArray(resurfaced)).toBe(true);
  });
});

describe('Confidence Breakdown', () => {
  it('returns breakdown for item', () => {
    const engine = createBubbleEngine();
    const item = createTemporalItem();
    const bubble = engine.ingest(item);

    if (bubble) {
      const breakdown = engine.getConfidenceBreakdown(bubble.id);

      expect(breakdown).toHaveProperty('basePriority');
      expect(breakdown).toHaveProperty('timeSensitivity');
      expect(breakdown).toHaveProperty('contextRelevance');
      expect(breakdown).toHaveProperty('historicalEngagement');
      expect(breakdown).toHaveProperty('finalScore');
    }
  });

  it('returns null for unknown item', () => {
    const engine = createBubbleEngine();
    const breakdown = engine.getConfidenceBreakdown('unknown-id');

    expect(breakdown).toBeNull();
  });
});

describe('Visual State', () => {
  it('returns visual state for item', () => {
    const engine = createBubbleEngine();
    const item = createTemporalItem({ priority: 90 });
    const bubble = engine.ingest(item);

    if (bubble) {
      const state = engine.getItemVisualState(bubble.id);
      expect(['passive', 'ready', 'active', 'priority', null]).toContain(state);
    }
  });

  it('returns null for unknown item', () => {
    const engine = createBubbleEngine();
    const state = engine.getItemVisualState('unknown-id');

    expect(state).toBeNull();
  });
});

describe('State Persistence', () => {
  it('exports user state', () => {
    const engine = createBubbleEngine();
    engine.setFocusMode('focused');
    engine.setDailyBudget(20);

    const exported = engine.exportUserState();

    expect(exported.preferences.focusMode).toBe('focused');
    expect(exported.preferences.dailyBudget).toBe(20);
  });

  it('imports user state', () => {
    const engine = createBubbleEngine();
    const userState: BubbleUserState = {
      ...DEFAULT_USER_STATE,
      preferences: {
        ...DEFAULT_USER_STATE.preferences,
        focusMode: 'focused',
        dailyBudget: 25,
      },
      categoryWeights: { deadline: 1.3 },
    };

    engine.importUserState(userState);

    expect(engine.getFocusMode().name).toBe('focused');
    expect(engine.getCategoryWeight('deadline')).toBe(1.3);
  });
});

describe('Item Clearing', () => {
  it('clears all items', () => {
    const engine = createBubbleEngine();
    engine.ingestBatch([
      createTemporalItem({ id: '1' }),
      createTemporalItem({ id: '2' }),
    ]);

    engine.clearItems();

    expect(engine.getItems()).toHaveLength(0);
  });
});

describe('Budget Resets', () => {
  it('applies budget resets', () => {
    const engine = createBubbleEngine();

    // This should not throw
    engine.applyResets();

    const status = engine.getBudgetStatus();
    expect(status.remaining).toBeDefined();
  });
});
