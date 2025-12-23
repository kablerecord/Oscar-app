# Intelligent Routing - Implementation Notes

**Status:** Blocked - Pending Training Data
**Source Specs:**
- [OSQR_Intelligent_Routing_Spec.docx](../../Documents/OSQR_Intelligent_Routing_Spec.docx)
- [OSQR_Intelligent_Routing_Addendum.docx](../../Documents/OSQR_Intelligent_Routing_Addendum.docx)
**Last Updated:** 2025-12-22

---

## Blocking Dependency

This work is blocked until Oscar is trained on Kable's chat history data. The Answer Space Classifier should be built based on real usage patterns, not just spec heuristics.

**Unblock condition:** Complete chat history import and analysis from Claude/ChatGPT exports.

**Why this matters:** The spec recommends analyzing chat history first to validate:
- Whether 70% of questions are Quick-mode appropriate
- What signals reliably predict "this needs Council"
- Whether V2.0 (automatic routing) is viable from launch

Building the classifier from real patterns will be more accurate than heuristics alone.

---

## Infrastructure Gap Analysis

### What Already Exists

| Component | Location | Status |
|-----------|----------|--------|
| Model Registry | `lib/ai/model-router.ts` | 13+ models, 6 providers, capability scores |
| Question Type Detection | `lib/ai/model-router.ts` | 8 types via regex patterns |
| Complexity Estimation | `lib/ai/model-router.ts` | 1-5 scale based on length, keywords, structure |
| 4 Response Modes | `lib/ai/oscar.ts` | Quick, Thoughtful, Contemplate, Council |
| Auto-Downgrading | `app/api/oscar/ask-stream/route.ts` | Thoughtful/Contemplate to Quick when complexity <=2 |
| Routing Notification UI | `components/oscar/RoutingNotification.tsx` | Shows mode changes with override option |
| Council Panel UI | `components/council/CouncilPanel.tsx` | Multi-model display component |
| Tier Enforcement | ask-stream route | Quick=all, Thoughtful=Pro+, Council=Master+ |
| AI Classification Endpoint | `app/api/oscar/classify/route.ts` | Claude Haiku, 4-axis scoring (clarity, intentDepth, knowledgeRequirement, consequenceWeight) |

### Key Insight: Different Classification Models

**Current system asks:** "What kind of question is this?"
- 8 question types (factual, creative, coding, analytical, reasoning, summarization, conversational, high_stakes)
- 1-5 complexity scale
- Mode suggestion based on type + complexity mapping

**Spec requires:** "How many valid answers could exist?"
- 3 answer spaces (singular, bounded, expansive)
- Cardinality-based routing
- Confidence scores for routing decisions

These are fundamentally different classification approaches. The current system categorizes by domain/type; the spec categorizes by solution space size.

### Answer Space Cardinality Framework

| Answer Space | Examples | Mode | Rationale |
|--------------|----------|------|-----------|
| **Singular** | "What's 2+2?", PKV lookups, factual queries | Quick (1 model) | No debate needed - retrieve or compute |
| **Bounded** | "React or Vue?", "Best auth approach?" | Thoughtful (2 models) | Benefits from second opinion, constrained solution space |
| **Expansive** | "What should my brand strategy be?", "How do I structure my legacy transfer?" | Council (6-8 models) | Genuinely requires diverse perspectives, no objectively "correct" answer |

**Key nuance from spec:** Refined Fire can compress answer space. A poorly-formed expansive question can become bounded with proper constraints, saving compute while improving quality.

### What Doesn't Exist Yet

| Spec Requirement | Current State | Notes |
|------------------|---------------|-------|
| Answer Space Classification | Not implemented | Need singular/bounded/expansive classifier |
| Mid-Response Escalation | No interruption capability | Streaming architecture doesn't support pause + branch |
| Refined Fire Integration | Not implemented | No question refinement flow before routing |
| Success Signal Tracking | Not implemented | No abandonment, correction, follow-up tracking |
| Learning System | Not implemented | No pattern storage, no per-user learning |
| Confidence Indicator UI | Not implemented | No clickable confidence display |
| De-escalation Disclosure | Partial | RoutingNotification exists but needs budget constraint messaging |
| Plugin Routing Overrides | Not implemented | No plugin API for routing rules |
| Chat History Import | Not implemented | No Claude/ChatGPT import capability |

---

## Proposed Implementation Phases

### Phase 1: Answer Space Classifier (Foundation)

Create `lib/ai/answer-space-classifier.ts`:

1. Implement detection heuristics from spec:
   - **Quick triggers:** Retrieval patterns ("What did we...", "Find the...", "Show me..."), factual queries, PKV queries, simple clarifications
   - **Thoughtful triggers:** Comparison patterns ("Should I X or Y?"), implementation questions ("How do I..."), bounded domains
   - **Council triggers:** Strategy patterns ("What should my..."), identity/values questions, open-ended futures, high-stakes decisions

2. Return interface matching spec:
   ```typescript
   interface QuestionClassification {
     answerSpace: 'singular' | 'bounded' | 'expansive';
     confidence: number; // 0-100
     suggestedMode: 'quick' | 'thoughtful' | 'council';
     triggers: string[]; // Which patterns matched
     refinementSuggestion?: string; // If question could be improved
   }
   ```

3. Run alongside existing classifier during transition for comparison/validation.

### Phase 2: Routing Integration

Wire the new classifier into the existing routing flow:

1. Replace or augment `detectQuestionType()` calls with `classifyAnswerSpace()`
2. Map answer spaces to modes:
   - singular -> Quick
   - bounded -> Thoughtful
   - expansive -> Council
3. Keep existing infrastructure (model registry, tier enforcement, UI components)
4. Update RoutingNotification to show answer space reasoning

### Phase 3: Observability (For Learning System)

Add success signal tracking per the addendum:

1. **Negative signals** (routing probably failed):
   - Abandonment: user leaves immediately after response
   - Correction: "No, that's not what I meant" or re-asks same question
   - Escalation request: "Think harder" or "Go deeper"

2. **Positive signals** (routing probably worked):
   - Follow-up depth: user asks follow-up questions that build on answer
   - Action taken: user creates task, edits doc, takes action based on answer
   - Later recall: user references this answer in another conversation

3. Store in format suitable for later analysis and learning loop.

### Deferred (Post-Alpha)

These require more architectural work or UX design:

- **Mid-response escalation:** Needs ability to interrupt generation and branch. Technical feasibility to be validated.
- **Refined Fire:** Needs UX design for question refinement flow. Positioning as "cost-saving offer, not gate."
- **Per-user learning:** Needs data first. "Kable tends to ask brand questions that seem bounded but actually benefit from Council."
- **Confidence Indicator UI:** Clickable indicator showing Oscar's certainty and reasoning.

---

## Technical Feasibility Questions

1. **Mid-response escalation:** Can streaming infrastructure support interruption + branching?
2. **Confidence scoring:** How does Oscar calculate confidence? Need to define algorithm.
3. **Success signal tracking:** Where is this data stored? How is it processed?
4. **Learning loop:** How often does Oscar update routing patterns? Per-session? Daily? Weekly?

---

## Reference Documents

**Source Specifications (in project):**
- `Documents/OSQR_Intelligent_Routing_Spec.docx` - Core framework, detection heuristics, UX evolution
- `Documents/OSQR_Intelligent_Routing_Addendum.docx` - Error recovery, de-escalation, success signals, alpha data collection

**Related Implementation:**
- `docs/features/QUERY_MODES.md` - Current mode system documentation
- `docs/architecture/MULTI-MODEL-ARCHITECTURE.md` - Model registry and routing
- `lib/ai/model-router.ts` - Current routing implementation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-22 | Initial implementation notes from spec review and infrastructure gap analysis |
