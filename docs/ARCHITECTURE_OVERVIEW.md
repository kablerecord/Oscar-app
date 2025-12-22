# OSQR Architecture Overview

**Version:** 1.0
**Updated:** 2025-12-20
**Status:** Production Ready

---

## Executive Summary

OSQR (Oscar's Quantified Reasoning) is an AI operating system built on a modular, layered architecture. The system integrates multiple AI models, manages user context across sessions, and enforces constitutional constraints on all interactions.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ OSCARBubble │  │ RefineChat  │  │ FileUploader│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ /api/oscar/ │  │ /api/vault/ │  │ /api/budget/│             │
│  │    ask      │  │   upload    │  │   status    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OSQR Core Layer                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    lib/osqr/                                ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      ││
│  │  │Constitutional│  │    Router    │  │   Throttle   │      ││
│  │  │   Wrapper    │  │   Wrapper    │  │   Wrapper    │      ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘      ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      ││
│  │  │   Memory     │  │   Document   │  │   Council    │      ││
│  │  │   Wrapper    │  │   Indexing   │  │   Wrapper    │      ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘      ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      ││
│  │  │   Temporal   │  │   Bubble     │  │   Guidance   │      ││
│  │  │   Wrapper    │  │   Wrapper    │  │   Wrapper    │      ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     @osqr/core Library                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │Constitutional│  │   Router    │  │ MemoryVault │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │   Council   │  │  Guidance   │  │  Temporal   │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │   Bubble    │  │ DocIndexing │  │  Throttle   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │    PostgreSQL (Prisma)   │  │    AI Provider APIs     │      │
│  │  - Users, Workspaces     │  │  - Anthropic (Claude)   │      │
│  │  - Documents, Chunks     │  │  - OpenAI (GPT-4)       │      │
│  │  - Messages, Threads     │  │  - Google (Gemini)      │      │
│  │  - Daily Budgets         │  │                         │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Subsystems

### 1. Constitutional Framework (I-1)

**Purpose:** Ensure all AI interactions comply with OSQR's ethical guidelines.

**Location:** `lib/osqr/constitutional-wrapper.ts`

**Key Functions:**
- `checkInput(input, userId)` - Validate user input before processing
- `checkOutput(output, originalInput, userId)` - Validate AI responses
- `getDeclineMessage(violationType)` - Get graceful decline messages

**Flow:**
```
User Input → Quick Screen → Full Validation → Process or Block
AI Output → Quick Screen → Full Validation → Return or Sanitize
```

### 2. Smart Router (I-2)

**Purpose:** Classify queries and route to appropriate AI models.

**Location:** `lib/osqr/router-wrapper.ts`

**Key Functions:**
- `quickRoute(input)` - Fast heuristic-based classification
- `fullRoute(input, options)` - LLM-based classification
- `getModel(input)` - Get recommended model for query
- `shouldUseFastPath(input)` - Determine if fast path is appropriate

**Complexity Tiers:**
| Tier | Model | Use Case |
|------|-------|----------|
| ROUTING | Llama 3.1 8B | Simple routing decisions |
| SIMPLE | Llama 3.3 70B | Basic queries |
| COMPLEX | Claude Sonnet 4 | Complex reasoning |
| STRATEGIC | Claude Opus 4 | Multi-step planning |

### 3. Memory Vault (I-3)

**Purpose:** Store and retrieve user context across sessions.

**Location:** `lib/osqr/memory-wrapper.ts`

**Key Functions:**
- `getContextForQuery(query, workspaceId)` - Get relevant memories
- `storeMessage(conversationId, role, content)` - Store messages
- `queryCrossProject(workspaceId, query)` - Search across projects
- `formatMemoriesForPrompt(memories)` - Format for AI context

**Memory Types:**
- Episodic: Recent conversation summaries
- Semantic: Extracted facts and preferences
- Cross-Project: Knowledge spanning multiple projects

### 4. Document Indexing (I-8)

**Purpose:** Index and retrieve user documents semantically.

**Location:** `lib/osqr/document-indexing-wrapper.ts`

**Key Functions:**
- `indexDocument(userId, document)` - Index new document
- `searchByConcept(userId, query)` - Semantic search
- `searchAcrossProjects(userId, query, projectIds)` - Cross-project search
- `getIndexingStats(userId)` - Get indexing statistics

**Supported Formats:**
- Markdown (.md)
- Plain text (.txt)
- Code (.ts, .js, .py, etc.)
- JSON/YAML
- PDF, DOCX

### 5. Throttle Architecture (I-10)

**Purpose:** Manage query budgets and enforce tier limits.

**Location:** `lib/osqr/throttle-wrapper.ts`

**Key Functions:**
- `canQuery(userId, tier)` - Check if user can make query
- `processQuery(userId, tier, request)` - Process with budget tracking
- `getThrottleStatus(userId, tier)` - Get budget status
- `getFeatureAccess(tier)` - Check feature availability

**Tier Limits:**
| Tier | Queries/Day | Modes | Features |
|------|-------------|-------|----------|
| Lite | 50 | Quick | Basic |
| Pro | 100 | Quick, Thoughtful | Voice, Custom Persona |
| Master | 200 | All | All + Priority |
| Enterprise | Custom | All | All + Support |

### 6. Council Mode (I-4)

**Purpose:** Multi-model deliberation for complex queries.

**Location:** `lib/osqr/council-wrapper.ts`

**Key Functions:**
- `shouldTriggerCouncil(query, context)` - Check if council needed
- `runDeliberation(query, options)` - Execute council session
- `synthesizeResponses(query, responses)` - Merge model outputs

**Process:**
```
Query → Trigger Check → Parallel Model Calls → Synthesis → Response
```

### 7. Temporal Intelligence (I-6)

**Purpose:** Track commitments and time-sensitive context.

**Location:** `lib/osqr/temporal-wrapper.ts`

**Key Functions:**
- `extractCommitments(message, source)` - Find temporal commitments
- `generateMorningDigest(userId, commitments)` - Create daily digest
- `calculatePriority(commitment)` - Score commitment urgency

### 8. Bubble Interface (I-7)

**Purpose:** Manage proactive UI suggestions.

**Location:** `lib/osqr/bubble-wrapper.ts`

**Key Functions:**
- `getBubbleState(userId)` - Get current bubble state
- `canShowBubble(userId)` - Check if bubble can appear
- `setFocusMode(userId, mode)` - Set user focus mode

**Focus Modes:**
- `available` - Show all bubbles
- `focused` - Reduce interruptions
- `dnd` - Do not disturb

### 9. Project Guidance (I-5)

**Purpose:** Manage project-specific context and rules.

**Location:** `lib/osqr/guidance-wrapper.ts`

**Key Functions:**
- `getProjectGuidance(projectId)` - Get guidance for project
- `formatGuidanceForPrompt(items)` - Format for AI context
- `checkLimits(projectId)` - Check guidance storage limits

---

## Data Flow: Complete Query Lifecycle

```
1. User submits query via OSCARBubble component

2. API Route (/api/oscar/ask):
   a. Constitutional.checkInput() - Validate input
   b. Throttle.canQuery() - Check budget
   c. Router.fullRoute() - Classify and select model
   d. Memory.getContextForQuery() - Retrieve context
   e. DocumentIndexing.searchByConcept() - Get relevant docs

3. AI Processing:
   a. Build prompt with context
   b. Call selected AI model
   c. Stream response to client

4. Post-Processing:
   a. Constitutional.checkOutput() - Validate response
   b. Memory.storeMessage() - Save to memory
   c. Throttle.recordQuery() - Update budget

5. Response delivered to user
```

---

## Configuration

### Feature Flags

All features can be toggled via `lib/osqr/config.ts`:

```typescript
export const featureFlags = {
  enableConstitutionalValidation: true,
  enableRouterMRP: true,
  enableMemoryVault: true,
  enableCouncilMode: true,
  enableDocumentIndexing: true,
  enableThrottle: true,
  enableTemporalIntelligence: true,
  enableBubbleInterface: true,
  enableGuidance: true,
}
```

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `ANTHROPIC_API_KEY` - For Claude models
- `OPENAI_API_KEY` - For GPT models

---

## Error Handling Philosophy

All OSQR subsystems follow "fail-open" error handling:

1. **Log the error** with component prefix (e.g., `[Constitutional]`)
2. **Return safe default** - Allow operations to continue
3. **Never throw** to prevent cascade failures
4. **Preserve user experience** over strict enforcement

Example pattern:
```typescript
try {
  return await someOperation()
} catch (error) {
  console.error('[Component] Operation error:', error)
  return safeDefaultValue
}
```

---

## Security Model

### Data Isolation
- All queries scoped by `workspaceId`
- Cross-project queries explicitly requested
- No automatic data sharing between workspaces

### Constitutional Enforcement
- Sacred clauses cannot be overridden
- All AI outputs validated before delivery
- Prompt injection attempts detected and blocked

### Budget Protection
- Per-user daily limits enforced
- Overage purchases tracked separately
- Graceful degradation when limits approached

---

## Performance Targets

| Metric | Target | Location |
|--------|--------|----------|
| Memory retrieval | <500ms | Memory Vault |
| Constitutional check | <50ms | Constitutional |
| Router decision | <100ms | Router |
| Document indexing | <5s async | Document Indexing |
| Bubble render | <100ms | Bubble Interface |

---

## Related Documentation

- [API Reference](./API_REFERENCE.md) - Endpoint documentation
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
- [Local Setup](./LOCAL_SETUP.md) - Development setup
- [Spec Compliance Report](./SPEC_COMPLIANCE_REPORT.md) - Spec alignment
