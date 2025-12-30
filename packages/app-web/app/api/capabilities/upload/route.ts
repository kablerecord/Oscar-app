import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

/**
 * File Upload API for Capabilities
 *
 * Handles multipart form data uploads for:
 * - Images (for vision analysis)
 * - Documents (for context/RAG)
 * - Audio (for transcription)
 *
 * Files are stored temporarily and URLs are returned for use with the capabilities API.
 */

export interface UploadedFile {
  id: string
  name: string
  type: 'image' | 'document' | 'audio'
  mimeType: string
  url: string
  size: number
}

export interface UploadResponse {
  files: UploadedFile[]
  error?: string
}

// Supported MIME types by category
const SUPPORTED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'text/plain', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4'],
}

// Max file sizes by type (in bytes)
const MAX_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024,    // 10MB
  document: 25 * 1024 * 1024, // 25MB
  audio: 25 * 1024 * 1024,    // 25MB
}

function getFileType(mimeType: string): 'image' | 'document' | 'audio' | null {
  for (const [type, mimes] of Object.entries(SUPPORTED_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as 'image' | 'document' | 'audio'
    }
  }
  return null
}

function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession()
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploadedFiles: UploadedFile[] = []
    const errors: string[] = []

    for (const file of files) {
      const fileType = getFileType(file.type)

      if (!fileType) {
        errors.push(`Unsupported file type: ${file.type} for ${file.name}`)
        continue
      }

      const maxSize = MAX_SIZES[fileType]
      if (file.size > maxSize) {
        errors.push(`File too large: ${file.name} (max ${maxSize / 1024 / 1024}MB)`)
        continue
      }

      const fileId = generateFileId()

      // In a production environment, you would upload to a cloud storage service (S3, Cloudinary, etc.)
      // For now, we'll convert to a data URL for images (vision models can handle these)
      // or indicate that proper storage is needed

      let url = ''

      if (fileType === 'image') {
        // Convert image to base64 data URL for vision models
        const arrayBuffer = await file.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        url = `data:${file.type};base64,${base64}`
      } else {
        // For documents and audio, we would need proper cloud storage
        // For now, create a temporary blob URL reference
        // In production: upload to S3/Cloudinary and return the URL
        const arrayBuffer = await file.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        url = `data:${file.type};base64,${base64}`
      }

      uploadedFiles.push({
        id: fileId,
        name: file.name,
        type: fileType,
        mimeType: file.type,
        url,
        size: file.size,
      })
    }

    const response: UploadResponse = {
      files: uploadedFiles,
    }

    if (errors.length > 0) {
      response.error = errors.join('; ')
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Upload API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
