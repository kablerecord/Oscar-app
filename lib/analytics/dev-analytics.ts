/**
 * ============================================================================
 * DEVELOPER ANALYTICS - Enhanced logging for Joe's account
 * ============================================================================
 *
 * REMINDER: REVIEW THIS DATA IN MARCH 2025 (or after ~500 questions)
 *
 * This system collects detailed metrics for every OSQR interaction in Joe's
 * account. The goal is to identify optimization opportunities for the
 * pre-fetch system we built in lib/context/prefetch.ts.
 *
 * HOW TO REVIEW:
 * 1. Run: curl https://app.osqr.app/api/analytics/report (logged in as Joe)
 * 2. Or check the database: ChatMessage.metadata for analytics data
 * 3. See docs/TODO-ANALYTICS-REVIEW.md for full instructions
 *
 * WHAT TO LOOK FOR:
 * - slowQueries: What's taking >5 seconds? Can we prefetch more?
 * - cacheMisses: What data did users need that wasn't prefetched?
 * - questionPatterns: Are we routing to the right mode?
 *
 * After analysis, expand PREFETCH_ITEMS in lib/context/prefetch.ts
 * ============================================================================
 *
 * Captures detailed metrics for every interaction to identify:
 * - Slow queries that need optimization
 * - Cache misses that could be prefetched
 * - Question patterns to improve routing
 * - Context sources that help vs don't help
 *
 * This is opt-in for developer accounts only.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Joe's workspace ID - enable enhanced analytics for this account
const DEV_WORKSPACE_IDS = [
  'cmjagq8yv0002rihq2675m3ba', // Joe Kelly's workspace
]

export interface AnalyticsEvent {
  // Timing
  totalDurationMs: number
  aiDurationMs?: number
  contextDurationMs?: number
  dbDurationMs?: number

  // Question Analysis
  questionType: string
  complexity: number
  wordCount: number
  hasVaultKeywords: boolean
  hasMSCKeywords: boolean

  // Routing
  requestedMode: string
  effectiveMode: string
  wasAutoRouted: boolean
  fastPath: boolean

  // Context
  cacheHit: boolean
  cacheSource?: string // 'prefetch' | 'none'
  usedKnowledge: boolean
  usedMSC: boolean
  usedProfile: boolean
  knowledgeChunksReturned: number

  // Response
  responseTokens?: number
  responseWordCount: number
  hasArtifacts: boolean

  // User Feedback (if provided later)
  helpful?: boolean
  rating?: number
}

/**
 * Check if enhanced analytics should be enabled for this workspace
 */
export function isDevWorkspace(workspaceId: string): boolean {
  return DEV_WORKSPACE_IDS.includes(workspaceId)
}

/**
 * Log an analytics event to the database
 */
export async function logAnalytics(
  workspaceId: string,
  threadId: string,
  messageId: string,
  event: AnalyticsEvent
): Promise<void> {
  // Only log for dev workspaces
  if (!isDevWorkspace(workspaceId)) return

  try {
    // Store in ChatMessage metadata for now
    // Could move to dedicated table if volume gets high
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        metadata: {
          ...event,
          _analyticsVersion: 1,
          _loggedAt: new Date().toISOString(),
        },
      },
    })

    // Also log to console for immediate visibility
    console.log(`[Analytics] ${event.requestedMode}→${event.effectiveMode} | ${event.totalDurationMs}ms | cache:${event.cacheHit} | knowledge:${event.usedKnowledge} | "${event.questionType}" (${event.complexity})`)
  } catch (error) {
    // Don't fail the request if analytics fails
    console.error('[Analytics] Failed to log:', error)
  }
}

/**
 * Helper to create timing tracker
 */
export function createTimer() {
  const start = Date.now()
  const marks: Record<string, number> = {}

  return {
    mark(name: string) {
      marks[name] = Date.now() - start
    },
    elapsed() {
      return Date.now() - start
    },
    getMarks() {
      return marks
    },
  }
}

/**
 * Analyze a question for analytics
 */
export function analyzeQuestion(message: string): {
  wordCount: number
  hasVaultKeywords: boolean
  hasMSCKeywords: boolean
} {
  const words = message.trim().split(/\s+/)
  const lowerMessage = message.toLowerCase()

  return {
    wordCount: words.length,
    hasVaultKeywords: /\b(vault|document|file|upload|indexed|knowledge|my\s+(data|notes|files))\b/i.test(message),
    hasMSCKeywords: /\b(project|task|goal|msc|mission|plan|todo)\b/i.test(message),
  }
}

/**
 * Generate an analytics report for a workspace
 */
export async function generateAnalyticsReport(workspaceId: string): Promise<{
  summary: {
    totalQuestions: number
    avgResponseTime: number
    cacheHitRate: number
    fastPathRate: number
    autoRouteRate: number
  }
  slowQueries: Array<{
    question: string
    durationMs: number
    mode: string
    reason: string
  }>
  cacheMisses: Array<{
    question: string
    whatWasNeeded: string
  }>
  questionPatterns: Record<string, number>
}> {
  // Get all messages with analytics metadata
  const messages = await prisma.chatMessage.findMany({
    where: {
      thread: { workspaceId },
      role: 'assistant',
      metadata: {
        path: ['_analyticsVersion'],
        not: null,
      },
    },
    include: {
      thread: {
        include: {
          messages: {
            where: { role: 'user' },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500, // Last 500 interactions
  })

  // Process analytics
  const analytics = messages.map(m => {
    const meta = m.metadata as AnalyticsEvent & { _analyticsVersion?: number }
    const userQuestion = m.thread.messages[0]?.content || ''
    return { ...meta, question: userQuestion }
  }).filter(a => a._analyticsVersion)

  if (analytics.length === 0) {
    return {
      summary: {
        totalQuestions: 0,
        avgResponseTime: 0,
        cacheHitRate: 0,
        fastPathRate: 0,
        autoRouteRate: 0,
      },
      slowQueries: [],
      cacheMisses: [],
      questionPatterns: {},
    }
  }

  // Calculate summary
  const totalQuestions = analytics.length
  const avgResponseTime = analytics.reduce((sum, a) => sum + (a.totalDurationMs || 0), 0) / totalQuestions
  const cacheHits = analytics.filter(a => a.cacheHit).length
  const fastPaths = analytics.filter(a => a.fastPath).length
  const autoRoutes = analytics.filter(a => a.wasAutoRouted).length

  // Find slow queries (>5s)
  const slowQueries = analytics
    .filter(a => (a.totalDurationMs || 0) > 5000)
    .map(a => ({
      question: a.question?.slice(0, 100) || '',
      durationMs: a.totalDurationMs || 0,
      mode: a.effectiveMode || 'unknown',
      reason: a.usedKnowledge ? 'knowledge search' : a.usedMSC ? 'MSC lookup' : 'AI response',
    }))
    .slice(0, 20)

  // Find cache misses that could be prefetched
  const cacheMisses = analytics
    .filter(a => !a.cacheHit && a.hasVaultKeywords)
    .map(a => ({
      question: a.question?.slice(0, 100) || '',
      whatWasNeeded: a.usedKnowledge ? 'knowledge context' : 'vault stats',
    }))
    .slice(0, 20)

  // Count question patterns
  const questionPatterns: Record<string, number> = {}
  analytics.forEach(a => {
    const pattern = a.questionType || 'unknown'
    questionPatterns[pattern] = (questionPatterns[pattern] || 0) + 1
  })

  return {
    summary: {
      totalQuestions,
      avgResponseTime: Math.round(avgResponseTime),
      cacheHitRate: Math.round((cacheHits / totalQuestions) * 100),
      fastPathRate: Math.round((fastPaths / totalQuestions) * 100),
      autoRouteRate: Math.round((autoRoutes / totalQuestions) * 100),
    },
    slowQueries,
    cacheMisses,
    questionPatterns,
  }
}
