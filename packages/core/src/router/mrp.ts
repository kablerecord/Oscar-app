/**
 * Merge-Readiness Pack (MRP) Generator
 *
 * Creates audit trails for routing decisions.
 * Tracks the full lifecycle of a request through the router.
 */

import type {
  MergeReadinessPack,
  ClassificationResult,
  RoutingDecision,
  ValidationResult,
  RouterRequest,
} from './types';
import { MODEL_REGISTRY, TaskType } from './types';

/**
 * Generate a unique MRP ID
 */
function generateMrpId(): string {
  return `mrp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * MRP Builder for progressive construction
 */
export class MrpBuilder {
  private mrp: Partial<MergeReadinessPack>;
  private startTime: number;

  constructor(request: RouterRequest) {
    this.startTime = Date.now();
    this.mrp = {
      id: generateMrpId(),
      timestamp: new Date(),
      originalInput: request.input,
      escalationChain: [],
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      functionalCompleteness: false,
      decisionJustification: '',
    };
  }

  /**
   * Set classification result
   */
  setClassification(
    result: ClassificationResult,
    latencyMs: number
  ): MrpBuilder {
    this.mrp.classificationResult = result;
    this.mrp.classificationLatencyMs = latencyMs;
    return this;
  }

  /**
   * Set routing decision
   */
  setRoutingDecision(decision: RoutingDecision): MrpBuilder {
    this.mrp.routingDecision = decision;
    this.mrp.selectedModel = decision.selectedModel;
    this.mrp.routingLatencyMs = decision.routingLatencyMs;

    // Start escalation chain with selected model
    if (!this.mrp.escalationChain?.includes(decision.selectedModel)) {
      this.mrp.escalationChain?.push(decision.selectedModel);
    }

    return this;
  }

  /**
   * Record an escalation
   */
  recordEscalation(fromModel: string, toModel: string, reason: string): MrpBuilder {
    if (!this.mrp.escalationChain?.includes(toModel)) {
      this.mrp.escalationChain?.push(toModel);
    }

    // Append to justification
    this.mrp.decisionJustification = [
      this.mrp.decisionJustification,
      `Escalated from ${fromModel} to ${toModel}: ${reason}`,
    ]
      .filter(Boolean)
      .join('; ');

    return this;
  }

  /**
   * Set validation result
   */
  setValidation(result: ValidationResult, latencyMs: number): MrpBuilder {
    this.mrp.validationResult = result;
    this.mrp.validationLatencyMs = latencyMs;
    return this;
  }

  /**
   * Set the actual model that was used (after any escalations)
   */
  setActualModel(modelId: string): MrpBuilder {
    this.mrp.actualModelUsed = modelId;
    return this;
  }

  /**
   * Set execution latency
   */
  setExecutionLatency(latencyMs: number): MrpBuilder {
    this.mrp.executionLatencyMs = latencyMs;
    return this;
  }

  /**
   * Add token usage
   */
  addTokenUsage(inputTokens: number, outputTokens: number): MrpBuilder {
    this.mrp.inputTokens = (this.mrp.inputTokens || 0) + inputTokens;
    this.mrp.outputTokens = (this.mrp.outputTokens || 0) + outputTokens;
    return this;
  }

  /**
   * Calculate and set estimated cost
   */
  calculateCost(): MrpBuilder {
    const chain = this.mrp.escalationChain || [];
    let totalCost = 0;

    for (const modelId of chain) {
      const model = MODEL_REGISTRY[modelId];
      if (model) {
        // Cost is per million tokens
        const inputCost = ((this.mrp.inputTokens || 0) * model.inputPricePerMillion) / 1_000_000;
        const outputCost = ((this.mrp.outputTokens || 0) * model.outputPricePerMillion) / 1_000_000;
        totalCost += inputCost + outputCost;
      }
    }

    this.mrp.estimatedCostUsd = totalCost;
    return this;
  }

  /**
   * Set functional completeness
   */
  setFunctionalCompleteness(complete: boolean): MrpBuilder {
    this.mrp.functionalCompleteness = complete;
    return this;
  }

  /**
   * Set decision justification
   */
  setJustification(justification: string): MrpBuilder {
    this.mrp.decisionJustification = justification;
    return this;
  }

  /**
   * Append to decision justification
   */
  appendJustification(text: string): MrpBuilder {
    this.mrp.decisionJustification = [this.mrp.decisionJustification, text]
      .filter(Boolean)
      .join('; ');
    return this;
  }

  /**
   * Build the final MRP
   */
  build(): MergeReadinessPack {
    // Calculate total latency
    this.mrp.totalLatencyMs = Date.now() - this.startTime;

    // Ensure actual model is set
    if (!this.mrp.actualModelUsed && this.mrp.escalationChain?.length) {
      this.mrp.actualModelUsed =
        this.mrp.escalationChain[this.mrp.escalationChain.length - 1];
    }

    // Calculate cost if not done
    if (this.mrp.estimatedCostUsd === 0) {
      this.calculateCost();
    }

    // Generate justification if empty
    if (!this.mrp.decisionJustification) {
      this.mrp.decisionJustification = this.generateDefaultJustification();
    }

    return this.mrp as MergeReadinessPack;
  }

  /**
   * Generate default justification based on MRP state
   */
  private generateDefaultJustification(): string {
    const parts: string[] = [];

    if (this.mrp.classificationResult) {
      parts.push(
        `Task: ${this.mrp.classificationResult.taskType} (tier ${this.mrp.classificationResult.complexityTier})`
      );
      parts.push(
        `Confidence: ${(this.mrp.classificationResult.confidenceScore * 100).toFixed(1)}%`
      );
    }

    if (this.mrp.escalationChain && this.mrp.escalationChain.length > 1) {
      parts.push(`Escalations: ${this.mrp.escalationChain.length - 1}`);
    }

    if (this.mrp.validationResult) {
      parts.push(
        `Validated: ${this.mrp.validationResult.isValid ? 'Pass' : 'Fail'}`
      );
    }

    return parts.join('. ');
  }
}

/**
 * Create a new MRP builder
 */
export function createMrpBuilder(request: RouterRequest): MrpBuilder {
  return new MrpBuilder(request);
}

/**
 * Create a minimal MRP for simple cases
 */
export function createMinimalMrp(
  request: RouterRequest,
  modelUsed: string,
  latencyMs: number
): MergeReadinessPack {
  const classificationResult = {
    taskType: TaskType.SIMPLE_QA,
    complexityTier: MODEL_REGISTRY[modelUsed]?.tier || 2,
    confidenceScore: 1.0,
    requiredContext: [] as string[],
    reasoning: 'Forced model selection',
    inputTokenEstimate: Math.ceil(request.input.length / 4),
    timestamp: new Date(),
  };

  return {
    id: generateMrpId(),
    timestamp: new Date(),
    originalInput: request.input,
    classificationResult,
    routingDecision: {
      selectedModel: modelUsed,
      classificationResult,
      routingLatencyMs: 0,
    },
    selectedModel: modelUsed,
    actualModelUsed: modelUsed,
    escalationChain: [modelUsed],
    totalLatencyMs: latencyMs,
    classificationLatencyMs: 0,
    routingLatencyMs: 0,
    executionLatencyMs: latencyMs,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    functionalCompleteness: true,
    decisionJustification: 'Direct model selection (forced)',
  };
}

/**
 * Summarize an MRP for logging
 */
export function summarizeMrp(mrp: MergeReadinessPack): string {
  const lines: string[] = [];

  lines.push(`MRP ${mrp.id}`);
  lines.push(`Timestamp: ${mrp.timestamp.toISOString()}`);
  lines.push(`Input: "${mrp.originalInput.substring(0, 50)}..."`);
  lines.push(`Model: ${mrp.actualModelUsed}`);
  lines.push(`Escalations: ${mrp.escalationChain.length - 1}`);
  lines.push(`Latency: ${mrp.totalLatencyMs}ms`);
  lines.push(`Cost: $${mrp.estimatedCostUsd.toFixed(6)}`);
  lines.push(`Complete: ${mrp.functionalCompleteness}`);

  if (mrp.validationResult) {
    lines.push(`Valid: ${mrp.validationResult.isValid}`);
    if (mrp.validationResult.issues.length > 0) {
      lines.push(`Issues: ${mrp.validationResult.issues.length}`);
    }
  }

  return lines.join('\n');
}

/**
 * Calculate cost from MRP
 */
export function calculateMrpCost(mrp: MergeReadinessPack): number {
  let totalCost = 0;

  for (const modelId of mrp.escalationChain) {
    const model = MODEL_REGISTRY[modelId];
    if (model) {
      // Cost is per million tokens
      totalCost +=
        (mrp.inputTokens * model.inputPricePerMillion) / 1_000_000 +
        (mrp.outputTokens * model.outputPricePerMillion) / 1_000_000;
    }
  }

  return totalCost;
}

/**
 * Get MRP metrics summary
 */
export function getMrpMetrics(mrp: MergeReadinessPack): {
  totalLatency: number;
  classificationLatency: number;
  routingLatency: number;
  executionLatency: number;
  validationLatency: number;
  escalationCount: number;
  cost: number;
  wasEscalated: boolean;
  wasValidated: boolean;
} {
  return {
    totalLatency: mrp.totalLatencyMs,
    classificationLatency: mrp.classificationLatencyMs,
    routingLatency: mrp.routingLatencyMs,
    executionLatency: mrp.executionLatencyMs,
    validationLatency: mrp.validationLatencyMs || 0,
    escalationCount: mrp.escalationChain.length - 1,
    cost: mrp.estimatedCostUsd,
    wasEscalated: mrp.escalationChain.length > 1,
    wasValidated: mrp.validationResult !== undefined,
  };
}

/**
 * Export MRP as JSON
 */
export function exportMrp(mrp: MergeReadinessPack): string {
  return JSON.stringify(mrp, null, 2);
}

/**
 * Parse MRP from JSON
 */
export function parseMrp(json: string): MergeReadinessPack {
  const parsed = JSON.parse(json);
  parsed.timestamp = new Date(parsed.timestamp);
  return parsed;
}
