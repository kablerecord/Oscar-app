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
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (category) where.category = category

    const [insights, total] = await Promise.all([
      prisma.labInsight.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.labInsight.count({ where }),
    ])

    return NextResponse.json({
      insights: insights.map((i) => ({
        id: i.id,
        category: i.category,
        subcategory: i.subcategory,
        title: i.title,
        summary: i.summary,
        sampleSize: i.sampleSize,
        sentiment: i.sentiment,
        confidence: i.confidence,
        sourceReactions: i.sourceReactions,
        sourceChallenges: i.sourceChallenges,
        sourceDeepDives: i.sourceDeepDives,
        status: i.status,
        actionTaken: i.actionTaken,
        periodStart: i.periodStart.toISOString(),
        periodEnd: i.periodEnd.toISOString(),
        createdAt: i.createdAt.toISOString(),
      })),
      total,
    })
  } catch (error) {
    console.error('Error fetching insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}
