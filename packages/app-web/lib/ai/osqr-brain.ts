/**
 * OSQR Brain - The Central Intelligence Orchestrator
 *
 * This is the master controller that coordinates:
 * 1. Question analysis and routing
 * 2. Context assembly (GKVI + PKV + Self-Knowledge)
 * 3. Model selection and invocation
 * 4. Response synthesis
 * 5. TIL tracking
 *
 * This is what makes OSQR "think" - the intelligence layer between
 * raw model calls and the final response.
 *
 * @see lib/ai/model-router.ts for model selection logic
 * @see lib/ai/synthesis.ts for response synthesis
 * @see lib/knowledge/self-indexer.ts for OSQR's self-knowledge
 */

import {
  routeQuestion,
  detectQuestionType,
  estimateComplexity,
  getRecommendedModel,
  getCouncilModels,
  type RoutingDecision,
  type QuestionType,
  type ModelDefinition,
} from './model-router'
import {
  synthesize,
  quickSynthesize,
  getSynthesisSystemPrompt,
  type SynthesisInput,
  type SynthesisOutput,
  type ModelResponse,
} from './synthesis'
import {
  getSelfKnowledgeForQuery,
  isAskingAboutOSQR,
  getOSQRArchitectureSummary,
} from '@/lib/knowledge/self-indexer'
import { buildCompleteContext } from '@/lib/knowledge/pkv'
import { buildGKVIContext, getOSQRIdentity } from '@/lib/knowledge/gkvi'
import { trackConversation, getTILContext } from '@/lib/til'
import { isGapAnalysisIntent, parseGapIntent } from './intent-handlers/gap-intent'
import { analyzeKnowledgeGaps } from '@/lib/knowledge/gap-analysis'
import type { ProviderType } from './types'

// =============================================================================
// TYPES
// =============================================================================

export type ResponseMode = 'quick' | 'thoughtful' | 'contemplate' | 'council'

export interface OSQRThinkInput {
  message: string
  workspaceId: string
  userId: string
  threadId?: string
  mode?: ResponseMode  // If not provided, auto-determined
  userLevel?: number
  forceModel?: {       // Override routing for specific model
    provider: ProviderType
    model: string
  }
}

export interface OSQRThinkOutput {
  response: string
  mode: ResponseMode
  routing: RoutingDecision
  synthesis?: SynthesisOutput
  modelsUsed: string[]
  latencyMs: number
  metadata: {
    questionType: QuestionType
    complexity: number
    confidence: number
    usedSelfKnowledge: boolean
    usedPKV: boolean
    usedGapAnalysis: boolean
    tilTracked: boolean
  }
}

export interface OSQRContext {
  systemPrompt: string
  gkviContext: string
  pkvContext: string
  selfKnowledge: string
  tilContext: string | null
  userLevel: number
  questionType: QuestionType
  complexity: number
}

// =============================================================================
// CORE ORCHESTRATION
// =============================================================================

/**
 * Main entry point - OSQR "thinks" about a question
 *
 * This orchestrates the full pipeline:
 * 1. Analyze the question
 * 2. Determine response mode
 * 3. Assemble context
 * 4. Route to models
 * 5. Synthesize response
 * 6. Track in TIL
 */
export async function think(input: OSQRThinkInput): Promise<OSQRThinkOutput> {
  const startTime = Date.now()

  // 0. Check for special intent: Gap Analysis
  if (isGapAnalysisIntent(input.message)) {
    return handleGapAnalysisIntent(input, startTime)
  }

  // 1. Analyze the question
  const routing = routeQuestion(input.message)
  const { questionType, complexity, recommendedModel, modeSuggestion } = routing

  // 2. Determine response mode
  const mode = input.mode || determineMode(modeSuggestion, complexity, questionType)

  // 3. Check if asking about OSQR himself
  const askingAboutOSQR = isAskingAboutOSQR(input.message)
  let selfKnowledge = ''
  if (askingAboutOSQR) {
    selfKnowledge = getSelfKnowledgeForQuery(input.message)
    // If asking about OSQR architecture specifically
    if (input.message.toLowerCase().includes('how do you work') ||
        input.message.toLowerCase().includes('how does osqr work')) {
      selfKnowledge = getOSQRArchitectureSummary()
    }
  }

  // 4. Assemble full context
  const context = await assembleContext({
    workspaceId: input.workspaceId,
    message: input.message,
    userLevel: input.userLevel,
    questionType,
    selfKnowledge,
  })

  // 5. Select and invoke models based on mode
  let responses: ModelResponse[] = []
  let modelsUsed: string[] = []

  if (input.forceModel) {
    // Force specific model
    modelsUsed = [`${input.forceModel.provider}:${input.forceModel.model}`]
    // Would call the model here - placeholder for actual API call
    responses = [{
      provider: input.forceModel.provider,
      model: input.forceModel.model,
      displayName: 'Forced Model',
      content: '[Model response would go here]',
      latencyMs: 0,
    }]
  } else {
    // Route based on mode
    const modelSelection = selectModelsForMode(mode, routing)
    modelsUsed = modelSelection.map(m => m.displayName)

    // Would invoke models here - this is where actual API calls happen
    // For now, return placeholder
    responses = modelSelection.map(m => ({
      provider: m.provider as ProviderType,
      model: m.model,
      displayName: m.displayName,
      content: '[Model response would go here]',
      latencyMs: 0,
      personality: m.personality,
    }))
  }

  // 6. Synthesize response
  const synthesisInput: SynthesisInput = {
    question: input.message,
    questionType,
    complexity,
    userLevel: input.userLevel,
    responses,
    userContext: context.pkvContext,
  }

  const synthesis = mode === 'quick'
    ? quickSynthesize(responses[0])
    : await synthesize(synthesisInput)

  // 7. Track in TIL (background)
  let tilTracked = false
  try {
    await trackConversation(input.workspaceId, input.message, synthesis.synthesizedResponse)
    tilTracked = true
  } catch {
    // TIL tracking is non-critical
  }

  return {
    response: synthesis.synthesizedResponse,
    mode,
    routing,
    synthesis,
    modelsUsed,
    latencyMs: Date.now() - startTime,
    metadata: {
      questionType,
      complexity,
      confidence: synthesis.confidence,
      usedSelfKnowledge: selfKnowledge.length > 0,
      usedPKV: context.pkvContext.length > 0,
      usedGapAnalysis: false,
      tilTracked,
    },
  }
}

/**
 * Handle gap analysis intent - special path for "What am I missing?" queries
 */
async function handleGapAnalysisIntent(
  input: OSQRThinkInput,
  startTime: number
): Promise<OSQRThinkOutput> {
  const intentContext = parseGapIntent(input.message)

  // Run gap analysis
  const gapResult = await analyzeKnowledgeGaps(input.workspaceId, {
    userId: input.userId,
    topN: intentContext.topN || 5,
  })

  // Track in TIL
  let tilTracked = false
  try {
    await trackConversation(input.workspaceId, input.message, gapResult.summary)
    tilTracked = true
  } catch {
    // TIL tracking is non-critical
  }

  // Create a routing decision for gap analysis
  const routing: RoutingDecision = {
    questionType: 'analytical',
    complexity: 3,
    confidence: 0.9,
    modeSuggestion: 'thoughtful',
    recommendedModel: {
      provider: 'anthropic',
      model: 'claude-sonnet',
      reason: 'Gap analysis uses internal logic',
    },
    alternativeModels: [],
    shouldSuggestAltOpinion: false,
  }

  return {
    response: gapResult.summary,
    mode: 'thoughtful',
    routing,
    modelsUsed: ['OSQR Gap Analysis Engine'],
    latencyMs: Date.now() - startTime,
    metadata: {
      questionType: 'analytical',
      complexity: 3,
      confidence: gapResult.hasGoals && gapResult.hasDocs ? 0.85 : 0.5,
      usedSelfKnowledge: false,
      usedPKV: true,
      usedGapAnalysis: true,
      tilTracked,
    },
  }
}

/**
 * Determine response mode based on routing suggestion and context
 */
function determineMode(
  suggestion: 'none' | 'thoughtful' | 'contemplate',
  complexity: number,
  questionType: QuestionType
): ResponseMode {
  // Self-referential questions (about OSQR) always use Quick mode
  // Constitution is already in the prompt, no need for multi-model synthesis
  if (questionType === 'self_referential') return 'quick'

  // Always contemplate for very complex high-stakes questions
  if (suggestion === 'contemplate') return 'contemplate'

  // Thoughtful for complex or suggested
  if (suggestion === 'thoughtful' || complexity >= 4) return 'thoughtful'

  // Quick for simple questions
  if (complexity <= 2) return 'quick'

  // Default to thoughtful for medium complexity
  return 'thoughtful'
}

/**
 * Select models based on response mode
 */
function selectModelsForMode(
  mode: ResponseMode,
  routing: RoutingDecision
): ModelDefinition[] {
  const councilModels = getCouncilModels()

  switch (mode) {
    case 'quick':
      // Single model - use recommended
      const recommended = councilModels.find(
        m => m.provider === routing.recommendedModel.provider &&
             m.model === routing.recommendedModel.model
      )
      return recommended ? [recommended] : [councilModels[0]]

    case 'thoughtful':
      // 3 models - diverse perspectives
      return selectDiverseModels(councilModels, 3)

    case 'contemplate':
      // All available council models
      return councilModels.slice(0, 4)

    default:
      return [councilModels[0]]
  }
}

/**
 * Select diverse models (different providers) for panel discussion
 */
function selectDiverseModels(models: ModelDefinition[], count: number): ModelDefinition[] {
  const selected: ModelDefinition[] = []
  const usedProviders = new Set<string>()

  // First pass: one from each provider
  for (const model of models) {
    if (selected.length >= count) break
    if (!usedProviders.has(model.provider)) {
      selected.push(model)
      usedProviders.add(model.provider)
    }
  }

  // Second pass: fill remaining slots
  for (const model of models) {
    if (selected.length >= count) break
    if (!selected.includes(model)) {
      selected.push(model)
    }
  }

  return selected
}

// =============================================================================
// CONTEXT ASSEMBLY
// =============================================================================

/**
 * Assemble complete context for OSQR response
 */
async function assembleContext(params: {
  workspaceId: string
  message: string
  userLevel?: number
  questionType: QuestionType
  selfKnowledge?: string
}): Promise<OSQRContext> {
  const { workspaceId, message, userLevel, questionType, selfKnowledge = '' } = params

  // Build GKVI context (global brain)
  const gkviContext = buildGKVIContext({
    userLevel,
    questionType,
  })

  // Build PKV context (private brain)
  const { pkvContext } = await buildCompleteContext({
    workspaceId,
    userMessage: message,
    userLevel,
    questionType,
  })

  // Get TIL context (temporal intelligence)
  const tilContext = await getTILContext(workspaceId, message)

  // Build system prompt
  const identity = getOSQRIdentity()
  const synthesis = getSynthesisSystemPrompt(userLevel)

  const systemPrompt = `${identity}

${synthesis}

${gkviContext}

${selfKnowledge ? `\n## OSQR Self-Knowledge\n\n${selfKnowledge}` : ''}

${pkvContext ? `\n## User Context\n\n${pkvContext}` : ''}

${tilContext ? `\n## Recent Context\n\n${tilContext}` : ''}`

  return {
    systemPrompt,
    gkviContext,
    pkvContext,
    selfKnowledge,
    tilContext,
    userLevel: userLevel || 5,
    questionType,
    complexity: estimateComplexity(message),
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a question should trigger panel mode
 */
export function shouldUsePanelMode(message: string): boolean {
  const routing = routeQuestion(message)
  return routing.modeSuggestion !== 'none' || routing.complexity >= 4
}

/**
 * Get quick analysis of a question without full processing
 */
export function quickAnalyze(message: string): {
  questionType: QuestionType
  complexity: number
  suggestedMode: ResponseMode
  confidence: number
} {
  const routing = routeQuestion(message)
  const mode = determineMode(routing.modeSuggestion, routing.complexity, routing.questionType)

  return {
    questionType: routing.questionType,
    complexity: routing.complexity,
    suggestedMode: mode,
    confidence: routing.confidence,
  }
}

/**
 * Get model recommendations for a question
 */
export function getModelRecommendations(message: string): {
  primary: string
  alternatives: string[]
  reason: string
} {
  const routing = routeQuestion(message)

  return {
    primary: `${routing.recommendedModel.provider}/${routing.recommendedModel.model}`,
    alternatives: routing.alternativeModels.map(m => `${m.provider}/${m.model}`),
    reason: routing.recommendedModel.reason,
  }
}
