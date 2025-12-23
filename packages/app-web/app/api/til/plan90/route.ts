/**
 * 90-Day Planning API (TIL)
 *
 * Generates calibrated 90-day plans based on actual execution history.
 *
 * POST /api/til/plan90
 * Body: { workspaceId, targetRevenue?, targetLaunchDate?, mode: "realistic" | "aggressive" }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import {
  generatePlan90,
  formatPlanForChat,
  type Plan90Request,
} from '@/lib/til/planner'

const RequestSchema = z.object({
  workspaceId: z.string(),
  targetRevenue: z.number().optional(),
  targetLaunchDate: z.string().optional(),
  mode: z.enum(['realistic', 'aggressive']).default('realistic'),
  lookbackDays: z.number().min(7).max(365).default(90),
  format: z.enum(['json', 'chat']).default('json'),
})

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const params = RequestSchema.parse(body)

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.workspaceId },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Generate the plan
    const planRequest: Plan90Request = {
      workspaceId: params.workspaceId,
      targetRevenue: params.targetRevenue,
      targetLaunchDate: params.targetLaunchDate,
      mode: params.mode,
      lookbackDays: params.lookbackDays,
    }

    console.log('[Plan90] Generating plan:', {
      mode: params.mode,
      lookbackDays: params.lookbackDays,
      hasTarget: !!params.targetRevenue,
    })

    const plan = await generatePlan90(planRequest)

    console.log('[Plan90] Plan generated:', {
      weeks: plan.weeks.length,
      confidence: plan.metadata.confidenceScore,
      dataPoints: plan.metadata.dataPoints,
    })

    // Return in requested format
    if (params.format === 'chat') {
      return NextResponse.json({
        formatted: formatPlanForChat(plan),
        plan,
      })
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('[Plan90] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint for quick status check
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspaceId required' },
      { status: 400 }
    )
  }

  // Return planning capability status
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  if (!workspace) {
    return NextResponse.json(
      { error: 'Workspace not found' },
      { status: 404 }
    )
  }

  // Check how much TIL data is available
  const tilDataCount = await prisma.userSetting.count({
    where: {
      userId: workspace.ownerId,
      key: { startsWith: 'til_daily_' },
    },
  })

  return NextResponse.json({
    available: true,
    dataPoints: tilDataCount,
    confidence: tilDataCount >= 14 ? 'high' : tilDataCount >= 7 ? 'medium' : 'low',
    recommendation:
      tilDataCount < 7
        ? 'Use OSQR more to build execution history for accurate planning'
        : tilDataCount < 14
          ? 'Good data available, but 2+ weeks gives better accuracy'
          : 'Sufficient data for high-confidence planning',
  })
}
