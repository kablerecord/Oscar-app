/**
 * Provider Interface - Unified Model Provider
 *
 * Provides a unified interface for calling different AI model providers.
 */

import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
  ModelProviderInterface,
} from '../types';
import { ModelProvider, MODEL_REGISTRY } from '../types';
import { ProviderError, ModelUnavailableError } from '../errors';

// ============================================================================
// Mock Providers (for testing without API keys)
// ============================================================================

/**
 * Simple task type detection for mock responses
 */
function detectTaskTypeForMock(input: string): { taskType: string; tier: number } {
  const lowerInput = input.toLowerCase();

  // Code-related
  if (
    lowerInput.includes('function') ||
    lowerInput.includes('code') ||
    lowerInput.includes('python') ||
    lowerInput.includes('javascript') ||
    lowerInput.includes('implement')
  ) {
    return { taskType: 'code_generation', tier: 3 };
  }

  // Planning
  if (
    lowerInput.includes('plan') ||
    lowerInput.includes('strategy') ||
    lowerInput.includes('architecture')
  ) {
    return { taskType: 'strategic_planning', tier: 4 };
  }

  // Content generation - check for "write " with space to avoid matching "weather"
  if (
    lowerInput.includes('write ') ||
    lowerInput.includes('blog') ||
    lowerInput.includes('article')
  ) {
    return { taskType: 'content_generation', tier: 3 };
  }

  // Default
  return { taskType: 'simple_qa', tier: 2 };
}

/**
 * Mock response generator for testing
 */
function generateMockResponse(
  options: ChatCompletionOptions,
  provider: ModelProvider
): ChatCompletionResponse {
  const inputContent = options.messages.map((m) => m.content).join(' ');
  const inputTokens = Math.ceil(inputContent.length / 4);

  let content: string;

  // Check if expecting JSON response
  if (options.responseFormat === 'json') {
    // Generate mock JSON based on the prompt content
    if (inputContent.includes('classifier') || inputContent.includes('classify')) {
      const { taskType, tier } = detectTaskTypeForMock(inputContent);
      content = JSON.stringify({
        taskType,
        complexityTier: tier,
        confidenceScore: 0.85,
        requiredContext: [],
        reasoning: 'Mock classification for testing',
        inputTokenEstimate: inputTokens,
      });
    } else if (inputContent.includes('validation') || inputContent.includes('validate')) {
      content = JSON.stringify({
        isValid: true,
        issues: [],
        shouldEscalate: false,
      });
    } else {
      content = JSON.stringify({ result: 'mock response' });
    }
  } else {
    content = `Mock response from ${provider} for: ${inputContent.slice(0, 50)}...`;
  }

  const outputTokens = Math.ceil(content.length / 4);

  return {
    content,
    model: options.model,
    inputTokens,
    outputTokens,
    latencyMs: Math.floor(Math.random() * 100) + 50,
  };
}

/**
 * Mock Groq provider
 */
export class MockGroqProvider implements ModelProviderInterface {
  public readonly name = ModelProvider.GROQ;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async complete(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));
    return generateMockResponse(options, ModelProvider.GROQ);
  }
}

/**
 * Mock Anthropic provider
 */
export class MockAnthropicProvider implements ModelProviderInterface {
  public readonly name = ModelProvider.ANTHROPIC;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async complete(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    return generateMockResponse(options, ModelProvider.ANTHROPIC);
  }
}

// ============================================================================
// Provider Manager
// ============================================================================

/**
 * Provider manager - manages all model providers
 */
export class ProviderManager {
  private providers = new Map<ModelProvider, ModelProviderInterface>();
  private useMocks: boolean;

  constructor(useMocks: boolean = true) {
    this.useMocks = useMocks;

    // Initialize with mock providers for now
    // In production, would initialize real providers based on API keys
    if (useMocks) {
      this.providers.set(ModelProvider.GROQ, new MockGroqProvider());
      this.providers.set(ModelProvider.ANTHROPIC, new MockAnthropicProvider());
    }
  }

  /**
   * Get a provider by name
   */
  getProvider(name: ModelProvider): ModelProviderInterface | undefined {
    return this.providers.get(name);
  }

  /**
   * Check if a provider is available
   */
  async isProviderAvailable(name: ModelProvider): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) return false;
    return provider.isAvailable();
  }

  /**
   * Get provider for a model
   */
  getProviderForModel(
    modelId: string,
    registry: Record<string, { provider: ModelProvider }>
  ): ModelProviderInterface | undefined {
    const modelConfig = registry[modelId];
    if (!modelConfig) return undefined;
    return this.providers.get(modelConfig.provider);
  }

  /**
   * Complete a chat request
   */
  async complete(
    options: ChatCompletionOptions,
    registry: Record<string, { provider: ModelProvider }>
  ): Promise<ChatCompletionResponse> {
    const provider = this.getProviderForModel(options.model, registry);

    if (!provider) {
      throw new ModelUnavailableError(options.model);
    }

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new ModelUnavailableError(options.model);
    }

    try {
      return await provider.complete(options);
    } catch (error) {
      if (error instanceof Error) {
        throw new ProviderError(provider.name, error);
      }
      throw error;
    }
  }

  /**
   * Get all available providers
   */
  async getAvailableProviders(): Promise<ModelProvider[]> {
    const available: ModelProvider[] = [];

    for (const [name, provider] of this.providers) {
      const isAvailable = await provider.isAvailable();
      if (isAvailable) {
        available.push(name);
      }
    }

    return available;
  }

  /**
   * Register a provider
   */
  registerProvider(provider: ModelProviderInterface): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Check if using mocks
   */
  isUsingMocks(): boolean {
    return this.useMocks;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let providerManagerInstance: ProviderManager | null = null;

/**
 * Get the provider manager instance
 */
export function getProviderManager(useMocks: boolean = true): ProviderManager {
  if (!providerManagerInstance) {
    providerManagerInstance = new ProviderManager(useMocks);
  }
  return providerManagerInstance;
}

/**
 * Reset the provider manager (for testing)
 */
export function resetProviderManager(): void {
  providerManagerInstance = null;
}
