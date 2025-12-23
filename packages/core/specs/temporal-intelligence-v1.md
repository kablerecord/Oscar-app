# OSQR Temporal Intelligence Specification

## Metadata
- **Version**: 1.0
- **Created**: December 19, 2024
- **Status**: Ready for Implementation
- **Dependencies**: Memory Vault (PKV/GPKV), Multi-Model Router, MCP Integration
- **Blocked By**: Multi-Model Router (for Groq/Claude routing), MCP Calendar Connection
- **Enables**: Bubble Interface, Proactive Intelligence Layer, Voice Assistant Integration

## Executive Summary

Temporal Intelligence is OSQR's ability to exist across time rather than responding only in the moment. It monitors user data sources (calendar, email, texts), extracts commitments and deadlines, infers downstream dependencies, calculates priority scores, and proactively surfaces reminders through a managed interrupt budget system. This is the core "Jarvis capability" that differentiates OSQR from reactive chatbots.

## Scope

### In Scope
- Commitment extraction from text, email, voice, and documents
- Confidence scoring system with four weighted signals
- Dependency inference using goal-based reasoning
- Priority scoring formula (urgency, importance, decay, user affinity)
- Interrupt budget system (morning digest, real-time interrupts, evening review, passive queue)
- Learning loop for user preference adaptation
- User-configurable settings (quiet hours, focus mode, quiet mode override)
- Escalation logic for budget overflow

### Out of Scope (Deferred)
- Constitutional privacy layer defining data source permissions and consent
- Browser history monitoring integration
- Full voice conversation monitoring (v2)
- Cross-device sync of interrupt state
- Team/family shared calendars
- Integration with third-party task managers (Todoist, Asana, etc.)

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    OSQR CORE                                │
├─────────────────────────────────────────────────────────────┤
│  Constitutional Layer (existing)                            │
│  ├── Privacy rules (what can be monitored) [DEFERRED]      │
│  ├── Proactivity rules (when to interrupt)                 │
│  └── Honesty tiers (how direct to be about concerns)       │
├─────────────────────────────────────────────────────────────┤
│  Temporal Intelligence Layer (THIS SPEC)                    │
│  ├── Input Classifier                                      │
│  ├── Commitment Extractor                                  │
│  ├── Validation Judge                                      │
│  ├── Dependency Inferrer                                   │
│  ├── Priority Scorer                                       │
│  ├── Interrupt Budget Manager                              │
│  └── Learning Loop                                         │
├─────────────────────────────────────────────────────────────┤
│  Memory Vault (existing, enhanced)                          │
│  ├── PKV: Personal commitments, patterns, preferences      │
│  ├── Temporal Memory: What was promised when               │
│  └── Outcome Memory: What happened after reminders         │
├─────────────────────────────────────────────────────────────┤
│  Interface Layer                                            │
│  ├── Bubble (proactive suggestions) [SEPARATE SPEC]        │
│  ├── Calendar integration                                  │
│  └── Notification system                                   │
└─────────────────────────────────────────────────────────────┘
```

### Core Data Structures

```typescript
// Commitment extracted from any source
interface Commitment {
  id: string;
  commitment_text: string;           // Exact quote from source
  who: string;                       // Person responsible
  what: string;                      // Action required
  when: TemporalReference;           // Date/time info
  source: CommitmentSource;
  confidence: number;                // 0-1 extraction confidence
  reasoning: string;                 // Why classified this way
  created_at: Date;
  validated: boolean;
  validation_adjustments?: ValidationResult;
  dependencies?: DependencyChain;
}

interface TemporalReference {
  raw_text: string;                  // "next week", "Friday", "June 15"
  parsed_date?: Date;                // If resolvable to specific date
  is_vague: boolean;                 // true for "soon", "next week"
  urgency_category: 'TODAY' | 'TOMORROW' | 'THIS_WEEK' | 'THIS_MONTH' | 'LATER';
}

interface CommitmentSource {
  type: 'email' | 'text' | 'voice' | 'document' | 'calendar' | 'manual';
  source_id: string;                 // Reference to original
  extracted_at: Date;
}

interface ValidationResult {
  is_actionable: boolean;
  time_reference: 'future' | 'past' | 'hypothetical';
  conflicts_with?: string[];         // IDs of conflicting calendar items
  adjusted_confidence: number;
  judge_reasoning: string;
}

interface DependencyChain {
  primary_event: string;             // "wedding in Austin"
  inferred_dependencies: Dependency[];
}

interface Dependency {
  action: string;                    // "book flight"
  confidence: number;                // 0.95 for travel, 0.60 for gift
  suggested_deadline?: Date;
  status: 'pending' | 'suggested' | 'scheduled' | 'completed' | 'dismissed';
}

// Priority scoring
interface PriorityScore {
  commitment_id: string;
  total_score: number;               // 0-1 weighted average
  components: {
    urgency: number;                 // 0-1
    importance: number;              // 0-1
    decay: number;                   // 0-1
    user_affinity: number;           // 0-1
  };
  calculated_at: Date;
}

// Interrupt budget tracking
interface InterruptBudget {
  user_id: string;
  date: string;                      // YYYY-MM-DD
  morning_digest_sent: boolean;
  morning_digest_items: string[];    // Commitment IDs
  realtime_interrupts_used: number;
  realtime_interrupt_max: number;    // Default 2, learnable
  evening_review_enabled: boolean;
  evening_review_sent: boolean;
  forced_interrupts: string[];       // Safety valve items
}

// User preferences (learned and configured)
interface TemporalPreferences {
  user_id: string;

  // Configured
  quiet_hours_start: string;         // "21:00"
  quiet_hours_end: string;           // "07:00"
  quiet_hours_critical_exception: boolean;
  critical_categories: string[];     // ["financial", "health", "family"]
  focus_mode_reduce_suggestions: boolean;
  focus_mode_sync_calendar: boolean;
  focus_mode_batch_until_end: boolean;

  // Learned
  preferred_digest_time: string;     // Learned from engagement
  realtime_tolerance: number;        // Adjusted based on dismissal rate
  category_weights: Record<string, number>;  // Learned importance by category
  typical_action_delay: Record<string, number>;  // Hours until user acts, by type
}

// Learning loop tracking
interface NotificationOutcome {
  commitment_id: string;
  notification_type: 'digest' | 'realtime' | 'evening' | 'passive';
  surfaced_at: Date;
  user_engaged: boolean;
  engagement_type?: 'opened' | 'tapped' | 'acted' | 'dismissed' | 'snoozed';
  time_to_engagement?: number;       // Milliseconds
  explicit_feedback?: 'stop_this_type' | 'more_like_this';
}
```

### Key Algorithms

#### Confidence Scoring

```typescript
function calculateConfidence(
  extraction: CommitmentExtraction,
  validation: ValidationResult,
  retrievalMatch: boolean
): number {
  const COT_WEIGHT = 0.25;
  const SCHEMA_WEIGHT = 0.25;
  const RETRIEVAL_WEIGHT = 0.25;
  const JUDGE_WEIGHT = 0.25;

  // 1. CoT Self-Doubt Signal
  // Parse reasoning trace for hedging language
  const hedgingPatterns = /might be|possibly|not sure|unclear|maybe|could be/gi;
  const hedgingMatches = (extraction.reasoning.match(hedgingPatterns) || []).length;
  const cotScore = Math.max(0, 1 - (hedgingMatches * 0.15));

  // 2. Schema Validation Pass
  // Did extraction fit expected structure with all fields?
  const schemaScore = calculateSchemaCompleteness(extraction);

  // 3. Retrieval Grounding
  // Was this corroborated by calendar/email/text data?
  const retrievalScore = retrievalMatch ? 0.85 : 0.40;

  // 4. Judge Model Validation
  const judgeScore = validation.adjusted_confidence;

  return (
    (cotScore * COT_WEIGHT) +
    (schemaScore * SCHEMA_WEIGHT) +
    (retrievalScore * RETRIEVAL_WEIGHT) +
    (judgeScore * JUDGE_WEIGHT)
  );
}

function calculateSchemaCompleteness(extraction: CommitmentExtraction): number {
  let score = 0;
  const fields = ['who', 'what', 'when', 'commitment_text'];

  for (const field of fields) {
    if (extraction[field] && extraction[field].trim() !== '') {
      score += 0.25;
    }
  }

  // Bonus for specific (non-vague) date
  if (extraction.when && !extraction.when.is_vague) {
    score = Math.min(1, score + 0.1);
  }

  return score;
}
```

#### Priority Scoring

```typescript
function calculatePriorityScore(
  commitment: Commitment,
  userPrefs: TemporalPreferences,
  currentDate: Date
): PriorityScore {
  const URGENCY_WEIGHT = 0.4;
  const IMPORTANCE_WEIGHT = 0.3;
  const DECAY_WEIGHT = 0.2;
  const AFFINITY_WEIGHT = 0.1;

  // 1. Urgency (0-1) based on time until event
  const urgency = calculateUrgency(commitment.when, currentDate);

  // 2. Importance (0-1) based on category
  const importance = calculateImportance(commitment, userPrefs);

  // 3. Decay (0-1) based on how long we've known without surfacing
  const decay = calculateDecay(commitment.created_at, currentDate);

  // 4. User Affinity (0-1) based on past behavior with this type
  const affinity = calculateAffinity(commitment, userPrefs);

  const total = (
    (urgency * URGENCY_WEIGHT) +
    (importance * IMPORTANCE_WEIGHT) +
    (decay * DECAY_WEIGHT) +
    (affinity * AFFINITY_WEIGHT)
  );

  return {
    commitment_id: commitment.id,
    total_score: total,
    components: { urgency, importance, decay, user_affinity: affinity },
    calculated_at: currentDate
  };
}

function calculateUrgency(when: TemporalReference, now: Date): number {
  switch (when.urgency_category) {
    case 'TODAY': return 1.0;
    case 'TOMORROW': return 0.85;
    case 'THIS_WEEK': return 0.7;
    case 'THIS_MONTH': return 0.4;
    case 'LATER': return 0.1;
    default: return 0.3;  // Vague/unknown
  }
}

function calculateImportance(
  commitment: Commitment,
  prefs: TemporalPreferences
): number {
  // Check for category-specific learned weights first
  const category = inferCategory(commitment);
  if (prefs.category_weights[category]) {
    return prefs.category_weights[category];
  }

  // Default weights by category
  const defaults: Record<string, number> = {
    'financial': 1.0,
    'legal': 1.0,
    'family': 1.0,
    'health': 1.0,
    'work_client': 0.7,
    'work_internal': 0.6,
    'personal': 0.4,
    'social': 0.4,
    'unknown': 0.3
  };

  return defaults[category] || 0.3;
}

function calculateDecay(createdAt: Date, now: Date): number {
  const daysSinceDetection = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceDetection < 1) return 1.0;
  if (daysSinceDetection < 3) return 0.7;
  if (daysSinceDetection < 7) return 0.4;
  return 0.1;
}

function calculateAffinity(
  commitment: Commitment,
  prefs: TemporalPreferences
): number {
  const category = inferCategory(commitment);

  // Look up historical engagement rate for this category
  // This would query NotificationOutcome records
  // Default to 0.5 if no history
  return prefs.category_weights[`${category}_affinity`] || 0.5;
}
```

#### Interrupt Budget Manager

```typescript
async function processInterruptQueue(
  userId: string,
  prioritizedItems: PriorityScore[],
  budget: InterruptBudget,
  prefs: TemporalPreferences
): Promise<InterruptDecision[]> {
  const decisions: InterruptDecision[] = [];
  const now = new Date();

  // Check quiet hours
  if (isInQuietHours(now, prefs)) {
    // Only process critical items if exception enabled
    if (!prefs.quiet_hours_critical_exception) {
      return [];  // Nothing surfaces during quiet hours
    }
    prioritizedItems = prioritizedItems.filter(
      item => isCritical(item, prefs.critical_categories)
    );
  }

  // Check focus mode
  if (prefs.focus_mode_sync_calendar && await isInFocusBlock(userId)) {
    if (prefs.focus_mode_batch_until_end) {
      // Store for later, don't surface now
      return prioritizedItems.map(item => ({
        commitment_id: item.commitment_id,
        action: 'BATCH_UNTIL_FOCUS_END',
        reason: 'User in focus block'
      }));
    }
  }

  // Sort by priority score descending
  const sorted = [...prioritizedItems].sort((a, b) => b.total_score - a.total_score);

  for (const item of sorted) {
    const commitment = await getCommitment(item.commitment_id);

    // Determine appropriate action based on score and budget
    if (item.total_score >= 0.85 &&
        item.components.urgency === 1.0 &&
        budget.realtime_interrupts_used < budget.realtime_interrupt_max) {

      decisions.push({
        commitment_id: item.commitment_id,
        action: 'REALTIME_INTERRUPT',
        reason: 'High priority, urgent today'
      });
      budget.realtime_interrupts_used++;

    } else if (item.total_score >= 0.85 &&
               item.components.urgency === 1.0 &&
               budget.realtime_interrupts_used >= budget.realtime_interrupt_max) {

      // Safety valve: force interrupt anyway for truly urgent items
      decisions.push({
        commitment_id: item.commitment_id,
        action: 'FORCED_INTERRUPT',
        reason: 'Budget exceeded but urgency requires surfacing'
      });
      budget.forced_interrupts.push(item.commitment_id);

    } else if (item.total_score >= 0.70) {
      decisions.push({
        commitment_id: item.commitment_id,
        action: 'SUGGEST_ONE_TAP',
        reason: 'High confidence, suggest with easy action'
      });

    } else if (item.total_score >= 0.50) {
      decisions.push({
        commitment_id: item.commitment_id,
        action: 'BUBBLE_NOTIFICATION',
        reason: 'Medium confidence, surface in bubble'
      });

    } else {
      decisions.push({
        commitment_id: item.commitment_id,
        action: 'STORE_SILENT',
        reason: 'Low confidence, keep in passive queue'
      });
    }
  }

  // Bundle forced interrupts if too many
  if (budget.forced_interrupts.length > 2) {
    return bundleInterrupts(decisions, budget.forced_interrupts);
  }

  return decisions;
}

interface InterruptDecision {
  commitment_id: string;
  action: 'REALTIME_INTERRUPT' | 'FORCED_INTERRUPT' | 'SUGGEST_ONE_TAP' |
          'BUBBLE_NOTIFICATION' | 'STORE_SILENT' | 'BATCH_UNTIL_FOCUS_END' |
          'BUNDLED_URGENT';
  reason: string;
}
```

#### Dependency Inference

```typescript
async function inferDependencies(
  commitment: Commitment,
  userContext: UserContext
): Promise<DependencyChain> {
  // Goal-based reasoning prompt
  const prompt = `
    Given this commitment: ${commitment.what}
    Event details: ${commitment.commitment_text}
    User location: ${userContext.location}
    User work schedule: ${userContext.workPattern}

    What downstream actions are typically required to fulfill this commitment?

    For each dependency, provide:
    - action: What needs to be done
    - confidence: How certain (0-1) this is needed given the context
    - typical_lead_time: How far in advance this usually needs to happen

    Consider the user's specific context. For example:
    - If event is in user's city, travel may not be needed
    - If user has contacts in event city, lodging confidence is lower
    - If event is on a workday, time off may be needed

    Return as JSON array.
  `;

  const response = await llm.complete(prompt);
  const dependencies = JSON.parse(response);

  // Enrich with just-in-time retrieval
  for (const dep of dependencies) {
    // Check if already scheduled
    const existing = await checkCalendarForAction(dep.action, commitment.when);
    if (existing) {
      dep.status = 'scheduled';
      dep.confidence = 1.0;  // Already done
    } else {
      dep.status = 'pending';
    }

    // Calculate suggested deadline based on lead time
    if (commitment.when.parsed_date && dep.typical_lead_time) {
      dep.suggested_deadline = subtractDays(
        commitment.when.parsed_date,
        dep.typical_lead_time
      );
    }
  }

  return {
    primary_event: commitment.what,
    inferred_dependencies: dependencies
  };
}
```

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `/src/temporal-intelligence/` directory structure
- [ ] Implement all TypeScript interfaces from Core Data Structures
- [ ] Set up database tables for commitments, priorities, budgets, outcomes
- [ ] Connect to Google Calendar via MCP
- [ ] Implement basic input classifier (Switch node pattern)
- [ ] Create voice transcription pipeline integration point

### Phase 2: Extraction & Validation
- [ ] Build commitment extraction prompt for Groq/Llama
- [ ] Implement schema validation and completeness scoring
- [ ] Build judge model validation layer
- [ ] Implement confidence scoring algorithm
- [ ] Create commitment storage and retrieval functions
- [ ] Build temporal reference parser (vague vs specific dates)

### Phase 3: Intelligence Layer
- [ ] Implement priority scoring formula
- [ ] Build dependency inference with goal-based reasoning
- [ ] Create just-in-time retrieval for dependency enrichment
- [ ] Implement category inference for importance scoring
- [ ] Build user context loader for personalized inference

### Phase 4: Interrupt Management
- [ ] Implement interrupt budget tracking
- [ ] Build morning digest generator
- [ ] Create real-time interrupt decision logic
- [ ] Implement evening review (optional feature)
- [ ] Build passive queue storage and retrieval
- [ ] Implement budget overflow escalation and bundling
- [ ] Create quiet hours and focus mode checks

### Phase 5: Learning Loop
- [ ] Implement notification outcome tracking
- [ ] Build preference adjustment algorithms
- [ ] Create digest timing optimization
- [ ] Implement category weight learning
- [ ] Build realtime tolerance adjustment

### Phase 6: User Settings
- [ ] Create settings UI schema
- [ ] Implement quiet hours configuration
- [ ] Build focus mode sync with calendar
- [ ] Create quiet mode manual override
- [ ] Implement voice command: "OSQR, go quiet until tomorrow"

### Phase 7: Testing & Integration
- [ ] Unit tests for confidence scoring
- [ ] Unit tests for priority scoring
- [ ] Integration tests for extraction pipeline
- [ ] End-to-end test: email → commitment → calendar suggestion
- [ ] Load test for budget manager with high-volume queues
- [ ] Test quiet hours boundary conditions
- [ ] Test focus mode calendar sync

## API Contracts

### Inputs

```typescript
// Triggered by schedule (e.g., every morning at 7am)
interface DailyDigestTrigger {
  user_id: string;
  trigger_time: Date;
}

// Triggered by new data source content
interface ContentIngestionTrigger {
  user_id: string;
  source_type: 'email' | 'text' | 'voice' | 'document' | 'calendar';
  content: string;
  source_id: string;
  received_at: Date;
}

// Triggered by user requesting passive queue
interface PassiveQueueRequest {
  user_id: string;
  filter?: {
    category?: string;
    urgency?: string;
    min_priority?: number;
  };
}

// User configuration update
interface PreferencesUpdate {
  user_id: string;
  preferences: Partial<TemporalPreferences>;
}
```

### Outputs

```typescript
// Sent to Bubble Interface
interface BubbleSuggestion {
  id: string;
  type: 'realtime' | 'digest_item' | 'one_tap' | 'notification';
  commitment: Commitment;
  priority_score: number;
  suggested_action: string;          // "Add to calendar", "Set reminder"
  one_tap_payload?: CalendarEvent;   // Pre-filled if one-tap
  dismiss_action: string;
}

// Morning digest payload
interface MorningDigest {
  user_id: string;
  date: string;
  items: BubbleSuggestion[];
  summary: string;                   // "Here's what needs attention today"
}

// Calendar event creation (auto or suggested)
interface CalendarEventCreate {
  title: string;
  start: Date;
  end: Date;
  source_commitment_id: string;
  auto_created: boolean;             // true if confidence > 0.85
  description?: string;
}

// Learning loop event
interface OutcomeRecord {
  commitment_id: string;
  notification_id: string;
  outcome: NotificationOutcome;
}
```

## Configuration

### Environment Variables

```env
# Model routing
OSQR_TEMPORAL_EXTRACTION_MODEL=groq/llama-3.1-8b
OSQR_TEMPORAL_JUDGE_MODEL=groq/llama-3.1-70b
OSQR_TEMPORAL_INFERENCE_MODEL=claude-sonnet

# Thresholds
OSQR_TEMPORAL_AUTO_EXECUTE_THRESHOLD=0.85
OSQR_TEMPORAL_SUGGEST_THRESHOLD=0.70
OSQR_TEMPORAL_BUBBLE_THRESHOLD=0.50

# Budget defaults
OSQR_TEMPORAL_DEFAULT_REALTIME_MAX=2
OSQR_TEMPORAL_DEFAULT_DIGEST_SIZE=5
OSQR_TEMPORAL_DIGEST_TIME=07:00

# Calendar integration
OSQR_CALENDAR_MCP_SERVER=google-calendar
OSQR_CALENDAR_WRITE_ENABLED=true
```

### Default Values

| Parameter | Default | Description |
|-----------|---------|-------------|
| `realtime_interrupt_max` | 2 | Max real-time interrupts per day |
| `digest_size` | 5 | Items in morning digest |
| `digest_time` | 07:00 | When to send morning digest |
| `quiet_hours_start` | 21:00 | Start of quiet hours |
| `quiet_hours_end` | 07:00 | End of quiet hours |
| `critical_exception` | true | Allow critical items in quiet hours |
| `focus_mode_enabled` | true | Respect calendar focus blocks |
| `evening_review_enabled` | false | Optional evening review |
| `evening_review_time` | 20:00 | When to send evening review |

## Error Handling

### Failure Modes

| Scenario | Response | Fallback |
|----------|----------|----------|
| Calendar API unavailable | Log error, skip calendar-dependent features | Use cached calendar data up to 24h old |
| Extraction model timeout | Retry once, then queue for later | Store raw content for batch processing |
| Judge model disagrees strongly | Flag for manual review | Use extraction confidence only (lower threshold) |
| Dependency inference fails | Continue without dependencies | Surface commitment without chain |
| User has no engagement history | Use default weights | Log for learning once data available |
| Budget tracking DB unavailable | Allow all notifications | Reset budget at next successful connection |
| Quiet hours calculation error | Treat as not in quiet hours | Log error, don't block notifications |

## Success Criteria

1. [ ] **Extraction accuracy**: >80% of manually-verified commitments correctly extracted from test email corpus
2. [ ] **False positive rate**: <10% of extractions are casual mentions misclassified as commitments
3. [ ] **Confidence calibration**: Items scored >0.85 are actionable >90% of the time
4. [ ] **Dependency relevance**: >70% of inferred dependencies rated "useful" by test users
5. [ ] **Budget respect**: Real-time interrupts never exceed configured max except via safety valve
6. [ ] **Learning convergence**: User preference weights stabilize within 2 weeks of normal usage
7. [ ] **Latency**: Extraction + validation + scoring completes in <2 seconds for single item
8. [ ] **End-to-end test**: "Wedding in Austin June 15" email → travel dependency suggested within 24 hours

## Open Questions

- [ ] **Privacy consent flow**: How does user explicitly consent to email/text monitoring? (Deferred to Constitutional spec)
- [ ] **Cross-platform sync**: How does interrupt budget sync across web/mobile/VS Code? (Deferred to v2)
- [ ] **Shared calendars**: How to handle family/team calendars where user isn't the owner?
- [ ] **Conflicting commitments**: When user double-books, what's the escalation path?
- [ ] **Time zone handling**: How to handle commitments with ambiguous time zones?
- [ ] **Snooze behavior**: How long can items be snoozed? Infinite? Decay penalty?
- [ ] **Voice command scope**: What other voice commands beyond "go quiet"?

## Research Foundation

This specification was informed by the following sources from the OSQR NotebookLM knowledge vault:

- **n8n Workflow Automation**: Switch node patterns, Schedule Trigger, multimodal input handling
- **Multi-Agent Systems (MAS)**: Gatekeeper pattern for intent analysis and filtering
- **BMAD Method**: Task decomposition, story files, context-engineered development
- **SASE Framework**: ACE/AEE environments, Consultation Request Packs (CRPs)
- **Google Memory Bank**: Prospective/retrospective reflection, RL-based reranking
- **MCP Architecture**: Calendar integration patterns, tool standardization
- **LLM-as-Judge**: Secondary validation model pattern for confidence calibration
- **Goal-Based Agents**: Future consequence reasoning, just-in-time retrieval

## Appendices

### A: Extraction Prompt Template

```
You are extracting commitments from user communications.

INPUT:
${content}

Extract any commitments, deadlines, or scheduled events. For each, return:
- commitment_text: Exact quote from the source
- who: Person responsible (use "user" if the user themselves)
- what: Action required (verb + object)
- when: Date/time reference (exact text, even if vague like "next week")
- confidence: Your certainty this is actionable (0-1)
- reasoning: Why you classified it this way

RULES:
- Only extract FUTURE commitments, not past events
- Distinguish between firm commitments ("I'll send it Friday") and casual mentions ("Friday works")
- If someone says "let's" or "we should", that's a potential commitment
- Calendar invites are always commitments
- "By [date]" indicates a deadline

Return as JSON array. Empty array if no commitments found.
```

### B: Example Payloads

```json
// Extracted commitment
{
  "id": "comm_abc123",
  "commitment_text": "I'll send you the proposal by Friday",
  "who": "user",
  "what": "send proposal",
  "when": {
    "raw_text": "by Friday",
    "parsed_date": "2024-12-20T17:00:00Z",
    "is_vague": false,
    "urgency_category": "THIS_WEEK"
  },
  "source": {
    "type": "email",
    "source_id": "email_xyz789",
    "extracted_at": "2024-12-18T10:30:00Z"
  },
  "confidence": 0.92,
  "reasoning": "Clear commitment language 'I'll send', specific deadline 'by Friday', actionable deliverable 'proposal'",
  "created_at": "2024-12-18T10:30:00Z",
  "validated": true
}

// Priority score
{
  "commitment_id": "comm_abc123",
  "total_score": 0.78,
  "components": {
    "urgency": 0.7,
    "importance": 0.7,
    "decay": 1.0,
    "user_affinity": 0.8
  },
  "calculated_at": "2024-12-18T10:31:00Z"
}

// Morning digest
{
  "user_id": "user_kable",
  "date": "2024-12-19",
  "items": [
    {
      "id": "notif_001",
      "type": "digest_item",
      "commitment": { /* ... */ },
      "priority_score": 0.78,
      "suggested_action": "Set reminder to send proposal",
      "dismiss_action": "dismiss_notif_001"
    }
  ],
  "summary": "Here's what needs attention today: 1 deadline approaching"
}
```

### C: File Structure

```
/src/temporal-intelligence/
├── index.ts                    # Public exports
├── types.ts                    # All interfaces
├── extraction/
│   ├── classifier.ts           # Input type classification
│   ├── extractor.ts            # Commitment extraction
│   ├── validator.ts            # Judge model validation
│   └── prompts.ts              # LLM prompt templates
├── scoring/
│   ├── confidence.ts           # Confidence scoring
│   ├── priority.ts             # Priority scoring
│   └── affinity.ts             # User affinity calculation
├── inference/
│   ├── dependencies.ts         # Dependency chain inference
│   └── context.ts              # User context loader
├── budget/
│   ├── manager.ts              # Interrupt budget logic
│   ├── digest.ts               # Morning/evening digest
│   └── escalation.ts           # Overflow handling
├── learning/
│   ├── outcomes.ts             # Track notification outcomes
│   └── preferences.ts          # Adjust user preferences
├── settings/
│   ├── config.ts               # Configuration management
│   └── quiet-mode.ts           # Quiet hours/focus mode
├── integrations/
│   ├── calendar.ts             # MCP calendar connection
│   └── notifications.ts        # Bubble interface connection
└── __tests__/
    ├── extraction.test.ts
    ├── scoring.test.ts
    ├── budget.test.ts
    └── e2e.test.ts
```

---

*Document Version: 1.0*
*Created: December 19, 2024*
*Status: Ready for VS Code Implementation*
