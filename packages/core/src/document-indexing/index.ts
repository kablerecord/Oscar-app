/**
 * OSQR Document Indexing Subsystem
 *
 * Enables Oscar to maintain unified awareness across all documents created
 * in any conversation, project, or interface. User organizational structures
 * (projects, folders, chats) are treated as presentation preferences, not
 * knowledge boundaries.
 *
 * Core Principle: The user decides how to organize their work.
 * Oscar decides nothing. He simply knows everything.
 */

// Types
export * from './types';

// Detection
export {
  onDocumentEvent,
  emitDocumentEvent,
  createDocumentCreatedEvent,
  createDocumentModifiedEvent,
  createDocumentDeletedEvent,
  detectDocumentType,
  isSupported,
  getCodeLanguage,
} from './detection';

// Extraction
export {
  getExtractor,
  extractContent,
  BaseExtractor,
  MarkdownExtractor,
  PlainTextExtractor,
  CodeExtractor,
  JsonExtractor,
  YamlExtractor,
} from './extraction';

// Chunking
export {
  estimateTokens,
  chunkBySections,
  chunkByCodeBlocks,
  chunkByParagraphs,
  chunkDocument,
} from './chunking';

// Embedding
export {
  embed,
  generateQuestions,
  generateEmbeddings,
  embedDocument,
  cosineSimilarity,
  findSimilarChunks,
} from './embedding';

// Relationships
export {
  mapRelationships,
  findConversationReferences,
  findSimilarDocuments,
  extractEntities,
  findExplicitLinks,
} from './relationships';

// Storage
export {
  storeDocument,
  getDocument,
  getUserDocuments,
  deleteDocument,
  updateDocument,
  retrieveByDocumentName,
  retrieveByConcept,
  retrieveByTime,
  retrieveAcrossProjects,
  getStats,
  clearStores,
} from './storage';

// Pipeline
export {
  indexDocument,
  removeFromIndex,
  reindexDocument,
  initializeEventHandler,
  queryDocuments,
  getProgress,
} from './pipeline';

// Re-export pipeline types
export type { DocumentQuery } from './pipeline';

// Adapters - for connecting to external implementations
export * from './adapters';
export type {
  EmbeddingAdapter,
  StorageAdapter,
  LLMAdapter,
  DocumentIndexingAdapters,
  StorageSearchOptions,
  StorageSearchResult,
} from './adapters';
