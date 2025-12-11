import { prisma } from '../db/prisma'
import { vectorSearch, hybridSearch } from './vector-search'

type KnowledgeScope = 'all' | 'system' | 'user'

interface SearchOptions {
  workspaceId: string
  query: string
  topK?: number
  useVectorSearch?: boolean // Default true if embeddings available
  scope?: KnowledgeScope // Filter by system (OSQR) vs user knowledge
}

interface SearchResult {
  content: string
  documentTitle: string
  score: number
}

/**
 * Detect if a query is asking about OSQR itself
 */
function isOSQRSystemQuery(query: string): boolean {
  const systemPatterns = [
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
  const { workspaceId, query, topK = 5, useVectorSearch = true } = options

  // Auto-detect scope if not specified
  let scope = options.scope || 'all'
  if (!options.scope && isOSQRSystemQuery(query)) {
    scope = 'system'
    console.log('[Search] Auto-detected OSQR system query, preferring system docs')
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
  const rankedChunks = chunks
    .map(chunk => {
      const contentLower = chunk.content.toLowerCase()
      const matchCount = keywords.filter(keyword =>
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
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  // Format context with better source info
  const context = rankedChunks
    .map((result, idx) => {
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
