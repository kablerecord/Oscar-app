/**
 * Mock for @osqr/core package
 *
 * This mock provides stub implementations of all @osqr/core exports.
 * Individual tests can override these mocks with vi.mocked().
 */

import { vi } from 'vitest'

// Constitutional module mock
export const Constitutional = {
  quickScreenInput: vi.fn(() => true),
  quickScreenOutput: vi.fn(() => true),
  validateIntent: vi.fn(() =>
    Promise.resolve({
      allowed: true,
      clausesChecked: ['SC-1'],
      violations: [],
      confidenceScore: 0.95,
    })
  ),
  validateOutput: vi.fn(() =>
    Promise.resolve({
      valid: true,
      violations: [],
      sanitizedOutput: undefined,
    })
  ),
  logViolation: vi.fn(),
  GRACEFUL_DECLINES: {
    DATA_SOVEREIGNTY: 'Cannot access external data that was not provided to me.',
    IDENTITY_MASKING: 'I need to remain transparent about being an AI assistant.',
    CAPABILITY_EXCEEDED: 'This request is beyond my current capabilities.',
    CROSS_TOOL_CHAINING: 'I cannot chain external tools or services together.',
    AMBIGUOUS_REQUEST: 'I need more clarity on what you would like me to do.',
  },
}

// Router module mock
export const Router = {
  quickClassify: vi.fn(() => ({
    taskType: 'GENERAL_CHAT',
    complexityTier: 1,
    confidenceScore: 0.85,
    reasoning: 'Basic conversational query',
    requiredContext: ['memory'],
  })),
  classifyTask: vi.fn(() =>
    Promise.resolve({
      taskType: 'GENERAL_CHAT',
      complexityTier: 1,
      confidenceScore: 0.9,
      reasoning: 'Classified as general chat',
      requiredContext: ['memory'],
    })
  ),
  detectTaskType: vi.fn(() => 'GENERAL_CHAT'),
  getRecommendedModel: vi.fn(() => Promise.resolve('claude-sonnet-4-20250514')),
  healthCheck: vi.fn(() => Promise.resolve({ status: 'ok', providers: {} })),
}

// MemoryVault module mock
export const MemoryVault = {
  initializeVault: vi.fn(),
  retrieveContextForUser: vi.fn(() => Promise.resolve([])),
  getConversationHistory: vi.fn(() => []),
  storeMessage: vi.fn((convId: string, msg: unknown) => ({ id: `msg_${Date.now()}`, ...msg as object })),
  searchUserMemories: vi.fn(() => Promise.resolve([])),
  queryCrossProject: vi.fn(() =>
    Promise.resolve({
      memories: [],
      commonThemes: [],
      contradictions: [],
      projectSummaries: new Map(),
    })
  ),
  findRelatedFromOtherProjects: vi.fn(() => Promise.resolve([])),
  addSourceContext: vi.fn(),
  getCrossProjectStats: vi.fn(() => ({
    memoriesWithContext: 0,
    totalCrossReferences: 0,
    unresolvedContradictions: 0,
  })),
}

// Throttle module mock
export const Throttle = {
  canQuery: vi.fn(() => true),
  getThrottleStatus: vi.fn(() => ({
    canMakeQuery: true,
    budgetState: 'healthy',
    statusMessage: 'All good',
    tierConfig: { queriesPerDay: 100 },
  })),
  getQueriesRemaining: vi.fn(() => 95),
  processQueryRequest: vi.fn(() =>
    Promise.resolve({
      allowed: true,
      model: {
        id: 'claude-sonnet-4-20250514',
        model: 'Claude Sonnet 4',
        tier: 'pro',
        maxTokens: 4000,
      },
      message: 'Query allowed',
      degraded: false,
    })
  ),
  recordQuery: vi.fn(),
  hasFeatureAccess: vi.fn((tier: string, feature: string) => {
    const access: Record<string, Record<string, boolean>> = {
      starter: {
        contemplateMode: false,
        councilMode: false,
        voiceMode: false,
        customPersona: false,
        prioritySupport: false,
      },
      pro: {
        contemplateMode: false,
        councilMode: false,
        voiceMode: true,
        customPersona: true,
        prioritySupport: false,
      },
      master: {
        contemplateMode: true,
        councilMode: true,
        voiceMode: true,
        customPersona: true,
        prioritySupport: true,
      },
      enterprise: {
        contemplateMode: true,
        councilMode: true,
        voiceMode: true,
        customPersona: true,
        prioritySupport: true,
      },
    }
    return access[tier]?.[feature] ?? false
  }),
  getGracefulDegradationMessage: vi.fn(() => ''),
  getUpgradePrompt: vi.fn(() => 'Upgrade to Pro for more features'),
  getUpgradePath: vi.fn((tier: string) => {
    const paths: Record<string, string | null> = {
      starter: 'pro',
      pro: 'master',
      master: 'enterprise',
      enterprise: null,
    }
    return paths[tier]
  }),
  getOveragePackages: vi.fn(() => [
    { id: 'pkg-10', name: '10 Extra Queries', queries: 10, price: 5 },
    { id: 'pkg-50', name: '50 Extra Queries', queries: 50, price: 20 },
  ]),
  purchaseOverage: vi.fn(() => ({ queriesRemaining: 10 })),
  getBudgetStatusMessage: vi.fn(() => 'You have 95 queries remaining today'),
  getQueryCountMessage: vi.fn(() => '5 of 100 queries used today'),
  addReferralBonus: vi.fn(),
  getReferralBonusRemaining: vi.fn(() => 0),
  setPersistenceAdapter: vi.fn(),
}

// DocumentIndexing module mock
export const DocumentIndexing = {
  indexDocument: vi.fn(() =>
    Promise.resolve({
      id: 'doc_123',
      filename: 'test.md',
      chunks: [],
      relatedDocuments: [],
      createdAt: new Date(),
    })
  ),
  retrieveByConcept: vi.fn(() => Promise.resolve([])),
  retrieveByDocumentName: vi.fn(() => Promise.resolve([])),
  retrieveByTime: vi.fn(() => Promise.resolve({ documents: [] })),
  retrieveAcrossProjects: vi.fn(() => Promise.resolve({ byProject: new Map() })),
  getStats: vi.fn(() =>
    Promise.resolve({
      documentCount: 0,
      chunkCount: 0,
      totalTokens: 0,
      lastIndexed: null,
    })
  ),
  removeFromIndex: vi.fn(() => Promise.resolve()),
  reindexDocument: vi.fn(() =>
    Promise.resolve({
      id: 'doc_123',
      filename: 'test.md',
      chunks: [],
      relatedDocuments: [],
      createdAt: new Date(),
    })
  ),
  detectDocumentType: vi.fn(() => 'markdown'),
  isSupported: vi.fn(() => true),
}

// Council module mock
export const Council = {
  shouldTriggerCouncil: vi.fn(() => false),
  executeCouncil: vi.fn(() =>
    Promise.resolve({
      triggered: false,
      reason: 'Not triggered',
      deliberation: null,
    })
  ),
  synthesize: vi.fn(() =>
    Promise.resolve({
      finalResponse: 'Synthesized response',
      transparencyFlags: [],
    })
  ),
}

// Temporal module mock
export const Temporal = {
  containsCommitmentSignals: vi.fn(() => false),
  classifyInput: vi.fn(() => ({ hasCommitment: false })),
  extractCommitments: vi.fn(() => Promise.resolve([])),
  generateMorningDigest: vi.fn(() => ({
    items: [],
    summary: '',
    date: '',
  })),
  shouldSendDigest: vi.fn(() => false),
  calculatePriorityScore: vi.fn(() => ({ totalScore: 0.5 })),
}

// Bubble module mock
export const Bubble = {
  createBubbleEngine: vi.fn(() => ({})),
  getFocusMode: vi.fn(() => ({ name: 'available' })),
  createInterruptBudget: vi.fn(() => ({ daily: { used: 0, total: 10 } })),
  canConsumeBudget: vi.fn(() => ({ allowed: true })),
  consumeBudget: vi.fn((budget: unknown) => budget),
  isValidFocusMode: vi.fn(() => true),
  generateMessage: vi.fn(() => 'Message'),
  transformToBubble: vi.fn(() => ({})),
}

// Guidance module mock
export const Guidance = {
  getProjectGuidance: vi.fn(() => null),
  calculateTotalTokens: vi.fn(() => 0),
  isAtHardLimit: vi.fn(() => false),
  isNearSoftLimit: vi.fn(() => false),
  isAtHardLimitByCount: vi.fn(() => false),
  suggestConsolidation: vi.fn(() => ({ shouldSuggest: false })),
  selectMentorScriptItems: vi.fn(() => ({ loadedItems: [] })),
  estimateTokens: vi.fn(() => 0),
  calculateSemanticSimilarity: vi.fn(() => 0.5),
  calculateBudgetDistribution: vi.fn(() => ({})),
}

// Enum exports
export const TaskType = {
  GENERAL_CHAT: 'GENERAL_CHAT',
  CODE_GENERATION: 'CODE_GENERATION',
  DOCUMENT_ANALYSIS: 'DOCUMENT_ANALYSIS',
  CREATIVE_WRITING: 'CREATIVE_WRITING',
  STRATEGIC_PLANNING: 'STRATEGIC_PLANNING',
  DATA_PROCESSING: 'DATA_PROCESSING',
}

export const ComplexityTier = {
  ROUTING: 0,
  SIMPLE: 1,
  COMPLEX: 2,
  STRATEGIC: 3,
}
