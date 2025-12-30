import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { weeklyDigest, challengeReminders } = await req.json()

    const member = await prisma.labMember.findUnique({
      where: { userId: session.user.id },
    })

    if (!member) {
      return NextResponse.json({ error: 'Not a lab member' }, { status: 404 })
    }

    const updateData: { weeklyDigest?: boolean; challengeReminders?: boolean } = {}
    if (typeof weeklyDigest === 'boolean') updateData.weeklyDigest = weeklyDigest
    if (typeof challengeReminders === 'boolean') updateData.challengeReminders = challengeReminders

    await prisma.labMember.update({
      where: { id: member.id },
      data: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
