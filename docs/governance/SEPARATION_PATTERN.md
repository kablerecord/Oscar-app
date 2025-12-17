# OSQR Design Principle: The Separation Pattern

**Status:** Foundational Design Principle
**Last Updated:** 2025-12-15
**Owner:** Kable Record

---

## The Unlock

OSQR's long-term defensibility comes from a single architectural discipline:

**Core stays neutral. Capability lives in plugins.**

This pattern has been applied twice so far, and should be applied to every future capability decision.

---

## The Pattern

When building a new capability for OSQR, ask:

> "If I bake this into core, do I prevent someone else from building a competing or alternative version?"

If yes → **make it a plugin.**

If no → it can live in core.

---

## Why This Matters

### 1. Platform Neutrality Creates Trust

Users trust OSQR because it's *their* intelligence layer, not Kable's tool that they're borrowing.

The moment OSQR feels like it's pushing a specific methodology, workflow, or approach, users with different needs feel like second-class citizens.

**Core OSQR should feel like infrastructure, not opinion.**

### 2. Creator Competition Drives Quality

If your implementation is the only option, you have no pressure to improve it.

If creators can build competing plugins, the best implementation wins — including yours, if you earn it.

This keeps you honest. It also attracts creators who see a fair marketplace.

### 3. User Choice Builds Loyalty

Users who *choose* your plugin feel ownership. Users who are *forced* into your approach feel trapped.

Opt-in beats default. Every time.

### 4. Pricing Flexibility Enables Growth

When capabilities are plugins:
- Core OSQR can be priced accessibly
- Advanced capabilities can command premium pricing
- Creators can set their own prices
- Bundle deals become possible

When everything is core:
- One price fits all (badly)
- Can't charge more for power users without feeling extractive
- No creator economy

### 5. Clean Product Identity

OSQR is the intelligence layer. Period.

Everything else — coaching methodologies, dev workflows, honesty styles, vertical-specific tools — is a lens applied on top.

Users understand: "OSQR + the plugins I choose = my personalized AI."

That's clearer than: "OSQR, which includes Kable's stuff and also other stuff maybe."

---

## Applications So Far

### Application 1: Fourth Generation Formula

**The temptation:** Bake Kable's coaching methodology into OSQR core. It's good. Users would benefit.

**The problem:**
- OSQR becomes "Kable's coaching tool"
- Other coaches can't compete fairly
- Users who don't want coaching methodology get it anyway

**The decision:** Extract Fourth Generation Formula into a plugin. Kable competes in the marketplace on merit.

**The result:**
- OSQR core is neutral
- Fourth Generation Formula can win on quality
- Dan Martell, Hormozi, or anyone else can build competing plugins
- Users choose their coaching lens (or none)

### Application 2: VS Code Builder Capability

**The temptation:** Bake full autonomous dev workflow into OSQR core. It's the killer feature. It proves the vision.

**The problem:**
- OSQR becomes "Kable's dev tool"
- Other dev workflow plugins can't compete
- Users who want OSQR as thinking partner (not builder) get features they don't need

**The decision:** Split into Core VS Code (basic continuity, shared context) and Builder Plugin (queue system, autonomous mode, project indexing).

**The result:**
- OSQR core VS Code is neutral — just continuity and context
- Builder Plugin can win on quality
- Other creators can build Data Science Mode, Mobile Dev Mode, DevOps Mode
- Users choose their dev workflow (or none)

### Application 3: Honesty Architecture

**The temptation:** Make OSQR maximally honest by default. No sycophancy. Pure truth-telling.

**The problem:**
- Not everyone wants aggressive pushback
- One honesty style doesn't fit all users
- No room for creator innovation on honesty approaches

**The decision:** Three-tier architecture:
- Base OSQR: Mild honesty (cannot be disabled, Constitutional)
- Honesty Plugins: Variable styles (No BS Mode, Devil's Advocate, etc.)
- Supreme Court: Maximum adversarial truth-seeking (earned access)

**The result:**
- Base honesty is non-negotiable but gentle
- Users opt into stronger honesty via plugins
- Creators can build competing honesty styles
- Supreme Court is the ultimate tier, reserved for power users

---

## The Founder Plugin Tension

> **Important:** The best plugins often come from the platform builder.

Kable has deeper context, faster iteration, and no API boundaries. Kable-built plugins will likely outperform competing plugins initially.

This isn't a flaw — but it requires discipline:

1. **Kable-built plugins compete on merit** — No special treatment, no unfair advantages
2. **Kable intentionally leaves categories unoccupied** — Create space for creator innovation
3. **Pricing parity** — Kable plugins priced fairly against marketplace alternatives
4. **No bundling lock-in** — Users can replace Kable plugins with alternatives

The goal: Earn market share, don't inherit it.

---

## The Decision Framework

When evaluating any new OSQR capability:

```
┌─────────────────────────────────────────────────────────────┐
│ NEW CAPABILITY PROPOSAL                                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Question 1: Is this infrastructure or methodology?          │
│                                                             │
│ Infrastructure = how OSQR works (routing, memory, context)  │
│ Methodology = how users should work (frameworks, workflows) │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        Infrastructure              Methodology
              │                         │
              ▼                         ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ Likely belongs in CORE  │  │ Likely belongs in       │
│                         │  │ PLUGIN                  │
│ Examples:               │  │                         │
│ - Multi-model routing   │  │ Examples:               │
│ - PKV/MSC storage       │  │ - Coaching frameworks   │
│ - Conversation memory   │  │ - Dev workflows         │
│ - Privacy tiers         │  │ - Honesty styles        │
│ - Basic VS Code sync    │  │ - Vertical-specific     │
└─────────────────────────┘  │   tools                 │
                             └─────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Question 2: Would baking this in prevent competition?       │
│                                                             │
│ If YES → Definitely make it a plugin                        │
│ If NO → Could still be plugin if it's opinionated           │
└─────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Question 3: Do ALL users need this, or just SOME?           │
│                                                             │
│ ALL users → Consider core (if also infrastructure)          │
│ SOME users → Plugin (let them opt in)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## What Belongs in Core (Examples)

These are infrastructure. They enable plugins but don't compete with them.

- **Constitutional layer** — Governs all behavior
- **Privacy tiers** — User data control
- **Multi-model routing** — Which AI thinks about what
- **PKV / MSC** — Personal knowledge storage
- **Conversation memory** — Context persistence
- **Temporal intelligence** — When things happened
- **Basic honesty** — Mild truth-telling (Constitutional)
- **Basic VS Code extension** — Continuity between interfaces
- **Plugin architecture itself** — How plugins connect

---

## What Belongs in Plugins (Examples)

These are methodologies or opinionated workflows. Users should choose.

- **Coaching frameworks** — Fourth Generation, Buy Back Your Time, etc.
- **Dev workflows** — Builder Mode, Data Science Mode, etc.
- **Honesty styles** — No BS Mode, Devil's Advocate, etc.
- **Vertical tools** — Real estate, fitness, finance-specific
- **Content workflows** — Writing modes, editing styles
- **Productivity systems** — GTD, time blocking, etc.

---

## The Marketplace Implication

Every plugin category is a marketplace opportunity:

| Category | Example Plugins | Creator Opportunity |
|----------|-----------------|---------------------|
| Coaching | Fourth Gen, Martell Method, Hormozi Framework | Coaches monetize methodology |
| Dev Workflow | Builder Mode, Data Science, Mobile Dev | Developers sell expertise |
| Honesty | No BS, Devil's Advocate, Socratic | Coaches/therapists sell approach |
| Vertical | Real Estate Pro, Fitness Coach, Finance Advisor | Industry experts monetize |
| Productivity | Deep Work Mode, GTD System, Time Blocker | Productivity experts monetize |
| Creative | Writer's Voice, Editor's Eye, Story Structure | Writers/editors monetize |
| **App Connectors** | Gmail, Notion, Figma, Slack, Calendar | Extend where OSQR's intelligence reaches |

### The Application Connector Category

Beyond methodologies, plugins become **application connectors** — extending OSQR's intelligence layer into every tool users touch:

| Connector | What It Does |
|-----------|--------------|
| **Gmail Plugin** | Indexes email context, drafts responses in user's voice, surfaces what matters |
| **Notion Plugin** | Connects knowledge base to OSQR, applies user's frameworks to notes |
| **Figma Plugin** | Applies design principles, maintains consistency across projects |
| **Slack Plugin** | Filters noise, escalates important messages, maintains cross-channel context |
| **Calendar Plugin** | Protects time, suggests delegation, optimizes for energy patterns |
| **Browser Plugin** | Indexes research, connects to existing knowledge, surfaces relevance |

Each connector extends where OSQR's persistent memory and judgment can reach. The more connectors, the more valuable the intelligence layer becomes.

**This is how OSQR becomes the operating system — by being the intelligence layer between humans and every application they use.**

**Every category you don't bake into core is a category where creators can build.**

---

## The Long-Term Vision

OSQR in 5 years:

- **Core:** Rock-solid infrastructure. Memory, routing, privacy, context. Boring and reliable.
- **Marketplace:** Thousands of plugins. Every methodology, every workflow, every vertical.
- **Creators:** Making real money. Evangelizing OSQR because their success depends on it.
- **Users:** Custom-configured OSQR that feels like *theirs*. No two users have the same setup.

This only happens if you maintain the separation discipline now.

**Every time you're tempted to bake something into core, remember:**

You're not just adding a feature. You're closing a marketplace category.

---

## Summary

The Separation Pattern is OSQR's architectural moat.

**Core = Infrastructure.** How OSQR works. Neutral. Universal.

**Plugins = Methodology.** How users work. Opinionated. Optional.

Apply this pattern to every capability decision. When in doubt, make it a plugin.

The marketplace you're building depends on the discipline you maintain today.

---

## Related Documents

- [OSQR_CONSTITUTION.md](./OSQR_CONSTITUTION.md) — Immutable principles
- [PLUGIN_ARCHITECTURE.md](../architecture/PLUGIN_ARCHITECTURE.md) — Technical plugin system
- [CREATOR_MARKETPLACE.md](../vision/CREATOR_MARKETPLACE.md) — Marketplace vision
- [VSCODE-DEV-COMPANION.md](../vision/VSCODE-DEV-COMPANION.md) — VS Code Core/Plugin split

---

*Document created: December 2025*
*Status: Foundational design principle — reference for all future architecture decisions*
