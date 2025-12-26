import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { getTierConfig, type TierName } from '@/lib/tiers/config'

/**
 * GET /api/usage
 *
 * Returns current user's token usage statistics and limits.
 * Designed for the VS Code extension usage meter.
 *
 * Response: {
 *   used: number,           // Total tokens used this month
 *   limit: number,          // Monthly token limit for tier
 *   percentage: number,     // Percentage of limit used (0-100)
 *   resetDate: string,      // ISO date when usage resets
 *   tier: string,           // User's current tier
 *   vsCodeAccess: boolean,  // Whether user can access VS Code extension
 *   breakdown: {
 *     web: number,
 *     vscode: number,
 *     mobile: number
 *   }
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view usage' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user's workspace to determine tier
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
      select: { tier: true },
    })

    const tierName = (workspace?.tier || 'pro') as TierName
    const tierConfig = getTierConfig(tierName)

    // Get current month in YYYY-MM format
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Calculate reset date (first of next month)
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Get token usage for current month by source
    const tokenUsage = await prisma.tokenUsage.findMany({
      where: {
        userId,
        month: currentMonth,
      },
      select: {
        source: true,
        tokensUsed: true,
      },
    })

    // Build breakdown
    const breakdown = {
      web: 0,
      vscode: 0,
      mobile: 0,
    }

    let totalUsed = 0
    for (const usage of tokenUsage) {
      const source = usage.source as keyof typeof breakdown
      if (source in breakdown) {
        breakdown[source] = usage.tokensUsed
        totalUsed += usage.tokensUsed
      }
    }

    // Get limit from tier config
    const limit = tierConfig.limits.monthlyTokenLimit || 2_500_000 // Default to Pro limit

    // Calculate percentage (cap at 100 for display, but actual can exceed)
    const percentage = limit > 0 ? Math.round((totalUsed / limit) * 100) : 0

    // Check VS Code access
    const vsCodeAccess = tierConfig.limits.vsCodeAccess ?? (tierName !== 'lite')

    return NextResponse.json({
      used: totalUsed,
      limit,
      percentage: Math.min(percentage, 100), // Cap display at 100%
      overLimit: totalUsed > limit,
      resetDate: resetDate.toISOString(),
      tier: tierName,
      vsCodeAccess,
      breakdown,
    })
  } catch (error) {
    console.error('Usage API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}
