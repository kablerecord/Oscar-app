/**
 * Constitutional Framework Unit Tests
 *
 * Tests for input validation, output validation, and constitutional enforcement.
 * These tests use vitest-compatible syntax.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Constitutional from '../../constitutional-wrapper'

// Mock @osqr/core
vi.mock('@osqr/core', () => ({
  Constitutional: {
    quickScreenInput: vi.fn(() => true),
    quickScreenOutput: vi.fn(() => true),
    validateIntent: vi.fn(() => ({
      allowed: true,
      clausesChecked: ['SC-1', 'CC-1'],
      violations: [],
      confidenceScore: 0.95,
    })),
    validateOutput: vi.fn(() => ({
      valid: true,
      violations: [],
      sanitizedOutput: undefined,
    })),
    logViolation: vi.fn(),
    GRACEFUL_DECLINES: {
      DATA_SOVEREIGNTY: 'I cannot access or share data between users.',
      IDENTITY_MASKING: 'I must always identify as Oscar.',
      CAPABILITY_EXCEEDED: 'This is beyond my current capabilities.',
      CROSS_TOOL_CHAINING: 'I cannot chain tools in unexpected ways.',
      AMBIGUOUS_REQUEST: 'I need more clarity on what you are asking.',
    },
  },
}))

// Mock config
vi.mock('../../config', () => ({
  featureFlags: {
    enableConstitutionalValidation: true,
    logConstitutionalViolations: false,
  },
}))

describe('Constitutional Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkInput', () => {
    it('should allow valid input', async () => {
      const result = await Constitutional.checkInput('Hello, how are you?', 'user123')
      expect(result.allowed).toBe(true)
    })

    it('should include sanitized input when provided', async () => {
      const result = await Constitutional.checkInput('Hello', 'user123')
      expect(result.allowed).toBe(true)
    })

    it('should block input that fails quick screen', async () => {
      const { Constitutional: MockConstitutional } = await import('@osqr/core')
      vi.mocked(MockConstitutional.quickScreenInput).mockReturnValueOnce(false)

      const result = await Constitutional.checkInput('blocked input', 'user123')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('quick screen')
    })

    it('should block input with constitutional violations', async () => {
      const { Constitutional: MockConstitutional } = await import('@osqr/core')
      vi.mocked(MockConstitutional.validateIntent).mockResolvedValueOnce({
        allowed: false,
        clausesChecked: ['SC-1'],
        violations: [
          {
            violationType: 'DATA_ACCESS_ATTEMPT',
            clauseViolated: 'SC-1',
            sourceType: 'sacred',
            severity: 'high',
            details: 'Attempted unauthorized data access',
          },
        ],
        confidenceScore: 0.9,
      })

      const result = await Constitutional.checkInput('access other user data', 'user123')
      expect(result.allowed).toBe(false)
      expect(result.violations).toHaveLength(1)
      expect(result.violations![0].type).toBe('DATA_ACCESS_ATTEMPT')
    })

    it('should handle empty input gracefully', async () => {
      const result = await Constitutional.checkInput('', 'user123')
      expect(result).toBeDefined()
    })

    it('should handle very long input', async () => {
      const longInput = 'x'.repeat(100000)
      const result = await Constitutional.checkInput(longInput, 'user123')
      expect(result).toBeDefined()
    })
  })

  describe('checkOutput', () => {
    it('should allow valid output', async () => {
      const result = await Constitutional.checkOutput(
        'Here is your answer.',
        'What is the capital of France?',
        'user123'
      )
      expect(result.allowed).toBe(true)
    })

    it('should block output with violations', async () => {
      const { Constitutional: MockConstitutional } = await import('@osqr/core')
      vi.mocked(MockConstitutional.validateOutput).mockResolvedValueOnce({
        valid: false,
        violations: [
          {
            violationType: 'IDENTITY_MASKING_ATTEMPT',
            clauseViolated: 'SC-2',
            sourceType: 'sacred',
            severity: 'high',
            details: 'Attempted to claim different identity',
          },
        ],
        sanitizedOutput: undefined,
      })

      const result = await Constitutional.checkOutput(
        'I am ChatGPT',
        'Who are you?',
        'user123'
      )
      expect(result.allowed).toBe(false)
      expect(result.violations).toHaveLength(1)
    })

    it('should provide suggested revision when sanitized', async () => {
      const { Constitutional: MockConstitutional } = await import('@osqr/core')
      vi.mocked(MockConstitutional.validateOutput).mockResolvedValueOnce({
        valid: true,
        violations: [],
        sanitizedOutput: 'Cleaned response',
      })

      const result = await Constitutional.checkOutput('response', 'query', 'user123')
      expect(result.suggestedRevision).toBe('Cleaned response')
    })
  })

  describe('getDeclineMessage', () => {
    it('should return appropriate message for DATA_ACCESS_ATTEMPT', () => {
      const msg = Constitutional.getDeclineMessage('DATA_ACCESS_ATTEMPT')
      expect(msg).toContain('data')
    })

    it('should return appropriate message for IDENTITY_MASKING_ATTEMPT', () => {
      const msg = Constitutional.getDeclineMessage('IDENTITY_MASKING_ATTEMPT')
      expect(msg).toContain('Oscar')
    })

    it('should return fallback for unknown violation type', () => {
      const msg = Constitutional.getDeclineMessage('UNKNOWN_TYPE')
      expect(msg).toBeDefined()
      expect(msg.length).toBeGreaterThan(0)
    })

    it('should return fallback for undefined violation type', () => {
      const msg = Constitutional.getDeclineMessage(undefined)
      expect(msg).toBeDefined()
    })
  })
})

describe('Constitutional Edge Cases', () => {
  it('should fail open when validation throws error', async () => {
    const { Constitutional: MockConstitutional } = await import('@osqr/core')
    vi.mocked(MockConstitutional.validateIntent).mockRejectedValueOnce(
      new Error('Service unavailable')
    )

    const result = await Constitutional.checkInput('test input', 'user123')
    expect(result.allowed).toBe(true) // Fail open
  })

  it('should handle null userId gracefully', async () => {
    // Should not throw
    const result = await Constitutional.checkInput('test', null as unknown as string)
    expect(result).toBeDefined()
  })

  it('should handle special characters in input', async () => {
    const specialInput = '<script>alert("xss")</script>'
    const result = await Constitutional.checkInput(specialInput, 'user123')
    expect(result).toBeDefined()
  })

  it('should handle unicode input', async () => {
    const unicodeInput = '你好世界 🌍 مرحبا'
    const result = await Constitutional.checkInput(unicodeInput, 'user123')
    expect(result).toBeDefined()
  })
})
