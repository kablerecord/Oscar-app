/**
 * OSQR Constitutional Framework - Constitutional Gatekeeper
 *
 * Pre-execution validation of all incoming requests.
 * Checks for constitutional violations before any processing occurs.
 */

import type {
  GatekeeperResult,
  RequestContext,
  PluginCapabilities,
  ViolationLogEntry,
} from './types';

import { IMMUTABLE_CONSTITUTION } from './clauses';
import { createViolationEntry, logViolation } from './logging/audit';
import {
  detectPromptInjection,
  checkCrossToolChaining,
  DEFAULT_INJECTION_THRESHOLD,
} from './detection';

// ============================================================================
// Configuration
// ============================================================================

/** Injection detection threshold (0-1) */
const INJECTION_THRESHOLD =
  parseFloat(process.env.OSQR_CONSTITUTION_INJECTION_THRESHOLD ?? '') ||
  DEFAULT_INJECTION_THRESHOLD;

// ============================================================================
// Sanitization
// ============================================================================

/**
 * Sanitize input for safe processing.
 * Removes or escapes potentially dangerous patterns.
 */
function sanitize(input: string): string {
  let sanitized = input;

  // Remove ChatML delimiters
  sanitized = sanitized.replace(/<\|im_start\|>/g, '');
  sanitized = sanitized.replace(/<\|im_end\|>/g, '');
  sanitized = sanitized.replace(/<\|system\|>/g, '');
  sanitized = sanitized.replace(/<\|user\|>/g, '');
  sanitized = sanitized.replace(/<\|assistant\|>/g, '');

  // Escape potential XML injections
  sanitized = sanitized.replace(/<system>/gi, '&lt;system&gt;');
  sanitized = sanitized.replace(/<\/system>/gi, '&lt;/system&gt;');
  sanitized = sanitized.replace(/<instruction>/gi, '&lt;instruction&gt;');
  sanitized = sanitized.replace(/<prompt>/gi, '&lt;prompt&gt;');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

// ============================================================================
// Clause Violation Checking
// ============================================================================

/**
 * Check if input violates a specific constitutional clause.
 */
async function checkClauseViolation(
  input: string,
  context: RequestContext,
  clause: (typeof IMMUTABLE_CONSTITUTION)[number]
): Promise<ViolationLogEntry | null> {
  switch (clause.id) {
    case 'USER_DATA_SOVEREIGNTY':
      return checkDataSovereigntyViolation(input, context);

    case 'IDENTITY_TRANSPARENCY':
      // Identity transparency is primarily checked in output validation
      // Input checking catches explicit requests to hide identity
      return checkIdentityTransparencyInput(input, context);

    case 'BASELINE_HONESTY':
      // Honesty is primarily checked in output validation
      // Input checking catches requests to lie
      return checkHonestyBypassInput(input, context);

    default:
      return null;
  }
}

/**
 * Check for data sovereignty violations in input.
 */
function checkDataSovereigntyViolation(
  input: string,
  context: RequestContext
): ViolationLogEntry | null {
  // Check for cross-user data access attempts
  const crossUserPatterns = [
    /\bother\s+users?'?\s+(data|messages?|info)/i,
    /\baccess\s+(another|other)\s+user/i,
    /\bshow\s+(me\s+)?all\s+users/i,
    /\bdump\s+(the\s+)?(database|db|memory)/i,
    /\buser\s*(?:id|_id)\s*[:=]\s*['"]?(?!${context.userId})\w+/i,
  ];

  for (const pattern of crossUserPatterns) {
    if (pattern.test(input)) {
      return createViolationEntry(
        'DATA_ACCESS_ATTEMPT',
        'USER_INPUT',
        'INTENT_FILTER',
        undefined,
        input,
        context.requestId,
        context.userId,
        'USER_DATA_SOVEREIGNTY'
      );
    }
  }

  return null;
}

/**
 * Check for identity transparency violations in input.
 */
function checkIdentityTransparencyInput(
  input: string,
  context: RequestContext
): ViolationLogEntry | null {
  // Check for requests to hide AI identity
  const identityHidingPatterns = [
    /\bdon'?t\s+(say|mention|reveal)\s+(you\s+are|that\s+you'?re)\s+(an?\s+)?ai/i,
    /\bpretend\s+to\s+be\s+(a\s+)?(human|person|real\s+person)/i,
    /\bnever\s+admit\s+(you'?re|being)\s+(an?\s+)?ai/i,
    /\byou\s+are\s+(chatgpt|gpt-4|gemini|bard|copilot)/i,
  ];

  for (const pattern of identityHidingPatterns) {
    if (pattern.test(input)) {
      return createViolationEntry(
        'IDENTITY_MASKING_ATTEMPT',
        'USER_INPUT',
        'INTENT_FILTER',
        undefined,
        input,
        context.requestId,
        context.userId,
        'IDENTITY_TRANSPARENCY'
      );
    }
  }

  return null;
}

/**
 * Check for honesty bypass attempts in input.
 */
function checkHonestyBypassInput(
  input: string,
  context: RequestContext
): ViolationLogEntry | null {
  // Check for requests to lie or deceive
  const dishonestyPatterns = [
    /\blie\s+to\s+(the\s+)?user/i,
    /\bdeceive\s+(the\s+)?user/i,
    /\bmake\s+up\s+(false|fake)\s+(info|information|data)/i,
    /\bpretend\s+(this|that)\s+is\s+(true|real)/i,
    /\bdon'?t\s+tell\s+(them|the\s+user)\s+(the\s+)?truth/i,
  ];

  for (const pattern of dishonestyPatterns) {
    if (pattern.test(input)) {
      return createViolationEntry(
        'HONESTY_BYPASS_ATTEMPT',
        'USER_INPUT',
        'INTENT_FILTER',
        undefined,
        input,
        context.requestId,
        context.userId,
        'BASELINE_HONESTY'
      );
    }
  }

  return null;
}

// ============================================================================
// Plugin Capability Checking
// ============================================================================

/**
 * Check if input attempts to exceed plugin capabilities.
 */
async function checkPluginCapabilities(
  input: string,
  context: RequestContext,
  plugin: PluginCapabilities
): Promise<ViolationLogEntry | null> {
  // Check for PKV write attempts (always blocked)
  if (/\bwrite\s+to\s+(my\s+)?pkv/i.test(input) || /\bmodify\s+(my\s+)?memory/i.test(input)) {
    return createViolationEntry(
      'CAPABILITY_EXCEEDED',
      'USER_INPUT',
      'INTENT_FILTER',
      plugin.pluginId,
      input,
      context.requestId,
      context.userId,
      'USER_DATA_SOVEREIGNTY'
    );
  }

  // Check for unauthorized network access
  if (/\bfetch\s+from\s+(\S+)/i.test(input) || /\bcall\s+(\S+)\s+api/i.test(input)) {
    const match = input.match(/\bfetch\s+from\s+(\S+)/i) || input.match(/\bcall\s+(\S+)/i);
    if (match) {
      const requestedDomain = match[1];
      // Check if domain is in allowed list
      const isAllowed = plugin.networkDomains.some(
        (domain) =>
          requestedDomain.includes(domain) || domain.includes(requestedDomain)
      );
      if (!isAllowed && plugin.networkDomains.length > 0) {
        return createViolationEntry(
          'CAPABILITY_EXCEEDED',
          'USER_INPUT',
          'SANDBOX_BOUNDARY',
          plugin.pluginId,
          input,
          context.requestId,
          context.userId,
          'USER_DATA_SOVEREIGNTY'
        );
      }
    }
  }

  return null;
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate user intent before processing.
 *
 * This is the main gatekeeper function that checks all incoming requests
 * against constitutional clauses and plugin capability boundaries.
 *
 * @param input - Raw user input
 * @param context - Request context (user, conversation, etc.)
 * @param activePlugin - Active plugin capabilities (if any)
 * @returns Gatekeeper result with allowed status and any violations
 */
export async function validateIntent(
  input: string,
  context: RequestContext,
  activePlugin?: PluginCapabilities
): Promise<GatekeeperResult> {
  const violations: ViolationLogEntry[] = [];
  const clausesChecked: string[] = [];

  // Phase 1: Check immutable constitutional clauses
  for (const clause of IMMUTABLE_CONSTITUTION) {
    clausesChecked.push(clause.id);

    const violation = await checkClauseViolation(input, context, clause);
    if (violation) {
      violations.push(violation);

      // Immutable violations = immediate rejection
      if (clause.immutable) {
        await logViolation(violation);
        return {
          allowed: false,
          clausesChecked,
          violations,
          confidenceScore: 1.0, // Certain this is a violation
        };
      }
    }
  }

  // Phase 2: Check plugin capability boundaries
  if (activePlugin) {
    const capabilityViolation = await checkPluginCapabilities(
      input,
      context,
      activePlugin
    );
    if (capabilityViolation) {
      violations.push(capabilityViolation);
      await logViolation(capabilityViolation);
      return {
        allowed: false,
        clausesChecked,
        violations,
        confidenceScore: 1.0,
      };
    }
  }

  // Phase 3: Check for indirect prompt injection patterns
  const injectionResult = detectPromptInjection(input, INJECTION_THRESHOLD);
  if (injectionResult.isInjection) {
    const violation = createViolationEntry(
      'PROMPT_INJECTION',
      'USER_INPUT',
      'INTENT_FILTER',
      undefined,
      input,
      context.requestId,
      context.userId
    );
    violations.push(violation);
    await logViolation(violation);

    // Conservative abstention under ambiguity
    return {
      allowed: false,
      clausesChecked,
      violations,
      confidenceScore: injectionResult.score,
    };
  }

  // Phase 4: Check for cross-tool chaining attempts
  if (context.previousToolCalls && context.previousToolCalls.length > 0) {
    const chainingResult = checkCrossToolChaining(
      input,
      context.previousToolCalls
    );
    if (chainingResult.isSuspicious && chainingResult.requiresApproval) {
      const violation = createViolationEntry(
        'CROSS_TOOL_CHAINING',
        'USER_INPUT',
        'CROSS_TOOL_CONSTRAINT',
        undefined,
        input,
        context.requestId,
        context.userId
      );
      violations.push(violation);
      // This one requires user approval, not automatic rejection
      // Return with lower confidence to indicate need for clarification
      return {
        allowed: false,
        clausesChecked,
        violations,
        confidenceScore: 0.7,
      };
    }
  }

  // All checks passed
  return {
    allowed: true,
    clausesChecked,
    violations: [],
    sanitizedInput: sanitize(input),
    confidenceScore: 1.0,
  };
}

/**
 * Quick check if input passes basic constitutional filters.
 * Faster than full validation, useful for initial screening.
 */
export function quickScreenInput(input: string): boolean {
  // Check for high-severity injection patterns
  const injectionResult = detectPromptInjection(input);
  if (injectionResult.highSeverity) {
    return false;
  }

  // Check for obvious constitutional violations
  const obviousViolations = [
    /\bdump\s+(the\s+)?database/i,
    /\bshow\s+(me\s+)?all\s+users/i,
    /\bjailbreak/i,
    /\bDAN\s+mode/i,
  ];

  return !obviousViolations.some((p) => p.test(input));
}
