/**
 * Escalation Handler
 *
 * Handles escalation when validation fails or confidence is low.
 * Moves requests to higher-tier models when needed.
 */

import type {
  RoutingDecision,
  ValidationResult,
  RouterConfig,
  RouterRequest,
} from './types';
import { ComplexityTier, MODEL_REGISTRY, TIER_TO_MODEL } from './types';

/**
 * Result of an escalation attempt
 */
export interface EscalationResult {
  shouldEscalate: boolean;
  newDecision: RoutingDecision | null;
  reason: string;
}

/**
 * Determine if escalation is needed based on validation result
 */
export function needsEscalation(
  validationResult: ValidationResult,
  config: Partial<RouterConfig> = {}
): boolean {
  // Always escalate if validation says so
  if (validationResult.shouldEscalate) {
    return true;
  }

  // Escalate if there are any errors
  const hasErrors = validationResult.issues.some(
    (issue) => issue.severity === 'error'
  );
  if (hasErrors) {
    return true;
  }

  // Escalate if response is not valid
  if (!validationResult.isValid) {
    return true;
  }

  return false;
}

/**
 * Handle escalation to a higher-tier model
 */
export function handleEscalation(
  request: RouterRequest,
  currentDecision: RoutingDecision,
  validationResult: ValidationResult,
  config: Partial<RouterConfig> = {},
  escalationCount: number = 0
): EscalationResult {
  const maxEscalations = config.maxEscalations ?? 2;

  // Check if we've exceeded max escalations
  if (escalationCount >= maxEscalations) {
    return {
      shouldEscalate: false,
      newDecision: null,
      reason: `Max escalations (${maxEscalations}) reached for session ${request.sessionId}`,
    };
  }

  // Get current model's tier
  const currentModel = MODEL_REGISTRY[currentDecision.selectedModel];
  if (!currentModel) {
    return {
      shouldEscalate: false,
      newDecision: null,
      reason: `Unknown model: ${currentDecision.selectedModel}`,
    };
  }

  const currentTier = currentModel.tier;

  // Can't escalate beyond STRATEGIC
  if (currentTier >= ComplexityTier.STRATEGIC) {
    return {
      shouldEscalate: false,
      newDecision: null,
      reason: 'Already at highest tier (STRATEGIC), cannot escalate further',
    };
  }

  // Calculate next tier
  const nextTier = (currentTier + 1) as ComplexityTier;
  const nextModel = TIER_TO_MODEL[nextTier];

  if (!nextModel) {
    return {
      shouldEscalate: false,
      newDecision: null,
      reason: `No model found for tier ${nextTier}`,
    };
  }

  // Build escalation reason
  const escalationReason = buildEscalationReason(validationResult);

  const newDecision: RoutingDecision = {
    selectedModel: nextModel,
    classificationResult: currentDecision.classificationResult,
    escalatedFrom: currentDecision.selectedModel,
    escalationReason,
    routingLatencyMs: 0, // Will be updated by caller
  };

  return {
    shouldEscalate: true,
    newDecision,
    reason: escalationReason,
  };
}

/**
 * Build a human-readable escalation reason
 */
function buildEscalationReason(validationResult: ValidationResult): string {
  const reasons: string[] = [];

  // Add suggested repair if present
  if (validationResult.suggestedRepair) {
    reasons.push(validationResult.suggestedRepair);
  }

  // Add issue descriptions
  const errorIssues = validationResult.issues.filter(
    (i) => i.severity === 'error'
  );
  if (errorIssues.length > 0) {
    reasons.push(
      `Errors: ${errorIssues.map((i) => i.description).join('; ')}`
    );
  }

  if (reasons.length === 0) {
    reasons.push('Validation failed');
  }

  return reasons.join('. ');
}

/**
 * Get the escalation chain for a given starting model
 */
export function getEscalationChain(startingModel: string): string[] {
  const chain: string[] = [startingModel];
  const startConfig = MODEL_REGISTRY[startingModel];

  if (!startConfig) {
    return chain;
  }

  let currentTier = startConfig.tier;

  while (currentTier < ComplexityTier.STRATEGIC) {
    currentTier++;
    const nextModel = TIER_TO_MODEL[currentTier as ComplexityTier];
    if (nextModel) {
      chain.push(nextModel);
    }
  }

  return chain;
}

/**
 * Calculate the cost of an escalation chain
 */
export function calculateEscalationCost(
  chain: string[],
  inputTokens: number,
  outputTokens: number
): number {
  let totalCost = 0;

  for (const modelId of chain) {
    const model = MODEL_REGISTRY[modelId];
    if (model) {
      // Cost is per million tokens
      totalCost +=
        (inputTokens * model.inputPricePerMillion) / 1_000_000 +
        (outputTokens * model.outputPricePerMillion) / 1_000_000;
    }
  }

  return totalCost;
}

/**
 * Check if a model can be escalated
 */
export function canEscalate(modelId: string): boolean {
  const model = MODEL_REGISTRY[modelId];
  if (!model) {
    return false;
  }
  return model.tier < ComplexityTier.STRATEGIC;
}

/**
 * Get the next tier model for escalation
 */
export function getNextTierModel(currentModelId: string): string | null {
  const model = MODEL_REGISTRY[currentModelId];
  if (!model) {
    return null;
  }

  if (model.tier >= ComplexityTier.STRATEGIC) {
    return null;
  }

  const nextTier = (model.tier + 1) as ComplexityTier;
  return TIER_TO_MODEL[nextTier] || null;
}

/**
 * Determine if an issue should trigger immediate escalation
 */
export function isImmediateEscalationIssue(issueType: string): boolean {
  const immediateTypes = ['safety', 'hallucination'];
  return immediateTypes.includes(issueType);
}

/**
 * Analyze validation result for escalation decision
 */
export function analyzeForEscalation(
  validationResult: ValidationResult
): {
  shouldEscalate: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
} {
  const reasons: string[] = [];
  let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Check for immediate escalation triggers
  const immediateIssues = validationResult.issues.filter((i) =>
    isImmediateEscalationIssue(i.type)
  );

  if (immediateIssues.length > 0) {
    priority = 'critical';
    reasons.push(
      `Critical issues: ${immediateIssues.map((i) => i.type).join(', ')}`
    );
  }

  // Check for errors
  const errors = validationResult.issues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    if (priority !== 'critical') {
      priority = 'high';
    }
    reasons.push(`${errors.length} error(s) found`);
  }

  // Check for warnings
  const warnings = validationResult.issues.filter(
    (i) => i.severity === 'warning'
  );
  if (warnings.length > 0) {
    if (priority === 'low') {
      priority = 'medium';
    }
    reasons.push(`${warnings.length} warning(s) found`);
  }

  // Check explicit escalation flag
  if (validationResult.shouldEscalate) {
    if (priority === 'low') {
      priority = 'medium';
    }
    reasons.push('Validator recommended escalation');
  }

  // Determine if we should escalate
  const shouldEscalate =
    priority === 'critical' ||
    priority === 'high' ||
    validationResult.shouldEscalate ||
    !validationResult.isValid;

  return {
    shouldEscalate,
    priority,
    reasons,
  };
}
