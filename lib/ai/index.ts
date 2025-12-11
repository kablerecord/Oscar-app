/**
 * OSQR AI Module - Public API
 *
 * This is the main entry point for OSQR's intelligence layer.
 * Import from '@/lib/ai' to access all AI capabilities.
 *
 * Architecture:
 * - osqr-brain.ts: Central orchestrator (think, analyze, route)
 * - model-router.ts: Model selection and routing
 * - synthesis.ts: Multi-model response synthesis
 * - providers/: Individual model API implementations
 *
 * Usage:
 * ```typescript
 * import { think, quickAnalyze, getModelRecommendations } from '@/lib/ai'
 *
 * const result = await think({
 *   message: 'How should I structure my startup?',
 *   workspaceId: 'ws_123',
 *   userId: 'user_456',
 * })
 * ```
 */

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

export {
  think,
  quickAnalyze,
  shouldUsePanelMode,
  getModelRecommendations,
  type OSQRThinkInput,
  type OSQRThinkOutput,
  type OSQRContext,
  type ResponseMode,
} from './osqr-brain'

// =============================================================================
// MODEL ROUTING
// =============================================================================

export {
  routeQuestion,
  detectQuestionType,
  estimateComplexity,
  getRecommendedModel,
  getAlternativeModels,
  getEnabledModels,
  getCouncilModels,
  getModelById,
  getModelsByProvider,
  getBestModelForCapability,
  MODEL_REGISTRY,
  AVAILABLE_MODELS,
  type QuestionType,
  type ModelProvider,
  type CostProfile,
  type ModelCapabilities,
  type ModelPersonality,
  type ModelDefinition,
  type ModelRecommendation,
  type RoutingDecision,
} from './model-router'

// =============================================================================
// SYNTHESIS
// =============================================================================

export {
  synthesize,
  quickSynthesize,
  analyzeConsensus,
  extractKeyInsights,
  getSynthesisSystemPrompt,
  getOSQRVoiceIdentity,
  type SynthesisInput,
  type SynthesisOutput,
  type ModelResponse,
} from './synthesis'

// =============================================================================
// TYPES
// =============================================================================

export type { ProviderType } from './types'
