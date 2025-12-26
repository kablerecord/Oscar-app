# OSQR Insights System Addendum: The Secretary Checklist

**Component**: Insights System Extension  
**Version**: 1.0  
**Status**: Ready for Implementation  
**Dependencies**: Insights System v2.0, Memory Vault, Temporal Intelligence  
**Priority**: V1.5 Feature

---

## Purpose

This addendum extends the Insights System with a systematic checklist of what great executive assistants notice and surface proactively. Rather than generating random insights, Oscar runs through a defined checklist continuously - the same mental checklist a world-class secretary uses to keep their executive on track.

**Core Principle:**

> Anything a diligent assistant would do if they were paying attention to everything you said - Oscar should do automatically.

---

## The Secretary Checklist

### Category 1: Follow-ups

**What Oscar Looks For:** Conversations that stopped mid-decision or mid-task.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Open decision threads | No resolution pattern detected after deliberation | "You were deciding between Stripe and PayPal 2 weeks ago. Want to finish that?" |
| Abandoned discussions | Topic discussed 3+ times, then dropped | "We talked about offline mode in 4 conversations, then stopped. Still on the table?" |
| Paused implementations | Technical discussion without completion signal | "The caching implementation discussion paused on Nov 15. Ready to continue?" |

**Timing:** Surface after 7+ days of inactivity on the topic.

---

### Category 2: Commitments

**What Oscar Looks For:** Things you said you'd do.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Explicit commitments | "I'll...", "I need to...", "I should..." patterns | "You mentioned following up with Sarah. Did that happen?" |
| Promised deliverables | "I'll send...", "I'll share...", "I'll write..." | "You said you'd send Mike the proposal." |
| Self-assigned tasks | "Let me...", "I'm going to..." | "You said you'd review the contractor bids this week." |

**Timing:** Surface 2-3 days after commitment if no completion signal.

---

### Category 3: Deadlines

**What Oscar Looks For:** Approaching dates mentioned in conversation.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Explicit dates | Date/time extraction from conversation | "The Q1 launch you mentioned is 3 weeks out." |
| Relative deadlines | "next week", "by Friday", "end of month" | "You said 'by end of month' - that's in 4 days." |
| External deadlines | Mentions of external requirements | "The investor meeting is Thursday. Want to prep?" |

**Timing:** Surface at appropriate intervals (30 days, 7 days, 3 days, 1 day).

---

### Category 4: Recurring Patterns

**What Oscar Looks For:** Things you do regularly that Oscar can anticipate.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Weekly rhythms | Same activity/topic on same day of week | "You usually review metrics on Mondays. Want me to pull VoiceQuote numbers?" |
| Monthly patterns | Beginning/end of month activities | "First of the month - you typically review franchise P&L." |
| Project rhythms | Regular check-ins on specific projects | "You usually touch base on OSQR development every few days. It's been a week." |

**Timing:** Surface at the detected pattern time, slightly before if preparation needed.

---

### Category 5: Stale Decisions

**What Oscar Looks For:** Old decisions that might need revisiting.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Age-based staleness | Decision older than domain-specific threshold | "Your pricing decision is 6 months old. Industry has shifted - worth reviewing?" |
| Context change | Related information has changed since decision | "You decided on PostgreSQL before learning about the scale requirements. Revisit?" |
| Assumption decay | Decision based on assumptions that may be outdated | "That was based on 1,000 users. You're at 5,000 now." |

**Timing:** Domain-specific. Pricing: 3-6 months. Technical architecture: 6-12 months. Market analysis: 2-3 months.

---

### Category 6: Contradictions

**What Oscar Looks For:** Conflicting information across conversations or documents.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Timeline conflicts | Different dates for same milestone | "Your roadmap says Q2 but the spec says Q3." |
| Decision conflicts | Different conclusions on same topic | "In October you said 'no free tier' but last week you discussed free tier limits." |
| Fact conflicts | Inconsistent data points | "The pitch deck says $5M ARR target but the financial model shows $3M." |

**Timing:** Surface immediately when detected, before it causes downstream problems.

---

### Category 7: Open Questions

**What Oscar Looks For:** Questions you asked but never answered.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Explicit questions | "Should we...?", "What if...?", "How do we...?" without resolution | "You asked 'should we support offline mode?' - never resolved." |
| Deferred decisions | "Let's think about that", "We'll figure that out later" | "You deferred the plugin pricing model. Ready to tackle it?" |
| Research requests | "I need to look into...", "We should research..." | "You wanted to research competitor pricing. Did that happen?" |

**Timing:** Surface after 7+ days, or when related topic comes up.

---

### Category 8: Dependencies

**What Oscar Looks For:** Things waiting on other things.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Blocking dependencies | "Once X is done, then Y" patterns | "The auth implementation is blocked until you decide on the token approach." |
| Resource dependencies | Waiting on people, tools, or information | "The design is waiting on brand guidelines from the designer." |
| Sequential dependencies | Ordered task chains | "Steps 1-3 are done. Step 4 is waiting." |

**Timing:** Surface when the blocking item is resolved, or if blocked too long (7+ days).

---

### Category 9: People Waiting

**What Oscar Looks For:** Others mentioned who need responses or deliverables.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Promised responses | "I'll get back to [person]" | "You said you'd get back to the contractor by Friday." |
| Delegated tasks | Tasks assigned to others without follow-up | "You asked James to send the updated numbers. Haven't seen them mentioned since." |
| Pending introductions | "I should connect you with..." | "You mentioned connecting Dan with your investor contact." |

**Timing:** Surface based on promised timeline, or after 3-5 days if no timeline given.

---

### Category 10: Context Decay

**What Oscar Looks For:** Important context getting old.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Market information | Competitor analysis, market research | "Your competitor analysis is from July. Worth refreshing?" |
| Technical landscape | Framework versions, API changes | "The Stripe integration spec references v2. They're on v3 now." |
| Relationship context | Information about people/companies | "Your notes on Acme Corp are from before their acquisition." |

**Timing:** Domain-specific decay rates (see Insights System spec for defaults).

---

### Category 11: Unfinished Work

**What Oscar Looks For:** Documents, specs, or artifacts started but not completed.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Incomplete documents | Documents with TODO markers or missing sections | "The Plugin Creator spec is 80% done. Want to finish it?" |
| Draft status | Files marked as draft or WIP | "The investor update has been in draft for 2 weeks." |
| Abandoned artifacts | Created but never used/referenced | "You created a project plan template but never populated it." |

**Timing:** Surface after 7+ days of no edits, or when related work begins.

---

### Category 12: Pattern Breaks

**What Oscar Looks For:** Something different from your usual behavior.

| Signal | Detection Method | Example Insight |
|--------|------------------|-----------------|
| Response time anomalies | Slower than usual responses | "You normally respond to client emails same-day. This one is 3 days old." |
| Routine breaks | Missing regular activities | "You haven't done your weekly review in 2 weeks." |
| Engagement drops | Less activity on usually-active projects | "VoiceQuote development has been quiet. Everything okay?" |

**Timing:** Surface when pattern break is detected, with appropriate sensitivity.

---

## Implementation

### Integration with Insights System

The Secretary Checklist becomes a detection module within the existing Insights System architecture:

```typescript
interface SecretaryChecklistModule {
  // Runs all 12 categories against user's content
  runChecklist(userId: string): SecretaryInsight[];
  
  // Individual category checks
  checkFollowUps(userId: string): SecretaryInsight[];
  checkCommitments(userId: string): SecretaryInsight[];
  checkDeadlines(userId: string): SecretaryInsight[];
  // ... etc for all 12 categories
}

interface SecretaryInsight extends Insight {
  category: SecretaryCategory;
  checklistItem: string;  // Which specific check triggered this
  actionSuggestion: string;  // What Oscar suggests doing
}

type SecretaryCategory = 
  | 'follow_up'
  | 'commitment'
  | 'deadline'
  | 'recurring_pattern'
  | 'stale_decision'
  | 'contradiction'
  | 'open_question'
  | 'dependency'
  | 'people_waiting'
  | 'context_decay'
  | 'unfinished_work'
  | 'pattern_break';
```

### Scheduling

The checklist runs on a schedule appropriate to each category:

| Category | Check Frequency |
|----------|-----------------|
| Deadlines | Daily |
| Commitments | Daily |
| People waiting | Daily |
| Contradictions | On new content |
| Follow-ups | Every 3 days |
| Dependencies | Every 3 days |
| Open questions | Weekly |
| Recurring patterns | At pattern time |
| Stale decisions | Weekly |
| Context decay | Weekly |
| Unfinished work | Weekly |
| Pattern breaks | Daily |

### Prioritization

When multiple checklist items trigger, prioritize by:

1. **Time sensitivity** - Deadlines and people waiting come first
2. **Stakes** - High-impact decisions over minor tasks
3. **User patterns** - Things the user has shown they care about
4. **Freshness** - Recently relevant over long-dormant

---

## User Controls

### Category Toggles

Users can disable specific checklist categories:

```
Secretary Checklist Settings:
[x] Follow-ups
[x] Commitments  
[x] Deadlines
[ ] Recurring patterns (disabled)
[x] Stale decisions
...
```

### Sensitivity Adjustment

Users can adjust how aggressively Oscar surfaces each category:

- **Aggressive**: Surface early and often
- **Balanced**: Default timing
- **Relaxed**: Only surface when highly confident

### Quiet Hours

Secretary insights respect user's quiet hours and focus modes (from Bubble Interface spec).

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Checklist insight engagement | > 40% | Users find these useful |
| False positive rate | < 20% | Not crying wolf |
| Commitment completion rate | Increasing | Oscar is helping users follow through |
| Missed deadline rate | Decreasing | Oscar is keeping users on track |
| User override rate | < 15% | Timing and relevance are right |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial specification |

---

## Related Documents

- **[EXECUTION_ORCHESTRATOR_SPEC.md](./EXECUTION_ORCHESTRATOR_SPEC.md)** – V3.0 feature that extends Secretary Checklist from proactive *monitoring* to proactive *execution*. The Secretary Checklist surfaces issues; the Execution Orchestrator resolves them autonomously.

---

## Open Questions

1. Should users be able to snooze specific checklist items?
2. How do we handle recurring items that keep getting dismissed?
3. Should there be a "daily briefing" mode that batches checklist items?
4. Can users add custom checklist items specific to their work?

---

**End of Addendum**
