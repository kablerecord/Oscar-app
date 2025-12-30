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

    // Get insights that were resolved (where feedback led to action)
    // In a real implementation, we'd track which members contributed to each insight
    const insights = await prisma.labInsight.findMany({
      where: {
        status: { in: ['RESOLVED', 'IN_PROGRESS'] },
      },
      orderBy: { resolvedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        actionTaken: true,
      },
    })

    // Calculate total contributions
    const totalContributions =
      member._count.quickReactions +
      member._count.challengeResponses +
      member._count.deepDiveResponses

    return NextResponse.json({
      totalContributions,
      insightsInfluenced: insights.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        actionTaken: i.actionTaken || undefined,
      })),
      // These would be populated by tracking actual feature releases linked to feedback
      featuresInfluenced: [],
    })
  } catch (error) {
    console.error('Error fetching impact:', error)
    return NextResponse.json(
      { error: 'Failed to fetch impact' },
      { status: 500 }
    )
  }
}
