/**
 * Temporal Intelligence - Learning Job API
 *
 * POST /api/temporal/learn
 * Runs the daily learning job to adjust user preferences.
 * Can be triggered by Vercel Cron or manually.
 *
 * GET /api/temporal/learn
 * Returns learning statistics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import {
  runDailyLearning,
  getLearningStats,
  cleanupOldOutcomes,
  expireOldCommitments,
} from '@/lib/osqr/temporal-learning-job'
import { featureFlags } from '@/lib/osqr/config'

// Verify the request is from Vercel Cron or has proper authorization
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const headersList = await headers()

  // Check for Vercel Cron authorization header
  const cronSecret = process.env.CRON_SECRET
  const authHeader = headersList.get('authorization')

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  // In development, allow unauthenticated requests
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // Check for admin API key
  const apiKey = headersList.get('x-api-key')
  const adminApiKey = process.env.ADMIN_API_KEY

  if (adminApiKey && apiKey === adminApiKey) {
    return true
  }

  return false
}

export async function POST(req: NextRequest) {
  try {
    // Check feature flag
    if (!featureFlags.enableTemporalIntelligence) {
      return NextResponse.json(
        { error: 'Temporal Intelligence is disabled' },
        { status: 503 }
      )
    }

    // Check authorization
    if (!(await isAuthorized(req))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse options from request body (if any)
    let options: { cleanup?: boolean; expire?: boolean } = {}
    try {
      const body = await req.json()
      options = body
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Run maintenance tasks first
    let cleanupResult = { deleted: 0 }
    let expireResult = { expired: 0 }

    if (options.cleanup !== false) {
      cleanupResult = await cleanupOldOutcomes(90) // Keep 90 days of outcomes
    }

    if (options.expire !== false) {
      expireResult = await expireOldCommitments(30) // Expire after 30 days
    }

    // Run the learning job
    const result = await runDailyLearning()

    return NextResponse.json({
      ...result,
      maintenance: {
        outcomesCleanedUp: cleanupResult.deleted,
        commitmentsExpired: expireResult.expired,
      },
    })
  } catch (error) {
    console.error('[Temporal API] Learning job error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check feature flag
    if (!featureFlags.enableTemporalIntelligence) {
      return NextResponse.json(
        { error: 'Temporal Intelligence is disabled' },
        { status: 503 }
      )
    }

    // Check authorization for stats
    if (!(await isAuthorized(req))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get learning statistics
    const stats = await getLearningStats()

    return NextResponse.json({
      stats,
      featureEnabled: true,
    })
  } catch (error) {
    console.error('[Temporal API] Stats error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
