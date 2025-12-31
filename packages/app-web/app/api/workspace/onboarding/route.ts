import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, completed, userName, workingOn } = await request.json()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    // Verify the user owns this workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        ownerId: session.user.id,
      },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found or unauthorized' }, { status: 404 })
    }

    // Update onboarding status
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        onboardingCompleted: completed,
        onboardingCompletedAt: completed ? new Date() : null,
      },
    })

    // Update user's name if provided
    if (userName) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: userName },
      })
    }

    // Save "workingOn" context as a user setting
    if (workingOn) {
      await prisma.userSetting.upsert({
        where: {
          userId_key: {
            userId: session.user.id,
            key: 'onboarding_working_on',
          },
        },
        update: { value: { text: workingOn, updatedAt: new Date().toISOString() } },
        create: {
          userId: session.user.id,
          key: 'onboarding_working_on',
          value: { text: workingOn, updatedAt: new Date().toISOString() },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating onboarding status:', error)
    return NextResponse.json({ error: 'Failed to update onboarding status' }, { status: 500 })
  }
}
