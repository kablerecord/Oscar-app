# Insights System Build Plan

**Status:** Ready to implement
**Priority:** V1.5 Feature
**Estimated Time:** 3-4 focused sessions with Claude (8-12 hours total)

---

## Time Tracking

Track actual time vs estimates to calibrate future planning.

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Phase 1: Secretary Checklist | 2-4 hours | - | |
| Phase 2: Import Interview | 4-6 hours | - | |
| Phase 3: Auto-Organization | 1-2 hours | - | |
| **Total** | **8-12 hours** | - | |

**Instructions:** When starting a phase, note the time. When done, record actual time and any lessons learned.

---

## Quick Start

When you say "let's build the insights system", start here:

1. Read this doc for the plan
2. Read the specs (linked below) for implementation details
3. Follow the phases in order
4. Check off items as completed

---

## What We're Building

Oscar proactively surfaces helpful observations based on user conversations, documents, and patterns. Three interconnected systems:

| System | Purpose | Spec Doc |
|--------|---------|----------|
| **Secretary Checklist** | Track commitments, deadlines, follow-ups | [OSQR_SECRETARY_CHECKLIST_ADDENDUM.md](./OSQR_SECRETARY_CHECKLIST_ADDENDUM.md) |
| **Import Interview** | Understand imported ChatGPT/Claude history | [OSQR_AI_HISTORY_INTERVIEW_SPEC.md](./OSQR_AI_HISTORY_INTERVIEW_SPEC.md) |
| **Auto-Organization** | Auto-title chats, link to projects | [OSQR_AUTO_ORGANIZATION_SPEC.md](./OSQR_AUTO_ORGANIZATION_SPEC.md) |

---

## What's Already Built

Location: `packages/app-web/lib/til/`

| File | What It Does | Status |
|------|--------------|--------|
| `session-tracker.ts` | Records conversations and events | Working |
| `cognitive-tracker.ts` | Tracks 50+ behavioral dimensions | Working |
| `pattern-detector.ts` | Basic pattern detection | Working |
| `insights-generator.ts` | Contextual insights for current conversation | Working |
| `insight-queue.ts` | Priority queue for surfacing insights | Working |
| `planner.ts` | 90-day planning logic | Stub |
| `self-audit.ts` | Self-audit capabilities | Stub |

---

## Build Phases

### Phase 1: Secretary Checklist (Core 4 Categories)

**Estimate:** 2-4 hours
**Start time:** _______________
**End time:** _______________

**Goal:** Oscar detects and surfaces commitments, deadlines, follow-ups, and dependencies.

**Implementation:**

1. Create `packages/app-web/lib/til/secretary-checklist.ts`:
   ```typescript
   interface SecretaryInsight {
     category: 'commitment' | 'deadline' | 'follow_up' | 'dependency'
     message: string
     relatedThreadId?: string
     detectedAt: Date
     surfaceAfter: Date  // When to show user
     priority: number
   }
   ```

2. Detection logic for each category:
   - **Commitments:** Pattern match "I'll...", "I need to...", "I should..."
   - **Deadlines:** Extract dates, "by Friday", "end of month", "next week"
   - **Follow-ups:** Conversations that stopped mid-decision (no resolution detected)
   - **Dependencies:** "Once X is done", "waiting on", "blocked by"

3. Scheduling:
   - Commitments: Surface 2-3 days after if no completion signal
   - Deadlines: Surface at 7 days, 3 days, 1 day before
   - Follow-ups: Surface after 7+ days inactive
   - Dependencies: Surface when blocking item resolves, or after 7+ days

4. API endpoint: `POST /api/insights/secretary-check` (runs on schedule)

5. Surface via existing Bubble interface or new Insights panel

**Spec reference:** OSQR_SECRETARY_CHECKLIST_ADDENDUM.md, Categories 1-4, 8

- [ ] Create secretary-checklist.ts with types
- [ ] Implement commitment detection
- [ ] Implement deadline detection
- [ ] Implement follow-up detection
- [ ] Implement dependency detection
- [ ] Add scheduling logic
- [ ] Create API endpoint
- [ ] Integrate with Bubble/UI

---

### Phase 2: Import Interview (ChatGPT Only)

**Estimate:** 4-6 hours
**Start time:** _______________
**End time:** _______________

**Goal:** Users can import ChatGPT history, Oscar asks clarifying questions to understand it.

**Implementation:**

1. ChatGPT JSON parser (`lib/import/chatgpt-parser.ts`):
   ```typescript
   interface ChatGPTExport {
     conversations: {
       id: string
       title: string
       create_time: number
       mapping: { [id: string]: { message: {...} } }
     }[]
   }
   ```

2. Entity extraction (`lib/import/entity-extractor.ts`):
   - Extract people names, project references, terminology
   - Track frequency and context
   - Flag unresolved references

3. Question generation (`lib/import/question-generator.ts`):
   - Tier 1 (high inference): Project identification, key people, terminology
   - Rank by how many conversations each answer unlocks
   - Limit to 6-10 priority questions

4. Interview UI:
   - Settings → Import → Upload ChatGPT export
   - Modal/panel with questions
   - Progress indicator showing confidence %

5. Inference propagation:
   - When user answers, apply to all matching conversations
   - Chain inferences ("VQ" = VoiceQuote → "VQ project" = VoiceQuote project)

**Spec reference:** OSQR_AI_HISTORY_INTERVIEW_SPEC.md

- [ ] Create chatgpt-parser.ts
- [ ] Create entity-extractor.ts
- [ ] Create question-generator.ts with ranking
- [ ] Create import UI in Settings
- [ ] Create interview modal/panel
- [ ] Implement answer propagation
- [ ] Add confidence scoring

---

### Phase 3: Auto-Organization (Titles Only)

**Estimate:** 1-2 hours
**Start time:** _______________
**End time:** _______________

**Goal:** Oscar auto-generates chat titles based on conversation content.

**Implementation:**

1. Title generation (`lib/organization/auto-title.ts`):
   - Generate after first substantive exchange (not on first message)
   - Max 50 characters
   - Use user's terminology
   - Describe topic, not action ("VoiceQuote Auth Flow" not "Discussing Authentication")

2. Database: Add `titleSource: 'user' | 'oscar'` to Thread model

3. UI indicator:
   - Small badge on auto-titled chats
   - Click to confirm or edit
   - Fades after 7 days if not clicked

4. Learning: Track when users rename → adjust future titling patterns

**Spec reference:** OSQR_AUTO_ORGANIZATION_SPEC.md, Section "Chat Titling"

- [ ] Create auto-title.ts
- [ ] Add titleSource to Thread model
- [ ] Add UI indicator component
- [ ] Wire up title generation after conversations
- [ ] Track user corrections

---

## Future Phases (Not MVP)

### Phase 4: Full Secretary Checklist (All 12 Categories)
- Stale decisions, contradictions, open questions
- People waiting, context decay, unfinished work
- Recurring patterns, pattern breaks

### Phase 5: Import Interview (Claude + Custom)
- Claude JSON parser
- Custom format support
- Duplicate detection across sources

### Phase 6: Full Auto-Organization
- Project matching with embeddings
- Auto-project creation
- Multi-project linking

---

## Testing Checklist

After each phase:

- [ ] Manual test with real data
- [ ] Check Prisma migrations apply cleanly
- [ ] Verify no regressions in existing TIL functionality
- [ ] Test on deployed Railway instance

---

## Document Connections

| Doc | Use For |
|-----|---------|
| [OSQR_SECRETARY_CHECKLIST_ADDENDUM.md](./OSQR_SECRETARY_CHECKLIST_ADDENDUM.md) | Detection categories, timing, scheduling |
| [OSQR_AI_HISTORY_INTERVIEW_SPEC.md](./OSQR_AI_HISTORY_INTERVIEW_SPEC.md) | Import flow, question types, inference engine |
| [OSQR_AUTO_ORGANIZATION_SPEC.md](./OSQR_AUTO_ORGANIZATION_SPEC.md) | Segmentation, titling, project linking |
| `lib/til/index.ts` | Existing TIL integration points |
| `lib/til/insights-generator.ts` | How insights currently surface |

---

## Version History

| Date | Changes |
|------|---------|
| 2024-12-23 | Initial build plan created |
