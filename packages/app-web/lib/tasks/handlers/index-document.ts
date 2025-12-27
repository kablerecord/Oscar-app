import { prisma } from '@/lib/db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '@/lib/ai/embeddings'
import type { Task } from '../queue'
import type { TaskContext } from '../executor'

export interface IndexDocumentPayload {
  documentId: string
  workspaceId: string
}

/**
 * Task handler for indexing a single document
 *
 * This handler:
 * 1. Fetches the document from the database
 * 2. Skips if already indexed (has chunks)
 * 3. Chunks the text content
 * 4. Generates embeddings for each chunk via OpenAI
 * 5. Stores chunks with embeddings in DocumentChunk table
 * 6. Updates document metadata to mark as indexed
 */
export async function indexDocumentHandler(
  task: Task,
  context: TaskContext
): Promise<Record<string, unknown>> {
  const payload = task.payload as IndexDocumentPayload
  const { documentId, workspaceId } = payload

  context.log(`Starting indexing for document ${documentId}`)

  // Get document
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { _count: { select: { chunks: true } } }
  })

  if (!document) {
    throw new Error(`Document ${documentId} not found`)
  }

  // Skip if already indexed
  if (document._count.chunks > 0) {
    context.log(`Document already has ${document._count.chunks} chunks, skipping`)
    return { status: 'skipped', reason: 'already indexed', chunksExisting: document._count.chunks }
  }

  const fileContent = document.textContent || ''
  if (!fileContent.trim()) {
    throw new Error(`Document "${document.title}" has no content`)
  }

  context.updateProgress(5, `Chunking "${document.title}"`)

  // Chunk the text
  const chunks = chunkText(fileContent, 1000, 100)

  if (chunks.length === 0) {
    throw new Error(`Document "${document.title}" produced no chunks`)
  }

  context.updateProgress(10, `Creating ${chunks.length} embeddings`)
  context.log(`Document has ${chunks.length} chunks to embed`)

  // Generate embeddings for each chunk
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    try {
      const embedding = await generateEmbedding(chunk)
      const embeddingStr = formatEmbeddingForPostgres(embedding)

      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, "documentId", content, "chunkIndex", embedding, "createdAt")
        VALUES (
          gen_random_uuid(),
          ${documentId},
          ${chunk},
          ${i},
          ${embeddingStr}::vector,
          NOW()
        )
      `

      successCount++

      // Update progress
      const progress = 10 + Math.round((i + 1) / chunks.length * 85)
      context.updateProgress(progress, `Chunk ${i + 1}/${chunks.length}`)

      // Check if cancelled
      if (context.checkCancelled()) {
        context.log('Task was cancelled')
        return {
          status: 'cancelled',
          chunksCreated: successCount,
          chunksTotal: chunks.length
        }
      }

    } catch (error) {
      errorCount++
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      context.log(`Error embedding chunk ${i}: ${errorMsg}`)

      // If too many errors, fail the task
      if (errorCount > 3) {
        throw new Error(`Too many embedding errors (${errorCount}). Last error: ${errorMsg}`)
      }

      // Rate limit handling - wait and retry
      if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        context.log('Rate limited, waiting 5 seconds...')
        await sleep(5000)
        i-- // Retry this chunk
        errorCount-- // Don't count rate limits as errors
        continue
      }
    }
  }

  // Update document metadata
  const metadata = (document.metadata as Record<string, unknown>) || {}
  await prisma.document.update({
    where: { id: documentId },
    data: {
      metadata: {
        ...metadata,
        needsIndexing: false,
        indexedAt: new Date().toISOString(),
        chunksCreated: successCount,
      }
    }
  })

  context.updateProgress(100, 'Complete')
  context.log(`Indexed ${successCount} chunks for "${document.title}"`)

  return {
    status: 'indexed',
    documentId,
    documentTitle: document.title,
    chunksCreated: successCount,
    chunksTotal: chunks.length,
    errors: errorCount
  }
}

/**
 * Chunk text with overlap for better context preservation
 * Tries to break at natural boundaries (periods, newlines)
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  const maxChunks = Math.ceil(text.length / (chunkSize - overlap)) + 10
  let iterations = 0

  while (start < text.length && iterations < maxChunks) {
    iterations++
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    // Try to break at sentence/paragraph boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastPeriod, lastNewline)
      if (breakPoint > chunkSize / 2) {
        chunk = chunk.slice(0, breakPoint + 1)
      }
    }

    const trimmedChunk = chunk.trim()
    if (trimmedChunk.length > 0) {
      chunks.push(trimmedChunk)
    }

    const advance = Math.max(chunk.length - overlap, 1)
    start += advance

    // Safety check to prevent infinite loops
    if (start <= iterations - 1) {
      start = end
    }
  }

  return chunks
}

/**
 * Simple sleep utility for rate limit handling
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
