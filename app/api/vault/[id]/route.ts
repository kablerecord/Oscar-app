import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/vault/[id]
 * Get a single document with its content and chunks
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            chunkIndex: true,
          },
          orderBy: { chunkIndex: 'asc' },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        sourceType: document.sourceType,
        originalFilename: document.originalFilename,
        mimeType: document.mimeType,
        textContent: document.textContent,
        metadata: document.metadata,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        chunks: document.chunks,
        chunkCount: document.chunks.length,
      },
    })
  } catch (error) {
    console.error('Vault document API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/vault/[id]
 * Delete a document and its chunks
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete document (chunks cascade due to schema)
    await prisma.document.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: `Deleted document: ${document.title}`,
    })
  } catch (error) {
    console.error('Vault delete API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
