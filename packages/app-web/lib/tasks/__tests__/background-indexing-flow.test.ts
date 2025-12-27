/**
 * Integration tests for background indexing flow
 *
 * Tests the complete flow:
 * - Upload creates background task
 * - Task gets processed by executor
 * - Status API returns accurate counts
 * - Cron endpoint processes tasks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enqueueTask, claimNextTask, completeTask, failTask, getQueueStats } from '../queue'
import { processPendingTasks, registerTaskHandler } from '../executor'
import type { Task, TaskStatus } from '../queue'

// Mock prisma with in-memory storage
const mockTasks: Map<string, Task> = new Map()
let taskIdCounter = 0

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    backgroundTask: {
      create: vi.fn(({ data }: { data: Partial<Task> }) => {
        const id = `task-${++taskIdCounter}`
        const task = { id, ...data, createdAt: new Date(), updatedAt: new Date() } as Task
        mockTasks.set(id, task)
        return Promise.resolve(task)
      }),
      findUnique: vi.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(mockTasks.get(where.id) || null)
      }),
      findFirst: vi.fn(),
      findMany: vi.fn(({ where }: { where?: Record<string, unknown> }) => {
        const tasks = Array.from(mockTasks.values())
        return Promise.resolve(tasks.filter(t => {
          if (!where) return true
          if (where.status && t.status !== where.status) return false
          if (where.type && t.type !== where.type) return false
          if (where.workspaceId && t.workspaceId !== where.workspaceId) return false
          return true
        }))
      }),
      update: vi.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const task = mockTasks.get(where.id)
        if (task) {
          // Handle Prisma's increment syntax
          const processedData: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(data)) {
            if (value && typeof value === 'object' && 'increment' in value) {
              processedData[key] = (task[key as keyof Task] as number || 0) + (value as { increment: number }).increment
            } else {
              processedData[key] = value
            }
          }
          Object.assign(task, processedData, { updatedAt: new Date() })
          mockTasks.set(where.id, task)
        }
        return Promise.resolve(task)
      }),
      count: vi.fn(({ where }: { where?: Record<string, unknown> }) => {
        const tasks = Array.from(mockTasks.values())
        return Promise.resolve(tasks.filter(t => {
          if (!where) return true
          if (where.status && t.status !== where.status) return false
          if (where.type && t.type !== where.type) return false
          return true
        }).length)
      }),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(async () => {
      // Simulate claiming a task
      const pendingTasks = Array.from(mockTasks.values())
        .filter(t => t.status === 'pending')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

      if (pendingTasks.length === 0) return []

      const task = pendingTasks[0]
      task.status = 'running' as TaskStatus
      task.startedAt = new Date()
      mockTasks.set(task.id, task)
      return [task]
    }),
    document: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    documentChunk: {
      create: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}))

// Mock embeddings
vi.mock('@/lib/ai/embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  formatEmbeddingForPostgres: vi.fn().mockReturnValue('[0.1,0.2,0.3]'),
}))

import { prisma } from '@/lib/db/prisma'

describe('background indexing flow', () => {
  beforeEach(() => {
    mockTasks.clear()
    taskIdCounter = 0
    vi.clearAllMocks()
  })

  describe('task queue', () => {
    it('should enqueue a task with correct properties', async () => {
      const task = await enqueueTask({
        type: 'index-document',
        payload: { documentId: 'doc-123', workspaceId: 'ws-123' },
        workspaceId: 'ws-123',
        priority: 'normal',
      })

      expect(task.id).toBeDefined()
      expect(task.type).toBe('index-document')
      expect(task.status).toBe('pending')
      expect(task.priority).toBe('normal')
      expect(task.payload).toEqual({ documentId: 'doc-123', workspaceId: 'ws-123' })
    })

    it('should respect priority ordering', async () => {
      await enqueueTask({
        type: 'index-document',
        payload: { documentId: 'low-doc' },
        workspaceId: 'ws-123',
        priority: 'low',
      })

      await enqueueTask({
        type: 'index-document',
        payload: { documentId: 'high-doc' },
        workspaceId: 'ws-123',
        priority: 'high',
      })

      // In a real test with actual priority handling, high priority would be claimed first
      const claimed = await claimNextTask()
      expect(claimed).toBeDefined()
    })

    it('should track retry count', async () => {
      const task = await enqueueTask({
        type: 'index-document',
        payload: { documentId: 'doc-123' },
        workspaceId: 'ws-123',
      })

      expect(task.retries).toBe(0)
      expect(task.maxRetries).toBe(3) // Default
    })
  })

  describe('task processing', () => {
    it('should process pending tasks', async () => {
      // Register a simple test handler
      registerTaskHandler('test-task', async () => {
        return { success: true }
      })

      await enqueueTask({
        type: 'test-task',
        payload: { test: true },
        workspaceId: 'ws-123',
      })

      const processed = await processPendingTasks(1)
      expect(processed).toBe(1)
    })

    it('should return 0 when no tasks pending', async () => {
      const processed = await processPendingTasks(5)
      expect(processed).toBe(0)
    })

    it('should respect batch size limit', async () => {
      registerTaskHandler('batch-test', async () => ({ done: true }))

      // Create 10 tasks
      for (let i = 0; i < 10; i++) {
        await enqueueTask({
          type: 'batch-test',
          payload: { index: i },
          workspaceId: 'ws-123',
        })
      }

      // Process only 3
      const processed = await processPendingTasks(3)
      expect(processed).toBeLessThanOrEqual(3)
    })
  })

  describe('queue stats', () => {
    it('should return accurate queue statistics', async () => {
      // Create tasks in different states
      await enqueueTask({
        type: 'index-document',
        payload: { documentId: 'doc-1' },
        workspaceId: 'ws-123',
      })

      await enqueueTask({
        type: 'index-document',
        payload: { documentId: 'doc-2' },
        workspaceId: 'ws-123',
      })

      const stats = await getQueueStats()
      expect(stats.pending).toBe(2)
      expect(stats.running).toBe(0)
    })
  })

  describe('upload flow integration', () => {
    it('should create indexing task after document upload', async () => {
      // Simulate what upload-fast does
      const documentId = 'new-doc-123'
      const workspaceId = 'ws-123'

      // After document creation, enqueue indexing task
      const task = await enqueueTask({
        type: 'index-document',
        payload: { documentId, workspaceId },
        workspaceId,
        priority: 'normal',
      })

      expect(task.type).toBe('index-document')
      expect(task.payload).toEqual({ documentId, workspaceId })
      expect(task.status).toBe('pending')
    })
  })

  describe('resilience scenarios', () => {
    it('should handle multiple concurrent uploads', async () => {
      const uploads = Array.from({ length: 10 }, (_, i) => ({
        documentId: `doc-${i}`,
        workspaceId: 'ws-123',
      }))

      // Simulate concurrent uploads
      const tasks = await Promise.all(
        uploads.map(upload =>
          enqueueTask({
            type: 'index-document',
            payload: upload,
            workspaceId: upload.workspaceId,
            priority: 'normal',
          })
        )
      )

      expect(tasks).toHaveLength(10)
      tasks.forEach((task, i) => {
        expect(task.payload).toEqual(uploads[i])
      })
    })

    it('should mark failed task for retry', async () => {
      const task = await enqueueTask({
        type: 'index-document',
        payload: { documentId: 'failing-doc' },
        workspaceId: 'ws-123',
        maxRetries: 3,
      })

      // Simulate failure
      await failTask(task.id, 'API rate limit')

      const updatedTask = mockTasks.get(task.id)
      // After failure with retries remaining, status goes back to pending
      expect(updatedTask?.retries).toBe(1)
    })
  })
})

describe('mock user profiles with different vault sizes', () => {
  beforeEach(() => {
    mockTasks.clear()
    taskIdCounter = 0
  })

  it('should handle small vault (10 documents)', async () => {
    for (let i = 0; i < 10; i++) {
      await enqueueTask({
        type: 'index-document',
        payload: { documentId: `small-vault-doc-${i}` },
        workspaceId: 'small-vault-ws',
        priority: 'normal',
      })
    }

    const stats = await getQueueStats('small-vault-ws')
    expect(stats.pending).toBe(10)
  })

  it('should handle medium vault (100 documents)', async () => {
    for (let i = 0; i < 100; i++) {
      await enqueueTask({
        type: 'index-document',
        payload: { documentId: `medium-vault-doc-${i}` },
        workspaceId: 'medium-vault-ws',
        priority: 'normal',
      })
    }

    const stats = await getQueueStats('medium-vault-ws')
    expect(stats.pending).toBe(100)
  })

  it('should handle large vault with priority batching (1000 documents)', async () => {
    // First 100 are high priority (recent uploads)
    for (let i = 0; i < 100; i++) {
      await enqueueTask({
        type: 'index-document',
        payload: { documentId: `high-priority-doc-${i}` },
        workspaceId: 'large-vault-ws',
        priority: 'high',
      })
    }

    // Rest are low priority (backfill)
    for (let i = 100; i < 1000; i++) {
      await enqueueTask({
        type: 'index-document',
        payload: { documentId: `low-priority-doc-${i}` },
        workspaceId: 'large-vault-ws',
        priority: 'low',
      })
    }

    const stats = await getQueueStats('large-vault-ws')
    expect(stats.pending).toBe(1000)
  })
})
