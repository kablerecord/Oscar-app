/**
 * Prisma Budget Persistence Adapter
 *
 * Implements the @osqr/core BudgetPersistenceAdapter interface
 * to store budget data in the database instead of in-memory.
 *
 * This ensures budgets persist across server restarts and
 * provides a single source of truth for usage tracking.
 */

import { prisma } from '@/lib/db/prisma'
import type { BudgetPersistenceAdapter } from '@osqr/core'
import type { DailyBudget, Tier } from '@osqr/core'

/**
 * Prisma-based budget persistence adapter.
 * Stores budget data in PostgreSQL via Prisma.
 */
export class PrismaBudgetAdapter implements BudgetPersistenceAdapter {
  /**
   * Get a daily budget for a user on a specific date.
   */
  async getDailyBudget(userId: string, date: string): Promise<DailyBudget | null> {
    const record = await prisma.dailyBudget.findUnique({
      where: {
        userId_date: { userId, date },
      },
    })

    if (!record) {
      return null
    }

    return {
      userId: record.userId,
      tier: record.tier as Tier,
      date: record.date,
      premiumQueriesUsed: record.premiumQueriesUsed,
      premiumQueriesLimit: record.premiumQueriesLimit,
      economyQueriesUsed: record.economyQueriesUsed,
      economyQueriesLimit: Infinity, // Always infinite for economy tier
      overagePurchased: record.overagePurchased,
      referralBonus: record.referralBonus,
      resetAt: record.resetAt,
    }
  }

  /**
   * Save or update a daily budget.
   * Uses upsert based on userId + date.
   */
  async saveDailyBudget(budget: DailyBudget): Promise<void> {
    await prisma.dailyBudget.upsert({
      where: {
        userId_date: { userId: budget.userId, date: budget.date },
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
      update: {
        tier: budget.tier,
        premiumQueriesUsed: budget.premiumQueriesUsed,
        premiumQueriesLimit: budget.premiumQueriesLimit,
        economyQueriesUsed: budget.economyQueriesUsed,
        overagePurchased: budget.overagePurchased,
        referralBonus: budget.referralBonus,
        resetAt: budget.resetAt,
      },
    })
  }

  /**
   * Get the user's timezone setting.
   * Returns 'UTC' if not set.
   */
  async getUserTimezone(userId: string): Promise<string> {
    const record = await prisma.userTimezone.findUnique({
      where: { userId },
    })

    return record?.timezone ?? 'UTC'
  }

  /**
   * Set the user's timezone for midnight reset calculations.
   */
  async setUserTimezone(userId: string, timezone: string): Promise<void> {
    await prisma.userTimezone.upsert({
      where: { userId },
      create: { userId, timezone },
      update: { timezone },
    })
  }

  /**
   * Delete old budget records for a user (cleanup).
   * Called when a new day starts.
   */
  async deleteOldBudgets(userId: string, beforeDate: string): Promise<void> {
    await prisma.dailyBudget.deleteMany({
      where: {
        userId,
        date: { lt: beforeDate },
      },
    })
  }
}

// Singleton instance
let adapterInstance: PrismaBudgetAdapter | null = null

/**
 * Get the Prisma budget adapter singleton.
 */
export function getPrismaBudgetAdapter(): PrismaBudgetAdapter {
  if (!adapterInstance) {
    adapterInstance = new PrismaBudgetAdapter()
  }
  return adapterInstance
}
