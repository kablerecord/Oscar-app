/**
 * OSQR Throttle - Overage Management
 *
 * Handles overage purchases and plugin trials.
 */

import {
  Tier,
  OveragePackage,
  OveragePurchase,
  PluginTrial,
  OVERAGE_PACKAGES,
} from './types';
import { addOverageQueries } from './budget-tracker';

// ============================================================================
// Overage Store
// ============================================================================

const overagePurchases = new Map<string, OveragePurchase[]>();
const pluginTrials = new Map<string, PluginTrial[]>();

// ============================================================================
// Overage Purchases
// ============================================================================

/**
 * Get available overage packages
 */
export function getOveragePackages(): OveragePackage[] {
  return OVERAGE_PACKAGES;
}

/**
 * Get a specific package by ID
 */
export function getPackage(packageId: string): OveragePackage | null {
  return OVERAGE_PACKAGES.find(p => p.id === packageId) || null;
}

/**
 * Purchase an overage package
 */
export function purchaseOverage(
  userId: string,
  tier: Tier,
  packageId: string
): OveragePurchase | null {
  const pkg = getPackage(packageId);
  if (!pkg) return null;

  const purchase: OveragePurchase = {
    id: `overage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    packageId,
    purchasedAt: new Date(),
    queriesRemaining: pkg.queries,
    expiresAt: null, // Overages don't expire in v1
  };

  // Store purchase
  const userPurchases = overagePurchases.get(userId) || [];
  userPurchases.push(purchase);
  overagePurchases.set(userId, userPurchases);

  // Add queries to daily budget
  addOverageQueries(userId, tier, pkg.queries);

  return purchase;
}

/**
 * Get user's overage purchase history
 */
export function getUserOverages(userId: string): OveragePurchase[] {
  return overagePurchases.get(userId) || [];
}

/**
 * Count overage purchases in current month
 */
export function getMonthlyOverageCount(userId: string): number {
  const purchases = getUserOverages(userId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return purchases.filter(p => p.purchasedAt >= startOfMonth).length;
}

// ============================================================================
// Plugin Trials
// ============================================================================

/**
 * Start a plugin trial for a user
 */
export function startPluginTrial(
  userId: string,
  pluginId: string,
  durationDays: number = 7
): PluginTrial | null {
  // Check if user already has an active trial for this plugin
  const existing = getPluginTrial(userId, pluginId);
  if (existing) return null;

  // Check if user has already trialed this plugin
  const userTrials = pluginTrials.get(userId) || [];
  const previousTrial = userTrials.find(t => t.pluginId === pluginId);
  if (previousTrial) return null; // No re-trials

  // Check if user has another active trial
  const activeTrials = userTrials.filter(t => t.isActive);
  if (activeTrials.length > 0) return null; // One at a time

  const now = new Date();
  const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const trial: PluginTrial = {
    userId,
    pluginId,
    startedAt: now,
    endsAt,
    isActive: true,
  };

  userTrials.push(trial);
  pluginTrials.set(userId, userTrials);

  return trial;
}

/**
 * Get active trial for a plugin
 */
export function getPluginTrial(
  userId: string,
  pluginId: string
): PluginTrial | null {
  const userTrials = pluginTrials.get(userId) || [];
  const trial = userTrials.find(
    t => t.pluginId === pluginId && t.isActive && t.endsAt > new Date()
  );

  return trial || null;
}

/**
 * Check if user can start a new plugin trial
 */
export function canStartPluginTrial(userId: string, pluginId: string): {
  canStart: boolean;
  reason?: string;
} {
  const userTrials = pluginTrials.get(userId) || [];

  // Check if already trialed
  const previousTrial = userTrials.find(t => t.pluginId === pluginId);
  if (previousTrial) {
    return { canStart: false, reason: 'You have already trialed this plugin.' };
  }

  // Check for active trial
  const activeTrials = userTrials.filter(t => t.isActive && t.endsAt > new Date());
  if (activeTrials.length > 0) {
    return { canStart: false, reason: 'You already have an active plugin trial.' };
  }

  // Check monthly limit (3 per month on Lite)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const trialsThisMonth = userTrials.filter(t => t.startedAt >= startOfMonth);
  if (trialsThisMonth.length >= 3) {
    return { canStart: false, reason: 'You have reached the monthly limit of 3 plugin trials.' };
  }

  return { canStart: true };
}

/**
 * End a plugin trial
 */
export function endPluginTrial(userId: string, pluginId: string): boolean {
  const userTrials = pluginTrials.get(userId) || [];
  const trial = userTrials.find(t => t.pluginId === pluginId && t.isActive);

  if (!trial) return false;

  trial.isActive = false;
  return true;
}

/**
 * Get all trials for a user
 */
export function getUserTrials(userId: string): PluginTrial[] {
  return pluginTrials.get(userId) || [];
}

/**
 * Check and expire old trials
 */
export function expireOldTrials(): number {
  let expired = 0;
  const now = new Date();

  for (const [userId, trials] of pluginTrials) {
    for (const trial of trials) {
      if (trial.isActive && trial.endsAt <= now) {
        trial.isActive = false;
        expired++;
      }
    }
  }

  return expired;
}

// ============================================================================
// Referral Bonuses
// ============================================================================

import { addReferralBonus, getReferralBonusRemaining } from './budget-tracker';

const REFERRAL_BONUS_QUERIES = 5;
const MAX_DAILY_REFERRAL_BONUS = 20;

/**
 * Process a referral bonus
 */
export function processReferralBonus(
  referrerUserId: string,
  referrerTier: Tier,
  referredUserId: string
): { success: boolean; queriesAdded: number; message: string } {
  // Check if referrer can receive more bonuses today
  const remaining = getReferralBonusRemaining(referrerUserId, referrerTier);

  if (remaining <= 0) {
    return {
      success: false,
      queriesAdded: 0,
      message: `You've already received the maximum referral bonus for today.`,
    };
  }

  const queriesToAdd = Math.min(REFERRAL_BONUS_QUERIES, remaining);
  addReferralBonus(referrerUserId, referrerTier, queriesToAdd);

  return {
    success: true,
    queriesAdded: queriesToAdd,
    message: `+${queriesToAdd} queries added for today!`,
  };
}

// ============================================================================
// Store Management
// ============================================================================

/**
 * Clear all stores (for testing)
 */
export function clearOverageStores(): void {
  overagePurchases.clear();
  pluginTrials.clear();
}
