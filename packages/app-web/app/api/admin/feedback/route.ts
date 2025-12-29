/**
 * Admin Feedback API
 *
 * GET - Fetch all feedback data for admin dashboard
 *
 * Aggregates feedback from multiple sources:
 * - UserFeedback table (button, natural language, response rating)
 * - ChatMessage metadata (thumbs up/down, comments)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

const ADMIN_EMAILS = ['admin@osqr.ai', 'kablerecord@gmail.com']

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Fetch UserFeedback data with user info via separate query
    const userFeedback = await prisma.userFeedback.findMany({
      where: {
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get unique user IDs and fetch their info
    const userIds = [...new Set(userFeedback.map(f => f.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    // Aggregate by source
    const bySource = await prisma.userFeedback.groupBy({
      by: ['source'],
      where: { createdAt: { gte: since } },
      _count: true,
    })

    const sourceStats = bySource.reduce(
      (acc, { source, _count }) => {
        acc[source] = _count
        return acc
      },
      {} as Record<string, number>
    )

    // Aggregate by sentiment
    const bySentiment = await prisma.userFeedback.groupBy({
      by: ['sentiment'],
      where: {
        createdAt: { gte: since },
        sentiment: { not: null },
      },
      _count: true,
    })

    const sentimentStats = bySentiment.reduce(
      (acc, { sentiment, _count }) => {
        if (sentiment) acc[sentiment] = _count
        return acc
      },
      {} as Record<string, number>
    )

    // Calculate training metrics (button vs natural language ratio)
    const buttonCount = sourceStats['BUTTON'] || 0
    const naturalCount = sourceStats['NATURAL_LANGUAGE'] || 0
    const ratio = buttonCount > 0 ? naturalCount / buttonCount : naturalCount > 0 ? Infinity : 0

    // Fetch chat message feedback (from metadata) - simplified query
    // We fetch recent messages and filter for those with feedback in metadata
    let messagesWithFeedback: {
      id: string
      content: string
      metadata: unknown
      createdAt: Date
      thread: { workspaceId: string } | null
    }[] = []

    try {
      const recentMessages = await prisma.chatMessage.findMany({
        where: {
          createdAt: { gte: since },
        },
        select: {
          id: true,
          content: true,
          metadata: true,
          createdAt: true,
          thread: {
            select: {
              workspaceId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })

      // Filter for messages with feedback in metadata
      messagesWithFeedback = recentMessages.filter((msg) => {
        const metadata = msg.metadata as Record<string, unknown> | null
        return metadata?.feedback || metadata?.comment
      })
    } catch (chatError) {
      console.error('[Admin Feedback API] Chat message query error:', chatError)
      // Continue with empty array - chat feedback is optional
    }

    // Get workspace owners for the threads
    const workspaceIds = [...new Set(messagesWithFeedback.map(m => m.thread?.workspaceId).filter(Boolean))] as string[]
    const workspaces = await prisma.workspace.findMany({
      where: { id: { in: workspaceIds } },
      select: { id: true, owner: { select: { email: true, name: true } } },
    })
    const workspaceMap = new Map(workspaces.map(w => [w.id, w.owner]))

    // Process chat feedback
    const chatFeedback = messagesWithFeedback.map((msg) => {
      const metadata = msg.metadata as Record<string, unknown> | null
      const workspaceId = msg.thread?.workspaceId
      const owner = workspaceId ? workspaceMap.get(workspaceId) : null
      return {
        id: msg.id,
        content: msg.content?.substring(0, 200) + (msg.content && msg.content.length > 200 ? '...' : ''),
        feedback: metadata?.feedback as string | undefined,
        comment: metadata?.comment as string | undefined,
        feedbackAt: metadata?.feedbackAt as string | undefined,
        commentAt: metadata?.commentAt as string | undefined,
        createdAt: msg.createdAt,
        user: owner ? { email: owner.email, name: owner.name } : null,
      }
    }).filter(f => f.feedback || f.comment)

    // Count thumbs up/down
    const thumbsUp = chatFeedback.filter(f => f.feedback === 'good').length
    const thumbsDown = chatFeedback.filter(f => f.feedback === 'bad').length
    const withComments = chatFeedback.filter(f => f.comment).length

    // Daily feedback trend
    const dailyTrend = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "UserFeedback"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `

    const trendData = dailyTrend.map(d => ({
      date: d.date,
      count: Number(d.count),
    }))

    // Format recent feedback for display
    const recentFeedback = userFeedback.slice(0, 50).map((f) => {
      const user = userMap.get(f.userId)
      return {
        id: f.id,
        source: f.source,
        sentiment: f.sentiment,
        rating: f.rating,
        message: f.message,
        pageUrl: f.pageUrl,
        responseMode: f.responseMode,
        createdAt: f.createdAt,
        user: {
          email: user?.email || null,
          name: user?.name || null,
        },
      }
    })

    return NextResponse.json({
      summary: {
        total: userFeedback.length,
        bySource: sourceStats,
        bySentiment: sentimentStats,
        trainingMetrics: {
          buttonCount,
          naturalLanguageCount: naturalCount,
          ratio: ratio === Infinity ? '∞' : ratio.toFixed(2),
          readyToRemoveButton: ratio >= 10,
          goal: 'Natural language > button (ratio > 10.0 to remove button)',
        },
      },
      chatFeedback: {
        total: chatFeedback.length,
        thumbsUp,
        thumbsDown,
        withComments,
        recent: chatFeedback.slice(0, 30),
      },
      recentFeedback,
      trend: trendData,
      timeRange: {
        days,
        since: since.toISOString(),
      },
    })
  } catch (error) {
    console.error('[Admin Feedback API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch feedback data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
