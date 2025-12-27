# UIP Implementation Build Plan

**Created:** 2025-12-27
**Status:** ✅ COMPLETE
**Actual Time:** 41 minutes (see `.claude/build-metrics.json`)
**Spec Reference:** [UIP_SPEC.md](../architecture/UIP_SPEC.md)
**Philosophy Reference:** [SPOKEN-ARCHITECTURE-V3.md](../vision/SPOKEN-ARCHITECTURE-V3.md)

---

## Time Tracking

**IMPORTANT:** When you begin this build, record your start time. When you complete (or pause), record your end time. Update the tracking file at `.claude/build-metrics.json`.

```
Start time: [Record when you begin]
End time: [Record when you finish]
Total time: [Calculate duration]
```

This helps us understand "Claude time" vs "human time" for future estimates.

---

## Context

The User Intelligence Profile (UIP) is OSQR's system for learning about users invisibly over time. The goal is to make OSQR feel like a long-term companion who "knows you" — without questionnaires, dashboards, or visible tracking.

**Key insight from design session:** This is "Spoken Development applied to a human" — the same methodology that builds software specs through conversation can build understanding of a person through conversation.

---

## What Already Exists (60-70% Complete)

### Database Schema ✅ COMPLETE
Location: `packages/app-web/prisma/schema.prisma` (lines 699-946)

All tables exist:
- `UserIntelligenceProfile` — Main profile record
- `UIPDimensionScore` — 8 domains with confidence tracking
- `UIPFact` — Individual extracted facts
- `UIPSignal` — Raw signals for processing
- `UIPElicitationResponse` — Question tracking

All enums exist:
- `PrivacyTier`, `UIPTier`, `UIPDomain`, `UIPSource`, `UIPSignalCategory`

**No migrations needed.**

### Service Files ✅ MOSTLY COMPLETE
Location: `packages/app-web/lib/uip/`

| File | Status | Notes |
|------|--------|-------|
| `types.ts` | ✅ 100% | All TypeScript interfaces |
| `service.ts` | ✅ 95% | CRUD, signal storage, profile assembly |
| `dimension-inference.ts` | ✅ 90% | Confidence decay, merging, aggregation |
| `signal-processor.ts` | ✅ 80% | Message analysis, pattern detection |
| `elicitation.ts` | ✅ 85% | Question bank, delivery logic |
| `reflection.ts` | ⚠️ 40% | **NEEDS COMPLETION** — Trigger logic defined, processing stub |
| `index.ts` | ✅ 100% | Module exports |

### Privacy System ✅ COMPLETE
Location: `packages/app-web/lib/telemetry/PrivacyTierManager.ts`
- Fully functional privacy tier enforcement
- Already integrated in UIP service

### Test Skeletons Exist
- `__tests__/signal-processor.test.ts`
- `__tests__/elicitation.test.ts`
- `__tests__/dimension-inference.test.ts`

---

## What Needs to Be Built

### Phase 1: Core Engine (Priority 1)

#### 1.1 Complete Prospective Reflection Engine
**File:** `packages/app-web/lib/uip/reflection.ts`
**Current state:** Triggers defined, processing is a stub
**What's missing:**
- `runReflection()` — Synthesize signals into dimension updates
- Signal aggregation logic
- Decay application to existing entries
- Conflict detection (new signal vs existing UIP)
- Elicitation candidate identification (what gaps to fill)

**Requirements:**
- Process all unprocessed signals for a user
- Group signals by domain
- Calculate new confidence scores
- Merge with existing dimension scores (higher confidence wins)
- Apply decay to old entries that weren't reinforced
- Mark signals as processed
- Return list of elicitation candidates (low-confidence domains)

#### 1.2 Wire Signal Input Hooks
**Goal:** Extract signals from user conversations automatically

**Integration points to find:**
- Message processing pipeline (where user messages are handled)
- Session lifecycle (start/end events)
- Mode selection events
- Feedback events (thumbs up/down if they exist)

**What to build:**
- Hook that calls `processMessageForSignals()` after each message
- Hook that calls `recordSessionSignal()` on session events
- Respect privacy tier (Tier A = no cross-session signals)

#### 1.3 Wire Behavior Adapters
**Goal:** Make OSQR actually USE what it knows

**What exists:** `formatUIPForPrompt()` in service.ts — formats UIP for injection

**What to build:**
- Find where system prompts are constructed
- Inject UIP context into system prompts
- Apply verbosity/tone adjustments based on UIP
- Apply mode suggestions based on UIP

**Key adapters from spec:**
- Mode Defaults (which mode to suggest)
- Response Shaping (length, structure, tone)
- Autonomy Level (how much to do without asking)
- Proactivity (when to interrupt/suggest)

### Phase 2: Elicitation & Jobs (Priority 2)

#### 2.1 Elicitation Delivery
**File:** `packages/app-web/lib/uip/elicitation.ts`
**Current state:** Question bank defined, delivery logic exists

**What to build:**
- Integration with conversation flow
- Progressive onboarding: 0 questions session 1, 1 question sessions 2-4
- "Skip" handling
- Response capture and UIP update

**Rules from spec:**
- Never block user from working
- Never ask before they've gotten value
- Max 1 question per session
- Always skippable
- Format: "Quick question to help me help you better: [question]. (Skip if you'd rather not)"

#### 2.2 Background Job Scheduling
**Goal:** Run reflection automatically

**Triggers from spec:**
- Daily at 3 AM user-local time
- On session close (after 10+ min session)
- On decision cluster (3+ decisions in single session)

**What to build:**
- Use existing `BackgroundTask` table
- Create job processor for UIP reflection
- Schedule logic based on triggers
- Deduplication (don't run twice within 6 hours)

### Phase 3: Testing (Priority 3)

#### 3.1 Unit Tests
- Signal processor: message → signals extraction
- Dimension inference: signals → dimension scores
- Confidence decay calculations
- Reflection engine: full signal → UIP update flow

#### 3.2 Integration Tests
- End-to-end: message → signal → reflection → UIP update
- Privacy tier enforcement (Tier A blocks cross-session)
- Elicitation flow

---

## Technical Decisions

### BIL (Behavioral Intelligence Layer)
**Decision:** Stub for now, don't block on full BIL implementation.

UIP can work with:
- Explicit elicitation responses
- Message content signals (via signal-processor)
- Session timing (basic)

Full behavioral telemetry (mode selection patterns, retry rates, etc.) can be added later when BIL is built.

### PKV Integration
**Decision:** Use existing `ProfileAnswer` table for explicit PKV data.

When user answers profile questions, those become high-confidence UIP signals with source `EXPLICIT_PKV`.

### Confidence Thresholds
From spec:
- ≥ 0.8: Act without asking
- 0.6-0.79: Act but mention uncertainty
- 0.4-0.59: Ask before significant decisions
- < 0.4: Treat as unknown
- < 0.3: Remove from UIP (noise)

### Privacy Enforcement
- Tier A: Session-only UIP, no cross-session learning
- Tier B: Full UIP, persists across sessions
- Tier C: Full UIP + anonymized patterns for global learning (V3.0)

Already enforced in service.ts — maintain this pattern.

---

## File Locations Quick Reference

```
packages/app-web/
├── prisma/
│   └── schema.prisma          # UIP tables (lines 699-946)
├── lib/
│   ├── uip/
│   │   ├── index.ts           # Exports
│   │   ├── types.ts           # TypeScript types
│   │   ├── service.ts         # CRUD operations
│   │   ├── dimension-inference.ts  # Confidence logic
│   │   ├── signal-processor.ts     # Message → signals
│   │   ├── elicitation.ts     # Question system
│   │   └── reflection.ts      # ⚠️ NEEDS COMPLETION
│   └── telemetry/
│       └── PrivacyTierManager.ts   # Privacy enforcement
└── app/
    └── api/                   # API routes (find message handling here)
```

---

## Build Order

1. **Read existing code first**
   - `lib/uip/reflection.ts` — understand current state
   - `lib/uip/service.ts` — understand available methods
   - `lib/uip/dimension-inference.ts` — understand confidence logic
   - `lib/uip/signal-processor.ts` — understand signal extraction

2. **Complete Reflection Engine**
   - Implement `runReflection()`
   - Test with mock signals

3. **Find and wire signal input hooks**
   - Locate message processing
   - Add signal extraction calls

4. **Wire behavior adapters**
   - Find system prompt construction
   - Inject UIP context

5. **Wire elicitation delivery**
   - Find conversation UI integration point
   - Implement progressive questioning

6. **Add background job scheduling**
   - Wire reflection to BackgroundTask

7. **Write tests**
   - Unit tests for each component
   - Integration test for full flow

---

## Success Criteria

UIP is working when:
1. ✅ Signals are extracted from conversations automatically
2. ✅ Reflection engine processes signals into dimension scores
3. ✅ UIP context is injected into AI prompts
4. ✅ OSQR's responses reflect user preferences (tone, verbosity)
5. ✅ Elicitation questions appear at appropriate times
6. ✅ Privacy tiers are respected (Tier A = no persistence)
7. ✅ Background reflection runs on schedule

---

## What NOT to Build (Deferred to V3.0)

- User-facing UIP summary view
- Manual UIP corrections UI
- Global learning / Tier C aggregation
- Full BIL telemetry system
- Document style analysis

---

## Reference: UIP Domain Structure

### Tier 1: Foundation (slow change)
- **Identity Context:** Name, role, industry, timezone
- **Goals & Values:** Active goals, value filters, constraints

### Tier 2: Style (affects communication)
- **Cognitive Processing:** Abstract vs concrete, linear vs associative
- **Communication Preferences:** Brevity, tone, proactivity tolerance
- **Expertise Calibration:** Known domains vs learning domains

### Tier 3: Dynamics (fast change)
- **Behavioral Patterns:** Session timing, mode usage, retry frequency
- **Relationship State:** Trust maturity, autonomy tolerance
- **Decision Friction:** Hesitation points, momentum triggers

---

## Notes from Design Session

1. **"Spoken Development for Human Understanding"** — UIP is the same methodology as building software, applied to understanding a person. See SPOKEN-ARCHITECTURE-V3.md.

2. **Invisible by design** — Users never see completion scores or manage their profile. They just notice OSQR "gets them" over time.

3. **Meandering conversations are high-signal** — Drive-to-work style chats reveal more than structured interactions. OSQR should participate naturally, not steer toward extraction.

4. **Schema can evolve** — If OSQR notices patterns that don't fit existing domains, it can create "provisional buckets" that may be promoted later.

5. **Trust is the product** — If personalization ever feels creepy, the system has failed.
