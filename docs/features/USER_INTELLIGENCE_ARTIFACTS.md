# User Intelligence Artifacts

> **⚠️ DEPRECATED:** This document has been superseded by [UIP_SPEC.md](../architecture/UIP_SPEC.md).
> The User Intelligence Profile (UIP) specification consolidates this document with additional
> architecture for Privacy Tier integration, confidence decay, and the Prospective Reflection Engine.
> This file is retained for historical reference only.

**Status:** DEPRECATED — See [UIP_SPEC.md](../architecture/UIP_SPEC.md)
**Last Updated:** 2025-12-14
**Deprecated:** 2025-12-26
**Purpose:** Defines the invisible models OSQR maintains about each user

This document describes what OSQR learns and infers about users over time. These artifacts are **never exposed directly** — they exist to make OSQR more helpful without burdening users with self-reporting.

> **Derives from:** [OSQR_CONSTITUTION.md](OSQR_CONSTITUTION.md) — Part 3 (Commitments)

---

## Why This Exists

Users should not have to:
- Explain their context repeatedly
- Maintain complex dashboards
- Report their own progress
- Manage AI memory manually

OSQR builds understanding silently and uses it to be helpful.

---

## Two-Layer Architecture

### What Users See (Minimal)

Users interact with a simple three-part model:

| Surface Element | Purpose |
|-----------------|---------|
| **What I'm Building** | Active projects and goals |
| **What Matters to Me** | Values, priorities, constraints |
| **What I'm Working On** | Current focus and tasks |

This is the PKV (Private Knowledge Vault) — user-controlled, transparent, editable.

### What OSQR Maintains (Invisible)

OSQR silently constructs and maintains internal models:

| Artifact | Description | Updates |
|----------|-------------|---------|
| **User Trajectory Map** | Where they've been, where they're heading | Every session |
| **Decision Backlog** | Decisions mentioned but not made | As detected |
| **Implicit Roadmap** | What they're building toward (inferred) | Weekly synthesis |
| **Capability Profile** | What they can do vs what they struggle with | Ongoing |
| **Question Quality Model** | How they ask questions, improvement patterns | Per question |
| **Phase Detection** | Which stage of the universal path they're in | Per interaction |

Users don't manage these. OSQR builds them and uses them to be helpful.

---

## Artifact Specifications

### 1. User Trajectory Map

**Purpose:** Track direction over time, not just current state

**Contains:**
- Historical goals and outcomes
- Pattern of interests over time
- Repeated themes and obsessions
- Abandoned directions (and why)
- Velocity of progress

**Used for:**
- Contextualizing new questions
- Detecting regression or stagnation
- Recognizing growth
- Avoiding redundant conversations

---

### 2. Decision Backlog

**Purpose:** Surface decisions the user has mentioned but not resolved

**Contains:**
- Decisions explicitly mentioned
- Decisions implied by context
- Duration in backlog
- Apparent blockers
- Priority signals (frequency of mention)

**Used for:**
- Gentle resurfacing at appropriate moments
- Understanding what's causing friction
- Recognizing avoidance patterns
- Tracking follow-through

**Example:**
```
Decision: "Whether to hire a VA"
First mentioned: 2025-10-15
Times mentioned: 4
Last mentioned: 2025-12-01
Apparent blocker: Cost uncertainty
Status: Unresolved
```

---

### 3. Implicit Roadmap

**Purpose:** Infer what the user is building toward, even if they haven't articulated it

**Contains:**
- Long-term direction (inferred)
- Intermediate milestones
- Dependencies between goals
- Gaps between stated and revealed preferences
- Timeline signals

**Used for:**
- Asking better questions
- Connecting current work to larger purpose
- Identifying misalignment between actions and stated goals
- Suggesting next moves

---

### 4. Capability Profile

**Purpose:** Understand what the user can do vs. what they struggle with

**Contains:**
- Demonstrated skills
- Frequently requested help topics
- Areas of rapid improvement
- Persistent gaps
- Learning style indicators

**Used for:**
- Calibrating explanation depth
- Suggesting skill development
- Recognizing capability multiplication opportunities
- Avoiding condescension or over-explanation

---

### 5. Question Quality Model

**Purpose:** Track how the user asks questions and how it changes over time

**Contains:**
- Clarity of questions
- Specificity improvement
- Question type patterns (tactical vs strategic)
- Follow-up patterns
- PowerQuestion frequency

**Used for:**
- Meta-OSQR feedback
- Recognizing growth in thinking quality
- Identifying when to suggest question refinement
- Calibrating response style

---

### 6. Phase Detection

**Purpose:** Recognize which phase of the universal path the user is currently in

**The Universal Path:**
```
Clarity → Confusion → Insight → Action → Resistance → Growth
```

**Detection signals:**

| Phase | Signals |
|-------|---------|
| **Confusion** | Scattered questions, topic-jumping, overwhelm language |
| **Clarity** | Decisive language, specific questions, forward momentum |
| **Effort** | Execution-focused, "how do I" questions, task orientation |
| **Resistance** | Frustration, slowdown, questioning fundamentals |
| **Growth** | Breakthrough language, connecting dots, new capabilities |

**Used for:**
- Phase-appropriate responses (per Constitution Part 5)
- Not pushing when user needs consolidation
- Not coddling when user needs challenge
- Recognizing cycles and celebrating progress

---

## Privacy Guarantees

All User Intelligence Artifacts are governed by the Constitution's privacy principles:

1. **Never sold** — These models are never monetized directly
2. **Never shared** — Artifacts are per-user, never cross-pollinated
3. **Never exposed** — Users see effects, not the models themselves
4. **Always deletable** — Burn-It Button destroys all artifacts
5. **Tier-appropriate** — Privacy Tier A users have minimal inference

---

## How Artifacts Inform Response

OSQR uses these artifacts implicitly, not explicitly. Examples:

### Without Artifacts (Generic)
> "What's the best way to grow my business?"
> → Generic growth advice

### With Artifacts (Contextual)
> "What's the best way to grow my business?"
> → OSQR knows: User is a consultant, has mentioned pricing uncertainty 3x, is in resistance phase, struggles with delegation
> → Response addresses their specific situation without user having to explain

---

## What OSQR Never Does With Artifacts

Per the Constitution:

- Never uses artifacts to manipulate
- Never surfaces artifacts to shame or pressure
- Never treats artifacts as more valid than explicit user statements
- Never automates decisions based on inferred intent
- Never shares artifact-derived insights with third parties

---

## Artifact Maintenance

### Update Frequency

| Artifact | Update Trigger |
|----------|----------------|
| Trajectory Map | End of session synthesis |
| Decision Backlog | Real-time as decisions mentioned |
| Implicit Roadmap | Weekly background synthesis |
| Capability Profile | Per interaction, background refinement |
| Question Quality | Per question |
| Phase Detection | Per message, smoothed over session |

### Decay and Correction

- Old information decays in relevance
- Contradictory new information updates models
- Explicit user corrections override inference
- Users can reset any surface-level elements (PKV)

---

## Relationship to Other Systems

```
User Intelligence Artifacts
         │
         ▼
┌─────────────────────────────┐
│      OSQR Core Engine       │
│ (Routes, synthesizes, responds) │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│         PKV (User-Facing)   │
│    What users see and edit  │
└─────────────────────────────┘
```

Artifacts inform the Core Engine.
PKV is the user-controlled layer.
They complement each other without user burden.

---

## Implementation Notes

### v1 (MVP)
- Basic session context retention
- Question history
- Goal tracking (user-entered)
- Simple phase detection

### v2+
- Full artifact suite
- Cross-session learning
- Implicit roadmap inference
- Capability profiling
- Sophisticated phase detection

---

## Summary

User Intelligence Artifacts are OSQR's internal models of each user. They exist to:

1. **Reduce burden** — Users don't self-report
2. **Increase relevance** — Responses fit context
3. **Enable multiplication** — OSQR meets users where they are
4. **Preserve agency** — Users control visible layer, OSQR infers the rest

These artifacts are invisible infrastructure. Users experience the effects without managing the machinery.

---

## Related Documents

- [OSQR_CONSTITUTION.md](OSQR_CONSTITUTION.md) — Privacy guarantees, agency principles
- [OSQR_PHILOSOPHY.md](OSQR_PHILOSOPHY.md) — Meeting users where they are
- [PRIVACY_TIERS.md](PRIVACY_TIERS.md) — How privacy tiers affect artifact collection
- [KNOWLEDGE_ARCHITECTURE.md](../architecture/KNOWLEDGE_ARCHITECTURE.md) — PKV specification
