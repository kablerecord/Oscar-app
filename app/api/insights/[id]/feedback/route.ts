/**
 * POST /api/insights/[id]/feedback
 *
 * Record user engagement with an insight.
 * Actions: expand, act, dismiss, ignore
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import {
  recordEngagement,
  getActiveInsight,
  type InsightFeedback,
} from '@/lib/til/insight-queue'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: insightId } = await params

    // Get user's workspace
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const workspaceId = workspace.id

    // Parse body
    const body = await request.json()
    const { action, rating, reason } = body

    if (!action || !['expand', 'act', 'dismiss', 'ignore'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: expand, act, dismiss, or ignore' },
        { status: 400 }
      )
    }

    // Record engagement
    const feedback: InsightFeedback = {
      insightId,
      action,
      rating: rating !== undefined ? Math.max(-1, Math.min(1, rating)) : undefined,
      reason,
      timestamp: new Date(),
    }

    recordEngagement(workspaceId, feedback)

    // If action is 'expand', return expanded content
    if (action === 'expand') {
      const activeInsight = getActiveInsight(workspaceId)
      if (activeInsight && activeInsight.id === insightId && activeInsight.expandedContent) {
        return NextResponse.json({
          success: true,
          expandedContent: activeInsight.expandedContent,
          sourceData: activeInsight.sourceData,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API/insights/feedback] Error:', error)
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    )
  }
}
