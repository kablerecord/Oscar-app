/**
 * OpenAI Embedding Adapter
 *
 * Implements the EmbeddingAdapter interface from @osqr/core using
 * the existing OpenAI embedding functions from lib/ai/embeddings.ts
 */

import type { EmbeddingAdapter } from '@osqr/core/src/document-indexing/adapters/types'
import type { ChunkEmbeddings } from '@osqr/core/src/document-indexing/types'
import { generateEmbedding, generateEmbeddings } from '@/lib/ai/embeddings'

/**
 * OpenAI-based embedding adapter using text-embedding-ada-002 (or configured model)
 *
 * Features:
 * - Single text embedding via embed()
 * - Batch embedding via embedBatch() with automatic batching (100 texts per batch)
 * - Multi-vector embeddings for enhanced retrieval (optional)
 */
export const openAIEmbeddingAdapter: EmbeddingAdapter = {
  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    // Truncate if too long (OpenAI limit is ~8191 tokens, roughly 32k chars)
    const truncatedText = text.slice(0, 30000)
    return generateEmbedding(truncatedText)
  },

  /**
   * Generate embeddings for multiple texts in batch
   * Uses existing batching logic (100 texts per batch with rate limiting)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    // Truncate each text if too long
    const truncatedTexts = texts.map(text => text.slice(0, 30000))
    return generateEmbeddings(truncatedTexts)
  },

  /**
   * Generate multi-vector embeddings for enhanced retrieval
   *
   * Creates three embeddings per chunk:
   * - content: Direct chunk embedding
   * - contextual: Chunk + document context (summary, heading hierarchy)
   * - queryable: Hypothetical questions this chunk might answer
   */
  async embedMultiVector(
    content: string,
    context: { summary?: string; headingContext?: string[] }
  ): Promise<ChunkEmbeddings> {
    // Content embedding - just the chunk text
    const contentEmbedding = await generateEmbedding(content.slice(0, 30000))

    // Contextual embedding - includes document context
    const contextualText = [
      context.summary ? `Summary: ${context.summary}` : '',
      context.headingContext?.length
        ? `Section: ${context.headingContext.join(' > ')}`
        : '',
      `Content: ${content}`,
    ]
      .filter(Boolean)
      .join('\n')
    const contextualEmbedding = await generateEmbedding(contextualText.slice(0, 30000))

    // Queryable embedding - hypothetical questions
    // For now, we generate a simple query version
    // In Phase 2+, this could use LLM to generate actual questions
    const queryableText = `What does this text say about: ${content.slice(0, 500)}`
    const queryableEmbedding = await generateEmbedding(queryableText.slice(0, 30000))

    return {
      content: contentEmbedding,
      contextual: contextualEmbedding,
      queryable: queryableEmbedding,
    }
  },
}
