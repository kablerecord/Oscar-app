/**
 * Feedback API
 *
 * POST - Submit user feedback
 *
 * Tracks feedback from multiple sources (button, natural language, response rating)
 * to enable training pattern measurement (button vs natural language usage).
 *
 * @see docs/builds/V1_POLISH_BUILD_PLAN.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { getTelemetryCollector } from '@/lib/telemetry/TelemetryCollector'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      rating,
      sentiment,
      message,
      source,
      messageId,
      conversationId,
      responseMode,
      workspaceId,
      // Legacy fields for backward compatibility
      type,
      email,
    } = body

    // Handle legacy feedback format (for existing feedback forms)
    if (type && message && !source) {
      // Legacy format - use the old flow but track properly
      let resolvedWorkspaceId = workspaceId
      if (!resolvedWorkspaceId) {
        const workspace = await prisma.workspace.findFirst({
          where: { ownerId: session.user.id },
          select: { id: true },
        })
        resolvedWorkspaceId = workspace?.id || null
      }

      // Store in UserFeedback table with BUTTON source (legacy = button usage)
      await prisma.userFeedback.create({
        data: {
          userId: session.user.id,
          workspaceId: resolvedWorkspaceId,
          message: message,
          source: 'BUTTON',
          pageUrl: request.headers.get('referer') || null,
        },
      })

      // Track telemetry
      const collector = getTelemetryCollector()
      await collector.trackFeedbackSubmitted(
        session.user.id,
        resolvedWorkspaceId || undefined,
        'button'
      )

      console.log('[Feedback Received - Legacy]', {
        type,
        message,
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({ success: true })
    }

    // New feedback format with source tracking
    const validSources = ['BUTTON', 'NATURAL_LANGUAGE', 'RESPONSE_RATING']
    const feedbackSource = source || 'BUTTON'

    if (!validSources.includes(feedbackSource)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be BUTTON, NATURAL_LANGUAGE, or RESPONSE_RATING.' },
        { status: 400 }
      )
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Invalid rating. Must be between 1 and 5.' },
        { status: 400 }
      )
    }

    // Get workspace if not provided
    let resolvedWorkspaceId = workspaceId
    if (!resolvedWorkspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: { ownerId: session.user.id },
        select: { id: true },
      })
      resolvedWorkspaceId = workspace?.id || null
    }

    // Store feedback in database
    const feedback = await prisma.userFeedback.create({
      data: {
        userId: session.user.id,
        workspaceId: resolvedWorkspaceId,
        rating: rating || null,
        sentiment: sentiment || null,
        message: message || null,
        source: feedbackSource as 'BUTTON' | 'NATURAL_LANGUAGE' | 'RESPONSE_RATING',
        messageId: messageId || null,
        conversationId: conversationId || null,
        responseMode: responseMode || null,
        pageUrl: request.headers.get('referer') || null,
      },
    })

    // Track telemetry
    const collector = getTelemetryCollector()
    await collector.trackFeedbackSubmitted(
      session.user.id,
      resolvedWorkspaceId || undefined,
      feedbackSource === 'BUTTON'
        ? 'button'
        : feedbackSource === 'NATURAL_LANGUAGE'
        ? 'natural_language'
        : 'response_rating',
      sentiment || undefined
    )

    console.log('[Feedback Received]', {
      source: feedbackSource,
      sentiment,
      rating,
      userId: session.user.id,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
    })
  } catch (error) {
    console.error('[Feedback API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

/**
 * GET - Fetch feedback stats (for training pattern measurement)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get stats for all feedback (not just this user) to measure button vs natural language ratio
    const stats = await prisma.userFeedback.groupBy({
      by: ['source'],
      _count: true,
    })

    const sourceStats = stats.reduce(
      (acc, { source, _count }) => {
        acc[source] = _count
        return acc
      },
      {} as Record<string, number>
    )

    const buttonCount = sourceStats['BUTTON'] || 0
    const naturalCount = sourceStats['NATURAL_LANGUAGE'] || 0
    const total = buttonCount + naturalCount

    // Calculate ratio (goal: natural language > button usage)
    const ratio = buttonCount > 0 ? naturalCount / buttonCount : 0

    return NextResponse.json({
      totalFeedback: Object.values(sourceStats).reduce((a, b) => a + b, 0),
      bySource: sourceStats,
      trainingMetrics: {
        buttonCount,
        naturalLanguageCount: naturalCount,
        ratio: ratio.toFixed(2),
        goal: 'Natural language > button (ratio > 1.0)',
        readyToRemoveButton: ratio >= 10, // Remove button when 10:1 ratio achieved
      },
    })
  } catch (error) {
    console.error('[Feedback API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback stats' },
      { status: 500 }
    )
  }
}
