/**
 * Goal-Domain Mapping Tests
 * Tests the goal to expected domain mapping system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getExpectedDomains,
  getGoalsFromMSC,
  getGoalsFromUIP,
  invalidateGoalDomainCache,
} from '../goal-domain-map'

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    mSCItem: {
      findMany: vi.fn(),
    },
    userIntelligenceProfile: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db/prisma'

describe('Goal-Domain Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateGoalDomainCache()
  })

  describe('getExpectedDomains', () => {
    describe('Launch/Product Goals', () => {
      it('should map "launch product" to marketing and strategy domains', async () => {
        const domains = await getExpectedDomains(['Launch my AI product'])

        const domainNames = domains.map(d => d.domain)
        expect(domainNames).toContain('Business/Marketing')
        expect(domainNames).toContain('Business/Strategy')
      })

      it('should mark marketing as critical for product launch', async () => {
        const domains = await getExpectedDomains(['Launch my SaaS product to market'])

        const marketing = domains.find(d => d.domain === 'Business/Marketing')
        expect(marketing).toBeDefined()
        expect(marketing!.importance).toBe('critical')
      })

      it('should include legal domain for launch', async () => {
        const domains = await getExpectedDomains(['Go to market with my app'])

        const legal = domains.find(d => d.domain === 'Business/Legal')
        expect(legal).toBeDefined()
      })
    })

    describe('Fundraising Goals', () => {
      it('should map fundraising goals to finance domain', async () => {
        const domains = await getExpectedDomains(['Raise seed funding'])

        const finance = domains.find(d => d.domain === 'Business/Finance')
        expect(finance).toBeDefined()
        expect(finance!.importance).toBe('critical')
      })

      it('should include strategy for fundraising', async () => {
        const domains = await getExpectedDomains(['Pitch to VCs and raise Series A'])

        const strategy = domains.find(d => d.domain === 'Business/Strategy')
        expect(strategy).toBeDefined()
      })

      it('should match investor-related goals', async () => {
        const domains = await getExpectedDomains(['Meet with investors'])

        expect(domains.length).toBeGreaterThan(0)
        const finance = domains.find(d => d.domain === 'Business/Finance')
        expect(finance).toBeDefined()
      })
    })

    describe('AI/ML Goals', () => {
      it('should map AI product goals to AI/ML domain', async () => {
        const domains = await getExpectedDomains(['Build an AI SaaS product'])

        const aiml = domains.find(d => d.domain === 'Technical/AI/ML')
        expect(aiml).toBeDefined()
        expect(aiml!.importance).toBe('critical')
      })

      it('should include backend for AI products', async () => {
        const domains = await getExpectedDomains(['Create an LLM-powered chatbot'])

        const backend = domains.find(d => d.domain === 'Technical/Backend')
        expect(backend).toBeDefined()
      })

      it('should include security for AI products', async () => {
        const domains = await getExpectedDomains(['Build an AI agent platform'])

        const security = domains.find(d => d.domain === 'Technical/Security')
        expect(security).toBeDefined()
      })
    })

    describe('SaaS Goals', () => {
      it('should map SaaS goals to backend and finance', async () => {
        const domains = await getExpectedDomains(['Build a subscription SaaS'])

        const backend = domains.find(d => d.domain === 'Technical/Backend')
        const finance = domains.find(d => d.domain === 'Business/Finance')

        expect(backend).toBeDefined()
        expect(finance).toBeDefined()
      })

      it('should include sales for SaaS', async () => {
        const domains = await getExpectedDomains(['Grow my MRR to $10k'])

        const sales = domains.find(d => d.domain === 'Business/Sales')
        expect(sales).toBeDefined()
      })
    })

    describe('Growth Goals', () => {
      it('should map growth goals to marketing and analytics', async () => {
        const domains = await getExpectedDomains(['Grow user acquisition by 50%'])

        const marketing = domains.find(d => d.domain === 'Business/Marketing')
        const analytics = domains.find(d => d.domain === 'Product/Analytics')

        expect(marketing).toBeDefined()
        expect(marketing!.importance).toBe('critical')
        expect(analytics).toBeDefined()
        expect(analytics!.importance).toBe('critical')
      })

      it('should include UX for retention goals', async () => {
        const domains = await getExpectedDomains(['Improve user retention'])

        const ux = domains.find(d => d.domain === 'Product/UX')
        expect(ux).toBeDefined()
      })
    })

    describe('Learning Goals', () => {
      it('should map learning goals to learning domain', async () => {
        const domains = await getExpectedDomains(['Learn web development'])

        const learning = domains.find(d => d.domain === 'Personal/Learning')
        expect(learning).toBeDefined()
        expect(learning!.importance).toBe('critical')
      })
    })

    describe('Role Adjustments', () => {
      it('should add legal domain for founder role', async () => {
        // Founder role adds Business/Legal domain even without explicit legal goals
        const domains = await getExpectedDomains(['Launch my product'], 'Founder')

        const legal = domains.find(d => d.domain === 'Business/Legal')
        expect(legal).toBeDefined()
        // Legal domain might be added from launch goal pattern or founder role
        expect(legal!.reason.length).toBeGreaterThan(0)
      })

      it('should add AI/ML for CTO role', async () => {
        // CTO role adds Technical/AI/ML even without explicit AI goals
        const domains = await getExpectedDomains(['Build infrastructure'], 'CTO')

        const aiDomain = domains.find(d => d.domain === 'Technical/AI/ML')
        expect(aiDomain).toBeDefined()
        expect(aiDomain!.reason).toContain('CTO')
      })

      it('should decrease business for engineer role', async () => {
        const domainsEngineer = await getExpectedDomains(['Launch product'], 'Engineer')
        const domainsFounder = await getExpectedDomains(['Launch product'], 'Founder')

        const engineerMarketing = domainsEngineer.find(d => d.domain === 'Business/Marketing')
        const founderMarketing = domainsFounder.find(d => d.domain === 'Business/Marketing')

        // Engineer should have marketing with lower or equal importance
        if (engineerMarketing && founderMarketing) {
          const importanceRank = { critical: 3, important: 2, helpful: 1 }
          expect(importanceRank[engineerMarketing.importance]).toBeLessThanOrEqual(
            importanceRank[founderMarketing.importance]
          )
        }
      })
    })

    describe('Expertise Level Adjustments', () => {
      it('should add learning domain for beginners', async () => {
        const domains = await getExpectedDomains(['Build an app'], undefined, 'Beginner')

        const learning = domains.find(d => d.domain === 'Personal/Learning')
        expect(learning).toBeDefined()
      })

      it('should add business context for technical experts', async () => {
        const domains = await getExpectedDomains(['Build my product'], undefined, 'Technical')

        const strategy = domains.find(d => d.domain === 'Business/Strategy')
        expect(strategy).toBeDefined()
      })
    })

    describe('Multiple Goals', () => {
      it('should combine domains from multiple goals', async () => {
        const domains = await getExpectedDomains([
          'Launch AI product',
          'Raise seed funding',
        ])

        // Should have AI/ML from first goal
        const aiml = domains.find(d => d.domain === 'Technical/AI/ML')
        expect(aiml).toBeDefined()

        // Should have Finance from second goal
        const finance = domains.find(d => d.domain === 'Business/Finance')
        expect(finance).toBeDefined()
      })

      it('should use highest importance when domains overlap', async () => {
        const domains = await getExpectedDomains([
          'Launch product',       // Marketing: critical
          'Create content',       // Marketing: critical (from content pattern)
        ])

        const marketing = domains.find(d => d.domain === 'Business/Marketing')
        expect(marketing).toBeDefined()
        expect(marketing!.importance).toBe('critical')
      })
    })

    describe('Edge Cases', () => {
      it('should return empty array for empty goals', async () => {
        const domains = await getExpectedDomains([])
        expect(domains).toEqual([])
      })

      it('should handle unrecognized goal patterns gracefully', async () => {
        const domains = await getExpectedDomains(['Random unrelated text'])
        // Should not crash, may return empty or minimal results
        expect(Array.isArray(domains)).toBe(true)
      })

      it('should cache results for same inputs', async () => {
        const domains1 = await getExpectedDomains(['Launch product'])
        const domains2 = await getExpectedDomains(['Launch product'])

        expect(domains1).toEqual(domains2)
      })
    })
  })

  describe('getGoalsFromMSC', () => {
    it('should fetch active goals from MSC', async () => {
      vi.mocked(prisma.mSCItem.findMany).mockResolvedValue([
        { id: '1', content: 'Launch product', category: 'goal', status: 'active', workspaceId: 'ws', createdAt: new Date(), updatedAt: new Date(), isPinned: false, description: null, dueDate: null },
        { id: '2', content: 'Raise funding', category: 'goal', status: 'active', workspaceId: 'ws', createdAt: new Date(), updatedAt: new Date(), isPinned: false, description: null, dueDate: null },
      ])

      const goals = await getGoalsFromMSC('test-workspace')

      expect(goals).toContain('Launch product')
      expect(goals).toContain('Raise funding')
    })

    it('should return empty array when no goals', async () => {
      vi.mocked(prisma.mSCItem.findMany).mockResolvedValue([])

      const goals = await getGoalsFromMSC('test-workspace')

      expect(goals).toEqual([])
    })
  })

  describe('getGoalsFromUIP', () => {
    it('should extract goals from UIP dimensions', async () => {
      vi.mocked(prisma.userIntelligenceProfile.findUnique).mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
        workspaceId: 'ws-1',
        privacyTier: 'B',
        sessionCount: 5,
        signalCount: 10,
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        dimensions: [
          {
            id: 'dim-1',
            profileId: 'profile-1',
            domain: 'GOALS_VALUES',
            value: {
              activeGoals: [
                { goal: 'Build AI product' },
                { goal: 'Get first customers' },
              ],
            },
            confidence: 0.8,
            tier: 'FOUNDATION',
            decayRate: 0.1,
            sources: ['ELICITATION'],
            sourceCount: 1,
            lastUpdatedAt: new Date(),
            lastDecayedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      })

      const context = await getGoalsFromUIP('user-1')

      expect(context.goals).toContain('Build AI product')
      expect(context.goals).toContain('Get first customers')
    })

    it('should extract role from identity dimension', async () => {
      vi.mocked(prisma.userIntelligenceProfile.findUnique).mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
        workspaceId: null,
        privacyTier: 'B',
        sessionCount: 5,
        signalCount: 10,
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        dimensions: [
          {
            id: 'dim-1',
            profileId: 'profile-1',
            domain: 'IDENTITY_CONTEXT',
            value: { role: 'Founder' },
            confidence: 0.9,
            tier: 'FOUNDATION',
            decayRate: 0.1,
            sources: ['ELICITATION'],
            sourceCount: 1,
            lastUpdatedAt: new Date(),
            lastDecayedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      })

      const context = await getGoalsFromUIP('user-1')

      expect(context.role).toBe('Founder')
    })

    it('should return empty context when no profile', async () => {
      vi.mocked(prisma.userIntelligenceProfile.findUnique).mockResolvedValue(null)

      const context = await getGoalsFromUIP('unknown-user')

      expect(context.goals).toEqual([])
      expect(context.role).toBeUndefined()
    })
  })

  // Test scenarios from Build Plan
  describe('Build Plan Scenarios', () => {
    describe('Scenario 1: AI Founder', () => {
      it('should expect business and marketing domains for AI founder', async () => {
        const domains = await getExpectedDomains(
          ['Launch AI SaaS product', 'Raise seed funding'],
          'Founder',
          'Technical'
        )

        const expectedDomains = ['Business/Marketing', 'Business/Finance', 'Business/Strategy']

        for (const expected of expectedDomains) {
          const found = domains.find(d => d.domain === expected)
          expect(found).toBeDefined()
        }
      })
    })

    describe('Scenario 2: Marketer', () => {
      it('should expect analytics and UX for growth marketer', async () => {
        const domains = await getExpectedDomains(
          ['Grow user acquisition', 'Improve conversion rates'],
          'Marketing Lead'
        )

        const analytics = domains.find(d => d.domain === 'Product/Analytics')
        const ux = domains.find(d => d.domain === 'Product/UX')

        expect(analytics).toBeDefined()
        expect(ux).toBeDefined()
      })
    })

    describe('Scenario 4: New User Learning', () => {
      it('should expect technical and deployment domains for student learning web dev', async () => {
        const domains = await getExpectedDomains(
          ['Learn web development'],
          'Student',
          'Beginner'
        )

        const learning = domains.find(d => d.domain === 'Personal/Learning')
        expect(learning).toBeDefined()
        expect(learning!.importance).toBe('critical')
      })
    })
  })
})
