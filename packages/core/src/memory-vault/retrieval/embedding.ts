/**
 * Embedding Generation
 *
 * Generates vector embeddings for semantic memory storage and retrieval.
 * Uses OpenAI's text-embedding-3-small model by default.
 */

import { DEFAULT_VAULT_CONFIG } from '../types';

// Embedding configuration
const EMBEDDING_DIMENSIONS = DEFAULT_VAULT_CONFIG.embeddingDimensions;

/**
 * Embedding generation result
 */
export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokens: number;
}

/**
 * Embedding generation options
 */
export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

// In-memory cache for embeddings (development/testing)
const embeddingCache = new Map<string, EmbeddingResult>();

/**
 * Generate a deterministic mock embedding for testing
 * (In production, this would call OpenAI's embedding API)
 */
function generateMockEmbedding(text: string, dimensions: number): number[] {
  const embedding: number[] = [];

  // Create a deterministic but varied embedding based on text content
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i)) % 2147483647;
  }

  for (let i = 0; i < dimensions; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    // Normalize to [-1, 1] range
    embedding.push((seed / 1073741824) - 1);
  }

  // Normalize the vector to unit length
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );
  return embedding.map((val) => val / magnitude);
}

/**
 * Generate an embedding for text
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<EmbeddingResult> {
  const model = options.model || DEFAULT_VAULT_CONFIG.embeddingModel;
  const dimensions = options.dimensions || EMBEDDING_DIMENSIONS;

  // Check cache first
  const cacheKey = `${text}:${model}:${dimensions}`;
  const cached = embeddingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // For v1.0, use mock embeddings (production would call OpenAI API)
  // TODO: Replace with actual OpenAI API call
  const embedding = generateMockEmbedding(text, dimensions);

  const result: EmbeddingResult = {
    embedding,
    model,
    tokens: estimateTokens(text),
  };

  // Cache the result
  embeddingCache.set(cacheKey, result);

  return result;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<EmbeddingResult[]> {
  // Process in parallel
  return Promise.all(texts.map((text) => generateEmbedding(text, options)));
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
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
 * Calculate Euclidean distance between two embeddings
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Find the k most similar embeddings to a query
 */
export function findKNearest(
  queryEmbedding: number[],
  embeddings: Array<{ id: string; embedding: number[] }>,
  k: number
): Array<{ id: string; similarity: number }> {
  const scored = embeddings.map((item) => ({
    id: item.id,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, k);
}

/**
 * Estimate token count for text
 */
export function estimateTokens(text: string): number {
  // Rough approximation: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Check if embedding is valid
 */
export function isValidEmbedding(embedding: number[]): boolean {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    return false;
  }

  // Check all values are finite numbers
  for (const val of embedding) {
    if (typeof val !== 'number' || !isFinite(val)) {
      return false;
    }
  }

  return true;
}

/**
 * Normalize an embedding to unit length
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) {
    return embedding;
  }

  return embedding.map((val) => val / magnitude);
}

/**
 * Average multiple embeddings
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    return [];
  }

  const dimensions = embeddings[0].length;
  const averaged: number[] = new Array(dimensions).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimensions; i++) {
      averaged[i] += embedding[i];
    }
  }

  for (let i = 0; i < dimensions; i++) {
    averaged[i] /= embeddings.length;
  }

  return normalizeEmbedding(averaged);
}

/**
 * Clear embedding cache
 */
export function clearCache(): void {
  embeddingCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; memoryBytes: number } {
  let memoryBytes = 0;

  for (const result of embeddingCache.values()) {
    // Rough estimate: 8 bytes per float64
    memoryBytes += result.embedding.length * 8;
  }

  return {
    size: embeddingCache.size,
    memoryBytes,
  };
}
