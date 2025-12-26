/**
 * PKV - Private Knowledge Vault
 *
 * The "other brain" in OSQR's two-brain model:
 * - GKVI (lib/knowledge/gkvi.ts): Global knowledge, shared across all users
 * - PKV (this file): Private knowledge, per-user personalization
 *
 * PKV aggregates all user-specific context:
 * 1. Identity Dimensions (communication style, expertise, learning patterns)
 * 2. MSC (Mission/Strategy/Context - goals, projects, ideas)
 * 3. Knowledge Base (uploaded documents, conversation history)
 * 4. Temporal Intelligence (recent sessions, patterns over time)
 *
 * @see lib/knowledge/gkvi.ts for the global brain
 */

import { prisma } from '../db/prisma'
import { getIdentityDimensions, generateIdentityContext, type IdentityDimensions } from '../identity/dimensions'
import { searchKnowledge } from './search'
import { getTILContext } from '../til'

// =============================================================================
// TYPES
// =============================================================================

export interface PKVContext {
  // Who the user is
  identity: IdentityDimensions | null
  identityPrompt: string | null

  // What they're working on (MSC)
  goals: PKVGoal[]
  projects: PKVProject[]
  currentFocus: string | null

  // What they know (knowledge base)
  relevantKnowledge: string | null

  // Recent patterns (TIL)
  temporalContext: string | null

  // Metadata
  workspaceId: string
  lastUpdated: Date
}

export interface PKVGoal {
  id: string
  title: string
  status: 'active' | 'achieved' | 'archived'
  progress: number
  dueDate?: Date
}

export interface PKVProject {
  id: string
  name: string
  status: 'planning' | 'active' | 'paused' | 'complete'
  description?: string
}

export interface BuildPKVOptions {
  workspaceId: string
  query?: string // If provided, searches knowledge base for relevant context
  includeIdentity?: boolean
  includeMSC?: boolean
  includeKnowledge?: boolean
  includeTemporal?: boolean
  maxKnowledgeChunks?: number
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Build complete PKV context for a user
 *
 * This is the main entry point - call this when constructing OSQR context
 *
 * @example
 * ```typescript
 * const pkv = await buildPKVContext({
 *   workspaceId: 'ws_123',
 *   query: 'Help me with my marketing strategy',
 *   includeIdentity: true,
 *   includeMSC: true,
 *   includeKnowledge: true,
 *   includeTemporal: true,
 * })
 * ```
 */
export async function buildPKVContext(options: BuildPKVOptions): Promise<PKVContext> {
  const {
    workspaceId,
    query,
    includeIdentity = true,
    includeMSC = true,
    includeKnowledge = true,
    includeTemporal = true,
    maxKnowledgeChunks = 5,
  } = options

  const context: PKVContext = {
    identity: null,
    identityPrompt: null,
    goals: [],
    projects: [],
    currentFocus: null,
    relevantKnowledge: null,
    temporalContext: null,
    workspaceId,
    lastUpdated: new Date(),
  }

  // Parallelize fetches for performance
  const [identity, msc, knowledge, temporal] = await Promise.all([
    // 1. Identity
    includeIdentity ? getIdentityDimensions(workspaceId).catch(() => null) : Promise.resolve(null),

    // 2. MSC (Goals & Projects)
    includeMSC ? fetchMSC(workspaceId).catch(() => ({ goals: [], projects: [], currentFocus: null })) : Promise.resolve({ goals: [], projects: [], currentFocus: null }),

    // 3. Knowledge Search (if query provided)
    includeKnowledge && query
      ? searchKnowledge({ workspaceId, query, topK: maxKnowledgeChunks, scope: 'user' }).catch(() => null)
      : Promise.resolve(null),

    // 4. Temporal Intelligence
    includeTemporal && query
      ? getTILContext(workspaceId, query).catch(() => null)
      : Promise.resolve(null),
  ])

  // Assemble context
  if (identity) {
    context.identity = identity
    context.identityPrompt = await generateIdentityContext(workspaceId)
  }

  if (msc) {
    context.goals = msc.goals
    context.projects = msc.projects
    context.currentFocus = msc.currentFocus
  }

  context.relevantKnowledge = knowledge ?? null
  context.temporalContext = temporal ?? null

  return context
}

/**
 * Format PKV context into a prompt section for OSQR
 */
export function formatPKVForPrompt(pkv: PKVContext): string {
  const sections: string[] = []

  // Identity Section
  if (pkv.identityPrompt) {
    sections.push(`## User Profile\n\n${pkv.identityPrompt}`)
  }

  // MSC Section (Goals & Projects)
  if (pkv.goals.length > 0 || pkv.projects.length > 0) {
    const mscParts: string[] = []

    if (pkv.currentFocus) {
      mscParts.push(`**Current Focus:** ${pkv.currentFocus}`)
    }

    if (pkv.goals.length > 0) {
      const activeGoals = pkv.goals.filter(g => g.status === 'active')
      if (activeGoals.length > 0) {
        const goalList = activeGoals
          .slice(0, 3) // Top 3 goals
          .map(g => `- ${g.title} (${g.progress}% complete${g.dueDate ? `, due ${formatDate(g.dueDate)}` : ''})`)
          .join('\n')
        mscParts.push(`**Active Goals:**\n${goalList}`)
      }
    }

    if (pkv.projects.length > 0) {
      const activeProjects = pkv.projects.filter(p => p.status === 'active' || p.status === 'planning')
      if (activeProjects.length > 0) {
        const projectList = activeProjects
          .slice(0, 3) // Top 3 projects
          .map(p => `- ${p.name} (${p.status})${p.description ? `: ${p.description}` : ''}`)
          .join('\n')
        mscParts.push(`**Active Projects:**\n${projectList}`)
      }
    }

    if (mscParts.length > 0) {
      sections.push(`## User's Mission & Goals\n\n${mscParts.join('\n\n')}`)
    }
  }

  // Knowledge Section
  if (pkv.relevantKnowledge) {
    sections.push(`## Relevant Knowledge from User's Vault\n\n${pkv.relevantKnowledge}`)
  }

  // Temporal Section
  if (pkv.temporalContext) {
    sections.push(`## Recent Context\n\n${pkv.temporalContext}`)
  }

  return sections.join('\n\n---\n\n')
}

/**
 * Get PKV summary (lightweight version for quick context)
 */
export async function getPKVSummary(workspaceId: string): Promise<string | null> {
  const pkv = await buildPKVContext({
    workspaceId,
    includeIdentity: true,
    includeMSC: true,
    includeKnowledge: false,
    includeTemporal: false,
  })

  if (!pkv.identity && pkv.goals.length === 0 && pkv.projects.length === 0) {
    return null
  }

  return formatPKVForPrompt(pkv)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Fetch MSC (Mission/Strategy/Context) from database
 * Uses MSCItem model with category field to distinguish goals, projects, ideas
 */
async function fetchMSC(workspaceId: string): Promise<{
  goals: PKVGoal[]
  projects: PKVProject[]
  currentFocus: string | null
}> {
  // Fetch all MSC items
  const mscItems = await prisma.mSCItem.findMany({
    where: {
      workspaceId,
      status: { in: ['active', 'in_progress', 'completed'] },
    },
    orderBy: [
      { isPinned: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: 20,
  })

  // Separate by category
  type MSCItemType = (typeof mscItems)[number]
  const goalItems = mscItems.filter((item: MSCItemType) => item.category === 'goal')
  const projectItems = mscItems.filter((item: MSCItemType) => item.category === 'project')

  // Determine current focus (pinned item or most recently updated)
  const pinnedItem = mscItems.find((item: MSCItemType) => item.isPinned)
  const currentFocus = pinnedItem?.content || mscItems[0]?.content || null

  return {
    goals: goalItems.map((g: MSCItemType) => ({
      id: g.id,
      title: g.content,
      status: g.status as 'active' | 'achieved' | 'archived',
      progress: 0, // MSCItem doesn't have progress field
      dueDate: g.dueDate ?? undefined,
    })),
    projects: projectItems.map((p: MSCItemType) => ({
      id: p.id,
      name: p.content,
      status: p.status as 'planning' | 'active' | 'paused' | 'complete',
      description: p.description ?? undefined,
    })),
    currentFocus,
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays <= 7) return `in ${diffDays} days`
  if (diffDays <= 30) return `in ${Math.ceil(diffDays / 7)} weeks`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// =============================================================================
// PKV + GKVI INTEGRATION
// =============================================================================

/**
 * Build complete OSQR context combining GKVI (global) and PKV (private)
 *
 * This is the ultimate context assembly function for OSQR responses.
 */
export async function buildCompleteContext(options: {
  workspaceId: string
  userMessage: string
  userLevel?: number
  questionType?: string
}): Promise<{
  gkviContext: string
  pkvContext: string
  combinedContext: string
}> {
  // Import GKVI dynamically to avoid circular deps
  const { buildGKVIContext, getOSQRIdentity, getGlobalContext } = await import('./gkvi')

  // Build GKVI (global brain)
  const identity = getOSQRIdentity()
  const gkviCore = buildGKVIContext({
    userLevel: options.userLevel,
    questionType: options.questionType,
  })
  const artifacts = getGlobalContext('artifacts')
  const gkviContext = `${identity}\n\n---\n\n## OSQR CORE INDEX\n\n${gkviCore}\n\n---\n\n${artifacts}`

  // Build PKV (private brain)
  const pkv = await buildPKVContext({
    workspaceId: options.workspaceId,
    query: options.userMessage,
    includeIdentity: true,
    includeMSC: true,
    includeKnowledge: true,
    includeTemporal: true,
  })
  const pkvContext = formatPKVForPrompt(pkv)

  // Combine with clear separation
  const combinedContext = pkvContext
    ? `${gkviContext}\n\n===== USER CONTEXT (PRIVATE) =====\n\n${pkvContext}`
    : gkviContext

  return {
    gkviContext,
    pkvContext,
    combinedContext,
  }
}
