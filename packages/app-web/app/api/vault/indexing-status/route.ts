import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'

/**
 * Indexing Status API
 *
 * Returns the current indexing status for a workspace.
 * Used by the VaultStats component for polling progress.
 *
 * Response includes:
 * - Document counts (total, indexed, unindexed)
 * - Task counts (pending, running, failed)
 * - Current document being indexed
 * - Whether indexing is in progress
 */
export async function GET(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return Response.json({ error: 'workspaceId required' }, { status: 400 })
    }

    // Get document counts
    const [totalDocuments, indexedDocuments] = await Promise.all([
      prisma.document.count({
        where: { workspaceId }
      }),
      prisma.document.count({
        where: {
          workspaceId,
          chunks: { some: {} }
        }
      })
    ])

    // Get task counts
    const [pendingTasks, runningTasks, failedTasks] = await Promise.all([
      prisma.backgroundTask.count({
        where: {
          workspaceId,
          type: 'index-document',
          status: 'pending'
        }
      }),
      prisma.backgroundTask.count({
        where: {
          workspaceId,
          type: 'index-document',
          status: 'running'
        }
      }),
      prisma.backgroundTask.count({
        where: {
          workspaceId,
          type: 'index-document',
          status: 'failed'
        }
      })
    ])

    // Get current running task info
    let currentDocument: string | null = null

    const currentTask = await prisma.backgroundTask.findFirst({
      where: {
        workspaceId,
        type: 'index-document',
        status: 'running'
      },
      select: {
        id: true,
        payload: true,
        startedAt: true
      }
    })

    if (currentTask) {
      const payload = currentTask.payload as { documentId?: string }
      if (payload.documentId) {
        const doc = await prisma.document.findUnique({
          where: { id: payload.documentId },
          select: { title: true }
        })
        currentDocument = doc?.title || null
      }
    }

    // Get recent failures for debugging
    const recentFailures = await prisma.backgroundTask.findMany({
      where: {
        workspaceId,
        type: 'index-document',
        status: 'failed'
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        error: true,
        payload: true
      }
    })

    const failedDocs = await Promise.all(
      recentFailures.map(async (t) => {
        const payload = t.payload as { documentId?: string }
        if (payload.documentId) {
          const doc = await prisma.document.findUnique({
            where: { id: payload.documentId },
            select: { title: true }
          })
          return { id: t.id, title: doc?.title, error: t.error }
        }
        return null
      })
    )

    const unindexedCount = totalDocuments - indexedDocuments
    const indexedPercent = totalDocuments > 0
      ? Math.round((indexedDocuments / totalDocuments) * 100)
      : 100

    return Response.json({
      totalDocuments,
      indexedDocuments,
      unindexedCount,
      indexedPercent,
      pendingTasks,
      runningTasks,
      failedTasks,
      isIndexing: runningTasks > 0 || pendingTasks > 0,
      currentDocument,
      recentFailures: failedDocs.filter(Boolean),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Indexing status error:', error)
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to get status'
    }, { status: 500 })
  }
}
