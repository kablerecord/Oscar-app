# OSQR V1.5 Implementation Plan
## Technical Mapping from Claude in VS Code

**Status**: Ready for Implementation
**Created**: December 24, 2024
**Source**: Claude in VS Code codebase analysis

---

## Current Codebase State

| Area | Location | Status |
|------|----------|--------|
| Prisma Models | `schema.prisma` | ChatThread, ChatMessage, Project, Document, DocumentChunk, Insight - Complete base models |
| Insights System | `lib/til/` | 6 insight types, queue system, pattern detection - mostly in-memory |
| Document Indexing | `packages/core/src/document-indexing/` | Full 6-stage pipeline architecture, adapters pattern |

---

## Build Order

1. **Secretary Checklist** - Builds on existing Insights System, adds extraction
2. **Auto-Organization** - Uses embeddings, depends on project signatures
3. **Import Interview** - Most complex, uses all other systems

---

## PLAN 1: Secretary Checklist System

**Spec Document**: `OSQR_SECRETARY_CHECKLIST_ADDENDUM.md`

### Schema Changes Required

**File**: `packages/app-web/prisma/schema.prisma`

```prisma
// Extend Insight model (currently lines 398-419)
model Insight {
  // Existing fields...

  // NEW: Secretary checklist fields
  secretaryCategory   String?   // 'follow_up'|'commitment'|'deadline'|etc (12 types)
  checklistItem       String?   // Which specific check triggered this
  actionSuggestion    String?   // What Oscar suggests doing
  relatedEntityId     String?   // Reference to commitment/decision/etc
  lastCheckedAt       DateTime? // When this was last evaluated
}

// NEW: Track extracted commitments, decisions, questions
model ExtractedItem {
  id            String    @id @default(cuid())
  workspaceId   String
  threadId      String?
  messageId     String?

  itemType      String    // 'commitment'|'decision'|'question'|'deadline'|'dependency'
  content       String    // The extracted text
  status        String    @default("open") // 'open'|'resolved'|'abandoned'|'expired'

  // Context
  extractedFrom String    // Source text snippet
  confidence    Float     @default(0.8)

  // For commitments
  promisedTo    String?   // Person name if applicable
  dueDate       DateTime? // Explicit or inferred deadline

  // For decisions
  alternatives  Json?     // Other options considered
  rationale     String?

  // Tracking
  createdAt     DateTime  @default(now())
  resolvedAt    DateTime?
  lastMentioned DateTime?
  mentionCount  Int       @default(1)

  workspace     Workspace @relation(fields: [workspaceId], references: [id])

  @@index([workspaceId, itemType, status])
  @@index([workspaceId, dueDate])
}

// NEW: Track recurring patterns
model RecurringPattern {
  id            String    @id @default(cuid())
  workspaceId   String
  patternType   String    // 'weekly'|'monthly'|'project_rhythm'
  description   String
  schedule      Json      // Cron-like or day-of-week pattern
  lastOccurred  DateTime?
  nextExpected  DateTime?
  confidence    Float     @default(0.5)

  workspace     Workspace @relation(fields: [workspaceId], references: [id])

  @@index([workspaceId])
}

// Extend UserInsightPreferences (currently lines 422-440)
model UserInsightPreferences {
  // Existing fields...

  // NEW: Secretary category toggles
  showFollowUps       Boolean @default(true)
  showCommitments     Boolean @default(true)
  showDeadlines       Boolean @default(true)
  showRecurringPatterns Boolean @default(true)
  showStaleDecisions  Boolean @default(true)
  showContradictions  Boolean @default(true)
  showOpenQuestions   Boolean @default(true)
  showDependencies    Boolean @default(true)
  showPeopleWaiting   Boolean @default(true)
  showContextDecay    Boolean @default(true)
  showUnfinishedWork  Boolean @default(true)
  showPatternBreaks   Boolean @default(true)

  // NEW: Sensitivity settings
  sensitivity         String  @default("balanced") // 'aggressive'|'balanced'|'relaxed'
}
```

### New Files to Create

| File | Purpose |
|------|---------|
| `lib/til/secretary/index.ts` | Main exports |
| `lib/til/secretary/types.ts` | TypeScript interfaces for 12 categories |
| `lib/til/secretary/checklist-runner.ts` | Orchestrates all 12 category checks |
| `lib/til/secretary/detectors/follow-ups.ts` | Category 1: Follow-up detection |
| `lib/til/secretary/detectors/commitments.ts` | Category 2: Commitment tracking |
| `lib/til/secretary/detectors/deadlines.ts` | Category 3: Deadline tracking |
| `lib/til/secretary/detectors/recurring-patterns.ts` | Category 4: Pattern detection |
| `lib/til/secretary/detectors/stale-decisions.ts` | Category 5: Decision staleness |
| `lib/til/secretary/detectors/contradictions.ts` | Category 6: Contradiction detection |
| `lib/til/secretary/detectors/open-questions.ts` | Category 7: Unanswered questions |
| `lib/til/secretary/detectors/dependencies.ts` | Category 8: Blocking dependencies |
| `lib/til/secretary/detectors/people-waiting.ts` | Category 9: People owed responses |
| `lib/til/secretary/detectors/context-decay.ts` | Category 10: Stale information |
| `lib/til/secretary/detectors/unfinished-work.ts` | Category 11: Incomplete docs |
| `lib/til/secretary/detectors/pattern-breaks.ts` | Category 12: Behavioral anomalies |
| `lib/til/secretary/extractor.ts` | Extract commitments/decisions/questions from messages |
| `lib/til/secretary/scheduler.ts` | Schedule checks at appropriate intervals |

### Extraction Patterns

```typescript
// Patterns to detect:
const COMMITMENT_PATTERNS = [
  /I'll\s+(.+)/i,           // "I'll send the report"
  /I need to\s+(.+)/i,      // "I need to follow up"
  /I should\s+(.+)/i,       // "I should review"
  /Let me\s+(.+)/i,         // "Let me check"
  /I'm going to\s+(.+)/i,   // "I'm going to call"
];

const QUESTION_PATTERNS = [
  /Should we\s+(.+)\?/i,
  /What if\s+(.+)\?/i,
  /How do we\s+(.+)\?/i,
];
```

### Scheduling

| Job | Schedule | Categories |
|-----|----------|------------|
| secretary-daily | Daily at 6am user time | deadlines, commitments, people_waiting, pattern_breaks |
| secretary-3day | Every 3 days | follow_ups, dependencies |
| secretary-weekly | Weekly on Sundays | open_questions, stale_decisions, context_decay, unfinished_work |
| secretary-realtime | On new message | contradictions |

### API Routes to Add

| Route | Method | Purpose |
|-------|--------|---------|
| `app/api/secretary/run/route.ts` | POST | Manually trigger checklist |
| `app/api/extracted-items/route.ts` | GET | List commitments/decisions/questions |
| `app/api/extracted-items/[id]/resolve/route.ts` | POST | Mark item as resolved |

---

## PLAN 2: Auto-Organization System

**Spec Document**: `OSQR_AUTO_ORGANIZATION_SPEC.md`

### Schema Changes Required

**File**: `packages/app-web/prisma/schema.prisma`

```prisma
// Extend ChatThread (currently lines 123-138)
model ChatThread {
  // Existing fields...

  // NEW: Auto-organization fields
  createdBy         String    @default("user")  // 'user' | 'oscar'
  titleConfidence   Float     @default(1.0)     // 0-1 confidence in auto-title
  userVerified      Boolean   @default(false)   // User clicked "Looks good"

  // NEW: Multi-project linking via join table
  projectLinks      ChatProjectLink[]
}

// NEW: Join table for multi-project linking
model ChatProjectLink {
  id          String    @id @default(cuid())
  threadId    String
  projectId   String
  confidence  Float     @default(1.0)
  source      String    @default("user")  // 'auto' | 'user'
  linkedAt    DateTime  @default(now())

  thread      ChatThread @relation(fields: [threadId], references: [id])
  project     Project    @relation(fields: [projectId], references: [id])

  @@unique([threadId, projectId])
  @@index([threadId])
  @@index([projectId])
}

// Extend Project (currently lines 74-86)
model Project {
  // Existing fields...

  // NEW: Auto-organization fields
  createdBy     String    @default("user")  // 'user' | 'oscar'
  signature     Float[]                      // Embedding for matching
  userVerified  Boolean   @default(false)

  // NEW: Multi-project linking
  threadLinks   ChatProjectLink[]
}

// NEW: Organization preferences learned from corrections
model OrganizationRule {
  id          String    @id @default(cuid())
  workspaceId String
  ruleType    String    // 'naming' | 'linking' | 'segmentation'
  pattern     String    // What triggers the rule
  action      String    // What to do
  confidence  Float     @default(0.5)
  source      String    // 'inferred' | 'explicit'
  createdAt   DateTime  @default(now())
  appliedCount Int      @default(0)

  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  @@index([workspaceId])
}
```

### New Files to Create

| File | Purpose |
|------|---------|
| `lib/auto-org/index.ts` | Main exports |
| `lib/auto-org/segmentation.ts` | Chat segmentation logic (topic shift, temporal gap, intent shift detection) |
| `lib/auto-org/titling.ts` | Auto-title generation using LLM |
| `lib/auto-org/project-matching.ts` | Project signature matching using embeddings |
| `lib/auto-org/project-creation.ts` | Auto-create projects from chat clusters |
| `lib/auto-org/learning.ts` | Learn from user corrections |
| `lib/auto-org/types.ts` | TypeScript interfaces |

### Segmentation Weights

```typescript
interface SegmentationTriggers {
  topicShift: number;      // 0.4 weight - embedding similarity < 0.6
  temporalGap: number;     // 0.3 weight - 4+ hours gap
  intentShift: number;     // 0.2 weight - planning → execution
  explicit: boolean;       // 1.0 weight - user says "new topic"
}

// Threshold: combined weight >= 0.7 triggers new chat
```

### API Routes to Add

| Route | Method | Purpose |
|-------|--------|---------|
| `app/api/chat/[id]/verify/route.ts` | POST | Mark chat as user-verified |
| `app/api/chat/[id]/links/route.ts` | GET/POST/DELETE | Manage project links |
| `app/api/projects/[id]/signature/route.ts` | GET/PUT | Get/regenerate project signature |
| `app/api/auto-org/corrections/route.ts` | POST | Record user correction for learning |

---

## PLAN 3: Import Interview System

**Spec Document**: `OSQR_AI_HISTORY_INTERVIEW_SPEC.md`

### Schema Changes Required

**File**: `packages/app-web/prisma/schema.prisma`

```prisma
// NEW: Import batch tracking
model ImportBatch {
  id            String    @id @default(cuid())
  workspaceId   String
  source        String    // 'chatgpt' | 'claude' | 'custom'
  filename      String
  status        String    @default("processing") // 'processing'|'extracted'|'interviewing'|'complete'|'failed'

  // Stats
  totalConversations  Int
  processedCount      Int     @default(0)
  confidence          Float   @default(0)

  // Timestamps
  uploadedAt    DateTime  @default(now())
  extractedAt   DateTime?
  completedAt   DateTime?

  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  conversations ImportedConversation[]
  questions     InterviewQuestion[]

  @@index([workspaceId])
}

// NEW: Imported conversations
model ImportedConversation {
  id              String    @id @default(cuid())
  batchId         String
  workspaceId     String

  // Source data
  sourceId        String    // Original conversation ID from export
  originalTitle   String?
  originalTimestamp DateTime
  rawTranscript   Json      // Full message array

  // Extraction results
  summary         String?
  topics          String[]

  // State
  isRelevant      Boolean   @default(true)
  confidence      Float     @default(0.5)
  projectLinks    String[]  // Project IDs

  createdAt       DateTime  @default(now())

  batch           ImportBatch @relation(fields: [batchId], references: [id])
  workspace       Workspace   @relation(fields: [workspaceId], references: [id])
  entities        ExtractedEntity[]
  clarifications  Clarification[]

  @@unique([batchId, sourceId])
  @@index([workspaceId])
  @@index([batchId])
}

// NEW: Extracted entities (people, projects, terms)
model ExtractedEntity {
  id              String    @id @default(cuid())
  workspaceId     String
  conversationId  String?   // Can be null if entity spans multiple

  text            String    // "the main project", "Mike"
  type            String    // 'project'|'person'|'term'|'company'|'unknown'
  frequency       Int       @default(1)

  // Resolution
  resolved        Boolean   @default(false)
  resolution      String?   // User's clarification
  inferredFrom    String?   // If Oscar inferred, from what?

  createdAt       DateTime  @default(now())
  resolvedAt      DateTime?

  workspace       Workspace @relation(fields: [workspaceId], references: [id])
  conversation    ImportedConversation? @relation(fields: [conversationId], references: [id])
  questions       InterviewQuestion[]

  @@index([workspaceId, type])
  @@index([workspaceId, resolved])
}

// NEW: Interview questions
model InterviewQuestion {
  id              String    @id @default(cuid())
  batchId         String
  workspaceId     String
  entityId        String?

  question        String
  questionType    String    // 'project_identification'|'person_identification'|etc
  tier            Int       // 1, 2, or 3

  // Scoring
  inferencePower  Float     // 0-1
  priority        Int
  affectedConversationCount Int

  // State
  status          String    @default("pending") // 'pending'|'answered'|'skipped'|'inferred'
  answer          String?
  inferredAnswer  String?
  answeredAt      DateTime?

  createdAt       DateTime  @default(now())

  batch           ImportBatch @relation(fields: [batchId], references: [id])
  workspace       Workspace   @relation(fields: [workspaceId], references: [id])
  entity          ExtractedEntity? @relation(fields: [entityId], references: [id])

  @@index([batchId, status])
  @@index([workspaceId])
}

// NEW: Clarifications applied
model Clarification {
  id              String    @id @default(cuid())
  entityId        String
  conversationId  String
  question        String
  answer          String
  answeredAt      DateTime  @default(now())

  conversation    ImportedConversation @relation(fields: [conversationId], references: [id])

  @@index([conversationId])
}
```

### New Files to Create

| File | Purpose |
|------|---------|
| `lib/import/index.ts` | Main exports |
| `lib/import/types.ts` | TypeScript interfaces |
| `lib/import/parsers/chatgpt.ts` | Parse ChatGPT JSON export |
| `lib/import/parsers/claude.ts` | Parse Claude JSON export |
| `lib/import/parsers/base.ts` | Base parser interface |
| `lib/import/extraction/entity-extractor.ts` | Extract people, projects, terms |
| `lib/import/extraction/decision-extractor.ts` | Extract decisions |
| `lib/import/extraction/commitment-extractor.ts` | Extract commitments |
| `lib/import/interview/question-generator.ts` | Generate questions for gaps |
| `lib/import/interview/question-ranker.ts` | Rank by inference power |
| `lib/import/interview/interview-manager.ts` | Manage interview flow |
| `lib/import/inference/propagator.ts` | Apply answers across conversations |
| `lib/import/inference/confidence.ts` | Calculate confidence scores |
| `lib/import/inference/chainer.ts` | Inference chaining (VQ → VoiceQuote) |
| `lib/import/integration.ts` | Connect to Memory Vault, Auto-Org |

### API Routes to Add

| Route | Method | Purpose |
|-------|--------|---------|
| `app/api/import/upload/route.ts` | POST | Upload export file |
| `app/api/import/[batchId]/status/route.ts` | GET | Get import status |
| `app/api/import/[batchId]/conversations/route.ts` | GET | List imported conversations |
| `app/api/import/[batchId]/questions/route.ts` | GET | Get interview questions |
| `app/api/import/[batchId]/questions/[id]/answer/route.ts` | POST | Answer question |
| `app/api/import/[batchId]/questions/[id]/skip/route.ts` | POST | Skip question |
| `app/api/import/[batchId]/entities/route.ts` | GET | List extracted entities |

### UI Components Needed

| Component | Purpose |
|-----------|---------|
| `components/import/ImportUploader.tsx` | File upload UI |
| `components/import/ImportProgress.tsx` | Progress bar with confidence |
| `components/import/InterviewPanel.tsx` | Question/answer flow |
| `components/import/EntityList.tsx` | Show extracted entities |

---

## Dependencies Between Features

```
                    ┌─────────────────────┐
                    │  Document Indexing  │
                    │     (existing)      │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌──────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Import Interview │ │ Auto-Organize   │ │ Secretary       │
│    (Plan 3)      │ │   (Plan 2)      │ │ Checklist       │
│                  │ │                 │ │   (Plan 1)      │
└────────┬─────────┘ └────────┬────────┘ └────────┬────────┘
         │                    │                   │
         │         ┌──────────┴──────────┐        │
         │         │                     │        │
         └─────────▶   Memory Vault      ◀────────┘
                   │    (existing)       │
                   └─────────────────────┘
```

---

## Summary Table

| Spec | New Prisma Models | New Files | API Routes | Estimated Effort |
|------|-------------------|-----------|------------|------------------|
| Secretary Checklist | 2 + 5 field additions | ~16 | 3 | 2 weeks |
| Auto-Organization | 2 + 5 field additions | ~8 | 4 | 2 weeks |
| Import Interview | 5 | ~14 | 7 | 2 weeks |

---

## How To Start Implementation

### For Secretary Checklist (First)

```
Read the V1.5 documentation:
- docs/features/OSQR_V1_5_ROADMAP.md
- docs/features/OSQR_SECRETARY_CHECKLIST_ADDENDUM.md
- docs/features/OSQR_V1_5_IMPLEMENTATION_PLAN.md

Start with Secretary Checklist Phase 1:
1. Schema changes - add ExtractedItem, RecurringPattern models and Insight field additions
2. Run the migration
3. Create lib/til/secretary/types.ts with interfaces
4. Create lib/til/secretary/extractor.ts with commitment/decision/question patterns

Stop after extractor is working so we can test.
```

---

*Document Status: Ready for Implementation*
*Source: Claude in VS Code codebase analysis, December 24, 2024*
