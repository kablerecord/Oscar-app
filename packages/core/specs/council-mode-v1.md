# OSQR Council Mode Specification

## Metadata
- **Version**: 1.0
- **Created**: December 19, 2024
- **Status**: Ready for Implementation
- **Target Release**: OSQR v1.0 (March 2025)
- **Owner**: Kable Record
- **Dependencies**:
  - Oscar Core (synthesis layer identity)
  - Query Classification System (for auto-trigger evaluation)
  - User Tier System (for cost-aware limits)
  - PKV/GPKV (for factual grounding during arbitration)
  - n8n Workflow Engine (for parallel model dispatch)
- **Blocked By**:
  - Multi-Model API Integration (Claude, GPT-4, Gemini credentials and adapters)
  - Oscar Core Identity System (Oscar must exist as the synthesis voice)
- **Enables**:
  - Creator Plugin Advisors (v2.0)
  - VS Code Extension Council Mode (v2.0)
  - Voice Interface Multi-Model (v2.0)
  - Advisor Marketplace (v2.0)

## Executive Summary

Council Mode is OSQR's multi-model deliberation system where Claude, GPT-4, and Gemini contribute perspectives on a query, and Oscar (OSQR's synthesis layer) arbitrates their outputs into a unified, transparent response. This is a defensible competitive moat—single-model platforms (ChatGPT, Gemini, Claude standalone) cannot offer this feature because they ARE the model. OSQR is the conductor, not the instrument.

## Scope

### In Scope
- Parallel dispatch to 2-3 AI models (Claude, GPT-4, Gemini)
- Oscar synthesis layer with arbitration logic
- Confidence normalization across models (derived, not native)
- Agreement/disagreement detection with 15% threshold
- Four display states: Default, Expanded, Disagreement, Full Log
- Auto-trigger conditions for high-stakes queries
- User invocation methods (`/council`, `[council]`, natural language)
- Cost-aware tier limits (free: 3/day, pro: 25/day, enterprise: unlimited)
- Timeout handling and graceful degradation
- Transparency: full model attribution visible to users
- Progressive disclosure UI pattern

### Out of Scope (Deferred to v2.0)
- Creator plugin advisors adding custom models to Council
- VS Code Extension Council Mode for code review
- Advisor Marketplace with revenue sharing
- Voice interface Council Mode (voice uses Oscar synthesis only)
- Specialty models beyond Claude/GPT-4/Gemini (e.g., CodeLlama)
- Human-in-the-loop Consultation Request Packs (CRP)
- N-version programming for mixing solution components
- Reinforcement learning-based reranking of model weights

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER QUERY                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER EVALUATION                            │
│         (Auto-trigger conditions OR user invocation)             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    SINGLE MODEL MODE    │     │     COUNCIL MODE        │
│    (Standard flow)      │     │    (Multi-model)        │
└─────────────────────────┘     └─────────────────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                        ┌──────────┐   ┌──────────┐   ┌──────────┐
                        │  Claude  │   │  GPT-4   │   │  Gemini  │
                        │ (Model A)│   │(Model B) │   │(Model C) │
                        └──────────┘   └──────────┘   └──────────┘
                              │               │               │
                              └───────────────┼───────────────┘
                                              ▼
                        ┌─────────────────────────────────────────┐
                        │         OSCAR SYNTHESIS LAYER           │
                        │  • Collects all model responses         │
                        │  • Normalizes confidence scores         │
                        │  • Detects agreement/disagreement       │
                        │  • Applies arbitration protocol         │
                        │  • Generates unified response           │
                        └─────────────────────────────────────────┘
                                              │
                                              ▼
                        ┌─────────────────────────────────────────┐
                        │           RESPONSE TO USER              │
                        │  • Oscar's synthesized answer           │
                        │  • Consensus indicator                  │
                        │  • Expandable council details           │
                        └─────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | File Location |
|-----------|----------------|---------------|
| **Trigger Evaluator** | Determines if Council Mode should activate (auto or user-invoked) | `src/council/trigger.ts` |
| **Query Dispatcher** | Sends query to multiple models in parallel | `src/council/dispatcher.ts` |
| **Model Adapters** | Normalize responses from different providers into standard format | `src/council/adapters/*.ts` |
| **Synthesis Layer (Oscar)** | Core arbitration logic—weights, synthesizes, resolves conflicts | `src/council/synthesis/synthesizer.ts` |
| **Confidence Normalizer** | Derives comparable confidence scores from response characteristics | `src/council/synthesis/confidence.ts` |
| **Agreement Analyzer** | Detects alignment vs. divergence across model responses | `src/council/synthesis/agreement.ts` |
| **Display Controller** | Manages UI states (default, expanded, disagreement views) | `src/council/display/states.ts` |

### The Gatekeeper Pattern (Design Decision)

Oscar operates as a **Centralized Gatekeeper** per MAS research:

1. Analyzes initial user intent
2. Delegates to specialized model "advisors"
3. Maintains global conversation context
4. Integrates disparate results into single cohesive output
5. Remains the ultimate arbiter and voice

**Critical Principle**: Oscar never disappears. Even in Council Mode, Oscar is always the voice. Models are advisors; Oscar is the decision-maker. This maintains OSQR's identity.

### Core Data Structures

```typescript
// ============================================
// MODEL RESPONSE OBJECT
// Each model returns this standardized format
// ============================================

interface ModelResponse {
  // Identification
  model_id: string;              // "claude-3-opus" | "gpt-4-turbo" | "gemini-pro"
  model_display_name: string;    // "Claude" | "GPT-4" | "Gemini"

  // Core Response
  content: string;               // The model's full response text
  summary: string;               // 1-2 sentence summary (model-generated or extracted)

  // Confidence Metadata
  confidence: {
    raw_score: number | null;    // Model's native confidence if available (usually null)
    normalized_score: number;    // 0-100 scale (derived from response analysis)
    reasoning_depth: number;     // 1-5 scale based on response analysis
  };

  // Provenance
  sources_cited: string[];       // URLs or references mentioned
  reasoning_chain: string[];     // Key logical steps (extracted)

  // Technical Metadata
  latency_ms: number;            // Time to receive response
  tokens_used: number;           // Input + output tokens
  timestamp: string;             // ISO 8601

  // Status
  status: "success" | "timeout" | "error" | "partial";
  error_message?: string;
}

// ============================================
// COUNCIL DELIBERATION OBJECT
// Aggregate structure for synthesis layer
// ============================================

interface CouncilDeliberation {
  // Query Context
  query_id: string;
  original_query: string;
  query_classification: string[];  // ["financial", "strategic", etc.]

  // Model Responses
  responses: ModelResponse[];

  // Agreement Analysis
  agreement: {
    level: "high" | "moderate" | "low" | "split";
    score: number;                 // 0-100
    aligned_points: string[];      // Points all models agreed on
    divergent_points: DivergentPoint[];
  };

  // Synthesis Output
  synthesis: {
    final_response: string;        // Oscar's unified answer
    arbitration_log: ArbitrationEntry[];
    weights_applied: ModelWeight[];
    transparency_flags: string[];  // Any disagreements to surface
  };

  // Metadata
  total_latency_ms: number;
  total_cost_estimate: number;
  council_mode_trigger: "auto" | "user_invoked";
}

interface DivergentPoint {
  topic: string;
  positions: {
    model_id: string;
    position: string;
    confidence: number;
  }[];
  resolution: "model_a_weighted" | "model_b_weighted" | "presented_both" | "external_grounding";
  resolution_reasoning: string;
}

interface ArbitrationEntry {
  step: number;
  action: string;
  reasoning: string;
  outcome: string;
}

interface ModelWeight {
  model_id: string;
  base_weight: number;           // From specialty matching
  adjusted_weight: number;       // After confidence/grounding adjustments
  adjustment_reason?: string;
}

// ============================================
// USER-FACING COUNCIL SUMMARY
// Simplified structure for display layer
// ============================================

interface CouncilSummary {
  consensus_level: "High" | "Moderate" | "Split";
  consensus_description: string;  // "3/3 models aligned" or "Models disagreed on X"

  model_cards: {
    model_name: string;
    confidence_percent: number;
    summary: string;
    full_response_available: boolean;
  }[];

  disagreements?: {
    topic: string;
    model_positions: { model: string; position: string }[];
    oscar_recommendation: string;
    oscar_reasoning: string;
  }[];

  arbitration_visible: boolean;  // User can expand to see full log
}

// ============================================
// TRIGGER CONDITIONS
// ============================================

interface AutoTriggerConditions {
  // HIGH-STAKES DECISIONS
  financial_threshold: boolean;      // Query involves money > $10,000
  legal_implications: boolean;       // Query classified as legal advice
  health_decisions: boolean;         // Query classified as medical

  // COMPLEXITY INDICATORS
  multi_domain: boolean;             // Query spans 2+ domains
  research_depth_required: boolean;  // Query explicitly asks for research/sources
  strategic_planning: boolean;       // Query involves planning > 6 months

  // EXPLICIT UNCERTAINTY
  conflicting_sources_detected: boolean;  // Query contains contradictory info
  novel_situation: boolean;          // Low similarity to training patterns

  // USER HISTORY
  user_preference_aggressive: boolean;    // User set "always use council"
  recent_correction: boolean;        // User corrected single-model recently
}

// ============================================
// TIER CONFIGURATION
// ============================================

interface TierLimits {
  council_per_day: number | "unlimited";
  auto_trigger_enabled: boolean;
  models_available: number;
}

const TIER_CONFIG: Record<string, TierLimits> = {
  free: {
    council_per_day: 3,
    auto_trigger_enabled: false,  // User must invoke manually
    models_available: 2           // Claude + GPT-4 only
  },
  pro: {
    council_per_day: 25,
    auto_trigger_enabled: true,   // For high-stakes only
    models_available: 3           // All three
  },
  enterprise: {
    council_per_day: "unlimited",
    auto_trigger_enabled: true,   // Full auto-trigger logic
    models_available: 4           // Including specialty models (future)
  }
};

// ============================================
// TIMEOUT CONFIGURATION
// ============================================

const TIMEOUT_CONFIG = {
  per_model_timeout_ms: 30000,    // 30 seconds max per model
  total_council_timeout_ms: 45000, // 45 seconds for entire council
  min_models_for_synthesis: 2,     // Need at least 2 responses to proceed
  retry_attempts: 1,               // One retry on failure
  retry_delay_ms: 2000             // 2 second delay before retry
};

// ============================================
// CONFIDENCE FACTORS
// ============================================

interface ConfidenceFactors {
  reasoning_depth: number;       // 1-5 scale
  hedging_language: number;      // 0-100 (higher = less hedging = more confident)
  source_citations: number;      // Count of citations
  response_completeness: number; // 0-100
  internal_consistency: number;  // 0-100
}

// ============================================
// CONTEXT DISTRIBUTION
// Specialized subsets, not full context to all
// ============================================

interface ContextDistribution {
  shared: {
    original_query: string;
    user_intent: string;
    key_constraints: string[];
  };
  specialized: {
    [model_id: string]: {
      relevant_history: string[];
      domain_context: string[];
    };
  };
}
```

### Key Algorithms

#### Trigger Evaluation

```typescript
function shouldAutoTrigger(conditions: AutoTriggerConditions): boolean {
  // High-stakes always triggers
  if (conditions.financial_threshold ||
      conditions.legal_implications ||
      conditions.health_decisions) {
    return true;
  }

  // Complexity triggers (requires BOTH conditions)
  if (conditions.multi_domain && conditions.research_depth_required) {
    return true;
  }

  // Uncertainty triggers
  if (conditions.conflicting_sources_detected || conditions.novel_situation) {
    return true;
  }

  // User preference triggers
  if (conditions.user_preference_aggressive) {
    return true;
  }

  return false;
}

// User invocation detection
const COUNCIL_INVOCATION_PATTERNS = [
  /^\/council\s+/i,                              // Slash command
  /\[council\]/i,                                 // Inline flag
  /multiple (AI |model )?perspectives/i,          // Natural language
  /different (AI |model )?(opinions|views)/i,     // Natural language
  /what would (other AIs|different models) say/i, // Natural language
  /compare (AI |model )?responses/i,              // Natural language
  /council mode/i                                 // Direct reference
];

function isUserInvokedCouncil(query: string): boolean {
  return COUNCIL_INVOCATION_PATTERNS.some(pattern => pattern.test(query));
}
```

#### Confidence Normalization

```typescript
// Since models don't provide consistent confidence, we derive it from response characteristics

function normalizeConfidence(response: string, factors: ConfidenceFactors): number {
  // Weights for each factor (must sum to 1.0)
  const weights = {
    reasoning_depth: 0.30,
    hedging_language: 0.25,
    source_citations: 0.15,
    response_completeness: 0.15,
    internal_consistency: 0.15
  };

  // Normalize reasoning_depth from 1-5 to 0-100
  const reasoning_normalized = (factors.reasoning_depth / 5) * 100;

  // Calculate weighted score
  const score =
    (reasoning_normalized * weights.reasoning_depth) +
    (factors.hedging_language * weights.hedging_language) +
    (Math.min(factors.source_citations * 10, 100) * weights.source_citations) +
    (factors.response_completeness * weights.response_completeness) +
    (factors.internal_consistency * weights.internal_consistency);

  return Math.round(score);
}

// Hedging language detection
const HEDGING_PATTERNS = [
  /\bi think\b/gi,
  /\bprobably\b/gi,
  /\bmight\b/gi,
  /\bcould be\b/gi,
  /\bpossibly\b/gi,
  /\bit's possible\b/gi,
  /\bi'm not sure\b/gi,
  /\bi believe\b/gi,
  /\bgenerally\b/gi,
  /\btypically\b/gi,
  /\busually\b/gi,
  /\boften\b/gi
];

function calculateHedgingScore(response: string): number {
  const wordCount = response.split(/\s+/).length;
  let hedgeCount = 0;

  HEDGING_PATTERNS.forEach(pattern => {
    const matches = response.match(pattern);
    if (matches) hedgeCount += matches.length;
  });

  // Higher score = less hedging = more confident
  const hedgeRatio = hedgeCount / wordCount;
  return Math.round(100 - (hedgeRatio * 500)); // Scale factor of 500
}

// Reasoning depth assessment
function assessReasoningDepth(response: string): number {
  let score = 1; // Base score

  // Check for structured reasoning
  if (/\b(first|second|third|finally)\b/gi.test(response)) score += 1;
  if (/\b(because|therefore|thus|hence)\b/gi.test(response)) score += 1;
  if (/\b(however|although|on the other hand)\b/gi.test(response)) score += 0.5;
  if (/\b(for example|specifically|in particular)\b/gi.test(response)) score += 0.5;

  // Check for consideration of alternatives
  if (/\b(alternatively|another option|could also)\b/gi.test(response)) score += 0.5;

  // Check for explicit assumptions or caveats
  if (/\b(assuming|given that|if we assume)\b/gi.test(response)) score += 0.5;

  return Math.min(5, score); // Cap at 5
}
```

#### Disagreement Detection

```typescript
const DISAGREEMENT_THRESHOLD = 15; // Percentage points

function isSignificantDisagreement(
  confidenceA: number,
  confidenceB: number,
  factualContradiction: boolean
): boolean {
  // Factual contradiction always triggers disagreement view
  if (factualContradiction) return true;

  // Confidence delta check
  const delta = Math.abs(confidenceA - confidenceB);
  return delta >= DISAGREEMENT_THRESHOLD;
}
```

#### Parallel Dispatch with Fallbacks

```typescript
async function dispatchToCouncil(
  query: string,
  context: ConversationContext,
  models: string[]
): Promise<ModelResponse[]> {

  const dispatches = models.map(model =>
    queryModel(model, query, context)
      .then(response => ({ model, response, status: 'success' as const }))
      .catch(error => ({ model, error, status: 'error' as const }))
  );

  // Wait for all with timeout handling
  const results = await Promise.allSettled(dispatches);

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value.status === 'success'
        ? result.value.response
        : createErrorResponse(result.value.model, result.value.error);
    }
    return createErrorResponse('unknown', result.reason);
  });
}

async function handleCouncilWithFallbacks(
  query: string,
  context: ConversationContext
): Promise<CouncilDeliberation> {

  const startTime = Date.now();
  let responses: ModelResponse[] = [];

  // Attempt parallel dispatch with total timeout
  try {
    responses = await Promise.race([
      dispatchToCouncil(query, context, ["claude", "gpt4", "gemini"]),
      timeout(TIMEOUT_CONFIG.total_council_timeout_ms)
    ]);
  } catch (e) {
    // Total timeout - proceed with whatever we have
    console.error("Council timeout, proceeding with partial responses");
  }

  // Filter successful responses
  const successfulResponses = responses.filter(r => r.status === "success");

  // Check minimum threshold
  if (successfulResponses.length < TIMEOUT_CONFIG.min_models_for_synthesis) {
    // Fallback to single best model
    return fallbackToSingleModel(query, context, successfulResponses);
  }

  // Proceed with synthesis
  return synthesize(query, successfulResponses);
}

// Continue-on-fail pattern: if one model fails, continue with others
async function queryModelWithContinueOnFail(
  model: string,
  query: string,
  context: any
): Promise<ModelResponse> {
  try {
    return await queryModel(model, query, context);
  } catch (error) {
    console.warn(`Model ${model} failed, continuing: ${error.message}`);

    // Return error response instead of throwing
    return {
      model_id: model,
      model_display_name: getDisplayName(model),
      content: "",
      summary: "",
      confidence: { raw_score: null, normalized_score: 0, reasoning_depth: 0 },
      status: "error",
      error_message: error.message,
      latency_ms: 0,
      tokens_used: 0,
      timestamp: new Date().toISOString(),
      sources_cited: [],
      reasoning_chain: []
    };
  }
}
```

#### Context Distribution (Specialized Subsets)

```typescript
// Design Decision: Give specialized context subsets, not full context to all models
// This prevents context bloat and improves model performance

function distributeContext(
  fullContext: ConversationContext,
  queryClassification: string[]
): ContextDistribution {

  // All models get the core query info
  const shared = {
    original_query: fullContext.currentQuery,
    user_intent: fullContext.detectedIntent,
    key_constraints: fullContext.constraints
  };

  // Specialized context based on model strengths
  const specialized = {
    "claude-3-opus": {
      relevant_history: filterHistoryForReasoning(fullContext.history),
      domain_context: extractPhilosophicalContext(fullContext)
    },
    "gpt-4-turbo": {
      relevant_history: filterHistoryForBreadth(fullContext.history),
      domain_context: extractPracticalContext(fullContext)
    },
    "gemini-pro": {
      relevant_history: filterHistoryForResearch(fullContext.history),
      domain_context: extractFactualContext(fullContext)
    }
  };

  return { shared, specialized };
}
```

### Oscar Synthesis Prompt Template

```markdown
# OSCAR SYNTHESIS MODE

You are Oscar, the intelligence layer of OSQR. You have received responses from multiple AI models regarding a user's query. Your role is to synthesize these into ONE unified, authoritative response.

## YOUR IDENTITY
- You are Oscar, not any individual model
- You speak as the final voice—confident but transparent
- You attribute insights to models when relevant
- You never pretend models agreed when they didn't

## SYNTHESIS PROTOCOL

### Step 1: Identify Core Agreement
Extract points where ALL models substantially agree. These form the foundation of your response.

### Step 2: Detect Divergence
Identify points where models disagree. Categorize each:
- **Factual Dispute**: Models claim different facts (requires grounding)
- **Reasoning Dispute**: Models reach different conclusions from same facts
- **Value/Judgment Dispute**: Models weigh factors differently

### Step 3: Resolve Divergences

For FACTUAL disputes:
- Check against knowledge vaults (PKV/GPKV) if available
- If grounding available, state the grounded fact
- If no grounding, report both claims neutrally: "Claude states X while GPT-4 states Y. I recommend verifying independently."

For REASONING disputes:
- Evaluate reasoning chains from each model
- Apply weights based on query-specialty match
- State your recommended path with reasoning
- Acknowledge the alternative: "GPT-4's approach of [X] is also valid if [condition]."

For VALUE/JUDGMENT disputes:
- Present both perspectives fairly
- Make a recommendation if user context allows
- Otherwise, present as genuine choice: "This depends on whether you prioritize [A] or [B]."

### Step 4: Synthesize Response
- Lead with the unified answer
- Integrate agreed points seamlessly
- Surface disagreements transparently (don't bury them)
- End with actionable next steps if appropriate

## RULES
1. Never speculate beyond what models provided
2. Never invent content to fill gaps—acknowledge limits
3. Always attribute when presenting conflicting views
4. Remove irrelevant, repetitive, or low-value information
5. Keep your synthesis shorter than the combined model outputs
6. Your tone: confident, helpful, transparent

## OUTPUT FORMAT
Provide your synthesis in natural prose. Do NOT use headers like "Agreement:" or "Disagreement:" in the user-facing response—integrate naturally.

If disagreements exist, include a clearly marked section:
"📊 **Council Note**: [Brief description of disagreement and your reasoning]"

---

## CONTEXT FOR THIS SYNTHESIS

**Original Query**: {{ORIGINAL_QUERY}}

**Model Responses**:

### Claude (Confidence: {{CLAUDE_CONFIDENCE}}%)
{{CLAUDE_RESPONSE}}

### GPT-4 (Confidence: {{GPT4_CONFIDENCE}}%)
{{GPT4_RESPONSE}}

### Gemini (Confidence: {{GEMINI_CONFIDENCE}}%)
{{GEMINI_RESPONSE}}

**Query Classification**: {{QUERY_CLASSIFICATION}}
**Specialty Weights**: Claude {{CLAUDE_WEIGHT}}%, GPT-4 {{GPT4_WEIGHT}}%, Gemini {{GEMINI_WEIGHT}}%

---

Now synthesize these responses into one unified answer for the user.
```

### Resilient Context Synthesizer Extension

For complex or research-heavy queries, append to Oscar's prompt:

```markdown
## ADDITIONAL: RESILIENT CONTEXT SYNTHESIZER MODE

When handling research or multi-source queries:

1. **Identify Core Ideas**: Extract the fundamental concepts each model surfaced
2. **Map Logical Relationships**: How do ideas connect across responses?
3. **Remove Noise**: Strip out:
   - Repetitive information (said by multiple models)
   - Tangential points not relevant to query
   - Hedging language that doesn't add value
4. **Reconstruct Precisely**: Build a technically precise synthesis
5. **Cite When Uncertain**: If you can't reconcile a point, attribute to specific model
6. **Acknowledge Limits**: "Based on the models consulted, [X]. Additional verification recommended for [Y]."
```

### Model Specialty Weights

Default weights by query classification:

| Query Type | Claude | GPT-4 | Gemini |
|------------|--------|-------|--------|
| Deep reasoning / Philosophy | 60% | 25% | 15% |
| Current events / Research | 20% | 30% | 50% |
| Creative / Brainstorming | 35% | 50% | 15% |
| Code / Technical | 45% | 40% | 15% |
| Multi-source synthesis | 35% | 25% | 40% |
| Financial analysis | 45% | 35% | 20% |
| Strategic planning | 50% | 30% | 20% |
| Factual questions | 25% | 35% | 40% |

## Implementation Checklist

### Phase 1: Foundation (Types & Interfaces)
- [ ] Create `src/council/types.ts` with all TypeScript interfaces from Core Data Structures section
- [ ] Create `src/council/config.ts` with `TIER_CONFIG`, `TIMEOUT_CONFIG`, and specialty weight tables
- [ ] Set up `src/council/index.ts` as main entry point
- [ ] Verify Multi-Model API credentials are configured (Claude, GPT-4, Gemini)

### Phase 2: Model Adapters
- [ ] Create `src/council/adapters/claude.ts` - Claude API adapter with response normalization
- [ ] Create `src/council/adapters/gpt4.ts` - GPT-4 API adapter with response normalization
- [ ] Create `src/council/adapters/gemini.ts` - Gemini API adapter with response normalization
- [ ] Create `src/council/adapters/index.ts` - unified adapter interface
- [ ] Implement `extractSummary()` function for 1-2 sentence summaries
- [ ] Implement `analyzeFactors()` function for confidence factor extraction

### Phase 3: Confidence & Agreement Analysis
- [ ] Create `src/council/synthesis/confidence.ts` with normalization algorithm
- [ ] Implement `calculateHedgingScore()` with all hedging patterns
- [ ] Implement `assessReasoningDepth()` with reasoning markers
- [ ] Implement `normalizeConfidence()` with weighted scoring
- [ ] Create `src/council/synthesis/agreement.ts` with disagreement detection
- [ ] Implement `isSignificantDisagreement()` with 15% threshold logic
- [ ] Implement aligned points extraction
- [ ] Implement divergent points extraction with position mapping

### Phase 4: Trigger Logic
- [ ] Create `src/council/trigger.ts` with trigger evaluation
- [ ] Implement `shouldAutoTrigger()` with all condition checks
- [ ] Implement `isUserInvokedCouncil()` with regex patterns
- [ ] Implement tier limit checking (`canUseCouncil()`)
- [ ] Integrate with Query Classification System for domain detection
- [ ] Add financial threshold detection ($10,000+)

### Phase 5: Dispatcher
- [ ] Create `src/council/dispatcher.ts` with parallel dispatch logic
- [ ] Implement `dispatchToCouncil()` with Promise.allSettled
- [ ] Implement `queryModelWithContinueOnFail()` pattern
- [ ] Implement `handleCouncilWithFallbacks()` with timeout handling
- [ ] Implement `fallbackToSingleModel()` for graceful degradation
- [ ] Implement `handlePartialResponse()` for timeout/error cases
- [ ] Create `distributeContext()` for specialized context subsets

### Phase 6: Synthesis Layer
- [ ] Create `src/council/synthesis/prompts.ts` with Oscar synthesis prompt template
- [ ] Create `src/council/synthesis/synthesizer.ts` with main synthesis logic
- [ ] Implement prompt template variable injection
- [ ] Implement Resilient Context Synthesizer mode toggle
- [ ] Implement arbitration log generation
- [ ] Implement transparency flag detection
- [ ] Implement weight application logic with specialty matching
- [ ] Integrate with PKV/GPKV for factual grounding (if available)

### Phase 7: Display Layer
- [ ] Create `src/council/display/states.ts` with state machine
- [ ] Implement `determineDisplayState()` based on agreement level
- [ ] Create `src/council/display/components.ts` with UI component definitions
- [ ] Implement Default View structure
- [ ] Implement Expanded View structure with model cards
- [ ] Implement Disagreement View structure with highlighted conflicts
- [ ] Implement Full Arbitration Log structure
- [ ] Create `src/council/display/formatters.ts` for output formatting
- [ ] Implement consensus description generation ("3/3 models aligned")
- [ ] Implement model card formatting

### Phase 8: Testing
- [ ] Create `tests/council/trigger.test.ts` with trigger logic tests
- [ ] Create `tests/council/confidence.test.ts` with normalization tests
- [ ] Create `tests/council/synthesis.test.ts` with synthesis tests
- [ ] Create `tests/council/integration.test.ts` with E2E tests
- [ ] Test auto-trigger on financial queries over threshold
- [ ] Test no auto-trigger on simple questions
- [ ] Test user invocation regardless of content
- [ ] Test tier limit enforcement
- [ ] Test high confidence for decisive responses
- [ ] Test lower confidence for hedging responses
- [ ] Test disagreement detection at 15% threshold
- [ ] Test synthesis of agreeing responses
- [ ] Test transparent surfacing of disagreements
- [ ] Test graceful degradation when one model times out
- [ ] Test fallback when council fails completely

### Phase 9: Integration
- [ ] Wire Council Mode into main OSQR query flow
- [ ] Integrate with Oscar Core identity system
- [ ] Integrate with User Tier System for limits
- [ ] Integrate with n8n workflow engine for dispatch
- [ ] Add Council Mode usage tracking for analytics
- [ ] Add cost tracking per council invocation

## API Contracts

### Inputs

**Main Entry Point**: `runCouncilMode(query: string, context: ConversationContext): Promise<CouncilDeliberation>`

```typescript
interface ConversationContext {
  currentQuery: string;
  detectedIntent: string;
  constraints: string[];
  history: ConversationMessage[];
  user: {
    id: string;
    tier: "free" | "pro" | "enterprise";
    council_uses_today: number;
    preferences: {
      council_mode_aggressive: boolean;
    };
  };
}
```

**Trigger Evaluation**: `evaluateCouncilTrigger(query: string, context: ConversationContext): { shouldTrigger: boolean; reason: string }`

**User Invocation Check**: `isUserInvokedCouncil(query: string): boolean`

### Outputs

**Primary Output**: `CouncilDeliberation` object (see Core Data Structures)

**Display Output**: `CouncilSummary` object for UI rendering

**Events Emitted**:
- `council:started` - When council mode begins
- `council:model_responded` - When each model returns (for streaming UI)
- `council:synthesis_complete` - When Oscar finishes synthesis
- `council:failed` - When council fails and falls back

## Configuration

### Environment Variables

```env
# Model API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Council Mode Settings
OSQR_COUNCIL_ENABLED=true
OSQR_COUNCIL_DEFAULT_MODELS=claude,gpt4,gemini
OSQR_COUNCIL_PER_MODEL_TIMEOUT_MS=30000
OSQR_COUNCIL_TOTAL_TIMEOUT_MS=45000
OSQR_COUNCIL_MIN_MODELS_FOR_SYNTHESIS=2
OSQR_COUNCIL_DISAGREEMENT_THRESHOLD=15

# Tier Limits (can be overridden)
OSQR_COUNCIL_FREE_LIMIT=3
OSQR_COUNCIL_PRO_LIMIT=25
```

### Default Values

| Parameter | Default | Description |
|-----------|---------|-------------|
| `per_model_timeout_ms` | 30000 | Max wait time per model |
| `total_council_timeout_ms` | 45000 | Max wait time for entire council |
| `min_models_for_synthesis` | 2 | Minimum responses needed |
| `retry_attempts` | 1 | Retries on model failure |
| `retry_delay_ms` | 2000 | Delay between retries |
| `disagreement_threshold` | 15 | Confidence delta for split view |
| `financial_threshold` | 10000 | Dollar amount for auto-trigger |

## Error Handling

### Failure Modes

| Scenario | Response | Fallback |
|----------|----------|----------|
| Single model timeout | Mark as partial, continue with others | Use remaining models if ≥2 |
| Single model error | Log error, continue with others | Use remaining models if ≥2 |
| All models timeout | Return timeout error | Fall back to standard single-model mode |
| Only 1 model responds | Use single response with disclaimer | Add `partial_council` transparency flag |
| 0 models respond | Return error message | Fall back to standard mode with apology |
| Synthesis fails | Return raw model responses | Show model cards without synthesis |
| Tier limit exceeded | Return limit error | Inform user of upgrade path or wait |

### Fallback Response Structure

```typescript
// When council fails completely
{
  synthesis: {
    final_response: "I apologize, but I couldn't gather perspectives from the council in time. Let me answer directly...",
    arbitration_log: [{
      step: 1,
      action: "timeout",
      reasoning: "No models responded within timeout",
      outcome: "Falling back to standard mode"
    }],
    transparency_flags: ["council_failed"]
  }
}

// When only one model responds
{
  synthesis: {
    final_response: partialResponses[0].content,
    arbitration_log: [{
      step: 1,
      action: "fallback",
      reasoning: "Only one model responded within timeout",
      outcome: "Single model response used"
    }],
    transparency_flags: ["partial_council"]
  }
}
```

## Success Criteria

Implementation is complete when:

1. [ ] `/council What's the capital of France?` returns a response from Oscar synthesizing 2-3 model outputs
2. [ ] Expanded view shows all model cards with confidence scores and weights
3. [ ] Query "Should I invest $50,000?" auto-triggers Council Mode (financial threshold)
4. [ ] Query "What's 2+2?" does NOT auto-trigger Council Mode (simple question)
5. [ ] Free tier user receives error after 3rd council use in a day
6. [ ] Response with significant disagreement (>15% delta) shows Disagreement View with split badge
7. [ ] If GPT-4 times out but Claude and Gemini respond, synthesis still succeeds
8. [ ] Full Arbitration Log shows all steps including latency, tokens, and costs
9. [ ] Oscar's voice is consistent—never sounds like individual models
10. [ ] Model attribution is visible and accurate in expanded view

## Open Questions

- [ ] **Confidence calibration**: The derived confidence scores may need tuning after real-world testing. Track accuracy and adjust weights.
- [ ] **Query classification integration**: Need to confirm how Query Classification System will provide domain tags for specialty weighting.
- [ ] **PKV/GPKV grounding**: Decide priority order—check vaults before or after model queries? Current assumption: after, during synthesis.
- [ ] **Cost tracking granularity**: Should we track costs per-model or only aggregate? Current spec assumes per-model.
- [ ] **Streaming UX**: Should we stream partial responses as each model completes, or wait for all? Current spec assumes wait for all.
- [ ] **Model version updates**: When Claude/GPT-4/Gemini release new versions, how do we update adapters? Need versioning strategy.
- [ ] **Rate limiting**: If user spams `/council`, do we enforce cooldown beyond tier limits?

## Research Foundation

This design was informed by the following research synthesized in NotebookLM:

1. **Multi-Agent System (MAS) Layer Patterns** - Coordination hub architecture, gatekeeper model
2. **Resilient Context Synthesizer** - Prompt engineering for neutral discrepancy reporting
3. **Confidence and Consensus Mechanisms** - Negotiation protocols, weighted synthesis
4. **N-Version Programming** - Concept of mixing solution components (deferred to v2)
5. **Context Management** - Specialized subsets vs. kitchen-sink approach
6. **Asynchronous Execution** - n8n patterns, continue-on-fail logic
7. **Hierarchical Context Management** - Lead orchestrator with sub-agents

Key insight from research: "If individual AI models are specialized musicians in an orchestra, the MAS layer is the conductor."

## Appendices

### A: UI Mockups / Wireframes

#### Default View (Synthesis Mode)

```
┌─────────────────────────────────────────────────────────────────┐
│  Oscar                                               [Council] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Based on analysis from multiple perspectives, here's the       │
│  recommended approach for your mortgage refinancing question... │
│                                                                 │
│  [Oscar's synthesized response - 2-4 paragraphs]                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  ⚖️ Council Consensus: High (3/3 models aligned)                │
│  📊 Expand Council Details                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Expanded View (Council Details)

```
┌─────────────────────────────────────────────────────────────────┐
│  COUNCIL DELIBERATION                                           │
│  ═══════════════════════════════════════════════════════════════│
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ 🔵 Claude       │ │ 🟢 GPT-4        │ │ 🔴 Gemini       │   │
│  │ Weight: 45%     │ │ Weight: 35%     │ │ Weight: 20%     │   │
│  │ Confidence: 92% │ │ Confidence: 87% │ │ Confidence: 78% │   │
│  ├─────────────────┤ ├─────────────────┤ ├─────────────────┤   │
│  │ "Refinancing    │ │ "Consider the   │ │ "Current rates  │   │
│  │  makes sense    │ │  break-even     │ │  favor action   │   │
│  │  given..."      │ │  period..."     │  │  if..."         │   │
│  │                 │ │                 │ │                 │   │
│  │ ▶ Full Response │ │ ▶ Full Response │ │ ▶ Full Response │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
│  ARBITRATION SUMMARY                                            │
│  ───────────────────────────────────────────────────────────────│
│  • All models agreed: Current rates favorable for refinancing   │
│  • Claude weighted higher (query matched financial reasoning)   │
│  • Minor variation on timeline—synthesized to "3-6 months"      │
│                                                                 │
│  [Collapse] [View Full Arbitration Log]                         │
└─────────────────────────────────────────────────────────────────┘
```

#### Disagreement View (Split Council)

```
┌─────────────────────────────────────────────────────────────────┐
│  Oscar                                         [⚠️ Split Council]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  The models reached different conclusions on this question.     │
│  Here's my synthesis with the key disagreement noted:           │
│                                                                 │
│  [Oscar's recommendation with reasoning]                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ⚖️ KEY DISAGREEMENT                                         ││
│  │                                                             ││
│  │ On **optimal timing for refinancing**:                      ││
│  │                                                             ││
│  │ • **Claude** argues: Act now—rates unlikely to drop further ││
│  │ • **GPT-4** argues: Wait 3 months—Fed signals more cuts     ││
│  │                                                             ││
│  │ **Oscar's take**: I weighted Claude's position because      ││
│  │ current rate lock guarantees outweigh speculative future    ││
│  │ cuts. However, GPT-4's point about Fed signals is valid     ││
│  │ if you have flexibility to wait.                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  📊 Expand Full Council Deliberation                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Full Arbitration Log

```
┌─────────────────────────────────────────────────────────────────┐
│  FULL ARBITRATION LOG                                           │
│  ═══════════════════════════════════════════════════════════════│
│                                                                 │
│  Query ID: cncl_20241219_abc123                                 │
│  Timestamp: 2024-12-19T14:32:00Z                                │
│  Trigger: Auto (financial_threshold)                            │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  STEP 1: Query dispatched to 3 models                           │
│  • Claude: 2,340ms | 1,247 tokens | $0.018                      │
│  • GPT-4: 3,891ms | 1,102 tokens | $0.022                       │
│  • Gemini: 2,102ms | 987 tokens | $0.008                        │
│                                                                 │
│  STEP 2: Confidence normalization                               │
│  • Claude: raw N/A → normalized 92 (reasoning depth: 5/5)       │
│  • GPT-4: raw N/A → normalized 87 (reasoning depth: 4/5)        │
│  • Gemini: raw N/A → normalized 78 (reasoning depth: 3/5)       │
│                                                                 │
│  STEP 3: Specialty weight assignment                            │
│  • Query type: Financial reasoning                              │
│  • Claude: 45% (primary match)                                  │
│  • GPT-4: 35% (secondary)                                       │
│  • Gemini: 20% (tertiary)                                       │
│                                                                 │
│  STEP 4: Agreement analysis                                     │
│  • Aligned: 4 points (core recommendation, rate analysis,       │
│    closing costs, break-even concept)                           │
│  • Divergent: 1 point (timing recommendation)                   │
│  • Agreement score: 72%                                         │
│                                                                 │
│  STEP 5: Divergence resolution                                  │
│  • Type: Reasoning dispute                                      │
│  • Resolution: Weighted Claude (specialty match + confidence)   │
│  • Alternative acknowledged: Yes                                │
│                                                                 │
│  STEP 6: Synthesis generated                                    │
│  • Final response: 347 words                                    │
│  • Transparency flags: 1 (timing disagreement)                  │
│                                                                 │
│  Total cost: $0.048 | Total latency: 4,102ms                    │
│                                                                 │
│  [Close] [Export Log]                                           │
└─────────────────────────────────────────────────────────────────┘
```

#### Display State Machine

```
                    ┌─────────────────┐
                    │  DEFAULT VIEW   │
                    │ (Synthesis Only)│
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐          ┌─────────────────┐
    │  EXPANDED VIEW  │          │ DISAGREEMENT    │
    │ (Council Detail)│          │     VIEW        │
    └─────────────────┘          └─────────────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   FULL LOG      │
                    │ (Arbitration)   │
                    └─────────────────┘
```

### B: Example Payloads

#### Sample ModelResponse (Claude)

```json
{
  "model_id": "claude-3-opus",
  "model_display_name": "Claude",
  "content": "Based on current market conditions, refinancing your mortgage now would likely save you approximately $200-300 per month. Here's my reasoning:\n\n1. Current rates are historically low at around 6.5%\n2. Your existing rate of 7.8% means significant savings potential\n3. The break-even period on closing costs would be approximately 18 months\n\nHowever, I recommend acting soon rather than waiting, as Fed signals suggest rates may stabilize or increase slightly in Q1 2025.",
  "summary": "Refinancing now recommended due to favorable rates and 18-month break-even period.",
  "confidence": {
    "raw_score": null,
    "normalized_score": 92,
    "reasoning_depth": 5
  },
  "sources_cited": [],
  "reasoning_chain": [
    "Current rates are low (6.5%)",
    "Existing rate is higher (7.8%)",
    "Break-even is 18 months",
    "Fed signals suggest acting soon"
  ],
  "latency_ms": 2340,
  "tokens_used": 1247,
  "timestamp": "2024-12-19T14:32:02Z",
  "status": "success"
}
```

#### Sample CouncilDeliberation

```json
{
  "query_id": "cncl_20241219_abc123",
  "original_query": "Should I refinance my mortgage? Current rate is 7.8%, home value $450K, owe $280K",
  "query_classification": ["financial", "decision", "personal_finance"],
  "responses": [
    { "model_id": "claude-3-opus", "...": "..." },
    { "model_id": "gpt-4-turbo", "...": "..." },
    { "model_id": "gemini-pro", "...": "..." }
  ],
  "agreement": {
    "level": "moderate",
    "score": 72,
    "aligned_points": [
      "Refinancing is generally advisable given rate differential",
      "Current rates are favorable",
      "Closing costs are a consideration",
      "Break-even analysis is important"
    ],
    "divergent_points": [
      {
        "topic": "Optimal timing",
        "positions": [
          { "model_id": "claude-3-opus", "position": "Act now", "confidence": 92 },
          { "model_id": "gpt-4-turbo", "position": "Wait 3 months", "confidence": 85 }
        ],
        "resolution": "model_a_weighted",
        "resolution_reasoning": "Claude's confidence higher and specialty match for financial reasoning"
      }
    ]
  },
  "synthesis": {
    "final_response": "Based on analysis from multiple perspectives, refinancing your mortgage now is advisable...",
    "arbitration_log": [
      { "step": 1, "action": "dispatch", "reasoning": "Query classified as financial", "outcome": "3 models queried" },
      { "step": 2, "action": "normalize", "reasoning": "Derived confidence from response analysis", "outcome": "Scores: 92, 87, 78" },
      { "step": 3, "action": "weight", "reasoning": "Financial query matches Claude specialty", "outcome": "Weights: 45%, 35%, 20%" },
      { "step": 4, "action": "analyze", "reasoning": "Compared aligned vs divergent points", "outcome": "Agreement: 72%" },
      { "step": 5, "action": "resolve", "reasoning": "Timing dispute - reasoning type", "outcome": "Weighted Claude, acknowledged GPT-4" },
      { "step": 6, "action": "synthesize", "reasoning": "Generated unified response", "outcome": "347 words, 1 flag" }
    ],
    "weights_applied": [
      { "model_id": "claude-3-opus", "base_weight": 45, "adjusted_weight": 48, "adjustment_reason": "Higher confidence" },
      { "model_id": "gpt-4-turbo", "base_weight": 35, "adjusted_weight": 33, "adjustment_reason": "Slightly lower confidence" },
      { "model_id": "gemini-pro", "base_weight": 20, "adjusted_weight": 19, "adjustment_reason": "Lowest confidence" }
    ],
    "transparency_flags": ["timing_disagreement"]
  },
  "total_latency_ms": 4102,
  "total_cost_estimate": 0.048,
  "council_mode_trigger": "auto"
}
```

### C: File Structure

```
osqr/
├── src/
│   ├── council/
│   │   ├── index.ts                    # Main council mode entry point
│   │   ├── types.ts                    # All TypeScript interfaces
│   │   ├── config.ts                   # TIER_CONFIG, TIMEOUT_CONFIG, weights
│   │   ├── trigger.ts                  # Trigger evaluation logic
│   │   ├── dispatcher.ts               # Parallel model dispatch
│   │   ├── adapters/
│   │   │   ├── index.ts                # Unified adapter interface
│   │   │   ├── claude.ts               # Claude API adapter
│   │   │   ├── gpt4.ts                 # GPT-4 API adapter
│   │   │   └── gemini.ts               # Gemini API adapter
│   │   ├── synthesis/
│   │   │   ├── synthesizer.ts          # Main synthesis logic
│   │   │   ├── confidence.ts           # Confidence normalization
│   │   │   ├── agreement.ts            # Agreement/disagreement detection
│   │   │   └── prompts.ts              # Oscar synthesis prompt templates
│   │   ├── display/
│   │   │   ├── states.ts               # Display state machine
│   │   │   ├── components.ts           # UI component definitions
│   │   │   └── formatters.ts           # Output formatting
│   │   └── __tests__/
│   │       ├── trigger.test.ts
│   │       ├── confidence.test.ts
│   │       ├── synthesis.test.ts
│   │       └── integration.test.ts
```

---

*Document Version: 1.0*
*Created: December 19, 2024*
*Status: Ready for Implementation*
