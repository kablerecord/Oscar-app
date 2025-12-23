# OSQR Multi-Model Router Specification

## Metadata
- **Version**: 1.0
- **Created**: December 19, 2025
- **Status**: Ready for Implementation
- **Dependencies**: OSQR Core, MCP Gateway, Private Knowledge Vault (for context retrieval)
- **Blocked By**: None (foundational component)
- **Enables**: Bubble Interface, Supreme Court Button, Voice Pipeline, Plugin System (cost-aware execution)

## Executive Summary

The Multi-Model Router is OSQR's intelligence layer that routes queries to the optimal AI model based on complexity, cost, and latency requirements. It implements a hierarchical gatekeeper architecture where lightweight models (Groq Llama 8B) handle classification and routing, escalating to expensive reasoning models (Claude Sonnet/Opus) only when necessary. This component makes OSQR economically viable—80-90% of queries can be handled by models costing 10-20x less than Claude without degrading user experience.

## Scope

### In Scope
- Intent classification using lightweight Groq models
- Dynamic model selection based on task complexity
- Confidence scoring and escalation logic
- LLM-as-Judge validation loops
- Unified interface for multiple model providers (Groq, Anthropic)
- Merge-Readiness Pack (MRP) generation for audit trails
- Voice transcription routing via Whisper
- Simulation-based testing harness

### Out of Scope (Deferred)
- Multi-model deliberation (Supreme Court Button) - separate spec
- Plugin-specific routing overrides - handled by Plugin System
- Fine-tuned model integration - future enhancement
- Cost budgeting per user/session - v2.0 feature
- A/B testing framework for routing strategies - v2.0 feature
- Streaming response coordination across models - v2.0 feature

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         OSQR Core                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-MODEL ROUTER                           │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │ Classifier  │──▶│   Router    │──▶│  Model Interface    │   │
│  │ (Llama 8B)  │   │   Logic     │   │  (Groq/Anthropic)   │   │
│  └─────────────┘   └─────────────┘   └─────────────────────┘   │
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │ Confidence  │   │ Escalation  │   │    Validator        │   │
│  │  Scorer     │   │  Handler    │   │  (LLM-as-Judge)     │   │
│  └─────────────┘   └─────────────┘   └─────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│                   ┌─────────────┐                               │
│                   │    MRP      │                               │
│                   │  Generator  │                               │
│                   └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐    ┌───────────┐   ┌───────────┐
        │  Groq   │    │ Anthropic │   │  Whisper  │
        │  LPU    │    │   API     │   │  (Voice)  │
        └─────────┘    └───────────┘   └───────────┘
```

### Core Data Structures

```typescript
// src/router/types.ts

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
    inputPricePerMillion: 0.04, // Per hour, stored differently
    outputPricePerMillion: 0,
    maxContextTokens: 0,        // Audio, not tokens
    tokensPerSecond: 228,       // Speed factor vs realtime
    tier: ComplexityTier.ROUTING,
  },
};

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

export interface ValidationIssue {
  type: 'format' | 'hallucination' | 'incomplete' | 'off_topic' | 'safety';
  severity: 'warning' | 'error';
  description: string;
  location?: string;             // Where in response
}

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
 * Unified request to the router
 */
export interface RouterRequest {
  input: string;
  inputType: 'text' | 'voice' | 'image';
  sessionId: string;
  userId?: string;
  context?: Record<string, unknown>;
  forceModel?: string;           // Override routing (for testing)
  forceTier?: ComplexityTier;    // Override tier (for testing)
}

/**
 * Unified response from the router
 */
export interface RouterResponse {
  output: string;
  mrp: MergeReadinessPack;
  metadata: {
    modelUsed: string;
    tier: ComplexityTier;
    wasEscalated: boolean;
    wasValidated: boolean;
    totalLatencyMs: number;
    estimatedCostUsd: number;
  };
}
```

### Key Algorithms

#### Classification Prompt Template

```typescript
// src/router/classifier.ts

export const CLASSIFICATION_SYSTEM_PROMPT = `You are a task classifier for OSQR, an AI operating system.
Your job is to analyze user input and determine:
1. What type of task this is
2. How complex it is (which model should handle it)
3. How confident you are in this classification

TASK TYPES:
- intent_classification: Meta-queries about what the user wants
- simple_qa: Factual questions with straightforward answers
- knowledge_lookup: Queries requiring retrieval from knowledge base
- content_generation: Writing, summarizing, creative content
- code_generation: Writing new code
- code_review: Analyzing or debugging existing code
- strategic_planning: Multi-step planning, complex reasoning
- multi_model_deliberation: Requires multiple perspectives (Supreme Court)
- voice_transcription: Audio input processing
- output_validation: Checking/validating previous output
- formatting: Simple reformatting, cleanup

COMPLEXITY TIERS:
- 1 (ROUTING): Classification only, trivial formatting
- 2 (SIMPLE): Lookup, simple Q&A, basic tasks
- 3 (COMPLEX): Content generation, code, nuanced writing
- 4 (STRATEGIC): Deep reasoning, multi-step planning, agentic tasks

CONFIDENCE GUIDELINES:
- 0.9-1.0: Obvious, unambiguous task
- 0.7-0.9: Clear task with some interpretation needed
- 0.5-0.7: Ambiguous, could be multiple types
- Below 0.5: Unclear, needs clarification

Respond ONLY with valid JSON matching this schema:
{
  "taskType": "<task_type>",
  "complexityTier": <1-4>,
  "confidenceScore": <0.0-1.0>,
  "requiredContext": ["<context_key>", ...],
  "reasoning": "<brief explanation>",
  "inputTokenEstimate": <number>
}`;

export const classifyInput = async (
  input: string,
  groqClient: GroqClient
): Promise<ClassificationResult> => {
  const startTime = Date.now();

  const response = await groqClient.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
      { role: 'user', content: input }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1, // Low temperature for consistent classification
    max_tokens: 256,
  });

  const parsed = JSON.parse(response.choices[0].message.content);

  return {
    ...parsed,
    timestamp: new Date(),
  };
};
```

#### Routing Decision Logic

```typescript
// src/router/router.ts

export const TIER_TO_MODEL: Record<ComplexityTier, string> = {
  [ComplexityTier.ROUTING]: 'llama-3.1-8b-instant',
  [ComplexityTier.SIMPLE]: 'llama-3.3-70b-versatile',
  [ComplexityTier.COMPLEX]: 'claude-sonnet-4-20250514',
  [ComplexityTier.STRATEGIC]: 'claude-opus-4-20250514',
};

export const makeRoutingDecision = (
  classification: ClassificationResult,
  config: RouterConfig
): RoutingDecision => {
  const startTime = Date.now();

  let selectedTier = classification.complexityTier;
  let escalationReason: string | undefined;

  // Escalate if confidence is below threshold
  if (classification.confidenceScore < config.escalationThreshold) {
    selectedTier = Math.min(selectedTier + 1, ComplexityTier.STRATEGIC);
    escalationReason = `Confidence ${classification.confidenceScore} below threshold ${config.escalationThreshold}`;
  }

  // Task-specific overrides
  if (classification.taskType === TaskType.MULTI_MODEL_DELIBERATION) {
    selectedTier = ComplexityTier.STRATEGIC;
    escalationReason = 'Multi-model deliberation requires highest tier';
  }

  if (classification.taskType === TaskType.VOICE_TRANSCRIPTION) {
    return {
      selectedModel: 'whisper-large-v3-turbo',
      classificationResult: classification,
      routingLatencyMs: Date.now() - startTime,
    };
  }

  return {
    selectedModel: TIER_TO_MODEL[selectedTier],
    classificationResult: classification,
    escalatedFrom: selectedTier !== classification.complexityTier
      ? TIER_TO_MODEL[classification.complexityTier]
      : undefined,
    escalationReason,
    routingLatencyMs: Date.now() - startTime,
  };
};
```

#### Validation (LLM-as-Judge)

```typescript
// src/router/validator.ts

export const VALIDATION_SYSTEM_PROMPT = `You are a validation agent for OSQR.
Your job is to check if an AI response is valid and appropriate.

Check for:
1. FORMAT: Is the response properly structured? Valid JSON if expected?
2. HALLUCINATION: Does it make claims that seem unfounded or invented?
3. COMPLETENESS: Does it fully address the original request?
4. RELEVANCE: Is it on-topic and relevant?
5. SAFETY: Any concerning content?

Respond ONLY with valid JSON:
{
  "isValid": <boolean>,
  "issues": [
    {
      "type": "format|hallucination|incomplete|off_topic|safety",
      "severity": "warning|error",
      "description": "<specific issue>",
      "location": "<where in response, if applicable>"
    }
  ],
  "shouldEscalate": <boolean>,
  "suggestedRepair": "<feedback for repair loop, if needed>"
}`;

export const validateResponse = async (
  originalInput: string,
  modelResponse: string,
  groqClient: GroqClient
): Promise<ValidationResult> => {
  const response = await groqClient.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: VALIDATION_SYSTEM_PROMPT },
      { role: 'user', content: `ORIGINAL REQUEST:\n${originalInput}\n\nMODEL RESPONSE:\n${modelResponse}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 512,
  });

  const parsed = JSON.parse(response.choices[0].message.content);

  return {
    ...parsed,
    validationModel: 'llama-3.1-8b-instant',
  };
};
```

#### Escalation Handler

```typescript
// src/router/escalation.ts

export const handleEscalation = async (
  request: RouterRequest,
  currentDecision: RoutingDecision,
  validationResult: ValidationResult,
  config: RouterConfig,
  escalationCount: number
): Promise<RoutingDecision | null> => {
  // Check if we've exceeded max escalations
  if (escalationCount >= config.maxEscalations) {
    console.warn(`Max escalations (${config.maxEscalations}) reached for session ${request.sessionId}`);
    return null; // Return current result despite issues
  }

  const currentTier = MODEL_REGISTRY[currentDecision.selectedModel].tier;

  // Can't escalate beyond STRATEGIC
  if (currentTier >= ComplexityTier.STRATEGIC) {
    return null;
  }

  const nextTier = currentTier + 1;
  const nextModel = TIER_TO_MODEL[nextTier];

  return {
    selectedModel: nextModel,
    classificationResult: currentDecision.classificationResult,
    escalatedFrom: currentDecision.selectedModel,
    escalationReason: validationResult.suggestedRepair || 'Validation failed',
    routingLatencyMs: 0, // Will be updated
  };
};
```

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `/src/router/` directory structure
- [ ] Implement `types.ts` with all interfaces and enums
- [ ] Create `config.ts` with default RouterConfig values
- [ ] Set up environment variable loading for API keys
- [ ] Create `providers/groq.ts` - Groq API client wrapper
- [ ] Create `providers/anthropic.ts` - Anthropic API client wrapper
- [ ] Create `providers/index.ts` - Unified provider interface
- [ ] Add error types in `errors.ts`

### Phase 2: Core Logic
- [ ] Implement `classifier.ts` - Classification using Llama 8B
- [ ] Write unit tests for classifier with sample inputs
- [ ] Implement `router.ts` - Routing decision logic
- [ ] Write unit tests for routing edge cases
- [ ] Implement `validator.ts` - LLM-as-Judge validation
- [ ] Write unit tests for validation scenarios
- [ ] Implement `escalation.ts` - Escalation handler
- [ ] Write unit tests for escalation chains

### Phase 3: Integration
- [ ] Create `index.ts` - Main router entry point
- [ ] Implement full request/response flow
- [ ] Add MRP generation in `mrp.ts`
- [ ] Implement cost tracking utilities
- [ ] Add latency instrumentation
- [ ] Create retry logic with exponential backoff
- [ ] Implement timeout handling
- [ ] Add graceful degradation for provider outages

### Phase 4: Testing
- [ ] Create `testing/harness.ts` - Simulation framework
- [ ] Build test dataset with 100+ classified examples
- [ ] Implement decision correctness scoring
- [ ] Create benchmark suite for latency/throughput
- [ ] Add MCP compliance tests
- [ ] Implement QA agent for semantic drift detection
- [ ] Create integration tests against live APIs
- [ ] Document test coverage requirements (>80%)

## API Contracts

### Inputs

```typescript
// Main router function signature
async function routeRequest(request: RouterRequest): Promise<RouterResponse>

// REST API endpoint (if exposed)
POST /api/v1/route
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "input": "string",
  "inputType": "text" | "voice" | "image",
  "sessionId": "string",
  "context": {}
}
```

### Outputs

```typescript
// Success response
{
  "output": "string",
  "mrp": MergeReadinessPack,
  "metadata": {
    "modelUsed": "string",
    "tier": 1-4,
    "wasEscalated": boolean,
    "wasValidated": boolean,
    "totalLatencyMs": number,
    "estimatedCostUsd": number
  }
}

// Error response
{
  "error": {
    "code": "CLASSIFICATION_FAILED" | "ROUTING_FAILED" | "MODEL_UNAVAILABLE" | "TIMEOUT" | "VALIDATION_FAILED",
    "message": "string",
    "retryable": boolean,
    "mrp": MergeReadinessPack // Partial, for debugging
  }
}
```

### Events Emitted

```typescript
// For observability/monitoring integration
interface RouterEvent {
  type: 'classification_complete' | 'routing_decision' | 'model_called' |
        'validation_complete' | 'escalation_triggered' | 'request_complete';
  timestamp: Date;
  sessionId: string;
  data: Record<string, unknown>;
}
```

## Configuration

### Environment Variables

```env
# Required
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# Optional - Defaults shown
OSQR_ROUTER_ESCALATION_THRESHOLD=0.7
OSQR_ROUTER_HIGH_CONFIDENCE_THRESHOLD=0.95
OSQR_ROUTER_MAX_ESCALATIONS=2
OSQR_ROUTER_MAX_VALIDATION_RETRIES=3
OSQR_ROUTER_CLASSIFICATION_TIMEOUT_MS=5000
OSQR_ROUTER_ROUTING_TIMEOUT_MS=1000
OSQR_ROUTER_VALIDATION_TIMEOUT_MS=5000
OSQR_ROUTER_ENABLE_VALIDATION=true
OSQR_ROUTER_ENABLE_MRP_GENERATION=true
OSQR_ROUTER_ENABLE_COST_TRACKING=true
```

### Default Values

| Parameter | Default | Description |
|-----------|---------|-------------|
| `escalationThreshold` | 0.7 | Confidence below this triggers escalation |
| `highConfidenceThreshold` | 0.95 | Confidence above this skips validation |
| `maxEscalations` | 2 | Maximum escalation attempts per request |
| `maxValidationRetries` | 3 | Maximum repair loop iterations |
| `classificationTimeoutMs` | 5000 | Timeout for classification call |
| `routingTimeoutMs` | 1000 | Timeout for routing decision |
| `validationTimeoutMs` | 5000 | Timeout for validation call |

## Error Handling

### Failure Modes

| Scenario | Response | Fallback |
|----------|----------|----------|
| Classification timeout | Retry once, then escalate to COMPLEX tier | Default to Claude Sonnet |
| Classification returns invalid JSON | Log error, use COMPLEX tier | Default to Claude Sonnet |
| Groq API unavailable | Skip to Anthropic models | Use Claude Sonnet directly |
| Anthropic API unavailable | Return error with partial MRP | Suggest retry later |
| Validation timeout | Skip validation, return response | Log for review |
| Validation fails repeatedly | Return response with warning | Include validation issues in metadata |
| All escalations exhausted | Return best response available | Include escalation chain in MRP |
| Unknown task type | Classify as COMPLEX | Route to Claude Sonnet |

### Retry Policy

```typescript
const RETRY_CONFIG = {
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
```

## Success Criteria

1. [ ] Classification completes in <100ms for 95th percentile
2. [ ] End-to-end routing (classify + route + call model) completes in <500ms for Groq models
3. [ ] Decision correctness score >0.5 on test dataset
4. [ ] LLM-as-Judge catches >95% of intentionally malformed outputs in test suite
5. [ ] 80%+ of queries handled by Groq models (Tier 1-2)
6. [ ] <20% escalation rate to Claude Sonnet
7. [ ] <5% escalation rate to Claude Opus
8. [ ] MRP generation adds <50ms latency
9. [ ] All MCP compliance tests pass
10. [ ] Zero data loss - every request generates an MRP
11. [ ] Graceful degradation when Groq unavailable (falls back to Anthropic)
12. [ ] Test coverage >80% for core modules

## Open Questions

- [ ] **Context window management**: How should router handle inputs approaching 128k tokens? Should it summarize before classification or route directly to Claude (200k)?
- [ ] **Cost budgets**: Should router enforce per-session or per-user cost limits? Defer to v2.0?
- [ ] **Caching layer**: Should identical classifications be cached? What's the cache invalidation strategy?
- [ ] **Streaming coordination**: When response is streamed, how does validation work? Validate chunks or wait for completion?
- [ ] **Plugin overrides**: Can plugins force specific model tiers? How does this interact with cost tracking?
- [ ] **Supreme Court integration**: When multi-model deliberation is triggered, does router orchestrate or hand off?
- [ ] **Voice pipeline**: Should Whisper output feed back into classifier, or is transcription terminal?
- [ ] **Observability**: What metrics should be exposed? Prometheus format? Custom dashboard?

## Research Foundation

This specification was informed by the following sources from the OSQR NotebookLM knowledge vault:

- **"A Deep Dive Into MCP and the Future..."** - MCP Host-Client-Server pattern, MCP Gateway architecture
- **"AI agentic workflows: a practical guide..."** - Hierarchical gatekeeper pattern, subordinate specialist agents
- **"Agentic Software Engineering: Foundations..."** - SASE methodology, Merge-Readiness Packs
- **"A Look into the BMAD Method"** - QA Agent review pattern, story file validation
- **"A Cost-Benefit Analysis of On-Premises..."** - Task-to-model mapping, break-even analysis for model tiers
- **"9 AI Agent Frameworks Battle..."** - Multi-agent coordination patterns
- **Groq pricing documentation** (fetched December 2025) - Current model pricing, LPU throughput specs
- **Anthropic API documentation** - Claude model specifications, pricing

## Appendices

### A: Task Classification Examples

| Input | Expected TaskType | Expected Tier | Confidence |
|-------|-------------------|---------------|------------|
| "What's 2+2?" | simple_qa | 2 | 0.95 |
| "Write a blog post about AI" | content_generation | 3 | 0.90 |
| "Debug this Python function: ..." | code_review | 3 | 0.85 |
| "Help me plan my Q1 strategy" | strategic_planning | 4 | 0.80 |
| "Reformat this JSON" | formatting | 1 | 0.95 |
| "What should I do?" | simple_qa | 2 | 0.50 |

### B: Example Payloads

**Classification Request/Response:**
```json
// Input to classifier
{
  "input": "Write a Python function to parse CSV files"
}

// Classifier output
{
  "taskType": "code_generation",
  "complexityTier": 3,
  "confidenceScore": 0.88,
  "requiredContext": ["user_preferences", "project_context"],
  "reasoning": "Code generation request with clear requirements, standard complexity",
  "inputTokenEstimate": 12
}
```

**Full MRP Example:**
```json
{
  "id": "mrp_abc123",
  "timestamp": "2025-12-19T10:30:00Z",
  "originalInput": "Write a Python function to parse CSV files",
  "classificationResult": {
    "taskType": "code_generation",
    "complexityTier": 3,
    "confidenceScore": 0.88,
    "requiredContext": ["user_preferences"],
    "reasoning": "Code generation, standard complexity",
    "inputTokenEstimate": 12,
    "timestamp": "2025-12-19T10:30:00.050Z"
  },
  "routingDecision": {
    "selectedModel": "claude-sonnet-4-20250514",
    "classificationResult": "...",
    "routingLatencyMs": 2
  },
  "validationResult": {
    "isValid": true,
    "validationModel": "llama-3.1-8b-instant",
    "issues": [],
    "shouldEscalate": false
  },
  "selectedModel": "claude-sonnet-4-20250514",
  "actualModelUsed": "claude-sonnet-4-20250514",
  "escalationChain": [],
  "totalLatencyMs": 1850,
  "classificationLatencyMs": 48,
  "routingLatencyMs": 2,
  "executionLatencyMs": 1750,
  "validationLatencyMs": 45,
  "inputTokens": 45,
  "outputTokens": 312,
  "estimatedCostUsd": 0.00482,
  "functionalCompleteness": true,
  "decisionJustification": "Code generation task routed to Claude Sonnet per tier mapping"
}
```

### C: File Structure

```
/src/router/
├── index.ts              # Main entry point, routeRequest()
├── types.ts              # All interfaces, enums, MODEL_REGISTRY
├── config.ts             # RouterConfig defaults, env loading
├── errors.ts             # Custom error types
├── classifier.ts         # Classification logic
├── router.ts             # Routing decision logic
├── validator.ts          # LLM-as-Judge validation
├── escalation.ts         # Escalation handler
├── mrp.ts                # MRP generation
├── providers/
│   ├── index.ts          # Unified provider interface
│   ├── groq.ts           # Groq API client
│   └── anthropic.ts      # Anthropic API client
├── testing/
│   ├── harness.ts        # Simulation framework
│   ├── fixtures.ts       # Test data
│   └── benchmarks.ts     # Performance tests
├── __tests__/
│   ├── classifier.test.ts
│   ├── router.test.ts
│   ├── validator.test.ts
│   ├── escalation.test.ts
│   └── integration.test.ts
└── README.md             # Module documentation
```
