# Epic: Intelligence
## Epic ID: E-003

**Status:** Complete
**Priority:** P0
**Last Updated:** 2025-12-20

---

## Overview

The Intelligence epic provides OSQR's multi-model reasoning capabilities. It routes questions to optimal models, enables multi-model deliberation, and synthesizes diverse perspectives into OSQR's unified voice.

**Why it matters:** Single-model limitations constrain AI quality. Multi-model routing and synthesis give users the best of every provider while maintaining OSQR's coherent identity.

---

## Components

| Component | Spec | Status |
|-----------|------|--------|
| Multi-Model Router | `docs/architecture/MULTI-MODEL-ARCHITECTURE.md` | Complete |
| Model Registry | `lib/ai/model-router.ts` | Complete |
| Council Mode | `docs/features/COUNCIL-MODE.md` | Complete |
| Provider Adapters | `lib/ai/providers/` | Partial (Anthropic, OpenAI complete) |

---

## Stories

| Story ID | Title | Spec | Status |
|----------|-------|------|--------|
| E-003-S001 | Question Classification | MULTI-MODEL-ARCHITECTURE.md | Complete |
| E-003-S002 | Complexity Estimation | MULTI-MODEL-ARCHITECTURE.md | Complete |
| E-003-S003 | Model Routing Logic | router-wrapper.ts | Complete |
| E-003-S004 | Fallback Chain | MULTI-MODEL-ARCHITECTURE.md | Complete |
| E-003-S005 | Council Panel Configuration | COUNCIL-MODE.md | Complete |
| E-003-S006 | Multi-Model Synthesis | @osqr/core Council | Complete |
| E-003-S007 | Provider: Anthropic | lib/ai/providers/anthropic.ts | Complete |
| E-003-S008 | Provider: OpenAI | lib/ai/providers/openai.ts | Complete |
| E-003-S009 | Provider: Google | - | Planned |
| E-003-S010 | Provider: xAI | - | Planned |

---

## Dependencies

- **Depends on:** E-001 (Governance), E-002 (Memory)
- **Blocks:** E-004 (Guidance), E-005 (Interface)

---

## Success Criteria

- [x] Questions are classified by type (8 categories)
- [x] Complexity is estimated (1-5 scale)
- [x] Routing selects optimal model based on type + complexity
- [x] Fallback chain handles model failures gracefully
- [x] Council mode executes 2-6 models in parallel
- [x] Synthesis produces unified OSQR voice
- [x] Model personality displayed in Council mode
- [ ] Additional providers (Google, xAI) integrated

---

## Context from Architecture

### Related Components
- Memory provides context for enriched prompts
- Constitutional validates all model outputs
- Throttle checks tier access before routing
- Bubble may suggest mode changes

### Architecture References
- See: `docs/architecture/MULTI-MODEL-ARCHITECTURE.md` — Full routing spec
- See: `docs/features/COUNCIL-MODE.md` — Deliberation details
- See: `lib/ai/model-router.ts` — Implementation

### Integration Points
- Receives from: User query (via ask route), Memory context
- Sends to: Model providers, Constitutional (output validation)

---

## Testable Invariants

### Pre-conditions
- At least one model provider is available
- User has tier access to requested mode

### Post-conditions
- Response is from an enabled model
- Synthesis preserves key insights from all models

### Invariants
- Fallback chain must end with a guaranteed model (Claude Haiku)
- Confidence thresholds determine escalation (configurable)
- Cost tracking is async and non-blocking
- Constitutional checks run on all model outputs before delivery
