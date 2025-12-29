/**
 * Secretary Checklist - Detection Layer for Insights System
 *
 * Detects commitments, deadlines, follow-ups, and dependencies from conversations.
 * Runs asynchronously after each OSQR response, pushing insights to the queue.
 *
 * MVP: Core 4 categories (Commitments, Deadlines, Follow-ups, Dependencies)
 * Future: Remaining 8 categories (Recurring patterns, Contradictions, etc.)
 */

import { queueInsight, calculatePriority } from './insight-queue'

// ============================================
// Types
// ============================================

export type SecretaryCategory =
  | 'commitment'
  | 'deadline'
  | 'follow_up'
  | 'dependency'
  // New categories (Phase 2)
  | 'contradiction'
  | 'open_question'
  | 'people_waiting'
  | 'recurring_pattern'
  | 'stale_decision'
  | 'context_decay'
  | 'unfinished_work'
  | 'pattern_break'

export interface SecretaryInsight {
  id: string
  category: SecretaryCategory
  content: string           // The detected item
  context: string           // Surrounding context from conversation
  sourceThreadId: string    // Where it was detected
  sourceMessageId?: string
  detectedAt: Date
  surfaceAfter: Date        // When to show user
  priority: number          // 1-10
  confidence: number        // 0-1
  resolved: boolean
  resolvedAt?: Date
}

export interface DetectionResult {
  found: boolean
  items: SecretaryInsight[]
}

// ============================================
// Detection Patterns
// ============================================

// Commitment patterns - things user said they'd do
const COMMITMENT_PATTERNS = [
  // "I'll..." patterns
  /\bi['']ll\s+(?:definitely\s+)?(?:be\s+)?(\w[\w\s]{5,60}?)(?:[.,!?]|$)/gi,
  // "I need to..." patterns
  /\bi\s+need\s+to\s+(\w[\w\s]{5,60}?)(?:[.,!?]|$)/gi,
  // "I should..." patterns
  /\bi\s+should\s+(?:probably\s+)?(\w[\w\s]{5,60}?)(?:[.,!?]|$)/gi,
  // "I'm going to..." patterns
  /\bi['']m\s+going\s+to\s+(\w[\w\s]{5,60}?)(?:[.,!?]|$)/gi,
  // "Let me..." patterns
  /\blet\s+me\s+(\w[\w\s]{5,60}?)(?:[.,!?]|$)/gi,
  // "I have to..." patterns
  /\bi\s+have\s+to\s+(\w[\w\s]{5,60}?)(?:[.,!?]|$)/gi,
  // "I must..." patterns
  /\bi\s+must\s+(\w[\w\s]{5,60}?)(?:[.,!?]|$)/gi,
  // "I promised..." patterns
  /\bi\s+promised\s+(?:to\s+)?(\w[\w\s]{5,60}?)(?:[.,!?]|$)/gi,
  // "I committed to..." patterns
  /\bi\s+committed\s+to\s+(\w[\w\s]{5,60}?)(?:[.,!?]|$)/gi,
  // "I'll get back to..." patterns
  /\bi['']ll\s+get\s+back\s+to\s+(\w+)/gi,
  // "I'll send..." patterns
  /\bi['']ll\s+send\s+(?:\w+\s+)?(\w[\w\s]{5,60}?)(?:[.,!?]|$)/gi,
]

// Deadline patterns - dates and timeframes
const DEADLINE_PATTERNS = {
  // Explicit dates
  explicitDates: [
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,  // MM/DD or MM/DD/YYYY
    /\b\d{4}-\d{2}-\d{2}\b/g,                 // YYYY-MM-DD
  ],
  // Relative deadlines
  relative: [
    /\bby\s+(friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/gi,
    /\bby\s+(tomorrow|next\s+week|end\s+of\s+(?:the\s+)?(?:week|month|quarter|year))\b/gi,
    /\bin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/gi,
    /\bwithin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/gi,
    /\b(next|this)\s+(week|month|quarter|friday|monday|tuesday|wednesday|thursday)\b/gi,
    /\b(q[1-4])\s*(?:\d{4})?/gi,              // Q1, Q2, etc.
  ],
  // Event-based
  events: [
    /\bbefore\s+(?:the\s+)?(\w+\s+meeting|\w+\s+launch|\w+\s+deadline)\b/gi,
    /\bafter\s+(?:the\s+)?(\w+\s+meeting|\w+\s+launch|\w+\s+review)\b/gi,
  ],
}

// Follow-up patterns - unresolved conversations
const FOLLOW_UP_PATTERNS = [
  // Questions without clear resolution
  /\bshould\s+(?:we|i)\s+(\w[\w\s]{5,60}?)\?/gi,
  /\bwhat\s+if\s+(?:we|i)\s+(\w[\w\s]{5,60}?)\?/gi,
  /\bhow\s+(?:do|should)\s+(?:we|i)\s+(\w[\w\s]{5,60}?)\?/gi,
  // Deferred decisions
  /\blet['']s\s+think\s+about\s+(?:that|this)\b/gi,
  /\bwe['']ll\s+figure\s+(?:that|this)\s+out\b/gi,
  /\bneed\s+to\s+decide\s+(?:on|about)\s+(\w[\w\s]{5,40}?)\b/gi,
  /\bstill\s+need\s+to\s+(?:figure\s+out|decide|determine)\s+(\w[\w\s]{5,40}?)\b/gi,
]

// Dependency patterns - things waiting on other things
const DEPENDENCY_PATTERNS = [
  // "Once X is done..."
  /\bonce\s+(?:the\s+)?(\w[\w\s]{5,40}?)\s+is\s+(?:done|complete|finished|ready)\b/gi,
  // "After we..."
  /\bafter\s+(?:we|i)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "When X happens..."
  /\bwhen\s+(?:the\s+)?(\w[\w\s]{5,40}?)\s+(?:is|happens|arrives)\b/gi,
  // "Blocked by..."
  /\bblocked\s+(?:by|on)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Waiting on..."
  /\bwaiting\s+(?:on|for)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Depends on..."
  /\bdepends\s+on\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Can't do X until Y" - supports straight apostrophes, curly apostrophes, and no apostrophe
  /\bcan(?:'|'|)t\s+(?:do|start|begin)\s+(?:the\s+)?(?:\w+\s+)?until\s+(\w[\w\s]{5,40}?)\b/gi,
  // "First we need to..."
  /\bfirst\s+(?:we\s+)?need\s+to\s+(\w[\w\s]{5,40}?)\b/gi,
]

// ============================================
// Phase 2: Additional Detection Patterns
// ============================================

// Contradiction patterns - conflicting statements
const CONTRADICTION_PATTERNS = [
  // "Actually, I meant..."
  /\bactually,?\s+(?:i|we)\s+(?:meant|mean)\s+(\w[\w\s]{5,60}?)\b/gi,
  // "Wait, I thought..."
  /\bwait,?\s+(?:i|we)\s+thought\s+(\w[\w\s]{5,60}?)\b/gi,
  // "That's not what I said..."
  /\bthat['']s\s+not\s+what\s+(?:i|we)\s+(?:said|meant)\b/gi,
  // "I changed my mind..."
  /\bi\s+changed\s+my\s+mind\s+(?:about|on)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Let's go with X instead" (reversal)
  /\blet['']s\s+(?:go\s+with|do|use)\s+(\w[\w\s]{5,40}?)\s+instead\b/gi,
  // "Scratch that..."
  /\bscratch\s+that\b/gi,
  // "Never mind..."
  /\bnever\s*mind\s+(?:about\s+)?(\w[\w\s]{5,40}?)\b/gi,
  // Direct contradiction markers
  /\b(?:but|however)\s+(?:earlier|before|previously)\s+(?:i|we|you)\s+said\s+(\w[\w\s]{5,60}?)\b/gi,
]

// Open question patterns - questions asked but not answered
const OPEN_QUESTION_PATTERNS = [
  // Explicit questions
  /\bshould\s+(?:we|i)\s+(\w[\w\s]{5,60}?)\?/gi,
  /\bwhat\s+(?:should|would|could)\s+(?:we|i)\s+(\w[\w\s]{5,60}?)\?/gi,
  /\bhow\s+(?:should|would|could)\s+(?:we|i)\s+(\w[\w\s]{5,60}?)\?/gi,
  /\bwhich\s+(?:option|approach|way|one)\s+(\w[\w\s]{5,40}?)\?/gi,
  // Deferred decisions
  /\blet['']s\s+(?:think\s+about|decide\s+on)\s+(?:that|this)\s+later\b/gi,
  /\bwe['']ll\s+(?:figure|work)\s+(?:that|this|it)\s+out\s+later\b/gi,
  /\bneed\s+to\s+(?:decide|figure\s+out|determine)\s+(\w[\w\s]{5,40}?)\b/gi,
  // Research requests
  /\bi\s+(?:need|should|want)\s+to\s+(?:research|look\s+into|investigate)\s+(\w[\w\s]{5,40}?)\b/gi,
  /\blet['']s\s+(?:research|look\s+into|investigate)\s+(\w[\w\s]{5,40}?)\b/gi,
]

// People waiting patterns - others waiting for responses/deliverables
const PEOPLE_WAITING_PATTERNS = [
  // "I'll get back to [person]"
  /\bi['']ll\s+get\s+back\s+to\s+(\w+)/gi,
  // "I need to respond to [person]"
  /\bi\s+need\s+to\s+(?:respond|reply|get\s+back)\s+to\s+(\w+)/gi,
  // "I promised [person]..."
  /\bi\s+promised\s+(\w+)\s+(?:i['']d|to|that)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "[Person] is waiting..."
  /\b(\w+)\s+is\s+waiting\s+(?:for|on)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "I owe [person]..."
  /\bi\s+owe\s+(\w+)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "I'll send [person]..."
  /\bi['']ll\s+send\s+(\w+)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "I told [person] I would..."
  /\bi\s+told\s+(\w+)\s+(?:i['']d|i\s+would)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "I should connect [person] with..."
  /\bi\s+should\s+connect\s+(\w+)\s+with\s+(\w+)/gi,
]

// Recurring pattern markers - signals of repetition
const RECURRING_PATTERN_PATTERNS = [
  // "Every [time period]..."
  /\bevery\s+(week|month|day|monday|friday|morning|evening)\b/gi,
  // "Usually on [day]..." or "I usually [do X] on [day]"
  /\busually\s+(?:on\s+)?(\w+day|mornings?|evenings?|weekly|monthly)\b/gi,
  /\busually\s+[\w\s]+(?:on\s+)(\w+days?)\b/gi,
  // "I always..."
  /\bi\s+always\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Regularly..."
  /\bregularly\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Weekly/Monthly [thing]"
  /\b(weekly|monthly|daily)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Every time I..."
  /\bevery\s+time\s+(?:i|we)\s+(\w[\w\s]{5,40}?)\b/gi,
]

// Stale decision markers - hints that a decision might need revisiting
const STALE_DECISION_PATTERNS = [
  // "We decided [time ago]..."
  /\bwe\s+decided\s+(?:a\s+while\s+ago|months?\s+ago|last\s+(?:year|quarter))\b/gi,
  // "That was based on..."
  /\bthat\s+was\s+based\s+on\s+(\w[\w\s]{5,40}?)\b/gi,
  // "When we were..."
  /\bwhen\s+we\s+were\s+(?:just\s+)?(?:starting|smaller|at\s+\d+)\b/gi,
  // "Back when..."
  /\bback\s+when\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Originally we..."
  /\boriginally\s+we\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Things have changed since..."
  /\bthings\s+have\s+changed\s+since\s+(\w[\w\s]{5,40}?)\b/gi,
]

// Context decay patterns - information getting stale
const CONTEXT_DECAY_PATTERNS = [
  // "Last time I checked..." - captures the phrase itself as signal
  /\b(last\s+time\s+(?:i|we)\s+checked)/gi,
  // "As of [old date]..."
  /\bas\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
  // "According to the [old] analysis..."
  /\baccording\s+to\s+(?:the|my|our)\s+(\w+)\s+(?:analysis|research|data|report)\b/gi,
  // "The [thing] is from..."
  /\bthe\s+(\w+)\s+is\s+from\s+(?:last|a\s+few)\s+(?:year|month|quarter)/gi,
  // "We haven't updated..."
  /\bwe\s+haven['']?t\s+updated\s+(\w[\w\s]{5,40}?)\b/gi,
]

// Unfinished work patterns - incomplete artifacts
const UNFINISHED_WORK_PATTERNS = [
  // "TODO" markers
  /\bTODO:?\s*(\w[\w\s]{5,60}?)\b/g,
  // "WIP" markers
  /\bWIP:?\s*(\w[\w\s]{5,40}?)\b/g,
  // "Draft" mentions
  /\b(?:the|my|our)\s+(\w+)\s+draft\b/gi,
  // "[thing] is not finished yet" - captures subject before "is not finished"
  /\b(\w[\w\s]{2,30}?)\s+is\s+not\s+(?:finished|done|complete)(?:\s+yet)?\b/gi,
  // "Not finished/done with [thing]..."
  /\bnot\s+(?:finished|done|complete)\s+with\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Still working on..."
  /\bstill\s+working\s+on\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Need to finish..."
  /\bneed\s+to\s+finish\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Incomplete" mentions
  /\bthe\s+(\w[\w\s]{5,40}?)\s+is\s+incomplete\b/gi,
  // "Partially done..."
  /\bpartially\s+(?:done|complete|finished)\s+(?:with\s+)?(\w[\w\s]{5,40}?)\b/gi,
]

// Pattern break markers - anomalies from usual behavior
const PATTERN_BREAK_PATTERNS = [
  // "I haven't [done regular thing]..."
  /\bi\s+haven['']t\s+(\w[\w\s]{5,40}?)\s+(?:in\s+a\s+while|lately|recently)\b/gi,
  // "I forgot to..."
  /\bi\s+forgot\s+to\s+(\w[\w\s]{5,40}?)\b/gi,
  // "I missed..."
  /\bi\s+missed\s+(?:the|my)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "I skipped..."
  /\bi\s+skipped\s+(?:the|my)\s+(\w[\w\s]{5,40}?)\b/gi,
  // "Unlike usual..."
  /\bunlike\s+usual\b/gi,
  // "Normally I would..."
  /\bnormally\s+(?:i|we)\s+would\s+(\w[\w\s]{5,40}?)\b/gi,
]

// ============================================
// Scheduling Logic
// ============================================

/**
 * Calculate when to surface an insight based on category
 */
function calculateSurfaceTime(category: SecretaryCategory, detectedAt: Date): Date {
  const surface = new Date(detectedAt)

  switch (category) {
    case 'commitment':
      // Surface 2-3 days after if no completion signal
      surface.setDate(surface.getDate() + 2)
      break
    case 'deadline':
      // For deadlines, we'll adjust in the detector based on the actual deadline
      // Default: surface immediately to start reminder countdown
      break
    case 'follow_up':
      // Surface after 7+ days of inactivity
      surface.setDate(surface.getDate() + 7)
      break
    case 'dependency':
      // Surface when blocking item resolves, or after 7 days
      surface.setDate(surface.getDate() + 7)
      break
    // Phase 2 categories
    case 'contradiction':
      // Surface immediately - contradictions need immediate attention
      break
    case 'open_question':
      // Surface after 7 days if still unresolved
      surface.setDate(surface.getDate() + 7)
      break
    case 'people_waiting':
      // Surface after 3 days - people are waiting
      surface.setDate(surface.getDate() + 3)
      break
    case 'recurring_pattern':
      // Surface after 1 day to reinforce pattern
      surface.setDate(surface.getDate() + 1)
      break
    case 'stale_decision':
      // Surface after 14 days - give time for decisions to age
      surface.setDate(surface.getDate() + 14)
      break
    case 'context_decay':
      // Surface after 7 days - information may be stale
      surface.setDate(surface.getDate() + 7)
      break
    case 'unfinished_work':
      // Surface after 7 days if work remains incomplete
      surface.setDate(surface.getDate() + 7)
      break
    case 'pattern_break':
      // Surface immediately - anomalies need attention
      break
  }

  return surface
}

/**
 * Calculate confidence based on pattern strength and context
 */
function calculateConfidence(match: string, category: SecretaryCategory): number {
  let confidence = 0.7 // Base confidence

  // Boost confidence for longer, more specific matches
  if (match.length > 20) confidence += 0.1
  if (match.length > 40) confidence += 0.05

  // Boost for categories that are more explicit
  if (category === 'commitment' && /\bi['']ll\b/i.test(match)) confidence += 0.1
  if (category === 'deadline' && /\b\d/.test(match)) confidence += 0.1
  if (category === 'dependency' && /\bblocked\b/i.test(match)) confidence += 0.15

  // Cap at 0.95
  return Math.min(0.95, confidence)
}

/**
 * Generate unique ID for insights
 */
function generateId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ============================================
// Detection Functions
// ============================================

/**
 * Detect commitments from message
 */
export function detectCommitments(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of COMMITMENT_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[1]?.trim() || match[0]?.trim()

      // Skip very short or very long matches
      if (content.length < 5 || content.length > 100) continue

      // Skip common false positives
      if (/^(know|see|check|look|think|try)$/i.test(content)) continue

      const confidence = calculateConfidence(content, 'commitment')

      // Only include high-confidence detections
      if (confidence >= 0.7) {
        items.push({
          id: generateId(),
          category: 'commitment',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('commitment', now),
          priority: 6, // Medium-high priority
          confidence,
          resolved: false,
        })
      }
    }
  }

  // Deduplicate similar items
  const uniqueItems = deduplicateInsights(items)

  return {
    found: uniqueItems.length > 0,
    items: uniqueItems,
  }
}

/**
 * Detect deadlines from message
 */
export function detectDeadlines(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  // Check explicit dates
  for (const pattern of DEADLINE_PATTERNS.explicitDates) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[0].trim()
      const parsedDate = parseDate(content)
      const confidence = parsedDate ? 0.9 : 0.7

      items.push({
        id: generateId(),
        category: 'deadline',
        content,
        context: extractContext(message, match.index, 100),
        sourceThreadId: threadId,
        detectedAt: now,
        surfaceAfter: calculateDeadlineReminder(parsedDate, now),
        priority: parsedDate ? 8 : 6, // High priority if we have a real date
        confidence,
        resolved: false,
      })
    }
  }

  // Check relative deadlines
  for (const pattern of DEADLINE_PATTERNS.relative) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[0].trim()
      const estimatedDate = parseRelativeDate(content)
      const confidence = estimatedDate ? 0.85 : 0.7

      items.push({
        id: generateId(),
        category: 'deadline',
        content,
        context: extractContext(message, match.index, 100),
        sourceThreadId: threadId,
        detectedAt: now,
        surfaceAfter: calculateDeadlineReminder(estimatedDate, now),
        priority: 7,
        confidence,
        resolved: false,
      })
    }
  }

  // Check event-based deadlines
  for (const pattern of DEADLINE_PATTERNS.events) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[0].trim()

      items.push({
        id: generateId(),
        category: 'deadline',
        content,
        context: extractContext(message, match.index, 100),
        sourceThreadId: threadId,
        detectedAt: now,
        surfaceAfter: calculateSurfaceTime('deadline', now),
        priority: 6,
        confidence: 0.75,
        resolved: false,
      })
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

/**
 * Detect follow-ups (unresolved conversations)
 * Note: Full implementation would track across multiple messages
 */
export function detectFollowUps(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of FOLLOW_UP_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[1]?.trim() || match[0]?.trim()

      // Skip very short matches
      if (content.length < 5) continue

      const confidence = calculateConfidence(content, 'follow_up')

      if (confidence >= 0.65) {
        items.push({
          id: generateId(),
          category: 'follow_up',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('follow_up', now),
          priority: 5, // Medium priority
          confidence,
          resolved: false,
        })
      }
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

/**
 * Detect dependencies from message
 */
export function detectDependencies(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of DEPENDENCY_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[1]?.trim() || match[0]?.trim()

      // Skip very short matches
      if (content.length < 5) continue

      const confidence = calculateConfidence(content, 'dependency')

      if (confidence >= 0.7) {
        items.push({
          id: generateId(),
          category: 'dependency',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('dependency', now),
          priority: 6,
          confidence,
          resolved: false,
        })
      }
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

// ============================================
// Phase 2 Detection Functions
// ============================================

/**
 * Detect contradictions from message
 */
export function detectContradictions(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of CONTRADICTION_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[1]?.trim() || match[0]?.trim()

      // Skip very short matches
      if (content.length < 3) continue

      const confidence = calculateConfidence(content, 'contradiction')

      if (confidence >= 0.65) {
        items.push({
          id: generateId(),
          category: 'contradiction',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('contradiction', now),
          priority: 8, // High priority - contradictions need attention
          confidence,
          resolved: false,
        })
      }
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

/**
 * Detect open questions from message
 */
export function detectOpenQuestions(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of OPEN_QUESTION_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[1]?.trim() || match[0]?.trim()

      // Skip very short matches
      if (content.length < 5) continue

      const confidence = calculateConfidence(content, 'open_question')

      if (confidence >= 0.65) {
        items.push({
          id: generateId(),
          category: 'open_question',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('open_question', now),
          priority: 5, // Medium priority
          confidence,
          resolved: false,
        })
      }
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

/**
 * Detect people waiting from message
 */
export function detectPeopleWaiting(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of PEOPLE_WAITING_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      // Get person name from first capture group
      const person = match[1]?.trim() || ''
      const action = match[2]?.trim() || match[0]?.trim()
      const content = person ? `${person}: ${action}` : action

      // Skip very short matches
      if (content.length < 3) continue

      const confidence = calculateConfidence(content, 'people_waiting')

      if (confidence >= 0.65) {
        items.push({
          id: generateId(),
          category: 'people_waiting',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('people_waiting', now),
          priority: 7, // High priority - people are waiting
          confidence,
          resolved: false,
        })
      }
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

/**
 * Detect recurring patterns from message
 */
export function detectRecurringPatterns(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of RECURRING_PATTERN_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[1]?.trim() || match[0]?.trim()

      // Skip very short matches
      if (content.length < 3) continue

      const confidence = calculateConfidence(content, 'recurring_pattern')

      if (confidence >= 0.6) {
        items.push({
          id: generateId(),
          category: 'recurring_pattern',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('recurring_pattern', now),
          priority: 4, // Lower priority - informational
          confidence,
          resolved: false,
        })
      }
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

/**
 * Detect stale decisions from message
 */
export function detectStaleDecisions(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of STALE_DECISION_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[1]?.trim() || match[0]?.trim()

      // Skip very short matches
      if (content.length < 5) continue

      const confidence = calculateConfidence(content, 'stale_decision')

      if (confidence >= 0.6) {
        items.push({
          id: generateId(),
          category: 'stale_decision',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('stale_decision', now),
          priority: 5, // Medium priority
          confidence,
          resolved: false,
        })
      }
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

/**
 * Detect context decay from message
 */
export function detectContextDecay(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of CONTEXT_DECAY_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[1]?.trim() || match[0]?.trim()

      // Skip very short matches
      if (content.length < 3) continue

      const confidence = calculateConfidence(content, 'context_decay')

      if (confidence >= 0.6) {
        items.push({
          id: generateId(),
          category: 'context_decay',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('context_decay', now),
          priority: 4, // Lower priority - informational
          confidence,
          resolved: false,
        })
      }
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

/**
 * Detect unfinished work from message
 */
export function detectUnfinishedWork(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of UNFINISHED_WORK_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[1]?.trim() || match[0]?.trim()

      // Skip very short matches
      if (content.length < 3) continue

      const confidence = calculateConfidence(content, 'unfinished_work')

      if (confidence >= 0.65) {
        items.push({
          id: generateId(),
          category: 'unfinished_work',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('unfinished_work', now),
          priority: 6, // Medium-high priority
          confidence,
          resolved: false,
        })
      }
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

/**
 * Detect pattern breaks from message
 */
export function detectPatternBreaks(
  workspaceId: string,
  message: string,
  threadId: string
): DetectionResult {
  const items: SecretaryInsight[] = []
  const now = new Date()

  for (const pattern of PATTERN_BREAK_PATTERNS) {
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(message)) !== null) {
      const content = match[1]?.trim() || match[0]?.trim()

      // Skip very short matches
      if (content.length < 3) continue

      const confidence = calculateConfidence(content, 'pattern_break')

      if (confidence >= 0.65) {
        items.push({
          id: generateId(),
          category: 'pattern_break',
          content,
          context: extractContext(message, match.index, 100),
          sourceThreadId: threadId,
          detectedAt: now,
          surfaceAfter: calculateSurfaceTime('pattern_break', now),
          priority: 7, // High priority - anomalies
          confidence,
          resolved: false,
        })
      }
    }
  }

  return {
    found: items.length > 0,
    items: deduplicateInsights(items),
  }
}

// ============================================
// Main Entry Point
// ============================================

/**
 * Run all secretary checks on a conversation
 * Call this after every OSQR response
 */
export async function runSecretaryCheck(
  workspaceId: string,
  message: string,
  threadId: string
): Promise<SecretaryInsight[]> {
  console.log('[Secretary] Running checks on conversation...')

  const allInsights: SecretaryInsight[] = []

  // Run all detectors (Phase 1 + Phase 2)
  const [
    commitments,
    deadlines,
    followUps,
    dependencies,
    // Phase 2 detectors
    contradictions,
    openQuestions,
    peopleWaiting,
    recurringPatterns,
    staleDecisions,
    contextDecay,
    unfinishedWork,
    patternBreaks,
  ] = await Promise.all([
    // Phase 1
    Promise.resolve(detectCommitments(workspaceId, message, threadId)),
    Promise.resolve(detectDeadlines(workspaceId, message, threadId)),
    Promise.resolve(detectFollowUps(workspaceId, message, threadId)),
    Promise.resolve(detectDependencies(workspaceId, message, threadId)),
    // Phase 2
    Promise.resolve(detectContradictions(workspaceId, message, threadId)),
    Promise.resolve(detectOpenQuestions(workspaceId, message, threadId)),
    Promise.resolve(detectPeopleWaiting(workspaceId, message, threadId)),
    Promise.resolve(detectRecurringPatterns(workspaceId, message, threadId)),
    Promise.resolve(detectStaleDecisions(workspaceId, message, threadId)),
    Promise.resolve(detectContextDecay(workspaceId, message, threadId)),
    Promise.resolve(detectUnfinishedWork(workspaceId, message, threadId)),
    Promise.resolve(detectPatternBreaks(workspaceId, message, threadId)),
  ])

  // Collect all insights
  // Phase 1
  if (commitments.found) allInsights.push(...commitments.items)
  if (deadlines.found) allInsights.push(...deadlines.items)
  if (followUps.found) allInsights.push(...followUps.items)
  if (dependencies.found) allInsights.push(...dependencies.items)
  // Phase 2
  if (contradictions.found) allInsights.push(...contradictions.items)
  if (openQuestions.found) allInsights.push(...openQuestions.items)
  if (peopleWaiting.found) allInsights.push(...peopleWaiting.items)
  if (recurringPatterns.found) allInsights.push(...recurringPatterns.items)
  if (staleDecisions.found) allInsights.push(...staleDecisions.items)
  if (contextDecay.found) allInsights.push(...contextDecay.items)
  if (unfinishedWork.found) allInsights.push(...unfinishedWork.items)
  if (patternBreaks.found) allInsights.push(...patternBreaks.items)

  // Queue insights for delivery
  for (const insight of allInsights) {
    const insightMessage = formatInsightMessage(insight)

    queueInsight(workspaceId, {
      type: mapCategoryToInsightType(insight.category),
      title: formatInsightTitle(insight.category),
      message: insightMessage,
      priority: calculatePriority(
        { type: mapCategoryToInsightType(insight.category) },
        { confidence: insight.confidence }
      ),
      trigger: 'idle',
      minIdleSeconds: 30,
      contextTags: [insight.category, insight.sourceThreadId],
      sourceData: {
        secretaryCategory: insight.category,
        content: insight.content,
        context: insight.context,
        confidence: insight.confidence,
      },
      expandedContent: insight.context,
    })
  }

  console.log(`[Secretary] Detected ${allInsights.length} items:`, {
    // Phase 1
    commitments: commitments.items.length,
    deadlines: deadlines.items.length,
    followUps: followUps.items.length,
    dependencies: dependencies.items.length,
    // Phase 2
    contradictions: contradictions.items.length,
    openQuestions: openQuestions.items.length,
    peopleWaiting: peopleWaiting.items.length,
    recurringPatterns: recurringPatterns.items.length,
    staleDecisions: staleDecisions.items.length,
    contextDecay: contextDecay.items.length,
    unfinishedWork: unfinishedWork.items.length,
    patternBreaks: patternBreaks.items.length,
  })

  return allInsights
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extract context around a match
 */
function extractContext(text: string, matchIndex: number, radius: number): string {
  const start = Math.max(0, matchIndex - radius)
  const end = Math.min(text.length, matchIndex + radius)
  let context = text.slice(start, end)

  // Add ellipsis if truncated
  if (start > 0) context = '...' + context
  if (end < text.length) context = context + '...'

  return context.trim()
}

/**
 * Deduplicate similar insights
 */
function deduplicateInsights(items: SecretaryInsight[]): SecretaryInsight[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.content.toLowerCase().slice(0, 30)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Parse explicit date string
 */
function parseDate(dateStr: string): Date | null {
  try {
    // Try common formats
    const parsed = new Date(dateStr)
    if (!isNaN(parsed.getTime())) return parsed

    // Handle month name formats
    const monthMatch = dateStr.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i)
    if (monthMatch) {
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
      const month = monthNames.indexOf(monthMatch[1].toLowerCase())
      const day = parseInt(monthMatch[2], 10)
      const year = new Date().getFullYear()
      const date = new Date(year, month, day)

      // If date is in the past, assume next year
      if (date < new Date()) {
        date.setFullYear(year + 1)
      }
      return date
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse relative date string
 */
function parseRelativeDate(dateStr: string): Date | null {
  const now = new Date()
  const lower = dateStr.toLowerCase()

  // "by tomorrow"
  if (lower.includes('tomorrow')) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }

  // "next week" / "this week"
  if (lower.includes('week')) {
    const weekDate = new Date(now)
    if (lower.includes('next')) {
      weekDate.setDate(weekDate.getDate() + 7)
    } else if (lower.includes('end')) {
      // End of week = next Sunday
      const daysUntilSunday = 7 - weekDate.getDay()
      weekDate.setDate(weekDate.getDate() + daysUntilSunday)
    }
    return weekDate
  }

  // "end of month"
  if (lower.includes('month')) {
    const monthDate = new Date(now)
    if (lower.includes('end')) {
      monthDate.setMonth(monthDate.getMonth() + 1, 0) // Last day of current month
    } else if (lower.includes('next')) {
      monthDate.setMonth(monthDate.getMonth() + 1)
    }
    return monthDate
  }

  // "in X days/weeks"
  const inMatch = lower.match(/in\s+(\d+)\s+(day|week|month)/i)
  if (inMatch) {
    const num = parseInt(inMatch[1], 10)
    const unit = inMatch[2]
    const futureDate = new Date(now)

    if (unit === 'day') futureDate.setDate(futureDate.getDate() + num)
    else if (unit === 'week') futureDate.setDate(futureDate.getDate() + num * 7)
    else if (unit === 'month') futureDate.setMonth(futureDate.getMonth() + num)

    return futureDate
  }

  // Day names
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  for (let i = 0; i < dayNames.length; i++) {
    if (lower.includes(dayNames[i])) {
      const targetDay = i
      const currentDay = now.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      const dayDate = new Date(now)
      dayDate.setDate(dayDate.getDate() + daysUntil)
      return dayDate
    }
  }

  return null
}

/**
 * Calculate when to remind about a deadline
 */
function calculateDeadlineReminder(deadline: Date | null, now: Date): Date {
  if (!deadline) {
    // No specific date - surface in 1 day
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }

  const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Schedule reminders at appropriate intervals
  if (daysUntil > 30) {
    // Surface at 30 days before
    const reminder = new Date(deadline)
    reminder.setDate(reminder.getDate() - 30)
    return reminder
  } else if (daysUntil > 7) {
    // Surface at 7 days before
    const reminder = new Date(deadline)
    reminder.setDate(reminder.getDate() - 7)
    return reminder
  } else if (daysUntil > 3) {
    // Surface at 3 days before
    const reminder = new Date(deadline)
    reminder.setDate(reminder.getDate() - 3)
    return reminder
  } else if (daysUntil > 1) {
    // Surface at 1 day before
    const reminder = new Date(deadline)
    reminder.setDate(reminder.getDate() - 1)
    return reminder
  }

  // Imminent - surface immediately
  return now
}

/**
 * Map secretary category to insight queue type
 */
function mapCategoryToInsightType(category: SecretaryCategory): 'next_step' | 'recall' | 'clarify' | 'contradiction' {
  switch (category) {
    // Phase 1
    case 'commitment':
      return 'next_step'
    case 'deadline':
      return 'next_step'
    case 'follow_up':
      return 'clarify'
    case 'dependency':
      return 'next_step'
    // Phase 2
    case 'contradiction':
      return 'contradiction'
    case 'open_question':
      return 'clarify'
    case 'people_waiting':
      return 'next_step'
    case 'recurring_pattern':
      return 'recall'
    case 'stale_decision':
      return 'clarify'
    case 'context_decay':
      return 'recall'
    case 'unfinished_work':
      return 'next_step'
    case 'pattern_break':
      return 'recall'
    default:
      return 'recall'
  }
}

/**
 * Format insight title based on category
 */
function formatInsightTitle(category: SecretaryCategory): string {
  switch (category) {
    // Phase 1
    case 'commitment':
      return 'Commitment reminder'
    case 'deadline':
      return 'Deadline approaching'
    case 'follow_up':
      return 'Unresolved discussion'
    case 'dependency':
      return 'Dependency check'
    // Phase 2
    case 'contradiction':
      return 'Contradiction detected'
    case 'open_question':
      return 'Open question'
    case 'people_waiting':
      return 'Someone is waiting'
    case 'recurring_pattern':
      return 'Pattern noticed'
    case 'stale_decision':
      return 'Decision may be stale'
    case 'context_decay':
      return 'Information may be outdated'
    case 'unfinished_work':
      return 'Unfinished work'
    case 'pattern_break':
      return 'Break from routine'
    default:
      return 'Quick note'
  }
}

/**
 * Format the insight message for display
 */
function formatInsightMessage(insight: SecretaryInsight): string {
  switch (insight.category) {
    // Phase 1
    case 'commitment':
      return `You mentioned "${insight.content}". Did that happen?`
    case 'deadline':
      return `Heads up: "${insight.content}" is coming up.`
    case 'follow_up':
      return `You were discussing "${insight.content}". Want to revisit?`
    case 'dependency':
      return `"${insight.content}" - is this still blocking?`
    // Phase 2
    case 'contradiction':
      return `I noticed a potential contradiction: "${insight.content}". Want to clarify?`
    case 'open_question':
      return `You had an open question about "${insight.content}". Still need to decide?`
    case 'people_waiting':
      return `Reminder: ${insight.content}. Have you followed up?`
    case 'recurring_pattern':
      return `I noticed a pattern: "${insight.content}". Want me to track this?`
    case 'stale_decision':
      return `You mentioned "${insight.content}". Still the right approach?`
    case 'context_decay':
      return `"${insight.content}" might be outdated. Worth checking?`
    case 'unfinished_work':
      return `"${insight.content}" appears incomplete. Need to finish this?`
    case 'pattern_break':
      return `You mentioned "${insight.content}". Everything okay?`
    default:
      return insight.content
  }
}
