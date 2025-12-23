/**
 * Tests for Learning Layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordOutcome,
  recordEngagement,
  recordDismissal,
  recordFeedback,
  getOutcomesForCommitment,
  getRecentOutcomes,
  calculateEngagementRate,
  calculateDismissalRate,
  getAverageTimeToEngagement,
  countNegativeFeedback,
  countPositiveFeedback,
  getOutcomesByEngagement,
  adjustPreferencesFromOutcomes,
  clearOutcomes,
  getAllOutcomes,
} from '../learning/outcomes';
import type { NotificationOutcome, TemporalPreferences } from '../types';

describe('Outcome Tracking', () => {
  beforeEach(() => {
    clearOutcomes();
  });

  describe('recordOutcome', () => {
    it('should record notification outcome', () => {
      const outcome: NotificationOutcome = {
        commitmentId: 'test-1',
        notificationType: 'realtime',
        surfacedAt: new Date(),
        userEngaged: true,
        engagementType: 'acted',
        timeToEngagement: 5000,
      };

      recordOutcome(outcome);
      const all = getAllOutcomes();

      expect(all.length).toBe(1);
      expect(all[0].commitmentId).toBe('test-1');
    });
  });

  describe('recordEngagement', () => {
    it('should record engagement with timing', () => {
      recordEngagement('test-1', 'digest', 'acted', 3000);

      const outcomes = getAllOutcomes();
      expect(outcomes.length).toBe(1);
      expect(outcomes[0].userEngaged).toBe(true);
      expect(outcomes[0].engagementType).toBe('acted');
      expect(outcomes[0].timeToEngagement).toBe(3000);
    });
  });

  describe('recordDismissal', () => {
    it('should record dismissal', () => {
      recordDismissal('test-1', 'realtime');

      const outcomes = getAllOutcomes();
      expect(outcomes.length).toBe(1);
      expect(outcomes[0].userEngaged).toBe(false);
      expect(outcomes[0].engagementType).toBe('dismissed');
    });
  });

  describe('recordFeedback', () => {
    it('should record explicit feedback', () => {
      recordFeedback('test-1', 'realtime', 'stop_this_type');

      const outcomes = getAllOutcomes();
      expect(outcomes.length).toBe(1);
      expect(outcomes[0].explicitFeedback).toBe('stop_this_type');
    });
  });

  describe('getOutcomesForCommitment', () => {
    it('should filter by commitment', () => {
      recordEngagement('test-1', 'digest', 'opened');
      recordEngagement('test-1', 'realtime', 'acted');
      recordEngagement('test-2', 'digest', 'opened');

      const outcomes = getOutcomesForCommitment('test-1');
      expect(outcomes.length).toBe(2);
    });
  });

  describe('getRecentOutcomes', () => {
    it('should filter by recency', () => {
      // Record outcome from 10 days ago
      const oldOutcome: NotificationOutcome = {
        commitmentId: 'old',
        notificationType: 'digest',
        surfacedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        userEngaged: true,
      };
      recordOutcome(oldOutcome);

      // Record recent outcome
      recordEngagement('recent', 'digest', 'opened');

      const recent = getRecentOutcomes(7);
      expect(recent.length).toBe(1);
      expect(recent[0].commitmentId).toBe('recent');
    });

    it('should include all within window', () => {
      recordEngagement('test-1', 'digest', 'opened');
      recordEngagement('test-2', 'digest', 'opened');

      const recent = getRecentOutcomes(30);
      expect(recent.length).toBe(2);
    });
  });

  describe('calculateEngagementRate', () => {
    it('should calculate overall engagement rate', () => {
      recordEngagement('test-1', 'digest', 'opened');
      recordEngagement('test-2', 'digest', 'acted');
      recordDismissal('test-3', 'digest');
      recordDismissal('test-4', 'digest');

      // 2 engaged, 2 not engaged = 50%
      expect(calculateEngagementRate()).toBe(0.5);
    });

    it('should filter by notification type', () => {
      recordEngagement('test-1', 'digest', 'opened');
      recordDismissal('test-2', 'digest');
      recordEngagement('test-3', 'realtime', 'acted');

      // Digest: 1 engaged, 1 not = 50%
      expect(calculateEngagementRate('digest')).toBe(0.5);
      // Realtime: 1 engaged = 100%
      expect(calculateEngagementRate('realtime')).toBe(1.0);
    });

    it('should return 0 for empty', () => {
      expect(calculateEngagementRate()).toBe(0);
    });
  });

  describe('calculateDismissalRate', () => {
    it('should calculate dismissal rate', () => {
      recordEngagement('test-1', 'digest', 'opened');
      recordDismissal('test-2', 'digest');
      recordDismissal('test-3', 'digest');

      // 2 dismissed out of 3 = 0.666...
      expect(calculateDismissalRate()).toBeCloseTo(0.67, 1);
    });

    it('should return 0 for empty', () => {
      expect(calculateDismissalRate()).toBe(0);
    });
  });

  describe('getAverageTimeToEngagement', () => {
    it('should calculate average time', () => {
      recordEngagement('test-1', 'digest', 'opened', 1000);
      recordEngagement('test-2', 'digest', 'acted', 3000);
      recordEngagement('test-3', 'digest', 'tapped', 2000);

      expect(getAverageTimeToEngagement()).toBe(2000);
    });

    it('should return null for no timing data', () => {
      recordEngagement('test-1', 'digest', 'opened');
      expect(getAverageTimeToEngagement()).toBeNull();
    });

    it('should ignore outcomes without timing', () => {
      recordEngagement('test-1', 'digest', 'opened', 1000);
      recordEngagement('test-2', 'digest', 'opened'); // No timing

      expect(getAverageTimeToEngagement()).toBe(1000);
    });
  });

  describe('feedback counting', () => {
    it('should count negative feedback', () => {
      recordFeedback('test-1', 'realtime', 'stop_this_type');
      recordFeedback('test-2', 'realtime', 'stop_this_type');
      recordFeedback('test-3', 'realtime', 'more_like_this');

      expect(countNegativeFeedback()).toBe(2);
    });

    it('should count positive feedback', () => {
      recordFeedback('test-1', 'realtime', 'more_like_this');
      recordFeedback('test-2', 'realtime', 'more_like_this');
      recordFeedback('test-3', 'realtime', 'stop_this_type');

      expect(countPositiveFeedback()).toBe(2);
    });
  });

  describe('getOutcomesByEngagement', () => {
    it('should filter by engagement type', () => {
      recordEngagement('test-1', 'digest', 'opened');
      recordEngagement('test-2', 'digest', 'acted');
      recordEngagement('test-3', 'realtime', 'acted');
      recordDismissal('test-4', 'realtime');

      const acted = getOutcomesByEngagement('acted');
      expect(acted.length).toBe(2);

      const dismissed = getOutcomesByEngagement('dismissed');
      expect(dismissed.length).toBe(1);
    });
  });

  describe('adjustPreferencesFromOutcomes', () => {
    it('should not adjust with insufficient data', () => {
      recordEngagement('test-1', 'digest', 'opened');

      const prefs: Partial<TemporalPreferences> = {
        realtimeTolerance: 0.5,
      };

      const adjusted = adjustPreferencesFromOutcomes(prefs, 14);

      expect(adjusted.realtimeTolerance).toBe(0.5); // Unchanged
    });

    it('should reduce tolerance with high dismissal rate', () => {
      // Create 5 outcomes with high dismissal rate
      recordDismissal('test-1', 'digest');
      recordDismissal('test-2', 'digest');
      recordDismissal('test-3', 'digest');
      recordDismissal('test-4', 'digest');
      recordEngagement('test-5', 'digest', 'opened');

      const prefs: Partial<TemporalPreferences> = {
        realtimeTolerance: 0.5,
      };

      const adjusted = adjustPreferencesFromOutcomes(prefs, 14);

      expect(adjusted.realtimeTolerance).toBeLessThan(0.5);
    });

    it('should increase tolerance with low dismissal rate', () => {
      // Create 5 outcomes with low dismissal rate
      recordEngagement('test-1', 'digest', 'opened');
      recordEngagement('test-2', 'digest', 'acted');
      recordEngagement('test-3', 'digest', 'tapped');
      recordEngagement('test-4', 'digest', 'opened');
      recordEngagement('test-5', 'digest', 'acted');

      const prefs: Partial<TemporalPreferences> = {
        realtimeTolerance: 0.5,
      };

      const adjusted = adjustPreferencesFromOutcomes(prefs, 14);

      expect(adjusted.realtimeTolerance).toBeGreaterThan(0.5);
    });

    it('should not exceed tolerance bounds', () => {
      // High engagement scenario
      for (let i = 0; i < 10; i++) {
        recordEngagement(`test-${i}`, 'digest', 'acted');
      }

      const prefs: Partial<TemporalPreferences> = {
        realtimeTolerance: 0.8,
      };

      const adjusted = adjustPreferencesFromOutcomes(prefs, 14);

      expect(adjusted.realtimeTolerance).toBeLessThanOrEqual(0.8);
    });
  });
});
