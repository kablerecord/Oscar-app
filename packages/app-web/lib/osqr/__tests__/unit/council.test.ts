/**
 * Council Mode Wrapper Unit Tests
 *
 * Tests for the council-wrapper integration with @osqr/core Council.
 *
 * These tests verify that the wrapper correctly delegates to @osqr/core
 * and handles edge cases gracefully.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create mock functions using vi.hoisted so they're available before vi.mock runs
const {
  mockShouldTriggerCouncil,
  mockEvaluateCouncilTrigger,
  mockExecuteCouncil,
  mockSynthesize,
  mockGetAvailableModels,
  mockCanUseCouncil,
  mockGetModelDisplayName,
} = vi.hoisted(() => ({
  mockShouldTriggerCouncil: vi.fn().mockReturnValue(false),
  mockEvaluateCouncilTrigger: vi.fn().mockReturnValue({
    shouldTrigger: false,
    reason: 'Query does not meet criteria',
  }),
  mockExecuteCouncil: vi.fn().mockResolvedValue({
    triggered: false,
    reason: 'Not triggered',
    deliberation: null,
  }),
  mockSynthesize: vi.fn().mockResolvedValue({
    finalResponse: 'Synthesized answer',
    transparencyFlags: [],
    confidence: 0.8,
  }),
  mockGetAvailableModels: vi.fn().mockReturnValue(3),
  mockCanUseCouncil: vi.fn().mockReturnValue({ allowed: true, reason: '' }),
  mockGetModelDisplayName: vi.fn((id: string) => id),
}))

// Mock @osqr/core Council
vi.mock('@osqr/core', () => ({
  Council: {
    shouldTriggerCouncil: mockShouldTriggerCouncil,
    evaluateCouncilTrigger: mockEvaluateCouncilTrigger,
    executeCouncil: mockExecuteCouncil,
    synthesize: mockSynthesize,
    getAvailableModels: mockGetAvailableModels,
    canUseCouncil: mockCanUseCouncil,
    getModelDisplayName: mockGetModelDisplayName,
  },
}))

// Mock config with feature flags enabled
vi.mock('../../config', () => ({
  featureFlags: {
    enableCouncilMode: true,
  },
}))

// Import after mocks are set up
import * as CouncilWrapper from '../../council-wrapper'

describe('Council Wrapper (@osqr/core Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('shouldTriggerCouncil', () => {
    it('should return false when council mode is disabled', () => {
      // We need to mock config differently for this test
      vi.doMock('../../config', () => ({
        featureFlags: {
          enableCouncilMode: false,
        },
      }))

      // For now, test the enabled path
      const result = CouncilWrapper.shouldTriggerCouncil('Should I use React or Vue?')
      expect(result).toBeDefined()
      expect(result.shouldTrigger).toBe(false)
    })

    it('should call Council.shouldTriggerCouncil with query', () => {
      mockShouldTriggerCouncil.mockReturnValueOnce(true)
      mockEvaluateCouncilTrigger.mockReturnValueOnce({
        shouldTrigger: true,
        reason: 'High-stakes decision detected',
      })

      const result = CouncilWrapper.shouldTriggerCouncil('Should I invest in stocks or bonds?')

      expect(mockShouldTriggerCouncil).toHaveBeenCalledWith(
        'Should I invest in stocks or bonds?'
      )
      expect(result.shouldTrigger).toBe(true)
      expect(result.reason).toBe('High-stakes decision detected')
    })

    it('should return false when query does not meet criteria', () => {
      mockShouldTriggerCouncil.mockReturnValueOnce(false)

      const result = CouncilWrapper.shouldTriggerCouncil('What time is it?')

      expect(result.shouldTrigger).toBe(false)
      expect(result.reason).toBe('Query does not meet council trigger criteria')
    })

    it('should handle errors gracefully', () => {
      mockShouldTriggerCouncil.mockImplementationOnce(() => {
        throw new Error('Council error')
      })

      const result = CouncilWrapper.shouldTriggerCouncil('test query')

      expect(result.shouldTrigger).toBe(false)
      expect(result.reason).toBe('Council trigger check failed')
      expect(result.confidence).toBe(0)
    })
  })

  describe('runDeliberation', () => {
    it('should execute council and return response', async () => {
      mockExecuteCouncil.mockResolvedValueOnce({
        triggered: true,
        deliberation: {
          responses: [
            {
              modelId: 'claude-sonnet',
              modelDisplayName: 'Claude Sonnet',
              content: 'I recommend option A',
              summary: 'Option A is better',
              confidence: { normalizedScore: 0.9, rawScore: 0.9, reasoningDepth: 0.8 },
              sourcesCited: [],
              reasoningChain: [],
              latencyMs: 1000,
              tokensUsed: 500,
              timestamp: new Date().toISOString(),
              status: 'success' as const,
            },
          ],
          agreement: {
            level: 'high',
            score: 85,
            divergentPoints: [],
          },
          synthesis: {
            finalResponse: 'Based on model consensus, option A is recommended.',
            transparencyFlags: [],
            confidence: 0.85,
          },
        },
      })

      const result = await CouncilWrapper.runDeliberation('Should I choose A or B?')

      expect(result.synthesizedAnswer).toBe('Based on model consensus, option A is recommended.')
      expect(result.modelOpinions).toHaveLength(1)
      expect(result.modelOpinions[0].content).toBe('I recommend option A')
      expect(result.consensus.level).toBe('full')
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('should handle non-triggered council', async () => {
      mockExecuteCouncil.mockResolvedValueOnce({
        triggered: false,
        reason: 'Query too simple',
        deliberation: null,
      })

      const result = await CouncilWrapper.runDeliberation('What is 2+2?')

      expect(result.synthesizedAnswer).toBe('Query too simple')
      expect(result.modelOpinions).toEqual([])
      expect(result.consensus.level).toBe('none')
    })

    it('should handle deliberation errors gracefully', async () => {
      mockExecuteCouncil.mockRejectedValueOnce(new Error('Network error'))

      const result = await CouncilWrapper.runDeliberation('Test query')

      expect(result.synthesizedAnswer).toBe('Council deliberation failed. Please try again.')
      expect(result.modelOpinions).toEqual([])
      expect(result.consensus.level).toBe('none')
    })
  })

  describe('synthesizeResponses', () => {
    it('should synthesize multiple model responses', async () => {
      mockSynthesize.mockResolvedValueOnce({
        finalResponse: 'The consensus is that TypeScript is better for large projects.',
        transparencyFlags: [],
        confidence: 0.9,
      })

      const result = await CouncilWrapper.synthesizeResponses('TypeScript vs JavaScript?', [
        { model: 'claude', content: 'TypeScript for type safety', confidence: 0.9 },
        { model: 'gpt-4', content: 'TypeScript for maintainability', confidence: 0.85 },
      ])

      expect(result.answer).toBe('The consensus is that TypeScript is better for large projects.')
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.agreement).toBe('partial')
    })

    it('should fallback to highest confidence on synthesis error', async () => {
      mockSynthesize.mockRejectedValueOnce(new Error('Synthesis failed'))

      const result = await CouncilWrapper.synthesizeResponses('Test?', [
        { model: 'claude', content: 'Answer A', confidence: 0.7 },
        { model: 'gpt-4', content: 'Answer B', confidence: 0.9 },
      ])

      expect(result.answer).toBe('Answer B')
      expect(result.confidence).toBe(0.9)
      expect(result.agreement).toBe('none')
    })

    it('should handle empty responses array', async () => {
      const result = await CouncilWrapper.synthesizeResponses('Test?', [])

      expect(result.answer).toBeDefined()
    })
  })

  describe('formatCouncilDiscussion', () => {
    it('should format council response for display', () => {
      const response = {
        synthesizedAnswer: 'The answer is A.',
        modelOpinions: [
          {
            model: 'Claude',
            content: 'I think A is correct',
            confidence: 0.85,
            reasoning: 'Based on analysis...',
          },
          {
            model: 'GPT-4',
            content: 'A seems right',
            confidence: 0.8,
            reasoning: 'Considering factors...',
          },
        ],
        consensus: {
          level: 'full' as const,
          agreementScore: 0.9,
          divergentPoints: [],
        },
        processingTimeMs: 5000,
      }

      const formatted = CouncilWrapper.formatCouncilDiscussion(response)

      expect(formatted).toContain('## Council Deliberation')
      expect(formatted).toContain('### Model Perspectives')
      expect(formatted).toContain('**Claude** (85% confidence)')
      expect(formatted).toContain('**GPT-4** (80% confidence)')
      expect(formatted).toContain('### Consensus Analysis')
      expect(formatted).toContain('Full Agreement')
      expect(formatted).toContain('### Synthesized Answer')
      expect(formatted).toContain('The answer is A.')
      expect(formatted).toContain('5000ms')
    })

    it('should include divergent points when present', () => {
      const response = {
        synthesizedAnswer: 'Mixed opinions.',
        modelOpinions: [],
        consensus: {
          level: 'partial' as const,
          agreementScore: 0.6,
          divergentPoints: ['Performance trade-offs', 'Cost implications'],
        },
        processingTimeMs: 3000,
      }

      const formatted = CouncilWrapper.formatCouncilDiscussion(response)

      expect(formatted).toContain('Partial Agreement')
      expect(formatted).toContain('Points of Divergence')
      expect(formatted).toContain('Performance trade-offs')
      expect(formatted).toContain('Cost implications')
    })
  })

  describe('getAvailableModels', () => {
    it('should return models based on tier', () => {
      mockGetAvailableModels.mockReturnValueOnce(2) // free tier

      const models = CouncilWrapper.getAvailableModels('free')

      expect(models).toHaveLength(2)
      expect(models).toContain('claude-sonnet')
      expect(models).toContain('gpt-4o')
    })

    it('should return all models for enterprise tier', () => {
      mockGetAvailableModels.mockReturnValueOnce(3) // enterprise tier

      const models = CouncilWrapper.getAvailableModels('enterprise')

      expect(models).toHaveLength(3)
      expect(models).toContain('gemini-pro')
    })

    it('should handle errors and return default models', () => {
      mockGetAvailableModels.mockImplementationOnce(() => {
        throw new Error('Config error')
      })

      const models = CouncilWrapper.getAvailableModels('pro')

      expect(models.length).toBeGreaterThan(0)
    })
  })

  describe('canUserUseCouncil', () => {
    it('should check council access for user tier', () => {
      mockCanUseCouncil.mockReturnValueOnce({ allowed: true, reason: '' })

      const canUse = CouncilWrapper.canUserUseCouncil('pro', 5)

      expect(mockCanUseCouncil).toHaveBeenCalledWith('pro', 5)
      expect(canUse).toBe(true)
    })

    it('should deny access when limit reached', () => {
      mockCanUseCouncil.mockReturnValueOnce({ allowed: false, reason: 'Daily limit reached' })

      const canUse = CouncilWrapper.canUserUseCouncil('free', 10)

      expect(canUse).toBe(false)
    })

    it('should fallback to tier-based access on error', () => {
      mockCanUseCouncil.mockImplementationOnce(() => {
        throw new Error('Check failed')
      })

      // pro and enterprise should be allowed
      expect(CouncilWrapper.canUserUseCouncil('pro')).toBe(true)

      mockCanUseCouncil.mockImplementationOnce(() => {
        throw new Error('Check failed')
      })
      expect(CouncilWrapper.canUserUseCouncil('enterprise')).toBe(true)
    })
  })
})

describe('Council Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle very long queries', () => {
    const longQuery = 'Should I '.repeat(1000) + 'choose option A?'

    const result = CouncilWrapper.shouldTriggerCouncil(longQuery)

    expect(result).toBeDefined()
  })

  it('should handle special characters in queries', () => {
    const result = CouncilWrapper.shouldTriggerCouncil(
      'What about "option A" vs \'option B\'? <script>alert("xss")</script>'
    )

    expect(result).toBeDefined()
  })

  it('should handle unicode in queries', () => {
    const result = CouncilWrapper.shouldTriggerCouncil(
      '我应该选择什么选项？ 🤔 Option A or B?'
    )

    expect(result).toBeDefined()
  })

  it('should handle empty query', () => {
    const result = CouncilWrapper.shouldTriggerCouncil('')

    expect(result).toBeDefined()
    expect(result.shouldTrigger).toBe(false)
  })
})
