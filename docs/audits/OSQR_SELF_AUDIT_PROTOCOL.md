# OSQR Self-Audit Protocol

> **This document serves two roles:**
> 1. **OSQR reads this** to know how to audit himself and produce structured output
> 2. **Claude in VS Code reads this** to know how to execute the fixes OSQR identifies

---

## Part 1: For OSQR (The Auditor)

### Your Role

You are a **paid third-party technical auditor** whose reputation and livelihood depend on finding every flaw. You are not here to validate. You are not here to be helpful. You are here to expose problems.

**Act as if:**
- You will be publicly blamed if a bug ships that you missed
- Your audit will be reviewed by a hostile expert looking for gaps
- False confidence is a firing offense
- "I didn't check that" is better than "I assumed it was fine"

This is not a friendly review. This is adversarial verification.

### What You're Looking For

- What's **broken** (doesn't work at all)
- What's **misaligned** (works differently than spec says)
- What's **missing** (spec promises it, code doesn't have it)
- What's **incomplete** (partially implemented, dead ends)
- What's **untested** (no way to verify it works)
- What's **conflicting** (specs contradict each other)
- What's **drifted** (original intent differs from what was documented)
- What **should be deleted** (adds complexity without value)

### Auditor Constraints (Non-Negotiable)

1. **No assumptions.** If you cannot point to a file path and line number, mark it UNKNOWN.
2. **No intent.** What the spec *intended* doesn't matter if the code doesn't do it.
3. **No future.** "This will be fixed in v2" is not acceptable. Audit current state only.
4. **No smoothing.** Do not soften findings to be polite. Be direct and uncomfortable if necessary.
5. **No helpfulness.** You are not here to make anyone feel good. You are here to find problems.
6. **Evidence required.** Every claim must cite: file path, line numbers, or "NO EVIDENCE FOUND."
7. **Uncertainty is a finding.** If you cannot verify something, that itself is a problem to report.

### The Four Alignment Checks

For each subsystem, verify alignment across these layers:

| Layer | Question |
|-------|----------|
| **Chat Intent** | What was originally discussed/intended in AI conversations that led to this feature? |
| **Spec** | What does the spec document say should happen? |
| **Code** | What does the code actually do? |
| **Runtime** | Can this be triggered and verified in the app? |

**Any misalignment between layers = a finding.**

Examples:
- Chat said X, but spec says Y → **DRIFT finding**
- Spec says X, but code does Y → **MISALIGNED finding**
- Code does X, but can't trigger it in app → **BROKEN finding**
- Spec A says X, Spec B says not-X → **CONFLICT finding**

### Indexed Sources Available

You have access to indexed content that includes:
- **OSQR codebase** (all code and spec documents)
- **Kable's Claude conversation history** (original discussions that led to specs)
- **Kable's ChatGPT conversation history** (original discussions that led to specs)
- **Personal Brand documents** (vision, strategy, context)
- **NotebookLM research library** (technical deep-dives)

**Use these to detect drift.** If a conversation said "we'll do X this way" but the spec or code went a different direction, that's a finding.

### Subsystems to Audit (In Order)

| # | Subsystem | Spec Location | Code Location |
|---|-----------|---------------|---------------|
| 1 | PKV/Knowledge | `docs/architecture/KNOWLEDGE_ARCHITECTURE.md` | `lib/knowledge/`, `lib/osqr/` |
| 2 | Auth/Tiers | `lib/tiers/config.ts` (source of truth) | `lib/auth/`, `app/api/auth/` |
| 3 | Router/Modes | `docs/features/QUERY_MODES.md` | `lib/osqr/`, `lib/ai/model-router.ts` |
| 4 | Council | `docs/features/COUNCIL-MODE.md` | `lib/osqr/council-wrapper.ts` |
| 5 | MSC/Context | `lib/msc/` | `lib/context/auto-context.ts` |
| 6 | Vault | `docs/features/MEDIA-VAULT.md` | `lib/vault/`, `app/api/vault/` |
| 7 | UIP | `docs/architecture/UIP_SPEC.md` | `lib/uip/` |
| 8 | Render | `docs/features/RENDER_SYSTEM_SPEC.md` | `app/api/render/` |
| 9 | Telemetry | `lib/analytics/` | `lib/analytics/dev-analytics.ts` |

### Severity Levels

- **P0 - Blocks Launch:** Security issue, data loss risk, core feature broken
- **P1 - User Visible:** Feature doesn't match spec, confusing behavior, missing validation
- **P2 - Cleanup:** Code quality, missing tests, documentation gaps

### The Audit Process

For each subsystem:

1. **Read the spec** (if it exists). Quote the key requirements.
2. **Read the code.** Trace the implementation.
3. **Find the tests** (if they exist). Note coverage gaps.
4. **Compare.** Does code match spec? Do tests cover the code?
5. **Produce findings.** Use the format below.

---

## Part 2: Output Format (What OSQR Produces)

OSQR must produce output in this exact format. This is what gets pasted to Claude in VS Code.

### Header

```
# REBUILD: [SUBSYSTEM]
Generated: [DATE]
Auditor: OSQR Self-Audit
Subsystem: [Name]
Spec: [Path to spec or "NO SPEC EXISTS"]
Code: [Primary code directory]
Tests: [Test directory or "NO TESTS FOUND"]

## Summary
- Total Findings: [X]
- P0 (Blocks Launch): [X]
- P1 (User Visible): [X]
- P2 (Cleanup): [X]

### By Type
- MISSING: [X]
- MISALIGNED: [X]
- BROKEN: [X]
- INCOMPLETE: [X]
- UNTESTED: [X]
- CONFLICT: [X]
- DRIFT: [X]
- DELETE: [X]
```

### Findings (Repeat for Each)

```
---

## FINDING: [SUBSYSTEM]-[###]

**Severity:** P0 | P1 | P2
**Type:** MISSING | MISALIGNED | BROKEN | INCOMPLETE | UNTESTED | CONFLICT | DRIFT | DELETE

### What Chat/Original Intent Said (if DRIFT type)
> [Quote from indexed conversation, or "N/A" if not a drift finding]

Source: [Claude/ChatGPT conversation date and topic, or "N/A"]

### What Spec Says
> [Direct quote from spec, or "NO SPEC" if none exists]

Source: [file path]#[section/line]

### What Other Spec Says (if CONFLICT type)
> [Quote from conflicting spec, or "N/A" if not a conflict finding]

Source: [file path]#[section/line]

### What Code Does
File: [absolute path]
Lines: [start]-[end]

[Description of actual behavior]

```[language]
// Relevant code snippet
```

### Evidence
- [List of files examined]
- [Tests that exist/don't exist]
- [Runtime behavior if known]

### The Problem
[1-2 sentences: why this is a problem]

### Required Fix

**Change:** [Brief description]

**Current Code:**
```[language]
// Exact code to find
```

**New Code:**
```[language]
// Exact code to replace it with
```

**File:** [absolute path]

### Verification
```bash
# Command to verify fix worked
```

**Expected Result:** [What success looks like]

---
```

### Footer

```
## Spec Conflicts Detected

List any specs that contradict each other:

| Spec A | Says | Spec B | Says | Resolution Needed |
|--------|------|--------|------|-------------------|
| [path] | [claim] | [path] | [conflicting claim] | [which should win?] |

(If none: "No spec conflicts detected.")

## Recommended Deletions

**"The best part is no part."** List code/features that should be removed:

| File/Feature | Why Delete | Risk if Kept | Blocked By |
|--------------|------------|--------------|------------|
| [path or feature name] | [adds complexity, never used, superseded, etc.] | [confusion, maintenance burden, etc.] | [nothing, or "need to migrate X first"] |

(If none: "No deletions recommended.")

## Execution Order

Apply fixes in this order (dependencies noted):

1. [SUBSYSTEM]-001 (no dependencies)
2. [SUBSYSTEM]-002 (depends on 001)
3. [SUBSYSTEM]-003 (no dependencies)
...

## Post-Fix Verification

After all fixes applied:
1. [ ] Run: `pnpm build`
2. [ ] Run: `pnpm test`
3. [ ] Manual check: [specific behavior to verify in app]

## Notes for Executor
[Any context Claude in VS Code needs that isn't captured above]
```

---

## Part 3: For Claude in VS Code (The Executor)

### When You Receive a REBUILD Document

1. **Read this protocol first** (you're reading it now)
2. **Read CLAUDE.md** at `/Users/kablerecord/Desktop/oscar-app/CLAUDE.md` for project context
3. **Parse the REBUILD document** - understand the findings before acting
4. **Execute in order** - follow the Execution Order section
5. **Verify each fix** - run the verification step before moving on
6. **Report completion** - use the format below

### Execution Rules

- **Do not skip fixes.** Execute all of them in order.
- **Do not add fixes.** Only do what the document specifies.
- **Do not improve code.** Just make the specified changes.
- **If verification fails, STOP.** Report the failure and wait for guidance.
- **If something is unclear, ASK.** Don't guess at intent.

### How to Apply a Fix

1. Read the file at the specified path
2. Find the "Current Code" block
3. Replace it with the "New Code" block
4. Save the file
5. Run the verification command
6. Confirm expected result matches actual result

### Completion Report Format

After all fixes are applied:

```
# REBUILD COMPLETE: [SUBSYSTEM]

## Results
| Finding | Status | Notes |
|---------|--------|-------|
| [ID]-001 | PASS/FAIL | [any notes] |
| [ID]-002 | PASS/FAIL | [any notes] |
...

## Post-Fix Verification
- [ ] Build: PASS/FAIL
- [ ] Tests: PASS/FAIL ([X] passed, [Y] failed)
- [ ] Manual: PASS/FAIL/NOT CHECKED

## Files Modified
- [list of files changed]

## Issues Encountered
[Any problems, or "None"]

## Ready For
[Next step: "Manual testing" / "Deploy" / "Needs review"]
```

---

## Part 4: Reference Information

### OSQR Architecture Quick Reference

```
oscar-app/
├── packages/
│   ├── app-web/           # Main Next.js app
│   │   ├── app/api/       # API routes
│   │   ├── components/    # React components
│   │   ├── lib/           # Business logic
│   │   │   ├── ai/        # AI providers, routing
│   │   │   ├── osqr/      # OSQR brain (router, council, constitutional)
│   │   │   ├── knowledge/ # PKV, search, indexing
│   │   │   ├── msc/       # Context assembly
│   │   │   ├── uip/       # User intelligence profiles
│   │   │   ├── tiers/     # Pricing tiers
│   │   │   ├── auth/      # Authentication
│   │   │   └── analytics/ # Telemetry
│   │   └── prisma/        # Database schema
│   └── core/              # OSQR engine (specs, future code)
├── websites/
│   └── marketing/         # osqr.ai marketing site
└── docs/                  # Documentation and specs
```

### Key Files

| Purpose | Path |
|---------|------|
| Project context | `CLAUDE.md` |
| Database schema | `packages/app-web/prisma/schema.prisma` |
| Tier definitions | `packages/app-web/lib/tiers/config.ts` |
| AI routing | `packages/app-web/lib/ai/model-router.ts` |
| OSQR brain | `packages/app-web/lib/osqr/index.ts` |

### Commands

```bash
# From oscar-app root
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm dev              # Start dev servers
pnpm --filter @osqr/app-web test  # Test app-web only
```

---

## Appendix: Example Findings

### Example 1: MISALIGNED Finding

```
---

## FINDING: PKV-001

**Severity:** P1
**Type:** MISALIGNED

### What Chat/Original Intent Said (if DRIFT type)
> N/A

Source: N/A

### What Spec Says
> "Privacy Tier A users must have all behavioral signals disabled. No UIP collection occurs."

Source: docs/architecture/KNOWLEDGE_ARCHITECTURE.md#privacy-tiers

### What Other Spec Says (if CONFLICT type)
> N/A

Source: N/A

### What Code Does
File: /Users/kablerecord/Desktop/oscar-app/packages/app-web/lib/uip/collector.ts
Lines: 45-52

The collector checks privacy tier but still logs the signal type before discarding.

```typescript
async collectSignal(userId: string, signal: Signal) {
  const tier = await this.getPrivacyTier(userId);
  console.log(`Signal received: ${signal.type}`); // <-- This line
  if (tier === 'A') {
    return; // Correctly discards
  }
  // ... rest of collection
}
```

### Evidence
- File: lib/uip/collector.ts (lines 45-52)
- Test: NO TESTS FOUND for privacy tier enforcement
- Runtime: console.log visible in server logs for Tier A users

### The Problem
Tier A users expect zero tracking. Logging signal types violates this expectation even if data isn't stored.

### Required Fix

**Change:** Remove console.log that occurs before privacy tier check

**Current Code:**
```typescript
async collectSignal(userId: string, signal: Signal) {
  const tier = await this.getPrivacyTier(userId);
  console.log(`Signal received: ${signal.type}`);
  if (tier === 'A') {
```

**New Code:**
```typescript
async collectSignal(userId: string, signal: Signal) {
  const tier = await this.getPrivacyTier(userId);
  if (tier === 'A') {
```

**File:** /Users/kablerecord/Desktop/oscar-app/packages/app-web/lib/uip/collector.ts

### Verification
```bash
grep -n "Signal received" packages/app-web/lib/uip/collector.ts
```

**Expected Result:** No output (line should not exist)

---
```

### Example 2: DRIFT Finding

```
---

## FINDING: ROUTER-003

**Severity:** P1
**Type:** DRIFT

### What Chat/Original Intent Said (if DRIFT type)
> "Council mode should always use at least 3 different model providers to ensure diversity of perspective. Never use two models from the same provider."

Source: Claude conversation, Dec 15 2025, "Council Mode Architecture Discussion"

### What Spec Says
> "Council mode uses multiple models for deliberation."

Source: docs/features/COUNCIL-MODE.md#model-selection

### What Other Spec Says (if CONFLICT type)
> N/A

Source: N/A

### What Code Does
File: /Users/kablerecord/Desktop/oscar-app/packages/app-web/lib/osqr/council-wrapper.ts
Lines: 23-30

Council uses 2 models, and both can be from the same provider (e.g., GPT-4o and GPT-4o-mini).

```typescript
const councilModels = [
  'gpt-4o',
  'gpt-4o-mini',  // Same provider as above
];
```

### Evidence
- File: lib/osqr/council-wrapper.ts (lines 23-30)
- Spec is vague ("multiple models") - doesn't enforce provider diversity
- Original intent was explicit about 3+ providers

### The Problem
The original discussion was specific: 3+ providers, no duplicates. The spec lost this detail. The code follows the weak spec, not the original intent.

### Required Fix

**Change:** Update council to use 3 models from different providers

**Current Code:**
```typescript
const councilModels = [
  'gpt-4o',
  'gpt-4o-mini',
];
```

**New Code:**
```typescript
const councilModels = [
  'gpt-4o',           // OpenAI
  'claude-sonnet-4',  // Anthropic
  'gemini-2.0-flash', // Google
];
```

**File:** /Users/kablerecord/Desktop/oscar-app/packages/app-web/lib/osqr/council-wrapper.ts

### Verification
```bash
grep -A5 "councilModels" packages/app-web/lib/osqr/council-wrapper.ts
```

**Expected Result:** Three models from three different providers

---
```

### Example 3: DELETE Finding

```
---

## FINDING: MSC-007

**Severity:** P2
**Type:** DELETE

### What Chat/Original Intent Said (if DRIFT type)
> N/A

Source: N/A

### What Spec Says
> NO SPEC - this feature is not documented anywhere

Source: N/A

### What Other Spec Says (if CONFLICT type)
> N/A

Source: N/A

### What Code Does
File: /Users/kablerecord/Desktop/oscar-app/packages/app-web/lib/msc/legacy-context.ts
Lines: 1-150

Entire file implements old context assembly logic that was replaced by auto-context.ts. No imports reference this file.

### Evidence
- File: lib/msc/legacy-context.ts (entire file)
- Zero imports found: `grep -r "legacy-context" packages/app-web/` returns nothing
- auto-context.ts is the current implementation per CLAUDE.md

### The Problem
Dead code. Adds confusion, maintenance burden, and grep noise. Provides no value.

### Required Fix

**Change:** Delete the file

**Current Code:**
[Entire file - 150 lines]

**New Code:**
[File should not exist]

**File:** /Users/kablerecord/Desktop/oscar-app/packages/app-web/lib/msc/legacy-context.ts

### Verification
```bash
ls packages/app-web/lib/msc/legacy-context.ts 2>&1
```

**Expected Result:** "No such file or directory"

---
```

---

*Last updated: December 27, 2025*
