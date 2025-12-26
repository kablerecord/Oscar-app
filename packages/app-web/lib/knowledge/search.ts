import { prisma } from '../db/prisma'
import { vectorSearch, hybridSearch } from './vector-search'
import { searchByConcept } from '../osqr/document-indexing-wrapper'
import { featureFlags } from '../osqr/config'
import { checkQueryRelevance, findMatchingTopics } from './topic-cache'

type KnowledgeScope = 'all' | 'system' | 'user'

interface SearchOptions {
  workspaceId: string
  query: string
  topK?: number
  useVectorSearch?: boolean // Default true if embeddings available
  scope?: KnowledgeScope // Filter by system (OSQR) vs user knowledge
  useOSQRIndexing?: boolean // Use OSQR Document Indexing semantic search
}

interface SearchResult {
  content: string
  documentTitle: string
  score: number
}

/**
 * Detect if a query is asking about OSQR itself or topics in the research library
 *
 * This is a zero-cost check (regex only, ~0.1ms) that determines whether
 * to search system docs vs user docs vs both.
 */
function isOSQRSystemQuery(query: string): boolean {
  const systemPatterns = [
    // OSQR core concepts
    /osqr/i,
    /jarvis/i,
    /roadmap/i,
    /architecture/i,
    /how does.*work/i,
    /where is.*defined/i,
    /what (file|module|function)/i,
    /implementation/i,
    /capability|capabilities/i,
    /til|temporal intelligence/i,
    /msc|mission/i,
    /auto.?context/i,
    /panel|agent/i,
    /knowledge.?base/i,
    /identity.?dimension/i,
    /autonomy/i,
    /uip|user intelligence/i,
    /constitutional/i,
    /throttle|rate.?limit/i,
    /pricing|tier/i,

    // Research library topics (from docs/research/)
    /\bmcp\b/i,                    // Model Context Protocol
    /model context protocol/i,
    /n8n/i,                        // n8n automation
    /context.*(engineering|rot)/i, // Context engineering/rot
    /multi.?agent/i,               // Multi-agent systems
    /\bbmad\b/i,                   // BMAD methodology
    /llm.*(fine.?tun|optim)/i,     // LLM fine-tuning/optimization
    /deepseek/i,                   // DeepSeek R1
    /langchain/i,                  // LangChain
    /agentic.*(workflow|software)/i, // Agentic patterns
    /memory.?bank/i,               // Memory bank patterns
    /gatekeeper.?pattern/i,        // Gatekeeper architecture
    /openvino/i,                   // OpenVINO optimization
    /open.?source.?llm/i,          // Open source LLMs
    /self.?heal/i,                 // Self-healing workflows
    /attention.*(need|mechanism)/i, // Attention papers

    // Feature specs (from docs/features/)
    /render.?system/i,
    /bubble.?component/i,
    /council.?mode/i,
    /capture.?router/i,
    /deep.?research/i,
    /spoken.?architecture/i,

    // Business/strategy (from docs/business/, docs/strategy/)
    /launch.?strategy/i,
    /podcast.?seed/i,
    /creator.?marketplace/i,
    /enterprise.?(tier|feature|integration)/i,

    // Vision docs
    /browser.?extension/i,
    /ios.?build/i,
    /privacy.?phone/i,
    /vscode.?(companion|extension)/i,

    // Self-discovery & Spoken Architecture (from docs/vision/)
    /self.?discovery/i,
    /\bpieces?\b.*saas/i,           // "pieces of a SaaS", "universal pieces"
    /saas.*\bpieces?\b/i,           // "SaaS pieces"
    /question.?tree/i,
    /piece.?template/i,
    /piece.?(inventory|dependenc|extraction)/i,
    /universal.?(piece|component|block)/i,
    /recursive.?loop/i,
    /codebase.?structure/i,
    /feature.?inventory/i,
    /pattern.?recognition/i,
    /build.?process/i,
    /piece.?generation/i,
    /interview.?flow/i,
    /agentic.?capabilit/i,
    /self.?modification/i,
    /self.?improvement/i,
    /knowledge.?accumulation/i,
    /\bconvergence\b/i,
    /what.?pieces/i,
    /extract.*pieces/i,
    /understand.*exists/i,
    /phase\s*[1-7]/i,               // "Phase 1", "Phase 2", etc.
  ]
  return systemPatterns.some((pattern) => pattern.test(query))
}

/**
 * Search knowledge base for relevant content
 *
 * Uses vector search (semantic) when embeddings are available,
 * falls back to keyword search otherwise.
 *
 * Intelligently routes queries:
 * - OSQR-related questions -> prefer system scope
 * - User questions -> prefer user scope
 * - Ambiguous -> search all
 */
export async function searchKnowledge(options: SearchOptions): Promise<string | undefined> {
  const { workspaceId, query, topK = 5, useVectorSearch = true, useOSQRIndexing = true } = options

  // Auto-detect scope if not specified
  let scope = options.scope || 'all'
  if (!options.scope && isOSQRSystemQuery(query)) {
    scope = 'system'
    console.log('[Search] Auto-detected OSQR system query, preferring system docs')
  }

  // Try OSQR Document Indexing semantic search first (for user documents)
  // This uses the @osqr/core pipeline with multi-vector embeddings
  if (useOSQRIndexing && featureFlags.enableDocumentIndexing && scope !== 'system') {
    try {
      const osqrResults = await searchByConcept(workspaceId, query, { limit: topK })

      if (osqrResults.length > 0) {
        console.log(`[Search] OSQR semantic search found ${osqrResults.length} results`)

        // Format results for context
        const context = osqrResults
          .map((result, idx) => {
            const projectLabel = result.projectId ? ` (Project: ${result.projectId})` : ''
            return `[Source ${idx + 1}: ${result.documentName}${projectLabel}]\n${result.chunkContent}`
          })
          .join('\n\n---\n\n')

        return context
      }
    } catch (error) {
      console.log('[Search] OSQR semantic search unavailable, falling back to vector search:', error)
    }
  }

  // Check if we have any embeddings
  if (useVectorSearch) {
    try {
      const embeddingCount = await prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(*) as count FROM "DocumentChunk" dc
        JOIN "Document" d ON d.id = dc."documentId"
        WHERE d."workspaceId" = ${workspaceId}
        AND dc.embedding IS NOT NULL
      `

      if (Number(embeddingCount[0].count) > 0) {
        // Use vector search
        console.log(`[Search] Using vector search (${Number(embeddingCount[0].count)} embedded chunks)`)
        return await vectorSearch({ workspaceId, query, topK })
      }
    } catch (error) {
      console.log('[Search] Vector search unavailable, falling back to keyword search')
    }
  }

  // Fall back to keyword search
  console.log('[Search] Using keyword search')
  return await keywordSearch({ workspaceId, query, topK, scope })
}

/**
 * Build scope filter for Prisma queries
 */
function buildScopeFilter(scope: KnowledgeScope): object | undefined {
  if (scope === 'system') {
    // Only OSQR system docs (indexed by index-osqr-self)
    return {
      metadata: {
        path: ['scope'],
        equals: 'system',
      },
    }
  }
  if (scope === 'user') {
    // Only user docs (not system)
    return {
      NOT: {
        metadata: {
          path: ['scope'],
          equals: 'system',
        },
      },
    }
  }
  return undefined // No filter for 'all'
}

/**
 * Keyword-based search (fallback when no embeddings)
 */
async function keywordSearch(options: {
  workspaceId: string
  query: string
  topK: number
  scope: KnowledgeScope
}): Promise<string | undefined> {
  const { workspaceId, query, topK, scope } = options

  // Extract keywords from query
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !STOP_WORDS.has(word))
    .slice(0, 10)

  if (keywords.length === 0) {
    return undefined
  }

  // Build document filter with scope
  const scopeFilter = buildScopeFilter(scope)
  const documentFilter: Record<string, unknown> = { workspaceId }
  if (scopeFilter) {
    Object.assign(documentFilter, scopeFilter)
  }

  // Search for chunks containing keywords
  const chunks = await prisma.documentChunk.findMany({
    where: {
      document: documentFilter,
      OR: keywords.map(keyword => ({
        content: {
          contains: keyword,
          mode: 'insensitive' as const,
        },
      })),
    },
    include: {
      document: {
        select: {
          title: true,
          originalFilename: true,
          metadata: true,
        },
      },
    },
    take: topK * 3,
  })

  if (chunks.length === 0) {
    return undefined
  }

  // Rank by keyword matches
  type ChunkType = (typeof chunks)[number]
  const rankedChunks = chunks
    .map((chunk: ChunkType) => {
      const contentLower = chunk.content.toLowerCase()
      const matchCount = keywords.filter((keyword: string) =>
        contentLower.includes(keyword)
      ).length

      // Get metadata for better source display
      const metadata = chunk.document.metadata as Record<string, unknown> | null
      const isSystem = metadata?.scope === 'system'
      const sourcePath = metadata?.osqr_source_path as string | undefined

      return {
        content: chunk.content,
        documentTitle: chunk.document.originalFilename || chunk.document.title,
        sourcePath,
        isSystem,
        score: matchCount,
      }
    })
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, topK)

  // Format context with better source info
  type RankedChunk = (typeof rankedChunks)[number]
  const context = rankedChunks
    .map((result: RankedChunk, idx: number) => {
      const sourceLabel = result.isSystem
        ? `[OSQR: ${result.sourcePath || result.documentTitle}]`
        : `[Source ${idx + 1}: ${result.documentTitle}]`
      return `${sourceLabel}\n${result.content}`
    })
    .join('\n\n---\n\n')

  return context
}

/**
 * Common English stop words to filter out
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'than',
  'too', 'very', 'can', 'will', 'just', 'should', 'now', 'what', 'which',
  'who', 'they', 'them', 'their', 'this', 'that', 'these', 'those', 'are',
  'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having', 'does',
  'did', 'doing', 'would', 'could', 'ought', 'might', 'must', 'shall',
])

// Re-export vector search functions
export { vectorSearch, hybridSearch } from './vector-search'

// Re-export topic cache functions for convenience
export { checkQueryRelevance, findMatchingTopics, hasTopicsMatching, hasAnyTopicMatching } from './topic-cache'

/**
 * Smart search with topic-cache pre-check
 *
 * Uses the topic cache to determine if a search is worth doing,
 * avoiding expensive database queries when user has no relevant docs.
 *
 * @example
 * ```typescript
 * const result = await smartSearch({
 *   workspaceId: 'ws_123',
 *   query: 'How does MCP work?',
 *   topK: 5,
 * })
 *
 * if (result.searched) {
 *   console.log(`Found ${result.matchedTopics.length} matching topics`)
 *   console.log(result.context)
 * } else {
 *   console.log('No relevant docs found in topic cache, skipped search')
 * }
 * ```
 */
export async function smartSearch(options: {
  workspaceId: string
  query: string
  topK?: number
  skipCacheCheck?: boolean  // Force search even if cache says no matches
}): Promise<{
  searched: boolean
  context: string | undefined
  matchedTopics: string[]
  scope: 'system' | 'user' | 'all'
  confidence: 'high' | 'medium' | 'low'
}> {
  const { workspaceId, query, topK = 5, skipCacheCheck = false } = options

  // Step 1: Quick topic cache check (< 1ms)
  if (!skipCacheCheck) {
    const relevance = await checkQueryRelevance(workspaceId, query)

    if (!relevance.shouldSearch) {
      // Topic cache says no relevant docs - skip expensive search
      return {
        searched: false,
        context: undefined,
        matchedTopics: [],
        scope: 'all',
        confidence: relevance.confidence,
      }
    }

    // Topic cache says we have relevant docs - proceed with search
    const context = await searchKnowledge({
      workspaceId,
      query,
      topK,
      scope: relevance.scope,
    })

    return {
      searched: true,
      context,
      matchedTopics: relevance.matchedTopics,
      scope: relevance.scope,
      confidence: relevance.confidence,
    }
  }

  // Skip cache check - do full search
  const context = await searchKnowledge({ workspaceId, query, topK })
  const matchedTopics = await findMatchingTopics(workspaceId, query)

  return {
    searched: true,
    context,
    matchedTopics,
    scope: 'all',
    confidence: 'medium',
  }
}
