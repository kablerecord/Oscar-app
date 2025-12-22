/**
 * Document Indexing Wrapper for oscar-app
 *
 * Wraps the @osqr/core Document Indexing Subsystem for use in oscar-app.
 * Routes uploaded documents through the unified indexing pipeline and stores
 * them in the user's PKV (Personal Knowledge Vault).
 *
 * Core Principle: The user decides how to organize their work.
 * Oscar decides nothing. He simply knows everything.
 */

import { DocumentIndexing } from '@osqr/core';
import { featureFlags } from './config';

// Type definitions (matching @osqr/core DocumentIndexing types)
export type DocumentType =
  | 'markdown'
  | 'plaintext'
  | 'code'
  | 'json'
  | 'yaml'
  | 'html'
  | 'pdf'
  | 'docx';

export type InterfaceType = 'web' | 'vscode' | 'mobile' | 'voice' | 'api';

export interface IndexingResult {
  success: boolean;
  documentId: string;
  chunks: number;
  relationships: number;
  processingTimeMs: number;
  error?: string;
}

export interface SearchResult {
  documentId: string;
  documentName: string;
  chunkContent: string;
  relevanceScore: number;
  projectId: string | null;
  createdAt: Date;
}

/**
 * Index a document through the OSQR Document Indexing pipeline.
 * This is the main entry point for document indexing.
 */
export async function indexDocument(
  userId: string,
  document: {
    name: string;
    content: string;
    type: DocumentType;
    projectId?: string;
    conversationId?: string;
    metadata?: Record<string, unknown>;
  },
  options?: {
    interface?: InterfaceType;
  }
): Promise<IndexingResult> {
  if (!featureFlags.enableDocumentIndexing) {
    return {
      success: false,
      documentId: '',
      chunks: 0,
      relationships: 0,
      processingTimeMs: 0,
      error: 'Document indexing is disabled',
    };
  }

  const startTime = Date.now();

  try {
    // Create raw document for the pipeline
    const now = new Date();
    const contentSize = new TextEncoder().encode(document.content).length;

    const rawDocument = {
      path: document.name, // Use filename as path for web uploads
      filename: document.name,
      filetype: document.type,
      content: document.content,
      size: contentSize,
      mtime: now,
      ctime: now,
    };

    // Run through the indexing pipeline
    const indexed = await DocumentIndexing.indexDocument(rawDocument, userId, {
      interface: options?.interface || 'web',
      projectId: document.projectId,
      conversationId: document.conversationId,
    });

    return {
      success: true,
      documentId: indexed.id,
      chunks: indexed.chunks.length,
      relationships: indexed.relatedDocuments.length,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[DocumentIndexing] Index error:', error);
    return {
      success: false,
      documentId: '',
      chunks: 0,
      relationships: 0,
      processingTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search documents by semantic concept.
 * Returns relevant chunks across all user documents.
 *
 * Note: The underlying API uses (query, userId, options) order.
 * We maintain (userId, query, options) for consistency with other wrapper functions.
 */
export async function searchByConcept(
  userId: string,
  query: string,
  options?: {
    filter?: Record<string, unknown>;
    limit?: number;
  }
): Promise<SearchResult[]> {
  if (!featureFlags.enableDocumentIndexing) {
    return [];
  }

  try {
    // Note: osqr-core API is (query, userId, options)
    const results = await DocumentIndexing.retrieveByConcept(query, userId, {
      filter: options?.filter,
      limit: options?.limit || 10,
    });

    // Results are RetrievalResult[] with { document, relevantChunks, score }
    return results.map((r) => ({
      documentId: r.document.id,
      documentName: r.document.filename,
      chunkContent: r.relevantChunks[0]?.content || '',
      relevanceScore: r.score,
      projectId: r.document.sourceProjectId || null,
      createdAt: r.document.createdAt,
    }));
  } catch (error) {
    console.error('[DocumentIndexing] Search error:', error);
    return [];
  }
}

/**
 * Search documents by name.
 * Note: osqr-core API is (query, userId) order.
 */
export async function searchByName(
  userId: string,
  documentName: string
): Promise<SearchResult[]> {
  if (!featureFlags.enableDocumentIndexing) {
    return [];
  }

  try {
    // Note: osqr-core API is (query, userId)
    const results = await DocumentIndexing.retrieveByDocumentName(documentName, userId);
    return results.map((r) => ({
      documentId: r.document.id,
      documentName: r.document.filename,
      chunkContent: r.relevantChunks[0]?.content || '',
      relevanceScore: r.score,
      projectId: r.document.sourceProjectId || null,
      createdAt: r.document.createdAt,
    }));
  } catch (error) {
    console.error('[DocumentIndexing] Name search error:', error);
    return [];
  }
}

/**
 * Search documents by time range.
 * Note: osqr-core API is (timeRange, userId) order.
 */
export async function searchByTime(
  userId: string,
  options: {
    start: Date;
    end: Date;
  }
): Promise<{ documentId: string; documentName: string; modifiedAt: Date }[]> {
  if (!featureFlags.enableDocumentIndexing) {
    return [];
  }

  try {
    // Note: osqr-core API is (timeRange, userId)
    const result = await DocumentIndexing.retrieveByTime(
      { start: options.start, end: options.end },
      userId
    );
    return result.documents.map((doc) => ({
      documentId: doc.id,
      documentName: doc.filename,
      modifiedAt: doc.modifiedAt,
    }));
  } catch (error) {
    console.error('[DocumentIndexing] Time search error:', error);
    return [];
  }
}

/**
 * Search across multiple projects.
 * Note: osqr-core API is (projects, topic, userId) order.
 */
export async function searchAcrossProjects(
  userId: string,
  query: string,
  projectIds: string[]
): Promise<{ projectId: string; results: SearchResult[] }[]> {
  if (!featureFlags.enableDocumentIndexing) {
    return [];
  }

  try {
    // Note: osqr-core API is (projects, topic, userId)
    const comparison = await DocumentIndexing.retrieveAcrossProjects(projectIds, query, userId);

    // comparison.byProject is Map<string, RetrievalResult[]>
    const results: { projectId: string; results: SearchResult[] }[] = [];
    for (const [projectId, projectResults] of comparison.byProject.entries()) {
      results.push({
        projectId,
        results: projectResults.map((r) => ({
          documentId: r.document.id,
          documentName: r.document.filename,
          chunkContent: r.relevantChunks[0]?.content || '',
          relevanceScore: r.score,
          projectId: r.document.sourceProjectId || null,
          createdAt: r.document.createdAt,
        })),
      });
    }
    return results;
  } catch (error) {
    console.error('[DocumentIndexing] Cross-project search error:', error);
    return [];
  }
}

/**
 * Get document indexing statistics.
 * Note: getStats is async in osqr-core.
 */
export async function getIndexingStats(userId: string): Promise<{
  documentCount: number;
  chunkCount: number;
  totalTokens: number;
  lastIndexed: Date | null;
}> {
  if (!featureFlags.enableDocumentIndexing) {
    return { documentCount: 0, chunkCount: 0, totalTokens: 0, lastIndexed: null };
  }

  try {
    const stats = await DocumentIndexing.getStats(userId);
    return {
      documentCount: stats.documentCount,
      chunkCount: stats.chunkCount,
      totalTokens: stats.totalTokens,
      lastIndexed: stats.lastIndexed,
    };
  } catch (error) {
    console.error('[DocumentIndexing] Stats error:', error);
    return { documentCount: 0, chunkCount: 0, totalTokens: 0, lastIndexed: null };
  }
}

/**
 * Remove a document from the index.
 * Note: removeFromIndex takes document path, not (userId, documentId).
 */
export async function removeDocument(documentPath: string): Promise<boolean> {
  if (!featureFlags.enableDocumentIndexing) {
    return false;
  }

  try {
    await DocumentIndexing.removeFromIndex(documentPath);
    return true;
  } catch (error) {
    console.error('[DocumentIndexing] Remove error:', error);
    return false;
  }
}

/**
 * Re-index a document after content changes.
 */
export async function reindexDocument(
  userId: string,
  documentId: string,
  document: {
    name: string;
    content: string;
    type: DocumentType;
    projectId?: string;
    conversationId?: string;
  },
  options?: {
    interface?: InterfaceType;
  }
): Promise<IndexingResult> {
  if (!featureFlags.enableDocumentIndexing) {
    return {
      success: false,
      documentId,
      chunks: 0,
      relationships: 0,
      processingTimeMs: 0,
      error: 'Document indexing is disabled',
    };
  }

  const startTime = Date.now();

  try {
    const now = new Date();
    const contentSize = new TextEncoder().encode(document.content).length;

    const rawDocument = {
      path: document.name,
      filename: document.name,
      filetype: document.type,
      content: document.content,
      size: contentSize,
      mtime: now,
      ctime: now,
    };

    const indexed = await DocumentIndexing.reindexDocument(documentId, rawDocument, userId, {
      interface: options?.interface || 'web',
      projectId: document.projectId,
      conversationId: document.conversationId,
    });

    return {
      success: true,
      documentId: indexed.id,
      chunks: indexed.chunks.length,
      relationships: indexed.relatedDocuments.length,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[DocumentIndexing] Reindex error:', error);
    return {
      success: false,
      documentId,
      chunks: 0,
      relationships: 0,
      processingTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Detect document type from filename.
 */
export function detectDocumentType(filename: string): DocumentType | null {
  return DocumentIndexing.detectDocumentType(filename);
}

/**
 * Check if a file type is supported.
 */
export function isSupported(filename: string): boolean {
  return DocumentIndexing.isSupported(filename);
}
