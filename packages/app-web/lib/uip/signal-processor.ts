/**
 * UIP Signal Processor
 * Extracts signals from messages and interactions
 * @see docs/architecture/UIP_SPEC.md
 */

import {
  UIPSignalCategory,
  UIPDomain,
} from '@prisma/client'
import {
  UIPSignalData,
  MessageStyleSignal,
  FeedbackSignal,
  PreferenceStatementSignal,
  QuestionSophisticationSignal,
  GoalReferenceSignal,
  DecisionMentionSignal,
  ModeSelectionSignal,
  RetryPatternSignal,
} from './types'

// ============================================
// Message Analysis
// ============================================

/**
 * Analyze message style and structure
 */
export function analyzeMessageStyle(
  message: string,
  sessionId?: string,
  messageId?: string
): MessageStyleSignal {
  const words = message.split(/\s+/).filter(w => w.length > 0)
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const wordCount = words.length
  const sentenceCount = Math.max(sentences.length, 1)

  // Check for structure
  const hasStructure = /^[\s]*[-*•]\s|^\s*\d+[.)]\s/m.test(message)

  // Check for technical terms (simple heuristic)
  const technicalPatterns = [
    /\b(api|sdk|framework|algorithm|database|server|client|async|await|function|class|interface)\b/i,
    /\b(machine learning|neural|tensor|gradient|optimization)\b/i,
    /\b(kubernetes|docker|aws|azure|gcp|terraform)\b/i,
  ]
  const hasTechnicalTerms = technicalPatterns.some(p => p.test(message))

  // Count questions
  const questionCount = (message.match(/\?/g) || []).length

  // Detect tone
  let tone: 'formal' | 'casual' | 'technical' | 'mixed' = 'mixed'
  if (hasTechnicalTerms && wordCount > 20) {
    tone = 'technical'
  } else if (/\b(hi|hey|thanks|please|could you|would you)\b/i.test(message)) {
    tone = 'casual'
  } else if (/\b(pursuant|regarding|hereby|accordingly)\b/i.test(message)) {
    tone = 'formal'
  }

  return {
    signalType: 'message_style',
    category: 'MESSAGE_STYLE',
    strength: 0.5,
    sessionId,
    messageId,
    timestamp: new Date(),
    data: {
      wordCount,
      sentenceCount,
      avgWordsPerSentence: wordCount / sentenceCount,
      hasStructure,
      hasTechnicalTerms,
      questionCount,
      tone,
    },
  }
}

/**
 * Detect feedback signals in messages
 */
export function detectFeedbackSignals(
  message: string,
  sessionId?: string,
  messageId?: string
): FeedbackSignal | null {
  const lowerMessage = message.toLowerCase()

  // Explicit correction patterns
  const correctionPatterns = [
    /\bthat's (not|wrong|incorrect)\b/i,
    /\bactually[,]?\s+(i|it|that)/i,
    /\bno[,]?\s+(i meant|what i meant|i was asking)/i,
    /\byou misunderstood\b/i,
    /\bthat's not what i (meant|asked|wanted)\b/i,
  ]

  // Praise patterns
  const praisePatterns = [
    /\b(perfect|exactly|great|awesome|thanks|thank you|helpful)\b/i,
    /\bthat's (right|correct|what i needed)\b/i,
    /\bthis (is|looks) (great|good|perfect)\b/i,
  ]

  // Frustration patterns
  const frustrationPatterns = [
    /\b(still|again|already told you|i said)\b/i,
    /\bwhy (can't you|don't you|won't you)\b/i,
    /\bthis (isn't|doesn't|won't) (work|help)\b/i,
    /\b(frustrated|annoyed|confused)\b/i,
  ]

  // Check patterns
  if (correctionPatterns.some(p => p.test(lowerMessage))) {
    return {
      signalType: 'feedback_signal',
      category: 'FEEDBACK_SIGNALS',
      strength: 0.8,
      sessionId,
      messageId,
      timestamp: new Date(),
      data: {
        feedbackType: 'correction',
        explicit: true,
      },
    }
  }

  if (praisePatterns.some(p => p.test(lowerMessage))) {
    return {
      signalType: 'feedback_signal',
      category: 'FEEDBACK_SIGNALS',
      strength: 0.7,
      sessionId,
      messageId,
      timestamp: new Date(),
      data: {
        feedbackType: 'praise',
        explicit: true,
      },
    }
  }

  if (frustrationPatterns.some(p => p.test(lowerMessage))) {
    return {
      signalType: 'feedback_signal',
      category: 'FEEDBACK_SIGNALS',
      strength: 0.6,
      sessionId,
      messageId,
      timestamp: new Date(),
      data: {
        feedbackType: 'frustration',
        explicit: false,
      },
    }
  }

  return null
}

/**
 * Detect preference statements
 */
export function detectPreferenceStatements(
  message: string,
  sessionId?: string,
  messageId?: string
): PreferenceStatementSignal | null {
  const lowerMessage = message.toLowerCase()

  // Explicit preference patterns with domain mapping
  const preferencePatterns: Array<{
    pattern: RegExp
    domain: UIPDomain
    extract: (match: RegExpMatchArray) => string
  }> = [
    // Communication preferences
    {
      pattern: /i (prefer|like|want) (shorter|brief|concise|quick) (responses?|answers?)/i,
      domain: 'COMMUNICATION_PREFS',
      extract: () => 'verbosity:concise',
    },
    {
      pattern: /i (prefer|like|want) (detailed|longer|thorough|comprehensive) (responses?|answers?)/i,
      domain: 'COMMUNICATION_PREFS',
      extract: () => 'verbosity:detailed',
    },
    {
      pattern: /just (give me|tell me) the (answer|solution|result)/i,
      domain: 'COMMUNICATION_PREFS',
      extract: () => 'verbosity:concise',
    },
    {
      pattern: /i (prefer|like|want) (bullet|bulleted) (points|lists)/i,
      domain: 'COMMUNICATION_PREFS',
      extract: () => 'format:bullets',
    },
    // Expertise
    {
      pattern: /i('m| am) (a|an) (expert|experienced|senior) (in|at|with) (.+)/i,
      domain: 'EXPERTISE_CALIBRATION',
      extract: (m) => `expert:${m[5]?.trim()}`,
    },
    {
      pattern: /i('m| am) (new to|learning|a beginner in|just starting with) (.+)/i,
      domain: 'EXPERTISE_CALIBRATION',
      extract: (m) => `learning:${m[3]?.trim()}`,
    },
    // Identity
    {
      pattern: /my name is (.+)/i,
      domain: 'IDENTITY_CONTEXT',
      extract: (m) => `name:${m[1]?.trim()}`,
    },
    {
      pattern: /i('m| am) (a|an) (.+?) (at|for|in|working)/i,
      domain: 'IDENTITY_CONTEXT',
      extract: (m) => `role:${m[3]?.trim()}`,
    },
    {
      pattern: /call me (.+)/i,
      domain: 'IDENTITY_CONTEXT',
      extract: (m) => `preferredName:${m[1]?.trim()}`,
    },
  ]

  for (const { pattern, domain, extract } of preferencePatterns) {
    const match = message.match(pattern)
    if (match) {
      return {
        signalType: 'preference_statement',
        category: 'PREFERENCE_STATEMENTS',
        strength: 0.9, // High strength for explicit preferences
        sessionId,
        messageId,
        timestamp: new Date(),
        data: {
          domain,
          preference: extract(match),
          explicit: true,
        },
      }
    }
  }

  return null
}

/**
 * Analyze question sophistication
 */
export function analyzeQuestionSophistication(
  message: string,
  sessionId?: string,
  messageId?: string
): QuestionSophisticationSignal | null {
  // Only analyze if it's a question
  if (!message.includes('?')) return null

  const words = message.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length

  // Complexity indicators
  let complexity = 0

  // Length contributes to complexity
  if (wordCount > 30) complexity += 0.2
  if (wordCount > 50) complexity += 0.2

  // Multi-part questions
  const questionMarks = (message.match(/\?/g) || []).length
  if (questionMarks > 1) complexity += 0.2

  // Technical terms
  const technicalTerms = [
    /\b(architecture|implementation|optimization|algorithm|performance|scalability)\b/i,
    /\b(trade-?offs?|considerations?|implications?|constraints?)\b/i,
    /\b(best practices?|patterns?|anti-?patterns?)\b/i,
  ]
  if (technicalTerms.some(p => p.test(message))) complexity += 0.3

  // Comparative/evaluative questions
  if (/\b(compare|versus|vs\.?|better|worse|pros|cons|advantages|disadvantages)\b/i.test(message)) {
    complexity += 0.2
  }

  // "Why" questions tend to be more complex
  if (/\bwhy\b/i.test(message)) complexity += 0.1

  // Cap at 1.0
  complexity = Math.min(complexity, 1.0)

  // Detect domain from keywords
  let domain: string | undefined
  const domainPatterns: Record<string, RegExp> = {
    programming: /\b(code|function|class|api|database|frontend|backend|react|node|python)\b/i,
    business: /\b(revenue|market|customer|strategy|growth|pricing|sales)\b/i,
    writing: /\b(write|writing|essay|article|blog|content|copy)\b/i,
  }
  for (const [d, pattern] of Object.entries(domainPatterns)) {
    if (pattern.test(message)) {
      domain = d
      break
    }
  }

  return {
    signalType: 'question_sophistication',
    category: 'QUESTION_SOPHISTICATION',
    strength: 0.5 + (complexity * 0.3), // Higher complexity = stronger signal
    sessionId,
    messageId,
    timestamp: new Date(),
    data: {
      complexity,
      domain,
      requiresExpertise: complexity > 0.6,
      isFollowUp: /\b(also|another|follow.?up|related)\b/i.test(message),
    },
  }
}

/**
 * Detect goal references
 */
export function detectGoalReferences(
  message: string,
  sessionId?: string,
  messageId?: string
): GoalReferenceSignal | null {
  // Goal indicator patterns
  const goalPatterns = [
    /i('m| am) (trying|working|aiming) to (.+)/i,
    /my goal is to (.+)/i,
    /i want to (.+)/i,
    /i need to (.+)/i,
    /i('m| am) (building|creating|developing|launching) (.+)/i,
    /i('m| am) (planning|preparing) (to|for) (.+)/i,
  ]

  // Timeframe patterns
  const shortTermPatterns = /\b(today|this week|soon|right now|asap)\b/i
  const longTermPatterns = /\b(eventually|someday|long.?term|next year|future)\b/i
  const mediumTermPatterns = /\b(this month|next month|this quarter|next few weeks)\b/i

  // Progress patterns
  const progressPatterns = [
    /i (made|achieved|completed|finished|done with)/i,
    /i (finally|just) (did|finished|completed)/i,
    /progress on/i,
  ]

  for (const pattern of goalPatterns) {
    const match = message.match(pattern)
    if (match) {
      // Determine timeframe
      let timeframe: 'short' | 'medium' | 'long' = 'medium'
      if (shortTermPatterns.test(message)) timeframe = 'short'
      else if (longTermPatterns.test(message)) timeframe = 'long'
      else if (mediumTermPatterns.test(message)) timeframe = 'medium'

      // Check if it's progress vs new goal
      const isProgress = progressPatterns.some(p => p.test(message))

      // Extract goal text
      const goalText = match[match.length - 1]?.trim() || message

      return {
        signalType: 'goal_reference',
        category: 'GOAL_REFERENCES',
        strength: 0.7,
        sessionId,
        messageId,
        timestamp: new Date(),
        data: {
          goalText: goalText.slice(0, 200), // Truncate long goals
          timeframe,
          isNew: !isProgress,
          isProgress,
        },
      }
    }
  }

  return null
}

/**
 * Detect decision mentions
 */
export function detectDecisionMentions(
  message: string,
  sessionId?: string,
  messageId?: string
): DecisionMentionSignal | null {
  // Decision indicator patterns
  const decidingPatterns = [
    /i('m| am) (deciding|considering|thinking about|debating) (whether to|if|between)/i,
    /should i (.+)/i,
    /i can't decide (whether|if|between)/i,
    /help me (decide|choose|pick)/i,
    /what (should i|would you) (do|choose|recommend)/i,
  ]

  const decidedPatterns = [
    /i('ve| have) decided to (.+)/i,
    /i (decided|chose|picked|went with) (.+)/i,
    /i('m| am) going (to|with) (.+)/i,
    /my decision is (.+)/i,
  ]

  // Check if decision was made
  for (const pattern of decidedPatterns) {
    const match = message.match(pattern)
    if (match) {
      const decisionText = match[match.length - 1]?.trim() || message
      return {
        signalType: 'decision_mention',
        category: 'DECISION_MENTIONS',
        strength: 0.8,
        sessionId,
        messageId,
        timestamp: new Date(),
        data: {
          decisionText: decisionText.slice(0, 200),
          isMade: true,
          isRepeated: false, // Would need context to determine
        },
      }
    }
  }

  // Check if still deciding
  for (const pattern of decidingPatterns) {
    const match = message.match(pattern)
    if (match) {
      const decisionText = match[match.length - 1]?.trim() || message
      return {
        signalType: 'decision_mention',
        category: 'DECISION_MENTIONS',
        strength: 0.7,
        sessionId,
        messageId,
        timestamp: new Date(),
        data: {
          decisionText: decisionText.slice(0, 200),
          isMade: false,
          isRepeated: false,
        },
      }
    }
  }

  return null
}

// ============================================
// Behavioral Signals
// ============================================

/**
 * Create mode selection signal
 */
export function createModeSelectionSignal(
  mode: 'quick' | 'thoughtful' | 'contemplate' | 'council',
  sessionId?: string,
  context?: string
): ModeSelectionSignal {
  return {
    signalType: 'mode_selection',
    category: 'MODE_SELECTION',
    strength: 0.6,
    sessionId,
    timestamp: new Date(),
    data: {
      mode,
      context,
    },
  }
}

/**
 * Create retry pattern signal
 */
export function createRetrySignal(
  action: 'retry' | 'abort' | 'refine' | 'accept',
  attemptNumber: number,
  sessionId?: string,
  context?: string
): RetryPatternSignal {
  return {
    signalType: 'retry_pattern',
    category: 'RETRY_PATTERN',
    strength: action === 'accept' ? 0.5 : 0.7,
    sessionId,
    timestamp: new Date(),
    data: {
      action,
      attemptNumber,
      context,
    },
  }
}

// ============================================
// Main Signal Extraction
// ============================================

/**
 * Extract all signals from a user message
 */
export function extractSignalsFromMessage(
  message: string,
  sessionId?: string,
  messageId?: string
): UIPSignalData[] {
  const signals: UIPSignalData[] = []

  // Always extract message style
  signals.push(analyzeMessageStyle(message, sessionId, messageId))

  // Check for feedback
  const feedback = detectFeedbackSignals(message, sessionId, messageId)
  if (feedback) signals.push(feedback)

  // Check for preference statements
  const preference = detectPreferenceStatements(message, sessionId, messageId)
  if (preference) signals.push(preference)

  // Check for question sophistication
  const sophistication = analyzeQuestionSophistication(message, sessionId, messageId)
  if (sophistication) signals.push(sophistication)

  // Check for goal references
  const goal = detectGoalReferences(message, sessionId, messageId)
  if (goal) signals.push(goal)

  // Check for decision mentions
  const decision = detectDecisionMentions(message, sessionId, messageId)
  if (decision) signals.push(decision)

  return signals
}
