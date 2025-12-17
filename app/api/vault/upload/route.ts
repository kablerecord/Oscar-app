import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '@/lib/ai/embeddings'
import { canUploadDocument, canUploadFileSize } from '@/lib/tiers/check'
import { parsePDF } from '@/lib/utils/pdf-parser'
import OpenAI from 'openai'

// Lazy initialization to avoid build-time errors
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
 * Enhanced file upload with progress streaming
 *
 * Returns Server-Sent Events for real-time progress:
 * - phase: 'extracting' | 'analyzing' | 'chunking' | 'embedding' | 'complete'
 * - progress: 0-100
 * - message: Human-readable status
 * - data: Phase-specific data (chunks, summary, etc.)
 */
export async function POST(req: NextRequest) {
  // Create a TransformStream for SSE
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

  // Start processing in background
  ;(async () => {
    try {
      // Check authentication (with dev bypass)
      const isDev = process.env.NODE_ENV === 'development'
      const session = await getServerSession()

      if (!isDev && !session?.user?.email) {
        await sendEvent({
          phase: 'error',
          progress: 0,
          message: 'Unauthorized',
          data: { error: 'Unauthorized' }
        })
        await writer.close()
        return
      }

      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const workspaceId = formData.get('workspaceId') as string | null
      const projectId = formData.get('projectId') as string | null

      if (!file) {
        await sendEvent({
          phase: 'error',
          progress: 0,
          message: 'No file provided',
          data: { error: 'No file provided' }
        })
        await writer.close()
        return
      }

      if (!workspaceId) {
        await sendEvent({
          phase: 'error',
          progress: 0,
          message: 'workspaceId is required',
          data: { error: 'workspaceId is required' }
        })
        await writer.close()
        return
      }

      // Phase 1: Starting
      await sendEvent({
        phase: 'starting',
        progress: 5,
        message: `Preparing to process "${file.name}"...`,
        data: { fileName: file.name, fileSize: file.size }
      })

      // Check tier limits - document count
      const docCheck = await canUploadDocument(workspaceId)
      if (!docCheck.allowed) {
        await sendEvent({
          phase: 'error',
          progress: 0,
          message: docCheck.reason || 'Document limit reached',
          data: { error: 'Limit reached', upgrade: true, currentTier: docCheck.tier }
        })
        await writer.close()
        return
      }

      // Check tier limits - file size
      const sizeCheck = await canUploadFileSize(workspaceId, file.size)
      if (!sizeCheck.allowed) {
        await sendEvent({
          phase: 'error',
          progress: 0,
          message: sizeCheck.reason || 'File too large',
          data: { error: 'File too large', upgrade: true, currentTier: sizeCheck.tier }
        })
        await writer.close()
        return
      }

      // Phase 2: Extracting text
      await sendEvent({
        phase: 'extracting',
        progress: 10,
        message: 'Extracting text from file...',
      })

      let fileContent = ''
      const fileName = file.name
      const fileType = file.type

      if (fileType === 'application/pdf') {
        const buffer = Buffer.from(await file.arrayBuffer())
        const pdfData = await parsePDF(buffer)
        fileContent = pdfData.text
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        fileContent = result.value
      } else if (fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        fileContent = await file.text()
      } else if (fileType === 'application/json' || fileName.endsWith('.json')) {
        fileContent = await file.text()
      } else {
        try {
          fileContent = await file.text()
        } catch {
          await sendEvent({
            phase: 'error',
            progress: 0,
            message: 'Unsupported file type. Please upload a PDF, DOCX, TXT, MD, or JSON file.',
            data: { error: 'Unsupported file type' }
          })
          await writer.close()
          return
        }
      }

      if (!fileContent.trim()) {
        await sendEvent({
          phase: 'error',
          progress: 0,
          message: 'File appears to be empty',
          data: { error: 'Empty file' }
        })
        await writer.close()
        return
      }

      const charCount = fileContent.length
      const wordCount = fileContent.split(/\s+/).filter(w => w.length > 0).length

      await sendEvent({
        phase: 'extracting',
        progress: 20,
        message: `Extracted ${wordCount.toLocaleString()} words from file`,
        data: { charCount, wordCount }
      })

      // Phase 3: Analyzing content
      await sendEvent({
        phase: 'analyzing',
        progress: 25,
        message: 'Analyzing content with AI...',
      })

      const truncatedContent = fileContent.slice(0, 15000)

      let summary = ''
      let suggestedQuestions: string[] = []

      try {
        const summaryResponse = await getOpenAI().chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant helping to analyze and summarize documents. Be concise but insightful. Focus on key themes, important details, and what makes this document unique or valuable.`
            },
            {
              role: 'user',
              content: `Analyze this document and provide:
1. A brief summary (2-3 sentences) of what this document is about and its main themes
2. 3 interesting questions someone could ask about this content

Document content:
---
${truncatedContent}
---

Respond in this JSON format:
{
  "summary": "Your 2-3 sentence summary here",
  "suggestedQuestions": ["Question 1?", "Question 2?", "Question 3?"]
}`
            }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })

        const parsed = JSON.parse(summaryResponse.choices[0].message.content || '{}')
        summary = parsed.summary || 'Document uploaded successfully.'
        suggestedQuestions = parsed.suggestedQuestions || []
      } catch {
        summary = 'Document uploaded and indexed successfully.'
        suggestedQuestions = [
          'What are the key takeaways from this document?',
          'How does this relate to my work?',
          'What should I do next based on this?'
        ]
      }

      await sendEvent({
        phase: 'analyzing',
        progress: 40,
        message: 'Analysis complete',
        data: { summary, suggestedQuestions }
      })

      // Phase 4: Chunking
      await sendEvent({
        phase: 'chunking',
        progress: 45,
        message: 'Breaking content into searchable chunks...',
      })

      const chunks = chunkText(fileContent, 1000, 100)

      await sendEvent({
        phase: 'chunking',
        progress: 50,
        message: `Created ${chunks.length} chunks for embedding`,
        data: { chunkCount: chunks.length, avgChunkSize: Math.round(charCount / chunks.length) }
      })

      // Create or get project
      let project = await prisma.project.findFirst({
        where: projectId ? { id: projectId } : {
          workspaceId,
          name: 'Uploads'
        }
      })

      if (!project) {
        project = await prisma.project.create({
          data: {
            workspaceId,
            name: 'Uploads',
            description: 'Uploaded documents',
          }
        })
      }

      // Create document record
      const document = await prisma.document.create({
        data: {
          workspaceId,
          projectId: project.id,
          title: fileName,
          textContent: fileContent,
          sourceType: 'file_upload',
          originalFilename: fileName,
          metadata: {
            fileType,
            fileSize: file.size,
            wordCount,
            charCount,
            summary,
          }
        }
      })

      // Phase 5: Embedding
      await sendEvent({
        phase: 'embedding',
        progress: 55,
        message: `Generating embeddings for ${chunks.length} chunks...`,
        data: { totalChunks: chunks.length, currentChunk: 0 }
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

        // Send progress every 5 chunks or on last chunk
        if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
          const progress = 55 + Math.round((i + 1) / chunks.length * 40)
          await sendEvent({
            phase: 'embedding',
            progress,
            message: `Embedded ${i + 1} of ${chunks.length} chunks`,
            data: { totalChunks: chunks.length, currentChunk: i + 1 }
          })
        }
      }

      // Phase 6: Complete
      await sendEvent({
        phase: 'complete',
        progress: 100,
        message: `Successfully indexed "${fileName}"`,
        data: {
          documentId: document.id,
          fileName,
          summary,
          suggestedQuestions,
          chunksIndexed: chunks.length,
          wordCount,
          charCount,
        }
      })

      await writer.close()

    } catch (error) {
      console.error('Upload error:', error)
      await sendEvent({
        phase: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Failed to process file',
        data: { error: 'Processing failed' }
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
