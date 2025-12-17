# OSQR Agent Orchestration Architecture v1.0

**Status:** Architecture Spec
**Owner:** Kable Record
**Created:** December 2024
**For:** VS Code OSQR Supporting Documentation

---

## Overview

OSQR orchestrates multiple AI agents working in parallel. You stop being the worker managing one AI. You become the executive directing many.

Current state: One Claude instance, sequential tasks, you are the bottleneck.

OSQR state: Multiple agents, parallel execution, OSQR coordinates, you approve exceptions.

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────┐
│                         YOU                             │
│                    (Executive)                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    OSQR CORE                            │
│              (Orchestrator Layer)                       │
│                                                         │
│  • Task decomposition                                   │
│  • Model routing                                        │
│  • Dependency management                                │
│  • Autonomy control                                     │
│  • Conflict resolution                                  │
│  • Progress tracking                                    │
│  • Total memory logging                                 │
└─────────────────────────────────────────────────────────┘
            │           │           │           │
            ▼           ▼           ▼           ▼
       ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
       │Agent 1 │  │Agent 2 │  │Agent 3 │  │Agent 4 │
       │(Codex) │  │(Claude)│  │(Claude)│  │(GPT-4o)│
       │        │  │        │  │        │  │        │
       │ Auth   │  │  API   │  │  DB    │  │ Tests  │
       │Module  │  │  Docs  │  │Schema  │  │        │
       └────────┘  └────────┘  └────────┘  └────────┘
```

---

## Task Decomposition

When you give OSQR a complex request:

**Input:** "Build the auth module, update the API docs, and refactor the database schema"

**OSQR decomposes:**
1. Identify discrete tasks
2. Determine dependencies
3. Assign optimal models
4. Dispatch in parallel where possible

**Output:** Task graph with parallel and sequential paths

---

## Model Routing

OSQR assigns the best model for each task type:

| Task Type | Optimal Model | Reasoning |
|-----------|---------------|-----------|
| Code implementation | Codex / Claude Sonnet | Fast, syntax-accurate |
| Architecture decisions | Claude Opus | Deep reasoning, tradeoffs |
| Documentation | Claude Sonnet / GPT-4o | Clear prose |
| Quick fixes | GPT-4o-mini | Speed, low cost |
| Code review | Claude Opus | Catches logic issues |
| Refactoring | Claude Sonnet | Understands intent |
| Test generation | Codex | Pattern matching |

Routing rules learned over time via GPKV (see Autonomy Learning section).

---

## Dependency Management

### Task Graph

OSQR builds a directed acyclic graph (DAG) before execution:

```
┌──────────────┐     ┌──────────────┐
│  DB Schema   │────▶│ Auth Module  │
└──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   API Docs   │
                     └──────────────┘
```

- Independent tasks run in parallel
- Dependent tasks wait for inputs
- OSQR tracks all relationships

### Agent Communication

Agents never communicate directly. OSQR mediates all information flow.

When Agent 1 completes:
1. OSQR captures outputs (files, decisions, context)
2. Identifies agents waiting on those outputs
3. Injects relevant context into waiting agents
4. Triggers next agents to start

**Message structure:**
```
From: agent-db-schema
To: agent-auth-module
Type: output
Payload:
  - files_created: [schema.prisma]
  - decisions: [UUID for user IDs, separate sessions table]
  - context: PostgreSQL with users, sessions, permissions tables
```

### Partial Dependencies

Some agents can start with incomplete inputs:
- Begin work on what's known
- OSQR injects additional context when available
- Agent adapts mid-task

---

## Merge Conflict Handling

### Tier 1: Prevention (Preferred)

OSQR analyzes tasks upfront for potential file collisions:

```
Warning: Auth Module and API Helpers may both modify utils.ts

Options:
1. Serialize tasks (Auth first, then API)
2. Split into auth-utils.ts and api-utils.ts
3. Proceed parallel, merge review at end

Select approach: [1] [2] [3]
```

Most conflicts prevented before agents start.

### Tier 2: Isolation (Default)

Each agent works in isolated branch/shadow copy:

```
main
├── agent-1-auth/utils.ts
├── agent-2-api/utils.ts
└── utils.ts (original)
```

On completion:
1. OSQR diffs both against original
2. Non-overlapping changes auto-merge
3. Overlapping changes flagged for review

### Tier 3: Resolution (When Needed)

For actual conflicts:

**Option A: Human decision**
```
Conflict in utils.ts lines 60-70:

Agent 1 (Auth): Added validateToken()
Agent 2 (API): Added formatResponse()

[Use Auth] [Use API] [Manual Merge] [Ask Claude to Merge]
```

**Option B: Merge agent**
- Dedicated Claude instance sees both versions
- Understands both agents' intent from task context
- Proposes merged version
- You approve or edit

**Option C: Semantic merge**
- OSQR understands what each agent attempted
- Agent 1 added function A, Agent 2 added function B
- Both valid, combine automatically

---

## Cost Reality

### The Insight

Parallel execution doesn't increase total cost. It concentrates it.

Sequential: 10 tasks × $0.40 = $4.00 over 10 hours
Parallel: 10 tasks × $0.40 = $4.00 over 1 hour

Same cost. 10x speed.

### The Comparison That Matters

Matching parallel OSQR output with humans:

- 10 parallel tasks = 10 developers
- 10 developers × $75/hour = $750/hour
- OSQR: $4/hour

At scale (1000 parallel tasks), human coordination becomes impossible regardless of budget. Communication overhead exceeds development cost.

OSQR cost is a rounding error on the value of the work.

---

## Autonomy System

### The Spectrum

```
Full Autonomy ◄─────────────────────► Full Supervision
(complete tasks)                    (approve each step)
```

Both extremes fail:
- Full autonomy: Agents go wrong for 30 minutes, waste tokens
- Full supervision: You become bottleneck, defeats purpose

### Confidence-Based Checkpoints

Agents self-assess certainty at decision points:

**High confidence (>90%): Proceed**
- Creating explicitly requested files
- Implementing patterns from codebase
- Following clear instructions

**Medium confidence (70-90%): Log and continue**
- Architectural micro-decisions
- Choosing between equivalent approaches
- Adding helper functions

**Low confidence (<70%): Checkpoint**
- Ambiguous requirements
- Multiple valid approaches with tradeoffs
- Touching critical systems
- Deleting/significantly changing existing code

### Checkpoint Interface

```
┌─────────────────────────────────────────────┐
│ AGENT CHECKPOINT: Auth Module               │
├─────────────────────────────────────────────┤
│ Decision needed: Session handling approach  │
│                                             │
│ Option A: JWT tokens (stateless)            │
│ - Simpler, scales easily                    │
│ - Cannot revoke individual sessions         │
│                                             │
│ Option B: Database sessions                 │
│ - Revocable, more control                   │
│ - Requires session table                    │
│                                             │
│ Affects: DB Schema agent                    │
│                                             │
│ [JWT] [DB Sessions] [Let me think]          │
└─────────────────────────────────────────────┘
```

Decision made in seconds. Agent continues.

### Autonomy Tiers (User Configurable)

**Tier 1: Supervised**
- Checkpoint before any file creation/modification
- For: Critical systems, learning phase, new task types

**Tier 2: Balanced (Default)**
- Confidence-based checkpoints
- Auto-proceed on high confidence
- For: Standard development work

**Tier 3: Autonomous**
- Complete entire task before presenting
- Checkpoint only on errors or blockers
- For: Well-defined tasks, trusted patterns

**Tier 4: Full Auto**
- Complete, commit, move to next task
- Review aggregated output later
- For: Documentation, tests, routine maintenance

---

## Autonomy Learning

### Personal Learning (PKV)

OSQR tracks your decisions:

- Agent chose A, you changed to B → Lower confidence for similar decisions
- Agent chose A, you approved → Higher confidence for similar decisions

Over time:
- Checkpoints decrease
- Agents learn your preferences
- Speed increases

### Global Learning (GPKV)

Autonomy patterns aggregate across all users:

- "Users override 80% of agent auth decisions" → Lower auth autonomy globally
- "Users accept 95% of test generation" → Higher test autonomy globally
- "This checkpoint type always approved" → Auto-proceed for all users

**New users inherit optimized autonomy from day one.**

### The Flywheel

```
More users
    → More autonomy decisions captured
    → Smarter confidence thresholds
    → Fewer unnecessary checkpoints
    → Faster execution
    → More users
```

### What GPKV Learns

- Which task types can run fully autonomous
- Which require human checkpoints
- Which models perform best on which tasks
- Which confidence thresholds are accurate
- Common decision patterns and outcomes

---

## Agent Dashboard

```
┌─────────────────────────────────────────────────┐
│ OSQR AGENTS                                  ≡  │
├─────────────────────────────────────────────────┤
│ ● Auth Module (Codex)          [████░░] 67%     │
│ ○ API Docs (Claude)            [waiting]        │
│ ● DB Schema (Claude)           [███░░░] 50%     │
│ ✓ Test Setup (GPT-4o)          [complete]       │
│ ⚠ Config Update (Claude)       [checkpoint]     │
├─────────────────────────────────────────────────┤
│ Active: 2  │  Waiting: 1  │  Complete: 1        │
├─────────────────────────────────────────────────┤
│ [+ Add Task]  [Pause All]  [View Outputs]       │
└─────────────────────────────────────────────────┘

Legend:
● Running  ○ Waiting  ✓ Complete  ⚠ Needs Input
```

---

## The Meta-Loop

You are currently:
- Manually orchestrating across Claude web, ChatGPT, VS Code
- Making decomposition decisions in real-time
- Learning when to check in vs let AI run
- Discovering which models work best for which tasks

**Every decision you make becomes v1 training data.**

v1.0: OSQR does what you taught it
- Your patterns, thresholds, routing decisions
- Good because you're good at this

v1.5: OSQR refines from your continued use
- Learns from your corrections
- Better at predicting your preferences

v2.0+: OSQR learns from all users
- Your patterns + thousands of other founders
- GPKV captures universal best practices
- Exceptional through collective intelligence

---

## Summary

| Component | Function |
|-----------|----------|
| Task Decomposition | Break complex requests into parallel units |
| Model Routing | Assign optimal AI for each task type |
| Dependency Management | Task graph + message queue, OSQR mediates |
| Merge Handling | Prevention, isolation, resolution tiers |
| Cost Model | Same total cost, concentrated time, 10x+ speed |
| Autonomy | Confidence-based checkpoints, user-configurable tiers |
| Learning | Personal (PKV) + Global (GPKV), flywheel acceleration |

**The through-line:**

OSQR orchestrates. Agents execute. You direct.

The first version is good because you designed it. Over time it becomes exceptional because thousands of users teach it what works.

---

*Document Version: 1.0*
*For: VS Code OSQR Supporting Documentation*
