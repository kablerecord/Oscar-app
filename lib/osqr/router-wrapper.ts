/**
 * Router Wrapper for oscar-app
 *
 * Wraps the @osqr/core Router for use in oscar-app.
 * This replaces the current lib/ai/model-router.ts logic.
 */

import { Router, TaskType, ComplexityTier } from '@osqr/core';
import { routerConfig, featureFlags } from './config';

export interface QuickRouteResult {
  taskType: TaskType;
  complexity: ComplexityTier;
  confidence: number;
  recommendedModel: string;
  reasoning: string;
  // Convenience aliases for ask/route.ts
  tier: string;
  model: string;
}

export interface FullRouteResult extends QuickRouteResult {
  classificationLatencyMs: number;
  shouldUseCouncil: boolean;
  contextNeeded: string[];
}

/**
 * Quick routing using heuristics (no LLM call).
 * Use this for fast-path decisions.
 */
export function quickRoute(input: string): QuickRouteResult {
  const classification = Router.quickClassify(input);

  // Map complexity to model
  const modelMap: Record<ComplexityTier, string> = {
    [ComplexityTier.ROUTING]: 'llama-3.1-8b-instant',
    [ComplexityTier.SIMPLE]: 'llama-3.3-70b-versatile',
    [ComplexityTier.COMPLEX]: 'claude-sonnet-4-20250514',
    [ComplexityTier.STRATEGIC]: 'claude-opus-4-20250514',
  };

  const model = modelMap[classification.complexityTier];
  const tierNames: Record<ComplexityTier, string> = {
    [ComplexityTier.ROUTING]: 'routing',
    [ComplexityTier.SIMPLE]: 'simple',
    [ComplexityTier.COMPLEX]: 'complex',
    [ComplexityTier.STRATEGIC]: 'strategic',
  };

  return {
    taskType: classification.taskType,
    complexity: classification.complexityTier,
    confidence: classification.confidenceScore,
    recommendedModel: model,
    reasoning: classification.reasoning,
    // Convenience aliases
    tier: tierNames[classification.complexityTier],
    model,
  };
}

/**
 * Full routing with LLM-based classification.
 * Use this when accuracy matters more than speed.
 */
export async function fullRoute(
  input: string,
  options?: {
    sessionId?: string;
    forceModel?: string;
  }
): Promise<FullRouteResult> {
  const startTime = Date.now();

  try {
    const classification = await Router.classifyTask(input, routerConfig);
    const classificationLatencyMs = Date.now() - startTime;

    // Map complexity to model
    const modelMap: Record<ComplexityTier, string> = {
      [ComplexityTier.ROUTING]: 'llama-3.1-8b-instant',
      [ComplexityTier.SIMPLE]: 'llama-3.3-70b-versatile',
      [ComplexityTier.COMPLEX]: 'claude-sonnet-4-20250514',
      [ComplexityTier.STRATEGIC]: 'claude-opus-4-20250514',
    };

    // Force model if specified
    const recommendedModel = options?.forceModel || modelMap[classification.complexityTier];

    // Determine if council mode should be used
    const shouldUseCouncil =
      classification.taskType === TaskType.MULTI_MODEL_DELIBERATION ||
      classification.taskType === TaskType.STRATEGIC_PLANNING ||
      classification.complexityTier === ComplexityTier.STRATEGIC;

    const tierNames: Record<ComplexityTier, string> = {
      [ComplexityTier.ROUTING]: 'routing',
      [ComplexityTier.SIMPLE]: 'simple',
      [ComplexityTier.COMPLEX]: 'complex',
      [ComplexityTier.STRATEGIC]: 'strategic',
    };

    return {
      taskType: classification.taskType,
      complexity: classification.complexityTier,
      confidence: classification.confidenceScore,
      recommendedModel,
      reasoning: classification.reasoning,
      classificationLatencyMs,
      shouldUseCouncil,
      contextNeeded: classification.requiredContext,
      // Convenience aliases
      tier: tierNames[classification.complexityTier],
      model: recommendedModel,
    };
  } catch (error) {
    // Fall back to quick routing on error
    console.error('[Router] Classification error, falling back to quick route:', error);
    const quick = quickRoute(input);
    return {
      ...quick,
      classificationLatencyMs: Date.now() - startTime,
      shouldUseCouncil: false,
      contextNeeded: [],
    };
  }
}

/**
 * Get the recommended model tier for a given input.
 * Simpler API for when you just need the model.
 */
export async function getModel(input: string): Promise<string> {
  if (!featureFlags.enableRouterMRP) {
    // Fallback to quick route
    return quickRoute(input).recommendedModel;
  }

  try {
    return await Router.getRecommendedModel(input, routerConfig);
  } catch (error) {
    console.error('[Router] getRecommendedModel error:', error);
    return quickRoute(input).recommendedModel;
  }
}

/**
 * Determine if a question should use the fast path or full processing.
 */
export function shouldUseFastPath(input: string): boolean {
  const quick = quickRoute(input);

  // Use fast path for simple, high-confidence classifications
  return (
    quick.complexity <= ComplexityTier.SIMPLE &&
    quick.confidence >= 0.7 &&
    quick.taskType !== TaskType.STRATEGIC_PLANNING &&
    quick.taskType !== TaskType.MULTI_MODEL_DELIBERATION
  );
}

/**
 * Detect if question is about code.
 */
export function isCodeQuestion(input: string): boolean {
  const taskType = Router.detectTaskType(input);
  return taskType === TaskType.CODE_GENERATION || taskType === TaskType.CODE_REVIEW;
}

/**
 * Detect if question requires strategic thinking.
 */
export function isStrategicQuestion(input: string): boolean {
  const taskType = Router.detectTaskType(input);
  return (
    taskType === TaskType.STRATEGIC_PLANNING ||
    taskType === TaskType.MULTI_MODEL_DELIBERATION
  );
}

/**
 * Re-exports for convenience
 */
export { TaskType, ComplexityTier };
