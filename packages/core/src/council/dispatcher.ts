/**
 * Council Mode Dispatcher
 *
 * Handles parallel dispatch to multiple models with timeout handling
 * and graceful degradation.
 */

import type {
  ModelResponse,
  ConversationContext,
  ContextDistribution,
  SharedContext,
  SpecializedContext,
  ModelId,
} from './types';
import {
  createAdapterRegistry,
  queryMultipleModels,
  AdapterRegistry,
} from './adapters';
import { TIMEOUT_CONFIG, DEFAULT_CONFIG } from './config';
import { InsufficientResponsesError, ModelTimeoutError } from './types';

/**
 * Dispatch options
 */
export interface DispatchOptions {
  models?: (ModelId | string)[];
  timeoutMs?: number;
  minResponses?: number;
  context?: ConversationContext;
}

/**
 * Dispatch result
 */
export interface DispatchResult {
  responses: ModelResponse[];
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  partialResult: boolean;
}

// Module-level adapter registry
let adapterRegistry: AdapterRegistry | null = null;

/**
 * Initialize the adapter registry
 */
export function initializeAdapters(config?: Parameters<typeof createAdapterRegistry>[0]): void {
  adapterRegistry = createAdapterRegistry(config);
}

/**
 * Get or create adapter registry
 */
function getAdapterRegistry(): AdapterRegistry {
  if (!adapterRegistry) {
    adapterRegistry = createAdapterRegistry();
  }
  return adapterRegistry;
}

/**
 * Dispatch query to multiple models in parallel
 */
export async function dispatchToCouncil(
  query: string,
  options: DispatchOptions = {}
): Promise<DispatchResult> {
  const startTime = Date.now();
  const models = options.models || DEFAULT_CONFIG.defaultModels;
  const timeoutMs = options.timeoutMs || TIMEOUT_CONFIG.totalCouncilTimeoutMs;
  const minResponses = options.minResponses || TIMEOUT_CONFIG.minModelsForSynthesis;

  const registry = getAdapterRegistry();

  // Build context for models
  const contextDistribution = options.context
    ? distributeContext(options.context)
    : undefined;

  // Create the dispatch promise
  const dispatchPromise = queryMultipleModels(
    registry,
    models,
    query,
    contextDistribution?.shared
      ? {
          systemPrompt: buildSystemPrompt(contextDistribution.shared),
          history: options.context?.history?.map((h) => ({
            role: h.role,
            content: h.content,
          })),
        }
      : undefined
  );

  // Race against timeout
  let responses: ModelResponse[];
  try {
    responses = await Promise.race([
      dispatchPromise,
      timeout(timeoutMs).then(() => {
        throw new ModelTimeoutError('council', timeoutMs);
      }),
    ]);
  } catch (error) {
    if (error instanceof ModelTimeoutError) {
      // Timeout - return partial results
      responses = [];
    } else {
      throw error;
    }
  }

  const totalLatencyMs = Date.now() - startTime;

  // Count successes and failures
  const successCount = responses.filter((r) => r.status === 'success').length;
  const failureCount = responses.length - successCount;
  const partialResult = successCount < models.length;

  return {
    responses,
    successCount,
    failureCount,
    totalLatencyMs,
    partialResult,
  };
}

/**
 * Dispatch with fallback handling
 */
export async function handleCouncilWithFallbacks(
  query: string,
  context: ConversationContext
): Promise<DispatchResult> {
  const result = await dispatchToCouncil(query, { context });

  // Filter to successful responses only
  const successfulResponses = result.responses.filter((r) => r.status === 'success');

  // Check minimum threshold
  if (successfulResponses.length < TIMEOUT_CONFIG.minModelsForSynthesis) {
    if (successfulResponses.length === 1) {
      // Single response - return with partial flag
      return {
        ...result,
        responses: successfulResponses,
        partialResult: true,
      };
    }

    if (successfulResponses.length === 0) {
      throw new InsufficientResponsesError(0, TIMEOUT_CONFIG.minModelsForSynthesis);
    }
  }

  return {
    ...result,
    responses: successfulResponses,
  };
}

/**
 * Fallback to single model when council fails
 */
export async function fallbackToSingleModel(
  query: string,
  preferredModel: ModelId | string = 'claude-3-opus'
): Promise<ModelResponse> {
  const registry = getAdapterRegistry();
  const adapter = registry.get(preferredModel);

  if (!adapter) {
    throw new Error(`No adapter available for fallback model: ${preferredModel}`);
  }

  return adapter.executeWithRetry(query);
}

/**
 * Distribute context to models (specialized subsets)
 */
export function distributeContext(context: ConversationContext): ContextDistribution {
  // All models get the core query info
  const shared: SharedContext = {
    originalQuery: context.currentQuery,
    userIntent: context.detectedIntent,
    keyConstraints: context.constraints,
  };

  // Specialized context based on model strengths
  const specialized: Record<string, SpecializedContext> = {
    'claude-3-opus': {
      relevantHistory: filterHistoryForReasoning(context.history),
      domainContext: extractPhilosophicalContext(context),
    },
    'gpt-4-turbo': {
      relevantHistory: filterHistoryForBreadth(context.history),
      domainContext: extractPracticalContext(context),
    },
    'gemini-pro': {
      relevantHistory: filterHistoryForResearch(context.history),
      domainContext: extractFactualContext(context),
    },
  };

  return { shared, specialized };
}

/**
 * Build system prompt from shared context
 */
function buildSystemPrompt(shared: SharedContext): string {
  const parts: string[] = [];

  if (shared.userIntent) {
    parts.push(`User Intent: ${shared.userIntent}`);
  }

  if (shared.keyConstraints.length > 0) {
    parts.push(`Key Constraints: ${shared.keyConstraints.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Filter history for reasoning-focused model (Claude)
 */
function filterHistoryForReasoning(
  history: Array<{ role: string; content: string }>
): string[] {
  // Focus on messages with reasoning or philosophical content
  return history
    .filter((h) =>
      /\b(because|therefore|reason|logic|ethical|moral|principle)\b/i.test(h.content)
    )
    .slice(-5)
    .map((h) => h.content);
}

/**
 * Filter history for breadth-focused model (GPT-4)
 */
function filterHistoryForBreadth(
  history: Array<{ role: string; content: string }>
): string[] {
  // Include recent diverse history
  return history.slice(-10).map((h) => h.content);
}

/**
 * Filter history for research-focused model (Gemini)
 */
function filterHistoryForResearch(
  history: Array<{ role: string; content: string }>
): string[] {
  // Focus on messages with data or research content
  return history
    .filter((h) =>
      /\b(research|study|data|source|according to|statistics)\b/i.test(h.content)
    )
    .slice(-5)
    .map((h) => h.content);
}

/**
 * Extract philosophical context from conversation
 */
function extractPhilosophicalContext(context: ConversationContext): string[] {
  const philosophical: string[] = [];

  if (/\b(ethics|moral|principle|philosophy)\b/i.test(context.currentQuery)) {
    philosophical.push('Query involves ethical or philosophical considerations');
  }

  return philosophical;
}

/**
 * Extract practical context from conversation
 */
function extractPracticalContext(context: ConversationContext): string[] {
  const practical: string[] = [];

  if (/\b(how to|steps|practical|action|implementation)\b/i.test(context.currentQuery)) {
    practical.push('Query requires practical, actionable guidance');
  }

  return practical;
}

/**
 * Extract factual context from conversation
 */
function extractFactualContext(context: ConversationContext): string[] {
  const factual: string[] = [];

  if (/\b(what is|facts|data|statistics|research)\b/i.test(context.currentQuery)) {
    factual.push('Query requires factual, data-driven response');
  }

  return factual;
}

/**
 * Timeout helper
 */
function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  dispatchToCouncil,
  handleCouncilWithFallbacks,
  fallbackToSingleModel,
  distributeContext,
  initializeAdapters,
};
