/**
 * UIP Profile Service
 * CRUD operations and profile assembly
 * @see docs/architecture/UIP_SPEC.md
 */

import { prisma } from '@/lib/db/prisma'
import {
  UserIntelligenceProfile,
  UIPDimensionScore,
  UIPFact,
  UIPSignal,
  UIPDomain,
  UIPSource,
  UIPTier,
  PrivacyTier,
  UIPSignalCategory,
} from '@prisma/client'
import {
  AssembledUIP,
  UIPContextSummary,
  DomainValue,
  CommunicationPrefsValue,
  ExpertiseCalibrationValue,
  RelationshipStateValue,
  IdentityContextValue,
  GoalsValuesValue,
  BehavioralPatternsValue,
  CONFIDENCE_THRESHOLDS,
  DOMAIN_CONFIG,
} from './types'
import { UIPSignalData } from './types'
import { inferAllDimensions, calculateDecayedConfidence } from './dimension-inference'

// ============================================
// Profile CRUD
// ============================================

/**
 * Get or create UIP for a user
 */
export async function getOrCreateProfile(
  userId: string,
  workspaceId?: string
): Promise<UserIntelligenceProfile> {
  const existing = await prisma.userIntelligenceProfile.findUnique({
    where: { userId },
  })

  if (existing) {
    // Update last active
    return prisma.userIntelligenceProfile.update({
      where: { id: existing.id },
      data: { lastActiveAt: new Date() },
    })
  }

  // Create new profile
  return prisma.userIntelligenceProfile.create({
    data: {
      userId,
      workspaceId,
      privacyTier: 'B', // Default to full UIP
      firstSeenAt: new Date(),
      lastActiveAt: new Date(),
    },
  })
}

/**
 * Get profile with all relations
 */
export async function getFullProfile(userId: string): Promise<
  | (UserIntelligenceProfile & {
      dimensions: UIPDimensionScore[]
      facts: UIPFact[]
    })
  | null
> {
  return prisma.userIntelligenceProfile.findUnique({
    where: { userId },
    include: {
      dimensions: true,
      facts: {
        where: {
          confidence: { gte: CONFIDENCE_THRESHOLDS.TREAT_AS_UNKNOWN },
        },
        orderBy: { confidence: 'desc' },
      },
    },
  })
}

/**
 * Update profile session count
 */
export async function incrementSessionCount(userId: string): Promise<void> {
  await prisma.userIntelligenceProfile.update({
    where: { userId },
    data: {
      sessionCount: { increment: 1 },
      lastActiveAt: new Date(),
    },
  })
}

// ============================================
// Signal Storage
// ============================================

/**
 * Store signals for later processing
 */
export async function storeSignals(
  profileId: string,
  signals: UIPSignalData[]
): Promise<void> {
  const signalRecords = signals.map((signal) => ({
    profileId,
    signalType: signal.signalType,
    category: signal.category as UIPSignalCategory,
    data: signal.data as object,
    strength: signal.strength,
    sessionId: signal.sessionId,
    messageId: signal.messageId,
    processed: false,
  }))

  await prisma.uIPSignal.createMany({
    data: signalRecords,
  })

  // Update signal count on profile
  await prisma.userIntelligenceProfile.update({
    where: { id: profileId },
    data: {
      signalCount: { increment: signals.length },
    },
  })
}

/**
 * Get unprocessed signals
 */
export async function getUnprocessedSignals(
  profileId: string,
  limit: number = 100
): Promise<UIPSignal[]> {
  return prisma.uIPSignal.findMany({
    where: {
      profileId,
      processed: false,
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
}

/**
 * Mark signals as processed
 */
export async function markSignalsProcessed(signalIds: string[]): Promise<void> {
  await prisma.uIPSignal.updateMany({
    where: { id: { in: signalIds } },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  })
}

// ============================================
// Dimension Storage
// ============================================

/**
 * Update or create a dimension score
 */
export async function upsertDimensionScore(
  profileId: string,
  domain: UIPDomain,
  value: DomainValue,
  confidence: number,
  sources: UIPSource[]
): Promise<UIPDimensionScore> {
  const config = DOMAIN_CONFIG[domain]
  const tier = config.tier as UIPTier

  return prisma.uIPDimensionScore.upsert({
    where: {
      profileId_domain: { profileId, domain },
    },
    create: {
      profileId,
      tier,
      domain,
      value: value as object,
      confidence,
      decayRate: config.decayRate,
      sources,
      sourceCount: sources.length,
      lastUpdatedAt: new Date(),
      lastDecayedAt: new Date(),
    },
    update: {
      value: value as object,
      confidence,
      sources,
      sourceCount: { increment: sources.length },
      lastUpdatedAt: new Date(),
    },
  })
}

/**
 * Get dimension scores for a profile
 */
export async function getDimensionScores(
  profileId: string
): Promise<UIPDimensionScore[]> {
  return prisma.uIPDimensionScore.findMany({
    where: { profileId },
  })
}

/**
 * Apply decay to all dimension scores
 */
export async function applyDecay(profileId: string): Promise<void> {
  const dimensions = await getDimensionScores(profileId)

  for (const dim of dimensions) {
    const decayedConfidence = calculateDecayedConfidence(
      dim.confidence,
      dim.decayRate,
      dim.lastDecayedAt
    )

    // Remove if below threshold
    if (decayedConfidence < CONFIDENCE_THRESHOLDS.TREAT_AS_UNKNOWN) {
      await prisma.uIPDimensionScore.delete({
        where: { id: dim.id },
      })
    } else if (decayedConfidence !== dim.confidence) {
      await prisma.uIPDimensionScore.update({
        where: { id: dim.id },
        data: {
          confidence: decayedConfidence,
          lastDecayedAt: new Date(),
        },
      })
    }
  }
}

// ============================================
// Fact Storage
// ============================================

/**
 * Store or update a fact
 */
export async function upsertFact(
  profileId: string,
  domain: UIPDomain,
  factType: string,
  key: string,
  value: string,
  source: UIPSource,
  isExplicit: boolean = false
): Promise<UIPFact> {
  const config = DOMAIN_CONFIG[domain]
  const confidence = isExplicit ? 1.0 : (
    source === 'BEHAVIORAL_REPEATED' ? 0.8 :
    source === 'BEHAVIORAL_SINGLE' ? 0.5 :
    source === 'DOC_STYLE' ? 0.6 : 0.5
  )

  return prisma.uIPFact.upsert({
    where: {
      profileId_factType_key: { profileId, factType, key },
    },
    create: {
      profileId,
      domain,
      factType,
      key,
      value,
      confidence,
      source,
      decayRate: config.decayRate,
      isExplicit,
      explicitSource: isExplicit ? source : undefined,
      firstSeenAt: new Date(),
      lastConfirmedAt: new Date(),
    },
    update: {
      value,
      confidence: isExplicit ? 1.0 : confidence, // Don't lower explicit facts
      lastConfirmedAt: new Date(),
      isExplicit: isExplicit || undefined, // Only set to true, never back to false
    },
  })
}

// ============================================
// Profile Assembly
// ============================================

/**
 * Assemble UIP for context injection
 */
export async function assembleUIP(userId: string): Promise<AssembledUIP | null> {
  const profile = await getFullProfile(userId)
  if (!profile) return null

  // Build dimension map
  const dimMap = new Map<UIPDomain, UIPDimensionScore>()
  for (const dim of profile.dimensions) {
    // Apply decay before using
    const effectiveConfidence = calculateDecayedConfidence(
      dim.confidence,
      dim.decayRate,
      dim.lastDecayedAt
    )
    if (effectiveConfidence >= CONFIDENCE_THRESHOLDS.TREAT_AS_UNKNOWN) {
      dimMap.set(dim.domain, { ...dim, confidence: effectiveConfidence })
    }
  }

  // Extract values from dimensions
  const identity = dimMap.get('IDENTITY_CONTEXT')?.value as IdentityContextValue | undefined
  const commPrefs = dimMap.get('COMMUNICATION_PREFS')?.value as CommunicationPrefsValue | undefined
  const expertise = dimMap.get('EXPERTISE_CALIBRATION')?.value as ExpertiseCalibrationValue | undefined
  const relationship = dimMap.get('RELATIONSHIP_STATE')?.value as RelationshipStateValue | undefined
  const goals = dimMap.get('GOALS_VALUES')?.value as GoalsValuesValue | undefined
  const behavioral = dimMap.get('BEHAVIORAL_PATTERNS')?.value as BehavioralPatternsValue | undefined

  // Determine trust level
  let trustLevel: 'new' | 'developing' | 'established' = 'new'
  if (relationship?.trustMaturity) {
    if (relationship.trustMaturity > 0.7) trustLevel = 'established'
    else if (relationship.trustMaturity > 0.3) trustLevel = 'developing'
  }

  // Determine autonomy level
  let autonomyLevel: 'low' | 'medium' | 'high' = 'low'
  if (relationship?.autonomyTolerance) {
    if (relationship.autonomyTolerance > 0.7) autonomyLevel = 'high'
    else if (relationship.autonomyTolerance > 0.4) autonomyLevel = 'medium'
  }

  // Determine explanation style from cognitive style or defaults
  const explanationStyle: 'theory-first' | 'example-first' | 'balanced' = 'balanced'

  // Calculate overall confidence
  const confidences = profile.dimensions.map((d) =>
    calculateDecayedConfidence(d.confidence, d.decayRate, d.lastDecayedAt)
  )
  const overallConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0

  return {
    name: identity?.name || identity?.preferredName,
    role: identity?.role,
    expertise: {
      expert: expertise?.expertDomains || [],
      learning: expertise?.learningDomains || [],
    },
    verbosity: commPrefs?.verbosity || 'moderate',
    tone: commPrefs?.tonePreference || 'exploratory',
    proactivity: commPrefs?.proactivityTolerance ?? 0.5,
    explanationStyle,
    detailLevel: commPrefs?.verbosity === 'concise' ? 'high-level' :
                 commPrefs?.verbosity === 'detailed' ? 'detailed' : 'moderate',
    trustLevel,
    autonomyLevel,
    activeGoals: goals?.activeGoals.map((g) => g.goal) || [],
    recentDecisions: [], // Would come from decision tracking
    overallConfidence,
    lastUpdated: profile.updatedAt,
  }
}

/**
 * Format UIP for system prompt injection
 */
export function formatUIPForPrompt(uip: AssembledUIP): UIPContextSummary {
  // Don't personalize if confidence is too low
  if (uip.overallConfidence < CONFIDENCE_THRESHOLDS.TREAT_AS_UNKNOWN) {
    return {
      shouldPersonalize: false,
      summary: '',
      adapters: {
        verbosityMultiplier: 1.0,
        proactivityLevel: 0.5,
        autonomyLevel: 0.5,
      },
      confidence: uip.overallConfidence,
    }
  }

  // Build summary parts
  const parts: string[] = []

  // Identity
  if (uip.name) {
    parts.push(`User's name is ${uip.name}${uip.role ? ` (${uip.role})` : ''}.`)
  }

  // Expertise
  if (uip.expertise.expert.length > 0) {
    parts.push(`Expert in: ${uip.expertise.expert.slice(0, 3).join(', ')}.`)
  }
  if (uip.expertise.learning.length > 0) {
    parts.push(`Currently learning: ${uip.expertise.learning.slice(0, 3).join(', ')}.`)
  }

  // Communication preferences
  const commParts: string[] = []
  if (uip.verbosity === 'concise') {
    commParts.push('prefers brief responses')
  } else if (uip.verbosity === 'detailed') {
    commParts.push('prefers detailed explanations')
  }
  if (uip.tone === 'directive') {
    commParts.push('direct communication')
  } else if (uip.tone === 'supportive') {
    commParts.push('supportive tone')
  }
  if (commParts.length > 0) {
    parts.push(`Communication style: ${commParts.join(', ')}.`)
  }

  // Relationship
  if (uip.trustLevel === 'established') {
    parts.push('Established working relationship - can be more direct.')
  }
  if (uip.autonomyLevel === 'high') {
    parts.push('High autonomy tolerance - can take initiative.')
  }

  // Active goals
  if (uip.activeGoals.length > 0) {
    parts.push(`Current goals: ${uip.activeGoals.slice(0, 3).join('; ')}.`)
  }

  // Calculate adapters
  const verbosityMultiplier = uip.verbosity === 'concise' ? 0.6 :
                             uip.verbosity === 'detailed' ? 1.5 : 1.0

  const proactivityLevel = uip.proactivity

  const autonomyNum = uip.autonomyLevel === 'low' ? 0.3 :
                      uip.autonomyLevel === 'high' ? 0.8 : 0.5

  return {
    shouldPersonalize: true,
    summary: parts.length > 0 ? `User Profile:\n${parts.join('\n')}` : '',
    adapters: {
      suggestedMode: uip.verbosity === 'concise' ? 'quick' :
                     uip.trustLevel === 'established' ? 'thoughtful' : undefined,
      verbosityMultiplier,
      proactivityLevel,
      autonomyLevel: autonomyNum,
    },
    confidence: uip.overallConfidence,
  }
}

// ============================================
// Quick Access Functions
// ============================================

/**
 * Get UIP context for a request (main entry point)
 */
export async function getUIPContext(userId: string): Promise<UIPContextSummary> {
  const uip = await assembleUIP(userId)

  if (!uip) {
    return {
      shouldPersonalize: false,
      summary: '',
      adapters: {
        verbosityMultiplier: 1.0,
        proactivityLevel: 0.5,
        autonomyLevel: 0.5,
      },
      confidence: 0,
    }
  }

  return formatUIPForPrompt(uip)
}

/**
 * Process signals and update UIP (call after message processing)
 */
export async function processSignalsForUser(
  userId: string,
  signals: UIPSignalData[]
): Promise<void> {
  // Get or create profile
  const profile = await getOrCreateProfile(userId)

  // Check privacy tier - only process if B or C
  if (profile.privacyTier === 'A') {
    return // Session-only, don't persist
  }

  // Store signals
  await storeSignals(profile.id, signals)

  // Get existing dimension values
  const existingDims = await getDimensionScores(profile.id)
  const existingValues: Partial<Record<UIPDomain, DomainValue>> = {}
  for (const dim of existingDims) {
    existingValues[dim.domain] = dim.value as DomainValue
  }

  // Infer new dimensions
  const inferred = inferAllDimensions(
    signals,
    profile.sessionCount,
    existingValues
  )

  // Update dimensions with sufficient confidence
  for (const [domain, result] of Object.entries(inferred)) {
    if (result.confidence >= CONFIDENCE_THRESHOLDS.TREAT_AS_UNKNOWN) {
      await upsertDimensionScore(
        profile.id,
        domain as UIPDomain,
        result.value,
        result.confidence,
        result.sources
      )
    }
  }

  // Mark signals as processed
  const recentSignals = await prisma.uIPSignal.findMany({
    where: {
      profileId: profile.id,
      processed: false,
      createdAt: { gte: new Date(Date.now() - 60000) }, // Last minute
    },
    select: { id: true },
  })
  await markSignalsProcessed(recentSignals.map((s) => s.id))
}
