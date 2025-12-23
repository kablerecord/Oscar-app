# OSQR Global Public Knowledge Vault (GPKV) Specification

**Component**: Global Public Knowledge Vault
**Version**: 1.0
**Status**: Ready for Implementation
**Dependencies**: Constitutional Framework, Memory Vault, VS Code Extension
**Priority**: V2.0 Feature (Post-Core Launch)

---

## Executive Summary

The Global Public Knowledge Vault (GPKV) enables Oscar to learn collectively from all users while maintaining absolute privacy boundaries. Unlike individual PKVs (Private Knowledge Vaults) which store user-specific context, the GPKV accumulates anonymized patterns, solutions, and optimizations that benefit every Oscar user.

**Core Principle**: Oscar gets smarter for everyone without ever knowing anything about anyone.

---

## The Collective Intelligence Problem

### Current Limitation

Every AI coding assistant today is stateless across users:

```
User A solves tricky Next.js App Router issue → Knowledge dies with session
User B hits exact same issue → Starts from zero
User C hits exact same issue → Starts from zero
...
User N hits exact same issue → Still starting from zero
```

### GPKV Solution

```
User A solves tricky Next.js App Router issue
         ↓
Oscar extracts anonymous pattern: "App Router symptom X → solution approach Y"
         ↓
Pattern stored in GPKV with confidence score
         ↓
User B hits same issue → Oscar already recognizes pattern
         ↓
Resolution time: 12 minutes → 2 minutes
         ↓
Pattern confidence increases
         ↓
User C hits same issue → Oscar suggests solution proactively
```

---

## The Competitive Moat

This is how Oscar becomes objectively better than alternatives over time:

| Month | Oscar Capability | Competitor Capability |
|-------|------------------|----------------------|
| 1 | Base model knowledge | Base model knowledge |
| 6 | 10,000 error→solution patterns learned | Base model knowledge |
| 12 | Recognizes problems before users finish describing | Base model knowledge |
| 24 | Suggests architecture based on thousands of successful projects | Base model knowledge |

**The flywheel**: Every user makes Oscar smarter → Oscar becomes more valuable → More users → More patterns → Oscar gets even smarter

Competitors starting fresh cannot catch up because they don't have the collective learning corpus.

---

## Privacy Architecture

### The Four Tiers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRIVACY TIER ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TIER 4: NEVER COLLECTED (Constitutional Prohibition)                   │
│  ═══════════════════════════════════════════════════                    │
│  Source code, file contents, project names, conversation content,       │
│  business logic, user identity, keystroke data                          │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  TIER 3: EXPLICIT OPT-IN (User Actively Shares)                        │
│  ════════════════════════════════════════════════                       │
│  Custom solutions, domain patterns, workflow optimizations,             │
│  prompt templates, integration patterns                                 │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  TIER 2: IMPLICIT OPT-IN (Onboarding Agreement)                        │
│  ═══════════════════════════════════════════════                        │
│  Error→solution mappings, framework conventions, file structure         │
│  patterns, dependency resolutions, build configs, refactoring patterns  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  TIER 1: NO OPT-IN REQUIRED (Oscar Self-Improvement)                   │
│  ════════════════════════════════════════════════════                   │
│  Model routing effectiveness, token efficiency, error recovery,         │
│  tool sequences, response calibration, session patterns                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tier 1: No Opt-In Required

### Definition

Data Oscar observes about **himself**, not the user. Zero user information. No consent needed.

### Data Types

| Data Type | What Oscar Learns | Example Pattern |
|-----------|-------------------|-----------------|
| **Model routing effectiveness** | Which model handles which task types best | "Groq handles simple refactors faster with equal quality to Sonnet" |
| **Token efficiency patterns** | How to accomplish tasks with fewer tokens | "Chunking files at function boundaries reduces context by 40%" |
| **Error recovery patterns** | When Oscar fails and how he recovers | "Syntax errors after large edits - should validate incrementally" |
| **Tool usage sequences** | Which tool combinations work reliably | "view → str_replace → bash test more reliable than create_file for edits" |
| **Response length calibration** | What verbosity level users actually engage with | "Explanations over 200 words get skipped - default to concise" |
| **Session duration patterns** | When users disengage | "Engagement drops after 3rd clarifying question - commit to approach faster" |
| **Query-to-resolution time** | How long problems take by category | "Auth issues average 12 minutes, CSS issues average 4 minutes" |
| **Confidence calibration** | When Oscar's confidence matches actual correctness | "High confidence on TypeScript types = 94% accurate; moderate on regex = 67% accurate" |

### Rationale

This is Oscar's self-improvement data. It's like a chef tracking which techniques produce better dishes - nothing about the diners, everything about the craft.

### Storage Schema

```typescript
interface Tier1Metric {
  id: string;
  category: 'routing' | 'efficiency' | 'recovery' | 'tooling' | 'calibration';
  pattern: string;
  sampleSize: number;
  confidence: number;
  lastUpdated: Date;
  trend: 'improving' | 'stable' | 'degrading';
}
```

---

## Tier 2: Implicit Opt-In

### Definition

Anonymous pattern contribution. User agrees once during onboarding:

> "Help Oscar learn from solved problems (no code or personal data shared)"

### Data Types

| Data Type | What Oscar Learns | Anonymization Method |
|-----------|-------------------|---------------------|
| **Error → Solution mappings** | "TypeError X usually means Y" | Strip code, keep pattern structure only |
| **Framework conventions** | "Next.js 14 App Router common mistakes" | Generalize to framework, remove project specifics |
| **File structure patterns** | "Monorepos with this shape tend to need X" | Abstract to structure archetype, no file names |
| **Dependency conflict resolutions** | "Package A + B conflict resolves with C" | Package names only, no project context |
| **Build configuration patterns** | "Vite + TypeScript + React optimal config" | Config keys only, no values containing paths |
| **Refactoring patterns** | "When function exceeds X lines, split by Y" | Structural pattern only, no function names |
| **Common misconceptions** | "Users often confuse X with Y" | Question patterns, no user attribution |

### Anonymization Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ANONYMIZATION PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  RAW EVENT                                                              │
│  "User's handlePayment() in /src/stripe/checkout.ts threw               │
│   'Cannot read property of undefined' - fixed by null check             │
│   on customer.id"                                                       │
│                                                                         │
│         │                                                               │
│         ▼                                                               │
│                                                                         │
│  STAGE 1: CONTENT STRIPPING                                            │
│  Remove: function names, file paths, variable names                     │
│  Keep: error type, general context, solution approach                   │
│                                                                         │
│         │                                                               │
│         ▼                                                               │
│                                                                         │
│  STAGE 2: GENERALIZATION                                               │
│  "Stripe integration" → "Payment provider integration"                  │
│  "customer.id" → "nested object property"                               │
│                                                                         │
│         │                                                               │
│         ▼                                                               │
│                                                                         │
│  STAGE 3: PATTERN EXTRACTION                                           │
│  "Payment integration - undefined property error on nested              │
│   object access - solution: null check before property access"          │
│                                                                         │
│         │                                                               │
│         ▼                                                               │
│                                                                         │
│  STAGE 4: VALIDATION                                                   │
│  ✓ No identifiable information                                         │
│  ✓ No code fragments                                                    │
│  ✓ No file paths or names                                              │
│  ✓ Pattern is generalizable                                            │
│                                                                         │
│         │                                                               │
│         ▼                                                               │
│                                                                         │
│  STORED PATTERN                                                        │
│  {                                                                      │
│    category: "error_resolution",                                        │
│    context: "payment_integration",                                      │
│    symptom: "undefined_property_nested_access",                         │
│    solution: "null_check_before_access",                               │
│    confidence: 0.85,                                                    │
│    occurrences: 1                                                       │
│  }                                                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Storage Schema

```typescript
interface Tier2Pattern {
  id: string;
  category: PatternCategory;
  context: string;           // Generalized domain (e.g., "auth", "database", "ui")
  symptom: string;           // What the problem looked like
  solution: string;          // How it was resolved
  confidence: number;        // 0-1, increases with confirmations
  occurrences: number;       // How many times pattern observed
  frameworks: string[];      // Which frameworks this applies to
  firstSeen: Date;
  lastConfirmed: Date;
  contradictions: number;    // Times pattern didn't work
}

type PatternCategory =
  | 'error_resolution'
  | 'framework_convention'
  | 'file_structure'
  | 'dependency_resolution'
  | 'build_configuration'
  | 'refactoring'
  | 'misconception';
```

### Confidence Scoring

```typescript
function updatePatternConfidence(pattern: Tier2Pattern, outcome: 'success' | 'failure'): void {
  if (outcome === 'success') {
    pattern.occurrences++;
    pattern.lastConfirmed = new Date();
    // Confidence increases logarithmically (diminishing returns)
    pattern.confidence = Math.min(0.99, 0.5 + (Math.log10(pattern.occurrences) * 0.2));
  } else {
    pattern.contradictions++;
    // Contradictions have stronger negative weight
    const contradictionRatio = pattern.contradictions / (pattern.occurrences + pattern.contradictions);
    pattern.confidence = Math.max(0.1, pattern.confidence - (contradictionRatio * 0.1));
  }
}
```

---

## Tier 3: Explicit Opt-In

### Definition

User actively chooses to share specific learnings. Optional recognition/credit.

### Data Types

| Data Type | What Oscar Learns | User Benefit |
|-----------|-------------------|--------------|
| **Custom solutions** | Novel approaches to common problems | Recognition, helps others, contributor status |
| **Domain-specific patterns** | Healthcare, fintech, e-commerce conventions | Builds expertise corpus for their industry |
| **Workflow optimizations** | "I always do X before Y" that works well | Others benefit, establishes best practices |
| **Prompt templates** | Effective ways to ask Oscar for specific outcomes | Shared prompt library, attribution |
| **Integration patterns** | "Oscar + [other tool] works best when..." | Ecosystem improvement |
| **Architecture decisions** | "For [use case], structure like [pattern]" | Higher-level strategic knowledge |

### Contribution Flow

```
User solves novel problem
         │
         ▼
Oscar recognizes novelty: "This approach is interesting -
I haven't seen this pattern before. Want to contribute it
to help other developers?"
         │
         ▼
User chooses:
├── [No thanks] → Nothing shared, pattern stays in user's PKV only
├── [Share anonymously] → Pattern extracted, no attribution
└── [Share with credit] → Pattern extracted, contributor recognized
         │
         ▼
If shared: Pattern goes through anonymization pipeline
         │
         ▼
Stored in GPKV with contributor flag (if credited)
         │
         ▼
Other users benefit, contributor gets recognition
```

### Contributor Recognition System

```typescript
interface Contributor {
  id: string;                    // Anonymous or linked to profile
  displayName: string | null;    // If they want recognition
  contributionCount: number;
  impactScore: number;           // How often their patterns helped others
  domains: string[];             // Areas of expertise based on contributions
  tier: 'bronze' | 'silver' | 'gold' | 'expert';
  joinedAt: Date;
}

// Impact calculated as:
// impactScore = sum(pattern.occurrences * pattern.confidence) for all contributed patterns
```

### Storage Schema

```typescript
interface Tier3Contribution {
  id: string;
  contributorId: string | null;  // null = anonymous
  category: ContributionCategory;
  title: string;                 // Brief description
  pattern: string;               // The actual knowledge
  context: string;               // When this applies
  frameworks: string[];
  domain: string;                // Industry/use-case domain
  upvotes: number;               // Community validation
  usageCount: number;            // How often Oscar applies this
  submittedAt: Date;
  verifiedAt: Date | null;       // If manually reviewed
  status: 'pending' | 'active' | 'deprecated';
}

type ContributionCategory =
  | 'solution'
  | 'domain_pattern'
  | 'workflow'
  | 'prompt_template'
  | 'integration'
  | 'architecture';
```

---

## Tier 4: Never Collected

### Definition

Constitutional prohibition. No mechanism exists to collect this data, even if user wanted to share.

### Prohibited Data

| Data Type | Why Prohibited |
|-----------|----------------|
| **Actual source code** | User data sovereignty - code is their IP |
| **File contents** | Could contain secrets, credentials, PII |
| **Project names / paths** | Identifies user, company, or product |
| **Conversation content** | Private communication between user and Oscar |
| **Business logic descriptions** | Competitive intelligence risk |
| **User identity correlation** | Cannot link patterns to individuals across sessions |
| **Keystroke / timing data** | Surveillance, not learning |
| **Error messages with context** | Often contain sensitive paths or data |
| **Environment variables** | Credentials, API keys, secrets |
| **Git history / commit messages** | Project-specific, often contains names |

### Technical Enforcement

```typescript
// Constitutional gate - runs before ANY data leaves user's environment
function constitutionalFilter(data: any): boolean {
  const prohibitedPatterns = [
    /\/[a-zA-Z]+\/[a-zA-Z]+\//,           // File paths
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+/,   // Emails
    /sk-[a-zA-Z0-9]+/,                     // API keys
    /password|secret|token|key/i,          // Credential keywords
    /function\s+\w+\s*\(/,                 // Actual code
    /const|let|var\s+\w+\s*=/,            // Variable declarations
    /import\s+.*from/,                     // Import statements
  ];

  const stringified = JSON.stringify(data);

  for (const pattern of prohibitedPatterns) {
    if (pattern.test(stringified)) {
      return false; // Block transmission
    }
  }

  return true;
}

// This filter cannot be disabled or bypassed
// It runs client-side before any network transmission
```

---

## GPKV Query Integration

### How Oscar Uses GPKV

When a user asks Oscar for help, the query flow includes GPKV:

```
User describes problem
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      RETRIEVAL SEQUENCE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. QUERY USER'S PKV                                                   │
│     "Have we solved this before in this user's context?"                │
│     Priority: Highest (user's own history most relevant)                │
│                                                                         │
│  2. QUERY GPKV                                                         │
│     "Have other users solved similar problems?"                         │
│     Priority: High (collective wisdom)                                  │
│                                                                         │
│  3. QUERY BASE KNOWLEDGE                                               │
│     "What does the model know from training?"                           │
│     Priority: Medium (general knowledge)                                │
│                                                                         │
│  4. SYNTHESIZE                                                         │
│     Combine insights from all sources                                   │
│     Weight by: relevance, recency, confidence                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
Oscar provides solution informed by collective knowledge
         │
         ▼
If solution works → Pattern confidence increases in GPKV
If solution fails → Pattern contradiction logged
```

### Query Schema

```typescript
interface GPKVQuery {
  symptom: string;           // What the user is experiencing
  context: {
    framework: string[];     // e.g., ['next.js', 'react', 'typescript']
    domain: string;          // e.g., 'e-commerce', 'saas', 'mobile'
    errorType?: string;      // e.g., 'TypeError', 'build_failure'
  };
  limit: number;             // Max patterns to return
  minConfidence: number;     // Threshold (default: 0.6)
}

interface GPKVResult {
  patterns: Tier2Pattern[];
  contributions: Tier3Contribution[];
  combinedConfidence: number;
  suggestedApproach: string;
}
```

---

## Learning Feedback Loop

### Success Detection

Oscar detects when a solution worked:

| Signal | Confidence Level | Action |
|--------|------------------|--------|
| User says "thanks" / "that worked" | High | Increment pattern confidence |
| User moves to next task | Medium | Slight confidence increase |
| Code compiles / tests pass | High | Strong confidence increase |
| User asks follow-up on same issue | Low | Possible pattern failure |
| User says "that didn't work" | High negative | Log contradiction |
| User undoes Oscar's changes | High negative | Log contradiction |

### Pattern Lifecycle

```
NEW PATTERN
Confidence: 0.5 (baseline)
     │
     ▼ [3+ successes]
EMERGING PATTERN
Confidence: 0.6-0.7
     │
     ▼ [10+ successes, <20% contradiction rate]
ESTABLISHED PATTERN
Confidence: 0.7-0.85
     │
     ▼ [50+ successes, <10% contradiction rate]
TRUSTED PATTERN
Confidence: 0.85-0.95
     │
     ▼ [contradictions exceed threshold OR newer pattern supersedes]
DEPRECATED PATTERN
Status: inactive, kept for historical reference
```

---

## Infrastructure Requirements

### Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     GPKV STORAGE ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    GPKV CENTRAL STORE                           │   │
│  │                                                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │   │
│  │  │   Tier 1    │  │   Tier 2    │  │   Tier 3    │            │   │
│  │  │   Metrics   │  │  Patterns   │  │Contributions│            │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │              Vector Embedding Index                      │   │   │
│  │  │         (for semantic pattern matching)                  │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    EDGE CACHE LAYER                              │   │
│  │          (Frequently accessed patterns, low latency)             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │   VS Code    │  │   VS Code    │  │   VS Code    │  ...            │
│  │   Client A   │  │   Client B   │  │   Client C   │                 │
│  │              │  │              │  │              │                 │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │                 │
│  │ │Local PKV │ │  │ │Local PKV │ │  │ │Local PKV │ │                 │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Performance Targets

| Operation | Target Latency | Notes |
|-----------|----------------|-------|
| GPKV query | <100ms | Edge cache hit |
| GPKV query | <500ms | Central store hit |
| Pattern submission | <200ms | Async, non-blocking |
| Confidence update | <50ms | Batch processed |
| Full sync | <5s | On VS Code startup |

### Storage Estimates

| Data Type | Size Per Unit | Projected Volume (Year 1) | Total Storage |
|-----------|---------------|---------------------------|---------------|
| Tier 1 Metrics | ~500 bytes | 10,000 metrics | ~5 MB |
| Tier 2 Patterns | ~2 KB | 100,000 patterns | ~200 MB |
| Tier 3 Contributions | ~5 KB | 10,000 contributions | ~50 MB |
| Vector embeddings | ~6 KB | 110,000 entries | ~660 MB |
| **Total** | | | **~1 GB** |

Extremely lightweight. Storage is not a constraint.

---

## Implementation Phases

### Phase 1: Tier 1 Only (V1.5)
- [ ] Implement self-improvement metrics collection
- [ ] Build internal dashboard for Oscar performance tracking
- [ ] No user-facing features yet
- [ ] Validate anonymization pipeline with synthetic data

### Phase 2: Tier 2 Launch (V2.0)
- [ ] Add opt-in prompt to onboarding flow
- [ ] Deploy anonymization pipeline
- [ ] Launch GPKV central store
- [ ] Integrate GPKV queries into Oscar response generation
- [ ] Build confidence scoring system

### Phase 3: Tier 3 + Community (V2.5)
- [ ] Contribution submission UI in VS Code
- [ ] Contributor profiles and recognition
- [ ] Community validation (upvotes)
- [ ] Domain-specific pattern libraries
- [ ] Expert contributor program

### Phase 4: Advanced Features (V3.0)
- [ ] Pattern recommendation engine
- [ ] Proactive suggestions ("Users with similar codebases often...")
- [ ] Framework-specific knowledge packs
- [ ] Enterprise private GPKV instances

---

## Success Metrics

### Learning Effectiveness

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pattern match rate | >30% of queries | GPKV returns relevant pattern |
| Solution accuracy | >80% | Pattern-suggested solutions work |
| Time to resolution | -40% | Compared to pre-GPKV baseline |
| User satisfaction | >4.5/5 | On pattern-assisted resolutions |

### Contribution Health

| Metric | Target | Measurement |
|--------|--------|-------------|
| Opt-in rate (Tier 2) | >60% | Users who accept onboarding prompt |
| Active contributors (Tier 3) | 5% of users | At least one contribution |
| Pattern diversity | >50 categories | Breadth of knowledge |
| Contradiction rate | <15% | Patterns that don't work |

### System Health

| Metric | Target | Measurement |
|--------|--------|-------------|
| Query latency (p95) | <500ms | Edge + central combined |
| Anonymization pass rate | 100% | No PII escapes filter |
| Pattern freshness | <30 days avg | Time since last confirmation |
| Storage growth | <10 GB/year | Sustainable infrastructure |

---

## Privacy Audit Checklist

Monthly review to ensure constitutional compliance:

- [ ] No source code in Tier 2 patterns
- [ ] No file paths in any stored data
- [ ] No user correlation possible across patterns
- [ ] No conversation content stored
- [ ] Anonymization pipeline tested with adversarial inputs
- [ ] Opt-out requests processed within 24 hours
- [ ] No Tier 4 data in any logs or storage
- [ ] Edge cache contains only anonymized patterns

---

## Constitutional Alignment

### User Data Sovereignty
- Users own their PKV data completely
- GPKV contributions are voluntary
- Opt-out removes future contributions (historical patterns remain anonymized)
- No data leaves device without passing constitutional filter

### Identity Transparency
- Oscar discloses when using GPKV patterns: "Based on patterns from other developers..."
- Contributors can choose attribution or anonymity
- Never implies Oscar "figured this out" when pattern came from GPKV

### Baseline Honesty
- Confidence scores are calibrated and honest
- Oscar admits uncertainty when GPKV patterns have low confidence
- Contradictions are tracked and surfaced, not hidden

---

## Document Connections

| Document | Relationship |
|----------|--------------|
| **Memory Vault Spec** | PKV architecture that GPKV extends |
| **Constitutional Framework** | Privacy principles GPKV must uphold |
| **Document Indexing Spec** | How patterns are extracted from documents |
| **Insights System** | How GPKV patterns inform proactive insights |
| **Character Guide** | How Oscar communicates about GPKV-sourced knowledge |

---

## Open Questions for Future Versions

1. Should enterprise customers get private GPKV instances for industry-specific learning?
2. How do we handle pattern conflicts between domains (what works in fintech might not work in healthcare)?
3. Should contributors earn anything beyond recognition (revenue share from enterprise GPKV)?
4. How do we prevent gaming (fake contributions for status)?
5. Should GPKV patterns expire if not confirmed for extended periods?
6. Can GPKV power a "similar codebases" matching feature for community building?
7. How do we handle GPKV in regions with strict data residency requirements?

---

**End of Specification**

*Document Version: 1.0*
*Status: Ready for Implementation*
*Target: OSQR V2.0 (VS Code Extension)*
