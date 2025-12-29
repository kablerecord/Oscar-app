# Depth-Aware Intelligence Build Spec

> **Status**: ✅ COMPLETE
> **Version**: 1.0
> **Created**: 2024-12-29
> **Completed**: 2024-12-29
> **Author**: Kable + Claude

## Executive Summary

This build introduces **Depth-Aware Intelligence** - a unified system that allows OSQR to know what it knows without constantly re-computing. Two core capabilities:

1. **Vault Inventory Layer** - OSQR knows what documents exist without reading them
2. **Semantic Answer Cache** - OSQR remembers what it has answered without re-reasoning

Together, these create an OSQR that feels faster, smarter, and more respectful of user attention - while significantly reducing token costs and latency.

---

## The Problem

### Current State
- PKV retrieval is binary: search everything or search nothing
- Every question triggers full semantic search even when unnecessary
- Repeated questions re-compute from scratch
- No awareness of "what exists" without "reading it"
- High latency and token cost for simple questions

### Desired State
- OSQR maintains lightweight awareness of vault contents
- Common questions answered instantly from cache
- Deep retrieval only when explicitly needed or high-leverage
- User controls depth through consent, not toggles
- Significantly reduced latency and cost

---

## Architecture Overview

### Three Knowledge Layers

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Always-On (Milliseconds)                          │
│ - Global Knowledge Index (GKVI)                            │
│ - OSQR identity & frameworks                               │
│ - User profile summary                                     │
│ - Vault Inventory (titles, tags, summaries)                │
│ - Global Answer Cache (OSQR-wide FAQ)                      │
│ - User Answer Cache (this user's prior Q&A)                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ (Escalation Signal Detected)
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: Awareness Scan (Fast)                             │
│ - Topic overlap scoring                                    │
│ - Document relevance detection                             │
│ - "You have 4 documents on this topic"                     │
│ - Offer to go deeper                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ (User Consents or Mode Requires)
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: Deep Retrieval (Expensive)                        │
│ - Full PKV semantic search                                 │
│ - Chunk retrieval and synthesis                            │
│ - Sub-agent isolated execution                             │
│ - Compressed insight returned to main thread               │
└─────────────────────────────────────────────────────────────┘
```

### Mode Alignment

| Mode | Layer 1 | Layer 2 | Layer 3 |
|------|---------|---------|---------|
| Quick | ✅ Always | ❌ Skip | ❌ Skip |
| Thoughtful | ✅ Always | ✅ Check | 🟡 On consent |
| Contemplate | ✅ Always | ✅ Check | ✅ Encouraged |
| Council | ✅ Always | ✅ Check | ✅ Required |

---

## Data Model

### 1. Document Inventory (Vault Awareness)

```prisma
model DocumentInventory {
  id              String   @id @default(cuid())
  userId          String
  documentId      String   @unique

  // Lightweight metadata (always loaded)
  title           String
  fileName        String
  fileType        String
  uploadedAt      DateTime
  updatedAt       DateTime @updatedAt

  // Auto-generated summaries
  autoSummary     String   @db.Text  // 2-3 sentence summary
  topicTags       String[] // Auto-extracted topics

  // Clustering for fast relevance
  topicClusterId  String?
  clusterCentroid Float[]  // Embedding of document's "center"

  // Relationships
  user            User     @relation(fields: [userId], references: [id])
  document        Document @relation(fields: [documentId], references: [id])

  @@index([userId])
  @@index([topicClusterId])
}

model TopicCluster {
  id          String   @id @default(cuid())
  userId      String
  name        String   // Auto-generated cluster name
  centroid    Float[]  // Average embedding of cluster
  documentIds String[]

  @@index([userId])
}
```

### 2. Semantic Answer Cache

```prisma
model AnswerCache {
  id              String   @id @default(cuid())

  // Scope
  scope           AnswerCacheScope  // GLOBAL, USER
  userId          String?  // null for GLOBAL

  // The cached Q&A
  questionHash    String   // SHA-256 of normalized question (exact match)
  questionText    String   @db.Text
  questionEmbedding Float[] // For similar match
  answerText      String   @db.Text

  // Confidence & validity
  confidenceScore Float    @default(1.0)  // Decays over time
  createdAt       DateTime @default(now())
  lastUsedAt      DateTime @default(now())
  lastValidatedAt DateTime @default(now())
  expiresAt       DateTime?

  // Invalidation tracking
  isValid         Boolean  @default(true)
  invalidatedAt   DateTime?
  invalidationReason String?

  // Source traceability
  sourceDocumentIds String[]  // Which docs informed this answer
  sourceConversationId String?

  // Usage analytics
  hitCount        Int      @default(0)
  acceptanceRate  Float?   // Did users accept or ask follow-up?

  @@unique([scope, questionHash])
  @@index([userId])
  @@index([scope])
  @@index([isValid])
}

enum AnswerCacheScope {
  GLOBAL  // OSQR-wide answers (modes, pricing, features)
  USER    // This user's previously answered questions
}
```

### 3. Cache Invalidation Events

```prisma
model CacheInvalidationEvent {
  id            String   @id @default(cuid())
  cacheEntryId  String

  triggerType   InvalidationTrigger
  triggerSource String?  // documentId, userId, etc.
  reason        String

  createdAt     DateTime @default(now())

  @@index([cacheEntryId])
}

enum InvalidationTrigger {
  TIME_DECAY          // Answer too old
  DOCUMENT_CHANGE     // Source document updated
  DOCUMENT_ADDED      // New doc on same topic
  USER_CORRECTION     // User said "that's wrong"
  SEMANTIC_CONFLICT   // New info contradicts cached answer
  MANUAL              // Admin invalidation
}
```

---

## Core Services

### 1. Vault Inventory Service

**Location**: `lib/pkv/inventory.ts`

```typescript
interface VaultInventoryService {
  // Called on document upload
  indexDocument(documentId: string): Promise<DocumentInventory>

  // Fast inventory retrieval (Layer 1)
  getUserInventory(userId: string): Promise<DocumentInventory[]>

  // Topic relevance check (Layer 2)
  findRelevantDocuments(
    userId: string,
    queryEmbedding: number[],
    threshold?: number
  ): Promise<{
    documents: DocumentInventory[]
    relevanceScores: Map<string, number>
    shouldEscalate: boolean
  }>

  // Cluster management
  rebuildClusters(userId: string): Promise<void>
}
```

**Document Indexing Flow**:
1. User uploads document → existing PKV chunking
2. After chunking complete, trigger inventory indexing
3. Generate auto-summary using Haiku (cheap, fast)
4. Extract topic tags from summary
5. Compute document centroid (average of chunk embeddings)
6. Assign to topic cluster or create new cluster
7. Store in DocumentInventory

### 2. Semantic Answer Cache Service

**Location**: `lib/cache/answer-cache.ts`

```typescript
interface AnswerCacheService {
  // Check cache before computing
  findCachedAnswer(
    question: string,
    userId: string,
    options?: {
      includeGlobal?: boolean
      maxAge?: number
      minConfidence?: number
    }
  ): Promise<CacheHit | null>

  // Store new answer
  cacheAnswer(
    question: string,
    answer: string,
    options: {
      scope: 'GLOBAL' | 'USER'
      userId?: string
      sourceDocumentIds?: string[]
      conversationId?: string
    }
  ): Promise<AnswerCache>

  // Invalidation
  invalidateByDocument(documentId: string): Promise<void>
  invalidateByTopic(userId: string, topic: string): Promise<void>
  invalidateStale(): Promise<void>  // Cron job

  // Validation
  validateCachedAnswer(
    cacheEntry: AnswerCache,
    currentQuestion: string
  ): Promise<ValidationResult>
}

interface CacheHit {
  entry: AnswerCache
  matchType: 'EXACT' | 'SIMILAR'
  similarityScore: number
  needsValidation: boolean
}

interface ValidationResult {
  isValid: boolean
  confidence: number
  reason?: string
}
```

**Cache Lookup Flow**:
```
1. Normalize question (lowercase, trim, remove filler words)
2. Compute questionHash (SHA-256)
3. Check exact match (hash lookup) → O(1)
4. If no exact match, compute embedding
5. Vector similarity search against cache embeddings
6. If similar match found (score > 0.85):
   a. Check if answer is > 7 days old
   b. If old, run LLM-as-Judge validation
   c. If valid, serve cached answer
   d. If invalid, invalidate and re-compute
7. If no match, proceed to normal computation
8. After computing, store in cache
```

### 3. Escalation Detection Service

**Location**: `lib/pkv/escalation.ts`

```typescript
interface EscalationService {
  shouldEscalate(
    question: string,
    userId: string,
    context: {
      mode: 'quick' | 'thoughtful' | 'contemplate' | 'council'
      conversationHistory?: Message[]
      vaultInventory?: DocumentInventory[]
    }
  ): Promise<EscalationDecision>
}

interface EscalationDecision {
  shouldEscalate: boolean
  reason: EscalationReason | null
  relevantDocuments: DocumentInventory[]
  suggestedPrompt?: string  // "I found 3 documents on this..."
}

enum EscalationReason {
  EXPLICIT_REFERENCE    // "what did I decide about X"
  DOCUMENT_MENTIONED    // User mentioned a document by name
  HIGH_TOPIC_OVERLAP    // Query strongly matches vault topics
  MODE_REQUIRES         // Contemplate/Council mode
  HIGH_STAKES_DETECTED  // Decision, commitment, contradiction
  PRIOR_WORK_EXISTS     // User has written about this before
}
```

**Escalation Signals** (concrete rules):
```typescript
const ESCALATION_RULES = {
  // Always escalate
  EXPLICIT_REFERENCE: {
    patterns: [
      /what did (i|we) (decide|write|say|think) about/i,
      /my (notes|documents|files) on/i,
      /check my (vault|pkv|knowledge)/i,
      /look through my/i,
    ]
  },

  // Escalate if match found
  TOPIC_OVERLAP: {
    threshold: 0.7,  // Cosine similarity
    minDocuments: 1,
  },

  // Mode-based
  MODE_REQUIRES: {
    contemplate: true,
    council: true,
  },

  // Question type detection
  HIGH_STAKES: {
    types: ['research', 'compare', 'decide', 'analyze'],
  }
}
```

### 4. Retrieval Sub-Agent

**Location**: `lib/pkv/retrieval-agent.ts`

```typescript
interface RetrievalSubAgent {
  // Isolated execution - heavy lifting happens here
  retrieveAndSummarize(
    query: string,
    userId: string,
    options: {
      documentIds?: string[]  // Specific docs to search
      maxChunks?: number      // Token budget control
      maxResponseTokens?: number  // Default 1500
    }
  ): Promise<RetrievalResult>
}

interface RetrievalResult {
  summary: string           // Compressed insight (max 1500 tokens)
  sourceDocuments: string[] // Which docs were used
  confidence: number
  chunksAnalyzed: number
  tokensUsed: number
}
```

**Sub-Agent Isolation Pattern**:
```
Main Thread                    Sub-Agent (Isolated)
    │                                │
    │──── Query + Doc IDs ──────────▶│
    │                                │
    │                          ┌─────┴─────┐
    │                          │ Full PKV  │
    │                          │ Search    │
    │                          │ (heavy)   │
    │                          └─────┬─────┘
    │                                │
    │                          ┌─────┴─────┐
    │                          │ Synthesize│
    │                          │ & Compress│
    │                          └─────┬─────┘
    │                                │
    │◀─── Compressed Summary ────────│
    │     (max 1500 tokens)          │
    │                                │
```

---

## Invalidation System

### Invalidation Triggers

| Trigger | Detection | Action |
|---------|-----------|--------|
| Time Decay | Cron job daily | Reduce confidence by 0.1/week after 7 days |
| Document Change | Webhook on doc update | Invalidate all cache entries citing that doc |
| Document Added | After indexing | Check topic overlap, invalidate high-overlap entries |
| User Correction | "That's not right" detection | Immediate invalidation + flag for review |
| Semantic Conflict | LLM-as-Judge validation | Invalidate if contradiction detected |

### Confidence Decay Formula

```typescript
function calculateConfidence(entry: AnswerCache): number {
  const daysSinceCreation = daysBetween(entry.createdAt, now())
  const daysSinceValidation = daysBetween(entry.lastValidatedAt, now())

  // Base confidence
  let confidence = entry.confidenceScore

  // Time decay (starts after 7 days, -0.1 per week)
  if (daysSinceValidation > 7) {
    const weeksStale = Math.floor((daysSinceValidation - 7) / 7)
    confidence -= weeksStale * 0.1
  }

  // Boost for high acceptance rate
  if (entry.acceptanceRate && entry.acceptanceRate > 0.9) {
    confidence += 0.1
  }

  // Boost for recent usage
  if (daysBetween(entry.lastUsedAt, now()) < 3) {
    confidence += 0.05
  }

  return Math.max(0, Math.min(1, confidence))
}
```

### LLM-as-Judge Validation

**When to validate**:
- Answer is > 7 days old
- Confidence has decayed below 0.7
- Match type is SIMILAR (not exact)

**Validation prompt**:
```
You are validating whether a cached answer still applies to a new question.

CACHED QUESTION: {cachedQuestion}
CACHED ANSWER: {cachedAnswer}
NEW QUESTION: {newQuestion}

Determine:
1. Is the new question asking essentially the same thing? (semantic match)
2. Is the cached answer still accurate and complete for the new question?
3. Are there any contradictions or outdated information?

Respond with JSON:
{
  "isValid": boolean,
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}
```

---

## UX Integration

### Response Metadata

Add to response payload:
```typescript
interface ResponseMetadata {
  // Existing fields...

  // New: Depth-Aware fields
  knowledgeSource: 'cache' | 'reasoning' | 'vault' | 'hybrid'
  cacheHit: boolean
  vaultAwareness: {
    relevantDocuments: number
    documentsSearched: boolean
    escalationOffered: boolean
  }
}
```

### Consent Prompts

**When OSQR detects relevant documents but hasn't searched them**:

```
OSQR: [Answers from reasoning/cache]

---
💡 I noticed you have {n} documents related to this topic, including
"{mostRelevantTitle}" from {date}. Would you like me to review them
for a more personalized answer?
```

**User response options**:
- "Yes, review them" → Trigger Layer 3
- "No, this is fine" → Cache the decision to not escalate for this topic
- Continue conversation → Implicit "no"

### Mode-Specific Behavior

**Quick Mode**:
- Layer 1 only
- Never offer vault escalation
- Cache answers aggressively

**Thoughtful Mode**:
- Check Layer 2 (awareness)
- Offer escalation if relevant docs found
- Wait for consent before Layer 3

**Contemplate Mode**:
- Always check Layer 2
- Auto-escalate to Layer 3 if relevant docs found (no consent needed)
- Inform user: "I'm reviewing your documents on this topic..."

**Council Mode**:
- Layer 3 required
- All relevant documents included in council deliberation
- Source documents cited in final synthesis

---

## Implementation Phases

### Phase 1: Data Model & Infrastructure ✅ COMPLETE
- [x] Add Prisma models (DocumentInventory, AnswerCache, CacheInvalidationEvent, TopicCluster)
- [x] Run migration (`20241229000000_depth_aware_intelligence`)
- [x] Add hash index on `questionHash` column for O(1) exact-match lookups
- [x] Set up pgvector index for cache embeddings (similar-match) - IVFFlat with 16 lists
- [x] Add index for LRU eviction queries (userId + lastUsedAt)
- [x] Vector dimensions set to 1536 (OpenAI embedding standard)

### Phase 2: Vault Inventory ✅ COMPLETE
- [x] Implement VaultInventoryService (`lib/depth-aware/vault-inventory.ts`)
- [x] Add document indexing hook (trigger on upload complete)
- [x] Build auto-summarization job (use Haiku)
- [x] Implement topic clustering
- [x] Create `getVaultInventory()` fast path

### Phase 3: Answer Cache ✅ COMPLETE
- [x] Implement AnswerCacheService (`lib/depth-aware/answer-cache.ts`)
- [x] Build exact-match lookup (hash-based)
- [x] Build similar-match lookup (vector-based)
- [x] Implement cache storage on answer completion
- [x] Add cache hit tracking and analytics

### Phase 4: Escalation Detection ✅ COMPLETE
- [x] Implement EscalationService (`lib/depth-aware/escalation.ts`)
- [x] Define and test escalation rules
- [x] Wire into ask-stream route
- [x] Add topic overlap scoring

### Phase 5: Validation & Invalidation ✅ COMPLETE
- [x] Implement LLM-as-Judge validation (`lib/depth-aware/validation.ts`)
- [x] Build confidence decay cron job
- [x] Wire document change webhooks
- [x] Implement semantic conflict detection

### Phase 6: Retrieval Sub-Agent ✅ COMPLETE
- [x] Implement RetrievalSubAgent (`lib/depth-aware/retrieval-agent.ts`)
- [x] Build isolated execution context
- [x] Add summarization/compression step
- [x] Enforce token budgets

### Phase 7: UX Integration ✅ COMPLETE
- [x] Add response metadata fields (`lib/depth-aware/orchestrator.ts`)
- [x] Build consent prompt templates
- [x] Wire mode-specific behavior
- [x] Wire into ask-stream route

### Phase 8: Global Cache Seeding ✅ COMPLETE
- [x] Seed initial 25 questions (`lib/depth-aware/global-cache-seed.ts`)
- [x] Generate and cache answers (with pre-written responses)
- [x] Add admin API for seeding (`/api/admin/seed-cache`)
- [x] Add analytics to track hit/miss ratio per question

---

## Global Cache: Initial Question Set

These are OSQR-specific questions every user will ask. Seed these first, monitor hit rates, adjust over time.

> **V1.9 Checkpoint**: Review hit rates, remove low-value entries, add candidates from user analytics.

### Tier 1: Core Product (Seed First)

| # | Question | Category |
|---|----------|----------|
| 1 | What is OSQR? | Identity |
| 2 | What can you help me with? | Capabilities |
| 3 | How is OSQR different from ChatGPT? | Differentiation |
| 4 | What are the different modes? | Modes |
| 5 | What's the difference between Quick and Thoughtful? | Modes |
| 6 | What is Contemplate mode? | Modes |
| 7 | What is Council mode? | Modes |
| 8 | How do I upload documents? | PKV |
| 9 | What is my vault / knowledge vault? | PKV |
| 10 | Can you search my documents? | PKV |

### Tier 2: Account & Pricing

| # | Question | Category |
|---|----------|----------|
| 11 | What's included in Pro? | Pricing |
| 12 | What's included in Master? | Pricing |
| 13 | How do I upgrade my plan? | Account |
| 14 | Is there a free trial? | Pricing |
| 15 | What is founder pricing? | Pricing |
| 16 | How do I cancel my subscription? | Account |
| 17 | Is my data private? | Privacy |

### Tier 3: Features & Usage

| # | Question | Category |
|---|----------|----------|
| 18 | How do I start a new conversation? | Usage |
| 19 | Can you remember things about me? | Memory |
| 20 | What is the capability ladder? | Framework |
| 21 | How do I give feedback? | Support |
| 22 | Can you generate images? | Features |
| 23 | Can you search the web? | Features |
| 24 | What AI models do you use? | Technical |
| 25 | How do I export my conversations? | Data |

### Tracking & Governance

Track for each cached question:
- `hitCount`: How often this exact/similar question is asked
- `acceptanceRate`: Did user continue conversation or ask follow-up?
- `lastHitAt`: When was this last matched?

**Eviction criteria** (for V1.9 review):
- hitCount < 5 after 30 days → candidate for removal
- acceptanceRate < 0.5 → answer may need revision
- No hits in 60 days → remove

**Addition criteria**:
- User question appears 10+ times across users → candidate for global cache
- High-stakes question with consistent answer → candidate for global cache

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Avg response latency (Quick mode) | ~3s | <1.5s |
| Cache hit rate (repeated questions) | 0% | >60% |
| Token cost per question (avg) | ~2000 | <1200 |
| Vault searches per session | 100% | <30% |
| User satisfaction (perceived speed) | ? | +20% |

---

## Decisions Made

1. **Redis vs Postgres for exact match**: Start with Postgres hash index for simplicity.
   > ⚠️ **REVISIT**: Monitor query latency after 10k+ cache entries. If exact-match lookups exceed 50ms, evaluate Redis migration.

2. **Cluster rebuild frequency**: Index once at document upload. Rebalance clusters monthly OR when vault grows by 20+ documents since last rebalance.

3. **Global cache governance**: Manual curation initially. Kable seeds top 50 OSQR questions, monitors hit rates, adjusts over time. Future: auto-suggest candidates from high-frequency user questions.

4. **Cache size limits**:
   - **User cache**: 500 entries per user with LRU eviction
   - **Global cache**: 200 entries, manually curated (no auto-eviction)
   - Rationale: 500 covers ~6 months of daily unique questions; prevents unbounded growth

5. **Privacy**: User cache deleted on account close. Cache entries are user-isolated (userId foreign key). No cross-user cache sharing except GLOBAL scope.

---

## References

- NotebookLM research on semantic caching and context engineering
- [OSQR Constitution](../governance/OSQR_CONSTITUTION.md) - Consent gates
- [PKV Architecture](../architecture/PKV_SPEC.md) - Existing vault implementation
- [UIP Spec](../architecture/UIP_SPEC.md) - User profile integration

---

## Appendix: OSQR Knowledge Access Doctrine

> **OSQR never performs deep retrieval by default. It earns the right to read by detecting leverage.**

1. **Inventory First** - OSQR maintains fast, always-on awareness of what exists
2. **Reason Before Reading** - Attempt to answer from frameworks, reasoning, and cache first
3. **Escalate Only on Signal** - Concrete triggers, not fuzzy heuristics
4. **Ask Before Digging** - Offer depth, don't assume consent
5. **Delegate the Mess** - Sub-agents do heavy retrieval, return compressed insight
6. **One Voice, Always** - Sub-agents never speak to user; OSQR owns the answer
