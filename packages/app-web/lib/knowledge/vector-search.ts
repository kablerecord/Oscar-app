import { prisma } from '../db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '../ai/embeddings'

interface VectorSearchOptions {
  workspaceId: string
  query: string
  topK?: number
  similarityThreshold?: number // Minimum similarity score (0-1)
}

interface SearchResult {
  id: string
  content: string
  documentId: string
  documentTitle: string
  similarity: number
}

/**
 * Semantic search using vector embeddings
 *
 * Uses pgvector's cosine distance operator (<=>)
 * Returns chunks ranked by similarity to the query
 */
export async function vectorSearch(options: VectorSearchOptions): Promise<string | undefined> {
  const { workspaceId, query, topK = 5, similarityThreshold = 0.7 } = options

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query)
  const embeddingStr = formatEmbeddingForPostgres(queryEmbedding)

  // Use raw SQL for vector similarity search
  // pgvector uses <=> for cosine distance (0 = identical, 2 = opposite)
  // We convert to similarity: 1 - (distance / 2)
  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      dc.id,
      dc.content,
      dc."documentId",
      d.title as "documentTitle",
      1 - (dc.embedding <=> ${embeddingStr}::vector) as similarity
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE d."workspaceId" = ${workspaceId}
      AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> ${embeddingStr}::vector
    LIMIT ${topK}
  `

  if (results.length === 0) {
    return undefined
  }

  // Filter by similarity threshold and format context
  const relevantResults = results.filter(r => r.similarity >= similarityThreshold)

  if (relevantResults.length === 0) {
    // If nothing passes threshold, still return top results but note low confidence
    const context = results
      .slice(0, 3)
      .map((result, idx) => {
        return `[Source ${idx + 1}: ${result.documentTitle}]\n${result.content}`
      })
      .join('\n\n---\n\n')

    return `Note: These results have lower confidence matches.\n\n${context}`
  }

  // Format context for OSQR
  const context = relevantResults
    .map((result, idx) => {
      return `[Source ${idx + 1}: ${result.documentTitle} (${Math.round(result.similarity * 100)}% match)]\n${result.content}`
    })
    .join('\n\n---\n\n')

  return context
}

/**
 * Hybrid search: combines vector similarity with keyword matching
 * Useful for when exact terms matter (e.g., names, acronyms)
 */
export async function hybridSearch(options: VectorSearchOptions): Promise<string | undefined> {
  const { workspaceId, query, topK = 5 } = options

  // Generate embedding for semantic search
  const queryEmbedding = await generateEmbedding(query)
  const embeddingStr = formatEmbeddingForPostgres(queryEmbedding)

  // Extract keywords for text matching
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 5)

  // Build keyword conditions
  const keywordConditions = keywords.length > 0
    ? keywords.map(k => `dc.content ILIKE '%${k}%'`).join(' OR ')
    : 'TRUE'

  // Hybrid query: boost results that match both semantically AND contain keywords
  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      dc.id,
      dc.content,
      dc."documentId",
      d.title as "documentTitle",
      CASE
        WHEN dc.embedding IS NOT NULL
        THEN 1 - (dc.embedding <=> ${embeddingStr}::vector)
        ELSE 0
      END as similarity
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE d."workspaceId" = ${workspaceId}
      AND (dc.embedding IS NOT NULL OR (${keywordConditions}))
    ORDER BY
      CASE
        WHEN dc.embedding IS NOT NULL
        THEN dc.embedding <=> ${embeddingStr}::vector
        ELSE 2
      END
    LIMIT ${topK}
  `

  if (results.length === 0) {
    return undefined
  }

  // Format context for OSQR
  const context = results
    .map((result, idx) => {
      const matchInfo = result.similarity > 0
        ? `${Math.round(result.similarity * 100)}% semantic match`
        : 'keyword match'
      return `[Source ${idx + 1}: ${result.documentTitle} (${matchInfo})]\n${result.content}`
    })
    .join('\n\n---\n\n')

  return context
}
