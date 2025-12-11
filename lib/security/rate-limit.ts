import { prisma } from '@/lib/db/prisma'

/**
 * Rate Limiting Configuration
 *
 * Two-layer protection:
 * 1. Short-term: Requests per minute (burst protection)
 * 2. Long-term: Requests per day (quota management)
 */

export interface RateLimitConfig {
  // Short-term limits (per minute)
  requestsPerMinute: number
  // Daily limits
  requestsPerDay: number
  // Optional: different limits per endpoint
  endpointLimits?: Record<string, { perMinute: number; perDay: number }>
}

// Default limits for different user tiers (Pro and Master only - no free tier)
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  pro: {
    requestsPerMinute: 30,
    requestsPerDay: 1000,
    endpointLimits: {
      'oscar/ask': { perMinute: 15, perDay: 500 },
      'oscar/refine': { perMinute: 30, perDay: 1000 },
      'knowledge/search': { perMinute: 60, perDay: 2000 },
    },
  },
  master: {
    requestsPerMinute: 60,
    requestsPerDay: 5000,
    endpointLimits: {
      'oscar/ask': { perMinute: 30, perDay: 2000 },
      'oscar/refine': { perMinute: 60, perDay: 5000 },
      'knowledge/search': { perMinute: 120, perDay: 10000 },
    },
  },
  unlimited: {
    requestsPerMinute: 100,
    requestsPerDay: 10000,
  },
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  reason?: 'minute_limit' | 'daily_limit'
}

/**
 * Check if a request should be rate limited
 * Uses sliding window for minute-level, fixed window for daily
 */
export async function checkRateLimit(params: {
  userId: string
  ip: string
  endpoint: string
  tier?: string
}): Promise<RateLimitResult> {
  const { userId, ip, endpoint, tier = 'pro' } = params
  const config = RATE_LIMITS[tier] || RATE_LIMITS.pro

  // Get endpoint-specific limits or fall back to defaults
  const limits = config.endpointLimits?.[endpoint] || {
    perMinute: config.requestsPerMinute,
    perDay: config.requestsPerDay,
  }

  const now = new Date()
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Check minute-level rate limit (sliding window)
  const recentEvents = await prisma.rateLimitEvent.count({
    where: {
      OR: [{ userId }, { ip }],
      endpoint,
      timestamp: { gte: oneMinuteAgo },
    },
  })

  if (recentEvents >= limits.perMinute) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now.getTime() + 60 * 1000),
      reason: 'minute_limit',
    }
  }

  // Check daily limit
  const todayUsage = await prisma.usageRecord.findUnique({
    where: {
      userId_endpoint_date: {
        userId,
        endpoint,
        date: startOfDay,
      },
    },
  })

  const dailyCount = todayUsage?.requestCount || 0

  if (dailyCount >= limits.perDay) {
    const tomorrow = new Date(startOfDay)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return {
      allowed: false,
      remaining: 0,
      resetAt: tomorrow,
      reason: 'daily_limit',
    }
  }

  return {
    allowed: true,
    remaining: Math.min(limits.perMinute - recentEvents - 1, limits.perDay - dailyCount - 1),
    resetAt: new Date(now.getTime() + 60 * 1000),
  }
}

/**
 * Record a rate limit event (for minute-level tracking)
 * Also updates daily usage
 */
export async function recordRequest(params: {
  userId: string
  ip: string
  endpoint: string
  tokenCount?: number
}): Promise<void> {
  const { userId, ip, endpoint, tokenCount = 0 } = params
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Record rate limit event (for sliding window)
  await prisma.rateLimitEvent.create({
    data: {
      userId,
      ip,
      endpoint,
      timestamp: now,
    },
  })

  // Update daily usage record
  await prisma.usageRecord.upsert({
    where: {
      userId_endpoint_date: {
        userId,
        endpoint,
        date: startOfDay,
      },
    },
    update: {
      requestCount: { increment: 1 },
      tokenCount: { increment: tokenCount },
    },
    create: {
      userId,
      endpoint,
      date: startOfDay,
      requestCount: 1,
      tokenCount,
    },
  })
}

/**
 * Clean up old rate limit events (run periodically)
 * Keeps last 24 hours for analysis, removes older
 */
export async function cleanupRateLimitEvents(): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const result = await prisma.rateLimitEvent.deleteMany({
    where: {
      timestamp: { lt: oneDayAgo },
    },
  })

  return result.count
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsageStats(userId: string): Promise<{
  today: Record<string, { requests: number; tokens: number }>
  thisMonth: Record<string, { requests: number; tokens: number }>
}> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Today's usage
  const todayRecords = await prisma.usageRecord.findMany({
    where: {
      userId,
      date: startOfDay,
    },
  })

  // This month's usage
  const monthRecords = await prisma.usageRecord.findMany({
    where: {
      userId,
      date: { gte: startOfMonth },
    },
  })

  // Aggregate today
  const today: Record<string, { requests: number; tokens: number }> = {}
  for (const record of todayRecords) {
    today[record.endpoint] = {
      requests: record.requestCount,
      tokens: record.tokenCount,
    }
  }

  // Aggregate month
  const thisMonth: Record<string, { requests: number; tokens: number }> = {}
  for (const record of monthRecords) {
    if (!thisMonth[record.endpoint]) {
      thisMonth[record.endpoint] = { requests: 0, tokens: 0 }
    }
    thisMonth[record.endpoint].requests += record.requestCount
    thisMonth[record.endpoint].tokens += record.tokenCount
  }

  return { today, thisMonth }
}
