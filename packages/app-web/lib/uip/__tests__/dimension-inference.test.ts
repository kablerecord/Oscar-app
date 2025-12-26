/**
 * UIP Dimension Inference Tests
 * Tests inference of user dimensions from signals
 */

import { describe, it, expect } from 'vitest'
import {
  calculateDecayedConfidence,
  inferAllDimensions,
} from '../dimension-inference'
import type { UIPSignalData } from '../types'

describe('Dimension Inference', () => {
  describe('calculateDecayedConfidence', () => {
    it('should return same confidence for recent data', () => {
      const now = new Date()
      const decayed = calculateDecayedConfidence(0.8, 0.1, now)
      expect(decayed).toBeCloseTo(0.8, 1)
    })

    it('should decay confidence over time', () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const decayed = calculateDecayedConfidence(0.8, 0.1, oneWeekAgo)
      expect(decayed).toBeLessThan(0.8)
      expect(decayed).toBeGreaterThan(0)
    })

    it('should decay faster with higher decay rate', () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const slowDecay = calculateDecayedConfidence(0.8, 0.05, oneWeekAgo)
      const fastDecay = calculateDecayedConfidence(0.8, 0.2, oneWeekAgo)
      expect(fastDecay).toBeLessThan(slowDecay)
    })

    it('should not go below zero', () => {
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      const decayed = calculateDecayedConfidence(0.8, 0.5, yearAgo)
      expect(decayed).toBeGreaterThanOrEqual(0)
    })
  })

  describe('inferAllDimensions', () => {
    it('should return all 8 domains', () => {
      const signals: UIPSignalData[] = []
      const result = inferAllDimensions(signals, 1)

      expect(result).toHaveProperty('IDENTITY_CONTEXT')
      expect(result).toHaveProperty('GOALS_VALUES')
      expect(result).toHaveProperty('COGNITIVE_STYLE')
      expect(result).toHaveProperty('COMMUNICATION_PREFS')
      expect(result).toHaveProperty('EXPERTISE_CALIBRATION')
      expect(result).toHaveProperty('BEHAVIORAL_PATTERNS')
      expect(result).toHaveProperty('RELATIONSHIP_STATE')
      expect(result).toHaveProperty('DECISION_FRICTION')
    })

    it('should have low confidence with no signals', () => {
      const signals: UIPSignalData[] = []
      const result = inferAllDimensions(signals, 1)

      // All dimensions should have low or zero confidence
      Object.values(result).forEach(dim => {
        expect(dim.confidence).toBeLessThan(0.5)
      })
    })

    it('should infer communication prefs from message style signals', () => {
      // Need at least 3 message_style signals for behavioral inference
      // (see inferCommunicationPrefs: "if (aggregated.messageStyle.count >= 3)")
      const signals: UIPSignalData[] = [
        {
          signalType: 'message_style',
          category: 'MESSAGE_STYLE',
          strength: 0.5,
          timestamp: new Date(),
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
        {
          signalType: 'message_style',
          category: 'MESSAGE_STYLE',
          strength: 0.5,
          timestamp: new Date(),
          data: {
            wordCount: 8,
            sentenceCount: 1,
            avgWordsPerSentence: 8,
            hasStructure: false,
            hasTechnicalTerms: false,
            questionCount: 1,
            tone: 'casual',
          },
        },
        {
          signalType: 'message_style',
          category: 'MESSAGE_STYLE',
          strength: 0.5,
          timestamp: new Date(),
          data: {
            wordCount: 12,
            sentenceCount: 2,
            avgWordsPerSentence: 6,
            hasStructure: false,
            hasTechnicalTerms: false,
            questionCount: 0,
            tone: 'casual',
          },
        },
      ]

      const result = inferAllDimensions(signals, 2)
      expect(result.COMMUNICATION_PREFS.confidence).toBeGreaterThan(0)
    })

    it('should infer expertise from preference statements', () => {
      const signals: UIPSignalData[] = [
        {
          signalType: 'preference_statement',
          category: 'PREFERENCE_STATEMENTS',
          strength: 0.9,
          timestamp: new Date(),
          data: {
            domain: 'EXPERTISE_CALIBRATION',
            preference: 'expert:machine learning',
            explicit: true,
          },
        },
      ]

      const result = inferAllDimensions(signals, 1)
      expect(result.EXPERTISE_CALIBRATION.confidence).toBeGreaterThan(0.3)
    })

    it('should infer goals from goal reference signals', () => {
      const signals: UIPSignalData[] = [
        {
          signalType: 'goal_reference',
          category: 'GOAL_REFERENCES',
          strength: 0.7,
          timestamp: new Date(),
          data: {
            goalText: 'build a SaaS product',
            timeframe: 'medium',
            isNew: true,
            isProgress: false,
          },
        },
      ]

      const result = inferAllDimensions(signals, 1)
      expect(result.GOALS_VALUES.confidence).toBeGreaterThan(0)
      expect(result.GOALS_VALUES.value).toHaveProperty('activeGoals')
    })

    it('should increase relationship confidence with session count', () => {
      const signals: UIPSignalData[] = []

      const newUser = inferAllDimensions(signals, 1)
      const returningUser = inferAllDimensions(signals, 10)

      // Returning user should have higher relationship state confidence
      expect(returningUser.RELATIONSHIP_STATE.confidence).toBeGreaterThanOrEqual(
        newUser.RELATIONSHIP_STATE.confidence
      )
    })

    it('should merge with existing values', () => {
      const signals: UIPSignalData[] = [
        {
          signalType: 'preference_statement',
          category: 'PREFERENCE_STATEMENTS',
          strength: 0.9,
          timestamp: new Date(),
          data: {
            domain: 'IDENTITY_CONTEXT',
            preference: 'name:Alex',
            explicit: true,
          },
        },
      ]

      const existingValues = {
        IDENTITY_CONTEXT: {
          role: 'developer',
        },
      }

      const result = inferAllDimensions(signals, 1, existingValues)
      // Should preserve existing role while adding new name
      expect(result.IDENTITY_CONTEXT.value).toHaveProperty('role', 'developer')
    })
  })
})
