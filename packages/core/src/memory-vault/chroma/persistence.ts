/**
 * Persistence Layer
 *
 * Provides a unified persistence interface that works with both
 * in-memory storage (for testing) and Chroma (for production).
 */

import type { Collection } from 'chromadb';
import { isChromaInitialized } from './client';
import {
  getOrCreateCollection,
  addDocuments,
  updateDocuments,
  upsertDocuments,
  deleteDocuments,
  getDocuments,
  queryAll,
  queryByEmbedding,
  getCount,
  serializeMetadata,
  deserializeMetadata,
  type CollectionType,
  type ChromaDocument,
  type QueryResult,
} from './collections';

// ============================================================================
// Persistence Mode
// ============================================================================

export type PersistenceMode = 'memory' | 'chroma';

let currentMode: PersistenceMode = 'memory';

/**
 * Set the persistence mode
 */
export function setPersistenceMode(mode: PersistenceMode): void {
  currentMode = mode;
}

/**
 * Get the current persistence mode
 */
export function getPersistenceMode(): PersistenceMode {
  // If Chroma is initialized, use it; otherwise fall back to memory
  if (currentMode === 'chroma' && isChromaInitialized()) {
    return 'chroma';
  }
  return 'memory';
}

/**
 * Check if using Chroma persistence
 */
export function isUsingChroma(): boolean {
  return getPersistenceMode() === 'chroma';
}

// ============================================================================
// Store Interface
// ============================================================================

export interface StoreRecord {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
}

export interface StoreQuery {
  ids?: string[];
  where?: Record<string, unknown>;
  embedding?: number[];
  limit?: number;
  offset?: number;
}

export interface PersistentStore<T extends StoreRecord> {
  add(record: T): Promise<void>;
  addBatch(records: T[]): Promise<void>;
  get(id: string): Promise<T | null>;
  getAll(): Promise<T[]>;
  query(query: StoreQuery): Promise<T[]>;
  update(id: string, updates: Partial<T>): Promise<T | null>;
  upsert(record: T): Promise<void>;
  delete(id: string): Promise<boolean>;
  deleteAll(): Promise<void>;
  count(): Promise<number>;
}

// ============================================================================
// In-Memory Store Implementation
// ============================================================================

export class InMemoryStore<T extends StoreRecord> implements PersistentStore<T> {
  private records = new Map<string, T>();

  async add(record: T): Promise<void> {
    this.records.set(record.id, record);
  }

  async addBatch(records: T[]): Promise<void> {
    for (const record of records) {
      this.records.set(record.id, record);
    }
  }

  async get(id: string): Promise<T | null> {
    return this.records.get(id) || null;
  }

  async getAll(): Promise<T[]> {
    return Array.from(this.records.values());
  }

  async query(query: StoreQuery): Promise<T[]> {
    let results = Array.from(this.records.values());

    // Filter by IDs
    if (query.ids && query.ids.length > 0) {
      const idSet = new Set(query.ids);
      results = results.filter((r) => idSet.has(r.id));
    }

    // Filter by where conditions
    if (query.where) {
      results = results.filter((r) => matchesWhere(r.metadata, query.where!));
    }

    // Apply offset and limit
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const existing = this.records.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, id } as T;
    if (updates.metadata) {
      updated.metadata = { ...existing.metadata, ...updates.metadata };
    }
    this.records.set(id, updated);
    return updated;
  }

  async upsert(record: T): Promise<void> {
    const existing = this.records.get(record.id);
    if (existing) {
      const updated = { ...existing, ...record };
      if (record.metadata) {
        updated.metadata = { ...existing.metadata, ...record.metadata };
      }
      this.records.set(record.id, updated);
    } else {
      this.records.set(record.id, record);
    }
  }

  async delete(id: string): Promise<boolean> {
    return this.records.delete(id);
  }

  async deleteAll(): Promise<void> {
    this.records.clear();
  }

  async count(): Promise<number> {
    return this.records.size;
  }
}

/**
 * Match record metadata against where conditions
 */
function matchesWhere(
  metadata: Record<string, unknown>,
  where: Record<string, unknown>
): boolean {
  for (const [key, condition] of Object.entries(where)) {
    const value = metadata[key];

    if (typeof condition === 'object' && condition !== null) {
      // Handle comparison operators
      const ops = condition as Record<string, unknown>;
      if ('$eq' in ops && value !== ops.$eq) return false;
      if ('$ne' in ops && value === ops.$ne) return false;
      if ('$gt' in ops && (typeof value !== 'number' || value <= (ops.$gt as number))) return false;
      if ('$gte' in ops && (typeof value !== 'number' || value < (ops.$gte as number))) return false;
      if ('$lt' in ops && (typeof value !== 'number' || value >= (ops.$lt as number))) return false;
      if ('$lte' in ops && (typeof value !== 'number' || value > (ops.$lte as number))) return false;
      if ('$in' in ops && !Array.isArray(ops.$in)) return false;
      if ('$in' in ops && !(ops.$in as unknown[]).includes(value)) return false;
      if ('$nin' in ops && Array.isArray(ops.$nin) && (ops.$nin as unknown[]).includes(value)) return false;
    } else {
      // Direct equality
      if (value !== condition) return false;
    }
  }
  return true;
}

// ============================================================================
// Chroma Store Implementation
// ============================================================================

export interface ChromaStoreOptions {
  collectionType: CollectionType;
  userId?: string;
  metadataSchema?: {
    dates?: string[];
    arrays?: string[];
    objects?: string[];
  };
}

export class ChromaStore<T extends StoreRecord> implements PersistentStore<T> {
  private collection: Collection | null = null;
  private options: ChromaStoreOptions;

  constructor(options: ChromaStoreOptions) {
    this.options = options;
  }

  private async getCollection(): Promise<Collection> {
    if (!this.collection) {
      this.collection = await getOrCreateCollection(
        this.options.collectionType,
        this.options.userId
      );
    }
    return this.collection;
  }

  private toDocument(record: T): ChromaDocument {
    return {
      id: record.id,
      content: record.content,
      embedding: record.embedding,
      metadata: serializeMetadata(record.metadata),
    };
  }

  private fromResult(result: QueryResult): T {
    const metadata = this.options.metadataSchema
      ? deserializeMetadata(
          result.metadata as Record<string, string | number | boolean>,
          this.options.metadataSchema
        )
      : result.metadata;

    return {
      id: result.id,
      content: result.content,
      embedding: result.embedding,
      metadata,
    } as T;
  }

  async add(record: T): Promise<void> {
    const collection = await this.getCollection();
    await addDocuments(collection, [this.toDocument(record)]);
  }

  async addBatch(records: T[]): Promise<void> {
    if (records.length === 0) return;
    const collection = await this.getCollection();
    await addDocuments(collection, records.map((r) => this.toDocument(r)));
  }

  async get(id: string): Promise<T | null> {
    const collection = await this.getCollection();
    const results = await getDocuments(collection, [id]);
    if (results.length === 0) return null;
    return this.fromResult(results[0]);
  }

  async getAll(): Promise<T[]> {
    const collection = await this.getCollection();
    const results = await queryAll(collection);
    return results.map((r) => this.fromResult(r));
  }

  async query(query: StoreQuery): Promise<T[]> {
    const collection = await this.getCollection();

    // If querying by embedding
    if (query.embedding) {
      const results = await queryByEmbedding(collection, query.embedding, {
        limit: query.limit,
        where: query.where,
      });
      return results.map((r) => this.fromResult(r));
    }

    // If querying by IDs
    if (query.ids && query.ids.length > 0) {
      const results = await getDocuments(collection, query.ids);
      return results.map((r) => this.fromResult(r));
    }

    // General query
    const results = await queryAll(collection, {
      where: query.where,
      limit: query.limit,
      offset: query.offset,
    });
    return results.map((r) => this.fromResult(r));
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      id,
      metadata: { ...existing.metadata, ...(updates.metadata || {}) },
    } as T;

    const collection = await this.getCollection();
    await updateDocuments(collection, [this.toDocument(updated)]);
    return updated;
  }

  async upsert(record: T): Promise<void> {
    const collection = await this.getCollection();
    await upsertDocuments(collection, [this.toDocument(record)]);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) return false;

    const collection = await this.getCollection();
    await deleteDocuments(collection, [id]);
    return true;
  }

  async deleteAll(): Promise<void> {
    const collection = await this.getCollection();
    const results = await queryAll(collection);
    if (results.length > 0) {
      await deleteDocuments(
        collection,
        results.map((r) => r.id)
      );
    }
  }

  async count(): Promise<number> {
    const collection = await this.getCollection();
    return await getCount(collection);
  }
}

// ============================================================================
// Hybrid Store (In-Memory + Chroma)
// ============================================================================

/**
 * Creates a store that uses in-memory storage by default,
 * but can sync to Chroma when persistence is enabled.
 */
export class HybridStore<T extends StoreRecord> implements PersistentStore<T> {
  private memoryStore: InMemoryStore<T>;
  private chromaStore: ChromaStore<T> | null = null;
  private options: ChromaStoreOptions;
  private synced = false;

  constructor(options: ChromaStoreOptions) {
    this.options = options;
    this.memoryStore = new InMemoryStore<T>();
  }

  /**
   * Initialize Chroma persistence and sync from disk
   */
  async enablePersistence(): Promise<void> {
    if (!isChromaInitialized()) {
      throw new Error('Chroma must be initialized before enabling persistence');
    }

    this.chromaStore = new ChromaStore<T>(this.options);

    // Load existing data from Chroma into memory
    if (!this.synced) {
      const records = await this.chromaStore.getAll();
      for (const record of records) {
        await this.memoryStore.add(record);
      }
      this.synced = true;
    }
  }

  /**
   * Check if persistence is enabled
   */
  isPersistenceEnabled(): boolean {
    return this.chromaStore !== null && isChromaInitialized();
  }

  async add(record: T): Promise<void> {
    await this.memoryStore.add(record);
    if (this.isPersistenceEnabled()) {
      await this.chromaStore!.add(record);
    }
  }

  async addBatch(records: T[]): Promise<void> {
    await this.memoryStore.addBatch(records);
    if (this.isPersistenceEnabled()) {
      await this.chromaStore!.addBatch(records);
    }
  }

  async get(id: string): Promise<T | null> {
    return this.memoryStore.get(id);
  }

  async getAll(): Promise<T[]> {
    return this.memoryStore.getAll();
  }

  async query(query: StoreQuery): Promise<T[]> {
    return this.memoryStore.query(query);
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const updated = await this.memoryStore.update(id, updates);
    if (updated && this.isPersistenceEnabled()) {
      await this.chromaStore!.update(id, updates);
    }
    return updated;
  }

  async upsert(record: T): Promise<void> {
    await this.memoryStore.upsert(record);
    if (this.isPersistenceEnabled()) {
      await this.chromaStore!.upsert(record);
    }
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.memoryStore.delete(id);
    if (deleted && this.isPersistenceEnabled()) {
      await this.chromaStore!.delete(id);
    }
    return deleted;
  }

  async deleteAll(): Promise<void> {
    await this.memoryStore.deleteAll();
    if (this.isPersistenceEnabled()) {
      await this.chromaStore!.deleteAll();
    }
    this.synced = false;
  }

  async count(): Promise<number> {
    return this.memoryStore.count();
  }

  /**
   * Force sync all in-memory data to Chroma
   */
  async syncToChroma(): Promise<void> {
    if (!this.isPersistenceEnabled()) {
      throw new Error('Persistence not enabled');
    }

    const records = await this.memoryStore.getAll();
    for (const record of records) {
      await this.chromaStore!.upsert(record);
    }
  }

  /**
   * Force sync all Chroma data to memory
   */
  async syncFromChroma(): Promise<void> {
    if (!this.isPersistenceEnabled()) {
      throw new Error('Persistence not enabled');
    }

    await this.memoryStore.deleteAll();
    const records = await this.chromaStore!.getAll();
    for (const record of records) {
      await this.memoryStore.add(record);
    }
    this.synced = true;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new store instance
 */
export function createStore<T extends StoreRecord>(
  options: ChromaStoreOptions
): HybridStore<T> {
  return new HybridStore<T>(options);
}

/**
 * Create a new in-memory only store (for testing)
 */
export function createInMemoryStore<T extends StoreRecord>(): InMemoryStore<T> {
  return new InMemoryStore<T>();
}

/**
 * Create a new Chroma-backed store
 */
export function createChromaStore<T extends StoreRecord>(
  options: ChromaStoreOptions
): ChromaStore<T> {
  return new ChromaStore<T>(options);
}
