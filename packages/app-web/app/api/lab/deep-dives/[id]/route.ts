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

    const form = await prisma.deepDiveForm.findUnique({
      where: { id },
    })

    if (!form) {
      return NextResponse.json({ error: 'Deep dive form not found' }, { status: 404 })
    }

    // Check if user already responded
    const userResponse = await prisma.deepDiveResponse.findFirst({
      where: {
        formId: id,
        labMemberId: member.id,
      },
    })

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        category: form.category,
        sections: form.sections,
        estimatedMinutes: form.estimatedMinutes,
        pointsReward: form.pointsReward,
      },
      userResponse: userResponse
        ? {
            id: userResponse.id,
            answers: userResponse.answers,
            createdAt: userResponse.createdAt.toISOString(),
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching deep dive:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deep dive' },
      { status: 500 }
    )
  }
}
