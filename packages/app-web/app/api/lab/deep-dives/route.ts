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

    // Get active deep dive forms
    const forms = await prisma.deepDiveForm.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { targetTier: null },
          { targetTier: member.tier },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get member's completed deep dives
    const completedResponses = await prisma.deepDiveResponse.findMany({
      where: { labMemberId: member.id },
      select: {
        formId: true,
        createdAt: true,
      },
    })

    const completedIds = new Set(completedResponses.map((r) => r.formId))

    const available = forms
      .filter((f) => !completedIds.has(f.id))
      .map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        category: f.category,
        estimatedMinutes: f.estimatedMinutes,
        pointsReward: f.pointsReward,
      }))

    const completed = completedResponses.map((r) => ({
      formId: r.formId,
      completedAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ available, completed })
  } catch (error) {
    console.error('Error fetching deep dives:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deep dives' },
      { status: 500 }
    )
  }
}
