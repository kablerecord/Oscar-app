/**
 * OSQR Core Integration
 *
 * Bridges the app-web interface to @osqr/core brain components.
 * All intelligence lives in @osqr/core - this file adapts the API
 * for the web interface and respects feature flags.
 */

import {
  Constitutional,
  Router,
  MemoryVault,
  Council,
  Guidance,
  Temporal,
  Bubble,
  DocumentIndexing,
  Throttle,
} from '@osqr/core';

import { featureFlags } from './config';

export type UserTier = 'starter' | 'lite' | 'pro' | 'master' | 'enterprise';

// Map our UserTier to @osqr/core Tier
type CoreTier = 'lite' | 'pro' | 'master' | 'enterprise';
function mapTier(tier: UserTier): CoreTier {
  if (tier === 'starter') return 'lite';
  return tier as CoreTier;
}

// ============================================================================
// Constitutional
// ============================================================================

export async function validateUserInput(
  input: string,
  userId: string,
  sessionId?: string
) {
  if (!featureFlags.enableConstitutionalValidation) {
    return {
      allowed: true,
      clausesChecked: [] as string[],
      violations: [] as { type: string; clause: string }[],
      confidenceScore: 1.0,
    };
  }

  const result = await Constitutional.validateIntent({
    userId,
    sessionId: sessionId || 'default',
    input,
    source: 'web',
  });

  return {
    allowed: result.allowed,
    clausesChecked: result.clausesChecked,
    violations: result.violations.map((v: { type: string; clauseId: string }) => ({
      type: v.type,
      clause: v.clauseId,
    })),
    confidenceScore: result.confidenceScore,
  };
}

export async function validateAIOutput(
  output: string,
  originalInput: string,
  userId: string
) {
  if (!featureFlags.enableConstitutionalValidation) {
    return {
      valid: true,
      violations: [] as { type: string; clause: string }[],
      sanitizedOutput: undefined,
    };
  }

  const result = await Constitutional.validateOutput({
    userId,
    originalInput,
    output,
    source: 'web',
  });

  return {
    valid: result.isValid,
    violations: result.violations.map((v: { type: string; clauseId: string }) => ({
      type: v.type,
      clause: v.clauseId,
    })),
    sanitizedOutput: result.sanitizedOutput,
  };
}

export function quickScreenInput(input: string) {
  if (!featureFlags.enableConstitutionalValidation) {
    return { allowed: true, reason: null };
  }
  return Constitutional.quickScreenInput(input);
}

export function quickScreenOutput(output: string) {
  if (!featureFlags.enableConstitutionalValidation) {
    return { allowed: true, reason: null };
  }
  return Constitutional.quickScreenOutput(output);
}

// ============================================================================
// Router
// ============================================================================

export async function classifyQuestion(input: string) {
  if (!featureFlags.enableRouterMRP) {
    return {
      taskType: 'general' as const,
      complexity: 'medium' as const,
      confidence: 0.8,
    };
  }

  const result = await Router.classifyTask(input, {});
  const complexityMap = ['simple', 'medium', 'complex', 'expert'] as const;

  return {
    taskType: result.taskType,
    complexity: complexityMap[Math.min(result.complexityTier, 3)] || 'medium',
    confidence: result.confidenceScore,
  };
}

export function quickClassify(input: string) {
  if (!featureFlags.enableRouterMRP) {
    return { taskType: 'general', confidence: 0.7 };
  }
  return Router.quickClassify(input);
}

export function detectTaskType(input: string) {
  if (!featureFlags.enableRouterMRP) {
    return 'general';
  }
  return Router.detectTaskType(input);
}

export function estimateComplexity(input: string, taskType: string) {
  if (!featureFlags.enableRouterMRP) {
    return 'medium';
  }
  return Router.estimateComplexity(input, taskType);
}

export async function getRecommendedModel(input: string) {
  if (!featureFlags.enableSmartRouting) {
    return { modelId: 'claude-sonnet-4-20250514', provider: 'anthropic' };
  }

  const modelId = await Router.getRecommendedModel(input);
  const provider = modelId.includes('claude') ? 'anthropic' :
                   modelId.includes('gpt') ? 'openai' :
                   modelId.includes('gemini') ? 'google' : 'groq';

  return { modelId, provider };
}

export async function routeRequest(
  input: string,
  options?: {
    inputType?: 'text' | 'voice' | 'image';
    sessionId?: string;
    userId?: string;
    forceModel?: string;
  }
) {
  if (!featureFlags.enableSmartRouting) {
    return {
      modelId: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      reason: 'default',
    };
  }

  const result = await Router.routeRequest({
    input,
    inputType: options?.inputType || 'text',
    sessionId: options?.sessionId,
    userId: options?.userId,
    forceModel: options?.forceModel,
  });

  const modelId = result.metadata.modelUsed;
  const provider = modelId.includes('claude') ? 'anthropic' :
                   modelId.includes('gpt') ? 'openai' :
                   modelId.includes('gemini') ? 'google' : 'groq';

  return {
    modelId,
    provider,
    reason: result.metadata.wasEscalated ? 'escalated' : 'routed',
  };
}

export async function routerHealthCheck() {
  return Router.healthCheck();
}

// ============================================================================
// Memory Vault
// ============================================================================

export function initializeVault(userId: string) {
  if (!featureFlags.enableMemoryVault) {
    return { success: true };
  }
  return MemoryVault.initializeVault(userId);
}

export async function retrieveContext(
  query: string,
  userId: string,
  options?: {
    categories?: string[];
    maxResults?: number;
    minRelevance?: number;
  }
) {
  if (!featureFlags.enableMemoryVault) {
    return { memories: [], context: '' };
  }

  return MemoryVault.retrieveContext(query, userId, options);
}

export function storeMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  if (!featureFlags.enableMemoryVault) {
    return { success: true };
  }
  return MemoryVault.storeMessage(conversationId, role, content);
}

export async function searchMemories(
  userId: string,
  query: string,
  filters?: Record<string, unknown>
) {
  if (!featureFlags.enableMemoryVault) {
    return [];
  }
  return MemoryVault.searchMemories(userId, query, filters);
}

export async function getEpisodicContext(userId: string, limit?: number) {
  if (!featureFlags.enableMemoryVault) {
    return [];
  }
  return MemoryVault.getConversationHistory(userId, limit);
}

// ============================================================================
// Council Mode
// ============================================================================

export function shouldTriggerCouncil(
  query: string,
  context?: Record<string, unknown>
) {
  if (!featureFlags.enableCouncilMode) {
    return false;
  }
  return Council.shouldTriggerCouncil(query, context as Parameters<typeof Council.shouldTriggerCouncil>[1]);
}

export async function runCouncilDeliberation(
  query: string,
  context?: Record<string, unknown>,
  options?: Record<string, unknown>
) {
  if (!featureFlags.enableCouncilMode) {
    return { responses: [], synthesis: '' };
  }

  const result = await Council.executeCouncil(
    query,
    context as Parameters<typeof Council.executeCouncil>[1],
    options as Parameters<typeof Council.executeCouncil>[2]
  );

  if (!result.triggered || !result.deliberation) {
    return { responses: [], synthesis: '' };
  }

  return {
    responses: result.deliberation.responses.map((r: { modelId: string; content: string }) => ({
      model: r.modelId,
      response: r.content,
    })),
    synthesis: result.deliberation.synthesis.content,
  };
}

export async function synthesizeCouncilResponses(
  query: string,
  responses: { model: string; response: string }[]
) {
  if (!featureFlags.enableCouncilMode) {
    return { synthesis: '' };
  }

  const modelResponses = responses.map(r => ({
    modelId: r.model as 'claude' | 'gpt4' | 'gemini',
    content: r.response,
    status: 'success' as const,
    confidence: { overall: 0.8, factors: {} },
    latencyMs: 0,
    timestamp: new Date(),
  }));

  const result = await Council.synthesize(query, modelResponses);
  return { synthesis: result.content };
}

// ============================================================================
// Guidance
// ============================================================================

export function getProjectGuidance(projectId: string) {
  if (!featureFlags.enableGuidance) {
    return { items: [], context: '' };
  }
  const items = Guidance.getGuidanceItems(projectId);
  const context = Guidance.formatGuidanceContext(items);
  return { items, context };
}

export function checkGuidanceLimits(itemCount: number) {
  if (!featureFlags.enableGuidance) {
    return { atSoftLimit: false, atHardLimit: false };
  }
  return Guidance.checkLimits(itemCount);
}

export function calculateSemanticSimilarity(text1: string, text2: string) {
  if (!featureFlags.enableGuidance) {
    return 0;
  }
  return Guidance.calculateSimilarity(text1, text2);
}

export function getStorageStats(items: unknown[], contextBudget: number) {
  if (!featureFlags.enableGuidance) {
    return { used: 0, remaining: contextBudget };
  }
  return Guidance.getStorageStats(items as Parameters<typeof Guidance.getStorageStats>[0], contextBudget);
}

// ============================================================================
// Temporal Intelligence
// ============================================================================

export function containsCommitmentSignals(message: string) {
  if (!featureFlags.enableTemporalIntelligence) {
    return false;
  }
  return Temporal.containsCommitmentSignals(message);
}

export function processMessage(message: string) {
  if (!featureFlags.enableTemporalIntelligence) {
    return { hasCommitments: false, signals: [] };
  }
  const result = Temporal.classifyInput(message);
  return {
    hasCommitments: result.shouldExtract,
    signals: result.signals,
  };
}

export async function extractCommitments(
  message: string,
  source: { type: string; sourceId: string; extractedAt: Date }
) {
  if (!featureFlags.enableTemporalIntelligence) {
    return [];
  }
  return Temporal.extractCommitments(message, source);
}

export function getMorningDigest(
  userId: string,
  commitments: unknown[]
) {
  if (!featureFlags.enableTemporalIntelligence) {
    return { items: [], message: '' };
  }
  return Temporal.generateMorningDigest(userId, commitments as Parameters<typeof Temporal.generateMorningDigest>[1]);
}

export function shouldSendDigest(userId: string) {
  if (!featureFlags.enableTemporalIntelligence) {
    return false;
  }
  return Temporal.shouldSendDigest(userId);
}

export function calculatePriority(
  commitment: unknown,
  prefs?: unknown
) {
  if (!featureFlags.enableTemporalIntelligence) {
    return 50;
  }
  const result = Temporal.calculatePriorityScore(
    commitment as Parameters<typeof Temporal.calculatePriorityScore>[0],
    prefs as Parameters<typeof Temporal.calculatePriorityScore>[1]
  );
  return result.score;
}

// ============================================================================
// Bubble Interface
// ============================================================================

export function createBubbleEngine(config?: Record<string, unknown>) {
  if (!featureFlags.enableBubbleInterface) {
    return { process: () => ({ suggestions: [] }) };
  }
  return Bubble.createBubbleEngine(config as Parameters<typeof Bubble.createBubbleEngine>[0]);
}

export function getFocusMode(modeName: string) {
  if (!featureFlags.enableBubbleInterface) {
    return { name: 'available', allowInterrupts: true };
  }
  const mode = Bubble.getFocusMode(modeName as Parameters<typeof Bubble.getFocusMode>[0]);
  return {
    name: mode.name,
    allowInterrupts: mode.allowsStates.includes('active'),
  };
}

export function canShowBubble(
  budget: unknown,
  category: string,
  focusMode?: string
) {
  if (!featureFlags.enableBubbleInterface) {
    return false;
  }
  return Bubble.canConsumeBudget(
    budget as Parameters<typeof Bubble.canConsumeBudget>[0],
    category as Parameters<typeof Bubble.canConsumeBudget>[1],
    focusMode as Parameters<typeof Bubble.canConsumeBudget>[2]
  ).canConsume;
}

export function recordBubbleShown(
  budget: unknown,
  category: string,
  focusMode?: string
) {
  if (!featureFlags.enableBubbleInterface) {
    return budget;
  }
  return Bubble.consumeBudget(
    budget as Parameters<typeof Bubble.consumeBudget>[0],
    category as Parameters<typeof Bubble.consumeBudget>[1],
    focusMode as Parameters<typeof Bubble.consumeBudget>[2]
  );
}

export function getBubbleMessage(item: unknown) {
  if (!featureFlags.enableBubbleInterface) {
    return '';
  }
  return Bubble.generateMessage(item as Parameters<typeof Bubble.generateMessage>[0]);
}

export function transformToBubble(item: unknown, confidenceScore?: number) {
  if (!featureFlags.enableBubbleInterface) {
    return null;
  }
  return Bubble.transformToBubble(item as Parameters<typeof Bubble.transformToBubble>[0], confidenceScore);
}

// ============================================================================
// Document Indexing
// ============================================================================

export async function indexDocumentToVault(
  userId: string,
  document: {
    name: string;
    content: string;
    type: string;
    projectId?: string;
    conversationId?: string;
    metadata?: Record<string, unknown>;
  },
  options?: { interface?: string }
) {
  if (!featureFlags.enableDocumentIndexing) {
    return {
      success: false,
      documentId: '',
      chunks: 0,
      relationships: 0,
      processingTimeMs: 0,
      error: 'Document indexing disabled via feature flag',
    };
  }

  const startTime = Date.now();
  const result = await DocumentIndexing.indexDocument({
    userId,
    name: document.name,
    content: document.content,
    type: document.type as Parameters<typeof DocumentIndexing.indexDocument>[0]['type'],
    projectId: document.projectId,
    conversationId: document.conversationId,
    metadata: document.metadata,
    interface: options?.interface || 'web',
  });

  return {
    success: true,
    documentId: result.documentId,
    chunks: result.chunks.length,
    relationships: result.relationships?.length || 0,
    processingTimeMs: Date.now() - startTime,
  };
}

export async function searchDocuments(
  userId: string,
  query: string,
  options?: { filter?: Record<string, unknown>; limit?: number }
) {
  if (!featureFlags.enableDocumentIndexing) {
    return [];
  }
  return DocumentIndexing.queryDocuments({
    userId,
    query,
    limit: options?.limit,
    filter: options?.filter,
  });
}

export async function searchDocumentsAcrossProjects(
  userId: string,
  query: string,
  projectIds: string[]
) {
  if (!featureFlags.enableCrossProjectMemory) {
    return [];
  }
  return DocumentIndexing.retrieveAcrossProjects(userId, query, projectIds);
}

// ============================================================================
// Cross-Project Memory
// ============================================================================

export async function queryCrossProjectMemories(
  userId: string,
  query: string,
  options?: {
    projectIds?: string[];
    timeRange?: { start: Date; end: Date };
    limit?: number;
    detectContradictions?: boolean;
  }
) {
  if (!featureFlags.enableCrossProjectMemory) {
    return { memories: [], commonThemes: [], contradictions: [], projectSummaries: new Map() };
  }
  return MemoryVault.queryCrossProject(userId, query, options);
}

export async function findRelatedFromOtherProjects(
  currentProjectId: string,
  query: string,
  limit?: number
) {
  if (!featureFlags.enableCrossProjectMemory) {
    return [];
  }
  return MemoryVault.findRelatedFromOtherProjects(currentProjectId, query, limit);
}

export function addMemorySourceContext(
  memoryId: string,
  context: {
    projectId: string | null;
    conversationId: string | null;
    documentId: string | null;
    interface: 'web' | 'vscode' | 'mobile' | 'voice' | 'api';
    timestamp: Date;
  }
) {
  if (!featureFlags.enableCrossProjectMemory) {
    return;
  }
  return MemoryVault.addSourceContext(memoryId, context);
}

// ============================================================================
// Throttle
// ============================================================================

export function canMakeQuery(userId: string, tier: UserTier): boolean {
  if (!featureFlags.enableThrottle) {
    return true;
  }
  return Throttle.canQuery(userId, mapTier(tier));
}

export function getThrottleStatus(userId: string, tier: UserTier) {
  if (!featureFlags.enableThrottle) {
    return {
      tier,
      canQuery: true,
      queriesRemaining: Infinity,
      queriesTotal: Infinity,
      budgetState: 'healthy' as const,
      statusMessage: 'Unlimited (throttle disabled)',
      degraded: false,
      upgradeAvailable: tier !== 'master' && tier !== 'enterprise',
    };
  }

  const coreTier = mapTier(tier);
  const status = Throttle.getThrottleStatus(userId, coreTier);

  return {
    tier,
    canQuery: status.canMakeQuery,
    queriesRemaining: status.budget.queriesRemaining,
    queriesTotal: status.budget.queriesTotal,
    budgetState: status.budgetState,
    statusMessage: status.statusMessage,
    degraded: status.budgetState === 'critical' || status.budgetState === 'exhausted',
    upgradeAvailable: tier !== 'master' && tier !== 'enterprise',
  };
}

export async function processThrottledQuery(
  userId: string,
  tier: UserTier,
  request: {
    query: string;
    estimatedTokens?: number;
    requiresReasoning?: boolean;
    isCodeGeneration?: boolean;
  }
) {
  if (!featureFlags.enableThrottle) {
    return {
      allowed: true,
      model: {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        maxTokens: 4000,
      },
      message: 'Throttle disabled',
      degraded: false,
    };
  }

  const result = await Throttle.processQueryRequest(userId, mapTier(tier), request);

  return {
    allowed: result.allowed,
    model: result.model ? {
      id: result.model.id,
      name: result.model.name,
      provider: result.model.provider,
      maxTokens: result.model.maxTokens,
    } : null,
    message: result.message,
    degraded: result.degraded,
  };
}

export function hasFeatureAccess(
  tier: UserTier,
  feature: 'contemplateMode' | 'councilMode' | 'voiceMode' | 'customPersona' | 'prioritySupport'
): boolean {
  if (!featureFlags.enableThrottle) {
    return true;
  }
  return Throttle.hasFeatureAccess(mapTier(tier), feature);
}

export function getDegradationMessage(userId: string, tier: UserTier): string {
  if (!featureFlags.enableThrottle) {
    return '';
  }
  return Throttle.getGracefulDegradationMessage(userId, mapTier(tier));
}

export function getBudgetStatusMessage(userId: string, tier: UserTier): string {
  if (!featureFlags.enableThrottle) {
    return 'Unlimited queries available';
  }
  return Throttle.getBudgetStatusMessage(userId, mapTier(tier));
}

export function recordQueryUsage(userId: string, tier: UserTier, modelId: string): void {
  if (!featureFlags.enableThrottle) {
    return;
  }
  return Throttle.recordQuery(userId, mapTier(tier), modelId);
}

// ============================================================================
// Health Check
// ============================================================================

export async function healthCheck() {
  const routerHealth = await Router.healthCheck();

  return {
    status: routerHealth.status,
    components: {
      constitutional: featureFlags.enableConstitutionalValidation ? 'enabled' : 'disabled',
      router: featureFlags.enableRouterMRP ? 'enabled' : 'disabled',
      memoryVault: featureFlags.enableMemoryVault ? 'enabled' : 'disabled',
      council: featureFlags.enableCouncilMode ? 'enabled' : 'disabled',
      guidance: featureFlags.enableGuidance ? 'enabled' : 'disabled',
      temporal: featureFlags.enableTemporalIntelligence ? 'enabled' : 'disabled',
      bubble: featureFlags.enableBubbleInterface ? 'enabled' : 'disabled',
    },
    providers: routerHealth.providers,
    note: '@osqr/core integrated via workspace dependency',
  };
}

// Re-export config
export { featureFlags, routerConfig, throttleConfig } from './config';
