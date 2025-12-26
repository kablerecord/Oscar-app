/**
 * Render System Service
 * Handles artifact CRUD and state machine logic
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import { prisma } from '@/lib/db/prisma'
import { Artifact, ArtifactType, RenderState } from '@prisma/client'
import { createHash } from 'crypto'
import {
  ArtifactContent,
  CreateArtifactInput,
  VALID_STATE_TRANSITIONS,
} from './types'

// ============================================
// Artifact CRUD
// ============================================

/**
 * Create a new artifact
 */
export async function createArtifact(input: CreateArtifactInput): Promise<Artifact> {
  const { userId, workspaceId, type, title, content, conversationId, messageId, parentId } = input

  // Calculate version if this is an iteration
  let version = 1
  if (parentId) {
    const parent = await prisma.artifact.findUnique({
      where: { id: parentId },
      select: { version: true },
    })
    if (parent) {
      version = parent.version + 1
    }
  }

  // Generate prompt hash for duplicate detection
  const promptHash = generatePromptHash(content)

  const artifact = await prisma.artifact.create({
    data: {
      userId,
      workspaceId,
      type,
      title,
      content: content as object,
      conversationId,
      messageId,
      parentId,
      version,
      state: 'RENDERING',
      promptHash,
    },
  })

  return artifact
}

/**
 * Get artifact by ID
 */
export async function getArtifact(id: string): Promise<Artifact | null> {
  return prisma.artifact.findUnique({
    where: { id },
    include: {
      parent: true,
      children: {
        orderBy: { version: 'desc' },
        take: 5,
      },
    },
  })
}

/**
 * Get artifacts for a conversation
 */
export async function getConversationArtifacts(
  conversationId: string,
  userId: string
): Promise<Artifact[]> {
  return prisma.artifact.findMany({
    where: {
      conversationId,
      userId,
      state: {
        notIn: ['CANCELLED', 'ERROR'],
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get the most recently viewed artifact in a conversation
 * Used for determining update target when user says "make it blue"
 */
export async function getMostRecentlyViewedArtifact(
  conversationId: string,
  userId: string
): Promise<Artifact | null> {
  // First try: most recently viewed
  const viewedArtifact = await prisma.artifact.findFirst({
    where: {
      conversationId,
      userId,
      viewedAt: { not: null },
      state: { notIn: ['CANCELLED', 'ERROR'] },
    },
    orderBy: { viewedAt: 'desc' },
  })

  if (viewedArtifact) return viewedArtifact

  // Fallback: most recently created
  return prisma.artifact.findFirst({
    where: {
      conversationId,
      userId,
      state: { notIn: ['CANCELLED', 'ERROR'] },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Update artifact state
 */
export async function updateArtifactState(
  id: string,
  newState: RenderState,
  telemetry?: {
    latencyMs?: number
    attemptCount?: number
    errorCode?: string
    errorMessage?: string
  }
): Promise<Artifact> {
  const artifact = await prisma.artifact.findUnique({
    where: { id },
    select: { state: true },
  })

  if (!artifact) {
    throw new Error(`Artifact not found: ${id}`)
  }

  // Validate state transition
  const validTransitions = VALID_STATE_TRANSITIONS[artifact.state]
  if (!validTransitions.includes(newState)) {
    throw new Error(
      `Invalid state transition: ${artifact.state} -> ${newState}. ` +
      `Valid transitions: ${validTransitions.join(', ')}`
    )
  }

  return prisma.artifact.update({
    where: { id },
    data: {
      state: newState,
      ...(telemetry || {}),
    },
  })
}

/**
 * Update artifact content (for iterations)
 */
export async function updateArtifactContent(
  id: string,
  content: Partial<ArtifactContent>
): Promise<Artifact> {
  const artifact = await prisma.artifact.findUnique({
    where: { id },
    select: { content: true },
  })

  if (!artifact) {
    throw new Error(`Artifact not found: ${id}`)
  }

  const existingContent = artifact.content as unknown as ArtifactContent
  const mergedContent = { ...existingContent, ...content } as ArtifactContent

  return prisma.artifact.update({
    where: { id },
    data: {
      content: mergedContent as object,
      promptHash: generatePromptHash(mergedContent),
    },
  })
}

/**
 * Mark artifact as viewed
 */
export async function markArtifactViewed(id: string): Promise<Artifact> {
  const artifact = await prisma.artifact.findUnique({
    where: { id },
    select: { state: true },
  })

  if (!artifact) {
    throw new Error(`Artifact not found: ${id}`)
  }

  // Transition to VIEWING state if coming from COMPLETE_AWAITING_VIEW
  const newState = artifact.state === 'COMPLETE_AWAITING_VIEW' ? 'VIEWING' : artifact.state

  return prisma.artifact.update({
    where: { id },
    data: {
      viewedAt: new Date(),
      state: newState,
    },
  })
}

/**
 * Cancel an artifact render
 */
export async function cancelArtifact(id: string): Promise<Artifact> {
  return updateArtifactState(id, 'CANCELLED')
}

/**
 * Get user's artifacts (for future artifact library)
 */
export async function getUserArtifacts(
  userId: string,
  options?: {
    type?: ArtifactType
    limit?: number
    offset?: number
  }
): Promise<Artifact[]> {
  const { type, limit = 20, offset = 0 } = options || {}

  return prisma.artifact.findMany({
    where: {
      userId,
      state: { notIn: ['CANCELLED', 'ERROR'] },
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

// ============================================
// Helpers
// ============================================

/**
 * Generate a hash of the prompt for duplicate detection
 */
function generatePromptHash(content: ArtifactContent): string {
  let hashSource: string

  if (content.type === 'image') {
    hashSource = `image:${content.prompt}:${content.size || '1024x1024'}:${content.style || 'vivid'}`
  } else if (content.type === 'chart') {
    hashSource = `chart:${content.chartType}:${JSON.stringify(content.data)}:${content.xKey}:${JSON.stringify(content.yKey)}`
  } else {
    hashSource = JSON.stringify(content)
  }

  return createHash('sha256').update(hashSource).digest('hex').slice(0, 16)
}

/**
 * Check if an artifact is in a terminal state
 */
export function isTerminalState(state: RenderState): boolean {
  return state === 'ERROR' || state === 'CANCELLED'
}

/**
 * Check if an artifact can be iterated on
 */
export function canIterate(artifact: Artifact): boolean {
  return artifact.state === 'VIEWING' || artifact.state === 'COMPLETE_AWAITING_VIEW'
}
