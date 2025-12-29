/**
 * Claude Model Adapter
 *
 * Adapter for Anthropic Claude API.
 */

import { BaseModelAdapter, ProviderResponse, AdapterConfig } from './base';

/**
 * Claude-specific configuration
 */
export interface ClaudeConfig extends Partial<AdapterConfig> {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Default Claude configuration
 */
const DEFAULT_CLAUDE_CONFIG: AdapterConfig = {
  modelId: 'claude-3-opus',
  modelDisplayName: 'Claude',
  timeoutMs: 30000,
  retryAttempts: 1,
  retryDelayMs: 2000,
};

/**
 * Claude API adapter
 */
export class ClaudeAdapter extends BaseModelAdapter {
  private apiKey: string | null;
  private model: string;
  private maxTokens: number;

  constructor(config: ClaudeConfig = {}) {
    super({ ...DEFAULT_CLAUDE_CONFIG, ...config });
    this.apiKey = config.apiKey || null;
    this.model = config.model || 'claude-3-opus-20240229';
    this.maxTokens = config.maxTokens || 4096;
  }

  /**
   * Query Claude API
   * Note: In production, this would make actual API calls.
   * This is a mock implementation for testing.
   */
  async query(
    prompt: string,
    _context?: { systemPrompt?: string; history?: Array<{ role: string; content: string }> }
  ): Promise<ProviderResponse> {
    // Mock implementation - in production, this would call the actual API
    if (!this.apiKey) {
      // Return a mock response for testing
      return this.createMockResponse(prompt);
    }

    // Production implementation would be:
    // const response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'x-api-key': this.apiKey,
    //     'anthropic-version': '2023-06-01',
    //   },
    //   body: JSON.stringify({
    //     model: this.model,
    //     max_tokens: this.maxTokens,
    //     system: context?.systemPrompt,
    //     messages: [
    //       ...(context?.history || []),
    //       { role: 'user', content: prompt },
    //     ],
    //   }),
    // });
    // const data = await response.json();
    // return {
    //   content: data.content[0].text,
    //   tokensUsed: { input: data.usage.input_tokens, output: data.usage.output_tokens },
    // };

    return this.createMockResponse(prompt);
  }

  /**
   * Create a mock response for testing
   */
  private createMockResponse(prompt: string): ProviderResponse {
    const content = `Based on careful analysis, here is my perspective on your query.

First, let me consider the key factors involved. The situation requires weighing multiple considerations carefully.

Second, examining the evidence and reasoning, I believe the most important points are:

1. The primary consideration is understanding the full context
2. Historical precedents suggest a particular approach
3. The most reasonable conclusion follows from these factors

Therefore, my recommendation would be to proceed thoughtfully, considering both immediate needs and long-term implications. This approach balances practicality with principle.

However, it's worth noting that alternative perspectives exist, and the optimal choice may depend on your specific priorities and constraints.`;

    return {
      content,
      tokensUsed: {
        input: Math.ceil(prompt.length / 4),
        output: Math.ceil(content.length / 4),
      },
    };
  }
}

/**
 * Create a Claude adapter with optional config
 */
export function createClaudeAdapter(config?: ClaudeConfig): ClaudeAdapter {
  return new ClaudeAdapter(config);
}

export default ClaudeAdapter;
