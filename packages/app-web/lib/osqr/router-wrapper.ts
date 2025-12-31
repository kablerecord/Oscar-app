/**
 * Router Wrapper - Stub Implementation with Error Recovery
 *
 * NOTE: @osqr/core Router is not yet integrated.
 * This file provides stub implementations with graceful fallbacks.
 *
 * ERROR RECOVERY: On any error, defaults to Claude Sonnet.
 */

// Default fallback model
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

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
  fallback?: boolean;
  error?: string;
}

export interface FullRouteResult extends QuickRouteResult {
  classificationLatencyMs: number;
  shouldUseCouncil: boolean;
  contextNeeded: string[];
}

export function quickRoute(_input: string): QuickRouteResult {
  try {
    return {
      taskType: TaskType.GENERAL,
      complexity: ComplexityTier.COMPLEX,
      confidence: 0.8,
      recommendedModel: DEFAULT_MODEL,
      reasoning: 'Default routing (osqr-core not available)',
      tier: 'complex',
      model: DEFAULT_MODEL,
    };
  } catch (error) {
    console.error('[Router] quickRoute error:', error);
    return {
      taskType: TaskType.GENERAL,
      complexity: ComplexityTier.COMPLEX,
      confidence: 0.5,
      recommendedModel: DEFAULT_MODEL,
      reasoning: 'Fallback routing due to error',
      tier: 'complex',
      model: DEFAULT_MODEL,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function fullRoute(
  _input: string,
  _options?: { sessionId?: string; forceModel?: string }
): Promise<FullRouteResult> {
  try {
    const quick = quickRoute(_input);
    return {
      ...quick,
      classificationLatencyMs: 0,
      shouldUseCouncil: false,
      contextNeeded: [],
    };
  } catch (error) {
    console.error('[Router] fullRoute error:', error);
    return {
      taskType: TaskType.GENERAL,
      complexity: ComplexityTier.COMPLEX,
      confidence: 0.5,
      recommendedModel: DEFAULT_MODEL,
      reasoning: 'Fallback routing due to error',
      tier: 'complex',
      model: DEFAULT_MODEL,
      classificationLatencyMs: 0,
      shouldUseCouncil: false,
      contextNeeded: [],
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getModel(_input: string): Promise<string> {
  try {
    return DEFAULT_MODEL;
  } catch (error) {
    console.error('[Router] getModel error:', error);
    return DEFAULT_MODEL; // Always return default on error
  }
}

export function shouldUseFastPath(_input: string): boolean {
  try {
    return false;
  } catch (error) {
    console.error('[Router] shouldUseFastPath error:', error);
    return false;
  }
}

export function isCodeQuestion(_input: string): boolean {
  try {
    return /\b(code|function|class|implement|write|build)\b/i.test(_input);
  } catch (error) {
    console.error('[Router] isCodeQuestion error:', error);
    return false;
  }
}

export function isStrategicQuestion(_input: string): boolean {
  try {
    return /\b(strategy|plan|approach|design|architecture)\b/i.test(_input);
  } catch (error) {
    console.error('[Router] isStrategicQuestion error:', error);
    return false;
  }
}
