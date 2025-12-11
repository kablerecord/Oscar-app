/**
 * Crisis Detector
 *
 * Pattern-based detection for self-harm and suicide signals.
 * Focuses on what NEEDS special handling (crisis) rather than what models already handle (harmful intent).
 *
 * @see docs/SAFETY_SYSTEM.md
 */

import type { CrisisLevel, CrisisDetectionResult } from './types'

// =============================================================================
// CRISIS PATTERNS
// =============================================================================

/**
 * Crisis detection patterns organized by severity level.
 *
 * CRITICAL: Explicit statements of suicide intent or planning
 * HIGH: Strong indicators of self-harm ideation or severe distress
 * LOW: General hopelessness that may need gentle support
 */
const CRISIS_PATTERNS: Record<Exclude<CrisisLevel, 'none'>, RegExp[]> = {
  critical: [
    // Explicit suicide intent
    /\b(want to|going to|plan to|planning to|decided to)\s*(kill myself|end my life|commit suicide|take my (own )?life)\b/i,
    /\b(i('?m| am) going to)\s*(die|end it( all)?|kill myself)\b/i,
    /\bhow (to|do i|can i)\s*(kill myself|commit suicide|end my life)\b/i,
    /\b(best|easiest|quickest|painless)\s*(way to|method to)\s*(die|kill myself|end it)\b/i,
    /\bgoodbye\b.{0,50}\b(forever|world|everyone)\b/i,
    /\bthis is (my )?(final|last)\s*(message|note|goodbye)\b/i,
    /\b(writing|leaving)\s*(a )?(suicide )?note\b/i,
  ],

  high: [
    // Self-harm ideation (not explicit planning)
    /\b(don'?t|do not)\s*want to\s*(be here|live|exist|be alive|wake up)\b/i,
    /\b(no|not any|zero)\s*(reason|point)\s*(to|in)\s*(live|living|go on|going on|continue|continuing)\b/i,
    /\beveryone\s*(would be|will be|is)\s*better off\s*(without me|if i (was|were) gone)\b/i,
    /\b(i('?m| am))\s*(done|finished|giving up|over it)\s*(with (life|everything|it all))?\b/i,
    /\bwish i\s*(was|were)(n'?t| not)\s*(here|alive|born)\b/i,
    /\bwant to\s*disappear\s*(forever)?\b/i,
    /\b(can'?t|cannot)\s*(do this|take this|handle this|go on)\s*(anymore|any longer)\b/i,
    /\b(life|living)\s*(is|feels?)\s*(not worth|pointless|meaningless|hopeless)\b/i,
    /\bi\s*(just )?(want|need)\s*(the pain|it all)\s*to\s*(stop|end)\b/i,
    /\bno one\s*(would|will)\s*(care|notice|miss me)\s*(if i|when i)\b/i,
  ],

  low: [
    // General hopelessness (may need gentle support, but not crisis intervention)
    /\b(feeling|felt)\s*(completely )?(hopeless|helpless)\b/i,
    /\b(lost|losing)\s*(all )?(hope|will to)\b/i,
    /\bcan'?t\s*(take|do|handle)\s*(this|it)\s*(anymore)?\b/i,
    /\bwhat'?s\s*the\s*point\b/i,
    /\b(everything|life)\s*(is|feels)\s*(so )?(dark|empty|meaningless)\b/i,
    /\bi('?m| am)\s*(so )?(tired|exhausted)\s*(of (everything|life|trying|living))\b/i,
  ],
}

/**
 * Patterns that indicate NON-crisis context (reduce false positives)
 */
const CONTEXT_EXCLUSIONS: RegExp[] = [
  // Fiction/creative writing
  /\b(my )?(character|protagonist|story|novel|fiction|writing|screenplay|script)\b/i,
  /\b(in the (story|book|movie|show|game))\b/i,
  /\b(for a (story|book|screenplay|project))\b/i,

  // Professional/academic context
  /\b(i('?m| am) a|as a)\s*(therapist|counselor|psychologist|psychiatrist|nurse|doctor|social worker|researcher)\b/i,
  /\b(research(ing)?|study(ing)?|paper|thesis|article)\s*(on|about)\b/i,
  /\b(clinical|medical|professional|academic)\s*(context|purposes?|research)\b/i,

  // Quoting/referencing
  /\b(someone said|they said|quote|lyrics|song)\b/i,
  /^["'"].*["'"]$/,

  // Past tense/others
  /\b(he|she|they|my friend|my (mom|dad|brother|sister|family member))\s*(said|told me|mentioned)\b/i,
  /\b(used to|in the past|years ago|when i was)\b/i,
]

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Check if message contains exclusion context that suggests non-crisis
 */
function hasExclusionContext(message: string): boolean {
  return CONTEXT_EXCLUSIONS.some((pattern) => pattern.test(message))
}

/**
 * Detect crisis level in a message
 *
 * @param message - User's message to analyze
 * @returns Crisis detection result with level, signals, and recommended actions
 */
export function detectCrisis(message: string): CrisisDetectionResult {
  // Default result: no crisis detected
  const result: CrisisDetectionResult = {
    level: 'none',
    signals: [],
    shouldIntervene: false,
    shouldSkipStorage: false,
    confidence: 1.0,
  }

  // Skip very short messages (unlikely to contain meaningful signals)
  if (message.length < 10) {
    return result
  }

  // Check for exclusion context (fiction, professional, etc.)
  const hasExclusion = hasExclusionContext(message)

  // Check patterns in priority order (critical first)
  const levels: Array<Exclude<CrisisLevel, 'none'>> = ['critical', 'high', 'low']

  for (const level of levels) {
    const patterns = CRISIS_PATTERNS[level]

    for (const pattern of patterns) {
      if (pattern.test(message)) {
        result.signals.push(pattern.source)

        // Only upgrade level (never downgrade)
        if (result.level === 'none') {
          result.level = level
        }
      }
    }

    // If we found critical/high, stop checking lower levels
    if (result.level === 'critical' || result.level === 'high') {
      break
    }
  }

  // Apply exclusion context
  if (hasExclusion && result.level !== 'none') {
    // Reduce confidence but don't completely ignore
    result.confidence = 0.4

    // Only intervene on critical with exclusion context
    if (result.level !== 'critical') {
      result.level = 'none'
      result.signals = []
    }
  }

  // Set intervention flags based on final level
  result.shouldIntervene = result.level === 'critical' || result.level === 'high'
  result.shouldSkipStorage = result.level === 'critical' || result.level === 'high'

  // Adjust confidence based on signal count
  if (result.signals.length > 2) {
    result.confidence = Math.min(result.confidence + 0.1, 1.0)
  }

  return result
}

/**
 * Quick check if a message might need crisis evaluation
 * (Fast pre-filter before full detection)
 */
export function mightNeedCrisisCheck(message: string): boolean {
  // Quick keyword check (much faster than regex)
  const lowerMessage = message.toLowerCase()

  const quickKeywords = [
    'kill myself',
    'suicide',
    'end my life',
    'want to die',
    'don\'t want to live',
    'don\'t want to be here',
    'better off without me',
    'no reason to live',
    'giving up',
    'can\'t go on',
    'hopeless',
  ]

  return quickKeywords.some((keyword) => lowerMessage.includes(keyword))
}
