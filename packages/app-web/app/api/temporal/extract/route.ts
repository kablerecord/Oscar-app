/**
 * Temporal Intelligence - Commitment Extraction API
 *
 * POST /api/temporal/extract
 * Extracts commitments from text and persists them to the database.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { extractCommitmentsFromText } from '@/lib/osqr/temporal-wrapper'
import { featureFlags } from '@/lib/osqr/config'

const RequestSchema = z.object({
  text: z.string().min(1).max(10000),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
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
    const { text, sourceType, sourceId } = RequestSchema.parse(body)

    // Extract and persist commitments
    const result = await extractCommitmentsFromText(text, userId, {
      sourceType,
      sourceId,
    })

    return NextResponse.json({
      commitments: result.commitments,
      persistedIds: result.persistedIds,
      count: result.commitments.length,
    })
  } catch (error) {
    console.error('[Temporal API] Extract error:', error)

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
