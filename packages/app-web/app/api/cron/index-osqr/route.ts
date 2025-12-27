import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { processPendingTasks } from '@/lib/tasks/executor'

/**
 * Background Indexing Cron Endpoint
 *
 * Processes pending document indexing tasks from the queue.
 * Should be called by an external cron service every 30-60 seconds.
 *
 * This ensures documents get indexed even when users close their browsers.
 *
 * Security: Protected by CRON_SECRET bearer token
 *
 * Usage:
 * curl -X POST https://app.osqr.ai/api/cron/index-osqr \
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

  const startTime = Date.now()

  try {
    // Process up to 10 tasks per cron run
    // With 1-minute intervals from cron-job.org, smaller batches work well
    // Each document takes ~2-5 seconds, so 10 docs ≈ 20-50 seconds
    const processed = await processPendingTasks(10)

    // Get queue status for logging
    const [pending, running, failed] = await Promise.all([
      prisma.backgroundTask.count({
        where: { type: 'index-document', status: 'pending' }
      }),
      prisma.backgroundTask.count({
        where: { type: 'index-document', status: 'running' }
      }),
      prisma.backgroundTask.count({
        where: { type: 'index-document', status: 'failed' }
      })
    ])

    const duration = Date.now() - startTime

    return Response.json({
      success: true,
      processed,
      duration: `${duration}ms`,
      queue: { pending, running, failed },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cron processing error:', error)
    return Response.json({
      error: error instanceof Error ? error.message : 'Processing failed',
      duration: `${Date.now() - startTime}ms`
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
    // Get comprehensive queue statistics
    const [pending, running, completed, failed] = await Promise.all([
      prisma.backgroundTask.count({
        where: { type: 'index-document', status: 'pending' }
      }),
      prisma.backgroundTask.count({
        where: { type: 'index-document', status: 'running' }
      }),
      prisma.backgroundTask.count({
        where: { type: 'index-document', status: 'completed' }
      }),
      prisma.backgroundTask.count({
        where: { type: 'index-document', status: 'failed' }
      })
    ])

    // Get recent failed tasks for debugging
    const recentFailed = await prisma.backgroundTask.findMany({
      where: { type: 'index-document', status: 'failed' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        error: true,
        retries: true,
        updatedAt: true,
        payload: true
      }
    })

    // Get stuck tasks (running for too long)
    const stuckThreshold = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes
    const stuckTasks = await prisma.backgroundTask.count({
      where: {
        type: 'index-document',
        status: 'running',
        startedAt: { lt: stuckThreshold }
      }
    })

    return Response.json({
      status: 'healthy',
      queue: {
        pending,
        running,
        completed,
        failed,
        stuck: stuckTasks
      },
      recentFailures: recentFailed.map(t => ({
        id: t.id,
        error: t.error,
        retries: t.retries,
        documentId: (t.payload as { documentId?: string })?.documentId,
        failedAt: t.updatedAt
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Queue status error:', error)
    return Response.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to get status'
    }, { status: 500 })
  }
}
