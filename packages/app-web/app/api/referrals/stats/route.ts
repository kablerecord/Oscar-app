import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getReferralStats, getReferralList } from '@/lib/referrals/service'
import { getMonthlyTokenLimit } from '@/lib/tiers/config'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/referrals/stats
 * Get referral statistics for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getReferralStats(session.user.id)
    const { referrals } = await getReferralList(session.user.id)

    // Get user's tier to calculate effective token limit
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        workspaces: {
          select: { tier: true },
          take: 1,
        },
      },
    })

    const tier = (user?.workspaces[0]?.tier || 'pro') as 'lite' | 'pro' | 'master'
    const baseTokenLimit = getMonthlyTokenLimit(tier)
    const effectiveTokenLimit = Math.floor(baseTokenLimit * stats.effectiveTokenBonus)

    return NextResponse.json({
      ...stats,
      baseTokenLimit,
      effectiveTokenLimit,
      referrals: referrals.map(r => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        convertedAt: r.convertedAt?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch referral stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referral stats' },
      { status: 500 }
    )
  }
}
