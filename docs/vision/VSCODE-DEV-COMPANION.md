# OSQR VS Code Integration - Architecture & Vision

**Status:** Vision/Planning (Do not implement until prerequisites met)
**Created:** 2025-12-08
**Updated:** 2025-12-15 (Major architecture update: Core/Plugin separation)
**Prerequisites:** Core OSQR app launched, Intelligence Layer (Phase 3) stable, PKV/MSC battle-tested

---

> **Important:** This is a **post-v1** initiative. Do not block launch on this.
> Sequence: Core OSQR app → Intelligence Layer → VS Code Core → Builder Plugin.

---

## Critical Architecture Decision: Core vs Plugin Separation

**The same pattern as removing Kable/Fourth Generation from core OSQR applies to VS Code capabilities.**

Full VS Code building capability should NOT be baked into OSQR core. It should be a **plugin**.

### Why This Matters

1. **Platform neutrality** — OSQR core must remain a general intelligence layer, not "Kable's dev tool"
2. **Creator competition** — Other creators should be able to build competing dev plugins (Data Science Mode, Mobile Dev Mode, DevOps Mode, etc.)
3. **User choice** — Not everyone wants autonomous building; some want OSQR as thinking partner only
4. **Clean product identity** — OSQR is the intelligence layer; building methodology is a plugin on top
5. **Pricing flexibility** — Core OSQR priced separately from advanced dev capabilities

### The Two-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BUILDER PLUGIN (Optional)                │
│  Queue System · Autonomous Mode · Project Indexing          │
│  Self-modifying capability · Complex dev workflows          │
├─────────────────────────────────────────────────────────────┤
│                    OSQR CORE VS CODE                        │
│  Continuity · Shared PKV/MSC · Context awareness            │
│  Basic code assistance · Question answering                 │
└─────────────────────────────────────────────────────────────┘
```

---

## OSQR Core VS Code Extension (Ships with V3.0)

Basic extension that maintains platform neutrality. This is what ALL users get.

### What Core Includes

- [ ] OSQR extension connects to same backend as web app
- [ ] Shared PKV (Personal Knowledge Vault) across interfaces
- [ ] Shared MSC (Master Skill Codex) across interfaces
- [ ] Conversation continuity: web ↔ VS Code
- [ ] Context awareness: knows what file is open, recent changes
- [ ] Can answer questions about code with full OSQR intelligence
- [ ] Can assist with implementation (like current Claude in VS Code)
- [ ] Basic Refine → Fire on code selections

### What Core Does NOT Include

- Queue system (conversation specs → implementation tasks)
- Autonomous building capability
- Project-level indexing
- Self-modifying capability
- Complex dev workflows
- Full codebase indexing

### User Experience (Core Only)

```
User works in OSQR web:
  "Let's design the authentication system for VoiceQuote..."
  [Full strategic conversation]

User opens VS Code:
  OSQR: "I see you're in the VoiceQuote project. Ready to continue
         from our auth discussion. What would you like to implement first?"

User: "What haven't we built yet from yesterday?"
  OSQR: [Pulls from shared context, no re-explanation needed]
```

---

## Builder Plugin (Separate — V3.0+)

Advanced development capability as **opt-in plugin**. This is where the Queue System, autonomous mode, and "OSQR building OSQR" capability lives.

### What Builder Plugin Includes

- [ ] Queue system (conversation specs → implementation tasks)
- [ ] Full codebase indexing for active project
- [ ] Project-level indexing (multiple projects, switchable context)
- [ ] Git history awareness (what changed, when, why)
- [ ] Documentation auto-indexing (README, docs folder, comments)
- [ ] Decision log: track architectural choices with reasoning
- [ ] Self-indexing: plugin understands its own codebase
- [ ] Meta-reasoning: can analyze project architecture
- [ ] "Unimplemented features" tracking from conversations
- [ ] Proactive suggestions based on indexed conversations
- [ ] Autonomous task execution (with confirmation protocols)
- [ ] ASSUMPTIONS.md / BLOCKED.md / PROGRESS.md generation

### Plugin Naming Options

- **Kable's Builder** — Personal brand, your methodology
- **Architect Mode** — Generic but clear
- **OSQR Forge** — Platform-branded
- **Fourth Generation Builder** — Ties to your ecosystem

### What This Architecture Enables

1. **Competing dev plugins emerge:**
   - Data Science Mode (Python/notebooks optimized)
   - Mobile Dev Mode (React Native workflow)
   - DevOps Mode (infrastructure focus)
   - Game Dev Mode (Unity/Unreal workflow)

2. **Your plugin wins on merit, not default status**

3. **Cleaner pricing model:**
   - Core OSQR: $49-149/mo
   - Builder Plugin: Additional fee or Master tier inclusion
   - Other dev plugins: Creator-priced in marketplace

---

## The Interface Philosophy

> **"VS Code is OSQR's workspace, not yours. You're the architect. OSQR is the builder. You don't need to stand in the construction site to design the building."**

### Progression by Version

| Version | User Experience |
|---------|-----------------|
| **V1.0** | Core OSQR web app - architectural thinking, PKV, multi-model routing |
| **V2.0** | Creator Marketplace - plugins, creator onboarding, growth engine |
| **V3.0** | VS Code OSQR - full extension, Builder Plugin, web↔VS Code continuity |
| **V3.0+** | User works wherever, OSQR works in VS Code autonomously, user sees results |

### The User's Role vs OSQR's Role

**User:** Architect, decision-maker, reviewer
**OSQR:** Builder, executor, context-keeper

This philosophy shapes every VS Code integration decision.

---

## Core Insight: Software That Understands Itself

OSQR indexed on OSQR creates a new paradigm:

- Software has never understood itself before
- Developers understand software, documentation describes it, AI helps write it
- But the software itself — codebase, architecture, decisions, history, reasoning — has never been self-aware

**When OSQR is fully indexed on itself:**
- Every architectural decision and why it was made
- Every version and what changed
- Every conversation about what to build and what not to build
- Every constraint, tradeoff, open question

OSQR can then reason about OSQR the way the founder reasons about it. Faster, with perfect memory, without cognitive load.

**This extends to any software built with OSQR.**

### Demo Opportunity: OSQR Building OSQR

Once V3.0 + Builder Plugin is complete, a powerful demo becomes possible:

**Show in real time:**
- OSQR analyzing its own architecture
- OSQR identifying improvement opportunities
- OSQR implementing improvements
- Human architect guiding, approving, steering

**What this demonstrates:**
- Software that understands itself
- New paradigm for software development
- Proof that any software can be built this way
- Category creation, not feature demo

---

## User Experience Progression

### Current State (Pre-OSQR)

- Think through architecture in Claude/ChatGPT web
- Copy/paste context to VS Code
- Re-explain, re-establish, re-orient every session
- Lose continuity between interfaces
- Manual context management

### V1.0: Core OSQR (Web Only)

- OSQR web interface for architectural thinking
- Full knowledge indexing
- No VS Code yet
- Foundation for everything that follows

### V2.0: Creator Marketplace

- Plugin architecture and marketplace infrastructure
- Creator onboarding tools and revenue sharing
- Fourth Generation Formula extracted as first plugin
- Creator outreach and early adopter recruitment
- **Growth engine**: creators bring their audiences to OSQR

**User experience:**
- Install plugins from marketplace
- Author methodologies become active in OSQR
- Community of creators building on platform

### V3.0: VS Code OSQR (Full Integration)

- OSQR VS Code extension for implementation
- **Shared context between web and VS Code**
- "Let's implement what we discussed" works without re-explanation
- "What haven't we built yet from yesterday?" works
- Full indexed knowledge: all conversations, all documentation, all code

**User experience:**
- Design in web/bubble interface
- Open VS Code
- OSQR already knows the context
- Continue seamlessly

### V3.0+: Self-Indexed Intelligence (Builder Plugin)

- OSQR indexed on OSQR's own architecture
- Can reason about its own improvement
- Can answer: "What's the weakest part of your architecture?"
- Can answer: "Where are you likely to fail me?"
- Demo capability: Show OSQR improving OSQR in real time
- Other software projects get same treatment (full indexing, self-understanding)

**User experience:**
- Work in VS Code OR web, full continuity either way
- OSQR understands the entire project at architectural level
- Strategic questions answered with full system awareness
- "Go through yesterday's conversations and list unimplemented features" works

### V3.0+: Autonomous Execution (Future — Builder Plugin Extension)

- OSQR executes in VS Code autonomously
- User converses from web/mobile
- User checks results when ready
- "Set up the URL using X, I'll check it when it's done"

**Required capabilities (not V1/V2):**
- Autonomous execution with safety rails
- Server provisioning automation
- Domain/DNS management integration
- Deployment pipeline automation
- Trust scoring for unsupervised action
- Confirmation protocols for high-risk operations

**User experience:**
- Architect from anywhere (web, mobile, voice)
- OSQR builds in VS Code without user present
- User reviews, approves, iterates
- VS Code becomes OSQR's workspace, not user's

---

## What Full Indexing Enables (Level Jump)

When OSQR has access to:
- All Claude conversation history
- All ChatGPT conversation history
- All documentation created
- Full codebase
- All OSQR architecture documentation

**User gains:**

| Capability | Description |
|------------|-------------|
| **No context-setting** | Every conversation starts with full knowledge. No re-explaining. |
| **Cross-domain synthesis** | Connections across projects, conversations, documentation in real-time |
| **Institutional memory** | Every decision preserved with reasoning. Recall why choices were made. |
| **Proactive prompting** | OSQR surfaces questions user should be asking. Pattern detection. |
| **Thinking speed multiplier** | Role shifts from gathering/connecting to evaluating/deciding. 10x capacity. |

---

## Technical Specification: Core VS Code Extension

### Extension Basics

* VS Code extension named **"OSQR"**
* Connects to OSQR via:
  * API key / OAuth (user's OSQR account)
  * Project binding (see `.osqr-project.json` below)
* Exposes:
  * A **sidebar panel** ("OSQR Panel")
  * Command palette commands

### Project Binding & Config

Support an optional project config file at repo root:

```jsonc
// .osqr-project.json
{
  "projectId": "osqr-app",
  "name": "OSQR Core App",
  "tags": ["saas", "nextjs", "osqr"],
  "capabilityLevelHint": 4
}
```

Extension reads this on activation and uses it to:
* Link VS Code project ↔ OSQR PKV / MSC entries
* Pull relevant project notes / decisions
* Push new decisions back to OSQR

### OSQR Panel – Sidebar

**1. Context Panel**
* Shows:
  * Current file + language
  * Short inferred "active task" (based on file + recent diff)
* Example: `Currently editing: app/(marketing)/page.tsx – Likely working on: Landing page layout`

**2. Insights Panel (PKV + MSC Bridge)**
* Shows:
  * Project insights pulled from PKV (architecture decisions, conventions)
  * Suggested MSC entries (coding principles learned from this repo)
* Buttons:
  * `Save to PKV`
  * `Promote to MSC`

### Commands (Core)

**OSQR: Refine & Fire on Selection**
* User selects code or writes a natural language comment
* Extension sends selection + file context
* OSQR runs Refine → Fire
* Returns proposed code changes + rationale
* UI: Diff-style view, Apply / Copy / Ask follow-up

**OSQR: Summarize Recent Changes**
* Reads `git diff` since last commit
* Generates commit message options
* Generates changelog-style summary
* User can copy or save insight to PKV/MSC

### API Endpoints Required (Core)

* `POST /api/vscode/refine` - Refine question with code context
* `POST /api/vscode/fire` - Multi-model query with code context
* `GET /api/vscode/pkv/search` - Search PKV from extension
* `POST /api/vscode/pkv/index` - Index code/decisions to PKV
* `GET /api/vscode/context` - Get current project context

---

## Technical Specification: Builder Plugin

### Additional Capabilities (Plugin Only)

**Tasks & Questions Panel** (replaces simple Insights panel)
* Shows:
  * `QUEUED` (tasks from web conversations via Queue System)
  * `DONE` (recent OSQR-made changes in this branch)
  * `OPEN QUESTIONS` (things OSQR is waiting on)
  * `ASSUMPTIONS` (decisions OSQR made to keep moving)
* Provides:
  * One-click "Convert to TODO in osqr-todos.md"

**OSQR: Generate Project TODO Roadmap**
* Scans repo structure
* Reads existing ROADMAP.md (if present)
* Produces a scoped TODO list: `Now` / `Soon` / `Later`
* Dependency hints (task B depends on A)
* Writes/updates `osqr-todos.md` at project root
* Links major items to PKV as project tasks

**OSQR: Run in Autonomous Mode**
* Break work into tasks/subtasks from ROADMAP.md / osqr-todos.md
* Build a dependency graph
* Execute tasks in optimal order
* When blocked, store questions and pivot
* Only stop when nothing else can progress without input
* Batch all questions at the end
* Make small assumptions, but document them

### Safety: Branches & Checkpoints (Plugin)

Always:
* Create a new branch: `osqr-autonomous-###`
* Create frequent tags: `checkpoint/branding-complete`, etc.

Maintain files:
* `AUTONOMOUS-GUIDELINES.md` – rules OSQR follows
* `ASSUMPTIONS.md` – decisions made
* `BLOCKED.md` – items waiting on external factors
* `PROGRESS.md` – quick state + phase status + next actions

At end of run, OSQR prints rollback instructions to user.

### Additional API Endpoints (Plugin)

* `GET /api/vscode/queue` - Get queued items for project
* `POST /api/vscode/queue/:id/start` - Start working on queued item
* `PATCH /api/vscode/queue/:id/tasks/:taskId` - Update task progress
* `POST /api/vscode/queue/:id/complete` - Complete queued item
* `POST /api/vscode/tasks` - Sync tasks with web app
* `POST /api/vscode/autonomous/start` - Start autonomous mode
* `GET /api/vscode/autonomous/status` - Get autonomous mode status

---

## Extension Architecture (Reference)

```
osqr-vscode/
├── src/
│   ├── extension.ts      # Entry point
│   ├── panels/           # Webview panels
│   ├── commands/         # VS Code commands
│   ├── api/              # OSQR backend client
│   └── context/          # Context management
├── webview/              # React-based sidebar UI
└── package.json          # Extension manifest

osqr-builder-plugin/      # Separate package
├── src/
│   ├── plugin.ts         # Plugin entry
│   ├── queue/            # Queue system
│   ├── autonomous/       # Autonomous mode
│   └── indexing/         # Project indexing
└── package.json
```

---

## Priority Sequence

**Now: V1.0 Launch**
- Core OSQR functionality (web app)
- PKV, multi-model routing, Refine→Fire
- Full knowledge indexing
- No VS Code yet

**Next: V1.5**
- Plugin architecture
- Honesty plugins
- Fourth Generation Formula extraction as first plugin

**Then: V2.0 (Marketplace Focus)**
- Creator Marketplace launch
- Creator onboarding and revenue sharing tools
- Plugin submission and review process
- Basic VS Code continuity (shared context, no Builder Plugin yet)
- Growth engine: creators bring their audiences

**Then: V3.0 (VS Code OSQR)**
- Full VS Code extension
- Builder Plugin with:
  - Queue System
  - Full project indexing
  - Autonomous implementation capability
- Self-indexed OSQR
- "OSQR improving OSQR" demo ready

**Future: V3.0+**
- Builder Plugin extensions (background building, external services)
- Full interface independence
- Competing dev plugins from other creators
- Mobile interface with full capability
- Voice-driven development

---

## Market Context & Differentiation

**Competitors:** GitHub Copilot, Cursor, Continue, Cody, Supermaven

**OSQR's Differentiation:**
* **Memory that persists** - PKV/MSC means OSQR remembers your projects, decisions, and principles across sessions
* **Multi-model routing** - Not locked to one AI; uses the right model for the task
* **Integrated with life OS** - Your dev work connects to your broader goals via MSC
* **Learns from you** - Gets better at YOUR codebase over time
* **Plugin architecture** - Advanced capabilities are opt-in, not forced

---

## Success Criteria

**Core VS Code Extension:**
- Seamless continuity between web and VS Code
- PKV + MSC round trip works (read + write)
- Basic Refine → Fire works on code selections
- Context awareness delivers real value

**Builder Plugin:**
- Queue System bridges web conversations to VS Code implementation
- Refine → Fire works on code selections with full project context
- Autonomous Mode safely executes chunks of work in branches
- Produces ASSUMPTIONS/BLOCKED/PROGRESS files
- Never modifies main without explicit merge

**Future (V3.0+):**
- Can reliably scaffold a real, working SaaS-style app from a natural language spec
- Builds on patterns learned from prior OSQR and VoiceQuote projects
- Background building while user is away

---

## Related Documents

- [DEVELOPMENT-PHILOSOPHY.md](../strategy/DEVELOPMENT-PHILOSOPHY.md) - Strategic sequencing and timeline
- [AUTONOMOUS-APP-BUILDER.md](./AUTONOMOUS-APP-BUILDER.md) - Project Builder blueprint (depends on this)
- [QUEUE-SYSTEM.md](../features/QUEUE-SYSTEM.md) - Decision queue bridging web conversations to VS Code implementation
- [SUPREME-COURT-BUTTON.md](../features/SUPREME-COURT-BUTTON.md) - Adversarial deliberation mode
- [COUNCIL-MODE.md](../features/COUNCIL-MODE.md) - Visible multi-model feature
- [ROADMAP.md](../../ROADMAP.md) - Phase X entry

---

*This document preserved for future reference. Implementation begins after Phase 3 Intelligence Layer is stable.*
*Last major update: December 2025 - Core/Plugin architecture separation*
