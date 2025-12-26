/**
 * Decision Persister
 *
 * Persists extracted decisions and commitments from conversations
 * to the Decision model in the database.
 */

import { prisma } from '@/lib/db/prisma'
import type { ExtractedCommitment } from '@/lib/osqr/temporal-wrapper'

export interface PersistDecisionParams {
  workspaceId: string
  userId: string
  threadId: string
  messageId?: string
  commitment: ExtractedCommitment
  source: 'web' | 'vscode' | 'mobile' | 'api'
}

/**
 * Persist a single decision/commitment to the database
 */
export async function persistDecision({
  workspaceId,
  userId,
  threadId,
  messageId,
  commitment,
  source,
}: PersistDecisionParams): Promise<string> {
  const decision = await prisma.decision.create({
    data: {
      workspaceId,
      userId,
      messageId,
      conversationId: threadId,
      text: commitment.what,
      source,
      tags: [],
      context: {
        who: commitment.who,
        when: commitment.when,
        confidence: commitment.confidence,
        sourceId: commitment.source.sourceId,
        extractedAt: commitment.source.extractedAt.toISOString(),
        originalId: commitment.id,
      },
    },
  })

  return decision.id
}

/**
 * Persist multiple decisions/commitments from a conversation
 */
export async function persistDecisions({
  workspaceId,
  userId,
  threadId,
  messageId,
  commitments,
  source,
}: {
  workspaceId: string
  userId: string
  threadId: string
  messageId?: string
  commitments: ExtractedCommitment[]
  source: 'web' | 'vscode' | 'mobile' | 'api'
}): Promise<{ persisted: number; ids: string[] }> {
  if (commitments.length === 0) {
    return { persisted: 0, ids: [] }
  }

  const ids: string[] = []

  for (const commitment of commitments) {
    // Only persist commitments with sufficient confidence
    if (commitment.confidence >= 0.6) {
      try {
        const id = await persistDecision({
          workspaceId,
          userId,
          threadId,
          messageId,
          commitment,
          source,
        })
        ids.push(id)
      } catch (error) {
        console.error('[Decision Persister] Failed to persist decision:', error)
      }
    }
  }

  if (ids.length > 0) {
    console.log(`[Decision Persister] Persisted ${ids.length} decisions from thread ${threadId}`)
  }

  return { persisted: ids.length, ids }
}

/**
 * Get decisions for a workspace
 */
export async function getDecisions(
  workspaceId: string,
  options?: {
    limit?: number
    source?: string
    includeResolved?: boolean
  }
): Promise<
  Array<{
    id: string
    text: string
    source: string
    createdAt: Date
    context: unknown
  }>
> {
  const decisions = await prisma.decision.findMany({
    where: {
      workspaceId,
      ...(options?.source ? { source: options.source } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    select: {
      id: true,
      text: true,
      source: true,
      createdAt: true,
      context: true,
    },
  })

  return decisions
}

/**
 * Get recent decisions that might need follow-up
 */
export async function getPendingDecisions(
  workspaceId: string,
  daysBack = 7
): Promise<
  Array<{
    id: string
    text: string
    source: string
    createdAt: Date
    context: unknown
  }>
> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  return prisma.decision.findMany({
    where: {
      workspaceId,
      createdAt: { gte: cutoffDate },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      text: true,
      source: true,
      createdAt: true,
      context: true,
    },
  })
}

/**
 * Delete a decision
 */
export async function deleteDecision(decisionId: string): Promise<boolean> {
  try {
    await prisma.decision.delete({
      where: { id: decisionId },
    })
    return true
  } catch {
    return false
  }
}
