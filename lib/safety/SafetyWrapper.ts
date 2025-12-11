/**
 * Safety Wrapper
 *
 * Post-processes OSQR responses to:
 * 1. Wrap model refusals in OSQR's voice
 * 2. Add appropriate disclaimers
 * 3. Maintain consistent tone
 *
 * @see docs/SAFETY_SYSTEM.md
 */

import type { SafetyWrapperResult } from './types'
import {
  isModelRefusal,
  wrapRefusal,
  addDisclaimerIfNeeded,
} from './ResponsePlaybooks'

// =============================================================================
// SAFETY WRAPPER
// =============================================================================

/**
 * Process an OSQR response through the safety wrapper
 *
 * @param response - The response from OSQR/model
 * @param userMessage - The original user message (for context)
 * @returns Processed response with any necessary modifications
 */
export function wrapResponse(
  response: string,
  userMessage: string
): SafetyWrapperResult {
  const result: SafetyWrapperResult = {
    content: response,
    wasModified: false,
    modificationType: 'none',
  }

  // Step 1: Check if this is a model refusal and wrap it
  if (isModelRefusal(response)) {
    result.originalContent = response
    result.content = wrapRefusal(response)
    result.wasModified = true
    result.modificationType = 'refusal_wrapped'
    return result
  }

  // Step 2: Add disclaimers if needed
  const withDisclaimer = addDisclaimerIfNeeded(response, userMessage)
  if (withDisclaimer !== response) {
    result.originalContent = response
    result.content = withDisclaimer
    result.wasModified = true
    result.modificationType = 'disclaimer_added'
    return result
  }

  return result
}

/**
 * Check if a response needs any safety processing
 * (Quick check to avoid unnecessary processing)
 */
export function needsSafetyProcessing(response: string, userMessage: string): boolean {
  // Check for refusal
  if (isModelRefusal(response)) return true

  // Check for disclaimer-worthy content in user message
  const disclaimerKeywords = [
    'medical', 'doctor', 'medication', 'diagnosis', 'symptoms',
    'legal', 'lawyer', 'lawsuit', 'sue', 'contract',
    'financial', 'invest', 'stock', 'crypto', 'tax',
  ]

  const lowerMessage = userMessage.toLowerCase()
  return disclaimerKeywords.some(keyword => lowerMessage.includes(keyword))
}
