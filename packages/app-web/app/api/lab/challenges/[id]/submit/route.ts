import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { checkTierProgression } from '@/lib/lab/tiers'

export async function POST(
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

    // Check if already submitted
    const existingResponse = await prisma.challengeResponse.findUnique({
      where: {
        challengeId_labMemberId: {
          challengeId: id,
          labMemberId: member.id,
        },
      },
    })

    if (existingResponse) {
      return NextResponse.json(
        { error: 'Already submitted response for this challenge' },
        { status: 400 }
      )
    }

    const { answers, preferredMode, comparisonNotes, threadId, timeSpentSeconds } =
      await req.json()

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Answers are required' }, { status: 400 })
    }

    // Create the response
    await prisma.challengeResponse.create({
      data: {
        challengeId: id,
        labMemberId: member.id,
        answers,
        preferredMode,
        comparisonNotes,
        threadId,
        timeSpentSeconds,
      },
    })

    // Update member stats
    const pointsEarned = challenge.pointsReward

    const updatedMember = await prisma.labMember.update({
      where: { id: member.id },
      data: {
        feedbackScore: { increment: pointsEarned },
        challengesCompleted: { increment: 1 },
        lastActiveAt: new Date(),
      },
    })

    // Check for tier progression
    const tierProgression = await checkTierProgression(updatedMember)

    // Get next challenge recommendation
    const nextChallenge = await prisma.challenge.findFirst({
      where: {
        status: 'ACTIVE',
        id: { not: id },
        responses: {
          none: {
            labMemberId: member.id,
          },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        estimatedMinutes: true,
        pointsReward: true,
      },
    })

    return NextResponse.json({
      success: true,
      pointsEarned,
      newScore: updatedMember.feedbackScore,
      newTier: tierProgression?.newTier,
      nextChallenge,
    })
  } catch (error) {
    console.error('Error submitting challenge:', error)
    return NextResponse.json(
      { error: 'Failed to submit challenge' },
      { status: 500 }
    )
  }
}
