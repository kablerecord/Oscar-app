/**
 * Interrupt Budget Manager
 *
 * Controls how many proactive interruptions OSQR can make per day/hour.
 * Prevents "notification fatigue" while ensuring important items surface.
 */

import type {
  InterruptBudget,
  BudgetConsumptionResult,
  BubbleItem,
  FocusModeName,
} from '../types';
import { BUDGET_DEFAULTS, FOCUS_MODES } from '../constants';

/**
 * Create a fresh interrupt budget
 */
export function createInterruptBudget(
  dailyTotal: number = BUDGET_DEFAULTS.defaultDaily
): InterruptBudget {
  const now = new Date();

  return {
    daily: {
      total: Math.min(BUDGET_DEFAULTS.maxDaily, Math.max(BUDGET_DEFAULTS.minDaily, dailyTotal)),
      used: 0,
      remaining: dailyTotal,
      lastReset: now,
      resetTime: `${BUDGET_DEFAULTS.resetHour}:00`,
    },
    hourly: {
      focused: BUDGET_DEFAULTS.hourlyFocused,
      available: BUDGET_DEFAULTS.hourlyAvailable,
      current: 0,
      windowStart: now,
    },
    emergency: {
      enabled: true,
      threshold: BUDGET_DEFAULTS.emergencyThreshold,
    },
  };
}

/**
 * Check if the budget should be reset (new day)
 */
export function shouldResetDaily(budget: InterruptBudget): boolean {
  const now = new Date();
  const lastReset = new Date(budget.daily.lastReset);

  // Reset if different day
  return (
    now.getDate() !== lastReset.getDate() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  );
}

/**
 * Check if the hourly window should be reset
 */
export function shouldResetHourly(budget: InterruptBudget): boolean {
  const now = new Date();
  const windowStart = new Date(budget.hourly.windowStart);

  // Reset if more than 1 hour has passed
  const hourMs = 60 * 60 * 1000;
  return now.getTime() - windowStart.getTime() >= hourMs;
}

/**
 * Reset the daily budget
 */
export function resetDailyBudget(budget: InterruptBudget): InterruptBudget {
  return {
    ...budget,
    daily: {
      ...budget.daily,
      used: 0,
      remaining: budget.daily.total,
      lastReset: new Date(),
    },
  };
}

/**
 * Reset the hourly budget
 */
export function resetHourlyBudget(budget: InterruptBudget): InterruptBudget {
  return {
    ...budget,
    hourly: {
      ...budget.hourly,
      current: 0,
      windowStart: new Date(),
    },
  };
}

/**
 * Apply any necessary resets to the budget
 */
export function applyResets(budget: InterruptBudget): InterruptBudget {
  let result = budget;

  if (shouldResetDaily(budget)) {
    result = resetDailyBudget(result);
  }

  if (shouldResetHourly(budget)) {
    result = resetHourlyBudget(result);
  }

  return result;
}

/**
 * Get the hourly limit based on focus mode
 */
export function getHourlyLimit(
  budget: InterruptBudget,
  focusMode: FocusModeName
): number {
  const mode = FOCUS_MODES[focusMode];
  return mode?.hourlyLimit ?? budget.hourly.available;
}

/**
 * Calculate the cost of surfacing an item
 * Priority items cost 0 (emergency bypass)
 * Active items cost 1
 */
export function calculateCost(item: BubbleItem): number {
  // Emergency/priority items bypass budget
  if (item.confidenceScore >= BUDGET_DEFAULTS.emergencyThreshold) {
    return 0;
  }
  return 1;
}

/**
 * Check if an item can be surfaced within budget constraints
 */
export function canConsumeBudget(
  budget: InterruptBudget,
  item: BubbleItem,
  focusMode: FocusModeName
): BudgetConsumptionResult {
  // Apply any necessary resets first
  const currentBudget = applyResets(budget);

  // Emergency bypass
  if (
    currentBudget.emergency.enabled &&
    item.confidenceScore >= currentBudget.emergency.threshold
  ) {
    return {
      allowed: true,
      cost: 0,
      reason: 'emergency_bypass',
    };
  }

  // DND mode blocks everything except emergencies
  if (focusMode === 'dnd') {
    return {
      allowed: false,
      cost: 0,
      reason: 'dnd_mode',
    };
  }

  const cost = calculateCost(item);

  // Check daily budget
  if (currentBudget.daily.remaining < cost) {
    return {
      allowed: false,
      cost,
      reason: 'daily_budget_exhausted',
    };
  }

  // Check hourly budget
  const hourlyLimit = getHourlyLimit(currentBudget, focusMode);
  if (currentBudget.hourly.current + cost > hourlyLimit) {
    return {
      allowed: false,
      cost,
      reason: 'hourly_limit_reached',
    };
  }

  return {
    allowed: true,
    cost,
    reason: 'within_budget',
  };
}

/**
 * Consume budget for surfacing an item
 */
export function consumeBudget(
  budget: InterruptBudget,
  item: BubbleItem,
  focusMode: FocusModeName
): InterruptBudget {
  const check = canConsumeBudget(budget, item, focusMode);

  if (!check.allowed || check.cost === 0) {
    // Either not allowed or emergency (no cost)
    return applyResets(budget);
  }

  const currentBudget = applyResets(budget);

  return {
    ...currentBudget,
    daily: {
      ...currentBudget.daily,
      used: currentBudget.daily.used + check.cost,
      remaining: currentBudget.daily.remaining - check.cost,
    },
    hourly: {
      ...currentBudget.hourly,
      current: currentBudget.hourly.current + check.cost,
    },
  };
}

/**
 * Set the daily budget total (user preference)
 */
export function setDailyTotal(
  budget: InterruptBudget,
  total: number
): InterruptBudget {
  const clampedTotal = Math.min(
    BUDGET_DEFAULTS.maxDaily,
    Math.max(BUDGET_DEFAULTS.minDaily, total)
  );

  return {
    ...budget,
    daily: {
      ...budget.daily,
      total: clampedTotal,
      remaining: Math.max(0, clampedTotal - budget.daily.used),
    },
  };
}

/**
 * Enable or disable emergency bypass
 */
export function setEmergencyBypass(
  budget: InterruptBudget,
  enabled: boolean
): InterruptBudget {
  return {
    ...budget,
    emergency: {
      ...budget.emergency,
      enabled,
    },
  };
}

/**
 * Get budget utilization percentage
 */
export function getBudgetUtilization(budget: InterruptBudget): {
  daily: number;
  hourly: number;
} {
  const currentBudget = applyResets(budget);

  const dailyPct = currentBudget.daily.total > 0
    ? (currentBudget.daily.used / currentBudget.daily.total) * 100
    : 0;

  const hourlyLimit = currentBudget.hourly.available;
  const hourlyPct = hourlyLimit > 0
    ? (currentBudget.hourly.current / hourlyLimit) * 100
    : 0;

  return {
    daily: Math.round(dailyPct),
    hourly: Math.round(hourlyPct),
  };
}

/**
 * Format budget status for display
 */
export function formatBudgetStatus(budget: InterruptBudget): string {
  const currentBudget = applyResets(budget);
  const { daily } = getBudgetUtilization(currentBudget);

  return `Daily: ${currentBudget.daily.used}/${currentBudget.daily.total} (${daily}%) | Hourly: ${currentBudget.hourly.current}/${currentBudget.hourly.available}`;
}

export default {
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
};
