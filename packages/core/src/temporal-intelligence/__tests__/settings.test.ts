/**
 * Tests for Settings Layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPreferences,
  updatePreferences,
  setQuietHours,
  setCriticalCategories,
  enableFocusMode,
  disableFocusMode,
  updateCategoryWeight,
  updateTypicalActionDelay,
  updateRealtimeTolerance,
  updatePreferredDigestTime,
  resetPreferences,
  clearAllPreferences,
  getGlobalConfig,
  updateGlobalConfig,
  resetGlobalConfig,
} from '../settings/config';
import type { TemporalPreferences, TemporalConfig } from '../types';

describe('User Preferences', () => {
  const userId = 'test-user';

  beforeEach(() => {
    clearAllPreferences();
    resetGlobalConfig();
  });

  describe('getPreferences', () => {
    it('should return default preferences for new user', () => {
      const prefs = getPreferences(userId);

      expect(prefs.userId).toBe(userId);
      expect(prefs.quietHoursStart).toBe('21:00');
      expect(prefs.quietHoursEnd).toBe('07:00');
      expect(prefs.quietHoursCriticalException).toBe(true);
      expect(prefs.criticalCategories).toContain('financial');
      expect(prefs.realtimeTolerance).toBe(0.5);
    });

    it('should return same preferences on subsequent calls', () => {
      const prefs1 = getPreferences(userId);
      const prefs2 = getPreferences(userId);

      expect(prefs1.userId).toBe(prefs2.userId);
    });
  });

  describe('updatePreferences', () => {
    it('should update specific fields', () => {
      updatePreferences(userId, { realtimeTolerance: 0.8 });

      const prefs = getPreferences(userId);
      expect(prefs.realtimeTolerance).toBe(0.8);
      expect(prefs.quietHoursStart).toBe('21:00'); // Unchanged
    });

    it('should merge updates', () => {
      updatePreferences(userId, { realtimeTolerance: 0.8 });
      updatePreferences(userId, { preferredDigestTime: '08:00' });

      const prefs = getPreferences(userId);
      expect(prefs.realtimeTolerance).toBe(0.8);
      expect(prefs.preferredDigestTime).toBe('08:00');
    });
  });

  describe('setQuietHours', () => {
    it('should set quiet hours', () => {
      setQuietHours(userId, '22:00', '06:00', false);

      const prefs = getPreferences(userId);
      expect(prefs.quietHoursStart).toBe('22:00');
      expect(prefs.quietHoursEnd).toBe('06:00');
      expect(prefs.quietHoursCriticalException).toBe(false);
    });

    it('should default to critical exception', () => {
      setQuietHours(userId, '22:00', '06:00');

      const prefs = getPreferences(userId);
      expect(prefs.quietHoursCriticalException).toBe(true);
    });
  });

  describe('setCriticalCategories', () => {
    it('should set critical categories', () => {
      setCriticalCategories(userId, ['work_client', 'legal']);

      const prefs = getPreferences(userId);
      expect(prefs.criticalCategories).toEqual(['work_client', 'legal']);
    });
  });

  describe('Focus Mode', () => {
    it('should enable focus mode', () => {
      enableFocusMode(userId, true, true);

      const prefs = getPreferences(userId);
      expect(prefs.focusModeSyncCalendar).toBe(true);
      expect(prefs.focusModeBatchUntilEnd).toBe(true);
    });

    it('should disable focus mode', () => {
      enableFocusMode(userId, true, true);
      disableFocusMode(userId);

      const prefs = getPreferences(userId);
      expect(prefs.focusModeSyncCalendar).toBe(false);
      expect(prefs.focusModeBatchUntilEnd).toBe(false);
    });
  });

  describe('Learned Preferences', () => {
    it('should update category weight', () => {
      updateCategoryWeight(userId, 'financial', 0.9);

      const prefs = getPreferences(userId);
      expect(prefs.categoryWeights.financial).toBe(0.9);
    });

    it('should update typical action delay', () => {
      updateTypicalActionDelay(userId, 'email', 4);

      const prefs = getPreferences(userId);
      expect(prefs.typicalActionDelay.email).toBe(4);
    });

    it('should update realtime tolerance with bounds', () => {
      updateRealtimeTolerance(userId, 1.5);
      expect(getPreferences(userId).realtimeTolerance).toBe(1); // Clamped to max

      updateRealtimeTolerance(userId, -0.5);
      expect(getPreferences(userId).realtimeTolerance).toBe(0); // Clamped to min
    });

    it('should update preferred digest time', () => {
      updatePreferredDigestTime(userId, '09:30');

      const prefs = getPreferences(userId);
      expect(prefs.preferredDigestTime).toBe('09:30');
    });
  });

  describe('resetPreferences', () => {
    it('should reset to defaults', () => {
      updatePreferences(userId, {
        realtimeTolerance: 0.9,
        quietHoursStart: '23:00',
      });

      resetPreferences(userId);

      const prefs = getPreferences(userId);
      expect(prefs.realtimeTolerance).toBe(0.5);
      expect(prefs.quietHoursStart).toBe('21:00');
    });
  });
});

describe('Global Configuration', () => {
  beforeEach(() => {
    resetGlobalConfig();
  });

  describe('getGlobalConfig', () => {
    it('should return default config', () => {
      const config = getGlobalConfig();

      expect(config.autoExecuteThreshold).toBe(0.85);
      expect(config.suggestThreshold).toBe(0.70);
      expect(config.bubbleThreshold).toBe(0.50);
      expect(config.defaultRealtimeMax).toBe(2);
      expect(config.defaultDigestSize).toBe(5);
      expect(config.digestTime).toBe('07:00');
      expect(config.calendarWriteEnabled).toBe(true);
    });

    it('should return copy of config', () => {
      const config1 = getGlobalConfig();
      const config2 = getGlobalConfig();

      config1.autoExecuteThreshold = 0.5;
      expect(config2.autoExecuteThreshold).toBe(0.85);
    });
  });

  describe('updateGlobalConfig', () => {
    it('should update config values', () => {
      updateGlobalConfig({
        autoExecuteThreshold: 0.9,
        defaultRealtimeMax: 5,
      });

      const config = getGlobalConfig();
      expect(config.autoExecuteThreshold).toBe(0.9);
      expect(config.defaultRealtimeMax).toBe(5);
      expect(config.suggestThreshold).toBe(0.70); // Unchanged
    });
  });

  describe('resetGlobalConfig', () => {
    it('should reset to defaults', () => {
      updateGlobalConfig({
        autoExecuteThreshold: 0.9,
        defaultRealtimeMax: 10,
      });

      resetGlobalConfig();

      const config = getGlobalConfig();
      expect(config.autoExecuteThreshold).toBe(0.85);
      expect(config.defaultRealtimeMax).toBe(2);
    });
  });
});
