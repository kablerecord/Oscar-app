# OSQR Project Context for Claude

## Workspace Overview

You have a **VS Code multi-root workspace** (`osqr-workspace.code-workspace`) that contains THREE separate projects:

```
~/Desktop/
├── oscar-app/        # Main app monorepo (THIS REPO - ACTIVE)
├── osqr/             # Original OSQR brain (LEGACY - being migrated)
└── osqr-website/     # Old marketing site (LEGACY - fully migrated)
```

**IMPORTANT:** `oscar-app` is the primary, active codebase. The other two are legacy/reference.

---

## oscar-app (THIS REPO) - The Main Monorepo

This is a **monorepo** - all active OSQR code lives here, organized into packages.

### What is a Monorepo?

A monorepo (mono = one, repo = repository) means all related code lives in a single Git repository, organized into separate "packages" that can depend on each other. Managed by:

- **pnpm workspaces** - Allows packages to reference each other with `workspace:*`
- **Turborepo** - Runs build/dev/test commands across all packages efficiently

**Benefits:**
- Single `git clone` gets everything
- Shared dependencies (one `node_modules` at root)
- Easy cross-package imports (`@osqr/core` from `@osqr/app-web`)
- Atomic commits across the whole product

---

## oscar-app Structure

```
oscar-app/                    # Root of the monorepo
├── packages/
│   ├── app-web/             # @osqr/app-web - The main Next.js app
│   ├── core/                # @osqr/core - The OSQR brain/engine
│   └── shared/              # Shared utilities (future use)
├── websites/
│   └── marketing/           # @osqr/marketing - Marketing site (osqr.ai)
├── docs/                    # Documentation
├── turbo.json               # Turborepo config
├── pnpm-workspace.yaml      # Workspace definition
└── package.json             # Root package.json
```

---

## The Three Packages in oscar-app

### 1. `packages/app-web` (@osqr/app-web)
**What users interact with.** The main OSQR application.

- **Tech:** Next.js 16, React 19, Prisma, NextAuth
- **Port:** 3001 (dev)
- **URL:** app.osqr.ai (production)
- **Contains:**
  - `/app` - Next.js pages and API routes
  - `/components` - React components
  - `/lib` - Business logic, AI providers, tiers, etc.
  - `/prisma` - Database schema

**Key files:**
- `lib/tiers/config.ts` - Pricing tier definitions (source of truth)
- `lib/ai/` - AI provider integrations
- `app/api/` - API endpoints

### 2. `packages/core` (@osqr/core)
**The OSQR brain.** Constitutional AI, governance, and core reasoning.

- **Tech:** TypeScript, compiled to dist/
- **Status:** Being built - specs migrated from `osqr/` repo
- **Contains:**
  - Constitutional AI wrappers
  - OSQR reasoning engine
  - Specifications and design docs (`/specs`)

**Imported by:** `@osqr/app-web` uses `@osqr/core` for AI governance

### 3. `websites/marketing` (@osqr/marketing)
**The marketing website.** Public-facing site at osqr.ai.

- **Tech:** Next.js 16, React 19
- **Port:** 3000 (dev)
- **URL:** osqr.ai (production)
- **Migrated from:** `osqr-website/` (legacy)

---

## Legacy Repos (Reference Only)

### ~/Desktop/osqr/
**Original OSQR brain specs and implementation.**

- Contains original specs being migrated to `oscar-app/packages/core/`
- Has valuable documentation in `docs/` and `specs/`
- **Status:** LEGACY - reference only, don't develop here

### ~/Desktop/osqr-website/
**Original marketing website.**

- Old Next.js marketing site
- **Status:** LEGACY - fully migrated to `oscar-app/websites/marketing/`
- Can be archived/deleted

---

## Common Commands

From the **root** of oscar-app:

```bash
# Install all dependencies
pnpm install

# Run all dev servers
pnpm dev

# Build all packages
pnpm build

# Run only app-web (port 3001)
pnpm --filter @osqr/app-web dev

# Run only marketing site (port 3000)
pnpm --filter @osqr/marketing dev
```

---

## Environment Variables

- `packages/app-web/.env` - Database, API keys, Stripe links
- `packages/app-web/.env.example` - Template for env vars
- `websites/marketing/.env` - Marketing-specific config (if any)

---

## Pricing (Current State)

**Source of truth:** `packages/app-web/lib/tiers/config.ts`

| Tier | Monthly | Yearly | Future Price | Status |
|------|---------|--------|--------------|--------|
| Lite | $19 | N/A | $29 | Hidden until 500 paid users |
| Pro | $99 | $948 ($79/mo) | $149 | Active |
| Master | $249 | $2,388 ($199/mo) | $349 | Active |

**Founder pricing:** First 500 paid users lock in current rates forever.

---

## Deployment

- **app-web:** Railway (app.osqr.ai)
- **marketing:** Vercel (osqr.ai)
- **Database:** Supabase PostgreSQL with pgvector

---

## Key Documentation

- `ARCHITECTURE.md` - System architecture overview
- `ROADMAP.md` - Product roadmap and features
- `docs/business/OSQR-PRICING-SPEC.md` - Pricing strategy
- `docs/business/PRICING-ARCHITECTURE.md` - Pricing implementation
- `packages/core/specs/` - Technical specifications

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Where's the active code? | `oscar-app/` (this repo) |
| Where's the pricing logic? | `packages/app-web/lib/tiers/config.ts` |
| Where's the pricing UI? | `packages/app-web/app/pricing/page.tsx` and `websites/marketing/src/app/pricing/page.tsx` |
| Where's the AI code? | `packages/app-web/lib/ai/` |
| Where's the database schema? | `packages/app-web/prisma/schema.prisma` |
| Where are API routes? | `packages/app-web/app/api/` |
| Where's the marketing site? | `websites/marketing/` |
| Where are OSQR specs? | `packages/core/specs/` (migrated from `osqr/specs/`) |

---

## Naming Conventions

- **OSQR** - The product name (Operating System for Quantum Reasoning)
- **Oscar** - The AI persona/companion
- **oscar-app** - This repository (the monorepo)
- **@osqr/*** - Package names within the monorepo
- **osqr/** - Legacy brain repo (reference only)
- **osqr-website/** - Legacy marketing site (archived)

---

## When Working in This Codebase

1. **Always work in `oscar-app/`** - This is the active codebase
2. **Reference `osqr/` for specs** - But implement in `packages/core/`
3. **Keep pricing in sync** - Both `app-web` and `marketing` have pricing pages
4. **Use pnpm** - Not npm or yarn (monorepo requirement)

---

## AI Provider Integration

**Location:** `packages/app-web/lib/ai/providers/`

| Provider | Env Var | Models | Status |
|----------|---------|--------|--------|
| OpenAI | `OPENAI_API_KEY` | GPT-4o, GPT-4o-mini | Active |
| Anthropic | `ANTHROPIC_API_KEY` | Claude Opus 4, Sonnet 4, Haiku | Active |
| Google | `GOOGLE_AI_API_KEY` | Gemini 2.0 Flash Pro | Active |
| xAI | `XAI_API_KEY` | Grok 2 | Active |
| Groq | `GROQ_API_KEY` | Llama 3.3 70B | Ready (not in use yet) |

**Routing:** See `lib/ai/model-router.ts` for question type detection and model selection.

**Modes:**
- Quick: Claude Sonnet 4 only (2-8 sec)
- Thoughtful: 3 diverse models in parallel → synthesis (20-40 sec)
- Contemplate: 4 models + 2 roundtables → deep synthesis (60-90 sec)

---

## Founder Spot Tracking

**Limit:** 500 founder spots (locked-in pricing forever)

**API:** `GET /api/founder-spots` returns:
```json
{
  "remainingSpots": 500,
  "isFounderPeriod": true,
  "percentageFilled": 0
}
```

**Implementation:** `lib/admin/platform-metrics.ts` → `getFounderSpotStatus()`

**Lite Tier:** Hidden until 500 paid users reached (see `lib/tiers/config.ts` line 54)

---

## Railway Deployment (app-web)

**Config:** `railway.json` at repo root points to `packages/app-web/Dockerfile`

**Important:** The Dockerfile uses paths like `COPY packages/app-web/...` because Railway builds from repo root with `dockerfilePath` pointing to the subdirectory.

**Domains:**
- `app.osqr.app` (custom domain)
- `oscar-app-production.up.railway.app`

---

## Insights System (V1.5)

**Build Plan:** `docs/features/INSIGHTS_BUILD_PLAN.md`

When user says "build the insights system" or similar, read that doc first. It has:
- What's already built in `lib/til/`
- Three phases with checkboxes
- Links to all spec docs
- Estimated 3-4 sessions to complete MVP

**Specs:**
- `docs/features/OSQR_SECRETARY_CHECKLIST_ADDENDUM.md` - 12 detection categories
- `docs/features/OSQR_AI_HISTORY_INTERVIEW_SPEC.md` - ChatGPT/Claude import
- `docs/features/OSQR_AUTO_ORGANIZATION_SPEC.md` - Auto-titling, project linking

---

## V1.5 Implementation Status

### User Intelligence Profile (UIP) ✅ COMPLETE
**Spec:** `docs/architecture/UIP_SPEC.md`
**What it is:** OSQR's continuously updating mentorship rulebook. Learns how to work with each user over time. Not psychology — Mentorship-as-Code.

**Key concepts:**
- 3-tier domain structure: Foundation (Identity, Goals) → Style (Cognitive, Communication, Expertise) → Dynamics (Behavioral, Relationship, Decision Friction)
- Prospective Reflection Engine: Background job that synthesizes signals into UIP updates
- Progressive elicitation: Session 1 = zero questions, Sessions 2-4 = one question each, cap at 4, always skippable
- Confidence decay: Old signals decay over time
- Privacy Tier integration: Tier A/B/C controls what gets collected

**Implementation:** All components built and wired. See `lib/uip/` for service, elicitation, reflection, and adapters.

### Behavioral Intelligence Layer (BIL) ✅ COMPLETE
**Spec:** `docs/features/BEHAVIORAL_INTELLIGENCE_LAYER.md`
**What it is:** Telemetry and pattern detection for personalization. Feeds UIP with behavioral signals.

**Components:**
- TelemetryCollector: Database-backed event collection with privacy tier enforcement
- PatternAggregator: Detects mode preference, usage time, feature adoption, engagement, satisfaction patterns
- UserBehaviorModel: Builds user profiles from patterns, calculates churn risk and upsell readiness
- PrivacyTierManager: Enforces A/B/C tier data collection rules

**Implementation:** All components built. See `lib/telemetry/`

---

### Render System 🟡 PARTIAL
**Spec:** `docs/features/RENDER_SYSTEM_SPEC.md`
**What it is:** First execution surface where OSQR produces visible artifacts (images, charts). "Gives intelligence a place to land."

**Key concepts:**
- Canonical render loop: User requests → "Rendering..." → "Render complete. Would you like to see it?" → User confirms → Shows artifact → "How does that look?"
- v1.5 scope: IMAGE (DALL-E 3) + CHART (Recharts) only. UI/Game deferred to v1.6+
- Explicit render intent: `/render`, "visualize", "draw" keywords. No fuzzy detection yet.
- State machine: IDLE → RENDERING → COMPLETE_AWAITING_VIEW → VIEWING → UPDATING → ERROR/CANCELLED
- Client-side rendering from stored spec (no server execution, no sandboxing)
- Conversation linking: Artifacts belong to conversations, "make it blue" updates most recently viewed

**Implementation Status:**
- Intent detection: ✅ Complete (`lib/render/intent-detection.ts`)
- Types & interfaces: ✅ Complete (`lib/render/types.ts`)
- Service wiring: ❌ Not wired to ask route
- Image generation: ❌ Not integrated
- Chart generation: ❌ Not integrated

**Build order:** Database & API → Render Intent Detection → Image Artifact → Chart Artifact → Render Surface → State Machine → Bubble Integration → Iteration Flow → Error Handling

---

## Design Philosophy (Important Context)

When building OSQR features, these principles apply:

1. **Sequenced autonomy** — OSQR does more over time, but earns the right through trust. v1.5 shows, v2.0 writes, v3.0 executes.

2. **Consent gates** — User confirms before OSQR acts. "Would you like to see it?" is UX and legal boundary.

3. **PKV > UIP** — Explicit user statements always override inferred signals.

4. **Privacy Tiers matter** — Tier A = minimal collection, Tier B = personal learning, Tier C = global learning. Check tier before collecting.

5. **Bubble is the orchestrator** — One conversation, multiple surfaces. Bubble announces, asks consent, bridges screens.

6. **No sub-phasing features** — Build the whole thing. Don't split a feature into MVP → v2 → v3. Ship complete, iterate later.

---

## Pre-Launch Checklist

See `docs/process/BLOCKED.md` for:
- AI Provider Billing checklist (all 5 providers)
- Cost estimates per user tier
- Blocked items needing resolution

---

## Communication Protocol

Use these templates for structured communication during implementation sessions.

### When Blocked:
```
🚧 BLOCKER: [Description]
NEED FROM KABLE: [Question/decision needed]
```

### When Spec Needs Revision:
```
📝 SPEC REVISION NEEDED: [filename]
ISSUE: [What's unclear or problematic]
SUGGESTED: [Your recommendation]
```

### When Complete:
```
✅ COMPLETED: [Component/Feature]
TESTED: [Yes/No]
NEXT: [What's next]
```

### Session Workflow

**At Session Start:**
1. Read relevant specs/docs for the task
2. Identify dependencies and blockers
3. Confirm approach before implementing

**During Implementation:**
- Follow specs exactly — flag issues, don't silently change specs
- Write tests alongside code
- If blocked, document what you need and move to another task

**At Session End:**
- Update ROADMAP.md if status changed
- Summarize what was built, what's working, what's needed next

---

## Research Library

For deep context on AI architecture, MCP, context engineering, and related topics, see:

**Location:** `docs/research/README.md`

This contains 48 curated research documents from NotebookLM covering:
- Model Context Protocol (MCP)
- Multi-agent systems
- Context engineering
- n8n workflow automation
- BMAD methodology
- LLM research and fine-tuning

**If something is unclear in these docs**, ask Kable — he can query the NotebookLM project for deeper detail.

---

## Self-Audit Protocol

When Kable pastes a **REBUILD document** from OSQR, follow the protocol at:

**Location:** `docs/audits/OSQR_SELF_AUDIT_PROTOCOL.md`

This protocol defines:
- How OSQR audits himself (finding format, severity levels, evidence requirements)
- How Claude in VS Code executes the fixes (in order, with verification)
- The completion report format

**The workflow:**
1. OSQR runs audit → produces REBUILD document
2. Kable pastes REBUILD document to Claude in VS Code
3. Claude reads the protocol, reads CLAUDE.md, executes fixes in order
4. Claude reports completion

**Finding types:** MISSING | MISALIGNED | BROKEN | INCOMPLETE | UNTESTED | CONFLICT | DRIFT | DELETE
