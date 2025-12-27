/**
 * Knowledge Gap Analysis - Core Gap Detection Engine
 *
 * Compares a user's actual knowledge domains against expected domains
 * based on their goals to identify knowledge gaps.
 *
 * @example
 * ```typescript
 * const result = await analyzeKnowledgeGaps(workspaceId)
 * // Returns: { gaps: [...], strengths: [...], summary: '...' }
 * ```
 */

import { prisma } from '../db/prisma'
import { extractDomains, KnowledgeDomain, invalidateDomainCache } from './domain-extractor'
import { getExpectedDomains, getGoalsFromMSC, getGoalsFromUIP, ExpectedDomain, GoalDomainContext } from './goal-domain-map'
import { assembleUIP } from '../uip/service'

// =============================================================================
// TYPES
// =============================================================================

export interface KnowledgeGap {
  domain: string                           // "Business/Marketing"
  importance: 'critical' | 'important' | 'helpful'
  currentCoverage: number                  // 0-100
  reason: string                           // Why this matters for their goals
  suggestions: string[]                    // Specific topics to research
  relatedGoals: string[]                   // Which goals this gap affects
}

export interface GapAnalysisResult {
  gaps: KnowledgeGap[]
  strengths: KnowledgeDomain[]             // What they're well-covered on
  summary: string                          // Natural language summary
  analyzedAt: Date
  documentCount: number
  goalCount: number
  hasGoals: boolean
  hasDocs: boolean
}

export interface AnalyzeGapsOptions {
  forceRefresh?: boolean
  topN?: number                            // Limit to top N gaps
  userId?: string                          // For UIP-based goals
}

// =============================================================================
// SUGGESTION TEMPLATES
// =============================================================================

/**
 * Suggested topics for each domain - what to research to fill gaps
 */
const DOMAIN_SUGGESTIONS: Record<string, string[]> = {
  'Technical/Backend': [
    'API design patterns and REST best practices',
    'Database optimization and query performance',
    'Authentication and authorization flows',
    'Server-side caching strategies',
    'Microservices architecture patterns',
  ],
  'Technical/Frontend': [
    'Modern React patterns (hooks, context, suspense)',
    'State management approaches',
    'Performance optimization techniques',
    'Responsive design and accessibility',
    'Component library design systems',
  ],
  'Technical/Infrastructure': [
    'Container orchestration with Docker/Kubernetes',
    'CI/CD pipeline setup',
    'Cloud provider comparison (AWS, GCP, Vercel)',
    'Monitoring and observability',
    'Auto-scaling and load balancing',
  ],
  'Technical/AI/ML': [
    'LLM integration patterns (OpenAI, Anthropic)',
    'RAG (Retrieval Augmented Generation) architectures',
    'Prompt engineering techniques',
    'Vector databases and embeddings',
    'AI agent design patterns',
  ],
  'Technical/Security': [
    'OWASP Top 10 vulnerabilities',
    'Authentication protocols (OAuth, JWT)',
    'Data encryption at rest and in transit',
    'Security headers and CSP policies',
    'Penetration testing basics',
  ],
  'Technical/Data': [
    'Data modeling best practices',
    'ETL pipeline design',
    'Analytics infrastructure setup',
    'Data visualization tools',
    'Privacy and data governance',
  ],
  'Business/Strategy': [
    'Competitive analysis frameworks',
    'Market positioning strategies',
    'Business model canvas',
    'SWOT and Porter\'s Five Forces',
    'Strategic planning methodologies',
  ],
  'Business/Marketing': [
    'Landing page optimization',
    'Content marketing strategy',
    'SEO fundamentals',
    'Email marketing automation',
    'Social media growth tactics',
  ],
  'Business/Sales': [
    'Sales funnel optimization',
    'CRM setup and pipeline management',
    'Cold outreach strategies',
    'Demo and presentation skills',
    'Pricing psychology',
  ],
  'Business/Finance': [
    'Unit economics (LTV, CAC, payback)',
    'Financial projections and modeling',
    'Fundraising pitch deck elements',
    'Cash flow management',
    'Valuation methods for startups',
  ],
  'Business/Legal': [
    'Terms of service templates',
    'Privacy policy requirements (GDPR, CCPA)',
    'Intellectual property basics',
    'Contractor vs employee classification',
    'Standard SaaS contract terms',
  ],
  'Business/Operations': [
    'Standard operating procedures (SOPs)',
    'Team onboarding processes',
    'Project management methodologies',
    'Workflow automation tools',
    'Documentation best practices',
  ],
  'Product/Design': [
    'Design system fundamentals',
    'Figma advanced techniques',
    'Visual hierarchy principles',
    'Color theory and typography',
    'Responsive design patterns',
  ],
  'Product/UX': [
    'User journey mapping',
    'Usability testing methods',
    'Information architecture',
    'Accessibility (WCAG) guidelines',
    'Cognitive load optimization',
  ],
  'Product/Research': [
    'User interview techniques',
    'Survey design best practices',
    'Competitive research methods',
    'Jobs-to-be-done framework',
    'Assumption mapping',
  ],
  'Product/Analytics': [
    'Funnel analysis setup',
    'Cohort retention analysis',
    'A/B testing methodology',
    'Key metrics (NPS, engagement, retention)',
    'Analytics tool selection (Mixpanel, Amplitude)',
  ],
  'Product/Roadmap': [
    'Feature prioritization frameworks (RICE, ICE)',
    'Sprint planning and backlog management',
    'Stakeholder alignment techniques',
    'Release planning strategies',
    'OKR setting for product teams',
  ],
  'Personal/Goals': [
    'Goal-setting frameworks (SMART, OKRs)',
    'Progress tracking methods',
    'Accountability systems',
    'Milestone celebration practices',
    'Goal review and adjustment',
  ],
  'Personal/Learning': [
    'Spaced repetition techniques',
    'Active recall methods',
    'Note-taking systems (Zettelkasten)',
    'Learning resource curation',
    'Skill acquisition frameworks',
  ],
  'Personal/Productivity': [
    'Time blocking strategies',
    'Deep work practices',
    'Task prioritization (Eisenhower matrix)',
    'Energy management',
    'Focus and distraction control',
  ],
  'Personal/Health': [
    'Sleep optimization',
    'Exercise routines for desk workers',
    'Stress management techniques',
    'Nutrition basics',
    'Mental health practices',
  ],
  'Personal/Relationships': [
    'Networking strategies',
    'Mentorship frameworks',
    'Community building',
    'Collaboration best practices',
    'Communication skills',
  ],
}

// =============================================================================
// CACHE
// =============================================================================

interface GapAnalysisCacheEntry {
  result: GapAnalysisResult
  expiresAt: Date
}

const gapAnalysisCache = new Map<string, GapAnalysisCacheEntry>()
const GAP_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Analyze knowledge gaps for a workspace
 *
 * @param workspaceId - The workspace to analyze
 * @param options - Configuration options
 * @returns Gap analysis result with gaps, strengths, and summary
 */
export async function analyzeKnowledgeGaps(
  workspaceId: string,
  options?: AnalyzeGapsOptions
): Promise<GapAnalysisResult> {
  const cacheKey = `gaps:${workspaceId}`

  // Check cache
  if (!options?.forceRefresh) {
    const cached = gapAnalysisCache.get(cacheKey)
    if (cached && cached.expiresAt > new Date()) {
      console.log(`[GapAnalysis] Cache hit for workspace ${workspaceId.slice(0, 8)}`)
      return cached.result
    }
  }

  console.log(`[GapAnalysis] Analyzing gaps for workspace ${workspaceId.slice(0, 8)}...`)
  const startTime = Date.now()

  // 1. Get actual domains from user's vault
  const domainResult = await extractDomains(workspaceId, { forceRefresh: options?.forceRefresh })
  const actualDomains = domainResult.domains

  // 2. Get user's goals
  const mscGoals = await getGoalsFromMSC(workspaceId)
  let uipContext: GoalDomainContext = { goals: [] }

  if (options?.userId) {
    uipContext = await getGoalsFromUIP(options.userId)
  }

  // Combine goals from both sources
  const allGoals = [...new Set([...mscGoals, ...uipContext.goals])]

  // 3. Handle edge cases
  if (domainResult.totalDocuments === 0) {
    const emptyResult: GapAnalysisResult = {
      gaps: [],
      strengths: [],
      summary: 'Upload some documents first so I can analyze your knowledge. Once you add docs to your vault, I\'ll be able to identify gaps based on your goals.',
      analyzedAt: new Date(),
      documentCount: 0,
      goalCount: allGoals.length,
      hasGoals: allGoals.length > 0,
      hasDocs: false,
    }
    return emptyResult
  }

  if (allGoals.length === 0) {
    const noGoalsResult: GapAnalysisResult = {
      gaps: [],
      strengths: actualDomains.filter(d => d.coverageDepth !== 'shallow'),
      summary: 'Tell me about your goals first - what are you trying to achieve? Once I know your objectives, I can identify knowledge gaps that matter for your success.',
      analyzedAt: new Date(),
      documentCount: domainResult.totalDocuments,
      goalCount: 0,
      hasGoals: false,
      hasDocs: true,
    }
    return noGoalsResult
  }

  // 4. Get expected domains based on goals
  const expectedDomains = await getExpectedDomains(allGoals, uipContext.role)

  // 5. Compare actual vs expected to find gaps
  const gaps: KnowledgeGap[] = []

  // Build a map of actual coverage
  const actualCoverageMap = new Map<string, KnowledgeDomain>()
  for (const domain of actualDomains) {
    actualCoverageMap.set(domain.name, domain)
  }

  for (const expected of expectedDomains) {
    const actual = actualCoverageMap.get(expected.domain)

    // Calculate coverage percentage
    let coverage = 0
    if (actual) {
      // Coverage based on depth: shallow=30%, moderate=60%, deep=90%
      coverage = actual.coverageDepth === 'deep' ? 90 :
                 actual.coverageDepth === 'moderate' ? 60 : 30
    }

    // Only flag as gap if coverage is below threshold
    const gapThreshold = expected.importance === 'critical' ? 60 :
                         expected.importance === 'important' ? 40 : 20

    if (coverage < gapThreshold) {
      // Find which goals this gap relates to
      const relatedGoals = findRelatedGoals(expected.domain, allGoals)

      // Get suggestions for this domain
      const suggestions = getSuggestionsForDomain(expected.domain)

      gaps.push({
        domain: expected.domain,
        importance: expected.importance,
        currentCoverage: coverage,
        reason: expected.reason,
        suggestions,
        relatedGoals,
      })
    }
  }

  // 6. Sort gaps by score (importance * coverage deficit)
  gaps.sort((a, b) => {
    const scoreA = calculateGapScore(a)
    const scoreB = calculateGapScore(b)
    return scoreB - scoreA
  })

  // 7. Apply topN limit if specified
  const topGaps = options?.topN ? gaps.slice(0, options.topN) : gaps

  // 8. Identify strengths (domains with good coverage)
  const strengths = actualDomains.filter(d =>
    d.coverageDepth === 'deep' || (d.coverageDepth === 'moderate' && d.documentCount >= 5)
  )

  // 9. Generate natural language summary
  const summary = generateSummary(topGaps, strengths, allGoals)

  const result: GapAnalysisResult = {
    gaps: topGaps,
    strengths,
    summary,
    analyzedAt: new Date(),
    documentCount: domainResult.totalDocuments,
    goalCount: allGoals.length,
    hasGoals: true,
    hasDocs: true,
  }

  // Cache result
  gapAnalysisCache.set(cacheKey, {
    result,
    expiresAt: new Date(Date.now() + GAP_CACHE_TTL_MS),
  })

  console.log(`[GapAnalysis] Found ${topGaps.length} gaps in ${Date.now() - startTime}ms`)

  return result
}

/**
 * Calculate gap priority score
 */
function calculateGapScore(gap: KnowledgeGap): number {
  const importanceWeight = gap.importance === 'critical' ? 3 :
                          gap.importance === 'important' ? 2 : 1
  const coverageDeficit = 1 - (gap.currentCoverage / 100)
  return importanceWeight * coverageDeficit
}

/**
 * Find goals that relate to a domain
 */
function findRelatedGoals(domain: string, goals: string[]): string[] {
  // Get domain keywords
  const domainKeywords = getDomainKeywords(domain)

  const related: string[] = []
  for (const goal of goals) {
    const goalLower = goal.toLowerCase()
    for (const keyword of domainKeywords) {
      if (goalLower.includes(keyword)) {
        related.push(goal)
        break
      }
    }
  }

  // If no keyword match, still include if domain is in goal-pattern mapping
  if (related.length === 0) {
    // Include first 2 goals as potentially related
    return goals.slice(0, 2)
  }

  return related
}

/**
 * Get keywords associated with a domain
 */
function getDomainKeywords(domain: string): string[] {
  const keywordMap: Record<string, string[]> = {
    'Business/Marketing': ['marketing', 'growth', 'user', 'customer', 'launch', 'content', 'seo', 'acquisition'],
    'Business/Strategy': ['strategy', 'business', 'market', 'competition', 'position', 'scale'],
    'Business/Sales': ['sales', 'customer', 'enterprise', 'b2b', 'revenue', 'deal'],
    'Business/Finance': ['fund', 'money', 'investor', 'revenue', 'profit', 'valuation', 'seed'],
    'Business/Legal': ['legal', 'terms', 'privacy', 'compliance', 'contract'],
    'Business/Operations': ['operations', 'team', 'process', 'hire', 'scale'],
    'Technical/Backend': ['backend', 'api', 'server', 'database', 'build', 'develop'],
    'Technical/Frontend': ['frontend', 'ui', 'interface', 'react', 'web', 'app'],
    'Technical/Infrastructure': ['deploy', 'infrastructure', 'scale', 'cloud', 'devops'],
    'Technical/AI/ML': ['ai', 'ml', 'llm', 'gpt', 'machine', 'learning', 'chatbot'],
    'Technical/Security': ['security', 'auth', 'protect', 'encrypt', 'safe'],
    'Technical/Data': ['data', 'analytics', 'metrics', 'tracking'],
    'Product/Design': ['design', 'visual', 'brand', 'ui'],
    'Product/UX': ['ux', 'user', 'experience', 'usability'],
    'Product/Research': ['research', 'interview', 'feedback', 'validate'],
    'Product/Analytics': ['analytics', 'metrics', 'tracking', 'conversion', 'retention'],
    'Product/Roadmap': ['roadmap', 'feature', 'priority', 'release'],
    'Personal/Learning': ['learn', 'study', 'skill', 'improve'],
    'Personal/Goals': ['goal', 'objective', 'achieve', 'success'],
    'Personal/Productivity': ['productive', 'time', 'focus', 'efficient'],
  }

  return keywordMap[domain] || []
}

/**
 * Get suggestions for a specific domain
 */
function getSuggestionsForDomain(domain: string): string[] {
  return DOMAIN_SUGGESTIONS[domain]?.slice(0, 3) || [
    `Research ${domain.split('/')[1]} fundamentals`,
    `Find case studies in ${domain.split('/')[1]}`,
    `Explore best practices for ${domain.split('/')[1]}`,
  ]
}

/**
 * Generate natural language summary in OSQR voice
 */
function generateSummary(gaps: KnowledgeGap[], strengths: KnowledgeDomain[], goals: string[]): string {
  if (gaps.length === 0 && strengths.length > 0) {
    // All covered!
    const strengthNames = strengths.slice(0, 3).map(s => s.name.split('/')[1]).join(', ')
    return `Your vault is well-rounded for your goals! You have strong coverage in ${strengthNames}. Consider going deeper in your existing domains or expanding into adjacent areas.`
  }

  if (gaps.length === 0) {
    return `Based on your goals, your knowledge base looks good so far. As you add more documents, I'll be able to provide more detailed analysis.`
  }

  // Build summary from top gaps
  const criticalGaps = gaps.filter(g => g.importance === 'critical')
  const importantGaps = gaps.filter(g => g.importance === 'important')

  let summary = `Based on your vault and goals like "${goals[0]?.slice(0, 50) || 'your objectives'}", here are your key knowledge gaps:\n\n`

  let gapNum = 1
  for (const gap of gaps.slice(0, 3)) {
    const priorityLabel = gap.importance === 'critical' ? 'High priority' :
                         gap.importance === 'important' ? 'Medium priority' : 'Helpful'
    const domainName = gap.domain.split('/')[1]

    summary += `${gapNum}. **${domainName}** (${priorityLabel})\n`
    summary += `   ${gap.reason}\n`
    if (gap.suggestions.length > 0) {
      summary += `   Consider researching: ${gap.suggestions[0]}\n`
    }
    summary += '\n'
    gapNum++
  }

  if (strengths.length > 0) {
    const strengthNames = strengths.slice(0, 2).map(s => s.name.split('/')[1]).join(' and ')
    summary += `You're well-covered on ${strengthNames}.`
  }

  return summary.trim()
}

/**
 * Quick check if gap analysis is needed (has docs and goals)
 */
export async function canPerformGapAnalysis(workspaceId: string, userId?: string): Promise<{
  canAnalyze: boolean
  hasDocs: boolean
  hasGoals: boolean
  reason?: string
}> {
  const docCount = await prisma.document.count({
    where: { workspaceId },
  })

  const mscGoals = await getGoalsFromMSC(workspaceId)
  let uipGoals: string[] = []

  if (userId) {
    const uipContext = await getGoalsFromUIP(userId)
    uipGoals = uipContext.goals
  }

  const hasGoals = mscGoals.length > 0 || uipGoals.length > 0
  const hasDocs = docCount > 0

  if (!hasDocs) {
    return {
      canAnalyze: false,
      hasDocs: false,
      hasGoals,
      reason: 'Upload some documents first so I can analyze your knowledge.',
    }
  }

  if (!hasGoals) {
    return {
      canAnalyze: false,
      hasDocs: true,
      hasGoals: false,
      reason: 'Tell me about your goals first - what are you trying to achieve?',
    }
  }

  return {
    canAnalyze: true,
    hasDocs: true,
    hasGoals: true,
  }
}

/**
 * Invalidate gap analysis cache
 */
export function invalidateGapCache(workspaceId: string): void {
  const cacheKey = `gaps:${workspaceId}`
  gapAnalysisCache.delete(cacheKey)
  invalidateDomainCache(workspaceId)
  console.log(`[GapAnalysis] Cache invalidated for workspace ${workspaceId.slice(0, 8)}`)
}

/**
 * Get gap analysis for a specific domain
 */
export async function analyzeGapForDomain(
  workspaceId: string,
  domain: string,
  userId?: string
): Promise<KnowledgeGap | null> {
  const result = await analyzeKnowledgeGaps(workspaceId, { userId })

  return result.gaps.find(g => g.domain === domain) || null
}
