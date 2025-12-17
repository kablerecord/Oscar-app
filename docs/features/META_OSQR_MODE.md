# Meta-OSQR Mode

**Status:** Specification Complete
**Phase:** 6 (Post Intelligence Layer)
**Tier:** OSQR Master Exclusive
**Last Updated:** 2025-12-10

---

## Overview

Meta-OSQR is a self-refinement capability where OSQR audits its own system — applying the principle *"The best part is no part"* to itself.

### The Core Insight

> "If Oscar helps users identify unnecessary complexity in their lives, why can't Oscar turn that same thinking inward?"

This creates a unique differentiator: **an AI that actively works to simplify itself**.

---

## Vision

Meta-OSQR enables three revolutionary capabilities:

1. **Self-Audit** — OSQR analyzes its own complexity and proposes simplifications
2. **Question Intelligence** — OSQR rates question quality and generates high-leverage questions
3. **Continuous Improvement** — OSQR identifies its own friction points and low-value features

### Why This Matters

- **Builds trust** — Users see OSQR actively improving itself
- **Reduces bloat** — Prevents feature creep by surfacing unused capabilities
- **Marketing gold** — "The AI that audits itself" is a powerful narrative
- **Aligns with philosophy** — Embodies the "best part is no part" principle throughout

---

## Core Capabilities

### 1. System Complexity Audit

OSQR maps its own architecture and identifies simplification opportunities.

**What It Analyzes:**
- Feature usage rates (from telemetry)
- Code complexity metrics
- Data flow complexity
- API surface area
- Configuration options

**Output Example:**
```
OSQR Self-Audit Report
======================
Overall Complexity Score: 7.2/10 (up 0.3 from last month)

High-complexity areas:
1. Memory system (5 tiers when 3 would suffice)
2. Mode routing logic (nested conditionals)
3. Panel composition (over-parameterized)

Simplification opportunities:
- Memory tiers: Merge Working + Dialogue → "Session Memory"
- Mode routing: Replace conditionals with lookup table
- Panel: Remove unused 'debater' personality type

Features with <5% usage this month:
- Knowledge graph visualization
- Custom agent builder (0.2% of users)
- Voice input mode

Recommended actions:
1. Deprecate voice input (0.1% usage, high maintenance cost)
2. Simplify memory architecture (reduces cognitive load)
3. Remove 'debater' panel personality (never selected)
```

### 2. Question Quality Scoring

OSQR rates incoming questions and suggests improvements.

**Scoring Dimensions:**
- **Clarity** (0-10): How unambiguous is the question?
- **Specificity** (0-10): How well-defined is the scope?
- **Tractability** (0-10): How answerable is this question?

**Output Example:**
```
Question Analysis
=================
Original: "How do I fix my business?"

Scores:
- Clarity: 3/10 (vague - what aspect of business?)
- Specificity: 2/10 (no constraints or context)
- Tractability: 2/10 (too broad to answer meaningfully)

Suggested Improvement:
"What are the top 3 bottlenecks preventing my SaaS from reaching $10K MRR,
given that I have 50 users and $2K current MRR?"

Why better:
- Defines success metric ($10K MRR)
- Provides context (current state)
- Constrains scope (top 3)
- Specifies domain (SaaS)
```

### 3. PowerQuestion Generation

OSQR generates high-leverage questions based on user context.

**Data Sources:**
- Personal Knowledge Vault (PKV)
- Master Summary Checklist (MSC)
- Profile answers
- Conversation history patterns

**Output Example:**
```
PowerQuestions for This Week
============================
Based on your current projects and patterns:

1. "What would this look like if it were easy?"
   → Context: VoiceQuote scaling challenges
   → Why: You've mentioned complexity 4 times this week

2. "If I could only keep 3 features, which would they be?"
   → Context: OSQR roadmap decisions
   → Why: Feature list growing faster than usage

3. "What am I avoiding that I know I should do?"
   → Context: Recurring pattern in reflections
   → Why: Same topic deferred 3 weeks in a row

4. "Who could I ask for help on this?"
   → Context: Solo decision-making pattern
   → Why: No collaboration signals in past month
```

### 4. Complexity Tracking Over Time

Dashboard showing OSQR's complexity trends.

**Metrics Tracked:**
- Overall complexity score (composite)
- Lines of code by module
- Number of configuration options
- API endpoint count
- Feature usage distribution
- Abandoned flow rates

**Visualization:**
```
Complexity Trend (6 months)
===========================

Score  │
  10   │
   9   │                              ╭──
   8   │               ╭─────────────╯
   7   │    ╭─────────╯
   6   │───╯
   5   │
       └────────────────────────────────
        Jun   Jul   Aug   Sep   Oct   Nov

Key Events:
- Jul: Added Council Mode (+0.8)
- Sep: Simplified memory system (-0.5)
- Nov: Added Meta-OSQR (+0.3)
```

---

## Trigger Methods

### User-Initiated Commands

| Command | Action |
|---------|--------|
| "Oscar, audit yourself" | Full system complexity report |
| "Oscar, what could be simpler?" | Simplification proposals only |
| "Oscar, rate this question" | Question quality analysis |
| "Oscar, give me a PowerQuestion" | Generate high-leverage question |
| "Oscar, show complexity trends" | Historical complexity dashboard |

### Automated Triggers

| Trigger | Frequency | Output |
|---------|-----------|--------|
| Weekly self-audit | Every Sunday | Summary report to admin |
| Post-release check | After each deploy | Complexity diff analysis |
| Monthly feature review | 1st of month | Usage-based deprecation candidates |
| Question pattern analysis | Daily (background) | Question quality trends |

---

## Technical Architecture

### Dependencies

Meta-OSQR requires these systems to be operational:

1. **Behavioral Intelligence Layer** (Phase 3.0)
   - TelemetryCollector — for usage data
   - PatternAggregator — for pattern detection
   - UserBehaviorModel — for personalization

2. **PKV Integration**
   - Access to user's knowledge vault
   - MSC data for context

3. **Codebase Analysis Tools**
   - AST parsing for complexity metrics
   - Git history for change patterns

### New Components

```
lib/meta/
├── index.ts                    # Clean exports
├── SelfAuditor.ts             # Core audit orchestration
├── ComplexityAnalyzer.ts      # Code/feature complexity scoring
├── QuestionIntelligence.ts    # Question quality & generation
└── types.ts                   # Meta-OSQR types
```

#### SelfAuditor.ts
```typescript
export class SelfAuditor {
  // Generate full system audit
  async generateAudit(): Promise<ComplexityReport>

  // Get simplification proposals
  async getSimplificationProposals(): Promise<SimplificationProposal[]>

  // Calculate complexity score
  async calculateComplexityScore(): Promise<number>

  // Get low-usage features
  async getLowUsageFeatures(threshold: number): Promise<FeatureUsage[]>
}
```

#### ComplexityAnalyzer.ts
```typescript
export class ComplexityAnalyzer {
  // Analyze code complexity
  async analyzeCodeComplexity(): Promise<CodeComplexityReport>

  // Analyze feature complexity
  async analyzeFeatureComplexity(): Promise<FeatureComplexityReport>

  // Track complexity over time
  async getComplexityTrend(days: number): Promise<ComplexityTrend>
}
```

#### QuestionIntelligence.ts
```typescript
export class QuestionIntelligence {
  // Score a question
  async scoreQuestion(question: string): Promise<QuestionScore>

  // Suggest improvements
  async suggestImprovement(question: string): Promise<string>

  // Generate PowerQuestions
  async generatePowerQuestions(userId: string): Promise<PowerQuestion[]>

  // Learn from user patterns
  async learnQuestionPatterns(userId: string): Promise<void>
}
```

### Database Schema

```prisma
model ComplexityReport {
  id                      String   @id @default(cuid(./BEHAVIORAL_INTELLIGENCE_LAYER.md)
  generatedAt             DateTime @default(now(./BEHAVIORAL_INTELLIGENCE_LAYER.md)
  overallScore            Float
  componentScores         Json     // { "memory": 7.2, "routing": 6.5, ... }
  simplificationProposals Json     // Array of proposals
  lowUsageFeatures        String[] // Feature names
  codeMetrics             Json     // LOC, cyclomatic complexity, etc.
  createdAt               DateTime @default(now(./BEHAVIORAL_INTELLIGENCE_LAYER.md)
}

model QuestionScore {
  id               String   @id @default(cuid(./BEHAVIORAL_INTELLIGENCE_LAYER.md)
  workspaceId      String
  questionHash     String   // SHA-256 of question (privacy)
  clarityScore     Float
  specificityScore Float
  tractabilityScore Float
  improvedVersion  String?
  feedback         String?  // User feedback on suggestion
  createdAt        DateTime @default(now(./BEHAVIORAL_INTELLIGENCE_LAYER.md)

  workspace        Workspace @relation(fields: [workspaceId], references: [id])

  @@index([workspaceId])
}

model PowerQuestion {
  id           String   @id @default(cuid(./BEHAVIORAL_INTELLIGENCE_LAYER.md)
  workspaceId  String
  question     String
  context      String   // Why this question was generated
  relatedTo    String[] // PKV/MSC references
  wasUsed      Boolean  @default(false)
  rating       Int?     // User rating 1-5
  generatedAt  DateTime @default(now(./BEHAVIORAL_INTELLIGENCE_LAYER.md)

  workspace    Workspace @relation(fields: [workspaceId], references: [id])

  @@index([workspaceId])
}
```

### API Endpoints

```typescript
// Self-audit endpoints
POST /api/oscar/meta/audit
  → Returns: ComplexityReport

GET /api/oscar/meta/complexity-trend
  → Query: { days: number }
  → Returns: ComplexityTrend

GET /api/oscar/meta/simplifications
  → Returns: SimplificationProposal[]

// Question intelligence endpoints
POST /api/oscar/meta/score-question
  → Body: { question: string }
  → Returns: QuestionScore

POST /api/oscar/meta/improve-question
  → Body: { question: string }
  → Returns: { improved: string, explanation: string }

GET /api/oscar/meta/power-questions
  → Returns: PowerQuestion[]

POST /api/oscar/meta/power-question/feedback
  → Body: { questionId: string, rating: number, wasUsed: boolean }
```

---

## Privacy Considerations

### What Meta-OSQR Accesses

**System-Level (No User Data):**
- Codebase complexity metrics
- Aggregate feature usage statistics
- Configuration complexity

**User-Level (With Consent):**
- Question patterns (Tier B+)
- PKV/MSC for PowerQuestion context (Tier B+)
- Usage telemetry (Tier B+)

### What Meta-OSQR NEVER Accesses

- Raw question content (only hashed for scoring)
- Document contents
- Chat message content
- Personal information

### Privacy Tier Requirements

| Feature | Tier A | Tier B | Tier C |
|---------|--------|--------|--------|
| System complexity audit | ✓ | ✓ | ✓ |
| Question scoring | - | ✓ | ✓ |
| PowerQuestion generation | - | ✓ | ✓ |
| Global pattern learning | - | - | ✓ |

---

## Implementation Phases

### Phase 6.1: Foundation
- [ ] Create `lib/meta/` directory structure
- [ ] Implement basic SelfAuditor stub
- [ ] Add ComplexityReport database model
- [ ] Create `/api/oscar/meta/audit` endpoint

### Phase 6.2: Complexity Analysis
- [ ] Implement ComplexityAnalyzer
- [ ] Add code complexity metrics
- [ ] Build complexity trending
- [ ] Create admin dashboard view

### Phase 6.3: Question Intelligence
- [ ] Implement QuestionIntelligence
- [ ] Add question scoring algorithm
- [ ] Build PowerQuestion generator
- [ ] Add question feedback loop

### Phase 6.4: Integration
- [ ] Wire into main OSQR conversation flow
- [ ] Add trigger command parsing
- [ ] Implement automated schedules
- [ ] Build user-facing UI components

---

## Success Metrics

### Quantitative

| Metric | Target | Measurement |
|--------|--------|-------------|
| Complexity score reduction | -10% in 6 months | Monthly audit comparison |
| Question quality improvement | +15% clarity scores | Before/after suggestion |
| PowerQuestion usage | >30% used | Tracking `wasUsed` field |
| Feature deprecation rate | 1-2 per quarter | Based on <5% usage |

### Qualitative

- Users report OSQR feeling "simpler" over time
- Development velocity increases (less complexity to maintain)
- Feature requests become more focused
- "Oscar audits itself" becomes a talking point

---

## The Meta-Irony

> Building a feature that identifies unnecessary features is itself a risk of unnecessary complexity.
> The implementation must be minimal, or Meta-OSQR will be the first thing Meta-OSQR recommends removing.

### Design Principles for Meta-OSQR

1. **Minimal surface area** — Few commands, clear outputs
2. **Lazy evaluation** — Don't compute until asked
3. **Graceful degradation** — Works without telemetry (just less personalized)
4. **Self-referential checks** — Meta-OSQR audits its own complexity

---

## Related Documentation

- [ROADMAP.md](../../ROADMAP.md) — Phase 6 roadmap section
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — System architecture
- [BEHAVIORAL_INTELLIGENCE_LAYER.md](./BEHAVIORAL_INTELLIGENCE_LAYER.md) — Telemetry foundation
- [TELEMETRY_SPEC.md](../architecture/TELEMETRY_SPEC.md) — Event schemas
- [PRIVACY_TIERS.md](../architecture/PRIVACY_TIERS.md) — Privacy tier details

---

## Future Expansions

### Potential v2 Features

1. **Inter-feature dependency mapping** — Visualize how features connect
2. **A/B test recommendations** — Suggest experiments based on usage patterns
3. **Codebase health score** — Beyond complexity, include test coverage, docs
4. **User-specific simplification** — "You don't use X, want to hide it?"
5. **Competitive complexity analysis** — Compare to similar tools (if data available)

### Integration Opportunities

- **VS Code Extension** — Show complexity metrics in IDE
- **CI/CD Pipeline** — Block deploys that increase complexity beyond threshold
- **Weekly Email** — Include complexity trend in Oscar Wins digest
