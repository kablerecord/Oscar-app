/**
 * Pattern Detector - Temporal Intelligence Layer (J-1)
 *
 * Analyzes session and daily data to detect patterns in:
 * - Velocity changes
 * - Recurring themes
 * - Blocker patterns
 * - Progress vs roadmap
 */

import { getSnapshotRange, getThemes, type DailySnapshot, type ThemeCount } from './session-tracker'
import velocityCalibration from './velocity-calibration.json'

// ============================================
// Types
// ============================================

export interface VelocityTrend {
  metric: string
  current_value: number
  previous_value: number
  change_percent: number
  trend: 'up' | 'down' | 'stable'
  significance: 'high' | 'medium' | 'low'
}

export interface RecurringTheme {
  theme: string
  count: number
  frequency: 'daily' | 'weekly' | 'occasional'
  last_mentioned: Date
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface BlockerPattern {
  type: string
  frequency: number
  avg_resolution_time_minutes: number
  last_occurrence: Date
}

export interface RoadmapStatus {
  item: string
  status: 'ahead' | 'on_track' | 'behind' | 'not_started'
  estimated_completion?: Date
  actual_progress_percent: number
  notes?: string
}

export interface PatternAnalysis {
  velocity_trends: VelocityTrend[]
  recurring_themes: RecurringTheme[]
  blocker_patterns: BlockerPattern[]
  roadmap_status: RoadmapStatus[]
  overall_momentum: 'accelerating' | 'steady' | 'slowing'
  generated_at: Date
}

// ============================================
// Velocity Analysis
// ============================================

/**
 * Analyze velocity trends over time
 */
export async function analyzeVelocityTrends(
  workspaceId: string,
  days: number = 7
): Promise<VelocityTrend[]> {
  const snapshots = await getSnapshotRange(workspaceId, days)

  if (snapshots.length < 2) {
    return []
  }

  // Split into halves for comparison
  const midpoint = Math.floor(snapshots.length / 2)
  const firstHalf = snapshots.slice(0, midpoint)
  const secondHalf = snapshots.slice(midpoint)

  const trends: VelocityTrend[] = []

  // Conversations per day
  const firstConvos = avg(firstHalf.map((s) => s.metrics.conversations))
  const secondConvos = avg(secondHalf.map((s) => s.metrics.conversations))
  trends.push(createTrend('conversations_per_day', secondConvos, firstConvos))

  // MSC additions per day
  const firstMsc = avg(firstHalf.map((s) => s.metrics.msc_additions))
  const secondMsc = avg(secondHalf.map((s) => s.metrics.msc_additions))
  trends.push(createTrend('msc_additions_per_day', secondMsc, firstMsc))

  // Session duration
  const firstDuration = avg(firstHalf.map((s) => s.velocity.avg_session_duration))
  const secondDuration = avg(secondHalf.map((s) => s.velocity.avg_session_duration))
  trends.push(createTrend('avg_session_duration', secondDuration, firstDuration))

  // Completion rate
  const firstCompletion = avg(firstHalf.map((s) => s.velocity.completion_rate * 100))
  const secondCompletion = avg(secondHalf.map((s) => s.velocity.completion_rate * 100))
  trends.push(createTrend('completion_rate', secondCompletion, firstCompletion))

  return trends.filter((t) => t.significance !== 'low' || Math.abs(t.change_percent) > 10)
}

function createTrend(metric: string, current: number, previous: number): VelocityTrend {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0

  return {
    metric,
    current_value: Math.round(current * 10) / 10,
    previous_value: Math.round(previous * 10) / 10,
    change_percent: Math.round(change),
    trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
    significance: Math.abs(change) > 25 ? 'high' : Math.abs(change) > 10 ? 'medium' : 'low',
  }
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

// ============================================
// Theme Analysis
// ============================================

/**
 * Analyze recurring themes
 */
export async function analyzeRecurringThemes(workspaceId: string): Promise<RecurringTheme[]> {
  const themes = await getThemes(workspaceId)

  return themes.slice(0, 10).map((theme) => {
    const daysSinceLastMention = theme.last_mentioned
      ? Math.floor((Date.now() - new Date(theme.last_mentioned).getTime()) / 86400000)
      : 999

    let frequency: 'daily' | 'weekly' | 'occasional' = 'occasional'
    if (theme.count >= 7 && daysSinceLastMention <= 1) {
      frequency = 'daily'
    } else if (theme.count >= 3) {
      frequency = 'weekly'
    }

    return {
      theme: theme.theme,
      count: theme.count,
      frequency,
      last_mentioned: new Date(theme.last_mentioned),
      trend: daysSinceLastMention <= 1 ? 'increasing' : daysSinceLastMention <= 3 ? 'stable' : 'decreasing',
    }
  })
}

// ============================================
// Roadmap Progress Analysis
// ============================================

/**
 * Analyze progress against roadmap items
 */
export async function analyzeRoadmapProgress(workspaceId: string): Promise<RoadmapStatus[]> {
  // Use the calibration data for roadmap items
  const roadmap = velocityCalibration.remaining_roadmap

  const status: RoadmapStatus[] = []

  // J-1 is being built now
  status.push({
    item: 'J-1: Background Awareness',
    status: 'on_track',
    actual_progress_percent: 50, // We're building it now
    notes: 'Currently implementing TIL foundation',
  })

  // J-6 - not started
  if ('J-6_integrations' in roadmap) {
    status.push({
      item: 'J-6: Real-World Integrations',
      status: 'not_started',
      actual_progress_percent: 0,
      notes: 'Requires OAuth credentials setup',
    })
  }

  // J-9 - not started
  if ('J-9_voice' in roadmap) {
    status.push({
      item: 'J-9: Voice Layer',
      status: 'not_started',
      actual_progress_percent: 0,
      notes: 'Deferred until integrations complete',
    })
  }

  return status
}

// ============================================
// Full Pattern Analysis
// ============================================

/**
 * Run full pattern analysis
 */
export async function runPatternAnalysis(workspaceId: string): Promise<PatternAnalysis> {
  const [velocityTrends, recurringThemes, roadmapStatus] = await Promise.all([
    analyzeVelocityTrends(workspaceId),
    analyzeRecurringThemes(workspaceId),
    analyzeRoadmapProgress(workspaceId),
  ])

  // Determine overall momentum
  const upTrends = velocityTrends.filter((t) => t.trend === 'up').length
  const downTrends = velocityTrends.filter((t) => t.trend === 'down').length

  let overall_momentum: 'accelerating' | 'steady' | 'slowing' = 'steady'
  if (upTrends > downTrends + 1) {
    overall_momentum = 'accelerating'
  } else if (downTrends > upTrends + 1) {
    overall_momentum = 'slowing'
  }

  return {
    velocity_trends: velocityTrends,
    recurring_themes: recurringThemes,
    blocker_patterns: [], // Will be populated from actual blocker tracking
    roadmap_status: roadmapStatus,
    overall_momentum,
    generated_at: new Date(),
  }
}

// ============================================
// Comparison Utilities
// ============================================

/**
 * Compare current week to last week
 */
export async function compareWeeks(workspaceId: string): Promise<{
  this_week: DailySnapshot | null
  last_week: DailySnapshot | null
  comparison: VelocityTrend[]
}> {
  const thisWeekSnapshots = await getSnapshotRange(workspaceId, 7)
  const lastWeekSnapshots = await getSnapshotRange(workspaceId, 14)

  // Aggregate this week
  const thisWeek = thisWeekSnapshots.length > 0 ? aggregateSnapshots(thisWeekSnapshots) : null

  // Aggregate last week (days 7-14)
  const lastWeekOnly = lastWeekSnapshots.slice(0, 7)
  const lastWeek = lastWeekOnly.length > 0 ? aggregateSnapshots(lastWeekOnly) : null

  const comparison: VelocityTrend[] = []

  if (thisWeek && lastWeek) {
    comparison.push(createTrend(
      'total_conversations',
      thisWeek.metrics.conversations,
      lastWeek.metrics.conversations
    ))
    comparison.push(createTrend(
      'total_msc_additions',
      thisWeek.metrics.msc_additions,
      lastWeek.metrics.msc_additions
    ))
    comparison.push(createTrend(
      'total_completions',
      thisWeek.metrics.msc_completions,
      lastWeek.metrics.msc_completions
    ))
    comparison.push(createTrend(
      'total_time_minutes',
      thisWeek.total_duration_minutes,
      lastWeek.total_duration_minutes
    ))
  }

  return { this_week: thisWeek, last_week: lastWeek, comparison }
}

function aggregateSnapshots(snapshots: DailySnapshot[]): DailySnapshot {
  const aggregated: DailySnapshot = {
    date: snapshots[0]?.date || '',
    workspaceId: snapshots[0]?.workspaceId || '',
    sessions: 0,
    total_duration_minutes: 0,
    metrics: {
      conversations: 0,
      msc_additions: 0,
      msc_completions: 0,
      documents_added: 0,
      tasks_completed: 0,
      topics_discussed: [],
    },
    themes: [],
    velocity: {
      conversations_per_hour: 0,
      msc_items_per_day: 0,
      completion_rate: 0,
      avg_session_duration: 0,
    },
  }

  for (const snapshot of snapshots) {
    aggregated.sessions += snapshot.sessions
    aggregated.total_duration_minutes += snapshot.total_duration_minutes
    aggregated.metrics.conversations += snapshot.metrics.conversations
    aggregated.metrics.msc_additions += snapshot.metrics.msc_additions
    aggregated.metrics.msc_completions += snapshot.metrics.msc_completions
    aggregated.metrics.documents_added += snapshot.metrics.documents_added
    aggregated.metrics.tasks_completed += snapshot.metrics.tasks_completed
    aggregated.metrics.topics_discussed.push(...snapshot.metrics.topics_discussed)
  }

  // Calculate averages
  const days = snapshots.length
  aggregated.velocity.msc_items_per_day = aggregated.metrics.msc_additions / days
  aggregated.velocity.avg_session_duration = aggregated.sessions > 0
    ? aggregated.total_duration_minutes / aggregated.sessions
    : 0
  aggregated.velocity.conversations_per_hour = aggregated.total_duration_minutes > 0
    ? (aggregated.metrics.conversations / aggregated.total_duration_minutes) * 60
    : 0

  return aggregated
}
