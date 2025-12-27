/**
 * UIP Service Tests
 * Tests the main UIP service functions including context assembly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma - must use factory function without referencing external variables
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userIntelligenceProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    uIPDimensionScore: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    uIPFact: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    uIPSignal: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

// Import after mocking
import { prisma } from '@/lib/db/prisma'
import {
  getOrCreateProfile,
  getUIPContext,
  processSignalsForUser,
  incrementSessionCount,
  formatUIPForPrompt,
} from '../service'
import type { AssembledUIP, UIPContextSummary } from '../types'

// Cast for type-safe mock access
const mockPrisma = prisma as unknown as {
  userIntelligenceProfile: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  uIPDimensionScore: {
    findMany: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
  uIPFact: {
    findMany: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
  uIPSignal: {
    createMany: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
}

describe('UIP Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrCreateProfile', () => {
    it('should return updated profile for existing user', async () => {
      const existingProfile = {
        id: 'profile-1',
        userId: 'user-1',
        privacyTier: 'B',
        sessionCount: 5,
      }
      const updatedProfile = { ...existingProfile, lastActiveAt: new Date() }
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue(existingProfile)
      mockPrisma.userIntelligenceProfile.update.mockResolvedValue(updatedProfile)

      const profile = await getOrCreateProfile('user-1')
      expect(profile.id).toBe('profile-1')
      expect(mockPrisma.userIntelligenceProfile.update).toHaveBeenCalled()
      expect(mockPrisma.userIntelligenceProfile.create).not.toHaveBeenCalled()
    })

    it('should create profile if not exists', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue(null)
      const newProfile = {
        id: 'profile-new',
        userId: 'user-1',
        privacyTier: 'B',
        sessionCount: 1,
      }
      mockPrisma.userIntelligenceProfile.create.mockResolvedValue(newProfile)

      const profile = await getOrCreateProfile('user-1')
      expect(profile.id).toBe('profile-new')
      expect(mockPrisma.userIntelligenceProfile.create).toHaveBeenCalled()
    })
  })

  describe('getUIPContext', () => {
    it('should return shouldPersonalize=false for new users', async () => {
      // User with no profile
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue(null)

      const context = await getUIPContext('new-user')
      expect(context.shouldPersonalize).toBe(false)
      expect(context.confidence).toBe(0)
    })

    it('should return context for established user', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
        privacyTier: 'B',
        sessionCount: 10,
        dimensions: [
          {
            domain: 'COMMUNICATION_PREFS',
            confidence: 0.8,
            value: { verbosity: 'concise' },
            decayRate: 0.2,
            lastDecayedAt: new Date(),
          },
          {
            domain: 'IDENTITY_CONTEXT',
            confidence: 0.7,
            value: { name: 'Alex', role: 'developer' },
            decayRate: 0.1,
            lastDecayedAt: new Date(),
          },
        ],
        facts: [
          {
            domain: 'IDENTITY_CONTEXT',
            key: 'preferredName',
            value: 'Alex',
          },
        ],
      })

      const context = await getUIPContext('user-1')
      expect(context.shouldPersonalize).toBe(true)
      expect(context.confidence).toBeGreaterThan(0)
      expect(context.summary).toContain('Alex')
    })

    it('should respect low confidence threshold', async () => {
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
        privacyTier: 'B',
        sessionCount: 2, // Few sessions
        dimensions: [], // No learned dimensions
        facts: [],
      })

      const context = await getUIPContext('user-1')
      expect(context.shouldPersonalize).toBe(false)
      expect(context.confidence).toBeLessThan(0.3)
    })
  })

  describe('processSignalsForUser', () => {
    it('should store signals in database', async () => {
      const existingProfile = {
        id: 'profile-1',
        userId: 'user-1',
        privacyTier: 'B',
        signalCount: 5,
        sessionCount: 5,
      }
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue(existingProfile)
      mockPrisma.uIPSignal.createMany.mockResolvedValue({ count: 2 })
      mockPrisma.userIntelligenceProfile.update.mockResolvedValue({})
      // Mock for getDimensionScores
      mockPrisma.uIPDimensionScore.findMany.mockResolvedValue([])
      // Mock for findMany signals and updateMany
      mockPrisma.uIPSignal.findMany.mockResolvedValue([])
      mockPrisma.uIPSignal.updateMany.mockResolvedValue({ count: 0 })

      const signals = [
        {
          signalType: 'message_style' as const,
          category: 'MESSAGE_STYLE' as const,
          strength: 0.5,
          timestamp: new Date(),
          data: {
            wordCount: 10,
            sentenceCount: 2,
            avgWordsPerSentence: 5,
            hasStructure: false,
            hasTechnicalTerms: false,
            questionCount: 0,
            tone: 'casual' as const,
          },
        },
        {
          signalType: 'preference_statement' as const,
          category: 'PREFERENCE_STATEMENTS' as const,
          strength: 0.9,
          timestamp: new Date(),
          data: {
            domain: 'COMMUNICATION_PREFS' as const,
            preference: 'verbosity:concise',
            explicit: true,
          },
        },
      ]

      await processSignalsForUser('user-1', signals)
      expect(mockPrisma.uIPSignal.createMany).toHaveBeenCalled()
    })

    it('should skip signal storage for privacy tier A', async () => {
      const tierAProfile = {
        id: 'profile-1',
        userId: 'user-1',
        privacyTier: 'A', // Minimal tracking - session only
        signalCount: 0,
        sessionCount: 1,
        lastActiveAt: new Date(),
      }
      // getOrCreateProfile finds existing and updates lastActiveAt
      mockPrisma.userIntelligenceProfile.findUnique.mockResolvedValue(tierAProfile)
      mockPrisma.userIntelligenceProfile.update.mockResolvedValue(tierAProfile)
      // Mock for getDimensionScores - should not be called
      mockPrisma.uIPDimensionScore.findMany.mockResolvedValue([])
      // Mock for findMany signals and updateMany
      mockPrisma.uIPSignal.findMany.mockResolvedValue([])
      mockPrisma.uIPSignal.updateMany.mockResolvedValue({ count: 0 })

      const signals = [
        {
          signalType: 'message_style' as const,
          category: 'MESSAGE_STYLE' as const,
          strength: 0.5,
          timestamp: new Date(),
          data: {
            wordCount: 10,
            sentenceCount: 2,
            avgWordsPerSentence: 5,
            hasStructure: false,
            hasTechnicalTerms: false,
            questionCount: 0,
            tone: 'casual' as const,
          },
        },
      ]

      await processSignalsForUser('user-1', signals)
      // Should NOT call createMany for privacy tier A (returns early)
      expect(mockPrisma.uIPSignal.createMany).not.toHaveBeenCalled()
      // Should NOT run dimension inference either
      expect(mockPrisma.uIPDimensionScore.findMany).not.toHaveBeenCalled()
    })
  })

  describe('incrementSessionCount', () => {
    it('should increment session count', async () => {
      mockPrisma.userIntelligenceProfile.update.mockResolvedValue({
        sessionCount: 6,
      })

      await incrementSessionCount('user-1')
      expect(mockPrisma.userIntelligenceProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          sessionCount: { increment: 1 },
          lastActiveAt: expect.any(Date),
        },
      })
    })
  })

  describe('formatUIPForPrompt', () => {
    it('should format assembled UIP as context summary', () => {
      const assembledUIP: AssembledUIP = {
        name: 'Alex',
        role: 'software developer',
        expertise: {
          expert: ['JavaScript', 'TypeScript'],
          learning: ['Rust'],
        },
        verbosity: 'concise',
        tone: 'directive',
        proactivity: 0.5,
        explanationStyle: 'example-first',
        detailLevel: 'moderate',
        trustLevel: 'established',
        autonomyLevel: 'medium',
        activeGoals: ['Build a SaaS product'],
        recentDecisions: [],
        overallConfidence: 0.75,
        lastUpdated: new Date(),
      }

      const result = formatUIPForPrompt(assembledUIP)
      // Returns a UIPContextSummary object
      expect(result.shouldPersonalize).toBe(true)
      expect(result.summary).toContain('Alex')
      expect(result.summary).toContain('software developer')
      expect(result.summary).toContain('JavaScript')
      expect(result.confidence).toBe(0.75)
    })

    it('should not personalize for low confidence', () => {
      const minimalUIP: AssembledUIP = {
        expertise: { expert: [], learning: [] },
        verbosity: 'moderate',
        tone: 'exploratory',
        proactivity: 0.5,
        explanationStyle: 'balanced',
        detailLevel: 'moderate',
        trustLevel: 'new',
        autonomyLevel: 'low',
        activeGoals: [],
        recentDecisions: [],
        overallConfidence: 0.2, // Below TREAT_AS_UNKNOWN threshold
        lastUpdated: new Date(),
      }

      const result = formatUIPForPrompt(minimalUIP)
      expect(result.shouldPersonalize).toBe(false)
      expect(result.summary).toBe('')
    })
  })
})
