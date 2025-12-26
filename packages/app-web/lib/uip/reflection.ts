/**
 * UIP Prospective Reflection Engine
 * Background process that synthesizes signals into UIP updates
 * @see docs/architecture/UIP_SPEC.md
 */

import { prisma } from '@/lib/db/prisma'
import { UIPDomain, UIPSource, PrivacyTier } from '@prisma/client'
import {
  getUnprocessedSignals,
  markSignalsProcessed,
  getDimensionScores,
  upsertDimensionScore,
  applyDecay,
} from './service'
import { inferAllDimensions } from './dimension-inference'
import { DomainValue, CONFIDENCE_THRESHOLDS } from './types'

// ============================================
// Reflection Triggers
// ============================================

/**
 * Check if reflection should run for a profile
 */
export async function shouldRunReflection(profileId: string): Promise<{
  shouldRun: boolean
  reason: string
}> {
  const profile = await prisma.userIntelligenceProfile.findUnique({
    where: { id: profileId },
    select: {
      lastReflectionAt: true,
      nextReflectionAt: true,
      signalCount: true,
      privacyTier: true,
      _count: {
        select: {
          signals: {
            where: { processed: false },
          },
        },
      },
    },
  })

  if (!profile) {
    return { shouldRun: false, reason: 'Profile not found' }
  }

  // Don't run for privacy tier A
  if (profile.privacyTier === 'A') {
    return { shouldRun: false, reason: 'Privacy tier A - session only' }
  }

  const unprocessedCount = profile._count.signals

  // Trigger: Enough unprocessed signals (10+)
  if (unprocessedCount >= 10) {
    return { shouldRun: true, reason: 'Signal threshold reached' }
  }

  // Trigger: Scheduled time passed
  if (profile.nextReflectionAt && profile.nextReflectionAt <= new Date()) {
    return { shouldRun: true, reason: 'Scheduled reflection time' }
  }

  // Trigger: No reflection in 24 hours and has signals
  if (
    profile.lastReflectionAt &&
    Date.now() - profile.lastReflectionAt.getTime() > 24 * 60 * 60 * 1000 &&
    unprocessedCount > 0
  ) {
    return { shouldRun: true, reason: '24 hour threshold' }
  }

  // Trigger: First time with enough signals
  if (!profile.lastReflectionAt && unprocessedCount >= 3) {
    return { shouldRun: true, reason: 'Initial reflection' }
  }

  return { shouldRun: false, reason: 'No trigger conditions met' }
}

// ============================================
// Reflection Process
// ============================================

export interface ReflectionResult {
  success: boolean
  signalsProcessed: number
  dimensionsUpdated: number
  elicitationCandidates: Array<{
    domain: UIPDomain
    gap: string
    priority: number
  }>
  errors: string[]
}

/**
 * Run prospective reflection for a profile
 */
export async function runReflection(profileId: string): Promise<ReflectionResult> {
  const result: ReflectionResult = {
    success: false,
    signalsProcessed: 0,
    dimensionsUpdated: 0,
    elicitationCandidates: [],
    errors: [],
  }

  try {
    // 1. Get profile
    const profile = await prisma.userIntelligenceProfile.findUnique({
      where: { id: profileId },
    })

    if (!profile) {
      result.errors.push('Profile not found')
      return result
    }

    // 2. Get unprocessed signals
    const signals = await getUnprocessedSignals(profileId, 100)
    result.signalsProcessed = signals.length

    if (signals.length === 0) {
      result.success = true
      return result
    }

    // 3. Get existing dimension values
    const existingDims = await getDimensionScores(profileId)
    const existingValues: Partial<Record<UIPDomain, DomainValue>> = {}
    for (const dim of existingDims) {
      existingValues[dim.domain] = dim.value as DomainValue
    }

    // 4. Convert DB signals to typed signals
    const typedSignals = signals.map((s) => ({
      signalType: s.signalType,
      category: s.category,
      strength: s.strength,
      sessionId: s.sessionId || undefined,
      messageId: s.messageId || undefined,
      timestamp: s.createdAt,
      data: s.data as Record<string, unknown>,
    }))

    // 5. Infer dimensions
    const inferred = inferAllDimensions(
      typedSignals as any,
      profile.sessionCount,
      existingValues
    )

    // 6. Update dimensions with sufficient confidence
    for (const [domain, inference] of Object.entries(inferred)) {
      const existingDim = existingDims.find((d) => d.domain === domain)

      // Only update if:
      // - New inference has higher confidence than existing, OR
      // - No existing dimension
      const shouldUpdate =
        !existingDim ||
        inference.confidence > existingDim.confidence ||
        (inference.confidence >= CONFIDENCE_THRESHOLDS.ASK_BEFORE_ACTING &&
          !existingDim)

      if (shouldUpdate && inference.confidence >= CONFIDENCE_THRESHOLDS.TREAT_AS_UNKNOWN) {
        await upsertDimensionScore(
          profileId,
          domain as UIPDomain,
          inference.value,
          inference.confidence,
          inference.sources
        )
        result.dimensionsUpdated++
      }

      // 7. Identify elicitation candidates (gaps)
      if (inference.confidence < CONFIDENCE_THRESHOLDS.ACT_WITH_UNCERTAINTY) {
        result.elicitationCandidates.push({
          domain: domain as UIPDomain,
          gap: getGapDescription(domain as UIPDomain, inference.confidence),
          priority: getGapPriority(domain as UIPDomain, inference.confidence),
        })
      }
    }

    // 8. Apply decay to all dimensions
    await applyDecay(profileId)

    // 9. Mark signals as processed
    await markSignalsProcessed(signals.map((s) => s.id))

    // 10. Update reflection timestamp
    await prisma.userIntelligenceProfile.update({
      where: { id: profileId },
      data: {
        lastReflectionAt: new Date(),
        nextReflectionAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
      },
    })

    result.success = true
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

/**
 * Get human-readable gap description
 */
function getGapDescription(domain: UIPDomain, confidence: number): string {
  const descriptions: Record<UIPDomain, string> = {
    IDENTITY_CONTEXT: "We don't know much about who you are yet",
    GOALS_VALUES: "We haven't learned your goals yet",
    COGNITIVE_STYLE: "We're still learning how you think",
    COMMUNICATION_PREFS: "We're still learning your communication preferences",
    EXPERTISE_CALIBRATION: "We don't know your expertise areas yet",
    BEHAVIORAL_PATTERNS: "We're still learning your patterns",
    RELATIONSHIP_STATE: "Our working relationship is still new",
    DECISION_FRICTION: "We haven't observed your decision-making yet",
  }

  return descriptions[domain] || `Low confidence in ${domain}`
}

/**
 * Get priority for filling a gap
 */
function getGapPriority(domain: UIPDomain, confidence: number): number {
  // Higher priority for:
  // 1. Foundation domains (identity, goals)
  // 2. Lower confidence
  // 3. Communication (directly affects responses)

  const basePriority: Record<UIPDomain, number> = {
    IDENTITY_CONTEXT: 10,
    GOALS_VALUES: 9,
    COMMUNICATION_PREFS: 8,
    EXPERTISE_CALIBRATION: 7,
    COGNITIVE_STYLE: 6,
    RELATIONSHIP_STATE: 5,
    BEHAVIORAL_PATTERNS: 4,
    DECISION_FRICTION: 3,
  }

  // Boost priority for lower confidence
  const confidenceBoost = (1 - confidence) * 3

  return (basePriority[domain] || 5) + confidenceBoost
}

// ============================================
// Batch Processing
// ============================================

/**
 * Run reflection for all eligible profiles (for cron job)
 */
export async function runBatchReflection(limit: number = 100): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const stats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
  }

  // Find profiles that need reflection
  const profiles = await prisma.userIntelligenceProfile.findMany({
    where: {
      privacyTier: { in: ['B', 'C'] },
      OR: [
        // Has unprocessed signals
        {
          signals: {
            some: { processed: false },
          },
        },
        // Scheduled reflection time passed
        {
          nextReflectionAt: { lte: new Date() },
        },
      ],
    },
    select: { id: true },
    take: limit,
  })

  for (const profile of profiles) {
    stats.processed++

    const { shouldRun } = await shouldRunReflection(profile.id)
    if (!shouldRun) continue

    const result = await runReflection(profile.id)
    if (result.success) {
      stats.succeeded++
    } else {
      stats.failed++
    }
  }

  return stats
}

// ============================================
// Event-Triggered Reflection
// ============================================

/**
 * Trigger reflection on session close
 */
export async function onSessionClose(
  userId: string,
  sessionDurationMinutes: number
): Promise<void> {
  // Only trigger if session was meaningful (10+ minutes)
  if (sessionDurationMinutes < 10) return

  const profile = await prisma.userIntelligenceProfile.findUnique({
    where: { userId },
    select: { id: true, lastReflectionAt: true },
  })

  if (!profile) return

  // Don't run if reflection ran in last 6 hours (per spec deduplication rule)
  if (
    profile.lastReflectionAt &&
    Date.now() - profile.lastReflectionAt.getTime() < 6 * 60 * 60 * 1000
  ) {
    return
  }

  await runReflection(profile.id)
}

/**
 * Trigger reflection on decision cluster (3+ decisions in session)
 */
export async function onDecisionCluster(
  userId: string,
  decisionCount: number
): Promise<void> {
  if (decisionCount < 3) return

  const profile = await prisma.userIntelligenceProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!profile) return

  // Run high-priority reflection
  await runReflection(profile.id)
}

/**
 * Manual reflection trigger (user asks "update what you know about me")
 */
export async function onManualTrigger(userId: string): Promise<ReflectionResult> {
  const profile = await prisma.userIntelligenceProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!profile) {
    return {
      success: false,
      signalsProcessed: 0,
      dimensionsUpdated: 0,
      elicitationCandidates: [],
      errors: ['Profile not found'],
    }
  }

  return runReflection(profile.id)
}
