import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

const ADMIN_EMAILS = ['admin@osqr.ai', 'kablerecord@gmail.com']

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // Member stats
    const [totalMembers, membersByTier, newThisWeek, activeThisWeek] = await Promise.all([
      prisma.labMember.count(),
      prisma.labMember.groupBy({
        by: ['tier'],
        _count: true,
      }),
      prisma.labMember.count({
        where: { joinedAt: { gte: weekAgo } },
      }),
      prisma.labMember.count({
        where: { lastActiveAt: { gte: weekAgo } },
      }),
    ])

    const tierCounts = {
      EXPLORER: 0,
      CONTRIBUTOR: 0,
      INSIDER: 0,
    }
    membersByTier.forEach((t) => {
      tierCounts[t.tier as keyof typeof tierCounts] = t._count
    })

    // Reaction stats
    const [totalReactions, reactionsThisWeek, reactionsByType] = await Promise.all([
      prisma.quickReaction.count(),
      prisma.quickReaction.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.quickReaction.groupBy({
        by: ['reaction'],
        _count: true,
      }),
    ])

    const reactionCounts: Record<string, number> = {}
    reactionsByType.forEach((r) => {
      reactionCounts[r.reaction] = r._count
    })

    const positiveReactions = (reactionCounts['THUMBS_UP'] || 0) + (reactionCounts['UNEXPECTED_GOOD'] || 0)
    const positiveRate = totalReactions > 0 ? positiveReactions / totalReactions : 0

    // Challenge stats
    const [totalChallengeResponses, challengesThisWeek, totalChallenges] = await Promise.all([
      prisma.challengeResponse.count(),
      prisma.challengeResponse.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.challenge.count({ where: { status: 'ACTIVE' } }),
    ])

    // Deep dive stats
    const [totalDeepDiveResponses, deepDivesThisWeek] = await Promise.all([
      prisma.deepDiveResponse.count(),
      prisma.deepDiveResponse.count({
        where: { createdAt: { gte: weekAgo } },
      }),
    ])

    // Insight stats
    const [totalInsights, actionableInsights, resolvedInsights] = await Promise.all([
      prisma.labInsight.count(),
      prisma.labInsight.count({
        where: { status: { in: ['NEW', 'REVIEWING', 'ACTIONABLE'] } },
      }),
      prisma.labInsight.count({
        where: { status: 'RESOLVED' },
      }),
    ])

    // Category health (simplified - in production would calculate from reactions)
    const reactionsByCategory = await prisma.quickReaction.groupBy({
      by: ['category'],
      _count: true,
      where: {
        createdAt: { gte: periodStart },
        category: { not: null },
      },
    })

    const categoryHealth = reactionsByCategory.map((cat) => ({
      category: cat.category || 'UNKNOWN',
      sentiment: 0.5, // Would calculate from reaction types
      volume: cat._count,
      trend: 'stable' as const,
    }))

    return NextResponse.json({
      members: {
        total: totalMembers,
        byTier: tierCounts,
        newThisWeek,
        activeThisWeek,
      },
      reactions: {
        total: totalReactions,
        thisWeek: reactionsThisWeek,
        byType: reactionCounts,
        positiveRate,
      },
      challenges: {
        totalResponses: totalChallengeResponses,
        thisWeek: challengesThisWeek,
        completionRate: totalChallenges > 0 ? totalChallengeResponses / (totalMembers * totalChallenges) : 0,
      },
      deepDives: {
        totalResponses: totalDeepDiveResponses,
        thisWeek: deepDivesThisWeek,
      },
      insights: {
        total: totalInsights,
        actionable: actionableInsights,
        resolved: resolvedInsights,
      },
      categoryHealth,
    })
  } catch (error) {
    console.error('Error fetching lab overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overview' },
      { status: 500 }
    )
  }
}
