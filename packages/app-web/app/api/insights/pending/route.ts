/**
 * GET /api/insights/pending
 *
 * Get pending insights for the current workspace.
 * Called by the bubble component to check for proactive messages.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import {
  getNextInsight,
  hasPendingInsights,
  getPendingCount,
  getActiveInsight,
  markDelivered,
  type InsightTrigger,
} from '@/lib/til/insight-queue'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const workspaceId = workspace.id

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const trigger = (searchParams.get('trigger') || 'idle') as InsightTrigger
    const idleSeconds = parseInt(searchParams.get('idleSeconds') || '0', 10)
    const currentTopic = searchParams.get('currentTopic') || undefined
    const isConversationActive = searchParams.get('active') === 'true'
    const deliver = searchParams.get('deliver') === 'true'

    // Check if there's an active insight already
    const activeInsight = getActiveInsight(workspaceId)
    if (activeInsight) {
      return NextResponse.json({
        hasInsight: true,
        isActive: true,
        insight: {
          id: activeInsight.id,
          type: activeInsight.type,
          title: activeInsight.title,
          message: activeInsight.message,
          priority: activeInsight.priority,
          hasExpandedContent: !!activeInsight.expandedContent,
        },
        pendingCount: getPendingCount(workspaceId),
      })
    }

    // Get next insight based on trigger
    const nextInsight = getNextInsight(workspaceId, trigger, {
      idleSeconds,
      currentTopic,
      isConversationActive,
    })

    if (!nextInsight) {
      return NextResponse.json({
        hasInsight: false,
        pendingCount: getPendingCount(workspaceId),
      })
    }

    // If deliver=true, mark as delivered
    if (deliver) {
      markDelivered(workspaceId, nextInsight.id)
    }

    return NextResponse.json({
      hasInsight: true,
      isActive: deliver,
      insight: {
        id: nextInsight.id,
        type: nextInsight.type,
        title: nextInsight.title,
        message: nextInsight.message,
        priority: nextInsight.priority,
        hasExpandedContent: !!nextInsight.expandedContent,
      },
      pendingCount: getPendingCount(workspaceId),
    })
  } catch (error) {
    console.error('[API/insights/pending] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get pending insights' },
      { status: 500 }
    )
  }
}
