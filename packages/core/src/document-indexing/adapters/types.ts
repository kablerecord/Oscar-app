/**
 * OSQR Document Indexing - Adapter Type Definitions
 *
 * These interfaces define the contract between @osqr/core's document indexing
 * pipeline and external implementations (e.g., app-web's OpenAI + Prisma stack).
 *
 * The adapter pattern allows @osqr/core to remain implementation-agnostic while
 * consumers provide concrete implementations for:
 * - Embeddings (OpenAI, local models, etc.)
 * - Storage (Prisma/pgvector, Chroma, etc.)
 * - LLM operations (summaries, questions, entity extraction)
 */

import type {
  IndexedDocument,
  DocumentChunk,
  RelationshipMap,
  RetrievalResult,
  EntityReference,
  ChunkEmbeddings,
  DocumentIndexingConfig,
} from '../types';

// ============================================================================
// Embedding Adapter
// ============================================================================

/**
 * Adapter for generating vector embeddings from text.
 *
 * Implementations should handle:
 * - API rate limiting and retries
 * - Token truncation for long texts
 * - Consistent embedding dimensions
 */
export interface EmbeddingAdapter {
  /**
   * Generate embedding for a single text.
   * @param text - Text to embed (will be truncated if too long)
   * @param config - Optional configuration overrides
   * @returns Embedding vector (default 1536 dimensions for OpenAI)
   */
  embed(text: string, config?: Partial<DocumentIndexingConfig>): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts in batch.
   * More efficient than calling embed() repeatedly.
   * @param texts - Array of texts to embed
   * @param config - Optional configuration overrides
   * @returns Array of embedding vectors (same order as input)
   */
  embedBatch(texts: string[], config?: Partial<DocumentIndexingConfig>): Promise<number[][]>;

  /**
   * Generate multi-vector embeddings for enhanced retrieval.
   * Creates content, contextual, and queryable embeddings.
   * @param content - The chunk content
   * @param context - Document context (summary, heading hierarchy)
   * @param config - Optional configuration overrides
   * @returns Three embedding vectors for different retrieval patterns
   */
  embedMultiVector?(
    content: string,
    context: { summary?: string; headingContext?: string[] },
    config?: Partial<DocumentIndexingConfig>
  ): Promise<ChunkEmbeddings>;
}

// ============================================================================
// Storage Adapter
// ============================================================================

/**
 * Search options for storage queries.
 */
export interface StorageSearchOptions {
  /** User/workspace ID to scope the search */
  userId: string;
  /** Maximum number of results */
  limit?: number;
  /** Minimum similarity threshold (0-1) */
  similarityThreshold?: number;
  /** Filter by project ID */
  projectId?: string;
  /** Filter by source interface */
  sourceInterface?: string;
  /** Filter by document type */
  documentType?: string;
  /** Only return chunks marked as decisions */
  decisionsOnly?: boolean;
  /** Time range filter */
  timeRange?: { start: Date; end: Date };
}

/**
 * Result from a storage search operation.
 */
export interface StorageSearchResult {
  /** Chunk ID */
  id: string;
  /** Parent document ID */
  documentId: string;
  /** Chunk content */
  content: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Document title/filename */
  documentTitle: string;
  /** Chunk metadata */
  metadata?: {
    isDecision?: boolean;
    isQuestion?: boolean;
    isAction?: boolean;
    headingContext?: string[];
  };
}

/**
 * Adapter for persisting and querying indexed documents.
 *
 * Implementations should handle:
 * - Transaction management
 * - Concurrent access
 * - Index optimization
 */
export interface StorageAdapter {
  // ========== Document Operations ==========

  /**
   * Store a fully indexed document and its chunks.
   * @param document - The indexed document with all metadata
   * @returns The stored document ID
   */
  storeDocument(document: IndexedDocument): Promise<string>;

  /**
   * Store document chunks with embeddings.
   * Called after storeDocument() with the same documentId.
   * @param documentId - Parent document ID
   * @param chunks - Chunks with embeddings to store
   */
  storeChunks(documentId: string, chunks: DocumentChunk[]): Promise<void>;

  /**
   * Store relationship mappings for a document.
   * @param documentId - Document ID
   * @param relationships - Relationship map (conversations, similar docs, entities, links)
   */
  storeRelationships(documentId: string, relationships: RelationshipMap): Promise<void>;

  /**
   * Retrieve a document by ID.
   * @param documentId - Document ID
   * @returns The document or null if not found
   */
  getDocument(documentId: string): Promise<IndexedDocument | null>;

  /**
   * Retrieve all documents for a user.
   * @param userId - User/workspace ID
   * @param options - Optional filters (limit, offset, projectId)
   */
  getUserDocuments(
    userId: string,
    options?: { limit?: number; offset?: number; projectId?: string }
  ): Promise<IndexedDocument[]>;

  /**
   * Delete a document and all its chunks/relationships.
   * @param documentId - Document ID to delete
   */
  deleteDocument(documentId: string): Promise<void>;

  /**
   * Update document metadata (e.g., utility score, retrieval count).
   * @param documentId - Document ID
   * @param updates - Partial document updates
   */
  updateDocument(
    documentId: string,
    updates: Partial<Pick<IndexedDocument, 'utilityScore' | 'retrievalCount' | 'lastAccessedAt' | 'topics' | 'summary'>>
  ): Promise<void>;

  // ========== Search Operations ==========

  /**
   * Search for similar chunks using vector similarity.
   * @param embedding - Query embedding vector
   * @param options - Search options (userId, limit, threshold, filters)
   * @returns Ranked search results
   */
  searchByEmbedding(
    embedding: number[],
    options: StorageSearchOptions
  ): Promise<StorageSearchResult[]>;

  /**
   * Search documents by filename/title pattern.
   * @param pattern - Search pattern (case-insensitive)
   * @param userId - User/workspace ID
   * @param limit - Maximum results
   */
  searchByName(
    pattern: string,
    userId: string,
    limit?: number
  ): Promise<RetrievalResult[]>;

  /**
   * Get documents modified within a time range.
   * @param timeRange - Start and end dates
   * @param userId - User/workspace ID
   */
  searchByTimeRange(
    timeRange: { start: Date; end: Date },
    userId: string
  ): Promise<IndexedDocument[]>;

  /**
   * Find documents related to a given document.
   * @param documentId - Source document ID
   * @param limit - Maximum results
   */
  getRelatedDocuments(
    documentId: string,
    limit?: number
  ): Promise<{ document: IndexedDocument; similarity: number }[]>;

  // ========== Statistics ==========

  /**
   * Get indexing statistics for a user.
   * @param userId - User/workspace ID
   */
  getStats(userId: string): Promise<{
    documentCount: number;
    chunkCount: number;
    totalTokens: number;
    lastIndexedAt: Date | null;
  }>;
}

// ============================================================================
// LLM Adapter
// ============================================================================

/**
 * Adapter for LLM-based text operations.
 *
 * Implementations should handle:
 * - Model selection based on task complexity
 * - Token limits and truncation
 * - Cost optimization (e.g., use cheaper models for simple tasks)
 */
export interface LLMAdapter {
  /**
   * Generate a concise summary of text.
   * @param text - Text to summarize (will be truncated if too long)
   * @param maxLength - Target summary length in characters
   * @returns Summary text (2-3 sentences)
   */
  generateSummary(text: string, maxLength?: number): Promise<string>;

  /**
   * Generate hypothetical questions that the text might answer.
   * Used for multi-vector embeddings to improve retrieval.
   * @param text - Text to analyze
   * @param count - Number of questions to generate (default 3)
   * @returns Array of question strings
   */
  generateQuestions(text: string, count?: number): Promise<string[]>;

  /**
   * Extract named entities from text.
   * @param text - Text to analyze
   * @returns Array of entity references with types and positions
   */
  extractEntities(text: string): Promise<EntityReference[]>;

  /**
   * Detect if text contains a decision, question, or action item.
   * @param text - Text to analyze
   * @returns Semantic flags for the text
   */
  detectSemanticFlags(text: string): Promise<{
    isDecision: boolean;
    isQuestion: boolean;
    isAction: boolean;
  }>;

  /**
   * Generate a change summary comparing two versions of text.
   * @param oldText - Previous version
   * @param newText - New version
   * @returns Summary of changes
   */
  generateChangeSummary?(oldText: string, newText: string): Promise<string>;
}

// ============================================================================
// Combined Adapter Configuration
// ============================================================================

/**
 * All adapters bundled together for easy registration.
 */
export interface DocumentIndexingAdapters {
  embedding: EmbeddingAdapter;
  storage: StorageAdapter;
  llm: LLMAdapter;
}
