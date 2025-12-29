/**
 * Model Adapters Index
 *
 * Unified interface for all model adapters.
 */

import { BaseModelAdapter } from './base';
import { ClaudeConfig, createClaudeAdapter } from './claude';
import { GPT4Config, createGPT4Adapter } from './gpt4';
import { GeminiConfig, createGeminiAdapter } from './gemini';
import type { ModelId, ModelResponse } from '../types';

// Re-export types
export type { AdapterConfig, ProviderResponse } from './base';
export type { ClaudeConfig } from './claude';
export type { GPT4Config } from './gpt4';
export type { GeminiConfig } from './gemini';

// Re-export classes
export { BaseModelAdapter } from './base';
export { ClaudeAdapter, createClaudeAdapter } from './claude';
export { GPT4Adapter, createGPT4Adapter } from './gpt4';
export { GeminiAdapter, createGeminiAdapter } from './gemini';

/**
 * Adapter registry type
 */
export type AdapterRegistry = Map<string, BaseModelAdapter>;

/**
 * Config for creating multiple adapters
 */
export interface MultiAdapterConfig {
  claude?: ClaudeConfig;
  gpt4?: GPT4Config;
  gemini?: GeminiConfig;
}

/**
 * Create a registry of all available adapters
 */
export function createAdapterRegistry(config: MultiAdapterConfig = {}): AdapterRegistry {
  const registry: AdapterRegistry = new Map();

  registry.set('claude-3-opus', createClaudeAdapter(config.claude));
  registry.set('gpt-4-turbo', createGPT4Adapter(config.gpt4));
  registry.set('gemini-pro', createGeminiAdapter(config.gemini));

  return registry;
}

/**
 * Get an adapter by model ID
 */
export function getAdapter(
  registry: AdapterRegistry,
  modelId: ModelId | string
): BaseModelAdapter | undefined {
  return registry.get(modelId);
}

/**
 * Query multiple models in parallel
 */
export async function queryMultipleModels(
  registry: AdapterRegistry,
  modelIds: (ModelId | string)[],
  prompt: string,
  context?: { systemPrompt?: string; history?: Array<{ role: string; content: string }> }
): Promise<ModelResponse[]> {
  const queries = modelIds.map(async (modelId) => {
    const adapter = registry.get(modelId);
    if (!adapter) {
      return createMissingAdapterResponse(modelId);
    }
    return adapter.executeWithRetry(prompt, context);
  });

  return Promise.all(queries);
}

/**
 * Create a response for missing adapter
 */
function createMissingAdapterResponse(modelId: string): ModelResponse {
  return {
    modelId,
    modelDisplayName: modelId,
    content: '',
    summary: '',
    confidence: {
      rawScore: null,
      normalizedScore: 0,
      reasoningDepth: 0,
    },
    sourcesCited: [],
    reasoningChain: [],
    latencyMs: 0,
    tokensUsed: 0,
    timestamp: new Date().toISOString(),
    status: 'error',
    errorMessage: `No adapter registered for model: ${modelId}`,
  };
}

/**
 * Get all registered model IDs
 */
export function getRegisteredModelIds(registry: AdapterRegistry): string[] {
  return Array.from(registry.keys());
}

/**
 * Check if a model is registered
 */
export function isModelRegistered(registry: AdapterRegistry, modelId: string): boolean {
  return registry.has(modelId);
}

export default {
  createAdapterRegistry,
  getAdapter,
  queryMultipleModels,
  getRegisteredModelIds,
  isModelRegistered,
};
