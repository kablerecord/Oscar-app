# User Intelligence Profile (UIP) Specification

**Status:** Architecture Complete | Implementation: Not Started
**Version:** 1.0
**Last Updated:** 2025-12-26
**Replaces:** [USER_INTELLIGENCE_ARTIFACTS.md](../features/USER_INTELLIGENCE_ARTIFACTS.md) (deprecated)
**Related:** [PRIVACY_TIERS.md](./PRIVACY_TIERS.md), [BEHAVIORAL_INTELLIGENCE_LAYER.md](../features/BEHAVIORAL_INTELLIGENCE_LAYER.md)

---

## Purpose

The **User Intelligence Profile (UIP)** is OSQR's continuously updating mentorship rulebook for how to think, speak, and act in alignment with a specific human.

UIP is not a psychological profile, diagnosis, or personality test. It is a **Mentorship-as-Code layer** that translates user behavior, preferences, and context into adaptive system behavior.

UIP exists to answer one question continuously:

> **"How should OSQR think, speak, and act for this specific user, in this specific moment?"**

---

## Core Design Principles

1. **Operational, not psychological**
   UIP models *how to be useful*, not *who the user is*.

2. **Probabilistic, never absolute**
   Every inferred trait has a confidence score, source attribution, and decay factor.

3. **Derived, not raw**
   UIP is generated from PKV + telemetry + elicitation. Raw data stays in PKV.

4. **Contextual, not static**
   UIP adapts based on situation, time, task type, and relationship maturity.

5. **Privacy-first**
   Preference inference prioritizes behavioral telemetry over content inspection.

6. **User-correctable**
   Users can override or reset UIP signals at any time.

7. **PKV is sovereign**
   Explicit user statements (PKV) always override inferred signals (UIP).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                 │
├─────────────────────────────────────────────────────────────────────┤
│  PKV (Raw Truth)          Telemetry (BIL)         Elicitation       │
│  ├─ Documents             ├─ Mode selection       ├─ Onboarding Qs  │
│  ├─ Conversations         ├─ Session timing       ├─ Gap-triggered  │
│  ├─ Decisions             ├─ Retry/abort          └─ Follow-ups     │
│  └─ Goals                 └─ Feedback signals                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   PROSPECTIVE REFLECTION ENGINE                      │
│                                                                      │
│  Synthesizes signals → Updates UIP → Removes noise → Decays old     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    USER INTELLIGENCE PROFILE                         │
│                                                                      │
│  Foundation Tier    Style Tier           Dynamics Tier               │
│  ├─ Identity        ├─ Cognitive Style   ├─ Behavioral Patterns     │
│  └─ Goals & Values  ├─ Communication     ├─ Relationship State      │
│                     └─ Expertise         └─ Decision Friction       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BEHAVIOR ADAPTERS                              │
│                                                                      │
│  Mode Defaults │ Response Shaping │ Bubble Behavior │ Council       │
│                │                  │                 │ Threshold     │
│  Autonomy Level │ Refine→Fire    │ Proactivity     │ Verbosity     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Hierarchy (Absolute)

When signals conflict, this hierarchy determines truth:

| Priority | Source | Description |
|----------|--------|-------------|
| 1 (highest) | **Explicit PKV** | User-entered facts, goals, preferences |
| 2 | **Explicit Elicitation** | Direct answers to OSQR questions |
| 3 | **High-confidence UIP** | Inferred signals with confidence ≥ 0.8 |
| 4 (lowest) | **Low-confidence UIP** | Inferred signals with confidence < 0.8 |

**Rule:** PKV always wins. If a user explicitly states "I prefer detailed responses" in PKV, UIP cannot override this even if behavioral signals suggest otherwise.

---

## UIP Domain Structure (3 Tiers, 8 Domains)

### Data Shape

Every UIP entry follows this structure:

```typescript
interface UIPEntry<T> {
  domain: UIPDomain
  value: T
  confidence: number           // 0.0 – 1.0
  sources: UIPSource[]         // 'explicit' | 'behavioral' | 'doc-style' | 'elicitation'
  lastUpdated: Date
  decayRate: number            // 0.0 – 1.0 per 30 days
}

type UIPSource = 'explicit' | 'behavioral' | 'doc-style' | 'elicitation'
```

---

## Tier 1: Foundation

Foundation domains change slowly and inform everything else.

### 1.1 Identity Context

**What OSQR learns:**
- Name / preferred reference
- Role(s) and industry
- Current life or build stage
- Time zone and locale

**Used for:**
- Grounding examples in relevant context
- Filtering irrelevant advice
- Appropriate formality level

**Privacy Tier:** B (requires opt-in)

**Decay rate:** 0.1 / 30 days (slow — identity is stable)

---

### 1.2 Goals & Values

**What OSQR learns:**
- Active goals (short/medium/long term)
- Value filters (speed vs safety, quality vs leverage)
- Constraints and non-negotiables
- What success looks like

**Used for:**
- Advice prioritization
- Trade-off framing
- Recognizing misalignment between actions and stated goals

**Privacy Tier:** B (requires opt-in)

**Decay rate:** 0.2 / 30 days (goals shift over months)

---

## Tier 2: Style

Style domains affect how OSQR communicates and explains.

### 2.1 Cognitive Processing Style

**Signals:**
- Abstract vs concrete preference
- Linear vs associative reasoning
- Verbal vs visual learning
- Reflective vs action-biased

**Used for:**
- Explanation structure (theory-first vs example-first)
- Order of reasoning presentation
- Use of analogies vs direct statements

**Privacy Tier:** B (requires opt-in)

**Decay rate:** 0.15 / 30 days

---

### 2.2 Communication Preferences

**Signals:**
- Brevity vs depth preference
- Options vs single recommendation
- Tone: directive vs exploratory
- Proactivity tolerance (how often to interrupt)

**Used for:**
- Response length and structure
- Question frequency
- Bubble interruption thresholds

**Privacy Tier:** B (requires opt-in)

**Decay rate:** 0.2 / 30 days

---

### 2.3 Expertise Calibration

**Signals:**
- Known domains vs learning domains
- Correction frequency per topic
- Vocabulary density in messages
- Question sophistication by area

**Used for:**
- Avoiding over-explanation in expert areas
- Providing more scaffolding in learning areas
- Choosing appropriate abstraction level

**Privacy Tier:** B (requires opt-in)

**Decay rate:** 0.3 / 30 days (expertise can grow quickly)

**Dependency:** Expertise affects Communication (experts want less explanation)

---

## Tier 3: Dynamics

Dynamic domains change frequently and affect real-time behavior.

### 3.1 Behavioral Patterns

**Signals (telemetry-only, no content):**
- Session timing patterns
- Mode usage distribution
- Retry / abort frequency
- Refinement usage rate
- Latency tolerance

**Used for:**
- Optimal timing for proactive suggestions
- Context compaction triggers
- Mode recommendations

**Privacy Tier:** A for basic metrics, B for patterns

**Decay rate:** 0.4 / 30 days (behavior shifts with context)

---

### 3.2 Relationship State

**Signals:**
- Trust maturity (sessions, duration, outcomes)
- Autonomy tolerance (how much OSQR can do unsupervised)
- Correction vs acceptance rate
- Explicit feedback patterns

**Used for:**
- Authority level in responses
- Directive vs collaborative stance
- Autonomy ramping decisions

**Privacy Tier:** B (requires opt-in)

**Decay rate:** 0.1 / 30 days (trust builds slowly, decays slowly)

**Dependency:** Relationship State gates Autonomy Level

---

### 3.3 Decision Friction Profile

**Signals:**
- Hesitation points (decisions mentioned multiple times without resolution)
- Over-analysis loops (same question rephrased)
- Momentum triggers (what prompts action)
- Decision backlog size

**Used for:**
- When to converge vs continue exploring
- Council Mode activation thresholds
- Pressure vs reassurance balance

**Privacy Tier:** B (requires opt-in)

**Decay rate:** 0.3 / 30 days

**Dependency:** High friction → lower autonomy tolerance

---

## Privacy Tier Mapping

| UIP Domain | Tier A | Tier B | Tier C |
|------------|--------|--------|--------|
| Identity Context | Session-only | Full | Full + global patterns |
| Goals & Values | Not collected | Full | Full |
| Cognitive Style | Not collected | Full | Full + anonymized |
| Communication | Session-only | Full | Full + anonymized |
| Expertise | Not collected | Full | Full + anonymized |
| Behavioral Patterns | Basic only | Full | Full + global learning |
| Relationship State | Not collected | Full | Full |
| Decision Friction | Not collected | Full | Full |

**Tier A users:** UIP exists only within session. No cross-session learning. OSQR behaves generically.

**Tier B users:** Full UIP, persists across sessions. OSQR learns and adapts. Data never leaves user context.

**Tier C users:** Full UIP + anonymized patterns contribute to global OSQR improvements.

---

## Prospective Reflection Engine

### Purpose

The Prospective Reflection Engine is a background process that:
- Synthesizes fragmented signals into coherent UIP updates
- Prevents "context rot" (stale or contradictory signals)
- Applies confidence decay to old information
- Removes deprecated signals

### Trigger Conditions

| Trigger | Condition | Priority |
|---------|-----------|----------|
| **Daily synthesis** | 3:00 AM user-local time (midnight UTC if no timezone) | Normal |
| **Session close** | User closes app/tab after 10+ min session | Normal |
| **Idle threshold** | 30+ minutes no activity during active session | Low |
| **Decision cluster** | 3+ decisions mentioned in single session | High |
| **Major event** | Goal completed, project finished, explicit milestone | High |
| **Manual request** | User asks OSQR to "update what you know about me" | Immediate |

**Deduplication rule:** If session-close reflection ran within last 6 hours, skip the scheduled daily run. No double-processing.

### Process

```
1. Gather signals since last reflection
   ├─ New PKV entries
   ├─ Telemetry events (per Privacy Tier)
   ├─ Conversation patterns
   └─ Elicitation responses

2. For each UIP domain:
   ├─ Calculate new signal strength
   ├─ Apply confidence decay to existing entries
   ├─ Merge/replace if new confidence > existing
   └─ Remove if confidence < 0.3 (noise threshold)

3. Detect conflicts
   ├─ PKV contradicts UIP → PKV wins, UIP updated
   ├─ New behavior contradicts old UIP → Flag for elicitation
   └─ Multiple weak signals → Aggregate before updating

4. Output
   ├─ Updated UIP entries
   ├─ Confidence adjustments
   ├─ Elicitation candidates (gaps to fill)
   └─ Deprecated signals removed
```

### Reflection Prompt (Internal)

When OSQR reflects, it asks itself:

> "Based on recent interactions, what have I learned about how this user prefers to think and work? What should I do differently next time? What am I still uncertain about?"

This is never shown to users.

---

## Confidence Scoring

### Initial Confidence by Source

| Source | Initial Confidence |
|--------|-------------------|
| Explicit PKV | 1.0 (immutable) |
| Direct elicitation | 0.95 |
| Repeated behavioral signal (3+ occurrences) | 0.8 |
| Single behavioral signal | 0.5 |
| Document style inference | 0.6 |

### Confidence Decay Formula

```
effective_confidence = base_confidence × (decay_rate ^ (days_since_update / 30))
```

**Example:** Communication preference with confidence 0.8, decay rate 0.2, 60 days old:
```
effective_confidence = 0.8 × (0.8 ^ (60/30)) = 0.8 × 0.64 = 0.512
```

### Action Thresholds

| Confidence | OSQR Behavior |
|------------|---------------|
| ≥ 0.8 | Act on signal without asking |
| 0.6 – 0.79 | Act but mention uncertainty ("Based on our previous conversations...") |
| 0.4 – 0.59 | Ask before acting if decision is significant |
| < 0.4 | Treat as unknown, use defaults |
| < 0.3 | Remove from UIP (noise) |

---

## Behavior Adapters

UIP directly controls these system behaviors:

### Mode Defaults
- Which mode (Quick/Thoughtful/Contemplate) OSQR suggests by default
- Based on: Cognitive Style, Communication Preferences, past mode satisfaction

### Response Shaping
- Length, structure, tone of responses
- Based on: Communication Preferences, Expertise Calibration

### Bubble Behavior
- How often Bubble interrupts, what triggers proactive suggestions
- Based on: Communication Preferences (proactivity tolerance), Behavioral Patterns

### Council Mode Threshold
- When to escalate to multi-model deliberation
- Based on: Decision Friction Profile, question complexity

### Autonomy Level
- How much OSQR can do without asking
- Based on: Relationship State, explicit user preferences

### Refine → Fire Aggressiveness
- How eager OSQR is to suggest refinements
- Based on: Question Quality patterns, Communication Preferences

---

## Data Ingestion Channels

### A. Explicit Elicitation (Progressive, Low Frequency)

**Philosophy:** Get out of the way. Let users work. Learn silently. Don't overload.

**Progressive Onboarding Flow:**
- **Session 1:** Zero questions. Let them use OSQR. Build trust first.
- **Sessions 2-4:** One question per session, at a natural pause (after first response, not before)
- **Question priority:** Identity → Goals → Communication preference (highest UIP gap utility first)
- **Cap:** After 4 questions answered (or skipped), stop asking. Infer the rest behaviorally.

**Format:**
> "Quick question to help me help you better: [question]. (Skip if you'd rather not)"

**Rules:**
- Always skippable
- Never block the user from working
- Never ask before they've gotten value from OSQR in that session
- Gap-triggered questions (post-onboarding) limited to 1 per session maximum

### B. Behavioral Telemetry (Primary)

- No content inspection
- Mode selection patterns
- Token / latency tolerance
- Retry / correction patterns
- Session timing

See [BEHAVIORAL_INTELLIGENCE_LAYER.md](../features/BEHAVIORAL_INTELLIGENCE_LAYER.md) for full telemetry spec.

### C. Document Style Analysis (Optional / Opt-In)

- Structure only (bullets vs prose, heading depth)
- No semantic inference of sensitive traits
- Requires Tier B minimum

---

## UIP Gap Detection

When OSQR detects a knowledge gap that would materially improve responses:

**Rules:**
1. Gap must affect a domain with current confidence < 0.6
2. Filling the gap must have clear utility (not curiosity)
3. User must be at a natural pause (not mid-task)
4. Maximum 1 elicitation question per session
5. Always skippable

**Format:**
> "Quick question to help me help you better: [question]. (Skip if you'd rather not say)"

---

## User Controls

### Visible to Users

- Toggle key preferences (brevity, challenge level, proactivity)
- View high-level UIP summary (optional, in Settings)
- Reset UIP without deleting PKV
- Export UIP data (GDPR/CCPA)
- Delete all UIP data

### Not Visible to Users

- Individual confidence scores
- Decay calculations
- Prospective Reflection outputs
- Internal domain weights

---

## Explicit Non-Goals

UIP **must not**:

- Diagnose mental states
- Assign personality labels (MBTI, Big Five, etc.)
- Infer sensitive traits (health, politics, religion, sexuality)
- Store raw emotional judgments
- Create exportable psychological profiles
- Enable cross-user pattern matching (even anonymized personality clustering)

---

## Success Criteria

UIP is successful if:

1. OSQR asks **fewer** clarifying questions over time
2. Responses feel increasingly "already aligned" without user explanation
3. Users correct OSQR less frequently
4. OSQR adapts proactively without being asked
5. Users report feeling "understood" without feeling "watched"

---

## Implementation Phases

### Phase 1: Full Core System (V1.5) ← BUILD THIS

**Scope:** Build the entire UIP system. No sub-phasing within features.

**Included:**
- [ ] UIP Prisma schema (all 8 domains)
- [ ] Prospective Reflection Engine (scheduled + event-triggered)
- [ ] Confidence decay logic
- [ ] All Foundation domains (Identity, Goals & Values)
- [ ] All Style domains (Cognitive Processing, Communication Preferences, Expertise Calibration)
- [ ] All Dynamics domains (Behavioral Patterns, Relationship State, Decision Friction)
- [ ] Progressive elicitation system (sessions 2-4, 1 question each, skippable)
- [ ] Basic Behavior Adapters (mode suggestions, verbosity adjustment)
- [ ] Privacy Tier integration (respect A/B/C settings)

**Excluded (V3.0):**
- User-facing UIP summary view
- Manual UIP corrections UI
- Global learning / Tier C aggregation

**Build order:**
1. Prisma schema + migrations
2. UIP service (`lib/uip/`) with CRUD operations
3. Prospective Reflection Engine
4. Elicitation system (question selection + delivery)
5. Behavior Adapters (wire UIP into response generation)
6. Telemetry integration (connect BIL events → UIP updates)

### Phase 2: User Controls (V3.0)
- [ ] User-facing UIP summary view
- [ ] Manual UIP corrections
- [ ] Elicitation optimization based on patterns
- [ ] Global learning integration (Tier C)

---

## Related Documents

- [PRIVACY_TIERS.md](./PRIVACY_TIERS.md) — Privacy tier definitions and enforcement
- [BEHAVIORAL_INTELLIGENCE_LAYER.md](../features/BEHAVIORAL_INTELLIGENCE_LAYER.md) — Telemetry infrastructure
- [KNOWLEDGE_ARCHITECTURE.md](./KNOWLEDGE_ARCHITECTURE.md) — PKV specification
- [OSQR_CONSTITUTION.md](../governance/OSQR_CONSTITUTION.md) — Privacy principles (Part 2.4)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-26 | Initial consolidated spec. Replaces USER_INTELLIGENCE_ARTIFACTS.md |
