/**
 * OSQR Safety System
 *
 * Protects users while preserving privacy, agency, and trust.
 *
 * Design Principles:
 * 1. Rely on model-level safety (Claude/GPT already decline harmful requests)
 * 2. Wrap refusals in OSQR's voice (maintain personality)
 * 3. Crisis requires empathy, not refusal (self-harm needs different handling)
 * 4. Don't over-filter (OSQR should be useful, not paranoid)
 * 5. Respect privacy (crisis content never stored)
 *
 * @see docs/SAFETY_SYSTEM.md
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  CrisisLevel,
  CrisisDetectionResult,
  SafetyResponseLevel,
  DisclaimerCategory,
  DisclaimerStrength,
  SafetyWrapperResult,
  SafetyCheckResult,
  SafetyConfig,
} from './types'

export { DEFAULT_SAFETY_CONFIG } from './types'

// =============================================================================
// COMPONENT EXPORTS
// =============================================================================

// Crisis Detection
export {
  detectCrisis,
  mightNeedCrisisCheck,
} from './CrisisDetector'

// Response Playbooks
export {
  CRISIS_RESPONSE,
  CRISIS_FOLLOWUP,
  getCrisisResponse,
  isModelRefusal,
  wrapRefusal,
  REFUSAL_WRAPPER,
  DISCLAIMERS,
  detectDisclaimerCategory,
  getDisclaimerStrength,
  getDisclaimer,
  addDisclaimerIfNeeded,
} from './ResponsePlaybooks'

// Safety Wrapper
export {
  wrapResponse,
  needsSafetyProcessing,
} from './SafetyWrapper'

// =============================================================================
// MAIN SAFETY CHECK FUNCTION
// =============================================================================

import type { SafetyCheckResult, SafetyConfig } from './types'
import { DEFAULT_SAFETY_CONFIG } from './types'
import { detectCrisis, mightNeedCrisisCheck } from './CrisisDetector'
import { getCrisisResponse } from './ResponsePlaybooks'

/**
 * Perform a complete safety check on a user message
 *
 * This is the main entry point for the safety system.
 * Call this BEFORE processing a message through OSQR.
 *
 * @param message - The user's message to check
 * @param config - Optional safety configuration overrides
 * @returns Safety check result with intervention response if needed
 *
 * @example
 * ```typescript
 * const safetyResult = performSafetyCheck(userMessage)
 *
 * if (!safetyResult.proceedWithNormalFlow) {
 *   // Return the intervention response immediately
 *   return { answer: safetyResult.interventionResponse, stored: false }
 * }
 *
 * // Continue with normal OSQR processing...
 * ```
 */
export function performSafetyCheck(
  message: string,
  config: Partial<SafetyConfig> = {}
): SafetyCheckResult {
  const fullConfig = { ...DEFAULT_SAFETY_CONFIG, ...config }

  // Default result: proceed normally
  const result: SafetyCheckResult = {
    crisis: {
      level: 'none',
      signals: [],
      shouldIntervene: false,
      shouldSkipStorage: false,
      confidence: 1.0,
    },
    proceedWithNormalFlow: true,
    metadata: {
      checkPerformed: true,
      interventionTriggered: false,
      responseLevel: 0,
      timestamp: new Date(),
    },
  }

  // Skip if crisis detection disabled
  if (!fullConfig.crisisDetectionEnabled) {
    result.metadata.checkPerformed = false
    return result
  }

  // Quick pre-filter (fast keyword check)
  if (!mightNeedCrisisCheck(message)) {
    return result
  }

  // Full crisis detection
  const crisisResult = detectCrisis(message)
  result.crisis = crisisResult

  // If intervention needed, prepare response
  if (crisisResult.shouldIntervene) {
    result.proceedWithNormalFlow = false
    result.interventionResponse = getCrisisResponse(crisisResult.level) || undefined
    result.metadata.interventionTriggered = true
    result.metadata.responseLevel = 3 // Crisis response level
  }

  return result
}

/**
 * Process an OSQR response through safety post-processing
 *
 * Call this AFTER getting a response from OSQR, BEFORE returning to user.
 *
 * @param response - The response from OSQR
 * @param userMessage - The original user message
 * @param config - Optional safety configuration overrides
 * @returns Processed response (possibly with wrapped refusals or disclaimers)
 *
 * @example
 * ```typescript
 * const osqrResponse = await OSQR.ask({ ... })
 * const safeResponse = processSafetyResponse(osqrResponse.answer, userMessage)
 * return { answer: safeResponse.content }
 * ```
 */
export function processSafetyResponse(
  response: string,
  userMessage: string,
  config: Partial<SafetyConfig> = {}
): { content: string; wasModified: boolean; skipStorage: boolean } {
  const fullConfig = { ...DEFAULT_SAFETY_CONFIG, ...config }

  let content = response
  let wasModified = false

  // Wrap model refusals in OSQR voice
  if (fullConfig.refusalWrappingEnabled) {
    const { wrapResponse } = require('./SafetyWrapper')
    const wrapped = wrapResponse(response, userMessage)
    if (wrapped.wasModified) {
      content = wrapped.content
      wasModified = true
    }
  }

  // Add disclaimers if needed
  if (fullConfig.disclaimersEnabled && !wasModified) {
    const { addDisclaimerIfNeeded } = require('./ResponsePlaybooks')
    const withDisclaimer = addDisclaimerIfNeeded(content, userMessage)
    if (withDisclaimer !== content) {
      content = withDisclaimer
      wasModified = true
    }
  }

  return {
    content,
    wasModified,
    skipStorage: false, // Response storage is always allowed; only crisis user messages are skipped
  }
}

// =============================================================================
// LOGGING UTILITIES (Metadata Only - Never Log Content)
// =============================================================================

/**
 * Log a safety event (metadata only, never content)
 *
 * This can be used for analytics to understand:
 * - How often crisis detection triggers
 * - False positive rates (if users provide feedback)
 * - Disclaimer frequency by category
 *
 * IMPORTANT: This function NEVER logs message content.
 */
export function logSafetyEvent(
  eventType: 'crisis_detected' | 'refusal_wrapped' | 'disclaimer_added',
  metadata: {
    level?: string
    category?: string
    confidence?: number
    timestamp?: Date
  }
): void {
  // In production, this would send to your analytics service
  // For now, just console log (can be disabled in production)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Safety] ${eventType}`, {
      ...metadata,
      timestamp: metadata.timestamp || new Date(),
    })
  }
}
