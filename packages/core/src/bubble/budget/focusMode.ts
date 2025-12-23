/**
 * Focus Mode Manager
 *
 * Manages three tiers of interruption filtering:
 * - Available: Full bubble experience
 * - Focused: Reduced interruptions, passive only
 * - DND: Queue everything for later
 */

import type {
  FocusModeConfig,
  FocusModeName,
  BubbleVisualState,
  BubbleItem,
} from '../types';
import { FOCUS_MODES, SCORE_THRESHOLDS, BUDGET_DEFAULTS } from '../constants';

/**
 * Get focus mode configuration by name
 */
export function getFocusMode(name: FocusModeName): FocusModeConfig {
  return FOCUS_MODES[name] || FOCUS_MODES.available;
}

/**
 * Get all available focus modes
 */
export function getAllFocusModes(): FocusModeConfig[] {
  return Object.values(FOCUS_MODES);
}

/**
 * Determine visual state based on confidence score
 */
export function getVisualStateFromScore(score: number): BubbleVisualState {
  if (score >= SCORE_THRESHOLDS.priority) return 'priority';
  if (score >= SCORE_THRESHOLDS.active) return 'active';
  if (score >= SCORE_THRESHOLDS.ready) return 'ready';
  return 'passive';
}

/**
 * Check if a visual state is allowed in the current focus mode
 */
export function isStateAllowed(
  state: BubbleVisualState,
  focusMode: FocusModeName
): boolean {
  const mode = getFocusMode(focusMode);
  return mode.bubbleStates.includes(state);
}

/**
 * Check if an item should be surfaced in the current focus mode
 */
export function shouldSurfaceItem(
  item: BubbleItem,
  focusMode: FocusModeName
): boolean {
  const mode = getFocusMode(focusMode);

  // Emergency items always surface (except in DND)
  if (item.confidenceScore >= BUDGET_DEFAULTS.emergencyThreshold) {
    return focusMode !== 'dnd';
  }

  // DND queues everything
  if (mode.queueAll) {
    return false;
  }

  // Check if visual state is allowed
  const visualState = getVisualStateFromScore(item.confidenceScore);
  return mode.bubbleStates.includes(visualState);
}

/**
 * Check if passive indicators should be shown
 */
export function showPassiveIndicators(focusMode: FocusModeName): boolean {
  const mode = getFocusMode(focusMode);
  return mode.passiveIndicators;
}

/**
 * Check if sound is enabled for focus mode
 */
export function isSoundEnabled(focusMode: FocusModeName): boolean {
  const mode = getFocusMode(focusMode);
  return mode.soundEnabled;
}

/**
 * Check if haptic feedback is enabled for focus mode
 */
export function isHapticEnabled(focusMode: FocusModeName): boolean {
  const mode = getFocusMode(focusMode);
  return mode.hapticEnabled;
}

/**
 * Get the effective visual state considering focus mode restrictions
 */
export function getEffectiveVisualState(
  item: BubbleItem,
  focusMode: FocusModeName
): BubbleVisualState | null {
  const mode = getFocusMode(focusMode);
  const desiredState = getVisualStateFromScore(item.confidenceScore);

  // If the desired state is allowed, use it
  if (mode.bubbleStates.includes(desiredState)) {
    return desiredState;
  }

  // Otherwise, find the highest allowed state that's lower than desired
  const stateHierarchy: BubbleVisualState[] = ['passive', 'ready', 'active', 'priority'];
  const desiredIndex = stateHierarchy.indexOf(desiredState);

  for (let i = desiredIndex; i >= 0; i--) {
    if (mode.bubbleStates.includes(stateHierarchy[i])) {
      return stateHierarchy[i];
    }
  }

  // No allowed state found
  return null;
}

/**
 * Filter items based on focus mode
 */
export function filterItemsForFocusMode(
  items: BubbleItem[],
  focusMode: FocusModeName
): BubbleItem[] {
  return items.filter((item) => shouldSurfaceItem(item, focusMode));
}

/**
 * Get items that should be queued (DND mode)
 */
export function getQueuedItems(
  items: BubbleItem[],
  focusMode: FocusModeName
): BubbleItem[] {
  const mode = getFocusMode(focusMode);

  if (!mode.queueAll) {
    return [];
  }

  // In DND, queue everything except true emergencies
  return items.filter(
    (item) => item.confidenceScore < BUDGET_DEFAULTS.emergencyThreshold
  );
}

/**
 * Validate focus mode name
 */
export function isValidFocusMode(name: string): name is FocusModeName {
  return name === 'available' || name === 'focused' || name === 'dnd';
}

/**
 * Get next focus mode in cycle (for toggle)
 */
export function getNextFocusMode(current: FocusModeName): FocusModeName {
  const cycle: FocusModeName[] = ['available', 'focused', 'dnd'];
  const currentIndex = cycle.indexOf(current);
  return cycle[(currentIndex + 1) % cycle.length];
}

/**
 * Get focus mode description for display
 */
export function getFocusModeDescription(focusMode: FocusModeName): string {
  switch (focusMode) {
    case 'available':
      return 'All bubbles can surface based on confidence scores';
    case 'focused':
      return 'Only passive indicators, no active interruptions';
    case 'dnd':
      return 'All bubbles queued for later review';
    default:
      return '';
  }
}

/**
 * Get focus mode display name
 */
export function getFocusModeDisplayName(focusMode: FocusModeName): string {
  switch (focusMode) {
    case 'available':
      return 'Available';
    case 'focused':
      return 'Focused';
    case 'dnd':
      return 'Do Not Disturb';
    default:
      return 'Unknown';
  }
}

/**
 * Create a custom focus mode (for advanced users)
 */
export function createCustomFocusMode(
  name: FocusModeName,
  overrides: Partial<FocusModeConfig>
): FocusModeConfig {
  const base = getFocusMode(name);
  return {
    ...base,
    ...overrides,
  };
}

export default {
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
};
