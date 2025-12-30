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

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Get top members by feedback score
    const topMembers = await prisma.labMember.findMany({
      orderBy: { feedbackScore: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    // Get current user's rank if they're a member
    const member = await prisma.labMember.findUnique({
      where: { userId: session.user.id },
    })

    let userRank: number | null = null
    if (member) {
      const higherScoreCount = await prisma.labMember.count({
        where: {
          feedbackScore: { gt: member.feedbackScore },
        },
      })
      userRank = higherScoreCount + 1
    }

    const leaders = topMembers.map((m, index) => ({
      rank: index + 1,
      name: m.user.name?.split(' ')[0] || 'Anonymous', // First name only
      tier: m.tier,
      score: m.feedbackScore,
      streakDays: m.streakDays,
    }))

    return NextResponse.json({ leaders, userRank })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
