# OSQR Implementation Roadmap

**Generated from:** OSQR Master Plan (175K characters, 25K words)
**Last updated:** 2025-12-16
**Owner:** Kable Record

This roadmap extracts actionable implementation items from the OSQR Master Plan document, organized by development phase. Each item maps back to specific sections in the master plan.

---

## Section 0: Strategic Vision — Capability → Creation → Commerce

> **Status:** Long-term directional truth. NOT part of v1 implementation.
> **Purpose:** Define OSQR's end-state so near-term builds don't drift.
> **Guiding Principle:** *"We are better together than separate."*

This section captures the strategic north star for OSQR. Reference it when making architectural decisions to ensure short-term wins don't create long-term drift. Implementation begins only after core v1 features are stable and proven.

---

### 0.0 The Governance Stack

> **Full Specs:** [docs/OSQR_CONSTITUTION.md](docs/OSQR_CONSTITUTION.md) | [docs/OSQR_PHILOSOPHY.md](docs/OSQR_PHILOSOPHY.md)

```
Layer 0 — CONSTITUTION (immutable principles)
    │     What OSQR will never do, what it will always do
    │
    ▼
Layer 1 — PHILOSOPHY (detailed beliefs)
    │     How OSQR views growth, effort, imagination, people
    │
    ▼
Layer 2 — ARCHITECTURE (system specs)
    │     How systems work: PKV, routing, plugins, safety
    │
    ▼
Layer 3 — FEATURES (this roadmap)
          What gets built, when, how it shows up
```

**Lower layers cannot contradict higher layers.**

**The Soul (Constitution Summary):**

OSQR is a capability operating system that multiplies people at whatever level they operate. It meets users where they are, supplies imagination where it's lacking, and accelerates capability where it exists.

**What OSQR Will Never Do:**
- Remove user agency or make decisions without consent
- Deceive users about its capabilities
- Promise outcomes it cannot deliver or remove the need for effort
- Sell user data or train on user content without consent
- Shame users or exploit vulnerabilities

**What OSQR Will Always Do:**
- Meet users where they are
- Reduce confusion (not effort)
- Favor capabilities over outcomes
- Reveal, don't perform

**When Users Ask About OSQR:**
> "I multiply whatever you bring. I reduce confusion, not effort. I show what's possible. You decide what to build."

---

### 0.1 The OSQR Thesis

**OSQR** = **O**perating **S**ystem for **Q**uantum **R**easoning

OSQR is not an AI tool. OSQR is a **capability operating system**.

> OSQR exists to transform clarity into capability,
> capability into execution,
> and execution into real-world outcomes (including money).

**The Filter:** If a feature does not:
- Improve judgment
- Reduce friction to execution
- Increase follow-through
- Or compound leverage

…it does not belong.

**The Insight:** A tool is something ready to do work. If we define too heavily how that tool should work, we limit what people can do with it. OSQR provides the capability infrastructure; users and plugin creators define the applications.

### The Intelligence Layer Vision

OSQR is headed toward becoming **the intelligence layer that sits between humans and every application they use**.

**The Problem:**
Every app you use generates context. Your email conversations, your code commits, your Slack messages, your calendar decisions, your browser research — all of it creates understanding that could inform better decisions elsewhere.

Currently, that context dies in each app. Your email doesn't know what you're building in VS Code. Your calendar doesn't know what projects are urgent. Your browser research doesn't connect to your strategic planning.

**The Solution:**
OSQR becomes the persistent memory and judgment layer that makes all your tools smarter *together*.

| Application | Without OSQR | With OSQR Intelligence Layer |
|------------|--------------|------------------------------|
| **VS Code** | AI assists with code | OSQR knows your architecture, decisions, and principles — applies them automatically |
| **Email** | You read, you reply | OSQR surfaces what matters, drafts in your voice, knows your relationships |
| **Calendar** | You schedule manually | OSQR protects your time, suggests delegation, optimizes for energy patterns |
| **Slack/Teams** | You react to everything | OSQR filters noise, escalates what matters, maintains cross-channel context |
| **Browser** | You search, you read | OSQR indexes what you consume, connects to what you know, surfaces relevance |

**Why PKV and MSC Are Foundational:**
They're not just features — they're the foundation of persistent intelligence that spans applications:
- **PKV** stores the context from every application
- **MSC** stores the principles that should guide decisions everywhere
- Together, they create continuity across your entire digital life

**The Marketplace Expansion:**
Plugins aren't just "author methodologies" — they're **application connectors**:
- A Gmail plugin that understands your communication patterns
- A Notion plugin that connects your knowledge base to OSQR
- A Figma plugin that applies your design principles
- A Slack plugin that filters and prioritizes based on your context

Each plugin extends where OSQR's intelligence can reach. The more connectors, the more valuable the intelligence layer becomes.

**This is the "Operating System" in OSQR's name becoming literal.**

---

### 0.2 The Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     OSQR CORE                                    │
│            Formation · Judgment · Clarity                        │
│     (The executive function - decides WHAT should exist)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PLUGINS                                      │
│            Bounded Expertise · Domain Knowledge                  │
│     (Specialists that multiply OSQR, never fragment it)          │
│                   💰 20% Revenue Share                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CREATION LAYER                                 │
│            VS Code · Artifacts · Real Output                     │
│     (Value created inside tools, not chat boxes)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AGENTS                                       │
│            Persistence · Follow-through · Momentum               │
│     (Solve human failures: remembering, finishing, consistency)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DISTRIBUTION                                   │
│            Convert execution into reach                          │
│     ("This should be a thread" / "This needs a landing page")    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MARKETPLACE                                    │
│            Outcomes as building blocks                           │
│     (Not a plugin store - an OUTCOME store)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   META-OSQR                                      │
│            Self-audit · Prevent bloat · Preserve elegance        │
│     ("The best part is no part" applied inward)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 0.3 OSQR Core (Non-Negotiable)

**Role:** Formation · Judgment · Clarity
**What it is:** The executive function of the system

**Core Responsibilities:**
- Question refinement (Refine → Fire)
- Priority ordering
- Constraint identification
- Tradeoff reasoning
- Synthesis across perspectives
- Final judgment

**What Core Does NOT Do:**
- Execute tasks (that's Agents)
- Write large volumes of code (that's Creation Layer)
- Market products (that's Distribution)
- Automate blindly (that's dangerous)

> OSQR Core decides *what should exist* — never *how everything is done*.
> This preserves trust and prevents runaway autonomy.

---

### 0.4 Plugin Marketplace (The 20% Model)

**The Insight:** Monetize knowledge by allowing users to create plugins for their expertise. Share the wealth to accelerate adoption.

**Revenue Model:**
- Plugin creators keep **80%** of revenue
- OSQR takes **20%** platform fee
- This attracts more creators → more plugins → more users → compounds growth

**Why 20%:**
- 100% to creators = no sustainable platform
- 60% to OSQR = resentment, slower adoption
- 20% to OSQR = appreciated, accelerates network effects

**Plugin Characteristics:**
- Narrow scope (specialists, not generalists)
- Explicit boundaries
- Opinionated within domain
- Cannot override OSQR Core judgment
- Can recommend, execute, or simulate outcomes

**Example Plugins:**
- Dan Martell's coaching methodology
- Pricing Strategy Plugin
- Go-To-Market Plugin
- Security / Compliance Plugin
- Fitness / Health Plugin
- Theology / Philosophy Plugin
- Hormozi-style acquisition plugins

**Safety & Governance:**
- Plugin Constitution (allowed / disallowed domains) — see [docs/PLUGIN_ARCHITECTURE.md](docs/PLUGIN_ARCHITECTURE.md)
- Screening & approval process
- Tiered permissions (advise vs execute)
- No hidden autonomy

> Plugins multiply OSQR — they never fragment it.

---

### 0.4.1 OSQR Core vs Plugin Separation

> **Full Spec:** [docs/PLUGIN_ARCHITECTURE.md](docs/PLUGIN_ARCHITECTURE.md)

**The Defining Rule:**

> OSQR may coach on *process*.
> Plugins may coach on *standards*.

**OSQR Core (Neutral, Universal):**
- Question refinement, synthesis, tradeoff analysis
- Memory, context, pattern detection
- "Here are the options" / "Based on your stated goals..."
- Does NOT impose values, apply pressure, or define success

**Plugins (Directional, Opt-in):**
- Value hierarchies, standards, expectations
- Pressure, urgency, accountability
- Identity language, worldview, philosophy
- Can be demanding, narrow, intense — because user consented

**The Permission Model:**

Every OSQR Core constraint unlocks a plugin capability:

| OSQR Core Rule | Plugin Permission |
|----------------|-------------------|
| Does not impose values | May define value hierarchies |
| Does not apply pressure | May be demanding, urgent |
| Does not define success | May define outcomes |
| Does not shape identity | May use tribal language |
| Does not judge character | May call out avoidance |

**The Founder Plugin:**

Kable's philosophy, Fourth Generation Formula, and book content must be **extracted** from OSQR Core and relocated to a plugin. This:
- Keeps OSQR universally useful
- Makes plugins necessary (not decorative)
- Serves as reference implementation for other creators
- Free 30-day trial teaches market what plugins can do

---

### 0.4.2 Plugin Safety & Platform Values

> **Full Spec:** [docs/PLUGIN_ARCHITECTURE.md](docs/PLUGIN_ARCHITECTURE.md)

**Safety Model:**

> OSQR does not police ideas. OSQR polices *agency, consent, and deception*.

**The Four Red Lines:**

1. **Removal of Agency** — No plugin may make itself non-optional
2. **Deception** — Intensity must be disclosed upfront
3. **Psychological Coercion** — Pressure is allowed; coercion is not
4. **Irreversible Harm** — No dangerous instructions

**Platform Values:**

OSQR is a values-aware platform. Neutrality does not mean emptiness.

OSQR will **not** host plugins whose core purpose is:
- Promotion of harm, cruelty, or dehumanization
- Glorification of destruction or nihilism
- Mockery of sincerely held spiritual belief as a core mechanic
- Erosion of personal responsibility or human dignity

**Plugin Consent Contract:**

Every plugin must declare before installation:
- Tone (neutral → confrontational)
- Domain and intensity level
- What it WILL and WILL NOT do
- Who should NOT install it

Freedom of exit is the protection.

---

### 0.4.3 Creator Plugin Operations

> **Full Spec:** [docs/CREATOR_MARKETPLACE.md](docs/CREATOR_MARKETPLACE.md)

**What a Plugin IS:**

> A **Judgment Profile** that temporarily changes how OSQR thinks.

Users don't buy content — they **borrow expert judgment**.

**Plugin Quality Gate (3-of-6 Rule):**

Every marketplace plugin must change at least 3 of these dimensions:

| Dimension | What Changes |
|-----------|--------------|
| Attention | What OSQR notices/ignores |
| Questions | What OSQR asks |
| Judgment | Pushback strength, decisiveness |
| Option Space | How aggressively choices are pruned |
| Standards | What is unacceptable |
| Outcome Bias | Speed vs polish, learning vs execution |

**Creator Onboarding:**

Conversation-first. No portals, no forms.

Entry question: *"What decision do people come to you for?"*

OSQR interviews creators into existence by extracting:
- Priority hierarchies
- Non-negotiable rules
- Edge case handling
- Completion thresholds

**Creator Tiers:**

| Tier | Access |
|------|--------|
| Creator Mode | Private plugins, testing |
| Marketplace Candidate | Can submit for listing (60-90 day account age) |
| Verified Creator | Premium placement, proven results |

**Plugin Council Mode (v1.5+):**

Multiple plugins can be invoked for comparison — but only explicitly:
- "Compare how Martell and Hormozi would approach this"
- OSQR preserves each perspective, then reasons about disagreement
- Forces choice or proposes synthesis
- Never averages opinions

---

### 0.5 Marketplace as Outcome Store

**Key Distinction:** The marketplace is NOT a plugin store. It is an **outcome store**.

Users don't buy tools — they buy results:
- "Launch a SaaS"
- "Get first 10 customers"
- "Price this correctly"
- "Automate my workflow"
- "Turn idea into revenue"

**Each outcome bundle includes:**
- OSQR Core guidance
- Required plugins
- Optional agents
- Proven execution path
- Guardrails
- Success patterns

**Compounding Effect:**
- Builders succeed → tell others
- Creators earn → promote OSQR
- OSQR improves → outcomes improve
- Moat deepens organically

> If people make real money with OSQR, leaving becomes irrational.

---

### 0.6 The Flywheel

```
Clarity
  ↓
Capability
  ↓
Creation
  ↓
Execution
  ↓
Distribution
  ↓
Revenue
  ↓
More Builders
  ↓
Stronger OSQR
  ↓
(back to Clarity)
```

OSQR grows **by making others powerful**.

This is:
- Morally aligned
- Strategically unstoppable
- Historically proven (AWS, Shopify, App Store)

---

### 0.7 Agents & Persistence Layer

**Role:** Consistency · Follow-through · Momentum

Humans fail at:
- Remembering
- Finishing
- Loop-closing
- Consistency

Agents exist to solve *that* — not creativity.

**Agent Behaviors:**
- Monitor dropped threads
- Execute obvious next steps
- Maintain state across time
- Batch questions instead of interrupting
- Work asynchronously

**Guardrails:**
- No silent irreversible actions
- Explicit autonomy levels
- Logged assumptions
- Human-in-the-loop checkpoints

> Intelligence without persistence is wasted.
> Agents turn insight into motion.

---

### 0.8 Distribution Intelligence

**Role:** Convert execution into reach

Creation without distribution is a dead end.

**Distribution Intelligence Knows:**
- What is being built
- The audience
- Proven channels
- Format fit (post, page, demo, email, integration)

**Example Suggestions:**
- "This should be a thread"
- "This needs a landing page"
- "This wants a demo video"
- "This maps to a cold email"
- "This should be an integration listing"

**Important Rule:**
> OSQR does NOT spam.
> It removes friction from *intentional* distribution.

---

### 0.9 Constitutional Non-Goals

OSQR will **NOT**:
- Replace human judgment
- Become fully autonomous by default
- Be a generic "AI app"
- Optimize for engagement over outcomes
- Sell user data
- Compete with creators it empowers

These are *constitutional constraints* — not features to add later, but principles that define what OSQR refuses to become.

---

### 0.10 Implementation Guidance

**Do not build Section 0 now.**

Instead:
- Use this section as a **north star**
- Sanity-check every new feature against it
- Prevent short-term wins from creating long-term drift
- Let v1/v2 earn the right to exist before this vision activates

**The Sentence to Remember:**
> OSQR becomes more by helping others build, earn, and succeed —
> not by trying to do everything itself.

---

## Strategic Development Philosophy

> **See:** [docs/strategy/DEVELOPMENT-PHILOSOPHY.md](docs/strategy/DEVELOPMENT-PHILOSOPHY.md)

This roadmap defines **WHAT** to build. The Development Philosophy document defines **HOW** we build it:

- Documentation-first development approach
- Version sequencing (v1.0 → v2.0 → v3.0+)
- VoiceQuote demonstration strategy
- Competitive positioning
- Success metrics framework
- Timeline targets

---

## Quick Reference: What's Built vs What's Planned

### Already Implemented
- [x] Multi-model support (Claude + GPT-4)
- [x] Panel Mode with synthesis
- [x] Personal Knowledge Vault (PKV) with vector embeddings
- [x] File indexing (PDF, DOCX, TXT, JSON)
- [x] Semantic search across indexed documents
- [x] Chat memory and history
- [x] User authentication (NextAuth)
- [x] Basic onboarding flow
- [x] Privacy tiers concept (A/B/C)
- [x] Automatic conversation indexing

### Specified (Ready to Build)
- [ ] Safety System (crisis detection, response playbooks) — [docs/SAFETY_SYSTEM.md](docs/SAFETY_SYSTEM.md)
- [ ] Global Knowledge Index (GKVI) — [docs/KNOWLEDGE_ARCHITECTURE.md](docs/KNOWLEDGE_ARCHITECTURE.md)

### Version Roadmap Summary

| Version | Focus | Key Deliverables |
|---------|-------|------------------|
| **V1.0** | Core OSQR | Web app, PKV, multi-model routing, Refine→Fire |
| **V1.5** | Plugin Foundations + Intelligence | Plugin architecture, TIL, Proactive Insights, Cognitive Profiles, Fourth Gen extraction |
| **V2.0** | Creator Marketplace | Marketplace launch, creator onboarding, plugin ecosystem |
| **V3.0** | VS Code OSQR | Full VS Code extension, Builder Plugin, Queue System |
| **V4.0** | Privacy Phone | OSQR-native phone, intelligence utility model, US manufacturing |
| **V5.0** | Robotics Integration | OSQR intelligence layer for robotics/automation |

### Phase 1: Foundation (V1.0)
### Phase 2: Core Experience (V1.0 → V1.5)
### Phase 3: Intelligence Layer (V1.5)
### Phase 4: Advanced Features (V1.5)
### Phase 5: OS-Level Features (V1.5)
### Phase 6: Meta-OSQR Mode (V1.5)
### Phase 7: Creator Marketplace (V2.0)
### Phase 8: VS Code OSQR (V3.0)
### Phase 9: Privacy Phone (V4.0)
### Phase 10: Robotics Integration (V5.0)

---

## Phase 1: Foundation Enhancement
*Focus: Solidify core experience, rebrand to OSQR, complete essential features*

### 1.1 Branding & Identity
- [x] **Rename Oscar → OSQR** across documentation and UI copy
  - [x] Update UI copy and branding
  - [ ] Update API route naming conventions (deferred - would break existing calls)
  - *Master Plan: Part 1A - Naming*
  - *Note: Internal routes kept as `/api/oscar/` per AUTONOMOUS-GUIDELINES.md*

### 1.2 Refine → Fire System (Master Plan: Part 2A.3) ✅ COMPLETE
Implemented:
- [x] **Two-stage thinking process UI**
  - "Refine" stage: Help user clarify question
  - "Fire" button: Triggers multi-model panel
- [x] **Visual state changes** between modes (amber for refining, green for ready)
- [x] **Question refinement suggestions** before firing
- [x] **Clarifying questions** - OSQR asks follow-ups before firing
- [x] **Editable refined question** - user can tweak before firing

### 1.3 Three Response Modes (Master Plan: Part 2A.4) ✅ COMPLETE
Implemented:
- [x] **Quick Mode** - Single fast model, immediate response (~5-10s)
- [x] **Thoughtful Mode** - Panel + synthesis (default, ~20-40s)
- [x] **Contemplate Mode** - Extended multi-round + deep synthesis (~60-90s)
- [x] **Mode selector UI** in chat interface (Quick/Thoughtful/Contemplate buttons)
- [x] **Mode badge** on responses showing which mode was used
- [x] **Auto-suggest mode** based on question complexity (analyzes patterns, word count)

### 1.3.1 "See What Another AI Thinks" Button ✅ COMPLETE
*A brilliant Quick Mode enhancement that adds panel-like feel without full Contemplate compute*

**How it works:**
- In Quick Mode, display: 🔘 "See what another AI thinks"
- When pressed, OSQR sends the same refined question to another model
- Shows alternate answer side-by-side
- Labels clearly (Claude, GPT-4, GPT-4o)
- Synthesizes: "Here's where they agree / disagree"

**Implementation:**
- [x] **Add "See another perspective" button** to Quick Mode responses only
- [x] **Auto-select model** - randomly picks GPT-4, GPT-4o, or Claude
- [x] **Inline view** - shows alternate response below original
- [x] **Model attribution badges** - clear labeling of which AI said what
- [x] **Model selector dropdown** - let user pick which AI to compare
- [x] **Side-by-side comparison view** - toggle to show original + alternate response
- [x] **Agreement/disagreement synthesis** - automatic comparison with bullet points

**Why this is genius:**
- Low compute cost (single additional API call)
- High perceived intelligence
- Huge UX delight moment
- Creates trust ("OSQR isn't just one voice—he checks others")
- Perfect upsell to Pro/Master tiers
- Perfect viral feature (users will screenshot differences)
- Gives incremental panel diversity without full Contemplate Mode

### 1.4 File Upload Enhancement (Master Plan: Part 2B.3) ✅ MOSTLY COMPLETE
Implemented:
- [x] **PDF, TXT, JSON, DOCX support** - All working in web upload API
- [x] **Mammoth extraction** for DOCX files
- [x] **Summary generation** after upload (AI-generated summary + suggested questions)
Remaining (nice-to-have):
- [ ] **Progress indicators** for large file indexing
- [ ] **Chunking feedback** - show user how many chunks created

### 1.5 Onboarding Polish (Master Plan: Part 2F.2) ✅ COMPLETE
Implemented:
- [x] **Zero-overwhelm onboarding** - Step-by-step modal flow
- [x] **"Magic moment" engineering** - 5 magic moments (Upload, Ask, Debate, Remember, Organize)
- [x] **Skip options** - "Skip for now" button on all steps after welcome
- [x] **Progress indicator** - Gradient progress bar showing current step
- [x] **Privacy info modal** - Explains data privacy during upload step
- [x] **AI-powered features** - Generates summaries, suggested questions, panel debate synthesis

### 1.6 Capability Ladder Assessment ✅ COMPLETE
*Foundation for OSQR's identity engine - determines how OSQR sees and serves each user*
- [x] **Capability Level field** - Added to Workspace model (0-12 scale)
- [x] **Level Assessment Questions** - 6 quick onboarding questions for initial placement
- [x] **Display current level** - CapabilityBadge in TopBar
- [x] **Level-appropriate welcome message** after assessment (Foundation/Operator/Creator/Architect stages)

### 1.7 Safety System ⭐ NEW
*Protecting users while preserving privacy, agency, and trust*

> **Full Spec:** [docs/SAFETY_SYSTEM.md](docs/SAFETY_SYSTEM.md)

**Design Principles:**
- Rely on model-level safety (Claude/GPT already decline harmful requests)
- Wrap refusals in OSQR's voice (maintain personality)
- Crisis requires empathy, not refusal (different response for self-harm)
- Don't over-filter (OSQR should be useful, not paranoid)
- Respect privacy (crisis content never stored)

**Phase 1.7a: Alpha (Must Have)**
- [ ] **Crisis Detection** — Pattern-based detection for self-harm signals
- [ ] **Crisis Response Template** — Empathetic response + resources (988, findahelpline.com)
- [ ] **Refusal Wrapper** — Wrap model refusals in OSQR voice
- [ ] **Storage Filter** — Skip storage for flagged crisis content
- [ ] **Integration** — Wire into `/api/oscar/ask` endpoint

**Phase 1.7b: Beta (Should Have)**
- [ ] **Graduated Disclaimers** — Soft/strong caveats for medical/legal/financial topics
- [ ] **Context-Aware Classification** — Use PKV to inform intent
- [ ] **User Feedback Loop** — "Was this too cautious?" to tune false positives

**Phase 1.7c: Future (Nice to Have)**
- [ ] **Session Memory** — Don't repeatedly flag same user
- [ ] **Professional Context** — Recognize nurses, therapists, researchers
- [ ] **Fiction Detection** — "My character wants to..." context

**Technical Implementation:**
```
lib/safety/
├── index.ts              # Main exports + SafetyMiddleware
├── CrisisDetector.ts     # Crisis pattern detection
├── ResponsePlaybooks.ts  # Crisis response, refusal wrapper, disclaimers
├── SafetyWrapper.ts      # Wrap model refusals in OSQR voice
└── types.ts              # Type definitions
```

**Why This Matters:**
- Protects vulnerable users without being authoritarian
- Legal protection for OSQR
- Builds trust ("OSQR cares about me")
- Aligns with privacy philosophy (crisis content never stored)

### 1.8 Global Knowledge Index (GKVI)
*OSQR's "global brain" — shared frameworks that make OSQR behave consistently*

> **Full Spec:** [docs/KNOWLEDGE_ARCHITECTURE.md](docs/KNOWLEDGE_ARCHITECTURE.md)

**The Two-Brain Model:**
- **Global Knowledge Index (GKVI)** — Shared by all users (frameworks, modes, coaching)
- **Private Knowledge Vault (PKV)** — Per-user, isolated, never shared

**The Golden Rule:**
> "If it teaches OSQR how to BE OSQR, it's global."
> "If it teaches OSQR about YOU, it's private."

**Phase 1.8a: Alpha (Must Have)**
- [ ] **Capability Ladder** - All 13 levels indexed
- [ ] **Mode definitions** - Quick, Thoughtful, Contemplate
- [ ] **Refine → Fire process** - How OSQR handles questions
- [ ] **Basic coaching tone** - Guidelines for OSQR's voice

**Phase 1.8b: Beta (Should Have)**
- [ ] **Fourth Generation Formula** - Identity → Capability → Action → Persistence
- [ ] **Core Commitments** - Universal habit framework
- [ ] **MSC structure** - Goals, Projects, Habits categories
- [ ] **Level-appropriate communication** - Tone by capability level

**Phase 1.8c: Founding Users (Nice to Have)**
- [ ] **Foundational Truths** - Mindset principles
- [ ] **Advanced coaching guidelines** - Deep coaching patterns
- [ ] **Identity script templates** - Example identity statements
- [ ] **Book recommendations per level** - Reading by capability

**Technical Implementation:**
```typescript
// Location: lib/knowledge/global-index.ts
interface GlobalKnowledgeIndex {
  frameworks: { capabilityLadder, fourthGenFormula, coreCommitments }
  system: { modes, refineFire, panelLogic, mscStructure }
  coaching: { toneGuidelines, levelAppropriateComms }
}

// Documents with workspaceId: null are global
// Query routing pulls from GKVI + user's PKV, never mixing users
```

**Why This Matters:**
- Makes OSQR behavior consistent across all users
- Enables "OSQR-style" coaching using your frameworks
- Differentiates OSQR from generic ChatGPT/Claude
- Users get your system delivered by superintelligence

---

## Phase 2: Core Experience Enhancement
*Focus: Memory systems, profile building, personalization*

### 2.1 User Profile Builder (Master Plan: Part 2C)
Current: Basic profile questions
Needed:
- [ ] **Profile categories system**
  - Work/Career
  - Goals/Aspirations
  - Communication preferences
  - Knowledge domains
  - Values/Principles
- [ ] **Pop-up questions during conversations** (non-intrusive)
- [ ] **Profile summary view** - what OSQR knows about you
- [ ] **Edit/correct profile entries**

### 2.2 Memory System Architecture (Master Plan: Part 2D)
Current: Chat history + indexed documents
Needed:
- [ ] **Working Memory** - current session context
- [ ] **Dialogue Memory** - cross-session context
- [ ] **Long-Term Memory** - PKV integration
- [ ] **Preference Memory** - user settings + patterns
- [ ] **Framework Memory** - user's philosophies embedded in OSQR

### 2.3 Master Summary Checklist (Master Plan: Part 2D.8)
Current: Not implemented
Needed:
- [ ] **Auto-generated summary** of user's:
  - Active projects
  - Current goals
  - Key commitments
  - Important relationships
  - Recurring patterns
- [ ] **Weekly refresh** of summary
- [ ] **User can pin/unpin items**
- [ ] **Shareable summary card**

### 2.4 OSQR Personality Engine (Master Plan: Part 2C.5)
Current: Basic system prompts
Needed:
- [ ] **Adjustable personality traits**
  - Formal ↔ Casual
  - Concise ↔ Detailed
  - Encouraging ↔ Direct
- [ ] **Learn from user feedback** (thumbs up/down)
- [ ] **Domain-specific voice** (business vs personal)

### 2.4.1 User Settings & Model Preferences ✅ IN PROGRESS
*Let users customize their OSQR experience*

**Implemented:**
- [x] **Claude as default synthesizer** - Claude is now the "voice" of OSQR (Dec 2024)
- [x] **UserSetting model** - Database schema ready for key/value settings

**Planned:**
- [ ] **Synthesizer model selection** - Let users choose Claude, GPT-4, or others as OSQR's voice
- [ ] **Settings API endpoints** - GET/PUT /api/settings for user preferences
- [ ] **Settings UI page** - /settings route with preference controls
- [ ] **Panel composition preferences** - Let power users customize which models are on their panel

**Technical Notes:**
```typescript
// Available settings keys
type SettingKey =
  | 'synthesizer_model'    // 'claude-sonnet-4-20250514' | 'gpt-4-turbo' | etc.
  | 'panel_composition'    // { strategic: 'claude', technical: 'gpt-4', ... }
  | 'response_style'       // 'concise' | 'detailed' | 'balanced'
  | 'default_mode'         // 'quick' | 'thoughtful' | 'contemplate'

// Default synthesizer is Claude (changed Dec 2024)
const DEFAULT_SYNTHESIZER = 'claude-sonnet-4-20250514'
```

**Why this matters:**
- Power users want control over their AI experience
- Some users may prefer GPT-4's style for certain work
- Future-proofs for new models (Claude 4, GPT-5, etc.)
- Natural upsell feature for Pro/Master tiers

### 2.5 Capability Ladder - Level-Based Personalization (NEW)
*Extend Capability Ladder into core experience*
- [ ] **Level-appropriate prompts** - Tone matches user's developmental level
- [ ] **Book recommendations engine** - Automatic per-level suggestions
- [ ] **Habit prescriptions** - Core Commitments mapped to capability levels
- [ ] **Dynamic difficulty** - Challenge advanced users, support beginners
- [ ] **Level scoring signals** - Detect level from conversation patterns

### 2.6 Wellness Check Memory Layer (NEW)
*Track physical/mental state over time for pattern recognition*

**Concept:** OSQR occasionally asks "How are you feeling?" and tracks energy, mood, focus, and symptoms over time. After sufficient data, surfaces correlations and insights.

**Implementation:**
- [ ] **WellnessEntry model** - Store daily/periodic check-ins
  - Energy level (1-5 or descriptive)
  - Mood state
  - Focus quality
  - Symptoms/notes (freeform)
  - Context (what's happening)
- [ ] **Conversational check-in** - Natural prompt in main chat (optional, can be disabled)
- [ ] **Pattern detection** - After 14+ entries, identify:
  - Day-of-week patterns ("You're tired on Mondays")
  - Correlation with work patterns
  - Symptom clusters
- [ ] **Weekly wellness summary** - Optional digest of trends
- [ ] **Integration with Capability Ladder** - Physical state impacts performance
- [ ] **Fourth Gen tie-in** - "Your energy dips when you skip morning routine"

**Why this matters:**
- Builds deep trust ("OSQR actually knows me")
- Unique differentiator vs other AI assistants
- Pattern data is gold for personalization
- Natural upsell to Pro tier (detailed analytics)

**Technical Schema:**
```
WellnessEntry {
  id String
  workspaceId String
  date DateTime
  energy Int? // 1-5
  mood String? // good, stressed, anxious, calm, etc.
  focus String? // sharp, scattered, tired
  symptoms String? // freeform notes
  context String? // what's happening
  createdAt DateTime
}
```

---

## Phase 3: Intelligence Layer
*Focus: Proactive features, pattern recognition, cross-referencing, behavioral learning*

### 3.0 Behavioral Intelligence Layer ⭐ NEW

> **Full Spec:** [docs/BEHAVIORAL_INTELLIGENCE_LAYER.md](docs/BEHAVIORAL_INTELLIGENCE_LAYER.md)

**Purpose:** Enable OSQR to learn from user behavior (not content) and improve over time.

**Components:**
- [ ] **TelemetryCollector** - Captures behavioral events (mode selections, feature usage, feedback)
- [ ] **PatternAggregator** - Transforms events into meaningful patterns
- [ ] **UserBehaviorModel** - Per-user behavioral profile for personalization
- [ ] **PrivacyTierManager** - Enforces A/B/C privacy tier consent

**Privacy Tiers:**
- **Tier A (Default):** Local only, minimal telemetry
- **Tier B (Opt-in):** Personal learning, OSQR adapts to user
- **Tier C (Opt-in+):** Global learning, helps improve OSQR for everyone

**What OSQR Learns:**
- Mode preferences per question type
- Feature usage patterns
- Response satisfaction signals
- Optimal UI personalization

**What OSQR NEVER Sees:**
- Document contents
- Chat message text
- PKV data
- Personal information

**Implementation Status:**
- [x] Architecture documented
- [x] Telemetry spec defined (see [docs/TELEMETRY_SPEC.md](docs/TELEMETRY_SPEC.md))
- [x] Privacy tiers defined (see [docs/PRIVACY_TIERS.md](docs/PRIVACY_TIERS.md))
- [ ] Stub files created
- [ ] Database schema
- [ ] Event collection
- [ ] Pattern aggregation
- [ ] User behavior models
- [ ] Privacy settings UI

### 3.1 Cross-Referencing Engine (Master Plan: Part 2B.5)
Current: Basic semantic search
Needed:
- [ ] **Connect dots across documents** automatically
- [ ] **Surface contradictions** between indexed content
- [ ] **"You mentioned X in Y document"** callbacks
- [ ] **Knowledge graph visualization** (future)

### 3.2 Memory-Based Features (Master Plan: Part 2B.14-16)
- [ ] **Memory-Informed Query Refinement**
  - Use past context to improve current question
- [ ] **Memory-Based Proactive Warnings**
  - Alert user to conflicts/risks based on history
- [ ] **Memory-Based Pattern Recognition**
  - Surface recurring themes/concerns

### 3.3 Model Personality Tagging & Registry (Master Plan: Part 2A.6) ✅ FOUNDATION COMPLETE

> **Full Spec:** [docs/features/MULTI-MODEL-ARCHITECTURE.md](docs/features/MULTI-MODEL-ARCHITECTURE.md)

**Status:** Model Registry with personalities implemented in `lib/ai/model-router.ts`

**What's Built:**
- [x] **MODEL_REGISTRY** - Single source of truth for all models
- [x] **Capability scoring** (0-10 scale): reasoning, creativity, coding, speed, accuracy, nuance
- [x] **Cost profiles**: cheap, medium, expensive
- [x] **Model personalities** with codenames, descriptions, strengths, communication styles
- [x] **Council Mode flags** - which models can appear in visible multi-chat

**Model Personality Atlas (Council Mode):**

| Model | Codename | Personality |
|-------|----------|-------------|
| Claude Opus 4 | The Philosopher | Calm, cautious, deeply logical, extremely reliable |
| Claude Sonnet 4 | The Balanced Thinker | Excellent all-rounder with strong creative and analytical abilities |
| Claude 3.5 Sonnet | The Empath | Strong emotional intelligence with excellent creative abilities |
| GPT-4o | The Creator | Great at everything: writing, coding, brainstorming, structure |
| Gemini 2.0 Pro | The Engineer | Excellent multimodality, STEM reasoning + code analysis |
| Grok 2 | The Maverick | Fast, witty, contrarian, great for real-time stuff |
| Mistral Large | The Prodigy | High-quality reasoning with European safety standards |
| Llama 3.1 | The Workhorse | Close to GPT-4 performance with fully open-source access |

**Remaining Work:**
- [ ] **Visual differentiation** in panel view (model badges, colors)
- [ ] **User-customizable names** - let users rename models
- [ ] **Personality display** in Council Mode UI
- [ ] **Provider expansion** - integrate Gemini, Grok, Mistral (see 3.3.1)

### 3.3.1 Provider Expansion (Multi-Model Integration)

**Current Providers (Integrated):**
- [x] Anthropic (Claude) - Full integration
- [x] OpenAI (GPT) - Full integration

**Future Providers (Registry Ready, Adapters Needed):**
- [ ] **Google (Gemini)** - Build `GoogleClient` adapter
  - Models: Gemini 2.0 Pro, Gemini 2.0 Flash
  - Priority: HIGH - long context, multimodal, strong STEM
- [ ] **xAI (Grok)** - Build `XAIClient` adapter
  - Models: Grok 2, Grok 2.5
  - Priority: MEDIUM - real-time knowledge, contrarian perspective
- [ ] **Mistral** - Build `MistralClient` adapter
  - Models: Mistral Large, Mixtral
  - Priority: MEDIUM - efficient, good coding, multilingual
- [ ] **Meta (Llama)** - Build `LlamaClient` adapter (self-hosted or via API)
  - Models: Llama 3.1 70B/405B
  - Priority: LOW - requires infrastructure for self-hosting

**Implementation Pattern:**
```typescript
// Each provider adapter implements the same interface:
interface ProviderClient {
  chat(params: {
    model: string
    messages: Message[]
    maxTokens?: number
    temperature?: number
  }): Promise<{ content: string; tokensUsed: number }>
}
```

**When to Enable:**
- Flip `enabled: true` in MODEL_REGISTRY
- Add API key to environment
- Provider adapter handles the rest

### 3.4 Oscar Synthesis Engine Enhancement (Master Plan: Part 2A.7)
Current: Basic synthesis prompt
Needed:
- [ ] **Weighted synthesis** based on question type
- [ ] **Highlight disagreements** between models
- [ ] **Confidence indicators** on final answer
- [ ] **Source attribution** - which model contributed what

### 3.5 Council Mode (Multi-Chat Mode) ⭐ v2.0 FLAGSHIP FEATURE
*"A room of minds. One final voice."*

> **Full Spec:** [docs/features/COUNCIL-MODE.md](docs/features/COUNCIL-MODE.md)

**What it is:**
A live, real-time, multi-agent thinking room where 2-6 AI models think in parallel, display their answers in real time, and OSQR synthesizes a final unified response as the "consensus voice."

**Why it matters:**
- OpenAI/Anthropic cannot show competing models in their apps — OSQR can
- Users trust consensus more than single-model answers
- Visualizes the "invisible panel" that already powers Thoughtful/Contemplate modes
- Screenshots go viral ("Claude vs GPT vs Gemini — moderated by OSQR")

**Dependencies (must be complete first):**
- [ ] 3.1 Cross-Referencing Engine (stable)
- [ ] 3.3 Model Personality Tagging (models have identities)
- [ ] 3.4 Synthesis Engine Enhancement (weighted synthesis working)
- [ ] Dynamic model routing (✅ implemented in model-router.ts)
- [ ] Hardened backend + rate limiting for compute-intensive queries

**Target:** v2.0 release (Phase 3 completion)
**Tier:** OSQR Master exclusive ($149/mo)

**High-level implementation:**
```
┌────────────┬────────────┬────────────┬────────────┐
│   Claude   │   GPT-4o   │   Gemini   │    Grok    │
│  (stream)  │  (stream)  │  (stream)  │  (stream)  │
└────────────┴────────────┴────────────┴────────────┘

┌────────────────────────────────────────────────────┐
│    OSQR Moderator Synthesis (final answer)         │
└────────────────────────────────────────────────────┘
```

**See full spec for:** UI layout, backend architecture, model routing logic, cost controls, system prompts, and future expansions.

---

## Phase 4: Advanced Features
*Focus: Automation, proactivity, business intelligence*

### 4.1 Proactive Intelligence (Master Plan: Part 2G.1)
- [ ] **"Oscar Thinks Ahead" engine**
  - Surface relevant context before user asks
  - Predict next question
  - Offer follow-up suggestions

### 4.2 Pattern Recognition System (Master Plan: Part 2G.2-3)
- [ ] **Contradiction Detection** across conversations
- [ ] **Inconsistency Alerts** - flag conflicting statements
- [ ] **Habit Pattern Analysis** - weekly insights

### 4.3 Prioritization Engine (Master Plan: Part 2G.4)
- [ ] **"What Actually Matters" feature**
  - Rank user's active commitments
  - Identify highest-leverage actions
  - Flag over-commitment

### 4.4 Automated Reviews (Master Plan: Part 2G.5)
- [ ] **Weekly Review** - auto-generated reflection
- [ ] **Monthly Summary** - patterns and progress
- [ ] **Quarterly Deep Dive** - trajectory analysis

### 4.5 Capability Ladder - Level-Up System (NEW)
*Growth tracking and progression*
- [ ] **Level-Up Reports** - Monthly capability evolution analysis
- [ ] **Advancement triggers** - Detect when user is ready to level up
- [ ] **Level history tracking** - Store progression over time
- [ ] **90-day challenges** - Level-appropriate transformation programs
- [ ] **Algorithm for level detection** - Automated scoring from behavior patterns

### 4.6 Multi-Model Debate Mode (Master Plan: Part 2A.8)
> **Note:** This evolves into **Council Mode** (3.5) as the v2.0 flagship feature.
> Basic debate features may ship earlier; full Council Mode UI in Phase 3.

- [ ] **Structured debate format** between AI models
- [ ] **Pro/Con generation** on complex topics
- [ ] **Devil's advocate mode**
- [ ] **Consensus building** visualization
- [ ] **Council Mode integration** → See [docs/features/COUNCIL-MODE.md](docs/features/COUNCIL-MODE.md)

### 4.7 Panel Credits System (Master Plan: Part 2A.10)
- [ ] **Gamified credit system** for panel discussions
- [ ] **Credit-based pricing tier**
- [ ] **Bonus credits for referrals**
- [ ] **Credit usage visualization**

### 4.8 Media Vault (Image & Video Foundations) ⭐ FUTURE FLAGSHIP
*"A lifelong, AI-enhanced, meaning-driven memory vault."*

> **Full Spec:** [docs/features/MEDIA-VAULT.md](docs/features/MEDIA-VAULT.md)

**What it is:**
Turn OSQR into a lifelong memory OS by letting users store photos and videos in the same Personal Knowledge Vault as their documents. Not a social feed — a private, searchable, AI-enhanced archive of your life.

**Why it matters:**
- **Future-proof bet:** Store media now, analyze with better AI later
- **Unique moat:** No one else has PKV + MSC + Memory + Identity Model to *use* memories, not just store them
- **Category creation:** "The OS of someone's entire life"
- **Differentiator vs Facebook/Google Photos:** They store memories; OSQR *uses* memories

**The strategic insight:**
> "If you store people's memories now, future AI will make them exponentially more valuable."

AI capabilities improve quarterly. Photos stored today can be retroactively analyzed when vision models mature. OSQR becomes the only platform positioned to cross-reference visual memories with:
- Goals and projects (PKV)
- Identity and values (MSC)
- Life patterns (Memory Layer)
- Capability progression (Ladder)

**Phased implementation:**

| Phase | Scope | AI Involvement |
|-------|-------|----------------|
| **4.8a** | Storage only | None — just archive |
| **4.8b** | Basic vision extraction | Auto-caption, tags, objects |
| **4.8c** | Timeline + cross-linking | Link to goals, people, projects |
| **4.8d** | Advanced video + life intelligence | Video summarization, life recaps |

**Dependencies:**
- [ ] PKV stable and proven at scale
- [ ] Privacy tiers fully implemented (especially Tier A for media)
- [ ] Object storage infrastructure (Supabase/S3/R2)
- [ ] Users trust OSQR with text before trusting it with family photos

**Target:** v3.0 or later (after Council Mode and core intelligence features)
**Tier:** Pro ($49/mo) for storage, Master ($149/mo) for advanced analysis

**Why Phase 4.8 (not earlier):**
1. Core OSQR value must be proven first (intelligence, memory, routing)
2. Storage costs scale differently than text — need sustainable pricing model
3. Privacy stakes are higher with photos of family/kids
4. Users need to trust OSQR with text before trusting it with visual memories

**See full spec for:** Data model, backend architecture, privacy tiers, UI/UX, and phased rollout.

---

## Phase 5: OS-Level Features
*Focus: Life OS, integrations, advanced automation*

### 5.1 The 7-Layer OSQR Operating System (Master Plan: Part 2H.2)
1. **Layer 1: Input** - All data sources connected
2. **Layer 2: Processing** - Multi-model routing
3. **Layer 3: Memory** - PKV + all memory tiers
4. **Layer 4: Intelligence** - Pattern recognition + proactivity
5. **Layer 5: Output** - Personalized responses
6. **Layer 6: Automation** - Background agents
7. **Layer 7: Integration** - External tools + APIs

### 5.2 Project Autopilot Mode (Master Plan: Part 2G.15)
- [ ] **Background project monitoring**
- [ ] **Auto-progress tracking**
- [ ] **Deadline warnings**
- [ ] **Resource suggestions**

### 5.3 Life OS Alerts (Master Plan: Part 2G.7)
- [ ] **Elite behavior guidance**
- [ ] **Discipline reminders** (based on user values)
- [ ] **Goal alignment checks**
- [ ] **Relationship maintenance prompts**

### 5.4 History Ingestion (Master Plan: Part 2D.12)
- [ ] **Import ChatGPT conversations** ✅ (partially done)
- [ ] **Import Claude conversations**
- [ ] **Import email highlights**
- [ ] **Import calendar patterns**

### 5.5 Platform Integrations (Master Plan: Part 2H.3)
- [ ] **Universal API Layer** - connect external tools
- [ ] **Meeting Summarizer** - Zoom/Meet integration
- [ ] **Calendar Intelligence** - time pattern analysis
- [ ] **Note-taking sync** - Notion/Obsidian import

### 5.6 Desktop & Mobile (Master Plan: Part 2H.3)
- [ ] **Desktop Companion App** - always-on assistant
- [ ] **Mobile App** - quick capture + voice
- [ ] **Smart Glasses** (future)
- [ ] **Car OS Integration** (future)

---

## UX Principles (From Master Plan Part 3A)

> **Full Spec:** [docs/UX_PHILOSOPHY.md](docs/UX_PHILOSOPHY.md)

### Core Philosophy
1. **Simple Surface, Powerful Depth** - Hide complexity until needed
2. **One Main Decision Rule** - Never overwhelm with choices
3. **User Moves → Oscar Responds** - Reactive, not pushy
4. **Zero-Barrier Input** - Start typing anywhere
5. **Spartan UX Style** - Minimal, functional, fast

### Animation Philosophy
- Subtle, purposeful
- Never decorative
- Indicates state changes
- Respects user attention

### Modal Minimization
- Avoid popups when possible
- Inline interactions preferred
- Full-screen only for major actions

---

## Version 1.1: Security, Focus & Polish
*Target: Next sprint after v1.0 launch*
*Focus: Per-user encryption, Focus Mode, password recovery, response actions*

### v1.1.1 Per-User Encryption Layer ⭐ CRITICAL
*Full encryption per Constitution spec — "OSQR will always provide a way to delete everything (cryptographic destruction, not soft-delete)"*

**Implementation:**
- [ ] **Per-user encryption keys** — Each user gets unique encryption key derived from password
- [ ] **Envelope encryption** — Data encrypted with user key, user key encrypted with master key
- [ ] **PKV content encryption** — All document content encrypted at rest
- [ ] **Chat message encryption** — Conversation content encrypted
- [ ] **Cryptographic deletion** — Destroy user key = all data unrecoverable
- [ ] **Key rotation support** — Ability to re-encrypt with new keys
- [ ] **Zero-knowledge architecture** — OSQR cannot read user data without user present

**Technical Approach:**
```
┌─────────────────────────────────────────────────────────────┐
│                    User Password                             │
│                         │                                    │
│                         ▼                                    │
│              Key Derivation (PBKDF2/Argon2)                 │
│                         │                                    │
│                         ▼                                    │
│                User Encryption Key (UEK)                     │
│                         │                                    │
│            ┌───────────┴───────────┐                        │
│            ▼                       ▼                        │
│     Encrypt PKV Data         Encrypt Messages               │
│                                                              │
│  Master Key encrypts UEK for recovery (optional)            │
└─────────────────────────────────────────────────────────────┘
```

**Why this matters:**
- Constitutional requirement (Section 2.4)
- True privacy (not even admin can read user data)
- GDPR/CCPA compliance via cryptographic destruction
- Trust differentiator vs competitors

**Estimate:** 2-4 hours at current velocity

### v1.1.2 Focus Mode
*Toggle in top-right, explained in onboarding*

**Implementation:**
- [ ] **Focus Mode toggle icon** — Small icon in top-right, next to user icon
- [ ] **ON state** — Blurs left panel (MSC/nav) and right panel (if exists)
- [ ] **OFF state** — Everything visible, normal operation
- [ ] **User preference persistence** — Store Focus Mode state per user
- [ ] **Onboarding explanation** — Step showing toggle and explaining behavior
- [ ] **Blur CSS system** — Reusable blur/mute classes with smooth transitions

**Visual Behavior:**
| State | Left Panel | Center (Chat) | Right Panel |
|-------|------------|---------------|-------------|
| ON | Blurred | Sharp | Blurred |
| OFF | Visible | Sharp | Visible |

**Estimate:** 1-2 hours

### v1.1.3 Forgot Password (Resend Integration)
*Email-based password recovery*

**Implementation:**
- [ ] **Resend SDK integration** — Add @resend/node package
- [ ] **Password reset tokens** — Database model for secure tokens
- [ ] **Forgot password page** — /forgot-password route
- [ ] **Reset password page** — /reset-password?token=xxx route
- [ ] **Email template** — Branded password reset email
- [ ] **Token expiration** — 1-hour validity with single-use
- [ ] **Rate limiting** — Prevent abuse (max 3 requests per email per hour)
- [ ] **Add "Forgot password?" link** — Below login form

**Database Schema:**
```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
}
```

**Estimate:** 2-3 hours

### v1.1.4 Response Action Buttons
*Quick actions below chat responses*

**User-Facing Buttons (All Users):**
- [ ] **Read Aloud** — Text-to-speech using Web Speech API
- [ ] **Good Response** — Thumbs up (stores feedback for learning)
- [ ] **Bad Response** — Thumbs down (stores feedback + optional reason)
- [ ] **Copy** — Copy response to clipboard

**Admin-Only Buttons (Master tier / your account):**
- [ ] **Token Count** — Show tokens used for this response
- [ ] **Flag for Review** — Mark response for later analysis
- [ ] **View Raw** — Show raw API response data

**Implementation:**
- [ ] **Button bar component** — Appears below each assistant message
- [ ] **Feedback storage** — ChatMessage metadata field for thumbs up/down
- [ ] **TTS integration** — Web Speech API with voice selection
- [ ] **Admin detection** — Check user tier or email for admin features
- [ ] **Token tracking** — Store tokensUsed in message metadata

**Estimate:** 2-3 hours

---

### 1.9 Focus Mode (Cognitive Noise Cancellation) ⭐ NEW
*"Noise-canceling headphones for thinking."*

> **Full Spec:** [docs/UX_PHILOSOPHY.md](docs/UX_PHILOSOPHY.md)

**What it is:**
A UX system that reduces cognitive load by visually de-emphasizing features, data, and UI elements that are not relevant to the user's current moment of focus.

**The Dimmer Metaphor:**
Focus Mode behaves like a light dimmer — gradually reducing cognitive noise without removing context. Nothing disappears. Nothing is deleted. Nothing is blocked.

**v1 Behavior:**
| Rule | Behavior |
|------|----------|
| **Default state** | ON for all new users |
| **Persistence** | User's choice persists after first toggle |
| **Explanation** | Covered in onboarding ("I'll reveal things at the right time") |
| **Override** | User can turn off manually at any time |

**What Gets Blurred (v1):**
| Element | Focus Mode Behavior |
|---------|---------------------|
| Input box | Always sharp |
| Current conversation | Always sharp |
| MSC/Progress | Blurred (if exists) |
| Secondary panels | Blurred |
| Navigation | Slightly muted |
| Suggestions | Blurred unless contextually relevant |

**Visual Treatment:**
- Soft blur (not full opacity)
- Reduced saturation
- Lower contrast
- Muted hover states
- Subtle transitions (150-300ms, easing-heavy)

**NOT v1 (Future Extensions):**
- Long-press override panel
- Adaptive Focus (learns preferences)
- Named focus modes (Deep Work, Decision, Build, Reflect)
- Graduated intensity levels

**Implementation:**
- [ ] **Focus Mode toggle** — Icon in top-right of input panel
- [ ] **Blur CSS system** — Reusable blur/mute classes
- [ ] **Onboarding explanation** — "I'll reveal things at the right time"
- [ ] **User preference persistence** — Store Focus Mode state
- [ ] **Element targeting** — Define what blurs at each state

---

## Monetization Strategy (Premium Launch — Tesla Model)

### Launch Strategy: Premium First

OSQR launches with **Pro and Master tiers only**. No Lite/Free tier at launch.

**Rationale (Tesla Roadster Model):**
- Build premium brand positioning first
- Attract high-value early adopters (founders, operators, builders)
- Higher LTV per user = more runway for development
- Better user feedback quality
- Lite tier introduced later (after 1,000+ paying users)

### Tier Structure (Launch)

| Tier | Launch Price | Future Price | Core Value |
|------|-------------|--------------|------------|
| **OSQR Pro** | $49/mo | $79/mo | Elite clarity + multi-model thinking |
| **OSQR Master** | $149/mo | $249/mo | OS-level intelligence + all features |
| **Enterprise** | — | $4,000+/mo | Organization-level OS (see [Appendix G](#appendix-g-enterprise-tier-vision-future)) |

**No Lite tier at launch.** Lite will be introduced after premium brand is established.
**Enterprise tier is future.** See Appendix G for full vision.

### Founder Pricing

Early adopters get **lifetime rate lock**:
- First 1,000 users keep launch pricing forever
- Creates urgency without discounting
- Makes early users feel like insiders/founders

### Pro Tier Features
- Multi-model panel (Claude + GPT-4o)
- Quick, Thoughtful & Contemplate modes
- Full Personal Knowledge Vault
- Unlimited Refine → Fire
- 25 documents in vault
- 100 panel queries/day
- Advanced memory
- 90-day transformation guarantee

### Master Tier Features
- Everything in Pro
- Advanced memory & personalized intelligence
- Priority fast-lane processing
- 100 documents in vault
- Weekly automated reviews
- Custom Agent Builder (coming)
- Council Mode (coming)
- VS Code Extension (coming)
- Early access to new models & features

### Key Differentiators
- **90-Day Capability Transformation Guarantee** — Full refund if OSQR doesn't improve thinking
- **Multi-model synthesis** — No other tool shows competing AI perspectives
- **Founder Pricing Lock** — Early adopters rewarded permanently

### Price Increase Timeline

| Phase | Timing | Action |
|-------|--------|--------|
| Phase 1 | Launch | Pro $49, Master $149 |
| Phase 2 | After 1,000 users | Pro $79, Master $199-249 |
| Phase 3 | Council Mode ships | Master $249+ |
| Phase 4 | Mass market | Introduce Lite $19/mo |

### Messaging

**Headline:** "Don't Just Ask AI. Start Thinking With One."
**Subhead:** "One Question. Many Minds. One Clear Answer."
**Target:** "Built for founders, operators, and high-performers who want elite decision-making and world-class clarity."

---

## Implementation Priority Matrix

### HIGH Priority (Now)
1. Rename to OSQR
2. Add .docx to web upload
3. Refine → Fire UI
4. Three response modes
5. Profile builder enhancement
6. **Capability Ladder Assessment** (onboarding + level field) ⭐ NEW

### MEDIUM Priority (Next Quarter)
1. Master Summary Checklist
2. Memory system tiers
3. Model personality tagging
4. Cross-referencing engine
5. Panel credits system
6. **Level-based personalization** (prompts, books, habits) ⭐ NEW

### LOW Priority (Later)
1. Desktop app
2. Mobile app
3. Advanced automation
4. External integrations
5. Team features
6. **Level-Up Reports & advancement detection** ⭐ NEW

---

## How to Use This Document

### For Development
1. Pick items from current phase
2. Check "Already Implemented" to avoid duplication
3. Reference specific Master Plan sections for detail
4. Update checkboxes as items complete

### For Strategic Decisions
1. Review priority matrix
2. Consult Master Plan sections for philosophy
3. Ensure changes align with UX principles
4. Consider monetization implications

### For AI Assistants (Claude, etc.)
1. Use this as feature reference
2. Master Plan is indexed in PKV for semantic search
3. Ask "What does the master plan say about X?" for details
4. Follow ARCHITECTURE.md rules for implementation

---

## Appendix A: Master Plan Section Map

| Master Plan Section | Implementation Area |
|--------------------|---------------------|
| Part 1A-D | Identity, naming, boundaries |
| Part 2A | Multi-model architecture |
| Part 2B | Knowledge vault, indexing |
| Part 2C | User profile, personality |
| Part 2D | Memory systems |
| Part 2E | Privacy tiers, trust |
| Part 2F | Onboarding, UX enhancers |
| Part 2G | Automation, proactivity |
| Part 2H | Future features, OS vision |
| Part 3A | UX philosophy, interface |
| Part 5A | Technical architecture |
| Part 6A | Marketing philosophy |

---

## Appendix B: OSQR Capability Ladder System (NEW)

*Source: Documents/osqr capability ladder.docx*
*Purpose: OSQR's Foundational Identity Engine - how OSQR "sees" a human*

### The 13 Levels

| Level | Name | Stage | Identity Pattern |
|-------|------|-------|------------------|
| 0 | Untethered | Foundation | "My life is happening to me" |
| 1 | Reactive Beginner | Foundation | "I want to change, but I don't know how" |
| 2 | Emerging Awareness | Foundation | "I know something has to change" |
| 3 | Structured Beginner | Foundation | "I can do it… sometimes" |
| 4 | Developing Operator | Operator | "I can execute as long as life doesn't disrupt me" |
| 5 | Independent Operator | Operator | "I do what I say" |
| 6 | Intentional Builder | Operator | "I build things that make life better" |
| 7 | Entrepreneur | Creator | "I solve problems" |
| 8 | Systems Thinker | Creator | "I build engines, not tasks" |
| 9 | Platform Builder | Creator | "I build infrastructure" |
| 10 | Ecosystem Architect | Architect | "I create worlds for people to grow inside" |
| 11 | Visionary Integrator | Architect | "I integrate multiple domains to solve hard problems" |
| 12 | Generational Architect | Architect | "I build structures that outlive me" |

### Fourth Generation Formula Mapping

Each level maps to the Identity → Capability → Action → Persistence framework:

- **Foundation (0-3)**: Identity undefined → Capability nonexistent/forming → Output random/inconsistent
- **Operator (4-6)**: Identity forming/present → Capability building/functional → Output stronger/dependable
- **Creator (7-9)**: Identity powerful/anchored → Capability entrepreneurial/systemic → Output valuable/scalable
- **Architect (10-12)**: Identity expanded/transcendent → Capability multi-layer/integrative → Output societal/historic

### How OSQR Uses the Ladder

1. **Onboarding Assessment** - 10-15 questions determine initial level
2. **Daily Prompts** - Tone matches developmental level
3. **Book Recommendations** - Level-appropriate reading
4. **Habit Prescriptions** - Core Commitments mapped to levels
5. **Monthly Level-Up Reports** - Track evolution over time
6. **Dynamic Difficulty** - Challenge advanced users, support beginners
7. **MSC Complexity** - Morning Strategy Call depth matches level
8. **Panel Mode Access** - Different agents available at higher levels

### Recommended Books by Level

| Level | Books |
|-------|-------|
| 0 | None (attention too low) |
| 1-2 | The Slight Edge, Atomic Habits, Mindset |
| 3-4 | Make Your Bed, 7 Habits, The One Thing |
| 5-6 | Deep Work, The Power of Habit, E-Myth Revisited, Essentialism |
| 7-8 | Lean Startup, $100M Offers, Naval Almanack, Principles |
| 9-10 | Zero to One, The Beginning of Infinity |
| 11-12 | What Technology Wants, Meditations, Founding Father biographies |

### Technical Implementation Notes

**Database Schema Additions:**
```
Workspace {
  capabilityLevel Int @default(0) // 0-12
  levelAssessedAt DateTime?
}

LevelHistory {
  id String
  workspaceId String
  level Int
  assessedAt DateTime
  triggers String[] // What caused the level change
}
```

**Future Expansion:**
- A. Assessment questions for each level
- B. Scoring rubric OSQR will use
- C. UI/UX flow for onboarding
- D. Level-Up Reports design
- E. Algorithm for level advancement detection

---

## Appendix C: Psychological Assessment Framework (NEW)

*Source: Documents/PSYCHOLOGICAL SUMMARY_Kable.docx*
*Purpose: Companion to Capability Ladder - shows how the framework applies to real psychological assessment*

### Case Study: Level 10+ (Ecosystem Architect / Visionary Integrator)

This psychological summary demonstrates how OSQR should interpret and respond to users at the Architect stage. Key patterns:

**Core Identity Traits (Level 10+):**
- Self-directed, internally sourced identity
- Pattern recognition across domains (systems thinking)
- Long-term, multi-generational planning horizon
- Mission-driven vs task-driven orientation
- Comfort with ambiguity and complexity
- Ownership mentality ("my world, my responsibility")

### The 4-Stage Identity Path

OSQR can use this framework to track user progression:

| Stage | Timeline | Identity State | OSQR Role |
|-------|----------|----------------|-----------|
| **Cracking** | 0-45 days | Old identity breaking down | Supportive, validating |
| **Expansion** | 45-90 days | New patterns emerging | Challenging, stretching |
| **Alignment** | 3-6 months | Identity crystallizing | Strategic, refining |
| **Lock-In** | 6-12 months | New identity permanent | Amplifying, scaling |

### Key Psychological Concepts for OSQR

**1. Self-Concept Lag**
- Definition: Identity hasn't caught up to actual capability
- OSQR behavior: Gently reflect back evidence of higher capability
- Example prompt: "Based on what you've built, you're operating at Level X. Your self-talk suggests you still see yourself at Level Y."

**2. High-Performance Alignment Event**
- Definition: Moment when external results match internal identity
- OSQR behavior: Celebrate and anchor these moments
- Example prompt: "This accomplishment aligns with your stated identity as [X]. Worth noting for your records."

**3. Founder State**
- Definition: Operating mentality of world-builders (Musk, Naval, Hormozi pattern)
- Characteristics:
  - System creation > task completion
  - Leverage thinking > linear thinking
  - Multi-decade horizon > quarterly thinking
  - Identity-first > output-first
- OSQR behavior: Match this wavelength, avoid tactical minutiae

### Psychological Signals by Level

| Signal | Lower Levels (0-6) | Higher Levels (7-12) |
|--------|-------------------|---------------------|
| Time horizon | Days/weeks | Years/decades |
| Problem framing | "How do I do X?" | "What system produces X?" |
| Failure response | Avoidance/shame | Data/iteration |
| Identity source | External validation | Internal conviction |
| Risk tolerance | Low/moderate | Calculated high |
| Learning mode | Instruction-based | Pattern-based |

### OSQR Assessment Questions (Sample)

**For Level Detection:**
1. "When you think about your life 10 years from now, what do you see?" (horizon test)
2. "Describe a recent failure and what you did with it." (failure response)
3. "What's your relationship with uncertainty?" (ambiguity tolerance)
4. "Who are you, in one sentence?" (identity source)
5. "What would you build if money were irrelevant?" (founder state test)

**For Stage Detection:**
1. "Do you feel like you're becoming someone new, or refining who you already are?" (Cracking vs Alignment)
2. "How stable does your sense of self feel right now?" (stage indicator)
3. "Are you in a building phase or a harvesting phase?" (expansion vs lock-in)

### How This Integrates with OSQR

1. **Onboarding Enhancement** - Add psychological assessment questions to capability level detection
2. **Adaptive Tone** - OSQR adjusts communication style based on psychological profile
3. **Stage-Aware Prompts** - Morning Strategy Calls reference current identity stage
4. **Level-Up Triggers** - Psychological breakthroughs as indicators of advancement
5. **Panel Mode Depth** - Higher psychological sophistication unlocks deeper analysis

### Technical Notes

**Potential Schema Additions:**
```
Workspace {
  identityStage String? // cracking, expansion, alignment, lock_in
  stageStartDate DateTime?
  psychProfile Json? // Structured psychological assessment data
}

PsychAssessment {
  id String
  workspaceId String
  assessedAt DateTime
  timeHorizon String // days, weeks, months, years, decades
  identitySource String // external, internal
  failureResponse String // avoidance, shame, data, iteration
  founderStateScore Int // 0-10
}
```

**Implementation Priority:**
- Phase 2: Basic psychological questions in onboarding
- Phase 3: Stage detection and tracking
- Phase 4: Full psychological profile integration

---

## Phase 6: Meta-OSQR Mode ("Oscar, Audit Yourself")

> **Status:** Specification complete. Build after Intelligence Layer (Phase 3) is stable.
> **Tier:** OSQR Master exclusive
> **Full Spec:** [docs/META_OSQR_MODE.md](docs/META_OSQR_MODE.md)

### Vision

Meta-OSQR is a self-refinement capability where OSQR audits its own system — applying the principle *"The best part is no part"* to itself.

**The Insight:**
> "If Oscar helps users identify unnecessary complexity in their lives, why can't Oscar turn that same thinking inward?"

### Core Capabilities

#### 6.1 System Complexity Audit
- [ ] **Analyze current state** - Map all OSQR components, features, data flows
- [ ] **Identify cruft** - Find features with low usage, redundant code paths, over-engineered systems
- [ ] **Generate simplification proposals** - "This feature could be removed. Here's the impact."
- [ ] **Track complexity over time** - Complexity score trending dashboard

#### 6.2 Question Quality Scoring
- [ ] **Rate incoming questions** - Score questions on clarity, specificity, tractability
- [ ] **Suggest question improvements** - "This question would yield better results if..."
- [ ] **Learn question patterns** - Identify what makes questions effective for each user

#### 6.3 PowerQuestion Generation
- [ ] **Analyze user's goals/projects** - Pull from PKV, MSC, profile
- [ ] **Generate high-leverage questions** - "Have you considered asking yourself: [question]?"
- [ ] **Weekly reflection prompts** - Automated thought-provoking questions

#### 6.4 Self-Improvement Proposals
- [ ] **Feature usage analytics** - Which features are actually used?
- [ ] **Code complexity metrics** - Lines of code, cyclomatic complexity, dependencies
- [ ] **UX friction detection** - Where do users abandon flows?
- [ ] **Architecture review** - "This component could be simplified because..."

### Trigger Methods

**User-Initiated:**
- "Oscar, audit yourself"
- "Oscar, what could be simpler?"
- "Oscar, show me your complexity report"

**Automated (scheduled):**
- Weekly self-audit report
- Post-release complexity check
- Monthly feature usage review

### Sample Outputs

**Complexity Report:**
```
OSQR Self-Audit Report
======================
Overall Complexity Score: 7.2/10 (up 0.3 from last month)

High-complexity areas:
1. Memory system (5 tiers when 3 would suffice)
2. Mode routing logic (nested conditionals)
3. Panel composition (over-parameterized)

Simplification opportunities:
- Memory tiers: Merge Working + Dialogue → "Session Memory"
- Mode routing: Replace conditionals with lookup table
- Panel: Remove unused 'debater' personality type

Features with <5% usage this month:
- Knowledge graph visualization
- Custom agent builder (0.2% of users)
- Voice input mode
```

**PowerQuestion Generation:**
```
Based on your current projects and goals, consider:

1. "What would this look like if it were easy?"
   → Related to: VoiceQuote scaling challenges

2. "If I could only keep 3 features, which would they be?"
   → Related to: Product roadmap decisions

3. "What am I avoiding that I know I should do?"
   → Related to: Recurring patterns in your reflections
```

### Technical Implementation

**Dependencies:**
- [ ] Behavioral Intelligence Layer (Phase 3.0) operational
- [ ] Usage telemetry flowing (TelemetryCollector active)
- [ ] Pattern detection working (PatternAggregator)

**New Components:**
- [ ] `lib/meta/SelfAuditor.ts` - Core audit logic
- [ ] `lib/meta/ComplexityAnalyzer.ts` - Code/feature complexity scoring
- [ ] `lib/meta/QuestionIntelligence.ts` - Question quality & generation
- [ ] `lib/meta/index.ts` - Clean exports

**Database Additions:**
```
ComplexityReport {
  id String
  generatedAt DateTime
  overallScore Float
  componentScores Json
  simplificationProposals Json
  lowUsageFeatures String[]
}

QuestionScore {
  id String
  workspaceId String
  questionText String (hashed)
  clarityScore Float
  specificityScore Float
  tractabilityScore Float
  improvedVersion String?
  createdAt DateTime
}
```

### Why Phase 6 (Not Earlier)

1. **Requires telemetry data** - Can't audit without usage patterns
2. **Requires pattern detection** - PatternAggregator must be operational
3. **Recursive complexity** - Adding meta-features adds complexity; must be mature enough to handle it
4. **Brand positioning** - "AI that audits itself" is powerful marketing after core value proven

### The Meta-Irony

> Building a feature that identifies unnecessary features is itself a risk of unnecessary complexity.
> The implementation must be minimal, or Meta-OSQR will be the first thing Meta-OSQR recommends removing.

---

## Phase 7: Creator Marketplace (V2.0)

> **Status:** Vision documented. Implementation follows V1.5 Intelligence Layer completion.
> **Prerequisites:** Core OSQR app launched, TIL/Proactive systems stable, PKV/MSC battle-tested

### Vision

The Creator Marketplace enables thought leaders to package their methodologies as "Judgment Profiles" — portable intelligence frameworks that change how OSQR thinks for users who install them.

### Key Documents

- **[docs/vision/CREATOR_MARKETPLACE.md](docs/vision/CREATOR_MARKETPLACE.md)** — Full marketplace architecture
- **[docs/vision/CREATOR_MARKETPLACE_GTM.md](docs/vision/CREATOR_MARKETPLACE_GTM.md)** — Go-to-market strategy

### Business Model

- 80/20 revenue split (creator keeps 80%)
- No platform favoritism — plugins compete on merit
- Fairness as competitive moat

### Creator Tiers

| Tier | Requirements |
|------|--------------|
| Creator Mode | Private plugins, testing |
| Marketplace Candidate | 60-90 day account age, can submit |
| Verified Creator | Premium placement, proven results |

---

## Phase 8: VS Code OSQR (V3.0)

> **Status:** Vision documented. Implementation follows V2.0 Creator Marketplace launch.
> **Prerequisites:** Core OSQR app launched, Creator Marketplace stable, PKV/MSC battle-tested

### Vision

Make OSQR a real dev companion inside VS Code—not another prompt hack, but a tool that:
- Uses OSQR's multi-model routing (Quick/Thoughtful/Contemplate)
- Reads and writes to PKV (project context) and MSC (principles)
- Can eventually operate autonomously on well-defined tasks
- Builds toward "describe your app, OSQR builds it"

### Milestone Sequence

1. **Dev Companion v1** – Sidebar panel, Refine→Fire on code, PKV/MSC integration
2. **Autonomous Developer Mode** – Safe branch-based autonomous development (Jarvis-style)
3. **Autonomous App Builder** – Generate full app scaffolds from natural language

These are stacked. Each depends on the previous.

### Prerequisites

- [ ] OSQR core app launched and stable
- [ ] Intelligence Layer (Phase 3) complete
- [ ] PKV/MSC have real usage data from multiple projects
- [ ] Clear pricing model for extension features

### Key Differentiators vs Copilot/Cursor

- **Memory that persists** – PKV/MSC means OSQR remembers projects, decisions, and principles across sessions
- **Multi-model routing** – Not locked to one AI; uses the right model for the task
- **Integrated with life OS** – Dev work connects to broader goals via MSC
- **Learns from you** – Gets better at YOUR codebase over time

### Detailed Specs

Full specifications preserved in vision documents:
- **[docs/vision/VSCODE-DEV-COMPANION.md](docs/vision/VSCODE-DEV-COMPANION.md)** – Dev Companion v1 & Autonomous Mode specs
- **[docs/vision/AUTONOMOUS-APP-BUILDER.md](docs/vision/AUTONOMOUS-APP-BUILDER.md)** – App Builder blueprint

*Detailed implementation planning begins when prerequisites are met.*

---

## Phase 9: Privacy Phone (V4.0)

> **Status:** Strategic vision — long-term initiative
> **Target:** 2026-2027
> **Prerequisites:** V1-V3 complete, OSQR momentum established, resources secured

### Vision

**OSQR-the-phone isn't a phone with OSQR on it—it's OSQR manifested as a phone.**

The phone is one physical interface for the intelligence layer, the same way VS Code, web chat, and voice are interfaces. The insight: Everyone asking for a "freedom phone" is asking for hardware, but the actual moat is the OS. OSQR solves the hard part.

### The Intelligence Utility Model

OSQR isn't a phone company. Not even a software company. It's an **intelligence utility**—like electricity or internet, but for cognitive augmentation. Users subscribe to a *relationship* with an intelligence that knows them and improves over time. The phone is the first always-on container for that relationship.

### Market Opportunity

| Metric | Value |
|--------|-------|
| Ultra-secure smartphone market (2024) | $4.15 billion |
| Projected (2033) | $20.43 billion |
| CAGR | 18.42% |
| Consumer privacy segment | Underserved |

### Business Model: The Tesla Model Inverted

**The phone isn't the product—OSQR is the product.**

The phone is an acquisition channel and hardware interface. Can price phone aggressively because capturing **lifetime subscription value**.

| Phase | Revenue Model |
|-------|---------------|
| Months 0-24 | ~$70/month bundled (~$50 hardware + ~$20 OSQR) |
| Month 25+ | Hardware paid off, OSQR subscription continues ($20-30/month) |

By month 24: 2 years of context and memory in OSQR. Switching cost is enormous—not because trapped, but because value is non-transferable.

### Data & Lapse Policy ("Florida Homestead" Philosophy)

**User data belongs to user. Never deleted.**

- If subscription lapses: OSQR intelligence **disabled, not deleted**
- User data persists indefinitely
- Base phone functions always work
- Creates trust and frictionless re-activation

### Implementation Phases

1. **Foundation (Pre-V4.0):** Complete V1-V3, establish OSQR momentum, research hardware partnerships
2. **Design (V4.0 Planning):** Hardware partner selection, OS customization, carrier exploration
3. **Development (V4.0 Build):** Mobile OS integration, prototyping, security certification, beta testing
4. **Launch (V4.0 Release):** Limited release to power users, iterate, scale manufacturing

### Detailed Specs

Full specifications preserved in vision document:
- **[docs/vision/PRIVACY-PHONE.md](docs/vision/PRIVACY-PHONE.md)** – Complete V4.0 strategic vision

*This is a post-V3.0 initiative. Execution begins after VS Code OSQR stability.*

---

## Phase 10: Robotics Integration (V5.0)

> **Status:** Placeholder — strategic vision not yet defined
> **Target:** TBD
> **Prerequisites:** V1-V4 complete, Privacy Phone launched

### Vision

OSQR intelligence layer extended to robotics and automation systems. Strategic direction and detailed specifications to be developed.

> **Note:** This is a future vision placeholder. Documentation will be created when strategic direction is defined.

---

## Appendix D: Autonomous Developer Mode

*Trigger: Run `/autonomous` or say "run in autonomous mode"*

### Instructions for Claude

When running in Autonomous Developer Mode, follow these rules:

1. **Break the project into tasks and subtasks** - Read this ROADMAP.md and create a dependency graph
2. **Build a dependency graph** - Understand what depends on what
3. **Execute tasks in optimal order** - Parallelize where possible
4. **When a task is blocked, store the question and pivot** - Don't stop, move to the next task
5. **Only stop when no tasks remain executable** - Maximize progress before asking for input
6. **Batch all questions and deliver them together** - One interruption, not many
7. **If a missing detail is minor, make a reasonable assumption** - Document it in ASSUMPTIONS.md and keep building

### Your Goal

**Maximum forward progress with minimum interruption.**

### Checkpoint Strategy

Create git branches/tags at major milestones for rollback safety:

```
main (current stable)
  └── feature/autonomous-phase-1
        ├── checkpoint/branding-complete      # After Oscar → OSQR rename
        ├── checkpoint/see-another-ai         # After "See another AI thinks" feature
        ├── checkpoint/msc-populated          # After MSC functionality
        ├── checkpoint/auth-complete          # After authentication is working
        └── checkpoint/phase-1-complete       # After all Phase 1 items
```

### Before Starting Autonomous Mode

1. `git checkout -b feature/autonomous-phase-1` (create feature branch)
2. Read ROADMAP.md HIGH Priority items
3. Check ARCHITECTURE.md for code patterns
4. Use TodoWrite to track progress visibly

### When Blocked

Create/update `BLOCKED.md` with:
- What you were trying to do
- What information you need
- Your best guess if you had to proceed

### When Complete

1. Create a summary of all changes made
2. List any assumptions made (from ASSUMPTIONS.md)
3. Present batched questions from BLOCKED.md
4. Show `git log --oneline` of commits

### Autonomous Phase 1 Scope (Beta)

Items Claude can complete without user input:

| Task | Confidence | Notes |
|------|------------|-------|
| Oscar → OSQR branding | HIGH | Find/replace across codebase |
| "See another AI thinks" button | HIGH | Add to Quick Mode per spec |
| Fix console errors | HIGH | DialogTitle bug, etc. |
| MSC UI population | HIGH | Create sample items |
| Code cleanup/refactoring | HIGH | Follow ARCHITECTURE.md |
| Add new UI components | HIGH | Match existing patterns |
| API endpoint additions | MEDIUM | May need to clarify specs |
| Capability Ladder questions | MEDIUM | Content needs approval |
| Memory system architecture | MEDIUM | Design decisions |

### Items Requiring User Input

- Stripe pricing/products setup
- Production deployment credentials
- Content/copy decisions for user-facing text
- Major UX flow changes
- Database schema changes affecting production data

---

## Appendix E: Multi-Model Architecture Summary

> **Full Spec:** [docs/features/MULTI-MODEL-ARCHITECTURE.md](docs/features/MULTI-MODEL-ARCHITECTURE.md)

### Architecture Overview

OSQR's multi-model system is built on 5 core components:

```
┌─────────────────────────────────────────────────────────────────┐
│                     1. MODEL_REGISTRY                           │
│  Single source of truth for all models & capabilities           │
│  → lib/ai/model-router.ts                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   2. PROVIDER ADAPTERS                          │
│  OpenAI, Anthropic (+ future: Google, xAI, Mistral)            │
│  → lib/ai/providers/                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. MODE ROUTING                              │
│  Quick → 1 model (routed by type)                              │
│  Thoughtful → Panel (2+ models) + synthesis                     │
│  Contemplate → Extended panel + multi-round + deep synthesis    │
│  Council → Visible panel + OSQR moderation                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. OSQR SYNTHESIS                            │
│  Combines model outputs into unified OSQR voice                 │
│  → lib/ai/oscar.ts                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               5. INSTRUMENTATION (Future)                       │
│  Latency, cost, agreement, user feedback                        │
│  → Enables adaptive model scoring over time                     │
└─────────────────────────────────────────────────────────────────┘
```

### Model Registry Structure

Each model in the registry has:

```typescript
interface ModelDefinition {
  id: string                    // "anthropic-claude-sonnet-4"
  provider: ModelProvider       // 'anthropic' | 'openai' | 'google' | etc.
  model: string                 // API model name
  displayName: string           // Human-readable
  capabilities: {
    reasoning: number   // 0-10
    creativity: number  // 0-10
    coding: number      // 0-10
    speed: number       // 0-10
    accuracy: number    // 0-10
    nuance: number      // 0-10
  }
  costProfile: 'cheap' | 'medium' | 'expensive'
  maxContextTokens: number
  enabled: boolean              // Can toggle on/off
  enabledForCouncil: boolean    // Available in Council Mode
  personality: {
    codename: string            // "The Philosopher"
    description: string         // One-sentence personality
    strengths: string[]         // What it excels at
    style: string               // Communication style
  }
}
```

### Question Type → Model Routing

| Question Type | Primary Model | Alternative | Reason |
|---------------|---------------|-------------|--------|
| factual | Claude Haiku | GPT-4o Mini | Speed + accuracy |
| creative | Claude Sonnet | Claude 3.5 Sonnet | Nuance + creativity |
| coding | GPT-4o | Claude Sonnet | Code generation |
| analytical | Claude Sonnet | GPT-4o | Balanced analysis |
| reasoning | Claude Opus | GPT-4o | Deep logic |
| high_stakes | Claude Opus | Multiple panel | Thoroughness |

### Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Model Registry | ✅ Complete | `lib/ai/model-router.ts` |
| Question Detection | ✅ Complete | `detectQuestionType()` |
| Complexity Scoring | ✅ Complete | `estimateComplexity()` |
| Route to Model | ✅ Complete | `routeQuestion()` |
| Anthropic Adapter | ✅ Complete | `lib/ai/providers/anthropic.ts` |
| OpenAI Adapter | ✅ Complete | `lib/ai/providers/openai.ts` |
| Google Adapter | ✅ Complete | `lib/ai/providers/google.ts` |
| xAI Adapter | ✅ Complete | `lib/ai/providers/xai.ts` |
| Mistral Adapter | ❌ Not started | - |
| Council Mode | 📋 Spec complete | `docs/features/COUNCIL-MODE.md` |
| Instrumentation | ❌ Not started | - |

### Adding a New Provider

1. Add models to `MODEL_REGISTRY` in `lib/ai/model-router.ts`
2. Create adapter in `lib/ai/providers/{provider}.ts`
3. Register in `ProviderRegistry`
4. Add API key to environment
5. Flip `enabled: true` in registry

---

## Appendix F: Collaboration Layer (Future Feature)

> **Status:** End-of-list idea. Do not build until core Personal OS is fully established.
> **Timeframe:** 1-2 years out, revisit when demand naturally emerges.

OSQR may eventually support multi-user collaboration inside shared workspaces, allowing teams or partners to build, think, and plan together with OSQR acting as the shared intelligence layer. This is **not social media** — it is project-centered collaboration with AI mediation.

### Prerequisites (Must Complete First)

- Phase 4.8 Media Vault complete
- Multi-Model Architecture stable (Council Mode shipped)
- Memory Engine operational
- Tier system with billing stable
- Significant single-user adoption established

### Collaboration Phase 1 — Shared Workspaces (Async)

- Multiple users can join a single workspace (e.g., "VoiceQuote", "Playa Bowls Expansion")
- All workspace members share:
  - PKV subset scoped to that workspace
  - OSQR's summaries, insights, and project structure
  - Chat threads scoped to the workspace
- No presence indicators. No live features. Purely asynchronous.

### Collaboration Phase 2 — Live OSQR Co-Sessions (Real-time)

- Users can start a "Live Session" inside a workspace
- OSQR mediates the session:
  - Recognizes multiple humans present
  - References each person's past notes, goals, conversations, and PKV contributions
  - Facilitates shared problem-solving
- Both users see:
  - The same chat feed
  - The same document references
  - The same reasoning context
- Supports commands like:
  - `@osqr refine this idea`
  - `@teammate review this part`

### Collaboration Phase 3 — Light Presence + Minimal Messaging (Optional, Scoped)

- Only shows presence **inside shared workspaces** ("Israel is active in VoiceQuote workspace")
- OSQR may prompt:
  - "Both of you are active — start a session together?"
- Minimal messaging sidebar:
  - Not a social network
  - Not a global DM system
  - Only for workspace collaborators
- No discovery, no feed, no friends list

### NOT Planned

- ❌ No global chat system
- ❌ No friend graph
- ❌ No public posting
- ❌ No social timelines
- ❌ No open messaging between strangers

### PKV Sharing Complexity (To Be Defined)

When implementing, we'll need to solve:

- What happens when a user leaves a workspace? (Data ownership, export rights)
- Who owns synthesized insights from collaborative sessions?
- Privacy boundaries between personal PKV and shared workspace PKV
- How do we handle conflicting privacy tiers between collaborators?
- Can users "un-share" previously shared knowledge?

*Note: These questions may be clearer by the time we're ready to build this. Document decisions as they emerge.*

### Monetization Note

Collaboration features naturally unlock a **Team tier** ($XX/month/seat). Pricing TBD based on market conditions at time of development.

---

## Appendix G: Enterprise Tier Vision (Future)

> **Status:** Strategic vision. Do not build until v2+ is stable.
> **Timeframe:** 12-24 months out. Revisit when individual tiers have proven product-market fit.

### What Enterprise Is

OSQR Enterprise is the **organization-level operating system** — not just "more expensive Pro."

It enables:
- Coaching companies to deploy OSQR across all clients
- SaaS teams to have shared AI workflows
- Agencies to operationalize their methodologies
- Any organization to have a custom "AI brain" trained on their content

### Why Enterprise Matters

| Lever | Impact |
|-------|--------|
| **Revenue** | $4K-$25K/month per org vs $29-99/user |
| **Stickiness** | Org-wide adoption = high switching cost |
| **Distribution** | One enterprise deal = hundreds of downstream users |
| **Moat** | Custom agents trained on org content can't be replicated |

### Enterprise vs White-Labeling

**Enterprise is better than white-labeling because:**
- White-labeling fragments control and brand
- Enterprise preserves OSQR sovereignty
- You build one OS; clients customize on top
- No code forks, no feature divergence

### Tier Structure (Projected)

| Tier | Price | Target |
|------|-------|--------|
| **Pro** | $29/mo | Individual creators |
| **Master** | $99/mo | Power users |
| **Enterprise** | $4,000/mo | Organizations, coaching companies |
| **Enterprise+** | $10,000-$25,000/mo | Large orgs, compliance needs |

### Enterprise Features (Phased)

**Enterprise v1 (Foundation)**
- Organization PKV (shared vaults)
- Admin dashboard (add/remove users, roles, billing)
- Team collaboration (shared conversations, projects)
- Custom organization agent
- Priority onboarding

**Enterprise v2 (Growth)**
- Cohort management (for coaching companies)
- Integration suite (Slack, Notion, HubSpot, etc.)
- Custom model routing rules
- Organization-wide behavioral intelligence

**Enterprise v3 (Platform)**
- Private deployments (SOC2/HIPAA environments)
- Org-level app builder
- Departmental agents (Sales, Marketing, Ops, Support)
- Enterprise reporting and analytics

### Prerequisites (Must Complete First)

- [ ] Core v1 shipped and stable
- [ ] Pro/Master tiers generating revenue
- [ ] Council Mode operational
- [ ] PKV proven at scale
- [ ] Basic integrations working

### The Philosophy

> **Enterprise gives organizations the power of OSQR without giving away control of OSQR.**

No fragmentation. No white-label chaos. One platform, many deployments.

### Example Use Case: Coaching Company

A coaching company like SaaS Academy could:
1. Upload all playbooks, frameworks, and SOPs to Org PKV
2. Deploy custom "Coach Agent" trained on their methodology
3. Give every client founder their own OSQR instance
4. Track cohort progress through admin dashboard
5. Scale their coaching without scaling headcount

This turns methodology into software.

---

**To activate:** Say "run in autonomous mode" or `/autonomous`
