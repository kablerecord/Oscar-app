/**
 * Temporal Intelligence - Outcome Recording API
 *
 * POST /api/temporal/outcome
 * Records user interaction with a commitment (the critical learning loop).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { recordOutcome } from '@/lib/osqr/temporal-wrapper'
import { featureFlags } from '@/lib/osqr/config'
import { prisma } from '@/lib/db/prisma'

const RequestSchema = z.object({
  commitmentId: z.string().min(1),
  engagement: z.enum(['opened', 'tapped', 'acted', 'dismissed', 'snoozed']),
  notificationType: z.enum(['digest', 'realtime', 'evening', 'passive']).optional(),
  feedback: z.enum(['stop_this_type', 'more_like_this']).optional(),
  timeToEngagement: z.number().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Check feature flag
    if (!featureFlags.enableTemporalIntelligence) {
      return NextResponse.json(
        { error: 'Temporal Intelligence is disabled' },
        { status: 503 }
      )
    }

    // Authenticate
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as { id?: string }).id || session.user.email

    // Parse request
    const body = await req.json()
    const { commitmentId, engagement, notificationType, feedback, timeToEngagement } =
      RequestSchema.parse(body)

    // Verify commitment belongs to this user
    const commitment = await prisma.tILCommitment.findFirst({
      where: {
        id: commitmentId,
        userId,
      },
    })

    if (!commitment) {
      return NextResponse.json(
        { error: 'Commitment not found or access denied' },
        { status: 404 }
      )
    }

    // Record the outcome
    const result = await recordOutcome(commitmentId, engagement, {
      notificationType,
      feedback,
      timeToEngagement,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to record outcome' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      outcomeId: result.outcomeId,
      message: `Recorded ${engagement} for commitment`,
    })
  } catch (error) {
    console.error('[Temporal API] Outcome error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
