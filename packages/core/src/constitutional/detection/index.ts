/**
 * OSQR Constitutional Framework - Detection Module
 *
 * Exports all detection functionality for prompt injection,
 * cross-tool chaining, and attack pattern matching.
 */

// Patterns
export {
  // Pattern arrays
  ROLE_CONFUSION_PATTERNS,
  DELIMITER_INJECTION_PATTERNS,
  INSTRUCTION_OVERRIDE_PATTERNS,
  IDENTITY_MASKING_PATTERNS,
  DATA_EXFILTRATION_PATTERNS,
  TOOL_CHAINING_PATTERNS,

  // Pattern utilities
  findPatternMatches,
  calculateInjectionScore,
  containsHighSeverityPattern,

  // Types
  type PatternMatch,
  type PatternCategory,
} from './patterns';

// Injection Detection
export {
  // Main detection
  detectPromptInjection,
  containsSuspiciousPatterns,
  getDetectionExplanation,

  // Specialized detection
  detectIdentityMasking,
  detectDataExfiltration,
  analyzeMultiTurnContext,

  // Configuration
  DEFAULT_INJECTION_THRESHOLD,

  // Types
  type InjectionDetectionResult,
} from './injection';

// Cross-Tool Chaining
export {
  // Detection
  checkCrossToolChaining,
  analyzeToolSequence,

  // User messaging
  getChainingApprovalMessage,

  // Types
  type ChainingDetectionResult,
} from './chaining';
