/**
 * Throttle Wrapper Unit Tests
 *
 * Tests for budget management, query limits, and tier enforcement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as ThrottleWrapper from '../../throttle-wrapper'

// Mock @osqr/core
vi.mock('@osqr/core', () => ({
  Throttle: {
    canQuery: vi.fn(() => true),
    getThrottleStatus: vi.fn(() => ({
      canMakeQuery: true,
      budgetState: 'healthy',
      statusMessage: 'All good',
      tierConfig: { queriesPerDay: 100 },
    })),
    getQueriesRemaining: vi.fn(() => 95),
    processQueryRequest: vi.fn(() =>
      Promise.resolve({
        allowed: true,
        model: {
          id: 'claude-sonnet-4-20250514',
          model: 'Claude Sonnet 4',
          tier: 'pro',
          maxTokens: 4000,
        },
        message: 'Query allowed',
        degraded: false,
      })
    ),
    recordQuery: vi.fn(),
    hasFeatureAccess: vi.fn((tier, feature) => {
      const access: Record<string, Record<string, boolean>> = {
        starter: {
          contemplateMode: false,
          councilMode: false,
          voiceMode: false,
          customPersona: false,
          prioritySupport: false,
        },
        pro: {
          contemplateMode: false,
          councilMode: false,
          voiceMode: true,
          customPersona: true,
          prioritySupport: false,
        },
        master: {
          contemplateMode: true,
          councilMode: true,
          voiceMode: true,
          customPersona: true,
          prioritySupport: true,
        },
        enterprise: {
          contemplateMode: true,
          councilMode: true,
          voiceMode: true,
          customPersona: true,
          prioritySupport: true,
        },
      }
      return access[tier]?.[feature] ?? false
    }),
    getGracefulDegradationMessage: vi.fn(() => ''),
    getUpgradePrompt: vi.fn(() => 'Upgrade to Pro for more features'),
    getUpgradePath: vi.fn((tier) => {
      // The wrapper maps 'starter' -> 'lite', so this mock receives 'lite'
      const paths: Record<string, string | null> = {
        lite: 'pro',
        pro: 'master',
        master: 'enterprise',
        enterprise: null,
      }
      return paths[tier]
    }),
    getOveragePackages: vi.fn(() => [
      { id: 'pkg-10', name: '10 Extra Queries', queries: 10, price: 5 },
      { id: 'pkg-50', name: '50 Extra Queries', queries: 50, price: 20 },
    ]),
    purchaseOverage: vi.fn(() => ({ queriesRemaining: 10 })),
    getBudgetStatusMessage: vi.fn(() => 'You have 95 queries remaining today'),
    getQueryCountMessage: vi.fn(() => '5 of 100 queries used today'),
    addReferralBonus: vi.fn(),
    getReferralBonusRemaining: vi.fn(() => 0),
    setPersistenceAdapter: vi.fn(),
  },
}))

// Mock config
vi.mock('../../config', () => ({
  featureFlags: {
    enableThrottle: true,
    logThrottleDecisions: false,
  },
  initializeBudgetPersistence: vi.fn(),
}))

describe('Throttle Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('canQuery', () => {
    it('should return true when user has budget', () => {
      const result = ThrottleWrapper.canQuery('user123', 'pro')
      expect(result).toBe(true)
    })

    it('should return false when budget exhausted', async () => {
      const { Throttle } = await import('@osqr/core')
      vi.mocked(Throttle.canQuery).mockReturnValueOnce(false)

      const result = ThrottleWrapper.canQuery('user123', 'starter')
      expect(result).toBe(false)
    })

    it('should fail open on error', async () => {
      const { Throttle } = await import('@osqr/core')
      vi.mocked(Throttle.canQuery).mockImplementationOnce(() => {
        throw new Error('Service error')
      })

      const result = ThrottleWrapper.canQuery('user123', 'pro')
      expect(result).toBe(true) // Fail open
    })
  })

  describe('getThrottleStatus', () => {
    it('should return complete status object', () => {
      const status = ThrottleWrapper.getThrottleStatus('user123', 'pro')
      expect(status).toBeDefined()
      expect(status.tier).toBe('pro')
      expect(status.canQuery).toBeDefined()
      expect(status.queriesRemaining).toBeDefined()
      expect(status.queriesTotal).toBeDefined()
      expect(status.budgetState).toBeDefined()
      expect(status.statusMessage).toBeDefined()
      expect(status.upgradeAvailable).toBeDefined()
    })

    it('should indicate upgrade available for non-enterprise', () => {
      const status = ThrottleWrapper.getThrottleStatus('user123', 'pro')
      expect(status.upgradeAvailable).toBe(true)
    })

    it('should indicate no upgrade for enterprise', async () => {
      const { Throttle } = await import('@osqr/core')
      vi.mocked(Throttle.getUpgradePath).mockReturnValueOnce(null)

      const status = ThrottleWrapper.getThrottleStatus('user123', 'enterprise')
      expect(status.upgradeAvailable).toBe(false)
    })

    it('should map osqr-core budget states correctly', async () => {
      const { Throttle } = await import('@osqr/core')
      vi.mocked(Throttle.getThrottleStatus).mockReturnValueOnce({
        canMakeQuery: false,
        budgetState: 'exhausted',
        statusMessage: 'Budget depleted',
        tierConfig: { queriesPerDay: 100 },
      })

      const status = ThrottleWrapper.getThrottleStatus('user123', 'starter')
      expect(status.budgetState).toBe('depleted')
    })
  })

  describe('processQuery', () => {
    it('should process allowed query', async () => {
      const result = await ThrottleWrapper.processQuery('user123', 'pro', {
        query: 'test query',
      })
      expect(result.allowed).toBe(true)
      expect(result.model).toBeDefined()
      expect(result.model!.id).toBeDefined()
    })

    it('should handle denied query', async () => {
      const { Throttle } = await import('@osqr/core')
      vi.mocked(Throttle.processQueryRequest).mockResolvedValueOnce({
        allowed: false,
        model: null,
        message: 'Budget exhausted',
        degraded: false,
      })

      const result = await ThrottleWrapper.processQuery('user123', 'starter', {
        query: 'test',
      })
      expect(result.allowed).toBe(false)
      expect(result.model).toBeNull()
    })

    it('should include degradation info', async () => {
      const { Throttle } = await import('@osqr/core')
      vi.mocked(Throttle.processQueryRequest).mockResolvedValueOnce({
        allowed: true,
        model: {
          id: 'gpt-4o-mini',
          model: 'GPT-4o Mini',
          tier: 'economy',
          maxTokens: 2000,
        },
        message: 'Using economy model',
        degraded: true,
      })

      const result = await ThrottleWrapper.processQuery('user123', 'starter', {
        query: 'test',
      })
      expect(result.degraded).toBe(true)
    })

    it('should fail open on error', async () => {
      const { Throttle } = await import('@osqr/core')
      vi.mocked(Throttle.processQueryRequest).mockRejectedValueOnce(new Error('API error'))

      const result = await ThrottleWrapper.processQuery('user123', 'pro', {
        query: 'test',
      })
      expect(result.allowed).toBe(true) // Fail open
    })
  })

  describe('getFeatureAccess', () => {
    it('should return feature access for starter tier', () => {
      const access = ThrottleWrapper.getFeatureAccess('starter')
      expect(access.contemplateMode).toBe(false)
      expect(access.councilMode).toBe(false)
    })

    it('should return feature access for pro tier', () => {
      const access = ThrottleWrapper.getFeatureAccess('pro')
      expect(access.voiceMode).toBe(true)
      expect(access.customPersona).toBe(true)
    })

    it('should return feature access for master tier', () => {
      const access = ThrottleWrapper.getFeatureAccess('master')
      expect(access.contemplateMode).toBe(true)
      expect(access.councilMode).toBe(true)
      expect(access.prioritySupport).toBe(true)
    })
  })

  describe('hasFeature', () => {
    it('should check specific feature access', () => {
      const hasCouncil = ThrottleWrapper.hasFeature('master', 'councilMode')
      expect(hasCouncil).toBe(true)

      const starterCouncil = ThrottleWrapper.hasFeature('starter', 'councilMode')
      expect(starterCouncil).toBe(false)
    })
  })

  describe('purchaseOverage', () => {
    it('should process overage purchase', () => {
      const result = ThrottleWrapper.purchaseOverage('user123', 'pro', 'pkg-10')
      expect(result.success).toBe(true)
      expect(result.queriesAdded).toBe(10)
    })

    it('should handle invalid package', async () => {
      const { Throttle } = await import('@osqr/core')
      vi.mocked(Throttle.purchaseOverage).mockReturnValueOnce(null)

      const result = ThrottleWrapper.purchaseOverage('user123', 'pro', 'invalid-pkg')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('getUpgradePath', () => {
    it('should return next tier for starter', () => {
      const next = ThrottleWrapper.getUpgradePath('starter')
      expect(next).toBe('pro')
    })

    it('should return null for enterprise', () => {
      const next = ThrottleWrapper.getUpgradePath('enterprise')
      expect(next).toBeNull()
    })
  })
})

describe('Throttle Tier Boundary Tests', () => {
  it('should enforce starter tier limits', async () => {
    const status = ThrottleWrapper.getThrottleStatus('user123', 'starter')
    const access = ThrottleWrapper.getFeatureAccess('starter')

    expect(access.contemplateMode).toBe(false)
    expect(access.councilMode).toBe(false)
  })

  it('should enforce pro tier limits', async () => {
    const access = ThrottleWrapper.getFeatureAccess('pro')

    expect(access.contemplateMode).toBe(false) // Pro doesn't get Contemplate
    expect(access.councilMode).toBe(false) // Pro doesn't get Council
    expect(access.voiceMode).toBe(true)
  })

  it('should allow all features for master tier', async () => {
    const access = ThrottleWrapper.getFeatureAccess('master')

    expect(access.contemplateMode).toBe(true)
    expect(access.councilMode).toBe(true)
    expect(access.voiceMode).toBe(true)
    expect(access.customPersona).toBe(true)
    expect(access.prioritySupport).toBe(true)
  })
})
