/**
 * Council Mode Trigger Evaluation
 *
 * Determines when to activate Council Mode automatically or by user invocation.
 */

import type {
  AutoTriggerConditions,
  TriggerEvaluationResult,
  ConversationContext,
  UserTier,
} from './types';
import { TIER_CONFIG, DEFAULT_CONFIG } from './config';

// ============================================
// USER INVOCATION PATTERNS
// ============================================

const COUNCIL_INVOCATION_PATTERNS = [
  /^\/council\s+/i,                              // Slash command
  /\[council\]/i,                                // Inline flag
  /multiple (AI |model )?perspectives/i,         // Natural language
  /different (AI |model )?(opinions|views)/i,    // Natural language
  /what would (other AIs|different models) say/i, // Natural language
  /compare (AI |model )?responses/i,             // Natural language
  /council mode/i,                               // Direct reference
];

/**
 * Check if user explicitly invoked Council Mode
 */
export function isUserInvokedCouncil(query: string): boolean {
  return COUNCIL_INVOCATION_PATTERNS.some((pattern) => pattern.test(query));
}

/**
 * Strip council invocation from query for processing
 */
export function stripCouncilInvocation(query: string): string {
  let cleaned = query
    .replace(/^\/council\s+/i, '')
    .replace(/\[council\]/gi, '')
    .trim();

  return cleaned;
}

// ============================================
// HIGH-STAKES DETECTION
// ============================================

const FINANCIAL_PATTERNS = [
  /\$[\d,]+(?:\.\d{2})?/,                        // Dollar amounts
  /\d+[\d,]*\s*(?:dollars?|USD|k|K|million|billion)/i,
  /invest(?:ment|ing)?/i,
  /mortgage/i,
  /refinanc/i,
  /retirement/i,
  /portfolio/i,
  /savings/i,
  /tax(?:es)?/i,
];

const LEGAL_PATTERNS = [
  /\b(?:legal|law(?:yer|suit)?|attorney|court|sue|liab(?:le|ility))\b/i,
  /\bcontract\b/i,
  /\bcopyright\b/i,
  /\btrademark\b/i,
  /\bpatent\b/i,
  /\bdivorce\b/i,
  /\bcustody\b/i,
];

const HEALTH_PATTERNS = [
  /\b(?:doctor|medical|diagnos|symptom|treatment|medication|health)\b/i,
  /\b(?:cancer|disease|illness|surgery|hospital)\b/i,
  /\b(?:prescri(?:be|ption)|dosage)\b/i,
];

/**
 * Extract dollar amount from query
 */
export function extractDollarAmount(query: string): number {
  // Match explicit dollar amounts
  const dollarMatch = query.match(/\$?([\d,]+(?:\.\d{2})?)\s*(?:k|K|million|billion)?/);

  if (dollarMatch) {
    let amount = parseFloat(dollarMatch[1].replace(/,/g, ''));

    if (/million/i.test(query)) {
      amount *= 1_000_000;
    } else if (/billion/i.test(query)) {
      amount *= 1_000_000_000;
    } else if (/\d+\s*[kK]\b/.test(query)) {
      amount *= 1_000;
    }

    return amount;
  }

  return 0;
}

/**
 * Detect if query involves financial threshold
 */
export function detectFinancialThreshold(
  query: string,
  threshold: number = DEFAULT_CONFIG.financialThreshold
): boolean {
  const amount = extractDollarAmount(query);
  return amount >= threshold;
}

/**
 * Detect if query involves legal implications
 */
export function detectLegalImplications(query: string): boolean {
  return LEGAL_PATTERNS.some((pattern) => pattern.test(query));
}

/**
 * Detect if query involves health decisions
 */
export function detectHealthDecisions(query: string): boolean {
  return HEALTH_PATTERNS.some((pattern) => pattern.test(query));
}

// ============================================
// COMPLEXITY DETECTION
// ============================================

const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  technology: [/\b(?:code|software|programming|algorithm|database)\b/i],
  business: [/\b(?:business|company|startup|revenue|market)\b/i],
  science: [/\b(?:research|study|experiment|scientific|data)\b/i],
  philosophy: [/\b(?:ethics|moral|philosophy|meaning|purpose)\b/i],
  finance: [/\b(?:financial|investment|money|budget)\b/i],
  legal: [/\b(?:legal|law|contract|policy)\b/i],
  health: [/\b(?:health|medical|treatment|wellness)\b/i],
};

/**
 * Detect domains present in query
 */
export function detectDomains(query: string): string[] {
  const detected: string[] = [];

  for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(query))) {
      detected.push(domain);
    }
  }

  return detected;
}

/**
 * Detect if query spans multiple domains
 */
export function detectMultiDomain(query: string): boolean {
  return detectDomains(query).length >= 2;
}

const RESEARCH_PATTERNS = [
  /\b(?:research|sources?|citations?|references?)\b/i,
  /\b(?:studies|papers?|publications?)\b/i,
  /\bwhat does the research (?:say|show)\b/i,
  /\baccording to\b/i,
];

/**
 * Detect if query requires research depth
 */
export function detectResearchDepthRequired(query: string): boolean {
  return RESEARCH_PATTERNS.some((pattern) => pattern.test(query));
}

const STRATEGIC_PATTERNS = [
  /\b(?:strategy|strategic|plan(?:ning)?|roadmap)\b/i,
  /\b(?:long[\s-]?term|next (?:year|few years|decade))\b/i,
  /\b(?:5[\s-]?year|10[\s-]?year|future)\b/i,
];

/**
 * Detect if query involves strategic planning
 */
export function detectStrategicPlanning(query: string): boolean {
  return STRATEGIC_PATTERNS.some((pattern) => pattern.test(query));
}

// ============================================
// UNCERTAINTY DETECTION
// ============================================

const CONFLICT_PATTERNS = [
  /\b(?:conflicting|contradictory|opposing)\b/i,
  /\b(?:some say|others say|but also)\b/i,
  /\b(?:on one hand|on the other hand)\b/i,
];

/**
 * Detect if query contains conflicting information
 */
export function detectConflictingSources(query: string): boolean {
  return CONFLICT_PATTERNS.some((pattern) => pattern.test(query));
}

const NOVEL_PATTERNS = [
  /\b(?:new|novel|unprecedented|never before)\b/i,
  /\b(?:unique situation|unusual case)\b/i,
  /\b(?:first time|never happened)\b/i,
];

/**
 * Detect if query describes novel situation
 */
export function detectNovelSituation(query: string): boolean {
  return NOVEL_PATTERNS.some((pattern) => pattern.test(query));
}

// ============================================
// AUTO-TRIGGER EVALUATION
// ============================================

/**
 * Evaluate all auto-trigger conditions
 */
export function evaluateAutoTriggerConditions(
  query: string,
  context?: ConversationContext
): AutoTriggerConditions {
  return {
    // High-stakes
    financialThreshold: detectFinancialThreshold(query),
    legalImplications: detectLegalImplications(query),
    healthDecisions: detectHealthDecisions(query),

    // Complexity
    multiDomain: detectMultiDomain(query),
    researchDepthRequired: detectResearchDepthRequired(query),
    strategicPlanning: detectStrategicPlanning(query),

    // Uncertainty
    conflictingSourcesDetected: detectConflictingSources(query),
    novelSituation: detectNovelSituation(query),

    // User history
    userPreferenceAggressive: context?.user.preferences.councilModeAggressive ?? false,
    recentCorrection: false, // Would be determined from context history
  };
}

/**
 * Determine if conditions warrant auto-trigger
 */
export function shouldAutoTrigger(conditions: AutoTriggerConditions): boolean {
  // High-stakes always triggers
  if (
    conditions.financialThreshold ||
    conditions.legalImplications ||
    conditions.healthDecisions
  ) {
    return true;
  }

  // Complexity triggers (requires BOTH conditions)
  if (conditions.multiDomain && conditions.researchDepthRequired) {
    return true;
  }

  // Uncertainty triggers
  if (conditions.conflictingSourcesDetected || conditions.novelSituation) {
    return true;
  }

  // User preference triggers
  if (conditions.userPreferenceAggressive) {
    return true;
  }

  return false;
}

/**
 * Get the reason for auto-trigger
 */
export function getAutoTriggerReason(conditions: AutoTriggerConditions): string {
  if (conditions.financialThreshold) {
    return 'financial_threshold';
  }
  if (conditions.legalImplications) {
    return 'legal_implications';
  }
  if (conditions.healthDecisions) {
    return 'health_decisions';
  }
  if (conditions.multiDomain && conditions.researchDepthRequired) {
    return 'complex_multi_domain';
  }
  if (conditions.conflictingSourcesDetected) {
    return 'conflicting_sources';
  }
  if (conditions.novelSituation) {
    return 'novel_situation';
  }
  if (conditions.userPreferenceAggressive) {
    return 'user_preference';
  }
  return 'none';
}

// ============================================
// TIER LIMITS
// ============================================

/**
 * Check if user can use Council Mode
 */
export function canUseCouncil(
  tier: UserTier,
  councilUsesToday: number
): { allowed: boolean; reason?: string } {
  const limits = TIER_CONFIG[tier];

  if (limits.councilPerDay === 'unlimited') {
    return { allowed: true };
  }

  if (councilUsesToday >= limits.councilPerDay) {
    return {
      allowed: false,
      reason: `Daily limit of ${limits.councilPerDay} council queries reached for ${tier} tier`,
    };
  }

  return { allowed: true };
}

/**
 * Check if auto-trigger is enabled for tier
 */
export function isAutoTriggerEnabled(tier: UserTier): boolean {
  return TIER_CONFIG[tier].autoTriggerEnabled;
}

/**
 * Get available models for tier
 */
export function getAvailableModels(tier: UserTier): number {
  return TIER_CONFIG[tier].modelsAvailable;
}

// ============================================
// MAIN TRIGGER EVALUATION
// ============================================

/**
 * Evaluate whether Council Mode should be triggered
 */
export function evaluateCouncilTrigger(
  query: string,
  context?: ConversationContext
): TriggerEvaluationResult {
  // Check user invocation first
  if (isUserInvokedCouncil(query)) {
    return {
      shouldTrigger: true,
      reason: 'user_invoked',
      conditions: {},
    };
  }

  // If no context, can't check tier or auto-trigger
  if (!context) {
    return {
      shouldTrigger: false,
      reason: 'no_context',
      conditions: {},
    };
  }

  // Check tier limit
  const tierCheck = canUseCouncil(context.user.tier, context.user.councilUsesToday);
  if (!tierCheck.allowed) {
    return {
      shouldTrigger: false,
      reason: tierCheck.reason || 'tier_limit',
      conditions: {},
    };
  }

  // Check if auto-trigger is enabled for this tier
  if (!isAutoTriggerEnabled(context.user.tier)) {
    return {
      shouldTrigger: false,
      reason: 'auto_trigger_disabled',
      conditions: {},
    };
  }

  // Evaluate auto-trigger conditions
  const conditions = evaluateAutoTriggerConditions(query, context);

  if (shouldAutoTrigger(conditions)) {
    return {
      shouldTrigger: true,
      reason: getAutoTriggerReason(conditions),
      conditions,
    };
  }

  return {
    shouldTrigger: false,
    reason: 'no_trigger_conditions_met',
    conditions,
  };
}
