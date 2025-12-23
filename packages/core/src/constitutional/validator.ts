/**
 * OSQR Constitutional Framework - Output Validator
 *
 * Post-execution validation of all outgoing responses.
 * Ensures outputs comply with constitutional requirements.
 */

import type {
  OutputValidatorResult,
  ResponseContext,
  PluginCapabilities,
  ViolationLogEntry,
} from './types';

import { createViolationEntry, logViolation } from './logging/audit';

// ============================================================================
// Configuration
// ============================================================================

/** Minimum honesty score threshold (0-1) */
const BASELINE_HONESTY_THRESHOLD =
  parseFloat(process.env.OSQR_CONSTITUTION_HONESTY_THRESHOLD ?? '') || 0.6;

// ============================================================================
// Identity Transparency Detection
// ============================================================================

/**
 * Patterns that indicate the output is masking OSQR's identity.
 */
const IDENTITY_MASKING_OUTPUT_PATTERNS: RegExp[] = [
  // Claiming to be human
  /\bi('?m|\s+am)\s+(a\s+)?(human|person|real\s+person)/i,
  /\bi'?m\s+not\s+(an?\s+)?(ai|artificial|robot|bot|machine)/i,
  /\bas\s+a\s+(fellow\s+)?human/i,

  // Claiming to be other AI systems
  /\bi('?m|\s+am)\s+(chatgpt|gpt-4|gemini|bard|copilot|alexa|siri)/i,
  /\bthis\s+is\s+(chatgpt|gpt-4|gemini|bard|copilot)/i,

  // Denying being OSQR
  /\bi'?m\s+not\s+osqr/i,
  /\bi\s+am\s+not\s+osqr/i,
  /\bthis\s+is\s+not\s+osqr/i,
];

/**
 * Detect if output attempts to mask OSQR's identity.
 */
export function detectIdentityMasking(output: string): boolean {
  return IDENTITY_MASKING_OUTPUT_PATTERNS.some((pattern) => pattern.test(output));
}

// ============================================================================
// Honesty Evaluation
// ============================================================================

/**
 * Patterns that indicate potential dishonesty in output.
 */
const DISHONESTY_INDICATORS: Array<{ pattern: RegExp; weight: number }> = [
  // Presenting fiction as fact
  { pattern: /\bthis\s+is\s+(definitely|certainly|absolutely)\s+true/i, weight: 0.2 },
  { pattern: /\bi\s+(guarantee|promise)\s+this\s+is\s+(correct|accurate)/i, weight: 0.3 },

  // Hiding uncertainty
  { pattern: /\bthere\s+is\s+no\s+(doubt|question|uncertainty)/i, weight: 0.2 },
  { pattern: /\bi'?m\s+(100%|completely|totally)\s+(sure|certain)/i, weight: 0.15 },

  // Deflecting limitations
  { pattern: /\bi\s+(can|am\s+able\s+to)\s+do\s+anything/i, weight: 0.25 },
  { pattern: /\bi\s+(don'?t|never)\s+make\s+mistakes/i, weight: 0.3 },

  // Claiming impossible knowledge
  { pattern: /\bi\s+know\s+exactly\s+what\s+(will|is\s+going\s+to)\s+happen/i, weight: 0.25 },
  { pattern: /\bi\s+can\s+predict\s+the\s+future/i, weight: 0.35 },
];

/**
 * Honesty enhancers - patterns that indicate honest communication.
 */
const HONESTY_ENHANCERS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bi\s+(think|believe|understand)/i, weight: 0.1 },
  { pattern: /\b(may|might|could|possibly)/i, weight: 0.1 },
  { pattern: /\bi'?m\s+not\s+(sure|certain)/i, weight: 0.15 },
  { pattern: /\b(however|although|but)\s+i\s+should\s+note/i, weight: 0.1 },
  { pattern: /\bto\s+be\s+(honest|transparent|clear)/i, weight: 0.1 },
  { pattern: /\bi\s+(can'?t|cannot)\s+(guarantee|promise)/i, weight: 0.15 },
  { pattern: /\bas\s+an\s+ai/i, weight: 0.2 },
  { pattern: /\bmy\s+(knowledge|training)\s+(cutoff|limit)/i, weight: 0.15 },
];

/**
 * Evaluate honesty score of output.
 *
 * @param output - Model output to evaluate
 * @param context - Response context
 * @returns Honesty score 0-1 (higher = more honest)
 */
export function evaluateHonesty(output: string, context: ResponseContext): number {
  let score = 0.75; // Start at baseline

  // Apply dishonesty penalties
  for (const indicator of DISHONESTY_INDICATORS) {
    if (indicator.pattern.test(output)) {
      score -= indicator.weight;
    }
  }

  // Apply honesty bonuses
  for (const enhancer of HONESTY_ENHANCERS) {
    if (enhancer.pattern.test(output)) {
      score += enhancer.weight;
    }
  }

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, score));
}

/**
 * Apply baseline honesty corrections to output.
 * Adds hedging or disclaimers where needed.
 */
export function applyBaselineHonesty(output: string, context: ResponseContext): string {
  let corrected = output;

  // Replace absolute certainty claims with hedged versions
  corrected = corrected.replace(
    /\bi\s+(guarantee|promise)\s+this\s+is\s+(correct|accurate)/gi,
    'I believe this is correct, though you should verify'
  );

  corrected = corrected.replace(
    /\bthere\s+is\s+no\s+(doubt|question)/gi,
    'based on my understanding,'
  );

  corrected = corrected.replace(
    /\bi'?m\s+100%\s+(sure|certain)/gi,
    "I'm fairly confident"
  );

  // Add AI acknowledgment if it seems to be claiming human-like perfection
  if (/\bi\s+(don'?t|never)\s+make\s+mistakes/i.test(output)) {
    corrected = corrected.replace(
      /\bi\s+(don'?t|never)\s+make\s+mistakes/gi,
      'I aim to be accurate, though as an AI I can make mistakes'
    );
  }

  return corrected;
}

// ============================================================================
// Data Leakage Detection
// ============================================================================

/**
 * Detect if output contains data that belongs to other users.
 *
 * This is a heuristic check - it looks for patterns that suggest
 * the output contains cross-user data.
 */
export function detectDataLeakage(output: string, currentUserId: string): boolean {
  // Check for explicit user ID mentions (other than current user)
  const userIdPattern = /\buser[_\s]?id\s*[:=]\s*['"]?(\w+)['"]?/gi;
  let match;
  while ((match = userIdPattern.exec(output)) !== null) {
    if (match[1] !== currentUserId && match[1] !== 'current' && match[1] !== 'you') {
      return true;
    }
  }

  // Check for patterns suggesting bulk data exposure
  const bulkDataPatterns = [
    /\bhere\s+are\s+(all\s+)?(the\s+)?users/i,
    /\blist\s+of\s+(all\s+)?users/i,
    /\buser\s+\d+:\s+/i, // User 1: User 2: etc.
    /\[@\w+\].*\[@\w+\].*\[@\w+\]/i, // Multiple @mentions
  ];

  return bulkDataPatterns.some((p) => p.test(output));
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate model output before sending to user.
 *
 * This is the output validator that checks all responses against
 * constitutional requirements for identity transparency, baseline
 * honesty, and data sovereignty.
 *
 * @param output - Model output to validate
 * @param context - Response context
 * @param activePlugin - Active plugin (if any)
 * @returns Validation result with validity status and any violations
 */
export async function validateOutput(
  output: string,
  context: ResponseContext,
  activePlugin?: PluginCapabilities
): Promise<OutputValidatorResult> {
  const violations: ViolationLogEntry[] = [];
  let sanitizedOutput = output;

  // Check 1: Identity Transparency
  // Ensure output doesn't mask OSQR's identity
  if (detectIdentityMasking(output)) {
    const violation = createViolationEntry(
      'IDENTITY_MASKING_ATTEMPT',
      'MODEL_OUTPUT',
      'OUTPUT_VALIDATION',
      activePlugin?.pluginId,
      output.substring(0, 200),
      context.requestId,
      context.userId,
      'IDENTITY_TRANSPARENCY'
    );
    violations.push(violation);
    await logViolation(violation);
    return { valid: false, violations };
  }

  // Check 2: Baseline Honesty
  // Ensure output maintains minimum honesty threshold
  const honestyScore = evaluateHonesty(output, context);
  if (honestyScore < BASELINE_HONESTY_THRESHOLD) {
    const violation = createViolationEntry(
      'HONESTY_BYPASS_ATTEMPT',
      'MODEL_OUTPUT',
      'OUTPUT_VALIDATION',
      activePlugin?.pluginId,
      output.substring(0, 200),
      context.requestId,
      context.userId,
      'BASELINE_HONESTY'
    );
    violations.push(violation);
    await logViolation(violation);

    // Don't reject outright - apply honesty correction
    sanitizedOutput = applyBaselineHonesty(output, context);
  }

  // Check 3: Data Leakage
  // Ensure output doesn't expose other users' data
  if (detectDataLeakage(output, context.userId)) {
    const violation = createViolationEntry(
      'DATA_ACCESS_ATTEMPT',
      'MODEL_OUTPUT',
      'OUTPUT_VALIDATION',
      activePlugin?.pluginId,
      '[DATA REDACTED]',
      context.requestId,
      context.userId,
      'USER_DATA_SOVEREIGNTY'
    );
    violations.push(violation);
    await logViolation(violation);
    return { valid: false, violations };
  }

  // Check 4: Plugin-specific output restrictions
  if (activePlugin && !activePlugin.canModifyCommunicationStyle) {
    // If plugin can't modify style, ensure output matches expected patterns
    // This is a placeholder for more sophisticated style checking
  }

  return {
    valid:
      violations.length === 0 ||
      violations.every((v) => v.action !== 'SILENT_INTERCEPT'),
    sanitizedOutput,
    violations,
  };
}

/**
 * Quick check if output passes basic constitutional filters.
 */
export function quickScreenOutput(output: string): boolean {
  // Quick identity masking check
  if (detectIdentityMasking(output)) {
    return false;
  }

  // Quick data leakage indicators
  if (/\bhere\s+are\s+(all\s+)?(the\s+)?users/i.test(output)) {
    return false;
  }

  return true;
}

/**
 * Get a sanitized version of output suitable for error recovery.
 * Used when original output fails validation and we need a fallback.
 */
export function getSanitizedFallback(
  originalOutput: string,
  violationType: string
): string {
  switch (violationType) {
    case 'IDENTITY_MASKING_ATTEMPT':
      return "I'm OSQR, an AI assistant. I apologize for any confusion in my previous response.";

    case 'DATA_ACCESS_ATTEMPT':
      return "I can only access information related to your account. I can't share information about other users.";

    case 'HONESTY_BYPASS_ATTEMPT':
      return applyBaselineHonesty(originalOutput, {
        requestId: '',
        userId: '',
        conversationId: '',
        honestyTier: 'BASE',
        originalInput: '',
      });

    default:
      return "I apologize, but I can't provide that response. How else can I help you?";
  }
}
