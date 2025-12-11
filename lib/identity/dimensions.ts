/**
 * Identity Dimensions Engine (J-7 Implementation)
 *
 * Multi-dimensional identity model that goes beyond capability levels.
 * Tracks communication style, expertise domains, learning patterns,
 * and evolves dynamically from conversations.
 *
 * Dimensions:
 * 1. Capability Level (existing 0-12 ladder)
 * 2. Communication Style (technical/conversational, brief/detailed, etc.)
 * 3. Expertise Domains (areas of knowledge/interest)
 * 4. Learning Patterns (visual, textual, example-driven, etc.)
 * 5. Decision Style (analytical, intuitive, collaborative)
 * 6. Energy Patterns (time-based activity, focus duration)
 */

import { prisma } from '../db/prisma'
import { getLevelInfo, type CapabilityLevel } from '../capability/levels'

// ============================================
// Types & Interfaces
// ============================================

export interface CommunicationStyle {
  technicalLevel: number // 0-10: conversational to highly technical
  verbosity: number // 0-10: brief to detailed
  formality: number // 0-10: casual to formal
  preferredTone: 'encouraging' | 'direct' | 'analytical' | 'collaborative'
  responseFormat: 'prose' | 'bullets' | 'structured' | 'mixed'
}

export interface ExpertiseDomain {
  domain: string
  level: 'novice' | 'familiar' | 'competent' | 'proficient' | 'expert'
  confidence: number // 0-1, how sure we are about this assessment
  lastMentioned: Date
  mentionCount: number
}

export interface LearningPattern {
  preferredStyle: 'visual' | 'textual' | 'interactive' | 'example-driven'
  attentionSpan: 'short' | 'medium' | 'long' // affects response length
  needsContext: boolean // prefers background before diving in
  prefersChallenges: boolean // likes being pushed vs supported
}

export interface DecisionStyle {
  type: 'analytical' | 'intuitive' | 'collaborative' | 'decisive'
  riskTolerance: number // 0-10
  prefersSafetyNets: boolean
  needsValidation: boolean
}

export interface IdentityDimensions {
  // Core
  capabilityLevel: number
  capabilityStage: string

  // Communication
  communication: CommunicationStyle

  // Expertise
  domains: ExpertiseDomain[]
  primaryDomain?: string

  // Learning
  learning: LearningPattern

  // Decision Making
  decision: DecisionStyle

  // Metadata
  lastUpdated: Date
  interactionCount: number
  confidenceScore: number // overall confidence in this identity model
}

// ============================================
// Default Identity (for new users)
// ============================================

export function getDefaultIdentity(): IdentityDimensions {
  return {
    capabilityLevel: 3,
    capabilityStage: 'foundation',
    communication: {
      technicalLevel: 5,
      verbosity: 5,
      formality: 5,
      preferredTone: 'collaborative',
      responseFormat: 'mixed',
    },
    domains: [],
    learning: {
      preferredStyle: 'example-driven',
      attentionSpan: 'medium',
      needsContext: true,
      prefersChallenges: false,
    },
    decision: {
      type: 'analytical',
      riskTolerance: 5,
      prefersSafetyNets: true,
      needsValidation: true,
    },
    lastUpdated: new Date(),
    interactionCount: 0,
    confidenceScore: 0.1, // very low confidence for new users
  }
}

// ============================================
// Identity Retrieval & Storage
// ============================================

/**
 * Get full identity dimensions for a workspace
 */
export async function getIdentityDimensions(workspaceId: string): Promise<IdentityDimensions> {
  // Fetch workspace with capability info
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  if (!workspace) {
    return getDefaultIdentity()
  }

  // Fetch stored dimensions from UserSetting (using workspaceId as key prefix)
  const storedDimensions = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: `identity_${workspaceId}`,
    },
  })

  const dimensions = storedDimensions?.value as Partial<IdentityDimensions> | null

  // Merge with defaults
  const defaults = getDefaultIdentity()

  return {
    ...defaults,
    ...dimensions,
    capabilityLevel: workspace.capabilityLevel || defaults.capabilityLevel,
    capabilityStage: workspace.identityStage || defaults.capabilityStage,
    communication: {
      ...defaults.communication,
      ...(dimensions?.communication || {}),
    },
    domains: dimensions?.domains || defaults.domains,
    learning: {
      ...defaults.learning,
      ...(dimensions?.learning || {}),
    },
    decision: {
      ...defaults.decision,
      ...(dimensions?.decision || {}),
    },
  }
}

/**
 * Save identity dimensions for a workspace
 */
export async function saveIdentityDimensions(
  workspaceId: string,
  dimensions: Partial<IdentityDimensions>
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  if (!workspace) return

  // Update workspace fields
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      capabilityLevel: dimensions.capabilityLevel,
      identityStage: dimensions.capabilityStage,
    },
  })

  // Store extended dimensions in UserSetting
  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: workspace.ownerId,
        key: `identity_${workspaceId}`,
      },
    },
    create: {
      userId: workspace.ownerId,
      key: `identity_${workspaceId}`,
      value: dimensions as object,
    },
    update: {
      value: dimensions as object,
    },
  })
}

// ============================================
// Identity Learning from Conversations
// ============================================

export interface ConversationSignals {
  userMessage: string
  osqrResponse: string
  responseRating?: number // 1-5 if user rated
  followUpQuestions?: number // how many follow-ups needed
  timeToFirstFollowUp?: number // ms
}

/**
 * Extract identity signals from a conversation
 */
export async function extractIdentitySignals(
  workspaceId: string,
  signals: ConversationSignals
): Promise<Partial<IdentityDimensions>> {
  const { userMessage } = signals
  const updates: Partial<IdentityDimensions> = {}

  // === Communication Style Detection ===
  const wordCount = userMessage.split(/\s+/).length
  const technicalTerms = detectTechnicalTerms(userMessage)
  const questionMarks = (userMessage.match(/\?/g) || []).length

  // Technical level signal
  if (technicalTerms.length > 3) {
    updates.communication = {
      ...updates.communication,
      technicalLevel: Math.min(10, 5 + technicalTerms.length),
    } as CommunicationStyle
  }

  // Verbosity preference (if user writes detailed messages, they probably want detailed responses)
  if (wordCount > 100) {
    updates.communication = {
      ...updates.communication,
      verbosity: 7,
      responseFormat: 'structured',
    } as CommunicationStyle
  } else if (wordCount < 20) {
    updates.communication = {
      ...updates.communication,
      verbosity: 3,
      responseFormat: 'bullets',
    } as CommunicationStyle
  }

  // === Expertise Domain Detection ===
  const detectedDomains = detectExpertiseDomains(userMessage)
  if (detectedDomains.length > 0) {
    const existing = await getIdentityDimensions(workspaceId)
    const domainMap = new Map(existing.domains.map(d => [d.domain, d]))

    for (const domain of detectedDomains) {
      const existingDomain = domainMap.get(domain)
      if (existingDomain) {
        // Update existing
        existingDomain.mentionCount++
        existingDomain.lastMentioned = new Date()
        // Increase level if mentioned frequently
        if (existingDomain.mentionCount > 5 && existingDomain.level === 'familiar') {
          existingDomain.level = 'competent'
        }
      } else {
        // Add new domain
        domainMap.set(domain, {
          domain,
          level: 'familiar',
          confidence: 0.3,
          lastMentioned: new Date(),
          mentionCount: 1,
        })
      }
    }

    updates.domains = Array.from(domainMap.values())
  }

  // === Learning Pattern Detection ===
  if (userMessage.includes('example') || userMessage.includes('show me')) {
    updates.learning = {
      ...updates.learning,
      preferredStyle: 'example-driven',
    } as LearningPattern
  }
  if (userMessage.includes('why') || userMessage.includes('explain')) {
    updates.learning = {
      ...updates.learning,
      needsContext: true,
    } as LearningPattern
  }

  // === Decision Style Detection ===
  if (userMessage.includes('what do you think') || userMessage.includes('should I')) {
    updates.decision = {
      ...updates.decision,
      needsValidation: true,
    } as DecisionStyle
  }
  if (userMessage.includes('just do it') || userMessage.includes('go ahead')) {
    updates.decision = {
      ...updates.decision,
      type: 'decisive',
      needsValidation: false,
    } as DecisionStyle
  }

  return updates
}

/**
 * Apply learned signals to update identity
 */
export async function updateIdentityFromConversation(
  workspaceId: string,
  signals: ConversationSignals
): Promise<void> {
  const updates = await extractIdentitySignals(workspaceId, signals)

  if (Object.keys(updates).length === 0) return

  const current = await getIdentityDimensions(workspaceId)

  // Merge updates with exponential moving average for smooth transitions
  const merged = mergeIdentityUpdates(current, updates)
  merged.lastUpdated = new Date()
  merged.interactionCount = current.interactionCount + 1
  merged.confidenceScore = Math.min(1, current.confidenceScore + 0.01)

  await saveIdentityDimensions(workspaceId, merged)
}

// ============================================
// Helper Functions
// ============================================

/**
 * Detect technical terms in text
 */
function detectTechnicalTerms(text: string): string[] {
  const technicalPatterns = [
    /\b(API|REST|GraphQL|SQL|NoSQL|ORM)\b/gi,
    /\b(React|Vue|Angular|Svelte|Next\.?js)\b/gi,
    /\b(Python|JavaScript|TypeScript|Rust|Go)\b/gi,
    /\b(Docker|Kubernetes|AWS|GCP|Azure)\b/gi,
    /\b(algorithm|recursion|async|await|promise)\b/gi,
    /\b(database|schema|migration|query)\b/gi,
    /\b(deploy|CI\/CD|pipeline|container)\b/gi,
    /\b(ROI|KPI|metrics|analytics|funnel)\b/gi,
    /\b(strategy|framework|methodology|process)\b/gi,
  ]

  const found: string[] = []
  for (const pattern of technicalPatterns) {
    const matches = text.match(pattern)
    if (matches) {
      found.push(...matches.map(m => m.toLowerCase()))
    }
  }
  return [...new Set(found)]
}

/**
 * Detect expertise domains from text
 */
function detectExpertiseDomains(text: string): string[] {
  const domainKeywords: Record<string, string[]> = {
    'software-engineering': ['code', 'programming', 'software', 'app', 'developer', 'engineering'],
    'business-strategy': ['strategy', 'business', 'market', 'growth', 'revenue', 'customer'],
    'marketing': ['marketing', 'brand', 'audience', 'campaign', 'content', 'social media'],
    'finance': ['finance', 'investment', 'budget', 'funding', 'profit', 'cash flow'],
    'operations': ['operations', 'process', 'efficiency', 'workflow', 'logistics'],
    'leadership': ['team', 'leadership', 'management', 'culture', 'hiring'],
    'product': ['product', 'feature', 'user', 'UX', 'design', 'prototype'],
    'data': ['data', 'analytics', 'metrics', 'dashboard', 'insights'],
    'ai-ml': ['AI', 'machine learning', 'model', 'training', 'neural', 'LLM'],
  }

  const lowercaseText = text.toLowerCase()
  const detected: string[] = []

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(kw => lowercaseText.includes(kw.toLowerCase()))) {
      detected.push(domain)
    }
  }

  return detected
}

/**
 * Merge identity updates using exponential moving average
 */
function mergeIdentityUpdates(
  current: IdentityDimensions,
  updates: Partial<IdentityDimensions>
): IdentityDimensions {
  const alpha = 0.3 // learning rate

  const merged = { ...current }

  // Merge communication style
  if (updates.communication) {
    merged.communication = {
      technicalLevel: ema(current.communication.technicalLevel, updates.communication.technicalLevel, alpha),
      verbosity: ema(current.communication.verbosity, updates.communication.verbosity, alpha),
      formality: ema(current.communication.formality, updates.communication.formality, alpha),
      preferredTone: updates.communication.preferredTone || current.communication.preferredTone,
      responseFormat: updates.communication.responseFormat || current.communication.responseFormat,
    }
  }

  // Merge domains
  if (updates.domains) {
    merged.domains = updates.domains
    // Set primary domain as most mentioned
    const sorted = [...merged.domains].sort((a, b) => b.mentionCount - a.mentionCount)
    merged.primaryDomain = sorted[0]?.domain
  }

  // Merge learning
  if (updates.learning) {
    merged.learning = { ...current.learning, ...updates.learning }
  }

  // Merge decision
  if (updates.decision) {
    merged.decision = { ...current.decision, ...updates.decision }
  }

  return merged
}

/**
 * Exponential moving average
 */
function ema(current: number | undefined, update: number | undefined, alpha: number): number {
  if (update === undefined) return current || 5
  if (current === undefined) return update
  return alpha * update + (1 - alpha) * current
}

// ============================================
// Identity Context Generation for OSQR
// ============================================

/**
 * Generate identity-aware context for OSQR prompts
 */
export async function generateIdentityContext(workspaceId: string): Promise<string> {
  const identity = await getIdentityDimensions(workspaceId)
  const levelInfo = getLevelInfo(identity.capabilityLevel)

  const sections: string[] = []

  // Capability Level
  sections.push(`USER IDENTITY PROFILE:`)
  sections.push(`Capability: Level ${identity.capabilityLevel} (${levelInfo?.name || 'Unknown'}) - ${levelInfo?.stage || identity.capabilityStage}`)
  sections.push(`Identity Pattern: "${levelInfo?.identityPattern || 'Growing'}"`)
  sections.push(`Approach: ${levelInfo?.osqrApproach || 'Be helpful and supportive'}`)

  // Communication Style
  const comm = identity.communication
  sections.push(`\nCOMMUNICATION PREFERENCES:`)
  sections.push(`- Technical Level: ${comm.technicalLevel}/10 (${comm.technicalLevel > 6 ? 'prefers technical depth' : 'prefers accessible language'})`)
  sections.push(`- Verbosity: ${comm.verbosity}/10 (${comm.verbosity > 6 ? 'likes detailed responses' : 'prefers concise responses'})`)
  sections.push(`- Tone: ${comm.preferredTone}`)
  sections.push(`- Format: ${comm.responseFormat}`)

  // Expertise Domains
  if (identity.domains.length > 0) {
    sections.push(`\nEXPERTISE DOMAINS:`)
    const topDomains = identity.domains
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, 5)
    for (const domain of topDomains) {
      sections.push(`- ${domain.domain}: ${domain.level} (mentioned ${domain.mentionCount}x)`)
    }
  }

  // Learning Pattern
  const learn = identity.learning
  sections.push(`\nLEARNING STYLE:`)
  sections.push(`- Preferred: ${learn.preferredStyle}`)
  sections.push(`- Attention: ${learn.attentionSpan} focus periods`)
  sections.push(`- ${learn.needsContext ? 'Likes context before diving in' : 'Prefers jumping straight to solutions'}`)
  sections.push(`- ${learn.prefersChallenges ? 'Enjoys being challenged' : 'Prefers supportive guidance'}`)

  // Decision Style
  const dec = identity.decision
  sections.push(`\nDECISION STYLE:`)
  sections.push(`- Type: ${dec.type}`)
  sections.push(`- Risk Tolerance: ${dec.riskTolerance}/10`)
  sections.push(`- ${dec.needsValidation ? 'Often seeks validation' : 'Confident in decisions'}`)

  // Confidence note
  if (identity.confidenceScore < 0.5) {
    sections.push(`\n[Note: Identity model confidence is ${Math.round(identity.confidenceScore * 100)}% - still learning user preferences]`)
  }

  return sections.join('\n')
}
