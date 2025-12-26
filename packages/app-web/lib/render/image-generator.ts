/**
 * Image Generator Service
 * Handles DALL-E 3 image generation
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import OpenAI from 'openai'
import { ImageArtifactContent, RenderImageInput, RENDER_ERRORS, RenderError } from './types'

// Lazy initialization
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

export interface ImageGenerationResult {
  success: true
  content: ImageArtifactContent
  latencyMs: number
}

export interface ImageGenerationError {
  success: false
  error: RenderError
  latencyMs: number
}

export type ImageGenerationResponse = ImageGenerationResult | ImageGenerationError

/**
 * Generate an image using DALL-E 3
 */
export async function generateImage(
  input: RenderImageInput
): Promise<ImageGenerationResponse> {
  const startTime = Date.now()
  const { prompt, size = '1024x1024', style = 'vivid' } = input

  try {
    const openai = getOpenAI()

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size,
      style,
      quality: 'standard',
      n: 1,
    })

    const latencyMs = Date.now() - startTime
    const imageData = response.data?.[0]

    if (!imageData?.url) {
      return {
        success: false,
        error: RENDER_ERRORS.UNKNOWN,
        latencyMs,
      }
    }

    const content: ImageArtifactContent = {
      type: 'image',
      prompt,
      revisedPrompt: imageData.revised_prompt || undefined,
      model: 'dall-e-3',
      size,
      imageUrl: imageData.url,
      style,
    }

    return {
      success: true,
      content,
      latencyMs,
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const renderError = mapOpenAIError(error)

    console.error('DALL-E generation error:', error)

    return {
      success: false,
      error: renderError,
      latencyMs,
    }
  }
}

/**
 * Map OpenAI errors to our RenderError format
 */
function mapOpenAIError(error: unknown): RenderError {
  if (error instanceof OpenAI.APIError) {
    // Rate limit
    if (error.status === 429) {
      return RENDER_ERRORS.RATE_LIMIT
    }

    // Content policy violation
    if (error.code === 'content_policy_violation' || error.status === 400) {
      if (error.message?.includes('content policy')) {
        return RENDER_ERRORS.CONTENT_POLICY
      }
      return RENDER_ERRORS.INVALID_PROMPT
    }

    // Timeout
    if (error.code === 'timeout' || error.message?.includes('timeout')) {
      return RENDER_ERRORS.API_TIMEOUT
    }
  }

  return RENDER_ERRORS.UNKNOWN
}

/**
 * Simplify an image prompt for retry
 * Removes complex details while keeping core concept
 */
export function simplifyImagePrompt(prompt: string): string {
  // Remove specific style instructions
  let simplified = prompt
    .replace(/\b(in the style of|styled like|with|featuring|detailed|intricate|complex)\b.*?(,|\.|\band\b)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // If still too long, truncate
  if (simplified.length > 500) {
    simplified = simplified.slice(0, 500)
    // Try to end at a natural break
    const lastPeriod = simplified.lastIndexOf('.')
    const lastComma = simplified.lastIndexOf(',')
    const breakPoint = Math.max(lastPeriod, lastComma)
    if (breakPoint > 200) {
      simplified = simplified.slice(0, breakPoint + 1)
    }
  }

  return simplified
}

/**
 * Refine a prompt for iteration
 * Combines original prompt with modification request
 */
export function refineImagePrompt(
  originalPrompt: string,
  modification: string
): string {
  // Common modification patterns
  const modificationPatterns = [
    /make it (more )?(.*)/i,
    /change (?:the )?(.*) to (.*)/i,
    /add (.*)/i,
    /remove (.*)/i,
    /make (?:the )?(.*)/i,
  ]

  // Try to apply modification intelligently
  for (const pattern of modificationPatterns) {
    const match = modification.match(pattern)
    if (match) {
      // For "make it more X" - append to prompt
      if (pattern.source.includes('make it')) {
        return `${originalPrompt}, ${modification}`
      }
      // For specific changes, prepend as instruction
      return `${modification}. Original: ${originalPrompt}`
    }
  }

  // Default: combine both
  return `${originalPrompt}. ${modification}`
}
