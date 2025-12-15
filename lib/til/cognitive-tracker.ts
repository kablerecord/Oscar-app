/**
 * Cognitive Tracker - Extended TIL Dimensions
 *
 * Tracks 50+ behavioral dimensions for each user to enable:
 * 1. Deep personalization of OSQR responses
 * 2. Surprise delta detection (when patterns break)
 * 3. Long-term learning about the user
 *
 * All data is user-private, stored in their workspace.
 */

import { prisma } from '../db/prisma'
import { queueInsight, type InsightCategory } from './insight-queue'

// ============================================
// Types - All Trackable Dimensions
// ============================================

export interface QuestionMetrics {
  wordCount: number
  questionMarks: number
  complexity: 'simple' | 'moderate' | 'complex' | 'multi-part'
  hasContext: boolean  // Did they provide background?
  isFollowUp: boolean  // Related to previous question?
  responseMode: 'quick' | 'thoughtful' | 'contemplate'
  topicCategory: string  // Detected topic
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
}

export interface CognitiveSessionMetrics {
  startTime: Date
  endTime?: Date
  durationMinutes: number
  questionCount: number
  followUpRatio: number  // % of questions that are follow-ups
  modeDistribution: { quick: number; thoughtful: number; contemplate: number }
  topicSwitches: number  // How often they change topics
  avgTimeBetweenQuestions: number  // seconds
}

export interface DecisionMetrics {
  questionToActionTime?: number  // Time from question to "I'll do X"
  deliberationDepth: number  // Questions asked before deciding
  revisitCount: number  // How many times they revisit this topic
  confidenceMarkers: number  // "I think" vs "I will" language
  outcomeReported?: boolean  // Did they report what happened?
}

export interface CommunicationPreferences {
  avgQuestionLength: number
  prefersVerboseResponses: boolean
  usesFormalLanguage: boolean
  usesEmojis: boolean
  technicalDepthTolerance: 'low' | 'medium' | 'high'
  preferredFormats: ('bullets' | 'prose' | 'code' | 'tables')[]
}

export interface TemporalPatterns {
  typicalSessionTimes: string[]  // "morning", "afternoon", "evening", "night"
  typicalSessionDays: string[]  // "weekday", "weekend"
  avgSessionDuration: number
  sessionsPerWeek: number
  peakProductivityHour?: number
}

export interface EngagementMetrics {
  copyActionRate: number  // How often they copy responses
  thumbsUpRate: number
  thumbsDownRate: number
  flagRate: number
  altOpinionRequestRate: number
  artifactInteractionRate: number
  knowledgeBaseGrowthRate: number  // docs added per week
  mscEngagementRate: number  // goals added/updated per week
}

export interface LearningMetrics {
  conceptGraduations: string[]  // Topics they've "mastered" (stopped asking basic Qs)
  vocabularyAdoptions: string[]  // Terms OSQR introduced that they now use
  questionSophisticationTrend: 'improving' | 'stable' | 'declining'
  selfCorrectionFrequency: number  // "Actually, let me rephrase..."
  referencesToPastConversations: number
}

export interface RelationshipMetrics {
  anthropomorphizationLevel: 'low' | 'medium' | 'high'  // "you" vs "it" vs "OSQR"
  trustIndicators: number  // Shares sensitive info frequency
  dependencyIndicators: number  // Asks things they could figure out
  teachingReceptivity: 'high' | 'medium' | 'low'  // Implements suggestions
  collaborationStyle: 'directive' | 'collaborative' | 'delegative'
}

export interface CognitiveProfile {
  workspaceId: string
  lastUpdated: Date
  dataPoints: number  // How many interactions this is based on

  // Computed baselines
  questionMetrics: {
    avgWordCount: number
    avgComplexity: number  // 1-4 scale
    modePreference: 'quick' | 'thoughtful' | 'contemplate'
    modeDistribution: { quick: number; thoughtful: number; contemplate: number }
    followUpRate: number
    topTopics: string[]
  }

  sessionMetrics: {
    avgDuration: number
    avgQuestionsPerSession: number
    avgTimeBetweenQuestions: number
    topicSwitchRate: number
  }

  decisionMetrics: {
    avgDeliberationDepth: number
    avgDecisionTime: number  // hours
    revisitRate: number
    decisionStyle: 'quick' | 'moderate' | 'deliberate'
  }

  communicationPrefs: CommunicationPreferences
  temporalPatterns: TemporalPatterns
  engagementMetrics: EngagementMetrics
  learningMetrics: LearningMetrics
  relationshipMetrics: RelationshipMetrics

  // Profile classification
  primaryProfile: 'analytical' | 'strategic' | 'creative' | 'operational' | 'mixed'
  secondaryTraits: string[]
}

// ============================================
// Surprise Delta System
// ============================================

export interface SurpriseEvent {
  id: string
  workspaceId: string
  timestamp: Date
  dimension: string  // Which metric broke pattern
  expected: number | string
  actual: number | string
  deviation: number  // How far from expected (sigma)
  significance: 'low' | 'medium' | 'high' | 'critical'
  context?: string  // What topic/question triggered this
  resolved: boolean  // Has OSQR addressed this?
}

export interface SurpriseAnalysis {
  recentSurprises: SurpriseEvent[]
  patterns: {
    dimension: string
    frequency: number
    avgDeviation: number
    trend: 'increasing' | 'stable' | 'decreasing'
  }[]
  insights: string[]  // Human-readable insights
}

// ============================================
// Storage Keys
// ============================================

const COGNITIVE_PROFILE_KEY = (workspaceId: string) => `til_cognitive_profile_${workspaceId}`
const QUESTION_HISTORY_KEY = (workspaceId: string) => `til_question_history_${workspaceId}`
const SURPRISE_LOG_KEY = (workspaceId: string) => `til_surprise_log_${workspaceId}`
const RAW_METRICS_KEY = (workspaceId: string) => `til_raw_metrics_${workspaceId}`

// ============================================
// Core Tracking Functions
// ============================================

/**
 * Track a question event with full metrics
 */
export async function trackQuestion(
  workspaceId: string,
  question: string,
  metadata: {
    responseMode: 'quick' | 'thoughtful' | 'contemplate'
    isFollowUp: boolean
    previousTopic?: string
    responseTime?: number  // How long OSQR took
  }
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return

  const metrics = analyzeQuestion(question, metadata)

  // Store raw question metrics
  await appendToHistory(workspace.ownerId, QUESTION_HISTORY_KEY(workspaceId), {
    timestamp: new Date(),
    metrics,
  })

  // Update rolling profile
  await updateCognitiveProfile(workspaceId, 'question', metrics)

  // Check for surprises
  await checkForSurprises(workspaceId, 'question', metrics)
}

/**
 * Track a response interaction (copy, thumbs, flag, etc.)
 */
export async function trackResponseInteraction(
  workspaceId: string,
  action: 'copy' | 'thumbs_up' | 'thumbs_down' | 'flag' | 'alt_opinion' | 'artifact_open'
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return

  await appendToHistory(workspace.ownerId, RAW_METRICS_KEY(workspaceId), {
    timestamp: new Date(),
    type: 'interaction',
    action,
  })

  await updateCognitiveProfile(workspaceId, 'interaction', { action })
}

/**
 * Track session end
 */
export async function trackSessionEnd(
  workspaceId: string,
  sessionMetrics: CognitiveSessionMetrics
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return

  await appendToHistory(workspace.ownerId, RAW_METRICS_KEY(workspaceId), {
    timestamp: new Date(),
    type: 'session',
    metrics: sessionMetrics,
  })

  await updateCognitiveProfile(workspaceId, 'session', sessionMetrics)
  await checkForSurprises(workspaceId, 'session', sessionMetrics)
}

/**
 * Track a decision event (user indicates they'll take action)
 */
export async function trackDecision(
  workspaceId: string,
  decisionMetrics: Partial<DecisionMetrics>
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return

  await appendToHistory(workspace.ownerId, RAW_METRICS_KEY(workspaceId), {
    timestamp: new Date(),
    type: 'decision',
    metrics: decisionMetrics,
  })

  await updateCognitiveProfile(workspaceId, 'decision', decisionMetrics)
  await checkForSurprises(workspaceId, 'decision', decisionMetrics)
}

// ============================================
// Analysis Functions
// ============================================

function analyzeQuestion(question: string, metadata: any): QuestionMetrics {
  const wordCount = question.split(/\s+/).length
  const questionMarks = (question.match(/\?/g) || []).length

  // Complexity scoring
  let complexity: QuestionMetrics['complexity'] = 'simple'
  if (wordCount > 50 || questionMarks > 2) complexity = 'multi-part'
  else if (wordCount > 30 || question.includes('how') && question.includes('why')) complexity = 'complex'
  else if (wordCount > 15) complexity = 'moderate'

  // Context detection
  const hasContext = /because|since|given that|context:|background:/i.test(question)

  // Sentiment detection (basic)
  let sentiment: QuestionMetrics['sentiment'] = 'neutral'
  if (/urgent|asap|immediately|critical|emergency/i.test(question)) sentiment = 'urgent'
  else if (/frustrated|stuck|confused|lost|help/i.test(question)) sentiment = 'negative'
  else if (/excited|great|awesome|love|perfect/i.test(question)) sentiment = 'positive'

  // Topic detection (basic categories)
  const topicPatterns: Record<string, RegExp> = {
    'technical': /code|bug|api|database|deploy|server|function|error/i,
    'business': /revenue|customer|market|strategy|growth|sales|pricing/i,
    'personal': /health|balance|stress|relationship|family|goal/i,
    'creative': /design|brand|content|write|create|idea/i,
    'operational': /process|workflow|team|manage|schedule|plan/i,
  }

  let topicCategory = 'general'
  for (const [topic, pattern] of Object.entries(topicPatterns)) {
    if (pattern.test(question)) {
      topicCategory = topic
      break
    }
  }

  return {
    wordCount,
    questionMarks,
    complexity,
    hasContext,
    isFollowUp: metadata.isFollowUp,
    responseMode: metadata.responseMode,
    topicCategory,
    sentiment,
  }
}

/**
 * Detect language patterns for communication preferences
 */
export function analyzeLanguagePatterns(text: string): Partial<CommunicationPreferences> {
  const formal = /please|kindly|would you|could you|I would appreciate/i.test(text)
  const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(text)
  const technical = /function|variable|api|endpoint|schema|query|async/i.test(text)

  return {
    usesFormalLanguage: formal,
    usesEmojis: hasEmojis,
    technicalDepthTolerance: technical ? 'high' : 'medium',
  }
}

/**
 * Detect relationship signals
 */
export function analyzeRelationshipSignals(text: string): Partial<RelationshipMetrics> {
  // Anthropomorphization
  const youCount = (text.match(/\byou\b/gi) || []).length
  const itCount = (text.match(/\bit\b/gi) || []).length
  const osqrCount = (text.match(/\bosqr\b/gi) || []).length

  let anthropomorphizationLevel: RelationshipMetrics['anthropomorphizationLevel'] = 'low'
  if (youCount > itCount + osqrCount) anthropomorphizationLevel = 'high'
  else if (youCount > 0) anthropomorphizationLevel = 'medium'

  // Trust indicators (sharing sensitive info)
  const trustSignals = /salary|password|private|secret|confidential|between us/i.test(text)

  // Collaboration style
  const directive = /do this|make it|I need you to|just do/i.test(text)
  const collaborative = /what do you think|let's|together|help me/i.test(text)

  let collaborationStyle: RelationshipMetrics['collaborationStyle'] = 'collaborative'
  if (directive && !collaborative) collaborationStyle = 'directive'
  else if (!directive && !collaborative) collaborationStyle = 'delegative'

  return {
    anthropomorphizationLevel,
    trustIndicators: trustSignals ? 1 : 0,
    collaborationStyle,
  }
}

// ============================================
// Profile Management
// ============================================

/**
 * Get or create cognitive profile for a workspace
 */
export async function getCognitiveProfile(workspaceId: string): Promise<CognitiveProfile | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return null

  const stored = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: COGNITIVE_PROFILE_KEY(workspaceId),
    },
  })

  if (!stored) {
    return createDefaultProfile(workspaceId)
  }

  return stored.value as unknown as CognitiveProfile
}

function createDefaultProfile(workspaceId: string): CognitiveProfile {
  return {
    workspaceId,
    lastUpdated: new Date(),
    dataPoints: 0,
    questionMetrics: {
      avgWordCount: 0,
      avgComplexity: 2,
      modePreference: 'quick',
      modeDistribution: { quick: 0, thoughtful: 0, contemplate: 0 },
      followUpRate: 0,
      topTopics: [],
    },
    sessionMetrics: {
      avgDuration: 0,
      avgQuestionsPerSession: 0,
      avgTimeBetweenQuestions: 0,
      topicSwitchRate: 0,
    },
    decisionMetrics: {
      avgDeliberationDepth: 3,
      avgDecisionTime: 24,
      revisitRate: 0,
      decisionStyle: 'moderate',
    },
    communicationPrefs: {
      avgQuestionLength: 0,
      prefersVerboseResponses: false,
      usesFormalLanguage: false,
      usesEmojis: false,
      technicalDepthTolerance: 'medium',
      preferredFormats: ['bullets'],
    },
    temporalPatterns: {
      typicalSessionTimes: [],
      typicalSessionDays: [],
      avgSessionDuration: 0,
      sessionsPerWeek: 0,
    },
    engagementMetrics: {
      copyActionRate: 0,
      thumbsUpRate: 0,
      thumbsDownRate: 0,
      flagRate: 0,
      altOpinionRequestRate: 0,
      artifactInteractionRate: 0,
      knowledgeBaseGrowthRate: 0,
      mscEngagementRate: 0,
    },
    learningMetrics: {
      conceptGraduations: [],
      vocabularyAdoptions: [],
      questionSophisticationTrend: 'stable',
      selfCorrectionFrequency: 0,
      referencesToPastConversations: 0,
    },
    relationshipMetrics: {
      anthropomorphizationLevel: 'medium',
      trustIndicators: 0,
      dependencyIndicators: 0,
      teachingReceptivity: 'medium',
      collaborationStyle: 'collaborative',
    },
    primaryProfile: 'mixed',
    secondaryTraits: [],
  }
}

/**
 * Update cognitive profile with new data
 */
async function updateCognitiveProfile(
  workspaceId: string,
  eventType: 'question' | 'interaction' | 'session' | 'decision',
  data: any
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return

  const profile = await getCognitiveProfile(workspaceId) || createDefaultProfile(workspaceId)

  profile.dataPoints++
  profile.lastUpdated = new Date()

  // Update based on event type
  switch (eventType) {
    case 'question':
      updateQuestionMetrics(profile, data as QuestionMetrics)
      break
    case 'interaction':
      updateEngagementMetrics(profile, data.action)
      break
    case 'session':
      updateSessionMetrics(profile, data as CognitiveSessionMetrics)
      break
    case 'decision':
      updateDecisionMetrics(profile, data as Partial<DecisionMetrics>)
      break
  }

  // Recompute profile classification
  profile.primaryProfile = classifyProfile(profile)

  // Save updated profile
  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: workspace.ownerId,
        key: COGNITIVE_PROFILE_KEY(workspaceId),
      },
    },
    create: {
      userId: workspace.ownerId,
      key: COGNITIVE_PROFILE_KEY(workspaceId),
      value: profile as object,
    },
    update: {
      value: profile as object,
    },
  })
}

function updateQuestionMetrics(profile: CognitiveProfile, metrics: QuestionMetrics): void {
  const n = profile.dataPoints
  const qm = profile.questionMetrics

  // Rolling average for word count
  qm.avgWordCount = ((qm.avgWordCount * (n - 1)) + metrics.wordCount) / n

  // Rolling average for complexity (convert to number)
  const complexityNum = { simple: 1, moderate: 2, complex: 3, 'multi-part': 4 }[metrics.complexity]
  qm.avgComplexity = ((qm.avgComplexity * (n - 1)) + complexityNum) / n

  // Mode distribution
  qm.modeDistribution[metrics.responseMode]++

  // Determine mode preference
  const modes = qm.modeDistribution
  if (modes.quick >= modes.thoughtful && modes.quick >= modes.contemplate) {
    qm.modePreference = 'quick'
  } else if (modes.thoughtful >= modes.contemplate) {
    qm.modePreference = 'thoughtful'
  } else {
    qm.modePreference = 'contemplate'
  }

  // Follow-up rate
  if (metrics.isFollowUp) {
    qm.followUpRate = ((qm.followUpRate * (n - 1)) + 1) / n
  } else {
    qm.followUpRate = (qm.followUpRate * (n - 1)) / n
  }

  // Topic tracking
  if (!qm.topTopics.includes(metrics.topicCategory)) {
    qm.topTopics.push(metrics.topicCategory)
    if (qm.topTopics.length > 5) qm.topTopics.shift()
  }

  // Update communication prefs
  profile.communicationPrefs.avgQuestionLength = qm.avgWordCount
}

function updateEngagementMetrics(profile: CognitiveProfile, action: string): void {
  const n = profile.dataPoints
  const em = profile.engagementMetrics

  switch (action) {
    case 'copy':
      em.copyActionRate = ((em.copyActionRate * (n - 1)) + 1) / n
      break
    case 'thumbs_up':
      em.thumbsUpRate = ((em.thumbsUpRate * (n - 1)) + 1) / n
      break
    case 'thumbs_down':
      em.thumbsDownRate = ((em.thumbsDownRate * (n - 1)) + 1) / n
      break
    case 'flag':
      em.flagRate = ((em.flagRate * (n - 1)) + 1) / n
      break
    case 'alt_opinion':
      em.altOpinionRequestRate = ((em.altOpinionRequestRate * (n - 1)) + 1) / n
      break
    case 'artifact_open':
      em.artifactInteractionRate = ((em.artifactInteractionRate * (n - 1)) + 1) / n
      break
  }
}

function updateSessionMetrics(profile: CognitiveProfile, metrics: CognitiveSessionMetrics): void {
  const n = Math.max(1, Math.floor(profile.dataPoints / 10))  // Sessions are less frequent
  const sm = profile.sessionMetrics

  sm.avgDuration = ((sm.avgDuration * (n - 1)) + metrics.durationMinutes) / n
  sm.avgQuestionsPerSession = ((sm.avgQuestionsPerSession * (n - 1)) + metrics.questionCount) / n
  sm.avgTimeBetweenQuestions = ((sm.avgTimeBetweenQuestions * (n - 1)) + metrics.avgTimeBetweenQuestions) / n
  sm.topicSwitchRate = ((sm.topicSwitchRate * (n - 1)) + metrics.topicSwitches / Math.max(1, metrics.questionCount)) / n

  // Update temporal patterns
  const hour = new Date().getHours()
  let timeOfDay = 'night'
  if (hour >= 5 && hour < 12) timeOfDay = 'morning'
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening'

  if (!profile.temporalPatterns.typicalSessionTimes.includes(timeOfDay)) {
    profile.temporalPatterns.typicalSessionTimes.push(timeOfDay)
  }

  const dayOfWeek = new Date().getDay()
  const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday'
  if (!profile.temporalPatterns.typicalSessionDays.includes(dayType)) {
    profile.temporalPatterns.typicalSessionDays.push(dayType)
  }
}

function updateDecisionMetrics(profile: CognitiveProfile, metrics: Partial<DecisionMetrics>): void {
  const n = Math.max(1, Math.floor(profile.dataPoints / 5))  // Decisions are less frequent
  const dm = profile.decisionMetrics

  if (metrics.deliberationDepth !== undefined) {
    dm.avgDeliberationDepth = ((dm.avgDeliberationDepth * (n - 1)) + metrics.deliberationDepth) / n
  }

  if (metrics.questionToActionTime !== undefined) {
    dm.avgDecisionTime = ((dm.avgDecisionTime * (n - 1)) + metrics.questionToActionTime / 3600000) / n  // Convert to hours
  }

  if (metrics.revisitCount !== undefined) {
    dm.revisitRate = ((dm.revisitRate * (n - 1)) + (metrics.revisitCount > 0 ? 1 : 0)) / n
  }

  // Classify decision style
  if (dm.avgDecisionTime < 12) dm.decisionStyle = 'quick'
  else if (dm.avgDecisionTime > 48) dm.decisionStyle = 'deliberate'
  else dm.decisionStyle = 'moderate'
}

function classifyProfile(profile: CognitiveProfile): CognitiveProfile['primaryProfile'] {
  const topics = profile.questionMetrics.topTopics
  const complexity = profile.questionMetrics.avgComplexity
  const decisionStyle = profile.decisionMetrics.decisionStyle

  // Analytical: high complexity, technical topics, deliberate decisions
  if (complexity > 2.5 && topics.includes('technical') && decisionStyle !== 'quick') {
    return 'analytical'
  }

  // Strategic: business topics, deliberate decisions, longer sessions
  if (topics.includes('business') && decisionStyle === 'deliberate') {
    return 'strategic'
  }

  // Creative: creative topics, moderate complexity
  if (topics.includes('creative')) {
    return 'creative'
  }

  // Operational: operational topics, quick decisions, high follow-up rate
  if (topics.includes('operational') && decisionStyle === 'quick') {
    return 'operational'
  }

  return 'mixed'
}

// ============================================
// Surprise Delta Detection
// ============================================

async function checkForSurprises(
  workspaceId: string,
  eventType: string,
  data: any
): Promise<SurpriseEvent[]> {
  const profile = await getCognitiveProfile(workspaceId)
  if (!profile || profile.dataPoints < 10) return []  // Need baseline first

  const surprises: SurpriseEvent[] = []
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return []

  // Check for mode shift surprises
  if (eventType === 'question' && data.responseMode) {
    const expected = profile.questionMetrics.modePreference
    const actual = data.responseMode

    if (expected !== actual) {
      // Calculate how unusual this is
      const modeRates = profile.questionMetrics.modeDistribution
      const total = modeRates.quick + modeRates.thoughtful + modeRates.contemplate
      const actualRate = modeRates[actual as keyof typeof modeRates] / total

      if (actualRate < 0.15) {  // Less than 15% of the time
        surprises.push({
          id: `surprise_${Date.now()}`,
          workspaceId,
          timestamp: new Date(),
          dimension: 'response_mode',
          expected,
          actual,
          deviation: actualRate < 0.05 ? 3 : actualRate < 0.1 ? 2 : 1,
          significance: actualRate < 0.05 ? 'high' : 'medium',
          context: `User shifted from typical ${expected} mode to ${actual}`,
          resolved: false,
        })
      }
    }
  }

  // Check for question complexity surprises
  if (eventType === 'question' && data.wordCount) {
    const avgWordCount = profile.questionMetrics.avgWordCount
    const deviation = Math.abs(data.wordCount - avgWordCount) / Math.max(avgWordCount, 10)

    if (deviation > 1.5) {  // 150% deviation from average
      surprises.push({
        id: `surprise_${Date.now()}_complexity`,
        workspaceId,
        timestamp: new Date(),
        dimension: 'question_complexity',
        expected: avgWordCount,
        actual: data.wordCount,
        deviation: deviation,
        significance: deviation > 2 ? 'high' : 'medium',
        context: data.wordCount > avgWordCount
          ? 'User asking more detailed questions than usual'
          : 'User asking unusually brief questions',
        resolved: false,
      })
    }
  }

  // Check for session duration surprises
  if (eventType === 'session' && data.durationMinutes) {
    const avgDuration = profile.sessionMetrics.avgDuration
    if (avgDuration > 0) {
      const deviation = Math.abs(data.durationMinutes - avgDuration) / avgDuration

      if (deviation > 1) {  // 100% deviation
        surprises.push({
          id: `surprise_${Date.now()}_duration`,
          workspaceId,
          timestamp: new Date(),
          dimension: 'session_duration',
          expected: avgDuration,
          actual: data.durationMinutes,
          deviation: deviation,
          significance: deviation > 2 ? 'high' : 'medium',
          context: data.durationMinutes > avgDuration
            ? 'User engaged in unusually long session'
            : 'User had unusually short session',
          resolved: false,
        })
      }
    }
  }

  // Check for topic surprises
  if (eventType === 'question' && data.topicCategory) {
    const topTopics = profile.questionMetrics.topTopics
    if (topTopics.length >= 3 && !topTopics.includes(data.topicCategory)) {
      surprises.push({
        id: `surprise_${Date.now()}_topic`,
        workspaceId,
        timestamp: new Date(),
        dimension: 'topic_category',
        expected: topTopics.join(', '),
        actual: data.topicCategory,
        deviation: 2,
        significance: 'medium',
        context: `User exploring new topic area: ${data.topicCategory}`,
        resolved: false,
      })
    }
  }

  // Store surprises and queue insights
  if (surprises.length > 0) {
    await storeSurprises(workspace.ownerId, workspaceId, surprises)

    // Queue insights for high/medium significance surprises
    for (const surprise of surprises) {
      if (surprise.significance === 'high' || surprise.significance === 'medium') {
        queueInsightFromSurprise(workspaceId, surprise)
      }
    }
  }

  return surprises
}

/**
 * Convert a surprise event into a queued insight
 * Maps to new categories: contradiction, clarify, next_step, recall
 */
function queueInsightFromSurprise(workspaceId: string, surprise: SurpriseEvent): void {
  // Map dimension to new insight categories
  const categoryMap: Record<string, InsightCategory> = {
    'response_mode': 'contradiction',      // User said they'd do X, now doing Y
    'question_complexity': 'clarify',      // User seems to need help
    'session_duration': 'next_step',       // Natural momentum opportunity
    'topic_category': 'recall',            // Relevant past context to surface
  }

  const category = categoryMap[surprise.dimension] || 'clarify'

  // Generate human-friendly title and message
  const { title, message, expandedContent } = generateInsightContent(surprise)

  queueInsight(workspaceId, {
    type: category,
    title,
    message,
    priority: surprise.significance === 'high' ? 8 : surprise.significance === 'medium' ? 5 : 3,
    trigger: 'idle',
    minIdleSeconds: 30,
    contextTags: [surprise.dimension],
    sourceData: {
      dimension: surprise.dimension,
      expected: surprise.expected,
      actual: surprise.actual,
      deviation: surprise.deviation,
    },
    expandedContent,
  })
}

/**
 * Generate human-friendly insight content from a surprise
 */
function generateInsightContent(surprise: SurpriseEvent): {
  title: string
  message: string
  expandedContent: string
} {
  switch (surprise.dimension) {
    case 'response_mode':
      return {
        title: 'Shifted thinking mode',
        message: `You switched from ${surprise.expected} to ${surprise.actual} mode. Taking a different approach?`,
        expandedContent: `I noticed you usually prefer ${surprise.expected} mode (quick, direct answers vs deeper exploration), but this time you chose ${surprise.actual}. This might mean you're facing something that needs more thought, or perhaps you're in a different headspace today. Would you like to talk about what's on your mind?`,
      }

    case 'question_complexity':
      const isMoreComplex = (surprise.actual as number) > (surprise.expected as number)
      return {
        title: isMoreComplex ? 'Diving deeper' : 'Going direct',
        message: isMoreComplex
          ? 'Your questions are more detailed than usual. Tackling something complex?'
          : 'Keeping it brief today. Focused on quick wins?',
        expandedContent: isMoreComplex
          ? `Your questions have been more detailed and nuanced than usual. This often happens when you're working through something important or complex. I'm here to help you think through it thoroughly.`
          : `You're asking shorter, more direct questions than usual. This could mean you're in execution mode, or you might be time-constrained. Let me know if you want me to be extra concise today.`,
      }

    case 'session_duration':
      const isLonger = (surprise.actual as number) > (surprise.expected as number)
      return {
        title: isLonger ? 'Deep work session' : 'Quick check-in',
        message: isLonger
          ? 'That was a longer session than usual. Making progress on something big?'
          : 'Short session today. Hope it was productive!',
        expandedContent: isLonger
          ? `This session was significantly longer than your typical sessions. Deep focus like this often leads to breakthroughs. Would you like to capture any key insights or decisions from this session?`
          : `Shorter session than usual. Sometimes quick check-ins are all you need. If you have something on your mind that you'd like to explore more deeply, I'm here.`,
      }

    case 'topic_category':
      return {
        title: 'Exploring new territory',
        message: `I noticed you're thinking about ${surprise.actual}. That's a new area for us!`,
        expandedContent: `You've been branching into ${surprise.actual} topics, which is different from your usual focus on ${surprise.expected}. This could be a natural evolution of your thinking, or a new challenge you're facing. Would you like me to help you connect this to your existing goals?`,
      }

    default:
      return {
        title: 'Pattern shift noticed',
        message: surprise.context || 'Something about your interaction pattern changed.',
        expandedContent: `I detected a shift in your ${surprise.dimension} pattern. This might just be natural variation, or it could signal something worth exploring. How are things going?`,
      }
  }
}

async function storeSurprises(userId: string, workspaceId: string, newSurprises: SurpriseEvent[]): Promise<void> {
  const key = SURPRISE_LOG_KEY(workspaceId)

  const existing = await prisma.userSetting.findFirst({
    where: { userId, key },
  })

  const allSurprises: SurpriseEvent[] = existing
    ? [...(existing.value as unknown as SurpriseEvent[]), ...newSurprises]
    : newSurprises

  // Keep last 100 surprises
  const trimmed = allSurprises.slice(-100)

  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value: trimmed as object },
    update: { value: trimmed as object },
  })
}

/**
 * Get recent surprises for a workspace
 */
export async function getRecentSurprises(
  workspaceId: string,
  limit: number = 20
): Promise<SurpriseEvent[]> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return []

  const stored = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: SURPRISE_LOG_KEY(workspaceId),
    },
  })

  if (!stored) return []

  const surprises = stored.value as unknown as SurpriseEvent[]
  return surprises.slice(-limit).reverse()
}

/**
 * Get surprise analysis for OSQR context
 */
export async function getSurpriseAnalysis(workspaceId: string): Promise<SurpriseAnalysis> {
  const surprises = await getRecentSurprises(workspaceId, 50)

  // Group by dimension
  const byDimension: Record<string, SurpriseEvent[]> = {}
  for (const s of surprises) {
    if (!byDimension[s.dimension]) byDimension[s.dimension] = []
    byDimension[s.dimension].push(s)
  }

  const patterns = Object.entries(byDimension).map(([dimension, events]) => ({
    dimension,
    frequency: events.length,
    avgDeviation: events.reduce((sum, e) => sum + e.deviation, 0) / events.length,
    trend: 'stable' as const,  // TODO: Calculate actual trend
  }))

  // Generate insights
  const insights: string[] = []

  const recentHighSignificance = surprises.filter(
    s => s.significance === 'high' &&
    new Date(s.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  )

  if (recentHighSignificance.length > 0) {
    insights.push(`${recentHighSignificance.length} significant pattern breaks in the last week`)
  }

  const modeShifts = surprises.filter(s => s.dimension === 'response_mode')
  if (modeShifts.length > 3) {
    insights.push('User has been experimenting with different response modes')
  }

  return {
    recentSurprises: surprises.slice(0, 10),
    patterns,
    insights,
  }
}

// ============================================
// Helper Functions
// ============================================

async function appendToHistory(userId: string, key: string, entry: any): Promise<void> {
  const existing = await prisma.userSetting.findFirst({
    where: { userId, key },
  })

  const history: any[] = existing ? (existing.value as unknown as any[]) : []
  history.push(entry)

  // Keep last 500 entries
  const trimmed = history.slice(-500)

  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value: trimmed as object },
    update: { value: trimmed as object },
  })
}

/**
 * Format cognitive profile for OSQR context injection
 */
export function formatProfileForContext(profile: CognitiveProfile): string {
  if (profile.dataPoints < 5) {
    return ''  // Not enough data yet
  }

  const parts: string[] = ['## User Cognitive Profile']

  // Communication style
  parts.push(`\n### Communication Style`)
  parts.push(`- Typical question length: ${Math.round(profile.questionMetrics.avgWordCount)} words`)
  parts.push(`- Preferred mode: ${profile.questionMetrics.modePreference}`)
  parts.push(`- Decision style: ${profile.decisionMetrics.decisionStyle}`)
  parts.push(`- Primary profile: ${profile.primaryProfile}`)

  // Temporal patterns
  if (profile.temporalPatterns.typicalSessionTimes.length > 0) {
    parts.push(`- Active times: ${profile.temporalPatterns.typicalSessionTimes.join(', ')}`)
  }

  // Top topics
  if (profile.questionMetrics.topTopics.length > 0) {
    parts.push(`- Focus areas: ${profile.questionMetrics.topTopics.join(', ')}`)
  }

  return parts.join('\n')
}
