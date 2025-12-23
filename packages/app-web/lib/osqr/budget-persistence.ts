/**
 * Budget Persistence - Stub Implementation
 *
 * NOTE: @osqr/core package is not yet available.
 * This file provides stub implementations.
 */

export interface BudgetPersistenceAdapter {
  getDailyBudget(userId: string, date: string): Promise<unknown | null>;
  saveDailyBudget(budget: unknown): Promise<void>;
  getUserTimezone(userId: string): Promise<string>;
  setUserTimezone(userId: string, timezone: string): Promise<void>;
  deleteOldBudgets(userId: string, beforeDate: string): Promise<void>;
}

export class PrismaBudgetAdapter implements BudgetPersistenceAdapter {
  async getDailyBudget(_userId: string, _date: string): Promise<unknown | null> {
    return null;
  }

  async saveDailyBudget(_budget: unknown): Promise<void> {
    // No-op stub
  }

  async getUserTimezone(_userId: string): Promise<string> {
    return 'UTC';
  }

  async setUserTimezone(_userId: string, _timezone: string): Promise<void> {
    // No-op stub
  }

  async deleteOldBudgets(_userId: string, _beforeDate: string): Promise<void> {
    // No-op stub
  }
}

let adapterInstance: PrismaBudgetAdapter | null = null;

export function getPrismaBudgetAdapter(): PrismaBudgetAdapter {
  if (!adapterInstance) {
    adapterInstance = new PrismaBudgetAdapter();
  }
  return adapterInstance;
}
