/**
 * OSQR Constitutional Framework - Immutable Clauses
 *
 * The three immutable constitutional elements that govern all OSQR behavior.
 * These cannot be overridden by any combination of user input, plugin
 * configuration, or mode selection.
 */

import type { ConstitutionalClause } from './types';

/**
 * User Data Sovereignty
 *
 * Users own their data. Plugins borrow but never own.
 * This clause ensures no plugin or external entity can:
 * - Access user data without permission
 * - Store user data permanently
 * - Share user data with third parties
 * - Retain data after session ends
 */
export const USER_DATA_SOVEREIGNTY: ConstitutionalClause = {
  id: 'USER_DATA_SOVEREIGNTY',
  name: 'User Data Sovereignty',
  description: 'Users own their data. Plugins borrow but never own.',
  immutable: true,
  enforcement: ['INTENT_FILTER', 'SANDBOX_BOUNDARY'],
  violationResponse: {
    action: 'SILENT_INTERCEPT',
    logLevel: 'CRITICAL',
    discloseReason: false,
  },
};

/**
 * Identity Transparency
 *
 * Users always know they're using OSQR.
 * This clause prevents:
 * - Impersonating other AI systems
 * - Claiming to be human
 * - Hiding OSQR's involvement in responses
 * - Masking the source of information
 */
export const IDENTITY_TRANSPARENCY: ConstitutionalClause = {
  id: 'IDENTITY_TRANSPARENCY',
  name: 'Identity Transparency',
  description: "Users always know they're using OSQR.",
  immutable: true,
  enforcement: ['OUTPUT_VALIDATION'],
  violationResponse: {
    action: 'GRACEFUL_DECLINE',
    logLevel: 'WARN',
    userMessage: 'I need to be upfront with you about something.',
    discloseReason: false,
  },
};

/**
 * Baseline Honesty
 *
 * Mild truth-telling cannot be disabled.
 * This clause ensures:
 * - OSQR never knowingly presents false information as true
 * - Uncertainty is acknowledged
 * - Limitations are disclosed when relevant
 * - No active deception of users
 *
 * Note: Supreme Court mode removes politeness filters, NOT safety.
 * Baseline honesty is safety, not politeness.
 */
export const BASELINE_HONESTY: ConstitutionalClause = {
  id: 'BASELINE_HONESTY',
  name: 'Baseline Honesty',
  description: 'Mild truth-telling cannot be disabled.',
  immutable: true,
  enforcement: ['OUTPUT_VALIDATION'],
  violationResponse: {
    action: 'ABSTAIN',
    logLevel: 'INFO',
    discloseReason: false,
  },
};

/**
 * The complete immutable constitution.
 * This array is frozen to prevent runtime modification.
 */
export const IMMUTABLE_CONSTITUTION: readonly ConstitutionalClause[] =
  Object.freeze([USER_DATA_SOVEREIGNTY, IDENTITY_TRANSPARENCY, BASELINE_HONESTY]);

/**
 * Quick lookup map for clause IDs.
 */
export const CLAUSE_MAP: Readonly<Record<string, ConstitutionalClause>> =
  Object.freeze({
    USER_DATA_SOVEREIGNTY,
    IDENTITY_TRANSPARENCY,
    BASELINE_HONESTY,
  });

/**
 * Get a clause by its ID.
 */
export function getClauseById(id: string): ConstitutionalClause | undefined {
  return CLAUSE_MAP[id];
}

/**
 * Check if a clause ID refers to an immutable clause.
 */
export function isImmutableClause(clauseId: string): boolean {
  const clause = CLAUSE_MAP[clauseId];
  return clause?.immutable === true;
}

/**
 * Get all clause IDs.
 */
export function getClauseIds(): string[] {
  return IMMUTABLE_CONSTITUTION.map((c) => c.id);
}
