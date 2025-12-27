import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { runBatchReflection } from '@/lib/uip/reflection'

/**
 * UIP Reflection Cron Endpoint
 *
 * Processes pending UIP signals and updates dimension scores for all eligible profiles.
 * Should be called by an external cron service every 30-60 minutes (or daily at 3 AM).
 *
 * Per the UIP spec, reflection is triggered by:
 * - Daily synthesis (3:00 AM user-local time)
 * - Session close (after 10+ min session) - handled in-request
 * - Decision cluster (3+ decisions in session) - handled in-request
 *
 * This cron handles the daily synthesis trigger for all profiles.
 *
 * Security: Protected by CRON_SECRET bearer token
 *
 * Usage:
 * curl -X POST https://app.osqr.ai/api/cron/uip-reflection \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

export async function POST(req: NextRequest) {
  // Verify cron secret (support both header formats)
  const authHeader = req.headers.get('authorization')
  const cronSecretHeader = req.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const providedSecret = cronSecretHeader || authHeader?.replace('Bearer ', '')
  if (providedSecret !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get queue status first (fast operation)
    const [profilesWithSignals, recentReflections] = await Promise.all([
      prisma.userIntelligenceProfile.count({
        where: {
          privacyTier: { in: ['B', 'C'] },
          signals: { some: { processed: false } },
        }
      }),
      prisma.userIntelligenceProfile.count({
        where: {
          lastReflectionAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } // Last 6 hours
        }
      })
    ])

    console.log(`[UIP Cron] Found ${profilesWithSignals} profiles with unprocessed signals`)

    // Fire-and-forget: Start processing in background, respond immediately
    // Process up to 50 profiles per cron run
    if (profilesWithSignals > 0) {
      runBatchReflection(50).then(stats => {
        console.log(`[UIP Cron] Batch reflection complete:`, stats)
      }).catch(err => {
        console.error('[UIP Cron] Batch reflection error:', err)
      })
    }

    return Response.json({
      success: true,
      message: 'UIP reflection started',
      queue: {
        profilesWithSignals,
        recentReflections,
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('UIP cron processing error:', error)
    return Response.json({
      error: error instanceof Error ? error.message : 'Processing failed'
    }, { status: 500 })
  }
}

/**
 * GET endpoint for health checks and queue status
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecretHeader = req.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const providedSecret = cronSecretHeader || authHeader?.replace('Bearer ', '')
  if (providedSecret !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get comprehensive UIP statistics
    const [
      totalProfiles,
      tierBProfiles,
      tierCProfiles,
      profilesWithSignals,
      totalUnprocessedSignals,
      recentReflections,
      profilesNeverReflected
    ] = await Promise.all([
      prisma.userIntelligenceProfile.count(),
      prisma.userIntelligenceProfile.count({ where: { privacyTier: 'B' } }),
      prisma.userIntelligenceProfile.count({ where: { privacyTier: 'C' } }),
      prisma.userIntelligenceProfile.count({
        where: { signals: { some: { processed: false } } }
      }),
      prisma.uIPSignal.count({ where: { processed: false } }),
      prisma.userIntelligenceProfile.count({
        where: { lastReflectionAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      }),
      prisma.userIntelligenceProfile.count({
        where: { lastReflectionAt: null }
      })
    ])

    // Get profiles that need reflection (scheduled time passed)
    const needsReflection = await prisma.userIntelligenceProfile.count({
      where: {
        privacyTier: { in: ['B', 'C'] },
        OR: [
          { nextReflectionAt: { lte: new Date() } },
          { signals: { some: { processed: false } } }
        ]
      }
    })

    // Get dimension score distribution
    const dimensionStats = await prisma.uIPDimensionScore.groupBy({
      by: ['domain'],
      _avg: { confidence: true },
      _count: { id: true }
    })

    return Response.json({
      status: 'healthy',
      profiles: {
        total: totalProfiles,
        tierB: tierBProfiles,
        tierC: tierCProfiles,
        withUnprocessedSignals: profilesWithSignals,
        needsReflection,
        neverReflected: profilesNeverReflected,
        reflectedLast24h: recentReflections
      },
      signals: {
        unprocessed: totalUnprocessedSignals
      },
      dimensions: dimensionStats.map(d => ({
        domain: d.domain,
        count: d._count.id,
        avgConfidence: d._avg.confidence?.toFixed(2)
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('UIP status error:', error)
    return Response.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to get status'
    }, { status: 500 })
  }
}
