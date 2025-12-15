import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import {
  getEngagementTrends,
  getCognitiveProfileDistribution,
  getFeatureUsageMetrics,
  getResponseModeDistribution,
  getSurpriseAggregates,
} from '@/lib/admin/platform-metrics'
import { z } from 'zod'

const QuerySchema = z.object({
  days: z.coerce.number().min(7).max(90).default(30),
})

/**
 * GET /api/admin/analytics
 *
 * Get analytics data for admin dashboard charts
 */
export async function GET(req: NextRequest) {
  const { authorized, error } = await requireAdmin()
  if (!authorized) return error

  try {
    const { searchParams } = new URL(req.url)
    const { days } = QuerySchema.parse({
      days: searchParams.get('days'),
    })

    const [
      engagementTrends,
      cognitiveProfiles,
      featureUsage,
      responseModes,
      surpriseAggregates,
    ] = await Promise.all([
      getEngagementTrends(days),
      getCognitiveProfileDistribution(),
      getFeatureUsageMetrics(),
      getResponseModeDistribution(),
      getSurpriseAggregates(),
    ])

    return NextResponse.json({
      engagementTrends,
      cognitiveProfiles,
      featureUsage,
      responseModes,
      surpriseAggregates,
    })
  } catch (err) {
    console.error('Admin analytics error:', err)

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: err.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
