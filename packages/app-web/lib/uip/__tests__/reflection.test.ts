/**
 * UIP Reflection Engine Tests
 * Tests the prospective reflection system that synthesizes signals into UIP updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma - must use factory function without referencing external variables
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userIntelligenceProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    uIPSignal: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    uIPDimensionScore: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Import after mocking
import { prisma } from '@/lib/db/prisma'
import {
  shouldRunReflection,
  runReflection,
  onSessionClose,
  onDecisionCluster,
} from '../reflection'

// Cast for type-safe mock access
const mockPrisma = prisma as unknown as {
  userIntelligenceProfile: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  uIPSignal: {
    findMany: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
  uIPDimensionScore: {
    findMany: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

describe('Reflection Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('shouldRunReflection', () => {
    it('should not run for privacy tier A', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        privacyTier: 'A',
        signalCount: 10,
        lastReflectionAt: null,
        nextReflectionAt: null,
        _count: { signals: 10 },
      })

      const result = await shouldRunReflection('profile-1')
      expect(result.shouldRun).toBe(false)
      expect(result.reason).toBe('Privacy tier A - session only')
    })

    it('should run when signal threshold reached', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        privacyTier: 'B',
        signalCount: 15,
        lastReflectionAt: new Date(),
        nextReflectionAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        _count: { signals: 10 },
      })

      const result = await shouldRunReflection('profile-1')
      expect(result.shouldRun).toBe(true)
      expect(result.reason).toBe('Signal threshold reached')
    })

    it('should run when scheduled time passed', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        privacyTier: 'B',
        signalCount: 5,
        lastReflectionAt: new Date(Date.now() - 1000 * 60 * 60 * 25), // 25 hours ago
        nextReflectionAt: new Date(Date.now() - 1000 * 60), // 1 minute ago
        _count: { signals: 2 },
      })

      const result = await shouldRunReflection('profile-1')
      expect(result.shouldRun).toBe(true)
      expect(result.reason).toBe('Scheduled reflection time')
    })

    it('should run for initial reflection with enough signals', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        privacyTier: 'B',
        signalCount: 5,
        lastReflectionAt: null, // Never reflected
        nextReflectionAt: null,
        _count: { signals: 3 },
      })

      const result = await shouldRunReflection('profile-1')
      expect(result.shouldRun).toBe(true)
      expect(result.reason).toBe('Initial reflection')
    })

    it('should not run when no trigger conditions met', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        privacyTier: 'B',
        signalCount: 5,
        lastReflectionAt: new Date(), // Just reflected
        nextReflectionAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
        _count: { signals: 2 }, // Not enough signals
      })

      const result = await shouldRunReflection('profile-1')
      expect(result.shouldRun).toBe(false)
      expect(result.reason).toBe('No trigger conditions met')
    })
  })

  describe('runReflection', () => {
    it('should return early for missing profile', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue(null)

      const result = await runReflection('non-existent')
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Profile not found')
    })

    it('should return success with zero signals', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        sessionCount: 5,
      })
      mockPrisma.uIPSignal.findMany.mockResolvedValue([])
      mockPrisma.uIPDimensionScore.findMany.mockResolvedValue([])

      const result = await runReflection('profile-1')
      expect(result.success).toBe(true)
      expect(result.signalsProcessed).toBe(0)
    })

    it('should process signals and update dimensions', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        sessionCount: 5,
      })

      // Mock unprocessed signals
      mockPrisma.uIPSignal.findMany.mockResolvedValue([
        {
          id: 'signal-1',
          signalType: 'message_style',
          category: 'MESSAGE_STYLE',
          strength: 0.5,
          sessionId: null,
          messageId: null,
          createdAt: new Date(),
          data: {
            wordCount: 10,
            sentenceCount: 2,
            avgWordsPerSentence: 5,
            hasStructure: false,
            hasTechnicalTerms: false,
            questionCount: 0,
            tone: 'casual',
          },
        },
      ])

      // Mock existing dimensions
      mockPrisma.uIPDimensionScore.findMany.mockResolvedValue([])

      // Mock dimension upsert
      mockPrisma.uIPDimensionScore.upsert.mockResolvedValue({})
      mockPrisma.uIPSignal.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.userIntelligenceProfile.update.mockResolvedValue({})

      const result = await runReflection('profile-1')
      expect(result.success).toBe(true)
      expect(result.signalsProcessed).toBe(1)
    })
  })

  describe('onSessionClose', () => {
    it('should not trigger for short sessions', async () => {
      const result = await onSessionClose('user-1', 5) // 5 minute session
      expect(mockPrisma.userIntelligenceProfile.findUnique).not.toHaveBeenCalled()
    })

    it('should trigger for sessions >= 10 minutes', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        lastReflectionAt: null,
      })

      // Mock the full reflection chain
      mockPrisma.uIPSignal.findMany.mockResolvedValue([])
      mockPrisma.uIPDimensionScore.findMany.mockResolvedValue([])

      await onSessionClose('user-1', 15) // 15 minute session
      expect(mockPrisma.userIntelligenceProfile.findUnique).toHaveBeenCalled()
    })

    it('should respect 6 hour deduplication', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        lastReflectionAt: new Date(), // Just reflected
      })

      await onSessionClose('user-1', 20)
      // Should have queried but not run reflection
      expect(mockPrisma.userIntelligenceProfile.findUnique).toHaveBeenCalled()
      // Should not have queried for signals (reflection skipped)
      expect(mockPrisma.uIPSignal.findMany).not.toHaveBeenCalled()
    })
  })

  describe('onDecisionCluster', () => {
    it('should not trigger for fewer than 3 decisions', async () => {
      await onDecisionCluster('user-1', 2)
      expect(mockPrisma.userIntelligenceProfile.findUnique).not.toHaveBeenCalled()
    })

    it('should trigger for 3+ decisions', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
      })
      mockPrisma.uIPSignal.findMany.mockResolvedValue([])
      mockPrisma.uIPDimensionScore.findMany.mockResolvedValue([])

      await onDecisionCluster('user-1', 3)
      expect(mockPrisma.userIntelligenceProfile.findUnique).toHaveBeenCalled()
    })
  })
})
