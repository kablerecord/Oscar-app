# Knowledge Gap Analysis Build Plan

**Status:** Ready to implement
**Priority:** V1.0 Feature (moved up from V1.5)
**Purpose:** Enable OSQR to answer "What am I missing?" by analyzing the user's vault against their goals

---

## What We're Building

A system that analyzes a user's knowledge vault and identifies gaps based on their goals, role, and expertise level. When a user asks "What am I missing?" or "What should I learn next?", OSQR will:

1. Scan their vault to understand what domains they have knowledge in
2. Compare against their goals/role from UIP
3. Identify missing domains that would help them achieve their goals
4. Return prioritized recommendations

**Example interaction:**
```
User: "Using my knowledge vault, tell me the top three things I am missing"

OSQR: "Based on your vault and your goal to launch an AI SaaS product, here are
your top knowledge gaps:

1. **Go-to-Market Strategy** (High priority)
   You have strong technical docs but nothing on launch strategy, pricing
   validation, or early customer acquisition. Consider researching: landing
   page optimization, beta user recruitment, pricing psychology.

2. **Legal & Compliance** (Medium priority)
   No docs on terms of service, privacy policies, or AI-specific regulations.
   Important before launch.

3. **Infrastructure & Scaling** (Medium priority)
   Your architecture docs cover features but not deployment, monitoring, or
   scaling strategies."
```

---

## Existing Infrastructure (Already Built)

| Component | Location | What It Does |
|-----------|----------|--------------|
| **Topic Cache** | `lib/knowledge/topic-cache.ts` | Extracts topics from docs, O(1) lookups |
| **Vector Search** | `lib/knowledge/vector-search.ts` | Semantic search via pgvector |
| **PKV Context** | `lib/knowledge/pkv.ts` | Assembles user's private knowledge context |
| **UIP Elicitation** | `lib/uip/elicitation.ts` | Stores user goals, role, expertise |
| **UIP Service** | `lib/uip/service.ts` | CRUD for UIP facts/dimensions |
| **Smart Search** | `lib/knowledge/search.ts` | Hybrid search with relevance scoring |
| **Document Storage** | Prisma `Document` model | 1,223 docs with embeddings already indexed |

---

## Files to Create

```
packages/app-web/lib/knowledge/
├── gap-analysis.ts           # Core gap detection engine
├── domain-extractor.ts       # Clusters docs into knowledge domains
├── goal-domain-map.ts        # Maps goals to expected knowledge domains
└── __tests__/
    ├── gap-analysis.test.ts
    ├── domain-extractor.test.ts
    └── goal-domain-map.test.ts

packages/app-web/lib/ai/
└── intent-handlers/
    └── gap-intent.ts         # Detects "what am I missing" queries

packages/app-web/app/api/
└── knowledge/
    └── gaps/
        └── route.ts          # API endpoint for gap analysis
```

---

## Implementation Phases

### Phase 1: Domain Extraction
**Goal:** Cluster vault documents into knowledge domains

**File:** `lib/knowledge/domain-extractor.ts`

```typescript
export interface KnowledgeDomain {
  name: string                    // "Technical/Backend", "Business/Marketing"
  confidence: number              // 0-1 how certain we are about this domain
  documentCount: number           // How many docs in this domain
  topDocuments: string[]          // Top 3 doc titles
  topics: string[]                // Key topics in this domain
  coverageDepth: 'shallow' | 'moderate' | 'deep'  // Based on doc count + variety
}

export async function extractDomains(workspaceId: string): Promise<KnowledgeDomain[]>
```

**Implementation approach:**
1. Get all documents for workspace (use existing Prisma queries)
2. For each document, extract topics using `extractTopics()` from topic-cache
3. Cluster topics into domains using predefined taxonomy + LLM for edge cases
4. Score coverage depth based on doc count and topic variety
5. Cache results (5-10 min TTL) to avoid recomputation

**Domain Taxonomy (starter list):**
```typescript
const DOMAIN_TAXONOMY = {
  'Technical': ['Backend', 'Frontend', 'Infrastructure', 'Data', 'AI/ML', 'Security'],
  'Business': ['Strategy', 'Marketing', 'Sales', 'Finance', 'Legal', 'Operations'],
  'Product': ['Design', 'UX', 'Research', 'Analytics', 'Roadmap'],
  'Personal': ['Goals', 'Learning', 'Productivity', 'Health', 'Relationships'],
}
```

**Checklist:**
- [ ] Create domain-extractor.ts with types
- [ ] Implement topic aggregation across all docs
- [ ] Implement domain clustering algorithm
- [ ] Add coverage depth scoring
- [ ] Add caching layer
- [ ] Write unit tests with mock documents

---

### Phase 2: Goal-Domain Mapping
**Goal:** Infer what knowledge domains a user should have based on their goals

**File:** `lib/knowledge/goal-domain-map.ts`

```typescript
export interface ExpectedDomain {
  domain: string                  // "Business/Marketing"
  importance: 'critical' | 'important' | 'helpful'
  reason: string                  // "Launching a product requires go-to-market strategy"
}

export async function getExpectedDomains(
  goals: string[],
  role?: string,
  expertiseLevel?: string
): Promise<ExpectedDomain[]>
```

**Implementation approach:**
1. Pull goals from UIP (via `lib/uip/service.ts`)
2. Use GPT-4 to infer expected knowledge domains for those goals
3. Adjust based on role (founder needs business, engineer needs technical)
4. Adjust based on expertise (beginner needs fundamentals, expert needs advanced)
5. Cache per goal-set (goals don't change often)

**Prompt template:**
```
Given these user goals: {goals}
And their role: {role}
And expertise level: {expertiseLevel}

What knowledge domains should they have expertise in to achieve these goals?
Return as JSON array with domain, importance (critical/important/helpful), and reason.
```

**Checklist:**
- [ ] Create goal-domain-map.ts with types
- [ ] Implement UIP goal fetching
- [ ] Implement LLM-based domain inference
- [ ] Add role-based adjustments
- [ ] Add expertise-level adjustments
- [ ] Add caching layer
- [ ] Write unit tests with mock goals

---

### Phase 3: Gap Detection Algorithm
**Goal:** Compare actual domains vs expected domains to find gaps

**File:** `lib/knowledge/gap-analysis.ts`

```typescript
export interface KnowledgeGap {
  domain: string                  // "Business/Marketing"
  importance: 'critical' | 'important' | 'helpful'
  currentCoverage: number         // 0-100
  reason: string                  // Why this matters for their goals
  suggestions: string[]           // Specific topics to research
  relatedGoals: string[]          // Which goals this gap affects
}

export interface GapAnalysisResult {
  gaps: KnowledgeGap[]
  strengths: KnowledgeDomain[]    // What they're well-covered on
  summary: string                 // Natural language summary
  analyzedAt: Date
  documentCount: number
}

export async function analyzeKnowledgeGaps(
  workspaceId: string,
  options?: { forceRefresh?: boolean; topN?: number }
): Promise<GapAnalysisResult>
```

**Implementation approach:**
1. Call `extractDomains(workspaceId)` to get actual coverage
2. Call `getExpectedDomains(goals, role, expertise)` to get expected
3. Compare: for each expected domain, check if actual coverage exists
4. Score gaps by: importance + coverage deficit
5. Generate suggestions using LLM or predefined topic lists
6. Format summary in OSQR voice

**Gap scoring formula:**
```typescript
gapScore = (importance === 'critical' ? 3 : importance === 'important' ? 2 : 1)
         * (1 - coveragePercentage)
```

**Checklist:**
- [ ] Create gap-analysis.ts with types
- [ ] Implement domain comparison logic
- [ ] Implement gap scoring algorithm
- [ ] Implement suggestion generation
- [ ] Implement summary generation (OSQR voice)
- [ ] Add top-N filtering
- [ ] Write comprehensive unit tests

---

### Phase 4: Intent Detection
**Goal:** Detect when user is asking about knowledge gaps

**File:** `lib/ai/intent-handlers/gap-intent.ts`

```typescript
export function isGapAnalysisIntent(message: string): boolean

export interface GapIntentContext {
  isGapQuery: boolean
  scope: 'all' | 'domain-specific'  // "what am I missing" vs "what am I missing about marketing"
  specificDomain?: string
}

export function parseGapIntent(message: string): GapIntentContext
```

**Trigger phrases:**
```typescript
const GAP_INTENT_PATTERNS = [
  /what.*(am i|are we).*(missing|lacking|don't know)/i,
  /what.*(should i|do i need to).*(learn|study|research|know)/i,
  /gaps? in my (knowledge|vault|documents)/i,
  /what.*don't i (know|have|understand)/i,
  /analyze my (knowledge|vault|documents)/i,
  /where are my (blind spots|gaps|weaknesses)/i,
  /what topics? (should i|do i need to) cover/i,
]
```

**Checklist:**
- [ ] Create gap-intent.ts with types
- [ ] Implement pattern matching
- [ ] Implement domain-specific parsing
- [ ] Write tests for various phrasings

---

### Phase 5: API Endpoint
**Goal:** Expose gap analysis via API

**File:** `app/api/knowledge/gaps/route.ts`

```typescript
// GET /api/knowledge/gaps?workspaceId=xxx&topN=3
export async function GET(request: Request): Promise<Response>

// Response shape:
{
  success: true,
  data: GapAnalysisResult
}
```

**Checklist:**
- [ ] Create route.ts
- [ ] Add authentication check
- [ ] Add workspace validation
- [ ] Wire to gap-analysis.ts
- [ ] Add error handling
- [ ] Test endpoint manually

---

### Phase 6: Chat Integration
**Goal:** Wire gap analysis into the chat flow

**Integration points:**
1. In message processing, check `isGapAnalysisIntent(message)`
2. If true, run `analyzeKnowledgeGaps(workspaceId)`
3. Format response using OSQR voice
4. Return as chat response

**File to modify:** Likely `lib/ai/chat.ts` or wherever message routing happens

**Checklist:**
- [ ] Identify correct integration point
- [ ] Add intent check to message flow
- [ ] Wire gap analysis call
- [ ] Format response in OSQR voice
- [ ] Test end-to-end in chat

---

### Phase 7: Comprehensive Tests
**Goal:** Rigorous test coverage with simulated users

**Test scenarios:**

```typescript
const TEST_SCENARIOS = {
  // Scenario 1: AI founder with technical docs, missing business
  aiFounder: {
    goals: ['Launch AI SaaS product', 'Raise seed funding'],
    role: 'Founder',
    expertise: 'Technical',
    mockDocs: [
      { title: 'React Architecture', topics: ['react', 'frontend', 'typescript'] },
      { title: 'OpenAI Integration', topics: ['openai', 'api', 'llm'] },
      { title: 'Database Schema', topics: ['prisma', 'postgresql', 'backend'] },
    ],
    expectedGaps: ['Business/Marketing', 'Business/Fundraising', 'Business/Legal'],
  },

  // Scenario 2: Marketer missing technical knowledge
  marketer: {
    goals: ['Grow user acquisition', 'Improve conversion rates'],
    role: 'Marketing Lead',
    expertise: 'Business',
    mockDocs: [
      { title: 'SEO Strategy', topics: ['seo', 'marketing', 'growth'] },
      { title: 'Content Calendar', topics: ['content', 'social', 'marketing'] },
    ],
    expectedGaps: ['Technical/Analytics', 'Product/UX', 'Technical/Data'],
  },

  // Scenario 3: Well-rounded user (minimal gaps)
  powerUser: {
    goals: ['Scale existing business'],
    role: 'CEO',
    expertise: 'Senior',
    mockDocs: [
      // 20+ docs across all domains
    ],
    expectedGaps: [], // Should find few/no critical gaps
  },

  // Scenario 4: New user (empty vault)
  newUser: {
    goals: ['Learn web development'],
    role: 'Student',
    expertise: 'Beginner',
    mockDocs: [],
    expectedGaps: ['Technical/Frontend', 'Technical/Backend', 'Technical/Deployment'],
  },

  // Scenario 5: No goals set
  noGoals: {
    goals: [],
    role: undefined,
    expertise: undefined,
    mockDocs: [
      { title: 'Random Notes', topics: ['notes'] },
    ],
    expectedGaps: [], // Should prompt user to set goals first
  },
}
```

**Test files:**
- `__tests__/gap-analysis.test.ts` - Core algorithm tests
- `__tests__/domain-extractor.test.ts` - Domain clustering tests
- `__tests__/goal-domain-map.test.ts` - Goal mapping tests
- `__tests__/gap-intent.test.ts` - Intent detection tests
- `__tests__/integration/gap-analysis-e2e.test.ts` - Full flow tests

**Checklist:**
- [ ] Create test fixtures for all scenarios
- [ ] Write unit tests for domain-extractor
- [ ] Write unit tests for goal-domain-map
- [ ] Write unit tests for gap-analysis
- [ ] Write unit tests for gap-intent
- [ ] Write integration tests for full flow
- [ ] Run full test suite and verify all pass

---

## Edge Cases to Handle

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Empty vault (0 docs) | Return message: "Upload some documents first so I can analyze your knowledge" |
| No goals set in UIP | Return message: "Tell me about your goals first - what are you trying to achieve?" |
| All domains covered | Return strengths summary, suggest going deeper in existing domains |
| Single domain only | Highlight breadth gap, suggest adjacent domains |
| Very large vault (1000+ docs) | Use sampling + caching, don't scan all docs every time |
| Conflicting domains | Note the conflict as a potential strength (interdisciplinary) |

---

## Caching Strategy

| Data | TTL | Invalidation |
|------|-----|--------------|
| Domain extraction | 10 minutes | On new doc upload |
| Goal-domain mapping | 1 hour | On UIP goal change |
| Full gap analysis | 5 minutes | On-demand refresh option |

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Domain extraction (cold) | < 30 seconds | First run, 1000+ docs |
| Domain extraction (cached) | < 100ms | Subsequent queries |
| Gap analysis (full) | < 5 seconds | Including LLM calls |
| Intent detection | < 10ms | Regex only, no LLM |

---

## Retroactive Compatibility

The 1,223 existing documents will work because:
1. All docs have `textContent` stored - we can extract topics on-demand
2. All docs have embeddings - we can use for semantic clustering
3. Topic cache can be populated lazily on first gap analysis

First analysis will take ~15-30 seconds to build domain map, then cache kicks in.

---

## Success Criteria

The feature is complete when:

1. [ ] User can ask "What am I missing?" and get relevant gaps
2. [ ] Gaps are prioritized by importance to user's goals
3. [ ] Suggestions are actionable (specific topics to research)
4. [ ] Works with existing 1,223 documents (retroactive)
5. [ ] All test scenarios pass
6. [ ] Response time < 5 seconds for cached analysis
7. [ ] Empty vault and no-goals edge cases handled gracefully

---

## Files Modified (Existing)

These existing files may need minor modifications:

| File | Modification |
|------|--------------|
| `lib/ai/chat.ts` (or equivalent) | Add gap intent routing |
| `lib/knowledge/topic-cache.ts` | Maybe add batch extraction function |
| `lib/uip/service.ts` | Maybe add goal fetching helper |

---

## Autonomous Execution Notes

When building autonomously:

1. **Start with tests** - Write test fixtures first, then implement to pass them
2. **Check existing patterns** - Match code style in `lib/knowledge/` and `lib/uip/`
3. **Use existing utilities** - Don't reinvent; use `prisma`, `topic-cache`, `vector-search`
4. **Document blockers** - If something is unclear, document it and continue with assumption
5. **Run tests frequently** - `pnpm test` after each phase
6. **Commit after each phase** - Clean git history for review

---

## Version History

| Date | Changes |
|------|---------|
| 2024-12-26 | Initial build plan created, moved from V1.5 to V1.0 |
