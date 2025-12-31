/**
 * Temporal Intelligence Learning Job
 *
 * Runs daily to adjust user preferences based on their engagement outcomes.
 * This is the "learning" part of the Temporal Intelligence Layer.
 *
 * Can be triggered by:
 * - Vercel Cron (vercel.json)
 * - Manual API call
 * - Background task scheduler
 *
 * @example
 * // In a cron job or API route:
 * import { runDailyLearning } from '@/lib/osqr/temporal-learning-job'
 * await runDailyLearning()
 */

import { prisma } from '@/lib/db/prisma'
import { adjustLearning } from './temporal-wrapper'
import { featureFlags } from './config'

export interface LearningJobResult {
  success: boolean
  usersProcessed: number
  usersAdjusted: number
  errors: string[]
  durationMs: number
}

/**
 * Run the daily learning job for all eligible users
 */
export async function runDailyLearning(): Promise<LearningJobResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let usersProcessed = 0
  let usersAdjusted = 0

  if (!featureFlags.enableTemporalIntelligence) {
    return {
      success: false,
      usersProcessed: 0,
      usersAdjusted: 0,
      errors: ['Temporal Intelligence is disabled'],
      durationMs: Date.now() - startTime,
    }
  }

  try {
    // Find users with sufficient outcomes for learning
    // Requires 5+ outcomes in the last 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    const eligibleUsers = await prisma.$queryRaw<Array<{ userId: string; outcomeCount: number }>>`
      SELECT c."userId", COUNT(o.id)::int as "outcomeCount"
      FROM "TILCommitment" c
      JOIN "TILNotificationOutcome" o ON o."commitmentId" = c.id
      WHERE o."surfacedAt" >= ${fourteenDaysAgo}
      GROUP BY c."userId"
      HAVING COUNT(o.id) >= 5
    `

    console.log(`[TIL Learning] Found ${eligibleUsers.length} eligible users`)

    for (const user of eligibleUsers) {
      try {
        usersProcessed++

        const result = await adjustLearning(user.userId)

        if (result.success && result.adjustments) {
          usersAdjusted++
          console.log(
            `[TIL Learning] Adjusted preferences for user ${user.userId}:`,
            result.adjustments
          )
        }
      } catch (error) {
        const errorMsg = `Failed to process user ${user.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`[TIL Learning] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    const durationMs = Date.now() - startTime
    console.log(
      `[TIL Learning] Completed: ${usersProcessed} users processed, ${usersAdjusted} adjusted in ${durationMs}ms`
    )

    return {
      success: true,
      usersProcessed,
      usersAdjusted,
      errors,
      durationMs,
    }
  } catch (error) {
    const errorMsg = `Learning job failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`[TIL Learning] ${errorMsg}`)
    errors.push(errorMsg)

    return {
      success: false,
      usersProcessed,
      usersAdjusted,
      errors,
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * Run learning for a specific user
 * Useful for testing or on-demand learning
 */
export async function runLearningForUser(userId: string): Promise<{
  success: boolean
  adjustments?: Record<string, unknown>
  error?: string
}> {
  if (!featureFlags.enableTemporalIntelligence) {
    return { success: false, error: 'Temporal Intelligence is disabled' }
  }

  try {
    const result = await adjustLearning(userId)

    return {
      success: result.success,
      adjustments: result.adjustments as Record<string, unknown> | undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get learning statistics for monitoring
 */
export async function getLearningStats(): Promise<{
  totalUsers: number
  usersWithOutcomes: number
  usersEligibleForLearning: number
  totalOutcomes: number
  outcomesLast14Days: number
  lastLearningRun?: Date
}> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    usersWithOutcomes,
    eligibleUsers,
    totalOutcomes,
    recentOutcomes,
    lastLearningRun,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tILCommitment.groupBy({
      by: ['userId'],
      _count: true,
    }).then((r) => r.length),
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT c."userId")::int as count
      FROM "TILCommitment" c
      JOIN "TILNotificationOutcome" o ON o."commitmentId" = c.id
      WHERE o."surfacedAt" >= ${fourteenDaysAgo}
      GROUP BY c."userId"
      HAVING COUNT(o.id) >= 5
    `.then((r) => r.length),
    prisma.tILNotificationOutcome.count(),
    prisma.tILNotificationOutcome.count({
      where: { surfacedAt: { gte: fourteenDaysAgo } },
    }),
    prisma.tILTemporalPreferences.findFirst({
      where: { lastLearningRunAt: { not: null } },
      orderBy: { lastLearningRunAt: 'desc' },
      select: { lastLearningRunAt: true },
    }).then((r) => r?.lastLearningRunAt),
  ])

  return {
    totalUsers,
    usersWithOutcomes,
    usersEligibleForLearning: eligibleUsers,
    totalOutcomes,
    outcomesLast14Days: recentOutcomes,
    lastLearningRun: lastLearningRun || undefined,
  }
}

/**
 * Clean up old outcomes to prevent database bloat
 * Keeps outcomes for the last 90 days by default
 */
export async function cleanupOldOutcomes(daysToKeep = 90): Promise<{
  deleted: number
}> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

  const result = await prisma.tILNotificationOutcome.deleteMany({
    where: {
      surfacedAt: { lt: cutoffDate },
    },
  })

  console.log(`[TIL Learning] Cleaned up ${result.count} old outcomes`)

  return { deleted: result.count }
}

/**
 * Mark expired commitments
 * Commitments older than 30 days that haven't been acted on are marked as expired
 */
export async function expireOldCommitments(daysOld = 30): Promise<{
  expired: number
}> {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

  const result = await prisma.tILCommitment.updateMany({
    where: {
      status: 'pending',
      createdAt: { lt: cutoffDate },
    },
    data: {
      status: 'expired',
    },
  })

  if (result.count > 0) {
    console.log(`[TIL Learning] Marked ${result.count} old commitments as expired`)
  }

  return { expired: result.count }
}
