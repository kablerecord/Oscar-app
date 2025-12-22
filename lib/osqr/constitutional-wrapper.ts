/**
 * Constitutional Wrapper for oscar-app API Routes
 *
 * Wraps the OSQR Constitutional Framework for use in Next.js API routes.
 * This provides input validation and output validation.
 */

import { Constitutional } from '@osqr/core';
import { featureFlags } from './config';

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
 * Check if user input is allowed by the Constitutional Framework.
 * This should be called at the start of every API route that processes user input.
 */
export async function checkInput(
  input: string,
  userId: string,
  options?: {
    sessionId?: string;
    requestId?: string;
  }
): Promise<ConstitutionalCheckResult> {
  // Skip if disabled
  if (!featureFlags.enableConstitutionalValidation) {
    return { allowed: true };
  }

  // Quick screen first (fast, heuristic-based) - returns boolean
  const quickPassed = Constitutional.quickScreenInput(input);
  if (!quickPassed) {
    if (featureFlags.logConstitutionalViolations) {
      console.log('[Constitutional] Quick screen blocked input');
    }
    return {
      allowed: false,
      reason: 'Input blocked by quick screen',
    };
  }

  // Full validation requires proper context
  const context = {
    userId,
    requestId: options?.requestId || `req_${Date.now()}`,
    conversationId: options?.sessionId || `conv_${Date.now()}`,
    honestyTier: 'BASE' as const,
  };

  try {
    const result = await Constitutional.validateIntent(input, context);

    if (!result.allowed) {
      if (featureFlags.logConstitutionalViolations) {
        console.log('[Constitutional] Full validation blocked, violations:', result.violations.length);
      }
      return {
        allowed: false,
        reason: 'Constitutional violation detected',
        violations: result.violations.map((v) => ({
          type: v.violationType,
          clauseId: v.clauseViolated || 'unknown',
          severity: v.sourceType,
        })),
      };
    }

    return {
      allowed: true,
      sanitizedInput: result.sanitizedInput,
    };
  } catch (error) {
    // On error, default to allowing (fail open for availability)
    console.error('[Constitutional] Validation error:', error);
    return { allowed: true };
  }
}

/**
 * Check if AI output is allowed by the Constitutional Framework.
 * This should be called before sending any AI response to the user.
 */
export async function checkOutput(
  output: string,
  originalInput: string,
  userId: string
): Promise<ConstitutionalCheckResult> {
  // Skip if disabled
  if (!featureFlags.enableConstitutionalValidation) {
    return { allowed: true };
  }

  // Quick screen first - returns boolean
  const quickPassed = Constitutional.quickScreenOutput(output);
  if (!quickPassed) {
    if (featureFlags.logConstitutionalViolations) {
      console.log('[Constitutional] Output quick screen blocked');
    }
    return {
      allowed: false,
      reason: 'Output blocked by quick screen',
    };
  }

  // Full validation requires proper context
  const context = {
    userId,
    requestId: `req_${Date.now()}`,
    conversationId: `conv_${Date.now()}`,
    honestyTier: 'BASE' as const,
    originalInput,
  };

  try {
    const result = await Constitutional.validateOutput(output, context);

    // Note: validateOutput returns { valid, sanitizedOutput, violations }
    if (!result.valid) {
      if (featureFlags.logConstitutionalViolations) {
        console.log('[Constitutional] Output validation blocked');
        result.violations.forEach((v) => Constitutional.logViolation(v));
      }
      return {
        allowed: false,
        reason: 'Constitutional violation in output',
        violations: result.violations.map((v) => ({
          type: v.violationType,
          clauseId: v.clauseViolated || 'unknown',
          severity: v.sourceType,
        })),
      };
    }

    return {
      allowed: true,
      suggestedRevision: result.sanitizedOutput,
    };
  } catch (error) {
    console.error('[Constitutional] Output validation error:', error);
    return { allowed: true };
  }
}

/**
 * Get a graceful decline message for a constitutional violation.
 */
export function getDeclineMessage(violationType?: string): string {
  switch (violationType) {
    case 'DATA_ACCESS_ATTEMPT':
    case 'DATA_EXFILTRATION_ATTEMPT':
    case 'UNAUTHORIZED_DATA_ACCESS':
      return Constitutional.GRACEFUL_DECLINES.DATA_SOVEREIGNTY;
    case 'IDENTITY_MASKING_ATTEMPT':
      return Constitutional.GRACEFUL_DECLINES.IDENTITY_MASKING;
    case 'CAPABILITY_EXCEEDED':
      return Constitutional.GRACEFUL_DECLINES.CAPABILITY_EXCEEDED;
    case 'PROMPT_INJECTION':
    case 'CROSS_TOOL_CHAINING':
      return Constitutional.GRACEFUL_DECLINES.CROSS_TOOL_CHAINING;
    default:
      return Constitutional.GRACEFUL_DECLINES.AMBIGUOUS_REQUEST;
  }
}
