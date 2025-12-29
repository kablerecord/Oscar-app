/**
 * Vault Inventory Service (Phase 2)
 *
 * Provides lightweight awareness of vault contents without reading documents.
 * This is Layer 1 & 2 of the Depth-Aware Intelligence system.
 *
 * Key capabilities:
 * - Index documents on upload (auto-summary, topic tags, centroid)
 * - Fast inventory retrieval (titles, summaries, tags)
 * - Topic relevance scoring for escalation detection
 * - Cluster management for grouping related documents
 *
 * @see docs/builds/DEPTH_AWARE_INTELLIGENCE_BUILD.md
 */

import { prisma } from '../db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '../ai/embeddings'
import { ProviderRegistry } from '../ai/providers'

// =============================================================================
// TYPES
// =============================================================================

export interface DocumentInventoryEntry {
  id: string
  documentId: string
  userId: string
  title: string
  fileName: string
  fileType: string
  uploadedAt: Date
  autoSummary: string
  topicTags: string[]
  topicClusterId: string | null
  clusterName?: string
}

export interface RelevanceResult {
  documents: DocumentInventoryEntry[]
  relevanceScores: Map<string, number>
  shouldEscalate: boolean
  topRelevantCount: number
  suggestedPrompt?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RELEVANCE_THRESHOLD = 0.7 // Cosine similarity threshold for "relevant"
const ESCALATION_THRESHOLD = 0.75 // Higher bar for suggesting escalation
const MIN_DOCS_FOR_ESCALATION = 1
const CLUSTER_REBALANCE_THRESHOLD = 20 // Rebalance when this many docs added since last rebalance

// =============================================================================
// DOCUMENT INDEXING
// =============================================================================

/**
 * Index a document for the vault inventory.
 * Called after document chunking is complete.
 *
 * Flow:
 * 1. Get document metadata from DB
 * 2. Generate auto-summary using Haiku (cheap, fast)
 * 3. Extract topic tags from summary
 * 4. Compute document centroid (average of chunk embeddings)
 * 5. Assign to topic cluster or create new cluster
 * 6. Store in DocumentInventory
 */
export async function indexDocument(documentId: string, userId: string): Promise<DocumentInventoryEntry> {
  // Get document with chunks
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      chunks: {
        select: {
          content: true,
        },
        take: 10, // First 10 chunks for summary
      },
    },
  })

  if (!document) {
    throw new Error(`Document not found: ${documentId}`)
  }

  // Generate auto-summary using Haiku (fast and cheap)
  const contentPreview = document.chunks
    .map(c => c.content)
    .join('\n\n')
    .slice(0, 8000) // ~2000 tokens

  const { summary, tags } = await generateSummaryAndTags(contentPreview, document.title)

  // Compute document centroid (average of chunk embeddings)
  const centroid = await computeDocumentCentroid(documentId)

  // Find or create topic cluster
  const clusterId = await assignToCluster(userId, centroid, tags)

  // Check if inventory entry already exists (update vs create)
  const existing = await prisma.documentInventory.findUnique({
    where: { documentId },
  })

  const inventoryData = {
    userId,
    documentId,
    title: document.title,
    fileName: document.originalFilename || document.title,
    fileType: document.mimeType || 'unknown',
    uploadedAt: document.createdAt,
    autoSummary: summary,
    topicTags: tags,
    topicClusterId: clusterId,
  }

  let entry: DocumentInventoryEntry

  if (existing) {
    // Update existing entry
    const updated = await prisma.documentInventory.update({
      where: { documentId },
      data: {
        ...inventoryData,
        // Store centroid as raw SQL since Prisma doesn't handle vector well
      },
    })
    entry = {
      ...updated,
      clusterName: undefined,
    }
  } else {
    // Create new entry
    const created = await prisma.documentInventory.create({
      data: inventoryData,
    })
    entry = {
      ...created,
      clusterName: undefined,
    }
  }

  // Update centroid with raw SQL (Prisma doesn't handle vector type well)
  if (centroid) {
    const embeddingStr = formatEmbeddingForPostgres(centroid)
    await prisma.$executeRaw`
      UPDATE "DocumentInventory"
      SET "clusterCentroid" = ${embeddingStr}::vector
      WHERE id = ${entry.id}
    `
  }

  // Update cluster document count
  if (clusterId) {
    await prisma.topicCluster.update({
      where: { id: clusterId },
      data: {
        documentCount: { increment: 1 },
        documentsSinceRebalance: { increment: 1 },
      },
    })
  }

  console.log(`[VaultInventory] Indexed document: ${document.title} (${tags.join(', ')})`)

  return entry
}

/**
 * Generate auto-summary and topic tags using Haiku
 */
async function generateSummaryAndTags(
  content: string,
  title: string
): Promise<{ summary: string; tags: string[] }> {
  try {
    const provider = ProviderRegistry.getProvider('anthropic', {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-3-haiku-20240307',
    })

    const response = await provider.generate({
      messages: [
        {
          role: 'system',
          content: `You are a document analyzer. Given document content, provide:
1. A 2-3 sentence summary that captures the key topics and purpose
2. 3-7 topic tags (single words or short phrases) that describe the content

Respond in JSON format:
{
  "summary": "...",
  "tags": ["tag1", "tag2", ...]
}`,
        },
        {
          role: 'user',
          content: `Document Title: ${title}\n\nContent:\n${content}`,
        },
      ],
      maxTokens: 500,
      temperature: 0.3,
    })

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || `Document: ${title}`,
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 7) : [],
      }
    }
  } catch (error) {
    console.error('[VaultInventory] Summary generation failed:', error)
  }

  // Fallback: basic summary
  return {
    summary: `Document: ${title}. Content preview: ${content.slice(0, 200)}...`,
    tags: extractBasicTags(content),
  }
}

/**
 * Extract basic tags from content (fallback)
 */
function extractBasicTags(content: string): string[] {
  // Extract potential topic words (capitalized words, repeated terms)
  const words = content.toLowerCase().split(/\s+/)
  const wordCounts = new Map<string, number>()

  for (const word of words) {
    if (word.length > 4 && !STOP_WORDS.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    }
  }

  // Sort by frequency and take top 5
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

const STOP_WORDS = new Set([
  'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but',
  'his', 'from', 'they', 'were', 'been', 'have', 'their', 'would', 'there',
  'about', 'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'than',
])

/**
 * Compute document centroid (average of chunk embeddings)
 */
async function computeDocumentCentroid(documentId: string): Promise<number[] | null> {
  // Get chunk embeddings using raw SQL
  const chunks = await prisma.$queryRaw<{ embedding: number[] }[]>`
    SELECT embedding::text::float[]  as embedding
    FROM "DocumentChunk"
    WHERE "documentId" = ${documentId}
    AND embedding IS NOT NULL
    LIMIT 20
  `

  if (chunks.length === 0) {
    return null
  }

  // Compute average embedding
  const dimension = 1536 // OpenAI embedding dimension
  const centroid = new Array(dimension).fill(0)

  for (const chunk of chunks) {
    if (chunk.embedding && chunk.embedding.length === dimension) {
      for (let i = 0; i < dimension; i++) {
        centroid[i] += chunk.embedding[i]
      }
    }
  }

  // Normalize
  for (let i = 0; i < dimension; i++) {
    centroid[i] /= chunks.length
  }

  return centroid
}

/**
 * Assign document to a topic cluster
 */
async function assignToCluster(
  userId: string,
  centroid: number[] | null,
  tags: string[]
): Promise<string | null> {
  if (!centroid) {
    return null
  }

  const embeddingStr = formatEmbeddingForPostgres(centroid)

  // Find closest existing cluster
  const closestCluster = await prisma.$queryRaw<{ id: string; name: string; similarity: number }[]>`
    SELECT
      id,
      name,
      1 - (centroid <=> ${embeddingStr}::vector) as similarity
    FROM "TopicCluster"
    WHERE "userId" = ${userId}
    AND centroid IS NOT NULL
    ORDER BY centroid <=> ${embeddingStr}::vector
    LIMIT 1
  `

  // If cluster is close enough (> 0.8 similarity), join it
  if (closestCluster.length > 0 && closestCluster[0].similarity > 0.8) {
    return closestCluster[0].id
  }

  // Create new cluster
  const clusterName = tags.slice(0, 3).join(', ') || 'General'
  const newCluster = await prisma.topicCluster.create({
    data: {
      userId,
      name: clusterName,
      documentCount: 0,
      documentsSinceRebalance: 0,
    },
  })

  // Set centroid
  await prisma.$executeRaw`
    UPDATE "TopicCluster"
    SET centroid = ${embeddingStr}::vector
    WHERE id = ${newCluster.id}
  `

  return newCluster.id
}

// =============================================================================
// INVENTORY RETRIEVAL
// =============================================================================

/**
 * Get user's vault inventory (fast path - Layer 1)
 */
export async function getUserInventory(userId: string): Promise<DocumentInventoryEntry[]> {
  const entries = await prisma.documentInventory.findMany({
    where: { userId },
    include: {
      cluster: {
        select: { name: true },
      },
    },
    orderBy: { uploadedAt: 'desc' },
  })

  return entries.map(e => ({
    id: e.id,
    documentId: e.documentId,
    userId: e.userId,
    title: e.title,
    fileName: e.fileName,
    fileType: e.fileType,
    uploadedAt: e.uploadedAt,
    autoSummary: e.autoSummary,
    topicTags: e.topicTags,
    topicClusterId: e.topicClusterId,
    clusterName: e.cluster?.name,
  }))
}

/**
 * Find documents relevant to a query (Layer 2)
 */
export async function findRelevantDocuments(
  userId: string,
  query: string,
  threshold: number = RELEVANCE_THRESHOLD
): Promise<RelevanceResult> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)
  const embeddingStr = formatEmbeddingForPostgres(queryEmbedding)

  // Find similar documents by centroid
  const results = await prisma.$queryRaw<{
    id: string
    documentId: string
    title: string
    fileName: string
    fileType: string
    uploadedAt: Date
    autoSummary: string
    topicTags: string[]
    topicClusterId: string | null
    similarity: number
  }[]>`
    SELECT
      id,
      "documentId",
      title,
      "fileName",
      "fileType",
      "uploadedAt",
      "autoSummary",
      "topicTags",
      "topicClusterId",
      1 - ("clusterCentroid" <=> ${embeddingStr}::vector) as similarity
    FROM "DocumentInventory"
    WHERE "userId" = ${userId}
    AND "clusterCentroid" IS NOT NULL
    ORDER BY "clusterCentroid" <=> ${embeddingStr}::vector
    LIMIT 10
  `

  // Build relevance map
  const relevanceScores = new Map<string, number>()
  const relevantDocs: DocumentInventoryEntry[] = []

  for (const result of results) {
    relevanceScores.set(result.documentId, result.similarity)

    if (result.similarity >= threshold) {
      relevantDocs.push({
        id: result.id,
        documentId: result.documentId,
        userId,
        title: result.title,
        fileName: result.fileName,
        fileType: result.fileType,
        uploadedAt: result.uploadedAt,
        autoSummary: result.autoSummary,
        topicTags: result.topicTags,
        topicClusterId: result.topicClusterId,
      })
    }
  }

  // Determine if we should suggest escalation
  const highRelevanceCount = results.filter(r => r.similarity >= ESCALATION_THRESHOLD).length
  const shouldEscalate = highRelevanceCount >= MIN_DOCS_FOR_ESCALATION

  // Build suggested prompt if escalating
  let suggestedPrompt: string | undefined
  if (shouldEscalate && relevantDocs.length > 0) {
    const topDoc = relevantDocs[0]
    const docCount = relevantDocs.length
    suggestedPrompt = docCount === 1
      ? `I noticed you have a document "${topDoc.title}" that might be relevant. Would you like me to review it for a more personalized answer?`
      : `I noticed you have ${docCount} documents related to this topic, including "${topDoc.title}". Would you like me to review them for a more personalized answer?`
  }

  return {
    documents: relevantDocs,
    relevanceScores,
    shouldEscalate,
    topRelevantCount: highRelevanceCount,
    suggestedPrompt,
  }
}

// =============================================================================
// CLUSTER MANAGEMENT
// =============================================================================

/**
 * Rebuild topic clusters for a user
 * Called monthly or when vault grows by 20+ documents
 */
export async function rebuildClusters(userId: string): Promise<void> {
  console.log(`[VaultInventory] Rebuilding clusters for user: ${userId}`)

  // Get all document centroids
  const documents = await prisma.$queryRaw<{
    id: string
    documentId: string
    title: string
    topicTags: string[]
    centroid: number[]
  }[]>`
    SELECT
      id,
      "documentId",
      title,
      "topicTags",
      "clusterCentroid"::text::float[] as centroid
    FROM "DocumentInventory"
    WHERE "userId" = ${userId}
    AND "clusterCentroid" IS NOT NULL
  `

  if (documents.length < 3) {
    // Not enough documents for meaningful clustering
    return
  }

  // Simple k-means-like clustering
  // For now, use a basic approach: group by tag similarity

  // Delete old clusters
  await prisma.topicCluster.deleteMany({
    where: { userId },
  })

  // Group by primary tag
  const tagGroups = new Map<string, typeof documents>()
  for (const doc of documents) {
    const primaryTag = doc.topicTags[0] || 'general'
    if (!tagGroups.has(primaryTag)) {
      tagGroups.set(primaryTag, [])
    }
    tagGroups.get(primaryTag)!.push(doc)
  }

  // Create clusters for each tag group
  for (const [tag, docs] of tagGroups) {
    if (docs.length === 0) continue

    // Compute cluster centroid (average of documents)
    const dimension = 1536
    const centroid = new Array(dimension).fill(0)

    for (const doc of docs) {
      if (doc.centroid) {
        for (let i = 0; i < dimension; i++) {
          centroid[i] += doc.centroid[i]
        }
      }
    }
    for (let i = 0; i < dimension; i++) {
      centroid[i] /= docs.length
    }

    // Create cluster
    const cluster = await prisma.topicCluster.create({
      data: {
        userId,
        name: tag,
        documentCount: docs.length,
        lastRebalancedAt: new Date(),
        documentsSinceRebalance: 0,
      },
    })

    // Set centroid
    const embeddingStr = formatEmbeddingForPostgres(centroid)
    await prisma.$executeRaw`
      UPDATE "TopicCluster"
      SET centroid = ${embeddingStr}::vector
      WHERE id = ${cluster.id}
    `

    // Update document cluster assignments
    const docIds = docs.map(d => d.id)
    await prisma.documentInventory.updateMany({
      where: { id: { in: docIds } },
      data: { topicClusterId: cluster.id },
    })
  }

  console.log(`[VaultInventory] Created ${tagGroups.size} clusters for user: ${userId}`)
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Delete document from inventory (called when document is deleted)
 */
export async function deleteDocumentInventory(documentId: string): Promise<void> {
  const inventory = await prisma.documentInventory.findUnique({
    where: { documentId },
  })

  if (!inventory) return

  // Decrement cluster document count
  if (inventory.topicClusterId) {
    await prisma.topicCluster.update({
      where: { id: inventory.topicClusterId },
      data: { documentCount: { decrement: 1 } },
    })
  }

  // Delete inventory entry
  await prisma.documentInventory.delete({
    where: { documentId },
  })

  console.log(`[VaultInventory] Deleted inventory for document: ${documentId}`)
}
