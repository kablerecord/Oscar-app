/**
 * Router - Routing Decision Logic
 *
 * Makes routing decisions based on classification results.
 */

import type {
  ClassificationResult,
  RoutingDecision,
  RouterConfig,
} from './types';
import {
  ComplexityTier,
  TaskType,
  MODEL_REGISTRY,
  TIER_TO_MODEL,
  DEFAULT_ROUTER_CONFIG,
} from './types';

/**
 * Make a routing decision based on classification result
 */
export function makeRoutingDecision(
  classification: ClassificationResult,
  config: Partial<RouterConfig> = {}
): RoutingDecision {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_ROUTER_CONFIG, ...config };

  let selectedTier = classification.complexityTier;
  let escalationReason: string | undefined;
  let escalatedFrom: string | undefined;

  // Special case: Voice transcription always uses Whisper
  if (classification.taskType === TaskType.VOICE_TRANSCRIPTION) {
    return {
      selectedModel: 'whisper-large-v3-turbo',
      classificationResult: classification,
      routingLatencyMs: Date.now() - startTime,
    };
  }

  // Special case: Multi-model deliberation requires highest tier
  if (classification.taskType === TaskType.MULTI_MODEL_DELIBERATION) {
    selectedTier = ComplexityTier.STRATEGIC;
    escalationReason = 'Multi-model deliberation requires highest tier';
    if (classification.complexityTier !== ComplexityTier.STRATEGIC) {
      escalatedFrom = TIER_TO_MODEL[classification.complexityTier];
    }
  }

  // Escalate if confidence is below threshold
  if (
    classification.confidenceScore < cfg.escalationThreshold &&
    selectedTier < ComplexityTier.STRATEGIC
  ) {
    escalatedFrom = TIER_TO_MODEL[selectedTier];
    selectedTier = Math.min(selectedTier + 1, ComplexityTier.STRATEGIC) as ComplexityTier;
    escalationReason = `Confidence ${classification.confidenceScore.toFixed(2)} below threshold ${cfg.escalationThreshold}`;
  }

  return {
    selectedModel: TIER_TO_MODEL[selectedTier],
    classificationResult: classification,
    escalatedFrom,
    escalationReason,
    routingLatencyMs: Date.now() - startTime,
  };
}

/**
 * Get the next tier for escalation
 */
export function getNextTier(currentTier: ComplexityTier): ComplexityTier | null {
  if (currentTier >= ComplexityTier.STRATEGIC) {
    return null;
  }
  return (currentTier + 1) as ComplexityTier;
}

/**
 * Get the model for a specific tier
 */
export function getModelForTier(tier: ComplexityTier): string {
  return TIER_TO_MODEL[tier] || TIER_TO_MODEL[ComplexityTier.SIMPLE];
}

/**
 * Calculate a routing score based on classification
 * Higher score = more efficient routing (low cost, high confidence)
 */
export function calculateRoutingScore(classification: ClassificationResult): number {
  // Base score from confidence
  const confidenceWeight = 0.6;
  const tierWeight = 0.4;

  const confidenceScore = classification.confidenceScore * confidenceWeight;

  // Lower tier = higher efficiency (lower cost)
  // Tier 1 = 1.0, Tier 2 = 0.75, Tier 3 = 0.5, Tier 4 = 0.25
  const tierScore = (1 - (classification.complexityTier - 1) / 4) * tierWeight;

  return Math.max(0, Math.min(1, confidenceScore + tierScore));
}

/**
 * Get the tier for a specific model
 */
export function getTierForModel(modelId: string): ComplexityTier | null {
  const config = MODEL_REGISTRY[modelId];
  return config ? config.tier : null;
}

/**
 * Check if a model is available for routing
 */
export function isModelAvailable(modelId: string): boolean {
  return modelId in MODEL_REGISTRY;
}

/**
 * Get model display name
 */
export function getModelDisplayName(modelId: string): string {
  const config = MODEL_REGISTRY[modelId];
  return config ? config.displayName : modelId;
}

/**
 * Calculate estimated cost for a request
 */
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const config = MODEL_REGISTRY[modelId];
  if (!config) return 0;

  const inputCost = (inputTokens / 1_000_000) * config.inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * config.outputPricePerMillion;

  return inputCost + outputCost;
}

/**
 * Get all models in a tier
 */
export function getModelsInTier(tier: ComplexityTier): string[] {
  return Object.entries(MODEL_REGISTRY)
    .filter(([_, config]) => config.tier === tier)
    .map(([id]) => id);
}

/**
 * Get recommended model for task type
 */
export function getRecommendedModelForTask(taskType: TaskType): string {
  const taskToTier: Record<TaskType, ComplexityTier> = {
    intent_classification: ComplexityTier.ROUTING,
    simple_qa: ComplexityTier.SIMPLE,
    knowledge_lookup: ComplexityTier.SIMPLE,
    content_generation: ComplexityTier.COMPLEX,
    code_generation: ComplexityTier.COMPLEX,
    code_review: ComplexityTier.COMPLEX,
    strategic_planning: ComplexityTier.STRATEGIC,
    multi_model_deliberation: ComplexityTier.STRATEGIC,
    voice_transcription: ComplexityTier.ROUTING,
    output_validation: ComplexityTier.ROUTING,
    formatting: ComplexityTier.ROUTING,
  };

  const tier = taskToTier[taskType] || ComplexityTier.SIMPLE;

  if (taskType === TaskType.VOICE_TRANSCRIPTION) {
    return 'whisper-large-v3-turbo';
  }

  return TIER_TO_MODEL[tier];
}

/**
 * Validate a routing decision
 */
export function validateRoutingDecision(decision: RoutingDecision): string[] {
  const errors: string[] = [];

  if (!decision.selectedModel) {
    errors.push('No model selected');
  } else if (!isModelAvailable(decision.selectedModel)) {
    errors.push(`Selected model ${decision.selectedModel} is not available`);
  }

  if (!decision.classificationResult) {
    errors.push('No classification result');
  }

  if (decision.routingLatencyMs < 0) {
    errors.push('Invalid routing latency');
  }

  return errors;
}

/**
 * Override routing decision with a forced model
 */
export function forceModel(
  classification: ClassificationResult,
  modelId: string
): RoutingDecision {
  const startTime = Date.now();

  if (!isModelAvailable(modelId)) {
    throw new Error(`Model ${modelId} is not available`);
  }

  return {
    selectedModel: modelId,
    classificationResult: classification,
    escalationReason: 'Forced model override',
    routingLatencyMs: Date.now() - startTime,
  };
}

/**
 * Override routing decision with a forced tier
 */
export function forceTier(
  classification: ClassificationResult,
  tier: ComplexityTier
): RoutingDecision {
  const startTime = Date.now();

  return {
    selectedModel: TIER_TO_MODEL[tier],
    classificationResult: {
      ...classification,
      complexityTier: tier,
    },
    escalationReason: 'Forced tier override',
    routingLatencyMs: Date.now() - startTime,
  };
}
