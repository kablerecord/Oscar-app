import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { getThrottleStatus, type UserTier } from '@/lib/osqr/throttle-wrapper'

const isDev = process.env.NODE_ENV === 'development'

/**
 * GET /api/oscar/budget
 *
 * Get the current user's query budget status.
 * Returns tier, queries remaining, budget state, and status message.
 */
export async function GET(req: NextRequest) {
  try {
    // Get workspaceId from query params
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    // Auth check with dev bypass
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || 'dev-user'

    if (!isDev && !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify workspace ownership
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId },
      select: { id: true, ownerId: true, tier: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    if (!isDev && workspace.ownerId !== session?.user?.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Map workspace tier to throttle tier
    const tier = mapWorkspaceTierToThrottleTier(workspace.tier)

    // Get throttle status
    const status = getThrottleStatus(userId, tier)

    return NextResponse.json({
      tier: status.tier,
      canQuery: status.canQuery,
      queriesRemaining: status.queriesRemaining,
      queriesTotal: status.queriesTotal,
      budgetState: status.budgetState,
      statusMessage: status.statusMessage,
      degraded: status.degraded,
      upgradeAvailable: status.upgradeAvailable,
      // Calculate percentage for UI display
      percentRemaining: status.queriesTotal > 0
        ? Math.round((status.queriesRemaining / status.queriesTotal) * 100)
        : 100,
    })
  } catch (error) {
    console.error('[Budget API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Map workspace tier strings to Throttle tier type
 */
function mapWorkspaceTierToThrottleTier(workspaceTier: string | null): UserTier {
  switch (workspaceTier?.toLowerCase()) {
    case 'starter':
    case 'lite': // Legacy support
    case 'free':
      return 'starter'
    case 'pro':
      return 'pro'
    case 'master':
      return 'master'
    case 'enterprise':
      return 'enterprise'
    default:
      return 'starter' // Default to starter (lowest tier)
  }
}
