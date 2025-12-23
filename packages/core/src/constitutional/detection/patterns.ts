/**
 * OSQR Constitutional Framework - Attack Patterns
 *
 * Known patterns for prompt injection, jailbreaks, and other attacks.
 * Used by detection functions to identify malicious inputs.
 */

// ============================================================================
// Prompt Injection Patterns
// ============================================================================

/**
 * Patterns that indicate role confusion attacks.
 * These attempt to make the AI believe it's in a different context.
 */
export const ROLE_CONFUSION_PATTERNS: RegExp[] = [
  // Direct system prompt override attempts
  /\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /\bdisregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /\bforget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,

  // New role assignment
  /\byou\s+are\s+(now|actually)\s+a?\s*/i,
  /\bact\s+as\s+(if\s+you\s+are|though\s+you\s+are)/i,
  /\bpretend\s+(to\s+be|you\s+are)/i,
  /\bswitch\s+to\s+(\w+)\s+mode/i,

  // System prompt extraction
  /\bwhat\s+(is|are)\s+your\s+(system\s+)?prompt/i,
  /\bshow\s+(me\s+)?your\s+(original\s+)?instructions/i,
  /\brepeat\s+(back\s+)?your\s+(system\s+)?prompt/i,
  /\bprint\s+your\s+(initial\s+)?instructions/i,

  // Developer mode claims
  /\bdeveloper\s+mode\s+(enabled|activated|on)/i,
  /\bdebug\s+mode\s+(enabled|activated|on)/i,
  /\bDAN\s+mode/i, // "Do Anything Now"
  /\bjailbreak\s+mode/i,
];

/**
 * Patterns that indicate delimiter injection attacks.
 * These attempt to use special characters to escape context.
 */
export const DELIMITER_INJECTION_PATTERNS: RegExp[] = [
  // Markdown/code block escapes
  /```\s*(system|admin|developer|root)/i,
  /\[SYSTEM\]/i,
  /\[ADMIN\]/i,
  /\[DEVELOPER\]/i,
  /<\|im_start\|>/i, // ChatML delimiter
  /<\|im_end\|>/i,
  /<\|system\|>/i,
  /<\|user\|>/i,
  /<\|assistant\|>/i,

  // XML/HTML injection
  /<system>/i,
  /<\/system>/i,
  /<instruction>/i,
  /<prompt>/i,

  // Separator overload
  /={5,}/,
  /-{5,}/,
  /#{5,}/,
];

/**
 * Patterns that indicate instruction override attempts.
 * These directly try to replace or override the AI's instructions.
 */
export const INSTRUCTION_OVERRIDE_PATTERNS: RegExp[] = [
  // Direct override
  /\bnew\s+instructions?:/i,
  /\bupdated?\s+instructions?:/i,
  /\boverride\s+instructions?:/i,
  /\bsystem\s+prompt:/i,
  /\badmin\s+override/i,
  /\bpriority\s+instruction/i,

  // Roleplay exploitation
  /\bin\s+this\s+(roleplay|scenario),?\s+you\s+(can|will|must)/i,
  /\bfor\s+this\s+(exercise|game),?\s+(ignore|forget)/i,

  // Authority claims
  /\bi\s+am\s+(the\s+)?(developer|admin|creator|owner)/i,
  /\bi\s+have\s+(admin|root|system)\s+access/i,
  /\bauthorization\s+code:\s*\S+/i,
  /\bpassword:\s*\S+/i,
];

// ============================================================================
// Identity Masking Patterns
// ============================================================================

/**
 * Patterns that indicate attempts to mask OSQR's identity.
 */
export const IDENTITY_MASKING_PATTERNS: RegExp[] = [
  // Direct denial requests
  /\bdon'?t\s+(say|mention|reveal)\s+(you\s+are|that\s+you'?re)\s+(an?\s+)?ai/i,
  /\bhide\s+that\s+you'?re\s+(an?\s+)?ai/i,
  /\bnever\s+admit\s+(you'?re|being)\s+(an?\s+)?ai/i,

  // Impersonation requests
  /\bpretend\s+to\s+be\s+(a\s+)?(human|person|real\s+person)/i,
  /\bact\s+(like|as\s+if)\s+you'?re\s+(a\s+)?(human|person)/i,
  /\bspeak\s+as\s+(a\s+)?(human|person)\s+would/i,

  // Other AI impersonation
  /\byou\s+are\s+(chatgpt|gpt-4|gemini|bard|copilot|alexa|siri)/i,
  /\bpretend\s+to\s+be\s+(chatgpt|gpt-4|gemini|bard|copilot)/i,
];

// ============================================================================
// Data Exfiltration Patterns
// ============================================================================

/**
 * Patterns that indicate attempts to access other users' data.
 */
export const DATA_EXFILTRATION_PATTERNS: RegExp[] = [
  // Cross-user access
  /\bshow\s+(me\s+)?other\s+users?'?\s+(data|messages?|conversations?)/i,
  /\baccess\s+(another|other)\s+user'?s?\s+/i,
  /\bget\s+(me\s+)?user\s+id\s*[:=]?\s*\d+/i,
  /\bswitch\s+to\s+user\s*[:=]?\s*\S+/i,

  // System data access
  /\bdump\s+(the\s+)?(database|db|memory|pkv)/i,
  /\bexport\s+all\s+(user\s+)?data/i,
  /\blist\s+all\s+users/i,
  /\bshow\s+(system|admin)\s+logs/i,

  // PKV/Memory bypass
  /\baccess\s+(my\s+)?pkv\s+directly/i,
  /\bwrite\s+to\s+(my\s+)?pkv/i,
  /\bmodify\s+(the\s+)?memory\s+vault/i,
];

// ============================================================================
// Cross-Tool Chaining Patterns
// ============================================================================

/**
 * Patterns that indicate suspicious tool chaining requests.
 */
export const TOOL_CHAINING_PATTERNS: RegExp[] = [
  // Automated chaining
  /\b(then|and\s+then|after\s+that)\s+(automatically|immediately)\s+(use|call|invoke|run)/i,
  /\bchain\s+(together|these)\s+tools?/i,
  /\buse\s+the\s+output\s+of\s+\w+\s+as\s+input\s+(to|for)\s+\w+/i,

  // Capability escalation
  /\buse\s+\w+\s+to\s+(bypass|circumvent|avoid)\s+/i,
  /\bcombine\s+\w+\s+and\s+\w+\s+to\s+/i,
  /\bif\s+\w+\s+fails?,?\s+(then\s+)?try\s+\w+/i,
];

// ============================================================================
// Pattern Scoring
// ============================================================================

export interface PatternMatch {
  pattern: string;
  category: PatternCategory;
  weight: number;
  matched: string;
}

export type PatternCategory =
  | 'ROLE_CONFUSION'
  | 'DELIMITER_INJECTION'
  | 'INSTRUCTION_OVERRIDE'
  | 'IDENTITY_MASKING'
  | 'DATA_EXFILTRATION'
  | 'TOOL_CHAINING';

interface PatternSet {
  patterns: RegExp[];
  category: PatternCategory;
  weight: number;
}

const PATTERN_SETS: PatternSet[] = [
  { patterns: ROLE_CONFUSION_PATTERNS, category: 'ROLE_CONFUSION', weight: 0.4 },
  { patterns: DELIMITER_INJECTION_PATTERNS, category: 'DELIMITER_INJECTION', weight: 0.35 },
  { patterns: INSTRUCTION_OVERRIDE_PATTERNS, category: 'INSTRUCTION_OVERRIDE', weight: 0.45 },
  { patterns: IDENTITY_MASKING_PATTERNS, category: 'IDENTITY_MASKING', weight: 0.3 },
  { patterns: DATA_EXFILTRATION_PATTERNS, category: 'DATA_EXFILTRATION', weight: 0.5 },
  { patterns: TOOL_CHAINING_PATTERNS, category: 'TOOL_CHAINING', weight: 0.25 },
];

/**
 * Find all pattern matches in input text.
 */
export function findPatternMatches(input: string): PatternMatch[] {
  const matches: PatternMatch[] = [];

  for (const set of PATTERN_SETS) {
    for (const pattern of set.patterns) {
      const match = input.match(pattern);
      if (match) {
        matches.push({
          pattern: pattern.source,
          category: set.category,
          weight: set.weight,
          matched: match[0],
        });
      }
    }
  }

  return matches;
}

/**
 * Calculate injection score based on pattern matches.
 * Score is 0-1, higher = more likely injection.
 */
export function calculateInjectionScore(matches: PatternMatch[]): number {
  if (matches.length === 0) return 0;

  // Sum weights (capped at 1.0)
  const totalWeight = matches.reduce((sum, m) => sum + m.weight, 0);

  // Apply category diversity bonus (multiple categories = more suspicious)
  const categories = new Set(matches.map((m) => m.category));
  const diversityMultiplier = 1 + (categories.size - 1) * 0.1;

  return Math.min(1.0, totalWeight * diversityMultiplier);
}

/**
 * Check if input contains high-severity patterns.
 * These warrant immediate rejection without scoring.
 */
export function containsHighSeverityPattern(input: string): boolean {
  // Patterns that are almost always malicious
  const highSeverityPatterns = [
    /\bDAN\s+mode/i,
    /\bjailbreak/i,
    /<\|im_start\|>system/i,
    /\bdump\s+(the\s+)?database/i,
    /\bpassword:\s*\S+/i,
    /\bauthorization\s+code:\s*\S+/i,
  ];

  return highSeverityPatterns.some((p) => p.test(input));
}
