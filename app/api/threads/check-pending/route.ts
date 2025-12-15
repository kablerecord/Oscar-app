import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const QuerySchema = z.object({
  workspaceId: z.string(),
  question: z.string(),
})

/**
 * GET /api/threads/check-pending
 *
 * Checks if a pending question has received an answer.
 * Used when user returns to page after leaving mid-request.
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
    const { workspaceId, question } = QuerySchema.parse({
      workspaceId: searchParams.get('workspaceId'),
      question: searchParams.get('question'),
    })

    // Look for a thread with this question from the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    // Find threads created recently with a matching user message
    const thread = await prisma.chatThread.findFirst({
      where: {
        workspaceId,
        createdAt: { gte: tenMinutesAgo },
        messages: {
          some: {
            role: 'user',
            content: question,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!thread) {
      return NextResponse.json({ found: false })
    }

    // Find the answer (assistant message after the user's question)
    const userMsgIdx = thread.messages.findIndex(
      m => m.role === 'user' && m.content === question
    )

    if (userMsgIdx === -1) {
      return NextResponse.json({ found: false })
    }

    // Look for the next assistant message
    const answerMsg = thread.messages.find(
      (m, idx) => idx > userMsgIdx && m.role === 'assistant'
    )

    if (!answerMsg) {
      // Question found but no answer yet (request still processing)
      return NextResponse.json({ found: true, answer: null, processing: true })
    }

    return NextResponse.json({
      found: true,
      answer: answerMsg.content,
      threadId: thread.id,
      messageId: answerMsg.id,
    })

  } catch (error) {
    console.error('Check pending error:', error)

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
