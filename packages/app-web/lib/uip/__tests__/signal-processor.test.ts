/**
 * UIP Signal Processor Tests
 * Tests signal extraction from user messages
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeMessageStyle,
  detectFeedbackSignals,
  detectPreferenceStatements,
  analyzeQuestionSophistication,
  detectGoalReferences,
  detectDecisionMentions,
  extractSignalsFromMessage,
} from '../signal-processor'

describe('Signal Processor', () => {
  describe('analyzeMessageStyle', () => {
    it('should detect short casual messages', () => {
      const signal = analyzeMessageStyle('Hey, can you help me?')
      expect(signal.signalType).toBe('message_style')
      expect(signal.data.wordCount).toBe(5)
      expect(signal.data.tone).toBe('casual')
    })

    it('should detect long technical messages', () => {
      const signal = analyzeMessageStyle(
        'I need to implement an API endpoint that handles async requests with proper error handling. The function should use the database client to fetch user data and return a JSON response with pagination support.'
      )
      expect(signal.data.hasTechnicalTerms).toBe(true)
      expect(signal.data.tone).toBe('technical')
      expect(signal.data.wordCount).toBeGreaterThan(20)
    })

    it('should detect structured messages with bullets', () => {
      const signal = analyzeMessageStyle(`Here's what I need:
- First item
- Second item
- Third item`)
      expect(signal.data.hasStructure).toBe(true)
    })

    it('should count questions correctly', () => {
      const signal = analyzeMessageStyle('What is this? How does it work? Why should I use it?')
      expect(signal.data.questionCount).toBe(3)
    })
  })

  describe('detectFeedbackSignals', () => {
    it('should detect correction feedback', () => {
      const signal = detectFeedbackSignals("That's not what I meant, I was asking about the other thing")
      expect(signal).not.toBeNull()
      expect(signal?.data.feedbackType).toBe('correction')
      expect(signal?.data.explicit).toBe(true)
    })

    it('should detect praise feedback', () => {
      const signal = detectFeedbackSignals('Perfect! That\'s exactly what I needed, thanks!')
      expect(signal).not.toBeNull()
      expect(signal?.data.feedbackType).toBe('praise')
    })

    it('should detect frustration', () => {
      const signal = detectFeedbackSignals("I already told you, this isn't working")
      expect(signal).not.toBeNull()
      expect(signal?.data.feedbackType).toBe('frustration')
    })

    it('should return null for neutral messages', () => {
      const signal = detectFeedbackSignals('What time is it in Tokyo?')
      expect(signal).toBeNull()
    })
  })

  describe('detectPreferenceStatements', () => {
    it('should detect verbosity preference for concise', () => {
      // Pattern: "i (prefer|like|want) (shorter|brief|concise|quick) (responses|answers)"
      const signal = detectPreferenceStatements('I prefer brief responses')
      expect(signal).not.toBeNull()
      expect(signal?.data.domain).toBe('COMMUNICATION_PREFS')
      expect(signal?.data.preference).toBe('verbosity:concise')
    })

    it('should detect verbosity preference for detailed', () => {
      // Pattern: "i (prefer|like|want) (detailed|longer|thorough|comprehensive) (responses|answers)"
      const signal = detectPreferenceStatements('I prefer detailed responses')
      expect(signal).not.toBeNull()
      expect(signal?.data.preference).toBe('verbosity:detailed')
    })

    it('should detect expertise declaration', () => {
      const signal = detectPreferenceStatements("I'm an expert in machine learning")
      expect(signal).not.toBeNull()
      expect(signal?.data.domain).toBe('EXPERTISE_CALIBRATION')
      expect(signal?.data.preference).toContain('expert:')
    })

    it('should detect learning declaration', () => {
      const signal = detectPreferenceStatements("I'm new to TypeScript and still learning")
      expect(signal).not.toBeNull()
      expect(signal?.data.domain).toBe('EXPERTISE_CALIBRATION')
      expect(signal?.data.preference).toContain('learning:')
    })

    it('should detect name introduction', () => {
      const signal = detectPreferenceStatements('My name is Alex')
      expect(signal).not.toBeNull()
      expect(signal?.data.domain).toBe('IDENTITY_CONTEXT')
      expect(signal?.data.preference).toBe('name:Alex')
    })

    it('should detect preferred name', () => {
      const signal = detectPreferenceStatements('Call me AJ')
      expect(signal).not.toBeNull()
      expect(signal?.data.preference).toBe('preferredName:AJ')
    })
  })

  describe('analyzeQuestionSophistication', () => {
    it('should return null for non-questions', () => {
      const signal = analyzeQuestionSophistication('This is a statement.')
      expect(signal).toBeNull()
    })

    it('should rate simple questions as low complexity', () => {
      const signal = analyzeQuestionSophistication('What is React?')
      expect(signal).not.toBeNull()
      expect(signal?.data.complexity).toBeLessThan(0.3)
    })

    it('should rate complex questions as high complexity', () => {
      const signal = analyzeQuestionSophistication(
        'What are the trade-offs between using Redux versus React Context for state management in a large-scale application with complex data requirements? What are the performance implications and best practices for each approach?'
      )
      expect(signal).not.toBeNull()
      expect(signal?.data.complexity).toBeGreaterThan(0.5)
      expect(signal?.data.requiresExpertise).toBe(true)
    })

    it('should detect multi-part questions', () => {
      const signal = analyzeQuestionSophistication('What is X? How does it work? Why should I use it?')
      expect(signal).not.toBeNull()
      expect(signal?.data.complexity).toBeGreaterThan(0.1)
    })

    it('should detect programming domain', () => {
      const signal = analyzeQuestionSophistication('How do I create a React component?')
      expect(signal).not.toBeNull()
      expect(signal?.data.domain).toBe('programming')
    })
  })

  describe('detectGoalReferences', () => {
    it('should detect active goals', () => {
      const signal = detectGoalReferences("I'm trying to build a SaaS product")
      expect(signal).not.toBeNull()
      expect(signal?.data.goalText).toContain('build a SaaS product')
      expect(signal?.data.isNew).toBe(true)
    })

    it('should detect progress on goals', () => {
      // The progress patterns: "i (made|achieved|completed|finished|done with)"
      // or "i (finally|just) (did|finished|completed)" or "progress on"
      // But these are checked AFTER goal patterns like "I need to" which capture first
      // To trigger isProgress, the message must match a goal pattern AND a progress pattern
      const signal = detectGoalReferences("I finally finished the authentication module, I need to move on")
      expect(signal).not.toBeNull()
      expect(signal?.data.isProgress).toBe(true)
    })

    it('should detect short-term timeframe', () => {
      const signal = detectGoalReferences("I need to finish this today")
      expect(signal).not.toBeNull()
      expect(signal?.data.timeframe).toBe('short')
    })

    it('should detect long-term timeframe', () => {
      const signal = detectGoalReferences("Eventually I want to build a platform")
      expect(signal).not.toBeNull()
      expect(signal?.data.timeframe).toBe('long')
    })
  })

  describe('detectDecisionMentions', () => {
    it('should detect pending decisions', () => {
      const signal = detectDecisionMentions("I'm deciding whether to use PostgreSQL or MongoDB")
      expect(signal).not.toBeNull()
      expect(signal?.data.isMade).toBe(false)
    })

    it('should detect made decisions', () => {
      const signal = detectDecisionMentions("I've decided to go with Next.js")
      expect(signal).not.toBeNull()
      expect(signal?.data.isMade).toBe(true)
    })

    it('should detect help requests for decisions', () => {
      const signal = detectDecisionMentions('Help me decide between option A and B')
      expect(signal).not.toBeNull()
      expect(signal?.data.isMade).toBe(false)
    })
  })

  describe('extractSignalsFromMessage', () => {
    it('should always include message style signal', () => {
      const signals = extractSignalsFromMessage('Hello')
      expect(signals.length).toBeGreaterThanOrEqual(1)
      expect(signals.some(s => s.signalType === 'message_style')).toBe(true)
    })

    it('should extract multiple signals from rich messages', () => {
      const signals = extractSignalsFromMessage(
        "I'm an expert in Python. I prefer brief responses. I'm trying to build an AI startup. What's the best approach?"
      )

      // Should have: message_style, preference_statement (expert), preference_statement (brief), goal_reference, question_sophistication
      expect(signals.length).toBeGreaterThan(2)
      expect(signals.some(s => s.signalType === 'message_style')).toBe(true)
    })

    it('should attach session and message IDs when provided', () => {
      const signals = extractSignalsFromMessage('Test message', 'session-123', 'msg-456')
      expect(signals[0].sessionId).toBe('session-123')
      expect(signals[0].messageId).toBe('msg-456')
    })
  })
})
