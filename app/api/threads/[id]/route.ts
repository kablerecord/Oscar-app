import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const UpdateBodySchema = z.object({
  title: z.string().optional(),
  projectId: z.string().nullable().optional(),
})

/**
 * GET /api/threads/[id]
 * Get a single thread with its messages
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const thread = await prisma.chatThread.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: thread.id,
      title: thread.title,
      projectId: thread.projectId,
      projectName: thread.project?.name,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      messages: thread.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Get thread error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/threads/[id]
 * Update a thread (rename, move to project)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const updates = UpdateBodySchema.parse(body)

    // Build update data
    const data: any = {}
    if (updates.title !== undefined) {
      data.title = updates.title
    }
    if (updates.projectId !== undefined) {
      data.projectId = updates.projectId
    }

    const thread = await prisma.chatThread.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      id: thread.id,
      title: thread.title,
      projectId: thread.projectId,
      updatedAt: thread.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Update thread error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/threads/[id]
 * Delete a thread and all its messages
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Delete thread (messages will cascade delete)
    await prisma.chatThread.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete thread error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
