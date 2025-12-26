/**
 * Memory Vault Wrapper Unit Tests
 *
 * Tests for the memory-wrapper integration with @osqr/core MemoryVault.
 *
 * These tests verify that the wrapper correctly delegates to @osqr/core
 * and handles edge cases gracefully.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create mock functions using vi.hoisted so they're available before vi.mock runs
const {
  mockInitializeVault,
  mockRetrieveContextForUser,
  mockStoreMessage,
  mockSearchUserMemories,
  mockGetConversationHistory,
  mockQueryCrossProject,
  mockFindRelatedFromOtherProjects,
  mockGetCrossProjectStats,
  mockAddSourceContext,
} = vi.hoisted(() => ({
  mockInitializeVault: vi.fn(),
  mockRetrieveContextForUser: vi.fn().mockResolvedValue([]),
  mockStoreMessage: vi.fn().mockReturnValue({ id: 'msg-123' }),
  mockSearchUserMemories: vi.fn().mockResolvedValue([]),
  mockGetConversationHistory: vi.fn().mockReturnValue([]),
  mockQueryCrossProject: vi.fn().mockResolvedValue({
    memories: [],
    commonThemes: [],
    contradictions: [],
    projectSummaries: new Map(),
  }),
  mockFindRelatedFromOtherProjects: vi.fn().mockResolvedValue([]),
  mockGetCrossProjectStats: vi.fn().mockReturnValue({
    memoriesWithContext: 0,
    totalCrossReferences: 0,
    unresolvedContradictions: 0,
  }),
  mockAddSourceContext: vi.fn(),
}))

// Mock @osqr/core MemoryVault
vi.mock('@osqr/core', () => ({
  MemoryVault: {
    initializeVault: mockInitializeVault,
    retrieveContextForUser: mockRetrieveContextForUser,
    storeMessage: mockStoreMessage,
    searchUserMemories: mockSearchUserMemories,
    getConversationHistory: mockGetConversationHistory,
    queryCrossProject: mockQueryCrossProject,
    findRelatedFromOtherProjects: mockFindRelatedFromOtherProjects,
    getCrossProjectStats: mockGetCrossProjectStats,
    addSourceContext: mockAddSourceContext,
  },
}))

// Mock config with feature flags enabled
vi.mock('../../config', () => ({
  vaultConfig: {
    maxWorkingMemoryTokens: 4096,
    embeddingModel: 'text-embedding-3-small',
    defaultRetrievalLimit: 10,
    minUtilityThreshold: 0.3,
  },
  featureFlags: {
    enableMemoryVault: true,
    enableCrossProjectMemory: true,
  },
}))

// Import after mocks are set up
import * as MemoryWrapper from '../../memory-wrapper'

describe('Memory Wrapper (@osqr/core Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initializeVault', () => {
    it('should call MemoryVault.initializeVault', () => {
      MemoryWrapper.initializeVault('workspace123')
      expect(mockInitializeVault).toHaveBeenCalledWith('workspace123')
    })
  })

  describe('getContextForQuery', () => {
    it('should return context bundle with memories', async () => {
      mockRetrieveContextForUser.mockResolvedValueOnce([
        {
          memory: {
            content: 'Test memory content',
            category: 'personal_info',
            createdAt: new Date('2024-01-01'),
            source: { sourceId: 'conv-123' },
          },
          relevanceScore: 0.85,
        },
      ])

      const result = await MemoryWrapper.getContextForQuery(
        'What programming language do I prefer?',
        'workspace123'
      )

      expect(result).toBeDefined()
      expect(result.memories).toHaveLength(1)
      expect(result.memories[0].content).toBe('Test memory content')
      expect(result.memories[0].relevanceScore).toBe(0.85)
      expect(result.retrievalTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty results gracefully', async () => {
      const result = await MemoryWrapper.getContextForQuery('test', 'workspace123')
      expect(result.memories).toEqual([])
      expect(result.episodicContext).toEqual([])
    })

    it('should pass options to retrieveContextForUser', async () => {
      await MemoryWrapper.getContextForQuery('test', 'workspace123', {
        maxMemories: 5,
        minRelevance: 0.7,
      })

      expect(mockRetrieveContextForUser).toHaveBeenCalledWith(
        'workspace123',
        'test',
        expect.objectContaining({
          maxTokens: 2500, // 5 * 500
          minRelevance: 0.7,
        })
      )
    })
  })

  describe('storeMessage', () => {
    it('should call MemoryVault.storeMessage with correct parameters', () => {
      MemoryWrapper.storeMessage('conv123', 'user', 'Hello there')

      expect(mockStoreMessage).toHaveBeenCalledWith(
        'conv123',
        expect.objectContaining({
          role: 'user',
          content: 'Hello there',
          tokens: expect.any(Number),
          toolCalls: null,
          utilityScore: null,
        })
      )
    })

    it('should estimate tokens from content length', () => {
      MemoryWrapper.storeMessage('conv123', 'assistant', 'A'.repeat(100))

      expect(mockStoreMessage).toHaveBeenCalledWith(
        'conv123',
        expect.objectContaining({
          tokens: 25, // Math.ceil(100 / 4)
        })
      )
    })
  })

  describe('searchMemories', () => {
    it('should return search results from MemoryVault', async () => {
      mockSearchUserMemories.mockResolvedValueOnce([
        {
          id: 'mem-1',
          content: 'TypeScript expertise',
          category: 'domain_knowledge',
          createdAt: new Date('2024-01-01'),
          source: { sourceId: 'src-1' },
        },
      ])

      const results = await MemoryWrapper.searchMemories('workspace123', 'TypeScript')

      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('TypeScript expertise')
      expect(results[0].category).toBe('domain_knowledge')
    })
  })

  describe('formatMemoriesForPrompt', () => {
    it('should format memories with metadata', () => {
      const memories = [
        {
          content: 'Prefers TypeScript',
          relevanceScore: 0.9,
          category: 'preferences',
          createdAt: new Date('2024-01-15'),
          source: 'conv-1',
        },
      ]

      const formatted = MemoryWrapper.formatMemoriesForPrompt(memories)

      expect(formatted).toContain('## Relevant Memories')
      expect(formatted).toContain('Prefers TypeScript')
      expect(formatted).toContain('90%')
      expect(formatted).toContain('preferences')
    })

    it('should return empty string for empty memories', () => {
      const formatted = MemoryWrapper.formatMemoriesForPrompt([])
      expect(formatted).toBe('')
    })
  })

  describe('formatEpisodicForPrompt', () => {
    it('should return empty string for empty episodic context', () => {
      const formatted = MemoryWrapper.formatEpisodicForPrompt([])
      expect(formatted).toBe('')
    })
  })

  describe('getConversationHistory', () => {
    it('should return filtered conversation history', () => {
      mockGetConversationHistory.mockReturnValueOnce([
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'assistant', content: 'Hi!', timestamp: new Date() },
        { role: 'system', content: 'System message', timestamp: new Date() },
      ])

      const history = MemoryWrapper.getConversationHistory('conv123')

      // Should filter out system messages
      expect(history).toHaveLength(2)
      expect(history[0].role).toBe('user')
      expect(history[1].role).toBe('assistant')
    })
  })

  describe('storeMessageWithContext', () => {
    it('should store message and add source context', () => {
      MemoryWrapper.storeMessageWithContext('conv123', 'user', 'Hello', {
        projectId: 'proj1',
        conversationId: 'conv1',
        documentId: null,
        interface: 'web',
        timestamp: new Date(),
      })

      expect(mockStoreMessage).toHaveBeenCalled()
      expect(mockAddSourceContext).toHaveBeenCalledWith(
        'conv123',
        expect.objectContaining({
          projectId: 'proj1',
          interface: 'web',
        })
      )
    })
  })
})

describe('Cross-Project Memory Features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('queryCrossProject', () => {
    it('should call MemoryVault.queryCrossProject', async () => {
      await MemoryWrapper.queryCrossProject('workspace123', 'AI development', {
        projectIds: ['proj1', 'proj2'],
        detectContradictions: true,
      })

      expect(mockQueryCrossProject).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'AI development',
          userId: 'workspace123',
          projectIds: ['proj1', 'proj2'],
          detectContradictions: true,
        })
      )
    })
  })

  describe('findRelatedFromOtherProjects', () => {
    it('should return related memories from other projects', async () => {
      mockFindRelatedFromOtherProjects.mockResolvedValueOnce([
        {
          content: 'Related from project B',
          category: 'projects',
          createdAt: new Date(),
          utilityScore: 0.8,
          sourceContext: { projectId: 'proj-b' },
        },
      ])

      const results = await MemoryWrapper.findRelatedFromOtherProjects('proj-a', 'AI topic')

      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('Related from project B')
      expect(results[0].source).toBe('proj-b')
    })
  })

  describe('formatCrossProjectForPrompt', () => {
    it('should format cross-project results with grouping', () => {
      const results = {
        memories: [
          {
            memory: {
              content: 'Memory from project B',
              relevanceScore: 0.85,
              category: 'projects',
              createdAt: new Date(),
              source: 'src-1',
            },
            relevance: 0.85,
            project: 'proj-b',
          },
        ],
        commonThemes: ['AI', 'Development'],
        contradictions: [],
        projectSummaries: new Map(),
      }

      const formatted = MemoryWrapper.formatCrossProjectForPrompt(results, 'proj-a')

      expect(formatted).toContain('Cross-Project Context')
      expect(formatted).toContain('From Project: proj-b')
      expect(formatted).toContain('Memory from project B')
      expect(formatted).toContain('Common Themes')
      expect(formatted).toContain('AI')
    })

    it('should return empty string for empty results', () => {
      const formatted = MemoryWrapper.formatCrossProjectForPrompt({
        memories: [],
        commonThemes: [],
        contradictions: [],
        projectSummaries: new Map(),
      })
      expect(formatted).toBe('')
    })
  })

  describe('getCrossProjectStats', () => {
    it('should return stats from MemoryVault', () => {
      mockGetCrossProjectStats.mockReturnValueOnce({
        memoriesWithContext: 100,
        totalCrossReferences: 50,
        unresolvedContradictions: 5,
      })

      const stats = MemoryWrapper.getCrossProjectStats()

      expect(stats.memoriesWithContext).toBe(100)
      expect(stats.totalCrossReferences).toBe(50)
      expect(stats.unresolvedContradictions).toBe(5)
    })
  })
})

describe('Memory Edge Cases', () => {
  it('should handle empty query', async () => {
    const result = await MemoryWrapper.getContextForQuery('', 'workspace123')
    expect(result).toBeDefined()
    expect(result.memories).toEqual([])
  })

  it('should handle very long query', async () => {
    const longQuery = 'test '.repeat(10000)
    const result = await MemoryWrapper.getContextForQuery(longQuery, 'workspace123')
    expect(result).toBeDefined()
  })

  it('should handle special characters in workspace ID', async () => {
    const result = await MemoryWrapper.getContextForQuery('test', 'workspace-123_abc')
    expect(result).toBeDefined()
  })

  it('should handle unicode in content', () => {
    expect(() => MemoryWrapper.storeMessage('conv123', 'user', '你好世界 🌍')).not.toThrow()
  })

  it('should handle errors gracefully in getContextForQuery', async () => {
    mockRetrieveContextForUser.mockRejectedValueOnce(new Error('Database error'))

    const result = await MemoryWrapper.getContextForQuery('test', 'workspace123')

    // Should return empty result, not throw
    expect(result.memories).toEqual([])
    expect(result.retrievalTimeMs).toBeGreaterThanOrEqual(0)
  })
})
