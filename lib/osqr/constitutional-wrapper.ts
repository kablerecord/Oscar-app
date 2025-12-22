/**
 * Constitutional Wrapper - Stub Implementation
 *
 * NOTE: @osqr/core package is not yet available.
 * This file provides stub implementations.
 */

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

export async function checkInput(
  _input: string,
  _userId: string,
  _options?: { sessionId?: string; requestId?: string }
): Promise<ConstitutionalCheckResult> {
  if (!featureFlags.enableConstitutionalValidation) {
    return { allowed: true };
  }
  // Stub: always allow
  return { allowed: true };
}

export async function checkOutput(
  _output: string,
  _originalInput: string,
  _userId: string
): Promise<ConstitutionalCheckResult> {
  if (!featureFlags.enableConstitutionalValidation) {
    return { allowed: true };
  }
  // Stub: always allow
  return { allowed: true };
}

export function getDeclineMessage(_violationType?: string): string {
  return "I'm unable to help with that request.";
}
