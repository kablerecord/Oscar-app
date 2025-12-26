import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const ListQuerySchema = z.object({
  workspaceId: z.string(),
  projectId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
})

const CreateBodySchema = z.object({
  workspaceId: z.string(),
  projectId: z.string().optional(),
  title: z.string().optional(),
})

// UpdateBodySchema defined for PATCH endpoint (used in [id]/route.ts)
const _UpdateBodySchema = z.object({
  title: z.string().optional(),
  projectId: z.string().nullable().optional(),
})

/**
 * GET /api/threads
 * List all threads for a workspace with pagination and search
 */
export async function GET(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const { workspaceId, projectId, limit, offset, search } = ListQuerySchema.parse({
      workspaceId: searchParams.get('workspaceId'),
      projectId: searchParams.get('projectId'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      search: searchParams.get('search'),
    })

    // Build where clause
    const where: any = { workspaceId }
    if (projectId) {
      where.projectId = projectId
    }
    if (search) {
      where.title = { contains: search, mode: 'insensitive' }
    }

    // Get threads with message count
    const [threads, total] = await Promise.all([
      prisma.chatThread.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          projectId: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
          project: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.chatThread.count({ where }),
    ])

    return NextResponse.json({
      threads: threads.map(t => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId,
        projectName: t.project?.name,
        messageCount: t._count.messages,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + threads.length < total,
      },
    })
  } catch (error) {
    console.error('List threads error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/threads
 * Create a new thread
 */
export async function POST(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { workspaceId, projectId, title } = CreateBodySchema.parse(body)

    const thread = await prisma.chatThread.create({
      data: {
        workspaceId,
        projectId: projectId || null,
        title: title || 'New Chat',
        mode: 'panel',
      },
    })

    return NextResponse.json({
      id: thread.id,
      title: thread.title,
      projectId: thread.projectId,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Create thread error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
