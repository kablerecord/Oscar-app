import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

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

    const form = await prisma.deepDiveForm.findUnique({
      where: { id },
    })

    if (!form) {
      return NextResponse.json({ error: 'Deep dive form not found' }, { status: 404 })
    }

    // Check if already submitted
    const existingResponse = await prisma.deepDiveResponse.findFirst({
      where: {
        formId: id,
        labMemberId: member.id,
      },
    })

    if (existingResponse) {
      return NextResponse.json(
        { error: 'Already submitted response for this deep dive' },
        { status: 400 }
      )
    }

    const { answers } = await req.json()

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Answers are required' }, { status: 400 })
    }

    // Create the response
    await prisma.deepDiveResponse.create({
      data: {
        formId: id,
        labMemberId: member.id,
        answers,
      },
    })

    // Update member stats
    const pointsEarned = form.pointsReward

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
    console.error('Error submitting deep dive:', error)
    return NextResponse.json(
      { error: 'Failed to submit deep dive' },
      { status: 500 }
    )
  }
}
