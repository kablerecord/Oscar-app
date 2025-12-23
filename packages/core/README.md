# @osqr/core

**Operating System for Quantum Reasoning**

The brain behind OSQR — a capability operating system that multiplies people at whatever level they operate.

---

## What is This?

`@osqr/core` is a standalone TypeScript library containing OSQR's:

- **Constitutional Framework** — Immutable principles, gatekeeper logic, safety
- **Memory Vault** — Three-tier persistent memory (episodic, semantic, procedural)
- **Multi-Model Router** — Intelligent routing between AI models
- **Council Mode** — Multi-model deliberation with synthesis
- **Bubble Interface** — Proactive intelligence surfacing
- **And more...**

This library is **interface-agnostic**. It can be used by:
- Web apps (like oscar-app)
- VS Code extensions
- Mobile apps
- CLI tools
- Any future interface

---

## Documentation

### Philosophy (Layer 0-1) — How OSQR Thinks

| Document | Purpose |
|----------|---------|
| [OSQR_CONSTITUTION.md](docs/philosophy/OSQR_CONSTITUTION.md) | Immutable principles — the soul of OSQR |
| [OSQR_PHILOSOPHY.md](docs/philosophy/OSQR_PHILOSOPHY.md) | Beliefs about growth, effort, imagination |
| [PRIVACY-PHILOSOPHY.md](docs/philosophy/PRIVACY-PHILOSOPHY.md) | Data ownership and privacy values |
| [UX_PHILOSOPHY.md](docs/philosophy/UX_PHILOSOPHY.md) | Interface philosophy |
| [DEVELOPMENT-PHILOSOPHY.md](docs/philosophy/DEVELOPMENT-PHILOSOPHY.md) | How we build |
| [SEPARATION_PATTERN.md](docs/philosophy/SEPARATION_PATTERN.md) | Core vs Plugin separation |

### Architecture (Layer 2) — How OSQR is Built

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | Master architecture document |
| [MULTI-MODEL-ARCHITECTURE.md](docs/architecture/MULTI-MODEL-ARCHITECTURE.md) | Model routing |
| [KNOWLEDGE_ARCHITECTURE.md](docs/architecture/KNOWLEDGE_ARCHITECTURE.md) | Two-brain knowledge |
| [PLUGIN_ARCHITECTURE.md](docs/architecture/PLUGIN_ARCHITECTURE.md) | Plugin system |
| [SAFETY_SYSTEM.md](docs/architecture/SAFETY_SYSTEM.md) | Safety handling |
| [PRIVACY_TIERS.md](docs/architecture/PRIVACY_TIERS.md) | Privacy tiers |

### Features — What OSQR Can Do

| Document | Purpose |
|----------|---------|
| [COUNCIL-MODE.md](docs/features/COUNCIL-MODE.md) | Multi-model deliberation |
| [BUBBLE-COMPONENT-SPEC.md](docs/features/BUBBLE-COMPONENT-SPEC.md) | Proactive intelligence |
| [SUPREME-COURT-BUTTON.md](docs/features/SUPREME-COURT-BUTTON.md) | Adversarial deliberation |
| [META_OSQR_MODE.md](docs/features/META_OSQR_MODE.md) | Self-improvement |

### Vision — Where OSQR is Going

| Document | Purpose |
|----------|---------|
| [VSCODE-DEV-COMPANION.md](docs/vision/VSCODE-DEV-COMPANION.md) | VS Code extension |
| [CREATOR_MARKETPLACE.md](docs/vision/CREATOR_MARKETPLACE.md) | Plugin marketplace |
| [AUTONOMOUS-APP-BUILDER.md](docs/vision/AUTONOMOUS-APP-BUILDER.md) | App builder |

---

## Implementation Specs

Detailed implementation specifications for each component:

```
specs/
├── constitutional-framework-v1.md   ✅ Complete (179 tests)
├── memory-vault-v1.md               ✅ Complete (101 tests)
├── multi-model-router-v1.md         ✅ Complete (120 tests)
├── project-guidance-v1.md           ✅ Complete (143 tests)
├── temporal-intelligence-v1.md      ✅ Complete (162 tests)
├── council-mode-v1.md               ✅ Complete (125 tests)
├── bubble-interface-v1.md           ✅ Complete (189 tests)
├── design-system-v1.md              ✅ Complete (165 tests)
└── plugin-architecture-v1.md        🔲 Not Started (v1.5+)
```

**Total: 1,184 tests passing**

---

## Source Code

```
src/
├── constitutional/     # Gatekeeper, validator, sandbox, detection
├── memory-vault/       # Stores, retrieval, synthesis, privacy
├── router/             # Model classification, routing, escalation
├── guidance/           # MentorScript, context budgeting
├── temporal-intelligence/  # Commitment extraction, priorities
├── council/            # Multi-model deliberation, synthesis
├── bubble/             # Proactive surfacing, budget, feedback
└── design-system/      # Tokens, CSS, hooks, components
```

---

## Project Tracking

| Document | Purpose |
|----------|---------|
| [OSQR-ROADMAP.md](OSQR-ROADMAP.md) | Master implementation roadmap |
| [BUILD-LOG.md](BUILD-LOG.md) | Session-by-session progress |
| [IMPLEMENT.md](IMPLEMENT.md) | Session template |

---

## Usage

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

---

## Interfaces

`@osqr/core` is the brain. Interfaces include:

| Interface | Repository | Status |
|-----------|------------|--------|
| Web App | [oscar-app](../../../oscar-app) | In Development |
| VS Code Extension | TBD | Planned (v2.0) |
| Mobile App | TBD | Future |

---

## The Governance Stack

```
Layer 0 — CONSTITUTION (docs/philosophy/OSQR_CONSTITUTION.md)
    │     Immutable principles, what OSQR will never violate
    │
    ▼
Layer 1 — PHILOSOPHY (docs/philosophy/OSQR_PHILOSOPHY.md)
    │     Beliefs about growth, effort, imagination
    │
    ▼
Layer 2 — ARCHITECTURE (docs/architecture/)
    │     How systems work: PKV, routing, plugins, safety
    │
    ▼
Layer 3 — FEATURES (docs/features/)
    │     What gets built and how it behaves
    │
    ▼
Layer 4 — IMPLEMENTATION (specs/)
          Detailed technical specifications
```

Lower layers cannot contradict higher layers.

---

## Core Identity

> **OSQR** = **O**perating **S**ystem for **Q**uantum **R**easoning

OSQR is a **capability operating system** — not an AI assistant, not a chatbot, not a productivity tool.

OSQR exists to:
> Transform clarity into capability, capability into execution, and execution into real-world outcomes.

---

*Owner: Kable Record*
*Last updated: 2025-12-19*
