/**
 * Throttle Wrapper - Real Implementation
 *
 * Wraps @osqr/core Throttle module for oscar-app integration.
 * Manages daily query budgets with Prisma persistence.
 */

import { featureFlags, throttleConfig } from './config';
import { getPrismaBudgetAdapter } from '@/lib/adapters/prisma-budget-adapter';
import { Throttle, setPersistenceAdapter, hasPersistenceAdapter, type Tier } from '@osqr/core';

// ============================================================================
// Type Exports (for compatibility with existing code)
// ============================================================================

export type { Tier };
export type BudgetState = 'healthy' | 'low' | 'depleted' | 'overage';
export type UserTier = 'starter' | 'pro' | 'master' | 'enterprise';

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

// ============================================================================
// Tier Mapping (oscar-app uses 'starter' instead of 'lite')
// ============================================================================

function mapUserTierToCoreTier(userTier: UserTier): Tier {
  // Map 'starter' to 'lite' for @osqr/core compatibility
  if (userTier === 'starter') return 'lite';
  return userTier as Tier;
}

function mapCoreTierToUserTier(tier: Tier): UserTier {
  // Map 'lite' back to 'starter' for oscar-app
  if (tier === 'lite') return 'starter';
  return tier as UserTier;
}

// ============================================================================
// Initialization
// ============================================================================

let initialized = false;

/**
 * Initialize the throttle system with Prisma persistence.
 * Called automatically on first use.
 */
function ensureInitialized(): void {
  if (initialized) return;

  if (!hasPersistenceAdapter()) {
    setPersistenceAdapter(getPrismaBudgetAdapter());
    if (featureFlags.logThrottleDecisions) {
      console.log('[Throttle] Prisma persistence adapter configured');
    }
  }

  initialized = true;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if user can make a query.
 * Uses the synchronous check - for async use canQueryAsync.
 */
export function canQuery(userId: string, tier: UserTier): boolean {
  if (!featureFlags.enableThrottle) {
    return true;
  }

  ensureInitialized();

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    return Throttle.canQuery(userId, coreTier);
  } catch (error) {
    console.error('[Throttle] Error checking query allowance:', error);
    return true; // Fail open
  }
}

/**
 * Get current throttle status for a user.
 */
export function getThrottleStatus(userId: string, tier: UserTier): ThrottleStatus {
  if (!featureFlags.enableThrottle) {
    return {
      tier,
      canQuery: true,
      queriesRemaining: Infinity,
      queriesTotal: Infinity,
      budgetState: 'healthy',
      statusMessage: 'Unlimited (throttle disabled)',
      degraded: false,
      upgradeAvailable: tier !== 'master' && tier !== 'enterprise',
    };
  }

  ensureInitialized();

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    const coreStatus = Throttle.getThrottleStatus(userId, coreTier);
    const tierConfig = Throttle.TIER_CONFIGS[coreTier];

    // Map core budget state to wrapper budget state
    let budgetState: 'healthy' | 'warning' | 'depleted' | 'overage' = 'healthy';
    switch (coreStatus.budgetState) {
      case 'exhausted':
        budgetState = 'depleted';
        break;
      case 'critical':
      case 'warning':
        budgetState = 'warning';
        break;
      default:
        budgetState = 'healthy';
    }

    return {
      tier,
      canQuery: coreStatus.canMakeQuery,
      queriesRemaining: coreStatus.budget.queriesLimit - coreStatus.budget.queriesUsed,
      queriesTotal: tierConfig.queriesPerDay,
      budgetState,
      statusMessage: coreStatus.statusMessage,
      degraded: coreStatus.budgetState === 'critical' || coreStatus.budgetState === 'exhausted',
      upgradeAvailable: tier !== 'master' && tier !== 'enterprise',
    };
  } catch (error) {
    console.error('[Throttle] Error getting status:', error);
    // Return safe default
    return {
      tier,
      canQuery: true,
      queriesRemaining: Infinity,
      queriesTotal: Infinity,
      budgetState: 'healthy',
      statusMessage: 'Status unavailable',
      degraded: false,
      upgradeAvailable: tier !== 'master' && tier !== 'enterprise',
    };
  }
}

/**
 * Process a query request end-to-end.
 * Checks budget, selects model, and records usage.
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

  ensureInitialized();

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    const result = await Throttle.processQueryRequest(userId, coreTier, request);

    // Map core result to wrapper format
    return {
      allowed: result.allowed,
      model: result.model ? {
        id: result.model.id,
        name: result.model.model,
        provider: 'anthropic', // Default provider
        maxTokens: result.model.maxTokens,
      } : null,
      message: result.message,
      degraded: result.degraded,
      budgetState: result.degraded ? 'warning' : 'healthy',
    };
  } catch (error) {
    console.error('[Throttle] Error processing query:', error);
    // Fail open with default model
    return {
      allowed: true,
      model: {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        maxTokens: 4000,
      },
      message: 'Throttle error - query allowed',
      degraded: false,
      budgetState: 'healthy',
    };
  }
}

/**
 * Record a query usage.
 * Call after successful query completion.
 */
export function recordQuery(userId: string, tier: UserTier, modelId: string): void {
  if (!featureFlags.enableThrottle) {
    return;
  }

  ensureInitialized();

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    Throttle.recordQuery(userId, coreTier, modelId);

    if (featureFlags.logThrottleDecisions) {
      console.log('[Throttle] Query recorded:', {
        userId: userId.substring(0, 8) + '...',
        tier,
        modelId,
      });
    }
  } catch (error) {
    console.error('[Throttle] Error recording query:', error);
    // Don't throw - recording failure shouldn't block the user
  }
}

/**
 * Get feature access for a tier.
 */
export function getFeatureAccess(tier: UserTier): FeatureAccess {
  if (!featureFlags.enableThrottle) {
    return {
      contemplateMode: true,
      councilMode: true,
      voiceMode: true,
      customPersona: true,
      prioritySupport: true,
    };
  }

  const coreTier = mapUserTierToCoreTier(tier);

  return {
    contemplateMode: Throttle.hasFeatureAccess(coreTier, 'contemplateMode'),
    councilMode: Throttle.hasFeatureAccess(coreTier, 'councilMode'),
    voiceMode: Throttle.hasFeatureAccess(coreTier, 'voiceMode'),
    customPersona: tier === 'master' || tier === 'enterprise',
    prioritySupport: Throttle.hasFeatureAccess(coreTier, 'priorityProcessing'),
  };
}

/**
 * Check if a specific feature is available for a tier.
 */
export function hasFeature(
  tier: UserTier,
  feature: 'contemplateMode' | 'councilMode' | 'voiceMode' | 'customPersona' | 'prioritySupport'
): boolean {
  const access = getFeatureAccess(tier);
  return access[feature];
}

/**
 * Get degradation message when budget is low/depleted.
 */
export function getDegradationMessage(userId: string, tier: UserTier): string {
  if (!featureFlags.enableThrottle) {
    return '';
  }

  ensureInitialized();

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    return Throttle.getGracefulDegradationMessage(userId, coreTier);
  } catch (error) {
    return '';
  }
}

/**
 * Get upgrade prompt for a tier.
 */
export function getUpgradePrompt(tier: UserTier): string | null {
  if (!featureFlags.enableThrottle) {
    return null;
  }

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    const nextTier = Throttle.getUpgradePath(coreTier);
    if (!nextTier) return null;

    // Return upgrade messaging based on tier
    const tierConfig = Throttle.TIER_CONFIGS[nextTier];
    return `Upgrade to ${tierConfig.name} for ${tierConfig.queriesPerDay} queries/day`;
  } catch (error) {
    return null;
  }
}

/**
 * Get available overage packages.
 */
export function getOveragePackages(): Array<{
  id: string;
  name: string;
  queries: number;
  price: number;
}> {
  if (!featureFlags.enableThrottle) {
    return [];
  }

  try {
    const packages = Throttle.getOveragePackages();
    return packages.map(p => ({
      id: p.id,
      name: p.name,
      queries: p.queries,
      price: p.price,
    }));
  } catch (error) {
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

  ensureInitialized();

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    const result = Throttle.purchaseOverage(userId, coreTier, packageId);
    if (result) {
      return {
        success: true,
        queriesAdded: result.queriesRemaining,
      };
    }
    return {
      success: false,
      queriesAdded: 0,
      error: 'Package not found',
    };
  } catch (error) {
    return {
      success: false,
      queriesAdded: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get upgrade path for a tier.
 */
export function getUpgradePath(tier: UserTier): UserTier | null {
  const coreTier = mapUserTierToCoreTier(tier);
  const nextTier = Throttle.getUpgradePath(coreTier);
  return nextTier ? mapCoreTierToUserTier(nextTier) : null;
}

/**
 * Get budget status message.
 */
export function getBudgetStatusMessage(userId: string, tier: UserTier): string {
  if (!featureFlags.enableThrottle) {
    return 'Unlimited queries available';
  }

  ensureInitialized();

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    return Throttle.getBudgetStatusMessage(userId, coreTier);
  } catch (error) {
    return 'Status unavailable';
  }
}

/**
 * Get query count message.
 */
export function getQueryCountMessage(userId: string, tier: UserTier): string {
  if (!featureFlags.enableThrottle) {
    return 'Unlimited queries';
  }

  ensureInitialized();

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    return Throttle.getQueryCountMessage(userId, coreTier);
  } catch (error) {
    return 'Query count unavailable';
  }
}

/**
 * Add referral bonus queries.
 */
export function addReferralBonus(userId: string, tier: UserTier, bonusQueries: number): void {
  if (!featureFlags.enableThrottle) {
    return;
  }

  ensureInitialized();

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    Throttle.addReferralBonus(userId, coreTier, bonusQueries);
  } catch (error) {
    console.error('[Throttle] Error adding referral bonus:', error);
  }
}

/**
 * Get remaining referral bonus queries.
 */
export function getReferralBonusRemaining(userId: string, tier: UserTier): number {
  if (!featureFlags.enableThrottle) {
    return 0;
  }

  ensureInitialized();

  try {
    const coreTier = mapUserTierToCoreTier(tier);
    return Throttle.getReferralBonusRemaining(userId, coreTier);
  } catch (error) {
    return 0;
  }
}
