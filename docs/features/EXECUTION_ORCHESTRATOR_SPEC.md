# OSQR Execution Orchestrator Specification

**Component**: Execution Orchestrator
**Version**: 1.0
**Status**: Ready for Implementation
**Dependencies**: Memory Vault, Secretary Checklist, Constitutional Framework, VS Code Extension
**Priority**: V3.0 Feature (VS Code OSQR Integration)

> **Note**: This spec was originally written targeting "V2.0" but has been aligned to the OSQR roadmap where V3.0 = VS Code OSQR. All V2.0 references in this document should be read as V3.0.

---

## Executive Summary

The Execution Orchestrator transforms OSQR from a conversational assistant into an autonomous execution layer. Instead of the user manually orchestrating work across multiple Claude sessions, chats, and interfaces, OSQR manages parallel workstreams, tracks dependencies, accumulates decisions, and reports completion with exceptions.

**The Jarvis Command**: User says "Go build it" → OSQR reads specs, spawns parallel work, collects decision points, returns "Built 3 of 4. #2 has an embedding gap I need you to resolve."

---

## Related Documents

- [OSQR-CHARACTER-GUIDE.md](../governance/OSQR-CHARACTER-GUIDE.md) - Interface Handoff Protocol behavioral rules
- [OSQR_SECRETARY_CHECKLIST_ADDENDUM.md](./OSQR_SECRETARY_CHECKLIST_ADDENDUM.md) - Proactive monitoring that this extends
- [TOTAL-MEMORY-ARCHITECTURE.md](../strategy/TOTAL-MEMORY-ARCHITECTURE.md) - Memory Vault state storage
- [OSQR_CONSTITUTION.md](../governance/OSQR_CONSTITUTION.md) - Autonomy boundaries
- [VSCODE-DEV-COMPANION.md](../vision/VSCODE-DEV-COMPANION.md) - VS Code Extension foundation
- [AUTONOMOUS-APP-BUILDER.md](../vision/AUTONOMOUS-APP-BUILDER.md) - Builder capabilities

---

## Problem Statement

### Current State (Manual Orchestration)

```
User manages:
├── Chat 1: VS Code Extension Spec → Claude in VS Code working
├── Chat 2: Enterprise Deal Strategy → Ready for handoff
├── Chat 3: Deep Research System → Spec complete, needs implementation
├── Chat 4: Auto-Organization Features → Three specs created
└── Chat 5: Meta-orchestration (this conversation)

User is the orchestration layer:
- Tracking state across 5 conversations
- Numbering chats (1, 2, 3, 4) to maintain order
- Copy/pasting outputs between sessions
- Managing handoffs manually
- Remembering what each chat knows
```

### Target State (OSQR Orchestrates)

```
User: "Go build it"

OSQR:
├── Reads active specs from /docs/
├── Identifies 4 independent implementation tasks
├── Spawns/queues Claude Code sessions
├── Each session works from its spec
├── Collects:
│   ├── Completed work
│   ├── Decisions made autonomously
│   ├── Decisions that need user
│   └── Blockers discovered
└── Returns: "Built 3 of 4. Need your input on embedding strategy."
```

---

## Core Principle

**"User organizational structures are execution preferences, not orchestration boundaries."**

Just as the Memory Vault treats projects as presentation preferences rather than knowledge boundaries, the Execution Orchestrator treats task organization as user preference—OSQR maintains unified awareness across all workstreams.

---

## Architecture

### System Position

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Interfaces                               │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│   │   Web    │ │ VS Code  │ │  Mobile  │ │  Voice   │              │
│   │  (Chat)  │ │(Builder) │ │  (App)   │ │ (Future) │              │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘              │
│        └────────────┴────────────┴────────────┘                     │
│                           │                                          │
│                           ▼                                          │
│              ┌────────────────────────────┐                          │
│              │  Execution Orchestrator    │ ◄── NEW COMPONENT        │
│              │  ┌──────────────────────┐  │                          │
│              │  │ Workstream Registry  │  │                          │
│              │  │ Dependency Graph     │  │                          │
│              │  │ Execution Queue      │  │                          │
│              │  │ Decision Accumulator │  │                          │
│              │  │ Completion Reporter  │  │                          │
│              │  └──────────────────────┘  │                          │
│              └─────────────┬──────────────┘                          │
│                            │                                          │
│              ┌─────────────┴──────────────┐                          │
│              │                            │                          │
│              ▼                            ▼                          │
│   ┌──────────────────┐        ┌──────────────────┐                  │
│   │  Memory Vault    │        │ Secretary        │                  │
│   │  (State Store)   │        │ Checklist        │                  │
│   └──────────────────┘        └──────────────────┘                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Relationships

| Component | Relationship to Orchestrator |
|-----------|------------------------------|
| **Memory Vault** | Stores workstream state, cross-references, decision history |
| **Secretary Checklist** | Monitors workstreams, surfaces blockers, tracks commitments |
| **Constitutional Framework** | Defines autonomy boundaries (what needs user vs. autonomous) |
| **VS Code Extension** | Primary execution interface for code-related workstreams |
| **Document Indexing** | Provides spec awareness for execution planning |

---

## Data Structures

### TypeScript Interfaces

```typescript
// Core Workstream Definition
interface Workstream {
  id: string;
  name: string;
  description: string;

  // Source of truth
  spec: {
    documentId: string;
    path: string;
    version: string;
    lastParsed: Date;
  };

  // Current state
  status: WorkstreamStatus;
  phase: Phase;
  progress: number; // 0-100

  // Autonomy settings
  autonomyLevel: 'full' | 'supervised' | 'manual';
  approvedActions: ActionType[];
  blockedActions: ActionType[];

  // Relationships
  dependencies: Dependency[];
  blockedBy: string[]; // Other workstream IDs
  blocks: string[]; // Other workstream IDs

  // Execution context
  assignedExecutor: 'vscode' | 'web' | 'api' | null;
  lastActivity: Date;
  estimatedCompletion: Date | null;

  // Metadata
  createdAt: Date;
  createdBy: 'user' | 'osqr';
  tags: string[];
}

type WorkstreamStatus =
  | 'queued'      // Waiting to start
  | 'blocked'     // Waiting on dependency or decision
  | 'active'      // Currently executing
  | 'paused'      // User paused
  | 'completed'   // Successfully finished
  | 'failed';     // Execution failed

interface Phase {
  name: string;
  order: number;
  tasks: Task[];
  completedTasks: number;
}

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  autonomyLevel: 'autonomous' | 'needs_approval';
  blockedReason?: string;
  completedAt?: Date;
  output?: TaskOutput;
}

interface TaskOutput {
  type: 'code' | 'document' | 'decision' | 'artifact';
  path?: string;
  summary: string;
  changes?: ChangeRecord[];
}
```

### Dependency Graph

```typescript
interface Dependency {
  workstreamId: string;
  type: DependencyType;
  condition: DependencyCondition;
  status: 'satisfied' | 'pending' | 'blocked';
}

type DependencyType =
  | 'completion'    // Must complete before this starts
  | 'output'        // Needs specific output from another
  | 'approval'      // Needs user approval
  | 'resource'      // Needs shared resource (e.g., same codebase)
  | 'knowledge';    // Needs knowledge from another workstream

interface DependencyCondition {
  type: 'phase_complete' | 'task_complete' | 'artifact_exists' | 'user_approval';
  target: string; // Phase/task/artifact ID
  description: string;
}
```

### Decision Accumulator

```typescript
interface PendingDecision {
  id: string;
  workstreamId: string;
  timestamp: Date;

  // Decision context
  type: DecisionType;
  question: string;
  context: string;
  options: DecisionOption[];
  recommendation: string | null;

  // Urgency
  priority: 'critical' | 'high' | 'medium' | 'low';
  blocksProgress: boolean;
  deadline: Date | null;

  // What happens if user doesn't respond
  defaultAction: DecisionOption | null;
  autoResolveAfter: number | null; // minutes
}

type DecisionType =
  | 'architectural'   // Design decisions
  | 'implementation'  // How to build something
  | 'conflict'        // Contradictions between specs
  | 'scope'           // Feature scope questions
  | 'resource'        // Resource allocation
  | 'approval'        // Needs explicit sign-off
  | 'error';          // Error handling

interface DecisionOption {
  id: string;
  label: string;
  description: string;
  implications: string[];
  recommended: boolean;
}

interface DecisionResolution {
  decisionId: string;
  resolvedBy: 'user' | 'osqr' | 'timeout';
  selectedOption: string;
  reasoning?: string;
  timestamp: Date;
}
```

### Execution Queue

```typescript
interface ExecutionQueue {
  userId: string;

  // Current state
  active: QueuedExecution[];
  pending: QueuedExecution[];
  completed: CompletedExecution[];

  // Configuration
  maxParallel: number;
  prioritization: 'fifo' | 'dependency_first' | 'user_defined';

  // Statistics
  stats: QueueStats;
}

interface QueuedExecution {
  id: string;
  workstreamId: string;

  // Execution target
  executor: ExecutorType;
  sessionId?: string;

  // State
  status: 'queued' | 'starting' | 'running' | 'completing';
  startedAt?: Date;

  // Checkpointing
  lastCheckpoint: Date;
  checkpointData: any;
}

type ExecutorType =
  | 'vscode_claude'   // Claude in VS Code
  | 'web_session'     // Web interface session
  | 'api_call'        // Direct API execution
  | 'background';     // Background processing

interface CompletedExecution {
  id: string;
  workstreamId: string;

  // Results
  status: 'success' | 'partial' | 'failed';
  output: ExecutionOutput;

  // Metrics
  duration: number;
  tokensUsed: number;
  decisionsRequired: number;
  decisionsAutoResolved: number;

  // Follow-up
  nextSteps?: string[];
  blockers?: string[];
}

interface ExecutionOutput {
  summary: string;
  artifacts: Artifact[];
  decisions: DecisionResolution[];
  warnings: string[];
  errors: string[];
}
```

---

## Orchestration Flows

### Flow 1: "Go Build It" Command

```
User: "Go build it"
         │
         ▼
┌────────────────────────────────────────┐
│  1. SPEC DISCOVERY                     │
│  ─────────────────                     │
│  • Scan /docs/ for active specs        │
│  • Parse spec metadata & dependencies  │
│  • Identify implementation-ready specs │
│  • Flag specs needing more detail      │
└────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  2. DEPENDENCY ANALYSIS                │
│  ──────────────────────                │
│  • Build dependency graph              │
│  • Identify parallel-safe workstreams  │
│  • Order sequential dependencies       │
│  • Flag circular dependencies          │
└────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  3. EXECUTION PLANNING                 │
│  ─────────────────────                 │
│  • Assign executors to workstreams     │
│  • Set autonomy levels per task        │
│  • Estimate completion times           │
│  • Create execution queue              │
└────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  4. PARALLEL EXECUTION                 │
│  ─────────────────────                 │
│  • Start parallel-safe workstreams     │
│  • Queue sequential workstreams        │
│  • Monitor progress via checkpoints    │
│  • Collect decisions as they arise     │
└────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  5. COMPLETION REPORT                  │
│  ───────────────────                   │
│  • Summarize completed work            │
│  • Present pending decisions           │
│  • List blockers & next steps          │
│  • Update Memory Vault                 │
└────────────────────────────────────────┘
         │
         ▼
User: Reviews report, resolves decisions
```

### Flow 2: Single Workstream Execution

```typescript
async function executeWorkstream(
  workstream: Workstream
): Promise<ExecutionOutput> {

  // 1. Load spec and context
  const spec = await loadSpec(workstream.spec);
  const context = await gatherContext(workstream);

  // 2. Check dependencies
  const deps = await checkDependencies(workstream);
  if (deps.blockers.length > 0) {
    return { status: 'blocked', blockers: deps.blockers };
  }

  // 3. Create execution plan
  const plan = await createExecutionPlan(spec, context);

  // 4. Execute tasks
  const results: TaskOutput[] = [];
  const decisions: PendingDecision[] = [];

  for (const task of plan.tasks) {
    // Check autonomy
    if (task.autonomyLevel === 'needs_approval') {
      decisions.push(createDecision(task, workstream));
      continue; // Don't block, accumulate
    }

    // Execute autonomously
    try {
      const output = await executeTask(task, context);
      results.push(output);
      await checkpoint(workstream, task, output);
    } catch (error) {
      decisions.push(createErrorDecision(task, error));
    }
  }

  // 5. Return accumulated results
  return {
    summary: generateSummary(results),
    artifacts: extractArtifacts(results),
    decisions,
    warnings: extractWarnings(results),
    errors: extractErrors(results)
  };
}
```

### Flow 3: Decision Resolution

```typescript
async function presentDecisions(
  decisions: PendingDecision[]
): Promise<void> {

  // Group by priority
  const critical = decisions.filter(d => d.priority === 'critical');
  const blocking = decisions.filter(d => d.blocksProgress);
  const background = decisions.filter(d => !d.blocksProgress);

  // Present critical first
  if (critical.length > 0) {
    await presentCriticalDecisions(critical);
  }

  // Then blocking
  if (blocking.length > 0) {
    await presentBlockingDecisions(blocking);
  }

  // Background can wait
  await queueBackgroundDecisions(background);
}

// User-facing presentation
function formatDecisionReport(decisions: PendingDecision[]): string {
  return `
## Decisions Needed

I completed 3 of 4 workstreams. Here's what I need from you:

### Critical (Blocking Progress)

**1. Embedding Strategy (VS Code Extension)**
The spec mentions vector embeddings but doesn't specify the model.
- Option A: Use OpenAI ada-002 (current standard)
- Option B: Use local model (privacy-first)
- **Recommendation**: Option A for v1, migrate later

**2. API Rate Limiting (Deep Research)**
Multiple models in parallel could hit rate limits.
- Option A: Sequential fallback (slower, safer)
- Option B: User-configurable parallelism
- **Recommendation**: Option A with escalation path

### Background (Can Proceed Without)

**3. Test Coverage Threshold**
Current: 85%. Spec says "comprehensive."
- Proceeding with 85% unless you want higher

Reply with decisions or say "proceed with recommendations."
  `;
}
```

---

## Autonomy Framework

### Constitutional Integration

The Execution Orchestrator respects the Constitutional Framework's autonomy definitions:

```typescript
const AUTONOMY_RULES: AutonomyRule[] = [
  // Always autonomous
  {
    action: 'create_file',
    autonomy: 'full',
    condition: 'Within workstream scope'
  },
  {
    action: 'run_tests',
    autonomy: 'full',
    condition: 'Always'
  },
  {
    action: 'commit_code',
    autonomy: 'full',
    condition: 'Tests passing, within scope'
  },

  // Needs approval
  {
    action: 'delete_file',
    autonomy: 'needs_approval',
    condition: 'Always'
  },
  {
    action: 'modify_spec',
    autonomy: 'needs_approval',
    condition: 'Always'
  },
  {
    action: 'change_architecture',
    autonomy: 'needs_approval',
    condition: 'Always'
  },

  // Context-dependent
  {
    action: 'add_dependency',
    autonomy: 'supervised',
    condition: 'Log and proceed, user can override'
  },
  {
    action: 'refactor_code',
    autonomy: 'supervised',
    condition: 'If tests exist and pass after'
  }
];
```

### Trust Progression

Autonomy can increase based on workstream history:

```typescript
interface TrustLevel {
  workstreamId: string;
  level: 'new' | 'established' | 'trusted';

  // Metrics that increase trust
  successfulTasks: number;
  decisionAccuracy: number; // How often OSQR's recommendations were accepted
  errorRate: number;

  // What trust unlocks
  additionalAutonomy: ActionType[];
}

function calculateTrustLevel(workstream: Workstream): TrustLevel {
  const history = getWorkstreamHistory(workstream);

  if (history.successfulTasks >= 20 && history.decisionAccuracy >= 0.8) {
    return {
      level: 'trusted',
      additionalAutonomy: ['refactor_code', 'add_dependency', 'update_tests']
    };
  }

  if (history.successfulTasks >= 5) {
    return {
      level: 'established',
      additionalAutonomy: ['refactor_code']
    };
  }

  return { level: 'new', additionalAutonomy: [] };
}
```

---

## VS Code Integration

### Primary Execution Interface

For code-related workstreams, VS Code Claude is the primary executor:

```typescript
interface VSCodeExecutionConfig {
  // Session management
  reuseSession: boolean;
  sessionTimeout: number;

  // Workspace
  workspacePath: string;
  relevantPaths: string[];

  // Handoff protocol
  handoff: {
    contextDocument: string; // claude.md or similar
    specPath: string;
    priorDecisions: DecisionResolution[];
    checkpointData: any;
  };

  // Reporting
  reportingInterval: number; // minutes
  checkpointFrequency: number; // tasks
}

async function executeInVSCode(
  workstream: Workstream,
  config: VSCodeExecutionConfig
): Promise<ExecutionOutput> {

  // 1. Prepare handoff document
  const handoff = await prepareHandoff(workstream, config);

  // 2. Queue for VS Code execution
  await queueVSCodeExecution({
    handoff,
    config,
    callbacks: {
      onProgress: (progress) => updateWorkstreamProgress(workstream, progress),
      onDecision: (decision) => accumulateDecision(workstream, decision),
      onComplete: (output) => completeWorkstream(workstream, output),
      onError: (error) => handleExecutionError(workstream, error)
    }
  });

  // 3. Return control to orchestrator
  return { status: 'queued', estimatedCompletion: estimateCompletion(workstream) };
}
```

### Multi-Session Coordination

When multiple VS Code sessions are needed:

```typescript
interface SessionCoordinator {
  // Active sessions
  sessions: Map<string, VSCodeSession>;

  // Shared state
  sharedState: {
    codebaseVersion: string;
    pendingMerges: Merge[];
    conflictResolution: ConflictStrategy;
  };

  // Coordination rules
  rules: {
    maxConcurrentSessions: number;
    sameDirectoryPolicy: 'queue' | 'branch' | 'lock';
    mergeStrategy: 'auto' | 'manual' | 'conflict_prompt';
  };
}

// Prevent conflicts when sessions touch same files
async function coordinateSessions(
  sessions: VSCodeSession[]
): Promise<void> {

  // Identify overlapping paths
  const overlaps = findPathOverlaps(sessions);

  if (overlaps.length === 0) {
    // Safe to run parallel
    await Promise.all(sessions.map(s => s.execute()));
    return;
  }

  // Handle overlaps
  for (const overlap of overlaps) {
    if (overlap.type === 'read_only') {
      // Safe to proceed
      continue;
    }

    if (overlap.type === 'write_conflict') {
      // Need coordination
      await createDecision({
        type: 'conflict',
        question: `Two workstreams want to modify ${overlap.path}`,
        options: [
          { label: 'Sequence', description: 'Run one after the other' },
          { label: 'Branch', description: 'Work on separate branches, merge later' },
          { label: 'Cancel one', description: 'Pick which workstream proceeds' }
        ]
      });
    }
  }
}
```

---

## User Interface

### Orchestrator Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  OSQR Execution Orchestrator                              [Pause All]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Active Workstreams                                                  │
│  ──────────────────                                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 🟢 VS Code Extension          ████████████░░░░ 73%          │    │
│  │    Phase: Implementation      Est: 2 hours remaining        │    │
│  │    Executor: VS Code Claude   Last activity: 2 min ago      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 🟡 Deep Research System       ████░░░░░░░░░░░░ 25%          │    │
│  │    Phase: Spec Review         ⚠️ 1 decision pending         │    │
│  │    Executor: Queued           Blocked by: Embedding decision │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ⚪ Enterprise Features        ░░░░░░░░░░░░░░░░ 0%           │    │
│  │    Phase: Not started         Waiting for: VS Code Extension │    │
│  │    Executor: Not assigned     Dependencies: 1 remaining      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Pending Decisions (2)                              [Resolve All →]  │
│  ─────────────────────                                               │
│  • Embedding model selection (Critical, blocking)                    │
│  • Test coverage threshold (Background, can proceed)                 │
│                                                                      │
│  Recent Completions                                                  │
│  ──────────────────                                                  │
│  ✓ Auto-Organization Spec    Completed 1 hour ago    [View Report]  │
│  ✓ Secretary Checklist       Completed 2 hours ago   [View Report]  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Quick Commands

```typescript
const ORCHESTRATOR_COMMANDS = [
  {
    trigger: 'go build it',
    action: 'execute_all_ready',
    description: 'Start all implementation-ready workstreams'
  },
  {
    trigger: 'what needs me',
    action: 'show_pending_decisions',
    description: 'List all decisions awaiting user input'
  },
  {
    trigger: 'status',
    action: 'show_dashboard',
    description: 'Show orchestrator dashboard'
  },
  {
    trigger: 'pause [workstream]',
    action: 'pause_workstream',
    description: 'Pause specific workstream'
  },
  {
    trigger: 'prioritize [workstream]',
    action: 'boost_priority',
    description: 'Move workstream to front of queue'
  },
  {
    trigger: 'proceed with recommendations',
    action: 'auto_resolve_decisions',
    description: 'Accept all OSQR recommendations for pending decisions'
  }
];
```

---

## Implementation Phases

### Phase 1: Workstream Registry (V3.0 Alpha)

- [ ] Define workstream schema
- [ ] Build spec parser (extract phases, tasks, dependencies)
- [ ] Implement workstream CRUD operations
- [ ] Store in Memory Vault
- [ ] Basic dependency graph
- [ ] Manual workstream creation UI

### Phase 2: Decision Accumulator (V3.0 Alpha)

- [ ] Decision schema and types
- [ ] Accumulation logic (don't block, collect)
- [ ] Priority classification
- [ ] User presentation interface
- [ ] Resolution tracking
- [ ] Auto-resolve with timeout

### Phase 3: Execution Queue (V3.0 Beta)

- [ ] Queue management
- [ ] Executor assignment
- [ ] Progress tracking
- [ ] Checkpoint/resume
- [ ] Parallel execution coordination
- [ ] Session management

### Phase 4: VS Code Integration (V3.0 Beta)

- [ ] Handoff protocol to VS Code Claude
- [ ] Multi-session coordination
- [ ] Conflict detection
- [ ] Progress reporting from VS Code
- [ ] Artifact collection

### Phase 5: Full Orchestration (V3.0 Release)

- [ ] "Go build it" command
- [ ] Automatic spec discovery
- [ ] Dependency resolution
- [ ] Completion reporting
- [ ] Dashboard UI
- [ ] Quick commands

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Manual orchestration reduction | 80% less | User time spent switching contexts |
| Parallel utilization | 3+ workstreams | Average concurrent executions |
| Decision accumulation rate | 90% | Decisions collected vs. blocking |
| Auto-resolution accuracy | 85% | Recommendations accepted by user |
| Completion report usefulness | >90% | User satisfaction rating |
| Mean time to completion | 50% reduction | Compare to manual orchestration |

---

## Constitutional Constraints

These rules are inviolable:

| Constraint | Description |
|------------|-------------|
| **User approval for scope changes** | Never modify spec scope without user decision |
| **Transparent execution** | User can always see what OSQR is doing |
| **Pausable** | User can pause any workstream at any time |
| **Decision audit trail** | All autonomous decisions are logged and reviewable |
| **No silent failures** | Errors are surfaced, never hidden |
| **Respect privacy tiers** | Cross-workstream data respects Memory Vault privacy |

---

## Relationship to Other Components

### Secretary Checklist (Evolved)

The Secretary Checklist evolves from "proactive monitoring" to "proactive execution":

| Secretary Checklist | Execution Orchestrator |
|---------------------|------------------------|
| Notices stale threads | Creates workstream to resolve |
| Detects contradictions | Queues decision for resolution |
| Tracks commitments | Schedules execution of commitments |
| Surfaces deadlines | Prioritizes deadline-dependent workstreams |

### Memory Vault (State Store)

```typescript
// Workstream state stored in Memory Vault
await memoryVault.workstreams.store({
  id: workstream.id,
  state: workstream,
  embedding: await embedWorkstreamDescription(workstream),
  category: 'orchestration',
  metadata: {
    specPath: workstream.spec.path,
    dependencies: workstream.dependencies.map(d => d.workstreamId),
    lastActivity: new Date()
  }
});
```

### Document Indexing (Spec Awareness)

```typescript
// DIS provides spec awareness
const specs = await documentIndexer.retrieve(
  'implementation-ready specifications',
  {
    filter: {
      category: 'specification',
      'metadata.status': 'ready_for_implementation'
    }
  }
);
```

---

## Interface Handoff Protocol

### Core Principle

**Web/Mobile OSQR architects. VS Code OSQR builds.**

Each interface does what it's best at. Context window is preserved for strategic thinking in conversational interfaces, while implementation happens where it belongs.

### Interface Roles

| Interface | Role | Produces | Never Produces |
|-----------|------|----------|----------------|
| **Web OSQR** | Architect, Planner | Specs, directions, decisions | Code blocks >20 lines |
| **Mobile OSQR** | Capture, Quick Decisions | Thoughts, quick answers, routing | Implementation details |
| **VS Code OSQR** | Builder, Implementer | Code, files, commits, tests | Strategic planning docs |

### Handoff Format

When Web OSQR creates work for VS Code OSQR:

```markdown
## Task: [Name]

**Spec**: /docs/features/[spec-name].md
**Section**: [Specific section if applicable]

**Direction**:
[2-5 sentences describing what to build, not how]

**Decisions Made**:
- [Key decision 1]: [Choice made] - [Why]
- [Key decision 2]: [Choice made] - [Why]

**Constraints**:
- [Any specific requirements]

**Not In Scope**:
- [What to explicitly skip]
```

### What Travels vs. What's Retrieved

| Data | Travels in Handoff | Retrieved from Memory Vault |
|------|-------------------|----------------------------|
| Task description | ✓ | |
| Spec reference (path) | ✓ | |
| Key decisions | ✓ | |
| Full spec content | | ✓ |
| Related documents | | ✓ |
| Prior conversation context | | ✓ |
| Code patterns from codebase | | ✓ (via VS Code) |

### Why This Matters

1. **Context efficiency** - Web conversations stay strategic, not cluttered with implementation
2. **No copy/paste** - Specs are the contract, not chat messages
3. **Parallel capability** - Multiple VS Code sessions can work from same specs
4. **Audit trail** - Decisions documented in specs, not lost in chat
5. **Replayability** - Any VS Code session can pick up from spec + Memory Vault

### Anti-Pattern: Code in Chat

```
❌ Web OSQR: "Here's the TypeScript interface:
   interface Workstream {
     id: string;
     name: string;
     // ... 50 more lines
   }"

✓ Web OSQR: "The Workstream interface is defined in
   /docs/features/execution-orchestrator.md#data-structures.
   Key additions needed: add 'estimatedTokens' field for
   cost tracking per workstream."
```

### Implementation Note

This protocol is enforced by OSQR's character/behavioral rules, not by code. When operating in web/mobile interface, OSQR should naturally produce directions rather than implementations. This becomes part of the Character Guide behavioral rules for interface-aware responses.

---

## Open Questions

1. **Session limits**: How many parallel VS Code sessions can realistically run?
2. **Cost tracking**: Should orchestrator track token usage across workstreams?
3. **Rollback**: How to handle partial execution failures?
4. **Priority conflicts**: When user priorities conflict with dependencies?
5. **External dependencies**: How to handle waiting on external APIs, services?

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial specification |

---

**End of Specification**

*Document Version: 1.0*
*Status: Ready for Implementation*
*Target: OSQR V3.0 (VS Code OSQR Integration)*
