/**
 * Temporal Intelligence - Morning Digest API
 *
 * GET /api/temporal/digest
 * Returns the morning digest for the current user with prioritized commitments.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getMorningDigest } from '@/lib/osqr/temporal-wrapper'
import { featureFlags } from '@/lib/osqr/config'

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

    // Get the digest
    const digest = await getMorningDigest(userId)

    // Convert to BubbleSuggestion format for UI compatibility
    const suggestions = digest.items.map((item) => ({
      id: item.commitment.id,
      type: item.isUrgent ? 'realtime' : 'digest_item',
      commitment: item.commitment,
      priorityScore: item.priorityScore,
      suggestedAction: item.suggestedAction,
      dismissAction: 'Mark as done or dismiss',
    }))

    return NextResponse.json({
      suggestions,
      summary: digest.summary,
      date: digest.date,
      totalItems: digest.items.length,
      urgentCount: digest.items.filter((i) => i.isUrgent).length,
    })
  } catch (error) {
    console.error('[Temporal API] Digest error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
