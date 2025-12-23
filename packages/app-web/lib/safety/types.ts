/**
 * Safety System Type Definitions
 *
 * @see docs/SAFETY_SYSTEM.md
 */

// =============================================================================
// CRISIS DETECTION TYPES
// =============================================================================

/**
 * Crisis severity levels
 * - none: No crisis signals detected
 * - low: Mild distress signals (hopelessness language)
 * - high: Significant distress signals (self-harm ideation)
 * - critical: Explicit crisis signals (suicide intent)
 */
export type CrisisLevel = 'none' | 'low' | 'high' | 'critical'

/**
 * Result from crisis detection analysis
 */
export interface CrisisDetectionResult {
  /** Detected crisis severity level */
  level: CrisisLevel
  /** Pattern matches that triggered detection */
  signals: string[]
  /** Whether OSQR should intervene with crisis response */
  shouldIntervene: boolean
  /** Whether to skip storing this message */
  shouldSkipStorage: boolean
  /** Confidence score (0-1) */
  confidence: number
}

// =============================================================================
// SAFETY RESPONSE TYPES
// =============================================================================

/**
 * Safety response levels (graduated response system)
 * 0 = Normal response
 * 1 = Response + soft disclaimer
 * 2 = Response + strong disclaimer
 * 3 = Crisis response (empathy + resources)
 * 4 = Hard decline (harmful intent)
 */
export type SafetyResponseLevel = 0 | 1 | 2 | 3 | 4

/**
 * Categories that trigger disclaimers
 */
export type DisclaimerCategory = 'medical' | 'legal' | 'financial'

/**
 * Disclaimer strength levels
 */
export type DisclaimerStrength = 'soft' | 'strong'

/**
 * Result from safety wrapper processing
 */
export interface SafetyWrapperResult {
  /** The (possibly modified) response content */
  content: string
  /** Whether the response was modified */
  wasModified: boolean
  /** Type of modification applied */
  modificationType: 'none' | 'disclaimer_added' | 'refusal_wrapped' | 'crisis_response'
  /** Original response (if modified) */
  originalContent?: string
}

// =============================================================================
// SAFETY CHECK RESULT
// =============================================================================

/**
 * Complete safety check result for a user message
 */
export interface SafetyCheckResult {
  /** Crisis detection results */
  crisis: CrisisDetectionResult
  /** Whether to proceed with normal OSQR flow */
  proceedWithNormalFlow: boolean
  /** Pre-built response if intervention needed */
  interventionResponse?: string
  /** Metadata for logging (without sensitive content) */
  metadata: {
    checkPerformed: boolean
    interventionTriggered: boolean
    responseLevel: SafetyResponseLevel
    timestamp: Date
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Safety system configuration
 */
export interface SafetyConfig {
  /** Enable crisis detection */
  crisisDetectionEnabled: boolean
  /** Enable refusal wrapping */
  refusalWrappingEnabled: boolean
  /** Enable disclaimer system */
  disclaimersEnabled: boolean
  /** Log safety events (metadata only, never content) */
  logSafetyEvents: boolean
}

/**
 * Default safety configuration
 */
export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  crisisDetectionEnabled: true,
  refusalWrappingEnabled: true,
  disclaimersEnabled: true,
  logSafetyEvents: true,
}
