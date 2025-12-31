/**
 * Temporal Intelligence - Preferences API
 *
 * GET /api/temporal/preferences
 * Returns user's temporal preferences.
 *
 * PUT /api/temporal/preferences
 * Updates user's temporal preferences.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { getPreferences, updatePreferences } from '@/lib/osqr/temporal-wrapper'
import { featureFlags } from '@/lib/osqr/config'

const UpdateSchema = z.object({
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  criticalCategories: z.array(z.string()).optional(),
  preferredDigestTime: z.string().optional(),
  realtimeTolerance: z.number().min(0).max(1).optional(),
  categoryWeights: z.record(z.string(), z.number()).optional(),
})

export async function GET(req: NextRequest) {
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

    // Get preferences
    const preferences = await getPreferences(userId)

    if (!preferences) {
      // Return defaults if no preferences set
      return NextResponse.json({
        preferences: {
          quietHoursStart: '21:00',
          quietHoursEnd: '07:00',
          criticalCategories: ['financial', 'health', 'family'],
          preferredDigestTime: '08:00',
          realtimeTolerance: 0.5,
          categoryWeights: {},
        },
        isDefault: true,
      })
    }

    return NextResponse.json({
      preferences,
      isDefault: false,
    })
  } catch (error) {
    console.error('[Temporal API] Get preferences error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
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
    const updates = UpdateSchema.parse(body)

    // Update preferences
    const result = await updatePreferences(userId, updates)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    // Get updated preferences
    const preferences = await getPreferences(userId)

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    console.error('[Temporal API] Update preferences error:', error)

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
