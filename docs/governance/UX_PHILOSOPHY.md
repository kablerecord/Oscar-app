# OSQR UX Philosophy

**Status:** Foundational (Layer 2 - Architecture)
**Last Updated:** 2025-12-14
**Purpose:** Defines how OSQR's interface embodies its intelligence philosophy

This document governs all UX decisions. The interface is not separate from the intelligence — it is its visible expression.

> **Derives from:** [OSQR_CONSTITUTION.md](OSQR_CONSTITUTION.md) | [OSQR_PHILOSOPHY.md](OSQR_PHILOSOPHY.md)

---

## Core UX Principle

> **Complexity belongs in the background. Clarity belongs on the surface.**

OSQR's intelligence handles complexity invisibly. The interface should never demand attention unnecessarily.

---

## Part 1: Focus Mode (Cognitive Noise Cancellation)

### 1.1 Concept

Focus Mode is OSQR's primary UX system — designed to reduce cognitive load by visually de-emphasizing features, data, and UI elements that are not relevant to the user's *current moment of focus*.

**Mental model:** Noise-canceling headphones for thinking.

Unlike traditional "hide" or "simplify" modes, Focus Mode:
- Does **not** remove features
- Does **not** lock users out
- Does **not** assume ignorance
- Does **not** flatten power

Instead, it **quietly reduces noise** while preserving awareness and control.

---

### 1.2 The Dimmer Metaphor

Focus Mode behaves like a dimmer switch — gradually reducing cognitive noise without removing context.

A dimmer communicates:
- Nothing disappears
- Nothing breaks
- Control is smooth, not binary
- Calm increases gradually
- You're still in the same room — just quieter

**This is not a toggle. It's an environmental adjustment.**

---

### 1.3 Default Behavior

| Rule | v1 Behavior |
|------|-------------|
| **Default state** | ON for all new users |
| **Persistence** | User's choice persists after first toggle |
| **Explanation** | Covered in onboarding |
| **Override** | User can turn off manually at any time |

OSQR explains during onboarding:
> "I'll reveal things at the right time. You can turn this off whenever you want."

---

### 1.4 What Focus Mode Does

When **Focus Mode is ON**, OSQR:
- Blurs or de-emphasizes non-essential UI elements
- Reduces contrast, saturation, or motion for out-of-scope features
- Keeps all features visible but visually quiet
- Prioritizes the **primary action** (usually: asking a question)

**Nothing disappears. Nothing is deleted. Nothing is blocked.**

---

### 1.5 What Focus Mode Does NOT Do

- Does **not** hide features completely
- Does **not** create hard modals
- Does **not** force workflows
- Does **not** prevent exploration
- Does **not** add configuration burden

---

### 1.6 Visual Treatment

Focus Mode should feel:
- Quiet
- Intentional
- Grounding
- Non-intrusive

**Recommended techniques:**
- Soft blur (not full opacity)
- Reduced saturation
- Lower contrast
- Muted hover states
- Subtle transitions (150-300ms, easing-heavy)

**Avoid:**
- Dark overlays
- Blocking dialogs
- Aggressive animations
- "Locked" visual metaphors

The UI should feel like it *exhales* — settles, stops asking for attention, waits for you.

---

### 1.7 What Gets Blurred (v1)

| Element | Focus Mode Behavior |
|---------|---------------------|
| Input box | Always sharp |
| Current conversation | Always sharp |
| MSC/Progress | Blurred (if exists) |
| Secondary panels | Blurred |
| Navigation | Slightly muted |
| Onboarding prompts | Blurred after completion |
| Suggestions | Blurred unless contextually relevant |

---

### 1.8 Toggle Design

**Placement:** Top-right corner of main input panel (inside the "thinking zone")

**Visual:**
- Single icon (no label by default)
- Low contrast when ON
- Slightly higher contrast when hovered
- Subtly filled or glowing when ON, hollow when OFF

**Icon suggestions:**
- Focus ring (✦)
- Concentric circles (⊙)
- Soft "target" glyph
- NOT an eye, funnel, or gear

**On hover only:**
> "Focus Mode"

**Interaction copy (when explicitly engaged):**
> "Alright — let's get serious. What do you need to focus on right now?"

---

### 1.9 Future Extensions (NOT v1)

These belong in v1.1+ after core Focus Mode is proven:

- **Long-press override panel:** Let users choose what stays sharp
- **Adaptive Focus:** OSQR learns user preferences over time
- **Named focus modes:** Deep Work, Decision, Build, Reflect
- **Graduated intensity:** Light focus → Deep focus

For v1: Focus Mode operates with **simple, deterministic rules** — OSQR decides what blurs.

---

## Part 2: The Three UI States

OSQR's interface adapts based on user context, not configuration.

### State 1: Empty Mind
*(New user, no context, no data)*

Home shows:
- Input box
- One-line guidance
- Maybe 1-2 example questions
- Mode defaults to Quick
- No MSC, no progress, no dashboards
- No temptation

**This protects beginners from themselves.**

---

### State 2: Thinking Mind
*(They've asked real questions, uploaded something, interacted)*

OSQR earns the right to *suggest*:
- "Want to save this insight?"
- "This looks like a recurring goal — track it?"
- "You've asked about this 3 times — want a summary?"

Still:
- No clutter
- No panels screaming for attention
- No empty states begging to be filled

---

### State 3: Builder Mind
*(They're intentional, consistent, capable)*

The system expands **around them**:
- MSC appears because they *created one*
- Progress exists because there *is progress*
- Modes are visible because they *benefit*
- Council Mode appears because they *seek depth*
- Meta-OSQR becomes available because they *value optimization*

**At this point, complexity feels like control, not noise.**

---

## Part 3: Sacred Principles

### 3.1 Home Screen Is Sacred

> **Nothing appears on the home screen unless the user has earned a reason to see it.**

Not "might need." Not "eventually useful." Not "powerful."

**Earned.**

Screen space is not where power lives. Power lives in:
- What OSQR chooses to do
- What OSQR chooses *not* to bother the user with
- When OSQR speaks
- When OSQR stays silent

The home screen is not a dashboard. It's a **threshold**.

---

### 3.2 Progressive Reveal

> **Design the runway, not the flight path.**

- Layer 1: Guidance for beginners (clear buttons, examples, guardrails)
- Layer 2: Flexibility for intermediate users (patterns emerge from use)
- Layer 3: Total freedom for advanced users (power tools unlocked by capability)

OSQR doesn't teach creativity — it exposes it gradually.

---

### 3.3 The Feature Gate Test

Before adding *anything* to the home screen, ask:

> "Would a first-time user feel smarter or more confused by seeing this?"

If the answer isn't "clearly smarter" → it doesn't belong there.

It can:
- Live behind interaction
- Appear contextually
- Unlock later
- Stay invisible forever

**OSQR does not need to advertise its power. It demonstrates it.**

---

### 3.4 Behavior Unlocks Depth

Features unlock by **behavior**, not curiosity.

A Level 2 user might need:
- Guided onboarding
- Templates
- Suggested prompts
- Step-by-step refinements

A Level 6 user will ignore all of that and immediately:
- Upload dozens of files
- Build PKV workflows
- Try to break Contemplate mode
- Use OSQR like a co-founder

**OSQR adapts. Users don't have to.**

---

## Part 4: Anti-Patterns (Hard No's)

These violate OSQR's UX philosophy and must never ship:

| Anti-Pattern | Why It's Wrong |
|--------------|----------------|
| Feature flags exposed to users | Creates configuration burden |
| "Beginner vs Advanced" modes | Forces self-identification |
| Bloated settings pages | Complexity leaking to surface |
| Tooltips that fire immediately | Interrupts thinking |
| Onboarding that explains everything | Overwhelms before value |
| Empty states begging to be filled | Creates dashboard guilt |
| Gear icons everywhere | Death by SaaS |
| Hard modals for non-critical actions | Breaks flow |

---

## Part 5: The Long-Term Payoff

If OSQR holds this line:

- OSQR stays elegant while competitors get bloated
- Power users evangelize because it "gets out of the way"
- Beginners don't churn from overwhelm
- Advanced features feel earned, not forced
- Meta-OSQR naturally trims excess over time
- The product ages like **Unix**, not like enterprise software

---

## Summary Statements

### The North Star

> **OSQR grows in depth without growing in noise.**

### For Internal Use

> OSQR's interface is the visible expression of its intelligence. Complexity belongs in the background. The surface stays calm. Features unlock through use, not curiosity. Focus Mode enforces this at the UX layer.

### The Commitment

> **OSQR grows with the user — it never demands the user grow to match it.**

---

## Related Documents

- [OSQR_CONSTITUTION.md](OSQR_CONSTITUTION.md) — Immutable principles
- [OSQR_PHILOSOPHY.md](OSQR_PHILOSOPHY.md) — Beliefs about growth and capability
- [USER_INTELLIGENCE_ARTIFACTS.md](USER_INTELLIGENCE_ARTIFACTS.md) — How OSQR understands users
- [ROADMAP.md](../../ROADMAP.md) — Implementation phases

---

## Version History

| Date | Change |
|------|--------|
| 2025-12-14 | Initial UX Philosophy document created |
