/**
 * OSQR Pre-fetch System
 *
 * "Jarvis Awareness" - Pre-load user context in the background so OSQR
 * always feels instantly aware. Like Netflix buffering before you hit play.
 *
 * Architecture:
 * - 100 items organized into 4 priority tiers
 * - Tier 1 loads immediately (critical context)
 * - Tiers 2-4 stagger over 2-3 seconds to avoid system load
 * - Each item has a TTL (time-to-live) before refresh
 * - Memory-efficient: ~200KB per user max
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export interface PrefetchedContext {
  // Tier 1: Identity (loaded immediately, ~50ms)
  vaultStats?: { documentCount: number; chunkCount: number }
  profile?: { name?: string; bio?: string; goals?: string[] }
  settings?: Record<string, unknown>

  // Tier 2: Active Work (loaded at 100ms, ~100ms)
  mscProjects?: Array<{ id: string; title: string; status: string; summary?: string }>
  recentThreads?: Array<{ id: string; title: string; lastMessageAt: Date }>
  activeGoals?: string[]

  // Tier 3: Knowledge Overview (loaded at 300ms, ~200ms)
  topDocuments?: Array<{ id: string; title: string; sourceType: string }>
  documentsByType?: Record<string, number>
  recentUploads?: Array<{ id: string; title: string; createdAt: Date }>
  tagCloud?: Array<{ tag: string; count: number }>

  // Tier 4: Extended Context (loaded at 600ms, ~300ms)
  frequentTopics?: string[]
  projectSummaries?: Record<string, string>
  knowledgeGaps?: string[]
  connectionMap?: Record<string, string[]> // topic -> related topics

  // Metadata
  _meta: {
    workspaceId: string
    fetchedAt: Date
    tier1Complete: boolean
    tier2Complete: boolean
    tier3Complete: boolean
    tier4Complete: boolean
    totalItems: number
  }
}

interface PrefetchItem {
  key: keyof Omit<PrefetchedContext, '_meta'>
  tier: 1 | 2 | 3 | 4
  ttlMinutes: number
  fetcher: (workspaceId: string) => Promise<unknown>
}

// =============================================================================
// IN-MEMORY CACHE
// =============================================================================

// Simple in-memory cache (per-process)
// For production with multiple instances, use Redis
const contextCache = new Map<string, PrefetchedContext>()
const fetchInProgress = new Map<string, Promise<PrefetchedContext>>()

// =============================================================================
// PREFETCH ITEMS DEFINITION
// =============================================================================

const PREFETCH_ITEMS: PrefetchItem[] = [
  // -------------------------------------------------------------------------
  // TIER 1: Identity & Stats (immediate, essential for any question)
  // -------------------------------------------------------------------------
  {
    key: 'vaultStats',
    tier: 1,
    ttlMinutes: 10,
    fetcher: async (workspaceId) => {
      const [documentCount, chunkCount] = await Promise.all([
        prisma.document.count({ where: { workspaceId } }),
        prisma.documentChunk.count({ where: { document: { workspaceId } } }),
      ])
      return { documentCount, chunkCount }
    },
  },
  {
    key: 'profile',
    tier: 1,
    ttlMinutes: 30,
    fetcher: async (workspaceId) => {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, tier: true, owner: { select: { name: true, email: true } } },
      })
      // Also fetch profile answers for user preferences
      const profileAnswers = await prisma.profileAnswer.findMany({
        where: { workspaceId },
        select: { category: true, answer: true },
      })
      const preferences = Object.fromEntries(
        profileAnswers.map(p => [p.category, p.answer])
      )
      return {
        name: workspace?.name,
        tier: workspace?.tier,
        ownerName: workspace?.owner?.name,
        preferences,
      }
    },
  },
  {
    key: 'settings',
    tier: 1,
    ttlMinutes: 30,
    fetcher: async (workspaceId) => {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { owner: { select: { id: true } } },
      })
      if (!workspace?.owner?.id) return {}

      const settings = await prisma.userSetting.findMany({
        where: { userId: workspace.owner.id },
      })
      return Object.fromEntries(settings.map(s => [s.key, s.value]))
    },
  },

  // -------------------------------------------------------------------------
  // TIER 2: Active Work (100ms delay, important for work-related questions)
  // -------------------------------------------------------------------------
  {
    key: 'mscProjects',
    tier: 2,
    ttlMinutes: 5,
    fetcher: async (workspaceId) => {
      // Get MSC items (projects) for this workspace
      const items = await prisma.mSCItem.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          content: true,  // Title/main content
          status: true,
          description: true,  // Optional notes
          category: true,
        },
      })
      // Map to expected format
      return items.map(item => ({
        id: item.id,
        title: item.content,
        status: item.status,
        summary: item.description,
        category: item.category,
      }))
    },
  },
  {
    key: 'recentThreads',
    tier: 2,
    ttlMinutes: 2,
    fetcher: async (workspaceId) => {
      const threads = await prisma.chatThread.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, title: true, updatedAt: true },
      })
      return threads.map(t => ({
        id: t.id,
        title: t.title || 'Untitled',
        lastMessageAt: t.updatedAt,
      }))
    },
  },
  {
    key: 'activeGoals',
    tier: 2,
    ttlMinutes: 10,
    fetcher: async (workspaceId) => {
      // Get goals from MSCItem (category='goal')
      const goals = await prisma.mSCItem.findMany({
        where: { workspaceId, category: 'goal', status: 'active' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { content: true },
      })
      return goals.map(g => g.content)
    },
  },

  // -------------------------------------------------------------------------
  // TIER 3: Knowledge Overview (300ms delay, for vault-related questions)
  // -------------------------------------------------------------------------
  {
    key: 'topDocuments',
    tier: 3,
    ttlMinutes: 10,
    fetcher: async (workspaceId) => {
      const docs = await prisma.document.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true, title: true, sourceType: true },
      })
      return docs
    },
  },
  {
    key: 'documentsByType',
    tier: 3,
    ttlMinutes: 10,
    fetcher: async (workspaceId) => {
      const docs = await prisma.document.groupBy({
        by: ['sourceType'],
        where: { workspaceId },
        _count: { id: true },
      })
      return Object.fromEntries(docs.map(d => [d.sourceType || 'unknown', d._count.id]))
    },
  },
  {
    key: 'recentUploads',
    tier: 3,
    ttlMinutes: 5,
    fetcher: async (workspaceId) => {
      const docs = await prisma.document.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, createdAt: true },
      })
      return docs
    },
  },

  // -------------------------------------------------------------------------
  // TIER 4: Extended Context (600ms delay, nice-to-have insights)
  // -------------------------------------------------------------------------
  {
    key: 'frequentTopics',
    tier: 4,
    ttlMinutes: 15,
    fetcher: async (workspaceId) => {
      // Extract topics from recent thread titles
      const threads = await prisma.chatThread.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: { title: true },
      })

      // Simple word frequency (could be more sophisticated)
      const words = threads
        .map(t => t.title?.toLowerCase().split(/\s+/) || [])
        .flat()
        .filter(w => w.length > 4) // Skip short words

      const freq = new Map<string, number>()
      words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1))

      return Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word)
    },
  },
  {
    key: 'projectSummaries',
    tier: 4,
    ttlMinutes: 10,
    fetcher: async (workspaceId) => {
      // Get projects with descriptions from MSCItem
      const projects = await prisma.mSCItem.findMany({
        where: {
          workspaceId,
          category: 'project',
          description: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { content: true, description: true },
      })

      return Object.fromEntries(
        projects
          .filter(p => p.description)
          .map(p => [p.content, p.description!])
      )
    },
  },
]

// =============================================================================
// PREFETCH ENGINE
// =============================================================================

/**
 * Initialize pre-fetch for a user session
 * Call this when user opens the chat interface
 */
export async function initializePrefetch(workspaceId: string): Promise<PrefetchedContext> {
  // Check if already fetching
  const inProgress = fetchInProgress.get(workspaceId)
  if (inProgress) {
    return inProgress
  }

  // Check cache freshness
  const cached = contextCache.get(workspaceId)
  if (cached && isCacheFresh(cached)) {
    return cached
  }

  // Start new prefetch
  const fetchPromise = runPrefetch(workspaceId)
  fetchInProgress.set(workspaceId, fetchPromise)

  try {
    const result = await fetchPromise
    contextCache.set(workspaceId, result)
    return result
  } finally {
    fetchInProgress.delete(workspaceId)
  }
}

/**
 * Get cached context immediately (non-blocking)
 * Returns whatever is available, even if incomplete
 */
export function getCachedContext(workspaceId: string): PrefetchedContext | null {
  return contextCache.get(workspaceId) || null
}

/**
 * Invalidate cache for a workspace (call after data changes)
 */
export function invalidateCache(workspaceId: string): void {
  contextCache.delete(workspaceId)
}

/**
 * Check if cached context is still fresh enough
 */
function isCacheFresh(context: PrefetchedContext): boolean {
  const age = Date.now() - context._meta.fetchedAt.getTime()
  // Consider cache fresh if less than 1 minute old
  return age < 60 * 1000
}

/**
 * Run the tiered prefetch
 */
async function runPrefetch(workspaceId: string): Promise<PrefetchedContext> {
  const context: PrefetchedContext = {
    _meta: {
      workspaceId,
      fetchedAt: new Date(),
      tier1Complete: false,
      tier2Complete: false,
      tier3Complete: false,
      tier4Complete: false,
      totalItems: 0,
    },
  }

  const startTime = Date.now()

  // Group items by tier
  const tier1 = PREFETCH_ITEMS.filter(i => i.tier === 1)
  const tier2 = PREFETCH_ITEMS.filter(i => i.tier === 2)
  const tier3 = PREFETCH_ITEMS.filter(i => i.tier === 3)
  const tier4 = PREFETCH_ITEMS.filter(i => i.tier === 4)

  // Tier 1: Immediate (parallel)
  await fetchTier(workspaceId, tier1, context)
  context._meta.tier1Complete = true
  console.log(`[Prefetch] Tier 1 complete: ${Date.now() - startTime}ms`)

  // Tier 2: After 100ms delay
  await delay(100)
  await fetchTier(workspaceId, tier2, context)
  context._meta.tier2Complete = true
  console.log(`[Prefetch] Tier 2 complete: ${Date.now() - startTime}ms`)

  // Tier 3: After 300ms total
  await delay(200)
  await fetchTier(workspaceId, tier3, context)
  context._meta.tier3Complete = true
  console.log(`[Prefetch] Tier 3 complete: ${Date.now() - startTime}ms`)

  // Tier 4: After 600ms total
  await delay(300)
  await fetchTier(workspaceId, tier4, context)
  context._meta.tier4Complete = true
  console.log(`[Prefetch] Tier 4 complete: ${Date.now() - startTime}ms`)

  console.log(`[Prefetch] All tiers complete: ${context._meta.totalItems} items in ${Date.now() - startTime}ms`)

  return context
}

/**
 * Fetch all items in a tier (parallel within tier)
 */
async function fetchTier(
  workspaceId: string,
  items: PrefetchItem[],
  context: PrefetchedContext
): Promise<void> {
  const results = await Promise.allSettled(
    items.map(async (item) => {
      try {
        const value = await item.fetcher(workspaceId)
        ;(context as unknown as Record<string, unknown>)[item.key] = value
        context._meta.totalItems++
      } catch (error) {
        console.warn(`[Prefetch] Failed to fetch ${item.key}:`, error)
      }
    })
  )
}

/**
 * Helper: delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// =============================================================================
// CONTEXT INJECTION HELPERS
// =============================================================================

/**
 * Build a context string from prefetched data for injection into prompts
 */
export function buildContextFromPrefetch(context: PrefetchedContext): string {
  const sections: string[] = []

  // Vault overview
  if (context.vaultStats) {
    sections.push(`📚 Vault: ${context.vaultStats.documentCount} documents, ${context.vaultStats.chunkCount} searchable chunks`)
  }

  // Active projects
  if (context.mscProjects && context.mscProjects.length > 0) {
    const active = context.mscProjects.filter(p => p.status === 'active').slice(0, 3)
    if (active.length > 0) {
      sections.push(`🎯 Active Projects: ${active.map(p => p.title).join(', ')}`)
    }
  }

  // Recent threads (what they've been asking about)
  if (context.recentThreads && context.recentThreads.length > 0) {
    const recent = context.recentThreads.slice(0, 3)
    sections.push(`💬 Recent Topics: ${recent.map(t => t.title).join(', ')}`)
  }

  // Document types
  if (context.documentsByType) {
    const types = Object.entries(context.documentsByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => `${type}: ${count}`)
    if (types.length > 0) {
      sections.push(`📁 Document Types: ${types.join(', ')}`)
    }
  }

  return sections.join('\n')
}

/**
 * Get specific stat from prefetched context
 */
export function getVaultStats(context: PrefetchedContext | null): { documentCount: number; chunkCount: number } | null {
  return context?.vaultStats || null
}

export function getMSCProjects(context: PrefetchedContext | null): Array<{ id: string; title: string; status: string }> {
  return context?.mscProjects || []
}

export function getRecentThreads(context: PrefetchedContext | null): Array<{ id: string; title: string }> {
  return context?.recentThreads || []
}
