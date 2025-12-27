/**
 * Goal-Domain Mapping - Maps User Goals to Expected Knowledge Domains
 *
 * Infers what knowledge domains a user should have based on their goals,
 * role, and expertise level from the UIP system.
 *
 * @example
 * ```typescript
 * const expected = await getExpectedDomains(
 *   ['Launch AI SaaS product', 'Raise seed funding'],
 *   'Founder',
 *   'Technical'
 * )
 * // Returns: [{ domain: 'Business/Marketing', importance: 'critical', reason: '...' }]
 * ```
 */

import { prisma } from '../db/prisma'
import { DOMAIN_TAXONOMY } from './domain-extractor'

// =============================================================================
// TYPES
// =============================================================================

export interface ExpectedDomain {
  domain: string                           // "Business/Marketing"
  importance: 'critical' | 'important' | 'helpful'
  reason: string                           // "Launching a product requires go-to-market strategy"
}

export interface GoalDomainContext {
  goals: string[]
  role?: string
  expertiseLevel?: string
}

// =============================================================================
// GOAL KEYWORD MAPPINGS
// =============================================================================

/**
 * Maps goal keywords to expected domains
 * More specific patterns = higher importance
 */
const GOAL_DOMAIN_PATTERNS: Array<{
  patterns: RegExp[]
  domains: Array<{
    domain: string
    importance: 'critical' | 'important' | 'helpful'
    reason: string
  }>
}> = [
  // Launching/Starting a product
  {
    patterns: [
      /launch/i,
      /start.*product/i,
      /build.*product/i,
      /ship/i,
      /go.?to.?market/i,
      /gtm/i,
    ],
    domains: [
      { domain: 'Business/Marketing', importance: 'critical', reason: 'Launching a product requires go-to-market strategy' },
      { domain: 'Business/Strategy', importance: 'critical', reason: 'Product launch needs clear positioning and differentiation' },
      { domain: 'Business/Legal', importance: 'important', reason: 'Terms of service and privacy policies are required before launch' },
      { domain: 'Product/Roadmap', importance: 'important', reason: 'Launch planning requires clear feature prioritization' },
      { domain: 'Technical/Infrastructure', importance: 'important', reason: 'Production deployment and scaling are critical for launch' },
    ],
  },
  // Fundraising
  {
    patterns: [
      /fundrais/i,
      /raise.*fund/i,
      /raise.*capital/i,
      /seed/i,
      /series/i,
      /investor/i,
      /vc/i,
      /pitch/i,
    ],
    domains: [
      { domain: 'Business/Finance', importance: 'critical', reason: 'Fundraising requires financial projections and unit economics' },
      { domain: 'Business/Strategy', importance: 'critical', reason: 'Investors evaluate market opportunity and competitive positioning' },
      { domain: 'Business/Legal', importance: 'important', reason: 'Term sheets, SAFE notes, and corporate structure matter' },
      { domain: 'Product/Analytics', importance: 'helpful', reason: 'Metrics and traction data strengthen fundraising pitch' },
    ],
  },
  // Building AI products
  {
    patterns: [
      /ai.*product/i,
      /ai.*saas/i,
      /llm/i,
      /machine.?learning/i,
      /gpt/i,
      /chatbot/i,
      /ai.?agent/i,
    ],
    domains: [
      { domain: 'Technical/AI/ML', importance: 'critical', reason: 'AI products require understanding of LLMs, embeddings, and agents' },
      { domain: 'Technical/Backend', importance: 'critical', reason: 'AI systems need robust API design and data pipelines' },
      { domain: 'Business/Legal', importance: 'important', reason: 'AI products have specific compliance and ethics considerations' },
      { domain: 'Technical/Security', importance: 'important', reason: 'AI systems need prompt injection protection and data privacy' },
    ],
  },
  // Building a SaaS
  {
    patterns: [
      /saas/i,
      /subscription/i,
      /recurring.?revenue/i,
      /mrr/i,
      /arr/i,
    ],
    domains: [
      { domain: 'Technical/Backend', importance: 'critical', reason: 'SaaS requires multi-tenant architecture and billing integration' },
      { domain: 'Business/Finance', importance: 'critical', reason: 'SaaS metrics like MRR, churn, and LTV are essential' },
      { domain: 'Technical/Security', importance: 'important', reason: 'SaaS products need authentication and data isolation' },
      { domain: 'Business/Sales', importance: 'important', reason: 'SaaS growth requires sales processes and CRM' },
    ],
  },
  // Growing users/revenue
  {
    patterns: [
      /grow.*user/i,
      /user.?acquisition/i,
      /scale/i,
      /growth/i,
      /conversion/i,
      /retention/i,
    ],
    domains: [
      { domain: 'Business/Marketing', importance: 'critical', reason: 'User growth requires marketing strategy and channels' },
      { domain: 'Product/Analytics', importance: 'critical', reason: 'Growth requires measuring funnels and user behavior' },
      { domain: 'Product/UX', importance: 'important', reason: 'Retention depends on user experience quality' },
      { domain: 'Business/Sales', importance: 'helpful', reason: 'B2B growth often requires sales enablement' },
    ],
  },
  // Learning/education
  {
    patterns: [
      /learn/i,
      /study/i,
      /understand/i,
      /master/i,
      /improve.*skill/i,
    ],
    domains: [
      { domain: 'Personal/Learning', importance: 'critical', reason: 'Effective learning requires study strategies and resources' },
      { domain: 'Personal/Productivity', importance: 'helpful', reason: 'Consistent learning needs time management' },
    ],
  },
  // Technical development
  {
    patterns: [
      /build.*app/i,
      /develop.*software/i,
      /coding/i,
      /programming/i,
      /web.?dev/i,
    ],
    domains: [
      { domain: 'Technical/Frontend', importance: 'critical', reason: 'Modern apps require frontend development skills' },
      { domain: 'Technical/Backend', importance: 'critical', reason: 'Applications need server-side logic and databases' },
      { domain: 'Technical/Infrastructure', importance: 'important', reason: 'Deployment and hosting are essential' },
      { domain: 'Technical/Security', importance: 'helpful', reason: 'Security basics protect against common vulnerabilities' },
    ],
  },
  // Content creation
  {
    patterns: [
      /content/i,
      /blog/i,
      /newsletter/i,
      /podcast/i,
      /youtube/i,
      /social.?media/i,
    ],
    domains: [
      { domain: 'Business/Marketing', importance: 'critical', reason: 'Content strategy requires marketing knowledge' },
      { domain: 'Product/Design', importance: 'helpful', reason: 'Visual content benefits from design skills' },
      { domain: 'Personal/Productivity', importance: 'helpful', reason: 'Consistent content creation needs good habits' },
    ],
  },
  // Enterprise/B2B
  {
    patterns: [
      /enterprise/i,
      /b2b/i,
      /business.?customer/i,
      /corporate/i,
    ],
    domains: [
      { domain: 'Business/Sales', importance: 'critical', reason: 'Enterprise sales have long cycles and complex stakeholders' },
      { domain: 'Technical/Security', importance: 'critical', reason: 'Enterprise customers require security compliance' },
      { domain: 'Business/Legal', importance: 'important', reason: 'Enterprise deals involve complex contracts' },
      { domain: 'Business/Operations', importance: 'helpful', reason: 'Enterprise onboarding requires documented processes' },
    ],
  },
]

// =============================================================================
// ROLE ADJUSTMENTS
// =============================================================================

/**
 * Role-based domain importance adjustments
 */
const ROLE_DOMAIN_ADJUSTMENTS: Record<string, Array<{
  domain: string
  adjustment: 'increase' | 'decrease' | 'add'
  importance?: 'critical' | 'important' | 'helpful'
  reason?: string
}>> = {
  'founder': [
    { domain: 'Business/Strategy', adjustment: 'increase' },
    { domain: 'Business/Finance', adjustment: 'increase' },
    { domain: 'Business/Legal', adjustment: 'add', importance: 'important', reason: 'Founders need legal basics for company formation' },
  ],
  'ceo': [
    { domain: 'Business/Strategy', adjustment: 'increase' },
    { domain: 'Business/Operations', adjustment: 'increase' },
  ],
  'cto': [
    { domain: 'Technical/Infrastructure', adjustment: 'increase' },
    { domain: 'Technical/Security', adjustment: 'increase' },
    { domain: 'Technical/AI/ML', adjustment: 'add', importance: 'helpful', reason: 'CTOs should understand AI capabilities' },
  ],
  'engineer': [
    { domain: 'Technical/Backend', adjustment: 'increase' },
    { domain: 'Technical/Frontend', adjustment: 'increase' },
    { domain: 'Business/Marketing', adjustment: 'decrease' },
  ],
  'developer': [
    { domain: 'Technical/Backend', adjustment: 'increase' },
    { domain: 'Technical/Frontend', adjustment: 'increase' },
  ],
  'marketer': [
    { domain: 'Business/Marketing', adjustment: 'increase' },
    { domain: 'Product/Analytics', adjustment: 'increase' },
    { domain: 'Technical/Backend', adjustment: 'decrease' },
  ],
  'designer': [
    { domain: 'Product/Design', adjustment: 'increase' },
    { domain: 'Product/UX', adjustment: 'increase' },
    { domain: 'Product/Research', adjustment: 'add', importance: 'helpful', reason: 'User research improves design decisions' },
  ],
  'product': [
    { domain: 'Product/Roadmap', adjustment: 'increase' },
    { domain: 'Product/Analytics', adjustment: 'increase' },
    { domain: 'Product/Research', adjustment: 'add', importance: 'important', reason: 'Product decisions need user research' },
  ],
  'student': [
    { domain: 'Personal/Learning', adjustment: 'increase' },
    { domain: 'Personal/Goals', adjustment: 'add', importance: 'helpful', reason: 'Clear goals improve learning outcomes' },
  ],
}

// =============================================================================
// EXPERTISE LEVEL ADJUSTMENTS
// =============================================================================

const EXPERTISE_ADJUSTMENTS: Record<string, {
  addFundamentals: boolean
  emphasizeAdvanced: boolean
  domains?: Array<{ domain: string; importance: 'critical' | 'important' | 'helpful'; reason: string }>
}> = {
  'beginner': {
    addFundamentals: true,
    emphasizeAdvanced: false,
    domains: [
      { domain: 'Personal/Learning', importance: 'helpful', reason: 'Learning strategies help beginners progress faster' },
    ],
  },
  'intermediate': {
    addFundamentals: false,
    emphasizeAdvanced: false,
  },
  'advanced': {
    addFundamentals: false,
    emphasizeAdvanced: true,
  },
  'expert': {
    addFundamentals: false,
    emphasizeAdvanced: true,
  },
  'technical': {
    addFundamentals: false,
    emphasizeAdvanced: false,
    domains: [
      { domain: 'Business/Strategy', importance: 'helpful', reason: 'Technical experts benefit from business context' },
    ],
  },
  'business': {
    addFundamentals: false,
    emphasizeAdvanced: false,
    domains: [
      { domain: 'Technical/AI/ML', importance: 'helpful', reason: 'Business leaders should understand AI capabilities' },
    ],
  },
}

// =============================================================================
// CACHE
// =============================================================================

interface GoalDomainCacheEntry {
  result: ExpectedDomain[]
  expiresAt: Date
}

const goalDomainCache = new Map<string, GoalDomainCacheEntry>()
const GOAL_DOMAIN_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Get expected knowledge domains for a user's goals
 *
 * @param goals - User's stated goals
 * @param role - User's role (optional)
 * @param expertiseLevel - User's expertise level (optional)
 * @returns Expected domains with importance and reasons
 */
export async function getExpectedDomains(
  goals: string[],
  role?: string,
  expertiseLevel?: string
): Promise<ExpectedDomain[]> {
  // Create cache key from inputs
  const cacheKey = JSON.stringify({ goals: goals.sort(), role, expertiseLevel })

  // Check cache
  const cached = goalDomainCache.get(cacheKey)
  if (cached && cached.expiresAt > new Date()) {
    return cached.result
  }

  console.log(`[GoalDomainMap] Mapping domains for goals: ${goals.slice(0, 3).join(', ')}`)

  // Collect all expected domains
  const domainMap = new Map<string, ExpectedDomain>()

  // 1. Match goals against patterns
  for (const goal of goals) {
    for (const pattern of GOAL_DOMAIN_PATTERNS) {
      const matches = pattern.patterns.some(p => p.test(goal))
      if (matches) {
        for (const domain of pattern.domains) {
          const existing = domainMap.get(domain.domain)
          if (!existing || importanceRank(domain.importance) > importanceRank(existing.importance)) {
            domainMap.set(domain.domain, {
              domain: domain.domain,
              importance: domain.importance,
              reason: domain.reason,
            })
          }
        }
      }
    }
  }

  // 2. Apply role adjustments
  if (role) {
    const normalizedRole = role.toLowerCase().replace(/[^a-z]/g, '')
    const adjustments = ROLE_DOMAIN_ADJUSTMENTS[normalizedRole]
    if (adjustments) {
      for (const adj of adjustments) {
        const existing = domainMap.get(adj.domain)
        if (adj.adjustment === 'increase' && existing) {
          // Increase importance
          domainMap.set(adj.domain, {
            ...existing,
            importance: increaseImportance(existing.importance),
          })
        } else if (adj.adjustment === 'decrease' && existing) {
          // Decrease importance
          domainMap.set(adj.domain, {
            ...existing,
            importance: decreaseImportance(existing.importance),
          })
        } else if (adj.adjustment === 'add' && !existing && adj.importance && adj.reason) {
          // Add new domain
          domainMap.set(adj.domain, {
            domain: adj.domain,
            importance: adj.importance,
            reason: adj.reason,
          })
        }
      }
    }
  }

  // 3. Apply expertise adjustments
  if (expertiseLevel) {
    const normalizedExpertise = expertiseLevel.toLowerCase()
    const adjustment = EXPERTISE_ADJUSTMENTS[normalizedExpertise]
    if (adjustment?.domains) {
      for (const domain of adjustment.domains) {
        if (!domainMap.has(domain.domain)) {
          domainMap.set(domain.domain, domain)
        }
      }
    }
  }

  // Convert to array and sort by importance
  const result = Array.from(domainMap.values()).sort(
    (a, b) => importanceRank(b.importance) - importanceRank(a.importance)
  )

  // Cache result
  goalDomainCache.set(cacheKey, {
    result,
    expiresAt: new Date(Date.now() + GOAL_DOMAIN_CACHE_TTL_MS),
  })

  return result
}

/**
 * Get goals and role from UIP for a user
 */
export async function getGoalsFromUIP(userId: string): Promise<GoalDomainContext> {
  // Get UIP profile with goals dimension
  const profile = await prisma.userIntelligenceProfile.findUnique({
    where: { userId },
    include: {
      dimensions: {
        where: { domain: { in: ['GOALS_VALUES', 'IDENTITY_CONTEXT'] } },
      },
    },
  })

  if (!profile) {
    return { goals: [] }
  }

  const result: GoalDomainContext = { goals: [] }

  for (const dim of profile.dimensions) {
    if (dim.domain === 'GOALS_VALUES') {
      const value = dim.value as { activeGoals?: Array<{ goal: string }> }
      if (value.activeGoals) {
        result.goals = value.activeGoals.map(g => g.goal)
      }
    } else if (dim.domain === 'IDENTITY_CONTEXT') {
      const value = dim.value as { role?: string }
      result.role = value.role
    }
  }

  return result
}

/**
 * Get goals from MSC items for a workspace
 */
export async function getGoalsFromMSC(workspaceId: string): Promise<string[]> {
  const mscItems = await prisma.mSCItem.findMany({
    where: {
      workspaceId,
      category: 'goal',
      status: { in: ['active', 'in_progress'] },
    },
    select: { content: true },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })

  return mscItems.map(item => item.content)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function importanceRank(importance: 'critical' | 'important' | 'helpful'): number {
  switch (importance) {
    case 'critical': return 3
    case 'important': return 2
    case 'helpful': return 1
  }
}

function increaseImportance(current: 'critical' | 'important' | 'helpful'): 'critical' | 'important' | 'helpful' {
  switch (current) {
    case 'helpful': return 'important'
    case 'important': return 'critical'
    case 'critical': return 'critical'
  }
}

function decreaseImportance(current: 'critical' | 'important' | 'helpful'): 'critical' | 'important' | 'helpful' {
  switch (current) {
    case 'critical': return 'important'
    case 'important': return 'helpful'
    case 'helpful': return 'helpful'
  }
}

/**
 * Invalidate goal-domain cache
 */
export function invalidateGoalDomainCache(): void {
  goalDomainCache.clear()
  console.log('[GoalDomainMap] Cache cleared')
}
