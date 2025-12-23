/**
 * Tests for Scoring Layer
 */

import { describe, it, expect } from 'vitest';
import {
  calculateUrgency,
  inferCategory,
  calculateImportance,
  calculateDecay,
  calculateAffinity,
  calculatePriorityScore,
  calculatePriorityScores,
  sortByPriority,
  filterByPriority,
  getTopPriority,
  formatPriorityBreakdown,
} from '../scoring/priority';
import type { Commitment, TemporalReference, TemporalPreferences } from '../types';

describe('Priority Scoring', () => {
  const createCommitment = (
    overrides: Partial<Commitment> = {},
    whenOverrides: Partial<TemporalReference> = {}
  ): Commitment => ({
    id: `test-${Date.now()}`,
    commitmentText: 'Test commitment',
    who: 'user',
    what: 'do something',
    when: {
      rawText: 'tomorrow',
      isVague: false,
      urgencyCategory: 'TOMORROW',
      parsedDate: new Date(Date.now() + 86400000),
      ...whenOverrides,
    },
    source: {
      type: 'email',
      sourceId: 'test',
      extractedAt: new Date(),
    },
    confidence: 0.8,
    reasoning: 'Test',
    createdAt: new Date(),
    validated: false,
    ...overrides,
  });

  describe('calculateUrgency', () => {
    it('should give max urgency for past due', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const urgency = calculateUrgency({
        rawText: 'yesterday',
        parsedDate: pastDate,
        isVague: false,
        urgencyCategory: 'TODAY',
      });

      expect(urgency).toBe(1.0);
    });

    it('should give high urgency for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const urgency = calculateUrgency({
        rawText: 'tomorrow',
        parsedDate: tomorrow,
        isVague: false,
        urgencyCategory: 'TOMORROW',
      });

      expect(urgency).toBe(0.95);
    });

    it('should give medium urgency for this week', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 5);

      const urgency = calculateUrgency({
        rawText: 'in 5 days',
        parsedDate: nextWeek,
        isVague: false,
        urgencyCategory: 'THIS_WEEK',
      });

      expect(urgency).toBe(0.65); // 3-7 days range
    });

    it('should give low urgency for later', () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 60);

      const urgency = calculateUrgency({
        rawText: 'in 2 months',
        parsedDate: farFuture,
        isVague: false,
        urgencyCategory: 'LATER',
      });

      expect(urgency).toBeLessThan(0.3);
    });

    it('should use category when no parsed date', () => {
      expect(
        calculateUrgency({
          rawText: 'today',
          isVague: false,
          urgencyCategory: 'TODAY',
        })
      ).toBe(1.0);

      expect(
        calculateUrgency({
          rawText: 'this week',
          isVague: false,
          urgencyCategory: 'THIS_WEEK',
        })
      ).toBe(0.7);

      expect(
        calculateUrgency({
          rawText: 'later',
          isVague: true,
          urgencyCategory: 'LATER',
        })
      ).toBe(0.1);
    });
  });

  describe('inferCategory', () => {
    it('should detect financial commitments', () => {
      const commitment = createCommitment({
        what: 'pay the invoice by end of month',
      });

      expect(inferCategory(commitment)).toBe('financial');
    });

    it('should detect legal commitments', () => {
      const commitment = createCommitment({
        what: 'sign the contract and send to lawyer',
      });

      expect(inferCategory(commitment)).toBe('legal');
    });

    it('should detect family commitments', () => {
      const commitment = createCommitment({
        what: 'call mom for her birthday',
      });

      expect(inferCategory(commitment)).toBe('family');
    });

    it('should detect health commitments', () => {
      const commitment = createCommitment({
        what: 'schedule doctor appointment',
      });

      expect(inferCategory(commitment)).toBe('health');
    });

    it('should detect work client commitments', () => {
      const commitment = createCommitment({
        what: 'send deliverable to client',
      });

      expect(inferCategory(commitment)).toBe('work_client');
    });

    it('should detect social commitments', () => {
      const commitment = createCommitment({
        what: 'dinner with friends on Saturday',
      });

      expect(inferCategory(commitment)).toBe('social');
    });

    it('should default to unknown', () => {
      const commitment = createCommitment({
        what: 'finish the thing',
      });

      expect(inferCategory(commitment)).toBe('unknown');
    });
  });

  describe('calculateImportance', () => {
    it('should give high importance to critical categories', () => {
      const financial = createCommitment({ what: 'pay the bill' });
      const health = createCommitment({ what: 'doctor appointment' });
      const family = createCommitment({ what: 'wedding planning' });

      expect(calculateImportance(financial)).toBe(1.0);
      expect(calculateImportance(health)).toBe(1.0);
      expect(calculateImportance(family)).toBe(1.0);
    });

    it('should give medium importance to work', () => {
      const workClient = createCommitment({ what: 'client meeting' });
      const workInternal = createCommitment({ what: 'team standup' });

      expect(calculateImportance(workClient)).toBe(0.7);
      expect(calculateImportance(workInternal)).toBe(0.6);
    });

    it('should give lower importance to personal/social', () => {
      const social = createCommitment({ what: 'party planning' });
      const personal = createCommitment({ what: 'go to gym' });

      expect(calculateImportance(social)).toBe(0.4);
      expect(calculateImportance(personal)).toBe(0.4);
    });

    it('should use learned category weights', () => {
      const commitment = createCommitment({ what: 'pay the bill' });
      const prefs: Partial<TemporalPreferences> = {
        categoryWeights: {
          financial: 0.5, // Override default
        },
      };

      expect(calculateImportance(commitment, prefs)).toBe(0.5);
    });
  });

  describe('calculateDecay', () => {
    it('should give max decay for new items', () => {
      const now = new Date();
      expect(calculateDecay(now, now)).toBe(1.0);
    });

    it('should reduce decay over time', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      expect(calculateDecay(twoDaysAgo, now)).toBe(0.7);
      expect(calculateDecay(fiveDaysAgo, now)).toBe(0.4);
      expect(calculateDecay(tenDaysAgo, now)).toBe(0.1);
    });
  });

  describe('calculateAffinity', () => {
    it('should return default affinity', () => {
      const commitment = createCommitment();
      expect(calculateAffinity(commitment)).toBe(0.5);
    });

    it('should use learned affinity', () => {
      const commitment = createCommitment({ what: 'pay bill' });
      const prefs: Partial<TemporalPreferences> = {
        categoryWeights: {
          financial_affinity: 0.9,
        },
      };

      expect(calculateAffinity(commitment, prefs)).toBe(0.9);
    });
  });

  describe('calculatePriorityScore', () => {
    it('should calculate weighted priority', () => {
      const commitment = createCommitment({
        what: 'pay the urgent bill',
        when: {
          rawText: 'today',
          isVague: false,
          urgencyCategory: 'TODAY',
        },
      });

      const score = calculatePriorityScore(commitment);

      expect(score.commitmentId).toBe(commitment.id);
      expect(score.totalScore).toBeGreaterThan(0);
      expect(score.totalScore).toBeLessThanOrEqual(1);
      expect(score.components.urgency).toBeDefined();
      expect(score.components.importance).toBeDefined();
      expect(score.components.decay).toBeDefined();
      expect(score.components.userAffinity).toBeDefined();
    });

    it('should give higher priority to urgent critical items', () => {
      const urgentCritical = createCommitment({
        what: 'pay overdue bill',
        when: {
          rawText: 'today',
          isVague: false,
          urgencyCategory: 'TODAY',
        },
      });

      const laterPersonal = createCommitment({
        what: 'finish the thing',
        when: {
          rawText: 'later',
          isVague: true,
          urgencyCategory: 'LATER',
        },
      });

      const urgentScore = calculatePriorityScore(urgentCritical);
      const laterScore = calculatePriorityScore(laterPersonal);

      expect(urgentScore.totalScore).toBeGreaterThan(laterScore.totalScore);
    });
  });

  describe('calculatePriorityScores', () => {
    it('should calculate scores for multiple commitments', () => {
      const commitments = [
        createCommitment({ id: '1' }),
        createCommitment({ id: '2' }),
        createCommitment({ id: '3' }),
      ];

      const scores = calculatePriorityScores(commitments);

      expect(scores.length).toBe(3);
      scores.forEach((score) => {
        expect(score.totalScore).toBeGreaterThan(0);
      });
    });
  });

  describe('sortByPriority', () => {
    it('should sort by priority descending', () => {
      const commitments = [
        createCommitment({
          id: 'low',
          what: 'random thing',
          when: { rawText: 'later', isVague: true, urgencyCategory: 'LATER' },
        }),
        createCommitment({
          id: 'high',
          what: 'pay urgent bill',
          when: { rawText: 'today', isVague: false, urgencyCategory: 'TODAY' },
        }),
        createCommitment({
          id: 'med',
          what: 'client meeting',
          when: { rawText: 'this week', isVague: false, urgencyCategory: 'THIS_WEEK' },
        }),
      ];

      const sorted = sortByPriority(commitments);

      expect(sorted[0].commitment.id).toBe('high');
      expect(sorted[0].score.totalScore).toBeGreaterThan(sorted[1].score.totalScore);
      expect(sorted[1].score.totalScore).toBeGreaterThan(sorted[2].score.totalScore);
    });
  });

  describe('filterByPriority', () => {
    it('should filter items above threshold', () => {
      const commitments = [
        createCommitment({
          id: 'high',
          what: 'pay bill today',
          when: { rawText: 'today', isVague: false, urgencyCategory: 'TODAY' },
        }),
        createCommitment({
          id: 'low',
          what: 'random thing',
          when: { rawText: 'later', isVague: true, urgencyCategory: 'LATER' },
        }),
      ];

      const filtered = filterByPriority(commitments, 0.5);

      expect(filtered.some((c) => c.id === 'high')).toBe(true);
    });
  });

  describe('getTopPriority', () => {
    it('should return top N items', () => {
      const commitments = [
        createCommitment({ id: '1' }),
        createCommitment({ id: '2' }),
        createCommitment({ id: '3' }),
        createCommitment({ id: '4' }),
        createCommitment({ id: '5' }),
      ];

      const top3 = getTopPriority(commitments, 3);

      expect(top3.length).toBe(3);
    });

    it('should handle request for more than available', () => {
      const commitments = [
        createCommitment({ id: '1' }),
        createCommitment({ id: '2' }),
      ];

      const top5 = getTopPriority(commitments, 5);

      expect(top5.length).toBe(2);
    });
  });

  describe('formatPriorityBreakdown', () => {
    it('should format breakdown string', () => {
      const commitment = createCommitment();
      const score = calculatePriorityScore(commitment);
      const formatted = formatPriorityBreakdown(score);

      expect(formatted).toContain('Priority:');
      expect(formatted).toContain('U:');
      expect(formatted).toContain('I:');
      expect(formatted).toContain('D:');
      expect(formatted).toContain('A:');
    });
  });
});
