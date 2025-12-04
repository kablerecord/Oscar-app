import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getUserUsageStats, RATE_LIMITS } from '@/lib/security'

/**
 * GET /api/usage
 * Returns current user's usage statistics and limits
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view usage' },
        { status: 401 }
      )
    }

    const userId = session.user.id || session.user.email
    const tier = 'free' // TODO: Get from user profile/subscription

    // Get usage stats
    const usage = await getUserUsageStats(userId)

    // Get limits for user's tier
    const limits = RATE_LIMITS[tier]

    return NextResponse.json({
      tier,
      usage,
      limits: {
        requestsPerMinute: limits.requestsPerMinute,
        requestsPerDay: limits.requestsPerDay,
        endpoints: limits.endpointLimits,
      },
    })
  } catch (error) {
    console.error('Usage API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
