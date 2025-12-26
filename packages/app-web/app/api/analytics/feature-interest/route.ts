import { NextRequest, NextResponse } from 'next/server'
// prisma import reserved for future analytics storage
// import { prisma } from '@/lib/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

/**
 * Track interest in upcoming features
 * This helps prioritize what to build next
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { feature } = await req.json()

    if (!feature) {
      return NextResponse.json({ error: 'Feature name required' }, { status: 400 })
    }

    // Upsert into a simple analytics table
    // For now, we'll use a simple approach - store in a JSON field on workspace settings
    // or create a dedicated analytics event

    // Log to console for now (can be picked up by Railway logs)
    console.log(`[FEATURE_INTEREST] ${feature} clicked by user ${session?.user?.id || 'anonymous'} at ${new Date().toISOString()}`)

    // If we have a logged-in user, we could store this more persistently
    if (session?.user?.id) {
      // Store the click in the user's workspace metadata or a dedicated table
      // For MVP, we'll just rely on the console log which Railway captures

      // Optionally: create an analytics event record
      // await prisma.analyticsEvent.create({ ... })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to track feature interest:', error)
    // Always return success to not block UX
    return NextResponse.json({ success: true })
  }
}

// GET endpoint to check feature interest counts (admin only)
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Only allow if user is an admin (you can expand this check)
    if (!session?.user?.email?.endsWith('@osqr.ai')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, return a placeholder - in production you'd query actual data
    return NextResponse.json({
      message: 'Check Railway logs for feature interest events',
      note: 'Search for [FEATURE_INTEREST] in logs'
    })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 })
  }
}
