import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '@/lib/ai/embeddings'
import { canUploadDocument, canUploadFileSize } from '@/lib/tiers/check'
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

export async function POST(req: NextRequest) {
  try {
    // Check authentication (with dev bypass)
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const workspaceId = formData.get('workspaceId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Check tier limits - document count
    const docCheck = await canUploadDocument(workspaceId)
    if (!docCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Limit reached',
          message: docCheck.reason,
          upgrade: true,
          currentTier: docCheck.tier,
        },
        { status: 403 }
      )
    }

    // Check tier limits - file size
    const sizeCheck = await canUploadFileSize(workspaceId, file.size)
    if (!sizeCheck.allowed) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: sizeCheck.reason,
          upgrade: true,
          currentTier: sizeCheck.tier,
        },
        { status: 403 }
      )
    }

    // Extract text from file
    let fileContent = ''
    const fileName = file.name
    const fileType = file.type

    if (fileType === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer())
      // Use our custom PDF parser that avoids pdf-parse's test file bug
      const { parsePDF } = await import('@/lib/utils/pdf-parser')
      const pdfData = await parsePDF(buffer)
      fileContent = pdfData.text
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      // Handle Word documents using mammoth
      const buffer = Buffer.from(await file.arrayBuffer())
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      fileContent = result.value
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      fileContent = await file.text()
    } else if (fileType === 'application/json' || fileName.endsWith('.json')) {
      fileContent = await file.text()
    } else {
      // Try to read as text for other types
      try {
        fileContent = await file.text()
      } catch {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload a PDF, DOCX, TXT, MD, or JSON file.' },
          { status: 400 }
        )
      }
    }

    if (!fileContent.trim()) {
      return NextResponse.json(
        { error: 'File appears to be empty' },
        { status: 400 }
      )
    }

    // Truncate content for summarization (GPT-4 context limit)
    const truncatedContent = fileContent.slice(0, 15000)

    // Generate summary and suggested questions using GPT-4
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

    let summary = ''
    let suggestedQuestions: string[] = []

    try {
      const parsed = JSON.parse(summaryResponse.choices[0].message.content || '{}')
      summary = parsed.summary || 'Document uploaded successfully.'
      suggestedQuestions = parsed.suggestedQuestions || [
        'What are the key takeaways from this document?',
        'How does this relate to my work?',
        'What should I do next based on this?'
      ]
    } catch {
      summary = 'Document uploaded and indexed successfully.'
      suggestedQuestions = [
        'What are the key takeaways from this document?',
        'How does this relate to my work?',
        'What should I do next based on this?'
      ]
    }

    // Create or get project for onboarding uploads
    let project = await prisma.project.findFirst({
      where: {
        workspaceId,
        name: 'Onboarding Uploads'
      }
    })

    if (!project) {
      project = await prisma.project.create({
        data: {
          workspaceId,
          name: 'Onboarding Uploads',
          description: 'Files uploaded during onboarding',
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
          uploadedDuring: 'onboarding',
          fileType,
          fileSize: file.size
        }
      }
    })

    // Chunk the content for embeddings
    const chunks = chunkText(fileContent, 1000, 100)

    // Generate and store embeddings for each chunk
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
    }

    return NextResponse.json({
      success: true,
      fileName,
      summary,
      suggestedQuestions,
      chunksIndexed: chunks.length,
      documentId: document.id
    })

  } catch (error) {
    console.error('Index file error:', error)
    return NextResponse.json(
      { error: 'Failed to index file' },
      { status: 500 }
    )
  }
}

// Helper function to chunk text
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  // Safety: limit max chunks to prevent runaway
  const maxChunks = Math.ceil(text.length / (chunkSize - overlap)) + 10
  let iterations = 0

  while (start < text.length && iterations < maxChunks) {
    iterations++
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    // Try to end at a sentence boundary
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

    // Calculate next start position, ensuring we always advance
    const advance = Math.max(chunk.length - overlap, 1)
    start += advance

    // Additional safety: if we're not making progress, force advance
    if (start <= iterations - 1) {
      start = end
    }
  }

  return chunks
}
