/**
 * OSQR Document Indexing - Multi-Vector Embeddings
 *
 * Generates multiple embedding vectors per chunk for different retrieval patterns:
 * - Content: Direct content embedding
 * - Contextual: Content + document context
 * - Queryable: Hypothetical questions this chunk answers
 *
 * Uses the adapter pattern to delegate to external implementations (e.g., OpenAI).
 */

import {
  DocumentChunk,
  IndexedDocument,
  ChunkEmbeddings,
  DocumentIndexingConfig,
  DEFAULT_INDEXING_CONFIG,
} from '../types';
import {
  getEmbeddingAdapterOrNull,
  getLLMAdapterOrNull,
} from '../adapters';

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Fallback mock embedding function for when no adapter is registered.
 * Used for testing or when running without OpenAI integration.
 */
function mockEmbed(text: string, dimensions: number): number[] {
  const embedding = new Array(dimensions).fill(0);
  const words = text.toLowerCase().split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length && j < dimensions; j++) {
      const charCode = word.charCodeAt(j);
      const index = (i + j) % dimensions;
      embedding[index] += (charCode - 97) / 26 / words.length;
    }
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

/**
 * Generate embedding for text.
 * Uses the registered EmbeddingAdapter if available, falls back to mock.
 */
export async function embed(
  text: string,
  config: DocumentIndexingConfig = DEFAULT_INDEXING_CONFIG
): Promise<number[]> {
  const adapter = getEmbeddingAdapterOrNull();

  if (adapter) {
    // Use real embedding adapter
    return adapter.embed(text, config);
  }

  // Fallback to mock for testing
  console.warn('[OSQR DIS] No embedding adapter registered, using mock embeddings');
  return mockEmbed(text, config.embeddingDimensions);
}

/**
 * Generate hypothetical questions that a chunk might answer.
 * Uses the registered LLMAdapter if available, falls back to heuristics.
 */
export async function generateQuestions(
  content: string,
  _config: DocumentIndexingConfig = DEFAULT_INDEXING_CONFIG
): Promise<string[]> {
  const adapter = getLLMAdapterOrNull();

  if (adapter) {
    try {
      return await adapter.generateQuestions(content, 3);
    } catch (error) {
      console.error('[OSQR DIS] LLM question generation failed, using fallback:', error);
    }
  }

  // Fallback: generate simple questions based on content patterns
  const questions: string[] = [];

  if (/decision|decided|chose/i.test(content)) {
    questions.push('What decisions were made?');
  }

  if (/how|process|step/i.test(content)) {
    questions.push('How does this work?');
  }

  if (/why|reason|because/i.test(content)) {
    questions.push('Why was this approach chosen?');
  }

  if (/what|define|mean/i.test(content)) {
    questions.push('What does this mean?');
  }

  if (/when|date|deadline/i.test(content)) {
    questions.push('When does this happen?');
  }

  // Default question
  if (questions.length === 0) {
    questions.push('What is this about?');
  }

  return questions;
}

/**
 * Generate multi-vector embeddings for a chunk
 */
export async function generateEmbeddings(
  chunk: Omit<DocumentChunk, 'embedding'>,
  document: Partial<IndexedDocument>,
  config: DocumentIndexingConfig = DEFAULT_INDEXING_CONFIG
): Promise<ChunkEmbeddings> {
  // Content embedding - just the chunk text
  const content = await embed(chunk.content, config);

  // Contextual embedding - includes document summary + section context
  const contextText = `
    Document: ${document.filename || 'Unknown'}
    Summary: ${document.summary || 'No summary available'}
    Section: ${chunk.metadata.headingContext.join(' > ') || 'No section'}
    Content: ${chunk.content}
  `.trim();
  const contextual = await embed(contextText, config);

  // Queryable embedding - hypothetical questions this chunk answers
  const questions = config.generateQuestions
    ? await generateQuestions(chunk.content, config)
    : [];
  const queryable = questions.length > 0
    ? await embed(questions.join('\n'), config)
    : content; // Fallback to content embedding

  return { content, contextual, queryable };
}

/**
 * Generate embeddings for all chunks in a document
 */
export async function embedDocument(
  chunks: Omit<DocumentChunk, 'embedding'>[],
  document: Partial<IndexedDocument>,
  config: DocumentIndexingConfig = DEFAULT_INDEXING_CONFIG
): Promise<DocumentChunk[]> {
  const results: DocumentChunk[] = [];

  for (const chunk of chunks) {
    const embeddings = await generateEmbeddings(chunk, document, config);

    // Use the content embedding as the primary embedding
    // Other embeddings can be stored in metadata if needed
    results.push({
      ...chunk,
      embedding: embeddings.content,
    } as DocumentChunk);
  }

  return results;
}

// ============================================================================
// Similarity Calculations
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find the most similar chunks to a query embedding
 */
export function findSimilarChunks(
  queryEmbedding: number[],
  chunks: DocumentChunk[],
  limit = 10,
  threshold = 0.5
): Array<{ chunk: DocumentChunk; similarity: number }> {
  const results = chunks
    .map((chunk) => ({
      chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((r) => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}
