import { prisma } from '../db/prisma'
import { vectorSearch, hybridSearch } from './vector-search'

interface SearchOptions {
  workspaceId: string
  query: string
  topK?: number
  useVectorSearch?: boolean // Default true if embeddings available
}

interface SearchResult {
  content: string
  documentTitle: string
  score: number
}

/**
 * Search knowledge base for relevant content
 *
 * Uses vector search (semantic) when embeddings are available,
 * falls back to keyword search otherwise.
 */
export async function searchKnowledge(options: SearchOptions): Promise<string | undefined> {
  const { workspaceId, query, topK = 5, useVectorSearch = true } = options

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
  return await keywordSearch({ workspaceId, query, topK })
}

/**
 * Keyword-based search (fallback when no embeddings)
 */
async function keywordSearch(options: {
  workspaceId: string
  query: string
  topK: number
}): Promise<string | undefined> {
  const { workspaceId, query, topK } = options

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

  // Search for chunks containing keywords
  const chunks = await prisma.documentChunk.findMany({
    where: {
      document: {
        workspaceId,
      },
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

      return {
        content: chunk.content,
        documentTitle: chunk.document.originalFilename || chunk.document.title,
        score: matchCount,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  // Format context
  const context = rankedChunks
    .map((result, idx) => {
      return `[Source ${idx + 1}: ${result.documentTitle}]\n${result.content}`
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
