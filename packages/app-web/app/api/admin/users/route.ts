import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getUserActivityMetrics } from '@/lib/admin/platform-metrics'
import { z } from 'zod'

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['lastActive', 'messageCount', 'created']).default('lastActive'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * GET /api/admin/users
 *
 * Get user activity metrics for admin dashboard
 */
export async function GET(req: NextRequest) {
  const { authorized, error } = await requireAdmin()
  if (!authorized) return error

  try {
    const { searchParams } = new URL(req.url)
    const query = QuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    const { users, total } = await getUserActivityMetrics(query)

    return NextResponse.json({
      users,
      total,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + users.length < total,
      },
    })
  } catch (err) {
    console.error('Admin users error:', err)

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: err.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
