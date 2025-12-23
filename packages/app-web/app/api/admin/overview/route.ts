import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getPlatformOverview, getEngagementTrends, getPlatformHealth } from '@/lib/admin/platform-metrics'

/**
 * GET /api/admin/overview
 *
 * Get platform overview metrics for admin dashboard
 */
export async function GET() {
  const { authorized, error } = await requireAdmin()
  if (!authorized) return error

  try {
    const [overview, trends, health] = await Promise.all([
      getPlatformOverview(),
      getEngagementTrends(14), // Last 2 weeks
      getPlatformHealth(),
    ])

    return NextResponse.json({
      overview,
      trends,
      health,
    })
  } catch (err) {
    console.error('Admin overview error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch overview' },
      { status: 500 }
    )
  }
}
