/**
 * Configuration Management - User preferences and settings
 */

import type { TemporalPreferences, TemporalConfig } from '../types';
import { DEFAULT_TEMPORAL_PREFERENCES, DEFAULT_TEMPORAL_CONFIG } from '../types';

// In-memory preferences storage (would be DB in production)
const prefsStore = new Map<string, TemporalPreferences>();

/**
 * Get user preferences
 */
export function getPreferences(userId: string): TemporalPreferences {
  const existing = prefsStore.get(userId);

  if (existing) {
    return existing;
  }

  // Create default preferences
  const prefs: TemporalPreferences = {
    ...DEFAULT_TEMPORAL_PREFERENCES,
    userId,
  };

  prefsStore.set(userId, prefs);
  return prefs;
}

/**
 * Update user preferences
 */
export function updatePreferences(
  userId: string,
  updates: Partial<Omit<TemporalPreferences, 'userId'>>
): TemporalPreferences {
  const existing = getPreferences(userId);
  const updated = { ...existing, ...updates };
  prefsStore.set(userId, updated);
  return updated;
}

/**
 * Set quiet hours
 */
export function setQuietHours(
  userId: string,
  start: string,
  end: string,
  criticalException: boolean = true
): TemporalPreferences {
  return updatePreferences(userId, {
    quietHoursStart: start,
    quietHoursEnd: end,
    quietHoursCriticalException: criticalException,
  });
}

/**
 * Set critical categories
 */
export function setCriticalCategories(
  userId: string,
  categories: string[]
): TemporalPreferences {
  return updatePreferences(userId, {
    criticalCategories: categories,
  });
}

/**
 * Enable focus mode
 */
export function enableFocusMode(
  userId: string,
  syncCalendar: boolean = true,
  batchUntilEnd: boolean = true
): TemporalPreferences {
  return updatePreferences(userId, {
    focusModeSyncCalendar: syncCalendar,
    focusModeBatchUntilEnd: batchUntilEnd,
  });
}

/**
 * Disable focus mode
 */
export function disableFocusMode(userId: string): TemporalPreferences {
  return updatePreferences(userId, {
    focusModeSyncCalendar: false,
    focusModeBatchUntilEnd: false,
  });
}

/**
 * Update category weight (learned)
 */
export function updateCategoryWeight(
  userId: string,
  category: string,
  weight: number
): TemporalPreferences {
  const prefs = getPreferences(userId);
  const categoryWeights = { ...prefs.categoryWeights, [category]: weight };
  return updatePreferences(userId, { categoryWeights });
}

/**
 * Update typical action delay (learned)
 */
export function updateTypicalActionDelay(
  userId: string,
  category: string,
  delayHours: number
): TemporalPreferences {
  const prefs = getPreferences(userId);
  const typicalActionDelay = { ...prefs.typicalActionDelay, [category]: delayHours };
  return updatePreferences(userId, { typicalActionDelay });
}

/**
 * Update realtime tolerance (learned)
 */
export function updateRealtimeTolerance(
  userId: string,
  tolerance: number
): TemporalPreferences {
  return updatePreferences(userId, {
    realtimeTolerance: Math.max(0, Math.min(1, tolerance)),
  });
}

/**
 * Update preferred digest time (learned)
 */
export function updatePreferredDigestTime(
  userId: string,
  time: string
): TemporalPreferences {
  return updatePreferences(userId, {
    preferredDigestTime: time,
  });
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences(userId: string): TemporalPreferences {
  const defaults: TemporalPreferences = {
    ...DEFAULT_TEMPORAL_PREFERENCES,
    userId,
  };
  prefsStore.set(userId, defaults);
  return defaults;
}

/**
 * Clear all preferences (for testing)
 */
export function clearAllPreferences(): void {
  prefsStore.clear();
}

// Global config
let globalConfig: TemporalConfig = { ...DEFAULT_TEMPORAL_CONFIG };

/**
 * Get global configuration
 */
export function getGlobalConfig(): TemporalConfig {
  return { ...globalConfig };
}

/**
 * Update global configuration
 */
export function updateGlobalConfig(
  updates: Partial<TemporalConfig>
): TemporalConfig {
  globalConfig = { ...globalConfig, ...updates };
  return globalConfig;
}

/**
 * Reset global configuration
 */
export function resetGlobalConfig(): TemporalConfig {
  globalConfig = { ...DEFAULT_TEMPORAL_CONFIG };
  return globalConfig;
}
