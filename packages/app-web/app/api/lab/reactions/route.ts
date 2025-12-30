import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { POINTS } from '@/lib/lab/types'

export async function POST(req: NextRequest) {
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

    const {
      messageId,
      threadId,
      reaction,
      category,
      comment,
      responseMode,
      modelUsed,
      hadPanelDiscussion,
      retrievalUsed,
    } = await req.json()

    if (!reaction) {
      return NextResponse.json({ error: 'Reaction is required' }, { status: 400 })
    }

    // Validate reaction type
    const validReactions = ['THUMBS_UP', 'THUMBS_DOWN', 'MISSED_SOMETHING', 'UNEXPECTED_GOOD', 'WRONG_MODE']
    if (!validReactions.includes(reaction)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 })
    }

    // Create the reaction
    await prisma.quickReaction.create({
      data: {
        labMemberId: member.id,
        messageId,
        threadId,
        reaction,
        category,
        comment,
        responseMode,
        modelUsed,
        hadPanelDiscussion: hadPanelDiscussion || false,
        retrievalUsed: retrievalUsed || false,
      },
    })

    // Calculate points earned
    const pointsEarned = comment ? POINTS.QUICK_REACTION_WITH_COMMENT : POINTS.QUICK_REACTION

    // Update member score and last active
    const updatedMember = await prisma.labMember.update({
      where: { id: member.id },
      data: {
        feedbackScore: { increment: pointsEarned },
        lastActiveAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      pointsEarned,
      newScore: updatedMember.feedbackScore,
    })
  } catch (error) {
    console.error('Error creating reaction:', error)
    return NextResponse.json(
      { error: 'Failed to create reaction' },
      { status: 500 }
    )
  }
}

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

    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get('messageId')

    if (messageId) {
      // Get reaction for specific message
      const reaction = await prisma.quickReaction.findFirst({
        where: {
          labMemberId: member.id,
          messageId,
        },
      })
      return NextResponse.json({ reaction })
    }

    // Get recent reactions
    const reactions = await prisma.quickReaction.findMany({
      where: { labMemberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ reactions })
  } catch (error) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    )
  }
}
