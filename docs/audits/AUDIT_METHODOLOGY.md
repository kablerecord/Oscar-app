# OSQR Audit Methodology

> **Purpose:** This document teaches Oscar how to systematically audit specs against code.
> It lives in Kable's PKV (not GKVI) — this is private developer tooling.

---

## Core Principle: Progressive Depth

**Never start at max depth. Earn depth as uncertainty increases.**

```
Layer 1: Surface Alignment
    ↓ (if issues found)
Layer 2: Domain Coherence
    ↓ (if drift detected)
Layer 3: Gap Detection
    ↓ (if evidence needed)
Layer 4: Evidence Retrieval
    ↓ (if action required)
Layer 5: Correction
```

### Layer 1 — Surface Alignment
**Question:** "Does OSQR broadly reflect the spec's intent?"

Look for:
- Familiar framing
- Correct priorities
- Right shape of implementation

If yes → PASS, move to next requirement
If no → go deeper

### Layer 2 — Domain Coherence
**Question:** "Within this specific requirement, does code align with spec?"

Compare:
- What spec says (quote it)
- What code does (cite file:line)

If coherent → PASS
If drift → go deeper

### Layer 3 — Gap Detection
**Question:** "Is this MISSING, PARTIAL, or DRIFTED?"

Classify:
- **MISSING** — Spec says X, code has nothing
- **INCOMPLETE** — Spec says X, code has partial X
- **MISALIGNED** — Spec says X, code does Y
- **BROKEN** — Code exists but doesn't work
- **UNTESTED** — Code exists, no verification possible

### Layer 4 — Evidence Retrieval (Selective)
**Only drill down when:**
- High-severity gaps
- Disputed classifications
- Architecture-critical systems

For each gap, retrieve:
- Exact spec quote with file:line
- Exact code with file:line
- Any relevant test files

### Layer 5 — Correction
Determine action:
- Fix code to match spec
- Fix spec to match (correct) code
- Mark as DEFERRED (future scope)
- Mark as WONT_FIX (intentional deviation)

---

## The Four Alignment Checks

For each requirement, verify alignment across:

| Layer | Question |
|-------|----------|
| **Chat Intent** | What was originally discussed in AI conversations? |
| **Spec** | What does the spec document say? |
| **Code** | What does the code actually do? |
| **Runtime** | Can this be triggered and verified? |

**Any misalignment = a finding.**

---

## Systematic Process

### Starting an Audit

1. **Check for active audit file** at `docs/audits/active/[SPEC_NAME]_AUDIT.md`
2. If exists: read checkpoint, follow Claude's notes, resume
3. If not: create new active audit file

### Processing Requirements

For each requirement in the spec (top to bottom):

1. Assign ID (SPEC-001, SPEC-002, etc.)
2. Classify requirement type:
   - `interface` — TypeScript interface must exist
   - `function` — Function must be implemented
   - `behavior` — Runtime behavior must work
   - `integration` — Must connect to other system
   - `data` — Database schema must exist
3. Search codebase for evidence
4. Apply progressive depth (Layers 1-5)
5. If finding: add to REBUILD document
6. Update checkpoint

### Completing an Audit

When all requirements are:
- PASS (implemented correctly)
- RESOLVED (fixed by Claude)
- DEFERRED (intentionally skipped)
- WONT_FIX (decided not to implement)

Mark audit COMPLETE and archive active audit file.

---

## Finding Types

| Type | Definition | Example |
|------|------------|---------|
| **MISSING** | Spec promises, code doesn't have | "Spec says ImportedConversation interface, not found" |
| **MISALIGNED** | Code does something different | "Spec says 3 models, code uses 2" |
| **BROKEN** | Code exists but doesn't work | "Function exists but throws unhandled error" |
| **INCOMPLETE** | Partially implemented | "Only 2 of 5 required fields present" |
| **UNTESTED** | No way to verify | "No tests, can't trigger in app" |
| **CONFLICT** | Specs contradict each other | "Spec A says X, Spec B says not-X" |
| **DRIFT** | Original intent differs from spec/code | "Chat said 3 providers, spec says multiple" |
| **DELETE** | Should be removed | "Dead code, no references" |

---

## Severity Levels

- **P0 - Blocks Launch:** Security issue, data loss, core feature broken
- **P1 - User Visible:** Doesn't match spec, confusing behavior
- **P2 - Cleanup:** Code quality, missing tests, docs gap

---

## Output Format

Always output in REBUILD format. See `docs/audits/OSQR_SELF_AUDIT_PROTOCOL.md` for exact format.

---

## Key Rules

1. **No assumptions** — If you can't point to file:line, mark UNKNOWN
2. **No intent** — What spec intended doesn't matter if code doesn't do it
3. **No future** — "Will be fixed in v2" is not acceptable
4. **Evidence required** — Every claim needs file path and line numbers
5. **Uncertainty is a finding** — If you can't verify, report that

---

*This methodology is for Kable's private use. Do not expose to other users.*
