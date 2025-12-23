/**
 * Cross-Session Memory for OSQR
 *
 * Enables OSQR to remember things from past conversations:
 * - Stores conversation summaries after each session
 * - Retrieves relevant context from past conversations
 * - Extracts key facts (name, preferences, projects) for quick recall
 */

import { prisma } from '@/lib/db/prisma'

interface KeyFacts {
  userName?: string
  workingOn?: string[]
  preferences?: Record<string, string>
  importantDates?: Record<string, string>
  goals?: string[]
  challenges?: string[]
}

interface ConversationSummaryInput {
  workspaceId: string
  threadId?: string
  messages: Array<{ role: string; content: string }>
}

/**
 * Generate a summary of a conversation using Claude
 */
export async function summarizeConversation(
  messages: Array<{ role: string; content: string }>
): Promise<{ summary: string; topics: string[]; keyFacts: KeyFacts }> {
  // Skip if too few messages
  if (messages.length < 3) {
    return { summary: '', topics: [], keyFacts: {} }
  }

  const { ProviderRegistry } = await import('@/lib/ai/providers')
  const provider = ProviderRegistry.getProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-sonnet-4-20250514',
  })

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'OSQR'}: ${m.content}`)
    .join('\n\n')

  const response = await provider.generate({
    messages: [
      {
        role: 'system',
        content: `You are summarizing a conversation for future reference. Extract:
1. A brief summary (2-3 sentences) of what was discussed
2. Key topics (3-5 keywords/phrases)
3. Key facts about the user that might be useful later

Respond in JSON format:
{
  "summary": "...",
  "topics": ["topic1", "topic2"],
  "keyFacts": {
    "userName": "...",
    "workingOn": ["project1", "project2"],
    "preferences": {"key": "value"},
    "goals": ["goal1"],
    "challenges": ["challenge1"]
  }
}

Only include keyFacts fields if they were explicitly mentioned. Be concise.`
      },
      {
        role: 'user',
        content: `Summarize this conversation:\n\n${conversationText}`
      }
    ],
    temperature: 0.2,
  })

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response
    if (response.includes('```')) {
      const match = response.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) jsonStr = match[1]
    }
    const parsed = JSON.parse(jsonStr.trim())
    return {
      summary: parsed.summary || '',
      topics: parsed.topics || [],
      keyFacts: parsed.keyFacts || {}
    }
  } catch {
    // If parsing fails, return a basic summary
    return {
      summary: response.slice(0, 500),
      topics: [],
      keyFacts: {}
    }
  }
}

/**
 * Save a conversation summary to the database
 */
export async function saveConversationSummary(
  input: ConversationSummaryInput
): Promise<void> {
  const { workspaceId, threadId, messages } = input

  // Generate summary
  const { summary, topics, keyFacts } = await summarizeConversation(messages)

  // Skip saving if no meaningful summary
  if (!summary || summary.length < 10) {
    return
  }

  // Check if we already have a summary for this thread
  if (threadId) {
    const existing = await prisma.conversationSummary.findFirst({
      where: { threadId }
    })

    if (existing) {
      // Update existing summary
      await prisma.conversationSummary.update({
        where: { id: existing.id },
        data: {
          summary,
          topics,
          keyFacts: keyFacts as object,
          messageCount: messages.length,
          updatedAt: new Date()
        }
      })
      return
    }
  }

  // Create new summary
  await prisma.conversationSummary.create({
    data: {
      workspaceId,
      threadId,
      summary,
      topics,
      keyFacts: keyFacts as object,
      messageCount: messages.length
    }
  })
}

/**
 * Retrieve cross-session memory context for OSQR
 * Returns recent conversation summaries and accumulated key facts
 */
export async function getCrossSessionMemory(
  workspaceId: string,
  limit: number = 5
): Promise<{
  recentSummaries: Array<{ summary: string; topics: string[]; createdAt: Date }>
  accumulatedFacts: KeyFacts
  hasMemory: boolean
}> {
  // Get recent conversation summaries
  const summaries = await prisma.conversationSummary.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      summary: true,
      topics: true,
      keyFacts: true,
      createdAt: true
    }
  })

  if (summaries.length === 0) {
    return {
      recentSummaries: [],
      accumulatedFacts: {},
      hasMemory: false
    }
  }

  // Accumulate key facts across all summaries (most recent takes precedence)
  const accumulatedFacts: KeyFacts = {}

  // Process oldest to newest so most recent overwrites
  for (const s of [...summaries].reverse()) {
    const facts = s.keyFacts as KeyFacts | null
    if (!facts) continue

    if (facts.userName) accumulatedFacts.userName = facts.userName

    if (facts.workingOn?.length) {
      accumulatedFacts.workingOn = Array.from(
        new Set([...(accumulatedFacts.workingOn || []), ...facts.workingOn])
      )
    }

    if (facts.goals?.length) {
      accumulatedFacts.goals = Array.from(
        new Set([...(accumulatedFacts.goals || []), ...facts.goals])
      )
    }

    if (facts.challenges?.length) {
      accumulatedFacts.challenges = Array.from(
        new Set([...(accumulatedFacts.challenges || []), ...facts.challenges])
      )
    }

    if (facts.preferences) {
      accumulatedFacts.preferences = {
        ...(accumulatedFacts.preferences || {}),
        ...facts.preferences
      }
    }
  }

  return {
    recentSummaries: summaries.map((s: { summary: string; topics: string[]; createdAt: Date }) => ({
      summary: s.summary,
      topics: s.topics,
      createdAt: s.createdAt
    })),
    accumulatedFacts,
    hasMemory: true
  }
}

/**
 * Format cross-session memory for inclusion in system prompt
 */
export function formatMemoryForPrompt(
  memory: Awaited<ReturnType<typeof getCrossSessionMemory>>
): string {
  if (!memory.hasMemory) {
    return ''
  }

  const parts: string[] = []

  // Add accumulated facts about the user
  const { accumulatedFacts } = memory
  if (Object.keys(accumulatedFacts).length > 0) {
    parts.push('## What you know about this user from past conversations:')

    if (accumulatedFacts.userName) {
      parts.push(`- Their name is ${accumulatedFacts.userName}`)
    }

    if (accumulatedFacts.workingOn?.length) {
      parts.push(`- They've been working on: ${accumulatedFacts.workingOn.join(', ')}`)
    }

    if (accumulatedFacts.goals?.length) {
      parts.push(`- Their goals include: ${accumulatedFacts.goals.join(', ')}`)
    }

    if (accumulatedFacts.challenges?.length) {
      parts.push(`- Challenges they've mentioned: ${accumulatedFacts.challenges.join(', ')}`)
    }
  }

  // Add recent conversation summaries
  if (memory.recentSummaries.length > 0) {
    parts.push('\n## Recent conversations:')

    for (const s of memory.recentSummaries.slice(0, 3)) {
      const daysAgo = Math.floor((Date.now() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`
      parts.push(`- ${timeLabel}: ${s.summary}`)
    }
  }

  return parts.join('\n')
}

/**
 * Get a brief memory context string for quick reference
 */
export async function getQuickMemoryContext(workspaceId: string): Promise<string | null> {
  const memory = await getCrossSessionMemory(workspaceId, 3)

  if (!memory.hasMemory) {
    return null
  }

  const formatted = formatMemoryForPrompt(memory)
  return formatted || null
}
