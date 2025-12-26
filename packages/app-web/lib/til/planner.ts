/**
 * 90-Day Planning Engine - Temporal Intelligence Layer
 *
 * Uses TIL data (sessions, patterns, velocity) + roadmap to generate
 * realistic, calibrated plans based on actual execution history.
 *
 * Key insight: Plans are only as good as the data they're built on.
 * With < 2 weeks of TIL data, we warn about low confidence.
 */

import { prisma } from '../db/prisma'
import { getSnapshotRange, getThemes } from './session-tracker'
import { runPatternAnalysis, compareWeeks } from './pattern-detector'
import { generateInsights } from './insights-generator'
import velocityCalibration from './velocity-calibration.json'
import { ProviderRegistry } from '../ai/providers'

// ============================================
// Types
// ============================================

export interface Plan90Request {
  workspaceId: string
  targetRevenue?: number
  targetLaunchDate?: string
  mode: 'realistic' | 'aggressive'
  lookbackDays?: number // Default 90
}

export interface WeekPlan {
  weekNumber: number
  dateRange: string
  focus: string
  goals: string[]
  milestones: string[]
  risks: string[]
  confidence: number // 0-1, based on historical data support
}

export interface Plan90 {
  summary: string
  strategy: string
  weeks: WeekPlan[]
  risks: string[]
  assumptions: string[]
  calibrationWarning?: string
  metadata: {
    generatedAt: string
    mode: 'realistic' | 'aggressive'
    dataPoints: number
    avgWeeklyVelocity: number
    confidenceScore: number
  }
}

// ============================================
// Data Collection
// ============================================

interface HistoricalSummary {
  totalDays: number
  totalSessions: number
  totalConversations: number
  totalMscAdditions: number
  totalMscCompletions: number
  avgSessionsPerDay: number
  avgConversationsPerDay: number
  avgMscItemsPerDay: number
  topThemes: string[]
  momentum: 'accelerating' | 'steady' | 'slowing'
  completionRate: number
}

async function collectHistoricalData(
  workspaceId: string,
  days: number
): Promise<HistoricalSummary> {
  const snapshots = await getSnapshotRange(workspaceId, days)
  const themes = await getThemes(workspaceId)
  const patterns = await runPatternAnalysis(workspaceId)

  if (snapshots.length === 0) {
    return {
      totalDays: 0,
      totalSessions: 0,
      totalConversations: 0,
      totalMscAdditions: 0,
      totalMscCompletions: 0,
      avgSessionsPerDay: 0,
      avgConversationsPerDay: 0,
      avgMscItemsPerDay: 0,
      topThemes: [],
      momentum: 'steady',
      completionRate: 0,
    }
  }

  const totals = snapshots.reduce(
    (acc, s) => ({
      sessions: acc.sessions + s.sessions,
      conversations: acc.conversations + s.metrics.conversations,
      mscAdditions: acc.mscAdditions + s.metrics.msc_additions,
      mscCompletions: acc.mscCompletions + s.metrics.msc_completions,
    }),
    { sessions: 0, conversations: 0, mscAdditions: 0, mscCompletions: 0 }
  )

  const activeDays = snapshots.length

  return {
    totalDays: activeDays,
    totalSessions: totals.sessions,
    totalConversations: totals.conversations,
    totalMscAdditions: totals.mscAdditions,
    totalMscCompletions: totals.mscCompletions,
    avgSessionsPerDay: totals.sessions / activeDays,
    avgConversationsPerDay: totals.conversations / activeDays,
    avgMscItemsPerDay: totals.mscAdditions / activeDays,
    topThemes: themes.slice(0, 5).map((t) => t.theme),
    momentum: patterns.overall_momentum,
    completionRate:
      totals.mscAdditions > 0 ? totals.mscCompletions / totals.mscAdditions : 0,
  }
}

// ============================================
// Roadmap & MSC Data
// ============================================

interface RoadmapContext {
  remainingItems: string[]
  currentGoals: string[]
  currentProjects: string[]
  estimatedTotalMinutes: number
}

async function getRoadmapContext(workspaceId: string): Promise<RoadmapContext> {
  // Get active MSC items
  const mscItems = await prisma.mSCItem.findMany({
    where: {
      workspaceId,
      status: { in: ['active', 'in_progress'] },
    },
    orderBy: { isPinned: 'desc' },
  })

  type MSCItem = (typeof mscItems)[number]
  const goals = mscItems
    .filter((i: MSCItem) => i.category === 'goal')
    .map((i: MSCItem) => i.content)
  const projects = mscItems
    .filter((i: MSCItem) => i.category === 'project')
    .map((i: MSCItem) => i.content)

  // Use velocity calibration for remaining roadmap estimates
  const remaining = velocityCalibration.remaining_roadmap as Record<string, unknown>
  const estimates = velocityCalibration.estimated_completion as Record<string, unknown>

  const remainingItems: string[] = []
  let totalMinutes = 0

  if (remaining['J-6_integrations']) {
    remainingItems.push('J-6: Real-World Integrations (Calendar, Email)')
    totalMinutes += (estimates['J-6_autonomous_time_minutes'] as number) || 45
  }
  if (remaining['J-9_voice']) {
    remainingItems.push('J-9: Voice Layer')
    totalMinutes += (estimates['J-9_autonomous_time_minutes'] as number) || 15
  }

  return {
    remainingItems,
    currentGoals: goals.slice(0, 5),
    currentProjects: projects.slice(0, 5),
    estimatedTotalMinutes: totalMinutes,
  }
}

// ============================================
// Plan Generation
// ============================================

const PLANNING_PROMPT = `You are OSQR's Temporal Planner - an AI that creates realistic plans based on actual execution data.

You have access to:
1. Historical execution data (sessions, conversations, completions)
2. Current velocity metrics and momentum
3. Remaining roadmap items with calibrated time estimates
4. Active goals and projects

Your job is to create a {{MODE}} 90-day plan that this specific builder can actually execute.

CRITICAL RULES:
- Base ALL estimates on the provided historical velocity data
- For "realistic" mode: assume 80% of historical velocity
- For "aggressive" mode: assume 110% of historical velocity, but flag risks
- Each week needs a clear focus, concrete goals, and identified risks
- Acknowledge when data is limited (< 14 days) with lower confidence scores
- Be specific about Jarvis capabilities and when they'll be completed
- Include buffer time for unexpected blockers (historically ~20% of time)

OUTPUT FORMAT (JSON):
{
  "summary": "2-3 sentence overview of the plan",
  "strategy": "High-level approach and key priorities",
  "weeks": [
    {
      "weekNumber": 1,
      "dateRange": "Dec 9-15",
      "focus": "Primary focus for this week",
      "goals": ["Specific goal 1", "Specific goal 2"],
      "milestones": ["Milestone if applicable"],
      "risks": ["Risk if applicable"],
      "confidence": 0.8
    }
  ],
  "risks": ["Top 3 overall risks"],
  "assumptions": ["Key assumptions this plan depends on"]
}

---

HISTORICAL DATA:
{{HISTORICAL_DATA}}

VELOCITY METRICS:
{{VELOCITY_METRICS}}

ROADMAP CONTEXT:
{{ROADMAP_CONTEXT}}

TARGET (if specified):
{{TARGET}}

Generate the {{MODE}} 90-day plan now.`

export async function generatePlan90(request: Plan90Request): Promise<Plan90> {
  const { workspaceId, mode, lookbackDays = 90 } = request

  // Collect all context
  const [historical, roadmap, weekComparison, insights] = await Promise.all([
    collectHistoricalData(workspaceId, lookbackDays),
    getRoadmapContext(workspaceId),
    compareWeeks(workspaceId),
    generateInsights(workspaceId),
  ])

  // Calculate confidence based on data availability
  const dataConfidence = Math.min(historical.totalDays / 14, 1) // Full confidence at 14+ days
  const calibrationWarning =
    historical.totalDays < 14
      ? `Warning: Only ${historical.totalDays} days of execution data available. Plan confidence is reduced. More accurate planning requires 2+ weeks of tracked activity.`
      : undefined

  // Build prompt context
  const historicalDataStr = `
- Total active days: ${historical.totalDays}
- Total sessions: ${historical.totalSessions}
- Total conversations: ${historical.totalConversations}
- MSC items added: ${historical.totalMscAdditions}
- MSC items completed: ${historical.totalMscCompletions}
- Average sessions/day: ${historical.avgSessionsPerDay.toFixed(1)}
- Average conversations/day: ${historical.avgConversationsPerDay.toFixed(1)}
- Average MSC items/day: ${historical.avgMscItemsPerDay.toFixed(1)}
- Completion rate: ${(historical.completionRate * 100).toFixed(0)}%
- Current momentum: ${historical.momentum}
- Top themes: ${historical.topThemes.join(', ') || 'None tracked yet'}`

  const velocityStr = `
- Base velocity: ${velocityCalibration.base_velocity.effective_lines_per_minute} lines/minute
- Module creation multiplier: ${velocityCalibration.velocity_by_category.module_creation.multiplier}x
- API creation multiplier: ${velocityCalibration.velocity_by_category.api_creation.multiplier}x
- Week-over-week trend: ${weekComparison.comparison.find((c) => c.metric === 'total_conversations')?.trend || 'stable'}
- Overall momentum: ${insights.workspace_momentum}`

  const roadmapStr = `
- Remaining Jarvis items: ${roadmap.remainingItems.join(', ') || 'None'}
- Estimated remaining time: ${roadmap.estimatedTotalMinutes} minutes autonomous build
- Current goals: ${roadmap.currentGoals.join(', ') || 'None set'}
- Current projects: ${roadmap.currentProjects.join(', ') || 'None set'}`

  const targetStr = request.targetRevenue
    ? `Revenue target: $${request.targetRevenue}${request.targetLaunchDate ? `, Launch by: ${request.targetLaunchDate}` : ''}`
    : 'No specific revenue target set'

  // Build final prompt
  const prompt = PLANNING_PROMPT.replace(/\{\{MODE\}\}/g, mode)
    .replace('{{HISTORICAL_DATA}}', historicalDataStr)
    .replace('{{VELOCITY_METRICS}}', velocityStr)
    .replace('{{ROADMAP_CONTEXT}}', roadmapStr)
    .replace('{{TARGET}}', targetStr)

  // Call the model
  const provider = ProviderRegistry.getProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-sonnet-4-20250514',
  })

  const response = await provider.generate({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  // Parse response
  let plan: Omit<Plan90, 'metadata' | 'calibrationWarning'>

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    plan = JSON.parse(jsonMatch[0])
  } catch {
    // Fallback structure if parsing fails
    plan = {
      summary: response.slice(0, 200),
      strategy: 'Unable to parse structured plan. Review raw response.',
      weeks: [],
      risks: ['Plan parsing failed - manual review needed'],
      assumptions: [],
    }
  }

  // Calculate overall confidence
  const weekConfidences = plan.weeks.map((w) => w.confidence || 0.5)
  const avgWeekConfidence =
    weekConfidences.length > 0
      ? weekConfidences.reduce((a, b) => a + b, 0) / weekConfidences.length
      : 0.5
  const overallConfidence = avgWeekConfidence * dataConfidence

  return {
    ...plan,
    calibrationWarning,
    metadata: {
      generatedAt: new Date().toISOString(),
      mode,
      dataPoints: historical.totalDays,
      avgWeeklyVelocity: historical.avgMscItemsPerDay * 7,
      confidenceScore: Math.round(overallConfidence * 100) / 100,
    },
  }
}

// ============================================
// Plan Formatting
// ============================================

export function formatPlanForChat(plan: Plan90): string {
  const lines: string[] = []

  // Header
  lines.push(`## 90-Day Plan (${plan.metadata.mode} mode)\n`)

  // Warning if applicable
  if (plan.calibrationWarning) {
    lines.push(`> ⚠️ ${plan.calibrationWarning}\n`)
  }

  // Summary
  lines.push(`### Summary\n${plan.summary}\n`)

  // Strategy
  lines.push(`### Strategy\n${plan.strategy}\n`)

  // Weekly breakdown
  lines.push('### Weekly Breakdown\n')
  for (const week of plan.weeks.slice(0, 13)) {
    // Cap at 13 weeks (90 days)
    const confidenceEmoji =
      week.confidence >= 0.8 ? '🟢' : week.confidence >= 0.5 ? '🟡' : '🔴'
    lines.push(
      `**Week ${week.weekNumber}** (${week.dateRange}) ${confidenceEmoji}`
    )
    lines.push(`*Focus: ${week.focus}*`)
    if (week.goals.length > 0) {
      lines.push(`Goals: ${week.goals.join(', ')}`)
    }
    if (week.milestones.length > 0) {
      lines.push(`Milestones: ${week.milestones.join(', ')}`)
    }
    if (week.risks.length > 0) {
      lines.push(`Risks: ${week.risks.join(', ')}`)
    }
    lines.push('')
  }

  // Risks
  if (plan.risks.length > 0) {
    lines.push('### Key Risks')
    plan.risks.forEach((r) => lines.push(`- ${r}`))
    lines.push('')
  }

  // Assumptions
  if (plan.assumptions.length > 0) {
    lines.push('### Assumptions')
    plan.assumptions.forEach((a) => lines.push(`- ${a}`))
    lines.push('')
  }

  // Metadata
  lines.push('---')
  lines.push(
    `*Confidence: ${Math.round(plan.metadata.confidenceScore * 100)}% | Based on ${plan.metadata.dataPoints} days of data | Generated ${new Date(plan.metadata.generatedAt).toLocaleDateString()}*`
  )

  return lines.join('\n')
}

// ============================================
// Command Detection
// ============================================

export function isPlanningRequest(message: string): boolean {
  const planPatterns = [
    /plan.*(\d+).*day/i,
    /(\d+).*day.*plan/i,
    /build.*plan/i,
    /create.*plan/i,
    /analyze.*and.*plan/i,
    /realistic.*plan/i,
    /aggressive.*plan/i,
    /next.*90.*day/i,
    /next.*3.*month/i,
    /\/plan90/i,
    /what.*should.*next.*90/i,
  ]
  return planPatterns.some((p) => p.test(message))
}

export function extractPlanParams(message: string): Partial<Plan90Request> {
  const params: Partial<Plan90Request> = {}

  // Detect mode
  if (/aggressive/i.test(message)) {
    params.mode = 'aggressive'
  } else {
    params.mode = 'realistic'
  }

  // Detect revenue target
  const revenueMatch = message.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i)
  if (revenueMatch) {
    params.targetRevenue = parseFloat(revenueMatch[1].replace(/,/g, ''))
  }

  // Detect launch date
  const dateMatch = message.match(
    /(?:by|before|launch)\s+(\w+\s+\d{1,2}(?:,?\s+\d{4})?)/i
  )
  if (dateMatch) {
    params.targetLaunchDate = dateMatch[1]
  }

  return params
}
