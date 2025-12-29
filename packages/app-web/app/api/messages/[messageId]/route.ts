/**
 * Messages API - Update chat messages
 * Used by render system to update message content after render completes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const UpdateMessageSchema = z.object({
  content: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageId } = await params

    // Verify message exists
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        thread: {
          select: { workspaceId: true },
        },
      },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const body = await req.json()
    const { content, metadata } = UpdateMessageSchema.parse(body)

    // Merge metadata if both old and new exist
    const existingMetadata = (message.metadata as Prisma.JsonObject) || {}
    const updatedMetadata = metadata
      ? { ...existingMetadata, ...metadata }
      : existingMetadata

    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        ...(content !== undefined && { content }),
        ...(metadata !== undefined && { metadata: updatedMetadata as Prisma.InputJsonValue }),
      },
    })

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    console.error('Message update error:', error)

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
