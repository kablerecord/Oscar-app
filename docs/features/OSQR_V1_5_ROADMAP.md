# OSQR V1.5 Roadmap
## Intelligence & Automation Features

**Status**: Ready for Implementation
**Last Updated**: December 24, 2024
**Session Reference**: Claude Web conversation with Kable

---

## Overview

V1.5 extends OSQR from a capable AI assistant to a proactive intelligence system. Three interconnected features transform how Oscar handles organization, tracking, and historical context.

**Core Insight**: "User organizational structures are presentation preferences, not knowledge boundaries." Oscar should know everything across all projects and surface it when relevant—users never need to specify which project contains what.

---

## The Three Features

| Feature | Purpose | Complexity | Dependencies |
|---------|---------|------------|--------------|
| **Secretary Checklist** | Proactive tracking of commitments, deadlines, follow-ups | Medium | Extends existing Insights System |
| **Auto-Organization** | Automatic chat segmentation, titling, project linking | Medium | Embeddings, project signatures |
| **Import Interview** | Bring in ChatGPT/Claude history with intelligent Q&A | High | All other systems |

**Build Order**: Secretary Checklist → Auto-Organization → Import Interview

Each feature builds on the previous. Secretary Checklist extends what exists. Auto-Organization uses similar patterns. Import Interview leverages everything.

---

## Feature 1: Secretary Checklist

**Spec Document**: `OSQR_SECRETARY_CHECKLIST_ADDENDUM.md`

### What It Does

12 detection categories that run on schedules to surface what a great executive assistant would notice:

| # | Category | Detection | Timing |
|---|----------|-----------|--------|
| 1 | Follow-ups | Conversations stopped mid-decision | 7+ days inactive |
| 2 | Commitments | "I'll...", "I need to...", "I should..." | 2-3 days after |
| 3 | Deadlines | Dates mentioned in conversation | 30/7/3/1 day intervals |
| 4 | Recurring Patterns | Same activity on same day/time | At detected pattern time |
| 5 | Stale Decisions | Old decisions needing revisit | 3-6 months (domain-specific) |
| 6 | Contradictions | Conflicting info across conversations | Immediately when detected |
| 7 | Open Questions | "Should we...?" without resolution | 7+ days |
| 8 | Dependencies | Things blocked by other things | When blocker resolved or 7+ days |
| 9 | People Waiting | Others owed responses | Based on promised timeline |
| 10 | Context Decay | Market info, technical landscape aging | Domain-specific decay rates |
| 11 | Unfinished Work | Docs started but not completed | 7+ days no edits |
| 12 | Pattern Breaks | Behavior different from usual | When detected |

### Implementation Summary

**New Prisma Models**:
- `ExtractedItem` - Commitments, decisions, questions extracted from messages
- `RecurringPattern` - Detected user patterns

**New Files** (~16):
- `lib/til/secretary/` directory with types, checklist-runner, scheduler
- 12 detector files (one per category)
- Extractor for commitments/decisions/questions

**Integration Points**:
- Extends existing Insights System in `lib/til/`
- Hooks into message processing to extract items
- Uses existing insight queue for surfacing

---

## Feature 2: Auto-Organization

**Spec Document**: `OSQR_AUTO_ORGANIZATION_SPEC.md`

### What It Does

Oscar automatically organizes without user intervention:

| Behavior | How It Works |
|----------|--------------|
| **Chat Segmentation** | Weighted triggers (topic shift 0.4, temporal gap 0.3, intent shift 0.2) create new chats when combined weight ≥ 0.7 |
| **Chat Titling** | Auto-generate titles ≤50 chars after first substantive exchange |
| **Project Matching** | Compare chat embeddings against project signatures, auto-link above 0.7 confidence |
| **Project Creation** | Propose new project when 5+ unlinked chats cluster around same topic |
| **Learning** | User corrections teach Oscar rules for future organization |

**The Indicator**: Single UI element showing Oscar made an organizational decision. Click reveals: "Looks good", "Rename", "Move", "Unlink". If never clicked, Oscar's decision stands.

### Implementation Summary

**New Prisma Models**:
- `ChatProjectLink` - Join table for multi-project linking
- `OrganizationRule` - Learned rules from user corrections

**Field Additions**:
- `ChatThread`: createdBy, titleConfidence, userVerified
- `Project`: createdBy, signature (embedding), userVerified

**New Files** (~8):
- `lib/auto-org/` directory
- segmentation.ts, titling.ts, project-matching.ts, project-creation.ts, learning.ts

**Integration Points**:
- Hooks into chat creation API
- Modifies sidebar components
- Uses Memory Vault for organizational preferences

---

## Feature 3: Import Interview

**Spec Document**: `OSQR_AI_HISTORY_INTERVIEW_SPEC.md`

### What It Does

Import AI chat history and fill context gaps through intelligent interview:

| Phase | What Happens |
|-------|--------------|
| **Extraction** | Parse conversations, extract entities (people, terms, projects), identify decisions |
| **Gap Analysis** | What references are unclear? What context is missing? |
| **Question Generation** | Generate questions ranked by inference power |
| **Interview** | Present high-priority questions, user answers or skips, Oscar infers across history |
| **Integration** | Apply answers to all relevant conversations, connect to projects, enable Secretary Checklist |

**The 5-Minute Interview**: "I've imported 847 conversations. I have 6 important questions that unlock most understanding. Should take about 5 minutes."

### Implementation Summary

**New Prisma Models**:
- `ImportBatch` - Track import status and stats
- `ImportedConversation` - Individual conversations with extraction results
- `ExtractedEntity` - People, projects, terms found in history
- `InterviewQuestion` - Questions with inference power scores
- `Clarification` - Applied answers

**New Files** (~14):
- `lib/import/parsers/` - ChatGPT, Claude, custom format parsers
- `lib/import/extraction/` - Entity, decision, commitment extractors
- `lib/import/interview/` - Question generator, ranker, manager
- `lib/import/inference/` - Answer propagation, confidence scoring

**Integration Points**:
- Flows through Document Indexing System as `imported_conversation` type
- Extracted decisions go to Memory Vault semantic store
- Commitments get tracked by Secretary Checklist
- Conversations link to projects via Auto-Organization

---

## Implementation Plan (From Claude in VS Code)

### Phase 1: Secretary Checklist (Weeks 1-2)

1. Schema changes - add ExtractedItem, RecurringPattern models
2. Run migration
3. Create `lib/til/secretary/types.ts` with interfaces
4. Create `lib/til/secretary/extractor.ts` - commitment/decision/question patterns
5. Test extraction against real messages
6. Build 12 detector modules
7. Create checklist-runner and scheduler
8. Integrate with existing Insights queue

### Phase 2: Auto-Organization (Weeks 3-4)

1. Schema changes - add ChatProjectLink, OrganizationRule, field additions
2. Run migration
3. Create `lib/auto-org/segmentation.ts` - topic similarity, temporal gap detection
4. Create `lib/auto-org/titling.ts` - LLM-based title generation
5. Create `lib/auto-org/project-matching.ts` - embedding comparison
6. Create `lib/auto-org/learning.ts` - correction → rule inference
7. Hook into chat creation API
8. Modify sidebar for indicator UI

### Phase 3: Import Interview (Weeks 5-6)

1. Schema changes - add all 5 new models
2. Run migration
3. Create parsers for ChatGPT and Claude export formats
4. Create extraction pipeline for entities/decisions
5. Create question generation and ranking system
6. Build interview UI flow
7. Create inference propagation engine
8. Integrate with Memory Vault and Auto-Organization

---

## Existing Codebase Reference

| Component | Location | Status |
|-----------|----------|--------|
| Prisma Models | `schema.prisma` | ChatThread, ChatMessage, Project, Document, DocumentChunk, Insight exist |
| Insights System | `lib/til/` | 6 insight types, queue system, pattern detection - mostly in-memory |
| Document Indexing | `packages/core/src/document-indexing/` | Full 6-stage pipeline architecture, adapters pattern |
| Memory Vault | Referenced in specs | Semantic store, PKV structure |

---

## Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| **Secretary Checklist** | Commitments caught | >90% of "I'll..." patterns |
| | False positive rate | <15% |
| **Auto-Organization** | Correction rate | <10% |
| | Manual project creation | <20% of projects |
| **Import Interview** | Questions to 80% confidence | <10 |
| | Interview completion rate | >60% |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `OSQR_V1_5_ROADMAP.md` | This document - master overview |
| `OSQR_AUTO_ORGANIZATION_SPEC.md` | Full spec for auto-organization |
| `OSQR_SECRETARY_CHECKLIST_ADDENDUM.md` | Full spec for secretary checklist |
| `OSQR_AI_HISTORY_INTERVIEW_SPEC.md` | Full spec for import interview |
| `OSQR_V1_5_IMPLEMENTATION_PLAN.md` | Claude in VS Code's detailed implementation plan |

---

## How To Resume

When ready to implement:

1. Open VS Code with OSQR codebase
2. Give Claude this prompt:

```
Read the V1.5 documentation in docs/features/:
- OSQR_V1_5_ROADMAP.md
- OSQR_SECRETARY_CHECKLIST_ADDENDUM.md
- OSQR_V1_5_IMPLEMENTATION_PLAN.md

Start with Secretary Checklist Phase 1:
1. Schema changes - add ExtractedItem, RecurringPattern models
2. Run the migration
3. Create lib/til/secretary/types.ts
4. Create lib/til/secretary/extractor.ts

Stop after extractor is working so we can test.
```

3. Review and test each phase before proceeding

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 24, 2024 | Initial V1.5 roadmap created from design session |

---

*Document Status: Ready for Implementation*
*Created By: Kable Record + Claude Web session*
