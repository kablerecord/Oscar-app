/**
 * Gap Intent Detection Tests
 * Tests the gap analysis intent detection system
 */

import { describe, it, expect } from 'vitest'
import {
  isGapAnalysisIntent,
  parseGapIntent,
  getGapQueryExamples,
  getGapFollowUpSuggestions,
  isDomainSpecificGapQuery,
  extractGapQueryAction,
} from '../gap-intent'

describe('Gap Intent Detection', () => {
  describe('isGapAnalysisIntent', () => {
    describe('Should detect gap queries', () => {
      const positiveExamples = [
        'What am I missing?',
        'What am I missing in my knowledge?',
        'What are we missing?',
        'What should I learn next?',
        'What do I need to learn?',
        'What should I study?',
        'What do I need to know?',
        'What gaps do I have in my knowledge?',
        'What are the gaps in my vault?',
        "What don't I know?",
        "What don't I have in my documents?",
        'Analyze my knowledge vault',
        'Analyze my documents',
        'Where are my blind spots?',
        'Where are my gaps?',
        'Where are my weaknesses?',
        'What topics should I cover?',
        'What topics do I need to cover?',
        'What knowledge am I missing?',
        "What's missing from my vault?",
        "What's missing in my docs?",
        'What do I need to know to launch?',
        'What do I need to learn for my startup?',
        'Gap analysis',
        'Knowledge gaps',
        'My blind spots',
        'How can I fill my knowledge gaps?',
        'How can I improve my knowledge?',
        'What areas should I focus on?',
        'What domains should I study?',
        'Where should I focus my learning?',
        'What am I not covering?',
        'What are we not learning?',
      ]

      for (const example of positiveExamples) {
        it(`should detect: "${example}"`, () => {
          expect(isGapAnalysisIntent(example)).toBe(true)
        })
      }
    })

    describe('Should NOT detect non-gap queries', () => {
      const negativeExamples = [
        'Hello, how are you?',
        'What is machine learning?',
        'Help me write a React component',
        'Explain recursion to me',
        'What is the weather today?',
        'How do I use TypeScript?',
        'Tell me about OSQR',
        'What can you do?',
        'Summarize this document',
        'Create a business plan',
        'What is my goal for this project?',
        'What is the meaning of life?',
      ]

      for (const example of negativeExamples) {
        it(`should NOT detect: "${example}"`, () => {
          expect(isGapAnalysisIntent(example)).toBe(false)
        })
      }
    })
  })

  describe('parseGapIntent', () => {
    describe('Basic parsing', () => {
      it('should identify gap query', () => {
        const result = parseGapIntent('What am I missing?')
        expect(result.isGapQuery).toBe(true)
        expect(result.scope).toBe('all')
        expect(result.originalQuery).toBe('What am I missing?')
      })

      it('should mark non-gap queries', () => {
        const result = parseGapIntent('Hello world')
        expect(result.isGapQuery).toBe(false)
      })
    })

    describe('TopN extraction', () => {
      it('should extract "top 3"', () => {
        const result = parseGapIntent('What are the top 3 things I am missing?')
        expect(result.isGapQuery).toBe(true)
        expect(result.topN).toBe(3)
      })

      it('should extract "top 5"', () => {
        const result = parseGapIntent('Show me the top 5 gaps')
        expect(result.isGapQuery).toBe(true)
        expect(result.topN).toBe(5)
      })

      it('should extract "3 biggest gaps" with proper phrasing', () => {
        const result = parseGapIntent('What are the top 3 gaps in my knowledge?')
        expect(result.isGapQuery).toBe(true)
        expect(result.topN).toBe(3)
      })

      it('should extract "top 5 areas"', () => {
        const result = parseGapIntent('What are the top 5 areas I am missing?')
        expect(result.isGapQuery).toBe(true)
        expect(result.topN).toBe(5)
      })

      it('should not extract invalid topN (> 10)', () => {
        const result = parseGapIntent('What are the top 15 things I am missing?')
        expect(result.topN).toBeUndefined()
      })

      it('should not extract invalid topN (0)', () => {
        const result = parseGapIntent('What are my 0 gaps?')
        expect(result.topN).toBeUndefined()
      })
    })

    describe('Domain-specific parsing', () => {
      it('should detect marketing domain', () => {
        const result = parseGapIntent('What am I missing about marketing?')
        expect(result.scope).toBe('domain-specific')
        expect(result.specificDomain).toBe('Business/Marketing')
      })

      it('should detect backend domain with clear keyword', () => {
        const result = parseGapIntent('What am I missing about backend?')
        expect(result.scope).toBe('domain-specific')
        expect(result.specificDomain).toBe('Technical/Backend')
      })

      it('should detect AI domain', () => {
        const result = parseGapIntent('What am I missing about ai?')
        expect(result.scope).toBe('domain-specific')
        expect(result.specificDomain).toBe('Technical/AI/ML')
      })

      it('should detect sales domain', () => {
        const result = parseGapIntent('What am I missing about sales?')
        expect(result.scope).toBe('domain-specific')
        expect(result.specificDomain).toBe('Business/Sales')
      })

      it('should detect finance/fundraising domain', () => {
        const result = parseGapIntent('What am I missing about fundraising?')
        expect(result.scope).toBe('domain-specific')
        expect(result.specificDomain).toBe('Business/Finance')
      })

      it('should detect UX domain', () => {
        const result = parseGapIntent('What am I missing about ux?')
        expect(result.scope).toBe('domain-specific')
        expect(result.specificDomain).toBe('Product/UX')
      })

      it('should detect security domain', () => {
        const result = parseGapIntent('What am I missing about security?')
        expect(result.scope).toBe('domain-specific')
        expect(result.specificDomain).toBe('Technical/Security')
      })

      it('should detect infrastructure domain', () => {
        const result = parseGapIntent('What am I missing about devops?')
        expect(result.scope).toBe('domain-specific')
        expect(result.specificDomain).toBe('Technical/Infrastructure')
      })

      it('should use "about X" pattern', () => {
        const result = parseGapIntent('What am I missing about legal?')
        expect(result.scope).toBe('domain-specific')
        expect(result.specificDomain).toBe('Business/Legal')
      })

      it('should detect general query without domain as "all" scope', () => {
        const result = parseGapIntent('What am I missing?')
        expect(result.scope).toBe('all')
        expect(result.specificDomain).toBeUndefined()
      })
    })

    describe('Combined parsing', () => {
      it('should extract both topN and domain', () => {
        const result = parseGapIntent('What are the top 3 things I am missing about marketing?')
        expect(result.isGapQuery).toBe(true)
        expect(result.topN).toBe(3)
        expect(result.scope).toBe('domain-specific')
        expect(result.specificDomain).toBe('Business/Marketing')
      })
    })
  })

  describe('isDomainSpecificGapQuery', () => {
    it('should detect domain-specific query', () => {
      const result = isDomainSpecificGapQuery('What am I missing about marketing?')
      expect(result.isDomainSpecific).toBe(true)
      expect(result.domain).toBe('Business/Marketing')
    })

    it('should detect non-domain-specific query', () => {
      const result = isDomainSpecificGapQuery('What am I missing?')
      expect(result.isDomainSpecific).toBe(false)
      expect(result.domain).toBeUndefined()
    })
  })

  describe('extractGapQueryAction', () => {
    it('should detect "analyze" action by default', () => {
      expect(extractGapQueryAction('What am I missing?')).toBe('analyze')
    })

    it('should detect "prioritize" action', () => {
      expect(extractGapQueryAction('What should I focus on first?')).toBe('prioritize')
      expect(extractGapQueryAction('What should I start with?')).toBe('prioritize')
      expect(extractGapQueryAction('Prioritize my gaps')).toBe('prioritize')
    })

    it('should detect "suggest" action', () => {
      expect(extractGapQueryAction('What resources should I learn?')).toBe('suggest')
      expect(extractGapQueryAction('Recommend topics to study')).toBe('suggest')
    })

    it('should detect "explain" action', () => {
      expect(extractGapQueryAction('Why am I missing marketing knowledge?')).toBe('explain')
      expect(extractGapQueryAction('Explain my gaps to me')).toBe('explain')
    })
  })

  describe('getGapQueryExamples', () => {
    it('should return example queries', () => {
      const examples = getGapQueryExamples()
      expect(examples.length).toBeGreaterThan(0)
      expect(examples).toContain('What am I missing?')
    })

    it('should return valid gap queries', () => {
      const examples = getGapQueryExamples()
      for (const example of examples) {
        expect(isGapAnalysisIntent(example)).toBe(true)
      }
    })
  })

  describe('getGapFollowUpSuggestions', () => {
    it('should return follow-up suggestions', () => {
      const suggestions = getGapFollowUpSuggestions(['Business/Marketing', 'Business/Legal'])
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should include domain-specific suggestion for first gap', () => {
      const suggestions = getGapFollowUpSuggestions(['Business/Marketing'])
      const hasMarketingSuggestion = suggestions.some(s =>
        s.toLowerCase().includes('marketing')
      )
      expect(hasMarketingSuggestion).toBe(true)
    })

    it('should include general suggestions', () => {
      const suggestions = getGapFollowUpSuggestions(['Business/Marketing'])
      const hasGeneralSuggestion = suggestions.some(s =>
        s.includes('prioritize') || s.includes('focus')
      )
      expect(hasGeneralSuggestion).toBe(true)
    })

    it('should limit to 4 suggestions', () => {
      const suggestions = getGapFollowUpSuggestions(['A', 'B', 'C', 'D', 'E'])
      expect(suggestions.length).toBeLessThanOrEqual(4)
    })
  })

  // Real-world phrasing tests
  describe('Real-world phrasings', () => {
    const realWorldQueries = [
      { query: 'Using my knowledge vault, tell me what I am missing', expected: { isGapQuery: true } },
      { query: "Based on my goals, what don't I know?", expected: { isGapQuery: true } },
      { query: 'What knowledge gaps do I have?', expected: { isGapQuery: true } },
      { query: 'Analyze my vault and find gaps', expected: { isGapQuery: true } },
      { query: 'What are my weakest areas?', expected: { isGapQuery: true } },
      { query: 'Where should I be learning more?', expected: { isGapQuery: true } },
      { query: "I feel like I'm missing something", expected: { isGapQuery: true } },
      { query: 'What do I need to research next?', expected: { isGapQuery: true } },
      { query: 'What are the top 3 things I am missing?', expected: { isGapQuery: true, topN: 3 } },
    ]

    for (const { query, expected } of realWorldQueries) {
      it(`should handle: "${query}"`, () => {
        const result = parseGapIntent(query)
        expect(result.isGapQuery).toBe(expected.isGapQuery)
        if (expected.topN) {
          expect(result.topN).toBe(expected.topN)
        }
      })
    }
  })
})
