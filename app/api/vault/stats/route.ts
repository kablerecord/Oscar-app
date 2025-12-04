import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/vault/stats
 * Get overall vault statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    const where = workspaceId ? { workspaceId } : undefined
    const chunkWhere = workspaceId
      ? { document: { workspaceId } }
      : undefined

    const [totalDocuments, totalChunks, sourceBreakdown, recentDocuments] = await Promise.all([
      prisma.document.count({ where }),
      prisma.documentChunk.count({ where: chunkWhere }),
      prisma.document.groupBy({
        by: ['sourceType'],
        _count: { _all: true },
        where,
      }),
      prisma.document.findMany({
        where,
        select: {
          id: true,
          title: true,
          sourceType: true,
          createdAt: true,
          _count: { select: { chunks: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    return NextResponse.json({
      totalDocuments,
      totalChunks,
      sourceBreakdown: sourceBreakdown.map((s) => ({
        type: s.sourceType,
        count: s._count._all,
      })),
      recentDocuments: recentDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        sourceType: doc.sourceType,
        createdAt: doc.createdAt,
        chunkCount: doc._count.chunks,
      })),
    })
  } catch (error) {
    console.error('Vault stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
