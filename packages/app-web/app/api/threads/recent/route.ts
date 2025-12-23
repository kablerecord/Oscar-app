import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const QuerySchema = z.object({
  workspaceId: z.string(),
  limit: z.coerce.number().min(1).max(50).default(10),
})

/**
 * GET /api/threads/recent
 *
 * Returns the most recent conversation messages for a workspace.
 * Used to restore chat history when user returns to the page.
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication (with dev bypass)
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const { workspaceId, limit } = QuerySchema.parse({
      workspaceId: searchParams.get('workspaceId'),
      limit: searchParams.get('limit'),
    })

    // Get the most recent thread
    const recentThread = await prisma.chatThread.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: limit,
        },
      },
    })

    if (!recentThread) {
      return NextResponse.json({ messages: [] })
    }

    // Transform messages for frontend
    const messages = recentThread.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
      metadata: msg.metadata,
    }))

    return NextResponse.json({
      threadId: recentThread.id,
      messages,
    })

  } catch (error) {
    console.error('Recent threads error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
