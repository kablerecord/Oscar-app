/**
 * Throttle Wrapper for oscar-app
 *
 * Wraps the @osqr/core Throttle Architecture for use in oscar-app.
 * Manages query budgets, model selection, and graceful degradation.
 *
 * Core Principle: Throttling is collaboration, not punishment.
 * Graceful degradation instead of hard cutoffs.
 */

import { Throttle } from '@osqr/core';
import { featureFlags, initializeBudgetPersistence } from './config';

// Initialize persistence adapter on first import
// This ensures budget data is stored in the database
initializeBudgetPersistence();

// Type definitions (matching @osqr/core Throttle types)
export type Tier = 'lite' | 'pro' | 'master' | 'enterprise';
export type BudgetState = 'healthy' | 'low' | 'depleted' | 'overage';
export type UserTier = 'starter' | 'pro' | 'master' | 'enterprise';

// Map UserTier to Tier for @osqr/core compatibility
function mapUserTierToTier(userTier: UserTier): Tier {
  return userTier === 'starter' ? 'lite' : userTier;
}

export interface TierConfig {
  queriesPerDay: number;
  storageGb: number;
  features: {
    contemplateMode: boolean;
    councilMode: boolean;
    voiceMode: boolean;
    customPersona: boolean;
    prioritySupport: boolean;
  };
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  temperature: number;
}

export interface OveragePackage {
  id: string;
  name: string;
  queries: number;
  price: number;
}

export interface ThrottleStatus {
  tier: UserTier;
  canQuery: boolean;
  queriesRemaining: number;
  queriesTotal: number;
  budgetState: 'healthy' | 'warning' | 'depleted' | 'overage';
  statusMessage: string;
  degraded: boolean;
  upgradeAvailable: boolean;
}

export interface QueryResult {
  allowed: boolean;
  model: {
    id: string;
    name: string;
    provider: string;
    maxTokens: number;
  } | null;
  message: string;
  degraded: boolean;
  budgetState: string;
}

export interface FeatureAccess {
  contemplateMode: boolean;
  councilMode: boolean;
  voiceMode: boolean;
  customPersona: boolean;
  prioritySupport: boolean;
}

/**
 * Check if a user can make a query.
 */
export function canQuery(userId: string, tier: UserTier): boolean {
  if (!featureFlags.enableThrottle) {
    return true; // Bypass when disabled
  }

  try {
    return Throttle.canQuery(userId, mapUserTierToTier(tier));
  } catch (error) {
    console.error('[Throttle] canQuery error:', error);
    return true; // Fail open
  }
}

/**
 * Get complete throttle status for a user.
 */
export function getThrottleStatus(userId: string, tier: UserTier): ThrottleStatus {
  if (!featureFlags.enableThrottle) {
    return {
      tier,
      canQuery: true,
      queriesRemaining: Infinity,
      queriesTotal: Infinity,
      budgetState: 'healthy',
      statusMessage: 'Throttle disabled',
      degraded: false,
      upgradeAvailable: tier !== 'enterprise',
    };
  }

  try {
    const status = Throttle.getThrottleStatus(userId, mapUserTierToTier(tier));

    // Map osqr-core budget state to our UI states
    // osqr-core uses: 'healthy' | 'warning' | 'critical' | 'exhausted'
    // We map to: 'healthy' | 'warning' | 'depleted' | 'overage'
    let budgetState: ThrottleStatus['budgetState'] = 'healthy';
    if (status.budgetState === 'exhausted') {
      budgetState = 'depleted';
    } else if (status.budgetState === 'critical' || status.budgetState === 'warning') {
      budgetState = 'warning';
    }
    // Note: 'overage' is for oscar-app specific tracking (purchases beyond tier)
    // osqr-core doesn't have this state, it's handled at the app level

    const isDegraded = status.budgetState === 'warning' ||
                       status.budgetState === 'critical' ||
                       status.budgetState === 'exhausted';

    return {
      tier,
      canQuery: status.canMakeQuery,
      queriesRemaining: Throttle.getQueriesRemaining(userId, mapUserTierToTier(tier)),
      queriesTotal: status.tierConfig.queriesPerDay,
      budgetState,
      statusMessage: status.statusMessage,
      degraded: isDegraded,
      upgradeAvailable: Throttle.getUpgradePath(mapUserTierToTier(tier)) !== null,
    };
  } catch (error) {
    console.error('[Throttle] getThrottleStatus error:', error);
    return {
      tier,
      canQuery: true,
      queriesRemaining: 0,
      queriesTotal: 0,
      budgetState: 'healthy',
      statusMessage: 'Status unavailable',
      degraded: false,
      upgradeAvailable: tier !== 'enterprise',
    };
  }
}

/**
 * Process a query request through the throttle.
 * Returns the model to use and records the query.
 */
export async function processQuery(
  userId: string,
  tier: UserTier,
  request: {
    query: string;
    estimatedTokens?: number;
    requiresReasoning?: boolean;
    isCodeGeneration?: boolean;
  }
): Promise<QueryResult> {
  if (!featureFlags.enableThrottle) {
    return {
      allowed: true,
      model: {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        maxTokens: 4000,
      },
      message: 'Throttle disabled',
      degraded: false,
      budgetState: 'healthy',
    };
  }

  try {
    const result = await Throttle.processQueryRequest(userId, mapUserTierToTier(tier), request);

    return {
      allowed: result.allowed,
      model: result.model
        ? {
            // ModelConfig has: id, model, tier, maxTokens, temperature
            id: result.model.id,
            name: result.model.model, // 'model' field contains the model name
            provider: 'anthropic', // Default to anthropic for Claude models
            maxTokens: result.model.maxTokens,
          }
        : null,
      message: result.message,
      degraded: result.degraded,
      budgetState: result.allowed ? 'healthy' : 'depleted',
    };
  } catch (error) {
    console.error('[Throttle] processQuery error:', error);
    // Fail open with default model
    return {
      allowed: true,
      model: {
        id: 'claude-sonnet-4-20250514',
        name: 'claude-sonnet',
        provider: 'anthropic',
        maxTokens: 4000,
      },
      message: 'Throttle error, using default',
      degraded: false,
      budgetState: 'healthy',
    };
  }
}

/**
 * Record a query (for manual tracking if not using processQuery).
 */
export function recordQuery(userId: string, tier: UserTier, modelId: string): void {
  if (!featureFlags.enableThrottle) return;

  try {
    Throttle.recordQuery(userId, mapUserTierToTier(tier), modelId);
  } catch (error) {
    console.error('[Throttle] recordQuery error:', error);
  }
}

/**
 * Check feature access for a tier.
 */
export function getFeatureAccess(tier: UserTier): FeatureAccess {
  if (!featureFlags.enableThrottle) {
    // All features enabled when throttle is disabled
    return {
      contemplateMode: true,
      councilMode: true,
      voiceMode: true,
      customPersona: true,
      prioritySupport: true,
    };
  }

  const mappedTier = mapUserTierToTier(tier);
  return {
    contemplateMode: Throttle.hasFeatureAccess(mappedTier, 'contemplateMode'),
    councilMode: Throttle.hasFeatureAccess(mappedTier, 'councilMode'),
    voiceMode: Throttle.hasFeatureAccess(mappedTier, 'voiceMode'),
    customPersona: Throttle.hasFeatureAccess(mappedTier, 'customPersona'),
    prioritySupport: Throttle.hasFeatureAccess(mappedTier, 'prioritySupport'),
  };
}

/**
 * Check if a specific feature is available.
 */
export function hasFeature(
  tier: UserTier,
  feature: 'contemplateMode' | 'councilMode' | 'voiceMode' | 'customPersona' | 'prioritySupport'
): boolean {
  if (!featureFlags.enableThrottle) {
    return true;
  }

  return Throttle.hasFeatureAccess(mapUserTierToTier(tier), feature);
}

/**
 * Get graceful degradation message when budget is low or depleted.
 */
export function getDegradationMessage(userId: string, tier: UserTier): string {
  if (!featureFlags.enableThrottle) {
    return '';
  }

  try {
    return Throttle.getGracefulDegradationMessage(userId, mapUserTierToTier(tier));
  } catch (error) {
    console.error('[Throttle] getDegradationMessage error:', error);
    return '';
  }
}

/**
 * Get upgrade prompt for user's current tier.
 */
export function getUpgradePrompt(tier: UserTier): string | null {
  if (!featureFlags.enableThrottle) {
    return null;
  }

  try {
    return Throttle.getUpgradePrompt(mapUserTierToTier(tier));
  } catch (error) {
    console.error('[Throttle] getUpgradePrompt error:', error);
    return null;
  }
}

/**
 * Get available overage packages.
 */
export function getOveragePackages(): Throttle.OveragePackage[] {
  if (!featureFlags.enableThrottle) {
    return [];
  }

  try {
    return Throttle.getOveragePackages();
  } catch (error) {
    console.error('[Throttle] getOveragePackages error:', error);
    return [];
  }
}

/**
 * Purchase an overage package.
 */
export function purchaseOverage(
  userId: string,
  tier: UserTier,
  packageId: string
): { success: boolean; queriesAdded: number; error?: string } {
  if (!featureFlags.enableThrottle) {
    return { success: false, queriesAdded: 0, error: 'Throttle disabled' };
  }

  try {
    const purchase = Throttle.purchaseOverage(userId, mapUserTierToTier(tier), packageId);
    if (!purchase) {
      return { success: false, queriesAdded: 0, error: 'Invalid package' };
    }
    return {
      success: true,
      queriesAdded: purchase.queriesRemaining,
    };
  } catch (error) {
    console.error('[Throttle] purchaseOverage error:', error);
    return {
      success: false,
      queriesAdded: 0,
      error: error instanceof Error ? error.message : 'Purchase failed',
    };
  }
}

/**
 * Get tier upgrade path.
 */
export function getUpgradePath(tier: UserTier): UserTier | null {
  const result = Throttle.getUpgradePath(mapUserTierToTier(tier));
  // Map 'lite' back to 'starter' if returned
  if (result === 'lite') return 'starter';
  return result as UserTier | null;
}

/**
 * Get budget status message for display.
 */
export function getBudgetStatusMessage(userId: string, tier: UserTier): string {
  if (!featureFlags.enableThrottle) {
    return 'Unlimited queries available';
  }

  try {
    // Use the string message function, not the object function
    return Throttle.getBudgetStatusMessage(userId, mapUserTierToTier(tier));
  } catch (error) {
    console.error('[Throttle] getBudgetStatus error:', error);
    return 'Budget status unavailable';
  }
}

/**
 * Get query count message (e.g., "5 of 100 queries used today").
 */
export function getQueryCountMessage(userId: string, tier: UserTier): string {
  if (!featureFlags.enableThrottle) {
    return 'Unlimited queries';
  }

  try {
    return Throttle.getQueryCountMessage(userId, mapUserTierToTier(tier));
  } catch (error) {
    console.error('[Throttle] getQueryCountMessage error:', error);
    return 'Query count unavailable';
  }
}

/**
 * Add referral bonus queries.
 */
export function addReferralBonus(userId: string, tier: UserTier, bonusQueries: number): void {
  if (!featureFlags.enableThrottle) return;

  try {
    Throttle.addReferralBonus(userId, mapUserTierToTier(tier), bonusQueries);
  } catch (error) {
    console.error('[Throttle] addReferralBonus error:', error);
  }
}

/**
 * Get remaining referral bonus queries.
 */
export function getReferralBonusRemaining(userId: string, tier: UserTier): number {
  if (!featureFlags.enableThrottle) {
    return 0;
  }

  try {
    return Throttle.getReferralBonusRemaining(userId, mapUserTierToTier(tier));
  } catch (error) {
    console.error('[Throttle] getReferralBonusRemaining error:', error);
    return 0;
  }
}
