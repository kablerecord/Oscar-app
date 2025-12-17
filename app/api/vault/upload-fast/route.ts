import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { canUploadDocument, canUploadFileSize } from '@/lib/tiers/check'
import { parsePDF } from '@/lib/utils/pdf-parser'

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
    } else {
      try {
        fileContent = await file.text()
      } catch {
        return Response.json({
          error: 'Unsupported file type. Please upload a PDF, DOCX, TXT, MD, or JSON file.'
        }, { status: 400 })
      }
    }

    if (!fileContent.trim()) {
      return Response.json({ error: 'File appears to be empty' }, { status: 400 })
    }

    const charCount = fileContent.length
    const wordCount = fileContent.split(/\s+/).filter(w => w.length > 0).length

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
