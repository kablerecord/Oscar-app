# OSQR Build Workflow

**Purpose:** Standard process for building features with Claude, from design to implementation.

---

## The Workflow

```
1. DESIGN SESSION (this window)
   ├── Clarify the concept
   ├── Check against existing specs (avoid duplication)
   ├── Create/update philosophy doc (if needed)
   └── Update technical spec (if needed)

2. CREATE BUILD PLAN
   ├── docs/builds/[FEATURE]_BUILD_PLAN.md
   ├── What already exists
   ├── What needs to be built
   ├── File locations
   ├── Build order
   └── Success criteria

3. EXECUTE (new window)
   └── /autonomous + build plan reference

4. VERIFY (this window)
   ├── Review code against spec
   ├── Run tests
   └── Check metrics
```

---

## Build Plan Template

Create `docs/builds/[FEATURE]_BUILD_PLAN.md` with this structure:

```markdown
# [Feature] Build Plan

**Created:** [Date]
**Status:** Ready for Implementation
**Estimated Time:** [X hours/sessions]
**Spec Reference:** [link to spec]

---

## Time Tracking

**IMPORTANT:** Record start/end times in `.claude/build-metrics.json`

---

## Context

[1-2 paragraphs explaining what this feature is and why it matters]

---

## What Already Exists

[Table or list of existing code/schema/services]

---

## What Needs to Be Built

### Phase 1: [Name] (Priority 1)
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Name] (Priority 2)
- [ ] Task 1
- [ ] Task 2

---

## Technical Decisions

[Key decisions already made - don't re-decide these]

---

## File Locations

[Quick reference of relevant files]

---

## Build Order

1. [First thing to do]
2. [Second thing]
...

---

## Success Criteria

[How we know it's done]

---

## What NOT to Build

[Explicitly deferred items]
```

---

## Prompt Template

For the new Claude window:

```
/autonomous

Build [FEATURE]. Read docs/builds/[FEATURE]_BUILD_PLAN.md for full instructions.

Track time in .claude/build-metrics.json (start time, end time, duration, completed phases).
```

---

## Metrics Tracking

The `.claude/build-metrics.json` file tracks:

```json
{
  "builds": [
    {
      "name": "Feature Name",
      "buildPlan": "docs/builds/FEATURE_BUILD_PLAN.md",
      "humanEstimate": "X weeks",
      "claudeEstimate": "X hours",
      "sessions": [
        {
          "session": 1,
          "startTime": "ISO timestamp",
          "endTime": "ISO timestamp",
          "durationMinutes": N,
          "completedPhases": ["Phase 1", "Phase 2"],
          "notes": "What was done"
        }
      ],
      "totalDurationMinutes": N,
      "status": "completed|in_progress|blocked",
      "outcome": { ... }
    }
  ]
}
```

---

## Why This Works

1. **Design and execution are separate windows** — Design session has full context; execution session has focused instructions
2. **Build plan is the handoff** — Everything the executing Claude needs is in one doc
3. **Specs prevent drift** — Executing Claude checks against spec, not vibes
4. **Metrics enable calibration** — Over time, we learn how long things actually take
5. **/autonomous handles autonomy** — No need to babysit the execution

---

## Example: UIP Implementation

| Step | Output |
|------|--------|
| Design session | Clarified "Blueprint Engine" = UIP + philosophy |
| Philosophy doc | `docs/vision/SPOKEN-ARCHITECTURE-V3.md` |
| Spec update | `docs/architecture/UIP_SPEC.md` v1.1 |
| Build plan | `docs/builds/UIP_BUILD_PLAN.md` |
| Execution | 41 minutes, 462 tests passing |
| Verification | Code matches spec ✅ |

---

## When to Use This

Use this workflow for:
- Features that take more than 30 minutes
- Anything with a spec document
- Multi-file changes
- Features with existing partial implementation

Skip this workflow for:
- Quick bug fixes
- Single-file changes
- Exploratory work
