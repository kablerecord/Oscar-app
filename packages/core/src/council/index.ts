/**
 * Council Mode
 *
 * Multi-model deliberation system where Claude, GPT-4, and Gemini
 * contribute perspectives and Oscar arbitrates into a unified response.
 *
 * @module council
 */

// ============================================
// TYPES
// ============================================

export type {
  // Model Response
  ModelId,
  ModelDisplayName,
  ResponseStatus,
  ModelConfidence,
  ModelResponse,

  // Agreement
  AgreementLevel,
  ResolutionType,
  ModelPosition,
  DivergentPoint,
  AgreementAnalysis,

  // Arbitration
  ArbitrationEntry,
  ModelWeight,
  SynthesisResult,

  // Council Deliberation
  CouncilTriggerType,
  CouncilDeliberation,

  // User-facing Summary
  ConsensusLevel,
  ModelCard,
  DisagreementSummary,
  CouncilSummary,

  // Trigger Conditions
  AutoTriggerConditions,
  TriggerEvaluationResult,

  // Configuration
  UserTier,
  TierLimits,
  TimeoutConfig,
  ConfidenceFactors,

  // Context
  SharedContext,
  SpecializedContext,
  ContextDistribution,
  ConversationMessage,
  UserInfo,
  ConversationContext,

  // Display
  DisplayState,

  // Events
  CouncilEventType,
  CouncilEvent,
} from './types';

// Error classes
export {
  CouncilError,
  TierLimitError,
  ModelTimeoutError,
  InsufficientResponsesError,
} from './types';

// ============================================
// CONFIGURATION
// ============================================

export {
  // Tier config
  TIER_CONFIG,

  // Timeout config
  TIMEOUT_CONFIG,

  // Default config
  DEFAULT_CONFIG,

  // Query types
  type QueryType,
  type ModelWeights,
  SPECIALTY_WEIGHTS,
  getSpecialtyWeights,
  mapClassificationToQueryType,

  // Model display
  MODEL_DISPLAY_NAMES,
  getModelDisplayName,

  // Confidence weights
  CONFIDENCE_WEIGHTS,

  // Cost estimation
  MODEL_COSTS,
  estimateCost,
} from './config';

// ============================================
// TRIGGER EVALUATION
// ============================================

export {
  // User invocation
  isUserInvokedCouncil,
  stripCouncilInvocation,

  // High-stakes detection
  extractDollarAmount,
  detectFinancialThreshold,
  detectLegalImplications,
  detectHealthDecisions,

  // Complexity detection
  detectDomains,
  detectMultiDomain,
  detectResearchDepthRequired,
  detectStrategicPlanning,

  // Uncertainty detection
  detectConflictingSources,
  detectNovelSituation,

  // Auto-trigger evaluation
  evaluateAutoTriggerConditions,
  shouldAutoTrigger,
  getAutoTriggerReason,

  // Tier limits
  canUseCouncil,
  isAutoTriggerEnabled,
  getAvailableModels,

  // Main trigger evaluation
  evaluateCouncilTrigger,
} from './trigger';

// ============================================
// MODEL ADAPTERS
// ============================================

export {
  // Types
  type AdapterConfig,
  type ProviderResponse,
  type ClaudeConfig,
  type GPT4Config,
  type GeminiConfig,
  type AdapterRegistry,
  type MultiAdapterConfig,

  // Base adapter
  BaseModelAdapter,

  // Concrete adapters
  ClaudeAdapter,
  GPT4Adapter,
  GeminiAdapter,
  createClaudeAdapter,
  createGPT4Adapter,
  createGeminiAdapter,

  // Registry functions
  createAdapterRegistry,
  getAdapter,
  queryMultipleModels,
  getRegisteredModelIds,
  isModelRegistered,
} from './adapters';

// ============================================
// DISPATCHER
// ============================================

export {
  // Types
  type DispatchOptions,
  type DispatchResult,

  // Dispatch functions
  dispatchToCouncil,
  handleCouncilWithFallbacks,
  fallbackToSingleModel,
  distributeContext,
  initializeAdapters,
} from './dispatcher';

// ============================================
// SYNTHESIS
// ============================================

export {
  // Confidence
  calculateHedgingScore,
  assessReasoningDepth,
  countSourceCitations,
  assessResponseCompleteness,
  assessInternalConsistency,
  analyzeConfidenceFactors,
  normalizeConfidence,
  buildModelConfidence,
  formatConfidenceBreakdown,

  // Agreement
  isSignificantDisagreement,
  extractKeyConcepts,
  calculateConceptSimilarity,
  calculatePairwiseSimilarity,
  calculateAverageSimilarity,
  extractFactualClaims,
  detectFactualContradictions,
  extractAlignedPoints,
  determineAgreementLevel,
  calculateAgreementScore,
  analyzeAgreement,
  formatAgreementSummary,

  // Prompts
  OSCAR_SYNTHESIS_PROMPT,
  RESILIENT_SYNTHESIZER_EXTENSION,
  buildContextSection,
  buildSynthesisPrompt,
  buildSummaryPrompt,
  buildReasoningChainPrompt,

  // Synthesizer
  synthesize,
  calculateModelWeights,
  buildCouncilDeliberation,
  createFallbackSynthesis,
  type SynthesisOptions,
} from './synthesis';

// ============================================
// DISPLAY
// ============================================

export {
  // State management
  determineDisplayState,
  mapToConsensusLevel,
  generateConsensusDescription,
  buildModelCards,
  buildDisagreementSummaries,
  buildCouncilSummary,
  canTransitionTo,
  getAvailableTransitions,
  stateTransitions,

  // Formatters
  formatDefaultView,
  formatExpandedView,
  formatDisagreementView,
  formatFullLog,
  formatForState,
  formatAsJSON,
  type FormatOptions,
} from './display';

// ============================================
// MAIN COUNCIL FUNCTION
// ============================================

import type {
  ConversationContext,
  CouncilDeliberation,
  CouncilTriggerType,
} from './types';
import { evaluateCouncilTrigger, stripCouncilInvocation, isUserInvokedCouncil } from './trigger';
import { dispatchToCouncil, initializeAdapters } from './dispatcher';
import { synthesize, buildCouncilDeliberation } from './synthesis';
import { analyzeAgreement } from './synthesis/agreement';

/**
 * Generate a simple UUID v4
 */
function generateQueryId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Council execution options
 */
export interface CouncilOptions {
  forceCouncil?: boolean;
  queryClassification?: string[];
  resilientMode?: boolean;
}

/**
 * Council execution result
 */
export interface CouncilResult {
  triggered: boolean;
  reason: string;
  deliberation?: CouncilDeliberation;
}

/**
 * Execute council mode deliberation
 *
 * This is the main entry point for council mode. It:
 * 1. Evaluates whether council should be triggered
 * 2. Dispatches query to multiple models in parallel
 * 3. Analyzes agreement across responses
 * 4. Synthesizes a unified response
 * 5. Returns the complete deliberation result
 */
export async function executeCouncil(
  query: string,
  context?: ConversationContext,
  options: CouncilOptions = {}
): Promise<CouncilResult> {
  // Evaluate trigger conditions (unless forced)
  if (!options.forceCouncil) {
    const triggerResult = evaluateCouncilTrigger(query, context);

    if (!triggerResult.shouldTrigger) {
      return {
        triggered: false,
        reason: triggerResult.reason,
      };
    }
  }

  // Determine trigger type
  const triggerType: CouncilTriggerType = isUserInvokedCouncil(query) ? 'user_invoked' : 'auto';

  // Strip council invocation syntax from query
  const cleanQuery = stripCouncilInvocation(query);

  // Generate query ID
  const queryId = generateQueryId();

  // Initialize adapters if needed
  initializeAdapters();

  // Dispatch to council
  const dispatchResult = await dispatchToCouncil(cleanQuery, {
    context,
  });

  // Analyze agreement
  const agreement = analyzeAgreement(dispatchResult.responses);

  // Synthesize response
  const synthesis = await synthesize(cleanQuery, dispatchResult.responses, {
    queryClassification: options.queryClassification,
    resilientMode: options.resilientMode,
  });

  // Build complete deliberation
  const deliberation = buildCouncilDeliberation(
    queryId,
    cleanQuery,
    dispatchResult.responses,
    synthesis,
    agreement,
    triggerType,
    options.queryClassification
  );

  return {
    triggered: true,
    reason: triggerType === 'user_invoked' ? 'user_invoked' : 'auto_triggered',
    deliberation,
  };
}

/**
 * Quick check if a query should trigger council mode
 */
export function shouldTriggerCouncil(
  query: string,
  context?: ConversationContext
): boolean {
  return evaluateCouncilTrigger(query, context).shouldTrigger;
}

export default {
  executeCouncil,
  shouldTriggerCouncil,
  evaluateCouncilTrigger,
  dispatchToCouncil,
  synthesize,
};
