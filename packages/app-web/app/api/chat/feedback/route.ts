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

    const { messageId, workspaceId, feedback, comment } = await req.json()

    // Must have at least messageId and workspaceId, plus either feedback or comment
    if (!messageId || !workspaceId || (!feedback && !comment)) {
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

    // Get existing metadata to merge with new feedback
    const existingMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { metadata: true },
    })

    const existingMetadata = (existingMessage?.metadata as Record<string, unknown>) || {}

    // Update message metadata with feedback and/or comment
    const message = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        metadata: {
          ...existingMetadata,
          ...(feedback && { feedback, feedbackAt: new Date().toISOString() }),
          ...(comment && {
            comment,
            commentAt: new Date().toISOString(),
            // Keep history of comments if multiple are submitted
            commentHistory: [
              ...((existingMetadata.commentHistory as string[]) || []),
              { text: comment, at: new Date().toISOString() }
            ]
          }),
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
