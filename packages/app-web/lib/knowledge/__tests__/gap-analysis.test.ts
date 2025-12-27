/**
 * Gap Analysis Tests
 * Tests the core gap detection algorithm
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  analyzeKnowledgeGaps,
  canPerformGapAnalysis,
  invalidateGapCache,
  analyzeGapForDomain,
} from '../gap-analysis'

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    mSCItem: {
      findMany: vi.fn(),
    },
    userIntelligenceProfile: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../domain-extractor', () => ({
  extractDomains: vi.fn(),
  invalidateDomainCache: vi.fn(),
}))

vi.mock('../goal-domain-map', () => ({
  getExpectedDomains: vi.fn(),
  getGoalsFromMSC: vi.fn(),
  getGoalsFromUIP: vi.fn(),
}))

vi.mock('../uip/service', () => ({
  assembleUIP: vi.fn(),
}))

import { prisma } from '@/lib/db/prisma'
import { extractDomains } from '../domain-extractor'
import { getExpectedDomains, getGoalsFromMSC, getGoalsFromUIP } from '../goal-domain-map'

describe('Gap Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateGapCache('test-workspace')
  })

  describe('canPerformGapAnalysis', () => {
    it('should return false when vault is empty', async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(0)
      vi.mocked(getGoalsFromMSC).mockResolvedValue([])
      vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })

      const result = await canPerformGapAnalysis('test-workspace')

      expect(result.canAnalyze).toBe(false)
      expect(result.hasDocs).toBe(false)
      expect(result.reason).toContain('Upload some documents')
    })

    it('should return false when no goals set', async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(10)
      vi.mocked(getGoalsFromMSC).mockResolvedValue([])
      vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })

      const result = await canPerformGapAnalysis('test-workspace')

      expect(result.canAnalyze).toBe(false)
      expect(result.hasGoals).toBe(false)
      expect(result.reason).toContain('goals')
    })

    it('should return true when both docs and goals exist', async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(10)
      vi.mocked(getGoalsFromMSC).mockResolvedValue(['Launch product'])
      vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })

      const result = await canPerformGapAnalysis('test-workspace')

      expect(result.canAnalyze).toBe(true)
      expect(result.hasDocs).toBe(true)
      expect(result.hasGoals).toBe(true)
    })

    it('should combine goals from MSC and UIP', async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(10)
      vi.mocked(getGoalsFromMSC).mockResolvedValue([])
      vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: ['Build AI product'] })

      const result = await canPerformGapAnalysis('test-workspace', 'user-1')

      expect(result.canAnalyze).toBe(true)
      expect(result.hasGoals).toBe(true)
    })
  })

  describe('analyzeKnowledgeGaps', () => {
    describe('Edge Cases', () => {
      it('should handle empty vault', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [],
          totalDocuments: 0,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Build product'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })

        const result = await analyzeKnowledgeGaps('test-workspace')

        expect(result.hasDocs).toBe(false)
        expect(result.summary).toContain('Upload some documents')
      })

      it('should handle no goals', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [
            { name: 'Technical/Backend', confidence: 0.8, documentCount: 5, topDocuments: [], topics: [], coverageDepth: 'moderate' },
          ],
          totalDocuments: 5,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue([])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })

        const result = await analyzeKnowledgeGaps('test-workspace')

        expect(result.hasGoals).toBe(false)
        expect(result.summary).toContain('Tell me about your goals')
      })
    })

    describe('Gap Detection', () => {
      it('should identify gaps when expected domains are missing', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [
            { name: 'Technical/Backend', confidence: 0.8, documentCount: 10, topDocuments: [], topics: [], coverageDepth: 'deep' },
            { name: 'Technical/Frontend', confidence: 0.7, documentCount: 8, topDocuments: [], topics: [], coverageDepth: 'deep' },
          ],
          totalDocuments: 18,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Launch AI SaaS product'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })
        vi.mocked(getExpectedDomains).mockResolvedValue([
          { domain: 'Business/Marketing', importance: 'critical', reason: 'Need go-to-market strategy' },
          { domain: 'Business/Legal', importance: 'important', reason: 'Need terms of service' },
          { domain: 'Technical/Backend', importance: 'critical', reason: 'Need backend expertise' },
        ])

        const result = await analyzeKnowledgeGaps('test-workspace')

        expect(result.gaps.length).toBeGreaterThan(0)

        // Marketing should be a gap (not in vault)
        const marketingGap = result.gaps.find(g => g.domain === 'Business/Marketing')
        expect(marketingGap).toBeDefined()
        expect(marketingGap!.importance).toBe('critical')

        // Backend should NOT be a gap (has deep coverage)
        const backendGap = result.gaps.find(g => g.domain === 'Technical/Backend')
        expect(backendGap).toBeUndefined()
      })

      it('should flag shallow coverage as gaps for critical domains', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [
            { name: 'Business/Marketing', confidence: 0.5, documentCount: 2, topDocuments: [], topics: [], coverageDepth: 'shallow' },
          ],
          totalDocuments: 2,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Launch product'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })
        vi.mocked(getExpectedDomains).mockResolvedValue([
          { domain: 'Business/Marketing', importance: 'critical', reason: 'Need marketing' },
        ])

        const result = await analyzeKnowledgeGaps('test-workspace')

        // Shallow coverage (30%) should be flagged as gap for critical domain (threshold 60%)
        const marketingGap = result.gaps.find(g => g.domain === 'Business/Marketing')
        expect(marketingGap).toBeDefined()
        expect(marketingGap!.currentCoverage).toBe(30) // shallow = 30%
      })

      it('should not flag moderate coverage as gaps for helpful domains', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [
            { name: 'Personal/Productivity', confidence: 0.6, documentCount: 4, topDocuments: [], topics: [], coverageDepth: 'moderate' },
          ],
          totalDocuments: 4,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Build product'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })
        vi.mocked(getExpectedDomains).mockResolvedValue([
          { domain: 'Personal/Productivity', importance: 'helpful', reason: 'Nice to have' },
        ])

        const result = await analyzeKnowledgeGaps('test-workspace')

        // Moderate coverage (60%) should NOT be flagged for helpful domain (threshold 20%)
        const productivityGap = result.gaps.find(g => g.domain === 'Personal/Productivity')
        expect(productivityGap).toBeUndefined()
      })
    })

    describe('Gap Scoring and Prioritization', () => {
      it('should prioritize critical gaps over helpful gaps', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [],
          totalDocuments: 0,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Launch product'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })
        vi.mocked(getExpectedDomains).mockResolvedValue([
          { domain: 'Personal/Productivity', importance: 'helpful', reason: 'Nice to have' },
          { domain: 'Business/Marketing', importance: 'critical', reason: 'Must have' },
          { domain: 'Product/UX', importance: 'important', reason: 'Should have' },
        ])

        // Reset mock to return empty domains for this test
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [],
          totalDocuments: 5, // Has docs but no domain coverage
          analyzedAt: new Date(),
          cacheKey: 'test',
        })

        const result = await analyzeKnowledgeGaps('test-workspace')

        // Critical should come before important, which comes before helpful
        const marketingIndex = result.gaps.findIndex(g => g.domain === 'Business/Marketing')
        const uxIndex = result.gaps.findIndex(g => g.domain === 'Product/UX')
        const productivityIndex = result.gaps.findIndex(g => g.domain === 'Personal/Productivity')

        if (marketingIndex >= 0 && uxIndex >= 0) {
          expect(marketingIndex).toBeLessThan(uxIndex)
        }
        if (uxIndex >= 0 && productivityIndex >= 0) {
          expect(uxIndex).toBeLessThan(productivityIndex)
        }
      })
    })

    describe('Strengths Identification', () => {
      it('should identify domains with deep coverage as strengths', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [
            { name: 'Technical/Backend', confidence: 0.9, documentCount: 15, topDocuments: [], topics: [], coverageDepth: 'deep' },
            { name: 'Technical/Frontend', confidence: 0.85, documentCount: 12, topDocuments: [], topics: [], coverageDepth: 'deep' },
          ],
          totalDocuments: 27,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Build product'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })
        vi.mocked(getExpectedDomains).mockResolvedValue([])

        const result = await analyzeKnowledgeGaps('test-workspace')

        expect(result.strengths.length).toBe(2)
        expect(result.strengths.map(s => s.name)).toContain('Technical/Backend')
        expect(result.strengths.map(s => s.name)).toContain('Technical/Frontend')
      })
    })

    describe('Suggestions', () => {
      it('should include actionable suggestions for each gap', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [],
          totalDocuments: 5,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Launch product'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })
        vi.mocked(getExpectedDomains).mockResolvedValue([
          { domain: 'Business/Marketing', importance: 'critical', reason: 'Need marketing' },
        ])

        const result = await analyzeKnowledgeGaps('test-workspace')

        const marketingGap = result.gaps.find(g => g.domain === 'Business/Marketing')
        expect(marketingGap).toBeDefined()
        expect(marketingGap!.suggestions.length).toBeGreaterThan(0)
        expect(marketingGap!.suggestions[0].length).toBeGreaterThan(0)
      })
    })

    describe('TopN Limiting', () => {
      it('should limit results when topN is specified', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [],
          totalDocuments: 5,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Launch product'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })
        vi.mocked(getExpectedDomains).mockResolvedValue([
          { domain: 'Business/Marketing', importance: 'critical', reason: 'Gap 1' },
          { domain: 'Business/Legal', importance: 'critical', reason: 'Gap 2' },
          { domain: 'Business/Finance', importance: 'important', reason: 'Gap 3' },
          { domain: 'Product/UX', importance: 'important', reason: 'Gap 4' },
          { domain: 'Personal/Goals', importance: 'helpful', reason: 'Gap 5' },
        ])

        const result = await analyzeKnowledgeGaps('test-workspace', { topN: 3 })

        expect(result.gaps.length).toBeLessThanOrEqual(3)
      })
    })

    describe('Caching', () => {
      it('should use cache on subsequent calls', async () => {
        const mockExtract = vi.mocked(extractDomains)
        mockExtract.mockResolvedValue({
          domains: [],
          totalDocuments: 5,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Launch product'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })
        vi.mocked(getExpectedDomains).mockResolvedValue([])

        // First call
        await analyzeKnowledgeGaps('test-workspace')
        const firstCallCount = mockExtract.mock.calls.length

        // Second call should use cache
        await analyzeKnowledgeGaps('test-workspace')
        const secondCallCount = mockExtract.mock.calls.length

        expect(secondCallCount).toBe(firstCallCount) // No additional calls

        // Force refresh should call again
        await analyzeKnowledgeGaps('test-workspace', { forceRefresh: true })
        const thirdCallCount = mockExtract.mock.calls.length

        expect(thirdCallCount).toBe(firstCallCount + 1)
      })
    })
  })

  describe('analyzeGapForDomain', () => {
    it('should return specific domain gap', async () => {
      vi.mocked(extractDomains).mockResolvedValue({
        domains: [],
        totalDocuments: 5,
        analyzedAt: new Date(),
        cacheKey: 'test',
      })
      vi.mocked(getGoalsFromMSC).mockResolvedValue(['Launch product'])
      vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })
      vi.mocked(getExpectedDomains).mockResolvedValue([
        { domain: 'Business/Marketing', importance: 'critical', reason: 'Need marketing' },
      ])

      const gap = await analyzeGapForDomain('test-workspace', 'Business/Marketing')

      expect(gap).toBeDefined()
      expect(gap!.domain).toBe('Business/Marketing')
    })

    it('should return null for non-existent domain gap', async () => {
      vi.mocked(extractDomains).mockResolvedValue({
        domains: [
          { name: 'Technical/Backend', confidence: 0.9, documentCount: 15, topDocuments: [], topics: [], coverageDepth: 'deep' },
        ],
        totalDocuments: 15,
        analyzedAt: new Date(),
        cacheKey: 'test',
      })
      vi.mocked(getGoalsFromMSC).mockResolvedValue(['Build product'])
      vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })
      vi.mocked(getExpectedDomains).mockResolvedValue([
        { domain: 'Technical/Backend', importance: 'critical', reason: 'Need backend' },
      ])

      const gap = await analyzeGapForDomain('test-workspace', 'Technical/Backend')

      // Should be null because backend has deep coverage
      expect(gap).toBeNull()
    })
  })

  // Build Plan Scenarios
  describe('Build Plan Test Scenarios', () => {
    describe('Scenario 1: AI Founder with Technical Docs', () => {
      it('should identify marketing, fundraising, and legal as gaps', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [
            { name: 'Technical/Frontend', confidence: 0.8, documentCount: 10, topDocuments: ['React Architecture'], topics: ['react', 'frontend'], coverageDepth: 'deep' },
            { name: 'Technical/AI/ML', confidence: 0.9, documentCount: 8, topDocuments: ['OpenAI Integration'], topics: ['openai', 'llm'], coverageDepth: 'deep' },
            { name: 'Technical/Backend', confidence: 0.8, documentCount: 7, topDocuments: ['Database Schema'], topics: ['database', 'backend'], coverageDepth: 'deep' },
          ],
          totalDocuments: 25,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Launch AI SaaS product', 'Raise seed funding'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [], role: 'Founder' })
        vi.mocked(getExpectedDomains).mockResolvedValue([
          { domain: 'Business/Marketing', importance: 'critical', reason: 'Launching a product requires go-to-market strategy' },
          { domain: 'Business/Finance', importance: 'critical', reason: 'Fundraising requires financial projections' },
          { domain: 'Business/Legal', importance: 'important', reason: 'Need terms of service before launch' },
          { domain: 'Technical/AI/ML', importance: 'critical', reason: 'AI product needs AI expertise' },
        ])

        const result = await analyzeKnowledgeGaps('founder-workspace')

        // Should identify business gaps
        const gapDomains = result.gaps.map(g => g.domain)
        expect(gapDomains).toContain('Business/Marketing')
        expect(gapDomains).toContain('Business/Finance')
        expect(gapDomains).toContain('Business/Legal')

        // Should NOT identify AI/ML as gap (has deep coverage)
        expect(gapDomains).not.toContain('Technical/AI/ML')

        // Strengths should include technical domains
        expect(result.strengths.length).toBeGreaterThan(0)
      })
    })

    describe('Scenario 2: Marketer Missing Technical', () => {
      it('should identify analytics and technical gaps', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [
            { name: 'Business/Marketing', confidence: 0.9, documentCount: 12, topDocuments: ['SEO Strategy'], topics: ['seo', 'marketing'], coverageDepth: 'deep' },
          ],
          totalDocuments: 12,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Grow user acquisition', 'Improve conversion rates'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [], role: 'Marketing Lead' })
        vi.mocked(getExpectedDomains).mockResolvedValue([
          { domain: 'Product/Analytics', importance: 'critical', reason: 'Growth requires measuring funnels' },
          { domain: 'Product/UX', importance: 'important', reason: 'Retention depends on UX' },
          { domain: 'Business/Marketing', importance: 'critical', reason: 'Marketing expertise needed' },
        ])

        const result = await analyzeKnowledgeGaps('marketer-workspace')

        const gapDomains = result.gaps.map(g => g.domain)
        expect(gapDomains).toContain('Product/Analytics')
        expect(gapDomains).toContain('Product/UX')

        // Marketing should be a strength
        expect(result.strengths.map(s => s.name)).toContain('Business/Marketing')
      })
    })

    describe('Scenario 3: Well-Rounded Power User', () => {
      it('should find minimal gaps for user with broad coverage', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [
            { name: 'Technical/Backend', confidence: 0.9, documentCount: 10, topDocuments: [], topics: [], coverageDepth: 'deep' },
            { name: 'Business/Marketing', confidence: 0.85, documentCount: 8, topDocuments: [], topics: [], coverageDepth: 'deep' },
            { name: 'Business/Strategy', confidence: 0.8, documentCount: 6, topDocuments: [], topics: [], coverageDepth: 'moderate' },
            { name: 'Product/Analytics', confidence: 0.75, documentCount: 5, topDocuments: [], topics: [], coverageDepth: 'moderate' },
          ],
          totalDocuments: 29,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Scale existing business'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [], role: 'CEO' })
        vi.mocked(getExpectedDomains).mockResolvedValue([
          { domain: 'Business/Strategy', importance: 'critical', reason: 'Scaling needs strategy' },
          { domain: 'Business/Marketing', importance: 'important', reason: 'Growth needs marketing' },
        ])

        const result = await analyzeKnowledgeGaps('power-user-workspace')

        // Should have few or no critical gaps
        const criticalGaps = result.gaps.filter(g => g.importance === 'critical')
        expect(criticalGaps.length).toBeLessThanOrEqual(1)

        // Should have strengths
        expect(result.strengths.length).toBeGreaterThan(0)
      })
    })

    describe('Scenario 4: New User with Empty Vault', () => {
      it('should return empty vault message', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [],
          totalDocuments: 0,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue(['Learn web development'])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })

        const result = await analyzeKnowledgeGaps('new-user-workspace')

        expect(result.hasDocs).toBe(false)
        expect(result.summary).toContain('Upload some documents')
      })
    })

    describe('Scenario 5: No Goals Set', () => {
      it('should prompt user to set goals', async () => {
        vi.mocked(extractDomains).mockResolvedValue({
          domains: [
            { name: 'Technical/Backend', confidence: 0.7, documentCount: 5, topDocuments: [], topics: [], coverageDepth: 'moderate' },
          ],
          totalDocuments: 5,
          analyzedAt: new Date(),
          cacheKey: 'test',
        })
        vi.mocked(getGoalsFromMSC).mockResolvedValue([])
        vi.mocked(getGoalsFromUIP).mockResolvedValue({ goals: [] })

        const result = await analyzeKnowledgeGaps('no-goals-workspace')

        expect(result.hasGoals).toBe(false)
        expect(result.summary).toContain('goals')
        expect(result.gaps).toEqual([])
      })
    })
  })
})
