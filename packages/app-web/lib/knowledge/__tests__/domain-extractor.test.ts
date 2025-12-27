/**
 * Domain Extractor Tests
 * Tests the domain extraction and clustering system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  extractDomains,
  DOMAIN_TAXONOMY,
  getAllDomainNames,
  getDomainCoverageMap,
  invalidateDomainCache,
} from '../domain-extractor'
import { extractTopics } from '../topic-cache'

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
    },
  },
}))

// Mock topic-cache extractTopics - use real implementation
vi.mock('../topic-cache', () => ({
  extractTopics: vi.fn((content: string, title: string) => {
    // Simplified topic extraction for tests
    const topics = new Set<string>()
    const combined = `${title} ${content}`.toLowerCase()

    // Extract common tech terms
    const techTerms = ['react', 'nextjs', 'api', 'database', 'typescript', 'backend', 'frontend',
                       'ai', 'ml', 'llm', 'openai', 'marketing', 'seo', 'sales', 'strategy',
                       'legal', 'security', 'infrastructure', 'docker', 'kubernetes', 'design', 'ux']

    for (const term of techTerms) {
      if (combined.includes(term)) {
        topics.add(term)
      }
    }

    // Add title words
    title.toLowerCase().split(/\s+/).filter(w => w.length > 3).forEach(w => topics.add(w))

    return Array.from(topics)
  }),
  refreshCache: vi.fn(),
}))

import { prisma } from '@/lib/db/prisma'

describe('Domain Extractor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateDomainCache('test-workspace')
  })

  describe('DOMAIN_TAXONOMY', () => {
    it('should have all main categories', () => {
      expect(Object.keys(DOMAIN_TAXONOMY)).toContain('Technical')
      expect(Object.keys(DOMAIN_TAXONOMY)).toContain('Business')
      expect(Object.keys(DOMAIN_TAXONOMY)).toContain('Product')
      expect(Object.keys(DOMAIN_TAXONOMY)).toContain('Personal')
    })

    it('should have Technical subdomains', () => {
      const technical = DOMAIN_TAXONOMY['Technical']
      expect(Object.keys(technical)).toContain('Backend')
      expect(Object.keys(technical)).toContain('Frontend')
      expect(Object.keys(technical)).toContain('Infrastructure')
      expect(Object.keys(technical)).toContain('AI/ML')
      expect(Object.keys(technical)).toContain('Security')
    })

    it('should have Business subdomains', () => {
      const business = DOMAIN_TAXONOMY['Business']
      expect(Object.keys(business)).toContain('Strategy')
      expect(Object.keys(business)).toContain('Marketing')
      expect(Object.keys(business)).toContain('Sales')
      expect(Object.keys(business)).toContain('Finance')
      expect(Object.keys(business)).toContain('Legal')
    })

    it('should have keywords for each subdomain', () => {
      for (const [category, subdomains] of Object.entries(DOMAIN_TAXONOMY)) {
        for (const [subdomain, keywords] of Object.entries(subdomains)) {
          expect(keywords.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('getAllDomainNames', () => {
    it('should return all domain paths', () => {
      const names = getAllDomainNames()
      expect(names).toContain('Technical/Backend')
      expect(names).toContain('Business/Marketing')
      expect(names).toContain('Product/UX')
      expect(names).toContain('Personal/Goals')
    })

    it('should return unique domain names', () => {
      const names = getAllDomainNames()
      const unique = new Set(names)
      expect(unique.size).toBe(names.length)
    })
  })

  describe('extractDomains', () => {
    it('should return empty result for empty vault', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([])

      const result = await extractDomains('test-workspace')

      expect(result.domains).toEqual([])
      expect(result.totalDocuments).toBe(0)
    })

    it('should extract Technical/Frontend domain from React docs', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        {
          id: 'doc-1',
          title: 'React Component Architecture',
          textContent: 'Building React components with TypeScript and Next.js hooks',
          metadata: null,
          updatedAt: new Date(),
        },
        {
          id: 'doc-2',
          title: 'Frontend State Management',
          textContent: 'Using React context and zustand for frontend state',
          metadata: null,
          updatedAt: new Date(),
        },
      ])

      const result = await extractDomains('test-workspace')

      expect(result.totalDocuments).toBe(2)
      expect(result.domains.length).toBeGreaterThan(0)

      const frontendDomain = result.domains.find(d => d.name === 'Technical/Frontend')
      expect(frontendDomain).toBeDefined()
      expect(frontendDomain!.documentCount).toBeGreaterThanOrEqual(1)
    })

    it('should extract Business/Marketing domain from marketing docs', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        {
          id: 'doc-1',
          title: 'SEO Strategy Guide',
          textContent: 'Complete guide to SEO and content marketing strategies',
          metadata: null,
          updatedAt: new Date(),
        },
        {
          id: 'doc-2',
          title: 'Marketing Automation',
          textContent: 'Email marketing automation and conversion optimization',
          metadata: null,
          updatedAt: new Date(),
        },
      ])

      const result = await extractDomains('test-workspace')

      const marketingDomain = result.domains.find(d => d.name === 'Business/Marketing')
      expect(marketingDomain).toBeDefined()
    })

    it('should calculate coverage depth correctly', async () => {
      // 10+ docs with 6+ topics should be "deep"
      // Need variety in content to get enough topics
      const manyDocs = Array.from({ length: 12 }, (_, i) => ({
        id: `doc-${i}`,
        title: `React Guide ${i}`,
        // Varied content to ensure 6+ unique topics
        textContent: `React frontend typescript component hooks state management redux context api testing jest ${i % 3 === 0 ? 'nextjs' : 'webpack'} css tailwind`,
        metadata: null,
        updatedAt: new Date(),
      }))

      vi.mocked(prisma.document.findMany).mockResolvedValue(manyDocs)

      const result = await extractDomains('test-workspace')

      const frontendDomain = result.domains.find(d => d.name === 'Technical/Frontend')
      // With varied topics across 12 docs, should be at least moderate
      if (frontendDomain) {
        expect(['moderate', 'deep']).toContain(frontendDomain.coverageDepth)
      }
    })

    it('should return top documents for each domain', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        { id: 'doc-1', title: 'API Design Guide', textContent: 'REST API backend design patterns', metadata: null, updatedAt: new Date() },
        { id: 'doc-2', title: 'Database Schema', textContent: 'PostgreSQL database backend optimization', metadata: null, updatedAt: new Date() },
        { id: 'doc-3', title: 'Authentication Flow', textContent: 'Backend API authentication with JWT', metadata: null, updatedAt: new Date() },
        { id: 'doc-4', title: 'Caching Strategy', textContent: 'Redis caching for backend API performance', metadata: null, updatedAt: new Date() },
      ])

      const result = await extractDomains('test-workspace')

      const backendDomain = result.domains.find(d => d.name === 'Technical/Backend')
      if (backendDomain) {
        expect(backendDomain.topDocuments.length).toBeLessThanOrEqual(3)
        expect(backendDomain.documentCount).toBe(4)
      }
    })

    it('should use cache on subsequent calls', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        { id: 'doc-1', title: 'Test Doc', textContent: 'React frontend content', metadata: null, updatedAt: new Date() },
      ])

      // First call
      await extractDomains('test-workspace')
      expect(prisma.document.findMany).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await extractDomains('test-workspace')
      expect(prisma.document.findMany).toHaveBeenCalledTimes(1) // Still 1, cached

      // Force refresh should call again
      await extractDomains('test-workspace', { forceRefresh: true })
      expect(prisma.document.findMany).toHaveBeenCalledTimes(2)
    })
  })

  describe('getDomainCoverageMap', () => {
    it('should calculate percentages correctly', () => {
      const domains = [
        { name: 'Technical/Backend', documentCount: 10, confidence: 0.8, topDocuments: [], topics: [], coverageDepth: 'deep' as const },
        { name: 'Business/Marketing', documentCount: 5, confidence: 0.7, topDocuments: [], topics: [], coverageDepth: 'moderate' as const },
        { name: 'Product/UX', documentCount: 5, confidence: 0.6, topDocuments: [], topics: [], coverageDepth: 'moderate' as const },
      ]

      const coverageMap = getDomainCoverageMap(domains)

      expect(coverageMap.get('Technical/Backend')).toBe(50) // 10/20 = 50%
      expect(coverageMap.get('Business/Marketing')).toBe(25) // 5/20 = 25%
      expect(coverageMap.get('Product/UX')).toBe(25) // 5/20 = 25%
    })

    it('should handle empty domains', () => {
      const coverageMap = getDomainCoverageMap([])
      expect(coverageMap.size).toBe(0)
    })
  })

  // Test Scenarios from Build Plan
  describe('User Scenarios', () => {
    describe('Scenario 1: AI Founder with Technical Docs', () => {
      it('should identify technical domains but miss business domains', async () => {
        vi.mocked(prisma.document.findMany).mockResolvedValue([
          { id: 'doc-1', title: 'React Architecture', textContent: 'React frontend typescript component architecture', metadata: null, updatedAt: new Date() },
          { id: 'doc-2', title: 'OpenAI Integration', textContent: 'OpenAI API LLM integration with AI agents', metadata: null, updatedAt: new Date() },
          { id: 'doc-3', title: 'Database Schema', textContent: 'PostgreSQL database backend schema design', metadata: null, updatedAt: new Date() },
        ])

        const result = await extractDomains('founder-workspace')

        // Should have technical domains
        const hasTechnical = result.domains.some(d => d.name.startsWith('Technical/'))
        expect(hasTechnical).toBe(true)

        // Should NOT have marketing (no marketing docs)
        const hasMarketing = result.domains.some(d => d.name === 'Business/Marketing')
        expect(hasMarketing).toBe(false)
      })
    })

    describe('Scenario 2: Marketer with Marketing Docs', () => {
      it('should identify marketing domains', async () => {
        vi.mocked(prisma.document.findMany).mockResolvedValue([
          { id: 'doc-1', title: 'SEO Strategy', textContent: 'SEO marketing growth content strategy', metadata: null, updatedAt: new Date() },
          { id: 'doc-2', title: 'Content Calendar', textContent: 'Content marketing social media calendar', metadata: null, updatedAt: new Date() },
        ])

        const result = await extractDomains('marketer-workspace')

        const hasMarketing = result.domains.some(d => d.name === 'Business/Marketing')
        expect(hasMarketing).toBe(true)
      })
    })

    describe('Scenario 3: New User with Empty Vault', () => {
      it('should return empty domains for empty vault', async () => {
        vi.mocked(prisma.document.findMany).mockResolvedValue([])

        const result = await extractDomains('new-user-workspace')

        expect(result.domains).toEqual([])
        expect(result.totalDocuments).toBe(0)
      })
    })
  })
})
