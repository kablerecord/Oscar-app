import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { createHash } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { canUploadDocument, canUploadFileSize } from '@/lib/tiers/check'
import { parsePDF } from '@/lib/utils/pdf-parser'

/**
 * Generate a simple hash for content comparison
 * Uses first 10KB + last 10KB + length for speed on large files
 */
function generateContentHash(content: string): string {
  const sample = content.length > 20000
    ? content.slice(0, 10000) + content.slice(-10000) + content.length.toString()
    : content
  return createHash('md5').update(sample).digest('hex')
}

/**
 * Fast file upload endpoint
 *
 * This endpoint prioritizes speed - it extracts text and saves to DB immediately.
 * Embeddings are generated later via a background process or separate API call.
 *
 * Returns JSON with documentId for tracking.
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication (with dev bypass)
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const workspaceId = formData.get('workspaceId') as string | null
    const projectId = formData.get('projectId') as string | null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!workspaceId) {
      return Response.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // Check tier limits - document count
    const docCheck = await canUploadDocument(workspaceId)
    if (!docCheck.allowed) {
      return Response.json({
        error: docCheck.reason || 'Document limit reached',
        upgrade: true,
        currentTier: docCheck.tier
      }, { status: 403 })
    }

    // Check tier limits - file size
    const sizeCheck = await canUploadFileSize(workspaceId, file.size)
    if (!sizeCheck.allowed) {
      return Response.json({
        error: sizeCheck.reason || 'File too large',
        upgrade: true,
        currentTier: sizeCheck.tier
      }, { status: 403 })
    }

    // Extract text from file (this is the only slow part we can't avoid)
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

      // Detect AI export formats that need special handling
      if (fileContent.startsWith('[{"uuid"') || fileContent.startsWith('[{"title"')) {
        try {
          const parsed = JSON.parse(fileContent)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const first = parsed[0]
            if (first.mapping && first.create_time) {
              return Response.json({
                error: `ChatGPT export detected (${parsed.length} conversations). Use the CLI import tool for batch processing.`,
                format: 'chatgpt_json',
                conversationCount: parsed.length,
                suggestion: 'scripts/index-chatgpt-conversations.ts'
              }, { status: 400 })
            } else if (first.chat_messages && first.uuid) {
              return Response.json({
                error: `Claude export detected (${parsed.length} conversations). Use the CLI import tool for batch processing.`,
                format: 'claude_json',
                conversationCount: parsed.length,
                suggestion: 'scripts/index-claude-conversations.ts'
              }, { status: 400 })
            }
          }
        } catch {
          // Not valid JSON array, continue with normal processing
        }
      }
    } else if (fileType === 'text/html' || fileName.endsWith('.html')) {
      const htmlContent = await file.text()
      // Check if this might be a ChatGPT export (chat.html format)
      if (htmlContent.includes('conversations') && htmlContent.includes('mapping')) {
        return Response.json({
          error: 'ChatGPT HTML export detected. Use the CLI import tool for processing.',
          format: 'chatgpt_html',
          suggestion: 'scripts/index-chatgpt-conversations.ts'
        }, { status: 400 })
      }
      // Regular HTML - extract text
      fileContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    } else {
      try {
        fileContent = await file.text()
      } catch {
        return Response.json({
          error: `Unsupported file type: ${fileType || fileName.split('.').pop()}. Please upload a PDF, DOCX, TXT, MD, or JSON file.`,
          fileType: fileType || 'unknown',
          extension: fileName.split('.').pop()
        }, { status: 400 })
      }
    }

    // Sanitize text for PostgreSQL (remove null bytes which cause UTF-8 encoding errors)
    fileContent = fileContent.replace(/\x00/g, '')

    if (!fileContent.trim()) {
      return Response.json({ error: 'File appears to be empty' }, { status: 400 })
    }

    const charCount = fileContent.length
    const wordCount = fileContent.split(/\s+/).filter(w => w.length > 0).length
    const contentHash = generateContentHash(fileContent)

    // Check for duplicate files by filename in this workspace
    const existingDoc = await prisma.document.findFirst({
      where: {
        workspaceId,
        originalFilename: fileName,
      },
      select: {
        id: true,
        metadata: true,
      }
    })

    if (existingDoc) {
      const existingHash = (existingDoc.metadata as Record<string, unknown>)?.contentHash as string | undefined
      const existingSize = (existingDoc.metadata as Record<string, unknown>)?.fileSize as number | undefined

      // If hash matches (or size matches for old docs without hash), skip as duplicate
      if (existingHash === contentHash || (existingHash === undefined && existingSize === file.size)) {
        return Response.json({
          success: true,
          documentId: existingDoc.id,
          fileName,
          skipped: true,
          reason: 'unchanged',
          message: 'File already exists and is unchanged'
        })
      }

      // File has changed - update the existing document instead of creating new
      const updatedDoc = await prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          textContent: fileContent,
          metadata: {
            fileType,
            fileSize: file.size,
            wordCount,
            charCount,
            contentHash,
            needsIndexing: true,
            uploadedAt: new Date().toISOString(),
            previousVersionAt: ((existingDoc.metadata as Record<string, unknown>)?.uploadedAt as string) || null,
          }
        }
      })

      // Delete old chunks so they can be re-indexed
      await prisma.documentChunk.deleteMany({
        where: { documentId: existingDoc.id }
      })

      return Response.json({
        success: true,
        documentId: updatedDoc.id,
        fileName,
        wordCount,
        charCount,
        updated: true,
        needsIndexing: true,
        message: 'File updated (content changed)'
      })
    }

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

    // Create document record - mark as needing indexing
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
          contentHash,
          needsIndexing: true, // Flag for background indexing
          uploadedAt: new Date().toISOString(),
        }
      }
    })

    return Response.json({
      success: true,
      documentId: document.id,
      fileName,
      wordCount,
      charCount,
      needsIndexing: true,
    })

  } catch (error) {
    console.error('Fast upload error:', error)
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to upload file'
    }, { status: 500 })
  }
}
