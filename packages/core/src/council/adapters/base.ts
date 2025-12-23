/**
 * Base Model Adapter
 *
 * Abstract interface for normalizing responses from different AI providers.
 */

import type { ModelResponse, ResponseStatus } from '../types';
import { buildModelConfidence } from '../synthesis/confidence';

/**
 * Base adapter configuration
 */
export interface AdapterConfig {
  modelId: string;
  modelDisplayName: string;
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

/**
 * Raw provider response (varies by provider)
 */
export interface ProviderResponse {
  content: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
  finishReason?: string;
  raw?: unknown;
}

/**
 * Abstract base class for model adapters
 */
export abstract class BaseModelAdapter {
  protected config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  /**
   * Query the model - must be implemented by subclasses
   */
  abstract query(
    prompt: string,
    context?: { systemPrompt?: string; history?: Array<{ role: string; content: string }> }
  ): Promise<ProviderResponse>;

  /**
   * Extract a summary from the response
   */
  extractSummary(content: string): string {
    // Take first 1-2 sentences
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    if (sentences.length === 0) {
      return content.slice(0, 100);
    }
    const summary = sentences.slice(0, 2).join('. ').trim();
    return summary.length > 200 ? summary.slice(0, 200) + '...' : summary + '.';
  }

  /**
   * Extract sources cited in the response
   */
  extractSourcesCited(content: string): string[] {
    const sources: string[] = [];

    // Extract URLs
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = content.match(urlPattern);
    if (urls) {
      sources.push(...urls);
    }

    return [...new Set(sources)];
  }

  /**
   * Extract reasoning chain from response
   */
  extractReasoningChain(content: string): string[] {
    const chain: string[] = [];

    // Look for numbered points
    const numberedPattern = /\b\d+\.\s*([^.!?]+[.!?])/gi;
    let match;
    while ((match = numberedPattern.exec(content)) !== null) {
      if (match[1] && match[1].length > 10 && match[1].length < 200) {
        chain.push(match[1].trim());
      }
    }

    // If no numbered points, extract key reasoning markers
    if (chain.length === 0) {
      const sentences = content.split(/[.!?]+/);
      sentences.forEach((s) => {
        if (
          /\b(because|therefore|thus|hence|since|first|second|finally)\b/i.test(s) &&
          s.trim().length > 10 &&
          s.trim().length < 200
        ) {
          chain.push(s.trim() + '.');
        }
      });
    }

    return chain.slice(0, 5); // Max 5 steps
  }

  /**
   * Normalize provider response into standard ModelResponse
   */
  async normalizeResponse(
    providerResponse: ProviderResponse,
    latencyMs: number
  ): Promise<ModelResponse> {
    const content = providerResponse.content;
    const tokensUsed = providerResponse.tokensUsed
      ? providerResponse.tokensUsed.input + providerResponse.tokensUsed.output
      : this.estimateTokens(content);

    return {
      modelId: this.config.modelId,
      modelDisplayName: this.config.modelDisplayName,
      content,
      summary: this.extractSummary(content),
      confidence: buildModelConfidence(content),
      sourcesCited: this.extractSourcesCited(content),
      reasoningChain: this.extractReasoningChain(content),
      latencyMs,
      tokensUsed,
      timestamp: new Date().toISOString(),
      status: 'success' as ResponseStatus,
    };
  }

  /**
   * Create an error response
   */
  createErrorResponse(error: Error, latencyMs: number): ModelResponse {
    return {
      modelId: this.config.modelId,
      modelDisplayName: this.config.modelDisplayName,
      content: '',
      summary: '',
      confidence: {
        rawScore: null,
        normalizedScore: 0,
        reasoningDepth: 0,
      },
      sourcesCited: [],
      reasoningChain: [],
      latencyMs,
      tokensUsed: 0,
      timestamp: new Date().toISOString(),
      status: 'error' as ResponseStatus,
      errorMessage: error.message,
    };
  }

  /**
   * Create a timeout response
   */
  createTimeoutResponse(latencyMs: number): ModelResponse {
    return {
      modelId: this.config.modelId,
      modelDisplayName: this.config.modelDisplayName,
      content: '',
      summary: '',
      confidence: {
        rawScore: null,
        normalizedScore: 0,
        reasoningDepth: 0,
      },
      sourcesCited: [],
      reasoningChain: [],
      latencyMs,
      tokensUsed: 0,
      timestamp: new Date().toISOString(),
      status: 'timeout' as ResponseStatus,
      errorMessage: `Model timed out after ${this.config.timeoutMs}ms`,
    };
  }

  /**
   * Estimate tokens from content (rough approximation)
   */
  protected estimateTokens(content: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Execute query with retry logic
   */
  async executeWithRetry(
    prompt: string,
    context?: { systemPrompt?: string; history?: Array<{ role: string; content: string }> }
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Add delay for retry attempts
        if (attempt > 0) {
          await this.sleep(this.config.retryDelayMs);
        }

        const providerResponse = await Promise.race([
          this.query(prompt, context),
          this.timeout(this.config.timeoutMs),
        ]);

        if (providerResponse === null) {
          // Timeout
          return this.createTimeoutResponse(Date.now() - startTime);
        }

        return this.normalizeResponse(providerResponse, Date.now() - startTime);
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `${this.config.modelDisplayName} attempt ${attempt + 1} failed:`,
          error
        );
      }
    }

    return this.createErrorResponse(lastError || new Error('Unknown error'), Date.now() - startTime);
  }

  /**
   * Create a timeout promise
   */
  protected timeout(ms: number): Promise<null> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(null), ms);
    });
  }

  /**
   * Sleep helper
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default BaseModelAdapter;
