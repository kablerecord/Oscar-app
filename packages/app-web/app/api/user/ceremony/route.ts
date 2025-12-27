/**
 * Ceremony API
 *
 * GET - Fetch user's ceremony state (which ceremonies have been seen, what should show)
 * POST - Mark a tier ceremony as seen
 *
 * @see docs/features/TIER_CEREMONY_SPEC.md
 * @see docs/builds/TIER_CEREMONY_BUILD_PLAN.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import {
  CeremonyState,
  CeremonySeen,
  CeremonyTier,
  Tier,
  shouldShowCeremony,
} from '@/lib/ceremony/types'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with their workspace to check tier
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        workspaces: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get current tier from workspace (default to 'lite' if no workspace or tier)
    const workspace = user.workspaces[0]
    const currentTier = (workspace?.tier as Tier) || 'lite'

    // Parse ceremonySeen from JSON field
    const ceremonySeen: CeremonySeen = (user.ceremonySeen as CeremonySeen) || {}

    // Determine if ceremony should show
    const { shouldShow, ceremonyTier } = shouldShowCeremony(
      currentTier,
      ceremonySeen
    )

    const state: CeremonyState = {
      tier: currentTier,
      ceremonySeen,
      shouldShowCeremony: shouldShow,
      ceremonyTier,
    }

    return NextResponse.json(state)
  } catch (error) {
    console.error('[Ceremony API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ceremony state' },
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
    const { tier } = body as { tier: CeremonyTier }

    // Validate tier
    if (!tier || !['pro', 'master'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be "pro" or "master".' },
        { status: 400 }
      )
    }

    // Get current user's ceremonySeen
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { ceremonySeen: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update ceremonySeen with the new tier marked as seen
    const currentCeremonySeen: CeremonySeen =
      (user.ceremonySeen as CeremonySeen) || {}
    const updatedCeremonySeen = {
      ...currentCeremonySeen,
      [tier]: true,
    } as Record<string, boolean>

    await prisma.user.update({
      where: { id: session.user.id },
      data: { ceremonySeen: updatedCeremonySeen },
    })

    return NextResponse.json({
      success: true,
      ceremonySeen: updatedCeremonySeen,
    })
  } catch (error) {
    console.error('[Ceremony API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to mark ceremony as seen' },
      { status: 500 }
    )
  }
}
