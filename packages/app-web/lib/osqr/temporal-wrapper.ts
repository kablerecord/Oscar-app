/**
 * Temporal Intelligence Wrapper
 *
 * Extracts commitments, deadlines, and action items from conversations
 * using the LLM adapter for intelligent extraction.
 */

import { featureFlags } from './config'
import { initializeAdapters, isInitialized } from '@/lib/adapters'
import OpenAI from 'openai'

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

/**
 * Check if a message contains commitment signals
 * Uses fast heuristics for initial filtering
 */
export function hasCommitmentSignals(message: string): boolean {
  if (!featureFlags.enableTemporalIntelligence) return false

  // Check for commitment patterns
  return /\b(will|should|must|need to|have to|going to|plan to|want to|tomorrow|next week|by monday|deadline|due|asap|urgent|promise|commit)\b/i.test(
    message
  )
}

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
 * Generate a morning digest of pending commitments
 */
export function generateMorningDigest(
  userId: string,
  commitments: ExtractedCommitment[]
): MorningDigest {
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
}

/**
 * Check if we should send a digest based on user settings
 */
export function shouldSendDigest(userId: string): boolean {
  // For now, always return false - would check user preferences
  return false
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
