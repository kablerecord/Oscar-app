# OSQR Brain Documentation

**This app (oscar-app) is one interface to the OSQR brain.**

The brain's philosophy, architecture, and feature specifications live in the `@osqr/core` library, not here.

---

## Where to Find Brain Documentation

All brain-level documentation has been moved to:

```
/Users/kablerecord/Desktop/4thGen/osqr/docs/
```

### Philosophy (Layer 0-1) — How OSQR Thinks

| Document | Description |
|----------|-------------|
| [OSQR_CONSTITUTION.md](../4thGen/osqr/docs/philosophy/OSQR_CONSTITUTION.md) | Immutable principles — the soul of OSQR |
| [OSQR_PHILOSOPHY.md](../4thGen/osqr/docs/philosophy/OSQR_PHILOSOPHY.md) | Beliefs about growth, effort, imagination |
| [PRIVACY-PHILOSOPHY.md](../4thGen/osqr/docs/philosophy/PRIVACY-PHILOSOPHY.md) | Data ownership and privacy values |
| [UX_PHILOSOPHY.md](../4thGen/osqr/docs/philosophy/UX_PHILOSOPHY.md) | Interface philosophy (Focus Mode, progressive reveal) |
| [DEVELOPMENT-PHILOSOPHY.md](../4thGen/osqr/docs/philosophy/DEVELOPMENT-PHILOSOPHY.md) | How we build OSQR |
| [SEPARATION_PATTERN.md](../4thGen/osqr/docs/philosophy/SEPARATION_PATTERN.md) | Core vs Plugin separation |
| [TRUST-PRIVACY-MANIFESTO.md](../4thGen/osqr/docs/philosophy/TRUST-PRIVACY-MANIFESTO.md) | Trust and privacy commitments |

### Architecture (Layer 2) — How OSQR is Built

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](../4thGen/osqr/docs/architecture/ARCHITECTURE.md) | Master architecture document |
| [MULTI-MODEL-ARCHITECTURE.md](../4thGen/osqr/docs/architecture/MULTI-MODEL-ARCHITECTURE.md) | Model routing and orchestration |
| [KNOWLEDGE_ARCHITECTURE.md](../4thGen/osqr/docs/architecture/KNOWLEDGE_ARCHITECTURE.md) | Two-brain knowledge system |
| [PLUGIN_ARCHITECTURE.md](../4thGen/osqr/docs/architecture/PLUGIN_ARCHITECTURE.md) | Plugin system design |
| [SAFETY_SYSTEM.md](../4thGen/osqr/docs/architecture/SAFETY_SYSTEM.md) | Safety and crisis handling |
| [PRIVACY_TIERS.md](../4thGen/osqr/docs/architecture/PRIVACY_TIERS.md) | Privacy tier implementation |
| [TELEMETRY_SPEC.md](../4thGen/osqr/docs/architecture/TELEMETRY_SPEC.md) | Behavioral telemetry |

### Features — What OSQR Can Do

| Document | Description |
|----------|-------------|
| [COUNCIL-MODE.md](../4thGen/osqr/docs/features/COUNCIL-MODE.md) | Multi-model deliberation |
| [BUBBLE-COMPONENT-SPEC.md](../4thGen/osqr/docs/features/BUBBLE-COMPONENT-SPEC.md) | Proactive intelligence surfacing |
| [SUPREME-COURT-BUTTON.md](../4thGen/osqr/docs/features/SUPREME-COURT-BUTTON.md) | Adversarial deliberation |
| [META_OSQR_MODE.md](../4thGen/osqr/docs/features/META_OSQR_MODE.md) | Self-improvement mode |

### Vision — Where OSQR is Going

| Document | Description |
|----------|-------------|
| [VSCODE-DEV-COMPANION.md](../4thGen/osqr/docs/vision/VSCODE-DEV-COMPANION.md) | VS Code extension vision |
| [CREATOR_MARKETPLACE.md](../4thGen/osqr/docs/vision/CREATOR_MARKETPLACE.md) | Plugin marketplace |
| [AUTONOMOUS-APP-BUILDER.md](../4thGen/osqr/docs/vision/AUTONOMOUS-APP-BUILDER.md) | App builder vision |

### Implementation Specs

The `@osqr/core` library also contains implementation-ready specs:

```
/Users/kablerecord/Desktop/4thGen/osqr/specs/
├── constitutional-framework-v1.md
├── memory-vault-v1.md
├── multi-model-router-v1.md
├── project-guidance-v1.md
├── temporal-intelligence-v1.md
├── council-mode-v1.md
├── bubble-interface-v1.md
├── plugin-architecture-v1.md
└── design-system-v1.md
```

---

## What Lives HERE (oscar-app)

This repository contains app-specific documentation:

```
oscar-app/docs/
├── app/              # App setup, testing, knowledge base guide
├── process/          # Development tracking (BLOCKED, PROGRESS, etc.)
├── business/         # Pricing, launch strategy, marketing
└── reference/        # Technical references
```

### Key App Documents

- [ROADMAP.md](./ROADMAP.md) — App implementation milestones
- [README.md](./README.md) — App setup and overview
- [docs/app/SETUP.md](./docs/app/SETUP.md) — Development environment setup
- [docs/app/QUICKSTART.md](./docs/app/QUICKSTART.md) — Quick start guide

---

## The Relationship

```
┌─────────────────────────────────────────────────────────────┐
│                      @osqr/core                              │
│         (The Brain - Philosophy, Architecture, Logic)        │
│                                                              │
│   /4thGen/osqr/                                             │
│   ├── docs/         ← Philosophy, architecture, vision      │
│   ├── specs/        ← Implementation specifications         │
│   └── src/          ← TypeScript library (1,184 tests)      │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ imports
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      oscar-app                               │
│           (One Interface - Next.js Web Application)          │
│                                                              │
│   /oscar-app/                                                │
│   ├── app/          ← Next.js routes                        │
│   ├── components/   ← React components                      │
│   ├── lib/          ← App business logic                    │
│   └── docs/         ← App-specific docs only                │
└─────────────────────────────────────────────────────────────┘
```

---

## When to Reference What

| Question | Look In |
|----------|---------|
| "What are OSQR's core principles?" | osqr/docs/philosophy/OSQR_CONSTITUTION.md |
| "How does the multi-model router work?" | osqr/docs/architecture/MULTI-MODEL-ARCHITECTURE.md |
| "How do I set up the oscar-app locally?" | oscar-app/docs/app/SETUP.md |
| "What's the app launch strategy?" | oscar-app/docs/business/LAUNCH_STRATEGY.md |
| "What's blocked in development?" | oscar-app/docs/process/BLOCKED.md |
| "How is Council Mode implemented?" | osqr/specs/council-mode-v1.md |

---

*Last updated: 2025-12-19*
