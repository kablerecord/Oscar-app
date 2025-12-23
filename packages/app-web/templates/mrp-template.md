# Merge-Readiness Pack
## Story: [STORY-ID]
## Date: [DATE]

---

## Summary

[1-2 sentences describing what was implemented]

---

## Evidence of Completion

### Tests

| Metric | Value |
|--------|-------|
| Total tests | [X] |
| Passing | [X] |
| Failing | [0] |
| Coverage | [X%] |

### Test Commands Run
```bash
npm test
npm run test:coverage
```

### Linting

| Metric | Value |
|--------|-------|
| Errors | 0 |
| Warnings | [X] |

If warnings > 0, explain:
- [Warning 1]: [Why it's acceptable]

### Type Check

| Metric | Value |
|--------|-------|
| Errors | 0 |

```bash
npm run typecheck
```

---

## Acceptance Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| [From spec criterion 1] | ✅ | [How verified - test name, manual check, etc.] |
| [From spec criterion 2] | ✅ | [How verified] |
| [From spec criterion 3] | ✅ | [How verified] |

---

## Files Changed

### New Files
- `path/to/new/file.ts` — [Purpose]

### Modified Files
- `path/to/modified/file.ts` — [What changed]

### Deleted Files
- `path/to/deleted/file.ts` — [Why removed]

---

## Deviations from Spec

### Deviation 1 (if any)
- **Spec said:** [Original requirement]
- **Implementation does:** [What was actually built]
- **Reason:** [Why the deviation was necessary]
- **Impact:** [What this means for users/system]

---

## Known Limitations

- [Limitation 1]: [Why it exists, when it will be addressed]
- [Limitation 2]: [Why it exists, when it will be addressed]

---

## Follow-up Work

- [ ] [Future improvement 1]
- [ ] [Future improvement 2]

---

## Checklist

- [ ] All acceptance criteria met
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Public APIs documented
- [ ] Feature flag added (if applicable)
- [ ] BUILD-LOG.md updated (if integration change)
- [ ] Spec updated (if implementation deviated)

---

## Ready for Merge

**Status:** ✅ Ready / ❌ Blocked

If blocked, explain:
- [Blocking issue]
