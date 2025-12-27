/**
 * Test Setup for Background Tasks Tests
 */

import { vi, afterEach, afterAll } from 'vitest'

// Mock environment variables
// @ts-expect-error - NODE_ENV assignment for test setup
process.env.NODE_ENV = 'test'
process.env.OPENAI_API_KEY = 'test-key'
process.env.CRON_SECRET = 'test-cron-secret'

// Global mock for console to reduce test noise
const originalConsoleLog = console.log
const originalConsoleError = console.error

console.log = (...args: unknown[]) => {
  const message = args[0]
  if (typeof message === 'string' && message.includes('[Task')) {
    return // Suppress task logs during tests
  }
  originalConsoleLog.apply(console, args)
}

console.error = (...args: unknown[]) => {
  const message = args[0]
  if (typeof message === 'string' && message.includes('[Task')) {
    return // Suppress task error logs during tests
  }
  originalConsoleError.apply(console, args)
}

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks()
  console.log = originalConsoleLog
  console.error = originalConsoleError
})
