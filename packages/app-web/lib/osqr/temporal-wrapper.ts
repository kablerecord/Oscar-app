/**
 * Temporal Intelligence Wrapper with Database Persistence
 *
 * Extracts commitments, deadlines, and action items from conversations
 * using the LLM adapter for intelligent extraction. Persists to database
 * and enables learning from user outcomes.
 *
 * KEY INTEGRATION: This connects @osqr/core's TIL to oscar-app's database,
 * enabling the learning loop that was previously missing.
 */

import { featureFlags } from './config'
import { initializeAdapters, isInitialized } from '@/lib/adapters'
import { prisma } from '@/lib/db/prisma'
import OpenAI from 'openai'

// Import from @osqr/core Temporal namespace
import { Temporal } from '@osqr/core'

// Lazy initialization for OpenAI client
let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// ============================================================================
// Types
// ============================================================================

export interface CommitmentSource {
  type: string
  sourceId: string
  extractedAt: Date
}

export interface ExtractedCommitment {
  id: string
  text: string
  who: string
  what: string
  when: {
    rawText: string
    parsed?: Date
    isVague: boolean
    urgencyCategory: string
  }
  confidence: number
  source: CommitmentSource
}

export interface DigestItem {
  commitment: ExtractedCommitment
  priorityScore: number
  suggestedAction: string
  isUrgent: boolean
}

export interface MorningDigest {
  items: DigestItem[]
  summary: string
  date: string
}

export type NotificationType = 'digest' | 'realtime' | 'evening' | 'passive'
export type EngagementType = 'opened' | 'tapped' | 'acted' | 'dismissed' | 'snoozed'
export type ExplicitFeedback = 'stop_this_type' | 'more_like_this'

export interface TemporalPreferencesUpdate {
  quietHoursStart?: string
  quietHoursEnd?: string
  criticalCategories?: string[]
  preferredDigestTime?: string
  realtimeTolerance?: number
  categoryWeights?: Record<string, number>
}

// ============================================================================
// Signal Detection (Fast Path)
// ============================================================================

/**
 * Check if a message contains commitment signals
 * Uses fast heuristics for initial filtering
 */
export function hasCommitmentSignals(message: string): boolean {
  try {
    if (!featureFlags.enableTemporalIntelligence) return false

    // Check for commitment patterns
    return /\b(will|should|must|need to|have to|going to|plan to|want to|tomorrow|next week|by monday|deadline|due|asap|urgent|promise|commit)\b/i.test(
      message
    )
  } catch (error) {
    console.error('[Temporal] hasCommitmentSignals error:', error)
    return false // Skip extraction on error
  }
}

// ============================================================================
// Commitment Extraction
// ============================================================================

/**
 * Extract commitments from a message using LLM
 */
export async function extractCommitments(
  message: string,
  source: CommitmentSource
): Promise<ExtractedCommitment[]> {
  if (!featureFlags.enableTemporalIntelligence) return []

  // Quick filter - if no commitment signals, skip expensive LLM call
  if (!hasCommitmentSignals(message)) {
    return []
  }

  try {
    // Ensure adapters are initialized
    if (!isInitialized()) {
      initializeAdapters()
    }

    // Use GPT-4o-mini for cost-effective extraction
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract commitments, promises, and action items from the conversation.

For each commitment found, extract:
- who: Who made the commitment (user/assistant/both)
- what: What they committed to do
- when: When it should be done (exact date, relative time, or vague)
- urgencyCategory: "immediate" | "today" | "this_week" | "this_month" | "someday" | "vague"
- confidence: How confident you are this is a real commitment (0.0-1.0)

Only extract genuine commitments, not suggestions or hypotheticals.
Return a JSON array of commitments. If none found, return empty array [].

Example output:
[
  {
    "who": "user",
    "what": "review the PR",
    "when": { "rawText": "tomorrow", "urgencyCategory": "today" },
    "confidence": 0.9
  }
]`,
        },
        {
          role: 'user',
          content: message.slice(0, 4000), // Truncate long messages
        },
      ],
      max_tokens: 500,
      temperature: 0.2,
    })

    const content = response.choices[0]?.message?.content || '[]'

    // Try to extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const rawCommitments = JSON.parse(jsonMatch[0]) as Array<{
      who: string
      what: string
      when: { rawText: string; urgencyCategory: string }
      confidence: number
    }>

    // Convert to ExtractedCommitment format
    return rawCommitments.map((c, i) => ({
      id: `${source.sourceId}-${i}-${Date.now()}`,
      text: `${c.who} will ${c.what}`,
      who: c.who,
      what: c.what,
      when: {
        rawText: c.when.rawText,
        parsed: parseTimeExpression(c.when.rawText),
        isVague: c.when.urgencyCategory === 'vague' || c.when.urgencyCategory === 'someday',
        urgencyCategory: c.when.urgencyCategory,
      },
      confidence: c.confidence,
      source,
    }))
  } catch (error) {
    console.error('[Temporal Wrapper] Extraction failed:', error)
    return []
  }
}

/**
 * Extract commitments and persist to database
 * This is the main entry point for the conversation flow
 */
export async function extractCommitmentsFromText(
  text: string,
  userId: string,
  options?: {
    sourceType?: string
    sourceId?: string
  }
): Promise<{ commitments: ExtractedCommitment[]; persistedIds: string[] }> {
  if (!featureFlags.enableTemporalIntelligence) {
    return { commitments: [], persistedIds: [] }
  }

  const source: CommitmentSource = {
    type: options?.sourceType || 'text',
    sourceId: options?.sourceId || `text-${Date.now()}`,
    extractedAt: new Date(),
  }

  try {
    const commitments = await extractCommitments(text, source)

    if (commitments.length === 0) {
      return { commitments: [], persistedIds: [] }
    }

    // Persist to database
    const persistedIds: string[] = []

    for (const commitment of commitments) {
      // Only persist commitments with sufficient confidence
      if (commitment.confidence < 0.6) continue

      try {
        const dbCommitment = await prisma.tILCommitment.create({
          data: {
            userId,
            text: commitment.text,
            who: commitment.who,
            what: commitment.what,
            when: commitment.when.parsed,
            whenVague: commitment.when.isVague ? commitment.when.rawText : null,
            source: source.type,
            sourceId: source.sourceId,
            confidence: commitment.confidence,
            category: inferCategory(commitment.what),
            status: 'pending',
          },
        })
        persistedIds.push(dbCommitment.id)
      } catch (error) {
        console.error('[Temporal Wrapper] Failed to persist commitment:', error)
      }
    }

    if (persistedIds.length > 0) {
      console.log(`[Temporal Wrapper] Persisted ${persistedIds.length} commitments for user ${userId}`)
    }

    return { commitments, persistedIds }
  } catch (error) {
    console.error('[Temporal Wrapper] extractCommitmentsFromText error:', error)
    return { commitments: [], persistedIds: [] }
  }
}

// ============================================================================
// Outcome Recording (THE CRITICAL MISSING PIECE)
// ============================================================================

/**
 * Record an outcome for a commitment
 * This is the key function that was never being called!
 */
export async function recordOutcome(
  commitmentId: string,
  engagement: EngagementType,
  options?: {
    notificationType?: NotificationType
    feedback?: ExplicitFeedback
    timeToEngagement?: number
  }
): Promise<{ success: boolean; outcomeId?: string }> {
  if (!featureFlags.enableTemporalIntelligence) {
    return { success: false }
  }

  try {
    // Create outcome in database
    const outcome = await prisma.tILNotificationOutcome.create({
      data: {
        commitmentId,
        notificationType: options?.notificationType || 'passive',
        engagement,
        engagedAt: engagement !== 'dismissed' && engagement !== 'snoozed' ? new Date() : null,
        timeToEngagement: options?.timeToEngagement,
        feedback: options?.feedback,
      },
    })

    // Also record in @osqr/core for in-memory processing
    // This enables real-time preference adjustments
    Temporal.recordOutcome({
      commitmentId,
      notificationType: (options?.notificationType || 'passive') as Temporal.NotificationType,
      surfacedAt: new Date(),
      userEngaged: engagement !== 'dismissed',
      engagementType: engagement as Temporal.EngagementType,
      timeToEngagement: options?.timeToEngagement,
      explicitFeedback: options?.feedback as Temporal.ExplicitFeedback | undefined,
    })

    // Update commitment status based on engagement
    if (engagement === 'acted') {
      await prisma.tILCommitment.update({
        where: { id: commitmentId },
        data: { status: 'completed' },
      })
    } else if (engagement === 'dismissed') {
      await prisma.tILCommitment.update({
        where: { id: commitmentId },
        data: { status: 'dismissed' },
      })
    }

    console.log(`[Temporal Wrapper] Recorded outcome ${engagement} for commitment ${commitmentId}`)
    return { success: true, outcomeId: outcome.id }
  } catch (error) {
    console.error('[Temporal Wrapper] recordOutcome error:', error)
    return { success: false }
  }
}

// ============================================================================
// Morning Digest
// ============================================================================

/**
 * Get morning digest for a user
 * Returns prioritized suggestions based on their pending commitments
 */
export async function getMorningDigest(userId: string): Promise<MorningDigest> {
  if (!featureFlags.enableTemporalIntelligence) {
    return {
      items: [],
      summary: 'Temporal Intelligence is disabled.',
      date: new Date().toISOString().split('T')[0],
    }
  }

  try {
    // Get pending commitments for this user
    const commitments = await prisma.tILCommitment.findMany({
      where: {
        userId,
        status: 'pending',
      },
      orderBy: [
        { when: 'asc' }, // Soonest first
        { confidence: 'desc' }, // Then by confidence
      ],
      take: 10,
    })

    if (commitments.length === 0) {
      return {
        items: [],
        summary: 'No pending commitments.',
        date: new Date().toISOString().split('T')[0],
      }
    }

    // Convert to digest items
    const items: DigestItem[] = commitments.map((c) => {
      const urgencyCategory = c.whenVague
        ? categorizeVagueTime(c.whenVague)
        : categorizeDate(c.when)

      const commitment: ExtractedCommitment = {
        id: c.id,
        text: c.text,
        who: c.who || 'user',
        what: c.what,
        when: {
          rawText: c.whenVague || c.when?.toISOString() || 'unknown',
          parsed: c.when || undefined,
          isVague: !!c.whenVague,
          urgencyCategory,
        },
        confidence: c.confidence,
        source: {
          type: c.source,
          sourceId: c.sourceId || '',
          extractedAt: c.createdAt,
        },
      }

      return {
        commitment,
        priorityScore: calculatePriority(commitment),
        suggestedAction: generateSuggestedAction(commitment),
        isUrgent: ['immediate', 'today'].includes(urgencyCategory),
      }
    })

    // Sort by priority
    items.sort((a, b) => b.priorityScore - a.priorityScore)

    const urgentCount = items.filter((i) => i.isUrgent).length
    const summary =
      urgentCount > 0
        ? `You have ${urgentCount} urgent item${urgentCount > 1 ? 's' : ''} and ${items.length - urgentCount} other commitment${items.length - urgentCount !== 1 ? 's' : ''}.`
        : `You have ${items.length} pending commitment${items.length !== 1 ? 's' : ''}.`

    // Mark digest as sent for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.tILInterruptBudget.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        digestSent: true,
        digestItemIds: items.map((i) => i.commitment.id),
      },
      create: {
        userId,
        date: today,
        digestSent: true,
        digestItemIds: items.map((i) => i.commitment.id),
      },
    })

    return {
      items,
      summary,
      date: new Date().toISOString().split('T')[0],
    }
  } catch (error) {
    console.error('[Temporal Wrapper] getMorningDigest error:', error)
    return {
      items: [],
      summary: 'Error loading digest.',
      date: new Date().toISOString().split('T')[0],
    }
  }
}

// ============================================================================
// Preferences
// ============================================================================

/**
 * Get user's temporal preferences
 */
export async function getPreferences(userId: string): Promise<TemporalPreferencesUpdate | null> {
  try {
    const prefs = await prisma.tILTemporalPreferences.findUnique({
      where: { userId },
    })

    if (!prefs) return null

    return {
      quietHoursStart: prefs.quietHoursStart || undefined,
      quietHoursEnd: prefs.quietHoursEnd || undefined,
      criticalCategories: prefs.criticalCategories,
      preferredDigestTime: prefs.preferredDigestTime || undefined,
      realtimeTolerance: prefs.realtimeTolerance,
      categoryWeights: prefs.categoryWeights as Record<string, number> | undefined,
    }
  } catch (error) {
    console.error('[Temporal Wrapper] getPreferences error:', error)
    return null
  }
}

/**
 * Update user's temporal preferences
 */
export async function updatePreferences(
  userId: string,
  updates: TemporalPreferencesUpdate
): Promise<{ success: boolean }> {
  try {
    await prisma.tILTemporalPreferences.upsert({
      where: { userId },
      update: {
        quietHoursStart: updates.quietHoursStart,
        quietHoursEnd: updates.quietHoursEnd,
        criticalCategories: updates.criticalCategories,
        preferredDigestTime: updates.preferredDigestTime,
        realtimeTolerance: updates.realtimeTolerance,
        categoryWeights: updates.categoryWeights,
      },
      create: {
        userId,
        quietHoursStart: updates.quietHoursStart,
        quietHoursEnd: updates.quietHoursEnd,
        criticalCategories: updates.criticalCategories || [],
        preferredDigestTime: updates.preferredDigestTime,
        realtimeTolerance: updates.realtimeTolerance ?? 0.5,
        categoryWeights: updates.categoryWeights,
      },
    })

    // Also update in @osqr/core for real-time use
    Temporal.updatePreferences(userId, {
      quietHoursStart: updates.quietHoursStart || '21:00',
      quietHoursEnd: updates.quietHoursEnd || '07:00',
      criticalCategories: updates.criticalCategories || [],
      preferredDigestTime: updates.preferredDigestTime || '08:00',
      realtimeTolerance: updates.realtimeTolerance ?? 0.5,
    })

    return { success: true }
  } catch (error) {
    console.error('[Temporal Wrapper] updatePreferences error:', error)
    return { success: false }
  }
}

/**
 * Run learning adjustment based on recent outcomes
 */
export async function adjustLearning(userId: string): Promise<{
  success: boolean
  adjustments?: Partial<TemporalPreferencesUpdate>
}> {
  try {
    // Get recent outcomes for this user
    const recentOutcomes = await prisma.tILNotificationOutcome.findMany({
      where: {
        commitment: {
          userId,
        },
        surfacedAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Last 14 days
        },
      },
    })

    if (recentOutcomes.length < 5) {
      console.log(`[Temporal Wrapper] Not enough outcomes for learning (${recentOutcomes.length}/5)`)
      return { success: true }
    }

    // Calculate dismissal rate
    const dismissedCount = recentOutcomes.filter((o) => o.engagement === 'dismissed').length
    const dismissalRate = dismissedCount / recentOutcomes.length

    // Get current preferences
    const currentPrefs = await prisma.tILTemporalPreferences.findUnique({
      where: { userId },
    })

    const currentTolerance = currentPrefs?.realtimeTolerance ?? 0.5
    let newTolerance = currentTolerance

    // Adjust realtime tolerance based on dismissal rate
    if (dismissalRate > 0.5) {
      // User dismisses too often, reduce realtime
      newTolerance = Math.max(0.2, currentTolerance - 0.1)
    } else if (dismissalRate < 0.2) {
      // User engages well, can increase
      newTolerance = Math.min(0.8, currentTolerance + 0.05)
    }

    // Update preferences if changed
    if (newTolerance !== currentTolerance) {
      await prisma.tILTemporalPreferences.upsert({
        where: { userId },
        update: {
          realtimeTolerance: newTolerance,
          lastLearningRunAt: new Date(),
          outcomesProcessed: { increment: recentOutcomes.length },
        },
        create: {
          userId,
          realtimeTolerance: newTolerance,
          criticalCategories: [],
          lastLearningRunAt: new Date(),
          outcomesProcessed: recentOutcomes.length,
        },
      })

      console.log(
        `[Temporal Wrapper] Adjusted tolerance for ${userId}: ${currentTolerance.toFixed(2)} → ${newTolerance.toFixed(2)} (dismissal rate: ${(dismissalRate * 100).toFixed(0)}%)`
      )

      return {
        success: true,
        adjustments: { realtimeTolerance: newTolerance },
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Temporal Wrapper] adjustLearning error:', error)
    return { success: false }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a time expression into a Date (if possible)
 */
function parseTimeExpression(rawText: string): Date | undefined {
  const now = new Date()
  const lowerText = rawText.toLowerCase()

  if (lowerText.includes('today')) {
    return now
  }

  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }

  if (lowerText.includes('next week')) {
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek
  }

  if (lowerText.includes('next month')) {
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return nextMonth
  }

  // Try to parse day names
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  for (let i = 0; i < days.length; i++) {
    if (lowerText.includes(days[i])) {
      const targetDay = i
      const currentDay = now.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      const targetDate = new Date(now)
      targetDate.setDate(now.getDate() + daysUntil)
      return targetDate
    }
  }

  return undefined
}

/**
 * Categorize a vague time string
 */
function categorizeVagueTime(vague: string): string {
  const lower = vague.toLowerCase()
  if (lower.includes('asap') || lower.includes('immediately') || lower.includes('urgent')) {
    return 'immediate'
  }
  if (lower.includes('today')) return 'today'
  if (lower.includes('tomorrow')) return 'today' // Count as urgent
  if (lower.includes('this week') || lower.includes('next few days')) return 'this_week'
  if (lower.includes('this month') || lower.includes('soon')) return 'this_month'
  if (lower.includes('someday') || lower.includes('eventually')) return 'someday'
  return 'vague'
}

/**
 * Categorize a date
 */
function categorizeDate(date: Date | null): string {
  if (!date) return 'vague'

  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays < 0) return 'immediate' // Past due
  if (diffDays < 1) return 'today'
  if (diffDays < 2) return 'today' // Tomorrow counts as urgent
  if (diffDays < 7) return 'this_week'
  if (diffDays < 30) return 'this_month'
  return 'someday'
}

/**
 * Infer category from commitment text
 */
function inferCategory(what: string): string {
  const lower = what.toLowerCase()

  if (/\b(pay|payment|invoice|bill|money|bank|transfer|tax|salary)\b/.test(lower)) {
    return 'financial'
  }
  if (/\b(doctor|appointment|health|medication|prescription|hospital)\b/.test(lower)) {
    return 'health'
  }
  if (/\b(mom|dad|parent|family|kid|child|spouse|partner|brother|sister)\b/.test(lower)) {
    return 'family'
  }
  if (/\b(client|meeting|deadline|project|deliver|stakeholder|boss)\b/.test(lower)) {
    return 'work_client'
  }
  if (/\b(team|standup|sync|review|code|pr|deploy)\b/.test(lower)) {
    return 'work_internal'
  }
  if (/\b(friend|party|dinner|coffee|drinks|hang\s*out)\b/.test(lower)) {
    return 'social'
  }

  return 'personal'
}

/**
 * Calculate priority score for a commitment
 */
export function calculatePriority(commitment: ExtractedCommitment): number {
  const urgencyWeights: Record<string, number> = {
    immediate: 1.0,
    today: 0.9,
    this_week: 0.7,
    this_month: 0.5,
    someday: 0.3,
    vague: 0.2,
  }

  const urgencyScore = urgencyWeights[commitment.when.urgencyCategory] ?? 0.2
  const confidenceScore = commitment.confidence

  return urgencyScore * 0.6 + confidenceScore * 0.4
}

/**
 * Generate a suggested action for a commitment
 */
function generateSuggestedAction(commitment: ExtractedCommitment): string {
  if (commitment.when.urgencyCategory === 'immediate') {
    return `Do this now: ${commitment.what}`
  }
  if (commitment.when.urgencyCategory === 'today') {
    return `Schedule time today for: ${commitment.what}`
  }
  if (commitment.when.urgencyCategory === 'this_week') {
    return `Add to this week's tasks: ${commitment.what}`
  }
  return `Remember to: ${commitment.what}`
}

/**
 * Generate a morning digest of pending commitments (legacy function for compatibility)
 */
export function generateMorningDigest(
  userId: string,
  commitments: ExtractedCommitment[]
): MorningDigest {
  try {
    if (!featureFlags.enableTemporalIntelligence || commitments.length === 0) {
      return {
        items: [],
        summary: 'No pending commitments.',
        date: new Date().toISOString().split('T')[0],
      }
    }

    // Sort by urgency and confidence
    const sortedCommitments = [...commitments].sort((a, b) => {
      const urgencyOrder: Record<string, number> = {
        immediate: 0,
        today: 1,
        this_week: 2,
        this_month: 3,
        someday: 4,
        vague: 5,
      }
      const aUrgency = urgencyOrder[a.when.urgencyCategory] ?? 5
      const bUrgency = urgencyOrder[b.when.urgencyCategory] ?? 5

      if (aUrgency !== bUrgency) return aUrgency - bUrgency
      return b.confidence - a.confidence
    })

    const items: DigestItem[] = sortedCommitments.slice(0, 10).map((commitment) => ({
      commitment,
      priorityScore: calculatePriority(commitment),
      suggestedAction: generateSuggestedAction(commitment),
      isUrgent: ['immediate', 'today'].includes(commitment.when.urgencyCategory),
    }))

    const urgentCount = items.filter((i) => i.isUrgent).length
    const summary =
      urgentCount > 0
        ? `You have ${urgentCount} urgent item${urgentCount > 1 ? 's' : ''} and ${items.length - urgentCount} other commitment${items.length - urgentCount !== 1 ? 's' : ''}.`
        : `You have ${items.length} pending commitment${items.length !== 1 ? 's' : ''}.`

    return {
      items,
      summary,
      date: new Date().toISOString().split('T')[0],
    }
  } catch (error) {
    console.error('[Temporal] generateMorningDigest error:', error)
    return {
      items: [],
      summary: 'No pending commitments.',
      date: new Date().toISOString().split('T')[0],
    }
  }
}

/**
 * Check if we should send a digest based on user settings
 */
export function shouldSendDigest(userId: string): boolean {
  // For now, always return false - would check user preferences
  return false
}

/**
 * Format commitments for display in chat
 */
export function formatCommitmentsForDisplay(commitments: ExtractedCommitment[]): string {
  if (commitments.length === 0) {
    return 'No commitments tracked.'
  }

  const lines = commitments.map((c, i) => {
    const urgency =
      c.when.urgencyCategory === 'immediate' || c.when.urgencyCategory === 'today'
        ? ' [URGENT]'
        : ''
    return `${i + 1}. ${c.what}${urgency} (${c.when.rawText})`
  })

  return lines.join('\n')
}

/**
 * Format digest for display in chat
 */
export function formatDigestForDisplay(digest: MorningDigest): string {
  if (digest.items.length === 0) {
    return '## Good Morning!\n\nNo scheduled items for today.'
  }

  const lines = [
    '## Good Morning!',
    '',
    digest.summary,
    '',
    '### Your Commitments:',
    '',
  ]

  for (const item of digest.items) {
    const prefix = item.isUrgent ? '**[URGENT]**' : '-'
    lines.push(`${prefix} ${item.commitment.what} (${item.commitment.when.rawText})`)
  }

  return lines.join('\n')
}
