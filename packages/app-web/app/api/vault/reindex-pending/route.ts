import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '@/lib/ai/embeddings'

/**
 * Re-index documents that are missing embeddings
 *
 * This endpoint finds documents without chunks and indexes them.
 * Designed to be called automatically when the vault page loads
 * or manually via a "Resume Indexing" button.
 */
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendEvent = async (event: {
    type: string
    documentId?: string
    title?: string
    progress?: number
    total?: number
    indexed?: number
    error?: string
    message?: string
  }) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
  }

  ;(async () => {
    try {
      const isDev = process.env.NODE_ENV === 'development'
      const session = await getServerSession()

      if (!isDev && !session?.user?.email) {
        await sendEvent({ type: 'error', error: 'Unauthorized' })
        await writer.close()
        return
      }

      const body = await req.json().catch(() => ({}))
      const { workspaceId } = body

      if (!workspaceId) {
        await sendEvent({ type: 'error', error: 'workspaceId is required' })
        await writer.close()
        return
      }

      // Find documents that have no chunks (need indexing)
      const unindexedDocs = await prisma.document.findMany({
        where: {
          workspaceId,
          chunks: { none: {} }
        },
        select: {
          id: true,
          title: true,
          textContent: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 50, // Process in batches to avoid timeout
      })

      if (unindexedDocs.length === 0) {
        await sendEvent({
          type: 'complete',
          message: 'All documents are indexed',
          indexed: 0,
          total: 0
        })
        await writer.close()
        return
      }

      await sendEvent({
        type: 'start',
        message: `Found ${unindexedDocs.length} documents to index`,
        total: unindexedDocs.length,
        indexed: 0
      })

      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < unindexedDocs.length; i++) {
        const doc = unindexedDocs[i]

        try {
          await sendEvent({
            type: 'indexing',
            documentId: doc.id,
            title: doc.title,
            progress: i,
            total: unindexedDocs.length,
            indexed: successCount
          })

          const fileContent = doc.textContent || ''
          if (!fileContent.trim()) {
            errorCount++
            await sendEvent({
              type: 'doc_error',
              documentId: doc.id,
              title: doc.title,
              error: 'Document has no content'
            })
            continue
          }

          // Chunk the text
          const chunks = chunkText(fileContent, 1000, 100)

          // Generate embeddings for each chunk
          for (let j = 0; j < chunks.length; j++) {
            const chunk = chunks[j]

            try {
              const embedding = await generateEmbedding(chunk)
              const embeddingStr = formatEmbeddingForPostgres(embedding)

              await prisma.$executeRaw`
                INSERT INTO "DocumentChunk" (id, "documentId", content, "chunkIndex", embedding, "createdAt")
                VALUES (
                  gen_random_uuid(),
                  ${doc.id},
                  ${chunk},
                  ${j},
                  ${embeddingStr}::vector,
                  NOW()
                )
              `
            } catch (chunkError) {
              console.error(`Error embedding chunk ${j} of ${doc.title}:`, chunkError)
              // Continue with other chunks even if one fails
            }
          }

          // Update document metadata
          const metadata = (await prisma.document.findUnique({
            where: { id: doc.id },
            select: { metadata: true }
          }))?.metadata as Record<string, unknown> || {}

          await prisma.document.update({
            where: { id: doc.id },
            data: {
              metadata: {
                ...metadata,
                needsIndexing: false,
                indexedAt: new Date().toISOString(),
              }
            }
          })

          successCount++
          await sendEvent({
            type: 'doc_complete',
            documentId: doc.id,
            title: doc.title,
            progress: i + 1,
            total: unindexedDocs.length,
            indexed: successCount
          })

        } catch (docError) {
          console.error(`Error indexing ${doc.title}:`, docError)
          errorCount++
          await sendEvent({
            type: 'doc_error',
            documentId: doc.id,
            title: doc.title,
            error: docError instanceof Error ? docError.message : 'Indexing failed'
          })
        }
      }

      await sendEvent({
        type: 'complete',
        message: `Indexed ${successCount} documents${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        indexed: successCount,
        total: unindexedDocs.length
      })

      await writer.close()

    } catch (error) {
      console.error('Reindex error:', error)
      await sendEvent({
        type: 'error',
        error: error instanceof Error ? error.message : 'Reindexing failed'
      })
      await writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Helper function to chunk text
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  const maxChunks = Math.ceil(text.length / (chunkSize - overlap)) + 10
  let iterations = 0

  while (start < text.length && iterations < maxChunks) {
    iterations++
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

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

    if (start <= iterations - 1) {
      start = end
    }
  }

  return chunks
}
