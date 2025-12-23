/**
 * OSQR Multi-Model Router - Type Definitions
 *
 * Routes queries to optimal AI models based on complexity, cost, and latency.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Task complexity tiers - determines which model handles the request
 */
export enum ComplexityTier {
  ROUTING = 1,      // Classification only - Llama 8B
  SIMPLE = 2,       // Simple Q&A, lookup - Llama 70B
  COMPLEX = 3,      // Content generation, code - Claude Sonnet
  STRATEGIC = 4,    // Deep reasoning, planning - Claude Opus
}

/**
 * Task type classification
 */
export enum TaskType {
  INTENT_CLASSIFICATION = 'intent_classification',
  SIMPLE_QA = 'simple_qa',
  KNOWLEDGE_LOOKUP = 'knowledge_lookup',
  CONTENT_GENERATION = 'content_generation',
  CODE_GENERATION = 'code_generation',
  CODE_REVIEW = 'code_review',
  STRATEGIC_PLANNING = 'strategic_planning',
  MULTI_MODEL_DELIBERATION = 'multi_model_deliberation',
  VOICE_TRANSCRIPTION = 'voice_transcription',
  OUTPUT_VALIDATION = 'output_validation',
  FORMATTING = 'formatting',
}

/**
 * Supported model providers
 */
export enum ModelProvider {
  GROQ = 'groq',
  ANTHROPIC = 'anthropic',
}

// ============================================================================
// Model Configuration
// ============================================================================

/**
 * Available models with their metadata
 */
export interface ModelConfig {
  id: string;
  provider: ModelProvider;
  displayName: string;
  inputPricePerMillion: number;  // USD
  outputPricePerMillion: number; // USD
  maxContextTokens: number;
  tokensPerSecond: number;       // Approximate throughput
  tier: ComplexityTier;
}

/**
 * Model registry - source of truth for available models
 */
export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'llama-3.1-8b-instant': {
    id: 'llama-3.1-8b-instant',
    provider: ModelProvider.GROQ,
    displayName: 'Llama 3.1 8B',
    inputPricePerMillion: 0.05,
    outputPricePerMillion: 0.08,
    maxContextTokens: 128000,
    tokensPerSecond: 840,
    tier: ComplexityTier.ROUTING,
  },
  'llama-3.3-70b-versatile': {
    id: 'llama-3.3-70b-versatile',
    provider: ModelProvider.GROQ,
    displayName: 'Llama 3.3 70B',
    inputPricePerMillion: 0.59,
    outputPricePerMillion: 0.79,
    maxContextTokens: 128000,
    tokensPerSecond: 394,
    tier: ComplexityTier.SIMPLE,
  },
  'claude-sonnet-4-20250514': {
    id: 'claude-sonnet-4-20250514',
    provider: ModelProvider.ANTHROPIC,
    displayName: 'Claude Sonnet 4',
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
    maxContextTokens: 200000,
    tokensPerSecond: 80,
    tier: ComplexityTier.COMPLEX,
  },
  'claude-opus-4-20250514': {
    id: 'claude-opus-4-20250514',
    provider: ModelProvider.ANTHROPIC,
    displayName: 'Claude Opus 4',
    inputPricePerMillion: 15.00,
    outputPricePerMillion: 75.00,
    maxContextTokens: 200000,
    tokensPerSecond: 40,
    tier: ComplexityTier.STRATEGIC,
  },
  'whisper-large-v3-turbo': {
    id: 'whisper-large-v3-turbo',
    provider: ModelProvider.GROQ,
    displayName: 'Whisper V3 Turbo',
    inputPricePerMillion: 0.04, // Per hour
    outputPricePerMillion: 0,
    maxContextTokens: 0,        // Audio, not tokens
    tokensPerSecond: 228,       // Speed factor vs realtime
    tier: ComplexityTier.ROUTING,
  },
};

/**
 * Tier to model mapping
 */
export const TIER_TO_MODEL: Record<ComplexityTier, string> = {
  [ComplexityTier.ROUTING]: 'llama-3.1-8b-instant',
  [ComplexityTier.SIMPLE]: 'llama-3.3-70b-versatile',
  [ComplexityTier.COMPLEX]: 'claude-sonnet-4-20250514',
  [ComplexityTier.STRATEGIC]: 'claude-opus-4-20250514',
};

// ============================================================================
// Classification
// ============================================================================

/**
 * Classification result from the Classifier module
 */
export interface ClassificationResult {
  taskType: TaskType;
  complexityTier: ComplexityTier;
  confidenceScore: number;       // 0.0 to 1.0
  requiredContext: string[];     // Keys for context retrieval
  reasoning: string;             // Classifier's explanation
  inputTokenEstimate: number;    // Estimated tokens for routing
  timestamp: Date;
}

// ============================================================================
// Routing
// ============================================================================

/**
 * Routing decision - what model to use and why
 */
export interface RoutingDecision {
  selectedModel: string;         // Model ID from registry
  classificationResult: ClassificationResult;
  escalatedFrom?: string;        // If escalated, previous model
  escalationReason?: string;     // Why escalation occurred
  routingLatencyMs: number;      // Time to make decision
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation issue types
 */
export type ValidationIssueType =
  | 'format'
  | 'hallucination'
  | 'incomplete'
  | 'off_topic'
  | 'safety';

/**
 * Validation issue severity
 */
export type ValidationIssueSeverity = 'warning' | 'error';

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  type: ValidationIssueType;
  severity: ValidationIssueSeverity;
  description: string;
  location?: string;             // Where in response
}

/**
 * Validation result from LLM-as-Judge
 */
export interface ValidationResult {
  isValid: boolean;
  validationModel: string;
  issues: ValidationIssue[];
  shouldEscalate: boolean;
  suggestedRepair?: string;      // Feedback for repair loop
}

// ============================================================================
// Merge-Readiness Pack (MRP)
// ============================================================================

/**
 * Merge-Readiness Pack - audit trail for routing decisions
 */
export interface MergeReadinessPack {
  id: string;                    // UUID
  timestamp: Date;

  // Decision trail
  originalInput: string;
  classificationResult: ClassificationResult;
  routingDecision: RoutingDecision;
  validationResult?: ValidationResult;

  // Execution details
  selectedModel: string;
  actualModelUsed: string;       // May differ if escalated
  escalationChain: string[];     // Models tried in order

  // Metrics
  totalLatencyMs: number;
  classificationLatencyMs: number;
  routingLatencyMs: number;
  executionLatencyMs: number;
  validationLatencyMs?: number;

  // Cost tracking
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;

  // Audit
  functionalCompleteness: boolean;
  decisionJustification: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Router configuration
 */
export interface RouterConfig {
  // Confidence thresholds
  escalationThreshold: number;   // Below this, escalate (default: 0.7)
  highConfidenceThreshold: number; // Above this, skip validation (default: 0.95)

  // Retry behavior
  maxEscalations: number;        // Max times to escalate (default: 2)
  maxValidationRetries: number;  // Max repair attempts (default: 3)

  // Performance
  classificationTimeoutMs: number;
  routingTimeoutMs: number;
  validationTimeoutMs: number;

  // Feature flags
  enableValidation: boolean;
  enableMrpGeneration: boolean;
  enableCostTracking: boolean;
}

/**
 * Default router configuration
 */
export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  escalationThreshold: 0.7,
  highConfidenceThreshold: 0.95,
  maxEscalations: 2,
  maxValidationRetries: 3,
  classificationTimeoutMs: 5000,
  routingTimeoutMs: 1000,
  validationTimeoutMs: 5000,
  enableValidation: true,
  enableMrpGeneration: true,
  enableCostTracking: true,
};

// ============================================================================
// Request/Response
// ============================================================================

/**
 * Input type for router requests
 */
export type InputType = 'text' | 'voice' | 'image';

/**
 * Unified request to the router
 */
export interface RouterRequest {
  input: string;
  inputType: InputType;
  sessionId: string;
  userId?: string;
  context?: Record<string, unknown>;
  forceModel?: string;           // Override routing (for testing)
  forceTier?: ComplexityTier;    // Override tier (for testing)
}

/**
 * Response metadata
 */
export interface RouterResponseMetadata {
  modelUsed: string;
  tier: ComplexityTier;
  wasEscalated: boolean;
  wasValidated: boolean;
  totalLatencyMs: number;
  estimatedCostUsd: number;
}

/**
 * Unified response from the router
 */
export interface RouterResponse {
  output: string;
  mrp: MergeReadinessPack;
  metadata: RouterResponseMetadata;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Router event types
 */
export type RouterEventType =
  | 'classification_complete'
  | 'routing_decision'
  | 'model_called'
  | 'validation_complete'
  | 'escalation_triggered'
  | 'request_complete';

/**
 * Router event for observability
 */
export interface RouterEvent {
  type: RouterEventType;
  timestamp: Date;
  sessionId: string;
  data: Record<string, unknown>;
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Message role for chat completions
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Chat completion options
 */
export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  timeout?: number;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

/**
 * Model provider interface
 */
export interface ModelProviderInterface {
  name: ModelProvider;
  isAvailable(): Promise<boolean>;
  complete(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Router error codes
 */
export type RouterErrorCode =
  | 'CLASSIFICATION_FAILED'
  | 'ROUTING_FAILED'
  | 'MODEL_UNAVAILABLE'
  | 'TIMEOUT'
  | 'VALIDATION_FAILED'
  | 'PROVIDER_ERROR'
  | 'INVALID_REQUEST';

/**
 * Router error
 */
export interface RouterError {
  code: RouterErrorCode;
  message: string;
  retryable: boolean;
  mrp?: Partial<MergeReadinessPack>;
}

// ============================================================================
// Retry Configuration
// ============================================================================

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  backoffMultiplier: 2,
  retryableErrors: [
    'RATE_LIMIT',
    'TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'CONNECTION_ERROR',
  ],
};
