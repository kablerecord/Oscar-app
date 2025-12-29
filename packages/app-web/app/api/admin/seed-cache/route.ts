/**
 * Admin API: Seed Global Cache
 *
 * POST /api/admin/seed-cache
 *
 * Seeds the answer cache with OSQR-specific questions.
 * Requires admin authentication in production.
 *
 * @see docs/builds/DEPTH_AWARE_INTELLIGENCE_BUILD.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { seedGlobalCache, getGlobalCacheStats, reviewGlobalCache } from '@/lib/depth-aware'

export async function POST(req: NextRequest) {
  // Check authentication
  const session = await getServerSession()
  const isDev = process.env.NODE_ENV === 'development'

  if (!isDev && !session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // In production, check for admin role (TODO: implement admin check)
  // For now, allow in dev mode

  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'seed'

    if (action === 'seed') {
      const result = await seedGlobalCache()
      return NextResponse.json({
        success: true,
        action: 'seed',
        ...result,
      })
    }

    if (action === 'stats') {
      const stats = await getGlobalCacheStats()
      return NextResponse.json({
        success: true,
        action: 'stats',
        ...stats,
      })
    }

    if (action === 'review') {
      const review = await reviewGlobalCache()
      return NextResponse.json({
        success: true,
        action: 'review',
        ...review,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Admin] Seed cache error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  // Check authentication
  const session = await getServerSession()
  const isDev = process.env.NODE_ENV === 'development'

  if (!isDev && !session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getGlobalCacheStats()
    return NextResponse.json({
      success: true,
      ...stats,
    })
  } catch (error) {
    console.error('[Admin] Get cache stats error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
