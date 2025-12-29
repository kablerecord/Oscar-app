import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
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

    // Get all data in a single query for efficiency and consistency
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        referralCode: true,
        referralBonusPercent: true,
        workspaces: {
          select: { tier: true },
          take: 1,
        },
        referralsMade: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            convertedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate stats from the data
    const referrals = user.referralsMade || []
    const pendingReferrals = referrals.filter(r => r.status === 'PENDING').length
    const convertedReferrals = referrals.filter(r => r.status === 'CONVERTED').length
    const expiredReferrals = referrals.filter(r => r.status === 'EXPIRED').length
    const currentBonusPercent = user.referralBonusPercent || 0
    const effectiveTokenBonus = 1 + currentBonusPercent / 100

    // Get tier and calculate token limits
    const tier = (user.workspaces[0]?.tier || 'pro') as 'lite' | 'pro' | 'master'
    const baseTokenLimit = getMonthlyTokenLimit(tier)
    const effectiveTokenLimit = Math.floor(baseTokenLimit * effectiveTokenBonus)

    return NextResponse.json({
      referralCode: user.referralCode,
      totalReferrals: referrals.length,
      pendingReferrals,
      convertedReferrals,
      expiredReferrals,
      currentBonusPercent,
      maxBonusPercent: 50,
      effectiveTokenBonus,
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
    // Include more detail for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch referral stats', details: errorMessage },
      { status: 500 }
    )
  }
}
