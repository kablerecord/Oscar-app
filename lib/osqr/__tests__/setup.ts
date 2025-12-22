/**
 * Test Setup for OSQR Tests
 *
 * This file is loaded before all tests.
 */

import { vi } from 'vitest'

// Mock environment variables
process.env.NODE_ENV = 'test'

// Global mock for console to reduce test noise
const originalConsoleError = console.error
console.error = (...args: unknown[]) => {
  // Suppress expected error messages during tests
  const message = args[0]
  if (typeof message === 'string' && message.includes('[OSQR]')) {
    return // Suppress OSQR error logs during tests
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
  console.error = originalConsoleError
})
