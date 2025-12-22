# OSQR Plugin Architecture

**Status:** Strategic Specification (Pre-Implementation)
**Last Updated:** 2025-12-14
**Owner:** Kable Record

This document defines the architectural separation between OSQR Core and Plugins, the plugin permission model, safety boundaries, and platform values. It serves as the constitutional foundation for the plugin ecosystem.

---

## Table of Contents

1. [The Core Separation Principle](#1-the-core-separation-principle)
2. [OSQR Core: What It Is and Isn't](#2-osqr-core-what-it-is-and-isnt)
3. [Plugin Permission Model](#3-plugin-permission-model)
4. [The Founder Plugin: Extracting "Kable" from OSQR](#4-the-founder-plugin-extracting-kable-from-osqr)
5. [Plugin Safety Model](#5-plugin-safety-model)
6. [Platform Values & Eligibility](#6-platform-values--eligibility)
7. [Plugin Consent Contract](#7-plugin-consent-contract)
8. [V1 Minimum Viable Plugin System](#8-v1-minimum-viable-plugin-system)

---

## 1. The Core Separation Principle

### The Defining Rule

> **OSQR may coach on *process*.
> Plugins may coach on *standards*.**

This single rule governs all architectural decisions.

- **Process** = how to think, how to decide, how to reflect, how to improve clarity
- **Standards** = what matters, what's unacceptable, what "good" looks like, what to push for

### Why This Matters

If OSQR Core contains worldview, standards, and pressure:
- Adoption slows (people resist being told what to value)
- Plugin ecosystem dies (nothing meaningful left for plugins to add)
- Platform becomes fragile (controversy attaches to the core)

If OSQR Core is neutral and plugins provide worldview:
- Adoption accelerates (neutral tools are universally useful)
- Plugin ecosystem thrives (plugins become *necessary*, not decorative)
- Platform becomes antifragile (controversy attaches to optional plugins)

### The Mental Model

> **OSQR is Switzerland.
> Plugins are nations.**

Switzerland doesn't take sides, push ideology, or apply pressure. But it hosts, enables, arbitrates, and provides stability.

That's a platform.

---

## 2. OSQR Core: What It Is and Isn't

### OSQR Core IS (Always)

| Capability | Description |
|------------|-------------|
| Question Refinement | Refine → Fire system, clarifying questions |
| Multi-Model Routing | Select right models for question type |
| Synthesis | Combine perspectives into unified answer |
| Pattern Detection | Surface recurring themes, contradictions |
| Memory & Context | PKV, conversation history, cross-referencing |
| Tradeoff Analysis | Present options with honest tradeoffs |
| Progress Visibility | Show what's changed, what's pending |
| Neutral Reflection | "Based on your stated goals..." |

### OSQR Core IS NOT (Never)

| Prohibition | Why |
|-------------|-----|
| Value imposition | "This matters more than that" is plugin territory |
| Pressure application | Urgency, shame, demand belongs to plugins |
| Success definition | What "winning" means is worldview-dependent |
| Sequencing ideology | "You must do X before Y" is doctrine |
| Identity shaping | "You are a builder" is tribal language |
| Character judgment | "You're rationalizing" requires consent |
| Moral framing | Responsibility, legacy, stewardship are lenses |

### The Litmus Test

Ask: **"Would I be comfortable if someone I disagree with used this same logic?"**

- If yes → OSQR Core
- If no → Plugin territory

### OSQR Core Voice

OSQR's default tone should feel like:

> "I'm here. I'm paying attention. Let's think clearly and move forward."

Not:

> "Get your act together."
> "This is the problem with people like you."

That tone belongs to plugins (with consent).

---

## 3. Plugin Permission Model

### The Key Insight

> **Plugins are allowed to do anything OSQR is not.**

OSQR's constraints become the freedom space for creators. The boundary IS the plugin API.

### Permission Mapping

Every OSQR Core constraint automatically unlocks a plugin capability:

| OSQR Core Rule | Plugin Permission Unlocked |
|----------------|---------------------------|
| OSQR does not impose values | Plugins may define value hierarchies |
| OSQR does not apply pressure | Plugins may apply urgency, discipline, demand |
| OSQR does not define success | Plugins may define outcomes and end states |
| OSQR does not enforce sequencing | Plugins may enforce stage-gates and prerequisites |
| OSQR does not shape identity | Plugins may shape identity, language, belonging |
| OSQR does not judge character | Plugins may challenge excuses, call out avoidance |
| OSQR does not assume consent to intensity | Plugins may be intense *because consent is explicit* |

### What This Means for Creators

Creators don't ask: "What am I allowed to change?"
They ask: "How bold do I want to be?"

Plugins can be:
- Demanding
- Narrow
- Opinionated
- Intense
- Tribal
- Philosophical
- Religious
- Confrontational

Because the user **opted in**.

---

## 4. The Founder Plugin: Extracting "Kable" from OSQR

### The Situation

Currently, OSQR contains:
- Kable's philosophy
- Fourth Generation Formula concepts
- Book sequencing and framing
- Specific value judgments
- Identity language ("builders," etc.)
- Pressure and standards

This must be **extracted** and relocated to a plugin.

### What Moves to "Kable Plugin"

Everything that sounds like *you* (Kable) rather than *neutral intelligence*:

**Value Judgments**
- "This matters more than that"
- "Most people get this wrong"
- "This is non-negotiable"
- "Comfort is the enemy"

**Identity Language**
- "Builders"
- "Men who..."
- "Fourth generation thinkers"
- "You are the kind of person who..."

**Standards & Expectations**
- Daily disciplines
- Minimum effort thresholds
- What counts as progress vs excuses
- What failure actually means

**Sequencing Beliefs**
- "You must master X before Y"
- "This stage comes before that one"
- "Skip this and you pay later"

**Moral Framing**
- Responsibility
- Stewardship
- Legacy
- Faith-informed direction

### The Extraction Process

1. **Create two buckets**: "OSQR Global" and "Kable Plugin"
2. **Review all prompts, tone rules, examples, system messages**
3. **Every sentence goes in one bucket** — no "both," no "kind of"
4. **Rewrite OSQR without judgment adjectives** (best, right, wrong, important, should, must)
5. **Make the plugin loud on purpose** — the contrast teaches users what plugins do

### Why This Is Strategic

Your plugin becomes:
- The reference implementation
- The example other creators study
- The proof of what plugins *can* do
- Free for first month → teaches market what plugins are
- When removed, OSQR feels quieter → that contrast sells plugins

---

## 5. Plugin Safety Model

### The Governing Principle

> **OSQR does not police ideas.
> OSQR polices *agency, consent, and deception*.**

Not morality. Not beliefs. Not intensity.
**Agency, consent, deception.**

### What OSQR Will NEVER Police

OSQR does **not** block plugins for:
- Controversial opinions
- Harsh language
- Demanding standards
- Religious views
- Political views
- Extreme discipline frameworks
- "Tough love" coaching
- Philosophies the founder disagrees with

If the user opts in **knowingly**, it's allowed.

### The Four Red Lines (Non-Negotiable)

#### RED LINE 1: Removal of User Agency

Plugins may **not**:
- Override OSQR core responses
- Prevent uninstall
- Hide exit options
- Lock users into loops
- Punish uninstall behavior
- Claim "you can't succeed without me"

**Rule:** *No plugin may make itself psychologically or technically non-optional.*

#### RED LINE 2: Deception or Misrepresentation

Plugins may **not**:
- Impersonate OSQR core
- Hide their tone or intensity
- Misrepresent credentials
- Claim medical, legal, or financial authority they don't have
- Disguise ideology as neutrality

**Rule:** *Intensity must be disclosed up front.*

#### RED LINE 3: Psychological Coercion or Exploitation

Plugins may **not**:
- Induce shame loops
- Frame uninstalling as moral failure
- Use fear-based dependency ("without this you'll collapse")
- Encourage self-harm, harm to others, or isolation
- Exploit mental health vulnerabilities

**Rule:** *Pressure is allowed. Coercion is not.*

Pressure motivates. Coercion removes choice.

#### RED LINE 4: Irreversible Harm or Dangerous Instruction

Plugins may **not**:
- Encourage physical harm
- Provide illegal instructions
- Give medical advice without disclaimers
- Promote violence
- Encourage dangerous acts without safety framing

### Enforcement Model

Plugins are reviewed for **mechanics**, not ideas:
- Clear disclosure
- Exit safety
- No impersonation
- No hidden manipulation
- No irreversible harm

This is compliance checking, not belief checking.

---

## 6. Platform Values & Eligibility

### The Truth

OSQR is **not** a government, public square, or value-neutral infrastructure.

OSQR is:
- A privately built intelligence tool
- Invited into people's inner decision-making
- Designed to shape thought and action over time

This means: **We are morally responsible for what we knowingly allow it to become.**

### The Line

> **OSQR will not host plugins whose core purpose is the promotion, normalization, or practice of belief systems explicitly oriented toward harm, deception, or the rejection of human dignity.**

We are not judging *disagreement*. We are judging *orientation*.

### What Is NOT Banned

- Atheism
- Skepticism
- Criticism of religion
- Secular humanism
- Controversial viewpoints
- Harsh coaching
- Demanding standards

### What IS Banned

Plugins whose *primary function* is to:
- Invert or degrade moral order
- Mock or desecrate sincerely held spiritual belief as a core mechanic
- Promote harm, cruelty, or dehumanization
- Glorify destruction or nihilism
- Erode personal responsibility or human dignity

### Platform Values Statement

> OSQR is designed to help individuals grow in clarity, responsibility, capability, and agency.
>
> While OSQR supports a wide range of perspectives and philosophies, it does not support plugins whose primary intent is:
>
> - The promotion of harm, cruelty, or dehumanization
> - The glorification of destruction, nihilism, or inversion of moral good
> - The mockery or desecration of sincerely held spiritual belief as a core mechanic
> - The erosion of personal responsibility or human dignity
>
> **OSQR is a values-aware platform. Neutrality does not mean emptiness.**

### Why This Is Defensible

If you ever face scrutiny, the defense is clean:
- Users opted in knowingly
- Intensity was disclosed
- Exit was always available
- OSQR core remained neutral
- No deception occurred
- Platform values were stated publicly

---

## 7. Plugin Consent Contract

### The Requirement

Every plugin must declare (before installation):

| Field | Description |
|-------|-------------|
| **Tone** | Neutral / Supportive / Demanding / Confrontational |
| **Domain** | Business, Health, Faith, Identity, Productivity, etc. |
| **Intensity Level** | 1-5 scale |
| **What It WILL Do** | Clear list of behaviors |
| **What It Will NOT Do** | Explicit boundaries |
| **Who Should NOT Install** | Contraindications |

### Example: Kable Plugin Consent Screen

```
⚠️ Fourth Generation Framework

TONE: Demanding
DOMAIN: Identity, Capability, Business
INTENSITY: 4/5

THIS PLUGIN WILL:
• Challenge excuses and rationalizations
• Apply pressure toward stated goals
• Enforce standards and accountability
• Use direct, sometimes uncomfortable language
• Track and reference your commitments

THIS PLUGIN WILL NOT:
• Provide emotional support as primary function
• Accept "I tried" as sufficient
• Let you off the hook easily

WHO SHOULD NOT INSTALL:
• Users seeking validation or emotional support
• Those not ready for direct feedback
• Anyone in acute mental health crisis

You can uninstall at any time. OSQR Core remains available without this plugin.

[Install] [Cancel]
```

### Why This Works

- Abuse is prevented by informed consent
- Lawsuits are prevented by explicit disclosure
- Trust is built by transparency
- Exit is always one click away

---

## 8. V1 Minimum Viable Plugin System

### What V1 Needs (Not a Full Marketplace)

For v1, the plugin system needs:
- Plugin loading
- Plugin identity (name, description, consent screen)
- Plugin influence on behavior
- Plugin on/off toggle

That's it. No ratings, no discovery, no payments (except founder plugin trial).

### V1 Plugin Hooks

OSQR Core exposes controlled insertion points:

| Hook | Description |
|------|-------------|
| **Pre-response** | Plugin can reframe the question |
| **Post-response** | Plugin can add interpretation, pressure, next steps |
| **Memory annotation** | Plugin can tag things as important by its standards |
| **Progress interpretation** | Plugin defines what "progress" means |

### V1 UI (Spartan)

- "Installed Plugins" list in settings
- Toggle on/off per plugin
- One active "Primary Lens" at a time
- Consent screen before first activation

### V1 Strategic Use

- Founder plugin (Fourth Generation Framework) available free for 30 days
- Users experience the difference
- When removed, OSQR feels quieter, less directional
- That contrast creates demand for plugins
- Marketplace becomes necessary, not nice-to-have

---

## Summary: The Plugin Architecture in One Page

**OSQR Core** = Neutral intelligence. How to think. Process coaching. Universal.

**Plugins** = Directional intelligence. What to think toward. Standards coaching. Opt-in.

**The Boundary** = OSQR Core constraints define plugin permissions. The boundary IS the API.

**Safety** = Police agency, consent, deception. Not ideas.

**Values** = Neutrality does not mean emptiness. Some things are incompatible with human flourishing.

**Consent** = Explicit, upfront, removable. Freedom of exit is the protection.

**V1** = Manual plugin slot. Founder plugin as reference. Teach the market what plugins are.

---

## Context from Architecture

### Related Components
- Constitutional Framework — Provides override protection for sacred clauses
- Memory Vault — Allows plugin annotation of memories
- Bubble — Supports plugin prompt injection
- Guidance — Can be influenced by plugin standards
- Safety System — Crisis detection for plugin content

### Architecture References
- See: `docs/governance/OSQR_CONSTITUTION.md` — Constitutional constraints plugins cannot override
- See: `docs/governance/SEPARATION_PATTERN.md` — Core/plugin separation
- See: `docs/architecture/SAFETY_SYSTEM.md` — Crisis handling

### Integration Points
- Receives from: Plugin registry, User consent, Plugin hooks
- Sends to: Response pipeline (hooks), Memory (annotations), Bubble (prompts)

### Tech Stack Constraints
- Plugin loading: Dynamic import
- Hook execution: Pre/post response middleware
- Safety: Constitutional validation on all plugin outputs

---

## Testable Invariants

### Pre-conditions
- User has opted into plugin (consent screen completed)
- Plugin passes safety review

### Post-conditions
- Plugin influence is reflected in response (if applicable)
- User can uninstall at any time

### Invariants
- Plugins cannot override OSQR Core responses
- Plugins cannot prevent uninstall
- Plugins cannot hide their intensity (consent required)
- Plugins cannot access other users' data
- Sacred constitutional clauses cannot be violated by plugins
- Exit is always one click away
- Plugins cannot impersonate OSQR Core
- Red lines (agency, deception, coercion, harm) are enforced

---

## Related Documents

- [ROADMAP.md](../../ROADMAP.md) — Section 0: Strategic Vision
- [SAFETY_SYSTEM.md](SAFETY_SYSTEM.md) — Crisis detection, response playbooks
- [KNOWLEDGE_ARCHITECTURE.md](./KNOWLEDGE_ARCHITECTURE.md) — PKV vs GKVI separation

---

**The sentence to remember:**

> OSQR thinks *with* you.
> Plugins push *on* you.
