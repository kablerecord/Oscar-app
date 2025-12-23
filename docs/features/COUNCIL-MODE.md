# OSQR Council Mode (Multi-Chat Mode)

**Status:** Planned for v2.0 (Phase 3 - Intelligence Layer)
**Category:** Response Modes / Multi-Model Intelligence
**Owner:** Kable Record
**Tier:** OSQR Master exclusive ($349/mo)
**Target:** June-August 2026 (based on current build pace)

---

## Vision

> **"A room of minds. One final voice."**

Council Mode transforms OSQR from a "smart assistant" into a **visible multi-agent intelligence chamber.** Users watch multiple AI models think in parallel, see their real-time reasoning, and receive OSQR's synthesized consensus answer.

This is the natural evolution of OSQR's existing architecture:
- **Quick Mode** → Single fast model (invisible routing)
- **Thoughtful Mode** → Hidden panel discussion
- **Contemplate Mode** → Extended hidden panel reasoning
- **Council Mode** → **Visible panel, real-time streams**

---

## Why This Matters

### 1. Perceived Superintelligence
Users don't fully trust single-agent AI. They trust a council. This is why:
- Jury systems work
- Scientific peer review works
- Human decision-making works (seeking multiple opinions)

Watching multiple models hash through a problem creates **visible intelligence formation.**

### 2. Uncopiable Moat
OpenAI and Anthropic **cannot** show competing models inside their apps. OSQR can.

This reinforces OSQR's identity as:
> **"The AI that knows when — and *who* — to think."**

### 3. Perfect Mode Evolution
| Mode | What Happens | Visibility |
|------|--------------|------------|
| Quick | Single routed model | Hidden |
| Thoughtful | Panel + synthesis | Hidden (debug optional) |
| Contemplate | Extended panel debate | Hidden (debug optional) |
| **Council** | Multi-model parallel | **Visible, real-time** |

### 4. Viral Potential
Screenshots of "Claude vs GPT vs Gemini vs Grok — moderated by OSQR" will spread organically.

---

## User Experience

### Mode Selection
User selects **Council Mode** from the mode picker:

```
[Quick] [Thoughtful] [Contemplate] [Council]
```

### UI Layout (Default 4-Panel Grid)

```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│     Claude     │     GPT-4o     │     Gemini     │      Grok      │
│    (stream)    │    (stream)    │    (stream)    │    (stream)    │
│                │                │                │                │
│  [Thinking...] │  [Drafting...] │  [Revising...] │  [Complete]    │
└────────────────┴────────────────┴────────────────┴────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                    OSQR Moderator Synthesis                        │
│                                                                    │
│  Here's the consensus after evaluating all perspectives:           │
│                                                                    │
│  • Claude is cautious about X                                      │
│  • GPT-4o believes Y                                               │
│  • Gemini suggests Z                                               │
│  • Grok adds an alternative angle                                  │
│                                                                    │
│  My synthesis → [final unified answer]                             │
└────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (Carousel)
For smaller screens, swipe between models:

```
[Claude] < swipe > [GPT-4o] < swipe > [Gemini] < swipe > [Grok]

───────────────────────────────────────────────────────────
                    OSQR Final Voice
───────────────────────────────────────────────────────────
```

### Model Badges
Each model window displays a colored badge:
- **Claude** — Blue
- **GPT-4o** — Purple
- **Gemini** — Gold
- **Grok** — Orange
- **Mistral** — Green
- **Llama** — Gray

### Status Indicators
Real-time status in each window:
- "Thinking..."
- "Drafting..."
- "Revising..."
- "Complete"

---

## User Controls

### Model Toggle
Users can select which models to include (2-6 models):
- [ ] Claude
- [ ] GPT-4o / GPT-4.1
- [ ] Gemini
- [ ] Grok
- [ ] Mistral
- [ ] Llama

**Maximum simultaneous:** 4 models (for performance/cost)

### Council Depth
Control token limits per model:

| Depth | Tokens/Model | Use Case |
|-------|--------------|----------|
| Low | 500 | Quick comparison |
| Medium | 1,000 | Standard analysis |
| High | 2,000 | Deep investigation |

**High Depth** unlocked for Master annual subscribers only.

---

## Backend Architecture

### New Endpoint

```
POST /api/oscar/council
```

> **Note:** Follows AUTONOMOUS-GUIDELINES.md — internal routes stay under `/api/oscar/`

### Request Schema

```typescript
interface CouncilRequest {
  workspaceId: string
  message: string
  modelList: ('claude' | 'gpt' | 'gemini' | 'grok' | 'mistral' | 'llama')[]
  depth: 'low' | 'medium' | 'high'
  useKnowledge?: boolean
}
```

### Response Schema

```typescript
interface CouncilResponse {
  models: {
    claude?: { content: string; status: 'complete' | 'partial' | 'error' }
    gpt?: { content: string; status: 'complete' | 'partial' | 'error' }
    gemini?: { content: string; status: 'complete' | 'partial' | 'error' }
    grok?: { content: string; status: 'complete' | 'partial' | 'error' }
    // ... other models
  }
  osqrFinal: string
  reasoning: {
    agreements: string[]
    disagreements: string[]
    weightings: Record<string, number>
  }
  meta: {
    totalTokens: number
    processingTime: number
    modelCount: number
  }
}
```

### Streaming Architecture

Each model streams independently via Server-Sent Events:

```typescript
// Client subscribes to council stream
const eventSource = new EventSource('/api/oscar/council/stream?id=xxx')

eventSource.addEventListener('claude', (e) => updateModelPanel('claude', e.data))
eventSource.addEventListener('gpt', (e) => updateModelPanel('gpt', e.data))
eventSource.addEventListener('gemini', (e) => updateModelPanel('gemini', e.data))
eventSource.addEventListener('grok', (e) => updateModelPanel('grok', e.data))
eventSource.addEventListener('osqr', (e) => updateSynthesis(e.data))
eventSource.addEventListener('complete', (e) => finalizeResponse(e.data))
```

---

## Model Routing Logic

### Parallel Execution
All selected models receive the same refined prompt via `Promise.all` with timeout guards.

### Timeout Rules
- Default timeout: 30 seconds per model
- If a model is slow:
  - Display partial response
  - Mark as "slow" or "partial"
  - Continue synthesis without blocking

### Weighting Matrix
OSQR weights model contributions dynamically based on question type:

| Question Type | Claude | GPT | Gemini | Grok |
|---------------|--------|-----|--------|------|
| Reasoning | 0.40 | 0.20 | 0.20 | 0.20 |
| Creative | 0.20 | 0.50 | 0.20 | 0.10 |
| Factual/Research | 0.20 | 0.20 | 0.40 | 0.20 |
| Contrarian/Challenge | 0.10 | 0.10 | 0.10 | 0.70 |
| Coding | 0.30 | 0.40 | 0.15 | 0.15 |

This integrates with the existing `model-router.ts` question type detection.

---

## Cost Control & Safety

### Per-Query Limits

| Setting | Value |
|---------|-------|
| Max models per query | 4 |
| Max tokens per model (default) | 1,000 |
| Max tokens per model (high depth) | 2,000 |
| Timeout per model | 30 seconds |

### Tier Restrictions

| Tier | Council Access |
|------|----------------|
| Starter ($20/mo) | None |
| Pro ($99/mo) | None |
| **Master ($349/mo)** | **Full access** |
| Master Annual ($119/mo) | Full access + High Depth unlocked |
| Enterprise | Full access + Custom SLA |

### Rate Limiting (Invisible - Don't Advertise)
- Max 10 Council sessions per day (Master)
- Custom SLA for Enterprise
- Overage available: $20 for 10 Council sessions

---

## OSQR Synthesis Prompt

```
You are OSQR, the unifying intelligence.

You are presented with multiple AI model responses to the same question. Your job is to:

1. Summarize the main points from each model.
2. Identify areas of agreement.
3. Identify areas of disagreement or contradiction.
4. Evaluate which model's reasoning is strongest and why.
5. Produce a single unified answer that:
   - Explains the landscape of perspectives
   - Resolves contradictions where possible
   - Selects the best ideas from each model
   - Gives the user a clear path forward
6. Maintain OSQR's authoritative, calm, expert tone.

Your answer should feel like a master strategist moderating multiple experts.

Format your response as:

## Consensus Summary
[What the models agree on]

## Key Differences
[Where models diverge and why]

## My Synthesis
[Your unified recommendation with reasoning]
```

---

## Frontend Implementation

### New Components

```
components/
  council/
    CouncilModePanel.tsx      # Main council view container
    ModelWindow.tsx           # Individual model response window
    CouncilSynthesis.tsx      # OSQR final synthesis display
    ModelSelector.tsx         # Model toggle checkboxes
    DepthSelector.tsx         # Low/Medium/High depth picker
```

### State Management

```typescript
interface CouncilState {
  isActive: boolean
  selectedModels: string[]
  depth: 'low' | 'medium' | 'high'
  modelResponses: Record<string, {
    content: string
    status: 'waiting' | 'streaming' | 'complete' | 'error' | 'timeout'
  }>
  osqrSynthesis: string | null
  isComplete: boolean
}
```

---

## Monetization & Positioning

### Tier Value Prop

> "Master users unlock the OSQR Council — a live multi-mind chamber where your questions are evaluated by multiple AIs at once, and OSQR synthesizes the truth."

### Upsell Flow
If a Pro user tries to activate Council Mode:

```
┌─────────────────────────────────────────────────┐
│  Council Mode is part of OSQR Master.           │
│                                                 │
│  Watch multiple AIs debate your question live.  │
│  OSQR moderates and synthesizes the truth.      │
│                                                 │
│  [Activate 7-day Master Trial]  [Learn More]    │
└─────────────────────────────────────────────────┘
```

### Marketing Headlines

> **"Meet the OSQR Council. Multiple AIs. One final voice."**
>
> Watch multiple models debate your question live — and get the consensus from OSQR.

Social prompts:
- "Claude vs GPT vs Gemini vs Grok — moderated by OSQR."
- "This is what intelligence looks like in 2026."
- "One AI is smart. A council is unstoppable."
- "The AI that doesn't just answer — it checks itself."

---

## Dependencies

Before Council Mode can ship, these must be complete:

### Required
- [ ] **3.1 Cross-Referencing Engine** - Council needs stable multi-source synthesis
- [ ] **3.3 Model Personality Tagging** - Each model needs a distinct identity
- [ ] **3.4 Synthesis Engine Enhancement** - Weighted synthesis working
- [x] **Dynamic model routing** - ✅ Implemented in `lib/ai/model-router.ts`
- [ ] **Hardened rate limiting** - Prevent compute abuse
- [ ] **Streaming infrastructure** - SSE for parallel model streams

### Nice to Have
- [ ] Memory integration - Council can reference past conversations
- [ ] PKV context injection - Council uses user's knowledge base
- [ ] Model preferences - User can set preferred models

---

## Future Expansions

### Council Memory
OSQR learns which models the user prefers over time and adjusts weighting.

### Council Personality Profiles
Pre-configured council compositions:
- **"Aggressive Truth Seeking"** — Claude + Grok dominant
- **"Creative Expansion"** — GPT + Claude creative modes
- **"Risk Mitigation"** — All models, conservative weighting
- **"Assumptions Challenge"** — Grok + Claude contrarian

### Council Rounds
Multiple rounds of debate between models (like a real deliberation):
1. Initial responses
2. Models react to each other
3. Final positions
4. OSQR synthesis

### Audio Mode
Each model speaks in a different synthesized voice for audio playback.

### Council Replay
Time-lapse visualization of how the debate evolved.

### Council Export
Export the full council discussion as a PDF/document for reference.

---

## Context from Architecture

### Related Components
- Multi-Model Router — Routes questions and classifies type
- Constitutional Framework — Validates all model outputs
- Memory Vault — Provides context for council prompts
- Throttle — Enforces tier access (Master only)
- Bubble — May suggest Council mode for complex questions

### Architecture References
- See: `docs/architecture/MULTI-MODEL-ARCHITECTURE.md` — Model registry and routing
- See: `lib/ai/model-router.ts` — Question type detection
- See: `lib/ai/panel.ts` — Panel orchestration

### Integration Points
- Receives from: User query, Memory context, Tier verification
- Sends to: Multiple model providers (parallel), Constitutional (validation), Synthesis engine

### Tech Stack Constraints
- Streaming: Server-Sent Events (SSE)
- Parallel execution: Promise.all with timeout guards
- Models: Anthropic (Claude), OpenAI (GPT), Google (Gemini), xAI (Grok)

---

## Testable Invariants

### Pre-conditions
- User is on Master tier or higher
- At least 2 models are selected
- Question has been refined (if refinement enabled)

### Post-conditions
- All selected models have responded (or timed out gracefully)
- OSQR synthesis includes perspectives from all responding models
- Constitutional validation passed on synthesis

### Invariants
- Maximum 4 models per query (cost/performance constraint)
- Each model has maximum 30 second timeout
- Synthesis must identify agreements AND disagreements
- Models stream independently (one slow model doesn't block others)
- Rate limit: Maximum 10 Council sessions per day (Master tier)
- Constitutional checks run on all model outputs and synthesis

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-20 | 0.2 | Added Context from Architecture, Testable Invariants |
| 2025-12-09 | 0.1 | Initial spec created |

---

## Related Documents

- [ROADMAP.md](../../ROADMAP.md) - Phase 3, Section 3.5
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Multi-model architecture
- [SUPREME-COURT-BUTTON.md](SUPREME-COURT-BUTTON.md) - Adversarial deliberation mode (related but distinct)
- [MULTI-MODEL-ARCHITECTURE.md](../architecture/MULTI-MODEL-ARCHITECTURE.md) - Core model routing
- [lib/ai/model-router.ts](../../lib/ai/model-router.ts) - Question type detection
- [lib/ai/oscar.ts](../../lib/ai/oscar.ts) - OSQR class
- [lib/ai/panel.ts](../../lib/ai/panel.ts) - Panel orchestration
