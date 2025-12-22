# Epic: Memory
## Epic ID: E-002

**Status:** Complete
**Priority:** P0
**Last Updated:** 2025-12-20

---

## Overview

The Memory epic provides OSQR's persistent, privacy-preserving intelligence layer. It enables cross-session context, semantic retrieval, and the two-brain architecture (PKV + GPKV) that makes OSQR remember.

**Why it matters:** Memory persistence is what transforms OSQR from a chat tool into a thinking partner. Users shouldn't have to re-explain their context every session.

---

## Components

| Component | Spec | Status |
|-----------|------|--------|
| Memory Vault | `docs/architecture/KNOWLEDGE_ARCHITECTURE.md` | Complete |
| Document Indexing | `docs/features/MEDIA-VAULT.md` | Complete |
| Cross-Project Memory | `lib/osqr/memory-wrapper.ts` | Complete |
| Privacy Tiers | `docs/architecture/PRIVACY_TIERS.md` | Complete |

---

## Stories

| Story ID | Title | Spec | Status |
|----------|-------|------|--------|
| E-002-S001 | Three-Tier Memory Architecture | KNOWLEDGE_ARCHITECTURE.md | Complete |
| E-002-S002 | PKV/GPKV Separation | KNOWLEDGE_ARCHITECTURE.md | Complete |
| E-002-S003 | Semantic Search | memory-wrapper.ts | Complete |
| E-002-S004 | Document Indexing Pipeline | document-indexing-wrapper.ts | Complete |
| E-002-S005 | Cross-Project Queries | memory-wrapper.ts | Complete |
| E-002-S006 | Privacy Tier Enforcement | PRIVACY_TIERS.md | Complete |
| E-002-S007 | Cryptographic Deletion | PRIVACY_TIERS.md | Specified |

---

## Dependencies

- **Depends on:** E-001 (Governance) — Constitutional checks on memory access
- **Blocks:** E-003 (Intelligence), E-004 (Guidance), E-005 (Interface)

---

## Success Criteria

- [x] Messages persist across sessions
- [x] Semantic search returns contextually relevant results
- [x] Documents are indexed and searchable
- [x] PKV is isolated per user (no cross-user access)
- [x] GPKV is shared (OSQR frameworks accessible to all)
- [x] Privacy tiers are respected in all retrievals
- [ ] User deletion removes all data (cryptographic destruction)

---

## Context from Architecture

### Related Components
- Router uses memory for context enrichment
- Guidance retrieves project context from memory
- Bubble surfaces relevant memories proactively
- Temporal stores commitments in memory

### Architecture References
- See: `docs/architecture/KNOWLEDGE_ARCHITECTURE.md` — Two-brain model
- See: `docs/architecture/PRIVACY_TIERS.md` — Privacy enforcement
- See: `docs/features/MEDIA-VAULT.md` — Document handling

### Integration Points
- Receives from: All user inputs, document uploads
- Sends to: Router (context), Guidance (project data), Bubble (proactive surfacing)

---

## Testable Invariants

### Pre-conditions
- User is authenticated
- Privacy tier is known

### Post-conditions
- Stored data is encrypted at rest
- Retrieval respects privacy tier

### Invariants
- Memory retrieval must never return data from another user's PKV
- GPKV content is available to all authenticated users
- Embedding dimensions match across all stores (1536 for text-embedding-3-small)
- Deletion must be cryptographic destruction, not soft-delete
