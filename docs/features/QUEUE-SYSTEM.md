# OSQR Queue System Specification

**Status:** Vision/Planning (V2.0 Feature)
**Created:** 2025-12-15
**Prerequisites:** VS Code Dev Companion v1.0 stable

---

## Overview

The Queue System bridges OSQR web conversations with VS Code implementation. When discussing technical decisions in OSQR, users can queue items for later implementation when they open their IDE.

---

## Core Concept

**The Problem:** Users often discuss technical decisions, architecture choices, and implementation plans in OSQR web conversations. But when they switch to VS Code to actually build, that context is lost or requires manual copy-pasting.

**The Solution:** A decision queue that captures "things to do" from conversations and surfaces them in VS Code when the user is ready to implement.

---

## User Flow

### 1. Web Conversation (OSQR App)

During a conversation about code or architecture:

```
User: "I think we should refactor the auth system to use JWT instead of sessions"

OSQR: "That's a solid choice for your API-first architecture. Here's how I'd approach it:
1. Create a JWT utility module
2. Update the auth middleware
3. Migrate existing sessions
4. Update the login/logout endpoints

Would you like me to queue this for implementation?"

User: "Yes, queue it"

OSQR: "Queued: Auth system JWT refactor (4 tasks). I'll surface this when you open the project in VS Code."
```

### 2. VS Code Dev Companion

When user opens VS Code with the OSQR extension:

```
┌─────────────────────────────────────┐
│ OSQR Dev Panel                      │
├─────────────────────────────────────┤
│ 📋 QUEUED FROM WEB (3)              │
│                                     │
│ ▸ Auth system JWT refactor          │
│   4 tasks · Queued 2h ago           │
│   [Start] [View Details] [Dismiss]  │
│                                     │
│ ▸ Add rate limiting to API          │
│   2 tasks · Queued yesterday        │
│   [Start] [View Details] [Dismiss]  │
│                                     │
│ ▸ Fix mobile nav z-index            │
│   1 task · Queued 3d ago            │
│   [Start] [View Details] [Dismiss]  │
└─────────────────────────────────────┘
```

### 3. Starting a Queued Task

When user clicks "Start":

1. OSQR loads the full conversation context
2. Creates/switches to a feature branch
3. Opens relevant files
4. Shows the implementation plan in the sidebar
5. Begins Refine → Fire workflow with full context

---

## Data Model

### QueueItem

```typescript
interface QueueItem {
  id: string
  workspaceId: string
  projectId?: string  // Links to .osqr-project.json

  // Source
  sourceConversationId: string
  sourceMessageId: string

  // Content
  title: string
  description: string
  tasks: QueueTask[]
  context: string  // Relevant conversation excerpt

  // Metadata
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedEffort?: 'small' | 'medium' | 'large'
  tags: string[]

  // State
  status: 'queued' | 'in_progress' | 'completed' | 'dismissed'
  queuedAt: Date
  startedAt?: Date
  completedAt?: Date

  // VS Code specific
  targetBranch?: string
  targetFiles?: string[]
}

interface QueueTask {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  order: number
}
```

---

## API Endpoints

### Web App APIs

```typescript
// Queue an item from conversation
POST /api/queue
{
  conversationId: string
  messageId: string
  title: string
  description: string
  tasks: { title: string, description?: string }[]
  projectId?: string
  priority?: string
  tags?: string[]
}

// List queued items
GET /api/queue?status=queued&projectId=xxx

// Get queue item details
GET /api/queue/:id

// Update queue item
PATCH /api/queue/:id
{
  status?: string
  priority?: string
  tasks?: QueueTask[]
}

// Dismiss queue item
DELETE /api/queue/:id
```

### VS Code Extension APIs

```typescript
// Get items for current project
GET /api/vscode/queue?projectId=xxx

// Start working on item
POST /api/vscode/queue/:id/start
{
  branchName?: string
}

// Update task progress
PATCH /api/vscode/queue/:id/tasks/:taskId
{
  status: string
}

// Complete queue item
POST /api/vscode/queue/:id/complete
{
  commitSha?: string
  summary?: string
}
```

---

## VS Code Integration

### Panel UI

The Queue section appears at the top of the OSQR Dev Panel:

```
┌─────────────────────────────────────┐
│ 📋 QUEUED FROM WEB                  │
│ ─────────────────────────────────── │
│                                     │
│ [Refresh] [Filter: All ▾]           │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔴 Auth system JWT refactor     │ │
│ │ High priority · 4 tasks         │ │
│ │ "Refactor auth from sessions    │ │
│ │ to JWT for API-first arch..."   │ │
│ │                                 │ │
│ │ [▶ Start] [👁 Details] [✕]      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 Add rate limiting            │ │
│ │ Medium priority · 2 tasks       │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Start Workflow

When user clicks "Start":

1. **Branch Creation**
   ```
   Creating branch: feature/auth-jwt-refactor
   ✓ Branch created and checked out
   ```

2. **Context Loading**
   ```
   Loading conversation context...
   ✓ Found 12 relevant messages
   ✓ Loaded 3 related PKV entries
   ```

3. **File Discovery**
   ```
   Analyzing codebase for relevant files...
   ✓ Found 8 files related to auth
   Opening: src/lib/auth/middleware.ts
   ```

4. **Task Panel**
   ```
   ┌─────────────────────────────────┐
   │ 🔨 IN PROGRESS                  │
   │ Auth system JWT refactor        │
   │ ───────────────────────────────│
   │ □ Create JWT utility module     │
   │ □ Update auth middleware        │
   │ □ Migrate existing sessions     │
   │ □ Update login/logout endpoints │
   │                                 │
   │ [Ask OSQR] [Mark Complete]      │
   └─────────────────────────────────┘
   ```

---

## Conversation Integration

### Queuing from Chat

OSQR can suggest queuing when it detects:
- Implementation plans with multiple steps
- Architecture decisions that need code changes
- Bug fixes or refactoring discussions
- Feature requests with clear scope

**Detection Triggers:**
- "Here's how I'd implement..."
- "The steps would be..."
- "You'll need to update..."
- Numbered lists of code changes
- File paths mentioned in context

### Queue Suggestion UI (Web)

```
┌─────────────────────────────────────────────┐
│ 📋 Queue for VS Code?                       │
│                                             │
│ I've identified 4 implementation tasks:     │
│                                             │
│ 1. Create JWT utility module                │
│ 2. Update auth middleware                   │
│ 3. Migrate existing sessions                │
│ 4. Update login/logout endpoints            │
│                                             │
│ [Queue All] [Edit & Queue] [Skip]           │
└─────────────────────────────────────────────┘
```

---

## Smart Features

### Auto-Project Detection

When queuing, OSQR attempts to detect which project the item belongs to:

1. Check conversation context for project mentions
2. Look for file paths that match known projects
3. Check PKV for project tags
4. Ask user if ambiguous

### Priority Inference

OSQR suggests priority based on:
- Urgency language ("ASAP", "blocking", "critical")
- Dependencies mentioned
- User's historical patterns
- Time since last work on related code

### Related Items

When starting a queued item, show related:
- Other queue items for same files
- Recent commits to affected areas
- PKV entries about the system
- MSC principles that apply

---

## Future Enhancements

### V2.1: Batch Queue
- Queue multiple related items as a "batch"
- Execute in sequence with shared context
- Rollback entire batch if needed

### V2.2: Smart Scheduling
- Suggest optimal order for queued items
- Identify dependencies between items
- Estimate time based on historical data

### V2.3: Team Queues (Enterprise)
- Shared queues for team projects
- Assignment and handoff
- Queue item comments and discussion

---

## Success Metrics

- **Adoption:** % of users who queue at least 1 item/week
- **Completion Rate:** % of queued items that get completed
- **Time to Start:** Average time from queue to "Start"
- **Context Retention:** User satisfaction with loaded context

---

## Related Documents

- [VSCODE-DEV-COMPANION.md](../vision/VSCODE-DEV-COMPANION.md) - Parent feature spec
- [AUTONOMOUS-APP-BUILDER.md](../vision/AUTONOMOUS-APP-BUILDER.md) - Future automation
- [ROADMAP.md](../../ROADMAP.md) - Phase planning

---

*This is a V2.0 feature. Prerequisites: VS Code Dev Companion v1.0 must be stable first.*
