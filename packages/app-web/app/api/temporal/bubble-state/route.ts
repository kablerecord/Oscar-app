/**
 * Temporal Intelligence - Bubble State API
 *
 * GET /api/temporal/bubble-state
 * Returns the current bubble state for the user including:
 * - Whether bubbles can be shown
 * - Quiet hours status
 * - Remaining interrupt budget
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getBubbleState } from '@/lib/osqr/bubble-wrapper'
import { featureFlags } from '@/lib/osqr/config'

export async function GET(req: NextRequest) {
  try {
    // Check feature flag
    if (!featureFlags.enableBubbleInterface || !featureFlags.enableTemporalIntelligence) {
      return NextResponse.json(
        {
          canShow: false,
          isQuietHours: false,
          remainingBudget: 0,
          bubblesShownToday: 0,
          disabled: true
        }
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

    // Get bubble state
    const state = await getBubbleState(userId)

    return NextResponse.json({
      canShow: state.canShow,
      isQuietHours: state.isQuietHours || false,
      remainingBudget: state.remainingBudget,
      bubblesShownToday: state.bubblesShownToday,
      currentFocusMode: state.currentFocusMode,
      nextAllowedTime: state.nextAllowedTime?.toISOString(),
    })
  } catch (error) {
    console.error('[Temporal API] Bubble state error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
