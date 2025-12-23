/**
 * OSQR Throttle - Persistence Adapter
 *
 * Provides an abstraction layer for budget persistence.
 * By default, uses in-memory storage. Applications can provide
 * a custom adapter (e.g., Prisma, Redis) for persistent storage.
 */

import { DailyBudget } from './types';

// ============================================================================
// Persistence Adapter Interface
// ============================================================================

/**
 * Interface for budget persistence adapters.
 * Implement this to store budgets in a database, Redis, etc.
 */
export interface BudgetPersistenceAdapter {
  /**
   * Get a daily budget for a user on a specific date.
   * Returns null if no budget exists for that date.
   */
  getDailyBudget(userId: string, date: string): Promise<DailyBudget | null>;

  /**
   * Save or update a daily budget.
   * Should upsert based on userId + date.
   */
  saveDailyBudget(budget: DailyBudget): Promise<void>;

  /**
   * Get the user's timezone setting.
   * Returns 'UTC' if not set.
   */
  getUserTimezone(userId: string): Promise<string>;

  /**
   * Set the user's timezone for midnight reset calculations.
   */
  setUserTimezone(userId: string, timezone: string): Promise<void>;

  /**
   * Delete old budget records for a user (for cleanup).
   * Called when a new day starts.
   */
  deleteOldBudgets?(userId: string, beforeDate: string): Promise<void>;
}

// ============================================================================
// Adapter Management
// ============================================================================

let persistenceAdapter: BudgetPersistenceAdapter | null = null;

/**
 * Set the persistence adapter for budget storage.
 * Call this at application startup to enable persistent storage.
 *
 * Example:
 *   import { setPersistenceAdapter } from '@osqr/core';
 *   import { PrismaBudgetAdapter } from './budget-persistence';
 *
 *   setPersistenceAdapter(new PrismaBudgetAdapter());
 */
export function setPersistenceAdapter(adapter: BudgetPersistenceAdapter): void {
  persistenceAdapter = adapter;
  console.log('[Throttle] Persistence adapter configured');
}

/**
 * Get the current persistence adapter (or null if using in-memory).
 */
export function getPersistenceAdapter(): BudgetPersistenceAdapter | null {
  return persistenceAdapter;
}

/**
 * Check if a persistence adapter is configured.
 */
export function hasPersistenceAdapter(): boolean {
  return persistenceAdapter !== null;
}

/**
 * Clear the persistence adapter (for testing).
 */
export function clearPersistenceAdapter(): void {
  persistenceAdapter = null;
}
