import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

// Get time-based greeting
function getTimeGreeting(): { greeting: string; emoji: string } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return { greeting: 'Good morning', emoji: '☀️' }
  if (hour >= 12 && hour < 17) return { greeting: 'Good afternoon', emoji: '🌤️' }
  if (hour >= 17 && hour < 21) return { greeting: 'Good evening', emoji: '🌅' }
  return { greeting: 'Burning the midnight oil', emoji: '🌙' }
}

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

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        createdAt: true,
      },
    })

    // Get workspace info
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        name: true,
        tier: true,
        capabilityLevel: true,
        onboardingCompleted: true,
      },
    })

    // Get vault stats (document count, recent docs)
    const documentCount = await prisma.document.count({
      where: { workspaceId },
    })

    const recentDocuments = await prisma.document.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        title: true,
        createdAt: true,
      },
    })

    // Get TIL (Today I Learned) insights - recent insights surfaced
    // Note: Insight table may not exist yet, so we wrap in try-catch
    let recentInsights: { title: string; category: string; surfacedAt: Date | null }[] = []
    try {
      // @ts-expect-error - Insight table may not exist in all deployments yet
      recentInsights = await prisma.insight?.findMany?.({
        where: {
          workspaceId,
          status: 'surfaced'
        },
        orderBy: { surfacedAt: 'desc' },
        take: 3,
        select: {
          title: true,
          category: true,
          surfacedAt: true,
        },
      }) ?? []
    } catch {
      // Insight table doesn't exist yet - that's fine
      recentInsights = []
    }

    // Get profile answers for context
    const profileAnswers = await prisma.profileAnswer.findMany({
      where: { workspaceId },
      select: {
        questionId: true,
        answer: true,
      },
    })

    // Extract key profile info
    const profileContext = {
      workingOn: profileAnswers.find(a => a.questionId === 'v1-working-on')?.answer,
      goal: profileAnswers.find(a => a.questionId === 'v1-goal')?.answer,
      challenge: profileAnswers.find(a => a.questionId === 'v1-constraint')?.answer,
    }

    // Get recent MSC items (pinned items, goals, etc.)
    const pinnedItems = await prisma.mSCItem.findMany({
      where: {
        workspaceId,
        isPinned: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: {
        content: true,
        category: true,
      },
    })

    // Get usage stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayUsage = await prisma.usageRecord.count({
      where: {
        userId: session.user.id,
        date: { gte: today },
      },
    })

    const totalUsage = await prisma.usageRecord.count({
      where: { userId: session.user.id },
    })

    // Calculate streak
    let currentStreak = 0
    const checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate)
      dayStart.setDate(dayStart.getDate() - i)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const hadActivity = await prisma.usageRecord.count({
        where: {
          userId: session.user.id,
          date: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })

      if (hadActivity > 0) {
        currentStreak++
      } else if (i > 0) {
        break
      }
    }

    // Get time-based greeting
    const timeGreeting = getTimeGreeting()

    // Build personalized message
    const firstName = user?.name?.split(' ')[0] || 'there'

    // Generate contextual message based on what we know
    let contextualMessages: string[] = []

    // Time-based context
    if (timeGreeting.emoji === '🌙') {
      contextualMessages.push("Late night thinking session? I'm here for it.")
    }

    // Streak encouragement
    if (currentStreak >= 7) {
      contextualMessages.push(`${currentStreak} day streak - you're building something good here.`)
    } else if (currentStreak >= 3) {
      contextualMessages.push(`${currentStreak} days in a row. Momentum is building.`)
    }

    // Vault context
    if (documentCount > 0) {
      contextualMessages.push(`I've got ${documentCount} documents in your vault ready to help.`)
    } else {
      contextualMessages.push("Your vault is empty - index some documents and I'll remember everything for you.")
    }

    // Project/goal context
    if (profileContext.workingOn) {
      contextualMessages.push(`Still working on "${profileContext.workingOn}"? Let's make progress.`)
    }

    if (profileContext.goal) {
      contextualMessages.push(`Keeping your eye on: "${profileContext.goal}"`)
    }

    // Recent activity context
    if (recentInsights.length > 0) {
      contextualMessages.push(`Found ${recentInsights.length} insights for you recently.`)
    }

    // New user welcome
    if (!workspace?.onboardingCompleted || totalUsage < 5) {
      contextualMessages = [
        "Welcome! I'm your personal AI thinking partner.",
        "Ask me anything - I'll help you sharpen your question first, then get the best answer.",
      ]
    }

    // Pick 2-3 messages that feel most relevant
    const selectedMessages = contextualMessages.slice(0, 3)

    return NextResponse.json({
      timeGreeting,
      firstName,
      contextualMessages: selectedMessages,
      stats: {
        vaultDocuments: documentCount,
        recentDocuments,
        currentStreak,
        todayQuestions: todayUsage,
        totalQuestions: totalUsage,
        capabilityLevel: workspace?.capabilityLevel || 1,
      },
      profile: profileContext,
      pinnedItems,
      recentInsights,
      isNewUser: !workspace?.onboardingCompleted || totalUsage < 5,
    })
  } catch (error) {
    console.error('Failed to fetch greeting data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
