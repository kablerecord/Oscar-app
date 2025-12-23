# OSQR Insights System
## Version 2.0 | Proactive Intelligence & Discovery Specification

---

## Document Purpose

This document defines OSQR's Insights System - the proactive intelligence layer that surfaces what users didn't know to ask. This is OSQR's core differentiator: rather than waiting for questions, OSQR analyzes documents, chat history, and context to generate actionable insights.

This specification includes implementation-ready TypeScript interfaces, detection algorithms, feedback mechanics, and integration points with existing OSQR components (Bubble Interface, Memory Vault, Temporal Intelligence, Constitutional Framework).

---

## Core Philosophy

### The Problem We're Solving

Most people lack imagination or the ability to ask the right questions. They don't know what they don't know. Traditional AI requires users to prompt well - but the best insights come from questions they never thought to ask.

### OSQR's Approach

- Analyze everything in the user's knowledge vault
- Surface insights proactively during idle compute cycles
- Present them in a way that sparks curiosity without interrupting flow
- Let users explore deeper through conversation

### The "Surprise Me" Concept

A button that says: "Show me something I didn't know I needed." OSQR delivers, and users discover value they couldn't have requested. This makes OSQR feel like a companion rather than a tool - "I've been thinking about your stuff even when you weren't asking me to."

---

## Insight Types

### Taxonomy

| Type | Description | Example |
|------|-------------|---------|
| Pattern | Recurring theme across documents/conversations | "You've mentioned 'time constraints' in 7 separate documents this month" |
| Contradiction | Conflicting information detected across sources | "Your Q1 plan says 'focus on enterprise' but pitch deck targets SMB" |
| Stale Thread | Conversation or decision left unfinished | "You started discussing pricing restructure 3 weeks ago but never concluded" |
| Connection | Related concepts user hasn't linked | "Your churn research might apply to the retention strategy doc" |
| Action Item | Task or commitment surfaced from content | "You mentioned 'follow up with Sarah' in yesterday's meeting notes" |
| Anomaly | Data point that breaks the pattern | "This quarter's margins are 12% higher than average - what changed?" |
| Question | Something user should be asking but isn't | "Your launch plan has dates but no dependencies - what blocks what?" |
| Decay Alert | Information becoming stale or outdated | "Your competitor analysis is 6 months old - industry has shifted" |

---

## TypeScript Interfaces

### Core Data Structures

#### Insight

```typescript
interface Insight {
  id: string;
  type: InsightType;
  sources: InsightSource[];
  headline: string;           // Clickable summary
  preview: string;            // 1-2 sentence context
  confidence: number;         // 0-100
  relevance: number;          // 0-100, current context match
  stakes: StakesLevel;        // low | medium | high | critical
  actionable: boolean;
  category: InsightCategory;  // For user preference learning
  generatedAt: Date;
  expiresAt: Date;            // TTL for staleness
  status: 'queued' | 'surfaced' | 'engaged' | 'dismissed' | 'expired';
  feedbackData?: InsightFeedback;
}
```

#### InsightSource

```typescript
interface InsightSource {
  type: 'document' | 'chat' | 'pkv_entry' | 'calendar';
  id: string;
  title: string;
  excerpt: string;            // Relevant text snippet
  location?: string;          // Page, section, timestamp
  lastModified: Date;         // For staleness detection
  mtime?: number;             // File modification time for cache invalidation
}
```

#### InsightFeedback

```typescript
interface InsightFeedback {
  action: 'engaged' | 'dismissed' | 'ignored' | 'expired';
  timeToAction?: number;      // ms from surface to action
  followUpDepth?: number;     // How many turns of conversation
  userBehavior?: string;      // What did user do after seeing insight
  inferredReason?: string;    // Why dismissed (pattern inference)
}
```

#### UserInsightPreferences

```typescript
interface UserInsightPreferences {
  id: string;
  userId: string;
  categoryEngagement: Record<InsightCategory, number>;  // 0-1 engagement rate
  typeEngagement: Record<InsightType, number>;
  averageTimeToEngage?: number;
  preferredCategories: InsightCategory[];               // Ranked by engagement
  suppressedCategories: InsightCategory[];              // Consistently dismissed
  stakesThreshold: StakesLevel;                         // Minimum stakes to surface
  lastUpdated: Date;
  decayFactor: number;                                  // How fast old prefs fade
}
```

#### InsightQueue

```typescript
interface InsightQueue {
  userId: string;
  items: QueuedInsight[];
  maxSize: 5;                 // Hard limit
  interruptBudget: {
    remaining: number;        // Pulses left this hour
    resetAt: Date;
    defaultBudget: 3;         // Per hour
  };
  lastSurfaced?: Date;
}

interface QueuedInsight {
  insight: Insight;
  queuedAt: Date;
  priority: number;           // Computed from confidence + relevance + stakes
  surfaceCondition: 'session_start' | 'idle' | 'focus_exit' | 'on_demand';
  pulsed: boolean;            // Has bubble pulsed for this?
}
```

#### Enums and Types

```typescript
type InsightType =
  | 'pattern'
  | 'contradiction'
  | 'stale_thread'
  | 'connection'
  | 'action_item'
  | 'anomaly'
  | 'question'
  | 'decay_alert';

type InsightCategory =
  | 'clarify'       // Question could be improved
  | 'contradiction' // Conflicts with something
  | 'next_step'     // Ready to execute
  | 'recall';       // Relevant existing knowledge

type StakesLevel = 'low' | 'medium' | 'high' | 'critical';
```

---

## Document-Type Analysis

Different document types warrant different analysis approaches. Detection patterns are derived from SASE framework research.

### Chat History Analysis

| What to Find | Detection Method | Insight Output |
|--------------|------------------|----------------|
| Unfinished threads | Scan for CRP patterns: "I'll think about", "let me", "we should", open questions without answers | "You never resolved: [topic]" |
| Recurring themes | Topic clustering via embedding similarity, PageRank on concept graph | "This keeps coming up: [theme]" |
| Commitments made | Intent patterns: "I will", "I'll", "Let me", "I should" + verb | "You said you'd: [action]" |
| Decisions made | Resolution patterns: "Let's go with", "I've decided", "The answer is" | "You decided: [decision] - still valid?" |
| Pattern evolution | Prospective reflection: synthesize fragmented history into unified memory | "Your view on [X] shifted from [A] to [B]" |

### Strategy/Business Documents

| What to Find | Detection Method | Insight Output |
|--------------|------------------|----------------|
| Goal-resource mismatch | Compare goal statements against resource/timeline statements | "This timeline assumes resources you haven't allocated" |
| Missing dependencies | Graph traversal: tasks without predecessor nodes | "What needs to happen before [X] can start?" |
| Assumption gaps | Detect belief statements without validation markers | "You're assuming [X] - has that been verified?" |
| Timeline conflicts | Cross-reference person/resource assignments across dates | "Your roadmap has you in two places at once in Q2" |
| Metric gaps | Goals without success criteria patterns | "How will you know if [initiative] worked?" |

### Research/Notes

| What to Find | Detection Method | Insight Output |
|--------------|------------------|----------------|
| Unused knowledge | Track reference count: captured but never cited elsewhere | "You saved this but never applied it: [insight]" |
| Cross-topic connections | Code Knowledge Graph multi-hop traversal, embedding similarity | "This connects to your work on [other topic]" |
| Aging information | mtime monitoring + domain-specific decay rates | "This data is [X] months old - still accurate?" |
| Synthesis opportunities | Topic clustering: 3+ notes on same theme | "You have 5 notes on [topic] - want me to combine them?" |

---

## Detection Algorithms

### Commitment Detection

```typescript
function detectCommitments(text: string): Commitment[] {
  const patterns = [
    /I('ll| will) (?<action>[^.!?]+)/gi,
    /Let me (?<action>[^.!?]+)/gi,
    /I should (?<action>[^.!?]+)/gi,
    /We need to (?<action>[^.!?]+)/gi,
    /I('m going to| am going to) (?<action>[^.!?]+)/gi
  ];

  const commitments: Commitment[] = [];
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      commitments.push({
        text: match[0],
        action: match.groups?.action || '',
        position: match.index,
        resolved: false
      });
    }
  }
  return commitments;
}
```

### Contradiction Detection (Critic Agent Pattern)

```typescript
async function detectContradictions(
  sources: InsightSource[]
): Promise<Contradiction[]> {
  // Step 1: Extract claims from each source
  const claims = await Promise.all(
    sources.map(s => extractClaims(s))
  );

  // Step 2: Group claims by topic using embedding similarity
  const topicGroups = clusterByTopic(claims.flat());

  // Step 3: For each group, run critic agent
  const contradictions: Contradiction[] = [];
  for (const group of topicGroups) {
    if (group.claims.length < 2) continue;

    // Use LLM-as-Judge to validate contradiction
    const result = await criticAgent.evaluate({
      claims: group.claims,
      prompt: `Report discrepancies across sources neutrally.
               Only flag if claims are mutually exclusive.`
    });

    if (result.hasContradiction && result.confidence > 0.7) {
      contradictions.push({
        claim1: result.claim1,
        claim2: result.claim2,
        sources: result.sources,
        confidence: result.confidence
      });
    }
  }
  return contradictions;
}
```

### Connection Discovery (PageRank Pattern)

```typescript
function discoverConnections(
  knowledgeGraph: KnowledgeGraph,
  newDocument: Document
): Connection[] {
  // Step 1: Extract entities from new document
  const entities = extractEntities(newDocument);

  // Step 2: For each entity, find graph neighbors
  const connections: Connection[] = [];
  for (const entity of entities) {
    const node = knowledgeGraph.findNode(entity);
    if (!node) continue;

    // Multi-hop traversal (up to 3 hops)
    const related = knowledgeGraph.traverse(node, { maxHops: 3 });

    // Rank by PageRank centrality
    const ranked = related
      .map(r => ({ ...r, score: r.pageRank * r.pathStrength }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const r of ranked) {
      if (r.score > 0.3 && !isAlreadyLinked(newDocument, r.target)) {
        connections.push({
          from: newDocument.id,
          to: r.target.id,
          via: entity,
          strength: r.score,
          path: r.path
        });
      }
    }
  }
  return connections;
}
```

### Staleness Detection

```typescript
interface StalenessConfig {
  domainDecayRates: Record<string, number>; // days until stale
}

const DEFAULT_DECAY_RATES: Record<string, number> = {
  'competitor_analysis': 90,
  'market_research': 180,
  'financial_data': 30,
  'meeting_notes': 14,
  'strategy_doc': 365,
  'default': 180
};

function detectStaleness(
  source: InsightSource,
  config: StalenessConfig = { domainDecayRates: DEFAULT_DECAY_RATES }
): DecayAlert | null {
  const domain = classifyDomain(source);
  const decayDays = config.domainDecayRates[domain]
    || config.domainDecayRates['default'];

  const ageInDays = daysSince(source.lastModified);
  const stalenessRatio = ageInDays / decayDays;

  if (stalenessRatio > 1.0) {
    return {
      source,
      ageInDays,
      expectedFreshness: decayDays,
      urgency: stalenessRatio > 2 ? 'high' : 'medium',
      message: `This ${domain} is ${ageInDays} days old -
                industry typically refreshes every ${decayDays} days`
    };
  }
  return null;
}
```

---

## Confidence & Relevance Scoring

### Confidence Scoring

Each insight receives a confidence score (0-100) based on signal strength. OSQR follows Claude's conservative approach: abstain rather than hallucinate.

```typescript
function calculateConfidence(insight: Insight): number {
  const factors = {
    signalStrength: 0,    // How clear is the detection
    sourceReliability: 0, // How trustworthy are sources
    patternFrequency: 0,  // How often this pattern appears
    validationPass: 0     // Did critic agent confirm
  };

  // Signal strength: based on pattern match quality
  factors.signalStrength = insight.matchScore * 30;

  // Source reliability: recent + primary sources score higher
  factors.sourceReliability = insight.sources.reduce((sum, s) => {
    const recency = Math.max(0, 1 - daysSince(s.lastModified) / 365);
    const isPrimary = s.type === 'document' ? 1 : 0.7;
    return sum + (recency * isPrimary * 10);
  }, 0) / insight.sources.length;

  // Pattern frequency: 3+ occurrences = high confidence
  factors.patternFrequency = Math.min(insight.occurrences * 10, 30);

  // Validation: critic agent confirmation
  factors.validationPass = insight.criticValidated ? 20 : 0;

  const total = Object.values(factors).reduce((a, b) => a + b, 0);

  // ABSTENTION THRESHOLD: Below 50, don't surface
  return Math.min(100, total);
}

const CONFIDENCE_THRESHOLDS = {
  SURFACE: 50,           // Minimum to show user
  FEATURED: 70,          // Show prominently
  HIGH_CONFIDENCE: 90    // Lead with this
};
```

### Relevance Scoring

```typescript
function calculateRelevance(
  insight: Insight,
  context: UserContext
): number {
  const weights = {
    recency: 0.20,
    frequency: 0.15,
    contextMatch: 0.25,
    actionability: 0.20,
    novelty: 0.10,
    userPreference: 0.10
  };

  const scores = {
    recency: scoreRecency(insight.sources),
    frequency: scoreFrequency(insight),
    contextMatch: scoreContextMatch(insight, context.currentWork),
    actionability: insight.actionable ? 1 : 0.3,
    novelty: scoreNovelty(insight, context.seenInsights),
    userPreference: getUserPreferenceScore(insight, context.preferences)
  };

  return Object.entries(weights).reduce(
    (total, [key, weight]) => total + scores[key] * weight * 100,
    0
  );
}
```

### Stakes Assessment

Proactive behavior becomes intrusive when OSQR misreads task stakes. Every insight gets a stakes assessment before surfacing.

```typescript
function assessStakes(insight: Insight): StakesLevel {
  const indicators = {
    // High stakes indicators
    hasDeadline: /deadline|due|by \w+ \d+/i.test(insight.preview),
    involvesDecision: insight.type === 'contradiction' || insight.type === 'question',
    affectsMultiple: insight.sources.length > 2,
    isBlocking: /block|wait|depend/i.test(insight.preview),

    // Low stakes indicators
    isObservation: insight.type === 'pattern' && insight.occurrences < 5,
    isCurious: insight.type === 'connection' && !insight.actionable
  };

  const highCount = [
    indicators.hasDeadline,
    indicators.involvesDecision,
    indicators.affectsMultiple,
    indicators.isBlocking
  ].filter(Boolean).length;

  if (highCount >= 3) return 'critical';
  if (highCount >= 2) return 'high';
  if (highCount >= 1) return 'medium';
  return 'low';
}
```

---

## Bubble Integration

Insights surface through the Bubble interface, respecting the interrupt budget and focus modes defined in the Bubble Interface Specification.

### Surface Conditions

| Condition | When It Triggers | Insight Types |
|-----------|------------------|---------------|
| session_start | User opens OSQR, bubble has pending insights | Any queued insight |
| idle | 8-15 second pause detected (micro-break) | High relevance only |
| focus_exit | User exits Contemplate mode | Critical contradictions held during focus |
| on_demand | User clicks 'Surprise Me' or opens Insights page | All qualifying insights |

### Interrupt Budget Integration

```typescript
async function attemptSurface(
  insight: QueuedInsight,
  queue: InsightQueue
): Promise<boolean> {
  // Check budget
  if (queue.interruptBudget.remaining <= 0) {
    // Queue silently, don't pulse
    insight.pulsed = false;
    return false;
  }

  // Check stakes threshold
  const userPrefs = await getUserPreferences(queue.userId);
  if (compareStakes(insight.insight.stakes, userPrefs.stakesThreshold) < 0) {
    return false;
  }

  // Check category suppression
  if (userPrefs.suppressedCategories.includes(insight.insight.category)) {
    return false;
  }

  // Surface: pulse once, decrement budget
  await bubble.pulse({ insightId: insight.insight.id });
  queue.interruptBudget.remaining--;
  insight.pulsed = true;
  insight.insight.status = 'surfaced';

  return true;
}
```

### Focus Mode Behavior

During Contemplate mode, the bubble stays dormant. Critical insights (contradictions that would change conclusions) are held and surfaced immediately on focus exit.

```typescript
async function handleFocusExit(
  userId: string,
  heldInsights: QueuedInsight[]
): Promise<void> {
  const critical = heldInsights.filter(
    i => i.insight.stakes === 'critical' &&
         i.insight.type === 'contradiction'
  );

  if (critical.length > 0) {
    // Surface immediately with special framing
    await bubble.expandWithMessage({
      message: "Before you move on - I noticed something during your session.",
      insight: critical[0].insight
    });
  }
}
```

---

## Feedback & Learning System

OSQR learns user taste through reaction-based reranking, not explicit ratings.

### Feedback Signals

| Signal | What It Means | Learning Action |
|--------|---------------|-----------------|
| Engaged | User clicked 'Tell me more', had conversation | Boost category + type weight |
| Dismissed | User closed insight without engaging | Reduce weight, infer reason from pattern |
| Ignored | Pulsed but user never opened | Slight reduction, may be timing issue |
| Expired | TTL passed without any action | No penalty (insight may have been valid) |
| Deep engagement | 5+ turns of follow-up conversation | Strong boost, this was valuable |
| Actioned | User took action (created task, edited doc) | Maximum boost, this changed behavior |

### Preference Learning Algorithm

```typescript
async function updatePreferences(
  userId: string,
  feedback: InsightFeedback,
  insight: Insight
): Promise<void> {
  const prefs = await getUserPreferences(userId);
  const category = insight.category;
  const type = insight.type;

  // Learning rates
  const ENGAGE_BOOST = 0.1;
  const DISMISS_PENALTY = 0.05;
  const DEEP_ENGAGE_BOOST = 0.2;
  const ACTION_BOOST = 0.3;
  const DECAY_RATE = 0.01;  // Per day, prevents context rot

  // Apply decay to all preferences first
  const daysSinceUpdate = daysSince(prefs.lastUpdated);
  for (const cat of Object.keys(prefs.categoryEngagement)) {
    prefs.categoryEngagement[cat] *= Math.pow(1 - DECAY_RATE, daysSinceUpdate);
  }

  // Apply feedback signal
  switch (feedback.action) {
    case 'engaged':
      const boost = feedback.followUpDepth >= 5
        ? DEEP_ENGAGE_BOOST
        : ENGAGE_BOOST;
      prefs.categoryEngagement[category] = Math.min(1,
        (prefs.categoryEngagement[category] || 0.5) + boost);
      break;

    case 'dismissed':
      prefs.categoryEngagement[category] = Math.max(0.1,
        (prefs.categoryEngagement[category] || 0.5) - DISMISS_PENALTY);

      // Infer reason from pattern
      await inferDismissalReason(userId, insight, feedback);
      break;
  }

  // Update suppressed categories (3+ consecutive dismissals)
  if (await getConsecutiveDismissals(userId, category) >= 3) {
    if (!prefs.suppressedCategories.includes(category)) {
      prefs.suppressedCategories.push(category);
    }
  }

  // Recompute preferred categories
  prefs.preferredCategories = Object.entries(prefs.categoryEngagement)
    .sort(([,a], [,b]) => b - a)
    .map(([cat]) => cat as InsightCategory);

  prefs.lastUpdated = new Date();
  await savePreferences(prefs);
}
```

### Inferred Mentorship

When a user dismisses an insight, OSQR infers broader principles from the specific correction. This prevents repeating the same mistake.

```typescript
async function inferDismissalReason(
  userId: string,
  insight: Insight,
  feedback: InsightFeedback
): Promise<void> {
  // Collect recent dismissals of same type
  const recentDismissals = await getRecentDismissals(userId, insight.type, 5);

  if (recentDismissals.length >= 3) {
    // Ask model to infer pattern
    const inference = await llm.complete({
      prompt: `The user dismissed these ${insight.type} insights:
        ${recentDismissals.map(d => d.headline).join('\n')}

        What general rule might explain why these aren't valuable to this user?
        Propose one rule in the format: "Skip insights about [X] when [Y]"`,
      maxTokens: 100
    });

    // Store as preference rule
    await addPreferenceRule(userId, {
      type: insight.type,
      rule: inference.text,
      confidence: recentDismissals.length / 5,
      createdAt: new Date()
    });
  }
}
```

---

## Insight Generation Engine

### Input Sources

- **Personal Knowledge Vault (PKV)** - User's documents, notes, uploads
- **Chat History** - All conversations with OSQR
- **Temporal Context** - Calendar, time patterns, deadlines
- **Plugin Data** - If plugins have contributed knowledge
- **Global Knowledge Vault (GKV)** - Shared/public knowledge (if applicable)

### Analysis Triggers

| Trigger | When It Happens | Analysis Depth |
|---------|-----------------|----------------|
| On Upload | New document added to PKV | Full analysis of new doc + connections to existing |
| On Schedule | Idle compute cycles (background) | Light analysis across PKV, surface aged insights |
| On Request | 'Surprise Me' button clicked | Deep analysis, prioritize novel findings |
| On Context | Calendar event, time of day change | Relevance re-scoring based on current context |
| On Pattern | Same topic appears 3+ times | Pattern insight generation |
| On mtime | Source file modification detected | Re-parse changed files, invalidate stale insights |

### Generation Pipeline

```typescript
async function generateInsights(
  trigger: AnalysisTrigger,
  userId: string
): Promise<Insight[]> {
  const sources = await loadSources(userId, trigger);
  const insights: Insight[] = [];

  // 1. Commitment detection (stale threads, action items)
  const commitments = await detectAllCommitments(sources.chats);
  for (const c of commitments.filter(c => !c.resolved)) {
    insights.push(createInsight('stale_thread', c));
  }

  // 2. Contradiction detection (critic agent)
  const contradictions = await detectContradictions(sources.documents);
  for (const c of contradictions) {
    insights.push(createInsight('contradiction', c));
  }

  // 3. Connection discovery (knowledge graph)
  if (trigger.type === 'on_upload') {
    const connections = await discoverConnections(
      sources.knowledgeGraph,
      trigger.document
    );
    for (const c of connections) {
      insights.push(createInsight('connection', c));
    }
  }

  // 4. Staleness detection
  for (const doc of sources.documents) {
    const decay = detectStaleness(doc);
    if (decay) insights.push(createInsight('decay_alert', decay));
  }

  // 5. Pattern detection (topic clustering)
  const patterns = await detectPatterns(sources.all);
  for (const p of patterns) {
    insights.push(createInsight('pattern', p));
  }

  // 6. Score and filter
  const scored = insights.map(i => ({
    ...i,
    confidence: calculateConfidence(i),
    relevance: calculateRelevance(i, await getContext(userId)),
    stakes: assessStakes(i)
  }));

  // 7. Filter by confidence threshold
  const qualifying = scored.filter(i => i.confidence >= 50);

  // 8. Queue top insights
  return qualifying
    .sort((a, b) => (b.confidence + b.relevance) - (a.confidence + a.relevance))
    .slice(0, 10);
}
```

---

## Free Tier Architecture

### Constraints

| Aspect | Free Tier | Paid Tier |
|--------|-----------|-----------|
| Documents in memory | 5 | Unlimited |
| Insights per document | 3 | Unlimited |
| 'Surprise Me' per day | 1 | Unlimited |
| Chat history analyzed | 7 days | All time |
| Insight depth | Standard (Groq/Flash) | Deep (Sonnet/GPT-4) |
| Daily AI budget | ~$0.02-0.05 | Based on tier |

### Smart Throttle Messaging

Instead of hard cutoffs, OSQR uses graceful degradation with honest messaging:

> "I've used my deep thinking for today. I can still chat and help with quick stuff, but for another full analysis, check back tomorrow - or upgrade and I'll go deeper right now."

### Model Fallback Logic

```typescript
async function routeInsightGeneration(
  userId: string,
  trigger: AnalysisTrigger
): Promise<ModelConfig> {
  const budget = await getDailyBudget(userId);

  if (budget.remaining > 0.02) {
    // Premium model for deep analysis
    return {
      model: 'claude-sonnet',
      maxTokens: 2000,
      temperature: 0.3
    };
  } else {
    // Fallback to lightweight model
    return {
      model: 'groq-llama-70b',
      maxTokens: 500,
      temperature: 0.2,
      throttled: true
    };
  }
}
```

---

## Component Integration

### Memory Vault Connection

```typescript
// Read from PKV with privacy tier enforcement
async function loadPKVSources(userId: string): Promise<InsightSource[]> {
  const vault = await memoryVault.getVault(userId);

  return vault.entries
    .filter(e => e.privacyTier <= 'internal') // Respect privacy gates
    .map(e => ({
      type: 'pkv_entry',
      id: e.id,
      title: e.title,
      excerpt: e.content.slice(0, 500),
      lastModified: e.updatedAt,
      mtime: e.mtime
    }));
}
```

### Constitutional Framework

```typescript
// Insights respect constitutional constraints
function validateInsight(insight: Insight): boolean {
  // User Data Sovereignty: insights only from user's own data
  if (insight.sources.some(s => s.ownerId !== insight.userId)) {
    return false;
  }

  // Identity Transparency: never pretend insight came from elsewhere
  insight.attribution = 'osqr_analysis';

  // Baseline Honesty: confidence must be calibrated
  if (insight.confidence > 90 && !insight.criticValidated) {
    insight.confidence = 85; // Cap unvalidated insights
  }

  return true;
}
```

### Temporal Intelligence Connection

```typescript
// Time-based relevance scoring
async function scoreTemporalRelevance(
  insight: Insight,
  temporalContext: TemporalContext
): Promise<number> {
  let score = 0;

  // Upcoming deadline relevance
  if (insight.relatedDeadline) {
    const daysUntil = daysBetween(new Date(), insight.relatedDeadline);
    if (daysUntil <= 7) score += 30;
    else if (daysUntil <= 30) score += 15;
  }

  // Time-of-day relevance
  if (temporalContext.isWorkHours && insight.type === 'action_item') {
    score += 20;
  }

  // Day-of-week patterns
  const dayPattern = await temporalIntelligence.getDayPattern(
    insight.userId,
    temporalContext.dayOfWeek
  );
  if (dayPattern.preferredInsightTypes.includes(insight.type)) {
    score += 15;
  }

  return score;
}
```

---

## Implementation Phases

### Phase 1: Core Detection (Week 1-2)
- Implement Insight data model and TypeScript interfaces
- Build commitment detection algorithm
- Build staleness detection with mtime tracking
- Basic insight queue with max 5 items, 24h expiry

### Phase 2: Advanced Detection (Week 3-4)
- Implement contradiction detection with critic agent
- Build knowledge graph for connection discovery
- Pattern detection via topic clustering
- Confidence and relevance scoring implementation

### Phase 3: Bubble Integration (Week 5-6)
- Connect to Bubble interface states
- Implement interrupt budget (3/hour)
- Stakes assessment before surfacing
- Focus mode integration (dormant during, surface on exit)
- 'Tell me more' flow into Panel

### Phase 4: Feedback System (Week 7-8)
- Feedback tracking (dismissed/engaged/ignored/expired)
- Preference learning with decay
- Category suppression after 3 consecutive dismissals
- Inferred mentorship rule generation

### Phase 5: UI & Polish (Week 9-10)
- Insights page with card layout
- 'Surprise Me' button with animation
- User settings (on/off/quiet, budget slider, category toggles)
- Free tier messaging and upgrade prompts

---

## Success Metrics

### User Value
- Engagement rate > 30% (insights engaged vs. total surfaced)
- Dismissal rate < 50%
- 'Tell me more' conversion > 20%
- Zero complaints about interruption

### System Health
- Insights generated per active user per day: 2-5
- Queue overflow rate < 10% (insights dropped due to max 5)
- Expiration rate < 30% (insights expiring without action)
- Confidence calibration: predicted vs actual engagement within 15%

### Conversion (Free to Paid)
- Free users hitting insight limit: > 40%
- Upgrade click rate on 'Surprise Me' limit: > 10%
- Free-to-paid conversion within 30 days: > 5%

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| New document analysis | < 10 seconds | For standard doc size (< 50 pages) |
| Insight generation | < 3 seconds | After analysis complete |
| 'Surprise Me' deep scan | < 5 seconds | Across full PKV |
| Page load with insights | < 1 second | Cached insights |
| Background batch processing | < 60 seconds | Full PKV scan during idle |

---

## File Structure

```
/src/insights/
├── index.ts                    # Public exports
├── types.ts                    # All TypeScript interfaces
├── detection/
│   ├── commitments.ts          # Commitment/thread detection
│   ├── contradictions.ts       # Critic agent pattern
│   ├── connections.ts          # Knowledge graph traversal
│   ├── staleness.ts            # Decay detection
│   └── patterns.ts             # Topic clustering
├── scoring/
│   ├── confidence.ts           # Confidence calculation
│   ├── relevance.ts            # Relevance scoring
│   └── stakes.ts               # Stakes assessment
├── queue/
│   ├── manager.ts              # Queue operations
│   ├── budget.ts               # Interrupt budget
│   └── surface.ts              # Surfacing logic
├── feedback/
│   ├── tracker.ts              # Feedback signal capture
│   ├── preferences.ts          # Preference learning
│   └── inference.ts            # Inferred mentorship
├── integration/
│   ├── bubble.ts               # Bubble interface connection
│   ├── memory-vault.ts         # PKV access
│   ├── temporal.ts             # Temporal intelligence
│   └── constitutional.ts       # Privacy/honesty enforcement
├── api/
│   ├── routes.ts               # REST endpoints
│   └── handlers.ts             # Request handlers
└── __tests__/
    ├── detection.test.ts
    ├── scoring.test.ts
    ├── feedback.test.ts
    └── integration.test.ts
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial insights system design |
| 2.0 | Dec 2024 | Added TypeScript interfaces, detection algorithms, feedback mechanics, Bubble integration, SASE framework patterns |

---

## Open Questions for Future Versions

1. Should insights have user-adjustable expiration dates?
2. How do we handle insight overload for power users with 100+ documents?
3. Should users be able to 'pin' insights for later action?
4. Can insights trigger automated actions (with permission)?
5. How do shared insights work in team contexts?
6. Should plugins be able to generate custom insight types?
7. How do we prevent gaming of the preference learning system?

---

**Document Status:** Ready for VS Code Implementation
**Target:** OSQR v1.5
