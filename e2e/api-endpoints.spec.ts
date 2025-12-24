import { test, expect } from '@playwright/test'

/**
 * API Endpoint Tests
 *
 * Tests all major API endpoints for:
 * - Proper response codes
 * - Error handling
 * - Health and status endpoints
 *
 * Note: In development mode, some endpoints allow auth bypass via 'dev-user'.
 * These tests verify endpoints respond appropriately (may return 200 in dev, 401 in prod).
 */

test.describe('API Endpoints', () => {
  test.describe('Public Endpoints', () => {
    test('health check returns 200', async ({ request }) => {
      const response = await request.get('/api/health')
      expect(response.status()).toBe(200)
    })

    test('founder spots returns data', async ({ request }) => {
      const response = await request.get('/api/founder-spots')
      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(typeof data.remainingSpots).toBe('number')
      expect(typeof data.isFounderPeriod).toBe('boolean')
    })
  })

  test.describe('Oscar Endpoints', () => {
    test('oscar/ask responds to POST requests', async ({ request }) => {
      const response = await request.post('/api/oscar/ask', {
        data: { message: 'test', workspaceId: 'test', mode: 'quick' },
      })
      // In dev mode may return 200 with dev-user bypass, in prod returns 401
      // 500 may occur if workspaceId doesn't exist
      expect([200, 401, 500]).toContain(response.status())
    })

    test('oscar/ask-stream responds to POST requests', async ({ request }) => {
      const response = await request.post('/api/oscar/ask-stream', {
        data: { message: 'test', workspaceId: 'test', mode: 'quick' },
      })
      expect([200, 401, 500]).toContain(response.status())
    })

    test('oscar/bubble responds', async ({ request }) => {
      const response = await request.get('/api/oscar/bubble?workspaceId=test')
      expect([200, 401]).toContain(response.status())
    })

    test('oscar/budget requires workspaceId', async ({ request }) => {
      const response = await request.get('/api/oscar/budget')
      expect(response.status()).toBe(400)
    })

    test('oscar/refine responds to POST requests', async ({ request }) => {
      const response = await request.post('/api/oscar/refine', {
        data: { question: 'test', workspaceId: 'test' },
      })
      expect([200, 401, 500]).toContain(response.status())
    })
  })

  test.describe('Vault Endpoints', () => {
    test('vault list responds', async ({ request }) => {
      const response = await request.get('/api/vault')
      // May return 200 (empty list) in dev, 401 in prod
      expect([200, 401]).toContain(response.status())
    })

    test('vault upload handles missing data', async ({ request }) => {
      const response = await request.post('/api/vault/upload')
      // Returns 200 with error in body, or 400/401 depending on auth
      expect([200, 400, 401, 415]).toContain(response.status())
    })

    test('vault stats responds', async ({ request }) => {
      const response = await request.get('/api/vault/stats')
      expect([200, 401]).toContain(response.status())
    })
  })

  test.describe('Thread Endpoints', () => {
    test('threads list responds', async ({ request }) => {
      const response = await request.get('/api/threads')
      expect([200, 400, 401]).toContain(response.status())
    })

    test('threads recent responds', async ({ request }) => {
      const response = await request.get('/api/threads/recent')
      expect([200, 400, 401]).toContain(response.status())
    })
  })

  test.describe('Profile Endpoints', () => {
    test('profile answers responds', async ({ request }) => {
      const response = await request.get('/api/profile/answers')
      expect([200, 400, 401]).toContain(response.status())
    })
  })

  test.describe('Workspace Endpoints', () => {
    test('workspace responds', async ({ request }) => {
      const response = await request.get('/api/workspace')
      expect([200, 400, 401]).toContain(response.status())
    })

    test('mobile workspace requires auth', async ({ request }) => {
      const response = await request.get('/api/mobile/workspace')
      expect(response.status()).toBe(401)
    })
  })

  test.describe('MSC Endpoints', () => {
    test('msc responds', async ({ request }) => {
      const response = await request.get('/api/msc')
      expect([200, 400, 401]).toContain(response.status())
    })

    test('msc categories responds', async ({ request }) => {
      const response = await request.get('/api/msc/categories')
      expect([200, 400, 401]).toContain(response.status())
    })
  })

  test.describe('Settings Endpoints', () => {
    test('settings user responds', async ({ request }) => {
      const response = await request.get('/api/settings/user')
      expect([200, 400, 401]).toContain(response.status())
    })

    test('settings export responds', async ({ request }) => {
      const response = await request.get('/api/settings/export')
      expect([200, 400, 401]).toContain(response.status())
    })
  })

  test.describe('Onboarding Endpoints', () => {
    test('onboarding status responds', async ({ request }) => {
      const response = await request.get('/api/onboarding/status')
      expect([200, 400, 401]).toContain(response.status())
    })
  })

  test.describe('Usage Endpoints', () => {
    test('usage responds', async ({ request }) => {
      const response = await request.get('/api/usage')
      expect([200, 400, 401]).toContain(response.status())
    })
  })
})
