/**
 * Tests for Throttle Architecture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Types
  Tier,
  TIER_CONFIGS,
  OVERAGE_PACKAGES,
  // Budget Tracking
  getUserBudget,
  canQuery,
  recordQuery,
  getBudgetState,
  getQueriesRemaining,
  addOverageQueries,
  resetDailyBudget,
  clearBudgetStore,
  // Model Routing
  selectModel,
  getModelForTier,
  getBudgetBasedModelTier,
  classifyRequest,
  shouldDegradeGracefully,
  routeRequest,
  // Messaging
  getBudgetStatusMessage,
  getGracefulDegradationMessage,
  getUpgradePrompt,
  getFeatureLockMessage,
  getWelcomeMessage,
  getQueryCountMessage,
  // Overage
  getOveragePackages,
  purchaseOverage,
  getUserOverages,
  startPluginTrial,
  getPluginTrial,
  canStartPluginTrial,
  endPluginTrial,
  clearOverageStores,
  // Convenience
  getThrottleStatus,
  processQueryRequest,
  hasFeatureAccess,
  getUpgradePath,
} from '../index';

describe('Throttle Architecture', () => {
  beforeEach(() => {
    clearBudgetStore();
    clearOverageStores();
  });

  describe('Tier Configurations', () => {
    it('defines correct query limits per tier', () => {
      expect(TIER_CONFIGS.lite.queriesPerDay).toBe(10);
      expect(TIER_CONFIGS.pro.queriesPerDay).toBe(100);
      expect(TIER_CONFIGS.master.queriesPerDay).toBe(Infinity);
      expect(TIER_CONFIGS.enterprise.queriesPerDay).toBe(Infinity);
    });

    it('defines correct feature access per tier', () => {
      expect(TIER_CONFIGS.lite.contemplateMode).toBe(false);
      expect(TIER_CONFIGS.pro.contemplateMode).toBe(true);
      expect(TIER_CONFIGS.lite.councilMode).toBe(false);
      expect(TIER_CONFIGS.master.councilMode).toBe(true);
    });
  });

  describe('Budget Tracking', () => {
    it('initializes budget for new user', () => {
      const budget = getUserBudget('user-1', 'lite');

      expect(budget.queriesUsed).toBe(0);
      expect(budget.queriesLimit).toBe(10);
      expect(budget.overageQueries).toBe(0);
    });

    it('allows query when under budget', () => {
      const canMake = canQuery('user-1', 'pro');
      expect(canMake).toBe(true);
    });

    it('records query usage', () => {
      recordQuery('user-1', 'lite', 'gpt-4');
      recordQuery('user-1', 'lite', 'gpt-4');

      const budget = getUserBudget('user-1', 'lite');
      expect(budget.queriesUsed).toBe(2);
    });

    it('tracks budget state transitions', () => {
      // Start fresh
      expect(getBudgetState('user-1', 'lite')).toBe('healthy');

      // Use 8 queries (80%)
      for (let i = 0; i < 8; i++) {
        recordQuery('user-1', 'lite', 'gpt-4');
      }
      expect(getBudgetState('user-1', 'lite')).toBe('warning');

      // Use 2 more (100%)
      recordQuery('user-1', 'lite', 'gpt-4');
      recordQuery('user-1', 'lite', 'gpt-4');
      expect(getBudgetState('user-1', 'lite')).toBe('exhausted');
    });

    it('allows overage queries after exhaustion', () => {
      // Exhaust budget
      for (let i = 0; i < 10; i++) {
        recordQuery('user-1', 'lite', 'gpt-4');
      }

      // Note: canQuery still returns true because economy queries are available
      // This is graceful degradation - we don't hard block users
      expect(canQuery('user-1', 'lite')).toBe(true);

      // Budget state should be exhausted though
      expect(getBudgetState('user-1', 'lite')).toBe('exhausted');

      // Add overage
      addOverageQueries('user-1', 'lite', 5);

      // Still can query
      expect(canQuery('user-1', 'lite')).toBe(true);

      const budget = getUserBudget('user-1', 'lite');
      expect(budget.overageQueries).toBe(5);
    });

    it('calculates remaining queries correctly', () => {
      recordQuery('user-1', 'lite', 'gpt-4');
      recordQuery('user-1', 'lite', 'gpt-4');
      recordQuery('user-1', 'lite', 'gpt-4');

      const remaining = getQueriesRemaining('user-1', 'lite');
      expect(remaining).toBe(7);
    });

    it('resets budget daily', () => {
      recordQuery('user-1', 'lite', 'gpt-4');
      recordQuery('user-1', 'lite', 'gpt-4');

      resetDailyBudget('user-1', 'lite');

      const budget = getUserBudget('user-1', 'lite');
      expect(budget.queriesUsed).toBe(0);
    });

    it('handles unlimited tiers correctly', () => {
      for (let i = 0; i < 1000; i++) {
        recordQuery('user-1', 'master', 'gpt-4');
      }

      expect(canQuery('user-1', 'master')).toBe(true);
      expect(getBudgetState('user-1', 'master')).toBe('healthy');
    });
  });

  describe('Model Routing', () => {
    it('selects premium model when budget healthy', () => {
      const model = selectModel('user-1', 'pro', 'medium');

      expect(model.tier).toBe('premium');
    });

    it('degrades model selection when budget low', () => {
      // Use 95% of budget
      for (let i = 0; i < 95; i++) {
        recordQuery('user-1', 'pro', 'gpt-4');
      }

      const model = selectModel('user-1', 'pro', 'medium');

      // Should select economy model to extend budget
      expect(model.tier).toBe('economy');
    });

    it('uses economy model when budget exhausted (graceful degradation)', () => {
      // Exhaust budget
      for (let i = 0; i < 100; i++) {
        recordQuery('user-1', 'pro', 'gpt-4');
      }

      // Add overage
      addOverageQueries('user-1', 'pro', 5);

      const model = selectModel('user-1', 'pro', 'medium');

      // With graceful degradation, we use economy model instead of emergency
      // This provides better user experience while conserving resources
      expect(model.tier).toBe('economy');
    });

    it('classifies request complexity', () => {
      // classifyRequest takes (content: string, context: object)
      const simple = classifyRequest('What is 2+2?', {
        hasDocuments: false,
        isContemplate: false,
        isCouncil: false,
      });
      expect(simple.complexity).toBe('low');
      expect(simple.requiresPremium).toBe(false);

      const complex = classifyRequest('Analyze all my documents for patterns', {
        hasDocuments: true,
        isContemplate: true,
        isCouncil: false,
      });
      // Contemplate mode = high complexity
      expect(complex.complexity).toBe('high');
      expect(complex.type).toBe('contemplate_query');
    });

    it('routes request with full context', () => {
      const result = routeRequest('user-1', 'pro', {
        estimatedTokens: 500,
        requiresReasoning: false,
        isCodeGeneration: false,
      });

      expect(result.model).toBeDefined();
      expect(result.degraded).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('indicates degradation when necessary', () => {
      // Use 95% of budget
      for (let i = 0; i < 95; i++) {
        recordQuery('user-1', 'pro', 'gpt-4');
      }

      const result = routeRequest('user-1', 'pro', {
        estimatedTokens: 500,
        requiresReasoning: true,
        isCodeGeneration: false,
      });

      expect(result.degraded).toBe(true);
    });
  });

  describe('User Messaging', () => {
    it('generates friendly budget status', () => {
      recordQuery('user-1', 'lite', 'gpt-4');
      recordQuery('user-1', 'lite', 'gpt-4');

      const status = getBudgetStatusMessage('user-1', 'lite');

      expect(status).toContain('8');
      expect(status).not.toContain('limit');
      expect(status).not.toContain('restrict');
    });

    it('provides graceful degradation message', () => {
      // Use most of budget
      for (let i = 0; i < 9; i++) {
        recordQuery('user-1', 'lite', 'gpt-4');
      }

      const message = getGracefulDegradationMessage('user-1', 'lite');

      // Should be collaborative, not punishing
      expect(message.toLowerCase()).not.toContain('limit');
      expect(message.toLowerCase()).not.toContain('restrict');
    });

    it('generates upgrade prompt without pressure', () => {
      const prompt = getUpgradePrompt('lite');

      expect(prompt).toContain('Pro');
      expect(prompt.toLowerCase()).not.toContain('must');
      expect(prompt.toLowerCase()).not.toContain('need to');
    });

    it('explains feature locks helpfully', () => {
      const message = getFeatureLockMessage('councilMode', 'lite');

      expect(message).toContain('Council');
      expect(message).toContain('Master');
    });

    it('generates welcome message for tier', () => {
      const message = getWelcomeMessage('pro');

      expect(message).toContain('100');
      expect(message).toContain('Contemplate');
    });

    it('generates query count message', () => {
      recordQuery('user-1', 'lite', 'gpt-4');
      recordQuery('user-1', 'lite', 'gpt-4');
      recordQuery('user-1', 'lite', 'gpt-4');

      const message = getQueryCountMessage('user-1', 'lite');

      expect(message).toContain('3');
      expect(message).toContain('10');
    });
  });

  describe('Overage Purchases', () => {
    it('lists available packages', () => {
      const packages = getOveragePackages();

      expect(packages.length).toBeGreaterThan(0);
      expect(packages[0].id).toBeDefined();
      expect(packages[0].price).toBeDefined();
      expect(packages[0].queries).toBeDefined();
    });

    it('processes overage purchase', () => {
      const purchase = purchaseOverage('user-1', 'lite', 'boost_5');

      expect(purchase).not.toBeNull();
      expect(purchase?.queriesRemaining).toBe(5);
    });

    it('adds queries after purchase', () => {
      // Exhaust budget
      for (let i = 0; i < 10; i++) {
        recordQuery('user-1', 'lite', 'gpt-4');
      }

      // canQuery is true because of graceful degradation (economy queries available)
      expect(canQuery('user-1', 'lite')).toBe(true);
      // But budget state is exhausted
      expect(getBudgetState('user-1', 'lite')).toBe('exhausted');

      purchaseOverage('user-1', 'lite', 'boost_5');

      // After purchase, budget state should improve
      expect(canQuery('user-1', 'lite')).toBe(true);
      // Overage was added
      const budget = getUserBudget('user-1', 'lite');
      expect(budget.overageQueries).toBe(5);
    });

    it('tracks purchase history', () => {
      purchaseOverage('user-1', 'lite', 'boost_5');
      purchaseOverage('user-1', 'lite', 'boost_25');

      const history = getUserOverages('user-1');

      expect(history.length).toBe(2);
    });
  });

  describe('Plugin Trials', () => {
    it('starts a plugin trial', () => {
      const trial = startPluginTrial('user-1', 'plugin-advanced-math', 7);

      expect(trial).not.toBeNull();
      expect(trial?.isActive).toBe(true);
      expect(trial?.pluginId).toBe('plugin-advanced-math');
    });

    it('retrieves active trial', () => {
      startPluginTrial('user-1', 'plugin-test', 7);

      const trial = getPluginTrial('user-1', 'plugin-test');

      expect(trial).not.toBeNull();
      expect(trial?.isActive).toBe(true);
    });

    it('prevents duplicate trials for same plugin', () => {
      startPluginTrial('user-1', 'plugin-test', 7);
      const duplicate = startPluginTrial('user-1', 'plugin-test', 7);

      expect(duplicate).toBeNull();
    });

    it('prevents multiple concurrent trials', () => {
      startPluginTrial('user-1', 'plugin-a', 7);
      const second = startPluginTrial('user-1', 'plugin-b', 7);

      expect(second).toBeNull();
    });

    it('checks trial eligibility', () => {
      const eligible = canStartPluginTrial('user-1', 'plugin-test');
      expect(eligible.canStart).toBe(true);

      startPluginTrial('user-1', 'plugin-test', 7);

      const afterTrial = canStartPluginTrial('user-1', 'plugin-test');
      expect(afterTrial.canStart).toBe(false);
      expect(afterTrial.reason).toContain('already');
    });

    it('ends trial manually', () => {
      startPluginTrial('user-1', 'plugin-test', 7);

      const ended = endPluginTrial('user-1', 'plugin-test');

      expect(ended).toBe(true);

      const trial = getPluginTrial('user-1', 'plugin-test');
      expect(trial).toBeNull();
    });
  });

  describe('Convenience Functions', () => {
    it('gets complete throttle status', () => {
      recordQuery('user-1', 'pro', 'gpt-4');
      recordQuery('user-1', 'pro', 'gpt-4');

      const status = getThrottleStatus('user-1', 'pro');

      expect(status.tier).toBe('pro');
      expect(status.budget.queriesUsed).toBe(2);
      expect(status.canMakeQuery).toBe(true);
      expect(status.statusMessage).toBeDefined();
    });

    it('processes query request end-to-end', async () => {
      const result = await processQueryRequest('user-1', 'pro', {
        query: 'Test query',
        estimatedTokens: 500,
      });

      expect(result.allowed).toBe(true);
      expect(result.model).not.toBeNull();
      expect(result.degraded).toBe(false);
    });

    it('degrades gracefully when budget exhausted', async () => {
      // Exhaust budget
      for (let i = 0; i < 100; i++) {
        recordQuery('user-1', 'pro', 'gpt-4');
      }

      const result = await processQueryRequest('user-1', 'pro', {
        query: 'Test query',
      });

      // With graceful degradation, query is still allowed but uses economy model
      expect(result.allowed).toBe(true);
      expect(result.degraded).toBe(true);
    });

    it('checks feature access correctly', () => {
      expect(hasFeatureAccess('lite', 'contemplateMode')).toBe(false);
      expect(hasFeatureAccess('pro', 'contemplateMode')).toBe(true);
      expect(hasFeatureAccess('pro', 'councilMode')).toBe(false);
      expect(hasFeatureAccess('master', 'councilMode')).toBe(true);
    });

    it('returns correct upgrade path', () => {
      expect(getUpgradePath('lite')).toBe('pro');
      expect(getUpgradePath('pro')).toBe('master');
      expect(getUpgradePath('master')).toBe('enterprise');
      expect(getUpgradePath('enterprise')).toBeNull();
    });
  });

  describe('Constitutional Compliance', () => {
    it('never uses punishing language', () => {
      const punitiveTerms = [
        'limit',
        'restrict',
        'deny',
        'block',
        'prevent',
        'forbid',
        'expire',
        'run out',
        'used up',
      ];

      // Check various messages
      const messages = [
        getBudgetStatusMessage('user-1', 'lite'),
        getGracefulDegradationMessage('user-1', 'lite'),
        getUpgradePrompt('lite'),
        getWelcomeMessage('lite'),
      ];

      for (const message of messages) {
        for (const term of punitiveTerms) {
          expect(message.toLowerCase()).not.toContain(term);
        }
      }
    });

    it('frames constraints as collaboration', () => {
      // Use most of budget
      for (let i = 0; i < 9; i++) {
        recordQuery('user-1', 'lite', 'gpt-4');
      }

      const message = getGracefulDegradationMessage('user-1', 'lite');

      // Should contain collaborative language
      const collaborativeTerms = ['together', 'conserve', 'extend', 'efficient', 'smart'];
      const hasCollaborative = collaborativeTerms.some((term) =>
        message.toLowerCase().includes(term)
      );

      expect(hasCollaborative).toBe(true);
    });

    it('always provides a path forward', () => {
      // Exhaust budget completely
      for (let i = 0; i < 10; i++) {
        recordQuery('user-1', 'lite', 'gpt-4');
      }

      const message = getGracefulDegradationMessage('user-1', 'lite');

      // Should mention options
      expect(message).toMatch(/upgrade|tomorrow|overage/i);
    });
  });
});
