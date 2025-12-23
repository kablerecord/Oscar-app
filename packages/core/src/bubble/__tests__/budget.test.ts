/**
 * Bubble Budget & Focus Mode Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createInterruptBudget,
  shouldResetDaily,
  shouldResetHourly,
  resetDailyBudget,
  resetHourlyBudget,
  applyResets,
  getHourlyLimit,
  calculateCost,
  canConsumeBudget,
  consumeBudget,
  setDailyTotal,
  setEmergencyBypass,
  getBudgetUtilization,
  formatBudgetStatus,
} from '../budget/interruptBudget';
import {
  getFocusMode,
  getAllFocusModes,
  getVisualStateFromScore,
  isStateAllowed,
  shouldSurfaceItem,
  showPassiveIndicators,
  isSoundEnabled,
  isHapticEnabled,
  getEffectiveVisualState,
  filterItemsForFocusMode,
  getQueuedItems,
  isValidFocusMode,
  getNextFocusMode,
  getFocusModeDescription,
  getFocusModeDisplayName,
  createCustomFocusMode,
} from '../budget/focusMode';
import type { InterruptBudget, BubbleItem } from '../types';
import { BUDGET_DEFAULTS } from '../constants';

// Test fixtures
const createBubbleItem = (overrides: Partial<BubbleItem> = {}): BubbleItem => ({
  id: 'bubble-1',
  temporalItemId: 'item-1',
  message: 'Test message',
  confidenceScore: 75,
  basePriority: 70,
  category: 'deadline',
  state: 'pending',
  ...overrides,
});

describe('Interrupt Budget Creation', () => {
  it('creates budget with default values', () => {
    const budget = createInterruptBudget();

    expect(budget.daily.total).toBe(BUDGET_DEFAULTS.defaultDaily);
    expect(budget.daily.used).toBe(0);
    expect(budget.daily.remaining).toBe(BUDGET_DEFAULTS.defaultDaily);
    expect(budget.hourly.focused).toBe(BUDGET_DEFAULTS.hourlyFocused);
    expect(budget.hourly.available).toBe(BUDGET_DEFAULTS.hourlyAvailable);
    expect(budget.emergency.enabled).toBe(true);
    expect(budget.emergency.threshold).toBe(BUDGET_DEFAULTS.emergencyThreshold);
  });

  it('creates budget with custom daily total', () => {
    const budget = createInterruptBudget(25);

    expect(budget.daily.total).toBe(25);
    expect(budget.daily.remaining).toBe(25);
  });

  it('clamps daily total to valid range', () => {
    const lowBudget = createInterruptBudget(5);
    const highBudget = createInterruptBudget(100);

    expect(lowBudget.daily.total).toBe(BUDGET_DEFAULTS.minDaily);
    expect(highBudget.daily.total).toBe(BUDGET_DEFAULTS.maxDaily);
  });
});

describe('Budget Reset Detection', () => {
  it('detects daily reset needed after midnight', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const budget = createInterruptBudget();
    budget.daily.lastReset = yesterday;

    expect(shouldResetDaily(budget)).toBe(true);
  });

  it('does not reset daily on same day', () => {
    const budget = createInterruptBudget();
    budget.daily.lastReset = new Date();

    expect(shouldResetDaily(budget)).toBe(false);
  });

  it('detects hourly reset needed after 1 hour', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const budget = createInterruptBudget();
    budget.hourly.windowStart = twoHoursAgo;

    expect(shouldResetHourly(budget)).toBe(true);
  });

  it('does not reset hourly within same hour', () => {
    const budget = createInterruptBudget();
    budget.hourly.windowStart = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago

    expect(shouldResetHourly(budget)).toBe(false);
  });
});

describe('Budget Reset Operations', () => {
  it('resets daily budget', () => {
    const budget = createInterruptBudget();
    budget.daily.used = 10;
    budget.daily.remaining = 5;

    const reset = resetDailyBudget(budget);

    expect(reset.daily.used).toBe(0);
    expect(reset.daily.remaining).toBe(budget.daily.total);
  });

  it('resets hourly budget', () => {
    const budget = createInterruptBudget();
    budget.hourly.current = 4;

    const reset = resetHourlyBudget(budget);

    expect(reset.hourly.current).toBe(0);
  });

  it('applies resets when needed', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const budget = createInterruptBudget();
    budget.daily.lastReset = yesterday;
    budget.daily.used = 10;
    budget.daily.remaining = 5;

    const applied = applyResets(budget);

    expect(applied.daily.used).toBe(0);
    expect(applied.daily.remaining).toBe(budget.daily.total);
  });
});

describe('Budget Consumption', () => {
  it('calculates cost of 1 for normal items', () => {
    const item = createBubbleItem({ confidenceScore: 80 });

    expect(calculateCost(item)).toBe(1);
  });

  it('calculates cost of 0 for emergency items', () => {
    const item = createBubbleItem({ confidenceScore: 99 });

    expect(calculateCost(item)).toBe(0);
  });

  it('allows consumption within budget', () => {
    const budget = createInterruptBudget();
    const item = createBubbleItem();

    const result = canConsumeBudget(budget, item, 'available');

    expect(result.allowed).toBe(true);
    expect(result.cost).toBe(1);
    expect(result.reason).toBe('within_budget');
  });

  it('blocks consumption when daily budget exhausted', () => {
    const budget = createInterruptBudget();
    budget.daily.remaining = 0;

    const item = createBubbleItem();
    const result = canConsumeBudget(budget, item, 'available');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('daily_budget_exhausted');
  });

  it('blocks consumption when hourly limit reached', () => {
    const budget = createInterruptBudget();
    budget.hourly.current = 5; // At limit for 'available' mode

    const item = createBubbleItem();
    const result = canConsumeBudget(budget, item, 'available');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('hourly_limit_reached');
  });

  it('allows emergency bypass regardless of budget', () => {
    const budget = createInterruptBudget();
    budget.daily.remaining = 0;
    budget.hourly.current = 5;

    const item = createBubbleItem({ confidenceScore: 99 });
    const result = canConsumeBudget(budget, item, 'available');

    expect(result.allowed).toBe(true);
    expect(result.cost).toBe(0);
    expect(result.reason).toBe('emergency_bypass');
  });

  it('blocks all in DND mode except emergencies', () => {
    const budget = createInterruptBudget();
    const item = createBubbleItem({ confidenceScore: 80 });

    const result = canConsumeBudget(budget, item, 'dnd');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('dnd_mode');
  });

  it('consumes budget correctly', () => {
    const budget = createInterruptBudget();
    const item = createBubbleItem();

    const consumed = consumeBudget(budget, item, 'available');

    expect(consumed.daily.used).toBe(1);
    expect(consumed.daily.remaining).toBe(budget.daily.total - 1);
    expect(consumed.hourly.current).toBe(1);
  });
});

describe('Budget Configuration', () => {
  it('sets daily total', () => {
    const budget = createInterruptBudget();
    const updated = setDailyTotal(budget, 20);

    expect(updated.daily.total).toBe(20);
  });

  it('clamps daily total to bounds', () => {
    const budget = createInterruptBudget();
    const tooLow = setDailyTotal(budget, 5);
    const tooHigh = setDailyTotal(budget, 50);

    expect(tooLow.daily.total).toBe(BUDGET_DEFAULTS.minDaily);
    expect(tooHigh.daily.total).toBe(BUDGET_DEFAULTS.maxDaily);
  });

  it('enables/disables emergency bypass', () => {
    const budget = createInterruptBudget();

    const disabled = setEmergencyBypass(budget, false);
    expect(disabled.emergency.enabled).toBe(false);

    const enabled = setEmergencyBypass(disabled, true);
    expect(enabled.emergency.enabled).toBe(true);
  });
});

describe('Budget Utilization', () => {
  it('calculates utilization percentages', () => {
    const budget = createInterruptBudget();
    budget.daily.used = 5;
    budget.daily.remaining = 10;
    budget.hourly.current = 2;

    const util = getBudgetUtilization(budget);

    expect(util.daily).toBe(33); // 5/15 = 33%
    expect(util.hourly).toBe(40); // 2/5 = 40%
  });

  it('formats budget status', () => {
    const budget = createInterruptBudget();
    budget.daily.used = 5;
    budget.daily.remaining = 10;

    const status = formatBudgetStatus(budget);

    expect(status).toContain('Daily: 5/15');
    expect(status).toContain('Hourly:');
  });
});

describe('Hourly Limit', () => {
  it('returns available limit for available mode', () => {
    const budget = createInterruptBudget();
    expect(getHourlyLimit(budget, 'available')).toBe(5);
  });

  it('returns focused limit for focused mode', () => {
    const budget = createInterruptBudget();
    expect(getHourlyLimit(budget, 'focused')).toBe(2);
  });

  it('returns 0 for DND mode', () => {
    const budget = createInterruptBudget();
    expect(getHourlyLimit(budget, 'dnd')).toBe(0);
  });
});

// Focus Mode Tests
describe('Focus Mode Configuration', () => {
  it('gets available mode', () => {
    const mode = getFocusMode('available');

    expect(mode.name).toBe('available');
    expect(mode.hourlyLimit).toBe(5);
    expect(mode.soundEnabled).toBe(true);
    expect(mode.hapticEnabled).toBe(true);
  });

  it('gets focused mode', () => {
    const mode = getFocusMode('focused');

    expect(mode.name).toBe('focused');
    expect(mode.hourlyLimit).toBe(2);
    expect(mode.soundEnabled).toBe(false);
    expect(mode.hapticEnabled).toBe(false);
  });

  it('gets DND mode', () => {
    const mode = getFocusMode('dnd');

    expect(mode.name).toBe('dnd');
    expect(mode.hourlyLimit).toBe(0);
    expect(mode.queueAll).toBe(true);
    expect(mode.passiveIndicators).toBe(false);
  });

  it('returns all focus modes', () => {
    const modes = getAllFocusModes();

    expect(modes).toHaveLength(3);
    expect(modes.map((m) => m.name)).toContain('available');
    expect(modes.map((m) => m.name)).toContain('focused');
    expect(modes.map((m) => m.name)).toContain('dnd');
  });
});

describe('Visual State from Score', () => {
  it('returns passive for low scores', () => {
    expect(getVisualStateFromScore(50)).toBe('passive');
  });

  it('returns ready for medium scores', () => {
    expect(getVisualStateFromScore(70)).toBe('ready');
  });

  it('returns active for high scores', () => {
    expect(getVisualStateFromScore(85)).toBe('active');
  });

  it('returns priority for very high scores', () => {
    expect(getVisualStateFromScore(98)).toBe('priority');
  });
});

describe('State Allowed Check', () => {
  it('allows all states in available mode', () => {
    expect(isStateAllowed('passive', 'available')).toBe(true);
    expect(isStateAllowed('ready', 'available')).toBe(true);
    expect(isStateAllowed('active', 'available')).toBe(true);
    expect(isStateAllowed('priority', 'available')).toBe(true);
  });

  it('only allows passive and ready in focused mode', () => {
    expect(isStateAllowed('passive', 'focused')).toBe(true);
    expect(isStateAllowed('ready', 'focused')).toBe(true);
    expect(isStateAllowed('active', 'focused')).toBe(false);
    expect(isStateAllowed('priority', 'focused')).toBe(false);
  });

  it('allows nothing in DND mode', () => {
    expect(isStateAllowed('passive', 'dnd')).toBe(false);
    expect(isStateAllowed('ready', 'dnd')).toBe(false);
    expect(isStateAllowed('active', 'dnd')).toBe(false);
    expect(isStateAllowed('priority', 'dnd')).toBe(false);
  });
});

describe('Should Surface Item', () => {
  it('surfaces items in available mode', () => {
    const item = createBubbleItem({ confidenceScore: 85 });
    expect(shouldSurfaceItem(item, 'available')).toBe(true);
  });

  it('surfaces only passive/ready in focused mode', () => {
    const activeItem = createBubbleItem({ confidenceScore: 85 });
    const readyItem = createBubbleItem({ confidenceScore: 70 });

    expect(shouldSurfaceItem(activeItem, 'focused')).toBe(false);
    expect(shouldSurfaceItem(readyItem, 'focused')).toBe(true);
  });

  it('surfaces emergency items in available mode', () => {
    const emergency = createBubbleItem({ confidenceScore: 99 });
    expect(shouldSurfaceItem(emergency, 'available')).toBe(true);
  });

  it('does not surface emergencies in DND mode', () => {
    const emergency = createBubbleItem({ confidenceScore: 99 });
    expect(shouldSurfaceItem(emergency, 'dnd')).toBe(false);
  });
});

describe('Focus Mode Indicators', () => {
  it('shows passive indicators in available mode', () => {
    expect(showPassiveIndicators('available')).toBe(true);
  });

  it('shows passive indicators in focused mode', () => {
    expect(showPassiveIndicators('focused')).toBe(true);
  });

  it('hides passive indicators in DND mode', () => {
    expect(showPassiveIndicators('dnd')).toBe(false);
  });

  it('enables sound in available mode only', () => {
    expect(isSoundEnabled('available')).toBe(true);
    expect(isSoundEnabled('focused')).toBe(false);
    expect(isSoundEnabled('dnd')).toBe(false);
  });

  it('enables haptics in available mode only', () => {
    expect(isHapticEnabled('available')).toBe(true);
    expect(isHapticEnabled('focused')).toBe(false);
    expect(isHapticEnabled('dnd')).toBe(false);
  });
});

describe('Effective Visual State', () => {
  it('returns desired state if allowed', () => {
    const item = createBubbleItem({ confidenceScore: 85 }); // 'active' state
    expect(getEffectiveVisualState(item, 'available')).toBe('active');
  });

  it('downgrades to highest allowed state', () => {
    const item = createBubbleItem({ confidenceScore: 85 }); // 'active' state
    expect(getEffectiveVisualState(item, 'focused')).toBe('ready');
  });

  it('returns null if no state allowed', () => {
    const item = createBubbleItem({ confidenceScore: 85 });
    expect(getEffectiveVisualState(item, 'dnd')).toBe(null);
  });
});

describe('Item Filtering', () => {
  it('filters items for focus mode', () => {
    const items = [
      createBubbleItem({ id: '1', confidenceScore: 50 }),  // passive
      createBubbleItem({ id: '2', confidenceScore: 70 }),  // ready
      createBubbleItem({ id: '3', confidenceScore: 85 }),  // active
    ];

    const filtered = filterItemsForFocusMode(items, 'focused');

    expect(filtered).toHaveLength(2);
    expect(filtered.map((i) => i.id)).toContain('1');
    expect(filtered.map((i) => i.id)).toContain('2');
  });

  it('gets queued items in DND mode', () => {
    const items = [
      createBubbleItem({ id: '1', confidenceScore: 80 }),
      createBubbleItem({ id: '2', confidenceScore: 99 }), // emergency
    ];

    const queued = getQueuedItems(items, 'dnd');

    expect(queued).toHaveLength(1);
    expect(queued[0].id).toBe('1');
  });

  it('returns empty queue for non-DND modes', () => {
    const items = [createBubbleItem()];
    expect(getQueuedItems(items, 'available')).toHaveLength(0);
    expect(getQueuedItems(items, 'focused')).toHaveLength(0);
  });
});

describe('Focus Mode Utilities', () => {
  it('validates focus mode names', () => {
    expect(isValidFocusMode('available')).toBe(true);
    expect(isValidFocusMode('focused')).toBe(true);
    expect(isValidFocusMode('dnd')).toBe(true);
    expect(isValidFocusMode('invalid')).toBe(false);
  });

  it('cycles to next focus mode', () => {
    expect(getNextFocusMode('available')).toBe('focused');
    expect(getNextFocusMode('focused')).toBe('dnd');
    expect(getNextFocusMode('dnd')).toBe('available');
  });

  it('gets focus mode description', () => {
    expect(getFocusModeDescription('available')).toContain('bubbles');
    expect(getFocusModeDescription('focused')).toContain('passive');
    expect(getFocusModeDescription('dnd')).toContain('queued');
  });

  it('gets focus mode display name', () => {
    expect(getFocusModeDisplayName('available')).toBe('Available');
    expect(getFocusModeDisplayName('focused')).toBe('Focused');
    expect(getFocusModeDisplayName('dnd')).toBe('Do Not Disturb');
  });

  it('creates custom focus mode', () => {
    const custom = createCustomFocusMode('available', {
      hourlyLimit: 10,
      soundEnabled: false,
    });

    expect(custom.name).toBe('available');
    expect(custom.hourlyLimit).toBe(10);
    expect(custom.soundEnabled).toBe(false);
    expect(custom.hapticEnabled).toBe(true); // Preserved from base
  });
});
