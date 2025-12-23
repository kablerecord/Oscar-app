/**
 * OSQR Constitutional Framework - Audit Logging
 *
 * Handles logging of constitutional violations for audit trail and analysis.
 * All violations are logged with full context for security review.
 */

import type {
  ViolationLogEntry,
  ViolationType,
  ViolationSource,
  ViolationResponse,
  EnforcementMechanism,
  ConstitutionalViolationEvent,
} from '../types';
import { getClauseById } from '../clauses';

// ============================================================================
// Configuration
// ============================================================================

/** Maximum length for input snippets in logs (prevent log bloat) */
const MAX_SNIPPET_LENGTH = 200;

/** Characters to redact from snippets */
const REDACTION_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit cards
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, // SSN
];

// ============================================================================
// In-Memory Store (Replace with persistent storage in production)
// ============================================================================

interface AuditStore {
  violations: ViolationLogEntry[];
  listeners: Array<(event: ConstitutionalViolationEvent) => void>;
}

const store: AuditStore = {
  violations: [],
  listeners: [],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate ISO 8601 timestamp.
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Sanitize input snippet for logging (redact PII, truncate).
 */
function sanitizeSnippet(input: string): string {
  let sanitized = input;

  // Redact sensitive patterns
  for (const pattern of REDACTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // Truncate if too long
  if (sanitized.length > MAX_SNIPPET_LENGTH) {
    sanitized = sanitized.substring(0, MAX_SNIPPET_LENGTH) + '...[truncated]';
  }

  return sanitized;
}

// ============================================================================
// Core Logging Functions
// ============================================================================

/**
 * Create a violation log entry.
 */
export function createViolationEntry(
  violationType: ViolationType,
  sourceType: ViolationSource,
  detectionMethod: EnforcementMechanism,
  sourceId?: string,
  inputSnippet?: string,
  requestId: string = 'unknown',
  userId: string = 'unknown',
  clauseViolated?: string
): ViolationLogEntry {
  // Determine clause ID from violation type if not provided
  const resolvedClauseId =
    clauseViolated ?? inferClauseFromViolationType(violationType);

  // Get the violation response from the clause
  const clause = getClauseById(resolvedClauseId);
  const action: ViolationResponse['action'] =
    clause?.violationResponse.action ?? 'GRACEFUL_DECLINE';

  return {
    timestamp: getTimestamp(),
    requestId,
    userId,
    clauseViolated: resolvedClauseId,
    violationType,
    sourceType,
    sourceId,
    action,
    context: {
      inputSnippet: inputSnippet ? sanitizeSnippet(inputSnippet) : undefined,
      detectionMethod,
    },
  };
}

/**
 * Infer which clause was violated based on violation type.
 */
function inferClauseFromViolationType(violationType: ViolationType): string {
  switch (violationType) {
    case 'DATA_ACCESS_ATTEMPT':
      return 'USER_DATA_SOVEREIGNTY';
    case 'IDENTITY_MASKING_ATTEMPT':
      return 'IDENTITY_TRANSPARENCY';
    case 'HONESTY_BYPASS_ATTEMPT':
      return 'BASELINE_HONESTY';
    case 'CAPABILITY_EXCEEDED':
    case 'NAMESPACE_SPOOFING':
      return 'USER_DATA_SOVEREIGNTY'; // Plugin boundary violations
    case 'PROMPT_INJECTION':
    case 'CROSS_TOOL_CHAINING':
      return 'USER_DATA_SOVEREIGNTY'; // Security violations default to data protection
    default:
      return 'UNKNOWN';
  }
}

/**
 * Log a violation to the audit store.
 */
export async function logViolation(
  violation: ViolationLogEntry
): Promise<void> {
  // Store the violation
  store.violations.push(violation);

  // Emit event to listeners
  const event: ConstitutionalViolationEvent = {
    eventType: 'CONSTITUTIONAL_VIOLATION',
    violation,
    handled: true,
  };

  for (const listener of store.listeners) {
    try {
      listener(event);
    } catch (error) {
      // Don't let listener errors affect logging
      console.error('[AuditLog] Listener error:', error);
    }
  }

  // Log to console based on severity
  const logFn =
    violation.action === 'SILENT_INTERCEPT' ? console.error : console.warn;

  logFn(
    `[Constitutional Violation] ${violation.clauseViolated}:`,
    JSON.stringify(
      {
        type: violation.violationType,
        source: violation.sourceType,
        method: violation.context.detectionMethod,
        timestamp: violation.timestamp,
      },
      null,
      2
    )
  );
}

/**
 * Log an error during constitutional processing.
 */
export async function logError(
  error: unknown,
  sourceId?: string
): Promise<void> {
  console.error('[Constitutional Error]', {
    error: error instanceof Error ? error.message : String(error),
    sourceId,
    timestamp: getTimestamp(),
  });
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all violations for a user.
 */
export function getViolationsByUser(userId: string): ViolationLogEntry[] {
  return store.violations.filter((v) => v.userId === userId);
}

/**
 * Get all violations for a request.
 */
export function getViolationsByRequest(requestId: string): ViolationLogEntry[] {
  return store.violations.filter((v) => v.requestId === requestId);
}

/**
 * Get all violations of a specific type.
 */
export function getViolationsByType(
  violationType: ViolationType
): ViolationLogEntry[] {
  return store.violations.filter((v) => v.violationType === violationType);
}

/**
 * Get all violations for a specific clause.
 */
export function getViolationsByClause(clauseId: string): ViolationLogEntry[] {
  return store.violations.filter((v) => v.clauseViolated === clauseId);
}

/**
 * Get violations within a time range.
 */
export function getViolationsInRange(
  startTime: Date,
  endTime: Date
): ViolationLogEntry[] {
  const start = startTime.toISOString();
  const end = endTime.toISOString();
  return store.violations.filter(
    (v) => v.timestamp >= start && v.timestamp <= end
  );
}

/**
 * Get violation count by type (for analytics).
 */
export function getViolationCounts(): Record<ViolationType, number> {
  const counts: Record<string, number> = {};

  for (const violation of store.violations) {
    counts[violation.violationType] =
      (counts[violation.violationType] || 0) + 1;
  }

  return counts as Record<ViolationType, number>;
}

/**
 * Get all stored violations.
 */
export function getAllViolations(): ViolationLogEntry[] {
  return [...store.violations];
}

/**
 * Get total violation count.
 */
export function getViolationCount(): number {
  return store.violations.length;
}

// ============================================================================
// Event Subscription
// ============================================================================

/**
 * Subscribe to violation events.
 */
export function onViolation(
  callback: (event: ConstitutionalViolationEvent) => void
): () => void {
  store.listeners.push(callback);

  // Return unsubscribe function
  return () => {
    const index = store.listeners.indexOf(callback);
    if (index > -1) {
      store.listeners.splice(index, 1);
    }
  };
}

// ============================================================================
// Maintenance Functions
// ============================================================================

/**
 * Clear old violations (for retention policy).
 * @param retentionDays Number of days to keep violations
 */
export function pruneOldViolations(retentionDays: number = 90): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString();

  const initialCount = store.violations.length;
  store.violations = store.violations.filter((v) => v.timestamp >= cutoffStr);

  return initialCount - store.violations.length;
}

/**
 * Clear all violations (for testing).
 */
export function clearAllViolations(): void {
  store.violations = [];
}

/**
 * Export violations for external storage/analysis.
 */
export function exportViolations(): string {
  return JSON.stringify(store.violations, null, 2);
}

/**
 * Import violations from external storage.
 */
export function importViolations(json: string): number {
  const imported = JSON.parse(json) as ViolationLogEntry[];
  store.violations.push(...imported);
  return imported.length;
}
