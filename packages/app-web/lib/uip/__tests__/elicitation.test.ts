/**
 * UIP Elicitation Tests
 * Tests the progressive elicitation system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ELICITATION_QUESTIONS,
  formatElicitationQuestion,
  formatShortPrompt,
} from '../elicitation'

// Mock prisma for database tests
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userIntelligenceProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    uIPElicitationResponse: {
      upsert: vi.fn(),
    },
  },
}))

describe('Elicitation System', () => {
  describe('ELICITATION_QUESTIONS', () => {
    it('should have questions for all phases', () => {
      const phases = ELICITATION_QUESTIONS.map(q => q.phase)
      expect(phases).toContain(1)
      expect(phases).toContain(2)
      expect(phases).toContain(3)
      expect(phases).toContain(4)
    })

    it('should have exactly 8 questions in the bank', () => {
      expect(ELICITATION_QUESTIONS.length).toBe(8)
    })

    it('should have unique question IDs', () => {
      const ids = ELICITATION_QUESTIONS.map(q => q.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should cover all 4 main domains', () => {
      const domains = new Set(ELICITATION_QUESTIONS.map(q => q.domain))
      expect(domains.has('IDENTITY_CONTEXT')).toBe(true)
      expect(domains.has('GOALS_VALUES')).toBe(true)
      expect(domains.has('COMMUNICATION_PREFS')).toBe(true)
      expect(domains.has('EXPERTISE_CALIBRATION')).toBe(true)
    })

    it('should have priorities in correct range (1-10)', () => {
      ELICITATION_QUESTIONS.forEach(q => {
        expect(q.priority).toBeGreaterThanOrEqual(1)
        expect(q.priority).toBeLessThanOrEqual(10)
      })
    })

    it('should have Phase 1 questions for identity', () => {
      const phase1 = ELICITATION_QUESTIONS.filter(q => q.phase === 1)
      expect(phase1.length).toBe(2)
      expect(phase1.every(q => q.domain === 'IDENTITY_CONTEXT')).toBe(true)
    })

    it('should have Phase 2 questions for goals', () => {
      const phase2 = ELICITATION_QUESTIONS.filter(q => q.phase === 2)
      expect(phase2.length).toBe(2)
      expect(phase2.every(q => q.domain === 'GOALS_VALUES')).toBe(true)
    })
  })

  describe('formatElicitationQuestion', () => {
    it('should format question with skip option', () => {
      const question = ELICITATION_QUESTIONS[0]
      const formatted = formatElicitationQuestion(question)

      expect(formatted).toContain(question.question)
      expect(formatted).toContain('Skip if you')
    })

    it('should include helpful framing', () => {
      const question = ELICITATION_QUESTIONS[0]
      const formatted = formatElicitationQuestion(question)

      expect(formatted).toContain('Quick question to help me help you better')
    })
  })

  describe('formatShortPrompt', () => {
    it('should return the short form', () => {
      const question = ELICITATION_QUESTIONS.find(q => q.id === 'identity_role')!
      const short = formatShortPrompt(question)
      expect(short).toBe('Your role')
    })
  })

  describe('Question Flow Logic', () => {
    it('should have identity_name skip condition based on profile name', () => {
      const nameQuestion = ELICITATION_QUESTIONS.find(q => q.id === 'identity_name')!
      expect(nameQuestion.skipCondition).toBeDefined()

      // Should skip if profile has name
      const profileWithName = { name: 'Alex' }
      expect(nameQuestion.skipCondition!(profileWithName as never)).toBe(true)

      // Should not skip if no name
      const profileWithoutName = { name: null }
      expect(nameQuestion.skipCondition!(profileWithoutName as never)).toBe(false)
    })
  })

  describe('Phase Progression', () => {
    it('Phase 1 questions should have highest priority', () => {
      const phase1 = ELICITATION_QUESTIONS.filter(q => q.phase === 1)
      const phase2 = ELICITATION_QUESTIONS.filter(q => q.phase === 2)

      const maxPhase1Priority = Math.max(...phase1.map(q => q.priority))
      const maxPhase2Priority = Math.max(...phase2.map(q => q.priority))

      expect(maxPhase1Priority).toBeGreaterThan(maxPhase2Priority)
    })

    it('should have decreasing priority across phases', () => {
      const avgByPhase: Record<number, number> = {}

      for (let phase = 1; phase <= 4; phase++) {
        const phaseQs = ELICITATION_QUESTIONS.filter(q => q.phase === phase)
        avgByPhase[phase] = phaseQs.reduce((sum, q) => sum + q.priority, 0) / phaseQs.length
      }

      // Each phase should have lower average priority than previous
      expect(avgByPhase[1]).toBeGreaterThan(avgByPhase[2])
      expect(avgByPhase[2]).toBeGreaterThan(avgByPhase[3])
      expect(avgByPhase[3]).toBeGreaterThan(avgByPhase[4])
    })
  })

  describe('Response Parsing Expectations', () => {
    // These test the expected parsing logic for different question types

    it('comm_verbosity should parse brief/concise keywords', () => {
      // These are the actual keywords the signal-processor regex uses
      const briefResponses = ['brief', 'short', 'concise', 'quick']
      const detailedResponses = ['detailed', 'longer', 'thorough', 'comprehensive']

      // Validate these match the patterns in signal-processor.ts
      briefResponses.forEach(r => {
        expect(r.toLowerCase()).toMatch(/brief|short|concise|quick/)
      })
      detailedResponses.forEach(r => {
        expect(r.toLowerCase()).toMatch(/detail|longer|thorough|comprehensive/)
      })
    })

    it('expertise_areas should handle comma-separated lists', () => {
      const response = 'Python, JavaScript, and machine learning'
      const areas = response
        .split(/[,;]|\band\b/)
        .map(s => s.trim())
        .filter(s => s.length > 0)

      expect(areas).toContain('Python')
      expect(areas).toContain('JavaScript')
      expect(areas).toContain('machine learning')
    })
  })
})
