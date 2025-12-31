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

  const context = {
    requestId: `req_${Date.now()}`,
    userId,
    conversationId: sessionId || 'default',
    honestyTier: 'BASE' as const,
  };

  const result = await Constitutional.validateIntent(input, context);

  return {
    allowed: result.allowed,
    clausesChecked: result.clausesChecked,
    violations: result.violations.map((v) => ({
      type: v.violationType,
      clause: v.clauseViolated,
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

  const context = {
    requestId: `req_${Date.now()}`,
    userId,
    conversationId: 'default',
    honestyTier: 'BASE' as const,
    originalInput,
  };

  const result = await Constitutional.validateOutput(output, context);

  return {
    valid: result.valid,
    violations: result.violations.map((v) => ({
      type: v.violationType,
      clause: v.clauseViolated,
    })),
    sanitizedOutput: result.sanitizedOutput,
  };
}

export function quickScreenInput(input: string) {
  if (!featureFlags.enableConstitutionalValidation) {
    return { allowed: true, reason: null };
  }
  const allowed = Constitutional.quickScreenInput(input);
  return { allowed, reason: allowed ? null : 'Failed constitutional screen' };
}

export function quickScreenOutput(output: string) {
  if (!featureFlags.enableConstitutionalValidation) {
    return { allowed: true, reason: null };
  }
  const allowed = Constitutional.quickScreenOutput(output);
  return { allowed, reason: allowed ? null : 'Failed constitutional screen' };
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
    return Router.TaskType.SIMPLE_QA;
  }
  return Router.detectTaskType(input);
}

export function estimateComplexity(input: string, taskType: Router.TaskType) {
  if (!featureFlags.enableRouterMRP) {
    return Router.ComplexityTier.SIMPLE;
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
    sessionId: options?.sessionId || `session_${Date.now()}`,
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

// MemoryVault integration with @osqr/core

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

  try {
    const retrievalOptions: Parameters<typeof MemoryVault.retrieveContextForUser>[2] = {
      maxTokens: (options?.maxResults || 10) * 500,
      minRelevance: options?.minRelevance || 0.5,
    };
    if (options?.categories) {
      retrievalOptions.categories = options.categories as NonNullable<typeof retrievalOptions>['categories'];
    }
    const retrieved = await MemoryVault.retrieveContextForUser(userId, query, retrievalOptions);

    const memories = retrieved.map((mem) => {
      const memory = mem.memory;
      if ('content' in memory) {
        return {
          content: memory.content,
          relevanceScore: mem.relevanceScore,
          category: memory.category,
          source: memory.source?.sourceId || 'unknown',
        };
      } else {
        return {
          content: memory.summary,
          relevanceScore: mem.relevanceScore,
          category: 'episodic',
          source: memory.conversationId || 'unknown',
        };
      }
    });

    // Format as context string
    const context = memories
      .map((m) => `[${m.category}] ${m.content}`)
      .join('\n\n');

    return { memories, context };
  } catch (error) {
    console.error('[OSQR] Memory retrieval failed:', error);
    return { memories: [], context: '' };
  }
}

export function storeMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  if (!featureFlags.enableMemoryVault) {
    return { success: true };
  }

  try {
    MemoryVault.storeMessage(conversationId, {
      role,
      content,
      timestamp: new Date(),
      tokens: Math.ceil(content.length / 4), // Rough estimate
      toolCalls: null,
      utilityScore: null,
    });
    return { success: true };
  } catch (error) {
    console.error('[OSQR] Message storage failed:', error);
    return { success: false };
  }
}

export async function searchMemories(
  userId: string,
  query: string,
  filters?: Record<string, unknown>
) {
  if (!featureFlags.enableMemoryVault) {
    return [];
  }

  try {
    const searchFilters: Parameters<typeof MemoryVault.searchUserMemories>[2] = {
      minConfidence: filters?.minConfidence as number | undefined,
      minUtility: filters?.minUtility as number | undefined,
      createdAfter: filters?.createdAfter as Date | undefined,
      createdBefore: filters?.createdBefore as Date | undefined,
    };
    if (filters?.categories) {
      searchFilters.categories = filters.categories as NonNullable<typeof searchFilters>['categories'];
    }
    const memories = await MemoryVault.searchUserMemories(userId, query, searchFilters);

    return memories.map((mem) => ({
      id: mem.id,
      content: mem.content,
      category: mem.category,
      createdAt: new Date(mem.createdAt),
    }));
  } catch (error) {
    console.error('[OSQR] Memory search failed:', error);
    return [];
  }
}

export function getEpisodicContext(conversationId: string, limit?: number) {
  if (!featureFlags.enableMemoryVault) {
    return [];
  }

  try {
    const messages = MemoryVault.getConversationHistory(conversationId, limit);
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error('[OSQR] Episodic context retrieval failed:', error);
    return [];
  }
}

// ============================================================================
// Council Mode
// ============================================================================

// Council integration with @osqr/core for multi-model deliberation

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
  _context?: Record<string, unknown>,
  options?: { forceCouncil?: boolean; resilientMode?: boolean }
) {
  if (!featureFlags.enableCouncilMode) {
    return { responses: [], synthesis: '', triggered: false };
  }

  try {
    const result = await Council.executeCouncil(
      query,
      undefined, // Context is optional
      {
        forceCouncil: options?.forceCouncil ?? true,
        resilientMode: options?.resilientMode ?? true,
      }
    );

    if (!result.triggered || !result.deliberation) {
      return {
        responses: [],
        synthesis: result.reason || 'Council did not trigger',
        triggered: false,
      };
    }

    // Extract responses and synthesis
    const responses = result.deliberation.responses.map((r) => ({
      model: Council.getModelDisplayName(r.modelId) || r.modelId,
      response: r.content,
      confidence: r.confidence?.normalizedScore || 0.5,
    }));

    const synthesis = result.deliberation.synthesis?.finalResponse || '';

    return {
      responses,
      synthesis,
      triggered: true,
      agreementLevel: result.deliberation.agreement?.level,
      agreementScore: result.deliberation.agreement?.score,
    };
  } catch (error) {
    console.error('[OSQR] Council deliberation failed:', error);
    return { responses: [], synthesis: '', triggered: false };
  }
}

export async function synthesizeCouncilResponses(
  query: string,
  responses: { model: string; response: string; confidence?: number }[]
) {
  if (!featureFlags.enableCouncilMode) {
    return { synthesis: '' };
  }

  try {
    // Convert to @osqr/core ModelResponse format
    const modelResponses: Parameters<typeof Council.synthesize>[1] = responses.map((r) => ({
      modelId: r.model,
      modelDisplayName: r.model,
      content: r.response,
      summary: r.response.slice(0, 200),
      confidence: {
        rawScore: r.confidence || 0.7,
        normalizedScore: r.confidence || 0.7,
        reasoningDepth: 0.5,
      },
      sourcesCited: [],
      reasoningChain: [],
      latencyMs: 0,
      tokensUsed: 0,
      timestamp: new Date().toISOString(),
      status: 'success' as const,
    }));

    const result = await Council.synthesize(query, modelResponses);

    // Calculate average confidence from responses
    type ModelResponse = (typeof modelResponses)[number];
    const avgConfidence =
      modelResponses.reduce((sum: number, r: ModelResponse) => sum + r.confidence.normalizedScore, 0) /
      modelResponses.length;

    return {
      synthesis: result.finalResponse,
      confidence: avgConfidence,
    };
  } catch (error) {
    console.error('[OSQR] Council synthesis failed:', error);
    return { synthesis: '' };
  }
}

// ============================================================================
// Guidance
// ============================================================================

// Note: Guidance module API is still being finalized in @osqr/core
// These functions provide stub implementations until full integration

export function getProjectGuidance(_projectId: string) {
  // TODO: Integrate with Guidance.loadGuidance when API stabilizes
  if (!featureFlags.enableGuidance) {
    return { items: [], context: '' };
  }
  return { items: [], context: '' };
}

export function checkGuidanceLimits(_itemCount: number) {
  // TODO: Integrate with Guidance context budget when API stabilizes
  if (!featureFlags.enableGuidance) {
    return { atSoftLimit: false, atHardLimit: false };
  }
  return { atSoftLimit: false, atHardLimit: false };
}

export function calculateSemanticSimilarity(_text1: string, _text2: string) {
  // TODO: Integrate with embedding similarity when API stabilizes
  if (!featureFlags.enableGuidance) {
    return 0;
  }
  return 0;
}

export function getStorageStats(_items: unknown[], contextBudget: number) {
  // TODO: Integrate with Guidance storage when API stabilizes
  if (!featureFlags.enableGuidance) {
    return { used: 0, remaining: contextBudget };
  }
  return { used: 0, remaining: contextBudget };
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
    return { hasCommitments: false, sourceType: 'conversation', confidence: 0 };
  }
  const result = Temporal.classifyInput(message);
  return {
    hasCommitments: Temporal.containsCommitmentSignals(message),
    sourceType: result.sourceType,
    confidence: result.confidence,
  };
}

export async function extractCommitments(
  message: string,
  source: { type: 'email' | 'text' | 'voice' | 'document' | 'calendar' | 'manual'; sourceId: string; extractedAt: Date }
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
  return result.totalScore;
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
    allowInterrupts: mode.bubbleStates.includes('active'),
  };
}

export function canShowBubble(
  budget: unknown,
  item: unknown,
  focusMode?: string
) {
  if (!featureFlags.enableBubbleInterface) {
    return false;
  }
  const result = Bubble.canConsumeBudget(
    budget as Parameters<typeof Bubble.canConsumeBudget>[0],
    item as Parameters<typeof Bubble.canConsumeBudget>[1],
    (focusMode || 'available') as Parameters<typeof Bubble.canConsumeBudget>[2]
  );
  return result.allowed;
}

export function recordBubbleShown(
  budget: unknown,
  item: unknown,
  focusMode?: string
) {
  if (!featureFlags.enableBubbleInterface) {
    return budget;
  }
  return Bubble.consumeBudget(
    budget as Parameters<typeof Bubble.consumeBudget>[0],
    item as Parameters<typeof Bubble.consumeBudget>[1],
    (focusMode || 'available') as Parameters<typeof Bubble.consumeBudget>[2]
  );
}

export function getBubbleMessage(item: unknown) {
  if (!featureFlags.enableBubbleInterface) {
    return '';
  }
  return Bubble.generateMessage(item as Parameters<typeof Bubble.generateMessage>[0]);
}

export function transformToBubble(item: unknown, confidenceScore: number = 0.5) {
  if (!featureFlags.enableBubbleInterface) {
    return null;
  }
  return Bubble.transformToBubble(item as Parameters<typeof Bubble.transformToBubble>[0], confidenceScore);
}

// ============================================================================
// Document Indexing
// ============================================================================

// Note: Document Indexing API signatures differ from wrapper expectations
// These stubs provide compilation while integration is finalized

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

  // Create RawDocument structure expected by @osqr/core
  const rawDocument = {
    path: `/${userId}/${document.name}`,
    filename: document.name,
    filetype: (document.type || 'text') as Parameters<typeof DocumentIndexing.indexDocument>[0]['filetype'],
    content: document.content,
    size: document.content.length,
    mtime: new Date(),
    ctime: new Date(),
  };

  const result = await DocumentIndexing.indexDocument(rawDocument, userId, {
    interface: (options?.interface || 'web') as 'web' | 'vscode' | 'voice' | 'mobile',
    conversationId: document.conversationId,
    projectId: document.projectId,
  });

  return {
    success: true,
    documentId: result.id,
    chunks: result.chunks.length,
    relationships: result.relatedDocuments?.length || 0,
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
    type: 'concept',
    options: options ? { filter: options.filter, limit: options.limit } : undefined,
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
  return DocumentIndexing.retrieveAcrossProjects(projectIds, query, userId);
}

// ============================================================================
// Cross-Project Memory
// ============================================================================

// Note: Cross-project memory API is still being finalized in @osqr/core
// These stubs provide compilation until full integration

export async function queryCrossProjectMemories(
  _userId: string,
  _query: string,
  _options?: {
    projectIds?: string[];
    timeRange?: { start: Date; end: Date };
    limit?: number;
    detectContradictions?: boolean;
  }
) {
  // TODO: Integrate with MemoryVault.queryCrossProject when API stabilizes
  if (!featureFlags.enableCrossProjectMemory) {
    return { memories: [], commonThemes: [], contradictions: [], projectSummaries: new Map() };
  }
  return { memories: [], commonThemes: [], contradictions: [], projectSummaries: new Map() };
}

export async function findRelatedFromOtherProjects(
  _currentProjectId: string,
  _query: string,
  _limit?: number
) {
  // TODO: Integrate with MemoryVault.findRelatedFromOtherProjects when API stabilizes
  if (!featureFlags.enableCrossProjectMemory) {
    return [];
  }
  return [];
}

export function addMemorySourceContext(
  _memoryId: string,
  _context: {
    projectId: string | null;
    conversationId: string | null;
    documentId: string | null;
    interface: 'web' | 'vscode' | 'mobile' | 'voice' | 'api';
    timestamp: Date;
  }
) {
  // TODO: Integrate with MemoryVault.addSourceContext when API stabilizes
  if (!featureFlags.enableCrossProjectMemory) {
    return;
  }
  return;
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
    queriesRemaining: status.budget.queriesLimit - status.budget.queriesUsed + status.budget.overageQueries,
    queriesTotal: status.budget.queriesLimit,
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
        modelName: 'claude-sonnet-4-20250514',
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
      modelName: result.model.model,
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
  // Map wrapper feature names to core feature names
  if (feature === 'customPersona') {
    // customPersona is only for master/enterprise tiers
    return tier === 'master' || tier === 'enterprise';
  }
  if (feature === 'prioritySupport') {
    return Throttle.hasFeatureAccess(mapTier(tier), 'priorityProcessing');
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
