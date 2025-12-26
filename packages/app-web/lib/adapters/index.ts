/**
 * OSQR Adapters - App-Web Implementations
 *
 * This module provides concrete implementations of the @osqr/core
 * adapter interfaces using app-web's infrastructure:
 * - OpenAI for embeddings and LLM operations
 * - Prisma + pgvector for storage and search
 *
 * @example
 * ```typescript
 * // In app initialization (e.g., instrumentation.ts or api route)
 * import { initializeAdapters } from '@/lib/adapters'
 *
 * initializeAdapters()
 * ```
 */

import { registerAdapters, isInitialized } from '@osqr/core/src/document-indexing/adapters'
import { openAIEmbeddingAdapter } from './openai-embedding-adapter'
import { prismaStorageAdapter } from './prisma-storage-adapter'
import { openAILLMAdapter } from './openai-llm-adapter'

// Re-export individual adapters for testing/customization
export { openAIEmbeddingAdapter } from './openai-embedding-adapter'
export { prismaStorageAdapter } from './prisma-storage-adapter'
export { openAILLMAdapter } from './openai-llm-adapter'

/**
 * Initialize all OSQR adapters with app-web's implementations
 *
 * Call this once during app startup before using any document indexing features.
 * Safe to call multiple times (will skip if already initialized).
 */
export function initializeAdapters(): void {
  if (isInitialized()) {
    return // Already initialized
  }

  registerAdapters({
    embedding: openAIEmbeddingAdapter,
    storage: prismaStorageAdapter,
    llm: openAILLMAdapter,
  })

  if (process.env.NODE_ENV === 'development') {
    console.log('[OSQR] Adapters initialized with app-web implementations')
  }
}

/**
 * Check if adapters have been initialized
 */
export { isInitialized } from '@osqr/core/src/document-indexing/adapters'
