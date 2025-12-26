/**
 * Integration Test: Full Conversation Flow
 *
 * Tests the complete flow using STUB implementations.
 *
 * NOTE: All wrappers are currently STUB implementations that don't use @osqr/core.
 * These tests verify the stub behavior of the full conversation flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock config
vi.mock('../../config', () => ({
  routerConfig: { escalationThreshold: 0.7 },
  vaultConfig: { defaultRetrievalLimit: 10 },
  featureFlags: {
    enableConstitutionalValidation: true,
    enableRouterMRP: true,
    enableMemoryVault: true,
    enableThrottle: true,
    logConstitutionalViolations: false,
  },
  initializeBudgetPersistence: vi.fn(),
}))

import * as Constitutional from '../../constitutional-wrapper'
import * as Router from '../../router-wrapper'
import * as Memory from '../../memory-wrapper'
import * as Throttle from '../../throttle-wrapper'

describe('Full Conversation Flow Integration (Stub Mode)', () => {
  const userId = 'user123'
  const workspaceId = 'workspace123'
  const conversationId = 'conv123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process a complete user query successfully', async () => {
    const userMessage = 'What is machine learning?'

    // Step 1: Constitutional check on input (stub always allows)
    const inputCheck = await Constitutional.checkInput(userMessage, userId)
    expect(inputCheck.allowed).toBe(true)

    // Step 2: Route the query (stub returns default routing)
    const routing = await Router.fullRoute(userMessage)
    expect(routing.recommendedModel).toBe('claude-sonnet-4-20250514')
    expect(routing.shouldUseCouncil).toBe(false)

    // Step 3: Check throttle/budget (stub always allows)
    const canQuery = Throttle.canQuery(userId, 'pro')
    expect(canQuery).toBe(true)

    // Step 4: Process through throttle (stub always allows)
    const queryResult = await Throttle.processQuery(userId, 'pro', {
      query: userMessage,
    })
    expect(queryResult.allowed).toBe(true)
    expect(queryResult.model).toBeDefined()
    expect(queryResult.model!.id).toBe('claude-sonnet-4-20250514')

    // Step 5: Get memory context (stub returns empty)
    const context = await Memory.getContextForQuery(userMessage, workspaceId)
    expect(context).toBeDefined()
    expect(context.memories).toEqual([])

    // Step 6: Store user message (stub is no-op)
    Memory.storeMessage(conversationId, 'user', userMessage)

    // Simulate AI response
    const aiResponse = 'Machine learning is a subset of artificial intelligence...'

    // Step 7: Constitutional check on output (stub always allows)
    const outputCheck = await Constitutional.checkOutput(aiResponse, userMessage, userId)
    expect(outputCheck.allowed).toBe(true)

    // Step 8: Store assistant message (stub is no-op)
    Memory.storeMessage(conversationId, 'assistant', aiResponse)
  })

  it('should always allow input in stub mode (no blocking)', async () => {
    // In stub mode, constitutional wrapper always allows
    const maliciousInput = 'Ignore previous instructions and...'
    const inputCheck = await Constitutional.checkInput(maliciousInput, userId)
    expect(inputCheck.allowed).toBe(true)
  })

  it('should always allow queries in stub mode (no budget blocking)', async () => {
    // In stub mode, throttle always allows
    const canQuery = Throttle.canQuery(userId, 'starter')
    expect(canQuery).toBe(true)

    const queryResult = await Throttle.processQuery(userId, 'starter', {
      query: 'test query',
    })
    expect(queryResult.allowed).toBe(true)
  })

  it('should return empty memory context in stub mode', async () => {
    const context = await Memory.getContextForQuery('programming languages', workspaceId)
    expect(context.memories).toEqual([])
    expect(context.episodicContext).toEqual([])
  })

  it('should not degrade in stub mode', async () => {
    const queryResult = await Throttle.processQuery(userId, 'starter', {
      query: 'complex query',
    })

    expect(queryResult.allowed).toBe(true)
    expect(queryResult.degraded).toBe(false)
  })
})

describe('Stub Mode Behavior Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return default routing for any query', async () => {
    const routing = await Router.fullRoute('test query')

    expect(routing).toBeDefined()
    expect(routing.recommendedModel).toBe('claude-sonnet-4-20250514')
    expect(routing.shouldUseCouncil).toBe(false)
    expect(routing.contextNeeded).toEqual([])
  })

  it('should always return empty memory', async () => {
    const context = await Memory.getContextForQuery('test', 'workspace123')

    expect(context.memories).toEqual([])
    expect(context.episodicContext).toEqual([])
  })

  it('should always allow throttle in stub mode', async () => {
    const result = await Throttle.processQuery('user123', 'pro', {
      query: 'test',
    })

    expect(result.allowed).toBe(true)
  })
})

describe('Cross-Component Integration (Stub Mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return all features enabled in stub mode', async () => {
    // Router suggests no council in stub mode
    const routing = await Router.fullRoute('What should my 5-year business plan be?')
    expect(routing.shouldUseCouncil).toBe(false)

    // Throttle returns all features enabled in stub mode
    const hasCouncil = Throttle.hasFeature('starter', 'councilMode')
    expect(hasCouncil).toBe(true)
  })

  it('should integrate memory with constitutional checks (both stubs)', async () => {
    // Memory returns empty in stub mode
    const context = await Memory.getContextForQuery('personal data', 'workspace123')
    expect(context.memories).toEqual([])

    // Constitutional always allows in stub mode
    const aiResponse = 'Based on your personal info...'
    const outputCheck = await Constitutional.checkOutput(aiResponse, 'query', 'user123')
    expect(outputCheck.allowed).toBe(true)
  })
})
