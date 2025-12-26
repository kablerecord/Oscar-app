/**
 * Constitutional Wrapper Unit Tests
 *
 * Tests for the constitutional-wrapper STUB implementation.
 *
 * NOTE: The constitutional-wrapper is currently a STUB implementation that
 * returns all checks as allowed. These tests verify the stub behavior.
 * When @osqr/core is fully integrated, these tests should be updated.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as Constitutional from '../../constitutional-wrapper'

// Mock config
vi.mock('../../config', () => ({
  featureFlags: {
    enableConstitutionalValidation: true,
    logConstitutionalViolations: false,
  },
}))

describe('Constitutional Wrapper (Stub Mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkInput', () => {
    it('should always allow input in stub mode', async () => {
      const result = await Constitutional.checkInput('Hello, how are you?', 'user123')
      expect(result.allowed).toBe(true)
    })

    it('should return allowed for any input', async () => {
      const result = await Constitutional.checkInput('any input at all', 'user123')
      expect(result.allowed).toBe(true)
    })

    it('should handle empty input gracefully', async () => {
      const result = await Constitutional.checkInput('', 'user123')
      expect(result).toBeDefined()
      expect(result.allowed).toBe(true)
    })

    it('should handle very long input', async () => {
      const longInput = 'x'.repeat(100000)
      const result = await Constitutional.checkInput(longInput, 'user123')
      expect(result).toBeDefined()
      expect(result.allowed).toBe(true)
    })

    it('should handle special characters in input', async () => {
      const specialInput = '<script>alert("xss")</script>'
      const result = await Constitutional.checkInput(specialInput, 'user123')
      expect(result).toBeDefined()
      expect(result.allowed).toBe(true)
    })

    it('should handle unicode input', async () => {
      const unicodeInput = '你好世界 🌍 مرحبا'
      const result = await Constitutional.checkInput(unicodeInput, 'user123')
      expect(result).toBeDefined()
      expect(result.allowed).toBe(true)
    })
  })

  describe('checkOutput', () => {
    it('should always allow output in stub mode', async () => {
      const result = await Constitutional.checkOutput(
        'Here is your answer.',
        'What is the capital of France?',
        'user123'
      )
      expect(result.allowed).toBe(true)
    })

    it('should return allowed for any output', async () => {
      const result = await Constitutional.checkOutput(
        'I am ChatGPT',
        'Who are you?',
        'user123'
      )
      expect(result.allowed).toBe(true)
    })
  })

  describe('getDeclineMessage', () => {
    it('should return default decline message', () => {
      const msg = Constitutional.getDeclineMessage('DATA_ACCESS_ATTEMPT')
      expect(msg).toBe("I'm unable to help with that request.")
    })

    it('should return same message for any violation type', () => {
      const msg1 = Constitutional.getDeclineMessage('DATA_ACCESS_ATTEMPT')
      const msg2 = Constitutional.getDeclineMessage('IDENTITY_MASKING_ATTEMPT')
      const msg3 = Constitutional.getDeclineMessage('UNKNOWN_TYPE')
      expect(msg1).toBe(msg2)
      expect(msg2).toBe(msg3)
    })

    it('should return default for undefined violation type', () => {
      const msg = Constitutional.getDeclineMessage(undefined)
      expect(msg).toBeDefined()
      expect(msg).toBe("I'm unable to help with that request.")
    })
  })
})
