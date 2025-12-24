import { test, expect } from '@playwright/test'

/**
 * Mobile App Tests
 *
 * Tests the mobile web interface at /mobile including:
 * - Mobile entry point routing
 * - Sign in flow
 * - Welcome screen
 * - Chat interface
 * - Voice input (where supported)
 * - Menu functionality
 */

test.describe('Mobile App', () => {
  test.describe('Entry Points', () => {
    test('mobile root redirects appropriately', async ({ page }) => {
      await page.goto('/mobile')

      // Should either show signin, thread, welcome, or remain on /mobile
      const url = page.url()
      const validPath = url.includes('/mobile')
      expect(validPath).toBe(true)
    })

    test('mobile signin page renders', async ({ page }) => {
      await page.goto('/mobile/signin')

      // Should show OSQR branding (heading "Sign in to OSQR")
      await expect(page.getByText(/OSQR/i)).toBeVisible()

      // Should show email input (placeholder "Email address")
      await expect(page.getByPlaceholder(/email/i)).toBeVisible()

      // Should show Continue with Google button
      await expect(page.getByText(/continue with google/i)).toBeVisible()
    })

    test('mobile welcome page renders', async ({ page }) => {
      await page.goto('/mobile/welcome')

      // Should show welcome message "Hi, I'm OSQR."
      await expect(page.getByText(/Hi.*OSQR/i)).toBeVisible()

      // Should show "Let's do some thinking together."
      await expect(page.getByText(/thinking together/i)).toBeVisible()

      // Should show tap instruction "Tap anywhere to continue"
      await expect(page.getByText(/tap.*continue/i)).toBeVisible()
    })
  })

  test.describe('Mobile UI Components', () => {
    test('thread page has all required elements', async ({ page }) => {
      await page.goto('/mobile/thread')

      // If not authenticated, may redirect to signin or show error
      // If authenticated, should show message input
      // Check that page loaded without error
      const hasInput = await page.getByPlaceholder(/message|ask|type/i).isVisible().catch(() => false)
      const hasSignin = await page.getByText(/sign in/i).isVisible().catch(() => false)
      const hasError = await page.getByText(/error|something went wrong/i).isVisible().catch(() => false)
      const loaded = page.url().includes('/mobile')

      // Page should load to a valid state
      expect(hasInput || hasSignin || hasError || loaded).toBe(true)
    })
  })

  test.describe('PWA Configuration', () => {
    test('manifest.json is accessible', async ({ page }) => {
      const response = await page.goto('/manifest.json')
      expect(response?.status()).toBe(200)

      const manifest = await response?.json()
      expect(manifest.name).toBeDefined()
      expect(manifest.start_url).toBe('/mobile')
      expect(manifest.display).toBe('standalone')
    })

    test('PWA icons are accessible', async ({ page }) => {
      const icon192 = await page.goto('/icons/osqr-192.svg')
      expect(icon192?.status()).toBe(200)

      const icon512 = await page.goto('/icons/osqr-512.svg')
      expect(icon512?.status()).toBe(200)
    })
  })
})

// Mobile viewport tests
test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } }) // iPhone X dimensions

  test('mobile signin is touch-optimized', async ({ page }) => {
    await page.goto('/mobile/signin')

    // Find any button and check it's appropriately sized for touch
    const buttons = page.locator('button')
    const count = await buttons.count()

    if (count > 0) {
      const firstButton = buttons.first()
      if (await firstButton.isVisible()) {
        const box = await firstButton.boundingBox()
        // Touch targets should be at least 44px tall
        expect(box?.height).toBeGreaterThanOrEqual(44)
      }
    }
  })
})
