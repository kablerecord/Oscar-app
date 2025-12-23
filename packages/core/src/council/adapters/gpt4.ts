/**
 * GPT-4 Model Adapter
 *
 * Adapter for OpenAI GPT-4 API.
 */

import { BaseModelAdapter, ProviderResponse, AdapterConfig } from './base';

/**
 * GPT-4-specific configuration
 */
export interface GPT4Config extends Partial<AdapterConfig> {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Default GPT-4 configuration
 */
const DEFAULT_GPT4_CONFIG: AdapterConfig = {
  modelId: 'gpt-4-turbo',
  modelDisplayName: 'GPT-4',
  timeoutMs: 30000,
  retryAttempts: 1,
  retryDelayMs: 2000,
};

/**
 * GPT-4 API adapter
 */
export class GPT4Adapter extends BaseModelAdapter {
  private apiKey: string | null;
  private model: string;
  private maxTokens: number;

  constructor(config: GPT4Config = {}) {
    super({ ...DEFAULT_GPT4_CONFIG, ...config });
    this.apiKey = config.apiKey || null;
    this.model = config.model || 'gpt-4-turbo-preview';
    this.maxTokens = config.maxTokens || 4096;
  }

  /**
   * Query GPT-4 API
   * Note: In production, this would make actual API calls.
   * This is a mock implementation for testing.
   */
  async query(
    prompt: string,
    context?: { systemPrompt?: string; history?: Array<{ role: string; content: string }> }
  ): Promise<ProviderResponse> {
    // Mock implementation - in production, this would call the actual API
    if (!this.apiKey) {
      return this.createMockResponse(prompt);
    }

    // Production implementation would be:
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${this.apiKey}`,
    //   },
    //   body: JSON.stringify({
    //     model: this.model,
    //     max_tokens: this.maxTokens,
    //     messages: [
    //       ...(context?.systemPrompt ? [{ role: 'system', content: context.systemPrompt }] : []),
    //       ...(context?.history || []),
    //       { role: 'user', content: prompt },
    //     ],
    //   }),
    // });
    // const data = await response.json();
    // return {
    //   content: data.choices[0].message.content,
    //   tokensUsed: { input: data.usage.prompt_tokens, output: data.usage.completion_tokens },
    // };

    return this.createMockResponse(prompt);
  }

  /**
   * Create a mock response for testing
   */
  private createMockResponse(prompt: string): ProviderResponse {
    const content = `Let me address your question comprehensively.

There are several important aspects to consider here:

1. **Practical Considerations**: The immediate practical implications should guide initial thinking. Current best practices suggest a balanced approach.

2. **Strategic Perspective**: Looking at the broader context, there are multiple valid paths forward. The optimal choice depends on your specific goals and constraints.

3. **Action Steps**: Based on my analysis, I recommend:
   - Start with a clear assessment of your current situation
   - Consider both short-term and long-term implications
   - Implement changes incrementally when possible

In my view, the most effective approach would be to balance caution with action. While there are compelling reasons to move forward, it's equally important to maintain flexibility.

Let me know if you'd like me to elaborate on any of these points.`;

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
 * Create a GPT-4 adapter with optional config
 */
export function createGPT4Adapter(config?: GPT4Config): GPT4Adapter {
  return new GPT4Adapter(config);
}

export default GPT4Adapter;
