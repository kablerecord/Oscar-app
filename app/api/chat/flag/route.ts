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

    const { messageId, workspaceId, flagged } = await req.json()

    if (!messageId || !workspaceId) {
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

    // Get existing metadata
    const existingMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { metadata: true },
    })

    const existingMetadata = (existingMessage?.metadata as Record<string, unknown>) || {}

    // Update message metadata with flag
    const message = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        metadata: {
          ...existingMetadata,
          flagged,
          flaggedAt: flagged ? new Date().toISOString() : null,
          flaggedBy: flagged ? session.user.id : null,
        },
      },
    })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Error flagging message:', error)
    return NextResponse.json(
      { error: 'Failed to flag message' },
      { status: 500 }
    )
  }
}
