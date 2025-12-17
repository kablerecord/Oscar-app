# Fourth Generation Formula Plugin Specification v1.0

**Status:** Plugin Template & Reference Implementation
**Owner:** Kable Record
**Created:** December 2024
**For:** VS Code OSQR Plugin Development

---

## Overview

The Fourth Generation Formula plugin is OSQR's first official plugin and serves as the template for all future plugin creators. It demonstrates how plugins add methodology on top of OSQR's infrastructure.

**What this plugin does:** Implements the documentation-first, transfer-focused development methodology from the Fourth Generation Formula book.

**What core provides:** Storage, orchestration, routing, checkpoints, GPKV infrastructure.

**What this plugin adds:** Opinions about how to use those capabilities for legacy-building software development.

---

## Plugin Identity

| Field | Value |
|-------|-------|
| Name | Fourth Generation Formula |
| Namespace | `fourth-gen` |
| Version | 1.0.0 |
| Author | Kable Record |
| Category | Methodology |
| Tier | Premium |
| Price | $29/month |

---

## Core Principle: Documentation-First Development

Traditional development: Code → Document (maybe) → Hope someone understands it later

Fourth Gen development: Document → Build → Transfer

The documentation isn't about the code. It's about the **why** and the **how to continue**. Software that can be understood, maintained, and transferred is software that builds legacy.

---

## Workflow Templates

### Template 1: New Project Initialization

**Trigger:** User starts a new project with Fourth Gen plugin active

**Sequence:**

```
1. VISION CAPTURE
   └── Prompt: "Before any code, describe what this project exists to accomplish.
               Not features—impact. Who benefits and how?"
   └── Output: vision.md
   └── Checkpoint: Always (user must approve vision statement)

2. ARCHITECTURE DECISION RECORD
   └── Prompt: "What are the 3-5 major technical decisions this project requires?
               For each: what are the options, tradeoffs, and your chosen approach?"
   └── Output: decisions/ADR-001.md through ADR-00N.md
   └── Checkpoint: Each decision individually

3. TRANSFER DOCUMENTATION
   └── Prompt: "If you handed this project to someone tomorrow,
               what would they need to know to continue effectively?"
   └── Output: TRANSFER.md (living document, updated throughout)
   └── Checkpoint: Initial creation only

4. IMPLEMENTATION
   └── Standard OSQR agent orchestration begins
   └── All decisions reference ADRs
   └── Transfer doc updated automatically as code evolves
```

### Template 2: Feature Addition

**Trigger:** User requests a new feature

**Sequence:**

```
1. IMPACT ASSESSMENT
   └── Prompt: "How does this feature connect to the project vision?
               What existing decisions does it affect?"
   └── Output: Feature brief (may trigger new ADR)
   └── Checkpoint: If feature conflicts with existing ADRs

2. TRANSFER IMPACT
   └── Automatic check: "Will this change require transfer doc updates?"
   └── Output: Draft transfer doc additions
   └── Checkpoint: Never (handled automatically)

3. IMPLEMENTATION
   └── Standard agent orchestration
   └── Transfer doc updated on completion
```

### Template 3: Refactoring/Technical Debt

**Trigger:** User requests refactoring or debt reduction

**Sequence:**

```
1. DECISION REVIEW
   └── Prompt: "Which original decisions led to this debt?
               Should we update the ADR or create a new one?"
   └── Output: ADR update or new ADR
   └── Checkpoint: Always (refactoring changes foundations)

2. TRANSFER IMPLICATIONS
   └── Prompt: "How does this refactoring change what a new person
               needs to know about this codebase?"
   └── Output: Transfer doc updates
   └── Checkpoint: Review after completion

3. IMPLEMENTATION
   └── Standard agent orchestration with extra merge caution
```

### Template 4: Handoff Preparation

**Trigger:** User invokes "prepare for transfer" command

**Sequence:**

```
1. COMPLETENESS AUDIT
   └── Scan: All code paths have corresponding documentation
   └── Scan: All ADRs are current
   └── Scan: Transfer doc covers all major systems
   └── Output: Gap report
   └── Checkpoint: Always

2. ONBOARDING SEQUENCE
   └── Generate: Recommended reading order
   └── Generate: "First day" setup guide
   └── Generate: "First week" orientation tasks
   └── Output: ONBOARDING.md
   └── Checkpoint: Review before finalization

3. KNOWLEDGE TEST
   └── Generate: Questions a new developer should be able to answer
   └── Purpose: Validate documentation completeness
   └── Output: KNOWLEDGE-CHECK.md
```

---

## Checkpoint Rules

### Always Checkpoint

| Situation | Reason |
|-----------|--------|
| Vision statement changes | Foundation of everything |
| Architecture decision creation | Affects all downstream work |
| Architecture decision modification | May invalidate existing code |
| Transfer document major updates | Affects handoff quality |
| Deleting any documentation file | May lose critical context |

### Never Checkpoint

| Situation | Reason |
|-----------|--------|
| Adding code comments | Low risk, high value |
| Updating transfer doc with new file references | Mechanical update |
| Fixing typos in documentation | Obvious improvement |
| Adding test coverage | Always good |

### Confidence-Based (Follow Core Settings)

| Situation | Default Confidence |
|-----------|-------------------|
| Creating new documentation files | 80% (usually proceed) |
| Updating existing ADRs with new context | 70% (may checkpoint) |
| Refactoring documentation structure | 60% (likely checkpoint) |

---

## GPKV Patterns to Seed

The Fourth Gen plugin seeds its namespace with patterns from the methodology:

### Namespace: `fourth-gen/`

```
fourth-gen/
├── documentation-patterns/
│   ├── vision-statement-templates
│   ├── adr-formats
│   ├── transfer-doc-structures
│   └── onboarding-sequences
│
├── workflow-patterns/
│   ├── doc-first-sequences
│   ├── feature-impact-assessments
│   └── handoff-checklists
│
├── transfer-principles/
│   ├── what-to-document
│   ├── what-to-skip
│   ├── living-doc-triggers
│   └── completeness-criteria
│
└── legacy-patterns/
    ├── succession-planning
    ├── knowledge-distribution
    └── bus-factor-reduction
```

### Initial Seed Content

**From the Fourth Generation Formula book:**

1. **The Builder's Creed principles** → Checkpoint triggers
2. **Transfer Blueprint framework** → Documentation templates
3. **Character Assessment dimensions** → Project health metrics
4. **Succession planning patterns** → Handoff workflows

**From OSQR development:**

1. **Documentation-first session patterns** → Workflow templates
2. **Decision capture examples** → ADR formats
3. **Context preservation techniques** → Transfer doc structures

---

## Prompts and System Instructions

### Plugin System Prompt (Injected into all agents)

```
You are operating under the Fourth Generation Formula methodology.

Core principles:
1. Documentation exists for TRANSFER, not just reference
2. Every decision should be recorded with its reasoning
3. Code that cannot be handed off is technical debt
4. The goal is not just working software, but TRANSFERABLE software

Before implementing:
- Check if this affects the project vision
- Check if this requires a new or updated ADR
- Consider: "Would a new developer understand why this exists?"

After implementing:
- Update transfer documentation if the change is significant
- Ensure the change aligns with recorded decisions
- Add context that isn't obvious from the code itself
```

### Vision Capture Prompt

```
Let's establish the foundation for this project.

Don't describe features yet. Describe IMPACT.

1. Who specifically benefits from this project existing?
2. What problem does it solve that matters to them?
3. If this project succeeds completely, what changes in the world?
4. Why are YOU the right person to build this?

This becomes the north star. Every feature request gets evaluated against it.
```

### ADR Creation Prompt

```
Architecture Decision Record

## Context
What situation requires a decision?

## Options Considered
For each option:
- Description
- Pros
- Cons
- Effort estimate

## Decision
Which option and why?

## Consequences
What does this decision make easier?
What does this decision make harder?
What doors does this close?

## Transfer Note
What would someone need to understand about this decision
to maintain or change it in the future?
```

### Transfer Document Prompt

```
This document exists for one purpose:
Enable someone else to continue this project effectively.

Structure:
1. PROJECT OVERVIEW (2-3 paragraphs max)
   - What this is
   - Why it exists
   - Current state

2. QUICK START
   - How to run locally
   - How to deploy
   - How to test

3. ARCHITECTURE OVERVIEW
   - Major components and their relationships
   - Data flow
   - Key files to understand first

4. DECISION CONTEXT
   - Link to ADRs
   - Decisions that aren't obvious from code

5. GOTCHAS
   - Things that will confuse a new person
   - Non-obvious dependencies
   - Historical context that matters

6. NEXT STEPS
   - Known issues
   - Planned improvements
   - What you'd do differently
```

---

## What This Plugin Does That Core Doesn't

| Core Provides | Plugin Adds |
|---------------|-------------|
| File storage | Documentation-first file creation sequence |
| Checkpoint mechanics | Transfer-focused checkpoint rules |
| Agent orchestration | Workflow templates for doc-first development |
| GPKV infrastructure | Seeded patterns from Fourth Gen methodology |
| Model routing | Preferences for documentation-heavy tasks |
| Memory indexing | ADR and transfer doc cross-referencing |

### Specific Plugin Behaviors

1. **Prevents code-first starts**
   - Core: Accepts any starting point
   - Plugin: Requires vision + ADR before implementation

2. **Enforces decision recording**
   - Core: Logs decisions if captured
   - Plugin: Prompts for ADR on architectural choices

3. **Maintains transfer readiness**
   - Core: Stores documentation
   - Plugin: Continuously evaluates documentation completeness

4. **Applies transfer lens to reviews**
   - Core: Standard code review
   - Plugin: Adds "transferability" to review criteria

---

## Plugin Configuration Options

```yaml
fourth-gen:
  # Strictness level
  mode: standard | strict | learning

  # Documentation requirements
  require_vision: true
  require_adr_for_decisions: true
  auto_update_transfer_doc: true

  # Checkpoint overrides
  always_checkpoint_decisions: true
  checkpoint_refactoring: true

  # Templates
  adr_template: default | custom_path
  transfer_template: default | custom_path
  vision_template: default | custom_path

  # Learning mode (for new users)
  explain_prompts: false
  show_methodology_tips: false
```

### Mode Descriptions

**Standard:** Full methodology, balanced checkpoints
**Strict:** Maximum documentation requirements, frequent checkpoints
**Learning:** Explains methodology as you work, more guidance prompts

---

## Integration with Core Systems

### Memory Integration

Plugin contributes to PKV:
- User's vision statement patterns
- ADR writing style preferences
- Documentation completeness thresholds

Plugin contributes to GPKV (`fourth-gen/` namespace):
- Effective ADR formats discovered
- Transfer doc structures that work
- Checkpoint patterns that users accept

### Agent Integration

Plugin can request specific agent behaviors:
- "Documentation agent" before implementation agents
- "Transfer review agent" after feature completion
- "ADR audit agent" on refactoring tasks

### Autonomy Integration

Plugin modifies confidence thresholds:
- Lower confidence (more checkpoints) for decision-related changes
- Higher confidence (fewer checkpoints) for documentation additions
- Overrides user's global settings for transfer-critical operations

---

## Success Metrics

How we know the plugin is working:

| Metric | Target |
|--------|--------|
| Projects with vision.md | 100% of plugin users |
| ADRs per significant decision | >80% |
| Transfer doc freshness | Updated within 1 week of major changes |
| Handoff success rate | New developer productive within 1 day |
| User retention | >70% continue using after 3 months |

---

## Roadmap

### v1.0 (Launch)
- Core workflow templates
- Basic checkpoint rules
- Initial GPKV seed
- Standard prompts

### v1.5
- Learning mode for new users
- Custom template support
- Integration with team collaboration features

### v2.0
- Automated documentation gap detection
- Transfer readiness scoring
- Integration with succession planning tools
- Multi-project pattern recognition

---

## For Plugin Creators: What This Template Demonstrates

1. **Methodology over mechanics** - Plugin adds opinions, not infrastructure
2. **Clear checkpoint rules** - When to interrupt, when to proceed
3. **GPKV namespace ownership** - Your plugin, your patterns
4. **Workflow sequencing** - Templates guide user through your methodology
5. **Configuration flexibility** - Users can adjust strictness
6. **Integration with core** - Leverage memory, agents, and autonomy
7. **Measurable success** - Know if your plugin delivers value

Use this specification as the template for your own plugin proposals.

---

*Document Version: 1.0*
*For: VS Code OSQR Plugin Development*
