/**
 * UserBehaviorModel
 *
 * Per-user behavioral profile for personalization.
 * Part of the Behavioral Intelligence Layer.
 *
 * @see docs/BEHAVIORAL_INTELLIGENCE_LAYER.md
 *
 * STATUS: IMPLEMENTED - Profile built from PatternAggregator patterns
 */

import { Pattern, PatternAggregator, getPatternAggregator } from './PatternAggregator'

// =============================================================================
// USER BEHAVIOR MODEL INTERFACE
// =============================================================================

export interface UserBehaviorProfile {
  userId: string // Hashed
  lastUpdated: Date

  // Mode preferences
  preferredMode: 'quick' | 'thoughtful' | 'contemplate' | null
  modeUsageDistribution: {
    quick: number
    thoughtful: number
    contemplate: number
  }

  // Engagement patterns
  averageSessionDuration: number // Minutes
  sessionsPerWeek: number
  peakUsageHours: number[] // 0-23
  mostActiveDay: number | null // 0-6

  // Feature adoption
  featuresDiscovered: string[]
  featuresUsedRegularly: string[]
  featureAdoptionRate: number // 0.0 to 1.0

  // Feedback patterns
  satisfactionTrend: 'improving' | 'stable' | 'declining' | 'unknown'
  feedbackFrequency: number // Feedback events per week
  positiveRate: number // 0.0 to 1.0

  // Learning signals
  refinementUsageRate: number // How often they use refinement
  followUpQuestionRate: number // How often they ask follow-ups

  // Derived insights
  engagementLevel: 'high' | 'medium' | 'low' | 'unknown'
  churnRisk: 'high' | 'medium' | 'low' | 'unknown'
  upsellReadiness: 'ready' | 'not_ready' | 'unknown'
}

// =============================================================================
// USER BEHAVIOR MODEL CLASS
// =============================================================================

export class UserBehaviorModel {
  private patternAggregator: PatternAggregator
  private profileCache: Map<string, UserBehaviorProfile> = new Map()

  constructor() {
    this.patternAggregator = getPatternAggregator()
  }

  /**
   * Get or build a user's behavior profile
   */
  async getProfile(userId: string): Promise<UserBehaviorProfile> {
    // Check cache first
    const cached = this.profileCache.get(userId)
    if (cached && this.isFresh(cached.lastUpdated)) {
      return cached
    }

    // Build fresh profile
    const profile = await this.buildProfile(userId)
    this.profileCache.set(userId, profile)
    return profile
  }

  /**
   * Build a behavior profile from patterns
   */
  private async buildProfile(userId: string): Promise<UserBehaviorProfile> {
    // Get patterns from aggregator
    const patterns = await this.patternAggregator.analyzeUser(userId)

    // Start with default profile
    const profile = this.getDefaultProfile(userId)

    // If no patterns detected, return default
    if (patterns.length === 0) {
      return profile
    }

    // Map each pattern type to profile fields
    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'mode_preference': {
          const data = pattern.data as {
            preferredMode: 'quick' | 'thoughtful' | 'contemplate'
            distribution: { quick: number; thoughtful: number; contemplate: number }
          }
          profile.preferredMode = data.preferredMode
          profile.modeUsageDistribution = data.distribution
          break
        }

        case 'usage_time': {
          const data = pattern.data as {
            peakHours: number[]
            averageSessionDuration: number
            sessionsPerWeek: number
            mostActiveDay: number
          }
          profile.peakUsageHours = data.peakHours
          profile.averageSessionDuration = data.averageSessionDuration
          profile.sessionsPerWeek = data.sessionsPerWeek
          profile.mostActiveDay = data.mostActiveDay
          break
        }

        case 'feature_adoption': {
          const data = pattern.data as {
            featuresDiscovered: string[]
            featuresUsedRegularly: string[]
            adoptionRate: number
          }
          profile.featuresDiscovered = data.featuresDiscovered
          profile.featuresUsedRegularly = data.featuresUsedRegularly
          profile.featureAdoptionRate = data.adoptionRate
          break
        }

        case 'engagement_trend': {
          const data = pattern.data as {
            trend: 'increasing' | 'stable' | 'declining'
            weekOverWeekChange: number
          }
          // Map trend to engagement level
          if (data.trend === 'increasing' || data.weekOverWeekChange > 20) {
            profile.engagementLevel = 'high'
          } else if (data.trend === 'declining' || data.weekOverWeekChange < -20) {
            profile.engagementLevel = 'low'
          } else {
            profile.engagementLevel = 'medium'
          }
          break
        }

        case 'satisfaction_trend': {
          const data = pattern.data as {
            trend: 'improving' | 'stable' | 'declining'
            positiveRate: number
            totalFeedbackCount: number
          }
          profile.satisfactionTrend = data.trend
          profile.positiveRate = data.positiveRate / 100 // Convert percentage to 0-1
          profile.feedbackFrequency = data.totalFeedbackCount / 4 // Approximate weekly rate
          break
        }

        case 'friction_point': {
          // Friction points contribute to churn risk calculation below
          break
        }
      }
    }

    // Derive churn risk from multiple signals
    profile.churnRisk = this.calculateChurnRisk(profile, patterns)

    // Derive upsell readiness
    profile.upsellReadiness = this.calculateUpsellReadiness(profile)

    return profile
  }

  /**
   * Calculate churn risk from profile and patterns
   */
  private calculateChurnRisk(
    profile: UserBehaviorProfile,
    patterns: Pattern[]
  ): 'high' | 'medium' | 'low' | 'unknown' {
    let riskSignals = 0

    // Low engagement = risk
    if (profile.engagementLevel === 'low') riskSignals++

    // Declining satisfaction = risk
    if (profile.satisfactionTrend === 'declining') riskSignals++

    // Low feature adoption = risk
    if (profile.featureAdoptionRate < 0.3) riskSignals++

    // Multiple friction points = risk
    const frictionPatterns = patterns.filter((p) => p.type === 'friction_point')
    if (frictionPatterns.length >= 2) riskSignals++

    // Low positive rate = risk
    if (profile.positiveRate > 0 && profile.positiveRate < 0.5) riskSignals++

    if (riskSignals >= 3) return 'high'
    if (riskSignals >= 1) return 'medium'
    if (profile.engagementLevel === 'unknown') return 'unknown'
    return 'low'
  }

  /**
   * Calculate upsell readiness from profile
   */
  private calculateUpsellReadiness(
    profile: UserBehaviorProfile
  ): 'ready' | 'not_ready' | 'unknown' {
    // High engagement + high satisfaction + high feature adoption = ready
    const isHighEngagement = profile.engagementLevel === 'high'
    const isHighSatisfaction =
      profile.satisfactionTrend === 'improving' || profile.positiveRate > 0.7
    const isHighAdoption = profile.featureAdoptionRate > 0.5

    if (isHighEngagement && isHighSatisfaction && isHighAdoption) {
      return 'ready'
    }

    // Not enough data
    if (profile.engagementLevel === 'unknown') {
      return 'unknown'
    }

    return 'not_ready'
  }

  /**
   * Get default profile for new users
   */
  private getDefaultProfile(userId: string): UserBehaviorProfile {
    return {
      userId,
      lastUpdated: new Date(),

      preferredMode: null,
      modeUsageDistribution: { quick: 0, thoughtful: 0, contemplate: 0 },

      averageSessionDuration: 0,
      sessionsPerWeek: 0,
      peakUsageHours: [],
      mostActiveDay: null,

      featuresDiscovered: [],
      featuresUsedRegularly: [],
      featureAdoptionRate: 0,

      satisfactionTrend: 'unknown',
      feedbackFrequency: 0,
      positiveRate: 0,

      refinementUsageRate: 0,
      followUpQuestionRate: 0,

      engagementLevel: 'unknown',
      churnRisk: 'unknown',
      upsellReadiness: 'unknown',
    }
  }

  /**
   * Check if a profile is still fresh
   */
  private isFresh(lastUpdated: Date): boolean {
    const ONE_HOUR = 60 * 60 * 1000
    return Date.now() - lastUpdated.getTime() < ONE_HOUR
  }

  /**
   * Invalidate a user's cached profile
   */
  invalidateCache(userId: string): void {
    this.profileCache.delete(userId)
  }

  /**
   * Clear all cached profiles
   */
  clearCache(): void {
    this.profileCache.clear()
  }

  // =============================================================================
  // PERSONALIZATION METHODS
  // =============================================================================

  /**
   * Suggest a mode based on user's profile and question characteristics
   */
  async suggestMode(
    userId: string,
    questionComplexity: number // 0.0 to 1.0
  ): Promise<'quick' | 'thoughtful' | 'contemplate'> {
    const profile = await this.getProfile(userId)

    // If user has a strong preference, respect it
    if (profile.preferredMode) {
      // But override for very complex questions
      if (questionComplexity > 0.8) {
        return 'contemplate'
      }
      return profile.preferredMode
    }

    // Default based on complexity
    if (questionComplexity < 0.3) return 'quick'
    if (questionComplexity < 0.7) return 'thoughtful'
    return 'contemplate'
  }

  /**
   * Get personalized feature suggestions
   */
  async suggestFeatures(userId: string): Promise<string[]> {
    const profile = await this.getProfile(userId)

    // Find features the user hasn't discovered yet
    const allFeatures = [
      'panel_comparison',
      'refine_fire',
      'knowledge_vault',
      'daily_calibration',
      'master_summary',
    ]

    const undiscovered = allFeatures.filter(
      (f) => !profile.featuresDiscovered.includes(f)
    )

    // TODO: Rank by relevance based on user's patterns
    return undiscovered.slice(0, 3)
  }

  /**
   * Determine if this is a good time to ask for feedback
   */
  async shouldRequestFeedback(userId: string): Promise<boolean> {
    const profile = await this.getProfile(userId)

    // Don't over-ask
    if (profile.feedbackFrequency > 5) {
      return false
    }

    // Users with unknown satisfaction trend need more feedback
    if (profile.satisfactionTrend === 'unknown') {
      return true
    }

    // Ask declining users less (avoid annoyance)
    if (profile.satisfactionTrend === 'declining') {
      return false
    }

    return true
  }

  /**
   * Check if user is at risk of churning
   */
  async assessChurnRisk(userId: string): Promise<{
    risk: 'high' | 'medium' | 'low'
    signals: string[]
  }> {
    const profile = await this.getProfile(userId)
    const signals: string[] = []

    // Check engagement level
    if (profile.engagementLevel === 'low') {
      signals.push('Low engagement')
    }

    // Check satisfaction trend
    if (profile.satisfactionTrend === 'declining') {
      signals.push('Declining satisfaction')
    }

    // Check feature adoption
    if (profile.featureAdoptionRate < 0.3) {
      signals.push('Low feature adoption')
    }

    // Determine risk level
    let risk: 'high' | 'medium' | 'low' = 'low'
    if (signals.length >= 3) risk = 'high'
    else if (signals.length >= 1) risk = 'medium'

    return { risk, signals }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let modelInstance: UserBehaviorModel | null = null

export function getUserBehaviorModel(): UserBehaviorModel {
  if (!modelInstance) {
    modelInstance = new UserBehaviorModel()
  }
  return modelInstance
}
