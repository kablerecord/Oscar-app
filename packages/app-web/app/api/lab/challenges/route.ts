import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const member = await prisma.labMember.findUnique({
      where: { userId: session.user.id },
    })

    if (!member) {
      return NextResponse.json({ error: 'Not a lab member' }, { status: 404 })
    }

    // Get active challenges
    const activeChallenges = await prisma.challenge.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { targetTier: null },
          { targetTier: member.tier },
        ],
      },
      orderBy: { publishedAt: 'desc' },
    })

    // Get member's completed challenges
    const completedResponses = await prisma.challengeResponse.findMany({
      where: { labMemberId: member.id },
      select: {
        challengeId: true,
        createdAt: true,
      },
    })

    const completedIds = new Set(completedResponses.map((r) => r.challengeId))

    // Format active challenges, checking prerequisites
    const active = activeChallenges
      .filter((c) => !completedIds.has(c.id))
      .map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        estimatedMinutes: c.estimatedMinutes,
        pointsReward: c.pointsReward,
        compareMode: c.compareMode,
        prerequisiteCompleted: !c.prerequisiteId || completedIds.has(c.prerequisiteId),
      }))

    const completed = completedResponses.map((r) => ({
      challengeId: r.challengeId,
      completedAt: r.createdAt.toISOString(),
    }))

    // Get upcoming challenges (paused, targeting higher tiers)
    const upcoming = await prisma.challenge.findMany({
      where: {
        status: { in: ['PAUSED', 'DRAFT'] },
        publishedAt: { not: null },
      },
      take: 3,
      orderBy: { publishedAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        estimatedMinutes: true,
        pointsReward: true,
        compareMode: true,
      },
    })

    return NextResponse.json({
      active,
      completed,
      upcoming: upcoming.map((c) => ({
        ...c,
        prerequisiteCompleted: true,
      })),
    })
  } catch (error) {
    console.error('Error fetching challenges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    )
  }
}
