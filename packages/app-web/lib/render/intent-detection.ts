/**
 * Render Intent Detection
 * Detects when a user message requests a render operation
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import { RenderIntent, RENDER_TRIGGERS } from './types'

/**
 * Detect render intent from a user message
 * v1.5: Explicit triggers only (no fuzzy detection)
 */
export function detectRenderIntent(message: string): RenderIntent {
  const normalizedMessage = message.trim()

  // Check for image triggers
  for (const pattern of RENDER_TRIGGERS.image) {
    const match = normalizedMessage.match(pattern)
    if (match) {
      return {
        detected: true,
        type: 'image',
        confidence: 'explicit',
        trigger: match[0],
      }
    }
  }

  // Check for chart triggers
  for (const pattern of RENDER_TRIGGERS.chart) {
    const match = normalizedMessage.match(pattern)
    if (match) {
      return {
        detected: true,
        type: 'chart',
        confidence: 'explicit',
        trigger: match[0],
      }
    }
  }

  // No render intent detected
  return {
    detected: false,
    type: null,
    confidence: null,
  }
}

/**
 * Detect if a message is an iteration request on an existing artifact
 * e.g., "make it more colorful", "add April data", "change to bar chart"
 */
export function detectIterationIntent(message: string): {
  isIteration: boolean
  iterationType: 'image' | 'chart' | null
} {
  const normalizedMessage = message.toLowerCase().trim()

  // Image iteration patterns
  const imageIterationPatterns = [
    /^make (?:it|the image|this) .*/,
    /^change (?:the )?(?:image|picture|colors?|style)/,
    /^add .* to (?:the )?(?:image|picture)/,
    /^remove .* from (?:the )?(?:image|picture)/,
    /^more (?:colorful|detailed|simple|bright|dark)/,
    /^less (?:colorful|detailed|busy|bright|dark)/,
  ]

  for (const pattern of imageIterationPatterns) {
    if (pattern.test(normalizedMessage)) {
      return { isIteration: true, iterationType: 'image' }
    }
  }

  // Chart iteration patterns
  const chartIterationPatterns = [
    /^make (?:it|the chart|this) a? ?(?:bar|line|area) (?:chart|graph)/,
    /^change (?:to|it to) (?:a )?(?:bar|line|area)/,
    /^add (?:the )?(?:data|point|entry|row)/,
    /^update (?:the )?(?:title|label)/,
    /^show (?:the )?(?:legend|grid)/,
    /^hide (?:the )?(?:legend|grid)/,
    /^change (?:the )?(?:title|x-?axis|y-?axis)/,
  ]

  for (const pattern of chartIterationPatterns) {
    if (pattern.test(normalizedMessage)) {
      return { isIteration: true, iterationType: 'chart' }
    }
  }

  return { isIteration: false, iterationType: null }
}

/**
 * Extract the prompt from a render intent message
 * Strips the trigger phrase and returns the core request
 */
export function extractRenderPrompt(message: string, intent: RenderIntent): string {
  if (!intent.detected || !intent.trigger) {
    return message
  }

  // Remove the trigger phrase
  let prompt = message.replace(intent.trigger, '').trim()

  // Clean up common filler words at the start
  prompt = prompt.replace(/^(?:me\s+)?(?:a|an|the)\s+/i, '')

  // Remove trailing punctuation
  prompt = prompt.replace(/[.!?]+$/, '')

  return prompt.trim()
}

/**
 * Determine the best size for an image based on the prompt
 */
export function inferImageSize(
  prompt: string
): '1024x1024' | '1792x1024' | '1024x1792' {
  const lowercasePrompt = prompt.toLowerCase()

  // Wide/landscape indicators
  const widePatterns = [
    /landscape/,
    /panorama/,
    /wide/,
    /banner/,
    /header/,
    /desktop.*background/,
    /horizon/,
  ]

  for (const pattern of widePatterns) {
    if (pattern.test(lowercasePrompt)) {
      return '1792x1024'
    }
  }

  // Tall/portrait indicators
  const tallPatterns = [
    /portrait/,
    /tall/,
    /vertical/,
    /phone.*(?:background|wallpaper)/,
    /mobile/,
    /standing/,
    /full.?body/,
  ]

  for (const pattern of tallPatterns) {
    if (pattern.test(lowercasePrompt)) {
      return '1024x1792'
    }
  }

  // Default to square
  return '1024x1024'
}

/**
 * Infer chart type from natural language
 */
export function inferChartType(message: string): 'line' | 'bar' | 'area' {
  const lowercaseMessage = message.toLowerCase()

  if (
    lowercaseMessage.includes('bar chart') ||
    lowercaseMessage.includes('bar graph') ||
    lowercaseMessage.includes('histogram')
  ) {
    return 'bar'
  }

  if (
    lowercaseMessage.includes('area chart') ||
    lowercaseMessage.includes('area graph') ||
    lowercaseMessage.includes('filled')
  ) {
    return 'area'
  }

  // Default to line (founder preference from spec)
  return 'line'
}
