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

    const tierName = (workspace?.tier || 'pro') as 'lite' | 'pro' | 'master'
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

    // Get total questions ever asked
    const totalQuestions = await prisma.usageRecord.count({
      where: {
        userId: session.user.id,
      },
    })

    // Get weekly activity breakdown (for the bar chart)
    const weeklyBreakdown: { [key: string]: number } = {
      mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
    }
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    // Get daily counts for the past 7 days
    const weeklyUsage = await prisma.usageRecord.groupBy({
      by: ['date'],
      where: {
        userId: session.user.id,
        date: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    })

    // Map the results to day names
    weeklyUsage.forEach((day) => {
      const dayOfWeek = new Date(day.date).getDay()
      const dayName = dayNames[dayOfWeek]
      weeklyBreakdown[dayName] = (weeklyBreakdown[dayName] || 0) + day._count.id
    })

    // Calculate streak - get all activity days in a single query, then count consecutive
    let currentStreak = 0
    const yearAgo = new Date()
    yearAgo.setDate(yearAgo.getDate() - 365)
    yearAgo.setHours(0, 0, 0, 0)

    // Get all distinct dates with activity in one query
    const activityDays = await prisma.usageRecord.groupBy({
      by: ['date'],
      where: {
        userId: session.user.id,
        date: {
          gte: yearAgo,
        },
      },
      _count: {
        id: true,
      },
    })

    // Create a Set of date strings for O(1) lookup
    const activityDatesSet = new Set(
      activityDays.map(day => {
        const d = new Date(day.date)
        d.setHours(0, 0, 0, 0)
        return d.toISOString().split('T')[0]
      })
    )

    // Count consecutive days starting from today
    const checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
      const dayToCheck = new Date(checkDate)
      dayToCheck.setDate(dayToCheck.getDate() - i)
      const dateStr = dayToCheck.toISOString().split('T')[0]

      if (activityDatesSet.has(dateStr)) {
        currentStreak++
      } else if (i > 0) {
        // If no activity and not today, break the streak
        break
      }
      // If today has no activity, keep checking yesterday
    }

    // Get longest streak (simplified: just use current for now, would need historical tracking)
    const longestStreak = currentStreak

    // Get member since date
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true },
    })
    const memberSince = user?.createdAt
      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Unknown'

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
        // Additional data for all views
        weeklyBreakdown,
        totalQuestions,
        longestStreak,
        memberSince,
      },
    })
  } catch (error) {
    console.error('Failed to fetch sidebar data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
