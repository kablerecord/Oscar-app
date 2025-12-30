import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

const ADMIN_EMAILS = ['admin@osqr.ai', 'kablerecord@gmail.com']

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tier = searchParams.get('tier')
    const sort = searchParams.get('sort') || 'feedbackScore'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}
    if (tier) where.tier = tier

    const orderBy: Record<string, string> = {}
    orderBy[sort] = 'desc'

    const [members, total] = await Promise.all([
      prisma.labMember.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
          _count: {
            select: {
              quickReactions: true,
              challengeResponses: true,
              deepDiveResponses: true,
            },
          },
        },
      }),
      prisma.labMember.count({ where }),
    ])

    const formattedMembers = members.map((m) => ({
      id: m.id,
      tier: m.tier,
      feedbackScore: m.feedbackScore,
      challengesCompleted: m.challengesCompleted,
      streakDays: m.streakDays,
      joinedAt: m.joinedAt.toISOString(),
      lastActiveAt: m.lastActiveAt?.toISOString(),
      user: {
        email: m.user.email,
        name: m.user.name,
      },
      activity: {
        reactions: m._count.quickReactions,
        challenges: m._count.challengeResponses,
        deepDives: m._count.deepDiveResponses,
      },
    }))

    return NextResponse.json({ members: formattedMembers, total })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
