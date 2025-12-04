import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const QuerySchema = z.object({
  workspaceId: z.string().optional(),
  sourceType: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
})

/**
 * GET /api/vault
 * List documents in the memory vault with filtering and pagination
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const params = QuerySchema.parse({
      workspaceId: searchParams.get('workspaceId'),
      sourceType: searchParams.get('sourceType'),
      search: searchParams.get('search'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    })

    const { workspaceId, sourceType, search, page, limit } = params
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (workspaceId) {
      where.workspaceId = workspaceId
    }

    if (sourceType && sourceType !== 'all') {
      where.sourceType = sourceType
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { textContent: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get documents with pagination
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        select: {
          id: true,
          title: true,
          sourceType: true,
          originalFilename: true,
          mimeType: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { chunks: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.document.count({ where }),
    ])

    // Get source type breakdown for filters
    const sourceTypes = await prisma.document.groupBy({
      by: ['sourceType'],
      _count: { _all: true },
      where: workspaceId ? { workspaceId } : undefined,
    })

    return NextResponse.json({
      documents: documents.map((doc) => ({
        ...doc,
        chunkCount: doc._count.chunks,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        sourceTypes: sourceTypes.map((st) => ({
          type: st.sourceType,
          count: st._count._all,
        })),
      },
    })
  } catch (error) {
    console.error('Vault API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
