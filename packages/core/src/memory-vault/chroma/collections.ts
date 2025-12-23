/**
 * Chroma Collection Manager
 *
 * Manages Chroma collections for the three memory store types.
 * Provides typed interfaces for CRUD operations on collections.
 */

import type { Collection } from 'chromadb';
import {
  getChromaClient,
  getChromaConfig,
  buildCollectionName,
  ChromaError,
  withChromaError,
  serializeMetadata,
  deserializeMetadata,
  dateToMetadata,
  metadataToDate,
} from './client';

// ============================================================================
// Collection Types
// ============================================================================

export type CollectionType = 'semantic' | 'episodic' | 'procedural';

export interface CollectionMetadata {
  type: CollectionType;
  userId?: string;
  version: string;
  createdAt: string;
}

// ============================================================================
// Collection Management
// ============================================================================

const collections = new Map<string, Collection>();

/**
 * Get or create a collection for a specific store type
 */
export async function getOrCreateCollection(
  type: CollectionType,
  userId?: string
): Promise<Collection> {
  const collectionName = buildCollectionName(type, userId);

  // Check cache first
  if (collections.has(collectionName)) {
    return collections.get(collectionName)!;
  }

  const client = getChromaClient();

  const collection = await withChromaError(
    async () => {
      return await client.getOrCreateCollection({
        name: collectionName,
        metadata: {
          type,
          userId: userId || 'global',
          version: '1.0',
          createdAt: new Date().toISOString(),
        },
      });
    },
    'COLLECTION_NOT_FOUND',
    `Failed to get or create collection: ${collectionName}`
  );

  collections.set(collectionName, collection);
  return collection;
}

/**
 * Get an existing collection (throws if not found)
 */
export async function getCollection(
  type: CollectionType,
  userId?: string
): Promise<Collection> {
  const collectionName = buildCollectionName(type, userId);

  // Check cache first
  if (collections.has(collectionName)) {
    return collections.get(collectionName)!;
  }

  const client = getChromaClient();

  const collection = await withChromaError(
    async () => {
      return await client.getCollection({ name: collectionName });
    },
    'COLLECTION_NOT_FOUND',
    `Collection not found: ${collectionName}`
  );

  collections.set(collectionName, collection);
  return collection;
}

/**
 * Delete a collection
 */
export async function deleteCollection(
  type: CollectionType,
  userId?: string
): Promise<void> {
  const collectionName = buildCollectionName(type, userId);
  const client = getChromaClient();

  await withChromaError(
    async () => {
      await client.deleteCollection({ name: collectionName });
    },
    'DELETE_FAILED',
    `Failed to delete collection: ${collectionName}`
  );

  collections.delete(collectionName);
}

/**
 * List all collections for a user
 */
export async function listUserCollections(userId: string): Promise<string[]> {
  const client = getChromaClient();
  const config = getChromaConfig();
  const prefix = `${config.collectionPrefix}`;

  const allCollections = await client.listCollections();
  const userSuffix = `_${userId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 32)}`;

  return allCollections
    .map((c) => c.name)
    .filter((name) => name.startsWith(prefix) && name.includes(userSuffix));
}

/**
 * Clear collection cache (for testing)
 */
export function clearCollectionCache(): void {
  collections.clear();
}

// ============================================================================
// Document Operations
// ============================================================================

export interface ChromaDocument {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, string | number | boolean>;
}

export interface QueryOptions {
  queryEmbedding?: number[];
  queryText?: string;
  limit?: number;
  where?: Record<string, unknown>;
  include?: string[];
}

export interface QueryResult {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  distance?: number;
}

/**
 * Add documents to a collection
 */
export async function addDocuments(
  collection: Collection,
  documents: ChromaDocument[]
): Promise<void> {
  if (documents.length === 0) return;

  const ids = documents.map((d) => d.id);
  const contents = documents.map((d) => d.content);
  const embeddings = documents.some((d) => d.embedding)
    ? documents.map((d) => d.embedding || [])
    : undefined;
  const metadatas = documents.map((d) => d.metadata);

  await withChromaError(
    async () => {
      await collection.add({
        ids,
        documents: contents,
        embeddings,
        metadatas,
      });
    },
    'INSERT_FAILED',
    'Failed to add documents to collection'
  );
}

/**
 * Update documents in a collection
 */
export async function updateDocuments(
  collection: Collection,
  documents: ChromaDocument[]
): Promise<void> {
  if (documents.length === 0) return;

  const ids = documents.map((d) => d.id);
  const contents = documents.map((d) => d.content);
  const embeddings = documents.some((d) => d.embedding)
    ? documents.map((d) => d.embedding || [])
    : undefined;
  const metadatas = documents.map((d) => d.metadata);

  await withChromaError(
    async () => {
      await collection.update({
        ids,
        documents: contents,
        embeddings,
        metadatas,
      });
    },
    'UPDATE_FAILED',
    'Failed to update documents in collection'
  );
}

/**
 * Upsert documents in a collection (add or update)
 */
export async function upsertDocuments(
  collection: Collection,
  documents: ChromaDocument[]
): Promise<void> {
  if (documents.length === 0) return;

  const ids = documents.map((d) => d.id);
  const contents = documents.map((d) => d.content);
  const embeddings = documents.some((d) => d.embedding)
    ? documents.map((d) => d.embedding || [])
    : undefined;
  const metadatas = documents.map((d) => d.metadata);

  await withChromaError(
    async () => {
      await collection.upsert({
        ids,
        documents: contents,
        embeddings,
        metadatas,
      });
    },
    'UPDATE_FAILED',
    'Failed to upsert documents in collection'
  );
}

/**
 * Delete documents from a collection
 */
export async function deleteDocuments(
  collection: Collection,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;

  await withChromaError(
    async () => {
      await collection.delete({ ids });
    },
    'DELETE_FAILED',
    'Failed to delete documents from collection'
  );
}

/**
 * Get documents by ID
 */
export async function getDocuments(
  collection: Collection,
  ids: string[],
  include: string[] = ['documents', 'metadatas', 'embeddings']
): Promise<QueryResult[]> {
  if (ids.length === 0) return [];

  const result = await withChromaError(
    async () => {
      return await collection.get({
        ids,
        include: include as ("documents" | "embeddings" | "metadatas")[],
      });
    },
    'QUERY_FAILED',
    'Failed to get documents from collection'
  );

  return convertQueryResults(result);
}

/**
 * Query documents by embedding similarity
 */
export async function queryByEmbedding(
  collection: Collection,
  embedding: number[],
  options: {
    limit?: number;
    where?: Record<string, unknown>;
    include?: string[];
  } = {}
): Promise<QueryResult[]> {
  const {
    limit = 10,
    where,
    include = ['documents', 'metadatas', 'distances'],
  } = options;

  const result = await withChromaError(
    async () => {
      return await collection.query({
        queryEmbeddings: [embedding],
        nResults: limit,
        where: where as Record<string, string | number | boolean>,
        include: include as ("documents" | "embeddings" | "metadatas" | "distances")[],
      });
    },
    'QUERY_FAILED',
    'Failed to query documents by embedding'
  );

  return convertQueryResults(result);
}

/**
 * Query all documents with optional filters
 */
export async function queryAll(
  collection: Collection,
  options: {
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
    include?: string[];
  } = {}
): Promise<QueryResult[]> {
  const {
    where,
    limit,
    offset,
    include = ['documents', 'metadatas', 'embeddings'],
  } = options;

  const result = await withChromaError(
    async () => {
      return await collection.get({
        where: where as Record<string, string | number | boolean>,
        limit,
        offset,
        include: include as ("documents" | "embeddings" | "metadatas")[],
      });
    },
    'QUERY_FAILED',
    'Failed to query all documents'
  );

  return convertQueryResults(result);
}

/**
 * Get collection count
 */
export async function getCount(collection: Collection): Promise<number> {
  return await collection.count();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert Chroma query results to typed QueryResult array
 */
function convertQueryResults(
  result: {
    ids: string[] | string[][];
    documents?: (string | null)[] | (string | null)[][] | null;
    metadatas?: unknown;
    embeddings?: number[][] | number[][][] | null;
    distances?: number[] | number[][] | null;
  }
): QueryResult[] {
  // Handle nested array structure from query results
  const ids = Array.isArray(result.ids[0]) ? (result.ids as string[][])[0] : (result.ids as string[]);
  const documents = result.documents
    ? (Array.isArray(result.documents[0]) && typeof result.documents[0] !== 'string'
        ? (result.documents as (string | null)[][])[0]
        : (result.documents as (string | null)[]))
    : [];
  const rawMetadatas = result.metadatas as (Record<string, unknown> | null)[] | (Record<string, unknown> | null)[][] | null;
  const metadatas = rawMetadatas
    ? (Array.isArray(rawMetadatas[0]) && !('$contains' in (rawMetadatas[0] || {}))
        ? (rawMetadatas as (Record<string, unknown> | null)[][])[0]
        : (rawMetadatas as (Record<string, unknown> | null)[]))
    : [];
  const embeddings = result.embeddings
    ? (Array.isArray(result.embeddings[0]) && Array.isArray(result.embeddings[0][0])
        ? (result.embeddings as number[][][])[0]
        : (result.embeddings as number[][]))
    : [];
  const distances = result.distances
    ? (Array.isArray(result.distances[0])
        ? (result.distances as number[][])[0]
        : (result.distances as number[]))
    : [];

  const results: QueryResult[] = [];

  for (let i = 0; i < ids.length; i++) {
    results.push({
      id: ids[i],
      content: documents[i] || '',
      embedding: embeddings[i],
      metadata: metadatas[i] || {},
      distance: distances[i],
    });
  }

  return results;
}

// ============================================================================
// Typed Store Helpers
// ============================================================================

/**
 * Metadata schema for semantic memories
 */
export const SEMANTIC_METADATA_SCHEMA = {
  dates: ['createdAt', 'lastAccessedAt', 'source_timestamp'],
  arrays: ['topics', 'relatedMemoryIds', 'contradicts', 'supersedes'],
  objects: ['source'],
};

/**
 * Metadata schema for episodic memories
 */
export const EPISODIC_METADATA_SCHEMA = {
  dates: ['startedAt', 'endedAt', 'timestamp', 'createdAt'],
  arrays: ['topics', 'conversationIds', 'entities', 'commitments', 'messages', 'toolCalls'],
  objects: ['metadata'],
};

/**
 * Metadata schema for procedural memories
 */
export const PROCEDURAL_METADATA_SCHEMA = {
  dates: ['createdAt', 'updatedAt', 'expiresAt'],
  arrays: ['rules', 'instructions', 'permissions'],
  objects: [],
};

export {
  serializeMetadata,
  deserializeMetadata,
  dateToMetadata,
  metadataToDate,
};
