/**
 * UIP Progressive Elicitation System
 * Asks users questions to fill UIP gaps (minimally, non-intrusively)
 * @see docs/architecture/UIP_SPEC.md
 */

import { prisma } from '@/lib/db/prisma'
import { UIPDomain } from '@prisma/client'
import {
  ElicitationQuestion,
  ElicitationDecision,
  CONFIDENCE_THRESHOLDS,
} from './types'
import { getDimensionScores, upsertFact, getOrCreateProfile } from './service'
import { calculateDecayedConfidence } from './dimension-inference'

// ============================================
// Question Bank
// ============================================

/**
 * All elicitation questions, organized by domain and phase
 */
export const ELICITATION_QUESTIONS: ElicitationQuestion[] = [
  // Phase 1: Identity (Session 2)
  {
    id: 'identity_role',
    domain: 'IDENTITY_CONTEXT',
    question: "What's your role or what do you do?",
    shortForm: 'Your role',
    priority: 10,
    phase: 1,
  },
  {
    id: 'identity_name',
    domain: 'IDENTITY_CONTEXT',
    question: 'What should I call you?',
    shortForm: 'Your name',
    priority: 9,
    phase: 1,
    skipCondition: (profile) => !!profile.name,
  },

  // Phase 2: Goals (Session 3)
  {
    id: 'goals_current',
    domain: 'GOALS_VALUES',
    question: "What are you working on or trying to achieve right now?",
    shortForm: 'Current goals',
    priority: 8,
    phase: 2,
  },
  {
    id: 'goals_challenge',
    domain: 'GOALS_VALUES',
    question: "What's the biggest challenge you're facing?",
    shortForm: 'Main challenge',
    priority: 7,
    phase: 2,
  },

  // Phase 3: Communication (Session 4)
  {
    id: 'comm_verbosity',
    domain: 'COMMUNICATION_PREFS',
    question: 'Do you prefer brief, to-the-point answers or more detailed explanations?',
    shortForm: 'Response length',
    priority: 6,
    phase: 3,
  },
  {
    id: 'comm_style',
    domain: 'COMMUNICATION_PREFS',
    question: 'Would you rather I give you one recommendation or multiple options to choose from?',
    shortForm: 'Options preference',
    priority: 5,
    phase: 3,
  },

  // Phase 4: Expertise (Session 4+)
  {
    id: 'expertise_areas',
    domain: 'EXPERTISE_CALIBRATION',
    question: 'What topics or areas are you most experienced in?',
    shortForm: 'Expert areas',
    priority: 4,
    phase: 4,
  },
  {
    id: 'expertise_learning',
    domain: 'EXPERTISE_CALIBRATION',
    question: "Is there anything you're actively trying to learn?",
    shortForm: 'Learning goals',
    priority: 3,
    phase: 4,
  },
]

// ============================================
// Elicitation Logic
// ============================================

/**
 * Determine if we should ask a question this session
 */
export async function shouldAskQuestion(userId: string): Promise<ElicitationDecision> {
  const profile = await prisma.userIntelligenceProfile.findUnique({
    where: { userId },
    include: {
      elicitationResponses: true,
      dimensions: true,
    },
  })

  if (!profile) {
    return { shouldAsk: false, reason: 'No profile found' }
  }

  // Rule: Session 1 - no questions, let them use OSQR first
  if (profile.sessionCount < 2) {
    return { shouldAsk: false, reason: 'First session - building trust' }
  }

  // Rule: Max 1 question per session (tracked via sessionCount vs questionsAsked)
  // This is a simplification - in production you'd track per-session
  const questionsThisSession = 0 // Would need session tracking

  if (questionsThisSession >= 1) {
    return { shouldAsk: false, reason: 'Already asked question this session' }
  }

  // Rule: Cap at 4 questions total during onboarding
  if (profile.questionsAsked >= 4 && profile.elicitationPhase <= 4) {
    return { shouldAsk: false, reason: 'Onboarding complete - infer the rest' }
  }

  // Determine current phase based on session count
  const phase = Math.min(profile.sessionCount - 1, 4) as 1 | 2 | 3 | 4

  // Find gaps that need filling
  const gaps = await identifyGaps(profile.id, profile.dimensions)

  // Get next question for this phase
  type ElicitationResponse = (typeof profile.elicitationResponses)[number]
  const question = selectNextQuestion(
    phase,
    profile.elicitationResponses.map((r: ElicitationResponse) => r.questionId),
    gaps
  )

  if (!question) {
    return { shouldAsk: false, reason: 'No relevant questions for this phase' }
  }

  return {
    shouldAsk: true,
    question,
    reason: `Phase ${phase} question available`,
  }
}

/**
 * Identify UIP gaps that need filling
 */
async function identifyGaps(
  profileId: string,
  dimensions: Array<{ domain: UIPDomain; confidence: number; decayRate: number; lastDecayedAt: Date }>
): Promise<UIPDomain[]> {
  const gaps: UIPDomain[] = []

  // Check each domain's effective confidence
  const allDomains: UIPDomain[] = [
    'IDENTITY_CONTEXT',
    'GOALS_VALUES',
    'COMMUNICATION_PREFS',
    'EXPERTISE_CALIBRATION',
  ]

  for (const domain of allDomains) {
    const dim = dimensions.find((d) => d.domain === domain)

    if (!dim) {
      // No data at all
      gaps.push(domain)
    } else {
      const effectiveConf = calculateDecayedConfidence(
        dim.confidence,
        dim.decayRate,
        dim.lastDecayedAt
      )
      if (effectiveConf < CONFIDENCE_THRESHOLDS.ACT_WITH_UNCERTAINTY) {
        gaps.push(domain)
      }
    }
  }

  return gaps
}

/**
 * Select the best question to ask
 */
function selectNextQuestion(
  phase: 1 | 2 | 3 | 4,
  askedQuestionIds: string[],
  gaps: UIPDomain[]
): ElicitationQuestion | undefined {
  // Filter questions for this phase that haven't been asked
  const candidates = ELICITATION_QUESTIONS.filter(
    (q) =>
      q.phase <= phase && // Available in this or earlier phase
      !askedQuestionIds.includes(q.id) && // Not already asked
      gaps.includes(q.domain) // Addresses a gap
  )

  // Sort by priority (highest first)
  candidates.sort((a, b) => b.priority - a.priority)

  return candidates[0]
}

// ============================================
// Question Formatting
// ============================================

/**
 * Format question for chat display
 */
export function formatElicitationQuestion(question: ElicitationQuestion): string {
  return `Quick question to help me help you better: ${question.question} (Skip if you'd rather not say)`
}

/**
 * Format question as a short prompt
 */
export function formatShortPrompt(question: ElicitationQuestion): string {
  return question.shortForm
}

// ============================================
// Response Processing
// ============================================

/**
 * Process user's answer to an elicitation question
 */
export async function processElicitationResponse(
  userId: string,
  questionId: string,
  response: string | null, // null if skipped
): Promise<void> {
  const profile = await getOrCreateProfile(userId)
  const question = ELICITATION_QUESTIONS.find((q) => q.id === questionId)

  if (!question) {
    console.error(`Unknown question ID: ${questionId}`)
    return
  }

  const skipped = response === null || response.trim() === ''

  // Store the response
  await prisma.uIPElicitationResponse.upsert({
    where: {
      profileId_questionId: { profileId: profile.id, questionId },
    },
    create: {
      profileId: profile.id,
      questionId,
      question: question.question,
      domain: question.domain,
      response: skipped ? null : response,
      skipped,
      sessionNumber: profile.sessionCount,
      phase: question.phase,
    },
    update: {
      response: skipped ? null : response,
      skipped,
    },
  })

  // Update profile stats
  await prisma.userIntelligenceProfile.update({
    where: { id: profile.id },
    data: {
      questionsAsked: { increment: 1 },
      questionsSkipped: skipped ? { increment: 1 } : undefined,
      elicitationPhase: Math.max(profile.elicitationPhase, question.phase),
    },
  })

  // If not skipped, extract facts from the response
  if (!skipped && response) {
    await extractFactsFromResponse(profile.id, question, response)
  }
}

/**
 * Extract facts from elicitation response
 */
async function extractFactsFromResponse(
  profileId: string,
  question: ElicitationQuestion,
  response: string
): Promise<void> {
  // Parse response based on question type
  switch (question.id) {
    case 'identity_name':
      await upsertFact(
        profileId,
        'IDENTITY_CONTEXT',
        'name',
        'preferredName',
        response.trim(),
        'ELICITATION',
        true
      )
      break

    case 'identity_role':
      await upsertFact(
        profileId,
        'IDENTITY_CONTEXT',
        'identity',
        'role',
        response.trim(),
        'ELICITATION',
        true
      )
      break

    case 'goals_current':
      await upsertFact(
        profileId,
        'GOALS_VALUES',
        'goal',
        'current',
        response.trim(),
        'ELICITATION',
        true
      )
      break

    case 'goals_challenge':
      await upsertFact(
        profileId,
        'GOALS_VALUES',
        'challenge',
        'main',
        response.trim(),
        'ELICITATION',
        true
      )
      break

    case 'comm_verbosity': {
      // Parse preference
      const lower = response.toLowerCase()
      let value = 'moderate'
      if (lower.includes('brief') || lower.includes('short') || lower.includes('concise')) {
        value = 'concise'
      } else if (lower.includes('detail') || lower.includes('thorough') || lower.includes('comprehensive')) {
        value = 'detailed'
      }
      await upsertFact(
        profileId,
        'COMMUNICATION_PREFS',
        'preference',
        'verbosity',
        value,
        'ELICITATION',
        true
      )
      break
    }

    case 'comm_style': {
      const lower = response.toLowerCase()
      let value = '0' // Balanced
      if (lower.includes('one') || lower.includes('single') || lower.includes('recommendation')) {
        value = '-1' // Single recommendation
      } else if (lower.includes('multiple') || lower.includes('options') || lower.includes('choice')) {
        value = '1' // Multiple options
      }
      await upsertFact(
        profileId,
        'COMMUNICATION_PREFS',
        'preference',
        'optionsVsRecommendation',
        value,
        'ELICITATION',
        true
      )
      break
    }

    case 'expertise_areas':
      // Split by common delimiters
      const expertAreas = response
        .split(/[,;]|\band\b/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 5)

      for (let i = 0; i < expertAreas.length; i++) {
        await upsertFact(
          profileId,
          'EXPERTISE_CALIBRATION',
          'expert',
          `area_${i}`,
          expertAreas[i],
          'ELICITATION',
          true
        )
      }
      break

    case 'expertise_learning':
      const learningAreas = response
        .split(/[,;]|\band\b/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 5)

      for (let i = 0; i < learningAreas.length; i++) {
        await upsertFact(
          profileId,
          'EXPERTISE_CALIBRATION',
          'learning',
          `area_${i}`,
          learningAreas[i],
          'ELICITATION',
          true
        )
      }
      break
  }
}

// ============================================
// Gap-Triggered Questions (Post-Onboarding)
// ============================================

/**
 * Check if a gap-triggered question should be asked
 * (Limited to 1 per session, only for significant gaps)
 */
export async function shouldAskGapQuestion(userId: string): Promise<ElicitationDecision> {
  const profile = await prisma.userIntelligenceProfile.findUnique({
    where: { userId },
    include: {
      dimensions: true,
      elicitationResponses: {
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
      },
    },
  })

  if (!profile) {
    return { shouldAsk: false, reason: 'No profile' }
  }

  // Rule: Only after onboarding (4+ questions asked or phase 4 complete)
  if (profile.questionsAsked < 4 && profile.elicitationPhase < 4) {
    return { shouldAsk: false, reason: 'Still in onboarding' }
  }

  // Rule: Max 1 gap question per week
  if (profile.elicitationResponses.length > 0) {
    return { shouldAsk: false, reason: 'Already asked recently' }
  }

  // Find significant gaps (confidence < 0.4)
  type Dimension = (typeof profile.dimensions)[number]
  const significantGaps = profile.dimensions.filter((d: Dimension) => {
    const effective = calculateDecayedConfidence(
      d.confidence,
      d.decayRate,
      d.lastDecayedAt
    )
    return effective < 0.4
  })

  if (significantGaps.length === 0) {
    return { shouldAsk: false, reason: 'No significant gaps' }
  }

  // Find a question for the lowest-confidence domain
  const lowestGap = significantGaps.sort(
    (a: Dimension, b: Dimension) =>
      calculateDecayedConfidence(a.confidence, a.decayRate, a.lastDecayedAt) -
      calculateDecayedConfidence(b.confidence, b.decayRate, b.lastDecayedAt)
  )[0]

  type ElicitationResponseItem = (typeof profile.elicitationResponses)[number]
  const askedIds = profile.elicitationResponses.map((r: ElicitationResponseItem) => r.questionId)
  const question = ELICITATION_QUESTIONS.find(
    (q) => q.domain === lowestGap.domain && !askedIds.includes(q.id)
  )

  if (!question) {
    return { shouldAsk: false, reason: 'No available questions for gap' }
  }

  return {
    shouldAsk: true,
    question,
    reason: `Gap in ${lowestGap.domain}`,
  }
}
