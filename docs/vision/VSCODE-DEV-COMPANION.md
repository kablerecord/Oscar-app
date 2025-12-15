# OSQR VS Code Dev Companion - Full Vision Document

**Status:** Vision/Planning (Do not implement until prerequisites met)
**Created:** 2025-12-08
**Source:** ChatGPT planning session
**Prerequisites:** Core OSQR app launched, Intelligence Layer (Phase 3) stable, PKV/MSC battle-tested

---

> **Important:** This is a **post-v1** initiative. Do not block launch on this.
> Sequence: Core OSQR app → Intelligence Layer → then VS Code Dev Companion.

---

## Purpose

Make OSQR feel like a **senior engineer + strategist + historian** embedded in VS Code, powered by the real OSQR backend (multi-model router, PKV, MSC, memory systems) — not a prompt hack.

---

## Goals & Outcomes

* Use the **real OSQR backend** for:
  * Multi-model routing (Quick / Thoughtful / Contemplate)
  * Refine → Fire
  * PKV + MSC read/write
  * Autonomous Mode (in later milestone)
* Lay the groundwork for **OSQR Project Builder** (future: "describe your app, OSQR builds it")

---

## Milestone Sequence

**Milestone X.1 – Dev Companion v1 (Core Integration)**
**Milestone X.2 – Autonomous Developer Mode (Jarvis-style)**
**Milestone X.3 – Project Builder (App-from-idea engine)**

These are stacked. v1 must ship *before* Autonomous and Project Builder.

---

## Dev Companion v1 – Core Spec

### Extension Basics

* VS Code extension named **"OSQR Dev Companion"**
* Connects to OSQR via:
  * API key / OAuth (user's OSQR account)
  * Project binding (see `.osqr-project.json` below)
* Exposes:
  * A **sidebar panel** ("OSQR Dev Panel")
  * Several **command palette** commands

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

### OSQR Dev Panel – Sidebar

**1. Context Panel**
* Shows:
  * Current file + language
  * Short inferred "active task" (based on file + recent diff)
* Example: `Currently editing: app/(marketing)/page.tsx – Likely working on: Landing page layout`

**2. Tasks & Questions Panel**
* Shows:
  * `DONE` (recent OSQR-made changes in this branch)
  * `OPEN QUESTIONS` (things OSQR is waiting on)
  * `ASSUMPTIONS` (decisions OSQR made to keep moving – pulled from ASSUMPTIONS.md style)
* Provides:
  * One-click "Convert to TODO in osqr-todos.md"

**3. Insights Panel (PKV + MSC Bridge)**
* Shows:
  * Project insights pulled from PKV (architecture decisions, conventions)
  * Suggested MSC entries (coding principles learned from this repo)
* Buttons:
  * `Save to PKV`
  * `Promote to MSC`

---

## Commands & In-Editor Behaviors

### OSQR: Refine & Fire on Selection

* Command: **OSQR: Refine & Fire on Selection**
* Behavior:
  1. User selects code or writes a natural language comment
  2. Extension sends:
     * Selection
     * File path + language
     * Short project context (from `.osqr-project.json` + PKV)
  3. OSQR runs **Refine → Fire**:
     * Refine: clarify goal, constraints, and desired outcome
     * Fire: send to multi-model panel (based on Quick / Thoughtful / Contemplate)
  4. Returns:
     * Proposed code changes
     * Rationale
     * Any assumptions/questions
  5. UI:
     * Diff-style view or code block suggestion
     * Apply / Copy / Ask follow-up

### OSQR: Generate Project TODO Roadmap

* Command: **OSQR: Generate Roadmap from Repo**
* OSQR:
  * Scans repo structure
  * Reads existing ROADMAP.md (if present)
  * Produces a scoped TODO list:
    * `Now` / `Soon` / `Later`
    * Dependency hints (task B depends on A)
  * Writes/updates `osqr-todos.md` at project root
  * Links major items to PKV as project tasks

### OSQR: Summarize Recent Work (Commit Helper)

* Command: **OSQR: Summarize Recent Changes**
* Behavior:
  * Reads `git diff` since last commit
  * Generates:
    * Commit message options
    * Short "changelog-style" summary
    * Candidate insights for MSC (e.g., "We standardized on layout pattern X.")
  * User can:
    * Copy commit message
    * Save insight to PKV/MSC

---

## PKV & MSC Integration in VS Code

### Read Path (Into Editor)

On project load, OSQR extension:
* Fetches project notes & decisions from PKV
* Fetches MSC entries tagged with this project
* Displays them in Insights Panel as "Project Context"

### Write Path (Back to OSQR)

From VS Code, OSQR can:
* Save decisions (e.g., "We chose Prisma with Postgres for this project")
* Propose new MSC entries (global dev principles) for user approval

UX:
* Simple buttons: `Save to PKV`, `Promote to MSC`
* No long forms; OSQR generates the text

---

## Refine → Fire Behavior (In-Code)

Replicate OSQR's core Refine → Fire pipeline, but **context-aware for code**:

**1. Input**
* Selected code or natural language instruction in a comment

**2. Refine (internal + optional visible summary)**
* Identify:
  * Goal (refactor / add feature / fix bug / enhance UX)
  * Constraints (framework, patterns, performance)
  * Relevant files (found via static analysis / PKV)
* Optionally show a one-line "Refined Intent" in sidebar:
  * e.g., `Goal: Extract reusable usePricingPlans hook respecting existing API types.`

**3. Fire (multi-model panel)**
* Use OSQR router:
  * Quick → single model
  * Thoughtful / Contemplate → multi-model + synthesis
* Synthesis:
  * Merge suggestions
  * Highlight disagreements
  * Output final suggestion + rationale

**4. Post-Processing**
* Log assumptions (for ASSUMPTIONS-like view)
* Suggest any durable patterns as MSC candidates

---

## Milestone X.2 – Autonomous Developer Mode

> **Prerequisite:** Dev Companion v1 is stable. Autonomous Mode is an advanced feature, not default.

### Core Rules (High-Level)

When user runs **"OSQR: Run in Autonomous Mode"**, OSQR will:
1. Break work into tasks/subtasks from ROADMAP.md / osqr-todos.md
2. Build a dependency graph
3. Execute tasks in optimal order
4. When blocked, store questions and pivot
5. Only stop when nothing else can progress without input
6. Batch all questions at the end
7. Make small assumptions, but document them

### Safety: Branches & Checkpoints

Always:
* Create a new branch: `osqr-autonomous-###`
* Create frequent tags:
  * e.g., `checkpoint/branding-complete`, `checkpoint/three-modes-complete`

Maintain files:
* `AUTONOMOUS-GUIDELINES.md` – rules OSQR follows
* `ASSUMPTIONS.md` – decisions made
* `BLOCKED.md` – items waiting on external factors
* `PROGRESS.md` – quick state + phase status + next actions

At end of run, OSQR prints rollback instructions to user.

---

## Milestone X.3 – Project Builder (Future)

> **Prerequisite:**
> * OSQR core app & Intelligence Layer are mature
> * PKV/MSC patterns for multiple real projects (OSQR, VoiceQuote, etc.)
> * Autonomous Mode is stable in controlled environments

### User Experience

Entry command (web + VS Code):
* **"Create a New Project with OSQR"**

Flow:
1. User describes the app (natural language)
2. OSQR asks clarifying questions
3. OSQR generates a **Project Blueprint**:
   * Stack
   * Pages/routes
   * Data models
   * Integrations
   * Auth pattern
4. OSQR confirms with user, then:
   * Creates repo structure
   * Initializes project
   * Populates core features
   * Generates `ROADMAP.md`, `PROGRESS.md`, and `.osqr-project.json`
   * Optionally starts Autonomous Mode

### Learning Loop

Each completed project:
* Logs patterns and decisions into PKV
* Distills principles into MSC under "Development"
* Improves future blueprinting and autonomous sequences

---

## Success Criteria

**Dev Companion v1:**
* Refine → Fire works on code selections
* PKV + MSC round trip works (read + write)
* Roadmap + commit helper features deliver real value

**Autonomous Mode:**
* Safely executes chunks of roadmap work in branches
* Produces ASSUMPTIONS/BLOCKED/PROGRESS files
* Never modifies main without explicit merge

**Project Builder (future):**
* Can reliably scaffold a real, working SaaS-style app from a natural language spec
* Builds on patterns learned from prior OSQR and VoiceQuote projects

---

## Technical Notes

### Extension Architecture (Reference)

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
```

### API Endpoints Required (Reference)

* `POST /api/vscode/refine` - Refine question with code context
* `POST /api/vscode/fire` - Multi-model query with code context
* `GET /api/vscode/pkv/search` - Search PKV from extension
* `POST /api/vscode/pkv/index` - Index code/decisions to PKV
* `GET /api/vscode/context` - Get current project context
* `POST /api/vscode/tasks` - Sync tasks with web app

---

## Market Context & Differentiation

**Competitors:** GitHub Copilot, Cursor, Continue, Cody, Supermaven

**OSQR's Differentiation:**
* **Memory that persists** - PKV/MSC means OSQR remembers your projects, decisions, and principles across sessions
* **Multi-model routing** - Not locked to one AI; uses the right model for the task
* **Integrated with life OS** - Your dev work connects to your broader goals via MSC
* **Learns from you** - Gets better at YOUR codebase over time

---

## Related Documents

- [DEVELOPMENT-PHILOSOPHY.md](../strategy/DEVELOPMENT-PHILOSOPHY.md) - Strategic sequencing and timeline
- [AUTONOMOUS-APP-BUILDER.md](./AUTONOMOUS-APP-BUILDER.md) - Project Builder blueprint (depends on this)
- [SUPREME-COURT-BUTTON.md](../features/SUPREME-COURT-BUTTON.md) - Adversarial deliberation mode
- [COUNCIL-MODE.md](../features/COUNCIL-MODE.md) - Visible multi-model feature
- [ROADMAP.md](../../ROADMAP.md) - Phase X entry

---

*This document preserved for future reference. Implementation begins after Phase 3 Intelligence Layer is stable.*
