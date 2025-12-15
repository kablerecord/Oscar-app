/**
 * GET/POST /api/insights/preferences
 *
 * Manage user preferences for insight delivery.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import {
  getPreferences,
  updatePreferences,
  muteCategory,
  unmuteCategory,
  type InsightPreferences,
  type InsightCategory,
} from '@/lib/til/insight-queue'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const preferences = getPreferences(workspace.id)
    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('[API/insights/preferences] GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to get preferences' },
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

    // Get user's workspace
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const body = await request.json()
    const { action, updates, category } = body

    let preferences: InsightPreferences

    if (action === 'mute' && category) {
      muteCategory(workspace.id, category as InsightCategory)
      preferences = getPreferences(workspace.id)
    } else if (action === 'unmute' && category) {
      unmuteCategory(workspace.id, category as InsightCategory)
      preferences = getPreferences(workspace.id)
    } else if (updates) {
      preferences = updatePreferences(workspace.id, updates)
    } else {
      return NextResponse.json(
        { error: 'Invalid request. Provide updates or action+category' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, preferences })
  } catch (error) {
    console.error('[API/insights/preferences] POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
