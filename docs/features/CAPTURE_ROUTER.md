# OSQR Capture Router Specification
## Version 1.0 | Intelligent Reminder and Note Routing

**Component:** Capture Router
**Version:** 1.0
**Status:** Ready for Implementation
**Target Release:** V1.5
**Dependencies:** Memory Vault, Temporal Intelligence, Calendar Integration, Constitutional Framework
**Priority:** V1.5 Feature

---

## Executive Summary

The Capture Router enables users to offload thoughts, reminders, and notes to OSQR using natural language - without specifying where or how to store them. Users say "remind me," "note this," or "don't forget" and OSQR intelligently routes the capture to the appropriate subsystem: calendar, memory vault, action items, or contextual triggers.

**Core Principle:** Input method is a detail. Intent is the interface.

---

## Problem Statement

### Current Assistant Limitation

```
User: "Remind me to ask Sarah about the Q2 projections when I see her."
Siri: "When would you like to be reminded?"
User: "When I see her."
Siri: "I can set a reminder for a specific time. What time?"
User: [gives up, forgets to ask Sarah]
```

### OSQR Solution

```
User: "Remind me to ask Sarah about the Q2 projections when I see her."

Oscar: "Got it - I'll surface that when you have something with Sarah
        on the calendar."

[Three days later, 30 minutes before Sarah meeting]

Oscar: "You wanted to ask Sarah about Q2 projections."
```

---

## Design Philosophy

### Voice-First, Input-Agnostic

The Capture Router is designed for a voice-first future. The current text interface is simply the first supported modality. The system receives natural language, classifies intent, and routes appropriately - regardless of whether that language was typed, spoken, or forwarded.

### No Buttons, No Mode Switching

Users don't press a "capture" button or switch modes. They speak naturally:
- "Remind me..."
- "Note this..."
- "Don't let me forget..."
- "Save this for later..."
- "When I talk to [person], ask about..."

OSQR recognizes the intent pattern and handles routing invisibly.

### The Jarvis Standard

Tony Stark doesn't specify which system should handle his request. He states what he needs, and Jarvis determines optimal handling. OSQR operates the same way.

---

## Architecture

### System Position

```
┌─────────────────────────────────────────────────────────────────────┐
│                      User Input (Any Modality)                       │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│   │   Text   │ │  Voice   │ │  Share   │ │  Quick   │              │
│   │  (Chat)  │ │ (Future) │ │(Forward) │ │  (Note)  │              │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘              │
│        │            │            │            │                     │
│        └────────────┴────────────┴────────────┘                     │
│                           │                                          │
│                           ▼                                          │
│              ┌────────────────────────┐                              │
│              │    CAPTURE ROUTER      │ ◄── NEW COMPONENT            │
│              │    (Gatekeeper Agent)  │                              │
│              └───────────┬────────────┘                              │
│                          │                                           │
│         ┌────────────────┼────────────────┐                         │
│         │                │                │                         │
│         ▼                ▼                ▼                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                     │
│   │ Calendar │    │  Memory  │    │ Context  │                     │
│   │ Trigger  │    │  Vault   │    │ Trigger  │                     │
│   └──────────┘    └──────────┘    └──────────┘                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Data Flow

```
User says: "Remind me to ask Sarah about Q2 projections"
         │
         ▼
┌─────────────────────────────────────────────────┐
│              CAPTURE ROUTER PIPELINE             │
│                                                  │
│  1. Intent Classification                        │
│     └─ Type: Reminder                            │
│     └─ Content: "ask Sarah about Q2 projections" │
│                                                  │
│  2. Trigger Resolution                           │
│     └─ Person reference: "Sarah"                 │
│     └─ No time specified                         │
│     └─ → Event-based trigger                     │
│                                                  │
│  3. Context Extraction                           │
│     └─ "this" → resolved from conversation       │
│     └─ "Q2 projections" → entity tagged          │
│                                                  │
│  4. Destination Routing                          │
│     └─ Calendar integration: find Sarah events   │
│     └─ Memory Vault: store semantic content      │
│     └─ Trigger system: set event-based surface   │
│                                                  │
│  5. Confirmation                                 │
│     └─ "Got it - I'll surface that when you     │
│         have something with Sarah on calendar."  │
└─────────────────────────────────────────────────┘
         │
         ▼
Stored in Memory Vault + Calendar trigger active
```

---

## Intent Classification

### Capture Intent Patterns

The Capture Router recognizes natural language patterns that indicate capture intent:

| Pattern Type | Examples | Classification |
|--------------|----------|----------------|
| **Reminder** | "Remind me...", "Don't let me forget...", "I need to remember..." | `reminder` |
| **Note** | "Note this...", "Save this...", "Write this down..." | `note` |
| **Action** | "I need to...", "I should...", "Make sure I..." | `action_item` |
| **Question** | "Ask [person] about...", "Find out...", "Check on..." | `deferred_question` |
| **Follow-up** | "Get back to [person] about...", "Circle back on..." | `follow_up` |

### Intent Schema

```typescript
interface CaptureIntent {
  id: string;
  userId: string;

  // Classification
  type: 'reminder' | 'note' | 'action_item' | 'deferred_question' | 'follow_up';
  confidence: number;  // 0-100

  // Content
  rawInput: string;
  extractedContent: string;
  entities: ExtractedEntity[];

  // Trigger
  triggerType: 'time' | 'event' | 'context' | 'manual';
  triggerCondition: TriggerCondition;

  // Source
  sourceInterface: 'web' | 'mobile' | 'voice' | 'vscode';
  sourceConversationId: string;
  capturedAt: Date;

  // Status
  status: 'pending' | 'triggered' | 'completed' | 'expired' | 'dismissed';
  surfacedAt?: Date;
  completedAt?: Date;
}

interface ExtractedEntity {
  type: 'person' | 'project' | 'topic' | 'date' | 'location';
  value: string;
  confidence: number;
}
```

---

## Trigger Resolution

### The Three Trigger Types

Based on NotebookLM research, the Capture Router resolves ambiguous temporal language into three trigger types:

#### 1. Time-Based Triggers

Resolved via temporal grounding - OSQR injects current timestamp and calculates concrete values.

| User Says | Resolution | Trigger |
|-----------|------------|---------|
| "Tomorrow morning" | Current: Monday 10pm → Tuesday 8am | `2024-12-17T08:00:00` |
| "Next week" | Current: Dec 16 → Dec 23 | `2024-12-23T09:00:00` |
| "In an hour" | Current: 3:45pm → 4:45pm | `2024-12-16T16:45:00` |
| "End of day" | User's typical EOD from patterns | `2024-12-16T17:30:00` |

#### 2. Event-Based Triggers

Resolved via calendar tool orchestration - OSQR queries calendar for matching events.

| User Says | Resolution | Trigger |
|-----------|------------|---------|
| "When I see Sarah" | Find next event with "Sarah" | `event:sarah_meeting_123` |
| "Before my next meeting" | Find next calendar event | `event:next - 15min` |
| "After the board call" | Find "board" event | `event:board_call_456 + 5min` |
| "Next time I'm at the office" | Location-based event | `event:location:office` |

#### 3. Context-Based Triggers

Resolved via Memory Vault + just-in-time retrieval - OSQR monitors active work context.

| User Says | Resolution | Trigger |
|-----------|------------|---------|
| "When I'm back on that project" | Monitor for project file/topic activity | `context:project_voicequote` |
| "Next time this comes up" | Semantic similarity to current topic | `context:topic_embedding` |
| "When I'm working on the book" | Monitor for book-related activity | `context:project_fourth_gen` |

### Trigger Resolution Logic

```typescript
async function resolveTrigger(
  intent: CaptureIntent,
  context: ConversationContext
): Promise<TriggerCondition> {

  // Step 1: Check for explicit time
  const timeMatch = extractTimeReference(intent.rawInput);
  if (timeMatch && timeMatch.confidence > 0.8) {
    return {
      type: 'time',
      value: calculateAbsoluteTime(timeMatch, context.currentTime),
      confidence: timeMatch.confidence
    };
  }

  // Step 2: Check for person/event reference
  const personMatch = extractPersonReference(intent.rawInput);
  if (personMatch && personMatch.confidence > 0.7) {
    const calendarEvent = await findNextEventWith(personMatch.value);
    if (calendarEvent) {
      return {
        type: 'event',
        value: calendarEvent.id,
        eventTime: calendarEvent.startTime,
        surfaceOffset: -15 * 60 * 1000, // 15 minutes before
        confidence: personMatch.confidence
      };
    }
  }

  // Step 3: Check for project/context reference
  const contextMatch = extractContextReference(intent.rawInput, context);
  if (contextMatch && contextMatch.confidence > 0.6) {
    return {
      type: 'context',
      value: contextMatch.projectId || contextMatch.topicEmbedding,
      confidence: contextMatch.confidence
    };
  }

  // Step 4: Ambiguous - need clarification
  return {
    type: 'manual',
    needsClarification: true,
    suggestedInterpretation: inferBestGuess(intent, context)
  };
}
```

---

## Confidence Thresholds

### When to Act vs. Clarify

Based on the SASE framework research (MentorScripts, CRPs), the Capture Router uses explicit confidence thresholds:

| Confidence | Action | Example |
|------------|--------|---------|
| **90-100%** | Act immediately, report after | "Remind me tomorrow at 9am" |
| **70-89%** | Act, confirm interpretation | "Remind me about this when I see Sarah" → "Got it - I'll surface when you meet with Sarah Chen." |
| **50-69%** | Suggest interpretation, wait for confirmation | "Remind me later" → "When would be good - this evening, or sometime this week?" |
| **Below 50%** | Elicit clarification | "Remind me about this" + no context → "What specifically should I capture?" |

### Confidence Factors

```typescript
function calculateConfidence(intent: CaptureIntent): number {
  let confidence = 50; // Baseline

  // Time clarity
  if (hasExplicitTime(intent)) confidence += 30;
  else if (hasRelativeTime(intent)) confidence += 20;
  else if (hasEventReference(intent)) confidence += 15;

  // Content clarity
  if (hasExplicitContent(intent)) confidence += 20;
  else if (canResolveFromContext(intent)) confidence += 10;

  // Entity extraction success
  confidence += (intent.entities.length * 5);

  return Math.min(100, confidence);
}
```

---

## Autonomy Integration

The Capture Router respects the autonomy levels defined in the Plugin Creator Control Inventory:

| Autonomy Level | Capture Behavior |
|----------------|------------------|
| **Ask First** | "Want me to set a reminder for the Sarah meeting?" |
| **Suggest Then Act** | "I'll remind you before the Sarah meeting." [proceeds unless objection] |
| **Act Then Report** | [Sets reminder] "Got it - I'll surface that before your Sarah meeting." |
| **Silent** | [Sets reminder, no confirmation] |

### Trust Progression

New users start with more confirmation. As OSQR learns preferences:

| Stage | Default Autonomy | Example |
|-------|------------------|---------|
| **Day 1-7** | Suggest Then Act | Confirms interpretation |
| **Day 8-30** | Act Then Report | Reports what was set |
| **Day 30+** | Act Then Report (higher confidence threshold) | Less verbose confirmation |

---

## Memory Vault Integration

### Storage Schema

Captured items are stored in the Memory Vault with full semantic indexing:

```typescript
interface StoredCapture {
  // Standard Memory Vault fields
  id: string;
  userId: string;
  content: string;
  embedding: number[];
  category: 'capture';

  // Capture-specific metadata
  captureMetadata: {
    intentType: CaptureIntent['type'];
    triggerType: TriggerCondition['type'];
    triggerValue: string;
    status: CaptureIntent['status'];

    // Source context for disambiguation
    sourceConversationId: string;
    sourceInterface: string;
    relatedEntities: ExtractedEntity[];

    // Surfacing tracking
    surfaceCount: number;
    lastSurfaced?: Date;
    userResponse?: 'completed' | 'snoozed' | 'dismissed';
  };
}
```

### Cross-Reference with Documents

When a capture references documents or topics, the Capture Router links to the Document Indexing Subsystem:

```typescript
// If user says "Remind me about what we discussed in the VoiceQuote spec"
const relatedDocs = await memoryVault.semantic.query({
  embedding: await embed("VoiceQuote spec discussion"),
  category: 'document',
  limit: 3
});

capture.relatedDocuments = relatedDocs.map(d => d.id);
```

---

## Surfacing Behavior

### When Triggers Fire

The Capture Router integrates with the Insights System for surfacing:

| Trigger Type | Surfacing Behavior |
|--------------|---------------------|
| **Time-based** | Bubble pulses at specified time |
| **Event-based** | Bubble pulses 15 minutes before event (configurable) |
| **Context-based** | Surfaces when relevance score exceeds threshold |

### Surfacing UX

```
[Bubble pulses gently]

User clicks Bubble

Oscar: "Before your meeting with Sarah - you wanted to ask
        about Q2 projections."

        [Mark Complete]  [Snooze 1hr]  [Dismiss]
```

### Escalation for Unfired Triggers

Context-based triggers may never fire if conditions aren't met. The system escalates:

| Time Since Capture | Action |
|--------------------|--------|
| **7 days** | Light reminder: "Still want me to remind you about [X] when you're back on [project]?" |
| **30 days** | Cleanup prompt: "This reminder hasn't triggered yet. Keep it, or should I remove it?" |
| **60 days** | Auto-archive with notification |

---

## User Experience

### Onboarding Discovery

During onboarding (per Onboarding Flow spec), OSQR demonstrates capture capability:

> User mentions something in passing during onboarding conversation
>
> Oscar: "By the way - if you ever say 'remind me' or 'note this,' I'll handle it.
>         Calendar, memory, wherever it should go. You don't have to specify."

### Natural Confirmation Patterns

OSQR confirms captures conversationally, not robotically:

| Capture Type | Confirmation |
|--------------|--------------|
| Time reminder | "Got it - tomorrow at 9." |
| Event reminder | "I'll surface that before your meeting with Sarah." |
| Context reminder | "I'll bring this up when you're back on VoiceQuote." |
| Note | "Noted." |
| Action item | "Added to your list." |

### What OSQR Never Says

| Bad Pattern | Why It's Wrong |
|-------------|----------------|
| "I've created a reminder for..." | Too robotic |
| "Reminder set!" | Too app-like |
| "I'll add that to your calendar" | Over-specifies mechanism |
| "What time would you like to be reminded?" | Interrupts flow for resolvable ambiguity |

---

## Constitutional Constraints

The Capture Router operates within OSQR's constitutional framework:

| Constraint | Application |
|------------|-------------|
| **User Data Sovereignty** | Captures stored in user's PKV, exportable/deletable |
| **Identity Transparency** | OSQR identifies as AI if asked about reminder system |
| **Baseline Honesty** | Never fabricates captures or pretends to remember something not captured |
| **Privacy** | Captures never shared across users or with plugins without permission |

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Intent classification | <500ms | Local processing |
| Trigger resolution (time) | <100ms | Calculation only |
| Trigger resolution (event) | <1s | Calendar API call |
| Trigger resolution (context) | <500ms | Embedding comparison |
| Confirmation response | <1s | End-to-end |
| Surfacing (time trigger) | <5s of scheduled time | Background job |
| Surfacing (event trigger) | 15min before event | Configurable |

---

## Implementation Phases

### Phase 1: Core Pipeline (Week 1-2)
- [ ] Intent classification patterns
- [ ] Time-based trigger resolution
- [ ] Memory Vault storage schema
- [ ] Basic confirmation responses
- [ ] Surfacing via Bubble integration

### Phase 2: Event Triggers (Week 3)
- [ ] Calendar integration (read)
- [ ] Person/event entity extraction
- [ ] Event-based trigger creation
- [ ] Pre-meeting surfacing

### Phase 3: Context Triggers (Week 4)
- [ ] Project/topic extraction
- [ ] Just-in-time relevance monitoring
- [ ] Context-based surfacing
- [ ] Escalation for unfired triggers

### Phase 4: Refinement (Week 5)
- [ ] Confidence calibration
- [ ] Trust progression implementation
- [ ] Feedback loop for accuracy
- [ ] Voice interface preparation

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Capture recognition accuracy | >90% | Correct intent classification |
| Trigger resolution accuracy | >85% | Correct interpretation of "when" |
| Surfacing relevance | >80% | User marks complete vs dismisses |
| Zero "I forgot to remind you" | 0 complaints | Support tracking |
| User adoption | >30% of active users | Capture feature usage |

---

## Integration Points

| Component | Integration |
|-----------|-------------|
| [Memory Vault](../architecture/KNOWLEDGE_ARCHITECTURE.md) | Storage, semantic search, cross-project retrieval |
| [Temporal Intelligence](./QUEUE-SYSTEM.md) | Time pattern learning, "end of day" inference |
| [Calendar](./EMAIL_INTEGRATION.md) | Event lookup, pre-meeting triggers |
| [Insights System](./BEHAVIORAL_INTELLIGENCE_LAYER.md) | Surfacing via Bubble, interrupt budget |
| [Constitutional Framework](../governance/OSQR_CONSTITUTION.md) | Privacy constraints, data sovereignty |
| [Document Indexing](./MEDIA-VAULT.md) | Reference resolution ("that doc we discussed") |

---

## Open Questions for Future Versions

1. Should captures sync to external reminder systems (Apple Reminders, Google Tasks)?
2. How do we handle recurring reminders ("Remind me every Monday")?
3. Should plugins be able to create captures on behalf of users?
4. How do we surface captures in voice-only interface?
5. Should there be a "capture history" view, or just trust the system?

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial specification |

---

**End of Specification**

*Document Version: 1.0*
*Status: Ready for Implementation*
*Next Review: Post-Phase 1 validation*
