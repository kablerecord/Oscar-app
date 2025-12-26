/**
 * Prisma Storage Adapter
 *
 * Implements the StorageAdapter interface from @osqr/core using
 * Prisma with pgvector for vector storage and similarity search.
 */

import type {
  StorageAdapter,
  StorageSearchOptions,
  StorageSearchResult,
} from '@osqr/core/src/document-indexing/adapters/types'
import type {
  IndexedDocument,
  DocumentChunk,
  RelationshipMap,
  RetrievalResult,
} from '@osqr/core/src/document-indexing/types'
import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import { formatEmbeddingForPostgres } from '@/lib/ai/embeddings'

/**
 * Helper to convert @osqr/core's IndexedDocument to Prisma Document shape
 */
function toDocumentCreateData(doc: IndexedDocument): Prisma.DocumentUncheckedCreateInput {
  return {
    id: doc.id,
    workspaceId: doc.userId, // Map userId → workspaceId
    projectId: doc.sourceProjectId ?? undefined,
    title: doc.filename,
    sourceType: doc.sourceInterface,
    originalFilename: doc.filename,
    textContent: doc.content,
    metadata: {
      topics: doc.topics,
      entities: doc.entities as unknown as Prisma.JsonArray,
      summary: doc.summary,
      sourceConversationId: doc.sourceConversationId,
      sourcePath: doc.sourcePath,
      utilityScore: doc.utilityScore,
      retrievalCount: doc.retrievalCount,
    } as Prisma.InputJsonValue,
  }
}

/**
 * Helper to convert Prisma Document back to @osqr/core's IndexedDocument
 */
function toIndexedDocument(
  doc: {
    id: string
    workspaceId: string
    projectId: string | null
    title: string
    sourceType: string
    originalFilename: string | null
    textContent: string
    metadata: unknown
    createdAt: Date
    updatedAt: Date
    chunks?: Array<{
      id: string
      content: string
      chunkIndex: number
    }>
  }
): IndexedDocument {
  const metadata = (doc.metadata || {}) as Record<string, unknown>

  return {
    id: doc.id,
    userId: doc.workspaceId, // Map workspaceId → userId
    filename: doc.title,
    filetype: 'plaintext', // Would need to store this
    content: doc.textContent,
    chunks: (doc.chunks || []).map((chunk) => ({
      id: chunk.id,
      documentId: doc.id,
      content: chunk.content,
      embedding: [], // Embeddings not loaded by default
      position: {
        startLine: 0,
        endLine: 0,
        section: null,
        order: chunk.chunkIndex,
      },
      metadata: {
        headingContext: [],
        codeLanguage: null,
        isDecision: false,
        isQuestion: false,
        isAction: false,
        tokenCount: Math.ceil(chunk.content.length / 4),
      },
    })),
    sourceInterface: doc.sourceType as IndexedDocument['sourceInterface'],
    sourceConversationId: (metadata.sourceConversationId as string) || null,
    sourceProjectId: doc.projectId,
    sourcePath: (metadata.sourcePath as string) || null,
    relatedDocuments: [],
    relatedConversations: [],
    parentDocument: null,
    createdAt: doc.createdAt,
    modifiedAt: doc.updatedAt,
    lastAccessedAt: doc.updatedAt,
    versionHistory: [],
    topics: (metadata.topics as string[]) || [],
    entities: (metadata.entities as IndexedDocument['entities']) || [],
    summary: (metadata.summary as string) || '',
    retrievalCount: (metadata.retrievalCount as number) || 0,
    utilityScore: (metadata.utilityScore as number) || 0.5,
  }
}

/**
 * Prisma + pgvector storage adapter
 */
export const prismaStorageAdapter: StorageAdapter = {
  // ========== Document Operations ==========

  async storeDocument(document: IndexedDocument): Promise<string> {
    const data = toDocumentCreateData(document)

    const record = await prisma.document.create({
      data,
    })

    return record.id
  },

  async storeChunks(documentId: string, chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      const embeddingStr = formatEmbeddingForPostgres(chunk.embedding)

      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, "documentId", content, "chunkIndex", embedding, "createdAt")
        VALUES (
          ${chunk.id},
          ${documentId},
          ${chunk.content},
          ${chunk.position.order},
          ${embeddingStr}::vector,
          NOW()
        )
      `
    }
  },

  async storeRelationships(
    documentId: string,
    relationships: RelationshipMap
  ): Promise<void> {
    // Store document-to-document relationships
    // For now, store in document metadata since we don't have a separate table
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { metadata: true },
    })

    const existingMetadata = (doc?.metadata || {}) as Record<string, unknown>

    // Build the updated metadata as a plain object for Prisma JSON field
    const updatedMetadata: Record<string, unknown> = {
      ...existingMetadata,
      relationships: {
        documents: relationships.documents.map((d) => ({
          documentId: d.documentId,
          similarity: d.similarity,
          sharedTopics: d.sharedTopics,
        })),
        conversations: relationships.conversations.map((c) => ({
          conversationId: c.conversationId,
          relevance: c.relevance,
        })),
        entities: relationships.entities,
        explicitLinks: relationships.explicitLinks,
      },
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        metadata: updatedMetadata as Prisma.InputJsonValue,
      },
    })
  },

  async getDocument(documentId: string): Promise<IndexedDocument | null> {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            chunkIndex: true,
          },
        },
      },
    })

    if (!doc) return null

    return toIndexedDocument(doc)
  },

  async getUserDocuments(
    userId: string,
    options?: { limit?: number; offset?: number; projectId?: string }
  ): Promise<IndexedDocument[]> {
    const docs = await prisma.document.findMany({
      where: {
        workspaceId: userId, // userId maps to workspaceId
        ...(options?.projectId ? { projectId: options.projectId } : {}),
      },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            chunkIndex: true,
          },
        },
      },
      take: options?.limit || 100,
      skip: options?.offset || 0,
      orderBy: { updatedAt: 'desc' },
    })

    return docs.map(toIndexedDocument)
  },

  async deleteDocument(documentId: string): Promise<void> {
    // Prisma will cascade delete chunks due to onDelete: Cascade
    await prisma.document.delete({
      where: { id: documentId },
    })
  },

  async updateDocument(
    documentId: string,
    updates: Partial<
      Pick<
        IndexedDocument,
        'utilityScore' | 'retrievalCount' | 'lastAccessedAt' | 'topics' | 'summary'
      >
    >
  ): Promise<void> {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { metadata: true },
    })

    const existingMetadata = (doc?.metadata || {}) as Record<string, unknown>

    await prisma.document.update({
      where: { id: documentId },
      data: {
        updatedAt: updates.lastAccessedAt || new Date(),
        metadata: {
          ...existingMetadata,
          ...(updates.utilityScore !== undefined
            ? { utilityScore: updates.utilityScore }
            : {}),
          ...(updates.retrievalCount !== undefined
            ? { retrievalCount: updates.retrievalCount }
            : {}),
          ...(updates.topics ? { topics: updates.topics } : {}),
          ...(updates.summary ? { summary: updates.summary } : {}),
        },
      },
    })
  },

  // ========== Search Operations ==========

  async searchByEmbedding(
    embedding: number[],
    options: StorageSearchOptions
  ): Promise<StorageSearchResult[]> {
    const embeddingStr = formatEmbeddingForPostgres(embedding)
    const limit = options.limit || 10
    const threshold = options.similarityThreshold || 0.5

    // Build the query with optional filters
    const results = await prisma.$queryRaw<
      Array<{
        id: string
        documentId: string
        content: string
        documentTitle: string
        similarity: number
        isDecision: boolean | null
        isQuestion: boolean | null
        isAction: boolean | null
      }>
    >`
      SELECT
        dc.id,
        dc."documentId",
        dc.content,
        d.title as "documentTitle",
        1 - (dc.embedding <=> ${embeddingStr}::vector) as similarity,
        NULL as "isDecision",
        NULL as "isQuestion",
        NULL as "isAction"
      FROM "DocumentChunk" dc
      JOIN "Document" d ON d.id = dc."documentId"
      WHERE d."workspaceId" = ${options.userId}
        AND dc.embedding IS NOT NULL
        ${options.projectId ? prisma.$queryRaw`AND d."projectId" = ${options.projectId}` : prisma.$queryRaw``}
      ORDER BY dc.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `

    return results
      .filter((r) => r.similarity >= threshold)
      .map((r) => ({
        id: r.id,
        documentId: r.documentId,
        content: r.content,
        similarity: r.similarity,
        documentTitle: r.documentTitle,
        metadata: {
          isDecision: r.isDecision || false,
          isQuestion: r.isQuestion || false,
          isAction: r.isAction || false,
        },
      }))
  },

  async searchByName(
    pattern: string,
    userId: string,
    limit = 10
  ): Promise<RetrievalResult[]> {
    const docs = await prisma.document.findMany({
      where: {
        workspaceId: userId,
        OR: [
          { title: { contains: pattern, mode: 'insensitive' } },
          { originalFilename: { contains: pattern, mode: 'insensitive' } },
        ],
      },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            chunkIndex: true,
          },
          take: 3, // Top 3 chunks
        },
      },
      take: limit,
    })

    return docs.map((doc) => ({
      document: toIndexedDocument(doc),
      relevantChunks: doc.chunks.map((chunk) => ({
        id: chunk.id,
        documentId: doc.id,
        content: chunk.content,
        embedding: [],
        position: {
          startLine: 0,
          endLine: 0,
          section: null,
          order: chunk.chunkIndex,
        },
        metadata: {
          headingContext: [],
          codeLanguage: null,
          isDecision: false,
          isQuestion: false,
          isAction: false,
          tokenCount: Math.ceil(chunk.content.length / 4),
        },
      })),
      score: 1.0, // Exact name match
    }))
  },

  async searchByTimeRange(
    timeRange: { start: Date; end: Date },
    userId: string
  ): Promise<IndexedDocument[]> {
    const docs = await prisma.document.findMany({
      where: {
        workspaceId: userId,
        OR: [
          {
            createdAt: {
              gte: timeRange.start,
              lte: timeRange.end,
            },
          },
          {
            updatedAt: {
              gte: timeRange.start,
              lte: timeRange.end,
            },
          },
        ],
      },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            chunkIndex: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return docs.map(toIndexedDocument)
  },

  async getRelatedDocuments(
    documentId: string,
    limit = 5
  ): Promise<Array<{ document: IndexedDocument; similarity: number }>> {
    // Get the document's metadata to find stored relationships
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { metadata: true, workspaceId: true },
    })

    if (!doc) return []

    const metadata = (doc.metadata || {}) as Record<string, unknown>
    const relationships = metadata.relationships as
      | { documents?: Array<{ documentId: string; similarity: number }> }
      | undefined

    if (!relationships?.documents?.length) return []

    // Fetch the related documents
    const relatedIds = relationships.documents.slice(0, limit).map((r) => r.documentId)
    const relatedDocs = await prisma.document.findMany({
      where: {
        id: { in: relatedIds },
      },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            chunkIndex: true,
          },
        },
      },
    })

    // Map back with similarity scores
    return relatedDocs.map((relDoc) => {
      const rel = relationships.documents!.find((r) => r.documentId === relDoc.id)
      return {
        document: toIndexedDocument(relDoc),
        similarity: rel?.similarity || 0,
      }
    })
  },

  // ========== Statistics ==========

  async getStats(userId: string): Promise<{
    documentCount: number
    chunkCount: number
    totalTokens: number
    lastIndexedAt: Date | null
  }> {
    const [documentCount, chunkCount, lastDoc] = await Promise.all([
      prisma.document.count({
        where: { workspaceId: userId },
      }),
      prisma.documentChunk.count({
        where: {
          document: { workspaceId: userId },
        },
      }),
      prisma.document.findFirst({
        where: { workspaceId: userId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ])

    // Estimate tokens from chunk count (avg ~125 tokens per chunk at 500 chars)
    const totalTokens = chunkCount * 125

    return {
      documentCount,
      chunkCount,
      totalTokens,
      lastIndexedAt: lastDoc?.updatedAt || null,
    }
  },
}
