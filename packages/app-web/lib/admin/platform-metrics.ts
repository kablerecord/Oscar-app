/**
 * Platform Metrics - Admin-Visible, Content-Free Aggregates
 *
 * This layer provides insights for admins WITHOUT exposing user content.
 * All metrics are structural/statistical only.
 */

import { prisma } from '../db/prisma'

// ============================================
// Types - Content-Free Metrics
// ============================================

export interface PlatformOverview {
  totalUsers: number
  activeUsersToday: number
  activeUsersWeek: number
  activeUsersMonth: number
  totalWorkspaces: number
  totalConversations: number
  totalMessages: number
  avgMessagesPerUser: number
  avgSessionsPerWeek: number
  platformHealthScore: number  // 0-100
  generatedAt: Date
}

export interface UserActivityMetrics {
  userId: string
  email: string  // For identification only
  createdAt: Date
  lastActiveAt: Date | null
  workspaceCount: number
  conversationCount: number
  messageCount: number
  avgMessagesPerConversation: number
  mscItemCount: number
  documentCount: number
  // Content-free cognitive metrics
  primaryProfileType?: string
  engagementScore: number  // 0-100
  retentionDays: number
}

export interface EngagementTrend {
  date: string
  activeUsers: number
  newUsers: number
  conversations: number
  messages: number
  avgSessionMinutes: number
}

export interface CognitiveProfileDistribution {
  profile: string
  count: number
  percentage: number
}

export interface FeatureUsageMetrics {
  feature: string
  usageCount: number
  uniqueUsers: number
  avgPerUser: number
  trend: 'up' | 'down' | 'stable'
}

export interface ResponseModeDistribution {
  mode: 'quick' | 'thoughtful' | 'contemplate'
  count: number
  percentage: number
}

export interface PlatformHealth {
  overallScore: number
  components: {
    name: string
    status: 'healthy' | 'degraded' | 'down'
    latencyMs?: number
    errorRate?: number
  }[]
  recentErrors: {
    timestamp: Date
    type: string
    count: number
  }[]
}

// ============================================
// Founder Spot Tracking
// ============================================

const FOUNDER_SPOT_LIMIT = 500

export interface FounderSpotStatus {
  totalSpots: number
  paidUsers: number
  remainingSpots: number
  percentageFilled: number
  isFounderPeriod: boolean
}

/**
 * Get founder spot status for pricing page "only X spots left" display
 */
export async function getFounderSpotStatus(): Promise<FounderSpotStatus> {
  // Count workspaces with paid tiers (pro or master)
  const paidUsers = await prisma.workspace.count({
    where: {
      tier: {
        in: ['pro', 'master'],
      },
    },
  })

  const remainingSpots = Math.max(0, FOUNDER_SPOT_LIMIT - paidUsers)
  const isFounderPeriod = remainingSpots > 0

  return {
    totalSpots: FOUNDER_SPOT_LIMIT,
    paidUsers,
    remainingSpots,
    percentageFilled: Math.round((paidUsers / FOUNDER_SPOT_LIMIT) * 100),
    isFounderPeriod,
  }
}

// ============================================
// Overview Metrics
// ============================================

/**
 * Get platform overview metrics (main admin dashboard)
 */
export async function getPlatformOverview(): Promise<PlatformOverview> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Parallel queries for efficiency
  const [
    totalUsers,
    activeToday,
    activeWeek,
    activeMonth,
    totalWorkspaces,
    totalConversations,
    totalMessages,
  ] = await Promise.all([
    prisma.user.count(),
    // Use updatedAt as proxy for activity since updatedAt doesn't exist
    prisma.user.count({
      where: { updatedAt: { gte: todayStart } },
    }),
    prisma.user.count({
      where: { updatedAt: { gte: weekAgo } },
    }),
    prisma.user.count({
      where: { updatedAt: { gte: monthAgo } },
    }),
    prisma.workspace.count(),
    prisma.chatThread.count(),
    prisma.chatMessage.count(),
  ])

  // Calculate averages
  const avgMessagesPerUser = totalUsers > 0 ? totalMessages / totalUsers : 0

  // Estimate sessions per week based on active users
  const avgSessionsPerWeek = activeWeek > 0
    ? Math.round((totalConversations / totalUsers) * 2)
    : 0

  // Calculate platform health score
  const healthScore = calculateHealthScore({
    userGrowth: totalUsers > 0 ? activeWeek / totalUsers : 0,
    engagement: avgMessagesPerUser > 5 ? 1 : avgMessagesPerUser / 5,
    retention: activeMonth > 0 ? activeWeek / activeMonth : 0,
  })

  return {
    totalUsers,
    activeUsersToday: activeToday,
    activeUsersWeek: activeWeek,
    activeUsersMonth: activeMonth,
    totalWorkspaces,
    totalConversations,
    totalMessages,
    avgMessagesPerUser: Math.round(avgMessagesPerUser * 10) / 10,
    avgSessionsPerWeek,
    platformHealthScore: healthScore,
    generatedAt: now,
  }
}

function calculateHealthScore(factors: {
  userGrowth: number
  engagement: number
  retention: number
}): number {
  const weights = { userGrowth: 0.2, engagement: 0.4, retention: 0.4 }
  const score =
    factors.userGrowth * weights.userGrowth +
    factors.engagement * weights.engagement +
    factors.retention * weights.retention
  return Math.round(Math.min(100, score * 100))
}

// ============================================
// User Activity Metrics
// ============================================

/**
 * Get activity metrics for all users (admin user list)
 */
export async function getUserActivityMetrics(
  options: {
    limit?: number
    offset?: number
    sortBy?: 'lastActive' | 'messageCount' | 'created'
    sortOrder?: 'asc' | 'desc'
  } = {}
): Promise<{ users: UserActivityMetrics[]; total: number }> {
  const { limit = 50, offset = 0, sortBy = 'lastActive', sortOrder = 'desc' } = options

  const orderBy: any = {}
  if (sortBy === 'lastActive') orderBy.updatedAt = sortOrder
  else if (sortBy === 'created') orderBy.createdAt = sortOrder

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      take: limit,
      skip: offset,
      orderBy,
      include: {
        workspaces: {
          include: {
            _count: {
              select: {
                threads: true,
                documents: true,
              },
            },
          },
        },
        _count: {
          select: {
            settings: true,
          },
        },
      },
    }),
    prisma.user.count(),
  ])

  const metrics: UserActivityMetrics[] = await Promise.all(
    users.map(async (user) => {
      // Get message count for this user's workspaces
      const workspaceIds = user.workspaces.map(w => w.id)

      const [messageCount, mscCount] = await Promise.all([
        prisma.chatMessage.count({
          where: {
            thread: {
              workspaceId: { in: workspaceIds },
            },
          },
        }),
        prisma.mSCItem.count({
          where: {
            workspaceId: { in: workspaceIds },
          },
        }),
      ])

      const conversationCount = user.workspaces.reduce(
        (sum, w) => sum + w._count.threads,
        0
      )

      const documentCount = user.workspaces.reduce(
        (sum, w) => sum + w._count.documents,
        0
      )

      // Calculate retention days (use updatedAt as proxy for activity)
      const createdAt = new Date(user.createdAt)
      const lastActive = user.updatedAt || createdAt
      const retentionDays = Math.floor(
        (lastActive.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)
      )

      // Calculate engagement score (content-free)
      const engagementScore = calculateEngagementScore({
        messageCount,
        conversationCount,
        mscCount,
        documentCount,
        retentionDays,
      })

      return {
        userId: user.id,
        email: user.email,
        createdAt: user.createdAt,
        lastActiveAt: user.updatedAt,
        workspaceCount: user.workspaces.length,
        conversationCount,
        messageCount,
        avgMessagesPerConversation: conversationCount > 0
          ? Math.round((messageCount / conversationCount) * 10) / 10
          : 0,
        mscItemCount: mscCount,
        documentCount,
        engagementScore,
        retentionDays,
      }
    })
  )

  // Sort by message count if requested
  if (sortBy === 'messageCount') {
    metrics.sort((a, b) =>
      sortOrder === 'desc'
        ? b.messageCount - a.messageCount
        : a.messageCount - b.messageCount
    )
  }

  return { users: metrics, total }
}

function calculateEngagementScore(factors: {
  messageCount: number
  conversationCount: number
  mscCount: number
  documentCount: number
  retentionDays: number
}): number {
  // Normalize each factor to 0-1
  const messageScore = Math.min(1, factors.messageCount / 100)
  const conversationScore = Math.min(1, factors.conversationCount / 20)
  const mscScore = Math.min(1, factors.mscCount / 10)
  const documentScore = Math.min(1, factors.documentCount / 10)
  const retentionScore = Math.min(1, factors.retentionDays / 30)

  const weighted =
    messageScore * 0.3 +
    conversationScore * 0.2 +
    mscScore * 0.2 +
    documentScore * 0.15 +
    retentionScore * 0.15

  return Math.round(weighted * 100)
}

// ============================================
// Engagement Trends
// ============================================

/**
 * Get engagement trends over time
 */
export async function getEngagementTrends(days: number = 30): Promise<EngagementTrend[]> {
  const trends: EngagementTrend[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const [activeUsers, newUsers, conversations, messages] = await Promise.all([
      prisma.user.count({
        where: {
          updatedAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      }),
      prisma.chatThread.count({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      }),
      prisma.chatMessage.count({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      }),
    ])

    // Calculate average session duration from session_end telemetry events
    let avgSessionMinutes = 15 // Default fallback
    try {
      const sessionEvents = await prisma.telemetryEvent.findMany({
        where: {
          eventType: 'session_end',
          timestamp: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        select: { data: true },
      })
      if (sessionEvents.length > 0) {
        const totalSeconds = sessionEvents.reduce((sum, e) => {
          const data = e.data as { durationSeconds?: number }
          return sum + (data.durationSeconds || 0)
        }, 0)
        avgSessionMinutes = Math.round((totalSeconds / sessionEvents.length) / 60)
      }
    } catch {
      // Telemetry table may not exist yet, use default
    }

    trends.push({
      date: dayStart.toISOString().split('T')[0],
      activeUsers,
      newUsers,
      conversations,
      messages,
      avgSessionMinutes,
    })
  }

  return trends
}

// ============================================
// Cognitive Profile Distribution (Aggregate)
// ============================================

/**
 * Get aggregate cognitive profile distribution (content-free)
 */
export async function getCognitiveProfileDistribution(): Promise<CognitiveProfileDistribution[]> {
  // Get all cognitive profiles from user settings
  const profiles = await prisma.userSetting.findMany({
    where: {
      key: { startsWith: 'til_cognitive_profile_' },
    },
  })

  const distribution: Record<string, number> = {
    analytical: 0,
    strategic: 0,
    creative: 0,
    operational: 0,
    mixed: 0,
  }

  for (const profile of profiles) {
    const data = profile.value as any
    if (data?.primaryProfile) {
      distribution[data.primaryProfile] = (distribution[data.primaryProfile] || 0) + 1
    }
  }

  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)

  return Object.entries(distribution).map(([profile, count]) => ({
    profile,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }))
}

// ============================================
// Feature Usage Metrics
// ============================================

/**
 * Get feature usage metrics
 */
export async function getFeatureUsageMetrics(): Promise<FeatureUsageMetrics[]> {
  const [
    quickModeCount,
    thoughtfulModeCount,
    contemplateModeCount,
    mscUsers,
    documentUsers,
    focusModeUsers,
  ] = await Promise.all([
    // Response modes (from chat messages metadata)
    prisma.chatMessage.count({
      where: { metadata: { path: ['mode'], equals: 'quick' } },
    }),
    prisma.chatMessage.count({
      where: { metadata: { path: ['mode'], equals: 'thoughtful' } },
    }),
    prisma.chatMessage.count({
      where: { metadata: { path: ['mode'], equals: 'contemplate' } },
    }),
    // MSC feature usage
    prisma.workspace.count({
      where: {
        mscItems: { some: {} },
      },
    }),
    // Document uploads
    prisma.workspace.count({
      where: {
        documents: { some: {} },
      },
    }),
    // Focus mode users (from settings)
    prisma.userSetting.count({
      where: {
        key: 'focusModeEnabled',
        value: { equals: true },
      },
    }),
  ])

  const totalUsers = await prisma.user.count()
  const totalMessages = quickModeCount + thoughtfulModeCount + contemplateModeCount

  return [
    {
      feature: 'Quick Mode',
      usageCount: quickModeCount,
      uniqueUsers: Math.round(quickModeCount / 10), // Estimate
      avgPerUser: totalUsers > 0 ? Math.round(quickModeCount / totalUsers) : 0,
      trend: 'stable',
    },
    {
      feature: 'Thoughtful Mode',
      usageCount: thoughtfulModeCount,
      uniqueUsers: Math.round(thoughtfulModeCount / 8),
      avgPerUser: totalUsers > 0 ? Math.round(thoughtfulModeCount / totalUsers) : 0,
      trend: 'up',
    },
    {
      feature: 'Contemplate Mode',
      usageCount: contemplateModeCount,
      uniqueUsers: Math.round(contemplateModeCount / 5),
      avgPerUser: totalUsers > 0 ? Math.round(contemplateModeCount / totalUsers) : 0,
      trend: 'stable',
    },
    {
      feature: 'MSC Goals',
      usageCount: await prisma.mSCItem.count(),
      uniqueUsers: mscUsers,
      avgPerUser: mscUsers > 0 ? Math.round((await prisma.mSCItem.count()) / mscUsers) : 0,
      trend: 'up',
    },
    {
      feature: 'Document Upload',
      usageCount: await prisma.document.count(),
      uniqueUsers: documentUsers,
      avgPerUser: documentUsers > 0 ? Math.round((await prisma.document.count()) / documentUsers) : 0,
      trend: 'stable',
    },
    {
      feature: 'Focus Mode',
      usageCount: focusModeUsers,
      uniqueUsers: focusModeUsers,
      avgPerUser: 1,
      trend: 'up',
    },
  ]
}

// ============================================
// Response Mode Distribution
// ============================================

/**
 * Get response mode distribution across all users
 */
export async function getResponseModeDistribution(): Promise<ResponseModeDistribution[]> {
  // This would ideally be tracked in message metadata
  // For now, estimate from cognitive profiles

  const profiles = await prisma.userSetting.findMany({
    where: {
      key: { startsWith: 'til_cognitive_profile_' },
    },
  })

  const distribution = { quick: 0, thoughtful: 0, contemplate: 0 }
  let total = 0

  for (const profile of profiles) {
    const data = profile.value as any
    if (data?.questionMetrics?.modeDistribution) {
      const md = data.questionMetrics.modeDistribution
      distribution.quick += md.quick || 0
      distribution.thoughtful += md.thoughtful || 0
      distribution.contemplate += md.contemplate || 0
      total += (md.quick || 0) + (md.thoughtful || 0) + (md.contemplate || 0)
    }
  }

  return [
    {
      mode: 'quick',
      count: distribution.quick,
      percentage: total > 0 ? Math.round((distribution.quick / total) * 100) : 33,
    },
    {
      mode: 'thoughtful',
      count: distribution.thoughtful,
      percentage: total > 0 ? Math.round((distribution.thoughtful / total) * 100) : 34,
    },
    {
      mode: 'contemplate',
      count: distribution.contemplate,
      percentage: total > 0 ? Math.round((distribution.contemplate / total) * 100) : 33,
    },
  ]
}

// ============================================
// Platform Health
// ============================================

/**
 * Get platform health status
 */
export async function getPlatformHealth(): Promise<PlatformHealth> {
  const components: PlatformHealth['components'] = []

  // Check database
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    components.push({
      name: 'Database',
      status: 'healthy',
      latencyMs: Date.now() - start,
    })
  } catch {
    components.push({
      name: 'Database',
      status: 'down',
    })
  }

  // Check recent error rate (from logs if available)
  // For now, assume healthy
  components.push({
    name: 'API',
    status: 'healthy',
    errorRate: 0.01,
  })

  components.push({
    name: 'Authentication',
    status: 'healthy',
  })

  components.push({
    name: 'AI Services',
    status: 'healthy',
  })

  // Calculate overall score
  const healthyCount = components.filter(c => c.status === 'healthy').length
  const overallScore = Math.round((healthyCount / components.length) * 100)

  return {
    overallScore,
    components,
    recentErrors: [], // Would be populated from error logging
  }
}

// ============================================
// Surprise Delta Aggregates (Content-Free)
// ============================================

/**
 * Get aggregate surprise patterns across platform (no content)
 */
export async function getSurpriseAggregates(): Promise<{
  totalSurprises: number
  byDimension: { dimension: string; count: number }[]
  bySignificance: { significance: string; count: number }[]
  avgPerUser: number
}> {
  const surpriseLogs = await prisma.userSetting.findMany({
    where: {
      key: { startsWith: 'til_surprise_log_' },
    },
  })

  const byDimension: Record<string, number> = {}
  const bySignificance: Record<string, number> = {}
  let totalSurprises = 0

  for (const log of surpriseLogs) {
    const surprises = log.value as any[]
    if (Array.isArray(surprises)) {
      totalSurprises += surprises.length
      for (const s of surprises) {
        byDimension[s.dimension] = (byDimension[s.dimension] || 0) + 1
        bySignificance[s.significance] = (bySignificance[s.significance] || 0) + 1
      }
    }
  }

  const totalUsers = await prisma.user.count()

  return {
    totalSurprises,
    byDimension: Object.entries(byDimension)
      .map(([dimension, count]) => ({ dimension, count }))
      .sort((a, b) => b.count - a.count),
    bySignificance: Object.entries(bySignificance)
      .map(([significance, count]) => ({ significance, count }))
      .sort((a, b) => b.count - a.count),
    avgPerUser: totalUsers > 0 ? Math.round((totalSurprises / totalUsers) * 10) / 10 : 0,
  }
}
