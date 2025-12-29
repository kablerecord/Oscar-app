/**
 * Template Selector
 * Determines which template to use based on user message and data structure
 * @see docs/features/TEMPLATE_SYSTEM_SPEC.md
 */

import type { TemplateType } from '../types'

// Explicit template triggers
const TEMPLATE_TRIGGERS: Record<TemplateType, RegExp[]> = {
  listings: [
    /\b(show|list|display)\s+(?:these\s+)?(?:as\s+)?(?:a\s+)?listings?\b/i,
    /\b(show|list|display)\s+(?:as\s+)?(?:a\s+)?cards?\b/i,
    /\bmake\s+(?:this\s+)?(?:a\s+)?listing\b/i,
    /\bproduct\s+(?:grid|cards?)\b/i,
  ],
  table: [
    /\b(show|display)\s+(?:this\s+)?(?:as\s+)?(?:a\s+)?table\b/i,
    /\bmake\s+(?:this\s+)?(?:a\s+)?(?:data\s+)?table\b/i,
    /\bspreadsheet\b/i,
    /\btabular\b/i,
  ],
  gallery: [
    /\b(show|display)\s+(?:these\s+)?(?:as\s+)?(?:a\s+)?gallery\b/i,
    /\bimage\s+gallery\b/i,
    /\bphoto\s+grid\b/i,
  ],
  timeline: [
    /\b(show|display|create)\s+(?:this\s+)?(?:as\s+)?(?:a\s+)?timeline\b/i,
    /\bhistory\s+view\b/i,
    /\bevent\s+timeline\b/i,
  ],
  'game-simple': [
    /\b(build|make|create|play)\s+(?:a\s+)?(?:tic[\s-]?tac[\s-]?toe|tictactoe)\b/i,
    /\b(build|make|create)\s+(?:a\s+)?(?:simple\s+)?game\b/i,
    /\b(build|make|create|play)\s+(?:a\s+)?memory\s+game\b/i,
    /\b(build|make|create)\s+(?:a\s+)?quiz\b/i,
  ],
  dashboard: [
    /\b(create|make|build|show)\s+(?:a\s+)?dashboard\b/i,
    /\bkpi\s+(?:view|display)\b/i,
    /\bmetrics?\s+dashboard\b/i,
  ],
  comparison: [
    /\bcompare\s+(?:these|them)\b/i,
    /\b(show|create)\s+(?:a\s+)?comparison\b/i,
    /\bside[\s-]?by[\s-]?side\b/i,
    /\bvs\.?\b/i,
  ],
}

/**
 * Detect template intent from user message
 */
export function detectTemplateIntent(message: string): {
  detected: boolean
  template: TemplateType | null
  confidence: 'explicit' | 'inferred' | null
  trigger?: string
} {
  const normalizedMessage = message.trim()

  // Check for explicit template triggers
  for (const [template, patterns] of Object.entries(TEMPLATE_TRIGGERS)) {
    for (const pattern of patterns) {
      const match = normalizedMessage.match(pattern)
      if (match) {
        return {
          detected: true,
          template: template as TemplateType,
          confidence: 'explicit',
          trigger: match[0],
        }
      }
    }
  }

  return {
    detected: false,
    template: null,
    confidence: null,
  }
}

/**
 * Infer the best template from data structure
 */
export function inferTemplateFromData(data: unknown): TemplateType {
  // Must be an array of objects
  if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== 'object' || data[0] === null) {
    return 'table' // Safe default
  }

  const sample = data[0] as Record<string, unknown>
  const keys = Object.keys(sample)

  // Check for image/price fields → listings
  const hasImageField = keys.some(k =>
    /image|photo|thumbnail|picture|src|url|img/i.test(k)
  )
  const hasPriceField = keys.some(k =>
    /price|cost|amount|value|fee/i.test(k)
  )

  if (hasImageField || hasPriceField) {
    return 'listings'
  }

  // Check for date/time fields → might be timeline
  const hasDateField = keys.some(k =>
    /date|time|when|created|updated|start|end/i.test(k)
  )
  const hasEventField = keys.some(k =>
    /event|title|name|description/i.test(k)
  )

  if (hasDateField && hasEventField) {
    return 'timeline'
  }

  // Check for mostly numeric data → might be good for chart, but table is safe
  const numericFields = keys.filter(k => typeof sample[k] === 'number')

  // Default to table for structured data
  return 'table'
}

/**
 * Select the best template based on message and data
 */
export function selectTemplate(
  message: string,
  data?: unknown
): TemplateType | null {
  // First, check for explicit intent
  const intent = detectTemplateIntent(message)
  if (intent.detected && intent.template) {
    return intent.template
  }

  // If data is provided, infer from structure
  if (data) {
    return inferTemplateFromData(data)
  }

  return null
}

/**
 * Check if a message is requesting a game
 */
export function detectGameVariant(message: string): 'tic-tac-toe' | 'memory' | 'quiz' | null {
  const normalizedMessage = message.toLowerCase()

  if (/tic[\s-]?tac[\s-]?toe|tictactoe/i.test(normalizedMessage)) {
    return 'tic-tac-toe'
  }

  if (/memory\s+game/i.test(normalizedMessage)) {
    return 'memory'
  }

  if (/quiz/i.test(normalizedMessage)) {
    return 'quiz'
  }

  return null
}
