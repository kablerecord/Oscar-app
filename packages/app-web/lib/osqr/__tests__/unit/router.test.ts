/**
 * Router Wrapper Unit Tests
 *
 * Tests for the router-wrapper STUB implementation.
 *
 * NOTE: The router-wrapper is currently a STUB implementation that returns
 * default routing values. These tests verify the stub behavior.
 * When @osqr/core is fully integrated, these tests should be updated.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as RouterWrapper from '../../router-wrapper'
import { TaskType, ComplexityTier } from '../../router-wrapper'

describe('Router Wrapper (Stub Mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('quickRoute', () => {
    it('should return default routing for any input', () => {
      const result = RouterWrapper.quickRoute('Hello, how are you?')
      expect(result).toBeDefined()
      expect(result.taskType).toBe(TaskType.GENERAL)
      expect(result.complexity).toBe(ComplexityTier.COMPLEX)
      expect(result.recommendedModel).toBe('claude-sonnet-4-20250514')
    })

    it('should return confidence score', () => {
      const result = RouterWrapper.quickRoute('What is 2+2?')
      expect(result.confidence).toBe(0.8)
    })

    it('should provide convenience aliases', () => {
      const result = RouterWrapper.quickRoute('test query')
      expect(result.tier).toBe('complex')
      expect(result.model).toBe('claude-sonnet-4-20250514')
      expect(result.model).toBe(result.recommendedModel)
    })

    it('should handle empty input', () => {
      const result = RouterWrapper.quickRoute('')
      expect(result).toBeDefined()
      expect(result.recommendedModel).toBe('claude-sonnet-4-20250514')
    })

    it('should handle very long input', () => {
      const longInput = 'explain '.repeat(10000) + 'complex topic'
      const result = RouterWrapper.quickRoute(longInput)
      expect(result).toBeDefined()
      expect(result.recommendedModel).toBe('claude-sonnet-4-20250514')
    })
  })

  describe('fullRoute', () => {
    it('should return full route result', async () => {
      const result = await RouterWrapper.fullRoute('What is machine learning?')
      expect(result).toBeDefined()
      expect(result.classificationLatencyMs).toBe(0)
      expect(result.shouldUseCouncil).toBe(false)
      expect(result.contextNeeded).toEqual([])
    })

    it('should include context needs as empty array', async () => {
      const result = await RouterWrapper.fullRoute('complex question')
      expect(result.contextNeeded).toBeDefined()
      expect(Array.isArray(result.contextNeeded)).toBe(true)
      expect(result.contextNeeded).toEqual([])
    })

    it('should always return shouldUseCouncil as false in stub mode', async () => {
      const result = await RouterWrapper.fullRoute('strategic question')
      expect(result.shouldUseCouncil).toBe(false)
    })

    it('should return same model regardless of input', async () => {
      const result1 = await RouterWrapper.fullRoute('simple question')
      const result2 = await RouterWrapper.fullRoute('complex strategic planning')
      expect(result1.recommendedModel).toBe(result2.recommendedModel)
    })
  })

  describe('getModel', () => {
    it('should return default model', async () => {
      const model = await RouterWrapper.getModel('simple question')
      expect(model).toBe('claude-sonnet-4-20250514')
    })

    it('should return same model for any input', async () => {
      const model1 = await RouterWrapper.getModel('code')
      const model2 = await RouterWrapper.getModel('strategy')
      expect(model1).toBe(model2)
    })
  })

  describe('shouldUseFastPath', () => {
    it('should always return false in stub mode', () => {
      expect(RouterWrapper.shouldUseFastPath('Hello')).toBe(false)
      expect(RouterWrapper.shouldUseFastPath('complex question')).toBe(false)
    })
  })

  describe('isCodeQuestion', () => {
    it('should detect code-related keywords', () => {
      expect(RouterWrapper.isCodeQuestion('write a Python function')).toBe(true)
      expect(RouterWrapper.isCodeQuestion('implement a class')).toBe(true)
      expect(RouterWrapper.isCodeQuestion('build a component')).toBe(true)
    })

    it('should return false for non-code questions', () => {
      expect(RouterWrapper.isCodeQuestion('what is the weather?')).toBe(false)
      expect(RouterWrapper.isCodeQuestion('hello world')).toBe(false)
    })
  })

  describe('isStrategicQuestion', () => {
    it('should detect strategy-related keywords', () => {
      expect(RouterWrapper.isStrategicQuestion('what should my 5-year plan be?')).toBe(true)
      expect(RouterWrapper.isStrategicQuestion('what strategy should I use?')).toBe(true)
      expect(RouterWrapper.isStrategicQuestion('design an architecture')).toBe(true)
    })

    it('should return false for non-strategic questions', () => {
      expect(RouterWrapper.isStrategicQuestion('hello world')).toBe(false)
      expect(RouterWrapper.isStrategicQuestion('what is 2+2')).toBe(false)
    })
  })
})

describe('Router Edge Cases', () => {
  it('should handle special characters in query', () => {
    const result = RouterWrapper.quickRoute('What is <script>alert(1)</script>?')
    expect(result).toBeDefined()
    expect(result.recommendedModel).toBe('claude-sonnet-4-20250514')
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
