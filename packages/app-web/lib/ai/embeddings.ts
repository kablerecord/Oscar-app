import OpenAI from 'openai'

// Lazy initialization to avoid build-time errors when API key isn't set
let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('[OSQR Embeddings] OPENAI_API_KEY environment variable is required')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// Default embedding model - text-embedding-3-small is more cost-effective and performs well
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'

// OpenAI's text-embedding-3-small produces 1536-dimensional vectors
export const EMBEDDING_DIMENSION = 1536

/**
 * Generate embedding for a single text
 * Uses text-embedding-3-small by default (can be overridden via OPENAI_EMBEDDING_MODEL)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL

  // Truncate if too long (OpenAI limit is ~8191 tokens, roughly 32k chars)
  const truncatedText = text.slice(0, 30000)

  const response = await getOpenAI().embeddings.create({
    model,
    input: truncatedText,
  })

  console.log(`[OSQR Embeddings] Generated embedding for text (${truncatedText.length} chars) using ${model}`)

  return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI allows up to 2048 texts per request
 * Uses text-embedding-3-small by default
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL

  // Truncate each text if too long
  const truncatedTexts = texts.map(text => text.slice(0, 30000))

  // OpenAI has a limit of 8191 tokens per input and 2048 inputs per request
  // We'll batch in groups of 100 to be safe
  const BATCH_SIZE = 100
  const allEmbeddings: number[][] = []

  for (let i = 0; i < truncatedTexts.length; i += BATCH_SIZE) {
    const batch = truncatedTexts.slice(i, i + BATCH_SIZE)

    const response = await getOpenAI().embeddings.create({
      model,
      input: batch,
    })

    // Extract embeddings in order
    const batchEmbeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding)

    allEmbeddings.push(...batchEmbeddings)

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < truncatedTexts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  console.log(`[OSQR Embeddings] Generated ${allEmbeddings.length} embeddings in batch using ${model}`)

  return allEmbeddings
}

/**
 * Format embedding array as PostgreSQL vector string
 * e.g., [1.0, 2.0, 3.0] -> '[1.0,2.0,3.0]'
 */
export function formatEmbeddingForPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}
