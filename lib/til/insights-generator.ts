/**
 * Proactive Insights Generator - Temporal Intelligence Layer (J-1)
 *
 * Generates natural language insights from pattern analysis.
 * These can be surfaced proactively by OSQR.
 */

import {
  runPatternAnalysis,
  compareWeeks,
  analyzeVelocityTrends,
  analyzeRecurringThemes,
  type PatternAnalysis,
  type VelocityTrend,
  type RecurringTheme,
  type RoadmapStatus,
} from './pattern-detector'
import { getThemes, getDailySnapshot, getSnapshotRange } from './session-tracker'
import velocityCalibration from './velocity-calibration.json'

// ============================================
// Types
// ============================================

export interface Insight {
  id: string
  type: 'velocity' | 'theme' | 'roadmap' | 'achievement' | 'suggestion' | 'warning'
  priority: 'high' | 'medium' | 'low'
  title: string
  message: string
  data?: Record<string, any>
  actionable?: boolean
  suggested_action?: string
  generated_at: Date
  expires_at?: Date
}

export interface InsightBundle {
  insights: Insight[]
  summary: string
  generated_at: Date
  workspace_momentum: 'accelerating' | 'steady' | 'slowing'
}

// ============================================
// Insight Generation
// ============================================

/**
 * Generate all insights for a workspace
 */
export async function generateInsights(workspaceId: string): Promise<InsightBundle> {
  const [patterns, weekComparison, themes] = await Promise.all([
    runPatternAnalysis(workspaceId),
    compareWeeks(workspaceId),
    getThemes(workspaceId),
  ])

  const insights: Insight[] = []

  // Velocity insights
  insights.push(...generateVelocityInsights(patterns.velocity_trends, weekComparison))

  // Theme insights
  insights.push(...generateThemeInsights(themes, patterns.recurring_themes))

  // Roadmap insights
  insights.push(...generateRoadmapInsights(patterns.roadmap_status))

  // Achievement insights
  insights.push(...generateAchievementInsights(patterns))

  // Sort by priority
  insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Generate summary
  const summary = generateSummary(patterns, insights)

  return {
    insights,
    summary,
    generated_at: new Date(),
    workspace_momentum: patterns.overall_momentum,
  }
}

// ============================================
// Velocity Insights
// ============================================

function generateVelocityInsights(
  trends: VelocityTrend[],
  weekComparison: Awaited<ReturnType<typeof compareWeeks>>
): Insight[] {
  const insights: Insight[] = []

  // Week-over-week comparison
  if (weekComparison.this_week && weekComparison.last_week) {
    const conversationChange = weekComparison.comparison.find((c) => c.metric === 'total_conversations')
    const mscChange = weekComparison.comparison.find((c) => c.metric === 'total_msc_additions')
    const timeChange = weekComparison.comparison.find((c) => c.metric === 'total_time_minutes')

    // Throughput change insight
    if (conversationChange && conversationChange.significance !== 'low') {
      const direction = conversationChange.trend === 'up' ? 'increased' : 'decreased'
      insights.push({
        id: `velocity_conversations_${Date.now()}`,
        type: 'velocity',
        priority: conversationChange.significance === 'high' ? 'high' : 'medium',
        title: `Conversation velocity ${direction}`,
        message: `Your conversation throughput ${direction} by ${Math.abs(conversationChange.change_percent)}% compared to last week (${conversationChange.current_value} vs ${conversationChange.previous_value}).`,
        data: conversationChange,
        generated_at: new Date(),
      })
    }

    // Time investment insight
    if (timeChange && Math.abs(timeChange.change_percent) > 15) {
      const thisWeekHours = Math.round(weekComparison.this_week.total_duration_minutes / 60 * 10) / 10
      const lastWeekHours = Math.round(weekComparison.last_week.total_duration_minutes / 60 * 10) / 10
      const direction = timeChange.trend === 'up' ? 'more' : 'less'

      insights.push({
        id: `velocity_time_${Date.now()}`,
        type: 'velocity',
        priority: 'medium',
        title: `${direction === 'more' ? 'More' : 'Less'} time invested this week`,
        message: `You spent ${thisWeekHours} hours in OSQR this week vs ${lastWeekHours} hours last week (${timeChange.change_percent > 0 ? '+' : ''}${timeChange.change_percent}%).`,
        data: { thisWeekHours, lastWeekHours, change: timeChange },
        generated_at: new Date(),
      })
    }

    // Output velocity (MSC additions per hour)
    if (weekComparison.this_week.total_duration_minutes > 0 && weekComparison.last_week.total_duration_minutes > 0) {
      const thisWeekOutput = weekComparison.this_week.metrics.msc_additions / (weekComparison.this_week.total_duration_minutes / 60)
      const lastWeekOutput = weekComparison.last_week.metrics.msc_additions / (weekComparison.last_week.total_duration_minutes / 60)

      if (lastWeekOutput > 0) {
        const outputChange = ((thisWeekOutput - lastWeekOutput) / lastWeekOutput) * 100

        if (Math.abs(outputChange) > 20) {
          const direction = outputChange > 0 ? 'higher' : 'lower'
          insights.push({
            id: `velocity_output_${Date.now()}`,
            type: 'velocity',
            priority: Math.abs(outputChange) > 40 ? 'high' : 'medium',
            title: `Output efficiency is ${direction}`,
            message: `You're creating ${Math.round(thisWeekOutput * 10) / 10} MSC items per hour, which is ${Math.abs(Math.round(outputChange))}% ${direction} than last week.`,
            data: { thisWeekOutput, lastWeekOutput, outputChange },
            generated_at: new Date(),
          })
        }
      }
    }
  }

  return insights
}

// ============================================
// Theme Insights
// ============================================

function generateThemeInsights(
  themes: Awaited<ReturnType<typeof getThemes>>,
  recurringThemes: RecurringTheme[]
): Insight[] {
  const insights: Insight[] = []

  // Frequently mentioned themes
  const topThemes = themes.slice(0, 3)
  if (topThemes.length > 0) {
    const themeList = topThemes.map((t) => `"${t.theme}" (${t.count}x)`).join(', ')

    insights.push({
      id: `theme_recurring_${Date.now()}`,
      type: 'theme',
      priority: 'medium',
      title: 'Your recurring focus areas',
      message: `You've been consistently discussing: ${themeList}. These topics might warrant deeper attention or dedicated goals.`,
      data: { themes: topThemes },
      actionable: true,
      suggested_action: 'Consider creating specific goals or projects around these themes.',
      generated_at: new Date(),
    })
  }

  // Daily themes (high frequency)
  const dailyThemes = recurringThemes.filter((t) => t.frequency === 'daily' && t.trend === 'increasing')
  if (dailyThemes.length > 0) {
    insights.push({
      id: `theme_daily_${Date.now()}`,
      type: 'theme',
      priority: 'high',
      title: 'Hot topic detected',
      message: `"${dailyThemes[0].theme}" has come up ${dailyThemes[0].count} times recently and is trending upward. This seems to be a priority area.`,
      data: { theme: dailyThemes[0] },
      generated_at: new Date(),
    })
  }

  return insights
}

// ============================================
// Roadmap Insights
// ============================================

function generateRoadmapInsights(roadmapStatus: RoadmapStatus[]): Insight[] {
  const insights: Insight[] = []

  // Behind schedule items
  const behindItems = roadmapStatus.filter((r) => r.status === 'behind')
  if (behindItems.length > 0) {
    insights.push({
      id: `roadmap_behind_${Date.now()}`,
      type: 'warning',
      priority: 'high',
      title: 'Roadmap items need attention',
      message: `${behindItems.length} roadmap item(s) are behind schedule: ${behindItems.map((i) => i.item).join(', ')}.`,
      data: { items: behindItems },
      actionable: true,
      suggested_action: 'Review and adjust timelines or scope for these items.',
      generated_at: new Date(),
    })
  }

  // Progress on current items
  const inProgress = roadmapStatus.filter((r) => r.status === 'on_track' && r.actual_progress_percent > 0)
  if (inProgress.length > 0) {
    const item = inProgress[0]
    insights.push({
      id: `roadmap_progress_${Date.now()}`,
      type: 'roadmap',
      priority: 'medium',
      title: 'Roadmap progress update',
      message: `"${item.item}" is ${item.actual_progress_percent}% complete. ${item.notes || ''}`,
      data: { item },
      generated_at: new Date(),
    })
  }

  // Calibrated time estimates
  const notStarted = roadmapStatus.filter((r) => r.status === 'not_started')
  if (notStarted.length > 0) {
    const estimates: string[] = []

    if (notStarted.find((n) => n.item.includes('J-6'))) {
      estimates.push(`J-6 (Integrations): ~${velocityCalibration.estimated_completion['J-6_autonomous_time_minutes']} min autonomous build time`)
    }
    if (notStarted.find((n) => n.item.includes('J-9'))) {
      estimates.push(`J-9 (Voice): ~${velocityCalibration.estimated_completion['J-9_autonomous_time_minutes']} min autonomous build time`)
    }

    if (estimates.length > 0) {
      insights.push({
        id: `roadmap_estimates_${Date.now()}`,
        type: 'roadmap',
        priority: 'low',
        title: 'Remaining roadmap estimates',
        message: `Based on calibrated velocity: ${estimates.join('; ')}.`,
        data: { estimates },
        generated_at: new Date(),
      })
    }
  }

  return insights
}

// ============================================
// Achievement Insights
// ============================================

function generateAchievementInsights(patterns: PatternAnalysis): Insight[] {
  const insights: Insight[] = []

  // Momentum achievement
  if (patterns.overall_momentum === 'accelerating') {
    insights.push({
      id: `achievement_momentum_${Date.now()}`,
      type: 'achievement',
      priority: 'low',
      title: '🚀 Momentum is building',
      message: 'Your overall activity and output are accelerating. Keep this momentum going!',
      generated_at: new Date(),
    })
  }

  return insights
}

// ============================================
// Summary Generation
// ============================================

function generateSummary(patterns: PatternAnalysis, insights: Insight[]): string {
  const highPriority = insights.filter((i) => i.priority === 'high').length
  const momentumText = {
    'accelerating': 'picking up speed',
    'steady': 'maintaining a steady pace',
    'slowing': 'slowing down slightly',
  }[patterns.overall_momentum]

  let summary = `You're ${momentumText}.`

  if (highPriority > 0) {
    summary += ` ${highPriority} item(s) need your attention.`
  }

  if (patterns.recurring_themes.length > 0) {
    const topTheme = patterns.recurring_themes[0]
    summary += ` "${topTheme.theme}" continues to be a focus area.`
  }

  return summary
}

// ============================================
// Contextual Insight Surfacing
// ============================================

/**
 * Get insights relevant to a specific query/context
 */
export async function getContextualInsights(
  workspaceId: string,
  context: string
): Promise<Insight[]> {
  const bundle = await generateInsights(workspaceId)

  // Filter insights relevant to the context
  const contextLower = context.toLowerCase()
  const relevantInsights = bundle.insights.filter((insight) => {
    // High priority always relevant
    if (insight.priority === 'high') return true

    // Check if theme matches context
    if (insight.type === 'theme' && insight.data?.themes) {
      return (insight.data.themes as Array<{ theme: string }>).some((t) =>
        contextLower.includes(t.theme.toLowerCase())
      )
    }

    // Velocity insights relevant to progress discussions
    if (insight.type === 'velocity') {
      return /progress|velocity|throughput|productive|efficient/.test(contextLower)
    }

    // Roadmap insights relevant to planning
    if (insight.type === 'roadmap') {
      return /plan|roadmap|milestone|deadline|timeline/.test(contextLower)
    }

    return false
  })

  return relevantInsights.slice(0, 3) // Max 3 contextual insights
}

/**
 * Format insights for inclusion in OSQR prompts
 */
export function formatInsightsForPrompt(insights: Insight[]): string {
  if (insights.length === 0) return ''

  const lines = ['## Recent Insights from TIL (Temporal Intelligence Layer)']

  for (const insight of insights) {
    lines.push(`- **${insight.title}**: ${insight.message}`)
    if (insight.suggested_action) {
      lines.push(`  _Suggested action: ${insight.suggested_action}_`)
    }
  }

  return lines.join('\n')
}

/**
 * Get a proactive message OSQR can surface unprompted
 */
export async function getProactiveMessage(workspaceId: string): Promise<string | null> {
  const bundle = await generateInsights(workspaceId)

  // Only surface if there's something worth saying
  const highPriority = bundle.insights.filter((i) => i.priority === 'high')
  const achievements = bundle.insights.filter((i) => i.type === 'achievement')

  if (highPriority.length > 0) {
    const insight = highPriority[0]
    return `📊 **TIL Notice**: ${insight.title} — ${insight.message}`
  }

  if (achievements.length > 0 && Math.random() < 0.3) {
    // 30% chance to surface achievements
    const insight = achievements[0]
    return `${insight.title} ${insight.message}`
  }

  return null
}
