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

    const challenges = await prisma.challenge.findMany({
      include: {
        _count: {
          select: { responses: true },
        },
        responses: {
          select: {
            timeSpentSeconds: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formattedChallenges = challenges.map((c) => {
      const avgTime = c.responses.length > 0
        ? c.responses.reduce((sum, r) => sum + (r.timeSpentSeconds || 0), 0) / c.responses.length
        : 0

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        status: c.status,
        compareMode: c.compareMode,
        estimatedMinutes: c.estimatedMinutes,
        pointsReward: c.pointsReward,
        responseCount: c._count.responses,
        targetResponses: 100, // Placeholder
        avgCompletionTime: Math.round(avgTime),
        createdAt: c.createdAt.toISOString(),
        publishedAt: c.publishedAt?.toISOString(),
      }
    })

    return NextResponse.json({ challenges: formattedChallenges })
  } catch (error) {
    console.error('Error fetching challenges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      description,
      category,
      promptToTry,
      compareMode,
      modesCompare,
      questions,
      targetTier,
      estimatedMinutes,
      pointsReward,
      status,
    } = body

    if (!title || !description || !category || !questions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const challenge = await prisma.challenge.create({
      data: {
        title,
        description,
        category,
        promptToTry,
        compareMode: compareMode || false,
        modesCompare: modesCompare || [],
        questions,
        targetTier,
        targetModes: [],
        estimatedMinutes: estimatedMinutes || 5,
        pointsReward: pointsReward || 10,
        status: status || 'DRAFT',
        publishedAt: status === 'ACTIVE' ? new Date() : null,
      },
    })

    return NextResponse.json({ success: true, challenge })
  } catch (error) {
    console.error('Error creating challenge:', error)
    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    )
  }
}
