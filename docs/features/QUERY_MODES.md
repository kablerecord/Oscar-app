# OSQR Council Mode & Query Modes Specification
## Version 1.0 | Multi-Model Intelligence & Transparency Layer

**Component:** Query Mode System
**Version:** 1.0
**Status:** Ready for Implementation
**Target Release:** V1.0
**Dependencies:** Multi-Model Router, Memory Vault, Bubble Interface
**Related:** [COUNCIL-MODE.md](./COUNCIL-MODE.md), [MULTI-MODEL-ARCHITECTURE.md](../architecture/MULTI-MODEL-ARCHITECTURE.md)

---

## Document Purpose

This document defines OSQR's multi-model query system and the Council Mode transparency layer. It covers:

- **Three Query Modes** (Quick, Thoughtful, Contemplate)
- **Council Mode** as a presentation layer for multi-model outputs
- **Tier differentiation** between Pro and Master experiences
- **Model configuration** and user/creator customization
- **UI/UX direction** for Council Mode interface

The core insight: **Council Mode is not separate functionality—it is a presentation layer that reveals what Thoughtful and Contemplate modes already produce under the hood.**

---

## The Foundational Distinction

### What This Spec Defines

| Term | What It Is |
|------|------------|
| **Query Modes** | How OSQR processes a request (Quick, Thoughtful, Contemplate) |
| **Council Mode** | How Master users VIEW multi-model outputs (UI/UX layer) |
| **Supreme Court Button** | Future feature - adversarial deliberation between models |

### The Key Insight

Council Mode is **not** a fourth query mode. It is a **transparency layer** that allows Master-tier users to see individual model outputs before OSQR synthesizes them.

- **Pro users** get Thoughtful and Contemplate modes → see OSQR's synthesis only (black box)
- **Master users** get the same modes → can see individual model perspectives via Council Mode UI

**The upgrade value is not "more models." It is "see for yourself."**

---

## Query Mode Definitions

OSQR offers three query modes. Users can select these explicitly or let OSQR auto-route based on query complexity.

### Quick Mode

**What happens:** Single model responds. Fast, cheap, efficient.

**When to use:**
- Simple questions
- Quick lookups
- Straightforward tasks
- Anything that doesn't need multiple perspectives

**Cost:** Lowest

**Example:** "What's 2x3?" → No need for 8 LLMs. Quick mode handles it.

#### Quick Mode Fast Path (Implemented Dec 2024)

For **simple questions in Quick mode** (complexity ≤ 2), we skip heavy context assembly to dramatically reduce latency.

**The Problem:**
Every query was running 10-15 database operations before Claude was even called:
- `assembleContext()` - vault search, profile, MSC items, recent threads
- `getTILContext()` - temporal intelligence
- `getCrossSessionMemory()` - past conversation summaries

This added ~15 seconds of overhead for questions like "hi" or "what is 2x2".

**The Solution:**
```typescript
const isSimpleQuestion = effectiveMode === 'quick' && complexity <= 2

if (isSimpleQuestion) {
  // Fast path: skip context, go straight to Claude
  autoContext = { context: '', sources: {...}, raw: {} }
} else {
  // Full context assembly for complex questions
  autoContext = await assembleContext(...)
  tilContext = await getTILContext(...)
  crossSessionMemory = await getCrossSessionMemory(...)
}
```

**Performance Impact:**
| Metric | Before | After |
|--------|--------|-------|
| Simple question latency | ~20 seconds | ~3 seconds |
| Context assembly time | ~15 seconds | ~1ms |

**What determines "simple":**
- `effectiveMode === 'quick'` - user selected Quick mode
- `complexity <= 2` - determined by `routeQuestion()` in `lib/ai/model-router.ts`

**Trade-off:** Simple questions don't get vault context, profile, or memory. This is intentional—"what is 2x2" doesn't need to know about your past conversations.

**Complex questions still get full context.** Asking "help me plan my launch based on our discussions" will trigger the full context assembly because complexity > 2.

**See also:** `app/api/oscar/ask-stream/route.ts` for implementation.

---

### Thoughtful Mode

**What happens:** Multiple models respond independently to the same query. OSQR synthesizes their outputs into a unified answer.

**When to use:**
- Complex questions requiring multiple perspectives
- Analysis and recommendations
- Creative work where diverse approaches help
- Any situation where "more perspectives = better answer"

**Cost:** Medium

**How it works mechanically:**
1. User submits query
2. OSQR routes query to multiple models in parallel
3. Each model responds independently (they don't see each other)
4. OSQR synthesizes responses into unified output
5. User sees synthesis (Pro) or can view individual responses (Master via Council Mode)

---

### Contemplate Mode

**What happens:** Multiple models respond, then compare/critique each other's answers. OSQR synthesizes the refined outputs.

**When to use:**
- High-stakes decisions
- Strategic planning
- Complex problems where challenge and refinement adds value
- Anything where "stress-testing ideas" matters

**Cost:** Higher (more tokens due to comparison step)

**How it works mechanically (Efficient V1.0 Approach):**
1. User submits query
2. Model 1 answers the query fully
3. Model 2 sees Model 1's answer and responds with **delta only**—what they disagree with, what they would change, what's missing
4. OSQR synthesizes the original answer plus the critique into final output
5. User sees synthesis (Pro) or can view individual responses (Master via Council Mode)

**Why delta-only for Model 2:** Minimizes token usage while still creating genuine model-to-model interaction. Model 2 doesn't re-answer the question—it only offers the difference.

---

## Supreme Court Button (Future Feature)

**Not V1.0 scope.** Documented here for context and future reference.

**What it is:** The "cost is no object, get me the absolute best answer possible" mode.

**How it differs from Contemplate:**
- Multiple rounds of deliberation (not just one pass)
- Full answers from all models (not just deltas)
- Models explicitly challenge and refine each other
- Significantly higher token cost
- Reserved for decisions where even half a percent improvement matters

**Design philosophy:**
> "We will find the least efficient way possible to do it that also gives the absolute best answer possible. At any cost."

This is adversarial truth-seeking for power users. Contemplate is collaborative refinement. Supreme Court is structured debate.

**See also:** [SUPREME-COURT-BUTTON.md](./SUPREME-COURT-BUTTON.md)

---

## Tier Structure

### Model Allocation by Tier

| Tier | Models in Council | Council Mode UI | Default Synthesizer |
|------|-------------------|-----------------|---------------------|
| **Pro** ($99/mo) | 2 models | Blurred (teaser) | Claude |
| **Master** ($349/mo) | 6-8 models | Full access | Claude |

### The 3-4x Multiplier

Master users get 3-4x the model count of Pro users. This creates meaningful differentiation:

- Pro: 2 models working together
- Master: 6-8 models working together

However, **quantity is not the primary upgrade lever**. The real value is transparency and control.

---

## Pro Tier Experience

### What Pro Users Get

- **Thoughtful Mode:** 2 models synthesized by OSQR
- **Contemplate Mode:** 2 models with comparison step, then synthesized
- **Synthesis only:** User sees OSQR's combined output, not individual model responses

### What Pro Users See (Council Mode Teaser)

- Council Mode button is **visible** in the UI
- When clicked, panels are **blurred**
- User can see the **shape** of what Master unlocks
- Creates visual awareness without crippling the Pro experience

### The Disagreement Signal

When underlying models significantly disagree, OSQR surfaces this to Pro users:

> "I synthesized this from two different perspectives. They weren't fully aligned on [X]. Want me to elaborate on the tension, or is this enough?"

**Why this matters:**
- Pro users get signal that depth exists without seeing the full council
- Creates organic upgrade moments—users who keep hitting these and wanting more will naturally consider Master
- Honest (OSQR's character)—he's transparent about his process
- Not manipulative—users can decline and move on

**Threshold:** To be calibrated post-launch. Too sensitive = noisy. Too conservative = never triggers. Start conservative, tune based on user response.

---

## Master Tier Experience

### What Master Users Get

- **Thoughtful Mode:** 6-8 models synthesized by OSQR
- **Contemplate Mode:** 6-8 models with comparison step, then synthesized
- **Full Council Mode UI:** Can view every individual model's response before or after seeing synthesis

### Council Mode UI

Master users can access Council Mode whenever Thoughtful or Contemplate queries complete:

1. **OSQR's synthesis appears first** (primary content)
2. **"What do you think?" prompt** invites dialogue
3. **Carousel of individual perspectives** available below
4. User can swipe freely through model responses
5. User can discuss with OSQR, referencing specific model outputs

---

## Mode Selection & Routing

### User Control

- **Explicit selection:** Three buttons in UI (Quick, Thoughtful, Contemplate)
- **Default preference:** User can set in Settings
- **Per-query override:** User can always select different mode for specific query

### OSQR Auto-Routing

OSQR can override user preference when appropriate:

| Query Type | OSQR Action |
|------------|-------------|
| Simple factual question | Routes to Quick even if user prefers Thoughtful |
| Complex decision | Suggests Contemplate if user selected Quick |
| Resource-intensive question | Warns before engaging expensive mode |

**Principle:** Don't burn 8 LLMs on "what's 2x3?" even if user has Thoughtful as default.

### Refine Fire Integration

Before engaging expensive modes, OSQR can help users craft better questions:

- Identifies vague or underspecified queries
- Suggests refinements that would make multi-model analysis more valuable
- Prevents wasted resources on poorly-framed questions

**Note:** Refine Fire requires separate documentation pull from existing specs. This spec acknowledges the integration point.

---

## Model Configuration

### Default Configuration

| Role | Default Model | Notes |
|------|---------------|-------|
| **Synthesizer** | Claude (Anthropic) | Combines perspectives into unified output |
| **Pro Council** | GPT-4o + one other | 2 models total |
| **Master Council** | GPT-4o, Gemini, Groq, others | 6-8 models total |

### User Customization (Settings)

Users can customize their council in Settings:

- **Select synthesizer:** Which model combines outputs
- **Select council members:** Which models provide perspectives
- **Save configurations:** Different setups for different use cases
- **Revert to defaults:** One-click return to OSQR recommendations

**Both Pro and Master users can customize within their tier limits** (Pro picks from 2 slots, Master from 6-8 slots).

### Plugin Creator Control

Plugin creators can set default model configurations for their methodology:

| Control | Creator Can Set | User Can Override |
|---------|-----------------|-------------------|
| Recommended synthesizer | Yes | Yes |
| Recommended council members | Yes | Yes |
| Recommended default mode | Yes | Yes |
| Force specific configuration | **No** | N/A |

**Principle:** Plugins suggest, users decide. No plugin can force a model configuration.

**Integration:** This becomes part of the Plugin Creator Control Inventory. See [PLUGIN_CREATOR_SPEC.md](../plugins/PLUGIN_CREATOR_SPEC.md).

---

## Council Mode UI/UX

### Core Metaphor

**"Elite Council" / "Secret Council"** from movies—each screen is a different advisor, user is the decision-maker receiving counsel.

### Visual Design Direction

**Carousel of vertical panels:**
- Main panel is enlarged and centered
- Adjacent panels partially visible on each side
- User swipes freely left or right (no forced sequence)
- Subtle color differentiation per model (let the LLM's content shine, not the styling)

**OSQR's position:**
- Synthesis bar at bottom (persistent)
- "What do you think?" prompt invites response
- User can discuss with OSQR about any panel's content

### Information Hierarchy

1. **OSQR's synthesis** (top/primary)—this is the answer
2. **Interaction prompt**—"What do you think?"
3. **Individual model panels** (carousel below)—this is the transparency

**Rationale:** User gets the answer first. Depth is available but not required.

### Pro Tier Blurred View

When Pro users click Council Mode:
- Same carousel layout appears
- All panels are **blurred/frosted**
- User can see that multiple perspectives exist
- Clear upgrade path: "Upgrade to Master to view full council"

**Why blurred instead of hidden:** Seeing the shape of what they're missing is more compelling than not knowing it exists.

---

## Flow Diagrams

### Thoughtful Mode Flow (Pro)

```
User submits query
       ↓
OSQR routes to 2 models (parallel)
       ↓
Model A responds    Model B responds
       ↓                  ↓
       └────────┬─────────┘
                ↓
    OSQR synthesizes responses
                ↓
    User sees synthesis only
                ↓
    (If significant disagreement)
                ↓
    OSQR surfaces: "They weren't aligned on [X]"
```

### Thoughtful Mode Flow (Master)

```
User submits query
       ↓
OSQR routes to 6-8 models (parallel)
       ↓
Models A-H respond independently
       ↓
OSQR synthesizes responses
       ↓
User sees synthesis first
       ↓
Council Mode UI available
       ↓
User can view any individual model's response
       ↓
User can discuss with OSQR
```

### Contemplate Mode Flow (Either Tier)

```
User submits query
       ↓
Model 1 answers fully
       ↓
Model 2 sees Model 1's answer
       ↓
Model 2 responds with DELTA ONLY
(What they disagree with, would change, or add)
       ↓
OSQR synthesizes original + critique
       ↓
User sees synthesis
       ↓
(Master only: Can view Model 1 answer + Model 2 delta in Council Mode)
```

---

## Technical Considerations

### Token Economics

| Mode | Pro Token Cost | Master Token Cost |
|------|----------------|-------------------|
| Quick | ~500-1K | ~500-1K |
| Thoughtful | ~2-4K (2 models) | ~8-16K (6-8 models) |
| Contemplate | ~3-5K (answer + delta) | ~12-20K (answer + deltas) |

### Latency Expectations

| Mode | Expected Response Time |
|------|------------------------|
| Quick | <2 seconds |
| Thoughtful | 3-8 seconds (parallel calls) |
| Contemplate | 5-12 seconds (sequential dependency) |

### Model Routing Logic

The Multi-Model Router handles:
- Selecting which models to engage based on tier and user settings
- Parallel vs sequential orchestration based on mode
- Fallback if a model fails mid-query
- Cost tracking against daily budgets

---

## Integration Points

### With Existing OSQR Systems

| System | Integration |
|--------|-------------|
| [Multi-Model Router](../architecture/MULTI-MODEL-ARCHITECTURE.md) | Handles model selection and orchestration |
| [Memory Vault](../architecture/KNOWLEDGE_ARCHITECTURE.md) | Stores query history, model responses (if needed for audit) |
| [Constitutional Framework](../governance/OSQR_CONSTITUTION.md) | Synthesis cannot violate core constraints |
| [Insights System](./BEHAVIORAL_INTELLIGENCE_LAYER.md) | Complex insights may trigger Thoughtful/Contemplate suggestion |
| [Plugin Architecture](../architecture/PLUGIN_ARCHITECTURE.md) | Plugins can set default model configurations |
| [Bubble Interface](./BUBBLE-COMPONENT-SPEC.md) | Query mode selection exposed via Bubble |

### Document Updates Required

| Document | Update Needed |
|----------|---------------|
| **Plugin Creator Control Inventory** | Add model configuration controls |
| **Free Tier Architecture** | Clarify which modes available at which tier |
| **Conversion Strategy** | Already references Council Mode correctly |
| **Character Guide** | How OSQR discusses modes and disagreement |

---

## Success Metrics

### Usage Metrics

| Metric | Target | What It Tells Us |
|--------|--------|------------------|
| Mode distribution | TBD | Which modes users actually choose |
| Auto-route override rate | <20% | Is OSQR routing intelligently? |
| Council Mode view rate (Master) | >50% | Are users valuing transparency? |
| Blurred panel click rate (Pro) | >30% | Is teaser creating upgrade interest? |

### Conversion Metrics

| Metric | Target | What It Tells Us |
|--------|--------|------------------|
| Pro → Master (Council Mode driver) | 5-10% | Is transparency compelling upgrade? |
| Disagreement signal → upgrade | Track | Does signal create upgrade moments? |

### Quality Metrics

| Metric | Target | What It Tells Us |
|--------|--------|------------------|
| Synthesis satisfaction | >80% | Is OSQR combining well? |
| "Elaboration requested" rate | Track | Are users wanting more depth? |
| Mode switch rate mid-task | <10% | Did user pick wrong mode initially? |

---

## Implementation Phases

### Phase 1: Core Query Modes
- [ ] Quick Mode (single model routing)
- [ ] Thoughtful Mode (parallel multi-model + synthesis)
- [ ] Contemplate Mode (sequential answer + delta + synthesis)
- [ ] Mode selection UI (three buttons)
- [ ] User preference in Settings

### Phase 2: Council Mode UI (Master)
- [ ] Carousel component
- [ ] Individual model panels
- [ ] Synthesis bar (persistent)
- [ ] Swipe navigation
- [ ] Panel color differentiation

### Phase 3: Pro Tier Experience
- [ ] Blurred Council Mode view
- [ ] Disagreement signal logic
- [ ] Threshold calibration
- [ ] Upgrade path from blurred view

### Phase 4: Customization
- [ ] Model selection in Settings
- [ ] Save/load configurations
- [ ] Plugin creator defaults
- [ ] User override of plugin defaults

### Phase 5: Refinement
- [ ] Auto-routing logic tuning
- [ ] Refine Fire integration
- [ ] Latency optimization
- [ ] Cost tracking and limits

---

## Glossary

| Term | Definition |
|------|------------|
| **Query Mode** | How OSQR processes a request (Quick, Thoughtful, Contemplate) |
| **Council Mode** | UI layer that reveals individual model outputs (Master only) |
| **Synthesis** | OSQR's combined output from multiple model responses |
| **Delta** | In Contemplate mode, Model 2's response covering only disagreements/additions |
| **Disagreement Signal** | OSQR telling Pro users that underlying models weren't aligned |
| **Supreme Court Button** | Future feature for adversarial multi-round deliberation |
| **Synthesizer** | The model responsible for combining other models' outputs |
| **Council Members** | The models providing perspectives to be synthesized |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial specification from design session |

---

**End of Specification**

*Document Version: 1.0*
*Status: Ready for Implementation*
*Next Review: Post-Phase 1 implementation validation*
