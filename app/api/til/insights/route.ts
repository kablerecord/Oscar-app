/**
 * TIL Insights API (J-1)
 *
 * Provides access to Temporal Intelligence Layer insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { generateInsights, getContextualInsights, getProactiveMessage } from '@/lib/til/insights-generator'
import { getSnapshotRange, getThemes } from '@/lib/til/session-tracker'
import { runPatternAnalysis, compareWeeks } from '@/lib/til/pattern-detector'

const QuerySchema = z.object({
  workspaceId: z.string(),
  type: z.enum(['full', 'contextual', 'proactive', 'patterns', 'velocity']).default('full'),
  context: z.string().optional(),
  days: z.coerce.number().min(1).max(90).default(7),
})

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const params = QuerySchema.parse({
      workspaceId: searchParams.get('workspaceId'),
      type: searchParams.get('type') || 'full',
      context: searchParams.get('context'),
      days: searchParams.get('days') || '7',
    })

    const { workspaceId, type, context, days } = params

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    switch (type) {
      case 'full': {
        const insights = await generateInsights(workspaceId)
        return NextResponse.json(insights)
      }

      case 'contextual': {
        if (!context) {
          return NextResponse.json(
            { error: 'Context parameter required for contextual insights' },
            { status: 400 }
          )
        }
        const insights = await getContextualInsights(workspaceId, context)
        return NextResponse.json({ insights })
      }

      case 'proactive': {
        const message = await getProactiveMessage(workspaceId)
        return NextResponse.json({ message })
      }

      case 'patterns': {
        const patterns = await runPatternAnalysis(workspaceId)
        return NextResponse.json(patterns)
      }

      case 'velocity': {
        const [weekComparison, snapshots, themes] = await Promise.all([
          compareWeeks(workspaceId),
          getSnapshotRange(workspaceId, days),
          getThemes(workspaceId),
        ])
        return NextResponse.json({
          weekComparison,
          snapshots,
          themes: themes.slice(0, 10),
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[TIL API] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
