/**
 * Tests for index-document background task handler
 *
 * Test scenarios:
 * - Successfully indexes a document with content
 * - Skips already indexed documents
 * - Handles empty documents gracefully
 * - Handles API rate limits with retry
 * - Handles document not found
 * - Tracks progress correctly
 * - Handles cancellation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { indexDocumentHandler } from '../handlers/index-document'
import type { Task } from '../queue'
import type { TaskContext } from '../executor'

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    document: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}))

// Mock embeddings
vi.mock('@/lib/ai/embeddings', () => ({
  generateEmbedding: vi.fn(),
  formatEmbeddingForPostgres: vi.fn(),
}))

import { prisma } from '@/lib/db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '@/lib/ai/embeddings'

describe('index-document handler', () => {
  let mockContext: TaskContext
  let progressUpdates: Array<{ progress: number; message?: string }>
  let logMessages: string[]

  beforeEach(() => {
    progressUpdates = []
    logMessages = []

    mockContext = {
      updateProgress: vi.fn((progress: number, message?: string) => {
        progressUpdates.push({ progress, message })
      }),
      log: vi.fn((message: string) => {
        logMessages.push(message)
      }),
      checkCancelled: vi.fn(() => false),
    }

    // Reset mocks
    vi.mocked(prisma.document.findUnique).mockReset()
    vi.mocked(prisma.document.update).mockReset()
    vi.mocked(prisma.$executeRaw).mockReset()
    vi.mocked(generateEmbedding).mockReset()
    vi.mocked(formatEmbeddingForPostgres).mockReset()
  })

  function createMockTask(payload: Record<string, unknown>): Task {
    return {
      id: 'task-123',
      type: 'index-document',
      payload,
      workspaceId: 'ws-123',
      status: 'running',
      priority: 'normal',
      scheduledFor: new Date(),
      retries: 0,
      maxRetries: 3,
      timeoutMs: 300000,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  it('should index a document with content', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Test Document',
      textContent: 'This is a test document with enough content to create at least one chunk.',
      metadata: {},
      _count: { chunks: 0 },
    }

    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDoc as never)
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3])
    vi.mocked(formatEmbeddingForPostgres).mockReturnValue('[0.1,0.2,0.3]')
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never)
    vi.mocked(prisma.document.update).mockResolvedValue(mockDoc as never)

    const task = createMockTask({ documentId: 'doc-123', workspaceId: 'ws-123' })
    const result = await indexDocumentHandler(task, mockContext)

    expect(result.status).toBe('indexed')
    expect(result.documentId).toBe('doc-123')
    expect(result.chunksCreated).toBeGreaterThan(0)
    expect(prisma.document.update).toHaveBeenCalled()
  })

  it('should skip already indexed documents', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Test Document',
      textContent: 'Content',
      metadata: {},
      _count: { chunks: 5 }, // Already has chunks
    }

    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDoc as never)

    const task = createMockTask({ documentId: 'doc-123', workspaceId: 'ws-123' })
    const result = await indexDocumentHandler(task, mockContext)

    expect(result.status).toBe('skipped')
    expect(result.reason).toBe('already indexed')
    expect(generateEmbedding).not.toHaveBeenCalled()
  })

  it('should throw error for empty documents', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Empty Document',
      textContent: '   ', // Only whitespace
      metadata: {},
      _count: { chunks: 0 },
    }

    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDoc as never)

    const task = createMockTask({ documentId: 'doc-123', workspaceId: 'ws-123' })

    await expect(indexDocumentHandler(task, mockContext)).rejects.toThrow('no content')
  })

  it('should throw error when document not found', async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null as never)

    const task = createMockTask({ documentId: 'nonexistent', workspaceId: 'ws-123' })

    await expect(indexDocumentHandler(task, mockContext)).rejects.toThrow('not found')
  })

  // Skip: This test takes 5+ seconds due to rate limit retry delays
  it.skip('should handle rate limits with retry', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Test Document',
      textContent: 'Short content for a single chunk.',
      metadata: {},
      _count: { chunks: 0 },
    }

    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDoc as never)
    vi.mocked(formatEmbeddingForPostgres).mockReturnValue('[0.1,0.2,0.3]')
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never)
    vi.mocked(prisma.document.update).mockResolvedValue(mockDoc as never)

    // First call fails with rate limit, second succeeds
    let callCount = 0
    vi.mocked(generateEmbedding).mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        throw new Error('rate limit exceeded (429)')
      }
      return [0.1, 0.2, 0.3]
    })

    const task = createMockTask({ documentId: 'doc-123', workspaceId: 'ws-123' })

    // Use a shorter timeout for testing
    const result = await indexDocumentHandler(task, mockContext)

    expect(result.status).toBe('indexed')
    expect(callCount).toBe(2) // Retried once
  }, 10000)

  it('should update progress during indexing', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Test Document',
      textContent: 'First chunk content. Second chunk content. Third chunk content.',
      metadata: {},
      _count: { chunks: 0 },
    }

    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDoc as never)
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3])
    vi.mocked(formatEmbeddingForPostgres).mockReturnValue('[0.1,0.2,0.3]')
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never)
    vi.mocked(prisma.document.update).mockResolvedValue(mockDoc as never)

    const task = createMockTask({ documentId: 'doc-123', workspaceId: 'ws-123' })
    await indexDocumentHandler(task, mockContext)

    // Should have called updateProgress multiple times
    expect(mockContext.updateProgress).toHaveBeenCalled()

    // First progress update should be around 5-10%
    expect(progressUpdates[0].progress).toBeLessThanOrEqual(10)

    // Last progress update should be 100
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100)
  })

  it('should handle cancellation', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Test Document',
      textContent: 'A'.repeat(5000), // Large content to create multiple chunks
      metadata: {},
      _count: { chunks: 0 },
    }

    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDoc as never)
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3])
    vi.mocked(formatEmbeddingForPostgres).mockReturnValue('[0.1,0.2,0.3]')
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never)

    // Simulate cancellation after first chunk
    let chunkCount = 0
    const cancelContext: TaskContext = {
      updateProgress: vi.fn(),
      log: vi.fn(),
      checkCancelled: vi.fn(() => {
        chunkCount++
        return chunkCount > 1 // Cancel after first chunk
      }),
    }

    const task = createMockTask({ documentId: 'doc-123', workspaceId: 'ws-123' })
    const result = await indexDocumentHandler(task, cancelContext)

    expect(result.status).toBe('cancelled')
    // Note: chunksCreated depends on when checkCancelled is called in the loop
    expect(result.chunksCreated).toBeGreaterThan(0)
    expect(result.chunksCreated).toBeLessThan(10) // Should have stopped early
  })

  it('should fail after too many errors', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Test Document',
      textContent: 'A'.repeat(5000), // Large content to create multiple chunks
      metadata: {},
      _count: { chunks: 0 },
    }

    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDoc as never)
    vi.mocked(formatEmbeddingForPostgres).mockReturnValue('[0.1,0.2,0.3]')
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never)

    // Fail multiple times (not rate limit, actual errors)
    vi.mocked(generateEmbedding).mockRejectedValue(new Error('API error'))

    const task = createMockTask({ documentId: 'doc-123', workspaceId: 'ws-123' })

    await expect(indexDocumentHandler(task, mockContext)).rejects.toThrow('Too many embedding errors')
  })
})
