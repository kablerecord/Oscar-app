# OSQR Autonomous Mode Guidelines

*Established rules for autonomous development sessions.*
*These guidelines ensure safe, predictable, and aligned autonomous behavior.*

---

## Core Principles

### 1. Conservative by Default
Autonomous mode should err on the side of **stability over creativity**. When uncertain:
- Preserve existing behavior
- Document the decision in ASSUMPTIONS.md
- Flag for human review in BLOCKED.md

### 2. Explicit Over Implicit
Never assume the founder wants something done a certain way. If a decision has multiple valid approaches, document the choice and reasoning.

### 3. Reversibility First
All changes should be easily reversible:
- Use git checkpoints liberally
- Tag before major changes
- Never force-push or rewrite history

---

## Established Rules

### Rule 1: Never Rename Routes or Internal Namespaces

**Context:** During Oscar → OSQR branding rename (2025-12-08)

**Rule:** Never rename API route paths or internal folder namespaces without explicit founder directive.

**Allowed:**
- User-facing branding (UI copy, titles, documentation)
- Variable names in local scope
- Comments and documentation

**Not Allowed:**
- API routes (`/api/oscar/` stays as-is)
- Component folder names (`components/oscar/`)
- Database table names
- Environment variable names

**Reasoning:** Changing route paths breaks:
- Client-side fetches
- Server components
- Integration tests
- External integrations
- Bookmarked URLs

User-facing branding can change anytime; internal contracts require a migration plan.

---

### Rule 2: MSC Categories Are Fixed

**Context:** MSC (Master Summary Checklist) seed implementation (2025-12-08)

**Rule:** MSC categories are fixed and defined by the founder. Agents may only populate existing categories - never create new ones.

**Fixed Categories:**
- `goal` - Vision and targets
- `project` - Active execution items
- `idea` - Generative thoughts to explore
- `principle` - Core beliefs and values (future)
- `habit` - Daily discipline items (future)

**Reasoning:** These categories map directly to the Fourth Generation Formula and Capability Ladder philosophy. Allowing agents to create new categories would dilute the intentional design.

**If a user item doesn't fit existing categories:** Flag for review, don't create a new category.

---

### Rule 3: Feature Placement Must Follow Spec

**Context:** "See Another AI Thinks" button implementation (2025-12-08)

**Rule:** When implementing features, follow the specification exactly. If the spec says "Quick Mode only," don't add it to all modes.

**Current Implementation Note:** The alt-opinion button currently appears on all responses. Per ROADMAP.md spec, it should only appear in Quick Mode. This needs adjustment during testing phase.

**Reasoning:**
- Quick Mode = single-model instant answer (perfect place for "what does another model say?")
- Thoughtful/Contemplate modes already have multi-model synthesis
- Feature placement affects UX and product positioning

---

### Rule 4: Checkpoint Strategy

**Rule:** Create git checkpoints at logical milestones during autonomous work.

**Checkpoint Format:**
```bash
git tag checkpoint/<feature-name>
```

**When to Checkpoint:**
- After completing a logical unit of work
- Before making risky changes
- After fixing a batch of errors
- Before merging to main

**Branch Strategy:**
- Work on feature branches (e.g., `feature/autonomous-phase-1`)
- Tag checkpoints on the branch
- Merge to main only with founder approval

---

### Rule 5: Document Blocked Items

**Rule:** When work is blocked by external factors (database down, missing credentials, unclear requirements), document in BLOCKED.md immediately.

**BLOCKED.md Format:**
```markdown
### [Item Title]
**Date:** YYYY-MM-DD
**What:** Description of what's ready but can't execute
**Why:** The blocking factor
**Resolution:** Exact steps to resolve when unblocked
**Code:** Location of ready-to-run code (if applicable)
```

**Reasoning:** Prevents losing track of incomplete work and provides clear handoff.

---

### Rule 6: Assumptions Documentation

**Rule:** When making decisions that could have gone another way, document in ASSUMPTIONS.md.

**ASSUMPTIONS.md Format:**
```markdown
## [Decision Title]

**Assumption:** What was decided

**Reasoning:** Why this choice was made

**Alternatives Considered:** Other options (if relevant)
```

**When to Document:**
- Branding/naming decisions
- Architecture choices with trade-offs
- Feature scope interpretations
- Default values chosen

---

## File Organization

### Project Root Documentation Files

| File | Purpose |
|------|---------|
| `ROADMAP.md` | What to build (founder-maintained) |
| `ASSUMPTIONS.md` | Decisions made during autonomous work |
| `BLOCKED.md` | Items waiting on external factors |
| `AUTONOMOUS-GUIDELINES.md` | This file - rules for autonomous mode |
| `ARCHITECTURE.md` | Technical architecture reference |

### Working Directories

- `/Users/kablerecord/Desktop/oscar-app` - Main OSQR application
- Feature branches for autonomous work
- Checkpoints tagged for rollback safety

---

## Autonomous Session Workflow

### Starting a Session

1. Review ROADMAP.md for current phase priorities
2. Check BLOCKED.md for items that may be unblocked
3. Create feature branch if starting new work
4. Review ASSUMPTIONS.md from previous sessions

### During a Session

1. Work through ROADMAP items in order
2. Create checkpoints at logical milestones
3. Document assumptions as they're made
4. Add to BLOCKED.md if work gets stuck
5. Run linter before committing

### Ending a Session

1. Commit all work with descriptive messages
2. Update ASSUMPTIONS.md with any new decisions
3. Update BLOCKED.md with pending items
4. Create final checkpoint tag
5. Summarize work completed for founder review

---

## Quality Standards

### Code Changes
- Run `npm run lint` before committing
- Fix lint errors immediately
- No unused imports or variables
- Escape HTML entities in JSX

### Documentation
- Keep docs in sync with code changes
- Update user-facing copy for branding
- Don't create new .md files unless necessary

### Testing (Future)
- Run test suite before major commits
- Add tests for new features
- Don't commit with failing tests

---

## Prohibited Actions

These actions require explicit founder approval:

1. **Database migrations** - Schema changes need review
2. **Dependency updates** - Major version bumps need approval
3. **Security changes** - Auth, permissions, API keys
4. **Deployment** - Never auto-deploy to production
5. **Force push** - Never rewrite shared history
6. **Delete files** - Archive instead, or get approval
7. **Create new categories/taxonomies** - Philosophy decisions need founder input

---

## Communication Protocol

### When to Ask vs. Proceed

**Proceed Autonomously:**
- Implementing specified ROADMAP items
- Fixing lint errors
- Updating documentation for branding
- Creating checkpoints
- Documenting in ASSUMPTIONS.md

**Ask First:**
- Anything not in ROADMAP
- Architectural changes
- New dependencies
- Unclear requirements
- Multiple valid approaches with significant trade-offs

### How to Flag Issues

- **Minor:** Note in ASSUMPTIONS.md
- **Blocking:** Add to BLOCKED.md
- **Urgent:** Stop and ask founder directly

---

*Last updated: 2025-12-08*
*Version: 1.0*
