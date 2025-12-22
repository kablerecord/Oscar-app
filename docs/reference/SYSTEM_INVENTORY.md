# OSQR System Inventory

**Status:** Living Document
**Last Updated:** 2025-12-16
**Purpose:** Master index of all OSQR systems, features, and concepts

This document exists because OSQR evolves faster than internalization. Use it to:
- Remember what you've designed
- Find where things are documented
- Check what's built vs specified vs conceptual
- Maintain system coherence

---

## Document Map

| Document | Purpose | Status |
|----------|---------|--------|
| [OSQR_CONSTITUTION.md](OSQR_CONSTITUTION.md) | Layer 0: Immutable principles, what OSQR will never/always do | **Foundational** |
| [OSQR_PHILOSOPHY.md](OSQR_PHILOSOPHY.md) | Layer 1: Beliefs about growth, effort, imagination | **Foundational** |
| [UX_PHILOSOPHY.md](UX_PHILOSOPHY.md) | Layer 2: Focus Mode, progressive reveal, UI states | **Foundational** |
| [USER_INTELLIGENCE_ARTIFACTS.md](USER_INTELLIGENCE_ARTIFACTS.md) | Internal user models (invisible to users) | Complete |
| [ROADMAP.md](../../ROADMAP.md) | Implementation phases + Section 0 strategic vision | Active |
| [PLUGIN_ARCHITECTURE.md](PLUGIN_ARCHITECTURE.md) | Core/Plugin separation, safety, platform values | Complete |
| [CREATOR_MARKETPLACE.md](CREATOR_MARKETPLACE.md) | Plugin operations, creator tiers, marketplace | Complete |
| [KNOWLEDGE_ARCHITECTURE.md](KNOWLEDGE_ARCHITECTURE.md) | PKV vs GKVI, knowledge separation | Complete |
| [SAFETY_SYSTEM.md](SAFETY_SYSTEM.md) | Crisis detection, response playbooks | Specified |
| [BEHAVIORAL_INTELLIGENCE_LAYER.md](BEHAVIORAL_INTELLIGENCE_LAYER.md) | Telemetry, pattern learning | Specified |
| [PRIVACY_TIERS.md](PRIVACY_TIERS.md) | A/B/C privacy model | Specified |
| [TELEMETRY_SPEC.md](TELEMETRY_SPEC.md) | What OSQR learns from behavior | Specified |
| [META_OSQR_MODE.md](META_OSQR_MODE.md) | Self-audit, complexity analysis | Specified |
| [features/COUNCIL-MODE.md](features/COUNCIL-MODE.md) | Visible multi-model panel | Specified |
| [features/MULTI-MODEL-ARCHITECTURE.md](features/MULTI-MODEL-ARCHITECTURE.md) | Model routing, personalities | Complete |
| [vision/VSCODE-DEV-COMPANION.md](vision/VSCODE-DEV-COMPANION.md) | VS Code extension vision | Vision |
| [vision/AUTONOMOUS-APP-BUILDER.md](vision/AUTONOMOUS-APP-BUILDER.md) | App generation vision | Vision |
| [vision/PRIVACY-PHONE.md](vision/PRIVACY-PHONE.md) | V4.0 Privacy Phone strategy | Vision |
| [vision/CREATOR_MARKETPLACE_GTM.md](vision/CREATOR_MARKETPLACE_GTM.md) | Marketplace go-to-market strategy | Complete |
| [marketing/PODCAST_SEEDING_PLAYBOOK.md](marketing/PODCAST_SEEDING_PLAYBOOK.md) | Experience-first podcast outreach strategy | Complete |
| [execution/SPOKEN_ARCHITECTURE.md](../execution/SPOKEN_ARCHITECTURE.md) | V2.0 Guided software development methodology | Specified |
| [plugins/PLUGIN_CREATOR_SPEC.md](../plugins/PLUGIN_CREATOR_SPEC.md) | Conversational plugin development | Specified |
| [features/QUERY_MODES.md](../features/QUERY_MODES.md) | Query modes (Quick/Thoughtful/Contemplate) + Council Mode | Specified |
| [features/CAPTURE_ROUTER.md](../features/CAPTURE_ROUTER.md) | Natural language capture and reminder routing | Specified |
| [features/EMAIL_INTEGRATION.md](../features/EMAIL_INTEGRATION.md) | Gmail integration for unified intelligence | Specified |

---

## Full System Inventory (44 Systems, 9 Layers)

### Layer 0: Foundational Documents

*The soul of OSQR — everything derives from here*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 0a | **OSQR Constitution** | Immutable principles, what OSQR will never/always do, decision standards | **Complete** | [OSQR_CONSTITUTION.md](OSQR_CONSTITUTION.md) |
| 0b | **OSQR Philosophy** | Beliefs about growth, effort, imagination, how OSQR views people | **Complete** | [OSQR_PHILOSOPHY.md](OSQR_PHILOSOPHY.md) |

---

### Layer 1: Constitutional / Governing

*These control everything else*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 1 | **Privacy Philosophy (A/B/C)** | Tier A: full privacy; B: personal learning; C: global contribution | Specified | [PRIVACY_TIERS.md](PRIVACY_TIERS.md) |
| 2 | **Burn-It Button** | Full irreversible deletion of all user data | Conceptual | — |
| 3 | **Capability Gating Engine** | Features unlock by behavior, not curiosity | Conceptual | — |
| 4 | **Trust/Maturity Scoring** | Silent internal score determining access to high-power tools | Conceptual | — |

---

### Layer 2: Core Intelligence Engine

*How OSQR thinks*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 6 | **Multi-Model Architecture** | Multiple AI providers, OSQR sits above | ✅ Built | [MULTI-MODEL-ARCHITECTURE.md](features/MULTI-MODEL-ARCHITECTURE.md) |
| 7 | **Model Registry** | Catalog of models with strengths, costs, capabilities | ✅ Built | `lib/ai/model-router.ts` |
| 8 | **Provider Adapters** | OpenAI, Anthropic, Google, xAI integrations | ✅ Built | `lib/ai/providers/` |
| 9 | **Question Classification** | Type detection (reasoning, coding, high-stakes, etc.) | ✅ Built | `detectQuestionType()` |
| 10 | **Complexity Scoring (1-5)** | Estimates question depth | ✅ Built | `estimateComplexity()` |
| 11 | **Model Routing Logic** | Chooses which model(s) handle the question | ✅ Built | `routeQuestion()` |
| 12 | **OSQR Synthesis Layer** | Merges outputs, resolves conflicts, produces unified voice | ✅ Built | `lib/ai/oscar.ts` |

---

### Layer 3: Modes of Thought

*How deeply OSQR engages*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 13 | **Quick Mode** | Single fast model, immediate response | ✅ Built | — |
| 14 | **Thoughtful Mode** | Hidden panel reasoning + synthesis | ✅ Built | — |
| 15 | **Contemplate Mode** | Extended multi-round deep reasoning | ✅ Built | — |
| 16 | **Council Mode** | Visible multi-model panel, real-time streams, OSQR moderation | Specified | [COUNCIL-MODE.md](features/COUNCIL-MODE.md) |
| 16a | **Query Modes Spec** | Quick/Thoughtful/Contemplate mode definitions, tier differentiation, Council Mode UI | Specified | [QUERY_MODES.md](../features/QUERY_MODES.md) |

---

### Layer 4: Governance & Override Systems

*Above normal modes*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 17 | **Supreme Court Button** | Maximum depth/honesty, requires earned access, yearly Max plan | Conceptual | — |

**Activation requires:**
- Significant PKV documentation
- High-quality questions over time
- Heavy OSQR usage
- Super-user behavior
- Yearly Max plan

---

### Layer 5: Knowledge Architecture

*What OSQR knows*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 18 | **Global Knowledge Index (GKVI)** | Shared across all users, teaches OSQR how to be OSQR | Specified | [KNOWLEDGE_ARCHITECTURE.md](KNOWLEDGE_ARCHITECTURE.md) |
| 19 | **Private Knowledge Vault (PKV)** | Per-user isolated storage: docs, notes, history, goals | ✅ Built | [KNOWLEDGE_ARCHITECTURE.md](KNOWLEDGE_ARCHITECTURE.md) |
| 20 | **GKVI/PKV Separation Rule** | Never mix global and private knowledge | Specified | [KNOWLEDGE_ARCHITECTURE.md](KNOWLEDGE_ARCHITECTURE.md) |

**GKVI Contains:**
- Capability Ladder (13 levels)
- Fourth Generation Formula
- Core Commitments
- Foundational Truths
- Coaching philosophy
- Mode definitions
- MSC structure

**PKV Contains:**
- Documents
- Notes & reflections
- Chat history
- Projects & goals
- Identity scripts

---

### Layer 6: Execution & Guidance Systems

*Where users live*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 21 | **Refine → Fire Pipeline** | Clarify intent, add constraints, then execute | ✅ Built | — |
| 22 | **Master Summary Checklist (MSC)** | Tracks goals, projects, habits, decisions, open loops | Partial | — |
| 23 | **Temporal Intelligence Layer** | Knows when things happened, detects patterns over time | Conceptual | — |
| 24 | **Cognitive Load Governor** | Blur don't hide, reduce overwhelm, progressive disclosure | Specified | [UX_PHILOSOPHY.md](UX_PHILOSOPHY.md) |
| 25 | **Focus Mode** | UI simplification, context-aware visibility, noise reduction | Specified | [UX_PHILOSOPHY.md](UX_PHILOSOPHY.md) |
| 25a | **Capture Router** | Natural language capture (remind me, note this), intelligent routing to calendar/memory/context triggers | Specified | [CAPTURE_ROUTER.md](../features/CAPTURE_ROUTER.md) |

---

### Layer 7: Meta-Intelligence

*OSQR thinking about itself and the user*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 26 | **Meta-OSQR Mode** | Self-audit, complexity analysis, feature pruning | Specified | [META_OSQR_MODE.md](META_OSQR_MODE.md) |
| 27 | **Question Intelligence Engine** | Quality scoring, improvements, PowerQuestion generation | Specified | [META_OSQR_MODE.md](META_OSQR_MODE.md) |
| 28 | **User Intelligence Artifacts** | Internal user models: trajectory, decisions, capability, phase | Specified | [USER_INTELLIGENCE_ARTIFACTS.md](USER_INTELLIGENCE_ARTIFACTS.md) |

**User Intelligence Artifacts contain (invisible to users):**
- User Trajectory Map
- Decision Backlog
- Implicit Roadmap
- Capability Profile
- Question Quality Model
- Phase Detection

---

### Layer 8: Creator & Ecosystem Layer

*Platform expansion*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 29 | **Creator Plugin System** | Judgment Profiles that change how OSQR thinks | Specified | [PLUGIN_ARCHITECTURE.md](PLUGIN_ARCHITECTURE.md) |
| 30 | **Creator Marketplace** | Discovery, licensing, 80/20 economics | Specified | [CREATOR_MARKETPLACE.md](CREATOR_MARKETPLACE.md) |
| 31 | **Plugin Council Mode (v1.5+)** | Multiple plugins, reasoning about disagreement | Specified | [CREATOR_MARKETPLACE.md](CREATOR_MARKETPLACE.md) |
| 31a | **Plugin Creator Spec** | Conversational plugin development, extraction conversation, real-time control population | Specified | [PLUGIN_CREATOR_SPEC.md](../plugins/PLUGIN_CREATOR_SPEC.md) |

---

### Layer 8a: Data Integration Layer (V1.5)

*External data sources that extend OSQR's knowledge*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 32 | **Email Integration** | Gmail connection, conservative indexing, JIT retrieval, thread compaction | Specified | [EMAIL_INTEGRATION.md](../features/EMAIL_INTEGRATION.md) |
| 33 | **Calendar Integration** | Event-based triggers for Capture Router, meeting context | Planned | — |

---

### Layer 9: Expansion Surfaces (Future)

*Non-blocking future capabilities*

| # | System | Description | Status | Doc |
|---|--------|-------------|--------|-----|
| 34 | **Media Vault** | Photos, videos, timeline, memory linking | Vision | — |
| 35 | **VS Code Dev Companion (V3.0)** | Real OSQR backend in VS Code, PKV+MSC integration | Vision | [VSCODE-DEV-COMPANION.md](vision/VSCODE-DEV-COMPANION.md) |
| 35a | **Spoken Architecture (V2.0)** | Guided software development through conversation, auto-categorization, gap detection | Specified | [SPOKEN_ARCHITECTURE.md](../execution/SPOKEN_ARCHITECTURE.md) |
| 36 | **Autonomous Mode** | Task execution, assumption tracking, safe autonomy | Partial | ROADMAP Appendix D |
| 37 | **Autonomous App Builder** | Blueprint generation, dependency graphs, scaffolding | Vision | [AUTONOMOUS-APP-BUILDER.md](vision/AUTONOMOUS-APP-BUILDER.md) |
| 38 | **Privacy Phone (V4.0)** | OSQR-native phone, intelligence utility model, US manufacturing | Vision | [PRIVACY-PHONE.md](vision/PRIVACY-PHONE.md) |
| 39 | **Robotics Integration (V5.0)** | OSQR intelligence layer for robotics/automation | Placeholder | — |

> **Note:** Robotics Integration is a future vision placeholder. Documentation will be created when strategic direction is defined.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Built | Implemented and working in codebase |
| Partial | Some functionality exists |
| Specified | Detailed spec exists, not yet built |
| Conceptual | Discussed/documented, no detailed spec |
| Vision | Long-term idea, no immediate implementation |

---

## Quick Reference: What's Actually Built

These are the systems that exist in code today:

1. Multi-Model Architecture
2. Model Registry
3. Provider Adapters (OpenAI, Anthropic, Google, xAI)
4. Question Classification
5. Complexity Scoring
6. Model Routing Logic
7. OSQR Synthesis Layer
8. Quick Mode
9. Thoughtful Mode
10. Contemplate Mode
11. Refine → Fire Pipeline
12. Private Knowledge Vault (PKV)
13. User Authentication
14. Basic Onboarding
15. Capability Ladder Assessment
16. "See What Another AI Thinks" Button

---

## Key Relationships

```
┌─────────────────────────────────────┐
│    Layer 0: OSQR Constitution       │
│         + Philosophy                │
│   (The soul — everything derives)   │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│         Core Intelligence           │
│  (Multi-Model + Routing + Synthesis)│
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│           Modes of Thought          │
│   (Quick / Thoughtful / Contemplate)│
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│       Knowledge Architecture        │
│          (GKVI + PKV)               │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│        Execution Systems            │
│      (Refine→Fire + MSC)            │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│       Meta-Intelligence             │
│  (User Intelligence Artifacts)      │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│         Plugin Layer                │
│  (Creator Plugins + Marketplace)    │
└─────────────────────────────────────┘
```

---

## New System Checklist

When adding a new system/feature, document:

1. **Layer** — Which of the 9 layers does it belong to?
2. **Status** — Built / Partial / Specified / Conceptual / Vision
3. **Dependencies** — What must exist first?
4. **Doc Location** — Where is it specified?
5. **Conflicts** — Does it contradict anything existing?

---

## Version History

| Date | Change |
|------|--------|
| 2025-12-14 | Initial inventory created (34 systems, 9 layers) |
| 2025-12-14 | Added Layer 0 (Constitution + Philosophy), User Intelligence Artifacts (37 systems, 10 layers) |
| 2025-12-14 | Added UX_PHILOSOPHY.md (Focus Mode, Three UI States, Progressive Reveal) |
| 2025-12-16 | Added Privacy Phone (V4.0) and Robotics Integration (V5.0 placeholder) to Layer 9; updated version references (V2.0=Marketplace, V3.0=VS Code, V4.0=Privacy Phone, V5.0=Robotics) |
| 2025-12-21 | Added 5 new V1.5/V2.0 specs: Query Modes, Capture Router, Email Integration, Plugin Creator, Spoken Architecture V2.0. Added Layer 8a (Data Integration). Updated to 44 systems. |

---

## The Coherence Test

> Nothing here contradicts anything else.

If a new feature passes this test, it belongs.
If it doesn't, it needs refinement or rejection.

OSQR is not a collection of features.
OSQR is an **operating system** with a unified architecture.
