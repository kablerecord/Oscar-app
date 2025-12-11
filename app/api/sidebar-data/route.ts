import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { TIERS } from '@/lib/tiers/config'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // Get workspace with tier info
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        tier: true,
        capabilityLevel: true,
      },
    })

    const tierName = (workspace?.tier || 'free') as 'pro' | 'master'
    const tierConfig = TIERS[tierName] || TIERS.pro

    // Get today's usage count
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayUsage = await prisma.usageRecord.count({
      where: {
        userId: session.user.id,
        date: {
          gte: today,
        },
      },
    })

    // Get document count
    const documentCount = await prisma.document.count({
      where: {
        workspaceId,
      },
    })

    // Get recent threads
    const recentThreads = await prisma.chatThread.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    })

    // Get pinned items from MSC
    const pinnedItems = await prisma.mSCItem.findMany({
      where: {
        workspaceId,
        isPinned: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 4,
      select: {
        id: true,
        content: true,
        category: true,
      },
    })

    // Get profile answers count
    const totalProfileQuestions = 10 // Assuming 10 profile questions
    const answeredQuestions = await prisma.profileAnswer.count({
      where: {
        workspaceId,
      },
    })

    // Get questions this week
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const questionsThisWeek = await prisma.usageRecord.count({
      where: {
        userId: session.user.id,
        date: {
          gte: sevenDaysAgo,
        },
      },
    })

    // Get total messages (insights generated)
    const insightsGenerated = await prisma.chatMessage.count({
      where: {
        thread: {
          workspaceId,
        },
        role: 'assistant',
      },
    })

    // Simple streak calculation (days with activity in the past week)
    const currentStreak = 0 // Simplified for now

    return NextResponse.json({
      quickStats: {
        queriesRemaining: Math.max(0, tierConfig.limits.panelQueriesPerDay - todayUsage),
        queriesMax: tierConfig.limits.panelQueriesPerDay,
        documentsCount: documentCount,
        documentsMax: tierConfig.limits.maxDocuments,
        capabilityLevel: workspace?.capabilityLevel || 1,
      },
      recentThreads: recentThreads.map(t => ({
        id: t.id,
        title: t.title || 'Untitled Thread',
        updatedAt: t.updatedAt.toISOString(),
      })),
      pinnedItems: pinnedItems.map(p => ({
        id: p.id,
        content: p.content,
        category: p.category,
      })),
      profileInfo: {
        completionPercent: Math.round((answeredQuestions / totalProfileQuestions) * 100),
        answeredQuestions,
        totalQuestions: totalProfileQuestions,
      },
      usageStreak: {
        currentStreak,
        questionsThisWeek,
        insightsGenerated: Math.min(insightsGenerated, 999), // Cap display at 999
      },
    })
  } catch (error) {
    console.error('Failed to fetch sidebar data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
