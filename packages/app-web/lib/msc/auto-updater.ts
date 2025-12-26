import { prisma } from '../db/prisma'
import { ProviderRegistry } from '../ai/providers'

/**
 * MSC Auto-Updater (J-8 Implementation)
 *
 * Automatically detects goals, projects, ideas, and status updates
 * from OSQR conversations and suggests MSC updates.
 */

export interface MSCExtraction {
  type: 'new_goal' | 'new_project' | 'new_idea' | 'status_update' | 'completion'
  category: 'goal' | 'project' | 'idea' | 'principle' | 'habit'
  content: string
  description?: string
  confidence: number // 0-1
  relatedItemId?: string // For updates to existing items
  suggestedStatus?: 'active' | 'in_progress' | 'completed' | 'archived'
}

export interface MSCExtractionResult {
  extractions: MSCExtraction[]
  rawAnalysis?: string
}

/**
 * Extract potential MSC updates from a conversation
 */
export async function extractMSCUpdates(
  workspaceId: string,
  userMessage: string,
  osqrResponse: string
): Promise<MSCExtractionResult> {
  // Get existing MSC items for context
  const existingItems = await prisma.mSCItem.findMany({
    where: { workspaceId },
    select: {
      id: true,
      category: true,
      content: true,
      status: true,
    },
    take: 50, // Limit for prompt size
  })

  type ExistingItem = (typeof existingItems)[number]
  const existingContext = existingItems.length > 0
    ? `\nExisting items:\n${existingItems.map((i: ExistingItem) => `- [${i.category}] "${i.content}" (${i.status})`).join('\n')}`
    : ''

  // Use a fast model for extraction
  const provider = ProviderRegistry.getProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-5-haiku-20241022',
  })

  const extractionPrompt = `Analyze this conversation and extract any goals, projects, ideas, or status updates that should be tracked.

USER MESSAGE:
${userMessage}

OSQR RESPONSE:
${osqrResponse}
${existingContext}

Extract ONLY items that are clearly stated or strongly implied. Return JSON in this exact format:
{
  "extractions": [
    {
      "type": "new_goal|new_project|new_idea|status_update|completion",
      "category": "goal|project|idea|principle|habit",
      "content": "Brief title (max 100 chars)",
      "description": "Optional details",
      "confidence": 0.0-1.0,
      "relatedItemId": "existing item id if this is an update",
      "suggestedStatus": "active|in_progress|completed|archived"
    }
  ]
}

Guidelines:
- Only extract items the user EXPLICITLY mentions wanting to do/track
- Goals: Long-term objectives ("I want to...", "My goal is...")
- Projects: Specific things being built/created ("I'm working on...", "Building...")
- Ideas: Things to explore later ("Maybe I should...", "What if...")
- Status updates: Changes to existing items ("I finished...", "Started...")
- Confidence: 1.0 = explicitly stated, 0.7 = clearly implied, 0.5 = maybe
- Skip vague or hypothetical mentions
- Return empty extractions array if nothing concrete found

Return ONLY the JSON, no other text.`

  try {
    const rawAnalysis = await provider.generate({
      messages: [
        { role: 'user', content: extractionPrompt },
      ],
      temperature: 0.1, // Low temp for consistent extraction
    })

    // Parse JSON from response
    const jsonMatch = rawAnalysis.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { extractions: [], rawAnalysis }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const extractions: MSCExtraction[] = (parsed.extractions || [])
      .filter((e: any) => e.confidence >= 0.6) // Only high-confidence extractions
      .map((e: any) => ({
        type: e.type,
        category: e.category,
        content: e.content?.slice(0, 100) || '',
        description: e.description,
        confidence: e.confidence,
        relatedItemId: e.relatedItemId,
        suggestedStatus: e.suggestedStatus,
      }))

    return { extractions, rawAnalysis }
  } catch (error) {
    console.error('[MSC Auto-Update] Extraction failed:', error)
    return { extractions: [] }
  }
}

/**
 * Apply extracted MSC updates to the database
 */
export async function applyMSCUpdates(
  workspaceId: string,
  extractions: MSCExtraction[],
  autoApply: boolean = false
): Promise<{ applied: number; skipped: number }> {
  let applied = 0
  let skipped = 0

  for (const extraction of extractions) {
    // Skip low-confidence extractions unless auto-apply is explicitly enabled
    if (!autoApply && extraction.confidence < 0.8) {
      skipped++
      continue
    }

    try {
      if (extraction.type === 'status_update' || extraction.type === 'completion') {
        // Update existing item
        if (extraction.relatedItemId) {
          await prisma.mSCItem.update({
            where: { id: extraction.relatedItemId },
            data: {
              status: extraction.suggestedStatus || (extraction.type === 'completion' ? 'completed' : 'in_progress'),
            },
          })
          applied++
        }
      } else {
        // Create new item
        // First check for duplicates
        const existing = await prisma.mSCItem.findFirst({
          where: {
            workspaceId,
            content: { contains: extraction.content.slice(0, 50), mode: 'insensitive' },
          },
        })

        if (!existing) {
          // Get next sort order
          const lastItem = await prisma.mSCItem.findFirst({
            where: { workspaceId, category: extraction.category },
            orderBy: { sortOrder: 'desc' },
          })

          await prisma.mSCItem.create({
            data: {
              workspaceId,
              category: extraction.category,
              content: extraction.content,
              description: extraction.description,
              status: extraction.suggestedStatus || 'active',
              sortOrder: (lastItem?.sortOrder ?? -1) + 1,
            },
          })
          applied++
        } else {
          skipped++ // Duplicate
        }
      }
    } catch (error) {
      console.error('[MSC Auto-Update] Failed to apply extraction:', error)
      skipped++
    }
  }

  return { applied, skipped }
}

/**
 * Get pending MSC suggestions for user review
 * Returns extractions that need user confirmation
 */
export async function getPendingSuggestions(
  workspaceId: string,
  threadId: string
): Promise<MSCExtraction[]> {
  // For now, we store suggestions in memory/session
  // In production, you might want to persist these
  // This function returns empty for now - suggestions are shown inline
  return []
}

/**
 * Quick check if a conversation might contain MSC-relevant content
 * Used to avoid expensive extraction calls for every message
 */
export function mightContainMSCContent(text: string): boolean {
  const indicators = [
    /\b(goal|objective|target|aim)\b/i,
    /\b(project|building|creating|working on)\b/i,
    /\b(idea|maybe|what if|consider)\b/i,
    /\b(finished|completed|done with|started|began)\b/i,
    /\b(want to|plan to|going to|need to)\b/i,
    /\b(habit|routine|daily|weekly)\b/i,
    /\b(principle|value|rule|standard)\b/i,
  ]

  return indicators.some(pattern => pattern.test(text))
}

/**
 * Format MSC suggestions for display in chat
 */
export function formatSuggestionsForChat(extractions: MSCExtraction[]): string {
  if (extractions.length === 0) return ''

  const lines = ['**I noticed some things worth tracking:**']

  for (const e of extractions) {
    const icon = e.category === 'goal' ? '🎯' :
                 e.category === 'project' ? '📁' :
                 e.category === 'idea' ? '💡' :
                 e.category === 'habit' ? '🔄' :
                 e.category === 'principle' ? '⚖️' : '📌'

    if (e.type === 'status_update' || e.type === 'completion') {
      lines.push(`${icon} Update "${e.content}" → ${e.suggestedStatus}`)
    } else {
      lines.push(`${icon} New ${e.category}: "${e.content}"`)
    }
  }

  return lines.join('\n')
}
