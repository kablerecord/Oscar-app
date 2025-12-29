/**
 * Retrieval Sub-Agent (Phase 6)
 *
 * Performs heavy PKV retrieval in an isolated context, then returns
 * compressed insights to the main thread. This keeps the main OSQR
 * context clean and within token budget.
 *
 * Pattern:
 * - Main thread sends query + optional document IDs
 * - Sub-agent performs full PKV search
 * - Sub-agent synthesizes and compresses findings
 * - Returns max 1500 tokens of insight
 * - Sub-agent never speaks to user; OSQR owns the answer
 *
 * @see docs/builds/DEPTH_AWARE_INTELLIGENCE_BUILD.md
 */

import { prisma } from '../db/prisma'
import { searchKnowledge } from '../knowledge/search'
import { ProviderRegistry } from '../ai/providers'
import { generateEmbedding, formatEmbeddingForPostgres } from '../ai/embeddings'

// =============================================================================
// TYPES
// =============================================================================

export interface RetrievalOptions {
  documentIds?: string[]    // Specific docs to search (if known)
  maxChunks?: number        // Token budget control
  maxResponseTokens?: number // Default 1500
  includeMetadata?: boolean  // Include source info in response
}

export interface RetrievalResult {
  summary: string           // Compressed insight (max 1500 tokens)
  sourceDocuments: string[] // Document IDs that were used
  sourceTitles: string[]    // Document titles for display
  confidence: number        // How confident we are in the synthesis
  chunksAnalyzed: number    // Number of chunks processed
  tokensUsed: number        // Approximate tokens in response
  isEmpty: boolean          // True if no relevant content found
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MAX_CHUNKS = 10
const DEFAULT_MAX_RESPONSE_TOKENS = 1500
const SIMILARITY_THRESHOLD = 0.6

// =============================================================================
// MAIN RETRIEVAL FUNCTION
// =============================================================================

/**
 * Retrieve and summarize relevant content from user's vault
 *
 * This is the "heavy lifting" function - it:
 * 1. Searches the PKV for relevant chunks
 * 2. Optionally filters to specific documents
 * 3. Synthesizes findings into compressed insight
 * 4. Returns structured result for main thread
 */
export async function retrieveAndSummarize(
  query: string,
  userId: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  const {
    documentIds,
    maxChunks = DEFAULT_MAX_CHUNKS,
    maxResponseTokens = DEFAULT_MAX_RESPONSE_TOKENS,
    includeMetadata = true,
  } = options

  console.log(`[RetrievalAgent] Starting retrieval for query: ${query.slice(0, 50)}...`)

  // Get workspace ID for the user
  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  })

  if (!workspace) {
    return emptyResult('No workspace found')
  }

  // Step 1: Get relevant chunks
  let chunks: RetrievedChunk[]

  if (documentIds && documentIds.length > 0) {
    // Search specific documents
    chunks = await searchSpecificDocuments(query, documentIds, maxChunks)
  } else {
    // Search entire vault
    chunks = await searchVault(workspace.id, query, maxChunks)
  }

  if (chunks.length === 0) {
    return emptyResult('No relevant content found in vault')
  }

  console.log(`[RetrievalAgent] Found ${chunks.length} relevant chunks`)

  // Step 2: Synthesize findings
  const synthesis = await synthesizeFindings(query, chunks, maxResponseTokens)

  // Step 3: Build result
  const sourceDocIds = [...new Set(chunks.map(c => c.documentId))]
  const sourceTitles = [...new Set(chunks.map(c => c.documentTitle))]

  return {
    summary: includeMetadata
      ? addSourceMetadata(synthesis.summary, sourceTitles)
      : synthesis.summary,
    sourceDocuments: sourceDocIds,
    sourceTitles,
    confidence: synthesis.confidence,
    chunksAnalyzed: chunks.length,
    tokensUsed: estimateTokens(synthesis.summary),
    isEmpty: false,
  }
}

// =============================================================================
// CHUNK RETRIEVAL
// =============================================================================

interface RetrievedChunk {
  id: string
  documentId: string
  documentTitle: string
  content: string
  similarity: number
}

/**
 * Search specific documents for relevant chunks
 */
async function searchSpecificDocuments(
  query: string,
  documentIds: string[],
  maxChunks: number
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query)
  const embeddingStr = formatEmbeddingForPostgres(queryEmbedding)

  const chunks = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      dc.id,
      dc."documentId",
      d.title as "documentTitle",
      dc.content,
      1 - (dc.embedding <=> ${embeddingStr}::vector) as similarity
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE dc."documentId" = ANY(${documentIds}::text[])
    AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> ${embeddingStr}::vector
    LIMIT ${maxChunks}
  `

  return chunks.filter(c => c.similarity >= SIMILARITY_THRESHOLD)
}

/**
 * Search entire vault for relevant chunks
 */
async function searchVault(
  workspaceId: string,
  query: string,
  maxChunks: number
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query)
  const embeddingStr = formatEmbeddingForPostgres(queryEmbedding)

  const chunks = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      dc.id,
      dc."documentId",
      d.title as "documentTitle",
      dc.content,
      1 - (dc.embedding <=> ${embeddingStr}::vector) as similarity
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE d."workspaceId" = ${workspaceId}
    AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> ${embeddingStr}::vector
    LIMIT ${maxChunks}
  `

  return chunks.filter(c => c.similarity >= SIMILARITY_THRESHOLD)
}

// =============================================================================
// SYNTHESIS
// =============================================================================

interface SynthesisResult {
  summary: string
  confidence: number
}

/**
 * Synthesize chunks into compressed insight
 */
async function synthesizeFindings(
  query: string,
  chunks: RetrievedChunk[],
  maxTokens: number
): Promise<SynthesisResult> {
  try {
    const provider = ProviderRegistry.getProvider('anthropic', {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-3-haiku-20240307', // Fast, cheap for synthesis
    })

    // Build context from chunks
    const chunksContext = chunks
      .map((c, i) => `[Source ${i + 1}: ${c.documentTitle}]\n${c.content}`)
      .join('\n\n---\n\n')

    const response = await provider.generate({
      messages: [
        {
          role: 'system',
          content: `You are a research assistant synthesizing information from a user's personal knowledge vault.

Your task:
1. Extract the most relevant information for the user's query
2. Synthesize findings into a coherent, concise summary
3. Maintain factual accuracy - only include what's in the sources
4. Note any conflicting information if present
5. Keep response under ${maxTokens} tokens

Format:
- Start with the key insight/answer
- Support with specific details from sources
- End with any caveats or gaps in the information

Do NOT:
- Add information not in the sources
- Make assumptions beyond what's stated
- Include pleasantries or filler text`,
        },
        {
          role: 'user',
          content: `QUERY: ${query}

SOURCES FROM USER'S VAULT:
${chunksContext}

Synthesize the relevant information to answer the query.`,
        },
      ],
      maxTokens: Math.min(maxTokens, 2000),
      temperature: 0.3, // Low for factual synthesis
    })

    // Calculate confidence based on source similarity
    const avgSimilarity = chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length
    const confidence = Math.min(0.95, avgSimilarity + 0.1) // Cap at 0.95

    return {
      summary: response,
      confidence,
    }
  } catch (error) {
    console.error('[RetrievalAgent] Synthesis failed:', error)

    // Fallback: return raw chunks concatenated
    const fallback = chunks
      .slice(0, 3)
      .map(c => `From "${c.documentTitle}":\n${c.content.slice(0, 500)}...`)
      .join('\n\n')

    return {
      summary: `[Synthesis unavailable - raw excerpts]\n\n${fallback}`,
      confidence: 0.5,
    }
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create empty result for when no content found
 */
function emptyResult(reason: string): RetrievalResult {
  return {
    summary: '',
    sourceDocuments: [],
    sourceTitles: [],
    confidence: 0,
    chunksAnalyzed: 0,
    tokensUsed: 0,
    isEmpty: true,
  }
}

/**
 * Add source metadata to summary
 */
function addSourceMetadata(summary: string, sourceTitles: string[]): string {
  if (sourceTitles.length === 0) return summary

  const sources = sourceTitles.length === 1
    ? `Source: "${sourceTitles[0]}"`
    : `Sources: ${sourceTitles.map(t => `"${t}"`).join(', ')}`

  return `${summary}\n\n---\n_${sources}_`
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4)
}

// =============================================================================
// BATCH RETRIEVAL (for Council Mode)
// =============================================================================

/**
 * Retrieve from multiple document clusters in parallel
 * Used for Council Mode where we want diverse perspectives
 */
export async function retrieveFromClusters(
  query: string,
  userId: string,
  clusterIds: string[]
): Promise<Map<string, RetrievalResult>> {
  const results = new Map<string, RetrievalResult>()

  // Get documents for each cluster
  const clusterDocs = await prisma.documentInventory.findMany({
    where: {
      userId,
      topicClusterId: { in: clusterIds },
    },
    select: {
      documentId: true,
      topicClusterId: true,
    },
  })

  // Group by cluster
  const docsByCluster = new Map<string, string[]>()
  for (const doc of clusterDocs) {
    if (doc.topicClusterId) {
      if (!docsByCluster.has(doc.topicClusterId)) {
        docsByCluster.set(doc.topicClusterId, [])
      }
      docsByCluster.get(doc.topicClusterId)!.push(doc.documentId)
    }
  }

  // Retrieve from each cluster in parallel
  const retrievals = await Promise.all(
    clusterIds.map(async (clusterId) => {
      const docIds = docsByCluster.get(clusterId) || []
      if (docIds.length === 0) {
        return [clusterId, emptyResult('No documents in cluster')] as const
      }

      const result = await retrieveAndSummarize(query, userId, {
        documentIds: docIds,
        maxChunks: 5, // Fewer per cluster
        maxResponseTokens: 800, // Shorter per cluster
      })

      return [clusterId, result] as const
    })
  )

  for (const [clusterId, result] of retrievals) {
    results.set(clusterId, result)
  }

  return results
}
