/**
 * Council Mode Configuration
 *
 * Tier limits, timeouts, specialty weights, and defaults.
 */

import type {
  TierLimits,
  TimeoutConfig,
  UserTier,
  ModelId,
} from './types';

// ============================================
// TIER CONFIGURATION
// ============================================

export const TIER_CONFIG: Record<UserTier, TierLimits> = {
  free: {
    councilPerDay: 3,
    autoTriggerEnabled: false,     // User must invoke manually
    modelsAvailable: 2,            // Claude + GPT-4 only
  },
  pro: {
    councilPerDay: 25,
    autoTriggerEnabled: true,      // For high-stakes only
    modelsAvailable: 3,            // All three
  },
  enterprise: {
    councilPerDay: 'unlimited',
    autoTriggerEnabled: true,      // Full auto-trigger logic
    modelsAvailable: 4,            // Including specialty models (future)
  },
};

// ============================================
// TIMEOUT CONFIGURATION
// ============================================

export const TIMEOUT_CONFIG: TimeoutConfig = {
  perModelTimeoutMs: 30000,        // 30 seconds max per model
  totalCouncilTimeoutMs: 45000,    // 45 seconds for entire council
  minModelsForSynthesis: 2,        // Need at least 2 responses to proceed
  retryAttempts: 1,                // One retry on failure
  retryDelayMs: 2000,              // 2 second delay before retry
};

// ============================================
// DEFAULT PARAMETERS
// ============================================

export const DEFAULT_CONFIG = {
  perModelTimeoutMs: 30000,
  totalCouncilTimeoutMs: 45000,
  minModelsForSynthesis: 2,
  retryAttempts: 1,
  retryDelayMs: 2000,
  disagreementThreshold: 15,       // Percentage points
  financialThreshold: 10000,       // Dollar amount for auto-trigger
  defaultModels: ['claude-3-opus', 'gpt-4-turbo', 'gemini-pro'] as ModelId[],
};

// ============================================
// MODEL SPECIALTY WEIGHTS
// Default weights by query classification
// ============================================

export type QueryType =
  | 'deep_reasoning'
  | 'current_events'
  | 'creative'
  | 'code_technical'
  | 'multi_source'
  | 'financial'
  | 'strategic_planning'
  | 'factual'
  | 'general';

export interface ModelWeights {
  claude: number;
  gpt4: number;
  gemini: number;
}

export const SPECIALTY_WEIGHTS: Record<QueryType, ModelWeights> = {
  deep_reasoning: { claude: 60, gpt4: 25, gemini: 15 },
  current_events: { claude: 20, gpt4: 30, gemini: 50 },
  creative: { claude: 35, gpt4: 50, gemini: 15 },
  code_technical: { claude: 45, gpt4: 40, gemini: 15 },
  multi_source: { claude: 35, gpt4: 25, gemini: 40 },
  financial: { claude: 45, gpt4: 35, gemini: 20 },
  strategic_planning: { claude: 50, gpt4: 30, gemini: 20 },
  factual: { claude: 25, gpt4: 35, gemini: 40 },
  general: { claude: 34, gpt4: 33, gemini: 33 },
};

/**
 * Get specialty weights for a query type
 */
export function getSpecialtyWeights(queryType: QueryType): ModelWeights {
  return SPECIALTY_WEIGHTS[queryType] || SPECIALTY_WEIGHTS.general;
}

/**
 * Map query classification to query type
 */
export function mapClassificationToQueryType(
  classifications: string[]
): QueryType {
  const normalized = classifications.map((c) => c.toLowerCase());

  if (
    normalized.some((c) =>
      ['philosophy', 'ethics', 'deep', 'reasoning', 'logic'].includes(c)
    )
  ) {
    return 'deep_reasoning';
  }

  if (
    normalized.some((c) =>
      ['news', 'current', 'events', 'recent', 'today'].includes(c)
    )
  ) {
    return 'current_events';
  }

  if (
    normalized.some((c) =>
      ['creative', 'brainstorm', 'story', 'writing', 'fiction'].includes(c)
    )
  ) {
    return 'creative';
  }

  if (
    normalized.some((c) =>
      ['code', 'programming', 'technical', 'software', 'debug'].includes(c)
    )
  ) {
    return 'code_technical';
  }

  if (
    normalized.some((c) =>
      ['research', 'sources', 'synthesis', 'compare', 'multiple'].includes(c)
    )
  ) {
    return 'multi_source';
  }

  if (
    normalized.some((c) =>
      ['financial', 'money', 'investment', 'budget', 'mortgage'].includes(c)
    )
  ) {
    return 'financial';
  }

  if (
    normalized.some((c) =>
      ['strategy', 'planning', 'long-term', 'roadmap', 'business'].includes(c)
    )
  ) {
    return 'strategic_planning';
  }

  if (
    normalized.some((c) =>
      ['fact', 'factual', 'data', 'statistics', 'definition'].includes(c)
    )
  ) {
    return 'factual';
  }

  return 'general';
}

// ============================================
// MODEL DISPLAY NAMES
// ============================================

export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'claude-3-opus': 'Claude',
  'gpt-4-turbo': 'GPT-4',
  'gemini-pro': 'Gemini',
};

export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] || modelId;
}

// ============================================
// CONFIDENCE WEIGHTS
// ============================================

export const CONFIDENCE_WEIGHTS = {
  reasoningDepth: 0.30,
  hedgingLanguage: 0.25,
  sourceCitations: 0.15,
  responseCompleteness: 0.15,
  internalConsistency: 0.15,
};

// ============================================
// COST ESTIMATES PER 1K TOKENS
// ============================================

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gemini-pro': { input: 0.00025, output: 0.0005 },
};

export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[modelId] || { input: 0.01, output: 0.03 };
  return (
    (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output
  );
}
