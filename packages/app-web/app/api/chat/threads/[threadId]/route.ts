import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { validateVSCodeToken } from '@/lib/auth/vscode-auth'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/chat/threads/:threadId
 *
 * Get a specific chat thread with its messages.
 *
 * Query params:
 *   - limit: number (default: 50, max: 200)
 *   - before: string (message ID for pagination)
 *
 * Response:
 *   - id: string
 *   - title: string
 *   - mode: string
 *   - createdAt: string
 *   - updatedAt: string
 *   - messages: Array<{ id, role, content, createdAt, metadata }>
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params

    // Authenticate
    const authHeader = req.headers.get('authorization')
    let workspaceId: string

    if (authHeader?.startsWith('Bearer osqr_vscode_')) {
      const vsCodeUser = await validateVSCodeToken(authHeader)
      if (!vsCodeUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      workspaceId = vsCodeUser.workspaceId
    } else {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const workspace = await prisma.workspace.findFirst({
        where: { ownerId: session.user.id },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })

      if (!workspace) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
      }
      workspaceId = workspace.id
    }

    // Parse query params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const before = searchParams.get('before')

    // Fetch thread
    const thread = await prisma.chatThread.findFirst({
      where: {
        id: threadId,
        workspaceId, // Ensure user owns this thread
      },
      select: {
        id: true,
        title: true,
        mode: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Fetch messages
    const messages = await prisma.chatMessage.findMany({
      where: {
        threadId,
        ...(before && { id: { lt: before } }),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        provider: true,
        createdAt: true,
        metadata: true,
      },
    })

    return NextResponse.json({
      id: thread.id,
      title: thread.title,
      mode: thread.mode,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      messages: messages.map((m: typeof messages[number]) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        provider: m.provider,
        createdAt: m.createdAt.toISOString(),
        metadata: m.metadata,
      })),
    })
  } catch (error) {
    console.error('Get thread error:', error)
    return NextResponse.json(
      { error: 'Failed to get thread' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/chat/threads/:threadId
 *
 * Update a thread (e.g., rename).
 *
 * Request body:
 *   - title: string (optional)
 *
 * Response:
 *   - id: string
 *   - title: string
 *   - updatedAt: string
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params

    // Authenticate
    const authHeader = req.headers.get('authorization')
    let workspaceId: string

    if (authHeader?.startsWith('Bearer osqr_vscode_')) {
      const vsCodeUser = await validateVSCodeToken(authHeader)
      if (!vsCodeUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      workspaceId = vsCodeUser.workspaceId
    } else {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const workspace = await prisma.workspace.findFirst({
        where: { ownerId: session.user.id },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })

      if (!workspace) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
      }
      workspaceId = workspace.id
    }

    // Verify thread ownership
    const existingThread = await prisma.chatThread.findFirst({
      where: { id: threadId, workspaceId },
    })

    if (!existingThread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Parse request body
    const body = await req.json()
    const { title } = body

    // Update thread
    const thread = await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        ...(title && { title }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: thread.id,
      title: thread.title,
      updatedAt: thread.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Update thread error:', error)
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat/threads/:threadId
 *
 * Delete a thread and all its messages.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params

    // Authenticate
    const authHeader = req.headers.get('authorization')
    let workspaceId: string

    if (authHeader?.startsWith('Bearer osqr_vscode_')) {
      const vsCodeUser = await validateVSCodeToken(authHeader)
      if (!vsCodeUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      workspaceId = vsCodeUser.workspaceId
    } else {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const workspace = await prisma.workspace.findFirst({
        where: { ownerId: session.user.id },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })

      if (!workspace) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
      }
      workspaceId = workspace.id
    }

    // Verify thread ownership
    const existingThread = await prisma.chatThread.findFirst({
      where: { id: threadId, workspaceId },
    })

    if (!existingThread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Delete thread (messages cascade due to onDelete: Cascade)
    await prisma.chatThread.delete({
      where: { id: threadId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete thread error:', error)
    return NextResponse.json(
      { error: 'Failed to delete thread' },
      { status: 500 }
    )
  }
}
