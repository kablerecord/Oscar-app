import { test, expect } from '@playwright/test'

/**
 * Pricing Page Tests
 *
 * Tests the pricing page and tier display:
 * - Pricing page rendering
 * - Tier cards display
 * - Feature lists
 * - CTA buttons
 */

test.describe('Pricing Page', () => {
  test('pricing page renders correctly', async ({ page }) => {
    await page.goto('/pricing')

    // The pricing page shows "Don't Just Ask AI. Start Thinking With One." as the main heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('displays all pricing tiers', async ({ page }) => {
    await page.goto('/pricing')

    // Should show OSQR Pro tier heading
    await expect(page.getByRole('heading', { name: 'OSQR Pro' })).toBeVisible()

    // Should show OSQR Master tier heading
    await expect(page.getByRole('heading', { name: 'OSQR Master' })).toBeVisible()

    // Should show Enterprise option heading
    await expect(page.getByRole('heading', { name: 'OSQR Enterprise' })).toBeVisible()
  })

  test('shows pricing amounts', async ({ page }) => {
    await page.goto('/pricing')

    // Should display price amounts with $ sign (e.g., $99, $249)
    await expect(page.locator('text=/\\$\\d+/').first()).toBeVisible()
  })

  test('has call-to-action buttons', async ({ page }) => {
    await page.goto('/pricing')

    // CTA buttons are "Get OSQR Pro", "Get OSQR Master", "Contact Us"
    const ctaButton = page.getByRole('button', { name: /get|contact/i }).first()
    await expect(ctaButton).toBeVisible()
  })

  test('founder spots API is accessible', async ({ request }) => {
    const response = await request.get('/api/founder-spots')

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.remainingSpots).toBeDefined()
    expect(data.isFounderPeriod).toBeDefined()
  })
})
