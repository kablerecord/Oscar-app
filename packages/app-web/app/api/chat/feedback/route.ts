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

    const { messageId, workspaceId, feedback } = await req.json()

    if (!messageId || !workspaceId || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify workspace ownership
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId: session.user.id },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Update message metadata with feedback
    const message = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        metadata: {
          feedback,
          feedbackAt: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Error saving feedback:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}
