import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getPlatformHealth } from '@/lib/admin/platform-metrics'

/**
 * GET /api/admin/health
 *
 * Get platform health status
 */
export async function GET() {
  const { authorized, error } = await requireAdmin()
  if (!authorized) return error

  try {
    const health = await getPlatformHealth()

    return NextResponse.json(health)
  } catch (err) {
    console.error('Admin health error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch health status' },
      { status: 500 }
    )
  }
}
