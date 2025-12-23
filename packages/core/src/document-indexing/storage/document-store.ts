/**
 * OSQR Document Indexing - Document Store
 *
 * Stores indexed documents with integration to Memory Vault.
 */

import {
  IndexedDocument,
  DocumentChunk,
  RelationshipMap,
  DocumentQueryOptions,
  RetrievalResult,
  TimeRange,
  ComparisonResult,
} from '../types';
import { embed, cosineSimilarity } from '../embedding';

// ============================================================================
// In-Memory Store (to be replaced with Memory Vault integration)
// ============================================================================

const documentStore: Map<string, IndexedDocument> = new Map();
const chunkStore: Map<string, DocumentChunk> = new Map();
const relationshipStore: Map<string, RelationshipMap> = new Map();

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Store an indexed document
 */
export async function storeDocument(
  document: IndexedDocument,
  chunks: DocumentChunk[],
  relationships: RelationshipMap
): Promise<void> {
  // Store document
  documentStore.set(document.id, {
    ...document,
    chunks,
  });

  // Store chunks individually for querying
  for (const chunk of chunks) {
    chunkStore.set(chunk.id, chunk);
  }

  // Store relationships
  relationshipStore.set(document.id, relationships);
}

/**
 * Get a document by ID
 */
export async function getDocument(documentId: string): Promise<IndexedDocument | null> {
  return documentStore.get(documentId) || null;
}

/**
 * Get all documents for a user
 */
export async function getUserDocuments(userId: string): Promise<IndexedDocument[]> {
  return Array.from(documentStore.values()).filter((doc) => doc.userId === userId);
}

/**
 * Delete a document and its chunks
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const document = documentStore.get(documentId);
  if (document) {
    // Delete chunks
    for (const chunk of document.chunks) {
      chunkStore.delete(chunk.id);
    }

    // Delete document
    documentStore.delete(documentId);

    // Delete relationships
    relationshipStore.delete(documentId);
  }
}

/**
 * Update document metadata
 */
export async function updateDocument(
  documentId: string,
  updates: Partial<IndexedDocument>
): Promise<IndexedDocument | null> {
  const document = documentStore.get(documentId);
  if (!document) return null;

  const updated = {
    ...document,
    ...updates,
    modifiedAt: new Date(),
  };

  documentStore.set(documentId, updated);
  return updated;
}

// ============================================================================
// Retrieval Operations
// ============================================================================

/**
 * Query documents by name pattern
 */
export async function retrieveByDocumentName(
  query: string,
  userId: string
): Promise<RetrievalResult[]> {
  const pattern = query.toLowerCase();
  const matches = Array.from(documentStore.values()).filter(
    (doc) =>
      doc.userId === userId &&
      (doc.filename.toLowerCase().includes(pattern) ||
        doc.summary?.toLowerCase().includes(pattern))
  );

  return matches.map((doc) => ({
    document: doc,
    relevantChunks: doc.chunks.slice(0, 3), // Top 3 chunks
    score: doc.filename.toLowerCase().includes(pattern) ? 1 : 0.8,
  }));
}

/**
 * Query documents by semantic similarity
 */
export async function retrieveByConcept(
  query: string,
  userId: string,
  options: { filter?: Record<string, unknown>; limit?: number } = {}
): Promise<RetrievalResult[]> {
  const queryEmbedding = await embed(query);
  const { limit = 10 } = options;

  // Get all chunks for user's documents
  const userDocs = await getUserDocuments(userId);
  const allChunks = userDocs.flatMap((doc) => doc.chunks);

  // Find similar chunks
  const chunkScores = allChunks
    .map((chunk) => ({
      chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((r) => r.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity);

  // Group by document
  const docScores = new Map<string, { chunks: DocumentChunk[]; maxScore: number }>();

  for (const { chunk, similarity } of chunkScores) {
    const existing = docScores.get(chunk.documentId);
    if (existing) {
      existing.chunks.push(chunk);
      existing.maxScore = Math.max(existing.maxScore, similarity);
    } else {
      docScores.set(chunk.documentId, { chunks: [chunk], maxScore: similarity });
    }
  }

  // Build results
  const results: RetrievalResult[] = [];
  for (const [docId, { chunks, maxScore }] of docScores) {
    const document = documentStore.get(docId);
    if (document) {
      results.push({
        document,
        relevantChunks: chunks.slice(0, 5),
        score: maxScore,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Query documents by time range
 */
export async function retrieveByTime(
  timeRange: TimeRange,
  userId: string
): Promise<{ documents: IndexedDocument[]; conversations: never[] }> {
  const documents = Array.from(documentStore.values()).filter(
    (doc) =>
      doc.userId === userId &&
      ((doc.createdAt >= timeRange.start && doc.createdAt <= timeRange.end) ||
        (doc.modifiedAt >= timeRange.start && doc.modifiedAt <= timeRange.end))
  );

  return {
    documents: documents.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime()),
    conversations: [], // Would be populated from episodic store
  };
}

/**
 * Query documents across projects
 */
export async function retrieveAcrossProjects(
  projects: string[],
  topic: string,
  userId: string
): Promise<ComparisonResult> {
  const byProject = new Map<string, RetrievalResult[]>();

  for (const projectId of projects) {
    const projectDocs = Array.from(documentStore.values()).filter(
      (doc) => doc.userId === userId && doc.sourceProjectId === projectId
    );

    if (projectDocs.length > 0) {
      const queryEmbedding = await embed(topic);
      const results: RetrievalResult[] = [];

      for (const doc of projectDocs) {
        const chunkScores = doc.chunks.map((chunk) => ({
          chunk,
          similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
        }));

        const maxScore = Math.max(...chunkScores.map((c) => c.similarity));
        if (maxScore > 0.5) {
          results.push({
            document: doc,
            relevantChunks: chunkScores
              .filter((c) => c.similarity > 0.5)
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, 3)
              .map((c) => c.chunk),
            score: maxScore,
          });
        }
      }

      byProject.set(projectId, results.sort((a, b) => b.score - a.score).slice(0, 5));
    }
  }

  return {
    byProject,
    commonThemes: findCommonThemes(byProject),
    differences: findDifferences(byProject),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function findCommonThemes(byProject: Map<string, RetrievalResult[]>): string[] {
  const projectTopics = Array.from(byProject.values()).map((results) =>
    new Set(results.flatMap((r) => r.document.topics))
  );

  if (projectTopics.length === 0) return [];

  // Find intersection of all project topics
  const common = projectTopics.reduce((acc, topics) => {
    return new Set([...acc].filter((t) => topics.has(t)));
  });

  return Array.from(common);
}

function findDifferences(
  byProject: Map<string, RetrievalResult[]>
): ComparisonResult['differences'] {
  const differences: ComparisonResult['differences'] = [];
  const projectIds = Array.from(byProject.keys());

  if (projectIds.length < 2) return differences;

  // Compare first two projects
  const [projectA, projectB] = projectIds;
  const resultsA = byProject.get(projectA) || [];
  const resultsB = byProject.get(projectB) || [];

  const topicsA = new Set(resultsA.flatMap((r) => r.document.topics));
  const topicsB = new Set(resultsB.flatMap((r) => r.document.topics));

  // Topics unique to A
  for (const topic of topicsA) {
    if (!topicsB.has(topic)) {
      differences.push({
        topic,
        projectA,
        projectB,
        descriptionA: `Present in ${projectA}`,
        descriptionB: `Not found in ${projectB}`,
      });
    }
  }

  // Topics unique to B
  for (const topic of topicsB) {
    if (!topicsA.has(topic)) {
      differences.push({
        topic,
        projectA,
        projectB,
        descriptionA: `Not found in ${projectA}`,
        descriptionB: `Present in ${projectB}`,
      });
    }
  }

  return differences;
}

// ============================================================================
// Stats
// ============================================================================

/**
 * Get document indexing statistics
 */
export async function getStats(userId: string): Promise<{
  documentCount: number;
  chunkCount: number;
  totalTokens: number;
  lastIndexed: Date | null;
}> {
  const userDocs = await getUserDocuments(userId);
  const totalChunks = userDocs.reduce((sum, doc) => sum + doc.chunks.length, 0);
  const totalTokens = userDocs.reduce(
    (sum, doc) => sum + doc.chunks.reduce((s, c) => s + c.metadata.tokenCount, 0),
    0
  );
  const lastIndexed = userDocs.length > 0
    ? new Date(Math.max(...userDocs.map((d) => d.modifiedAt.getTime())))
    : null;

  return {
    documentCount: userDocs.length,
    chunkCount: totalChunks,
    totalTokens,
    lastIndexed,
  };
}

/**
 * Clear all stores (for testing)
 */
export function clearStores(): void {
  documentStore.clear();
  chunkStore.clear();
  relationshipStore.clear();
}
