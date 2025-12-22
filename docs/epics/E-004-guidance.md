# Epic: Guidance
## Epic ID: E-004

**Status:** Complete
**Priority:** P0
**Last Updated:** 2025-12-20

---

## Overview

The Guidance epic provides project-aware context and temporal intelligence. It helps users manage complex, multi-threaded work by tracking projects, commitments, and time-sensitive information.

**Why it matters:** Knowledge workers manage many parallel threads. OSQR should understand project context and time commitments without users manually managing this.

---

## Components

| Component | Spec | Status |
|-----------|------|--------|
| Project Guidance | `docs/features/JARVIS_CAPABILITIES.md` | Complete |
| Temporal Intelligence | `docs/features/QUEUE-SYSTEM.md` | Complete |
| Commitment Tracking | `lib/osqr/temporal-wrapper.ts` | Complete |
| Morning Digest | `@osqr/core Temporal namespace` | Complete |

---

## Stories

| Story ID | Title | Spec | Status |
|----------|-------|------|--------|
| E-004-S001 | Project Context Retrieval | guidance exports | Complete |
| E-004-S002 | Guidance Budget Tracking | guidance exports | Complete |
| E-004-S003 | Commitment Signal Detection | temporal-wrapper.ts | Complete |
| E-004-S004 | Temporal Expression Extraction | @osqr/core Temporal | Complete |
| E-004-S005 | Morning Digest Generation | Temporal namespace | Complete |
| E-004-S006 | Priority Calculation | temporal-wrapper.ts | Complete |
| E-004-S007 | Cross-Project Connections | memory-wrapper.ts | Complete |

---

## Dependencies

- **Depends on:** E-001 (Governance), E-002 (Memory)
- **Blocks:** E-005 (Interface) — Bubble uses guidance for proactive surfacing

---

## Success Criteria

- [x] Project context retrieved accurately for current work
- [x] Guidance limits tracked and enforced
- [x] Commitments detected in natural language
- [x] Temporal expressions parsed (deadlines, schedules)
- [x] Morning digest generated with prioritized items
- [x] Cross-project connections surfaced when relevant

---

## Context from Architecture

### Related Components
- Memory stores project data and commitments
- Bubble surfaces guidance proactively
- Throttle may limit guidance queries by tier

### Architecture References
- See: `docs/features/JARVIS_CAPABILITIES.md` — Jarvis-like capabilities
- See: `docs/features/QUEUE-SYSTEM.md` — Temporal queue
- See: `lib/osqr/temporal-wrapper.ts` — Implementation

### Integration Points
- Receives from: User messages (commitment detection), Memory (project data)
- Sends to: Bubble (proactive display), Digest endpoint

---

## Testable Invariants

### Pre-conditions
- User has at least one project (or default workspace)
- Message contains natural language (for commitment detection)

### Post-conditions
- Detected commitments are stored with temporal metadata
- Digest is generated only when shouldSendDigest() returns true

### Invariants
- Commitment extraction must include `when.rawText` for display
- Priority calculation considers due date and confidence
- Cross-project queries only access user's own projects
- Guidance budget is tracked per session/day
