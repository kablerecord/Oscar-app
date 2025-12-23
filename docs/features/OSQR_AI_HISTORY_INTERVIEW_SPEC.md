# OSQR Import Interview Specification

**Component**: Import Interview Subsystem  
**Version**: 1.0  
**Status**: Ready for Implementation  
**Dependencies**: Document Indexing Subsystem, Memory Vault  
**Priority**: V1.5 Feature

---

## Executive Summary

When users import content into Oscar - conversation history, documents, notes, or any external knowledge - Oscar can extract a lot on his own, but a few well-chosen questions dramatically increase his understanding. Rather than guessing or ignoring gaps, Oscar conducts a structured interview when the confidence gain justifies it.

**Core Insight:**

> Oscar should be as good as possible without asking questions. But a few well-thought-out questions raise confidence significantly and help Oscar make better decisions and observations.

This pattern applies to all imported content. AI chat history (ChatGPT, Claude) is the highest-value application because those conversations are rich with context Oscar wasn't present for - but the same interview system can improve understanding of any import type.

---

## Applicability

The Import Interview pattern applies whenever:

1. **Oscar can get "pretty good" on his own** - Extraction and inference get him to 50-70% confidence
2. **A few questions would help significantly** - Answering 5-10 questions jumps confidence to 85-95%
3. **The content is worth understanding deeply** - High-value, frequently-referenced material

| Import Type | Base Confidence | Questions Needed | Post-Interview | Interview Value |
|-------------|-----------------|------------------|----------------|-----------------|
| **AI chat history** | ~60% | 5-10 | ~90% | **Highest** |
| Email archive | ~50% | 8-12 | ~85% | High |
| Notes (Notion, Obsidian) | ~70% | 3-6 | ~90% | Medium |
| Documents folder | ~65% | 5-8 | ~85% | Medium |
| Calendar history | ~80% | 2-4 | ~95% | Low |
| Bookmarks/links | ~40% | 6-10 | ~75% | Medium |

**AI chat history is the primary use case** because:
- Conversations are context-rich but context is implicit
- References to people, projects, and terms are frequent but unexplained
- Oscar wasn't present, so he has no real-time context
- The volume is typically high (hundreds to thousands of conversations)

The rest of this spec focuses on AI history as the reference implementation, but the architecture supports any import type.

---

## The Problem (AI History)

### What Oscar Doesn't Have

When you have a conversation with Oscar, he captures:
- Your intent and goals
- The context that led to the conversation
- Your emotional state and urgency
- How this connects to other projects
- What happened after the conversation

Imported history has none of this. Oscar sees:
- Raw transcript
- Timestamps
- Nothing else

### The Gap

| What Oscar Sees | What Oscar Needs |
|-----------------|------------------|
| "Let's work on the main project" | Which project is "main"? |
| "I talked to him yesterday" | Who is "him"? |
| "We decided to go with option B" | What were the options? Was this implemented? |
| "After the meeting, I realized..." | What meeting? What changed? |
| Technical discussion about auth | Is this still relevant? Was it implemented? |

---

## The Solution: Structured Interview

Oscar analyzes imported history, identifies gaps, generates questions, and asks only what's needed to understand the rest.

### The Process

```
Import History
     │
     ▼
┌─────────────────────────────────────┐
│  PHASE 1: EXTRACTION                │
│                                     │
│  - Parse conversations              │
│  - Extract entities (people, terms) │
│  - Identify decisions and outcomes  │
│  - Detect patterns and themes       │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  PHASE 2: GAP ANALYSIS              │
│                                     │
│  - What references are unclear?     │
│  - What context is missing?         │
│  - What outcomes are unknown?       │
│  - What terminology is ambiguous?   │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  PHASE 3: QUESTION GENERATION       │
│                                     │
│  - Generate questions for each gap  │
│  - Calculate inference power        │
│  - Rank by importance               │
│  - Batch into manageable sets       │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  PHASE 4: INTERVIEW                 │
│                                     │
│  - Present high-priority questions  │
│  - User answers (or skips)          │
│  - Oscar infers across history      │
│  - Follow-up only if critical gaps  │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  PHASE 5: INTEGRATION               │
│                                     │
│  - Apply answers to all relevant    │
│    conversations                    │
│  - Tag and categorize history       │
│  - Connect to existing projects     │
│  - Enable Secretary Checklist       │
└─────────────────────────────────────┘
```

---

## Question Types

### Tier 1: High Inference Power

These questions unlock understanding of many conversations at once. Ask these first.

| Question Type | Example | Inference Power |
|---------------|---------|-----------------|
| **Project identification** | "What does 'the main project' refer to in these conversations?" | Tags 50+ conversations correctly |
| **Key person identification** | "Who is 'Mike' that you mention frequently?" | Unlocks all conversations mentioning Mike |
| **Terminology decoding** | "What does 'the v2 approach' mean?" | Clarifies all technical discussions using this term |
| **Implementation status** | "Was the auth system you discussed actually built?" | Tells Oscar if conversations are historical or active |
| **Current relevance** | "Is the pricing strategy from March still your plan?" | Lets Oscar prioritize or deprioritize content |

### Tier 2: Medium Inference Power

Useful context, but Oscar can often work around missing answers.

| Question Type | Example | Inference Power |
|---------------|---------|-----------------|
| **Outcome questions** | "What happened with the investor pitch?" | Closes loops on exploratory conversations |
| **Relationship mapping** | "Is Sarah your business partner or a client?" | Clarifies relationship-based context |
| **Timeline context** | "Were these conversations before or after you launched?" | Temporal context for decisions |
| **Decision rationale** | "Why did you choose React over Vue?" | Helps Oscar understand your reasoning patterns |

### Tier 3: Low Inference Power

Nice to know, but Oscar can usually infer or do without.

| Question Type | Example | Inference Power |
|---------------|---------|-----------------|
| **Motivation questions** | "Why did you ask about caching?" | Interesting but not critical |
| **Emotional context** | "Were you stressed when discussing the deadline?" | Nuance, not essential |
| **Environmental context** | "What was happening in your business at this time?" | Background, often inferrable |

---

## The Interview Experience

### Initial Presentation

```
Oscar: "I've imported 847 conversations from ChatGPT spanning March 2023 
       to November 2024. 
       
       I've learned a lot from them already, but I have some questions 
       that would help me understand them much better.
       
       I have 23 questions total:
       • 6 are important (answering these unlocks most of my understanding)
       • 17 are helpful but optional
       
       Want to go through the important ones? Should take about 5 minutes."

[Answer important ones]  [Answer all]  [Skip for now]  [Show me what you learned]
```

### Question Flow

```
Oscar: "Question 1 of 6:
       
       You mention 'the VQ project' in 34 conversations. What is that?"

User: "VoiceQuote - my SaaS for contractors"

Oscar: "Got it. That connects a lot of dots.
       
       Question 2 of 6:
       
       Who is 'James' that you discuss development tasks with?"

User: "My developer"

Oscar: "Thanks. He appears in 28 conversations about technical implementation.
       
       Question 3 of 6:
       ..."
```

### After Core Questions

```
Oscar: "That's the important ones. I can now understand about 85% of your 
       ChatGPT history.
       
       I have 17 more questions that would help with the remaining 15%, 
       but they're less critical. I can also try to figure things out 
       and ask you if I get stuck.
       
       What would you prefer?"

[Answer remaining]  [Let me figure it out]  [Ask me later if stuck]
```

### Follow-up Pattern

If Oscar chooses to infer and gets stuck later:

```
Oscar: "Quick question about your ChatGPT history - 
       
       In August, you discussed a 'competitor analysis framework.' 
       I can't tell if this was something you built or something 
       you were researching. Which was it?"

User: "I was just researching best practices"

Oscar: "Got it - so it's reference material, not something to track 
       as a project. Thanks."
```

---

## Data Model

### Imported Conversation Schema

```typescript
interface ImportedConversation {
  id: string;
  userId: string;
  
  // Source information
  source: 'chatgpt' | 'claude' | 'other';
  sourceConversationId: string;
  importedAt: Date;
  
  // Original data
  originalTimestamp: Date;
  rawTranscript: Message[];
  
  // Extraction results
  extraction: {
    topics: string[];
    entities: ExtractedEntity[];
    decisions: ExtractedDecision[];
    commitments: ExtractedCommitment[];
    questions: ExtractedQuestion[];
    summary: string;
  };
  
  // Interview results (populated after interview)
  clarifications: Clarification[];
  
  // Final state
  projectLinks: string[];  // Connected to OSQR projects
  isRelevant: boolean;     // Still matters or historical only
  confidence: number;      // How well Oscar understands this
}

interface ExtractedEntity {
  text: string;           // "the main project", "Mike", "v2 approach"
  type: 'project' | 'person' | 'term' | 'company' | 'unknown';
  frequency: number;      // How often it appears
  resolved: boolean;      // Has user clarified this?
  resolution?: string;    // User's answer
  inferredFrom?: string;  // If Oscar inferred it, from what?
}

interface Clarification {
  entityId: string;
  question: string;
  answer: string;
  answeredAt: Date;
  appliedTo: string[];    // Conversation IDs this was applied to
}
```

### Interview Question Schema

```typescript
interface InterviewQuestion {
  id: string;
  userId: string;
  importBatchId: string;
  
  // The question
  question: string;
  questionType: QuestionType;
  tier: 1 | 2 | 3;
  
  // What it's about
  relatedEntity: ExtractedEntity;
  affectedConversations: string[];  // How many conversations this unlocks
  
  // Scoring
  inferencePower: number;  // 0-1, how much answering this helps
  priority: number;        // Computed rank
  
  // State
  status: 'pending' | 'answered' | 'skipped' | 'inferred';
  answer?: string;
  inferredAnswer?: string;
  answeredAt?: Date;
}

type QuestionType = 
  | 'project_identification'
  | 'person_identification'
  | 'terminology'
  | 'implementation_status'
  | 'current_relevance'
  | 'outcome'
  | 'relationship'
  | 'timeline'
  | 'rationale'
  | 'motivation'
  | 'context';
```

---

## Inference Engine

### How Oscar Propagates Answers

When a user answers a question, Oscar applies that answer across all relevant conversations:

```typescript
async function applyAnswer(
  question: InterviewQuestion,
  answer: string
): Promise<void> {
  
  // Update the entity
  const entity = await getEntity(question.relatedEntity.id);
  entity.resolved = true;
  entity.resolution = answer;
  
  // Find all conversations mentioning this entity
  const conversations = await findConversationsWithEntity(entity);
  
  // Apply the clarification to each
  for (const conv of conversations) {
    await applyEntityResolution(conv, entity, answer);
    
    // Re-run extraction with new context
    await reExtract(conv);
    
    // Update confidence score
    conv.confidence = calculateConfidence(conv);
  }
  
  // Log for audit
  await logClarification({
    entityId: entity.id,
    question: question.question,
    answer,
    appliedTo: conversations.map(c => c.id)
  });
}
```

### Inference Chaining

Sometimes one answer unlocks others:

```
User answers: "'VQ' means VoiceQuote"

Oscar infers:
- "VQ project" = VoiceQuote project
- "VQ codebase" = VoiceQuote codebase  
- "VQ launch" = VoiceQuote launch
- Conversations tagged "VQ" are now tagged "VoiceQuote"
- VoiceQuote project now has 34 more linked conversations
```

### Confidence Calculation

```typescript
function calculateConfidence(conversation: ImportedConversation): number {
  const factors = {
    // How many entities are resolved?
    entityResolution: conversation.extraction.entities
      .filter(e => e.resolved).length / 
      conversation.extraction.entities.length,
    
    // Is it linked to a project?
    projectLinked: conversation.projectLinks.length > 0 ? 1 : 0,
    
    // Do we know if it's still relevant?
    relevanceKnown: conversation.isRelevant !== undefined ? 1 : 0,
    
    // Age factor (older = less certain)
    recency: Math.max(0, 1 - daysSince(conversation.originalTimestamp) / 365)
  };
  
  return (
    factors.entityResolution * 0.4 +
    factors.projectLinked * 0.3 +
    factors.relevanceKnown * 0.2 +
    factors.recency * 0.1
  );
}
```

---

## Integration Points

### Document Indexing Subsystem

Imported conversations flow through DIS:
- Treated as a document type ('imported_conversation')
- Indexed with source metadata
- Subject to same semantic search as native content

### Memory Vault

Extracted information goes to Memory Vault:
- Decisions → Semantic store
- Entities → Entity graph
- Commitments → Secretary Checklist tracking
- Projects → Auto-Organization linking

### Auto-Organization

Once imported and clarified:
- Conversations link to existing projects (if match found)
- New projects created if significant cluster detected
- Secretary Checklist applies to imported content

### Secretary Checklist

After interview, imported history becomes first-class:
- Commitments from ChatGPT conversations get tracked
- Open questions from old conversations surface
- Follow-ups apply to historical threads

---

## Import Sources

### Supported Formats

| Source | Format | Status |
|--------|--------|--------|
| ChatGPT | JSON export | V1.5 |
| Claude | JSON export | V1.5 |
| Custom JSON | Defined schema | V1.5 |
| Plain text | Conversation format | V2.0 |
| API import | Direct connection | V2.0 |

### ChatGPT Export Structure

```typescript
interface ChatGPTExport {
  conversations: {
    id: string;
    title: string;
    create_time: number;
    update_time: number;
    mapping: {
      [messageId: string]: {
        message: {
          content: { parts: string[] };
          author: { role: 'user' | 'assistant' };
          create_time: number;
        };
      };
    };
  }[];
}
```

### Claude Export Structure

```typescript
interface ClaudeExport {
  conversations: {
    uuid: string;
    name: string;
    created_at: string;
    updated_at: string;
    chat_messages: {
      uuid: string;
      text: string;
      sender: 'human' | 'assistant';
      created_at: string;
    }[];
  }[];
}
```

---

## User Experience

### Import Flow

```
1. User: Settings → Import → Choose source (ChatGPT/Claude)
2. User: Upload export file
3. Oscar: "Importing 847 conversations... Done."
4. Oscar: "I'm analyzing these now. I'll let you know when I have questions."

[Background: Oscar extracts, analyzes, generates questions]

5. Oscar (later, via Bubble): "I've finished reviewing your ChatGPT history. 
   When you have 5 minutes, I have a few questions that would help me 
   understand it better."
```

### Interview Timing

Oscar doesn't force the interview immediately. Options:

- **Immediate**: User wants to do it now
- **Scheduled**: "Remind me tomorrow"
- **Passive**: Oscar asks questions naturally as they become relevant
- **Never**: User skips, Oscar does his best with inference

### Progress Visibility

```
Import Status: ChatGPT (847 conversations)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% imported

Understanding: 67% confident
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 

[Answer 6 questions to reach ~90%]  [View what I've learned]
```

---

## Privacy & Trust

### Oscar's Honesty About Imported History

Oscar never pretends he was present for imported conversations:

**Wrong:**
```
Oscar: "Yes, I remember when we discussed that auth approach in August."
```

**Right:**
```
Oscar: "From your ChatGPT conversation in August, you explored an auth 
       approach using JWTs. Is that still the direction you want to go?"
```

### Source Attribution

When Oscar references imported content, he cites the source:

```
Oscar: "Based on your ChatGPT history from March, you were considering 
       three pricing tiers. Your Claude conversations from April suggest 
       you narrowed it to two. What did you end up deciding?"
```

### User Control

Users can:
- Delete imported history anytime
- Exclude specific conversations from indexing
- Mark conversations as "not relevant" to stop Oscar from referencing them
- Re-import to update (replaces previous import from same source)

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Interview completion rate | > 60% | Users engage with the process |
| Questions to 80% confidence | < 10 | Efficient questioning |
| Inference accuracy | > 85% | Oscar's guesses are good |
| User correction rate | < 15% | Inferences are right |
| Imported history utilization | > 50% referenced | The history is actually useful |
| Time to first value | < 24 hours | Users see benefit quickly |

---

## Implementation Phases

### Phase 1: Import & Extraction (Week 1-2)
- [ ] ChatGPT JSON parser
- [ ] Claude JSON parser
- [ ] Entity extraction pipeline
- [ ] Decision/commitment detection
- [ ] Basic question generation

### Phase 2: Interview System (Week 3-4)
- [ ] Question ranking algorithm
- [ ] Interview UI (Bubble + Panel)
- [ ] Answer storage
- [ ] Basic inference propagation

### Phase 3: Inference Engine (Week 5)
- [ ] Inference chaining
- [ ] Confidence scoring
- [ ] Project auto-linking
- [ ] Entity graph integration

### Phase 4: Integration (Week 6)
- [ ] Memory Vault integration
- [ ] Secretary Checklist integration
- [ ] Auto-Organization integration
- [ ] Source attribution in responses

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial specification (generalized from AI-history-only to all import types) |

---

## Open Questions

1. Should Oscar proactively suggest importing history, or wait for user to discover the feature?
2. How do we handle very large imports (10,000+ conversations)?
3. Should there be a "confidence threshold" below which Oscar doesn't reference imported content?
4. Can Oscar detect and merge duplicate conversations (same topic discussed in both ChatGPT and Claude)?
5. How do we handle imports from platforms we don't have parsers for yet?

---

**End of Specification**
