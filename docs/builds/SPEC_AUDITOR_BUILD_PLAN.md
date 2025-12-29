# Spec-to-Code Auditor Build Plan

**Purpose:** Private developer tooling for Kable to have Oscar audit his own implementation against specs, producing REBUILD documents that Claude in VS Code can execute.

**This is NOT a user feature.** It lives in Kable's PKV and is triggered only by Kable.

---

## What We're Building

A system where Kable can say:

> "Oscar, audit OSQR_AI_HISTORY_INTERVIEW_SPEC.md"

And Oscar responds with a REBUILD document containing:
- What the spec says should exist
- What actually exists in code
- Findings: MISSING, MISALIGNED, BROKEN, INCOMPLETE, UNTESTED, DRIFT
- Exact file paths and line numbers
- Required fixes in copy-paste format

Kable then pastes the REBUILD document to Claude in VS Code for execution.

---

## The Kable ↔ Oscar ↔ Claude Loop

This system operates as a **collaborative loop** between three participants:

```
┌─────────────────────────────────────────────────────────────────┐
│                           OSCAR                                 │
│  (Has access to: indexed codebase, specs, Kable's PKV)         │
│                                                                 │
│  Kable says: "Audit RENDER_SYSTEM_SPEC.md"                     │
│  or: "Continue the render system audit"                        │
│                                                                 │
│  Oscar systematically:                                          │
│  1. Reads spec top-to-bottom (or resumes from checkpoint)      │
│  2. For each requirement, searches code for evidence           │
│  3. Checks the ACTIVE AUDIT FILE for Claude's notes            │
│  4. Produces/updates REBUILD document with findings            │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼ (Kable pastes Oscar's output)
┌─────────────────────────────────────────────────────────────────┐
│                     CLAUDE (VS Code)                            │
│  (Has access to: codebase via tools, can edit files)           │
│                                                                 │
│  Claude does one of:                                            │
│  A. Execute fixes from REBUILD document                        │
│  B. Update the active audit file with notes for Oscar          │
│  C. Mark findings as RESOLVED, DEFERRED, or WONT_FIX           │
│  D. Add clarifying instructions for Oscar's next pass          │
│  E. Update the spec if it was wrong                            │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼ (Kable goes back to Oscar)
┌─────────────────────────────────────────────────────────────────┐
│                           OSCAR                                 │
│                                                                 │
│  Oscar sees:                                                    │
│  - Updated code (fixes applied)                                │
│  - Updated active audit file (Claude's notes)                  │
│  - Resolution status on findings                               │
│                                                                 │
│  Oscar continues from checkpoint, skipping resolved items      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Repeat until audit is complete (all findings resolved or documented)
```

### Why This Loop Works

**Oscar's strengths:**
- Sees everything at once (full indexed codebase + specs + history)
- Can reason across multiple files simultaneously
- Knows the context of *why* things were built
- Systematic and thorough

**Claude's strengths (VS Code):**
- Can actually edit files
- Can run commands and verify changes
- Can update instructions for Oscar's next pass
- Can make judgment calls on edge cases

**The loop enables:**
- Iterative refinement (multiple passes)
- Judgment injection (Claude can override/defer findings)
- State preservation (nothing gets lost between sessions)
- Clear handoffs (each side knows what to do next)

---

## Active Audit File Format

Each audit has a **working document** that tracks state between Oscar and Claude:

**Location:** `docs/audits/active/[SPEC_NAME]_AUDIT.md`

**Example:** `docs/audits/active/RENDER_SYSTEM_AUDIT.md`

```markdown
# ACTIVE AUDIT: RENDER_SYSTEM_SPEC

**Spec:** docs/features/RENDER_SYSTEM_SPEC.md
**Started:** 2025-12-29
**Last Updated:** 2025-12-29 14:32
**Status:** IN_PROGRESS

---

## Checkpoint

**Current Position:** Requirement 15 of 42
**Last Processed:** RENDER-014 (Image Generation)
**Next Up:** RENDER-015 (Chart Rendering)

---

## Resolution Status

| Finding ID | Status | Resolution | Notes |
|------------|--------|------------|-------|
| RENDER-001 | RESOLVED | Fixed by Claude | Merged intent detection |
| RENDER-002 | RESOLVED | Fixed by Claude | Added RenderState type |
| RENDER-003 | DEFERRED | V1.6 scope | UI/Game rendering not in V1.5 |
| RENDER-004 | IN_PROGRESS | Claude working | Artifact storage schema |
| RENDER-005 | PENDING | - | Awaiting Oscar's next pass |

---

## Claude's Notes for Oscar

> **RENDER-003:** Skip all UI and Game rendering requirements. Per Kable,
> these are intentionally deferred to V1.6. Mark as DEFERRED, not MISSING.

> **RENDER-007:** The spec says "client-side rendering" but we decided
> server-side is better for security. This is intentional DRIFT, not a bug.
> Update the spec, don't change the code.

> **General:** Focus on IMAGE and CHART artifacts only. Everything else
> in the spec is future scope.

---

## Oscar's Findings (Current Pass)

[REBUILD document content goes here, updated each pass]

---

## Execution Log

| Date | Actor | Action |
|------|-------|--------|
| 2025-12-29 10:00 | Oscar | Initial audit, 12 findings |
| 2025-12-29 11:30 | Claude | Fixed RENDER-001, RENDER-002 |
| 2025-12-29 12:15 | Oscar | Re-audit, 10 findings remain |
| 2025-12-29 14:00 | Claude | Marked RENDER-003 as DEFERRED |
| 2025-12-29 14:32 | Oscar | Continuing from RENDER-015 |
```

---

## Oscar's Systematic Process

When Oscar audits, he follows this **top-to-bottom systematic process**:

### Initial Audit (First Pass)

1. **Read the spec** from top to bottom
2. **Extract requirements** in order (SPEC-001, SPEC-002, etc.)
3. **For each requirement:**
   - Search codebase for evidence
   - Classify as PASS, MISSING, MISALIGNED, etc.
   - If finding: add to REBUILD document
4. **Create active audit file** with checkpoint at end
5. **Output REBUILD document** for Claude

### Continuation (Subsequent Passes)

1. **Read active audit file** first
2. **Check Claude's notes** for special instructions
3. **Skip RESOLVED and DEFERRED findings**
4. **Resume from checkpoint** (don't re-audit completed items)
5. **Re-check IN_PROGRESS items** (Claude may have fixed them)
6. **Continue with remaining requirements**
7. **Update checkpoint** in active audit file
8. **Output updated REBUILD document**

### Completion

When all requirements are either:
- PASS (implemented correctly)
- RESOLVED (fixed by Claude)
- DEFERRED (intentionally skipped)
- WONT_FIX (decided not to implement)

Oscar marks the audit as COMPLETE and archives the active audit file.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         KABLE'S PKV                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ Audit           │  │ ChatGPT/Claude  │  │ REBUILD        │  │
│  │ Methodology     │  │ History         │  │ Protocol       │  │
│  │ (progressive    │  │ (original       │  │ (output        │  │
│  │  depth)         │  │  design intent) │  │  format)       │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SPEC-TO-CODE AUDITOR                         │
│                                                                 │
│  1. Parse spec file → extract requirements                      │
│  2. For each requirement:                                       │
│     - Search codebase for implementation evidence               │
│     - Compare spec claim vs code reality                        │
│     - Search Kable's PKV for original intent (DRIFT check)      │
│  3. Classify findings by type and severity                      │
│  4. Generate REBUILD document                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SYSTEM SCOPE (Read-Only)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ OSQR Specs      │  │ OSQR Codebase   │  │ OSQR Docs      │  │
│  │ (docs/features) │  │ (lib/, app/)    │  │ (*.md)         │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
│                                                                 │
│  Already indexed by: npm run index-osqr-self                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Build Phases

### Phase 1: Index Audit Methodology into Kable's PKV
**Goal:** Oscar knows HOW to audit (the progressive depth framework)

**Tasks:**
- [ ] Create `AUDIT_METHODOLOGY.md` document containing:
  - Progressive depth principle (surface → domain → gap → evidence → correction)
  - The 4-step isolation test from ChatGPT conversation
  - Finding type definitions (MISSING, MISALIGNED, etc.)
  - When to drill down vs stay shallow
- [ ] Index this document into Kable's PKV (not GKVI)
- [ ] Verify Oscar can retrieve it when asked about auditing

**Files to create:**
- `docs/audits/AUDIT_METHODOLOGY.md` (the methodology document)

**Verification:**
```
Ask Oscar: "How should I approach auditing a spec?"
Expected: Oscar retrieves the methodology from PKV and explains progressive depth
```

---

### Phase 2: Spec Requirement Extractor
**Goal:** Parse a spec file and extract testable requirements

**Tasks:**
- [ ] Create `lib/audit/spec-parser.ts`
- [ ] Extract requirements from spec markdown:
  - Section headers as requirement groups
  - Bullet points as individual requirements
  - Code blocks as expected interfaces/schemas
  - Tables as feature matrices
- [ ] Assign requirement IDs (SPEC-001, SPEC-002, etc.)
- [ ] Classify requirement types:
  - `interface` - TypeScript interface must exist
  - `function` - Function must be implemented
  - `behavior` - Runtime behavior must work
  - `integration` - Must connect to other system
  - `data` - Database schema must exist

**Files to create:**
- `packages/app-web/lib/audit/spec-parser.ts`
- `packages/app-web/lib/audit/types.ts`

**Example output:**
```typescript
{
  specPath: "docs/features/OSQR_AI_HISTORY_INTERVIEW_SPEC.md",
  requirements: [
    {
      id: "INTERVIEW-001",
      type: "interface",
      claim: "ImportedConversation interface with source, extraction, clarifications fields",
      section: "Data Model",
      line: 259
    },
    {
      id: "INTERVIEW-002",
      type: "function",
      claim: "ChatGPT JSON parser that handles conversations[].mapping structure",
      section: "Import Sources",
      line: 489
    }
  ]
}
```

---

### Phase 3: Codebase Evidence Finder
**Goal:** Search codebase for implementation of each requirement

**Tasks:**
- [ ] Create `lib/audit/evidence-finder.ts`
- [ ] For each requirement type, define search strategy:
  - `interface` → grep for `interface RequirementName`
  - `function` → grep for function signatures
  - `behavior` → find route handlers and check logic
  - `integration` → trace import chains
  - `data` → search prisma schema
- [ ] Return evidence with:
  - File path
  - Line numbers
  - Code snippet
  - Confidence score (0-100)
- [ ] Handle "NO EVIDENCE FOUND" explicitly

**Files to create:**
- `packages/app-web/lib/audit/evidence-finder.ts`

**Example output:**
```typescript
{
  requirementId: "INTERVIEW-001",
  status: "NOT_FOUND",
  searchedLocations: [
    "lib/knowledge/*.ts",
    "lib/import/*.ts",
    "prisma/schema.prisma"
  ],
  evidence: null,
  confidence: 0
}
```

---

### Phase 4: Intent Comparison (DRIFT Detection)
**Goal:** Compare spec/code against original ChatGPT/Claude conversations

**Tasks:**
- [ ] Search Kable's PKV for conversations mentioning the feature
- [ ] Extract original intent statements
- [ ] Compare against:
  - What spec says
  - What code does
- [ ] Flag DRIFT when intent ≠ spec or intent ≠ code

**Dependencies:**
- Requires ChatGPT/Claude history to be indexed in Kable's PKV
- Can be skipped initially, added when Import Interview is built

**For now:** Mark DRIFT detection as "SKIPPED - history not indexed"

---

### Phase 5: Finding Classifier
**Goal:** Categorize each gap into the correct finding type

**Tasks:**
- [ ] Create `lib/audit/finding-classifier.ts`
- [ ] Classification logic:

| Evidence Status | Spec Says | Code Does | Finding Type |
|-----------------|-----------|-----------|--------------|
| NOT_FOUND | X | - | MISSING |
| FOUND | X | Y (different) | MISALIGNED |
| FOUND | X | X (but broken) | BROKEN |
| PARTIAL | X | partial X | INCOMPLETE |
| FOUND | X | X | PASS (no finding) |
| - | X in Spec A | not-X in Spec B | CONFLICT |
| FOUND | - | X (undocumented) | (flag for review) |

- [ ] Assign severity:
  - P0: Core feature broken, security issue, data loss risk
  - P1: Feature doesn't match spec, user-visible bug
  - P2: Code quality, missing tests, docs gap

**Files to create:**
- `packages/app-web/lib/audit/finding-classifier.ts`

---

### Phase 6: REBUILD Document Generator
**Goal:** Output findings in exact REBUILD format from protocol

**Tasks:**
- [ ] Create `lib/audit/rebuild-generator.ts`
- [ ] Follow format from `docs/audits/OSQR_SELF_AUDIT_PROTOCOL.md`:
  - Header with subsystem, spec path, code path
  - Summary with counts by type and severity
  - Each finding with:
    - What Spec Says (quote)
    - What Code Does (file, lines, snippet)
    - The Problem
    - Required Fix (current code → new code)
    - Verification command
  - Execution order
  - Post-fix verification checklist
- [ ] Output as markdown string (for pasting to Claude in VS Code)

**Files to create:**
- `packages/app-web/lib/audit/rebuild-generator.ts`

---

### Phase 7: Audit Command / API
**Goal:** Trigger audit from Oscar chat or API

**Tasks:**
- [ ] Create `app/api/audit/spec/route.ts`
  - POST with `{ specPath: string }`
  - Returns REBUILD document
  - Restricted to Kable's workspace only
- [ ] Add detection in Oscar chat:
  - Pattern: `/audit [spec-name]` or "audit [spec] against code"
  - Extract spec path
  - Call audit API
  - Return REBUILD document in chat

**Files to create:**
- `packages/app-web/app/api/audit/spec/route.ts`
- Update `lib/til/self-audit.ts` to handle spec-specific audits

**Security:**
- Check workspace owner email === `kablerecord@gmail.com`
- Return 403 for anyone else

---

### Phase 8: Active Audit State Manager
**Goal:** Track audit state between Oscar and Claude sessions

**Tasks:**
- [ ] Create `lib/audit/active-audit-manager.ts`
- [ ] Functions:
  - `createActiveAudit(specPath)` — Initialize new audit file
  - `getActiveAudit(specPath)` — Load existing audit state
  - `updateCheckpoint(specPath, position)` — Save progress
  - `addClaudeNote(specPath, findingId, note)` — Add instruction for Oscar
  - `updateResolutionStatus(specPath, findingId, status)` — Mark RESOLVED/DEFERRED
  - `appendToExecutionLog(specPath, actor, action)` — Track who did what
  - `isAuditComplete(specPath)` — Check if all findings resolved
  - `archiveAudit(specPath)` — Move to completed/
- [ ] Create `docs/audits/active/` directory
- [ ] Active audit file format (see "Active Audit File Format" section above)

**Files to create:**
- `packages/app-web/lib/audit/active-audit-manager.ts`
- `docs/audits/active/.gitkeep`

**Integration:**
- Oscar reads active audit file before continuing
- Oscar writes checkpoint after each pass
- Claude updates resolution status and adds notes
- Both append to execution log

---

### Phase 9: Import Interview (Enables Full DRIFT Detection)
**Goal:** Index ChatGPT/Claude history for original intent lookup

**Status:** Separate build — see `docs/features/OSQR_AI_HISTORY_INTERVIEW_SPEC.md`

**For this build:** DRIFT detection returns "SKIPPED - history not indexed"

**Future:** When Import Interview is built, DRIFT detection automatically works

---

## File Structure After Build

```
packages/app-web/
├── lib/
│   └── audit/
│       ├── types.ts                # Shared types
│       ├── spec-parser.ts          # Phase 2: Extract requirements
│       ├── evidence-finder.ts      # Phase 3: Search codebase
│       ├── finding-classifier.ts   # Phase 5: Categorize findings
│       ├── rebuild-generator.ts    # Phase 6: Output format
│       ├── active-audit-manager.ts # Phase 8: State tracking
│       └── index.ts                # Main orchestrator
├── app/
│   └── api/
│       └── audit/
│           └── spec/
│               └── route.ts        # Phase 7: API endpoint
docs/
└── audits/
    ├── OSQR_SELF_AUDIT_PROTOCOL.md # Already exists
    ├── AUDIT_METHODOLOGY.md        # Phase 1: New
    └── active/                     # Phase 8: Working directory
        └── [SPEC_NAME]_AUDIT.md    # One per active audit
```

---

## Usage Flow (After Build)

### Option A: Via Oscar Chat
```
Kable: "Oscar, audit OSQR_AI_HISTORY_INTERVIEW_SPEC.md"

Oscar: "Running spec audit...

# REBUILD: IMPORT_INTERVIEW

## Summary
- Total Findings: 12
- P0 (Blocks Launch): 0
- P1 (User Visible): 8
- P2 (Cleanup): 4

### By Type
- MISSING: 6
- INCOMPLETE: 4
- UNTESTED: 2

---

## FINDING: INTERVIEW-001

**Severity:** P1
**Type:** MISSING

### What Spec Says
> ImportedConversation interface with source, extraction, clarifications fields

Source: docs/features/OSQR_AI_HISTORY_INTERVIEW_SPEC.md#L259

### What Code Does
File: NO EVIDENCE FOUND
Searched: lib/knowledge/*.ts, lib/import/*.ts, prisma/schema.prisma

### The Problem
The spec defines a complete data model for imported conversations, but no corresponding TypeScript interface or Prisma model exists.

### Required Fix
**Change:** Create ImportedConversation interface

**File:** packages/app-web/lib/audit/types.ts (new file)

**New Code:**
```typescript
interface ImportedConversation {
  id: string;
  userId: string;
  source: 'chatgpt' | 'claude' | 'other';
  // ... rest of interface from spec
}
```

### Verification
```bash
grep -r "ImportedConversation" packages/app-web/lib/
```

**Expected Result:** Interface definition found

---

[... more findings ...]
"
```

### Option B: Direct API Call
```bash
curl -X POST http://localhost:3001/api/audit/spec \
  -H "Content-Type: application/json" \
  -d '{"specPath": "docs/features/OSQR_AI_HISTORY_INTERVIEW_SPEC.md"}'
```

### Option C: Script
```bash
npm run audit-spec -- docs/features/OSQR_AI_HISTORY_INTERVIEW_SPEC.md
```

---

## Success Criteria

1. **Kable can say:** "Oscar, audit [SPEC_NAME]"
2. **Oscar returns:** REBUILD document in exact protocol format
3. **Claude in VS Code can:** Execute fixes by following the document
4. **Security:** No other user can trigger spec audits
5. **Progressive depth:** Oscar goes shallow first, deep only where gaps found
6. **Loop works:** Kable can say "continue the audit" and Oscar picks up from checkpoint
7. **State preserved:** Claude's notes persist and Oscar sees them on next pass
8. **Clear handoffs:** Both Oscar and Claude know exactly what to do next

---

## Example Loop in Action

### Session 1: Initial Audit

**Kable → Oscar:**
> "Audit RENDER_SYSTEM_SPEC.md"

**Oscar:**
1. Reads spec top-to-bottom
2. Extracts 42 requirements
3. Searches codebase for each
4. Finds 12 gaps
5. Creates `docs/audits/active/RENDER_SYSTEM_AUDIT.md`
6. Outputs REBUILD document with 12 findings

**Kable → Claude (VS Code):**
> [pastes Oscar's REBUILD output]

**Claude:**
1. Reads REBUILD document
2. Fixes RENDER-001 and RENDER-002 (simple type additions)
3. Notes that RENDER-003 is V1.6 scope (adds note for Oscar)
4. Updates active audit file:
   - RENDER-001: RESOLVED
   - RENDER-002: RESOLVED
   - RENDER-003: DEFERRED (note: "V1.6 scope per Kable")
5. Reports: "Fixed 2, deferred 1, 9 remaining"

---

### Session 2: Continue Audit

**Kable → Oscar:**
> "Continue the render system audit"

**Oscar:**
1. Reads `docs/audits/active/RENDER_SYSTEM_AUDIT.md`
2. Sees Claude's notes: "RENDER-003 is V1.6 scope"
3. Sees checkpoint: "Last processed RENDER-003"
4. Skips RENDER-001, 002 (RESOLVED), 003 (DEFERRED)
5. Re-checks RENDER-004 through RENDER-012
6. Finds RENDER-004 and RENDER-005 now pass (Claude fixed them)
7. Updates checkpoint to RENDER-012
8. Outputs updated REBUILD with 7 remaining findings

**Kable → Claude (VS Code):**
> [pastes Oscar's updated output]

**Claude:**
1. Fixes RENDER-006, RENDER-007
2. Discovers RENDER-008 requires a spec update, not code change
3. Adds note: "RENDER-008: Spec is wrong, update spec not code"
4. Updates active audit file
5. Reports: "Fixed 2, spec update needed for 1, 4 remaining"

---

### Session 3: Spec Correction + Continue

**Kable → Oscar:**
> "Update the spec for RENDER-008 as Claude noted, then continue"

**Oscar:**
1. Reads Claude's note about RENDER-008
2. Updates `docs/features/RENDER_SYSTEM_SPEC.md` with correction
3. Marks RENDER-008 as RESOLVED (spec updated)
4. Continues with remaining findings
5. Outputs updated REBUILD with 3 remaining

---

### Session N: Completion

**Oscar:**
1. All findings are either PASS, RESOLVED, DEFERRED, or WONT_FIX
2. Marks audit as COMPLETE
3. Archives active audit file to `docs/audits/completed/`
4. Final report: "Audit complete. 42 requirements checked, 38 pass, 4 deferred to V1.6"

---

## Estimated Build Time

| Phase | Complexity | Estimate |
|-------|------------|----------|
| Phase 1: Methodology doc | Low | 30 min |
| Phase 2: Spec parser | Medium | 2-3 hours |
| Phase 3: Evidence finder | High | 3-4 hours |
| Phase 4: Intent comparison | Skip for now | - |
| Phase 5: Finding classifier | Medium | 1-2 hours |
| Phase 6: REBUILD generator | Medium | 2-3 hours |
| Phase 7: API/Command | Low | 1 hour |
| Phase 8: Active audit manager | Medium | 1-2 hours |

**Total: ~11-15 hours across multiple sessions**

---

## Open Questions

1. **Spec format consistency:** Are all specs in `docs/features/` formatted similarly, or do we need multiple parsing strategies?

2. **Codebase search scope:** Should evidence finder search:
   - Only `packages/app-web/lib/`?
   - Also `packages/core/`?
   - Also test files?

3. **Partial implementation threshold:** At what % implemented do we mark INCOMPLETE vs MISSING?

4. **ChatGPT/Claude history priority:** Should we build Import Interview first to enable DRIFT detection, or is that a separate track?

---

## Next Steps

1. **Review this plan** — any changes needed?
2. **Start Phase 1** — Create AUDIT_METHODOLOGY.md
3. **Continue sequentially** — Each phase builds on the previous

---

*Created: December 29, 2025*
*Status: Ready for review*
