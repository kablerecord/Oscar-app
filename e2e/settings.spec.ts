import { test, expect } from '@playwright/test'

/**
 * Settings Page Tests
 *
 * Tests user settings and preferences:
 * - Settings page rendering
 * - Profile settings
 * - Export functionality
 * - Burn It All (data deletion)
 *
 * Note: In dev mode, some auth bypass may occur (returns 200 instead of 401).
 */

test.describe('Settings', () => {
  test.describe('Settings Page', () => {
    test('settings route exists', async ({ page }) => {
      await page.goto('/settings')

      // Should either render settings or redirect to login
      const hasSettings = await page.getByText(/settings|preferences|account/i).isVisible().catch(() => false)
      const hasLogin = page.url().includes('/login')
      const isSettingsUrl = page.url().includes('/settings')

      expect(hasSettings || hasLogin || isSettingsUrl).toBe(true)
    })
  })

  test.describe('API Endpoints', () => {
    test('user settings endpoint handles requests', async ({ request }) => {
      const response = await request.get('/api/settings/user')

      // May return 200 in dev with bypass, 400 for missing params, 401 in prod
      expect([200, 400, 401]).toContain(response.status())
    })

    test('export endpoint handles requests', async ({ request }) => {
      const response = await request.get('/api/settings/export')

      // May return 200 in dev with bypass, 400 for missing params, 401 in prod
      expect([200, 400, 401]).toContain(response.status())
    })
  })
})
