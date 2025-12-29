/**
 * Validation & Invalidation Service (Phase 5)
 *
 * Maintains cache quality through:
 * - LLM-as-Judge validation for stale/similar matches
 * - Confidence decay over time
 * - Invalidation triggers
 *
 * @see docs/builds/DEPTH_AWARE_INTELLIGENCE_BUILD.md
 */

import { prisma } from '../db/prisma'
import { ProviderRegistry } from '../ai/providers'

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  isValid: boolean
  confidence: number
  reason: string
  shouldUpdate: boolean // If true, the answer should be refreshed
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DECAY_START_DAYS = 7 // Start decay after 7 days
const DECAY_RATE_PER_WEEK = 0.1 // -0.1 confidence per week
const ACCEPTANCE_BOOST = 0.1 // Boost for high acceptance rate
const RECENT_USE_BOOST = 0.05 // Boost for recent usage (within 3 days)
const MIN_CONFIDENCE = 0 // Floor
const MAX_CONFIDENCE = 1 // Ceiling

// =============================================================================
// LLM-AS-JUDGE VALIDATION
// =============================================================================

/**
 * Validate whether a cached answer still applies to a new question
 *
 * Uses a small, fast model (Haiku) to determine:
 * 1. Is the new question semantically equivalent?
 * 2. Is the cached answer still accurate?
 * 3. Are there any contradictions or outdated info?
 */
export async function validateCachedAnswer(
  cachedQuestion: string,
  cachedAnswer: string,
  newQuestion: string
): Promise<ValidationResult> {
  try {
    const provider = ProviderRegistry.getProvider('anthropic', {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-3-haiku-20240307',
    })

    const response = await provider.generate({
      messages: [
        {
          role: 'system',
          content: `You are validating whether a cached answer still applies to a new question.

Determine:
1. Is the new question asking essentially the same thing as the cached question? (semantic match)
2. Is the cached answer still accurate and complete for the new question?
3. Are there any potential contradictions or outdated information?

Respond ONLY with JSON in this exact format:
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "shouldUpdate": true/false
}

Be conservative - if unsure, mark as needing update.`,
        },
        {
          role: 'user',
          content: `CACHED QUESTION: ${cachedQuestion}

CACHED ANSWER: ${cachedAnswer.slice(0, 2000)}

NEW QUESTION: ${newQuestion}

Validate whether the cached answer applies to the new question.`,
        },
      ],
      maxTokens: 200,
      temperature: 0.1, // Low temperature for consistent validation
    })

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        isValid: Boolean(parsed.isValid),
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
        reason: String(parsed.reason || 'Validation completed'),
        shouldUpdate: Boolean(parsed.shouldUpdate),
      }
    }

    // Fallback if parsing fails
    console.warn('[Validation] Failed to parse LLM response, defaulting to invalid')
    return {
      isValid: false,
      confidence: 0.5,
      reason: 'Validation parsing failed',
      shouldUpdate: true,
    }
  } catch (error) {
    console.error('[Validation] LLM validation failed:', error)
    return {
      isValid: false,
      confidence: 0.5,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
      shouldUpdate: true,
    }
  }
}

// =============================================================================
// CONFIDENCE CALCULATION
// =============================================================================

/**
 * Calculate current confidence for a cache entry
 *
 * Formula:
 * - Base: entry.confidenceScore
 * - Time decay: -0.1 per week after 7 days since last validation
 * - Acceptance boost: +0.1 if acceptance rate > 90%
 * - Recent use boost: +0.05 if used in last 3 days
 */
export function calculateConfidence(entry: {
  confidenceScore: number
  createdAt: Date
  lastValidatedAt: Date
  lastUsedAt: Date
  acceptanceRate: number | null
}): number {
  const now = new Date()

  // Days since validation
  const daysSinceValidation = (now.getTime() - entry.lastValidatedAt.getTime()) / (1000 * 60 * 60 * 24)

  // Base confidence
  let confidence = entry.confidenceScore

  // Time decay (starts after DECAY_START_DAYS)
  if (daysSinceValidation > DECAY_START_DAYS) {
    const weeksStale = Math.floor((daysSinceValidation - DECAY_START_DAYS) / 7)
    confidence -= weeksStale * DECAY_RATE_PER_WEEK
  }

  // Acceptance boost
  if (entry.acceptanceRate && entry.acceptanceRate > 0.9) {
    confidence += ACCEPTANCE_BOOST
  }

  // Recent use boost
  const daysSinceUse = (now.getTime() - entry.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceUse < 3) {
    confidence += RECENT_USE_BOOST
  }

  // Clamp to valid range
  return Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, confidence))
}

// =============================================================================
// CONFIDENCE DECAY CRON
// =============================================================================

/**
 * Run confidence decay on all cache entries
 * Should be called daily as a cron job
 */
export async function runConfidenceDecay(): Promise<{
  processed: number
  decayed: number
  invalidated: number
}> {
  console.log('[Validation] Running confidence decay...')

  // Get all valid entries
  const entries = await prisma.answerCache.findMany({
    where: { isValid: true },
    select: {
      id: true,
      confidenceScore: true,
      createdAt: true,
      lastValidatedAt: true,
      lastUsedAt: true,
      acceptanceRate: true,
    },
  })

  let decayed = 0
  let invalidated = 0

  for (const entry of entries) {
    const newConfidence = calculateConfidence(entry)

    // Only update if confidence changed significantly
    if (Math.abs(newConfidence - entry.confidenceScore) > 0.01) {
      if (newConfidence < 0.3) {
        // Invalidate very low confidence entries
        await prisma.answerCache.update({
          where: { id: entry.id },
          data: {
            isValid: false,
            invalidatedAt: new Date(),
            invalidationReason: 'Confidence decayed below threshold',
            confidenceScore: newConfidence,
          },
        })

        await prisma.cacheInvalidationEvent.create({
          data: {
            cacheEntryId: entry.id,
            triggerType: 'TIME_DECAY',
            reason: `Confidence decayed to ${newConfidence.toFixed(2)}`,
          },
        })

        invalidated++
      } else {
        // Just update confidence
        await prisma.answerCache.update({
          where: { id: entry.id },
          data: { confidenceScore: newConfidence },
        })
        decayed++
      }
    }
  }

  console.log(`[Validation] Decay complete: ${entries.length} processed, ${decayed} decayed, ${invalidated} invalidated`)

  return {
    processed: entries.length,
    decayed,
    invalidated,
  }
}

// =============================================================================
// USER CORRECTION HANDLING
// =============================================================================

/**
 * Handle user correction ("that's not right")
 * Immediately invalidates the cache entry
 */
export async function handleUserCorrection(
  cacheEntryId: string,
  reason?: string
): Promise<void> {
  await prisma.answerCache.update({
    where: { id: cacheEntryId },
    data: {
      isValid: false,
      invalidatedAt: new Date(),
      invalidationReason: reason || 'User correction',
      confidenceScore: 0,
    },
  })

  await prisma.cacheInvalidationEvent.create({
    data: {
      cacheEntryId,
      triggerType: 'USER_CORRECTION',
      reason: reason || 'User indicated answer was incorrect',
    },
  })

  console.log(`[Validation] User correction handled for entry: ${cacheEntryId}`)
}

// =============================================================================
// SEMANTIC CONFLICT DETECTION
// =============================================================================

/**
 * Check if new information conflicts with cached answer
 * Used when new documents are uploaded
 */
export async function checkSemanticConflict(
  cacheEntryId: string,
  newInformation: string
): Promise<boolean> {
  const entry = await prisma.answerCache.findUnique({
    where: { id: cacheEntryId },
    select: {
      questionText: true,
      answerText: true,
    },
  })

  if (!entry) return false

  try {
    const provider = ProviderRegistry.getProvider('anthropic', {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-3-haiku-20240307',
    })

    const response = await provider.generate({
      messages: [
        {
          role: 'system',
          content: `You are checking if new information contradicts an existing cached answer.

Respond ONLY with JSON:
{
  "conflicts": true/false,
  "reason": "brief explanation"
}`,
        },
        {
          role: 'user',
          content: `QUESTION: ${entry.questionText}

CACHED ANSWER: ${entry.answerText.slice(0, 1500)}

NEW INFORMATION: ${newInformation.slice(0, 1500)}

Does the new information contradict or significantly update the cached answer?`,
        },
      ],
      maxTokens: 150,
      temperature: 0.1,
    })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      if (parsed.conflicts) {
        // Invalidate due to semantic conflict
        await prisma.answerCache.update({
          where: { id: cacheEntryId },
          data: {
            isValid: false,
            invalidatedAt: new Date(),
            invalidationReason: `Semantic conflict: ${parsed.reason}`,
          },
        })

        await prisma.cacheInvalidationEvent.create({
          data: {
            cacheEntryId,
            triggerType: 'SEMANTIC_CONFLICT',
            reason: parsed.reason,
          },
        })

        return true
      }
    }

    return false
  } catch (error) {
    console.error('[Validation] Semantic conflict check failed:', error)
    return false
  }
}

// =============================================================================
// VALIDATION AFTER USE
// =============================================================================

/**
 * Update cache entry after successful use
 * Called when user accepts a cached answer
 */
export async function recordCacheAcceptance(
  cacheEntryId: string,
  wasAccepted: boolean
): Promise<void> {
  const entry = await prisma.answerCache.findUnique({
    where: { id: cacheEntryId },
    select: { hitCount: true, acceptanceRate: true },
  })

  if (!entry) return

  // Calculate new acceptance rate
  const totalHits = entry.hitCount + 1
  const previousAcceptances = (entry.acceptanceRate || 0.5) * entry.hitCount
  const newAcceptances = previousAcceptances + (wasAccepted ? 1 : 0)
  const newAcceptanceRate = newAcceptances / totalHits

  await prisma.answerCache.update({
    where: { id: cacheEntryId },
    data: {
      acceptanceRate: newAcceptanceRate,
      // If accepted, boost confidence and reset validation
      ...(wasAccepted ? {
        lastValidatedAt: new Date(),
        confidenceScore: Math.min(1, (entry.acceptanceRate || 0.5) + 0.05),
      } : {}),
    },
  })
}
