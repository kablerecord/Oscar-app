import OpenAI from 'openai'

// Lazy initialization to avoid build-time errors when API key isn't set
let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// OpenAI's text-embedding-ada-002 produces 1536-dimensional vectors
export const EMBEDDING_DIMENSION = 1536

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
    input: text,
  })

  return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI allows up to 2048 texts per request
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  // OpenAI has a limit of 8191 tokens per input and 2048 inputs per request
  // We'll batch in groups of 100 to be safe
  const BATCH_SIZE = 100
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)

    const response = await getOpenAI().embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
      input: batch,
    })

    // Extract embeddings in order
    const batchEmbeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding)

    allEmbeddings.push(...batchEmbeddings)

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return allEmbeddings
}

/**
 * Format embedding array as PostgreSQL vector string
 * e.g., [1.0, 2.0, 3.0] -> '[1.0,2.0,3.0]'
 */
export function formatEmbeddingForPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}
