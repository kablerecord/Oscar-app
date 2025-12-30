import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already a member
    const existingMember = await prisma.labMember.findUnique({
      where: { userId: session.user.id },
    })

    if (existingMember) {
      return NextResponse.json({
        success: true,
        member: {
          id: existingMember.id,
          tier: existingMember.tier,
          feedbackScore: existingMember.feedbackScore,
          challengesCompleted: existingMember.challengesCompleted,
        },
        message: 'Already a member',
      })
    }

    // Create new member
    const member = await prisma.labMember.create({
      data: {
        userId: session.user.id,
        tier: 'EXPLORER',
        lastActiveAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        tier: member.tier,
        feedbackScore: member.feedbackScore,
        challengesCompleted: member.challengesCompleted,
      },
    })
  } catch (error) {
    console.error('Error joining lab:', error)
    return NextResponse.json(
      { error: 'Failed to join lab' },
      { status: 500 }
    )
  }
}
