import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const challenge = await prisma.challenge.findUnique({
      where: { id },
    })

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Check if user already responded
    const userResponse = await prisma.challengeResponse.findUnique({
      where: {
        challengeId_labMemberId: {
          challengeId: id,
          labMemberId: member.id,
        },
      },
    })

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        promptToTry: challenge.promptToTry,
        compareMode: challenge.compareMode,
        modesCompare: challenge.modesCompare,
        questions: challenge.questions,
        estimatedMinutes: challenge.estimatedMinutes,
        pointsReward: challenge.pointsReward,
      },
      userResponse: userResponse
        ? {
            id: userResponse.id,
            answers: userResponse.answers,
            preferredMode: userResponse.preferredMode,
            comparisonNotes: userResponse.comparisonNotes,
            createdAt: userResponse.createdAt.toISOString(),
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching challenge:', error)
    return NextResponse.json(
      { error: 'Failed to fetch challenge' },
      { status: 500 }
    )
  }
}
