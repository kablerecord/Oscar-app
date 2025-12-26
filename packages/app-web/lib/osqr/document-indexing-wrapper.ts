/**
 * Document Indexing Wrapper
 *
 * Connects @osqr/core's Document Indexing Subsystem to app-web's adapters.
 * This file initializes adapters and provides a thin wrapper around the core pipeline.
 */

import { featureFlags } from './config'
import { initializeAdapters, isInitialized } from '@/lib/adapters'

// Import types from @osqr/core
import type {
  DocumentType,
  InterfaceType,
  IndexedDocument,
  RawDocument,
  RetrievalResult,
} from '@osqr/core/src/document-indexing/types'

// Import pipeline functions from @osqr/core
import {
  indexDocument as coreIndexDocument,
  queryDocuments,
  getProgress,
} from '@osqr/core/src/document-indexing/pipeline'

import {
  detectDocumentType as coreDetectDocumentType,
  isSupported as coreIsSupported,
} from '@osqr/core/src/document-indexing/detection'

import {
  getStorageAdapter,
  hasStorageAdapter,
} from '@osqr/core/src/document-indexing/adapters'

// Re-export types for convenience
export type { DocumentType, InterfaceType }

export interface IndexingResult {
  success: boolean
  documentId: string
  chunks: number
  relationships: number
  processingTimeMs: number
  error?: string
}

export interface SearchResult {
  documentId: string
  documentName: string
  chunkContent: string
  relevanceScore: number
  projectId: string | null
  createdAt: Date
}

/**
 * Ensure adapters are initialized before any operation
 */
function ensureAdapters(): void {
  if (!isInitialized()) {
    initializeAdapters()
  }
}

/**
 * Index a document through the @osqr/core DIS pipeline
 */
export async function indexDocument(
  userId: string,
  document: {
    name: string
    content: string
    type: DocumentType
    projectId?: string
    conversationId?: string
    metadata?: Record<string, unknown>
  },
  options?: { interface?: InterfaceType }
): Promise<IndexingResult> {
  if (!featureFlags.enableDocumentIndexing) {
    return {
      success: false,
      documentId: '',
      chunks: 0,
      relationships: 0,
      processingTimeMs: 0,
      error: 'Document indexing disabled via feature flag',
    }
  }

  const startTime = Date.now()

  try {
    // Ensure adapters are initialized
    ensureAdapters()

    // Build RawDocument for the pipeline
    const rawDocument: RawDocument = {
      path: document.name,
      filename: document.name,
      filetype: document.type,
      content: document.content,
      size: document.content.length,
      mtime: new Date(),
      ctime: new Date(),
    }

    // Run through the @osqr/core pipeline
    const indexed = await coreIndexDocument(rawDocument, userId, {
      interface: options?.interface || 'web',
      projectId: document.projectId,
      conversationId: document.conversationId,
    })

    return {
      success: true,
      documentId: indexed.id,
      chunks: indexed.chunks.length,
      relationships: indexed.relatedDocuments.length + indexed.relatedConversations.length,
      processingTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    console.error('[Document Indexing] Pipeline error:', error)
    return {
      success: false,
      documentId: '',
      chunks: 0,
      relationships: 0,
      processingTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Search documents by semantic similarity
 */
export async function searchByConcept(
  userId: string,
  query: string,
  options?: { filter?: Record<string, unknown>; limit?: number }
): Promise<SearchResult[]> {
  if (!featureFlags.enableDocumentIndexing) return []

  try {
    ensureAdapters()

    const results = (await queryDocuments({
      query,
      userId,
      type: 'concept',
      options: {
        filter: options?.filter,
        limit: options?.limit || 10,
      },
    })) as RetrievalResult[]

    return results.map((r: RetrievalResult) => ({
      documentId: r.document.id,
      documentName: r.document.filename,
      chunkContent: r.relevantChunks[0]?.content || '',
      relevanceScore: r.score,
      projectId: r.document.sourceProjectId,
      createdAt: r.document.createdAt,
    }))
  } catch (error) {
    console.error('[Document Indexing] Search error:', error)
    return []
  }
}

/**
 * Search documents by filename/title pattern
 */
export async function searchByName(
  userId: string,
  documentName: string
): Promise<SearchResult[]> {
  if (!featureFlags.enableDocumentIndexing) return []

  try {
    ensureAdapters()

    const results = (await queryDocuments({
      query: documentName,
      userId,
      type: 'name',
    })) as RetrievalResult[]

    return results.map((r: RetrievalResult) => ({
      documentId: r.document.id,
      documentName: r.document.filename,
      chunkContent: r.relevantChunks[0]?.content || '',
      relevanceScore: r.score,
      projectId: r.document.sourceProjectId,
      createdAt: r.document.createdAt,
    }))
  } catch (error) {
    console.error('[Document Indexing] Name search error:', error)
    return []
  }
}

/**
 * Search documents by time range
 */
export async function searchByTime(
  userId: string,
  options: { start: Date; end: Date }
): Promise<Array<{ documentId: string; documentName: string; modifiedAt: Date }>> {
  if (!featureFlags.enableDocumentIndexing) return []

  try {
    ensureAdapters()

    const results = (await queryDocuments({
      query: '',
      userId,
      type: 'time',
      options: { timeRange: options },
    })) as RetrievalResult[]

    return results.map((r: RetrievalResult) => ({
      documentId: r.document.id,
      documentName: r.document.filename,
      modifiedAt: r.document.modifiedAt,
    }))
  } catch (error) {
    console.error('[Document Indexing] Time search error:', error)
    return []
  }
}

/**
 * Search across multiple projects
 */
export async function searchAcrossProjects(
  userId: string,
  query: string,
  projectIds: string[]
): Promise<Array<{ projectId: string; results: SearchResult[] }>> {
  if (!featureFlags.enableDocumentIndexing) return []

  try {
    ensureAdapters()

    const results = (await queryDocuments({
      query,
      userId,
      type: 'cross-project',
      options: { projects: projectIds },
    })) as RetrievalResult[]

    // Group results by project
    const byProject = new Map<string, SearchResult[]>()
    for (const r of results) {
      const projectId = r.document.sourceProjectId || 'unknown'
      if (!byProject.has(projectId)) {
        byProject.set(projectId, [])
      }
      byProject.get(projectId)!.push({
        documentId: r.document.id,
        documentName: r.document.filename,
        chunkContent: r.relevantChunks[0]?.content || '',
        relevanceScore: r.score,
        projectId: r.document.sourceProjectId,
        createdAt: r.document.createdAt,
      })
    }

    return Array.from(byProject.entries()).map(([projectId, results]) => ({
      projectId,
      results,
    }))
  } catch (error) {
    console.error('[Document Indexing] Cross-project search error:', error)
    return []
  }
}

/**
 * Get indexing statistics
 */
export async function getIndexingStats(userId: string): Promise<{
  documentCount: number
  chunkCount: number
  totalTokens: number
  lastIndexed: Date | null
}> {
  if (!featureFlags.enableDocumentIndexing || !hasStorageAdapter()) {
    return { documentCount: 0, chunkCount: 0, totalTokens: 0, lastIndexed: null }
  }

  try {
    ensureAdapters()
    const stats = await getStorageAdapter().getStats(userId)
    return {
      documentCount: stats.documentCount,
      chunkCount: stats.chunkCount,
      totalTokens: stats.totalTokens,
      lastIndexed: stats.lastIndexedAt,
    }
  } catch (error) {
    console.error('[Document Indexing] Stats error:', error)
    return { documentCount: 0, chunkCount: 0, totalTokens: 0, lastIndexed: null }
  }
}

/**
 * Remove a document from the index
 */
export async function removeDocument(documentId: string): Promise<boolean> {
  if (!featureFlags.enableDocumentIndexing || !hasStorageAdapter()) {
    return false
  }

  try {
    ensureAdapters()
    await getStorageAdapter().deleteDocument(documentId)
    return true
  } catch (error) {
    console.error('[Document Indexing] Delete error:', error)
    return false
  }
}

/**
 * Re-index a document (for updates)
 */
export async function reindexDocument(
  userId: string,
  documentId: string,
  document: {
    name: string
    content: string
    type: DocumentType
    projectId?: string
    conversationId?: string
  },
  options?: { interface?: InterfaceType }
): Promise<IndexingResult> {
  if (!featureFlags.enableDocumentIndexing) {
    return {
      success: false,
      documentId,
      chunks: 0,
      relationships: 0,
      processingTimeMs: 0,
      error: 'Document indexing disabled via feature flag',
    }
  }

  const startTime = Date.now()

  try {
    ensureAdapters()

    // Delete old version
    await removeDocument(documentId)

    // Re-index with new content
    return await indexDocument(userId, document, options)
  } catch (error) {
    console.error('[Document Indexing] Re-index error:', error)
    return {
      success: false,
      documentId,
      chunks: 0,
      relationships: 0,
      processingTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Detect document type from filename
 */
export function detectDocumentType(filename: string): DocumentType | null {
  return coreDetectDocumentType(filename) || null
}

/**
 * Check if a filename is supported for indexing
 */
export function isSupported(filename: string): boolean {
  return coreIsSupported(filename)
}

/**
 * Get indexing progress for a document
 */
export function getDocumentProgress(documentId: string) {
  return getProgress(documentId)
}
