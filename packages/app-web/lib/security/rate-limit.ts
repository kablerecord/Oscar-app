import { prisma } from '@/lib/db/prisma'

/**
 * Rate Limiting Configuration
 *
 * Three-layer protection:
 * 1. Short-term: Requests per minute (burst protection)
 * 2. Monthly: Token-based limits (primary billing model)
 * 3. Legacy: Daily request limits (backward compatibility)
 */

export type Source = 'web' | 'vscode' | 'mobile'

export interface RateLimitConfig {
  // Short-term limits (per minute) - burst protection
  requestsPerMinute: number
  // Monthly token limits (primary billing model)
  monthlyTokenLimit: number
  // Legacy: Daily request limits (kept for backward compatibility)
  requestsPerDay: number
  // VS Code extension access
  vsCodeAccess: boolean
  // Optional: different limits per endpoint
  endpointLimits?: Record<string, { perMinute: number; perDay: number }>
}

/**
 * Token limits by tier:
 * - Lite: 500K tokens/month (no VS Code access)
 * - Pro: 2.5M tokens/month
 * - Master: 12.5M tokens/month
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  lite: {
    requestsPerMinute: 15,
    monthlyTokenLimit: 500_000,
    requestsPerDay: 100,
    vsCodeAccess: false,
    endpointLimits: {
      'oscar/ask': { perMinute: 10, perDay: 50 },
      'oscar/refine': { perMinute: 15, perDay: 100 },
      'knowledge/search': { perMinute: 30, perDay: 500 },
    },
  },
  pro: {
    requestsPerMinute: 30,
    monthlyTokenLimit: 2_500_000,
    requestsPerDay: 1000,
    vsCodeAccess: true,
    endpointLimits: {
      'oscar/ask': { perMinute: 15, perDay: 500 },
      'oscar/refine': { perMinute: 30, perDay: 1000 },
      'knowledge/search': { perMinute: 60, perDay: 2000 },
    },
  },
  master: {
    requestsPerMinute: 60,
    monthlyTokenLimit: 12_500_000,
    requestsPerDay: 5000,
    vsCodeAccess: true,
    endpointLimits: {
      'oscar/ask': { perMinute: 30, perDay: 2000 },
      'oscar/refine': { perMinute: 60, perDay: 5000 },
      'knowledge/search': { perMinute: 120, perDay: 10000 },
    },
  },
  unlimited: {
    requestsPerMinute: 100,
    monthlyTokenLimit: 100_000_000, // 100M - effectively unlimited
    requestsPerDay: 10000,
    vsCodeAccess: true,
  },
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  reason?: 'minute_limit' | 'daily_limit' | 'token_limit' | 'no_vscode_access'
}

export interface TokenCheckResult {
  allowed: boolean
  tokensUsed: number
  tokenLimit: number
  remaining: number
  percentage: number
  resetAt: Date
  reason?: 'token_limit_exceeded'
}

/**
 * Check if user has VS Code access based on tier
 */
export function hasVSCodeAccess(tier: string): boolean {
  const config = RATE_LIMITS[tier] || RATE_LIMITS.pro
  return config.vsCodeAccess
}

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Get first day of next month (for reset date)
 */
function getNextMonthReset(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

/**
 * Check monthly token limit
 */
export async function checkTokenLimit(params: {
  userId: string
  tier?: string
  source?: Source
}): Promise<TokenCheckResult> {
  const { userId, tier = 'pro' } = params
  const config = RATE_LIMITS[tier] || RATE_LIMITS.pro
  const currentMonth = getCurrentMonth()

  // Get total token usage for current month
  const tokenRecords = await prisma.tokenUsage.findMany({
    where: {
      userId,
      month: currentMonth,
    },
    select: {
      tokensUsed: true,
    },
  })

  const tokensUsed = tokenRecords.reduce((sum, r) => sum + r.tokensUsed, 0)
  const tokenLimit = config.monthlyTokenLimit
  const remaining = Math.max(0, tokenLimit - tokensUsed)
  const percentage = tokenLimit > 0 ? Math.round((tokensUsed / tokenLimit) * 100) : 0

  if (tokensUsed >= tokenLimit) {
    return {
      allowed: false,
      tokensUsed,
      tokenLimit,
      remaining: 0,
      percentage: 100,
      resetAt: getNextMonthReset(),
      reason: 'token_limit_exceeded',
    }
  }

  return {
    allowed: true,
    tokensUsed,
    tokenLimit,
    remaining,
    percentage,
    resetAt: getNextMonthReset(),
  }
}

/**
 * Check if a request should be rate limited
 * Now includes token-based limiting as primary check
 */
export async function checkRateLimit(params: {
  userId: string
  ip: string
  endpoint: string
  tier?: string
  source?: Source
  checkTokens?: boolean
}): Promise<RateLimitResult> {
  const { userId, ip, endpoint, tier = 'pro', source = 'web', checkTokens = true } = params
  const config = RATE_LIMITS[tier] || RATE_LIMITS.pro

  // Check VS Code access for vscode source
  if (source === 'vscode' && !config.vsCodeAccess) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
      reason: 'no_vscode_access',
    }
  }

  // Check token limit first (if enabled)
  if (checkTokens) {
    const tokenCheck = await checkTokenLimit({ userId, tier, source })
    if (!tokenCheck.allowed) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: tokenCheck.resetAt,
        reason: 'token_limit',
      }
    }
  }

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

  // Check daily limit (legacy, for backward compatibility)
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
 * Record a rate limit event and update token usage
 * Also updates daily usage for backward compatibility
 */
export async function recordRequest(params: {
  userId: string
  ip: string
  endpoint: string
  tokenCount?: number
  source?: Source
}): Promise<void> {
  const { userId, ip, endpoint, tokenCount = 0, source = 'web' } = params
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const currentMonth = getCurrentMonth()

  // Record rate limit event (for sliding window burst protection)
  await prisma.rateLimitEvent.create({
    data: {
      userId,
      ip,
      endpoint,
      timestamp: now,
    },
  })

  // Update daily usage record (legacy, for backward compatibility)
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

  // Update monthly token usage by source (new token-based model)
  if (tokenCount > 0) {
    await prisma.tokenUsage.upsert({
      where: {
        userId_month_source: {
          userId,
          month: currentMonth,
          source,
        },
      },
      update: {
        tokensUsed: { increment: tokenCount },
      },
      create: {
        userId,
        month: currentMonth,
        source,
        tokensUsed: tokenCount,
      },
    })
  }
}

/**
 * Get token usage breakdown by source for current month
 */
export async function getTokenUsageBreakdown(userId: string): Promise<{
  total: number
  breakdown: Record<Source, number>
  month: string
}> {
  const currentMonth = getCurrentMonth()

  const tokenRecords = await prisma.tokenUsage.findMany({
    where: {
      userId,
      month: currentMonth,
    },
    select: {
      source: true,
      tokensUsed: true,
    },
  })

  const breakdown: Record<Source, number> = {
    web: 0,
    vscode: 0,
    mobile: 0,
  }

  let total = 0
  for (const record of tokenRecords) {
    const source = record.source as Source
    if (source in breakdown) {
      breakdown[source] = record.tokensUsed
      total += record.tokensUsed
    }
  }

  return { total, breakdown, month: currentMonth }
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
 * Get usage statistics for a user (legacy API)
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
