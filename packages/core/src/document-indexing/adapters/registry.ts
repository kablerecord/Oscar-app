/**
 * OSQR Document Indexing - Adapter Registry
 *
 * Manages registration and retrieval of adapters. Consumers (e.g., app-web)
 * register their implementations at startup, and the DIS pipeline uses
 * the registry to access them.
 *
 * Usage:
 *   // In app-web startup:
 *   import { registerAdapters } from '@osqr/core/document-indexing/adapters'
 *   registerAdapters({
 *     embedding: openAIEmbeddingAdapter,
 *     storage: prismaStorageAdapter,
 *     llm: openAILLMAdapter,
 *   })
 *
 *   // In @osqr/core pipeline:
 *   import { getEmbeddingAdapter } from '@osqr/core/document-indexing/adapters'
 *   const embedding = await getEmbeddingAdapter().embed(text)
 */

import type {
  EmbeddingAdapter,
  StorageAdapter,
  LLMAdapter,
  DocumentIndexingAdapters,
} from './types';

// ============================================================================
// Adapter Storage
// ============================================================================

let embeddingAdapter: EmbeddingAdapter | null = null;
let storageAdapter: StorageAdapter | null = null;
let llmAdapter: LLMAdapter | null = null;

// Track initialization state
let initialized = false;

// ============================================================================
// Registration Functions
// ============================================================================

/**
 * Register all adapters at once.
 * Call this during app initialization before any indexing operations.
 */
export function registerAdapters(adapters: DocumentIndexingAdapters): void {
  embeddingAdapter = adapters.embedding;
  storageAdapter = adapters.storage;
  llmAdapter = adapters.llm;
  initialized = true;

  if (process.env.NODE_ENV === 'development') {
    console.log('[OSQR DIS] Adapters registered successfully');
  }
}

/**
 * Register the embedding adapter.
 */
export function registerEmbeddingAdapter(adapter: EmbeddingAdapter): void {
  embeddingAdapter = adapter;
}

/**
 * Register the storage adapter.
 */
export function registerStorageAdapter(adapter: StorageAdapter): void {
  storageAdapter = adapter;
}

/**
 * Register the LLM adapter.
 */
export function registerLLMAdapter(adapter: LLMAdapter): void {
  llmAdapter = adapter;
}

// ============================================================================
// Retrieval Functions
// ============================================================================

/**
 * Get the embedding adapter.
 * @throws Error if no adapter is registered
 */
export function getEmbeddingAdapter(): EmbeddingAdapter {
  if (!embeddingAdapter) {
    throw new Error(
      '[OSQR DIS] No embedding adapter registered. ' +
      'Call registerAdapters() or registerEmbeddingAdapter() before using the indexing pipeline.'
    );
  }
  return embeddingAdapter;
}

/**
 * Get the storage adapter.
 * @throws Error if no adapter is registered
 */
export function getStorageAdapter(): StorageAdapter {
  if (!storageAdapter) {
    throw new Error(
      '[OSQR DIS] No storage adapter registered. ' +
      'Call registerAdapters() or registerStorageAdapter() before using the indexing pipeline.'
    );
  }
  return storageAdapter;
}

/**
 * Get the LLM adapter.
 * @throws Error if no adapter is registered
 */
export function getLLMAdapter(): LLMAdapter {
  if (!llmAdapter) {
    throw new Error(
      '[OSQR DIS] No LLM adapter registered. ' +
      'Call registerAdapters() or registerLLMAdapter() before using the indexing pipeline.'
    );
  }
  return llmAdapter;
}

// ============================================================================
// Optional/Safe Retrieval
// ============================================================================

/**
 * Check if the embedding adapter is available.
 */
export function hasEmbeddingAdapter(): boolean {
  return embeddingAdapter !== null;
}

/**
 * Check if the storage adapter is available.
 */
export function hasStorageAdapter(): boolean {
  return storageAdapter !== null;
}

/**
 * Check if the LLM adapter is available.
 */
export function hasLLMAdapter(): boolean {
  return llmAdapter !== null;
}

/**
 * Check if all adapters are registered and ready.
 */
export function isInitialized(): boolean {
  return initialized && embeddingAdapter !== null && storageAdapter !== null && llmAdapter !== null;
}

/**
 * Get the embedding adapter if available, otherwise return null.
 * Use this when embedding is optional (e.g., fallback to mock for testing).
 */
export function getEmbeddingAdapterOrNull(): EmbeddingAdapter | null {
  return embeddingAdapter;
}

/**
 * Get the storage adapter if available, otherwise return null.
 */
export function getStorageAdapterOrNull(): StorageAdapter | null {
  return storageAdapter;
}

/**
 * Get the LLM adapter if available, otherwise return null.
 */
export function getLLMAdapterOrNull(): LLMAdapter | null {
  return llmAdapter;
}

// ============================================================================
// Reset (for testing)
// ============================================================================

/**
 * Clear all registered adapters.
 * Only use this in tests.
 */
export function clearAdapters(): void {
  embeddingAdapter = null;
  storageAdapter = null;
  llmAdapter = null;
  initialized = false;
}
