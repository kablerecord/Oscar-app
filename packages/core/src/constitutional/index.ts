/**
 * OSQR Constitutional Framework
 *
 * The governance layer that constrains all OSQR system behavior.
 * Enforces three unbreakable principles through runtime mechanisms.
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Enforcement
  EnforcementMechanism,

  // Violations
  ViolationType,
  ViolationResponse,
  ViolationSource,
  ViolationLogEntry,

  // Clauses
  ConstitutionalClause,

  // Plugins
  PluginCapabilities,

  // Gatekeeper
  GatekeeperResult,

  // Secondary Rules
  SecondaryRule,
  VersionControlledResolution,
  SecondaryRuleset,

  // Request/Response
  Message,
  ToolCall,
  HonestyTier,
  RequestSource,
  OSQRRequest,
  OSQRResponse,
  OutputValidatorResult,

  // Events
  ConstitutionalViolationEvent,
  RulesetModifiedEvent,
  ConstitutionalEvent,

  // Context
  RequestContext,
  ResponseContext,
} from './types';

// ============================================================================
// Immutable Constitution
// ============================================================================

export {
  // Individual clauses
  USER_DATA_SOVEREIGNTY,
  IDENTITY_TRANSPARENCY,
  BASELINE_HONESTY,

  // Collections
  IMMUTABLE_CONSTITUTION,
  CLAUSE_MAP,

  // Utilities
  getClauseById,
  isImmutableClause,
  getClauseIds,
} from './clauses';

// ============================================================================
// Audit Logging
// ============================================================================

export {
  // Creation
  createViolationEntry,
  logViolation,
  logError,

  // Queries
  getViolationsByUser,
  getViolationsByRequest,
  getViolationsByType,
  getViolationsByClause,
  getViolationsInRange,
  getViolationCounts,
  getAllViolations,
  getViolationCount,

  // Events
  onViolation,

  // Maintenance
  pruneOldViolations,
  clearAllViolations,
  exportViolations,
  importViolations,
} from './logging/audit';

// ============================================================================
// Secondary Rules
// ============================================================================

export {
  // Access
  getRuleset,
  getRuleById,
  getRulesByCategory,

  // Modification
  addRule,
  updateRule,
  deleteRule,

  // Version Control
  getRuleHistory,
  getChangeLog,
  getRuleAtTime,
  rollbackRule,

  // Events
  onRulesetModified,

  // Persistence
  exportRuleset,
  importRuleset,
  resetRuleset,
  initializeDefaultRules,
} from './rules/secondary';

// ============================================================================
// Detection
// ============================================================================

export {
  // Pattern matching
  findPatternMatches,
  calculateInjectionScore,
  containsHighSeverityPattern,

  // Injection detection
  detectPromptInjection,
  containsSuspiciousPatterns,
  getDetectionExplanation,
  detectIdentityMasking as detectIdentityMaskingInput,
  detectDataExfiltration,
  analyzeMultiTurnContext,
  DEFAULT_INJECTION_THRESHOLD,

  // Cross-tool chaining
  checkCrossToolChaining,
  analyzeToolSequence,
  getChainingApprovalMessage,

  // Types
  type PatternMatch,
  type PatternCategory,
  type InjectionDetectionResult,
  type ChainingDetectionResult,
} from './detection';

// ============================================================================
// Gatekeeper (Intent Validation)
// ============================================================================

export {
  validateIntent,
  quickScreenInput,
} from './gatekeeper';

// ============================================================================
// Validator (Output Validation)
// ============================================================================

export {
  validateOutput,
  quickScreenOutput,
  detectIdentityMasking,
  evaluateHonesty,
  applyBaselineHonesty,
  detectDataLeakage,
  getSanitizedFallback,
} from './validator';

// ============================================================================
// Plugin Sandbox
// ============================================================================

export {
  PluginSandbox,
  createSandbox,
  createMinimalPluginCapabilities,
  validatePluginCapabilities,
  verifyCryptographicSignature,
  type SandboxExecutionResult,
  type SandboxOperation,
  type ContainerLimits,
  type SandboxContext,
} from './sandbox';

// ============================================================================
// Constants
// ============================================================================

/** Threshold for prompt injection detection (0-1, higher = more permissive) */
export const INJECTION_THRESHOLD = 0.75;

/** Minimum honesty score for outputs (0-1) */
export const BASELINE_HONESTY_THRESHOLD = 0.6;

/** Plugin sandbox timeout in milliseconds */
export const SANDBOX_TIMEOUT_MS = 30000;

/** Plugin sandbox max memory */
export const SANDBOX_MAX_MEMORY = '256MB';

/** Audit log retention in days */
export const AUDIT_LOG_RETENTION_DAYS = 90;

// ============================================================================
// Graceful Decline Messages
// ============================================================================

export const GRACEFUL_DECLINES = {
  DATA_SOVEREIGNTY: 'I need to keep that information private.',
  IDENTITY_MASKING: 'I should be upfront with you about something.',
  CAPABILITY_EXCEEDED: "I can't do that with this particular setup.",
  AMBIGUOUS_REQUEST: "I want to make sure I understand what you're asking.",
  CROSS_TOOL_CHAINING: 'Before I do that, I want to confirm you want me to...',
} as const;
