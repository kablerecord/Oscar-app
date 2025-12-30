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
      include: {
        _count: {
          select: {
            quickReactions: true,
            challengeResponses: true,
            deepDiveResponses: true,
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Not a lab member' }, { status: 404 })
    }

    // Count insights influenced (where member's feedback contributed)
    const insightsInfluenced = await prisma.labInsight.count({
      where: {
        status: { in: ['RESOLVED', 'IN_PROGRESS'] },
        // In a real implementation, we'd track which members contributed to each insight
        // For now, just use a placeholder
      },
    })

    return NextResponse.json({
      member: {
        id: member.id,
        tier: member.tier,
        feedbackScore: member.feedbackScore,
        challengesCompleted: member.challengesCompleted,
        streakDays: member.streakDays,
        joinedAt: member.joinedAt.toISOString(),
        lastActiveAt: member.lastActiveAt?.toISOString() || null,
      },
      impact: {
        totalReactions: member._count.quickReactions,
        challengesCompleted: member._count.challengeResponses,
        deepDivesSubmitted: member._count.deepDiveResponses,
        insightsInfluenced,
      },
      preferences: {
        weeklyDigest: member.weeklyDigest,
        challengeReminders: member.challengeReminders,
      },
    })
  } catch (error) {
    console.error('Error fetching member:', error)
    return NextResponse.json(
      { error: 'Failed to fetch member' },
      { status: 500 }
    )
  }
}
