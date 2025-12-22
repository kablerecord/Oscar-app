# OSQR Multi-Model Architecture

**Status:** Foundation Complete, Expansion Planned
**Category:** Core Intelligence / Model Routing
**Owner:** Kable Record
**Last Updated:** 2025-12-09

---

## Vision

> **"OSQR is a multi-model AI operating system that becomes your thinking environment, not just a chat box."**

OSQR sits *above* individual models (ChatGPT, Claude, etc.), pulls in your knowledge, remembers who you are, and routes each question to the right "brain" with the right depth of thinking.

Unlike single-model interfaces, OSQR:
- Connects to multiple LLMs with different strengths
- Routes questions to the optimal model based on type and complexity
- Synthesizes multi-model outputs into one unified voice
- Learns which models work best for which scenarios over time

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER QUESTION                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    1. QUESTION CLASSIFICATION                           │
│                                                                         │
│  detectQuestionType() → factual | creative | coding | analytical |      │
│                         reasoning | summarization | conversational |     │
│                         high_stakes                                     │
│                                                                         │
│  estimateComplexity() → 1-5 scale                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       2. MODEL ROUTING                                  │
│                                                                         │
│  routeQuestion() selects optimal model from MODEL_REGISTRY based on:    │
│  - Question type                                                        │
│  - Complexity score                                                     │
│  - Model capabilities                                                   │
│  - Cost profile                                                         │
│  - User mode (Quick / Thoughtful / Contemplate / Council)              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     3. MODE EXECUTION                                   │
│                                                                         │
│  Quick Mode:      1 model → direct response                             │
│  Thoughtful Mode: Panel (2-3 models) → synthesis                        │
│  Contemplate:     Extended panel → multi-round → deep synthesis         │
│  Council Mode:    Visible panel → streaming → OSQR moderation           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      4. OSQR SYNTHESIS                                  │
│                                                                         │
│  Combines model outputs into unified OSQR voice                         │
│  - Identifies agreements / disagreements                                │
│  - Weights by model strengths for question type                         │
│  - Speaks as "OSQR" (not as individual models)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    5. INSTRUMENTATION (Future)                          │
│                                                                         │
│  Track per response: latency, tokens, cost                              │
│  Track over time: model agreement rates, user feedback                  │
│  Adapt routing: update capability scores based on actual performance    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Model Registry

### Purpose

Single source of truth for all available models and their characteristics.

### Location

`lib/ai/model-router.ts` → `MODEL_REGISTRY`

### Schema

```typescript
interface ModelDefinition {
  // Identity
  id: string                    // Unique: "anthropic-claude-sonnet-4"
  provider: ModelProvider       // 'anthropic' | 'openai' | 'google' | 'xai' | 'mistral' | 'meta'
  model: string                 // API model name
  displayName: string           // Human-readable name

  // Capabilities (0-10 scale)
  capabilities: {
    reasoning: number    // Multi-step logic, analysis
    creativity: number   // Creative writing, ideation
    coding: number       // Code generation, debugging
    speed: number        // Response latency
    accuracy: number     // Factual correctness
    nuance: number       // Emotional intelligence, tone
  }

  // Economics
  costProfile: 'cheap' | 'medium' | 'expensive'
  maxContextTokens: number

  // Availability
  enabled: boolean              // Can be toggled off globally
  enabledForCouncil: boolean    // Available in Council Mode

  // Personality (for Council Mode)
  personality: {
    codename: string     // "The Philosopher"
    description: string  // One-sentence summary
    strengths: string[]  // What it excels at
    style: string        // Communication style
  }
}
```

### Current Models in Registry

| ID | Provider | Display Name | Codename | Cost | Enabled |
|----|----------|--------------|----------|------|---------|
| anthropic-claude-opus-4 | Anthropic | Claude Opus 4 | The Philosopher | Expensive | ✅ |
| anthropic-claude-sonnet-4 | Anthropic | Claude Sonnet 4 | The Balanced Thinker | Medium | ✅ |
| anthropic-claude-3-5-sonnet | Anthropic | Claude 3.5 Sonnet | The Empath | Medium | ✅ |
| anthropic-claude-haiku | Anthropic | Claude Haiku | The Speedster | Cheap | ✅ |
| openai-gpt-4o | OpenAI | GPT-4o | The Creator | Medium | ✅ |
| openai-gpt-4o-mini | OpenAI | GPT-4o Mini | The Efficient | Cheap | ✅ |
| openai-gpt-4-1 | OpenAI | GPT-4.1 | The Generalist | Expensive | ❌ |
| google-gemini-2-pro | Google | Gemini 2.0 Pro | The Engineer | Medium | ❌ |
| google-gemini-2-flash | Google | Gemini 2.0 Flash | The Lightning | Cheap | ❌ |
| xai-grok-2 | xAI | Grok 2 | The Maverick | Medium | ❌ |
| mistral-large | Mistral | Mistral Large | The Prodigy | Medium | ❌ |
| meta-llama-3-1-405b | Meta | Llama 3.1 405B | The Workhorse | Expensive | ❌ |

### Helper Functions

```typescript
// Get all enabled models
getEnabledModels(): ModelDefinition[]

// Get models available for Council Mode
getCouncilModels(): ModelDefinition[]

// Get a specific model by ID
getModelById(id: string): ModelDefinition | undefined

// Get models by provider
getModelsByProvider(provider: ModelProvider): ModelDefinition[]

// Get best model for a capability (optionally limited by cost)
getBestModelForCapability(capability: keyof ModelCapabilities, costLimit?: CostProfile): ModelDefinition
```

---

## Component 2: Provider Adapters

### Purpose

Abstract provider-specific API details behind a common interface.

### Location

`lib/ai/providers/`

### Interface

```typescript
interface ProviderClient {
  chat(params: {
    model: string
    messages: Message[]
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
  }): Promise<{
    content: string
    tokensUsed: number
    latencyMs?: number
  }>
}
```

### Current Adapters

| Provider | Adapter | Status |
|----------|---------|--------|
| Anthropic | `lib/ai/providers/anthropic.ts` | ✅ Complete |
| OpenAI | `lib/ai/providers/openai.ts` | ✅ Complete |
| Google | - | ❌ Not started |
| xAI | - | ❌ Not started |
| Mistral | - | ❌ Not started |
| Meta | - | ❌ Not started |

### Adding a New Provider

1. Create adapter file: `lib/ai/providers/{provider}.ts`
2. Implement the `ProviderClient` interface
3. Register in `ProviderRegistry`
4. Add API key to environment variables
5. Add models to `MODEL_REGISTRY` with `enabled: false`
6. Test, then flip `enabled: true`

---

## Component 3: Question Classification

### Purpose

Detect question type and estimate complexity to inform routing.

### Location

`lib/ai/model-router.ts`

### Question Types

| Type | Description | Pattern Examples |
|------|-------------|------------------|
| `factual` | Facts, definitions, lookups | "What is X?", "Define Y", math |
| `creative` | Writing, brainstorming | "Write a poem", "Generate ideas" |
| `coding` | Programming, debugging | "Fix this code", "Write a function" |
| `analytical` | Comparison, analysis | "Compare X vs Y", "Pros and cons" |
| `reasoning` | Explanation, logic | "Why does X happen?", "Explain how" |
| `summarization` | Condensing, key points | "Summarize", "Main points" |
| `conversational` | Casual chat, opinions | "What do you think?", "Hi" |
| `high_stakes` | Major decisions | "Should I quit?", "Negotiate equity" |

### Complexity Scale (1-5)

| Score | Description |
|-------|-------------|
| 1 | Trivial (simple math, yes/no, single fact) |
| 2 | Easy (straightforward how-to, simple explanation) |
| 3 | Medium (requires some synthesis, moderate context) |
| 4 | Complex (multi-faceted, requires expertise) |
| 5 | Very Complex (high stakes, many considerations) |

### Detection Logic

```typescript
function detectQuestionType(question: string): QuestionType {
  // Uses regex pattern matching in priority order:
  // 1. high_stakes (check first - most important to catch)
  // 2. coding
  // 3. creative
  // 4. analytical
  // 5. reasoning
  // 6. summarization
  // 7. factual
  // 8. conversational (default fallback)
}

function estimateComplexity(question: string): number {
  // Base score: 2 (medium)
  // Adjustments:
  // - Low complexity indicators: -1 each
  // - High complexity indicators: +1 each
  // - Word count < 5: -1
  // - Word count > 50: +1
  // - Word count > 100: +1
  // Clamp to 1-5 range
}
```

---

## Component 4: Model Routing

### Purpose

Select the optimal model(s) based on question type, complexity, and mode.

### Routing Matrix

| Question Type | Low Complexity (1-2) | Medium (3) | High (4-5) |
|---------------|---------------------|------------|------------|
| factual | Claude Haiku | Claude Haiku | Claude Sonnet |
| creative | Claude Sonnet | Claude Sonnet | Claude Opus |
| coding | GPT-4o | GPT-4o | Claude Sonnet |
| analytical | Claude Sonnet | Claude Sonnet | Claude Opus |
| reasoning | GPT-4o | Claude Opus | Claude Opus |
| summarization | Claude Haiku | Claude Haiku | Claude Sonnet |
| conversational | Claude Sonnet | Claude Sonnet | Claude Sonnet |
| high_stakes | Claude Opus | Claude Opus + Panel | Full Panel |

### Mode-Specific Behavior

**Quick Mode:**
- Uses single routed model
- Returns response directly (no synthesis)
- Includes routing metadata for Alt-Opinion suggestions

**Thoughtful Mode:**
- Uses panel of 2-3 models
- Panel operates in parallel
- OSQR synthesizes into unified answer
- ~20-40 seconds

**Contemplate Mode:**
- Extended panel discussion
- Multiple rounds of refinement
- Deep synthesis with reasoning
- ~60-90 seconds

**Council Mode (Future):**
- Visible panel of 2-6 models
- Real-time streaming per model
- OSQR moderates and synthesizes
- User can see each model's response

---

## Component 5: OSQR Synthesis

### Purpose

Combine multi-model outputs into a single, unified OSQR voice.

### Location

`lib/ai/oscar.ts`

### Synthesis Process

1. **Collect** responses from all panel members
2. **Identify** areas of agreement
3. **Surface** disagreements or alternative perspectives
4. **Weight** contributions based on question type and model strengths
5. **Synthesize** into final OSQR response
6. **Attribute** key insights (optional, for transparency)

### Synthesis Prompt Structure

```
You are OSQR, synthesizing responses from multiple AI models.

Panel Responses:
[Model 1 - The Philosopher]: {response}
[Model 2 - The Creator]: {response}

Your task:
1. Identify where models agree
2. Note where they diverge
3. Evaluate which reasoning is strongest
4. Produce a unified answer in your OSQR voice
5. Be decisive - don't just summarize, conclude
```

---

## Component 6: Instrumentation (Future)

### Purpose

Track model performance over time to improve routing.

### Metrics to Track

**Per Request:**
- `latencyMs` - Response time
- `tokensUsed` - Token count
- `cost` - Calculated cost
- `modelId` - Which model was used
- `questionType` - Detected type
- `complexity` - Estimated complexity

**Per Session:**
- User feedback (thumbs up/down)
- Alt-Opinion requests (which model was chosen)
- Follow-up questions (indicating insufficient answer)

**Aggregate (Over Time):**
- Model agreement rate per question type
- User preference patterns
- Cost efficiency per model
- Accuracy trends

### Future: Adaptive Routing

With sufficient data:
- Update capability scores based on actual performance
- Learn user preferences for specific models
- Optimize cost/quality tradeoffs
- Predict which model will perform best

---

## Model Personality Atlas

For Council Mode and panel transparency, each model has a defined personality:

### Anthropic Models

**Claude Opus 4 → "The Philosopher"**
> Calm, cautious, deeply logical, extremely reliable.
- Strengths: Deep reasoning, nuanced analysis, safety-conscious
- Style: Thoughtful and measured, considers implications carefully
- Best for: High-stakes decisions, complex reasoning, ethical questions

**Claude Sonnet 4 → "The Balanced Thinker"**
> Excellent all-rounder with strong creative and analytical abilities.
- Strengths: Creative writing, code analysis, balanced perspectives
- Style: Clear, articulate, adaptable to context
- Best for: General questions, creative tasks, analysis

**Claude 3.5 Sonnet → "The Empath"**
> Strong emotional intelligence with excellent creative abilities.
- Strengths: Emotional nuance, creative writing, tone matching
- Style: Warm, empathetic, contextually aware
- Best for: Personal questions, creative writing, sensitive topics

**Claude Haiku → "The Speedster"**
> Fast, lightweight Claude for quick tasks with high clarity.
- Strengths: Speed, efficiency, clear summaries
- Style: Concise and direct
- Best for: Simple facts, quick summaries, low-stakes questions

### OpenAI Models

**GPT-4o → "The Creator"**
> Great at everything: writing, coding, brainstorming, structure.
- Strengths: Versatility, code generation, structured output
- Style: Practical, structured, solution-oriented
- Best for: Coding, creative projects, structured analysis

**GPT-4o Mini → "The Efficient"**
> Cheap, fast, great for routing and simple tasks.
- Strengths: Speed, cost efficiency, basic coding
- Style: Brief and functional
- Best for: Simple questions, routing decisions, quick checks

### Future Models

**Gemini 2.0 Pro → "The Engineer"**
> Excellent multimodality, STEM reasoning + code analysis.
- Strengths: STEM, code analysis, long context, multimodal
- Style: Technical and precise
- Best for: Technical questions, code review, data analysis

**Grok 2 → "The Maverick"**
> Fast, witty, contrarian, great for real-time and current events.
- Strengths: Real-time knowledge, contrarian perspectives, speed
- Style: Edgy, direct, unfiltered
- Best for: Current events, alternative perspectives, quick wit

**Mistral Large → "The Prodigy"**
> High-quality reasoning with European safety standards.
- Strengths: Efficiency, coding, multilingual
- Style: Precise and professional
- Best for: Multilingual tasks, efficient reasoning

**Llama 3.1 405B → "The Workhorse"**
> Close to GPT-4 performance with fully open-source access.
- Strengths: Open source, customizable, strong coding
- Style: Straightforward and capable
- Best for: Self-hosted deployments, custom fine-tuning

---

## Implementation Roadmap

### Phase 1: Foundation (✅ Complete)

- [x] Model Registry with capabilities and personalities
- [x] Question type detection
- [x] Complexity estimation
- [x] Basic routing logic
- [x] Anthropic adapter
- [x] OpenAI adapter
- [x] Quick Mode with dynamic routing
- [x] Alt-Opinion feature with model selection

### Phase 2: Enhanced Routing (Current)

- [ ] Visual model badges in UI
- [ ] Model personality display
- [ ] User-customizable model preferences
- [ ] Routing confidence display

### Phase 3: Provider Expansion

- [ ] Google (Gemini) adapter - HIGH priority
- [ ] xAI (Grok) adapter - MEDIUM priority
- [ ] Mistral adapter - MEDIUM priority
- [ ] Meta (Llama) adapter - LOW priority

### Phase 4: Council Mode

- [ ] Visible multi-panel UI
- [ ] Real-time streaming per model
- [ ] OSQR moderator synthesis
- [ ] Model selection controls

### Phase 5: Instrumentation

- [ ] Per-request metrics logging
- [ ] User feedback collection
- [ ] Cost tracking dashboard
- [ ] Adaptive routing based on performance

---

## Related Documents

- [ROADMAP.md](../../ROADMAP.md) - Section 3.3, 3.3.1, Appendix E
- [COUNCIL-MODE.md](COUNCIL-MODE.md) - Visible multi-chat feature
- [SUPREME-COURT-BUTTON.md](SUPREME-COURT-BUTTON.md) - Adversarial deliberation mode
- [lib/ai/model-router.ts](../../lib/ai/model-router.ts) - Implementation
- [lib/ai/oscar.ts](../../lib/ai/oscar.ts) - OSQR class
- [lib/ai/providers/](../../lib/ai/providers/) - Provider adapters

---

## Context from Architecture

### Related Components
- Constitutional Framework — Validates all model outputs
- Memory Vault — Provides context for prompt enrichment
- Throttle — Checks tier access for modes
- Council Mode — Extends routing to visible multi-model
- Bubble — May suggest mode changes based on question complexity

### Architecture References
- See: `docs/features/COUNCIL-MODE.md` — Visible deliberation
- See: `lib/ai/model-router.ts` — Implementation
- See: `lib/ai/providers/` — Provider adapters

### Integration Points
- Receives from: User query, Memory context, Tier info
- Sends to: Model providers, Constitutional (validation), Synthesis engine

### Tech Stack Constraints
- Providers: Anthropic SDK, OpenAI SDK
- Streaming: Native provider streaming
- Fallback: Must end with guaranteed model (Claude Haiku)

---

## Testable Invariants

### Pre-conditions
- At least one model provider is available
- API keys are configured for enabled models

### Post-conditions
- Response is from an enabled model
- Cost is tracked (async, non-blocking)

### Invariants
- Fallback chain must end with a guaranteed model
- Confidence thresholds determine escalation
- Cost tracking is async and never blocks response
- All model outputs pass constitutional validation
- Question type detection uses regex patterns in priority order
- Complexity score is always 1-5 (clamped)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-20 | 1.1 | Added Context from Architecture, Testable Invariants |
| 2025-12-09 | 1.0 | Initial spec with full model registry |
