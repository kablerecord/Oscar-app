/**
 * Chroma Integration Module
 *
 * Provides persistence layer for Memory Vault using Chroma vector database.
 */

// Client
export {
  initializeChroma,
  getChromaClient,
  isChromaInitialized,
  getChromaConfig,
  checkHealth,
  resetChroma,
  disconnectChroma,
  buildCollectionName,
  ChromaError,
  withChromaError,
  dateToMetadata,
  metadataToDate,
  serializeMetadata,
  deserializeMetadata,
  type ChromaConfig,
  type ChromaErrorCode,
} from './client';
export { DEFAULT_CHROMA_CONFIG } from './client';

// Collections
export {
  getOrCreateCollection,
  getCollection,
  deleteCollection,
  listUserCollections,
  clearCollectionCache,
  addDocuments,
  updateDocuments,
  upsertDocuments,
  deleteDocuments,
  getDocuments,
  queryByEmbedding,
  queryAll,
  getCount,
  SEMANTIC_METADATA_SCHEMA,
  EPISODIC_METADATA_SCHEMA,
  PROCEDURAL_METADATA_SCHEMA,
  type CollectionType,
  type CollectionMetadata,
  type ChromaDocument,
  type QueryOptions,
  type QueryResult,
} from './collections';

// Persistence
export {
  setPersistenceMode,
  getPersistenceMode,
  isUsingChroma,
  InMemoryStore,
  ChromaStore,
  HybridStore,
  createStore,
  createInMemoryStore,
  createChromaStore,
  type PersistenceMode,
  type StoreRecord,
  type StoreQuery,
  type PersistentStore,
  type ChromaStoreOptions,
} from './persistence';
