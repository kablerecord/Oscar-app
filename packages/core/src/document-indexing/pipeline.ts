/**
 * OSQR Document Indexing - Main Pipeline
 *
 * Orchestrates the complete document indexing process:
 * 1. Detection - File type and event handling
 * 2. Extraction - Content, structure, metadata
 * 3. Chunking - Semantic boundaries
 * 4. Embedding - Multi-vector embeddings
 * 5. Relationships - Cross-document links
 * 6. Storage - Persist to Memory Vault
 */

import { randomUUID } from 'crypto';
import {
  DocumentEvent,
  RawDocument,
  IndexedDocument,
  DocumentChunk,
  DocumentIndexingConfig,
  DEFAULT_INDEXING_CONFIG,
  IndexingProgress,
  InterfaceType,
} from './types';
import { detectDocumentType, onDocumentEvent, emitDocumentEvent } from './detection';
import { extractContent } from './extraction';
import { chunkDocument, estimateTokens } from './chunking';
import { embedDocument, embed } from './embedding';
import { mapRelationships, extractEntities } from './relationships';
import {
  storeDocument,
  getDocument,
  getUserDocuments,
  deleteDocument,
  retrieveByDocumentName,
  retrieveByConcept,
  retrieveByTime,
  retrieveAcrossProjects,
} from './storage';

// ============================================================================
// Progress Tracking
// ============================================================================

const progressMap: Map<string, IndexingProgress> = new Map();

export function getProgress(documentId: string): IndexingProgress | null {
  return progressMap.get(documentId) || null;
}

function updateProgress(
  documentId: string,
  stage: IndexingProgress['stage'],
  progress: number,
  error?: string
): void {
  const existing = progressMap.get(documentId);
  progressMap.set(documentId, {
    documentId,
    stage,
    progress,
    error,
    startedAt: existing?.startedAt || new Date(),
    completedAt: stage === 'complete' || stage === 'failed' ? new Date() : undefined,
  });
}

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Index a document through the complete pipeline
 */
export async function indexDocument(
  rawDocument: RawDocument,
  userId: string,
  options: {
    interface: InterfaceType;
    conversationId?: string;
    projectId?: string;
    config?: DocumentIndexingConfig;
  }
): Promise<IndexedDocument> {
  const config = options.config || DEFAULT_INDEXING_CONFIG;
  const documentId = randomUUID();

  try {
    // Stage 1: Detection
    updateProgress(documentId, 'detection', 10);
    const filetype = detectDocumentType(rawDocument.filename);
    if (!filetype) {
      throw new Error(`Unsupported file type: ${rawDocument.filename}`);
    }
    rawDocument.filetype = filetype;

    // Stage 2: Extraction
    updateProgress(documentId, 'extraction', 20);
    const extracted = await extractContent(rawDocument);

    // Stage 3: Chunking
    updateProgress(documentId, 'chunking', 40);
    const rawChunks = chunkDocument(extracted, config);

    // Add IDs to chunks
    const chunksWithIds = rawChunks.map((chunk, index) => ({
      ...chunk,
      id: `${documentId}-chunk-${index}`,
      documentId,
    }));

    // Stage 4: Embedding
    updateProgress(documentId, 'embedding', 60);

    // Generate document summary first
    const summaryText = extracted.text.slice(0, 1000);
    const summary = await generateSummary(summaryText);

    // Extract topics from raw content (before markdown stripping) and structure
    const rawContent = typeof rawDocument.content === 'string'
      ? rawDocument.content
      : rawDocument.content.toString('utf-8');
    const topics = await extractTopics(rawContent, extracted.structure);
    const entities = await extractEntities(extracted.text);

    const partialDoc: Partial<IndexedDocument> = {
      id: documentId,
      userId,
      filename: rawDocument.filename,
      filetype,
      summary,
      topics,
      entities,
    };

    const chunks = await embedDocument(chunksWithIds, partialDoc, config);

    // Stage 5: Relationships
    updateProgress(documentId, 'relationships', 80);
    const existingDocs = await getUserDocuments(userId);
    const relationships = await mapRelationships(
      { ...partialDoc, chunks, content: extracted.text } as IndexedDocument,
      existingDocs
    );

    // Build full document
    const indexedDocument: IndexedDocument = {
      id: documentId,
      userId,
      filename: rawDocument.filename,
      filetype,
      content: extracted.text,
      chunks,
      sourceInterface: options.interface,
      sourceConversationId: options.conversationId || null,
      sourceProjectId: options.projectId || null,
      sourcePath: rawDocument.path || null,
      relatedDocuments: relationships.documents.map((d) => d.documentId),
      relatedConversations: relationships.conversations.map((c) => c.conversationId),
      parentDocument: null,
      createdAt: rawDocument.ctime,
      modifiedAt: rawDocument.mtime,
      lastAccessedAt: new Date(),
      versionHistory: [
        {
          id: randomUUID(),
          documentId,
          content: extracted.text,
          createdAt: new Date(),
          changeType: 'created',
          changeSummary: null,
        },
      ],
      topics,
      entities,
      summary,
      retrievalCount: 0,
      utilityScore: 0.5,
    };

    // Stage 6: Storage
    updateProgress(documentId, 'storage', 90);
    await storeDocument(indexedDocument, chunks, relationships);

    // Complete
    updateProgress(documentId, 'complete', 100);

    return indexedDocument;
  } catch (error) {
    updateProgress(
      documentId,
      'failed',
      0,
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

/**
 * Remove a document from the index
 */
export async function removeFromIndex(documentPath: string): Promise<void> {
  // Find document by path
  // In production, would have a path->id index
  // For now, this is a placeholder
  await deleteDocument(documentPath);
}

/**
 * Re-index a document (on modification)
 */
export async function reindexDocument(
  documentId: string,
  rawDocument: RawDocument,
  userId: string,
  options: {
    interface: InterfaceType;
    conversationId?: string;
    projectId?: string;
    config?: DocumentIndexingConfig;
  }
): Promise<IndexedDocument> {
  // Get existing document for version history
  const existing = await getDocument(documentId);

  // Delete old version
  await deleteDocument(documentId);

  // Re-index
  const newDoc = await indexDocument(rawDocument, userId, options);

  // Preserve version history
  if (existing) {
    newDoc.versionHistory = [
      ...existing.versionHistory,
      {
        id: randomUUID(),
        documentId: newDoc.id,
        content: newDoc.content,
        createdAt: new Date(),
        changeType: 'modified',
        changeSummary: null,
      },
    ];
  }

  return newDoc;
}

// ============================================================================
// Event Handling
// ============================================================================

/**
 * Initialize the document event handler
 */
export function initializeEventHandler(
  userId: string,
  loadDocument: (path: string) => Promise<RawDocument>
): () => void {
  return onDocumentEvent(async (event: DocumentEvent) => {
    if (event.type === 'deleted') {
      await removeFromIndex(event.documentPath);
      return;
    }

    const rawDocument = await loadDocument(event.documentPath);

    if (event.type === 'created') {
      await indexDocument(rawDocument, userId, {
        interface: event.interface,
        conversationId: event.conversationId,
        projectId: event.projectId,
      });
    } else if (event.type === 'modified' && event.documentId) {
      await reindexDocument(event.documentId, rawDocument, userId, {
        interface: event.interface,
        conversationId: event.conversationId,
        projectId: event.projectId,
      });
    }
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

async function generateSummary(text: string): Promise<string> {
  // TODO: Replace with LLM call
  // For now, return first paragraph or first 200 chars
  const firstParagraph = text.split(/\n\s*\n/)[0] || '';
  return firstParagraph.slice(0, 200).trim() + (firstParagraph.length > 200 ? '...' : '');
}

async function extractTopics(
  rawText: string,
  structure?: { headings?: Array<{ text: string }> }
): Promise<string[]> {
  // TODO: Replace with LLM call or topic modeling
  // For now, extract capitalized multi-word phrases
  const topics: Set<string> = new Set();

  // Extract from structure headings first (most reliable)
  if (structure?.headings) {
    for (const heading of structure.headings) {
      const topic = heading.text.trim();
      if (topic.length > 3 && topic.length < 50) {
        topics.add(topic);
      }
    }
  }

  // Extract emphasized terms from raw text
  const emphasized = rawText.match(/\*\*([^*]+)\*\*/g) || [];
  for (const match of emphasized) {
    const topic = match.replace(/\*\*/g, '').trim();
    if (topic.length > 3 && topic.length < 50) {
      topics.add(topic);
    }
  }

  // Extract headings from raw text
  const headings = rawText.match(/^#+\s+(.+)$/gm) || [];
  for (const heading of headings) {
    const topic = heading.replace(/^#+\s+/, '').trim();
    if (topic.length > 3 && topic.length < 50) {
      topics.add(topic);
    }
  }

  return Array.from(topics).slice(0, 10);
}

// ============================================================================
// Query Interface
// ============================================================================

export interface DocumentQuery {
  query: string;
  userId: string;
  type: 'name' | 'concept' | 'time' | 'cross-project';
  options?: {
    timeRange?: { start: Date; end: Date };
    projects?: string[];
    filter?: Record<string, unknown>;
    limit?: number;
  };
}

/**
 * Unified query interface for document retrieval
 */
export async function queryDocuments(params: DocumentQuery) {
  switch (params.type) {
    case 'name':
      return retrieveByDocumentName(params.query, params.userId);

    case 'concept':
      return retrieveByConcept(params.query, params.userId, params.options);

    case 'time':
      if (!params.options?.timeRange) {
        throw new Error('timeRange required for time queries');
      }
      return retrieveByTime(params.options.timeRange, params.userId);

    case 'cross-project':
      if (!params.options?.projects) {
        throw new Error('projects required for cross-project queries');
      }
      return retrieveAcrossProjects(params.options.projects, params.query, params.userId);

    default:
      throw new Error(`Unknown query type: ${params.type}`);
  }
}
