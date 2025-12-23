import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '@/lib/ai/embeddings'
import OpenAI from 'openai'

// Lazy initialization
let openaiClient: OpenAI | null = null
function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

/**
 * Index a document that was uploaded via fast-upload
 *
 * This generates AI summary and embeddings for a document.
 * Can be called after all uploads complete or in background.
 */
export async function POST(req: NextRequest) {
  // Create SSE stream for progress
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendEvent = async (event: {
    phase: string
    progress: number
    message: string
    data?: Record<string, unknown>
  }) => {
    await writer.write(
      encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
    )
  }

  ;(async () => {
    try {
      const isDev = process.env.NODE_ENV === 'development'
      const session = await getServerSession()

      if (!isDev && !session?.user?.email) {
        await sendEvent({ phase: 'error', progress: 0, message: 'Unauthorized' })
        await writer.close()
        return
      }

      const { documentId } = await req.json()

      if (!documentId) {
        await sendEvent({ phase: 'error', progress: 0, message: 'documentId is required' })
        await writer.close()
        return
      }

      // Get the document
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      })

      if (!document) {
        await sendEvent({ phase: 'error', progress: 0, message: 'Document not found' })
        await writer.close()
        return
      }

      const fileContent = document.textContent || ''
      if (!fileContent) {
        await sendEvent({ phase: 'error', progress: 0, message: 'Document has no content' })
        await writer.close()
        return
      }

      await sendEvent({
        phase: 'analyzing',
        progress: 10,
        message: `Analyzing "${document.title}"...`
      })

      // Generate AI summary
      const truncatedContent = fileContent.slice(0, 15000)
      let summary = ''
      let suggestedQuestions: string[] = []

      try {
        const summaryResponse = await getOpenAI().chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant helping to analyze and summarize documents. Be concise but insightful.`
            },
            {
              role: 'user',
              content: `Analyze this document and provide:
1. A brief summary (2-3 sentences)
2. 3 interesting questions

Document:
---
${truncatedContent}
---

Respond in JSON: {"summary": "...", "suggestedQuestions": ["...", "...", "..."]}`
            }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })

        const parsed = JSON.parse(summaryResponse.choices[0].message.content || '{}')
        summary = parsed.summary || 'Document indexed successfully.'
        suggestedQuestions = parsed.suggestedQuestions || []
      } catch {
        summary = 'Document indexed successfully.'
      }

      await sendEvent({
        phase: 'analyzing',
        progress: 30,
        message: 'Analysis complete',
        data: { summary }
      })

      // Chunk the text
      const chunks = chunkText(fileContent, 1000, 100)

      await sendEvent({
        phase: 'chunking',
        progress: 35,
        message: `Created ${chunks.length} chunks`
      })

      // Generate embeddings
      await sendEvent({
        phase: 'embedding',
        progress: 40,
        message: `Generating embeddings for ${chunks.length} chunks...`
      })

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = await generateEmbedding(chunk)
        const embeddingStr = formatEmbeddingForPostgres(embedding)

        await prisma.$executeRaw`
          INSERT INTO "DocumentChunk" (id, "documentId", content, "chunkIndex", embedding, "createdAt")
          VALUES (
            gen_random_uuid(),
            ${document.id},
            ${chunk},
            ${i},
            ${embeddingStr}::vector,
            NOW()
          )
        `

        if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
          const progress = 40 + Math.round((i + 1) / chunks.length * 55)
          await sendEvent({
            phase: 'embedding',
            progress,
            message: `Embedded ${i + 1} of ${chunks.length} chunks`
          })
        }
      }

      // Update document metadata to remove needsIndexing flag
      const metadata = (document.metadata as Record<string, unknown>) || {}
      await prisma.document.update({
        where: { id: documentId },
        data: {
          metadata: {
            ...metadata,
            needsIndexing: false,
            indexedAt: new Date().toISOString(),
            summary,
          }
        }
      })

      await sendEvent({
        phase: 'complete',
        progress: 100,
        message: `Successfully indexed "${document.title}"`,
        data: { documentId, chunksIndexed: chunks.length, summary, suggestedQuestions }
      })

      await writer.close()

    } catch (error) {
      console.error('Indexing error:', error)
      await sendEvent({
        phase: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Indexing failed'
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
