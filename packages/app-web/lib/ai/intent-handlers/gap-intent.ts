/**
 * Gap Intent Detection - Detects Knowledge Gap Queries
 *
 * Identifies when a user is asking about their knowledge gaps,
 * what they're missing, or what they should learn next.
 *
 * @example
 * ```typescript
 * const context = parseGapIntent('What am I missing?')
 * // Returns: { isGapQuery: true, scope: 'all', topN: undefined }
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export interface GapIntentContext {
  isGapQuery: boolean
  scope: 'all' | 'domain-specific'        // "what am I missing" vs "what am I missing about marketing"
  specificDomain?: string                  // The domain if scope is 'domain-specific'
  topN?: number                            // If user asked for "top 3", "top 5", etc.
  originalQuery: string
}

// =============================================================================
// PATTERNS
// =============================================================================

/**
 * Patterns that indicate a gap analysis query
 * Ordered roughly by specificity
 */
const GAP_INTENT_PATTERNS: RegExp[] = [
  // Direct gap questions
  /what.*(am i|are we|do i).*(missing|lacking|don't know|need to know)/i,
  /what.*(should i|do i need to).*(learn|study|research|know|read|understand)/i,
  /gaps? in my (knowledge|vault|documents|docs|library)/i,
  /what.*don't i (know|have|understand)/i,
  /analyze my (knowledge|vault|documents|docs)/i,
  /where are my (blind spots?|gaps?|weaknesses|weak points)/i,
  /what topics? (should i|do i need to) (cover|learn|study)/i,
  /tell me.*(what|things).*(missing|gaps)/i,
  /using my.*(vault|knowledge).*(missing|gaps)/i,

  // Goal-oriented gap questions
  /what do i need to (know|learn|understand) (to|for|before)/i,
  /what knowledge.*(do i|am i).*(need|missing|lack)/i,
  /what's missing (in|from) my (vault|knowledge|docs)/i,
  /what do i need to research/i,

  // Improvement-oriented questions
  /how can i (improve|strengthen|fill).*(knowledge|gaps)/i,
  /what (areas|domains|topics) should i (focus on|study|learn)/i,
  /where should i (focus|concentrate) my (learning|study|research)/i,
  /where should i be learning/i,

  // Comparative questions
  /what.*(am i|are we) not (covering|learning|studying)/i,
  /compared to my goals?.*(what|where).*(missing|gap)/i,

  // Weakness-oriented
  /what are my (weakest|weak) (areas?|points?)/i,
  /my weakest/i,

  // Feel-based queries
  /i.*(feel|think).*(missing|lacking)/i,
  /something.*(missing|lacking)/i,

  // Simple triggers
  /gap analysis/i,
  /knowledge gaps?/i,
  /blind spots?/i,
  /what gaps? (do i|am i)/i,
  /top \d+ (things?|gaps?|areas?)/i,
]

/**
 * Patterns to extract "top N" requests
 */
const TOP_N_PATTERNS: RegExp[] = [
  /top\s*(\d+)/i,
  /(\d+)\s*(?:biggest|main|key|most important)\s*(?:gaps?|things?|areas?)/i,
  /(?:the|my)\s*(\d+)\s*(?:biggest|main|key)\s*(?:gaps?|missing)/i,
]

/**
 * Domain extraction patterns
 * Maps phrases to domain names
 */
const DOMAIN_PHRASES: Record<string, string> = {
  // Technical
  'backend': 'Technical/Backend',
  'server': 'Technical/Backend',
  'api': 'Technical/Backend',
  'database': 'Technical/Backend',
  'frontend': 'Technical/Frontend',
  'ui': 'Technical/Frontend',
  'react': 'Technical/Frontend',
  'infrastructure': 'Technical/Infrastructure',
  'devops': 'Technical/Infrastructure',
  'deployment': 'Technical/Infrastructure',
  'ai': 'Technical/AI/ML',
  'ml': 'Technical/AI/ML',
  'machine learning': 'Technical/AI/ML',
  'llm': 'Technical/AI/ML',
  'security': 'Technical/Security',
  'data': 'Technical/Data',
  'analytics data': 'Technical/Data',

  // Business
  'marketing': 'Business/Marketing',
  'seo': 'Business/Marketing',
  'content': 'Business/Marketing',
  'growth': 'Business/Marketing',
  'sales': 'Business/Sales',
  'selling': 'Business/Sales',
  'strategy': 'Business/Strategy',
  'business': 'Business/Strategy',
  'finance': 'Business/Finance',
  'fundraising': 'Business/Finance',
  'investor': 'Business/Finance',
  'funding': 'Business/Finance',
  'legal': 'Business/Legal',
  'law': 'Business/Legal',
  'compliance': 'Business/Legal',
  'operations': 'Business/Operations',
  'ops': 'Business/Operations',

  // Product
  'design': 'Product/Design',
  'ux': 'Product/UX',
  'user experience': 'Product/UX',
  'research': 'Product/Research',
  'user research': 'Product/Research',
  'product analytics': 'Product/Analytics',
  'metrics': 'Product/Analytics',
  'roadmap': 'Product/Roadmap',
  'product planning': 'Product/Roadmap',

  // Personal
  'learning': 'Personal/Learning',
  'goals': 'Personal/Goals',
  'productivity': 'Personal/Productivity',
  'health': 'Personal/Health',
  'relationships': 'Personal/Relationships',
  'networking': 'Personal/Relationships',
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Check if a message is asking about knowledge gaps
 *
 * This is a fast O(1) check using regex patterns.
 * Use parseGapIntent for full context extraction.
 *
 * @param message - User's message
 * @returns true if this appears to be a gap analysis query
 */
export function isGapAnalysisIntent(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim()

  for (const pattern of GAP_INTENT_PATTERNS) {
    if (pattern.test(normalizedMessage)) {
      return true
    }
  }

  return false
}

/**
 * Parse a gap intent query for context
 *
 * Extracts:
 * - Whether it's a gap query
 * - Scope (all domains or specific)
 * - Specific domain if mentioned
 * - TopN limit if mentioned
 *
 * @param message - User's message
 * @returns Parsed gap intent context
 */
export function parseGapIntent(message: string): GapIntentContext {
  const normalizedMessage = message.toLowerCase().trim()

  // Check if it's a gap query
  const isGapQuery = isGapAnalysisIntent(message)

  if (!isGapQuery) {
    return {
      isGapQuery: false,
      scope: 'all',
      originalQuery: message,
    }
  }

  // Extract topN if specified
  let topN: number | undefined
  for (const pattern of TOP_N_PATTERNS) {
    const match = normalizedMessage.match(pattern)
    if (match && match[1]) {
      topN = parseInt(match[1], 10)
      if (topN > 0 && topN <= 10) {
        break
      } else {
        topN = undefined
      }
    }
  }

  // Extract specific domain if mentioned
  let specificDomain: string | undefined
  let scope: 'all' | 'domain-specific' = 'all'

  // Check for domain mentions in order of phrase length (longer = more specific)
  const sortedPhrases = Object.entries(DOMAIN_PHRASES)
    .sort((a, b) => b[0].length - a[0].length)

  for (const [phrase, domain] of sortedPhrases) {
    if (normalizedMessage.includes(phrase)) {
      specificDomain = domain
      scope = 'domain-specific'
      break
    }
  }

  // Also check for "about X" or "in X" patterns
  const aboutMatch = normalizedMessage.match(/(?:about|in|for|regarding|on)\s+(\w+(?:\s+\w+)?)/i)
  if (aboutMatch && !specificDomain) {
    const aboutTopic = aboutMatch[1].toLowerCase()
    for (const [phrase, domain] of sortedPhrases) {
      if (aboutTopic.includes(phrase) || phrase.includes(aboutTopic)) {
        specificDomain = domain
        scope = 'domain-specific'
        break
      }
    }
  }

  return {
    isGapQuery: true,
    scope,
    specificDomain,
    topN,
    originalQuery: message,
  }
}

/**
 * Get example gap analysis queries for help/suggestions
 */
export function getGapQueryExamples(): string[] {
  return [
    'What am I missing?',
    'What are the top 3 gaps in my knowledge?',
    'What should I learn next?',
    'What am I missing about marketing?',
    'Analyze my knowledge gaps',
    'What do I need to know to launch my product?',
    'Where are my blind spots?',
  ]
}

/**
 * Get suggested follow-up queries after gap analysis
 */
export function getGapFollowUpSuggestions(gaps: string[]): string[] {
  const suggestions: string[] = []

  if (gaps.length > 0) {
    const firstGapDomain = gaps[0].split('/')[1]
    suggestions.push(`Tell me more about ${firstGapDomain}`)
    suggestions.push(`What resources can help me learn ${firstGapDomain}?`)
  }

  suggestions.push('How can I prioritize filling these gaps?')
  suggestions.push('What should I focus on first?')

  return suggestions.slice(0, 4)
}

/**
 * Check if user is asking about a specific domain's gaps
 */
export function isDomainSpecificGapQuery(message: string): { isDomainSpecific: boolean; domain?: string } {
  const context = parseGapIntent(message)

  return {
    isDomainSpecific: context.scope === 'domain-specific',
    domain: context.specificDomain,
  }
}

/**
 * Extract the action the user wants from a gap query
 */
export function extractGapQueryAction(message: string): 'analyze' | 'suggest' | 'prioritize' | 'explain' {
  const lower = message.toLowerCase()

  if (/prioritize|first|start|focus/i.test(lower)) {
    return 'prioritize'
  }

  if (/why|explain|reason/i.test(lower)) {
    return 'explain'
  }

  if (/suggest|recommend|resource|learn|study/i.test(lower)) {
    return 'suggest'
  }

  return 'analyze'
}
