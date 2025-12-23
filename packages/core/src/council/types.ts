/**
 * Council Mode Types
 *
 * Multi-model deliberation system where Claude, GPT-4, and Gemini
 * contribute perspectives and Oscar arbitrates into a unified response.
 */

// ============================================
// MODEL RESPONSE OBJECT
// ============================================

export type ModelId = 'claude-3-opus' | 'gpt-4-turbo' | 'gemini-pro';
export type ModelDisplayName = 'Claude' | 'GPT-4' | 'Gemini';
export type ResponseStatus = 'success' | 'timeout' | 'error' | 'partial';

export interface ModelConfidence {
  rawScore: number | null;         // Model's native confidence if available (usually null)
  normalizedScore: number;         // 0-100 scale (derived from response analysis)
  reasoningDepth: number;          // 1-5 scale based on response analysis
}

export interface ModelResponse {
  // Identification
  modelId: ModelId | string;
  modelDisplayName: ModelDisplayName | string;

  // Core Response
  content: string;                 // The model's full response text
  summary: string;                 // 1-2 sentence summary (model-generated or extracted)

  // Confidence Metadata
  confidence: ModelConfidence;

  // Provenance
  sourcesCited: string[];          // URLs or references mentioned
  reasoningChain: string[];        // Key logical steps (extracted)

  // Technical Metadata
  latencyMs: number;               // Time to receive response
  tokensUsed: number;              // Input + output tokens
  timestamp: string;               // ISO 8601

  // Status
  status: ResponseStatus;
  errorMessage?: string;
}

// ============================================
// AGREEMENT ANALYSIS
// ============================================

export type AgreementLevel = 'high' | 'moderate' | 'low' | 'split';

export type ResolutionType =
  | 'model_a_weighted'
  | 'model_b_weighted'
  | 'presented_both'
  | 'external_grounding';

export interface ModelPosition {
  modelId: string;
  position: string;
  confidence: number;
}

export interface DivergentPoint {
  topic: string;
  positions: ModelPosition[];
  resolution: ResolutionType;
  resolutionReasoning: string;
}

export interface AgreementAnalysis {
  level: AgreementLevel;
  score: number;                   // 0-100
  alignedPoints: string[];         // Points all models agreed on
  divergentPoints: DivergentPoint[];
}

// ============================================
// ARBITRATION
// ============================================

export interface ArbitrationEntry {
  step: number;
  action: string;
  reasoning: string;
  outcome: string;
}

export interface ModelWeight {
  modelId: string;
  baseWeight: number;              // From specialty matching
  adjustedWeight: number;          // After confidence/grounding adjustments
  adjustmentReason?: string;
}

export interface SynthesisResult {
  finalResponse: string;           // Oscar's unified answer
  arbitrationLog: ArbitrationEntry[];
  weightsApplied: ModelWeight[];
  transparencyFlags: string[];     // Any disagreements to surface
}

// ============================================
// COUNCIL DELIBERATION OBJECT
// ============================================

export type CouncilTriggerType = 'auto' | 'user_invoked';

export interface CouncilDeliberation {
  // Query Context
  queryId: string;
  originalQuery: string;
  queryClassification: string[];   // ["financial", "strategic", etc.]

  // Model Responses
  responses: ModelResponse[];

  // Agreement Analysis
  agreement: AgreementAnalysis;

  // Synthesis Output
  synthesis: SynthesisResult;

  // Metadata
  totalLatencyMs: number;
  totalCostEstimate: number;
  councilModeTrigger: CouncilTriggerType;
}

// ============================================
// USER-FACING COUNCIL SUMMARY
// ============================================

export type ConsensusLevel = 'High' | 'Moderate' | 'Split';

export interface ModelCard {
  modelName: string;
  confidencePercent: number;
  summary: string;
  fullResponseAvailable: boolean;
}

export interface DisagreementSummary {
  topic: string;
  modelPositions: { model: string; position: string }[];
  oscarRecommendation: string;
  oscarReasoning: string;
}

export interface CouncilSummary {
  consensusLevel: ConsensusLevel;
  consensusDescription: string;    // "3/3 models aligned" or "Models disagreed on X"
  modelCards: ModelCard[];
  disagreements?: DisagreementSummary[];
  arbitrationVisible: boolean;     // User can expand to see full log
}

// ============================================
// TRIGGER CONDITIONS
// ============================================

export interface AutoTriggerConditions {
  // HIGH-STAKES DECISIONS
  financialThreshold: boolean;     // Query involves money > $10,000
  legalImplications: boolean;      // Query classified as legal advice
  healthDecisions: boolean;        // Query classified as medical

  // COMPLEXITY INDICATORS
  multiDomain: boolean;            // Query spans 2+ domains
  researchDepthRequired: boolean;  // Query explicitly asks for research/sources
  strategicPlanning: boolean;      // Query involves planning > 6 months

  // EXPLICIT UNCERTAINTY
  conflictingSourcesDetected: boolean;  // Query contains contradictory info
  novelSituation: boolean;         // Low similarity to training patterns

  // USER HISTORY
  userPreferenceAggressive: boolean;    // User set "always use council"
  recentCorrection: boolean;       // User corrected single-model recently
}

export interface TriggerEvaluationResult {
  shouldTrigger: boolean;
  reason: string;
  conditions: Partial<AutoTriggerConditions>;
}

// ============================================
// TIER CONFIGURATION
// ============================================

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface TierLimits {
  councilPerDay: number | 'unlimited';
  autoTriggerEnabled: boolean;
  modelsAvailable: number;
}

// ============================================
// TIMEOUT CONFIGURATION
// ============================================

export interface TimeoutConfig {
  perModelTimeoutMs: number;       // 30 seconds max per model
  totalCouncilTimeoutMs: number;   // 45 seconds for entire council
  minModelsForSynthesis: number;   // Need at least 2 responses to proceed
  retryAttempts: number;           // One retry on failure
  retryDelayMs: number;            // 2 second delay before retry
}

// ============================================
// CONFIDENCE FACTORS
// ============================================

export interface ConfidenceFactors {
  reasoningDepth: number;          // 1-5 scale
  hedgingLanguage: number;         // 0-100 (higher = less hedging = more confident)
  sourceCitations: number;         // Count of citations
  responseCompleteness: number;    // 0-100
  internalConsistency: number;     // 0-100
}

// ============================================
// CONTEXT DISTRIBUTION
// ============================================

export interface SharedContext {
  originalQuery: string;
  userIntent: string;
  keyConstraints: string[];
}

export interface SpecializedContext {
  relevantHistory: string[];
  domainContext: string[];
}

export interface ContextDistribution {
  shared: SharedContext;
  specialized: {
    [modelId: string]: SpecializedContext;
  };
}

// ============================================
// CONVERSATION CONTEXT
// ============================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface UserInfo {
  id: string;
  tier: UserTier;
  councilUsesToday: number;
  preferences: {
    councilModeAggressive: boolean;
  };
}

export interface ConversationContext {
  currentQuery: string;
  detectedIntent: string;
  constraints: string[];
  history: ConversationMessage[];
  user: UserInfo;
}

// ============================================
// DISPLAY STATE
// ============================================

export type DisplayState =
  | 'default'        // Synthesis only
  | 'expanded'       // Council details
  | 'disagreement'   // Split council view
  | 'full_log';      // Arbitration log

// ============================================
// EVENTS
// ============================================

export type CouncilEventType =
  | 'council:started'
  | 'council:model_responded'
  | 'council:synthesis_complete'
  | 'council:failed';

export interface CouncilEvent {
  type: CouncilEventType;
  queryId: string;
  timestamp: string;
  data?: unknown;
}

// ============================================
// ERROR TYPES
// ============================================

export class CouncilError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'CouncilError';
  }
}

export class TierLimitError extends CouncilError {
  constructor(tier: UserTier, limit: number | 'unlimited') {
    super(
      `Council mode limit reached for ${tier} tier (${limit}/day)`,
      'TIER_LIMIT_EXCEEDED',
      false
    );
    this.name = 'TierLimitError';
  }
}

export class ModelTimeoutError extends CouncilError {
  constructor(modelId: string, timeoutMs: number) {
    super(
      `Model ${modelId} timed out after ${timeoutMs}ms`,
      'MODEL_TIMEOUT',
      true
    );
    this.name = 'ModelTimeoutError';
  }
}

export class InsufficientResponsesError extends CouncilError {
  constructor(received: number, required: number) {
    super(
      `Only ${received} model(s) responded, need at least ${required} for synthesis`,
      'INSUFFICIENT_RESPONSES',
      true
    );
    this.name = 'InsufficientResponsesError';
  }
}
