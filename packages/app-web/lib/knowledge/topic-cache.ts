/**
 * Topic Cache - Instant Knowledge Lookups
 *
 * Provides O(1) checks for "does user have docs about X?" without database queries.
 * Topics are extracted during document indexing and cached in memory.
 *
 * This enables the auto-context system to quickly determine relevance:
 * - Pattern detection (regex) decides IF to search (~0.1ms)
 * - Topic cache confirms WHAT the user has docs about (~0.01ms)
 * - Only then do we hit the database for actual content (50-200ms)
 *
 * @example
 * ```typescript
 * // Check if user has relevant docs before expensive search
 * if (hasTopicsMatching(workspaceId, 'mcp') || hasTopicsMatching(workspaceId, 'model context protocol')) {
 *   const results = await searchKnowledge({ workspaceId, query, topK: 5 })
 * }
 * ```
 */

import { prisma } from '../db/prisma'

// =============================================================================
// TYPES
// =============================================================================

interface TopicEntry {
  documentId: string
  documentTitle: string
  topics: string[]           // Extracted topic keywords
  isSystem: boolean          // True if OSQR system doc
  category?: string          // documentation, core-lib, api, etc.
  lastUpdated: Date
}

interface WorkspaceCache {
  entries: Map<string, TopicEntry>  // documentId -> TopicEntry
  topicIndex: Map<string, Set<string>>  // topic -> Set<documentId>
  lastRefresh: Date
  documentCount: number
}

// =============================================================================
// CACHE STATE
// =============================================================================

// In-memory cache: workspaceId -> WorkspaceCache
const cache = new Map<string, WorkspaceCache>()

// Cache TTL: refresh if older than 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000

// Topic extraction patterns - what words/phrases indicate topics
const TOPIC_PATTERNS = [
  // Tech terms (usually capitalized or specific)
  /\b(?:MCP|API|SDK|CLI|UI|UX|LLM|RAG|NLP|AI|ML)\b/gi,
  /\b(?:React|Next\.?js|Node\.?js|TypeScript|JavaScript|Python|Prisma)\b/gi,
  /\b(?:OpenAI|Anthropic|Claude|GPT|Gemini|DeepSeek|Groq|Grok)\b/gi,

  // OSQR concepts
  /\b(?:OSQR|Oscar|Jarvis|TIL|MSC|PKV|GKVI|UIP)\b/gi,
  /\b(?:identity.?dimension|auto.?context|temporal.?intelligence)\b/gi,
  /\b(?:council.?mode|bubble.?component|render.?system)\b/gi,
  /\b(?:capture.?router|deep.?research|spoken.?architecture)\b/gi,

  // Architecture terms
  /\b(?:architecture|roadmap|strategy|implementation|specification|spec)\b/gi,
  /\b(?:multi.?agent|context.?engineering|model.?context.?protocol)\b/gi,
  /\b(?:vector.?search|embedding|semantic.?search|knowledge.?base)\b/gi,

  // Document types
  /\b(?:readme|quickstart|setup|guide|tutorial|reference|documentation)\b/gi,

  // Business terms
  /\b(?:pricing|tier|subscription|enterprise|creator|marketplace)\b/gi,
  /\b(?:launch|podcast|marketing|growth|monetization)\b/gi,
]

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Extract topics from document content
 *
 * Uses pattern matching to identify key terms without LLM calls.
 * Fast enough to run during indexing (~1-5ms per document).
 */
export function extractTopics(content: string, title: string): string[] {
  const topics = new Set<string>()

  // Add title words (titles are usually topic-rich)
  const titleWords = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
  titleWords.forEach(w => topics.add(w))

  // Extract from content using patterns
  for (const pattern of TOPIC_PATTERNS) {
    const matches = content.match(pattern) || []
    matches.forEach(m => topics.add(m.toLowerCase().replace(/[.\s]/g, '')))
  }

  // Extract section headers from markdown (## Header)
  const headers = content.match(/^#{1,3}\s+(.+)$/gm) || []
  headers.forEach(h => {
    const text = h.replace(/^#+\s+/, '').toLowerCase()
    const words = text.split(/\s+/).filter(w => w.length > 3)
    words.forEach(w => topics.add(w))
  })

  // Extract code identifiers (function names, class names)
  const codeIdentifiers = content.match(/(?:function|class|const|export)\s+(\w+)/g) || []
  codeIdentifiers.forEach(id => {
    const name = id.replace(/^(?:function|class|const|export)\s+/, '').toLowerCase()
    if (name.length > 3) topics.add(name)
  })

  return Array.from(topics).slice(0, 50) // Cap at 50 topics per doc
}

/**
 * Initialize or refresh cache for a workspace
 *
 * Loads all document metadata and extracts topics.
 * Called lazily on first access or after TTL expiry.
 */
export async function refreshCache(workspaceId: string): Promise<WorkspaceCache> {
  console.log(`[TopicCache] Refreshing cache for workspace ${workspaceId.slice(0, 8)}...`)

  const documents = await prisma.document.findMany({
    where: { workspaceId },
    select: {
      id: true,
      title: true,
      textContent: true,
      metadata: true,
      updatedAt: true,
    },
  })

  const entries = new Map<string, TopicEntry>()
  const topicIndex = new Map<string, Set<string>>()

  for (const doc of documents) {
    const metadata = doc.metadata as Record<string, unknown> | null
    const isSystem = metadata?.scope === 'system'
    const category = (metadata?.category as string) || undefined

    // Extract topics from content (or title if no content)
    const content = doc.textContent || doc.title
    const topics = extractTopics(content, doc.title)

    const entry: TopicEntry = {
      documentId: doc.id,
      documentTitle: doc.title,
      topics,
      isSystem,
      category,
      lastUpdated: doc.updatedAt,
    }

    entries.set(doc.id, entry)

    // Build reverse index: topic -> documents
    for (const topic of topics) {
      if (!topicIndex.has(topic)) {
        topicIndex.set(topic, new Set())
      }
      topicIndex.get(topic)!.add(doc.id)
    }
  }

  const workspaceCache: WorkspaceCache = {
    entries,
    topicIndex,
    lastRefresh: new Date(),
    documentCount: documents.length,
  }

  cache.set(workspaceId, workspaceCache)
  console.log(`[TopicCache] Cached ${documents.length} documents, ${topicIndex.size} unique topics`)

  return workspaceCache
}

/**
 * Get cache for workspace, refreshing if stale
 */
async function getCache(workspaceId: string): Promise<WorkspaceCache> {
  const existing = cache.get(workspaceId)

  if (existing) {
    const age = Date.now() - existing.lastRefresh.getTime()
    if (age < CACHE_TTL_MS) {
      return existing
    }
  }

  return refreshCache(workspaceId)
}

/**
 * Check if workspace has documents matching a topic (O(1) lookup)
 *
 * @param workspaceId - User's workspace
 * @param topic - Topic to check (case-insensitive)
 * @returns true if any documents match the topic
 */
export async function hasTopicsMatching(workspaceId: string, topic: string): Promise<boolean> {
  const wsCache = await getCache(workspaceId)
  const normalizedTopic = topic.toLowerCase().replace(/[.\s-]/g, '')
  return wsCache.topicIndex.has(normalizedTopic)
}

/**
 * Check if workspace has documents matching ANY of the given topics
 *
 * @param workspaceId - User's workspace
 * @param topics - Topics to check
 * @returns true if any documents match any topic
 */
export async function hasAnyTopicMatching(workspaceId: string, topics: string[]): Promise<boolean> {
  const wsCache = await getCache(workspaceId)

  for (const topic of topics) {
    const normalizedTopic = topic.toLowerCase().replace(/[.\s-]/g, '')
    if (wsCache.topicIndex.has(normalizedTopic)) {
      return true
    }
  }

  return false
}

/**
 * Get all topics in a workspace (for debugging/display)
 */
export async function getAllTopics(workspaceId: string): Promise<string[]> {
  const wsCache = await getCache(workspaceId)
  return Array.from(wsCache.topicIndex.keys()).sort()
}

/**
 * Get document count for a workspace (cached)
 */
export async function getDocumentCount(workspaceId: string): Promise<number> {
  const wsCache = await getCache(workspaceId)
  return wsCache.documentCount
}

/**
 * Find topics in user's query that match cached topics
 *
 * Returns the intersection of query topics and cached topics.
 * Useful for determining search relevance without DB query.
 */
export async function findMatchingTopics(workspaceId: string, query: string): Promise<string[]> {
  const wsCache = await getCache(workspaceId)
  const queryTopics = extractTopics(query, '')
  const matches: string[] = []

  for (const topic of queryTopics) {
    if (wsCache.topicIndex.has(topic)) {
      matches.push(topic)
    }
  }

  return matches
}

/**
 * Invalidate cache for a workspace (call after document changes)
 */
export function invalidateCache(workspaceId: string): void {
  cache.delete(workspaceId)
  console.log(`[TopicCache] Invalidated cache for workspace ${workspaceId.slice(0, 8)}`)
}

/**
 * Add a single document to cache (for incremental updates)
 *
 * More efficient than full refresh when adding one document.
 */
export async function addToCache(
  workspaceId: string,
  documentId: string,
  title: string,
  content: string,
  isSystem: boolean = false,
  category?: string
): Promise<void> {
  let wsCache = cache.get(workspaceId)

  if (!wsCache) {
    // Initialize cache first
    wsCache = await refreshCache(workspaceId)
    return // refresh already added all docs
  }

  const topics = extractTopics(content, title)

  const entry: TopicEntry = {
    documentId,
    documentTitle: title,
    topics,
    isSystem,
    category,
    lastUpdated: new Date(),
  }

  wsCache.entries.set(documentId, entry)
  wsCache.documentCount++

  // Update topic index
  for (const topic of topics) {
    if (!wsCache.topicIndex.has(topic)) {
      wsCache.topicIndex.set(topic, new Set())
    }
    wsCache.topicIndex.get(topic)!.add(documentId)
  }

  console.log(`[TopicCache] Added document ${documentId.slice(0, 8)} with ${topics.length} topics`)
}

/**
 * Remove a document from cache
 */
export function removeFromCache(workspaceId: string, documentId: string): void {
  const wsCache = cache.get(workspaceId)
  if (!wsCache) return

  const entry = wsCache.entries.get(documentId)
  if (!entry) return

  // Remove from topic index
  for (const topic of entry.topics) {
    const docSet = wsCache.topicIndex.get(topic)
    if (docSet) {
      docSet.delete(documentId)
      if (docSet.size === 0) {
        wsCache.topicIndex.delete(topic)
      }
    }
  }

  wsCache.entries.delete(documentId)
  wsCache.documentCount--

  console.log(`[TopicCache] Removed document ${documentId.slice(0, 8)}`)
}

// =============================================================================
// SMART RELEVANCE CHECK
// =============================================================================

/**
 * Quick relevance check - should we search knowledge for this query?
 *
 * Combines pattern detection with topic cache for instant decisions.
 * Returns relevance level and suggested scope.
 *
 * @example
 * ```typescript
 * const relevance = await checkQueryRelevance(workspaceId, 'How does MCP work?')
 * // { shouldSearch: true, scope: 'system', confidence: 'high', matchedTopics: ['mcp'] }
 * ```
 */
export async function checkQueryRelevance(
  workspaceId: string,
  query: string
): Promise<{
  shouldSearch: boolean
  scope: 'system' | 'user' | 'all'
  confidence: 'high' | 'medium' | 'low'
  matchedTopics: string[]
}> {
  // First: extract topics from query
  const queryTopics = extractTopics(query, '')

  if (queryTopics.length === 0) {
    return { shouldSearch: false, scope: 'all', confidence: 'low', matchedTopics: [] }
  }

  // Second: check against cache
  const matchedTopics = await findMatchingTopics(workspaceId, query)

  if (matchedTopics.length === 0) {
    // No cached topics match - probably not worth searching
    return { shouldSearch: false, scope: 'all', confidence: 'medium', matchedTopics: [] }
  }

  // Third: determine scope based on matched topics
  // System scope indicators (OSQR internals)
  const systemIndicators = ['osqr', 'jarvis', 'roadmap', 'architecture', 'til', 'msc', 'pkv', 'gkvi', 'uip']
  const isSystemQuery = matchedTopics.some(t => systemIndicators.includes(t))

  const scope = isSystemQuery ? 'system' : 'user'
  const confidence = matchedTopics.length >= 3 ? 'high' : matchedTopics.length >= 1 ? 'medium' : 'low'

  return {
    shouldSearch: true,
    scope,
    confidence,
    matchedTopics,
  }
}

// =============================================================================
// CACHE STATS (for debugging)
// =============================================================================

export function getCacheStats(): {
  workspaceCount: number
  totalDocuments: number
  totalTopics: number
  cacheAge: Record<string, number>
} {
  let totalDocuments = 0
  let totalTopics = 0
  const cacheAge: Record<string, number> = {}

  cache.forEach((wsCache, wsId) => {
    totalDocuments += wsCache.documentCount
    totalTopics += wsCache.topicIndex.size
    cacheAge[wsId] = Date.now() - wsCache.lastRefresh.getTime()
  })

  return {
    workspaceCount: cache.size,
    totalDocuments,
    totalTopics,
    cacheAge,
  }
}
