import { defineConfig, devices } from '@playwright/test'

/**
 * OSQR End-to-End Test Configuration
 *
 * Runs against the local development server or production.
 * Tests simulate real user interactions with all OSQR features.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // Base URL for all tests - use local dev server by default
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',

    // Collect trace on failure for debugging
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure (helps debug flaky tests)
    video: 'on-first-retry',
  },

  projects: [
    // Desktop Chrome (primary)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile Safari (for mobile app testing)
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],

  // Run the local dev server before tests
  webServer: {
    command: 'pnpm --filter @osqr/app-web dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
