/**
 * OSQR Throttle - Model Router
 *
 * Routes requests to appropriate models based on budget state.
 * Implements graceful degradation instead of hard cutoffs.
 */

import {
  Tier,
  RequestType,
  RequestComplexity,
  RequestClassification,
  REQUEST_CLASSIFICATIONS,
  ModelType,
  ModelConfig,
  MODEL_CONFIGS,
  RoutingDecision,
  TIER_CONFIGS,
} from './types';
import {
  getBudgetStatus,
  hasPremiumBudget,
  hasEconomyBudget,
  consumePremiumQuery,
  consumeEconomyQuery,
} from './budget-tracker';

// ============================================================================
// Request Classification
// ============================================================================

/**
 * Classify a request based on content
 */
export function classifyRequest(
  content: string,
  context: {
    hasDocuments?: boolean;
    isContemplate?: boolean;
    isCouncil?: boolean;
    hasImages?: boolean;
    isFollowUp?: boolean;
  } = {}
): RequestClassification {
  let type: RequestType = 'simple_question';

  // Determine request type based on context
  if (context.isCouncil) {
    type = 'council_session';
  } else if (context.isContemplate) {
    type = 'contemplate_query';
  } else if (context.hasImages) {
    type = 'image_analysis';
  } else if (context.hasDocuments && content.length > 500) {
    type = 'cross_document_analysis';
  } else if (context.hasDocuments) {
    type = 'document_summary';
  } else if (context.isFollowUp) {
    type = 'followup_chat';
  }

  const classification = REQUEST_CLASSIFICATIONS[type];
  const estimatedCost = estimateCost(type);

  return {
    ...classification,
    estimatedCost,
  };
}

/**
 * Estimate cost for a request type
 */
function estimateCost(type: RequestType): number {
  const costs: Record<RequestType, number> = {
    simple_question: 0.007,
    document_summary: 0.02,
    cross_document_analysis: 0.04,
    contemplate_query: 0.04,
    council_session: 0.08,
    followup_chat: 0.005,
    image_analysis: 0.03,
  };

  return costs[type] || 0.01;
}

// ============================================================================
// Model Routing
// ============================================================================

/**
 * Route a request to the appropriate model based on budget and tier (full API)
 */
export function routeRequestFull(
  userId: string,
  tier: Tier,
  classification: RequestClassification
): RoutingDecision {
  const budgetStatus = getBudgetStatus(userId, tier);
  const tierConfig = TIER_CONFIGS[tier];

  // Check tier-based feature access
  if (classification.type === 'council_session' && !tierConfig.councilMode) {
    return {
      modelType: 'economy',
      modelConfig: MODEL_CONFIGS.economy,
      throttled: true,
      degraded: true,
      showUpgradePrompt: true,
      message: 'Council mode is available on Master tier. I can still help with analysis.',
    };
  }

  if (classification.type === 'contemplate_query' && !tierConfig.contemplateMode) {
    return {
      modelType: 'economy',
      modelConfig: MODEL_CONFIGS.economy,
      throttled: true,
      degraded: true,
      showUpgradePrompt: true,
      message: 'Deep thinking mode is available on Pro tier. I can still help with your question.',
    };
  }

  // Route based on budget state
  return routeByBudgetState(userId, tier, classification, budgetStatus.state);
}

/**
 * Route based on budget state
 */
function routeByBudgetState(
  userId: string,
  tier: Tier,
  classification: RequestClassification,
  budgetState: string
): RoutingDecision {
  switch (budgetState) {
    case 'full':
    case 'high':
      return routeFullBudget(userId, tier, classification);

    case 'medium':
      return routeMediumBudget(userId, tier, classification);

    case 'low':
      return routeLowBudget(userId, tier, classification);

    case 'critical':
      return routeCriticalBudget(userId, tier, classification);

    case 'depleted':
      return routeDepletedBudget(userId, tier, classification);

    default:
      return routeFullBudget(userId, tier, classification);
  }
}

/**
 * Full budget - all models available
 */
function routeFullBudget(
  userId: string,
  tier: Tier,
  classification: RequestClassification
): RoutingDecision {
  if (classification.requiresPremium) {
    consumePremiumQuery(userId, tier);
    return {
      modelType: 'premium',
      modelConfig: MODEL_CONFIGS.premium,
      throttled: false,
      degraded: false,
      showUpgradePrompt: false,
      message: null,
    };
  }

  consumeEconomyQuery(userId, tier);
  return {
    modelType: 'economy',
    modelConfig: MODEL_CONFIGS.economy,
    throttled: false,
    degraded: false,
    showUpgradePrompt: false,
    message: null,
  };
}

/**
 * Medium budget (25-50%) - premium rationed
 */
function routeMediumBudget(
  userId: string,
  tier: Tier,
  classification: RequestClassification
): RoutingDecision {
  if (classification.requiresPremium && hasPremiumBudget(userId, tier)) {
    consumePremiumQuery(userId, tier);
    return {
      modelType: 'premium',
      modelConfig: MODEL_CONFIGS.premium,
      throttled: false,
      degraded: false,
      showUpgradePrompt: false,
      message: null,
    };
  }

  // Fall back to economy
  consumeEconomyQuery(userId, tier);
  return {
    modelType: 'economy',
    modelConfig: MODEL_CONFIGS.economy,
    throttled: classification.requiresPremium,
    degraded: classification.requiresPremium,
    showUpgradePrompt: false,
    message: classification.requiresPremium
      ? 'Using my quick thinking for this. Deep analysis available with full budget.'
      : null,
  };
}

/**
 * Low budget (10-25%) - premium blocked, economy available
 */
function routeLowBudget(
  userId: string,
  tier: Tier,
  classification: RequestClassification
): RoutingDecision {
  if (classification.requiresPremium) {
    // Block premium, use economy with degraded response
    consumeEconomyQuery(userId, tier);
    return {
      modelType: 'economy',
      modelConfig: MODEL_CONFIGS.economy,
      throttled: true,
      degraded: true,
      showUpgradePrompt: true,
      message: "I've hit my daily limit for deep analysis. I can still chat and help with quick stuff.",
    };
  }

  consumeEconomyQuery(userId, tier);
  return {
    modelType: 'economy',
    modelConfig: MODEL_CONFIGS.economy,
    throttled: false,
    degraded: false,
    showUpgradePrompt: false,
    message: null,
  };
}

/**
 * Critical budget (<10%) - economy rationed
 */
function routeCriticalBudget(
  userId: string,
  tier: Tier,
  classification: RequestClassification
): RoutingDecision {
  if (hasEconomyBudget(userId, tier)) {
    consumeEconomyQuery(userId, tier);
    return {
      modelType: 'economy',
      modelConfig: {
        ...MODEL_CONFIGS.economy,
        maxTokens: 1000, // Reduced response length
      },
      throttled: true,
      degraded: true,
      showUpgradePrompt: true,
      message: 'Running on fumes today. Full reset at midnight.',
    };
  }

  // Fall to emergency mode
  return routeDepletedBudget(userId, tier, classification);
}

/**
 * Depleted budget - emergency only
 */
function routeDepletedBudget(
  _userId: string,
  _tier: Tier,
  _classification: RequestClassification
): RoutingDecision {
  return {
    modelType: 'emergency',
    modelConfig: MODEL_CONFIGS.emergency,
    throttled: true,
    degraded: true,
    showUpgradePrompt: true,
    message: "I've used my deep thinking for today. I can still respond briefly, or you can grab more queries.",
  };
}

// ============================================================================
// Batch Routing
// ============================================================================

/**
 * Check if a request can be fulfilled without degradation
 */
export function canFulfillPremium(userId: string, tier: Tier): boolean {
  return hasPremiumBudget(userId, tier);
}

/**
 * Get recommended model for a request without consuming budget
 */
export function previewRoute(
  userId: string,
  tier: Tier,
  classification: RequestClassification
): RoutingDecision {
  const budgetStatus = getBudgetStatus(userId, tier);
  const tierConfig = TIER_CONFIGS[tier];

  // Check feature access
  if (classification.type === 'council_session' && !tierConfig.councilMode) {
    return {
      modelType: 'economy',
      modelConfig: MODEL_CONFIGS.economy,
      throttled: true,
      degraded: true,
      showUpgradePrompt: true,
      message: 'Council mode requires Master tier.',
    };
  }

  // Preview based on current budget state
  if (budgetStatus.state === 'depleted') {
    return {
      modelType: 'emergency',
      modelConfig: MODEL_CONFIGS.emergency,
      throttled: true,
      degraded: true,
      showUpgradePrompt: true,
      message: budgetStatus.message,
    };
  }

  if (classification.requiresPremium && budgetStatus.premiumRemaining > 0) {
    return {
      modelType: 'premium',
      modelConfig: MODEL_CONFIGS.premium,
      throttled: false,
      degraded: false,
      showUpgradePrompt: false,
      message: null,
    };
  }

  return {
    modelType: 'economy',
    modelConfig: MODEL_CONFIGS.economy,
    throttled: classification.requiresPremium,
    degraded: classification.requiresPremium,
    showUpgradePrompt: classification.requiresPremium && budgetStatus.premiumRemaining === 0,
    message: classification.requiresPremium ? budgetStatus.message : null,
  };
}

// ============================================================================
// Simplified Test Compatibility API
// ============================================================================

import {
  getBudgetState as getSimpleBudgetState,
} from './budget-tracker';

/**
 * Select model based on budget state (simplified API for tests)
 */
export function selectModel(
  userId: string,
  tier: Tier,
  _complexity: 'simple' | 'medium' | 'complex'
): ModelConfig {
  const budgetState = getSimpleBudgetState(userId, tier);

  switch (budgetState) {
    case 'healthy':
      return MODEL_CONFIGS.premium;
    case 'warning':
    case 'critical':
      return MODEL_CONFIGS.economy;
    case 'exhausted':
      return MODEL_CONFIGS.emergency;
    default:
      return MODEL_CONFIGS.premium;
  }
}

/**
 * Get model config for a tier (simplified)
 */
export function getModelForTier(tier: Tier): ModelConfig {
  const tierConfig = TIER_CONFIGS[tier];
  if (tierConfig.queriesPerDay === Infinity) {
    return MODEL_CONFIGS.premium;
  }
  return MODEL_CONFIGS.economy;
}

/**
 * Get budget-based model tier
 */
export function getBudgetBasedModelTier(
  userId: string,
  tier: Tier
): 'premium' | 'economy' | 'emergency' {
  const budgetState = getSimpleBudgetState(userId, tier);

  switch (budgetState) {
    case 'healthy':
      return 'premium';
    case 'warning':
    case 'critical':
      return 'economy';
    case 'exhausted':
      return 'emergency';
    default:
      return 'premium';
  }
}

/**
 * Check if graceful degradation should occur
 */
export function shouldDegradeGracefully(userId: string, tier: Tier): boolean {
  const budgetState = getSimpleBudgetState(userId, tier);
  return budgetState === 'warning' || budgetState === 'critical' || budgetState === 'exhausted';
}

/**
 * Get model config by id
 */
export function getModelConfig(modelTier: 'premium' | 'economy' | 'emergency'): ModelConfig {
  return MODEL_CONFIGS[modelTier];
}

/**
 * Simplified route request for tests
 */
export function routeRequest(
  userId: string,
  tier: Tier,
  options: {
    estimatedTokens: number;
    requiresReasoning: boolean;
    isCodeGeneration: boolean;
  }
): {
  model: ModelConfig;
  degraded: boolean;
  reason: string;
} {
  const budgetState = getSimpleBudgetState(userId, tier);
  const model = selectModel(userId, tier, options.requiresReasoning ? 'complex' : 'simple');
  const degraded = budgetState !== 'healthy';

  return {
    model,
    degraded,
    reason: degraded
      ? 'Budget constraints require using a lighter model'
      : 'Full capacity available',
  };
}
