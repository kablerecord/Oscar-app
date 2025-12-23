/**
 * Router Wrapper Unit Tests
 *
 * Tests for question classification, complexity estimation, and model routing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as RouterWrapper from '../../router-wrapper'
import { TaskType, ComplexityTier } from '@osqr/core'

// Mock @osqr/core
vi.mock('@osqr/core', () => ({
  Router: {
    quickClassify: vi.fn(() => ({
      taskType: 'GENERAL_CHAT',
      complexityTier: 1, // SIMPLE
      confidenceScore: 0.85,
      reasoning: 'Basic conversational query',
      requiredContext: [],
    })),
    classifyTask: vi.fn(() =>
      Promise.resolve({
        taskType: 'GENERAL_CHAT',
        complexityTier: 1,
        confidenceScore: 0.9,
        reasoning: 'LLM classification result',
        requiredContext: ['memory'],
      })
    ),
    detectTaskType: vi.fn(() => 'GENERAL_CHAT'),
    estimateComplexity: vi.fn(() => 1),
    getRecommendedModel: vi.fn(() => Promise.resolve('claude-sonnet-4-20250514')),
    healthCheck: vi.fn(() => Promise.resolve({ status: 'ok', providers: {} })),
  },
  TaskType: {
    GENERAL_CHAT: 'GENERAL_CHAT',
    CODE_GENERATION: 'CODE_GENERATION',
    CODE_REVIEW: 'CODE_REVIEW',
    STRATEGIC_PLANNING: 'STRATEGIC_PLANNING',
    MULTI_MODEL_DELIBERATION: 'MULTI_MODEL_DELIBERATION',
  },
  ComplexityTier: {
    ROUTING: 0,
    SIMPLE: 1,
    COMPLEX: 2,
    STRATEGIC: 3,
  },
}))

// Mock config
vi.mock('../../config', () => ({
  routerConfig: {
    escalationThreshold: 0.7,
    highConfidenceThreshold: 0.95,
    maxEscalations: 2,
  },
  featureFlags: {
    enableRouterMRP: true,
    enableSmartRouting: true,
  },
}))

describe('Router Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('quickRoute', () => {
    it('should classify simple questions quickly', () => {
      const result = RouterWrapper.quickRoute('Hello, how are you?')
      expect(result).toBeDefined()
      expect(result.taskType).toBeDefined()
      expect(result.complexity).toBeDefined()
      expect(result.recommendedModel).toBeDefined()
    })

    it('should return confidence score', () => {
      const result = RouterWrapper.quickRoute('What is 2+2?')
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('should provide convenience aliases', () => {
      const result = RouterWrapper.quickRoute('test query')
      expect(result.tier).toBeDefined()
      expect(result.model).toBeDefined()
      expect(result.model).toBe(result.recommendedModel)
    })

    it('should handle empty input', () => {
      const result = RouterWrapper.quickRoute('')
      expect(result).toBeDefined()
    })

    it('should handle very long input', () => {
      const longInput = 'explain '.repeat(10000) + 'complex topic'
      const result = RouterWrapper.quickRoute(longInput)
      expect(result).toBeDefined()
    })
  })

  describe('fullRoute', () => {
    it('should perform full LLM-based classification', async () => {
      const result = await RouterWrapper.fullRoute('What is machine learning?')
      expect(result).toBeDefined()
      expect(result.classificationLatencyMs).toBeGreaterThanOrEqual(0)
    })

    it('should include context needs', async () => {
      const result = await RouterWrapper.fullRoute('complex question')
      expect(result.contextNeeded).toBeDefined()
      expect(Array.isArray(result.contextNeeded)).toBe(true)
    })

    it('should determine if council mode should trigger', async () => {
      const result = await RouterWrapper.fullRoute('strategic question')
      expect(typeof result.shouldUseCouncil).toBe('boolean')
    })

    it('should fall back to quick route on error', async () => {
      const { Router } = await import('@osqr/core')
      vi.mocked(Router.classifyTask).mockRejectedValueOnce(new Error('API error'))

      const result = await RouterWrapper.fullRoute('test query')
      expect(result).toBeDefined()
      expect(result.shouldUseCouncil).toBe(false)
    })

    it('should respect forceModel option', async () => {
      const result = await RouterWrapper.fullRoute('test', {
        forceModel: 'custom-model',
      })
      expect(result.recommendedModel).toBe('custom-model')
    })
  })

  describe('getModel', () => {
    it('should return recommended model for input', async () => {
      const model = await RouterWrapper.getModel('simple question')
      expect(model).toBeDefined()
      expect(typeof model).toBe('string')
    })

    it('should fall back on error', async () => {
      const { Router } = await import('@osqr/core')
      vi.mocked(Router.getRecommendedModel).mockRejectedValueOnce(new Error('API error'))

      const model = await RouterWrapper.getModel('test')
      expect(model).toBeDefined()
    })
  })

  describe('shouldUseFastPath', () => {
    it('should return true for simple high-confidence queries', () => {
      const result = RouterWrapper.shouldUseFastPath('Hello')
      expect(typeof result).toBe('boolean')
    })

    it('should return false for strategic queries', async () => {
      const { Router } = await import('@osqr/core')
      vi.mocked(Router.quickClassify).mockReturnValueOnce({
        taskType: 'STRATEGIC_PLANNING' as TaskType,
        complexityTier: 3 as ComplexityTier,
        confidenceScore: 0.9,
        reasoning: 'Strategic planning query',
        requiredContext: [],
      })

      const result = RouterWrapper.shouldUseFastPath('plan my business strategy')
      expect(result).toBe(false)
    })
  })

  describe('isCodeQuestion', () => {
    it('should detect code generation questions', async () => {
      const { Router } = await import('@osqr/core')
      vi.mocked(Router.detectTaskType).mockReturnValueOnce('CODE_GENERATION' as TaskType)

      const result = RouterWrapper.isCodeQuestion('write a Python function')
      expect(result).toBe(true)
    })

    it('should detect code review questions', async () => {
      const { Router } = await import('@osqr/core')
      vi.mocked(Router.detectTaskType).mockReturnValueOnce('CODE_REVIEW' as TaskType)

      const result = RouterWrapper.isCodeQuestion('review this code')
      expect(result).toBe(true)
    })

    it('should return false for non-code questions', () => {
      const result = RouterWrapper.isCodeQuestion('what is the weather?')
      expect(result).toBe(false)
    })
  })

  describe('isStrategicQuestion', () => {
    it('should detect strategic planning questions', async () => {
      const { Router } = await import('@osqr/core')
      vi.mocked(Router.detectTaskType).mockReturnValueOnce('STRATEGIC_PLANNING' as TaskType)

      const result = RouterWrapper.isStrategicQuestion('what should my 5-year plan be?')
      expect(result).toBe(true)
    })

    it('should detect multi-model deliberation triggers', async () => {
      const { Router } = await import('@osqr/core')
      vi.mocked(Router.detectTaskType).mockReturnValueOnce('MULTI_MODEL_DELIBERATION' as TaskType)

      const result = RouterWrapper.isStrategicQuestion('compare perspectives on climate change')
      expect(result).toBe(true)
    })
  })
})

describe('Router Edge Cases', () => {
  it('should handle special characters in query', () => {
    const result = RouterWrapper.quickRoute('What is <script>alert(1)</script>?')
    expect(result).toBeDefined()
  })

  it('should handle unicode queries', () => {
    const result = RouterWrapper.quickRoute('解释机器学习')
    expect(result).toBeDefined()
  })

  it('should handle newlines in query', () => {
    const result = RouterWrapper.quickRoute('Line 1\nLine 2\nLine 3')
    expect(result).toBeDefined()
  })

  it('should handle only whitespace', () => {
    const result = RouterWrapper.quickRoute('   \t\n  ')
    expect(result).toBeDefined()
  })
})
