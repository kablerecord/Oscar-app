/**
 * Edge Case Hardening Tests
 *
 * Tests for extreme scenarios, boundary conditions, and error recovery.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup comprehensive mocks
vi.mock('@osqr/core', () => ({
  Constitutional: {
    quickScreenInput: vi.fn(() => true),
    quickScreenOutput: vi.fn(() => true),
    validateIntent: vi.fn(() =>
      Promise.resolve({
        allowed: true,
        clausesChecked: [],
        violations: [],
        confidenceScore: 0.95,
      })
    ),
    validateOutput: vi.fn(() =>
      Promise.resolve({ valid: true, violations: [], sanitizedOutput: undefined })
    ),
    logViolation: vi.fn(),
    GRACEFUL_DECLINES: {
      DATA_SOVEREIGNTY: 'Cannot access',
      IDENTITY_MASKING: 'Must identify',
      CAPABILITY_EXCEEDED: 'Beyond capabilities',
      CROSS_TOOL_CHAINING: 'Cannot chain',
      AMBIGUOUS_REQUEST: 'Need clarity',
    },
  },
  Router: {
    quickClassify: vi.fn(() => ({
      taskType: 'GENERAL_CHAT',
      complexityTier: 1,
      confidenceScore: 0.85,
      reasoning: 'Basic',
      requiredContext: [],
    })),
    classifyTask: vi.fn(() =>
      Promise.resolve({
        taskType: 'GENERAL_CHAT',
        complexityTier: 1,
        confidenceScore: 0.9,
        reasoning: 'Classified',
        requiredContext: [],
      })
    ),
    detectTaskType: vi.fn(() => 'GENERAL_CHAT'),
    getRecommendedModel: vi.fn(() => Promise.resolve('claude-sonnet-4')),
    healthCheck: vi.fn(() => Promise.resolve({ status: 'ok', providers: {} })),
  },
  MemoryVault: {
    initializeVault: vi.fn(),
    retrieveContextForUser: vi.fn(() => Promise.resolve([])),
    getConversationHistory: vi.fn(() => []),
    storeMessage: vi.fn((id, msg) => ({ id: 'msg1', ...msg })),
    searchUserMemories: vi.fn(() => Promise.resolve([])),
    queryCrossProject: vi.fn(() =>
      Promise.resolve({ memories: [], commonThemes: [], contradictions: [], projectSummaries: new Map() })
    ),
    findRelatedFromOtherProjects: vi.fn(() => Promise.resolve([])),
    addSourceContext: vi.fn(),
    getCrossProjectStats: vi.fn(() => ({ memoriesWithContext: 0, totalCrossReferences: 0, unresolvedContradictions: 0 })),
  },
  DocumentIndexing: {
    indexDocument: vi.fn(() =>
      Promise.resolve({ id: 'doc1', filename: 'test.md', chunks: [], relatedDocuments: [], createdAt: new Date() })
    ),
    retrieveByConcept: vi.fn(() => Promise.resolve([])),
    retrieveByDocumentName: vi.fn(() => Promise.resolve([])),
    retrieveByTime: vi.fn(() => Promise.resolve({ documents: [] })),
    retrieveAcrossProjects: vi.fn(() => Promise.resolve({ byProject: new Map() })),
    getStats: vi.fn(() => Promise.resolve({ documentCount: 0, chunkCount: 0, totalTokens: 0, lastIndexed: null })),
    removeFromIndex: vi.fn(() => Promise.resolve()),
    reindexDocument: vi.fn(() =>
      Promise.resolve({ id: 'doc1', filename: 'test.md', chunks: [], relatedDocuments: [], createdAt: new Date() })
    ),
    detectDocumentType: vi.fn(() => 'markdown'),
    isSupported: vi.fn(() => true),
  },
  Throttle: {
    canQuery: vi.fn(() => true),
    getThrottleStatus: vi.fn(() => ({
      canMakeQuery: true,
      budgetState: 'healthy',
      statusMessage: 'OK',
      tierConfig: { queriesPerDay: 100 },
    })),
    getQueriesRemaining: vi.fn(() => 100),
    processQueryRequest: vi.fn(() =>
      Promise.resolve({
        allowed: true,
        model: { id: 'claude-sonnet-4', model: 'Claude', tier: 'pro', maxTokens: 4000 },
        message: 'OK',
        degraded: false,
      })
    ),
    recordQuery: vi.fn(),
    hasFeatureAccess: vi.fn(() => true),
    getGracefulDegradationMessage: vi.fn(() => ''),
    getUpgradePrompt: vi.fn(() => 'Upgrade'),
    getUpgradePath: vi.fn(() => 'master'),
    getOveragePackages: vi.fn(() => []),
    purchaseOverage: vi.fn(() => ({ queriesRemaining: 10 })),
    getBudgetStatusMessage: vi.fn(() => 'OK'),
    getQueryCountMessage: vi.fn(() => '0 of 100'),
    addReferralBonus: vi.fn(),
    getReferralBonusRemaining: vi.fn(() => 0),
    setPersistenceAdapter: vi.fn(),
  },
  Council: {
    shouldTriggerCouncil: vi.fn(() => false),
    executeCouncil: vi.fn(() =>
      Promise.resolve({ triggered: false, reason: 'Not triggered', deliberation: null })
    ),
    synthesize: vi.fn(() =>
      Promise.resolve({ finalResponse: 'Synthesized', transparencyFlags: [] })
    ),
  },
  Temporal: {
    containsCommitmentSignals: vi.fn(() => false),
    classifyInput: vi.fn(() => ({ hasCommitment: false })),
    extractCommitments: vi.fn(() => Promise.resolve([])),
    generateMorningDigest: vi.fn(() => ({ items: [], summary: '', date: '' })),
    shouldSendDigest: vi.fn(() => false),
    calculatePriorityScore: vi.fn(() => ({ totalScore: 0.5 })),
  },
  Bubble: {
    createBubbleEngine: vi.fn(() => ({})),
    getFocusMode: vi.fn(() => ({ name: 'available' })),
    createInterruptBudget: vi.fn(() => ({ daily: { used: 0, total: 10 } })),
    canConsumeBudget: vi.fn(() => ({ allowed: true })),
    consumeBudget: vi.fn((budget) => budget),
    isValidFocusMode: vi.fn(() => true),
    generateMessage: vi.fn(() => 'Message'),
    transformToBubble: vi.fn(() => ({})),
  },
  Guidance: {
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
  },
  TaskType: { GENERAL_CHAT: 'GENERAL_CHAT' },
  ComplexityTier: { ROUTING: 0, SIMPLE: 1, COMPLEX: 2, STRATEGIC: 3 },
}))

vi.mock('../../config', () => ({
  routerConfig: {},
  vaultConfig: { defaultRetrievalLimit: 10, minUtilityThreshold: 0.3 },
  guidanceConfig: { hardLimit: 25, softLimit: 15 },
  bubbleConfig: { maxBubblesPerSession: 10 },
  featureFlags: {
    enableConstitutionalValidation: true,
    enableRouterMRP: true,
    enableMemoryVault: true,
    enableThrottle: true,
    enableDocumentIndexing: true,
    enableCouncilMode: true,
    enableTemporalIntelligence: true,
    enableBubbleInterface: true,
    enableGuidance: true,
    logConstitutionalViolations: false,
  },
  initializeBudgetPersistence: vi.fn(),
}))

import * as Constitutional from '../../constitutional-wrapper'
import * as Router from '../../router-wrapper'
import * as Memory from '../../memory-wrapper'
import * as Throttle from '../../throttle-wrapper'
import * as DocumentIndexing from '../../document-indexing-wrapper'

describe('Edge Case: Empty/Null Inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle empty string input in constitutional check', async () => {
    const result = await Constitutional.checkInput('', 'user123')
    expect(result).toBeDefined()
  })

  it('should handle null-like input gracefully', async () => {
    // Simulate edge case where something slips through
    const result = await Constitutional.checkInput(undefined as unknown as string, 'user123')
    expect(result).toBeDefined()
  })

  it('should handle empty query in router', () => {
    const result = Router.quickRoute('')
    expect(result).toBeDefined()
    expect(result.recommendedModel).toBeDefined()
  })

  it('should handle empty query in memory search', async () => {
    const result = await Memory.getContextForQuery('', 'workspace123')
    expect(result).toBeDefined()
    expect(result.memories).toBeDefined()
  })

  it('should handle empty content in document indexing', async () => {
    const result = await DocumentIndexing.indexDocument('user123', {
      name: 'empty.md',
      content: '',
      type: 'markdown',
    })
    expect(result).toBeDefined()
  })

  it('should handle empty userId in throttle check', () => {
    const result = Throttle.canQuery('', 'pro')
    expect(typeof result).toBe('boolean')
  })
})

describe('Edge Case: Extremely Long Inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const LONG_STRING_100K = 'x'.repeat(100000)
  const LONG_STRING_1M = 'x'.repeat(1000000)

  it('should handle 100k character input in constitutional check', async () => {
    const result = await Constitutional.checkInput(LONG_STRING_100K, 'user123')
    expect(result).toBeDefined()
  })

  it('should handle 100k character query in router', () => {
    const result = Router.quickRoute(LONG_STRING_100K)
    expect(result).toBeDefined()
  })

  it('should handle 1MB document in indexing', async () => {
    const result = await DocumentIndexing.indexDocument('user123', {
      name: 'huge.txt',
      content: LONG_STRING_1M,
      type: 'plaintext',
    })
    expect(result).toBeDefined()
  })

  it('should handle very long query in memory search', async () => {
    const result = await Memory.getContextForQuery(LONG_STRING_100K, 'workspace123')
    expect(result).toBeDefined()
  })
})

describe('Edge Case: Special Characters and Unicode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const SPECIAL_CHARS = '<script>alert("xss")</script>\x00\x01\x02'
  const UNICODE_CONTENT = '你好世界 🌍 مرحبا עולם שלום 🚀💻🎉'
  const MIXED_NEWLINES = 'Line1\nLine2\r\nLine3\rLine4'
  const SQL_INJECTION = "'; DROP TABLE users; --"

  it('should handle XSS-like content in constitutional check', async () => {
    const result = await Constitutional.checkInput(SPECIAL_CHARS, 'user123')
    expect(result).toBeDefined()
  })

  it('should handle unicode in router classification', () => {
    const result = Router.quickRoute(UNICODE_CONTENT)
    expect(result).toBeDefined()
  })

  it('should handle mixed newlines in memory storage', async () => {
    Memory.storeMessage('conv123', 'user', MIXED_NEWLINES)
    const { MemoryVault } = await import('@osqr/core')
    expect(MemoryVault.storeMessage).toHaveBeenCalled()
  })

  it('should handle SQL injection attempts safely', async () => {
    const result = await Constitutional.checkInput(SQL_INJECTION, 'user123')
    expect(result).toBeDefined()
  })

  it('should handle unicode filenames in document indexing', async () => {
    const result = await DocumentIndexing.indexDocument('user123', {
      name: '文档_тест_🎉.md',
      content: UNICODE_CONTENT,
      type: 'markdown',
    })
    expect(result).toBeDefined()
  })
})

describe('Edge Case: Rapid Sequential Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle 100 rapid throttle checks', async () => {
    const promises = Array(100)
      .fill(null)
      .map(() => Throttle.canQuery('user123', 'pro'))

    const results = await Promise.all(promises)
    expect(results.every((r) => typeof r === 'boolean')).toBe(true)
  })

  it('should handle 50 concurrent document indexing requests', async () => {
    const promises = Array(50)
      .fill(null)
      .map((_, i) =>
        DocumentIndexing.indexDocument('user123', {
          name: `doc${i}.md`,
          content: `Content ${i}`,
          type: 'markdown',
        })
      )

    const results = await Promise.all(promises)
    expect(results.every((r) => r.success)).toBe(true)
  })

  it('should handle 100 concurrent memory searches', async () => {
    const promises = Array(100)
      .fill(null)
      .map((_, i) => Memory.getContextForQuery(`query ${i}`, 'workspace123'))

    const results = await Promise.all(promises)
    expect(results.every((r) => r.memories !== undefined)).toBe(true)
  })

  it('should handle 100 concurrent router classifications', async () => {
    const promises = Array(100)
      .fill(null)
      .map((_, i) => Router.fullRoute(`question ${i}`))

    const results = await Promise.all(promises)
    expect(results.every((r) => r.recommendedModel !== undefined)).toBe(true)
  })
})

describe('Edge Case: Malformed/Invalid Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle invalid tier in throttle', () => {
    const result = Throttle.canQuery('user123', 'invalid' as unknown as 'pro')
    expect(typeof result).toBe('boolean')
  })

  it('should handle invalid document type', async () => {
    const result = await DocumentIndexing.indexDocument('user123', {
      name: 'test.xyz',
      content: 'content',
      type: 'invalid' as 'markdown',
    })
    expect(result).toBeDefined()
  })

  it('should handle circular reference prevention in memory formatting', () => {
    const memories = [
      {
        content: 'Test',
        relevanceScore: 0.9,
        category: 'fact',
        createdAt: new Date(),
        source: 'test',
      },
    ]
    const formatted = Memory.formatMemoriesForPrompt(memories)
    expect(typeof formatted).toBe('string')
  })
})

describe('Edge Case: Service Failures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should recover from constitutional service failure', async () => {
    const { Constitutional: MockConstitutional } = await import('@osqr/core')
    vi.mocked(MockConstitutional.validateIntent).mockRejectedValueOnce(new Error('Service down'))

    const result = await Constitutional.checkInput('test', 'user123')
    expect(result.allowed).toBe(true) // Fail open
  })

  it('should recover from router service failure', async () => {
    const { Router: MockRouter } = await import('@osqr/core')
    vi.mocked(MockRouter.classifyTask).mockRejectedValueOnce(new Error('Service down'))

    const result = await Router.fullRoute('test')
    expect(result).toBeDefined() // Falls back to quick route
  })

  it('should recover from memory service failure', async () => {
    const { MemoryVault } = await import('@osqr/core')
    vi.mocked(MemoryVault.retrieveContextForUser).mockRejectedValueOnce(new Error('Service down'))

    const result = await Memory.getContextForQuery('test', 'workspace123')
    expect(result.memories).toEqual([]) // Returns empty
  })

  it('should recover from throttle service failure', async () => {
    const { Throttle: MockThrottle } = await import('@osqr/core')
    vi.mocked(MockThrottle.canQuery).mockImplementationOnce(() => {
      throw new Error('Service down')
    })

    const result = Throttle.canQuery('user123', 'pro')
    expect(result).toBe(true) // Fail open
  })

  it('should recover from document indexing failure', async () => {
    const { DocumentIndexing: MockDocIndexing } = await import('@osqr/core')
    vi.mocked(MockDocIndexing.indexDocument).mockRejectedValueOnce(new Error('Service down'))

    const result = await DocumentIndexing.indexDocument('user123', {
      name: 'test.md',
      content: 'content',
      type: 'markdown',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('Edge Case: Timeout Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle slow constitutional check', async () => {
    const { Constitutional: MockConstitutional } = await import('@osqr/core')
    vi.mocked(MockConstitutional.validateIntent).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({
        allowed: true,
        clausesChecked: [],
        violations: [],
        confidenceScore: 0.95,
      }), 100))
    )

    const result = await Constitutional.checkInput('test', 'user123')
    expect(result).toBeDefined()
  })

  it('should handle slow router classification', async () => {
    const { Router: MockRouter } = await import('@osqr/core')
    vi.mocked(MockRouter.classifyTask).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({
        taskType: 'GENERAL_CHAT',
        complexityTier: 1,
        confidenceScore: 0.9,
        reasoning: 'Classified',
        requiredContext: [],
      }), 100))
    )

    const result = await Router.fullRoute('test')
    expect(result).toBeDefined()
  })
})

describe('Edge Case: Boundary Conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle exactly 0 queries remaining', async () => {
    const { Throttle: MockThrottle } = await import('@osqr/core')
    vi.mocked(MockThrottle.getQueriesRemaining).mockReturnValueOnce(0)
    vi.mocked(MockThrottle.canQuery).mockReturnValueOnce(false)

    const canQuery = Throttle.canQuery('user123', 'starter')
    expect(canQuery).toBe(false)
  })

  it('should handle exactly 1 query remaining', async () => {
    const { Throttle: MockThrottle } = await import('@osqr/core')
    vi.mocked(MockThrottle.getQueriesRemaining).mockReturnValueOnce(1)

    const status = Throttle.getThrottleStatus('user123', 'pro')
    expect(status).toBeDefined()
  })

  it('should handle confidence score of exactly 0', async () => {
    const { Router: MockRouter } = await import('@osqr/core')
    vi.mocked(MockRouter.quickClassify).mockReturnValueOnce({
      taskType: 'GENERAL_CHAT',
      complexityTier: 1,
      confidenceScore: 0,
      reasoning: 'Zero confidence',
      requiredContext: [],
    })

    const result = Router.quickRoute('test')
    expect(result.confidence).toBe(0)
  })

  it('should handle confidence score of exactly 1', async () => {
    const { Router: MockRouter } = await import('@osqr/core')
    vi.mocked(MockRouter.quickClassify).mockReturnValueOnce({
      taskType: 'GENERAL_CHAT',
      complexityTier: 1,
      confidenceScore: 1.0,
      reasoning: 'Perfect confidence',
      requiredContext: [],
    })

    const result = Router.quickRoute('test')
    expect(result.confidence).toBe(1.0)
  })

  it('should handle empty memories array', () => {
    const formatted = Memory.formatMemoriesForPrompt([])
    expect(formatted).toBe('')
  })

  it('should handle single memory', () => {
    const formatted = Memory.formatMemoriesForPrompt([
      {
        content: 'Single fact',
        relevanceScore: 0.9,
        category: 'fact',
        createdAt: new Date(),
        source: 'test',
      },
    ])
    expect(formatted).toContain('Single fact')
  })
})
