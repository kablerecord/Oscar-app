/**
 * Tests for Budget Layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isInQuietHours,
  isCritical,
  getBudget,
  saveBudget,
  recordRealtimeInterrupt,
  recordForcedInterrupt,
  markDigestSent,
  canSendRealtimeInterrupt,
  getRemainingInterrupts,
  determineInterruptAction,
  processInterruptQueue,
  bundleInterrupts,
  resetBudget,
  clearAllBudgets,
} from '../budget/manager';
import type {
  InterruptBudget,
  InterruptDecision,
  PriorityScore,
  TemporalPreferences,
} from '../types';

describe('Interrupt Budget Manager', () => {
  const userId = 'test-user';

  beforeEach(() => {
    clearAllBudgets();
  });

  describe('isInQuietHours', () => {
    it('should detect quiet hours at night', () => {
      const prefs: Partial<TemporalPreferences> = {
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };

      // 11 PM - in quiet hours
      const lateNight = new Date();
      lateNight.setHours(23, 0, 0, 0);
      expect(isInQuietHours(lateNight, prefs)).toBe(true);

      // 3 AM - in quiet hours
      const earlyMorning = new Date();
      earlyMorning.setHours(3, 0, 0, 0);
      expect(isInQuietHours(earlyMorning, prefs)).toBe(true);

      // 10 AM - not in quiet hours
      const midMorning = new Date();
      midMorning.setHours(10, 0, 0, 0);
      expect(isInQuietHours(midMorning, prefs)).toBe(false);
    });

    it('should handle same-day quiet hours', () => {
      const prefs: Partial<TemporalPreferences> = {
        quietHoursStart: '12:00',
        quietHoursEnd: '14:00',
      };

      const noon = new Date();
      noon.setHours(13, 0, 0, 0);
      expect(isInQuietHours(noon, prefs)).toBe(true);

      const morning = new Date();
      morning.setHours(10, 0, 0, 0);
      expect(isInQuietHours(morning, prefs)).toBe(false);
    });
  });

  describe('isCritical', () => {
    it('should identify critical items', () => {
      const criticalScore: PriorityScore = {
        commitmentId: 'test',
        totalScore: 0.95,
        components: {
          urgency: 0.98,
          importance: 1.0,
          decay: 1.0,
          userAffinity: 0.8,
        },
        calculatedAt: new Date(),
      };

      expect(isCritical(criticalScore, ['financial'])).toBe(true);
    });

    it('should not flag non-critical items', () => {
      const normalScore: PriorityScore = {
        commitmentId: 'test',
        totalScore: 0.6,
        components: {
          urgency: 0.5,
          importance: 0.7,
          decay: 0.8,
          userAffinity: 0.5,
        },
        calculatedAt: new Date(),
      };

      expect(isCritical(normalScore, ['financial'])).toBe(false);
    });
  });

  describe('getBudget', () => {
    it('should create new budget for new user', () => {
      const budget = getBudget(userId);

      expect(budget.userId).toBe(userId);
      expect(budget.morningDigestSent).toBe(false);
      expect(budget.realtimeInterruptsUsed).toBe(0);
      expect(budget.realtimeInterruptMax).toBe(2); // Default
      expect(budget.forcedInterrupts).toEqual([]);
    });

    it('should return existing budget', () => {
      const budget1 = getBudget(userId);
      budget1.realtimeInterruptsUsed = 1;
      saveBudget(budget1);

      const budget2 = getBudget(userId);
      expect(budget2.realtimeInterruptsUsed).toBe(1);
    });

    it('should use custom config', () => {
      const budget = getBudget(userId, { defaultRealtimeMax: 5 });
      expect(budget.realtimeInterruptMax).toBe(5);
    });
  });

  describe('recordRealtimeInterrupt', () => {
    it('should increment counter', () => {
      expect(getBudget(userId).realtimeInterruptsUsed).toBe(0);

      recordRealtimeInterrupt(userId, 'commit-1');
      expect(getBudget(userId).realtimeInterruptsUsed).toBe(1);

      recordRealtimeInterrupt(userId, 'commit-2');
      expect(getBudget(userId).realtimeInterruptsUsed).toBe(2);
    });
  });

  describe('recordForcedInterrupt', () => {
    it('should add to forced list', () => {
      recordForcedInterrupt(userId, 'commit-1');
      recordForcedInterrupt(userId, 'commit-2');

      const budget = getBudget(userId);
      expect(budget.forcedInterrupts).toContain('commit-1');
      expect(budget.forcedInterrupts).toContain('commit-2');
    });
  });

  describe('markDigestSent', () => {
    it('should mark digest as sent', () => {
      markDigestSent(userId, ['item-1', 'item-2']);

      const budget = getBudget(userId);
      expect(budget.morningDigestSent).toBe(true);
      expect(budget.morningDigestItems).toEqual(['item-1', 'item-2']);
    });
  });

  describe('canSendRealtimeInterrupt', () => {
    it('should allow when under budget', () => {
      expect(canSendRealtimeInterrupt(userId)).toBe(true);

      recordRealtimeInterrupt(userId, 'commit-1');
      expect(canSendRealtimeInterrupt(userId)).toBe(true);
    });

    it('should deny when budget exhausted', () => {
      recordRealtimeInterrupt(userId, 'commit-1');
      recordRealtimeInterrupt(userId, 'commit-2');

      expect(canSendRealtimeInterrupt(userId)).toBe(false);
    });
  });

  describe('getRemainingInterrupts', () => {
    it('should return remaining capacity', () => {
      expect(getRemainingInterrupts(userId)).toBe(2);

      recordRealtimeInterrupt(userId, 'commit-1');
      expect(getRemainingInterrupts(userId)).toBe(1);

      recordRealtimeInterrupt(userId, 'commit-2');
      expect(getRemainingInterrupts(userId)).toBe(0);
    });
  });

  describe('determineInterruptAction', () => {
    it('should use REALTIME_INTERRUPT for urgent items', () => {
      const score: PriorityScore = {
        commitmentId: 'test',
        totalScore: 0.9,
        components: {
          urgency: 0.98,
          importance: 1.0,
          decay: 1.0,
          userAffinity: 0.8,
        },
        calculatedAt: new Date(),
      };

      const budget = getBudget(userId);
      const action = determineInterruptAction(score, budget);

      expect(action).toBe('REALTIME_INTERRUPT');
    });

    it('should use FORCED_INTERRUPT when budget exhausted', () => {
      const score: PriorityScore = {
        commitmentId: 'test',
        totalScore: 0.9,
        components: {
          urgency: 0.98,
          importance: 1.0,
          decay: 1.0,
          userAffinity: 0.8,
        },
        calculatedAt: new Date(),
      };

      // Exhaust budget
      recordRealtimeInterrupt(userId, 'c1');
      recordRealtimeInterrupt(userId, 'c2');

      const budget = getBudget(userId);
      const action = determineInterruptAction(score, budget);

      expect(action).toBe('FORCED_INTERRUPT');
    });

    it('should use SUGGEST_ONE_TAP for high confidence', () => {
      const score: PriorityScore = {
        commitmentId: 'test',
        totalScore: 0.75,
        components: {
          urgency: 0.7,
          importance: 0.8,
          decay: 0.8,
          userAffinity: 0.6,
        },
        calculatedAt: new Date(),
      };

      const budget = getBudget(userId);
      const action = determineInterruptAction(score, budget);

      expect(action).toBe('SUGGEST_ONE_TAP');
    });

    it('should use BUBBLE_NOTIFICATION for medium confidence', () => {
      const score: PriorityScore = {
        commitmentId: 'test',
        totalScore: 0.55,
        components: {
          urgency: 0.5,
          importance: 0.6,
          decay: 0.6,
          userAffinity: 0.5,
        },
        calculatedAt: new Date(),
      };

      const budget = getBudget(userId);
      const action = determineInterruptAction(score, budget);

      expect(action).toBe('BUBBLE_NOTIFICATION');
    });

    it('should use STORE_SILENT for low confidence', () => {
      const score: PriorityScore = {
        commitmentId: 'test',
        totalScore: 0.3,
        components: {
          urgency: 0.2,
          importance: 0.3,
          decay: 0.4,
          userAffinity: 0.4,
        },
        calculatedAt: new Date(),
      };

      const budget = getBudget(userId);
      const action = determineInterruptAction(score, budget);

      expect(action).toBe('STORE_SILENT');
    });
  });

  describe('processInterruptQueue', () => {
    it('should process items by priority', () => {
      const items: PriorityScore[] = [
        {
          commitmentId: 'high',
          totalScore: 0.9,
          components: { urgency: 0.95, importance: 1.0, decay: 1.0, userAffinity: 0.8 },
          calculatedAt: new Date(),
        },
        {
          commitmentId: 'med',
          totalScore: 0.6,
          components: { urgency: 0.6, importance: 0.7, decay: 0.7, userAffinity: 0.5 },
          calculatedAt: new Date(),
        },
        {
          commitmentId: 'low',
          totalScore: 0.3,
          components: { urgency: 0.2, importance: 0.3, decay: 0.4, userAffinity: 0.4 },
          calculatedAt: new Date(),
        },
      ];

      const decisions = processInterruptQueue(userId, items);

      expect(decisions.length).toBe(3);
      // Check high priority got realtime
      const highDecision = decisions.find((d) => d.commitmentId === 'high');
      expect(highDecision?.action).toBe('REALTIME_INTERRUPT');
    });

    it('should respect quiet hours', () => {
      const items: PriorityScore[] = [
        {
          commitmentId: 'normal',
          totalScore: 0.7,
          components: { urgency: 0.7, importance: 0.7, decay: 0.7, userAffinity: 0.5 },
          calculatedAt: new Date(),
        },
      ];

      // Set to quiet hours
      const prefs: Partial<TemporalPreferences> = {
        quietHoursStart: '00:00',
        quietHoursEnd: '23:59',
        quietHoursCriticalException: false,
      };

      const decisions = processInterruptQueue(userId, items, prefs);

      expect(decisions[0].action).toBe('STORE_SILENT');
    });

    it('should allow critical items during quiet hours with exception', () => {
      const items: PriorityScore[] = [
        {
          commitmentId: 'critical',
          totalScore: 0.95,
          components: { urgency: 0.98, importance: 1.0, decay: 1.0, userAffinity: 0.8 },
          calculatedAt: new Date(),
        },
      ];

      const prefs: Partial<TemporalPreferences> = {
        quietHoursStart: '00:00',
        quietHoursEnd: '23:59',
        quietHoursCriticalException: true,
      };

      const decisions = processInterruptQueue(userId, items, prefs);

      expect(decisions[0].action).toBe('REALTIME_INTERRUPT');
    });
  });

  describe('bundleInterrupts', () => {
    it('should bundle forced interrupts', () => {
      const decisions: InterruptDecision[] = [
        { commitmentId: 'f1', action: 'FORCED_INTERRUPT', reason: 'test' },
        { commitmentId: 'f2', action: 'FORCED_INTERRUPT', reason: 'test' },
        { commitmentId: 'f3', action: 'FORCED_INTERRUPT', reason: 'test' },
        { commitmentId: 'normal', action: 'BUBBLE_NOTIFICATION', reason: 'test' },
      ];

      const bundled = bundleInterrupts(decisions, ['f1', 'f2', 'f3']);

      // Should have bundled decision + normal
      expect(bundled.length).toBe(2);
      const bundledDecision = bundled.find((d) => d.action === 'BUNDLED_URGENT');
      expect(bundledDecision).toBeDefined();
      expect(bundledDecision?.reason).toContain('3 urgent');
    });

    it('should preserve non-forced decisions', () => {
      const decisions: InterruptDecision[] = [
        { commitmentId: 'f1', action: 'FORCED_INTERRUPT', reason: 'test' },
        { commitmentId: 'normal1', action: 'BUBBLE_NOTIFICATION', reason: 'test' },
        { commitmentId: 'normal2', action: 'SUGGEST_ONE_TAP', reason: 'test' },
      ];

      const bundled = bundleInterrupts(decisions, ['f1']);

      const bubbleDecision = bundled.find((d) => d.action === 'BUBBLE_NOTIFICATION');
      const suggestDecision = bundled.find((d) => d.action === 'SUGGEST_ONE_TAP');

      expect(bubbleDecision).toBeDefined();
      expect(suggestDecision).toBeDefined();
    });
  });

  describe('resetBudget', () => {
    it('should reset budget for user', () => {
      recordRealtimeInterrupt(userId, 'c1');
      expect(getBudget(userId).realtimeInterruptsUsed).toBe(1);

      resetBudget(userId);
      expect(getBudget(userId).realtimeInterruptsUsed).toBe(0);
    });
  });
});
