import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { validateVSCodeToken } from '@/lib/auth/vscode-auth'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/chat/threads
 *
 * List recent chat threads for the authenticated user.
 *
 * Query params:
 *   - limit: number (default: 20, max: 100)
 *   - source: 'web' | 'vscode' | 'mobile' (optional filter)
 *   - cursor: string (optional, for pagination)
 *
 * Response:
 *   - threads: Array<{ id, title, updatedAt, messageCount }>
 *   - nextCursor: string (for pagination)
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate
    const authHeader = req.headers.get('authorization')
    let userId: string
    let workspaceId: string

    if (authHeader?.startsWith('Bearer osqr_vscode_')) {
      const vsCodeUser = await validateVSCodeToken(authHeader)
      if (!vsCodeUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = vsCodeUser.id
      workspaceId = vsCodeUser.workspaceId
    } else {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id

      const workspace = await prisma.workspace.findFirst({
        where: { ownerId: userId },
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const source = searchParams.get('source')
    const cursor = searchParams.get('cursor')

    // Build query
    const where: {
      workspaceId: string
      mode?: string
    } = { workspaceId }

    // Filter by source (mode in the database)
    if (source === 'vscode') {
      where.mode = 'vscode'
    } else if (source === 'web') {
      where.mode = 'panel'
    }

    // Fetch threads with message count
    const threads = await prisma.chatThread.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit + 1, // Extra for pagination
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true,
        title: true,
        mode: true,
        updatedAt: true,
        createdAt: true,
        _count: {
          select: { messages: true },
        },
      },
    })

    // Check if there are more results
    let nextCursor: string | undefined
    if (threads.length > limit) {
      const nextItem = threads.pop()
      nextCursor = nextItem?.id
    }

    return NextResponse.json({
      threads: threads.map((t) => ({
        id: t.id,
        title: t.title,
        mode: t.mode,
        updatedAt: t.updatedAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
        messageCount: t._count.messages,
      })),
      nextCursor,
    })
  } catch (error) {
    console.error('List threads error:', error)
    return NextResponse.json(
      { error: 'Failed to list threads' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/threads
 *
 * Create a new chat thread.
 *
 * Request body:
 *   - title: string (optional, defaults to "New Conversation")
 *   - source: 'web' | 'vscode' | 'mobile' (default: 'web')
 *
 * Response:
 *   - id: string
 *   - title: string
 *   - createdAt: string
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const authHeader = req.headers.get('authorization')
    let userId: string
    let workspaceId: string

    if (authHeader?.startsWith('Bearer osqr_vscode_')) {
      const vsCodeUser = await validateVSCodeToken(authHeader)
      if (!vsCodeUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = vsCodeUser.id
      workspaceId = vsCodeUser.workspaceId
    } else {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id

      const workspace = await prisma.workspace.findFirst({
        where: { ownerId: userId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })

      if (!workspace) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
      }
      workspaceId = workspace.id
    }

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const title = body.title || 'New Conversation'
    const source = body.source || 'web'

    // Map source to mode
    const mode = source === 'vscode' ? 'vscode' : source === 'mobile' ? 'mobile' : 'panel'

    // Create thread
    const thread = await prisma.chatThread.create({
      data: {
        workspaceId,
        title,
        mode,
      },
    })

    return NextResponse.json({
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Create thread error:', error)
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    )
  }
}
