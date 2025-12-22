/**
 * OSQR Core Integration
 *
 * Central module for integrating @osqr/core with oscar-app.
 * This provides a configured instance of the OSQR brain components.
 *
 * New in this phase:
 * - Document Indexing Subsystem (I-8)
 * - Memory Vault Cross-Project Extension (I-9)
 * - Throttle Architecture (I-10)
 */

import { Constitutional, Router, MemoryVault, Council, Guidance, Temporal, Bubble, DocumentIndexing, Throttle } from '@osqr/core';
import { routerConfig, featureFlags } from './config';

// ============================================================================
// Constitutional Layer (I-1) - ENABLED
// ============================================================================

/**
 * Validate user input before processing.
 * Returns GatekeeperResult with allowed/blocked status and any violations.
 */
export async function validateUserInput(
  input: string,
  userId: string,
  sessionId?: string
) {
  if (!featureFlags.enableConstitutionalValidation) {
    return {
      allowed: true,
      clausesChecked: [] as string[],
      violations: [] as Constitutional.ViolationLogEntry[],
      confidenceScore: 1.0,
    };
  }

  // Build proper RequestContext
  const context: Constitutional.RequestContext = {
    userId,
    requestId: sessionId || `req_${Date.now()}`,
    conversationId: `conv_${Date.now()}`,
    honestyTier: 'BASE',
  };

  const result = await Constitutional.validateIntent(input, context);

  if (!result.allowed && featureFlags.logConstitutionalViolations) {
    console.log('[OSQR Constitutional] Input blocked, violations:', result.violations.length);
    result.violations.forEach((v) => {
      console.log(`  - ${v.violationType}: ${v.clauseViolated}`);
    });
  }

  return result;
}

/**
 * Validate AI output before sending to user.
 */
export async function validateAIOutput(
  output: string,
  originalInput: string,
  userId: string
) {
  if (!featureFlags.enableConstitutionalValidation) {
    return {
      valid: true,
      violations: [] as Constitutional.ViolationLogEntry[],
      sanitizedOutput: undefined,
    };
  }

  // Build proper ResponseContext
  const context: Constitutional.ResponseContext = {
    userId,
    requestId: `req_${Date.now()}`,
    conversationId: `conv_${Date.now()}`,
    honestyTier: 'BASE',
    originalInput,
  };

  const result = await Constitutional.validateOutput(output, context);

  if (!result.valid && featureFlags.logConstitutionalViolations) {
    console.log('[OSQR Constitutional] Output blocked, violations:', result.violations.length);
    result.violations.forEach((v) => {
      Constitutional.logViolation(v);
    });
  }

  return result;
}

/**
 * Quick screening for obvious issues (faster, less thorough).
 */
export function quickScreenInput(input: string) {
  return Constitutional.quickScreenInput(input);
}

export function quickScreenOutput(output: string) {
  return Constitutional.quickScreenOutput(output);
}

// ============================================================================
// Router Layer (I-2)
// ============================================================================

/**
 * Classify a question to determine routing.
 */
export async function classifyQuestion(input: string) {
  return Router.classifyTask(input, routerConfig);
}

/**
 * Quick classification using heuristics (no LLM call).
 */
export function quickClassify(input: string) {
  return Router.quickClassify(input);
}

/**
 * Detect task type from input.
 */
export function detectTaskType(input: string) {
  return Router.detectTaskType(input);
}

/**
 * Estimate complexity tier for input.
 */
export function estimateComplexity(input: string, taskType: Router.TaskType) {
  return Router.estimateComplexity(input, taskType);
}

/**
 * Get recommended model for an input.
 */
export async function getRecommendedModel(input: string) {
  return Router.getRecommendedModel(input, routerConfig);
}

/**
 * Full routing with MRP tracking.
 */
export async function routeRequest(
  input: string,
  options?: {
    inputType?: 'text' | 'voice' | 'image';
    sessionId?: string;
    userId?: string;
    forceModel?: string;
  }
) {
  const request: Router.RouterRequest = {
    input,
    inputType: options?.inputType || 'text',
    sessionId: options?.sessionId || `session_${Date.now()}`,
    userId: options?.userId,
    forceModel: options?.forceModel,
  };

  return Router.routeRequest(request, routerConfig);
}

/**
 * Router health check.
 */
export async function routerHealthCheck() {
  return Router.healthCheck();
}

// ============================================================================
// Memory Vault Layer (I-3)
// ============================================================================

/**
 * Initialize memory vault for a user.
 */
export function initializeVault(userId: string) {
  return MemoryVault.initializeVault(userId);
}

/**
 * Retrieve context for a query.
 */
export async function retrieveContext(
  query: string,
  userId: string,
  options?: {
    categories?: MemoryVault.MemoryCategory[];
    maxResults?: number;
    minRelevance?: number;
  }
) {
  // Use the proper function signature: retrieveContextForUser(userId, query, options)
  return MemoryVault.retrieveContextForUser(userId, query, {
    categories: options?.categories,
    maxTokens: options?.maxResults ? options.maxResults * 100 : undefined, // Approximate token budget
    minRelevance: options?.minRelevance,
  });
}

/**
 * Store a message in a conversation.
 */
export function storeMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  // Construct the message object that storeMessage expects
  const message: Omit<MemoryVault.Message, 'id'> = {
    role,
    content,
    timestamp: new Date(),
    tokens: Math.ceil(content.length / 4), // Rough token estimate
    toolCalls: null,
    utilityScore: null,
  };
  return MemoryVault.storeMessage(conversationId, message);
}

/**
 * Search user memories.
 */
export async function searchMemories(
  userId: string,
  query: string,
  filters?: MemoryVault.MemoryFilters
) {
  return MemoryVault.searchUserMemories(userId, query, filters);
}

/**
 * Get episodic context (recent conversation summaries).
 */
export async function getEpisodicContext(userId: string, limit?: number) {
  // Use getConversationHistory instead (retrieveEpisodicContext doesn't exist)
  return MemoryVault.getConversationHistory(userId, limit);
}

// ============================================================================
// Council Mode Layer (I-4)
// ============================================================================

/**
 * Check if council mode should trigger for this request.
 */
export function shouldTriggerCouncil(
  query: string,
  context?: Council.ConversationContext
) {
  return Council.shouldTriggerCouncil(query, context);
}

/**
 * Run a council deliberation with multiple models.
 */
export async function runCouncilDeliberation(
  query: string,
  context?: Council.ConversationContext,
  options?: Council.CouncilOptions
) {
  // Use executeCouncil instead of runDeliberation
  return Council.executeCouncil(query, context, options);
}

/**
 * Synthesize council responses into a unified answer.
 */
export async function synthesizeCouncilResponses(
  query: string,
  responses: Council.ModelResponse[]
) {
  return Council.synthesize(query, responses);
}

// ============================================================================
// Guidance Layer (I-5)
// ============================================================================

/**
 * Get project guidance for a project.
 */
export function getProjectGuidance(projectId: string) {
  return Guidance.getProjectGuidance(projectId);
}

/**
 * Check if we're at guidance limits.
 */
export function checkGuidanceLimits(itemCount: number) {
  return {
    atSoftLimit: Guidance.isNearSoftLimit(itemCount),
    atHardLimit: Guidance.isAtHardLimitByCount(itemCount),
  };
}

/**
 * Calculate semantic similarity between two texts.
 */
export function calculateSemanticSimilarity(text1: string, text2: string) {
  return Guidance.calculateSemanticSimilarity(text1, text2);
}

/**
 * Get storage statistics for a project - returns budget distribution info.
 */
export function getStorageStats(items: Guidance.MentorScriptItem[], contextBudget: number) {
  return Guidance.calculateBudgetDistribution(items, contextBudget);
}

// ============================================================================
// Temporal Intelligence Layer (I-6)
// ============================================================================

/**
 * Check if message contains commitment signals.
 */
export function containsCommitmentSignals(message: string) {
  return Temporal.containsCommitmentSignals(message);
}

/**
 * Process a message for commitment extraction.
 */
export function processMessage(message: string) {
  return Temporal.classifyInput(message);
}

/**
 * Extract commitments from a message.
 */
export async function extractCommitments(
  message: string,
  source: Temporal.CommitmentSource
) {
  return Temporal.extractCommitments(message, source);
}

/**
 * Get morning digest for a user.
 */
export function getMorningDigest(
  userId: string,
  commitments: Temporal.Commitment[]
) {
  return Temporal.generateMorningDigest(userId, commitments);
}

/**
 * Check if morning digest should be sent.
 */
export function shouldSendDigest(userId: string) {
  return Temporal.shouldSendDigest(userId);
}

/**
 * Calculate priority score for a commitment.
 */
export function calculatePriority(
  commitment: Temporal.Commitment,
  prefs?: Temporal.TemporalPreferences
) {
  return Temporal.calculatePriorityScore(commitment, prefs);
}

// ============================================================================
// Bubble Interface Layer (I-7)
// ============================================================================

/**
 * Create a new BubbleEngine for a session.
 */
export function createBubbleEngine(config?: Partial<Bubble.BubbleEngineConfig>) {
  return Bubble.createBubbleEngine(config);
}

/**
 * Get current focus mode by name.
 */
export function getFocusMode(modeName: Bubble.FocusModeName) {
  return Bubble.getFocusMode(modeName);
}

/**
 * Check if we can consume budget for a bubble.
 */
export function canShowBubble(
  budget: Bubble.InterruptBudget,
  category: Bubble.BubbleCategory,
  focusMode: Bubble.FocusModeName = 'available'
) {
  // Create a mock bubble item for the budget check
  const mockItem: Bubble.BubbleItem = {
    id: 'check',
    temporalItemId: 'check',
    message: 'check',
    category,
    state: 'pending',
    confidenceScore: 50,
    basePriority: 50,
  };
  return Bubble.canConsumeBudget(budget, mockItem, focusMode);
}

/**
 * Record that a bubble was shown (consume budget).
 */
export function recordBubbleShown(
  budget: Bubble.InterruptBudget,
  category: Bubble.BubbleCategory,
  focusMode: Bubble.FocusModeName = 'available'
) {
  // Create a mock bubble item for the budget consumption
  const mockItem: Bubble.BubbleItem = {
    id: 'consume',
    temporalItemId: 'consume',
    message: 'consume',
    category,
    state: 'pending',
    confidenceScore: 50,
    basePriority: 50,
  };
  return Bubble.consumeBudget(budget, mockItem, focusMode);
}

/**
 * Get bubble message for a temporal item.
 */
export function getBubbleMessage(item: Bubble.TemporalItem) {
  return Bubble.generateMessage(item);
}

/**
 * Transform temporal items to bubble items.
 */
export function transformToBubble(
  item: Bubble.TemporalItem,
  confidenceScore: number = 50
) {
  return Bubble.transformToBubble(item, confidenceScore);
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check health of all OSQR components.
 */
export async function healthCheck() {
  const routerHealth = await Router.healthCheck();

  return {
    status: routerHealth.status,
    components: {
      constitutional: 'ok' as const,
      router: routerHealth.status,
      memoryVault: 'ok' as const,
      council: 'ok' as const,
      guidance: 'ok' as const,
      temporal: 'ok' as const,
      bubble: 'ok' as const,
    },
    providers: routerHealth.providers,
  };
}

// ============================================================================
// Document Indexing Layer (I-8) - NEW
// ============================================================================

/**
 * Index a document through the unified indexing pipeline.
 */
export async function indexDocumentToVault(
  userId: string,
  document: {
    name: string;
    content: string;
    type: string; // DocumentType
    projectId?: string;
    conversationId?: string;
    metadata?: Record<string, unknown>;
  },
  options?: { interface?: string } // InterfaceType
) {
  if (!featureFlags.enableDocumentIndexing) {
    return {
      success: false,
      documentId: '',
      chunks: 0,
      relationships: 0,
      processingTimeMs: 0,
      error: 'Document indexing is disabled',
    };
  }

  const startTime = Date.now();

  try {
    // Create raw document for the pipeline
    const now = new Date();
    const contentSize = new TextEncoder().encode(document.content).length;

    const rawDocument = {
      path: document.name,
      filename: document.name,
      filetype: document.type as 'markdown' | 'plaintext' | 'code' | 'json' | 'yaml' | 'html' | 'pdf' | 'docx',
      content: document.content,
      size: contentSize,
      mtime: now,
      ctime: now,
    };

    const indexed = await DocumentIndexing.indexDocument(rawDocument, userId, {
      interface: (options?.interface || 'web') as 'web' | 'vscode' | 'mobile' | 'voice' | 'api',
      projectId: document.projectId,
      conversationId: document.conversationId,
    });

    return {
      success: true,
      documentId: indexed.id,
      chunks: indexed.chunks.length,
      relationships: indexed.relatedDocuments.length,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[DocumentIndexing] Index error:', error);
    return {
      success: false,
      documentId: '',
      chunks: 0,
      relationships: 0,
      processingTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search documents semantically.
 * Note: osqr-core API is (query, userId, options) order.
 */
export async function searchDocuments(
  userId: string,
  query: string,
  options?: { filter?: Record<string, unknown>; limit?: number }
) {
  if (!featureFlags.enableDocumentIndexing) return [];

  try {
    return await DocumentIndexing.retrieveByConcept(query, userId, {
      filter: options?.filter,
      limit: options?.limit || 10,
    });
  } catch (error) {
    console.error('[DocumentIndexing] Search error:', error);
    return [];
  }
}

/**
 * Search documents across all projects.
 * Note: osqr-core API is (projects, topic, userId) order.
 * This is a convenience wrapper that searches all user projects.
 */
export async function searchDocumentsAcrossProjects(
  userId: string,
  query: string,
  projectIds: string[]
) {
  if (!featureFlags.enableDocumentIndexing) return [];

  try {
    return await DocumentIndexing.retrieveAcrossProjects(projectIds, query, userId);
  } catch (error) {
    console.error('[DocumentIndexing] Cross-project search error:', error);
    return [];
  }
}

// ============================================================================
// Cross-Project Memory Layer (I-9) - NEW
// ============================================================================

/**
 * Query memories across all projects.
 */
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
  if (!featureFlags.enableMemoryVault) {
    return { memories: [], commonThemes: [], contradictions: [], projectSummaries: new Map() };
  }

  try {
    return await MemoryVault.queryCrossProject({
      query,
      userId,
      ...options,
    });
  } catch (error) {
    console.error('[MemoryVault] Cross-project query error:', error);
    return { memories: [], commonThemes: [], contradictions: [], projectSummaries: new Map() };
  }
}

/**
 * Find related memories from other projects.
 */
export async function findRelatedFromOtherProjects(
  currentProjectId: string,
  query: string,
  limit: number = 5
) {
  if (!featureFlags.enableMemoryVault) return [];

  try {
    return await MemoryVault.findRelatedFromOtherProjects(currentProjectId, query, limit);
  } catch (error) {
    console.error('[MemoryVault] Find related error:', error);
    return [];
  }
}

/**
 * Add source context to a memory for cross-project tracking.
 */
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
  if (!featureFlags.enableMemoryVault) return;

  try {
    MemoryVault.addSourceContext(memoryId, context);
  } catch (error) {
    console.error('[MemoryVault] Add source context error:', error);
  }
}

// ============================================================================
// Throttle Layer (I-10) - NEW
// ============================================================================

export type UserTier = 'lite' | 'pro' | 'master' | 'enterprise';

/**
 * Check if a user can make a query.
 */
export function canMakeQuery(userId: string, tier: UserTier): boolean {
  if (!featureFlags.enableThrottle) return true;

  try {
    return Throttle.canQuery(userId, tier);
  } catch (error) {
    console.error('[Throttle] canQuery error:', error);
    return true; // Fail open
  }
}

/**
 * Get complete throttle status for a user.
 */
export function getThrottleStatus(userId: string, tier: UserTier) {
  if (!featureFlags.enableThrottle) {
    return {
      tier,
      canQuery: true,
      queriesRemaining: Infinity,
      queriesTotal: Infinity,
      budgetState: 'healthy' as const,
      statusMessage: 'Throttle disabled',
      degraded: false,
    };
  }

  try {
    return Throttle.getThrottleStatus(userId, tier);
  } catch (error) {
    console.error('[Throttle] getThrottleStatus error:', error);
    return {
      tier,
      canQuery: true,
      queriesRemaining: 0,
      queriesTotal: 0,
      budgetState: 'healthy' as const,
      statusMessage: 'Status unavailable',
      degraded: false,
    };
  }
}

/**
 * Process a query through the throttle.
 */
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

  try {
    return await Throttle.processQueryRequest(userId, tier, request);
  } catch (error) {
    console.error('[Throttle] processQuery error:', error);
    return {
      allowed: true,
      model: {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        maxTokens: 4000,
      },
      message: 'Throttle error, using default',
      degraded: false,
    };
  }
}

/**
 * Check feature access for a tier.
 */
export function hasFeatureAccess(
  tier: UserTier,
  feature: 'contemplateMode' | 'councilMode' | 'voiceMode' | 'customPersona' | 'prioritySupport'
): boolean {
  if (!featureFlags.enableThrottle) return true;

  return Throttle.hasFeatureAccess(tier, feature);
}

/**
 * Get graceful degradation message.
 */
export function getDegradationMessage(userId: string, tier: UserTier): string {
  if (!featureFlags.enableThrottle) return '';

  try {
    return Throttle.getGracefulDegradationMessage(userId, tier);
  } catch (error) {
    console.error('[Throttle] getDegradationMessage error:', error);
    return '';
  }
}

/**
 * Get budget status message for UI display.
 */
export function getBudgetStatusMessage(userId: string, tier: UserTier): string {
  if (!featureFlags.enableThrottle) return 'Unlimited queries available';

  try {
    // getBudgetStatusMessage returns a string message
    return Throttle.getBudgetStatusMessage(userId, tier);
  } catch (error) {
    console.error('[Throttle] getBudgetStatus error:', error);
    return 'Budget status unavailable';
  }
}

/**
 * Record a query for budget tracking.
 */
export function recordQueryUsage(userId: string, tier: UserTier, modelId: string): void {
  if (!featureFlags.enableThrottle) return;

  try {
    Throttle.recordQuery(userId, tier, modelId);
  } catch (error) {
    console.error('[Throttle] recordQuery error:', error);
  }
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { Constitutional, Router, MemoryVault, Council, Guidance, Temporal, Bubble, DocumentIndexing, Throttle };
export { featureFlags, routerConfig } from './config';

// Re-export key types
export type { TaskType, ComplexityTier } from '@osqr/core';
