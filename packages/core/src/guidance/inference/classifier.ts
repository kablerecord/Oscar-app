/**
 * Temporal Scope Classifier
 *
 * Classifies corrections as "now" (one-time) vs "always" (permanent).
 */

import type { TemporalClassification } from '../types';

/**
 * Patterns indicating permanent/always behavior
 */
const ALWAYS_PATTERNS: RegExp[] = [
  /always/i,
  /from\s+now\s+on/i,
  /in\s+this\s+project/i,
  /every\s+time/i,
  /going\s+forward/i,
  /remember\s+(to|that)/i,
  /whenever/i,
  /all\s+the\s+time/i,
  /consistently/i,
  /by\s+default/i,
  /generally/i,
  /typically/i,
  /as\s+a\s+rule/i,
  /in\s+general/i,
  /moving\s+forward/i,
  /from\s+here\s+on/i,
];

/**
 * Patterns indicating one-time/now behavior
 */
const NOW_PATTERNS: RegExp[] = [
  /this\s+time/i,
  /for\s+(this|now)/i,
  /just\s+(this|here)/i,
  /right\s+now/i,
  /in\s+this\s+(case|instance)/i,
  /only\s+for/i,
  /temporarily/i,
  /for\s+the\s+moment/i,
  /this\s+once/i,
  /just\s+once/i,
  /only\s+now/i,
];

/**
 * Patterns indicating task-specific context (reduce generalizability)
 */
const SPECIFICITY_PATTERNS: RegExp[] = [
  /\b(line|row|column)\s+\d+/i,
  /\bthis\s+(file|function|variable|class|component)\b/i,
  /\b(here|there)\b/i,
  /\bthis\s+specific/i,
  /\bthis\s+particular/i,
  /\bin\s+this\s+file/i,
  /\bthis\s+one/i,
];

/**
 * Classify the temporal scope of a correction
 */
export function classifyTemporalScope(message: string): TemporalClassification {
  const explicitAlways = ALWAYS_PATTERNS.some((p) => p.test(message));
  const explicitNow = NOW_PATTERNS.some((p) => p.test(message));
  const hasSpecificity = SPECIFICITY_PATTERNS.some((p) => p.test(message));

  // Generalizable if not explicitly one-time and not task-specific
  const isGeneralizable = !hasSpecificity && !explicitNow;

  return {
    explicitAlways,
    explicitNow,
    isGeneralizable,
  };
}

/**
 * Calculate temporal confidence score
 * Higher score = more likely to be a permanent preference
 */
export function calculateTemporalConfidence(message: string): number {
  const classification = classifyTemporalScope(message);
  let confidence = 0.5; // Start neutral

  // Strong boost for explicit always language
  if (classification.explicitAlways) {
    confidence += 0.35;
  }

  // Strong reduction for explicit now language
  if (classification.explicitNow) {
    confidence -= 0.4;
  }

  // Moderate reduction for task-specific language
  if (!classification.isGeneralizable) {
    confidence -= 0.2;
  }

  // Count always pattern matches (more matches = higher confidence)
  const alwaysMatches = ALWAYS_PATTERNS.filter((p) => p.test(message)).length;
  confidence += Math.min(alwaysMatches * 0.1, 0.2);

  // Count now pattern matches (more matches = lower confidence)
  const nowMatches = NOW_PATTERNS.filter((p) => p.test(message)).length;
  confidence -= Math.min(nowMatches * 0.1, 0.2);

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Determine if correction should be considered for rule proposal
 */
export function shouldConsiderForProposal(message: string): {
  should: boolean;
  reason: string;
} {
  const classification = classifyTemporalScope(message);

  // Definitely propose if explicit always
  if (classification.explicitAlways) {
    return {
      should: true,
      reason: 'Explicit permanent language detected',
    };
  }

  // Definitely skip if explicit now
  if (classification.explicitNow) {
    return {
      should: false,
      reason: 'Explicit one-time language detected',
    };
  }

  // Skip if too specific
  if (!classification.isGeneralizable) {
    return {
      should: false,
      reason: 'Task-specific correction, not generalizable',
    };
  }

  // Consider for proposal if generalizable
  return {
    should: true,
    reason: 'Generalizable correction without one-time indicators',
  };
}

/**
 * Get temporal indicators found in message
 */
export function getTemporalIndicators(message: string): {
  always: string[];
  now: string[];
  specific: string[];
} {
  const always: string[] = [];
  const now: string[] = [];
  const specific: string[] = [];

  for (const pattern of ALWAYS_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      always.push(match[0]);
    }
  }

  for (const pattern of NOW_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      now.push(match[0]);
    }
  }

  for (const pattern of SPECIFICITY_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      specific.push(match[0]);
    }
  }

  return { always, now, specific };
}

/**
 * Analyze conflicting signals
 * (when both always and now patterns are present)
 */
export function hasConflictingSignals(message: string): boolean {
  const classification = classifyTemporalScope(message);
  return classification.explicitAlways && classification.explicitNow;
}

/**
 * Resolve conflicting signals
 * Typically explicit "now" takes precedence as it's more specific
 */
export function resolveConflictingSignals(message: string): 'always' | 'now' | 'ambiguous' {
  const indicators = getTemporalIndicators(message);

  // If significantly more "now" indicators, lean toward now
  if (indicators.now.length > indicators.always.length + 1) {
    return 'now';
  }

  // If significantly more "always" indicators, lean toward always
  if (indicators.always.length > indicators.now.length + 1) {
    return 'always';
  }

  // Check for stronger always patterns
  const strongAlwaysPatterns = [
    /from\s+now\s+on/i,
    /going\s+forward/i,
    /moving\s+forward/i,
    /as\s+a\s+rule/i,
  ];
  if (strongAlwaysPatterns.some((p) => p.test(message))) {
    return 'always';
  }

  return 'ambiguous';
}
