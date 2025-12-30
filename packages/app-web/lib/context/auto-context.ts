import { prisma } from '../db/prisma'
import { smartSearch } from '../knowledge/search'
import { getProfileContext } from '../profile/context'
import { generateIdentityContext } from '../identity/dimensions'

/**
 * Auto-Context System (J-2 Implementation)
 *
 * Automatically assembles relevant context for every OSQR query:
 * 1. Identity context (multi-dimensional user profile) - J-7 integration
 * 2. Profile context (basic user info)
 * 3. MSC context (goals, projects, ideas)
 * 4. Knowledge search (relevant documents)
 * 5. Recent thread summaries (conversation history)
 */

export interface AutoContextResult {
  context: string
  sources: {
    identity: boolean
    profile: boolean
    msc: boolean
    knowledge: boolean
    threads: boolean
    vaultStats: boolean // True if vault overview included
    systemMode: boolean // True if restricted to OSQR system docs only
  }
  // Raw data for potential UI display
  raw?: {
    mscItems?: MSCContextItem[]
    knowledgeChunks?: string
    recentThreads?: ThreadSummary[]
    vaultStats?: VaultStatsContext
  }
}

interface VaultStatsContext {
  documentCount: number
  indexedDocumentCount: number
  topTopics: string[]
  documentSummaries: Array<{ title: string; summary: string; topics: string[] }>
}

interface MSCContextItem {
  category: string
  content: string
  description?: string | null
  status: string
  dueDate?: Date | null
  isPinned: boolean
}

interface ThreadSummary {
  id: string
  title: string
  lastMessage: string
  updatedAt: Date
}

/**
 * Assemble all relevant context for a query
 *
 * System Mode: When enabled, restricts context to OSQR system docs only.
 * Useful for questions about OSQR's architecture, capabilities, roadmap, etc.
 */
export async function assembleContext(
  workspaceId: string,
  query: string,
  options: {
    includeIdentity?: boolean
    includeProfile?: boolean
    includeMSC?: boolean
    includeKnowledge?: boolean
    includeThreads?: boolean
    maxKnowledgeChunks?: number
    maxThreads?: number
    systemMode?: boolean // Restrict to OSQR system docs only
    knowledgeScope?: 'all' | 'system' | 'user' // Override knowledge search scope
  } = {}
): Promise<AutoContextResult> {
  const {
    includeIdentity = true,
    includeProfile = true,
    includeMSC = true,
    includeKnowledge = true,
    includeThreads = true,
    maxKnowledgeChunks = 5,
    maxThreads = 3,
    systemMode = false,
    knowledgeScope,
  } = options

  const sections: string[] = []
  const sources = {
    identity: false,
    profile: false,
    msc: false,
    knowledge: false,
    threads: false,
    vaultStats: false,
    systemMode,
  }
  const raw: AutoContextResult['raw'] = {}

  // In system mode, skip user-specific context
  const includeUserContext = !systemMode

  // System mode header for clarity
  if (systemMode) {
    sections.push(`## System Mode Active\nRestricted to OSQR system documentation only. User-specific context excluded.`)
  }

  // 1. Identity Context - multi-dimensional user profile (J-7)
  // Skip in system mode - this is user-specific
  if (includeIdentity && includeUserContext) {
    try {
      const identityContext = await generateIdentityContext(workspaceId)
      if (identityContext) {
        sections.push(`## User Identity & Preferences\n${identityContext}`)
        sources.identity = true
      }
    } catch (error) {
      console.error('[Auto-Context] Identity context error:', error)
      // Continue without identity context
    }
  }

  // 2. Profile Context - basic user info (legacy, supplements identity)
  // Skip in system mode - this is user-specific
  if (includeProfile && includeUserContext) {
    const profile = await getProfileContext(workspaceId)
    if (profile) {
      sections.push(`## About the User\n${profile}`)
      sources.profile = true
    }
  }

  // 2b. Vault Stats - high-level overview of user's knowledge vault
  // This gives Oscar awareness of what's in the vault without full retrieval
  // Skip in system mode - this is user-specific
  if (includeUserContext) {
    try {
      const vaultStats = await getVaultStatsContext(workspaceId)
      if (vaultStats) {
        let vaultText = `## Your Knowledge Vault Overview\n`
        vaultText += `You have access to the user's personal knowledge vault containing ${vaultStats.documentCount} documents.`
        if (vaultStats.indexedDocumentCount !== vaultStats.documentCount) {
          vaultText += ` (${vaultStats.indexedDocumentCount} are indexed and searchable)`
        }
        if (vaultStats.topTopics.length > 0) {
          vaultText += `\n\n**Main topics:** ${vaultStats.topTopics.join(', ')}`
        }
        // Include document summaries so Oscar "knows" what's in the vault
        if (vaultStats.documentSummaries.length > 0) {
          vaultText += `\n\n**What's in the vault:**`
          for (const doc of vaultStats.documentSummaries) {
            vaultText += `\n- **${doc.title}**: ${doc.summary}`
            if (doc.topics.length > 0) {
              vaultText += ` [${doc.topics.slice(0, 3).join(', ')}]`
            }
          }
        }
        vaultText += `\n\nYou can reference this knowledge when answering questions. The user may not explicitly mention their vault - use it proactively when relevant.`
        sections.push(vaultText)
        sources.vaultStats = true
        raw.vaultStats = vaultStats
      }
    } catch (error) {
      console.error('[Auto-Context] Vault stats error:', error)
    }
  }

  // 3. MSC Context - goals, projects, ideas
  // Skip in system mode - this is user-specific
  if (includeMSC && includeUserContext) {
    const mscContext = await getMSCContext(workspaceId)
    if (mscContext.text) {
      sections.push(`## Current Focus (Goals, Projects, Ideas)\n${mscContext.text}`)
      sources.msc = true
      raw.mscItems = mscContext.items
    }
  }

  // 4. Knowledge Search - relevant documents
  // Uses smartSearch with topic cache for instant relevance checks
  // In system mode, restrict to system scope (OSQR docs only)
  if (includeKnowledge && query) {
    // smartSearch uses topic cache to avoid expensive DB queries when no relevant docs exist
    // skipCacheCheck: true forces search even if cache says no matches (for system mode)
    const searchResult = await smartSearch({
      workspaceId,
      query,
      topK: maxKnowledgeChunks,
      skipCacheCheck: systemMode, // Always search in system mode
    })

    if (searchResult.searched && searchResult.context) {
      const header = systemMode ? '## OSQR System Knowledge' : '## Relevant Knowledge'
      sections.push(`${header}\n${searchResult.context}`)
      sources.knowledge = true
      raw.knowledgeChunks = searchResult.context

      // Log cache hit info for debugging
      if (searchResult.matchedTopics.length > 0) {
        console.log(`[Auto-Context] Knowledge search matched topics: ${searchResult.matchedTopics.slice(0, 5).join(', ')}`)
      }
    } else if (!searchResult.searched) {
      console.log('[Auto-Context] Skipped knowledge search - no matching topics in cache')
    }
  }

  // 5. Recent Threads - conversation history
  // Skip in system mode - this is user-specific
  if (includeThreads && includeUserContext) {
    const threads = await getRecentThreadContext(workspaceId, maxThreads)
    if (threads.text) {
      sections.push(`## Recent Conversations\n${threads.text}`)
      sources.threads = true
      raw.recentThreads = threads.summaries
    }
  }

  return {
    context: sections.length > 0 ? sections.join('\n\n---\n\n') : '',
    sources,
    raw,
  }
}

/**
 * Get MSC items formatted as context
 */
async function getMSCContext(workspaceId: string): Promise<{ text: string; items: MSCContextItem[] }> {
  const items = await prisma.mSCItem.findMany({
    where: {
      workspaceId,
      status: { in: ['active', 'in_progress'] }, // Only active items
    },
    orderBy: [
      { isPinned: 'desc' },
      { category: 'asc' },
      { updatedAt: 'desc' },
    ],
    take: 20, // Limit to most relevant
  })

  if (items.length === 0) {
    return { text: '', items: [] }
  }

  // Group by category
  type MSCItemType = (typeof items)[number]
  const byCategory: Record<string, typeof items> = {}
  items.forEach((item: MSCItemType) => {
    const cat = item.category
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(item)
  })

  // Format each category
  const sections: string[] = []

  // Goals first (most important)
  if (byCategory.goal?.length) {
    const goals = byCategory.goal.map((g: MSCItemType) => {
      let line = `- ${g.content}`
      if (g.status === 'in_progress') line += ' [IN PROGRESS]'
      if (g.dueDate) line += ` (due: ${formatDate(g.dueDate)})`
      if (g.description) line += `\n  ${g.description}`
      return line
    }).join('\n')
    sections.push(`**Goals:**\n${goals}`)
  }

  // Projects
  if (byCategory.project?.length) {
    const projects = byCategory.project.map((p: MSCItemType) => {
      let line = `- ${p.content}`
      if (p.status === 'in_progress') line += ' [IN PROGRESS]'
      if (p.dueDate) line += ` (due: ${formatDate(p.dueDate)})`
      if (p.description) line += `\n  ${p.description}`
      return line
    }).join('\n')
    sections.push(`**Projects:**\n${projects}`)
  }

  // Ideas (brief)
  if (byCategory.idea?.length) {
    const ideas = byCategory.idea.slice(0, 5).map((i: MSCItemType) => `- ${i.content}`).join('\n')
    sections.push(`**Ideas:**\n${ideas}`)
  }

  // Principles
  if (byCategory.principle?.length) {
    const principles = byCategory.principle.map((p: MSCItemType) => `- ${p.content}`).join('\n')
    sections.push(`**Guiding Principles:**\n${principles}`)
  }

  // Habits
  if (byCategory.habit?.length) {
    const habits = byCategory.habit.map((h: MSCItemType) => `- ${h.content}`).join('\n')
    sections.push(`**Active Habits:**\n${habits}`)
  }

  return {
    text: sections.join('\n\n'),
    items: items.map((i: MSCItemType) => ({
      category: i.category,
      content: i.content,
      description: i.description,
      status: i.status,
      dueDate: i.dueDate,
      isPinned: i.isPinned,
    })),
  }
}

/**
 * Get recent thread summaries as context
 */
async function getRecentThreadContext(
  workspaceId: string,
  limit: number
): Promise<{ text: string; summaries: ThreadSummary[] }> {
  const threads = await prisma.chatThread.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 2, // Last 2 messages for context
      },
    },
  })

  if (threads.length === 0) {
    return { text: '', summaries: [] }
  }

  type ThreadType = (typeof threads)[number]
  const summaries: ThreadSummary[] = threads.map((t: ThreadType) => ({
    id: t.id,
    title: t.title,
    lastMessage: t.messages[0]?.content?.slice(0, 200) || '',
    updatedAt: t.updatedAt,
  }))

  const text = threads.map((t: ThreadType) => {
    const lastMsg = t.messages[0]?.content?.slice(0, 150)
    return `- "${t.title}" (${formatRelativeTime(t.updatedAt)})${lastMsg ? `\n  Last: ${lastMsg}...` : ''}`
  }).join('\n')

  return { text, summaries }
}

/**
 * Format date as readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

/**
 * Quick context check - returns true if workspace has any context worth using
 */
export async function hasContext(workspaceId: string): Promise<boolean> {
  const [profileCount, mscCount, docCount] = await Promise.all([
    prisma.profileAnswer.count({ where: { workspaceId } }),
    prisma.mSCItem.count({ where: { workspaceId, status: { in: ['active', 'in_progress'] } } }),
    prisma.document.count({ where: { workspaceId } }),
  ])

  return profileCount > 0 || mscCount > 0 || docCount > 0
}

/**
 * Get vault stats context - overview of user's knowledge vault
 *
 * This provides Oscar with awareness of what's in the vault without
 * doing full document retrieval. It uses the DocumentInventory's
 * auto-generated summaries (created on upload using Haiku).
 */
async function getVaultStatsContext(workspaceId: string): Promise<VaultStatsContext | null> {
  // Get document counts
  const [documentCount, indexedDocumentCount] = await Promise.all([
    prisma.document.count({ where: { workspaceId } }),
    prisma.document.count({
      where: {
        workspaceId,
        chunks: { some: {} }, // Has at least one chunk = indexed
      },
    }),
  ])

  if (documentCount === 0) {
    return null // No vault to describe
  }

  // Get top topics and document summaries from inventory
  let topTopics: string[] = []
  let documentSummaries: Array<{ title: string; summary: string; topics: string[] }> = []

  try {
    // Get document IDs for this workspace
    const workspaceDocs = await prisma.document.findMany({
      where: { workspaceId },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 50, // Sample recent docs
    })
    const docIds = workspaceDocs.map(d => d.id)

    // Get inventory with summaries
    const inventoryItems = await prisma.documentInventory.findMany({
      where: {
        documentId: { in: docIds },
      },
      select: {
        title: true,
        autoSummary: true,
        topicTags: true,
      },
      orderBy: { uploadedAt: 'desc' },
      take: 15, // Limit to keep context manageable
    })

    // Build document summaries for context
    documentSummaries = inventoryItems
      .filter(item => item.autoSummary && item.autoSummary.length > 10)
      .map(item => ({
        title: item.title,
        summary: item.autoSummary.slice(0, 200), // Truncate long summaries
        topics: item.topicTags.slice(0, 3),
      }))

    // Flatten and count topics
    const topicCounts = new Map<string, number>()
    for (const item of inventoryItems) {
      for (const tag of item.topicTags) {
        topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1)
      }
    }

    // Get top 5 topics
    topTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag)
  } catch {
    // DocumentInventory might not exist or be empty - that's fine
  }

  return {
    documentCount,
    indexedDocumentCount,
    topTopics,
    documentSummaries,
  }
}

// ============================================
// System Mode Detection
// ============================================

/**
 * Detect if a message is explicitly requesting system mode
 * (user wants to query OSQR's own docs/architecture only)
 *
 * Triggers:
 * - /system or /sys prefix
 * - "system mode" or "sys mode" anywhere in message
 * - "@osqr" mention (asking OSQR about itself)
 */
export function isSystemModeRequest(message: string): boolean {
  const systemPatterns = [
    /^\/sys(?:tem)?\s+/i,           // /system or /sys prefix
    /system\s*mode/i,               // "system mode"
    /sys\s*mode/i,                  // "sys mode"
    /@osqr\b/i,                     // @osqr mention
    /\[system\]/i,                  // [system] tag
    /--system\b/i,                  // --system flag
  ]
  return systemPatterns.some((p) => p.test(message))
}

/**
 * Strip system mode prefix/flags from message to get clean query
 */
export function stripSystemModePrefix(message: string): string {
  return message
    .replace(/^\/sys(?:tem)?\s+/i, '')
    .replace(/\[system\]\s*/i, '')
    .replace(/--system\s*/i, '')
    .replace(/@osqr\s*/i, '')
    .replace(/system\s*mode[:\s]*/i, '')
    .replace(/sys\s*mode[:\s]*/i, '')
    .trim()
}

/**
 * Extract system mode and clean message from user input
 */
export function parseSystemMode(message: string): {
  systemMode: boolean
  cleanMessage: string
} {
  const systemMode = isSystemModeRequest(message)
  const cleanMessage = systemMode ? stripSystemModePrefix(message) : message
  return { systemMode, cleanMessage }
}
