/**
 * Budget Module
 *
 * Exports interrupt budget management and focus mode controls.
 */

// Interrupt Budget
export {
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
} from './interruptBudget';

// Focus Mode
export {
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
} from './focusMode';
