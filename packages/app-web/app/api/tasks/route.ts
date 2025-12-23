import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import {
  enqueueTask,
  getWorkspaceTasks,
  cancelTask,
  getQueueStats,
  type TaskPriority,
} from '@/lib/tasks/queue'
import { prisma } from '@/lib/db/prisma'
import { authOptions } from '@/lib/auth/config'

// Schema for creating a new task
const CreateTaskSchema = z.object({
  type: z.string(),
  payload: z.record(z.string(), z.any()),
  workspaceId: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  scheduledFor: z.string().datetime().optional(),
})

// Schema for querying tasks
const QueryTasksSchema = z.object({
  workspaceId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  type: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
})

/**
 * GET /api/tasks - List tasks for a workspace
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const params = QueryTasksSchema.parse({
      workspaceId: searchParams.get('workspaceId'),
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    // Verify workspace ownership (skip in dev)
    if (!isDev && session?.user?.email) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: params.workspaceId,
          owner: { email: session.user.email },
        },
      })

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }
    }

    const [tasks, stats] = await Promise.all([
      getWorkspaceTasks(params.workspaceId, {
        status: params.status,
        type: params.type,
        limit: params.limit,
      }),
      getQueueStats(params.workspaceId),
    ])

    return NextResponse.json({
      tasks,
      stats,
    })
  } catch (error) {
    console.error('Tasks GET error:', error)

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

/**
 * POST /api/tasks - Create a new background task
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const params = CreateTaskSchema.parse(body)

    // Verify workspace ownership (skip in dev)
    if (!isDev && session?.user?.email) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: params.workspaceId,
          owner: { email: session.user.email },
        },
      })

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }
    }

    const task = await enqueueTask({
      type: params.type,
      payload: params.payload,
      workspaceId: params.workspaceId,
      priority: params.priority as TaskPriority,
      scheduledFor: params.scheduledFor ? new Date(params.scheduledFor) : undefined,
    })

    return NextResponse.json({
      task,
      message: 'Task enqueued successfully',
    })
  } catch (error) {
    console.error('Tasks POST error:', error)

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

/**
 * DELETE /api/tasks - Cancel a task
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    // Verify task belongs to user's workspace (skip in dev)
    if (!isDev && session?.user?.email) {
      const task = await prisma.backgroundTask.findUnique({
        where: { id: taskId },
      })

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const workspace = await prisma.workspace.findFirst({
        where: {
          id: task.workspaceId,
          owner: { email: session.user.email },
        },
      })

      if (!workspace) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    await cancelTask(taskId)

    return NextResponse.json({
      message: 'Task cancelled successfully',
    })
  } catch (error) {
    console.error('Tasks DELETE error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
