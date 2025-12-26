/**
 * UIP Dimension Inference
 * Synthesizes signals into dimension scores
 * @see docs/architecture/UIP_SPEC.md
 */

import { UIPDomain, UIPSource, UIPTier } from '@prisma/client'
import {
  DomainValue,
  CommunicationPrefsValue,
  ExpertiseCalibrationValue,
  BehavioralPatternsValue,
  RelationshipStateValue,
  IdentityContextValue,
  CognitiveStyleValue,
  GoalsValuesValue,
  DecisionFrictionValue,
  UIPSignalData,
  CONFIDENCE_THRESHOLDS,
  SOURCE_CONFIDENCE,
  DEFAULT_DECAY_RATES,
} from './types'

// ============================================
// Confidence Calculation
// ============================================

/**
 * Calculate effective confidence after decay
 */
export function calculateDecayedConfidence(
  baseConfidence: number,
  decayRate: number,
  lastUpdated: Date
): number {
  const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  const decayFactor = Math.pow(1 - decayRate, daysSinceUpdate / 30)
  return baseConfidence * decayFactor
}

/**
 * Get initial confidence based on source
 */
export function getSourceConfidence(source: UIPSource): number {
  return SOURCE_CONFIDENCE[source] ?? 0.5
}

/**
 * Merge confidence from multiple signals
 */
export function mergeConfidence(confidences: number[]): number {
  if (confidences.length === 0) return 0

  // Use weighted average with diminishing returns
  // Each additional signal adds less confidence
  let merged = 0
  let weight = 1

  for (const conf of confidences.sort((a, b) => b - a)) {
    merged += conf * weight
    weight *= 0.5 // Each subsequent signal counts half as much
  }

  // Normalize and cap at 0.95 (never 100% confident from inference)
  return Math.min(merged / (2 - Math.pow(0.5, confidences.length)), 0.95)
}

// ============================================
// Signal Aggregation
// ============================================

interface AggregatedSignals {
  messageStyle: {
    avgWordCount: number
    avgSentenceLength: number
    structuredRate: number
    technicalRate: number
    questionRate: number
    tones: Record<string, number>
    count: number
  }
  feedback: {
    corrections: number
    praises: number
    frustrations: number
    acceptances: number
  }
  preferences: Array<{ domain: UIPDomain; preference: string }>
  questions: {
    avgComplexity: number
    expertiseRequired: number
    domains: Record<string, number>
    count: number
  }
  modes: Record<string, number>
  goals: Array<{ goalText: string; timeframe: string }>
  decisions: {
    pending: string[]
    made: string[]
  }
}

/**
 * Aggregate signals for dimension inference
 */
export function aggregateSignals(signals: UIPSignalData[]): AggregatedSignals {
  const result: AggregatedSignals = {
    messageStyle: {
      avgWordCount: 0,
      avgSentenceLength: 0,
      structuredRate: 0,
      technicalRate: 0,
      questionRate: 0,
      tones: {},
      count: 0,
    },
    feedback: {
      corrections: 0,
      praises: 0,
      frustrations: 0,
      acceptances: 0,
    },
    preferences: [],
    questions: {
      avgComplexity: 0,
      domains: {},
      expertiseRequired: 0,
      count: 0,
    },
    modes: {},
    goals: [],
    decisions: {
      pending: [],
      made: [],
    },
  }

  let totalWordCount = 0
  let totalSentenceLength = 0
  let structuredCount = 0
  let technicalCount = 0
  let questionMsgCount = 0
  let totalComplexity = 0
  let expertiseCount = 0

  for (const signal of signals) {
    switch (signal.signalType) {
      case 'message_style': {
        const data = signal.data
        totalWordCount += data.wordCount
        totalSentenceLength += data.avgWordsPerSentence
        if (data.hasStructure) structuredCount++
        if (data.hasTechnicalTerms) technicalCount++
        if (data.questionCount > 0) questionMsgCount++
        result.messageStyle.tones[data.tone] = (result.messageStyle.tones[data.tone] || 0) + 1
        result.messageStyle.count++
        break
      }
      case 'feedback_signal': {
        const data = signal.data
        switch (data.feedbackType) {
          case 'correction':
            result.feedback.corrections++
            break
          case 'praise':
            result.feedback.praises++
            break
          case 'frustration':
            result.feedback.frustrations++
            break
          case 'acceptance':
            result.feedback.acceptances++
            break
        }
        break
      }
      case 'preference_statement': {
        const data = signal.data
        result.preferences.push({ domain: data.domain, preference: data.preference })
        break
      }
      case 'question_sophistication': {
        const data = signal.data
        totalComplexity += data.complexity
        if (data.requiresExpertise) expertiseCount++
        if (data.domain) {
          result.questions.domains[data.domain] = (result.questions.domains[data.domain] || 0) + 1
        }
        result.questions.count++
        break
      }
      case 'mode_selection': {
        const mode = signal.data.mode
        result.modes[mode] = (result.modes[mode] || 0) + 1
        break
      }
      case 'goal_reference': {
        const data = signal.data as { goalText?: string; timeframe?: string }
        if (data.goalText) {
          result.goals.push({ goalText: data.goalText, timeframe: data.timeframe || 'medium' })
        }
        break
      }
      case 'decision_mention': {
        const data = signal.data
        if (data.isMade) {
          result.decisions.made.push(data.decisionText)
        } else {
          result.decisions.pending.push(data.decisionText)
        }
        break
      }
    }
  }

  // Calculate averages
  if (result.messageStyle.count > 0) {
    result.messageStyle.avgWordCount = totalWordCount / result.messageStyle.count
    result.messageStyle.avgSentenceLength = totalSentenceLength / result.messageStyle.count
    result.messageStyle.structuredRate = structuredCount / result.messageStyle.count
    result.messageStyle.technicalRate = technicalCount / result.messageStyle.count
    result.messageStyle.questionRate = questionMsgCount / result.messageStyle.count
  }

  if (result.questions.count > 0) {
    result.questions.avgComplexity = totalComplexity / result.questions.count
    result.questions.expertiseRequired = expertiseCount / result.questions.count
  }

  return result
}

// ============================================
// Domain Inference
// ============================================

/**
 * Infer Communication Preferences from aggregated signals
 */
export function inferCommunicationPrefs(
  aggregated: AggregatedSignals,
  existingValue?: CommunicationPrefsValue
): { value: CommunicationPrefsValue; confidence: number; sources: UIPSource[] } {
  const sources: UIPSource[] = []

  // Start with existing or defaults
  const value: CommunicationPrefsValue = existingValue ?? {
    verbosity: 'moderate',
    preferredFormat: 'mixed',
    optionsVsRecommendation: 0,
    tonePreference: 'exploratory',
    proactivityTolerance: 0.5,
  }

  // Check for explicit preferences first
  for (const pref of aggregated.preferences) {
    if (pref.domain === 'COMMUNICATION_PREFS') {
      sources.push('EXPLICIT_PKV')
      const [key, val] = pref.preference.split(':')
      if (key === 'verbosity') {
        value.verbosity = val as 'concise' | 'moderate' | 'detailed'
      } else if (key === 'format') {
        value.preferredFormat = val as 'bullets' | 'prose' | 'mixed'
      }
    }
  }

  // Infer from message style if no explicit preference
  if (aggregated.messageStyle.count >= 3 && sources.length === 0) {
    sources.push(aggregated.messageStyle.count >= 5 ? 'BEHAVIORAL_REPEATED' : 'BEHAVIORAL_SINGLE')

    // Infer verbosity from their message length
    if (aggregated.messageStyle.avgWordCount < 20) {
      value.verbosity = 'concise'
    } else if (aggregated.messageStyle.avgWordCount > 80) {
      value.verbosity = 'detailed'
    }

    // Infer format preference
    if (aggregated.messageStyle.structuredRate > 0.5) {
      value.preferredFormat = 'bullets'
    }

    // Infer tone from their tone
    const mostCommonTone = Object.entries(aggregated.messageStyle.tones)
      .sort(([, a], [, b]) => b - a)[0]?.[0]
    if (mostCommonTone === 'casual') {
      value.tonePreference = 'supportive'
    } else if (mostCommonTone === 'technical' || mostCommonTone === 'formal') {
      value.tonePreference = 'directive'
    }
  }

  // Calculate confidence
  const confidence = mergeConfidence(sources.map(getSourceConfidence))

  return { value, confidence, sources }
}

/**
 * Infer Expertise Calibration from aggregated signals
 */
export function inferExpertiseCalibration(
  aggregated: AggregatedSignals,
  existingValue?: ExpertiseCalibrationValue
): { value: ExpertiseCalibrationValue; confidence: number; sources: UIPSource[] } {
  const sources: UIPSource[] = []

  const value: ExpertiseCalibrationValue = existingValue ?? {
    expertDomains: [],
    learningDomains: [],
    domainScores: {},
    vocabularyLevel: 'intermediate',
  }

  // Check for explicit expertise statements
  for (const pref of aggregated.preferences) {
    if (pref.domain === 'EXPERTISE_CALIBRATION') {
      sources.push('EXPLICIT_PKV')
      const [key, domain] = pref.preference.split(':')
      if (key === 'expert' && domain && !value.expertDomains.includes(domain)) {
        value.expertDomains.push(domain)
        value.domainScores[domain] = 0.9
      } else if (key === 'learning' && domain && !value.learningDomains.includes(domain)) {
        value.learningDomains.push(domain)
        value.domainScores[domain] = 0.3
      }
    }
  }

  // Infer from question sophistication
  if (aggregated.questions.count >= 3) {
    sources.push('BEHAVIORAL_REPEATED')

    // High complexity questions suggest expertise
    if (aggregated.questions.avgComplexity > 0.7) {
      value.vocabularyLevel = 'advanced'
    } else if (aggregated.questions.avgComplexity > 0.5) {
      value.vocabularyLevel = 'intermediate'
    }

    // Domain-specific expertise from question domains
    for (const [domain, count] of Object.entries(aggregated.questions.domains)) {
      if (count >= 2) {
        const existingScore = value.domainScores[domain] || 0.5
        // Frequent questions in a domain + high complexity = expertise
        if (aggregated.questions.expertiseRequired > 0.5) {
          value.domainScores[domain] = Math.min(existingScore + 0.2, 0.9)
          if (!value.expertDomains.includes(domain)) {
            value.expertDomains.push(domain)
          }
        } else {
          // Many simple questions = learning
          value.domainScores[domain] = Math.max(existingScore - 0.1, 0.3)
          if (!value.learningDomains.includes(domain)) {
            value.learningDomains.push(domain)
          }
        }
      }
    }
  }

  // Infer from technical language usage
  if (aggregated.messageStyle.count >= 5 && aggregated.messageStyle.technicalRate > 0.6) {
    sources.push('BEHAVIORAL_REPEATED')
    if (value.vocabularyLevel !== 'expert') {
      value.vocabularyLevel = 'advanced'
    }
  }

  const confidence = mergeConfidence(sources.map(getSourceConfidence))

  return { value, confidence, sources }
}

/**
 * Infer Behavioral Patterns from aggregated signals
 */
export function inferBehavioralPatterns(
  aggregated: AggregatedSignals,
  existingValue?: BehavioralPatternsValue
): { value: BehavioralPatternsValue; confidence: number; sources: UIPSource[] } {
  const sources: UIPSource[] = []

  const value: BehavioralPatternsValue = existingValue ?? {
    preferredSessionTime: undefined,
    typicalSessionLength: 15,
    modeDistribution: { quick: 0.25, thoughtful: 0.5, contemplate: 0.2, council: 0.05 },
    retryRate: 0.1,
    refinementRate: 0.1,
    averageLatencyTolerance: 10,
  }

  // Infer mode distribution from mode selections
  const totalModes = Object.values(aggregated.modes).reduce((a, b) => a + b, 0)
  if (totalModes >= 3) {
    sources.push('BEHAVIORAL_REPEATED')
    value.modeDistribution = {
      quick: (aggregated.modes['quick'] || 0) / totalModes,
      thoughtful: (aggregated.modes['thoughtful'] || 0) / totalModes,
      contemplate: (aggregated.modes['contemplate'] || 0) / totalModes,
      council: (aggregated.modes['council'] || 0) / totalModes,
    }
  }

  // Note: Session timing and retry patterns would come from telemetry events
  // not message analysis - those would be added via separate signal creation

  const confidence = mergeConfidence(sources.map(getSourceConfidence))

  return { value, confidence, sources }
}

/**
 * Infer Relationship State from feedback and interaction patterns
 */
export function inferRelationshipState(
  aggregated: AggregatedSignals,
  sessionCount: number,
  existingValue?: RelationshipStateValue
): { value: RelationshipStateValue; confidence: number; sources: UIPSource[] } {
  const sources: UIPSource[] = []

  const value: RelationshipStateValue = existingValue ?? {
    trustMaturity: 0.1,
    autonomyTolerance: 0.3,
    correctionRate: 0.1,
    acceptanceRate: 0.5,
    feedbackFrequency: 0.1,
    sessionCount: 0,
    totalDurationMinutes: 0,
  }

  value.sessionCount = sessionCount

  // Calculate trust from session count (trust builds over time)
  if (sessionCount >= 1) {
    sources.push('BEHAVIORAL_SINGLE')
    value.trustMaturity = Math.min(0.1 + (sessionCount * 0.05), 0.9)
  }

  // Infer from feedback patterns
  const totalFeedback = aggregated.feedback.corrections +
    aggregated.feedback.praises +
    aggregated.feedback.frustrations +
    aggregated.feedback.acceptances

  if (totalFeedback >= 3) {
    sources.push('BEHAVIORAL_REPEATED')

    value.correctionRate = aggregated.feedback.corrections / totalFeedback
    value.acceptanceRate = (aggregated.feedback.praises + aggregated.feedback.acceptances) / totalFeedback

    // High acceptance rate + low corrections = higher autonomy tolerance
    if (value.acceptanceRate > 0.7 && value.correctionRate < 0.2) {
      value.autonomyTolerance = Math.min(value.autonomyTolerance + 0.2, 0.8)
    }

    // Many frustrations = lower autonomy tolerance
    if (aggregated.feedback.frustrations / totalFeedback > 0.3) {
      value.autonomyTolerance = Math.max(value.autonomyTolerance - 0.2, 0.2)
    }

    value.feedbackFrequency = totalFeedback / Math.max(aggregated.messageStyle.count, 1)
  }

  const confidence = mergeConfidence(sources.map(getSourceConfidence))

  return { value, confidence, sources }
}

/**
 * Infer Identity Context from explicit statements
 */
export function inferIdentityContext(
  aggregated: AggregatedSignals,
  existingValue?: IdentityContextValue
): { value: IdentityContextValue; confidence: number; sources: UIPSource[] } {
  const sources: UIPSource[] = []

  const value: IdentityContextValue = existingValue ?? {}

  // Identity mostly comes from explicit statements
  for (const pref of aggregated.preferences) {
    if (pref.domain === 'IDENTITY_CONTEXT') {
      sources.push('EXPLICIT_PKV')
      const [key, val] = pref.preference.split(':')
      if (key === 'name') value.name = val
      else if (key === 'preferredName') value.preferredName = val
      else if (key === 'role') value.role = val
    }
  }

  const confidence = mergeConfidence(sources.map(getSourceConfidence))

  return { value, confidence, sources }
}

/**
 * Infer Goals & Values from goal references
 */
export function inferGoalsValues(
  aggregated: AggregatedSignals,
  existingValue?: GoalsValuesValue
): { value: GoalsValuesValue; confidence: number; sources: UIPSource[] } {
  const sources: UIPSource[] = []

  const value: GoalsValuesValue = existingValue ?? {
    activeGoals: [],
    valueFilters: {
      speedVsSafety: 0,
      qualityVsLeverage: 0,
      depthVsBreadth: 0,
    },
    constraints: [],
    successDefinition: undefined,
  }

  // Add goals from goal references
  if (aggregated.goals.length > 0) {
    sources.push(aggregated.goals.length >= 3 ? 'BEHAVIORAL_REPEATED' : 'BEHAVIORAL_SINGLE')

    for (const goal of aggregated.goals) {
      // Check if similar goal already exists
      const exists = value.activeGoals.some(g =>
        g.goal.toLowerCase().includes(goal.goalText.toLowerCase().slice(0, 20))
      )

      if (!exists) {
        value.activeGoals.push({
          id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          goal: goal.goalText,
          timeframe: goal.timeframe as 'short' | 'medium' | 'long',
          priority: 5, // Default priority
        })
      }
    }

    // Cap at 10 active goals
    if (value.activeGoals.length > 10) {
      value.activeGoals = value.activeGoals.slice(-10)
    }
  }

  const confidence = mergeConfidence(sources.map(getSourceConfidence))

  return { value, confidence, sources }
}

/**
 * Infer Decision Friction from decision mentions
 */
export function inferDecisionFriction(
  aggregated: AggregatedSignals,
  existingValue?: DecisionFrictionValue
): { value: DecisionFrictionValue; confidence: number; sources: UIPSource[] } {
  const sources: UIPSource[] = []

  const value: DecisionFrictionValue = existingValue ?? {
    hesitationPoints: [],
    overAnalysisRate: 0.2,
    momentumTriggers: [],
    decisionBacklogSize: 0,
    averageDecisionTime: 3,
  }

  // Track pending decisions as hesitation points
  if (aggregated.decisions.pending.length > 0) {
    sources.push('BEHAVIORAL_SINGLE')
    value.hesitationPoints = [
      ...value.hesitationPoints,
      ...aggregated.decisions.pending,
    ].slice(-10) // Keep last 10

    value.decisionBacklogSize = aggregated.decisions.pending.length
  }

  // High pending vs made ratio = high friction
  const totalDecisions = aggregated.decisions.pending.length + aggregated.decisions.made.length
  if (totalDecisions >= 3) {
    sources.push('BEHAVIORAL_REPEATED')
    value.overAnalysisRate = aggregated.decisions.pending.length / totalDecisions
  }

  const confidence = mergeConfidence(sources.map(getSourceConfidence))

  return { value, confidence, sources }
}

/**
 * Infer Cognitive Style (requires more signals, returns defaults initially)
 */
export function inferCognitiveStyle(
  aggregated: AggregatedSignals,
  existingValue?: CognitiveStyleValue
): { value: CognitiveStyleValue; confidence: number; sources: UIPSource[] } {
  // Cognitive style is harder to infer from messages alone
  // Would need to analyze:
  // - How they respond to abstract vs concrete explanations
  // - Whether they prefer step-by-step or big picture
  // - Visual vs text content engagement

  // For now, return defaults with low confidence
  const value: CognitiveStyleValue = existingValue ?? {
    abstractVsConcrete: 0,
    linearVsAssociative: 0,
    verbalVsVisual: 0,
    reflectiveVsAction: 0,
  }

  return { value, confidence: 0.3, sources: [] }
}

// ============================================
// Main Inference Entry Point
// ============================================

export interface InferredDimensions {
  IDENTITY_CONTEXT: { value: IdentityContextValue; confidence: number; sources: UIPSource[] }
  GOALS_VALUES: { value: GoalsValuesValue; confidence: number; sources: UIPSource[] }
  COGNITIVE_STYLE: { value: CognitiveStyleValue; confidence: number; sources: UIPSource[] }
  COMMUNICATION_PREFS: { value: CommunicationPrefsValue; confidence: number; sources: UIPSource[] }
  EXPERTISE_CALIBRATION: { value: ExpertiseCalibrationValue; confidence: number; sources: UIPSource[] }
  BEHAVIORAL_PATTERNS: { value: BehavioralPatternsValue; confidence: number; sources: UIPSource[] }
  RELATIONSHIP_STATE: { value: RelationshipStateValue; confidence: number; sources: UIPSource[] }
  DECISION_FRICTION: { value: DecisionFrictionValue; confidence: number; sources: UIPSource[] }
}

/**
 * Infer all dimensions from signals
 */
export function inferAllDimensions(
  signals: UIPSignalData[],
  sessionCount: number,
  existingValues?: Partial<Record<UIPDomain, DomainValue>>
): InferredDimensions {
  const aggregated = aggregateSignals(signals)

  return {
    IDENTITY_CONTEXT: inferIdentityContext(
      aggregated,
      existingValues?.IDENTITY_CONTEXT as IdentityContextValue
    ),
    GOALS_VALUES: inferGoalsValues(
      aggregated,
      existingValues?.GOALS_VALUES as GoalsValuesValue
    ),
    COGNITIVE_STYLE: inferCognitiveStyle(
      aggregated,
      existingValues?.COGNITIVE_STYLE as CognitiveStyleValue
    ),
    COMMUNICATION_PREFS: inferCommunicationPrefs(
      aggregated,
      existingValues?.COMMUNICATION_PREFS as CommunicationPrefsValue
    ),
    EXPERTISE_CALIBRATION: inferExpertiseCalibration(
      aggregated,
      existingValues?.EXPERTISE_CALIBRATION as ExpertiseCalibrationValue
    ),
    BEHAVIORAL_PATTERNS: inferBehavioralPatterns(
      aggregated,
      existingValues?.BEHAVIORAL_PATTERNS as BehavioralPatternsValue
    ),
    RELATIONSHIP_STATE: inferRelationshipState(
      aggregated,
      sessionCount,
      existingValues?.RELATIONSHIP_STATE as RelationshipStateValue
    ),
    DECISION_FRICTION: inferDecisionFriction(
      aggregated,
      existingValues?.DECISION_FRICTION as DecisionFrictionValue
    ),
  }
}
