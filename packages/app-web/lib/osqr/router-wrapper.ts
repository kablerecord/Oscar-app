/**
 * Router Wrapper - Stub Implementation
 *
 * NOTE: @osqr/core package is not yet available.
 * This file provides stub implementations.
 */

// Stub enums
export enum TaskType {
  GENERAL = 'general',
  CODE_GENERATION = 'code_generation',
  CODE_REVIEW = 'code_review',
  STRATEGIC_PLANNING = 'strategic_planning',
  MULTI_MODEL_DELIBERATION = 'multi_model_deliberation',
}

export enum ComplexityTier {
  ROUTING = 0,
  SIMPLE = 1,
  COMPLEX = 2,
  STRATEGIC = 3,
}

export interface QuickRouteResult {
  taskType: TaskType;
  complexity: ComplexityTier;
  confidence: number;
  recommendedModel: string;
  reasoning: string;
  tier: string;
  model: string;
}

export interface FullRouteResult extends QuickRouteResult {
  classificationLatencyMs: number;
  shouldUseCouncil: boolean;
  contextNeeded: string[];
}

export function quickRoute(_input: string): QuickRouteResult {
  return {
    taskType: TaskType.GENERAL,
    complexity: ComplexityTier.COMPLEX,
    confidence: 0.8,
    recommendedModel: 'claude-sonnet-4-20250514',
    reasoning: 'Default routing (osqr-core not available)',
    tier: 'complex',
    model: 'claude-sonnet-4-20250514',
  };
}

export async function fullRoute(
  _input: string,
  _options?: { sessionId?: string; forceModel?: string }
): Promise<FullRouteResult> {
  const quick = quickRoute(_input);
  return {
    ...quick,
    classificationLatencyMs: 0,
    shouldUseCouncil: false,
    contextNeeded: [],
  };
}

export async function getModel(_input: string): Promise<string> {
  return 'claude-sonnet-4-20250514';
}

export function shouldUseFastPath(_input: string): boolean {
  return false;
}

export function isCodeQuestion(_input: string): boolean {
  return /\b(code|function|class|implement|write|build)\b/i.test(_input);
}

export function isStrategicQuestion(_input: string): boolean {
  return /\b(strategy|plan|approach|design|architecture)\b/i.test(_input);
}
