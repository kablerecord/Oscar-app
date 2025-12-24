/**
 * OSQR Document Indexing - Adapters Module
 *
 * Provides the adapter pattern interface for connecting @osqr/core's
 * document indexing pipeline to external implementations.
 *
 * @example
 * ```typescript
 * // In app-web initialization:
 * import { registerAdapters } from '@osqr/core/document-indexing/adapters'
 *
 * registerAdapters({
 *   embedding: openAIEmbeddingAdapter,
 *   storage: prismaStorageAdapter,
 *   llm: openAILLMAdapter,
 * })
 * ```
 */

// Types
export type {
  EmbeddingAdapter,
  StorageAdapter,
  LLMAdapter,
  DocumentIndexingAdapters,
  StorageSearchOptions,
  StorageSearchResult,
} from './types';

// Registry
export {
  // Registration
  registerAdapters,
  registerEmbeddingAdapter,
  registerStorageAdapter,
  registerLLMAdapter,
  // Retrieval
  getEmbeddingAdapter,
  getStorageAdapter,
  getLLMAdapter,
  // Optional retrieval
  getEmbeddingAdapterOrNull,
  getStorageAdapterOrNull,
  getLLMAdapterOrNull,
  // Status checks
  hasEmbeddingAdapter,
  hasStorageAdapter,
  hasLLMAdapter,
  isInitialized,
  // Testing
  clearAdapters,
} from './registry';
