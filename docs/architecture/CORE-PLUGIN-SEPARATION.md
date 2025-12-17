# OSQR Core vs Plugin Separation Guide v1.0

**Status:** Architecture Decision Framework
**Owner:** Kable Record
**Created:** December 2024
**For:** VS Code OSQR Supporting Documentation

---

## The Tension

OSQR's comprehensive capability (total memory, agent orchestration, autonomy learning, GPKV) risks leaving no room for plugins. If core does everything, the marketplace dies before it starts.

**The question:** Can OSQR have insane capability AND a thriving plugin ecosystem?

**The answer:** Yes, but only with disciplined separation between infrastructure and methodology.

---

## The Separation Principle

**Core = Infrastructure (how OSQR works)**
- Storage mechanics
- Orchestration mechanics
- Routing mechanics
- Checkpoint mechanics

**Plugins = Methodology (how users should work)**
- What to store and how to tag it
- How to decompose tasks
- Which models for which tasks
- When to checkpoint and why

Core is powerful but unopinionated. Plugins add opinions.

---

## The Decision Framework

For every feature, ask: **"Is this infrastructure or methodology?"**

| If it's... | Then it belongs in... |
|------------|----------------------|
| How something works mechanically | Core |
| What approach users should take | Plugin |
| Capability that enables options | Core |
| Opinion about which option is best | Plugin |
| Platform that others build on | Core |
| Specific workflow or pattern | Plugin |

---

## Core Responsibilities

### Memory Infrastructure
- PKV exists and stores user data
- GPKV exists and aggregates patterns
- Encryption and privacy tiers work
- Retrieval and search function

**Core does NOT decide:** What gets tagged for GPKV vs PKV. That's plugin territory.

### Agent Orchestration
- Agents can be spawned
- Task graphs can be built
- Dependencies can be tracked
- Outputs can be passed between agents

**Core does NOT decide:** How to decompose a specific request. That's plugin territory.

### Model Routing
- Multiple models are available
- Routing rules can be configured
- Model performance is tracked

**Core does NOT decide:** Which model is best for which task type. That's plugin territory.

### Autonomy System
- Confidence scoring exists
- Checkpoints can trigger
- User responses are captured
- Learning loops function

**Core does NOT decide:** What confidence threshold triggers a checkpoint. That's plugin territory.

### GPKV Aggregation
- Patterns can be stored
- Namespaces exist
- Learning can be shared or kept private

**Core does NOT decide:** What patterns matter for a given domain. That's plugin territory.

---

## Plugin Opportunities

### Workflow Plugins
- "How I build a SaaS from scratch"
- "How I build a mobile app"
- "How I refactor legacy code"
- Task decomposition templates
- Phase-based build sequences

### Framework Plugins
- React patterns and best practices
- Vue ecosystem knowledge
- Backend architecture patterns
- Database design approaches

### Methodology Plugins
- Test-driven development workflows
- Documentation-first approach (your methodology)
- Agile sprint integration
- Continuous deployment patterns

### Vertical Plugins
- Fintech compliance requirements
- Healthcare data handling
- E-commerce payment flows
- B2B SaaS patterns

### Agent Personality Plugins
- Aggressive autonomy (minimal checkpoints)
- Teaching mode (explains everything)
- Cautious mode (frequent checkpoints)
- Speed mode (optimizes for velocity)

### Routing Preference Plugins
- "Always use Claude for architecture"
- "Use GPT-4o-mini for quick fixes"
- "Codex for all test generation"
- Custom model assignments by task type

### Checkpoint Configuration Plugins
- "Always ask about database decisions"
- "Never interrupt during documentation"
- "Checkpoint all security-related code"
- Domain-specific approval gates

### Domain Knowledge Plugins
- "How payments processing works"
- "AWS service selection guide"
- "Authentication patterns"
- Specialized technical knowledge

---

## GPKV Namespace Architecture

Plugins contribute to namespaced GPKV sections:

```
GPKV/
├── core/                 (universal patterns, OSQR-owned)
│   ├── error-solutions/
│   ├── library-conflicts/
│   └── version-issues/
│
├── react-dev/            (React plugin namespace)
│   ├── component-patterns/
│   ├── hook-usage/
│   └── performance-fixes/
│
├── fintech/              (Fintech plugin namespace)
│   ├── compliance-patterns/
│   ├── payment-integrations/
│   └── security-requirements/
│
├── fourth-gen/           (Fourth Generation Formula plugin)
│   ├── transfer-patterns/
│   ├── documentation-workflows/
│   └── legacy-building/
│
└── [creator-namespace]/  (any creator's patterns)
```

### How It Works

1. Plugin creator defines their namespace
2. Users of that plugin contribute patterns (anonymized)
3. Patterns aggregate in plugin's GPKV namespace
4. All users of that plugin benefit from accumulated learning
5. Plugin creator owns their namespace's intelligence

### Plugin Moats

A "React Development" plugin isn't just prompts. It's thousands of React-specific patterns learned from users. This creates defensible value that can't be copied overnight.

---

## The Balance

### Too Much in Core (Risk)
- Plugins feel like accessories
- Creators don't invest in building them
- Marketplace never develops
- Single point of failure (your opinions)

### Too Little in Core (Risk)
- Out-of-box experience is weak
- Users churn before discovering plugins
- Steep learning curve
- "Batteries not included" frustration

### The Sweet Spot
- Core is *usable* without plugins
- Core is *exceptional* with plugins
- Day 1: "This is great, I can build things"
- Day 30: "The React plugin makes this 10x better"

---

## Specific Feature Mapping

### Total Memory Architecture

| Feature | Core or Plugin |
|---------|----------------|
| Storage infrastructure | Core |
| Indexing and retrieval | Core |
| Temporal queries | Core |
| Encryption | Core |
| Tagging rules | Plugin |
| What counts as "important" | Plugin |
| Domain-specific memory patterns | Plugin |

### Agent Orchestration

| Feature | Core or Plugin |
|---------|----------------|
| Agent spawning | Core |
| Parallel execution | Core |
| Task graph management | Core |
| Dependency tracking | Core |
| Message passing | Core |
| Merge conflict detection | Core |
| Task decomposition templates | Plugin |
| Domain-specific agent configs | Plugin |
| Workflow sequences | Plugin |

### Model Routing

| Feature | Core or Plugin |
|---------|----------------|
| Model availability | Core |
| Routing rule engine | Core |
| Performance tracking | Core |
| Default routing | Core (minimal) |
| Task-type routing preferences | Plugin |
| Domain-specific model selection | Plugin |
| Cost optimization rules | Plugin |

### Autonomy System

| Feature | Core or Plugin |
|---------|----------------|
| Confidence scoring | Core |
| Checkpoint mechanics | Core |
| User response capture | Core |
| Learning loop infrastructure | Core |
| Confidence thresholds | Plugin |
| Checkpoint triggers | Plugin |
| Domain-specific approval rules | Plugin |
| Autonomy personalities | Plugin |

### GPKV

| Feature | Core or Plugin |
|---------|----------------|
| Aggregation infrastructure | Core |
| Namespace management | Core |
| Privacy controls | Core |
| Universal patterns (errors, conflicts) | Core |
| Domain-specific patterns | Plugin |
| Workflow patterns | Plugin |
| Framework patterns | Plugin |

---

## Fourth Generation Formula as First Plugin

Your own methodology becomes the proof of concept:

**What moves to plugin:**
- Documentation-first workflow
- Transfer principle patterns
- Legacy building frameworks
- Book of Builders templates

**What stays in core:**
- The infrastructure that makes it work

**Why this matters:**
- Proves plugins can be powerful
- Shows creators what's possible
- Keeps core neutral
- Your methodology competes fairly with others

---

## Plugin Creator Value Proposition

Creators get:
- Namespace in GPKV (their intelligence layer)
- Revenue share from subscriptions
- Distribution through OSQR marketplace
- Accumulated learning from all their users
- Defensible moat (patterns can't be copied)

Creators provide:
- Domain expertise
- Workflow design
- Ongoing refinement
- Community building

---

## Implementation Guidance

### When Building Core Features

Before implementing, ask:
1. Does this enable multiple approaches, or prescribe one?
2. Could a plugin reasonably own this?
3. Would removing this break the platform, or just remove an opinion?
4. Is this infrastructure or methodology?

**If in doubt, keep it out of core.** You can always add to core later. Removing from core breaks plugins.

### When Reviewing Plugin Proposals

Ask:
1. Does this need core changes, or just configuration?
2. Is the creator adding opinions on top of infrastructure?
3. Could multiple plugins compete in this space?
4. Does this create value through accumulated learning?

**Good plugins layer on core without requiring core changes.**

---

## The Discipline Required

Every feature is tempting to put in core. "Users need this out of the box."

Resist.

The goal is not maximum Day 1 capability. The goal is maximum ecosystem potential.

A slightly less capable core with a thriving plugin ecosystem beats a perfect core with no plugins every time.

**OSQR wins when creators win.**

---

## Summary

| Principle | Application |
|-----------|-------------|
| Core = Infrastructure | How things work mechanically |
| Plugin = Methodology | What approach users should take |
| GPKV namespaces | Plugins own their learning |
| Usable without plugins | Day 1 experience is good |
| Exceptional with plugins | Day 30 experience is transformative |
| When in doubt | Keep it out of core |

The separation principle protects the ecosystem. Discipline in applying it determines whether OSQR becomes a platform or just a product.

---

*Document Version: 1.0*
*For: VS Code OSQR Supporting Documentation*
