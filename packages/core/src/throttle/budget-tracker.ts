/**
 * OSQR Throttle - Budget Tracker
 *
 * Tracks daily usage budget per user with midnight resets.
 * Supports optional persistence adapter for database storage.
 * Also tracks capability costs (web search, code execution, etc.)
 */

import {
  Tier,
  DailyBudget,
  BudgetStatus,
  BudgetState,
  TIER_CONFIGS,
  CapabilityType,
  CapabilityCost,
  CapabilityUsage,
  CAPABILITY_COSTS,
} from './types';
import { getPersistenceAdapter, hasPersistenceAdapter } from './persistence';

// ============================================================================
// In-Memory Budget Store (fallback when no persistence adapter)
// ============================================================================

const budgets = new Map<string, DailyBudget>();
const userTimezones = new Map<string, string>();

// ============================================================================
// Timezone Management
// ============================================================================

/**
 * Set the user's timezone for midnight reset calculation
 */
export async function setUserTimezone(userId: string, timezone: string): Promise<void> {
  const adapter = getPersistenceAdapter();
  if (adapter) {
    await adapter.setUserTimezone(userId, timezone);
  } else {
    userTimezones.set(userId, timezone);
  }
}

/**
 * Set timezone synchronously (for backwards compatibility)
 */
export function setUserTimezoneSync(userId: string, timezone: string): void {
  userTimezones.set(userId, timezone);
  // Also update persistence if available (fire and forget)
  const adapter = getPersistenceAdapter();
  if (adapter) {
    adapter.setUserTimezone(userId, timezone).catch(console.error);
  }
}

/**
 * Get the user's timezone (defaults to UTC)
 */
export async function getUserTimezoneAsync(userId: string): Promise<string> {
  const adapter = getPersistenceAdapter();
  if (adapter) {
    return adapter.getUserTimezone(userId);
  }
  return userTimezones.get(userId) || 'UTC';
}

/**
 * Get timezone synchronously (for backwards compatibility)
 */
export function getUserTimezone(userId: string): string {
  return userTimezones.get(userId) || 'UTC';
}

/**
 * Get current date string in user's timezone (YYYY-MM-DD)
 */
export function getDateInTimezone(timezone: string): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  };

  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
}

/**
 * Calculate next midnight in user's timezone
 */
export function getNextMidnight(timezone: string): Date {
  const now = new Date();

  // Get current time in user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');

  // Create a date for midnight tomorrow in user's timezone
  // This is an approximation - proper timezone handling would need a library
  const tomorrow = new Date(year, month, day + 1, 0, 0, 0, 0);

  return tomorrow;
}

// ============================================================================
// Budget Management
// ============================================================================

/**
 * Get budget key for a user and date
 */
function getBudgetKey(userId: string, date: string): string {
  return `${userId}:${date}`;
}

/**
 * Create a new budget for a user
 */
function createNewBudget(userId: string, tier: Tier, date: string, timezone: string): DailyBudget {
  const tierConfig = TIER_CONFIGS[tier];
  return {
    userId,
    tier,
    date,
    premiumQueriesUsed: 0,
    premiumQueriesLimit: tierConfig.queriesPerDay,
    economyQueriesUsed: 0,
    economyQueriesLimit: Infinity,
    overagePurchased: 0,
    referralBonus: 0,
    resetAt: getNextMidnight(timezone),
  };
}

/**
 * Initialize or get daily budget for a user (async version for persistence)
 */
export async function getDailyBudgetAsync(userId: string, tier: Tier): Promise<DailyBudget> {
  const adapter = getPersistenceAdapter();
  const timezone = adapter ? await adapter.getUserTimezone(userId) : getUserTimezone(userId);
  const date = getDateInTimezone(timezone);

  if (adapter) {
    // Try to get from persistence
    let budget = await adapter.getDailyBudget(userId, date);

    if (!budget) {
      // Create new budget and save
      budget = createNewBudget(userId, tier, date, timezone);
      await adapter.saveDailyBudget(budget);

      // Clean up old budgets
      if (adapter.deleteOldBudgets) {
        await adapter.deleteOldBudgets(userId, date);
      }
    }

    return budget;
  }

  // Fallback to in-memory
  return getDailyBudget(userId, tier);
}

/**
 * Initialize or get daily budget for a user (sync version for backwards compatibility)
 */
export function getDailyBudget(userId: string, tier: Tier): DailyBudget {
  const timezone = getUserTimezone(userId);
  const date = getDateInTimezone(timezone);
  const key = getBudgetKey(userId, date);

  let budget = budgets.get(key);

  if (!budget) {
    budget = createNewBudget(userId, tier, date, timezone);
    budgets.set(key, budget);
  }

  return budget;
}

/**
 * Save budget to persistence (call after modifications)
 */
export async function saveBudget(budget: DailyBudget): Promise<void> {
  const adapter = getPersistenceAdapter();
  if (adapter) {
    await adapter.saveDailyBudget(budget);
  }
  // Also update in-memory cache
  const key = getBudgetKey(budget.userId, budget.date);
  budgets.set(key, budget);
}

/**
 * Get budget status for display (sync version, uses in-memory cache)
 */
export function getBudgetStatus(userId: string, tier: Tier): BudgetStatus {
  const budget = getDailyBudget(userId, tier);
  return calculateBudgetStatusFromBudget(budget);
}

// Alias for explicit sync naming
export const getBudgetStatusSync = getBudgetStatus;

/**
 * Get budget status for display (async version, uses persistence if available)
 */
export async function getBudgetStatusAsync(userId: string, tier: Tier): Promise<BudgetStatus> {
  const budget = await getDailyBudgetAsync(userId, tier);
  return calculateBudgetStatusFromBudget(budget);
}

/**
 * Calculate budget status from a budget object
 */
function calculateBudgetStatusFromBudget(budget: DailyBudget): BudgetStatus {
  const totalAvailable = budget.premiumQueriesLimit + budget.overagePurchased + budget.referralBonus;
  const remaining = totalAvailable - budget.premiumQueriesUsed;
  const percentRemaining = totalAvailable > 0 ? (remaining / totalAvailable) * 100 : 0;

  const state = calculateBudgetState(percentRemaining);
  const message = getStateMessage(state, remaining, budget.resetAt);

  return {
    state,
    premiumRemaining: Math.max(0, remaining),
    economyRemaining: budget.economyQueriesLimit - budget.economyQueriesUsed,
    percentRemaining,
    nextResetAt: budget.resetAt,
    overageAvailable: true, // Always available for purchase
    message,
  };
}

/**
 * Calculate budget state from percentage
 */
function calculateBudgetState(percentRemaining: number): BudgetState {
  if (percentRemaining >= 100) return 'full';
  if (percentRemaining >= 50) return 'high';
  if (percentRemaining >= 25) return 'medium';
  if (percentRemaining >= 10) return 'low';
  if (percentRemaining > 0) return 'critical';
  return 'depleted';
}

/**
 * Get message for budget state
 */
function getStateMessage(state: BudgetState, remaining: number, resetAt: Date): string {
  const timeUntilReset = formatTimeUntil(resetAt);

  switch (state) {
    case 'full':
      return 'Full capacity available.';
    case 'high':
      return `${remaining} queries remaining today.`;
    case 'medium':
      return `I've used most of my deep thinking for today. ${remaining} left.`;
    case 'low':
      return `I've hit my daily limit for deep analysis. Resets ${timeUntilReset}.`;
    case 'critical':
      return `Running on fumes today. ${remaining} premium queries left.`;
    case 'depleted':
      return `I've used my deep thinking for today. Resets ${timeUntilReset}.`;
  }
}

/**
 * Format time until a date
 */
function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return 'now';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes}m`;
}

// ============================================================================
// Budget Consumption
// ============================================================================

/**
 * Check if premium queries are available
 */
export function hasPremiumBudget(userId: string, tier: Tier): boolean {
  const budget = getDailyBudget(userId, tier);
  const totalAvailable = budget.premiumQueriesLimit + budget.overagePurchased + budget.referralBonus;
  return budget.premiumQueriesUsed < totalAvailable;
}

/**
 * Check if premium queries are available (async)
 */
export async function hasPremiumBudgetAsync(userId: string, tier: Tier): Promise<boolean> {
  const budget = await getDailyBudgetAsync(userId, tier);
  const totalAvailable = budget.premiumQueriesLimit + budget.overagePurchased + budget.referralBonus;
  return budget.premiumQueriesUsed < totalAvailable;
}

/**
 * Check if economy queries are available
 */
export function hasEconomyBudget(userId: string, tier: Tier): boolean {
  const budget = getDailyBudget(userId, tier);
  return budget.economyQueriesUsed < budget.economyQueriesLimit;
}

/**
 * Consume a premium query
 */
export function consumePremiumQuery(userId: string, tier: Tier): boolean {
  if (!hasPremiumBudget(userId, tier)) {
    return false;
  }

  const budget = getDailyBudget(userId, tier);
  budget.premiumQueriesUsed++;

  // Save to persistence if available (fire and forget for sync API)
  saveBudget(budget).catch(console.error);

  return true;
}

/**
 * Consume a premium query (async version)
 */
export async function consumePremiumQueryAsync(userId: string, tier: Tier): Promise<boolean> {
  const budget = await getDailyBudgetAsync(userId, tier);
  const totalAvailable = budget.premiumQueriesLimit + budget.overagePurchased + budget.referralBonus;

  if (budget.premiumQueriesUsed >= totalAvailable) {
    return false;
  }

  budget.premiumQueriesUsed++;
  await saveBudget(budget);

  return true;
}

/**
 * Consume an economy query
 */
export function consumeEconomyQuery(userId: string, tier: Tier): boolean {
  if (!hasEconomyBudget(userId, tier)) {
    return false;
  }

  const budget = getDailyBudget(userId, tier);
  budget.economyQueriesUsed++;

  // Save to persistence if available
  saveBudget(budget).catch(console.error);

  return true;
}

// ============================================================================
// Overage & Bonuses
// ============================================================================

/**
 * Add overage queries to budget
 */
export function addOverageQueries(userId: string, tier: Tier, queries: number): void {
  const budget = getDailyBudget(userId, tier);
  budget.overagePurchased += queries;
  saveBudget(budget).catch(console.error);
}

/**
 * Add overage queries (async)
 */
export async function addOverageQueriesAsync(userId: string, tier: Tier, queries: number): Promise<void> {
  const budget = await getDailyBudgetAsync(userId, tier);
  budget.overagePurchased += queries;
  await saveBudget(budget);
}

/**
 * Add referral bonus queries to budget
 */
export function addReferralBonus(userId: string, tier: Tier, queries: number): void {
  const budget = getDailyBudget(userId, tier);
  const currentBonus = budget.referralBonus;
  // Cap at 20 per day
  budget.referralBonus = Math.min(currentBonus + queries, 20);
  saveBudget(budget).catch(console.error);
}

/**
 * Get referral bonus remaining for today
 */
export function getReferralBonusRemaining(userId: string, tier: Tier): number {
  const budget = getDailyBudget(userId, tier);
  return 20 - budget.referralBonus;
}

// ============================================================================
// Reset & Cleanup
// ============================================================================

/**
 * Check if reset is needed for a user
 */
export function needsReset(userId: string, tier: Tier): boolean {
  const timezone = getUserTimezone(userId);
  const currentDate = getDateInTimezone(timezone);

  // Look for any existing budget
  for (const [key] of budgets) {
    if (key.startsWith(`${userId}:`)) {
      const budgetDate = key.split(':')[1];
      if (budgetDate !== currentDate) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Perform reset for a user (clears old day's budget)
 */
export function resetUserBudget(userId: string): void {
  // Remove old budget entries for this user from memory
  for (const [key] of budgets) {
    if (key.startsWith(`${userId}:`)) {
      budgets.delete(key);
    }
  }
}

/**
 * Clear all budgets (for testing)
 */
export function clearAllBudgets(): void {
  budgets.clear();
}

// Alias for test compatibility
export const clearBudgetStore = clearAllBudgets;

/**
 * Get all active budgets (for admin/debugging)
 */
export function getAllBudgets(): DailyBudget[] {
  return Array.from(budgets.values());
}

// ============================================================================
// Compatibility Layer (for test file expectations)
// ============================================================================

/**
 * Get user budget (alias for getDailyBudget with simplified return)
 */
export function getUserBudget(userId: string, tier: Tier): {
  queriesUsed: number;
  queriesLimit: number;
  overageQueries: number;
} {
  const budget = getDailyBudget(userId, tier);
  return {
    queriesUsed: budget.premiumQueriesUsed,
    queriesLimit: budget.premiumQueriesLimit,
    overageQueries: budget.overagePurchased,
  };
}

/**
 * Check if user can make a query
 */
export function canQuery(userId: string, tier: Tier): boolean {
  return hasPremiumBudget(userId, tier) || hasEconomyBudget(userId, tier);
}

/**
 * Check if user can make a query (async)
 */
export async function canQueryAsync(userId: string, tier: Tier): Promise<boolean> {
  return await hasPremiumBudgetAsync(userId, tier) || hasEconomyBudget(userId, tier);
}

/**
 * Record a query (consumes premium budget)
 */
export function recordQuery(userId: string, tier: Tier, _modelId: string): void {
  consumePremiumQuery(userId, tier);
}

/**
 * Record a query (async version)
 */
export async function recordQueryAsync(userId: string, tier: Tier, _modelId: string): Promise<void> {
  await consumePremiumQueryAsync(userId, tier);
}

/**
 * Get budget state as a simple string
 */
export function getBudgetState(userId: string, tier: Tier): 'healthy' | 'warning' | 'critical' | 'exhausted' {
  const budget = getDailyBudget(userId, tier);
  const tierConfig = TIER_CONFIGS[tier];

  // Unlimited tiers are always healthy
  if (tierConfig.queriesPerDay === Infinity) {
    return 'healthy';
  }

  const totalAvailable = budget.premiumQueriesLimit + budget.overagePurchased + budget.referralBonus;
  const percentUsed = totalAvailable > 0 ? (budget.premiumQueriesUsed / totalAvailable) * 100 : 100;

  if (percentUsed < 70) return 'healthy';
  if (percentUsed < 90) return 'warning';
  if (percentUsed < 100) return 'critical';
  return 'exhausted';
}

/**
 * Get queries remaining
 */
export function getQueriesRemaining(userId: string, tier: Tier): number {
  const budget = getDailyBudget(userId, tier);
  const totalAvailable = budget.premiumQueriesLimit + budget.overagePurchased + budget.referralBonus;
  return Math.max(0, totalAvailable - budget.premiumQueriesUsed);
}

/**
 * Reset daily budget (alias for resetUserBudget)
 */
export function resetDailyBudget(userId: string, _tier: Tier): void {
  resetUserBudget(userId);
}

// ============================================================================
// Capability Cost Tracking
// ============================================================================

/**
 * In-memory store for capability usage
 */
const capabilityUsage = new Map<string, {
  usageByCapability: Record<CapabilityType, { count: number; totalCost: number }>;
  totalCost: number;
}>();

/**
 * Get capability usage key
 */
function getCapabilityUsageKey(userId: string, date: string): string {
  return `cap:${userId}:${date}`;
}

/**
 * Initialize capability usage for a user if not exists
 */
function initCapabilityUsage(userId: string, date: string): void {
  const key = getCapabilityUsageKey(userId, date);
  if (!capabilityUsage.has(key)) {
    capabilityUsage.set(key, {
      usageByCapability: {
        web_search: { count: 0, totalCost: 0 },
        code_execution: { count: 0, totalCost: 0 },
        image_generation: { count: 0, totalCost: 0 },
        vision_analysis: { count: 0, totalCost: 0 },
        file_search: { count: 0, totalCost: 0 },
        deep_research: { count: 0, totalCost: 0 },
        voice_input: { count: 0, totalCost: 0 },
        voice_output: { count: 0, totalCost: 0 },
      },
      totalCost: 0,
    });
  }
}

/**
 * Calculate cost for a capability usage
 */
export function calculateCapabilityCost(usage: CapabilityUsage): number {
  const config = CAPABILITY_COSTS[usage.capability];
  let total = config.baseCost;

  if (config.variableCost) {
    let units = 0;
    switch (config.variableCost.unit) {
      case 'token':
        units = usage.tokens || 0;
        break;
      case 'second':
        units = usage.seconds || 0;
        break;
      case 'character':
        units = usage.characters || 0;
        break;
      case 'image':
        units = usage.images || 0;
        break;
    }
    total += units * config.variableCost.rate;
  }

  return total;
}

/**
 * Track capability usage for a user
 */
export function trackCapabilityUsage(userId: string, usage: CapabilityUsage): number {
  const timezone = getUserTimezone(userId);
  const date = getDateInTimezone(timezone);
  const key = getCapabilityUsageKey(userId, date);

  initCapabilityUsage(userId, date);

  const cost = calculateCapabilityCost(usage);
  const record = capabilityUsage.get(key)!;

  record.usageByCapability[usage.capability].count++;
  record.usageByCapability[usage.capability].totalCost += cost;
  record.totalCost += cost;

  return cost;
}

/**
 * Track capability usage (async version)
 */
export async function trackCapabilityUsageAsync(
  userId: string,
  usage: CapabilityUsage
): Promise<number> {
  // For now, just use sync version
  // In the future, this could persist to a database
  return trackCapabilityUsage(userId, usage);
}

/**
 * Get capability usage for a user on a given date
 */
export function getCapabilityUsage(userId: string, date?: string): {
  usageByCapability: Record<CapabilityType, { count: number; totalCost: number }>;
  totalCost: number;
} | null {
  const timezone = getUserTimezone(userId);
  const targetDate = date || getDateInTimezone(timezone);
  const key = getCapabilityUsageKey(userId, targetDate);

  return capabilityUsage.get(key) || null;
}

/**
 * Get total capability cost for today
 */
export function getTodayCapabilityCost(userId: string): number {
  const usage = getCapabilityUsage(userId);
  return usage?.totalCost || 0;
}

/**
 * Get usage count for a specific capability today
 */
export function getCapabilityUsageCount(userId: string, capability: CapabilityType): number {
  const usage = getCapabilityUsage(userId);
  return usage?.usageByCapability[capability]?.count || 0;
}

/**
 * Estimate cost for a capability before usage
 */
export function estimateCapabilityCost(
  capability: CapabilityType,
  estimatedUsage?: Partial<Omit<CapabilityUsage, 'capability'>>
): number {
  return calculateCapabilityCost({
    capability,
    ...estimatedUsage,
  });
}

/**
 * Clear capability usage (for testing)
 */
export function clearCapabilityUsage(): void {
  capabilityUsage.clear();
}

/**
 * Get all capability cost definitions
 */
export function getAllCapabilityCosts(): Record<CapabilityType, CapabilityCost> {
  return { ...CAPABILITY_COSTS };
}
