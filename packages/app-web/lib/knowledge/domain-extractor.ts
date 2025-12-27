/**
 * Domain Extractor - Clusters Documents into Knowledge Domains
 *
 * Analyzes a user's vault to understand what domains they have knowledge in.
 * Uses topic cache for topic extraction and clusters into a predefined taxonomy.
 *
 * @example
 * ```typescript
 * const domains = await extractDomains(workspaceId)
 * // Returns: [{ name: 'Technical/Backend', documentCount: 45, ... }]
 * ```
 */

import { prisma } from '../db/prisma'
import { extractTopics, refreshCache } from './topic-cache'

// =============================================================================
// TYPES
// =============================================================================

export interface KnowledgeDomain {
  name: string                              // "Technical/Backend", "Business/Marketing"
  confidence: number                        // 0-1 how certain we are about this domain
  documentCount: number                     // How many docs in this domain
  topDocuments: string[]                    // Top 3 doc titles
  topics: string[]                          // Key topics in this domain
  coverageDepth: 'shallow' | 'moderate' | 'deep'  // Based on doc count + variety
}

export interface DomainExtractionResult {
  domains: KnowledgeDomain[]
  totalDocuments: number
  analyzedAt: Date
  cacheKey: string
}

// =============================================================================
// DOMAIN TAXONOMY
// =============================================================================

/**
 * Predefined domain taxonomy with keyword mappings
 * Each domain has associated keywords that help cluster documents
 */
export const DOMAIN_TAXONOMY: Record<string, Record<string, string[]>> = {
  'Technical': {
    'Backend': ['api', 'backend', 'server', 'database', 'sql', 'prisma', 'node', 'nodejs', 'express', 'fastify', 'rest', 'graphql', 'authentication', 'authorization', 'middleware', 'orm', 'migration', 'postgresql', 'mysql', 'mongodb', 'redis', 'queue', 'worker', 'microservice', 'lambda', 'serverless'],
    'Frontend': ['react', 'nextjs', 'vue', 'angular', 'svelte', 'frontend', 'component', 'css', 'tailwind', 'styled', 'html', 'dom', 'hook', 'state', 'redux', 'zustand', 'router', 'ssr', 'ssg', 'hydration', 'responsive', 'ui', 'ux'],
    'Infrastructure': ['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s', 'terraform', 'infrastructure', 'deployment', 'ci', 'cd', 'pipeline', 'devops', 'monitoring', 'logging', 'scaling', 'load', 'balancer', 'cdn', 'cloudflare', 'vercel', 'railway', 'nginx'],
    'Data': ['data', 'analytics', 'etl', 'pipeline', 'warehouse', 'bigquery', 'snowflake', 'spark', 'pandas', 'jupyter', 'visualization', 'dashboard', 'metrics', 'tracking', 'schema'],
    'AI/ML': ['ai', 'ml', 'machine', 'learning', 'llm', 'gpt', 'claude', 'openai', 'anthropic', 'embedding', 'vector', 'rag', 'agent', 'prompt', 'fine', 'tuning', 'transformer', 'model', 'inference', 'training', 'neural', 'nlp', 'computer', 'vision'],
    'Security': ['security', 'authentication', 'oauth', 'jwt', 'encryption', 'ssl', 'tls', 'https', 'vulnerability', 'penetration', 'audit', 'compliance', 'gdpr', 'privacy', 'rbac', 'permission'],
  },
  'Business': {
    'Strategy': ['strategy', 'business', 'model', 'canvas', 'competition', 'competitor', 'analysis', 'market', 'positioning', 'differentiation', 'moat', 'advantage', 'pivot', 'scale', 'growth'],
    'Marketing': ['marketing', 'seo', 'sem', 'content', 'social', 'media', 'brand', 'branding', 'campaign', 'funnel', 'conversion', 'acquisition', 'retention', 'engagement', 'email', 'newsletter', 'copywriting', 'ads', 'advertising', 'influencer'],
    'Sales': ['sales', 'crm', 'pipeline', 'lead', 'prospect', 'deal', 'closing', 'negotiation', 'pricing', 'discount', 'demo', 'pitch', 'proposal', 'contract', 'enterprise', 'b2b', 'b2c'],
    'Finance': ['finance', 'budget', 'revenue', 'cost', 'profit', 'margin', 'cash', 'flow', 'runway', 'burn', 'rate', 'unit', 'economics', 'ltv', 'cac', 'mrr', 'arr', 'valuation', 'fundraising', 'investor', 'vc', 'term', 'sheet'],
    'Legal': ['legal', 'terms', 'service', 'privacy', 'policy', 'contract', 'agreement', 'license', 'intellectual', 'property', 'patent', 'trademark', 'copyright', 'liability', 'compliance', 'regulation', 'gdpr'],
    'Operations': ['operations', 'process', 'workflow', 'automation', 'efficiency', 'productivity', 'tool', 'system', 'sop', 'documentation', 'onboarding', 'training', 'team', 'hiring', 'hr'],
  },
  'Product': {
    'Design': ['design', 'figma', 'sketch', 'prototype', 'wireframe', 'mockup', 'visual', 'aesthetic', 'color', 'typography', 'icon', 'illustration', 'animation'],
    'UX': ['ux', 'user', 'experience', 'usability', 'accessibility', 'journey', 'flow', 'persona', 'testing', 'interview', 'feedback', 'friction', 'delight'],
    'Research': ['research', 'user', 'interview', 'survey', 'testing', 'usability', 'feedback', 'insight', 'discovery', 'validation', 'assumption', 'hypothesis'],
    'Analytics': ['analytics', 'metrics', 'kpi', 'tracking', 'funnel', 'retention', 'cohort', 'ab', 'test', 'experiment', 'mixpanel', 'amplitude', 'segment', 'data', 'driven'],
    'Roadmap': ['roadmap', 'feature', 'backlog', 'sprint', 'agile', 'scrum', 'priority', 'milestone', 'release', 'version', 'changelog'],
  },
  'Personal': {
    'Goals': ['goal', 'objective', 'okr', 'target', 'achievement', 'milestone', 'success', 'measure', 'progress'],
    'Learning': ['learning', 'study', 'course', 'book', 'tutorial', 'skill', 'knowledge', 'education', 'training', 'certification'],
    'Productivity': ['productivity', 'focus', 'habit', 'routine', 'schedule', 'time', 'management', 'todo', 'task', 'planning', 'organization'],
    'Health': ['health', 'fitness', 'exercise', 'diet', 'nutrition', 'sleep', 'meditation', 'mental', 'wellness', 'stress', 'balance'],
    'Relationships': ['relationship', 'network', 'mentor', 'mentee', 'community', 'connection', 'collaboration', 'partnership'],
  },
}

// Flatten taxonomy for quick lookups
const TOPIC_TO_DOMAIN: Map<string, string> = new Map()
for (const [category, subdomains] of Object.entries(DOMAIN_TAXONOMY)) {
  for (const [subdomain, keywords] of Object.entries(subdomains)) {
    for (const keyword of keywords) {
      TOPIC_TO_DOMAIN.set(keyword.toLowerCase(), `${category}/${subdomain}`)
    }
  }
}

// =============================================================================
// CACHE
// =============================================================================

interface DomainCacheEntry {
  result: DomainExtractionResult
  expiresAt: Date
}

const domainCache = new Map<string, DomainCacheEntry>()
const DOMAIN_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Extract knowledge domains from a workspace's documents
 *
 * @param workspaceId - The workspace to analyze
 * @param options - Optional configuration
 * @returns Clustered knowledge domains with metadata
 */
export async function extractDomains(
  workspaceId: string,
  options?: { forceRefresh?: boolean }
): Promise<DomainExtractionResult> {
  const cacheKey = `domains:${workspaceId}`

  // Check cache
  if (!options?.forceRefresh) {
    const cached = domainCache.get(cacheKey)
    if (cached && cached.expiresAt > new Date()) {
      console.log(`[DomainExtractor] Cache hit for workspace ${workspaceId.slice(0, 8)}`)
      return cached.result
    }
  }

  console.log(`[DomainExtractor] Analyzing workspace ${workspaceId.slice(0, 8)}...`)
  const startTime = Date.now()

  // Fetch all documents
  const documents = await prisma.document.findMany({
    where: { workspaceId },
    select: {
      id: true,
      title: true,
      textContent: true,
      metadata: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (documents.length === 0) {
    const emptyResult: DomainExtractionResult = {
      domains: [],
      totalDocuments: 0,
      analyzedAt: new Date(),
      cacheKey,
    }
    return emptyResult
  }

  // Extract topics from each document and map to domains
  const domainDocuments: Map<string, Array<{
    id: string
    title: string
    topics: string[]
  }>> = new Map()

  for (const doc of documents) {
    const content = doc.textContent || doc.title
    const topics = extractTopics(content, doc.title)

    // Map topics to domains
    const docDomains = new Set<string>()
    for (const topic of topics) {
      const domain = TOPIC_TO_DOMAIN.get(topic.toLowerCase())
      if (domain) {
        docDomains.add(domain)
      }
    }

    // If no domains matched, try to infer from broader topic patterns
    if (docDomains.size === 0) {
      const inferredDomain = inferDomainFromTopics(topics)
      if (inferredDomain) {
        docDomains.add(inferredDomain)
      }
    }

    // Add document to each matched domain
    for (const domain of docDomains) {
      if (!domainDocuments.has(domain)) {
        domainDocuments.set(domain, [])
      }
      domainDocuments.get(domain)!.push({
        id: doc.id,
        title: doc.title,
        topics,
      })
    }
  }

  // Build KnowledgeDomain objects
  const domains: KnowledgeDomain[] = []

  for (const [domainName, docs] of domainDocuments) {
    // Aggregate topics across all docs in this domain
    const allTopics = new Map<string, number>()
    for (const doc of docs) {
      for (const topic of doc.topics) {
        allTopics.set(topic, (allTopics.get(topic) || 0) + 1)
      }
    }

    // Sort topics by frequency
    const sortedTopics = Array.from(allTopics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => topic)

    // Calculate coverage depth
    const coverageDepth = calculateCoverageDepth(docs.length, sortedTopics.length)

    // Calculate confidence based on topic match strength and document count
    const confidence = calculateDomainConfidence(docs.length, documents.length, sortedTopics.length)

    domains.push({
      name: domainName,
      confidence,
      documentCount: docs.length,
      topDocuments: docs.slice(0, 3).map(d => d.title),
      topics: sortedTopics,
      coverageDepth,
    })
  }

  // Sort domains by document count (most coverage first)
  domains.sort((a, b) => b.documentCount - a.documentCount)

  const result: DomainExtractionResult = {
    domains,
    totalDocuments: documents.length,
    analyzedAt: new Date(),
    cacheKey,
  }

  // Cache result
  domainCache.set(cacheKey, {
    result,
    expiresAt: new Date(Date.now() + DOMAIN_CACHE_TTL_MS),
  })

  console.log(`[DomainExtractor] Found ${domains.length} domains in ${Date.now() - startTime}ms`)

  return result
}

/**
 * Infer domain from topics when no direct keyword match exists
 */
function inferDomainFromTopics(topics: string[]): string | null {
  // Count partial matches for each category
  const categoryScores: Record<string, number> = {}

  for (const topic of topics) {
    const lowerTopic = topic.toLowerCase()

    for (const [category, subdomains] of Object.entries(DOMAIN_TAXONOMY)) {
      for (const [subdomain, keywords] of Object.entries(subdomains)) {
        for (const keyword of keywords) {
          // Check for partial matches
          if (lowerTopic.includes(keyword) || keyword.includes(lowerTopic)) {
            const domainKey = `${category}/${subdomain}`
            categoryScores[domainKey] = (categoryScores[domainKey] || 0) + 1
          }
        }
      }
    }
  }

  // Return highest scoring domain if above threshold
  const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1])
  if (sorted.length > 0 && sorted[0][1] >= 2) {
    return sorted[0][0]
  }

  return null
}

/**
 * Calculate coverage depth based on document count and topic variety
 */
function calculateCoverageDepth(docCount: number, topicCount: number): 'shallow' | 'moderate' | 'deep' {
  // Shallow: 1-3 docs or very few topics
  if (docCount <= 3 || topicCount <= 3) {
    return 'shallow'
  }

  // Deep: 10+ docs with good topic variety
  if (docCount >= 10 && topicCount >= 6) {
    return 'deep'
  }

  // Moderate: everything else
  return 'moderate'
}

/**
 * Calculate confidence in domain classification
 */
function calculateDomainConfidence(
  domainDocCount: number,
  totalDocCount: number,
  topicCount: number
): number {
  // Base confidence from document representation
  const docRatio = Math.min(domainDocCount / Math.max(totalDocCount, 1), 1)

  // Bonus for topic variety (more topics = more confident classification)
  const topicBonus = Math.min(topicCount / 10, 0.3)

  // Minimum document threshold
  const docThresholdBonus = domainDocCount >= 3 ? 0.2 : domainDocCount >= 2 ? 0.1 : 0

  return Math.min(0.4 + docRatio * 0.3 + topicBonus + docThresholdBonus, 1)
}

/**
 * Get all unique domain names from taxonomy
 */
export function getAllDomainNames(): string[] {
  const domains: string[] = []
  for (const [category, subdomains] of Object.entries(DOMAIN_TAXONOMY)) {
    for (const subdomain of Object.keys(subdomains)) {
      domains.push(`${category}/${subdomain}`)
    }
  }
  return domains
}

/**
 * Invalidate domain cache for a workspace
 */
export function invalidateDomainCache(workspaceId: string): void {
  const cacheKey = `domains:${workspaceId}`
  domainCache.delete(cacheKey)
  console.log(`[DomainExtractor] Cache invalidated for workspace ${workspaceId.slice(0, 8)}`)
}

/**
 * Get domain coverage as a percentage map
 */
export function getDomainCoverageMap(domains: KnowledgeDomain[]): Map<string, number> {
  const totalDocs = domains.reduce((sum, d) => sum + d.documentCount, 0)
  const coverageMap = new Map<string, number>()

  for (const domain of domains) {
    const percentage = totalDocs > 0 ? (domain.documentCount / totalDocs) * 100 : 0
    coverageMap.set(domain.name, Math.round(percentage))
  }

  return coverageMap
}
