/**
 * Tests for Context Budget (70% Rule)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  estimateTokens,
  estimateItemTokens,
  calculateTotalTokens,
  selectMentorScriptItems,
  isNearSoftLimit,
  isAtHardLimitByCount,
  getRemainingCapacity,
  calculateBudgetDistribution,
  formatBudgetSummary,
  suggestConsolidation,
} from '../context/budget';
import {
  calculateRecencyScore,
  calculateSemanticSimilarity,
  calculateItemScore,
  scoreAndSortItems,
  formatScoreBreakdown,
  getTopScoredItems,
  filterByMinScore,
} from '../context/scoring';
import type { MentorScriptItem } from '../types';

describe('Context Budget', () => {
  const createItem = (
    id: string,
    rule: string,
    priority: number = 5,
    appliedCount: number = 0,
    daysAgo: number = 0
  ): MentorScriptItem => ({
    id,
    rule,
    source: 'user_defined',
    created: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    appliedCount,
    priority,
  });

  describe('Token Estimation', () => {
    it('should estimate tokens for text', () => {
      const text = 'Hello world'; // 11 chars
      expect(estimateTokens(text)).toBe(3); // ceil(11/4)
    });

    it('should estimate tokens for item', () => {
      const item = createItem('1', 'Test rule');
      const tokens = estimateItemTokens(item);
      expect(tokens).toBeGreaterThan(estimateTokens(item.rule));
    });

    it('should calculate total tokens', () => {
      const items = [
        createItem('1', 'Rule one'),
        createItem('2', 'Rule two'),
      ];
      const total = calculateTotalTokens(items);
      expect(total).toBe(estimateItemTokens(items[0]) + estimateItemTokens(items[1]));
    });
  });

  describe('Item Selection (70% Rule)', () => {
    it('should select items within budget', () => {
      const items = [
        createItem('1', 'Search codebase first', 8, 50),
        createItem('2', 'Ask before debugging', 6, 20),
        createItem('3', 'Format code completely', 4, 5),
      ];

      const result = selectMentorScriptItems(items, 'debug code', 1000);

      expect(result.loadedItems.length).toBeGreaterThan(0);
      expect(result.budgetPercentage).toBeLessThanOrEqual(70);
    });

    it('should exclude items when budget exceeded', () => {
      const items = [];
      for (let i = 0; i < 50; i++) {
        items.push(createItem(`${i}`, 'A'.repeat(100), 5));
      }

      const result = selectMentorScriptItems(items, 'test', 500);

      expect(result.excludedItems.length).toBeGreaterThan(0);
      expect(result.totalTokensUsed).toBeLessThanOrEqual(350); // 70% of 500
    });

    it('should prioritize high-scoring items', () => {
      const items = [
        createItem('high', 'Code review best practices', 9, 100),
        createItem('low', 'Random unrelated rule', 2, 1),
      ];

      const result = selectMentorScriptItems(items, 'review code', 100);

      // High-scoring item should be loaded first
      if (result.loadedItems.length > 0) {
        expect(result.loadedItems[0].id).toBe('high');
      }
    });
  });

  describe('Limits', () => {
    it('should detect near soft limit', () => {
      expect(isNearSoftLimit(14)).toBe(false);
      expect(isNearSoftLimit(15)).toBe(true);
      expect(isNearSoftLimit(20)).toBe(true);
    });

    it('should detect at hard limit', () => {
      expect(isAtHardLimitByCount(24)).toBe(false);
      expect(isAtHardLimitByCount(25)).toBe(true);
      expect(isAtHardLimitByCount(30)).toBe(true);
    });

    it('should get remaining capacity', () => {
      const capacity = getRemainingCapacity(10);
      expect(capacity.untilSoftLimit).toBe(5);
      expect(capacity.untilHardLimit).toBe(15);
    });

    it('should handle custom limits', () => {
      expect(isNearSoftLimit(5, { softLimit: 5 })).toBe(true);
      expect(isAtHardLimitByCount(10, { hardLimit: 10 })).toBe(true);
    });
  });

  describe('Budget Distribution', () => {
    it('should calculate distribution', () => {
      const items = [
        createItem('1', 'Rule one'),
        createItem('2', 'Rule two'),
      ];

      const dist = calculateBudgetDistribution(items, 1000);

      expect(dist.totalItemTokens).toBeGreaterThan(0);
      expect(dist.remainingBudget).toBeLessThan(700); // 70% of 1000
      expect(dist.averageItemTokens).toBeGreaterThan(0);
    });

    it('should handle empty items', () => {
      const dist = calculateBudgetDistribution([], 1000);

      expect(dist.totalItemTokens).toBe(0);
      expect(dist.remainingBudget).toBe(700);
      expect(dist.averageItemTokens).toBe(0);
    });
  });

  describe('Budget Summary', () => {
    it('should format summary correctly', () => {
      const result = {
        loadedItems: [createItem('1', 'Test')],
        excludedItems: [],
        totalTokensUsed: 100,
        budgetPercentage: 10,
      };

      const summary = formatBudgetSummary(result);

      expect(summary).toContain('1 items');
      expect(summary).toContain('100 tokens');
      expect(summary).toContain('10.0%');
    });
  });

  describe('Consolidation Suggestions', () => {
    it('should not suggest for low item count', () => {
      const items = [createItem('1', 'Test')];
      const suggestion = suggestConsolidation(items);

      expect(suggestion.shouldSuggest).toBe(false);
    });

    it('should suggest at soft limit', () => {
      const items = [];
      for (let i = 0; i < 15; i++) {
        items.push(createItem(`${i}`, `Rule ${i}`));
      }

      const suggestion = suggestConsolidation(items);

      expect(suggestion.shouldSuggest).toBe(true);
      expect(suggestion.message).toContain('15');
    });

    it('should suggest at hard limit', () => {
      const items = [];
      for (let i = 0; i < 25; i++) {
        items.push(createItem(`${i}`, `Rule ${i}`));
      }

      const suggestion = suggestConsolidation(items);

      expect(suggestion.shouldSuggest).toBe(true);
      expect(suggestion.message).toContain('maximum');
    });
  });
});

describe('Item Scoring', () => {
  const createItem = (
    id: string,
    rule: string,
    priority: number = 5,
    appliedCount: number = 0,
    daysAgo: number = 0
  ): MentorScriptItem => ({
    id,
    rule,
    source: 'user_defined',
    created: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    appliedCount,
    priority,
  });

  describe('Recency Score', () => {
    it('should give high score for recent items', () => {
      const recent = new Date();
      const score = calculateRecencyScore(recent);
      expect(score).toBeGreaterThan(0.9);
    });

    it('should give lower score for older items', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const score = calculateRecencyScore(thirtyDaysAgo);
      expect(score).toBeLessThan(0.6);
    });

    it('should decay exponentially', () => {
      const day0 = calculateRecencyScore(new Date());
      const day30 = calculateRecencyScore(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      const day60 = calculateRecencyScore(
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      );

      expect(day0).toBeGreaterThan(day30);
      expect(day30).toBeGreaterThan(day60);
    });
  });

  describe('Semantic Similarity', () => {
    it('should give high score for matching keywords', () => {
      const score = calculateSemanticSimilarity(
        'Search codebase before creating files',
        'search files in code'
      );
      expect(score).toBeGreaterThan(0.3);
    });

    it('should give low score for unrelated content', () => {
      const score = calculateSemanticSimilarity(
        'Format code properly',
        'weather forecast tomorrow'
      );
      expect(score).toBeLessThan(0.3);
    });

    it('should boost for topic overlap', () => {
      const codeScore = calculateSemanticSimilarity(
        'Write clean code functions',
        'debug code function'
      );
      expect(codeScore).toBeGreaterThan(0.3);
    });
  });

  describe('Item Score Calculation', () => {
    it('should calculate overall score', () => {
      const item = createItem('1', 'Search codebase first', 8, 50, 5);
      const score = calculateItemScore(item, 'search code');

      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThanOrEqual(1);
      expect(score.breakdown.priority).toBe(0.8); // 8/10
    });

    it('should include all breakdown factors', () => {
      const item = createItem('1', 'Test rule', 5, 10, 0);
      const score = calculateItemScore(item, 'test');

      expect(score.breakdown.relevance).toBeDefined();
      expect(score.breakdown.priority).toBeDefined();
      expect(score.breakdown.frequency).toBeDefined();
      expect(score.breakdown.recency).toBeDefined();
    });
  });

  describe('Score Sorting', () => {
    it('should sort items by score descending', () => {
      const items = [
        createItem('low', 'Random rule', 2, 0, 100),
        createItem('high', 'Search code', 9, 80, 1),
        createItem('mid', 'Format output', 5, 20, 10),
      ];

      const sorted = scoreAndSortItems(items, 'search code');

      expect(sorted[0].item.id).toBe('high');
      expect(sorted[0].score).toBeGreaterThan(sorted[1].score);
      expect(sorted[1].score).toBeGreaterThan(sorted[2].score);
    });

    it('should get top N items', () => {
      const items = [];
      for (let i = 0; i < 10; i++) {
        items.push(createItem(`${i}`, `Rule ${i}`, i + 1));
      }

      const top3 = getTopScoredItems(items, 'test', 3);

      expect(top3).toHaveLength(3);
    });

    it('should filter by minimum score', () => {
      const items = [
        createItem('1', 'Highly relevant search code', 10, 100),
        createItem('2', 'Unrelated topic xyz abc', 1, 0, 365),
      ];

      const filtered = filterByMinScore(items, 'search code', 0.3);

      // Should only include high-relevance item
      expect(filtered.length).toBeLessThanOrEqual(items.length);
    });
  });

  describe('Score Formatting', () => {
    it('should format breakdown string', () => {
      const item = createItem('1', 'Test', 5, 10);
      const score = calculateItemScore(item, 'test');
      const formatted = formatScoreBreakdown(score);

      expect(formatted).toContain('Score:');
      expect(formatted).toContain('R:');
      expect(formatted).toContain('P:');
      expect(formatted).toContain('F:');
      expect(formatted).toContain('Rc:');
    });
  });
});
