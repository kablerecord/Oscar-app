/**
 * Prisma Budget Adapter
 *
 * Implements the @osqr/core BudgetPersistenceAdapter interface
 * for persistent budget storage using Prisma/PostgreSQL.
 */

import { prisma } from '@/lib/db/prisma';
import type { BudgetPersistenceAdapter, DailyBudget, Tier } from '@osqr/core';

/**
 * Prisma-backed budget persistence adapter.
 * Stores daily budgets and user timezones in PostgreSQL.
 */
export class PrismaBudgetAdapter implements BudgetPersistenceAdapter {
  /**
   * Get a daily budget for a user on a specific date.
   * Returns null if no budget exists for that date.
   */
  async getDailyBudget(userId: string, date: string): Promise<DailyBudget | null> {
    try {
      const budget = await prisma.dailyBudget.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      });

      if (!budget) {
        return null;
      }

      // Convert Prisma model to DailyBudget interface
      return {
        userId: budget.userId,
        tier: budget.tier as Tier,
        date: budget.date,
        premiumQueriesUsed: budget.premiumQueriesUsed,
        premiumQueriesLimit: budget.premiumQueriesLimit,
        economyQueriesUsed: budget.economyQueriesUsed,
        economyQueriesLimit: Infinity, // Economy queries are unlimited
        overagePurchased: budget.overagePurchased,
        referralBonus: budget.referralBonus,
        resetAt: budget.resetAt,
      };
    } catch (error) {
      console.error('[PrismaBudgetAdapter] Error getting daily budget:', error);
      return null;
    }
  }

  /**
   * Save or update a daily budget.
   * Uses upsert based on userId + date.
   */
  async saveDailyBudget(budget: DailyBudget): Promise<void> {
    try {
      await prisma.dailyBudget.upsert({
        where: {
          userId_date: {
            userId: budget.userId,
            date: budget.date,
          },
        },
        update: {
          tier: budget.tier,
          premiumQueriesUsed: budget.premiumQueriesUsed,
          premiumQueriesLimit: budget.premiumQueriesLimit,
          economyQueriesUsed: budget.economyQueriesUsed,
          overagePurchased: budget.overagePurchased,
          referralBonus: budget.referralBonus,
          resetAt: budget.resetAt,
        },
        create: {
          userId: budget.userId,
          tier: budget.tier,
          date: budget.date,
          premiumQueriesUsed: budget.premiumQueriesUsed,
          premiumQueriesLimit: budget.premiumQueriesLimit,
          economyQueriesUsed: budget.economyQueriesUsed,
          overagePurchased: budget.overagePurchased,
          referralBonus: budget.referralBonus,
          resetAt: budget.resetAt,
        },
      });
    } catch (error) {
      console.error('[PrismaBudgetAdapter] Error saving daily budget:', error);
      throw error;
    }
  }

  /**
   * Get the user's timezone setting.
   * Returns 'UTC' if not set.
   */
  async getUserTimezone(userId: string): Promise<string> {
    try {
      const setting = await prisma.userTimezone.findUnique({
        where: { userId },
      });
      return setting?.timezone || 'UTC';
    } catch (error) {
      console.error('[PrismaBudgetAdapter] Error getting user timezone:', error);
      return 'UTC';
    }
  }

  /**
   * Set the user's timezone for midnight reset calculations.
   */
  async setUserTimezone(userId: string, timezone: string): Promise<void> {
    try {
      await prisma.userTimezone.upsert({
        where: { userId },
        update: { timezone },
        create: { userId, timezone },
      });
    } catch (error) {
      console.error('[PrismaBudgetAdapter] Error setting user timezone:', error);
      throw error;
    }
  }

  /**
   * Delete old budget records for a user (for cleanup).
   * Called when a new day starts.
   */
  async deleteOldBudgets(userId: string, beforeDate: string): Promise<void> {
    try {
      await prisma.dailyBudget.deleteMany({
        where: {
          userId,
          date: {
            lt: beforeDate,
          },
        },
      });
    } catch (error) {
      console.error('[PrismaBudgetAdapter] Error deleting old budgets:', error);
      // Don't throw - cleanup is not critical
    }
  }
}

// Singleton instance
let adapterInstance: PrismaBudgetAdapter | null = null;

/**
 * Get the singleton Prisma budget adapter instance.
 */
export function getPrismaBudgetAdapter(): PrismaBudgetAdapter {
  if (!adapterInstance) {
    adapterInstance = new PrismaBudgetAdapter();
  }
  return adapterInstance;
}
