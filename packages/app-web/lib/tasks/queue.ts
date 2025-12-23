import { prisma } from '../db/prisma'

/**
 * Task Queue System (J-3 Implementation)
 *
 * A simple database-backed job queue for background task execution.
 * Uses PostgreSQL for persistence - no external dependencies like Redis/BullMQ.
 *
 * Design decisions:
 * - DB-backed for simplicity (no infra needed)
 * - Polling-based (can upgrade to pg_notify later)
 * - Supports priorities, retries, and scheduled execution
 */

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

export interface TaskDefinition {
  type: string
  payload: Record<string, any>
  workspaceId: string
  priority?: TaskPriority
  scheduledFor?: Date
  maxRetries?: number
  timeoutMs?: number
}

export interface Task {
  id: string
  type: string
  payload: Record<string, any>
  workspaceId: string
  status: TaskStatus
  priority: TaskPriority
  scheduledFor: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
  retries: number
  maxRetries: number
  timeoutMs: number
  result?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// Priority weights for sorting
const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

/**
 * Enqueue a new task for background execution
 */
export async function enqueueTask(definition: TaskDefinition): Promise<Task> {
  const task = await prisma.backgroundTask.create({
    data: {
      type: definition.type,
      payload: definition.payload,
      workspaceId: definition.workspaceId,
      status: 'pending',
      priority: definition.priority || 'normal',
      scheduledFor: definition.scheduledFor || new Date(),
      maxRetries: definition.maxRetries ?? 3,
      timeoutMs: definition.timeoutMs ?? 300000, // 5 min default
      retries: 0,
    },
  })

  return task as unknown as Task
}

/**
 * Get the next available task to process
 * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent worker safety
 */
export async function claimNextTask(): Promise<Task | null> {
  // Use raw query for proper locking
  const tasks = await prisma.$queryRaw<Task[]>`
    UPDATE "BackgroundTask"
    SET status = 'running', "startedAt" = NOW(), "updatedAt" = NOW()
    WHERE id = (
      SELECT id FROM "BackgroundTask"
      WHERE status = 'pending'
        AND "scheduledFor" <= NOW()
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 4
          WHEN 'high' THEN 3
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 1
        END DESC,
        "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `

  return tasks[0] || null
}

/**
 * Mark a task as completed with optional result
 */
export async function completeTask(taskId: string, result?: Record<string, any>): Promise<void> {
  await prisma.backgroundTask.update({
    where: { id: taskId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      result: result || {},
    },
  })
}

/**
 * Mark a task as failed with error message
 * Will retry if retries remaining
 */
export async function failTask(taskId: string, error: string): Promise<void> {
  const task = await prisma.backgroundTask.findUnique({
    where: { id: taskId },
  })

  if (!task) return

  const shouldRetry = task.retries < task.maxRetries

  await prisma.backgroundTask.update({
    where: { id: taskId },
    data: {
      status: shouldRetry ? 'pending' : 'failed',
      error,
      retries: { increment: 1 },
      // Exponential backoff for retries
      scheduledFor: shouldRetry
        ? new Date(Date.now() + Math.pow(2, task.retries) * 1000)
        : undefined,
    },
  })
}

/**
 * Cancel a pending task
 */
export async function cancelTask(taskId: string): Promise<void> {
  await prisma.backgroundTask.update({
    where: { id: taskId },
    data: { status: 'cancelled' },
  })
}

/**
 * Get tasks for a workspace
 */
export async function getWorkspaceTasks(
  workspaceId: string,
  options: {
    status?: TaskStatus | TaskStatus[]
    type?: string
    limit?: number
  } = {}
): Promise<Task[]> {
  const { status, type, limit = 50 } = options

  const tasks = await prisma.backgroundTask.findMany({
    where: {
      workspaceId,
      ...(status && { status: Array.isArray(status) ? { in: status } : status }),
      ...(type && { type }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return tasks as unknown as Task[]
}

/**
 * Clean up old completed/failed tasks
 */
export async function cleanupOldTasks(olderThanDays: number = 7): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  const result = await prisma.backgroundTask.deleteMany({
    where: {
      status: { in: ['completed', 'failed', 'cancelled'] },
      updatedAt: { lt: cutoff },
    },
  })

  return result.count
}

/**
 * Get queue statistics
 */
export async function getQueueStats(workspaceId?: string): Promise<{
  pending: number
  running: number
  completed: number
  failed: number
}> {
  const where = workspaceId ? { workspaceId } : {}

  const [pending, running, completed, failed] = await Promise.all([
    prisma.backgroundTask.count({ where: { ...where, status: 'pending' } }),
    prisma.backgroundTask.count({ where: { ...where, status: 'running' } }),
    prisma.backgroundTask.count({ where: { ...where, status: 'completed' } }),
    prisma.backgroundTask.count({ where: { ...where, status: 'failed' } }),
  ])

  return { pending, running, completed, failed }
}
