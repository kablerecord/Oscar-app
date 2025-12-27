/**
 * Privacy Settings API
 *
 * GET - Fetch user's current privacy settings
 * POST - Update privacy tier
 * DELETE - Delete all user telemetry data
 *
 * @see docs/builds/V1_POLISH_BUILD_PLAN.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import {
  getPrivacyTierManager,
  PrivacyTier,
} from '@/lib/telemetry/PrivacyTierManager'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const manager = getPrivacyTierManager()
    const settings = await manager.getSettings(session.user.id)
    const summary = manager.getConsentSummary(settings.privacyTier)

    return NextResponse.json({
      privacyTier: settings.privacyTier,
      consentTimestamp: settings.consentTimestamp,
      consentVersion: settings.consentVersion,
      summary,
    })
  } catch (error) {
    console.error('[Privacy API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tier } = body

    // Validate tier
    if (!tier || !['A', 'B', 'C'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid privacy tier. Must be A, B, or C.' },
        { status: 400 }
      )
    }

    const manager = getPrivacyTierManager()
    await manager.updateTier(
      session.user.id,
      tier as PrivacyTier,
      'settings_page'
    )

    // Get updated settings
    const settings = await manager.getSettings(session.user.id)
    const summary = manager.getConsentSummary(settings.privacyTier)

    return NextResponse.json({
      success: true,
      privacyTier: settings.privacyTier,
      consentTimestamp: settings.consentTimestamp,
      summary,
    })
  } catch (error) {
    console.error('[Privacy API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const manager = getPrivacyTierManager()
    const report = await manager.deleteUserData(session.user.id)

    return NextResponse.json({
      success: report.success,
      deletedAt: report.deletedAt,
      itemsDeleted: report.itemsDeleted,
      errors: report.errors,
    })
  } catch (error) {
    console.error('[Privacy API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    )
  }
}
