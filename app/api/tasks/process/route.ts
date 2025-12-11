import { NextRequest, NextResponse } from 'next/server'
import { processPendingTasks } from '@/lib/tasks/executor'

/**
 * POST /api/tasks/process - Process pending background tasks
 *
 * This endpoint should be called by:
 * - A cron job (Vercel Cron, Railway, etc.)
 * - A webhook trigger
 * - Manual invocation for testing
 *
 * Security: Uses a secret token to prevent unauthorized access
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // In development, allow without auth
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev) {
      if (!cronSecret) {
        console.error('CRON_SECRET not configured')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Process up to 5 tasks per invocation
    const processed = await processPendingTasks(5)

    return NextResponse.json({
      processed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Task processing error:', error)

    return NextResponse.json(
      { error: 'Processing failed', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tasks/process - Health check for task processor
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Task processor endpoint. POST to process pending tasks.',
  })
}
