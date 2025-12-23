/**
 * OSQR Constitutional Framework - Type Definitions
 *
 * Core type definitions for the Constitutional Framework that governs
 * all OSQR system behavior through immutable rules and enforcement mechanisms.
 */

// ============================================================================
// Enforcement Mechanisms
// ============================================================================

/**
 * Methods by which constitutional clauses are enforced at runtime.
 */
export type EnforcementMechanism =
  | 'INTENT_FILTER'           // Pre-execution inspection
  | 'SANDBOX_BOUNDARY'        // Capability isolation
  | 'OUTPUT_VALIDATION'       // Post-execution check
  | 'NAMESPACE_VERIFICATION'  // Cryptographic signing
  | 'CROSS_TOOL_CONSTRAINT';  // Chaining prevention

// ============================================================================
// Violation Types and Responses
// ============================================================================

/**
 * Categories of constitutional violations.
 */
export type ViolationType =
  | 'DATA_ACCESS_ATTEMPT'
  | 'IDENTITY_MASKING_ATTEMPT'
  | 'HONESTY_BYPASS_ATTEMPT'
  | 'CAPABILITY_EXCEEDED'
  | 'NAMESPACE_SPOOFING'
  | 'PROMPT_INJECTION'
  | 'CROSS_TOOL_CHAINING';

/**
 * How to respond when a violation is detected.
 */
export interface ViolationResponse {
  /** The action to take */
  action: 'SILENT_INTERCEPT' | 'GRACEFUL_DECLINE' | 'ABSTAIN';
  /** Severity level for logging */
  logLevel: 'INFO' | 'WARN' | 'CRITICAL';
  /** Optional message to show user (for graceful decline) */
  userMessage?: string;
  /** Whether to disclose the reason (false = don't educate attackers) */
  discloseReason: boolean;
}

/**
 * Source of a violation.
 */
export type ViolationSource = 'USER_INPUT' | 'PLUGIN' | 'MODEL_OUTPUT';

/**
 * Audit log entry for a detected violation.
 */
export interface ViolationLogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Unique request identifier */
  requestId: string;
  /** User who triggered the violation */
  userId: string;
  /** Constitutional clause ID that was violated */
  clauseViolated: string;
  /** Category of violation */
  violationType: ViolationType;
  /** Where the violation originated */
  sourceType: ViolationSource;
  /** Plugin ID if sourceType is PLUGIN */
  sourceId?: string;
  /** Action taken in response */
  action: ViolationResponse['action'];
  /** Additional context */
  context: {
    /** Sanitized, truncated input snippet */
    inputSnippet?: string;
    /** How the violation was detected */
    detectionMethod: EnforcementMechanism;
  };
}

// ============================================================================
// Constitutional Clauses
// ============================================================================

/**
 * Definition of a constitutional clause.
 */
export interface ConstitutionalClause {
  /** Unique identifier (e.g., "USER_DATA_SOVEREIGNTY") */
  id: string;
  /** Human-readable name */
  name: string;
  /** What this clause protects */
  description: string;
  /** true = cannot be overridden, ever */
  immutable: boolean;
  /** How this is enforced at runtime */
  enforcement: EnforcementMechanism[];
  /** How to respond to violations */
  violationResponse: ViolationResponse;
}

// ============================================================================
// Plugin Capabilities
// ============================================================================

/**
 * Declaration of what a plugin is allowed to do.
 */
export interface PluginCapabilities {
  /** Unique plugin identifier */
  pluginId: string;
  /** Plugin version */
  version: string;
  /** Cryptographic signature for verification */
  signature: string;

  // Behavioral capabilities
  /** Can modify communication style/tone */
  canModifyCommunicationStyle: boolean;
  /** Can override honesty tier (above baseline only) */
  canOverrideHonestyTier: boolean;
  /** Can inject domain knowledge */
  canInjectKnowledge: boolean;
  /** List of tool IDs the plugin can add */
  canAddTools: string[];
  /** Can adjust proactivity settings */
  canAdjustProactivity: boolean;

  // Resource access
  /** Can read from PKV (Personal Knowledge Vault) */
  pkvReadAccess: boolean;
  /** PKV write access - ALWAYS false, enforced by constitution */
  pkvWriteAccess: false;
  /** Allowed external network domains */
  networkDomains: string[];
  /** Allowed filesystem paths (read-only) */
  fileSystemPaths: string[];
}

// ============================================================================
// Gatekeeper Types
// ============================================================================

/**
 * Result of validating a request through the Constitutional Gatekeeper.
 */
export interface GatekeeperResult {
  /** Whether the request is allowed to proceed */
  allowed: boolean;
  /** List of clause IDs that were checked */
  clausesChecked: string[];
  /** Any violations that were detected */
  violations: ViolationLogEntry[];
  /** Cleaned input if allowed (undefined if blocked) */
  sanitizedInput?: string;
  /** Confidence score for ambiguous cases (0-1) */
  confidenceScore: number;
}

// ============================================================================
// Secondary Rules (Amendable)
// ============================================================================

/**
 * A secondary rule that can be modified (unlike immutable clauses).
 */
export interface SecondaryRule {
  /** Unique rule identifier */
  id: string;
  /** Category of rule */
  category: 'PLUGIN_BOUNDARY' | 'DATA_ACCESS' | 'HONESTY_TIER';
  /** The rule definition */
  rule: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last modification timestamp */
  modifiedAt: string;
}

/**
 * Record of a change to a secondary rule.
 */
export interface VersionControlledResolution {
  /** Unique resolution identifier */
  resolutionId: string;
  /** ID of the rule being modified */
  ruleId: string;
  /** Previous rule value */
  previousValue: string;
  /** New rule value */
  newValue: string;
  /** Reason for the change */
  reason: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Who approved the change */
  approvedBy: string;
}

/**
 * Collection of secondary rules with version control.
 */
export interface SecondaryRuleset {
  /** Ruleset version */
  version: string;
  /** ISO 8601 last modification timestamp */
  lastModified: string;
  /** The rules */
  rules: SecondaryRule[];
  /** History of changes */
  changeLog: VersionControlledResolution[];
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * A message in the conversation history.
 */
export interface Message {
  /** Message role */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * A tool call in the conversation.
 */
export interface ToolCall {
  /** Tool identifier */
  toolId: string;
  /** Tool input parameters */
  input: Record<string, unknown>;
  /** Tool output */
  output?: unknown;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Honesty tier levels.
 */
export type HonestyTier = 'BASE' | 'PLUGIN' | 'SUPREME_COURT';

/**
 * Request source platforms.
 */
export type RequestSource = 'WEB' | 'MOBILE' | 'VOICE' | 'VSCODE';

/**
 * Incoming request to OSQR.
 */
export interface OSQRRequest {
  /** Unique request identifier */
  requestId: string;
  /** User identifier */
  userId: string;
  /** User input text */
  input: string;
  /** Request context */
  context: {
    /** Conversation identifier */
    conversationId: string;
    /** Previous messages in conversation */
    previousMessages: Message[];
    /** Previous tool calls in conversation */
    previousToolCalls: ToolCall[];
    /** Active plugin ID (if any) */
    activePlugin?: string;
    /** Current honesty tier */
    honestyTier: HonestyTier;
  };
  /** Request metadata */
  metadata: {
    /** ISO 8601 timestamp */
    timestamp: string;
    /** Source platform */
    source: RequestSource;
  };
}

/**
 * Output validation result.
 */
export interface OutputValidatorResult {
  /** Whether the output is valid */
  valid: boolean;
  /** Cleaned/corrected output (if valid) */
  sanitizedOutput?: string;
  /** Any violations detected */
  violations: ViolationLogEntry[];
}

/**
 * Response from OSQR.
 */
export interface OSQRResponse {
  /** Request identifier (matches request) */
  requestId: string;
  /** Whether the request succeeded */
  success: boolean;
  /** Output text (if success) */
  output?: string;

  /** Constitutional metadata (internal, not exposed to user) */
  constitutional: {
    /** Gatekeeper validation result */
    gatekeeperResult: GatekeeperResult;
    /** Output validator result */
    validatorResult: OutputValidatorResult;
    /** Total processing latency in milliseconds */
    totalLatencyMs: number;
  };

  /** Error information (if success=false) */
  error?: {
    /** Error category */
    type: 'CONSTITUTIONAL_VIOLATION' | 'PLUGIN_ERROR' | 'MODEL_ERROR';
    /** User-facing message (graceful, non-disclosing) */
    userMessage: string;
  };
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event emitted when a constitutional violation is detected.
 */
export interface ConstitutionalViolationEvent {
  eventType: 'CONSTITUTIONAL_VIOLATION';
  violation: ViolationLogEntry;
  handled: boolean;
}

/**
 * Event emitted when secondary rules are modified.
 */
export interface RulesetModifiedEvent {
  eventType: 'RULESET_MODIFIED';
  resolution: VersionControlledResolution;
}

/**
 * All possible constitutional events.
 */
export type ConstitutionalEvent =
  | ConstitutionalViolationEvent
  | RulesetModifiedEvent;

// ============================================================================
// Request Context (for validation)
// ============================================================================

/**
 * Context passed to validation functions.
 */
export interface RequestContext {
  /** Unique request identifier */
  requestId: string;
  /** User identifier */
  userId: string;
  /** Conversation identifier */
  conversationId: string;
  /** Previous tool calls in this conversation */
  previousToolCalls?: ToolCall[];
  /** Current honesty tier */
  honestyTier: HonestyTier;
}

/**
 * Context for output validation.
 */
export interface ResponseContext {
  /** Unique request identifier */
  requestId: string;
  /** User identifier */
  userId: string;
  /** Conversation identifier */
  conversationId: string;
  /** Current honesty tier */
  honestyTier: HonestyTier;
  /** The original user input */
  originalInput: string;
}
