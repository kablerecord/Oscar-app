/**
 * OSQR Throttle - Query Budget & Model Routing
 *
 * Manages daily query budgets, model selection, and graceful degradation
 * across all tier levels. Treats throttling as collaboration, not punishment.
 *
 * Usage:
 *   import { Throttle } from '@osqr/core';
 *
 *   // Check if user can make a query
 *   const budget = Throttle.getUserBudget(userId, tier);
 *   const status = Throttle.canQuery(userId, tier);
 *
 *   // Route to appropriate model based on budget
 *   const model = Throttle.selectModel(userId, tier, taskComplexity);
 *
 *   // Record query usage
 *   Throttle.recordQuery(userId, tier, model);
 */

// ============================================================================
// Types
// ============================================================================

export {
  Tier,
  TierConfig,
  TIER_CONFIGS,
  ACTIVE_TIERS,
  DailyBudget,
  BudgetState,
  RequestClassification,
  ModelTier,
  ModelConfig,
  MODEL_CONFIGS,
  OveragePackage,
  OveragePurchase,
  PluginTrial,
  OVERAGE_PACKAGES,
} from './types';

// ============================================================================
// Persistence Adapter
// ============================================================================

export {
  BudgetPersistenceAdapter,
  setPersistenceAdapter,
  getPersistenceAdapter,
  hasPersistenceAdapter,
  clearPersistenceAdapter,
} from './persistence';

// ============================================================================
// Budget Tracking
// ============================================================================

export {
  getUserBudget,
  canQuery,
  canQueryAsync,
  recordQuery,
  recordQueryAsync,
  getBudgetState,
  getBudgetStatus,
  getBudgetStatusSync,
  getBudgetStatusAsync,
  getQueriesRemaining,
  addOverageQueries,
  addOverageQueriesAsync,
  addReferralBonus,
  getReferralBonusRemaining,
  resetDailyBudget,
  clearBudgetStore,
  getDailyBudget,
  getDailyBudgetAsync,
  saveBudget,
  setUserTimezone,
  setUserTimezoneSync,
  getUserTimezone,
  getUserTimezoneAsync,
  getDateInTimezone,
  getNextMidnight,
} from './budget-tracker';

// ============================================================================
// Model Routing
// ============================================================================

export {
  selectModel,
  getModelForTier,
  getBudgetBasedModelTier,
  classifyRequest,
  shouldDegradeGracefully,
  getModelConfig,
  routeRequest,
} from './model-router';

// ============================================================================
// User Messaging
// ============================================================================

export {
  getBudgetStatusMessage,
  getGracefulDegradationMessage,
  getUpgradePrompt,
  getOveragePrompt,
  getReferralPrompt,
  getFeatureLockMessage,
  getWelcomeMessage,
  getQueryCountMessage,
} from './messaging';

// ============================================================================
// Overage & Trials
// ============================================================================

export {
  getOveragePackages,
  getPackage,
  purchaseOverage,
  getUserOverages,
  getMonthlyOverageCount,
  startPluginTrial,
  getPluginTrial,
  canStartPluginTrial,
  endPluginTrial,
  getUserTrials,
  expireOldTrials,
  processReferralBonus,
  clearOverageStores,
} from './overage';

// ============================================================================
// Convenience Functions
// ============================================================================

import { Tier, TierConfig, TIER_CONFIGS, ModelConfig } from './types';
import { getUserBudget, getBudgetState, getBudgetStatus, canQuery, recordQuery } from './budget-tracker';
import { selectModel, routeRequest } from './model-router';
import { getBudgetStatusMessage, getGracefulDegradationMessage } from './messaging';

/**
 * Get complete throttle status for a user
 */
export function getThrottleStatus(userId: string, tier: Tier): {
  tier: Tier;
  tierConfig: TierConfig;
  budget: ReturnType<typeof getUserBudget>;
  budgetState: 'healthy' | 'warning' | 'critical' | 'exhausted';
  canMakeQuery: boolean;
  statusMessage: string;
} {
  const budget = getUserBudget(userId, tier);
  const budgetState = getBudgetState(userId, tier);
  const canMakeQuery = canQuery(userId, tier);
  const statusMessage = getBudgetStatusMessage(userId, tier);

  return {
    tier,
    tierConfig: TIER_CONFIGS[tier],
    budget,
    budgetState,
    canMakeQuery,
    statusMessage,
  };
}

/**
 * Process a query request end-to-end
 */
export async function processQueryRequest(
  userId: string,
  tier: Tier,
  request: {
    query: string;
    estimatedTokens?: number;
    requiresReasoning?: boolean;
    isCodeGeneration?: boolean;
  }
): Promise<{
  allowed: boolean;
  model: ModelConfig | null;
  message: string;
  degraded: boolean;
}> {
  // Check if query is allowed
  if (!canQuery(userId, tier)) {
    return {
      allowed: false,
      model: null,
      message: getGracefulDegradationMessage(userId, tier),
      degraded: true,
    };
  }

  // Route the request
  const routing = routeRequest(userId, tier, {
    estimatedTokens: request.estimatedTokens || 500,
    requiresReasoning: request.requiresReasoning || false,
    isCodeGeneration: request.isCodeGeneration || false,
  });

  // Record the query
  recordQuery(userId, tier, routing.model.id);

  return {
    allowed: true,
    model: routing.model,
    message: routing.degraded
      ? getGracefulDegradationMessage(userId, tier)
      : getBudgetStatusMessage(userId, tier),
    degraded: routing.degraded,
  };
}

/**
 * Check feature access for a tier
 */
export function hasFeatureAccess(
  tier: Tier,
  feature: 'contemplateMode' | 'councilMode' | 'voiceMode' | 'priorityProcessing' | 'weeklyReviews' | 'vscodeExtension' | 'apiAccess'
): boolean {
  const config = TIER_CONFIGS[tier];

  switch (feature) {
    case 'contemplateMode':
      return config.contemplateMode;
    case 'councilMode':
      return config.councilMode;
    case 'voiceMode':
      return config.voiceMode;
    case 'priorityProcessing':
      return config.priorityProcessing;
    case 'weeklyReviews':
      return config.weeklyReviews;
    case 'vscodeExtension':
      return config.vscodeExtension;
    case 'apiAccess':
      return config.apiAccess;
    default:
      return false;
  }
}

/**
 * Get tier upgrade path
 */
export function getUpgradePath(currentTier: Tier): Tier | null {
  const path: Record<Tier, Tier | null> = {
    lite: 'pro',
    pro: 'master',
    master: 'elite',
    elite: 'enterprise',
    enterprise: null,
  };

  return path[currentTier];
}

/**
 * Get tier downgrade path (for subscription changes)
 */
export function getDowngradePath(currentTier: Tier): Tier | null {
  const path: Record<Tier, Tier | null> = {
    lite: null,
    pro: 'lite',
    master: 'pro',
    elite: 'master',
    enterprise: 'elite',
  };

  return path[currentTier];
}
