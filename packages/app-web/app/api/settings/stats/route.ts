import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createHash } from 'crypto'
import { UserStats } from '@/lib/badges/config'

// Hash user ID for telemetry lookups
function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').substring(0, 32)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and their workspace
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspaces: {
          take: 1,
        },
        referralsMade: {
          where: { status: 'CONVERTED' },
        },
      },
    })

    if (!user || !user.workspaces[0]) {
      const defaultStats: UserStats = {
        totalQuestions: 0,
        documentsIndexed: 0,
        profileComplete: false,
        totalActiveDays: 0,
        activeDaysThisMonth: 0,
        consecutiveMonthsActive: 0,
        thoughtfulModeUses: 0,
        contemplateModeUses: 0,
        deepConversations: 0,
        refineFireUses: 0,
        convertedReferrals: 0,
        featuresUsed: [],
        artifactsCreated: 0,
        isFoundingMember: false,
        accountCreatedAt: new Date(),
      }
      return NextResponse.json(defaultStats)
    }

    const workspaceId = user.workspaces[0].id
    const userIdHash = hashUserId(user.id)

    // Run all queries in parallel for performance
    const [
      totalQuestions,
      documentsIndexed,
      profileAnswerCount,
      allUserMessages,
      threadsWithMessageCounts,
      modeEvents,
      featureEvents,
      artifactsCreated,
      paidUsersBeforeMe,
      refineFireEvents,
    ] = await Promise.all([
      // Total questions
      prisma.chatMessage.count({
        where: {
          thread: { workspaceId },
          role: 'user',
        },
      }),

      // Documents indexed
      prisma.document.count({
        where: {
          workspaceId,
          chunks: { some: {} },
        },
      }),

      // Profile answers
      prisma.profileAnswer.count({
        where: { workspaceId },
      }),

      // All user messages with dates (for active days calculation)
      prisma.chatMessage.findMany({
        where: {
          thread: { workspaceId },
          role: 'user',
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),

      // Threads with message counts (for deep conversations)
      prisma.chatThread.findMany({
        where: { workspaceId },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      }),

      // Mode usage from telemetry
      prisma.telemetryEvent.findMany({
        where: {
          userIdHash,
          eventType: 'mode_selected',
        },
        select: { data: true },
      }),

      // Feature usage from telemetry
      prisma.telemetryEvent.findMany({
        where: {
          userIdHash,
          eventType: 'feature_used',
        },
        select: { data: true },
      }),

      // Artifacts created
      prisma.artifact.count({
        where: { userId: user.id },
      }),

      // Count paid users before this user (for founding member status)
      prisma.workspace.count({
        where: {
          tier: { in: ['pro', 'master'] },
          tierUpdatedAt: {
            lt: user.workspaces[0].tierUpdatedAt || new Date(),
          },
        },
      }),

      // Refine/Fire usage from telemetry
      prisma.telemetryEvent.count({
        where: {
          userIdHash,
          eventType: 'feature_used',
          data: {
            path: ['feature'],
            equals: 'refine_fire',
          },
        },
      }),
    ])

    // Calculate active days
    const activityDates = new Set(
      allUserMessages.map((m) => m.createdAt.toISOString().split('T')[0])
    )
    const totalActiveDays = activityDates.size

    // Calculate active days this month
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const activeDaysThisMonth = Array.from(activityDates).filter(
      (dateStr) => new Date(dateStr) >= thisMonthStart
    ).length

    // Calculate consecutive months active
    const consecutiveMonthsActive = calculateConsecutiveMonths(activityDates)

    // Calculate mode usage
    let thoughtfulModeUses = 0
    let contemplateModeUses = 0
    for (const event of modeEvents) {
      const data = event.data as { mode?: string }
      if (data.mode === 'thoughtful') thoughtfulModeUses++
      if (data.mode === 'contemplate') contemplateModeUses++
    }

    // Calculate deep conversations (5+ user messages in a thread = 10+ total messages roughly)
    const deepConversations = threadsWithMessageCounts.filter(
      (t) => t._count.messages >= 10
    ).length

    // Calculate features used
    const featuresUsedSet = new Set<string>()
    for (const event of featureEvents) {
      const data = event.data as { feature?: string }
      if (data.feature) {
        featuresUsedSet.add(data.feature)
      }
    }
    // Add inferred features based on activity
    if (totalQuestions > 0) featuresUsedSet.add('quick_mode')
    if (thoughtfulModeUses > 0) featuresUsedSet.add('thoughtful_mode')
    if (contemplateModeUses > 0) featuresUsedSet.add('contemplate_mode')
    if (documentsIndexed > 0) featuresUsedSet.add('vault')
    if (profileAnswerCount > 0) featuresUsedSet.add('profile')
    if (artifactsCreated > 0) featuresUsedSet.add('artifacts')

    const featuresUsed = Array.from(featuresUsedSet)

    // Determine founding member status
    // User is a founding member if they are in the first 500 paid users
    const isPaidUser = user.workspaces[0].tier === 'pro' || user.workspaces[0].tier === 'master'
    const isFoundingMember = isPaidUser && paidUsersBeforeMe < 500

    // Profile complete (3+ answers)
    const profileComplete = profileAnswerCount >= 3

    // Converted referrals
    const convertedReferrals = user.referralsMade.length

    const stats: UserStats = {
      totalQuestions,
      documentsIndexed,
      profileComplete,
      totalActiveDays,
      activeDaysThisMonth,
      consecutiveMonthsActive,
      thoughtfulModeUses,
      contemplateModeUses,
      deepConversations,
      refineFireUses: refineFireEvents,
      convertedReferrals,
      featuresUsed,
      artifactsCreated,
      isFoundingMember,
      accountCreatedAt: user.createdAt,
      firstPaidAt: user.workspaces[0].tierUpdatedAt || undefined,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

// Calculate consecutive months with activity
function calculateConsecutiveMonths(activityDates: Set<string>): number {
  if (activityDates.size === 0) return 0

  const now = new Date()
  let consecutiveMonths = 0

  // Check each month going backwards from current
  for (let i = 0; i < 24; i++) {
    const checkMonth = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = new Date(checkMonth.getFullYear(), checkMonth.getMonth(), 1)
    const monthEnd = new Date(checkMonth.getFullYear(), checkMonth.getMonth() + 1, 0)

    // Check if there's any activity in this month
    const hasActivity = Array.from(activityDates).some((dateStr) => {
      const date = new Date(dateStr)
      return date >= monthStart && date <= monthEnd
    })

    if (hasActivity) {
      consecutiveMonths++
    } else if (i > 0) {
      // Allow current month to be empty (just started), but break on past gaps
      break
    }
  }

  return consecutiveMonths
}
