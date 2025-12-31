/**
 * Constitutional Wrapper - Real Implementation with Error Recovery
 *
 * Wraps @osqr/core Constitutional module for oscar-app integration.
 * Provides input/output validation with graceful error handling.
 *
 * ERROR RECOVERY: On any error, fails OPEN (allows request) with logging.
 */

import { featureFlags } from './config';
import { Constitutional } from '@osqr/core';

// Extract types from the namespace
type RequestContext = Parameters<typeof Constitutional.validateIntent>[1];
type ResponseContext = Parameters<typeof Constitutional.validateOutput>[1];
type GatekeeperResult = Awaited<ReturnType<typeof Constitutional.validateIntent>>;
type OutputValidatorResult = Awaited<ReturnType<typeof Constitutional.validateOutput>>;

export interface ConstitutionalCheckResult {
  allowed: boolean;
  reason?: string;
  violations?: Array<{
    type: string;
    clauseId: string;
    severity: string;
  }>;
  sanitizedInput?: string;
  suggestedRevision?: string;
}

/**
 * Log violation to console (and optionally to DB in the future)
 */
function logConstitutionalViolation(
  type: string,
  userId: string,
  input: string,
  violations: Array<{ type: string; clauseId: string; severity: string }>
): void {
  if (featureFlags.logConstitutionalViolations) {
    console.warn('[Constitutional] Violation detected:', {
      type,
      userId: userId.substring(0, 8) + '...', // Truncate for privacy
      violationCount: violations.length,
      violations: violations.map(v => ({ type: v.type, clauseId: v.clauseId })),
      inputPreview: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString(),
    });
  }
  // TODO: Add DB logging via Prisma when ready
  // await prisma.constitutionalViolation.create({ ... })
}

/**
 * Check user input for constitutional violations.
 *
 * Validates against:
 * - User Data Sovereignty (cross-user data access)
 * - Identity Transparency (hiding AI identity)
 * - Baseline Honesty (requests to lie/deceive)
 * - Prompt Injection patterns
 * - Cross-tool chaining attempts
 */
export async function checkInput(
  input: string,
  userId: string,
  options?: { sessionId?: string; requestId?: string }
): Promise<ConstitutionalCheckResult> {
  // Feature flag check - bypass if disabled
  if (!featureFlags.enableConstitutionalValidation) {
    return { allowed: true };
  }

  try {
    // Quick screen first for performance
    if (!Constitutional.quickScreenInput(input)) {
      // Failed quick screen - run full validation
      const context: RequestContext = {
        userId,
        requestId: options?.requestId || crypto.randomUUID(),
        conversationId: options?.sessionId || '',
        previousToolCalls: [],
      };

      const result = await Constitutional.validateIntent(input, context);

      if (!result.allowed) {
        const violations = result.violations.map(v => ({
          type: v.violationType,
          clauseId: v.clauseId || 'UNKNOWN',
          severity: v.action === 'SILENT_INTERCEPT' ? 'high' : 'medium',
        }));

        // Log the violation
        logConstitutionalViolation('INPUT_BLOCKED', userId, input, violations);

        return {
          allowed: false,
          reason: getDeclineMessage(result.violations[0]?.violationType),
          violations,
        };
      }

      return {
        allowed: true,
        sanitizedInput: result.sanitizedInput,
      };
    }

    // Passed quick screen - run full validation for comprehensive check
    const context: RequestContext = {
      userId,
      requestId: options?.requestId || crypto.randomUUID(),
      conversationId: options?.sessionId || '',
      previousToolCalls: [],
    };

    const result = await Constitutional.validateIntent(input, context);

    if (!result.allowed) {
      const violations = result.violations.map(v => ({
        type: v.violationType,
        clauseId: v.clauseId || 'UNKNOWN',
        severity: v.action === 'SILENT_INTERCEPT' ? 'high' : 'medium',
      }));

      // Log the violation
      logConstitutionalViolation('INPUT_BLOCKED', userId, input, violations);

      return {
        allowed: false,
        reason: getDeclineMessage(result.violations[0]?.violationType),
        violations,
      };
    }

    return {
      allowed: true,
      sanitizedInput: result.sanitizedInput,
    };
  } catch (error) {
    // Fail OPEN - allow the request but log the error
    console.error('[Constitutional] Error during input validation:', error);

    // Log the error for monitoring
    if (featureFlags.logConstitutionalViolations) {
      console.error('[Constitutional] Failing OPEN due to error:', {
        userId: userId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }

    return { allowed: true };
  }
}

/**
 * Check model output for constitutional violations.
 *
 * Validates against:
 * - Identity Masking (claiming to be human or other AI)
 * - Baseline Honesty (overclaiming certainty, etc.)
 * - Data Leakage (exposing other users' data)
 */
export async function checkOutput(
  output: string,
  originalInput: string,
  userId: string
): Promise<ConstitutionalCheckResult> {
  // Feature flag check - bypass if disabled
  if (!featureFlags.enableConstitutionalValidation) {
    return { allowed: true };
  }

  try {
    // Quick screen first for performance
    if (!Constitutional.quickScreenOutput(output)) {
      // Failed quick screen - definitely a violation
      const violations = [{
        type: 'OUTPUT_VIOLATION',
        clauseId: 'IDENTITY_TRANSPARENCY',
        severity: 'high',
      }];

      logConstitutionalViolation('OUTPUT_BLOCKED', userId, output, violations);

      return {
        allowed: false,
        reason: Constitutional.GRACEFUL_DECLINES.IDENTITY_MASKING,
        violations,
      };
    }

    // Run full output validation
    const context: ResponseContext = {
      userId,
      requestId: crypto.randomUUID(),
      conversationId: '',
      honestyTier: 'BASE',
      originalInput,
    };

    const result = await Constitutional.validateOutput(output, context);

    if (!result.valid) {
      const violations = result.violations.map(v => ({
        type: v.violationType,
        clauseId: v.clauseId || 'UNKNOWN',
        severity: v.action === 'SILENT_INTERCEPT' ? 'high' : 'medium',
      }));

      logConstitutionalViolation('OUTPUT_BLOCKED', userId, output, violations);

      return {
        allowed: false,
        reason: getDeclineMessage(result.violations[0]?.violationType),
        violations,
        suggestedRevision: result.sanitizedOutput,
      };
    }

    // Output valid - return sanitized version if available
    return {
      allowed: true,
      sanitizedInput: result.sanitizedOutput,
    };
  } catch (error) {
    // Fail OPEN - allow the output but log the error
    console.error('[Constitutional] Error during output validation:', error);

    if (featureFlags.logConstitutionalViolations) {
      console.error('[Constitutional] Failing OPEN due to error:', {
        userId: userId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }

    return { allowed: true };
  }
}

/**
 * Get a user-friendly decline message based on violation type.
 */
export function getDeclineMessage(violationType?: string): string {
  switch (violationType) {
    case 'DATA_ACCESS_ATTEMPT':
      return Constitutional.GRACEFUL_DECLINES.DATA_SOVEREIGNTY;

    case 'IDENTITY_MASKING_ATTEMPT':
      return Constitutional.GRACEFUL_DECLINES.IDENTITY_MASKING;

    case 'CAPABILITY_EXCEEDED':
      return Constitutional.GRACEFUL_DECLINES.CAPABILITY_EXCEEDED;

    case 'CROSS_TOOL_CHAINING':
      return Constitutional.GRACEFUL_DECLINES.CROSS_TOOL_CHAINING;

    case 'PROMPT_INJECTION':
      return "I noticed something unusual in that request. Could you rephrase what you're looking for?";

    case 'HONESTY_BYPASS_ATTEMPT':
      return "I need to be honest and transparent in my responses. I can't help with requests to be misleading.";

    default:
      return "I'm unable to help with that request.";
  }
}
