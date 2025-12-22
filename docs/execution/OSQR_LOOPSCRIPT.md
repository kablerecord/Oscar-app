# OSQR LoopScript
## Standard Operating Procedures for Autonomous Development

**Status:** Active
**Last Updated:** 2025-12-20
**Version:** 1.0

---

## 1. Before Starting Any Task

### Required Reading

1. **Read the relevant Epic file** — Understand the context and dependencies
2. **Read the relevant Story/Spec** — Understand specific requirements
3. **Check MentorScript for gotchas** — Avoid known pitfalls
4. **Verify dependencies are met** — Don't start blocked work

### Context Gathering

```
Epic file → Story file → MentorScript gotchas → Dependencies check
```

If any of these are missing or unclear, generate a CRP (see Section 3).

---

## 2. Implementation Loop

```
Read spec → Understand requirements
    │
    ▼
Check existing code → Don't duplicate
    │
    ▼
Implement → Follow MentorScript patterns
    │
    ▼
Test → All tests must pass
    │
    ▼
Self-review → Check against spec
    │
    ▼
If gaps → Loop back to implement
If complete → Proceed to MRP
```

### Implementation Guidelines

| Step | Action |
|------|--------|
| **Understand** | Read spec fully before writing code |
| **Check** | Search codebase for existing patterns |
| **Implement** | Use wrapper pattern for @osqr/core |
| **Test** | Write tests alongside implementation |
| **Review** | Self-check against success criteria |

---

## 3. When to Ask for Human Input (Generate CRP)

### Generate a Consultation Request Pack (CRP) when:

- Spec is ambiguous on a critical point
- Two valid approaches exist with significant trade-offs
- Security implications are unclear
- Breaking change to public API is required
- Spec appears to contradict another spec
- Architectural decision affects multiple components

### CRP Format

```markdown
# Consultation Request Pack
## CRP ID: CRP-[XXX]
## Date: [DATE]

## Context
[What task you're working on]

## Question
[What specific decision needs human input]

## Options
1. [Option A]
   - Pros: [...]
   - Cons: [...]
   - Effort: [...]

2. [Option B]
   - Pros: [...]
   - Cons: [...]
   - Effort: [...]

## Recommendation
[Your suggested approach and why]

## Impact of Delay
[What happens if this isn't resolved quickly]
```

---

## 4. When NOT to Ask (Decide Autonomously)

### Decide autonomously for:

- Implementation details within spec constraints
- Test structure and organization
- Internal naming conventions
- Performance optimizations that don't change behavior
- Refactoring that improves code without changing API
- File organization within established patterns
- Error message wording (within OSQR voice)

### Autonomy Heuristic

> "Does this decision affect the user-visible behavior or public API?"
>
> - **Yes** → May need CRP
> - **No** → Decide autonomously

---

## 5. Completion Checklist (MRP)

### Before Marking Complete (Merge-Readiness Pack)

- [ ] All acceptance criteria from spec met
- [ ] All tests pass (new and existing)
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Public APIs documented with JSDoc
- [ ] Feature flag added (if new feature)
- [ ] BUILD-LOG.md updated (if integration change)
- [ ] Spec updated if implementation deviated

### MRP Format

```markdown
# Merge-Readiness Pack
## Story: [STORY-ID]
## Date: [DATE]

## Evidence of Completion

### Tests
- Total tests: [X]
- Passing: [X]
- Coverage: [X%]

### Linting
- Errors: 0
- Warnings: [X] (explain if > 0)

### Type Check
- Errors: 0

## Acceptance Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| [From spec] | ✅/❌ | [How verified] |

## Deviations from Spec
[Any places where implementation differs from spec, and why]

## Known Limitations
[Anything not fully addressed]

## Ready for Merge
- [ ] All criteria met
- [ ] Tests pass
- [ ] No blocking issues
```

---

## 6. Rigor Levels

| Level | When to Use | Requirements |
|-------|-------------|--------------|
| **Standard** | Most features | Tests + self-review |
| **High** | Public APIs, Security | Tests + human review |
| **Critical** | Constitutional, Privacy | Tests + human review + security audit |

### Determining Rigor Level

```
Is it Constitutional or Privacy-related?
    │
    ├── Yes → Critical
    │
    └── No → Is it a public API or security-sensitive?
                 │
                 ├── Yes → High
                 │
                 └── No → Standard
```

---

## 7. Error Handling

### When Tests Fail

1. Read the error message carefully
2. Check if it's a real bug or test issue
3. Fix the underlying issue, not just the test
4. Run full test suite after fix
5. Document if this reveals a spec gap

### When Build Fails

1. Check TypeScript errors first
2. Check for missing imports
3. Check for circular dependencies
4. Verify @osqr/core integration (see BUILD-LOG.md)
5. Try `npm run build` with verbose output

### When Stuck

1. Re-read the spec
2. Check MentorScript gotchas
3. Search codebase for similar patterns
4. Check BUILD-LOG.md for related issues
5. Generate CRP if still blocked

---

## 8. Documentation Updates

### When to Update Docs

| Change | Update |
|--------|--------|
| New feature | Add to relevant spec |
| New gotcha discovered | Add to MentorScript |
| Integration change | Update BUILD-LOG.md |
| API change | Update affected specs |
| Pattern change | Update MentorScript patterns |

### Don't Create New Docs Unless

- Explicitly requested
- Documenting a new major component
- Creating required Spoken Architecture document

---

## 9. Branch and Commit Hygiene

### Commit Messages

```
<type>: <description>

[optional body]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### Branch Names

```
<type>/<short-description>
```

Examples:
- `feat/council-mode-ui`
- `fix/memory-vault-retrieval`
- `refactor/throttle-wrapper`

---

## 10. Status Tracking

After completing any task:

1. **Update the relevant Epic file** — Mark story status as Complete
2. **If Epic is 100% complete** — Update PRD Epic hierarchy status
3. **Add session summary to BUILD-LOG.md** — Document what was done

### Source of Truth

| Document | Purpose |
|----------|---------|
| **Epic files** | Implementation status (what's done) |
| **PRD** | What's planned and prioritized |
| **BUILD-LOG** | Audit trail of how we got here |

**Rule:** Never leave a session without updating the Epic file.

---

## 11. Related Documents

- [OSQR_MENTORSCRIPT.md](./OSQR_MENTORSCRIPT.md) — Development standards and gotchas
- [OSQR_PRD.md](../planning/OSQR_PRD.md) — Requirements and constraints
- [BUILD-LOG.md](../../BUILD-LOG.md) — Integration status
- Epic files in `docs/epics/`
- Templates in `/templates/`
