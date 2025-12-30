import { NextRequest } from 'next/server'

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
 * curl -X POST https://app.osqr.app/api/cron/index-osqr \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  // Verify cron secret (support both header formats)
  const authHeader = req.headers.get('authorization')
  const cronSecretHeader = req.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET environment variable not configured')
    return Response.json({
      error: 'Server misconfigured',
      detail: 'CRON_SECRET not set',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }

  const providedSecret = cronSecretHeader || authHeader?.replace('Bearer ', '')
  if (providedSecret !== cronSecret) {
    console.warn('[Cron] Unauthorized access attempt')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate other required environment variables
  const missingEnvVars: string[] = []
  if (!process.env.DATABASE_URL) missingEnvVars.push('DATABASE_URL')
  if (!process.env.OPENAI_API_KEY) missingEnvVars.push('OPENAI_API_KEY')

  if (missingEnvVars.length > 0) {
    console.error(`[Cron] Missing required environment variables: ${missingEnvVars.join(', ')}`)
    return Response.json({
      error: 'Server misconfigured',
      detail: `Missing env vars: ${missingEnvVars.join(', ')}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }

  // Late import to catch module loading errors
  let prisma: typeof import('@/lib/db/prisma').prisma
  let processPendingTasks: typeof import('@/lib/tasks/executor').processPendingTasks

  try {
    const dbModule = await import('@/lib/db/prisma')
    prisma = dbModule.prisma
  } catch (importError) {
    console.error('[Cron] Failed to import prisma:', importError)
    return Response.json({
      error: 'Database module failed to load',
      detail: importError instanceof Error ? importError.message : 'Unknown import error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }

  try {
    const tasksModule = await import('@/lib/tasks/executor')
    processPendingTasks = tasksModule.processPendingTasks
  } catch (importError) {
    console.error('[Cron] Failed to import task executor:', importError)
    return Response.json({
      error: 'Task executor module failed to load',
      detail: importError instanceof Error ? importError.message : 'Unknown import error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }

  try {
    console.log('[Cron] Starting index-osqr job')
    // Recovery: Reset stuck tasks (running for >10 minutes) back to pending
    // This handles cases where Railway killed the process mid-task
    const stuckThreshold = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes
    const stuckRecovery = await prisma.backgroundTask.updateMany({
      where: {
        type: 'index-document',
        status: 'running',
        startedAt: { lt: stuckThreshold }
      },
      data: {
        status: 'pending',
        startedAt: null,
        error: 'Task was stuck and has been reset for retry',
        updatedAt: new Date()
      }
    })

    if (stuckRecovery.count > 0) {
      console.log(`[Cron] Recovered ${stuckRecovery.count} stuck tasks`)
    }

    // Get queue status (fast operation)
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

    // Fire-and-forget: Start processing in background, respond immediately
    // This prevents cron-job.org timeout (30s limit) while still processing docs
    // Process up to 5 docs per cron run - with 1-minute intervals this is ~300 docs/hour
    if (pending > 0 || running === 0) {
      // Don't await - let it run in background
      processPendingTasks(5).then(processed => {
        console.log(`[Cron] Processed ${processed} documents in background`)
      }).catch(err => {
        console.error('[Cron] Background processing error:', err)
      })
    }

    return Response.json({
      success: true,
      message: 'Processing started',
      queue: { pending, running, failed },
      recovered: stuckRecovery.count,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[Cron] Processing error:', errorMessage)
    if (errorStack) console.error('[Cron] Stack trace:', errorStack)

    return Response.json({
      error: errorMessage,
      detail: 'Database or task processing failed',
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime
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
    return Response.json({
      error: 'Server misconfigured',
      detail: 'CRON_SECRET not set',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }

  const providedSecret = cronSecretHeader || authHeader?.replace('Bearer ', '')
  if (providedSecret !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Late import prisma
  let prisma: typeof import('@/lib/db/prisma').prisma
  try {
    const dbModule = await import('@/lib/db/prisma')
    prisma = dbModule.prisma
  } catch (importError) {
    return Response.json({
      error: 'Database module failed to load',
      detail: importError instanceof Error ? importError.message : 'Unknown import error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Cron] Queue status error:', errorMessage)
    return Response.json({
      status: 'error',
      error: errorMessage,
      detail: 'Failed to query database',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
