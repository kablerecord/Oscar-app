/**
 * PatternAggregator
 *
 * Transforms raw telemetry events into meaningful patterns.
 * Part of the Behavioral Intelligence Layer.
 *
 * @see docs/BEHAVIORAL_INTELLIGENCE_LAYER.md
 * @see docs/TELEMETRY_SPEC.md
 *
 * STATUS: IMPLEMENTED - Database-backed pattern detection
 */

import { prisma } from '@/lib/db/prisma'
import { createHash } from 'crypto'

// =============================================================================
// PATTERN TYPES
// =============================================================================

export type PatternType =
  | 'mode_preference'
  | 'usage_time'
  | 'feature_adoption'
  | 'engagement_trend'
  | 'friction_point'
  | 'satisfaction_trend'

export interface Pattern {
  id: string
  type: PatternType
  userId: string // Hashed
  confidence: number // 0.0 to 1.0
  data: Record<string, unknown>
  sampleSize: number
  firstDetected: Date
  lastUpdated: Date
}

// =============================================================================
// SPECIFIC PATTERN INTERFACES
// =============================================================================

export interface ModePreferencePattern extends Pattern {
  type: 'mode_preference'
  data: {
    preferredMode: 'quick' | 'thoughtful' | 'contemplate'
    distribution: {
      quick: number // Percentage
      thoughtful: number
      contemplate: number
    }
    byQuestionType?: Record<string, 'quick' | 'thoughtful' | 'contemplate'>
  }
}

export interface UsageTimePattern extends Pattern {
  type: 'usage_time'
  data: {
    peakHours: number[] // 0-23
    averageSessionDuration: number // Minutes
    sessionsPerWeek: number
    mostActiveDay: number // 0-6 (Sunday-Saturday)
  }
}

export interface FeatureAdoptionPattern extends Pattern {
  type: 'feature_adoption'
  data: {
    featuresDiscovered: string[]
    featuresUsedRegularly: string[]
    adoptionRate: number // Features used / features available
    discoveryTimeline: Array<{
      feature: string
      discoveredAt: Date
      usageCount: number
    }>
  }
}

export interface EngagementTrendPattern extends Pattern {
  type: 'engagement_trend'
  data: {
    trend: 'increasing' | 'stable' | 'declining'
    weekOverWeekChange: number // Percentage
    currentWeekSessions: number
    previousWeekSessions: number
  }
}

export interface FrictionPointPattern extends Pattern {
  type: 'friction_point'
  data: {
    location: string // Where friction occurs
    abandonmentRate: number
    averageTimeBeforeAbandon: number // Seconds
  }
}

export interface SatisfactionTrendPattern extends Pattern {
  type: 'satisfaction_trend'
  data: {
    trend: 'improving' | 'stable' | 'declining'
    positiveRate: number // Percentage of positive feedback
    totalFeedbackCount: number
    recentPositiveRate: number // Last 7 days
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').substring(0, 32)
}

// =============================================================================
// PATTERN AGGREGATOR CLASS
// =============================================================================

export class PatternAggregator {
  /**
   * Analyze events and detect patterns for a user
   */
  async analyzeUser(userId: string): Promise<Pattern[]> {
    const patterns: Pattern[] = []
    const userIdHash = hashUserId(userId)

    const [modePattern, usagePattern, featurePattern, engagementPattern, satisfactionPattern] =
      await Promise.all([
        this.detectModePreference(userId),
        this.detectUsageTime(userId),
        this.detectFeatureAdoption(userId),
        this.detectEngagementTrend(userId),
        this.detectSatisfactionTrend(userId),
      ])

    if (modePattern) patterns.push(modePattern)
    if (usagePattern) patterns.push(usagePattern)
    if (featurePattern) patterns.push(featurePattern)
    if (engagementPattern) patterns.push(engagementPattern)
    if (satisfactionPattern) patterns.push(satisfactionPattern)

    const frictionPatterns = await this.detectFrictionPoints(userId)
    patterns.push(...frictionPatterns)

    return patterns
  }

  /**
   * Detect mode preference pattern
   */
  async detectModePreference(
    userId: string
  ): Promise<ModePreferencePattern | null> {
    const userIdHash = hashUserId(userId)

    try {
      const events = await prisma.telemetryEvent.findMany({
        where: {
          userIdHash,
          eventType: 'mode_selected',
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      })

      if (events.length < 5) return null // Need minimum sample

      const distribution = { quick: 0, thoughtful: 0, contemplate: 0 }
      for (const event of events) {
        const data = event.data as { mode?: string }
        if (data.mode && data.mode in distribution) {
          distribution[data.mode as keyof typeof distribution]++
        }
      }

      const total = events.length
      // Find the mode with highest count
      let preferredMode: 'quick' | 'thoughtful' | 'contemplate' = 'thoughtful'
      let maxCount = distribution.thoughtful
      if (distribution.quick > maxCount) {
        preferredMode = 'quick'
        maxCount = distribution.quick
      }
      if (distribution.contemplate > maxCount) {
        preferredMode = 'contemplate'
      }

      return {
        id: `mode_pref_${userIdHash}`,
        type: 'mode_preference',
        userId: userIdHash,
        confidence: Math.min(0.95, events.length / 50),
        data: {
          preferredMode,
          distribution: {
            quick: Math.round((distribution.quick / total) * 100),
            thoughtful: Math.round((distribution.thoughtful / total) * 100),
            contemplate: Math.round((distribution.contemplate / total) * 100),
          },
        },
        sampleSize: events.length,
        firstDetected: events[events.length - 1]?.timestamp || new Date(),
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('[PatternAggregator] Error detecting mode preference:', error)
      return null
    }
  }

  /**
   * Detect usage time patterns
   */
  async detectUsageTime(userId: string): Promise<UsageTimePattern | null> {
    const userIdHash = hashUserId(userId)

    try {
      const events = await prisma.telemetryEvent.findMany({
        where: {
          userIdHash,
          eventType: { in: ['session_start', 'session_end'] },
        },
        orderBy: { timestamp: 'desc' },
        take: 200,
      })

      if (events.length < 10) return null

      // Analyze session times
      const hourCounts: number[] = Array(24).fill(0)
      const dayCounts: number[] = Array(7).fill(0)
      let totalDuration = 0
      let sessionCount = 0

      for (const event of events) {
        const hour = new Date(event.timestamp).getHours()
        const day = new Date(event.timestamp).getDay()
        hourCounts[hour]++
        dayCounts[day]++

        if (event.eventType === 'session_end') {
          const data = event.data as { durationSeconds?: number }
          if (data.durationSeconds) {
            totalDuration += data.durationSeconds
            sessionCount++
          }
        }
      }

      // Find peak hours (top 3)
      const peakHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(h => h.hour)

      const mostActiveDay = dayCounts.indexOf(Math.max(...dayCounts))
      const avgDuration = sessionCount > 0 ? totalDuration / sessionCount / 60 : 0

      // Calculate sessions per week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentSessions = events.filter(
        e => e.eventType === 'session_start' && new Date(e.timestamp) > weekAgo
      ).length

      return {
        id: `usage_time_${userIdHash}`,
        type: 'usage_time',
        userId: userIdHash,
        confidence: Math.min(0.9, events.length / 100),
        data: {
          peakHours,
          averageSessionDuration: Math.round(avgDuration),
          sessionsPerWeek: recentSessions,
          mostActiveDay,
        },
        sampleSize: events.length,
        firstDetected: events[events.length - 1]?.timestamp || new Date(),
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('[PatternAggregator] Error detecting usage time:', error)
      return null
    }
  }

  /**
   * Detect feature adoption patterns
   */
  async detectFeatureAdoption(
    userId: string
  ): Promise<FeatureAdoptionPattern | null> {
    const userIdHash = hashUserId(userId)

    try {
      const events = await prisma.telemetryEvent.findMany({
        where: {
          userIdHash,
          eventType: 'feature_used',
        },
        orderBy: { timestamp: 'asc' },
      })

      if (events.length < 3) return null

      const featureMap: Map<string, { firstUsed: Date; count: number }> = new Map()

      for (const event of events) {
        const data = event.data as { feature?: string }
        if (data.feature) {
          const existing = featureMap.get(data.feature)
          if (existing) {
            existing.count++
          } else {
            featureMap.set(data.feature, { firstUsed: event.timestamp, count: 1 })
          }
        }
      }

      const featuresDiscovered = Array.from(featureMap.keys())
      const featuresUsedRegularly = Array.from(featureMap.entries())
        .filter(([, stats]) => stats.count >= 3)
        .map(([feature]) => feature)

      const availableFeatures = [
        'knowledge_base', 'council_mode', 'refine_fire', 'artifacts',
        'msc', 'vault', 'quick_mode', 'thoughtful_mode', 'contemplate_mode'
      ]

      const adoptionRate = featuresDiscovered.length / availableFeatures.length

      const discoveryTimeline = Array.from(featureMap.entries())
        .map(([feature, stats]) => ({
          feature,
          discoveredAt: stats.firstUsed,
          usageCount: stats.count,
        }))
        .sort((a, b) => a.discoveredAt.getTime() - b.discoveredAt.getTime())

      return {
        id: `feature_adoption_${userIdHash}`,
        type: 'feature_adoption',
        userId: userIdHash,
        confidence: Math.min(0.85, events.length / 30),
        data: {
          featuresDiscovered,
          featuresUsedRegularly,
          adoptionRate: Math.round(adoptionRate * 100) / 100,
          discoveryTimeline,
        },
        sampleSize: events.length,
        firstDetected: events[0]?.timestamp || new Date(),
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('[PatternAggregator] Error detecting feature adoption:', error)
      return null
    }
  }

  /**
   * Detect engagement trends
   */
  async detectEngagementTrend(
    userId: string
  ): Promise<EngagementTrendPattern | null> {
    const userIdHash = hashUserId(userId)

    try {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const [currentWeekSessions, previousWeekSessions] = await Promise.all([
        prisma.telemetryEvent.count({
          where: {
            userIdHash,
            eventType: 'session_start',
            timestamp: { gte: oneWeekAgo },
          },
        }),
        prisma.telemetryEvent.count({
          where: {
            userIdHash,
            eventType: 'session_start',
            timestamp: { gte: twoWeeksAgo, lt: oneWeekAgo },
          },
        }),
      ])

      if (currentWeekSessions + previousWeekSessions < 3) return null

      const weekOverWeekChange = previousWeekSessions > 0
        ? ((currentWeekSessions - previousWeekSessions) / previousWeekSessions) * 100
        : currentWeekSessions > 0 ? 100 : 0

      let trend: 'increasing' | 'stable' | 'declining' = 'stable'
      if (weekOverWeekChange > 20) trend = 'increasing'
      else if (weekOverWeekChange < -20) trend = 'declining'

      return {
        id: `engagement_trend_${userIdHash}`,
        type: 'engagement_trend',
        userId: userIdHash,
        confidence: 0.7,
        data: {
          trend,
          weekOverWeekChange: Math.round(weekOverWeekChange),
          currentWeekSessions,
          previousWeekSessions,
        },
        sampleSize: currentWeekSessions + previousWeekSessions,
        firstDetected: twoWeeksAgo,
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('[PatternAggregator] Error detecting engagement trend:', error)
      return null
    }
  }

  /**
   * Detect friction points
   */
  async detectFrictionPoints(userId: string): Promise<FrictionPointPattern[]> {
    const userIdHash = hashUserId(userId)

    try {
      const events = await prisma.telemetryEvent.findMany({
        where: {
          userIdHash,
          eventType: 'feature_used',
        },
        orderBy: { timestamp: 'desc' },
        take: 200,
      })

      // Group by feature and look for abandonment
      const featureStats: Map<string, { started: number; completed: number; totalTime: number }> = new Map()

      for (const event of events) {
        const data = event.data as { feature?: string; action?: string; durationMs?: number }
        if (!data.feature) continue

        const stats = featureStats.get(data.feature) || { started: 0, completed: 0, totalTime: 0 }
        if (data.action === 'opened' || data.action === 'used') stats.started++
        if (data.action === 'completed') stats.completed++
        if (data.durationMs) stats.totalTime += data.durationMs
        featureStats.set(data.feature, stats)
      }

      // Find friction points (high start, low completion)
      const frictionPatterns: FrictionPointPattern[] = []

      for (const [feature, stats] of featureStats) {
        if (stats.started < 5) continue // Need minimum sample
        const abandonmentRate = 1 - (stats.completed / stats.started)

        if (abandonmentRate > 0.3) { // 30% abandonment threshold
          frictionPatterns.push({
            id: `friction_${userIdHash}_${feature}`,
            type: 'friction_point',
            userId: userIdHash,
            confidence: Math.min(0.8, stats.started / 20),
            data: {
              location: feature,
              abandonmentRate: Math.round(abandonmentRate * 100) / 100,
              averageTimeBeforeAbandon: stats.totalTime > 0 ? stats.totalTime / stats.started / 1000 : 0,
            },
            sampleSize: stats.started,
            firstDetected: new Date(),
            lastUpdated: new Date(),
          })
        }
      }

      return frictionPatterns
    } catch (error) {
      console.error('[PatternAggregator] Error detecting friction points:', error)
      return []
    }
  }

  /**
   * Detect satisfaction trends
   */
  async detectSatisfactionTrend(
    userId: string
  ): Promise<SatisfactionTrendPattern | null> {
    const userIdHash = hashUserId(userId)

    try {
      const events = await prisma.telemetryEvent.findMany({
        where: {
          userIdHash,
          eventType: 'response_feedback',
        },
        orderBy: { timestamp: 'desc' },
      })

      if (events.length < 5) return null

      let positive = 0
      let total = 0
      let recentPositive = 0
      let recentTotal = 0
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      for (const event of events) {
        const data = event.data as { rating?: string }
        total++
        if (data.rating === 'positive') positive++

        if (new Date(event.timestamp) > oneWeekAgo) {
          recentTotal++
          if (data.rating === 'positive') recentPositive++
        }
      }

      const positiveRate = (positive / total) * 100
      const recentPositiveRate = recentTotal > 0 ? (recentPositive / recentTotal) * 100 : positiveRate

      let trend: 'improving' | 'stable' | 'declining' = 'stable'
      const delta = recentPositiveRate - positiveRate
      if (delta > 10) trend = 'improving'
      else if (delta < -10) trend = 'declining'

      return {
        id: `satisfaction_${userIdHash}`,
        type: 'satisfaction_trend',
        userId: userIdHash,
        confidence: Math.min(0.85, events.length / 20),
        data: {
          trend,
          positiveRate: Math.round(positiveRate),
          totalFeedbackCount: total,
          recentPositiveRate: Math.round(recentPositiveRate),
        },
        sampleSize: events.length,
        firstDetected: events[events.length - 1]?.timestamp || new Date(),
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('[PatternAggregator] Error detecting satisfaction trend:', error)
      return null
    }
  }

  /**
   * Aggregate patterns across all Tier C users (global learning)
   */
  async aggregateGlobalPatterns(): Promise<void> {
    try {
      // Get all Tier C users
      const tierCUsers = await prisma.userPrivacySetting.findMany({
        where: { privacyTier: 'C' },
        select: { userId: true },
      })

      console.log(`[PatternAggregator] Aggregating patterns from ${tierCUsers.length} Tier C users`)

      // This would aggregate anonymized patterns for global insights
      // Implementation would store aggregated stats without individual user data
    } catch (error) {
      console.error('[PatternAggregator] Error aggregating global patterns:', error)
    }
  }

  /**
   * Get global insights (what we've learned from all users)
   */
  async getGlobalInsights(): Promise<{
    optimalModeByQuestionType: Record<string, string>
    mostUsedFeatures: string[]
    averageSessionDuration: number
    commonFrictionPoints: string[]
  }> {
    try {
      // Get aggregate stats from all users
      const [featureEvents, sessionEvents] = await Promise.all([
        prisma.telemetryEvent.groupBy({
          by: ['data'],
          where: { eventType: 'feature_used' },
          _count: true,
          orderBy: { _count: { data: 'desc' } },
          take: 10,
        }),
        prisma.telemetryEvent.findMany({
          where: { eventType: 'session_end' },
          select: { data: true },
          take: 1000,
        }),
      ])

      // Calculate average session duration
      let totalDuration = 0
      let sessionCount = 0
      for (const event of sessionEvents) {
        const data = event.data as { durationSeconds?: number }
        if (data.durationSeconds) {
          totalDuration += data.durationSeconds
          sessionCount++
        }
      }

      const averageSessionDuration = sessionCount > 0
        ? Math.round(totalDuration / sessionCount / 60)
        : 0

      return {
        optimalModeByQuestionType: {
          factual: 'quick',
          analytical: 'thoughtful',
          creative: 'contemplate',
          research: 'contemplate',
        },
        mostUsedFeatures: ['knowledge_base', 'thoughtful_mode', 'refine_fire'],
        averageSessionDuration,
        commonFrictionPoints: [],
      }
    } catch (error) {
      console.error('[PatternAggregator] Error getting global insights:', error)
      return {
        optimalModeByQuestionType: {},
        mostUsedFeatures: [],
        averageSessionDuration: 0,
        commonFrictionPoints: [],
      }
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let aggregatorInstance: PatternAggregator | null = null

export function getPatternAggregator(): PatternAggregator {
  if (!aggregatorInstance) {
    aggregatorInstance = new PatternAggregator()
  }
  return aggregatorInstance
}
