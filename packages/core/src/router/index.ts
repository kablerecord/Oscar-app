/**
 * Multi-Model Router - Main Entry Point
 *
 * Routes requests to appropriate models based on complexity.
 * Provides cost-effective model selection with quality validation.
 */

import type {
  RouterRequest,
  RouterResponse,
  RouterConfig,
  RoutingDecision,
  ValidationResult,
} from './types';
import { ComplexityTier, TIER_TO_MODEL, ModelProvider } from './types';
import { classifyTask } from './classifier';
import { makeRoutingDecision } from './router';
import { validateResponse, quickValidate, shouldSkipValidation } from './validator';
import { handleEscalation, needsEscalation } from './escalation';
import { createMrpBuilder, createMinimalMrp } from './mrp';
import { getProviderManager } from './providers';
import { RouterError, ProviderError, TimeoutError } from './errors';

// Re-export types and utilities
export * from './types';
export {
  ClassificationError,
  ProviderError,
  TimeoutError,
  ModelUnavailableError,
} from './errors';
export { classifyTask, quickClassify, CLASSIFICATION_SYSTEM_PROMPT, detectTaskType, estimateComplexity } from './classifier';
export { makeRoutingDecision } from './router';
export { validateResponse, quickValidate } from './validator';
export { handleEscalation, needsEscalation, getEscalationChain } from './escalation';
export { createMrpBuilder, createMinimalMrp, summarizeMrp } from './mrp';
export { getProviderManager, resetProviderManager } from './providers';

/**
 * Default router configuration
 */
export const DEFAULT_CONFIG: RouterConfig = {
  escalationThreshold: 0.7,
  highConfidenceThreshold: 0.95,
  maxEscalations: 2,
  maxValidationRetries: 3,
  classificationTimeoutMs: 3000,
  routingTimeoutMs: 1000,
  validationTimeoutMs: 5000,
  enableValidation: true,
  enableMrpGeneration: true,
  enableCostTracking: true,
};

/**
 * Route a request through the multi-model system
 *
 * This is the main entry point for the router.
 */
export async function routeRequest(
  request: RouterRequest,
  config: Partial<RouterConfig> = {}
): Promise<RouterResponse> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  const providerManager = getProviderManager();
  const mrpBuilder = createMrpBuilder(request);

  try {
    // Handle forced model selection
    if (request.forceModel) {
      return await handleForcedModel(request, fullConfig, providerManager);
    }

    // Step 1: Classify the task
    const classificationStart = Date.now();
    const classification = await classifyTask(request.input, fullConfig);
    const classificationLatency = Date.now() - classificationStart;

    mrpBuilder.setClassification(classification, classificationLatency);

    // Handle forced tier
    if (request.forceTier !== undefined) {
      const model = TIER_TO_MODEL[request.forceTier];
      if (model) {
        return await executeWithModel(
          request,
          model,
          classification,
          fullConfig,
          providerManager,
          mrpBuilder
        );
      }
    }

    // Step 2: Make routing decision
    const routingDecision = makeRoutingDecision(classification, fullConfig);
    mrpBuilder.setRoutingDecision(routingDecision);

    // Step 3: Execute with selected model
    let currentDecision = routingDecision;
    let escalationCount = 0;
    let output: string = '';
    let validationResult: ValidationResult | null = null;

    while (true) {
      // Execute the model
      const executionStart = Date.now();
      output = await executeModel(
        request,
        currentDecision.selectedModel,
        providerManager
      );
      mrpBuilder.setExecutionLatency(Date.now() - executionStart);
      mrpBuilder.setActualModel(currentDecision.selectedModel);

      // Step 4: Validate if enabled
      if (fullConfig.enableValidation) {
        // Skip validation for high-confidence simple tasks
        if (
          shouldSkipValidation(classification.confidenceScore, fullConfig) &&
          classification.complexityTier <= ComplexityTier.SIMPLE
        ) {
          // Quick validate only
          validationResult = quickValidate(request.input, output);
        } else {
          // Full LLM-as-Judge validation
          const validationStart = Date.now();
          try {
            validationResult = await validateResponse(
              request.input,
              output,
              fullConfig
            );
            mrpBuilder.setValidation(validationResult, Date.now() - validationStart);
          } catch (error) {
            // Validation failed, use quick validate as fallback
            validationResult = quickValidate(request.input, output);
          }
        }

        // Step 5: Handle escalation if needed
        if (needsEscalation(validationResult, fullConfig)) {
          const escalationResult = handleEscalation(
            request,
            currentDecision,
            validationResult,
            fullConfig,
            escalationCount
          );

          if (escalationResult.shouldEscalate && escalationResult.newDecision) {
            mrpBuilder.recordEscalation(
              currentDecision.selectedModel,
              escalationResult.newDecision.selectedModel,
              escalationResult.reason
            );
            currentDecision = escalationResult.newDecision;
            escalationCount++;
            continue; // Retry with higher-tier model
          }
        }
      }

      // No more escalation needed, break the loop
      break;
    }

    // Build MRP and response
    mrpBuilder.setFunctionalCompleteness(
      validationResult?.isValid ?? true
    );

    const mrp = mrpBuilder.build();

    return {
      output,
      mrp,
      metadata: {
        modelUsed: mrp.actualModelUsed,
        tier: classification.complexityTier,
        wasEscalated: mrp.escalationChain.length > 1,
        wasValidated: validationResult !== null,
        totalLatencyMs: Date.now() - startTime,
        estimatedCostUsd: mrp.estimatedCostUsd,
      },
    };
  } catch (error) {
    if (error instanceof TimeoutError || error instanceof ProviderError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new RouterError('PROVIDER_ERROR', error.message, false);
    }

    throw new RouterError('PROVIDER_ERROR', 'Unknown router error', false);
  }
}

/**
 * Handle forced model selection
 */
async function handleForcedModel(
  request: RouterRequest,
  config: RouterConfig,
  providerManager: ReturnType<typeof getProviderManager>
): Promise<RouterResponse> {
  const startTime = Date.now();
  const modelId = request.forceModel!;

  const output = await executeModel(request, modelId, providerManager);

  const mrp = createMinimalMrp(request, modelId, Date.now() - startTime);

  return {
    output,
    mrp,
    metadata: {
      modelUsed: modelId,
      tier: ComplexityTier.SIMPLE,
      wasEscalated: false,
      wasValidated: false,
      totalLatencyMs: Date.now() - startTime,
      estimatedCostUsd: 0,
    },
  };
}

/**
 * Execute with a specific model (including classification-aware MRP)
 */
async function executeWithModel(
  request: RouterRequest,
  modelId: string,
  classification: Awaited<ReturnType<typeof classifyTask>>,
  config: RouterConfig,
  providerManager: ReturnType<typeof getProviderManager>,
  mrpBuilder: ReturnType<typeof createMrpBuilder>
): Promise<RouterResponse> {
  const startTime = Date.now();

  const routingDecision: RoutingDecision = {
    selectedModel: modelId,
    classificationResult: classification,
    routingLatencyMs: 0,
  };

  mrpBuilder.setRoutingDecision(routingDecision);

  const output = await executeModel(request, modelId, providerManager);
  mrpBuilder.setExecutionLatency(Date.now() - startTime);
  mrpBuilder.setActualModel(modelId);
  mrpBuilder.setFunctionalCompleteness(true);

  const mrp = mrpBuilder.build();

  return {
    output,
    mrp,
    metadata: {
      modelUsed: modelId,
      tier: classification.complexityTier,
      wasEscalated: false,
      wasValidated: false,
      totalLatencyMs: Date.now() - startTime,
      estimatedCostUsd: mrp.estimatedCostUsd,
    },
  };
}

/**
 * Execute a model call
 */
async function executeModel(
  request: RouterRequest,
  modelId: string,
  providerManager: ReturnType<typeof getProviderManager>
): Promise<string> {
  const response = await providerManager.complete(
    {
      model: modelId,
      messages: [{ role: 'user', content: request.input }],
    },
    {} as any
  );

  return response.content;
}

/**
 * Quick route for simple classification-only queries
 */
export async function classifyOnly(
  input: string,
  config: Partial<RouterConfig> = {}
): Promise<{
  taskType: string;
  tier: ComplexityTier;
  confidence: number;
  suggestedModel: string;
}> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const classification = await classifyTask(input, fullConfig);

  return {
    taskType: classification.taskType,
    tier: classification.complexityTier,
    confidence: classification.confidenceScore,
    suggestedModel: TIER_TO_MODEL[classification.complexityTier],
  };
}

/**
 * Get the recommended model for an input without executing
 */
export async function getRecommendedModel(
  input: string,
  config: Partial<RouterConfig> = {}
): Promise<string> {
  const result = await classifyOnly(input, config);
  return result.suggestedModel;
}

/**
 * Health check for the router
 */
export async function healthCheck(): Promise<{
  status: 'ok' | 'degraded' | 'error';
  providers: Record<string, boolean>;
}> {
  const providerManager = getProviderManager();

  // Check each provider
  const providers: Record<string, boolean> = {
    groq: await providerManager.isProviderAvailable(ModelProvider.GROQ),
    anthropic: await providerManager.isProviderAvailable(ModelProvider.ANTHROPIC),
  };

  const allAvailable = Object.values(providers).every((v) => v);
  const someAvailable = Object.values(providers).some((v) => v);

  return {
    status: allAvailable ? 'ok' : someAvailable ? 'degraded' : 'error',
    providers,
  };
}
