# OSQR Project Guidance System Specification

## Metadata
- **Version**: 1.0
- **Created**: 2025-12-19
- **Status**: Ready for Implementation
- **Dependencies**: Private Knowledge Vault (PKV), Constitutional Framework, Plugin Architecture
- **Blocked By**: PKV storage layer must exist
- **Enables**: Plugin customization overrides, Cross-project templates (v2.0)

## Executive Summary

The Project Guidance System enables users to define project-scoped instructions (MentorScripts) that Oscar follows across all interactions within that project. As users work, Oscar learns from corrections and proposes new rules for promotion to permanent guidance—implementing the "Mentorship-as-Code" paradigm where user preferences become version-controlled, auditable artifacts.

## Scope

### In Scope
- Three-layer prompt hierarchy (Constitutional → MentorScript → BriefingScript)
- User-defined MentorScript items with CRUD operations
- Inferred mentorship: Oscar proposes rules from user corrections
- Version-controlled resolutions (VCR) with rollback capability
- Context budget management (70% rule)
- Settings UI for managing project guidance
- In-chat proposal UI for inferred rules
- Plugin precedence arbitration
- Traceability via progressive disclosure
- Cognitive load limits (15 soft / 25 hard)

### Out of Scope (Deferred)
- Cross-project guidance sharing or inheritance (v2.0)
- Guidance templates for new projects (v2.0)
- ML-based rule consolidation suggestions (v2.0)
- Reference document parsing and indexing (v2.0)
- Collaborative guidance editing (multi-user projects) (v2.0+)

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: CONSTITUTIONAL (Immutable - OSQR Core)            │
│  • Cannot be overridden by projects or plugins              │
│  • Deliberative alignment at every reasoning step           │
│  • The Gatekeeper pattern for task authorization            │
└─────────────────────────────────────────────────────────────┘
                            ↓ overrides
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: MENTORSCRIPT (Project-Scoped - User Defined)      │
│  • Persists across sessions within the project              │
│  • Version-controlled, auditable                            │
│  • User edits in Settings → Project Guidance                │
│  • Overrides plugin defaults via customization field        │
└─────────────────────────────────────────────────────────────┘
                            ↓ overrides
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: BRIEFINGSCRIPT (Session-Scoped - Contextual)      │
│  • Just-in-time context for current task                    │
│  • Inferred from conversation or explicitly stated          │
│  • Ephemeral unless promoted to MentorScript                │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   User Message   │
                    └────────┬─────────┘
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                    OSCAR RESPONSE GENERATION                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Load         │→ │ Apply 70%    │→ │ Generate Response    │  │
│  │ MentorScript │  │ Context Rule │  │ with Guidance        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                             ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Inference Engine: Detect correction → Propose rule?      │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                             ↓
              ┌──────────────────────────┐
              │ Response + Optional      │
              │ Rule Proposal Card       │
              └──────────────────────────┘
```

### Core Data Structures

```typescript
// Stored per-project in Private Knowledge Vault (PKV)
interface ProjectGuidance {
  project_id: string;
  version: number;
  last_updated: string; // ISO8601
  mentor_scripts: MentorScriptItem[];
  reference_docs: ReferenceDoc[];
}

interface MentorScriptItem {
  id: string; // UUID
  rule: string; // Natural language prose
  source: 'user_defined' | 'inferred';
  original_correction?: string; // Present if source === 'inferred'
  promoted_from_session?: string; // Session ID where inference occurred
  created: string; // ISO8601
  applied_count: number;
  priority: number; // 1-10, default 5
}

interface ReferenceDoc {
  path: string; // e.g., "/docs/api-conventions.md"
  context: string; // e.g., "For API design decisions"
}

// Version Control Resolution - logged for every change
interface VCR {
  version: number;
  timestamp: string; // ISO8601
  action: 'add' | 'edit' | 'remove';
  item_id: string;
  previous_state?: MentorScriptItem;
  new_state?: MentorScriptItem;
}

// Inference proposal shown in chat
interface RuleProposal {
  proposed_rule: string;
  original_correction: string;
  session_id: string;
  confidence: number; // 0-1, threshold for showing: 0.7
  status: 'pending' | 'accepted' | 'edited' | 'dismissed';
}

// Context selection result
interface ContextBudgetResult {
  loaded_items: MentorScriptItem[];
  excluded_items: MentorScriptItem[];
  total_tokens_used: number;
  budget_percentage: number; // Target: ~70%
}
```

### Key Algorithms

#### Context Budget Selection (70% Rule)

```typescript
function selectMentorScriptItems(
  allItems: MentorScriptItem[],
  currentTask: string,
  contextBudget: number // Total available tokens
): ContextBudgetResult {
  const targetBudget = contextBudget * 0.70;
  let usedTokens = 0;
  const loaded: MentorScriptItem[] = [];
  const excluded: MentorScriptItem[] = [];

  // Score each item
  const scored = allItems.map(item => ({
    item,
    score: calculateItemScore(item, currentTask)
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Load items until budget reached
  for (const { item, score } of scored) {
    const itemTokens = estimateTokens(item.rule);
    if (usedTokens + itemTokens <= targetBudget) {
      loaded.push(item);
      usedTokens += itemTokens;
    } else {
      excluded.push(item);
    }
  }

  return {
    loaded_items: loaded,
    excluded_items: excluded,
    total_tokens_used: usedTokens,
    budget_percentage: (usedTokens / contextBudget) * 100
  };
}

function calculateItemScore(item: MentorScriptItem, currentTask: string): number {
  // Weights sum to 1.0
  const RELEVANCE_WEIGHT = 0.40;
  const PRIORITY_WEIGHT = 0.25;
  const FREQUENCY_WEIGHT = 0.20;
  const RECENCY_WEIGHT = 0.15;

  const relevance = semanticSimilarity(item.rule, currentTask); // 0-1
  const priority = item.priority / 10; // Normalize to 0-1
  const frequency = Math.min(item.applied_count / 100, 1); // Cap at 100
  const recency = calculateRecencyScore(item.created); // 0-1, decays over time

  return (
    relevance * RELEVANCE_WEIGHT +
    priority * PRIORITY_WEIGHT +
    frequency * FREQUENCY_WEIGHT +
    recency * RECENCY_WEIGHT
  );
}

function calculateRecencyScore(created: string): number {
  const daysSinceCreation = (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24);
  // Decay function: 1.0 at day 0, ~0.5 at day 30, ~0.1 at day 90
  return Math.exp(-daysSinceCreation / 40);
}
```

#### Correction Inference Engine

```typescript
interface InferenceResult {
  shouldPropose: boolean;
  proposedRule?: string;
  confidence: number;
  reasoning: string;
}

function analyzeForInference(
  userMessage: string,
  oscarPreviousResponse: string,
  conversationHistory: Message[]
): InferenceResult {
  // Step 1: Detect if this is a correction
  const correctionSignals = detectCorrectionSignals(userMessage);
  if (!correctionSignals.isCorrection) {
    return { shouldPropose: false, confidence: 0, reasoning: 'Not a correction' };
  }

  // Step 2: Classify as "now" vs "always"
  const temporalClassification = classifyTemporalScope(userMessage);

  // Step 3: Check for repetition pattern
  const repetitionCount = countSimilarCorrections(
    correctionSignals.correctionType,
    conversationHistory
  );

  // Step 4: Calculate confidence
  let confidence = 0.3; // Base confidence for any correction

  // Boost for explicit permanence language
  if (temporalClassification.explicitAlways) {
    confidence += 0.4; // "Always", "From now on", "In this project"
  }

  // Boost for repetition
  if (repetitionCount >= 2) {
    confidence += 0.2;
  }

  // Boost for generalizability
  if (temporalClassification.isGeneralizable) {
    confidence += 0.1;
  }

  // Step 5: Generate proposed rule if confidence threshold met
  if (confidence >= 0.7) {
    const proposedRule = generateRuleFromCorrection(userMessage, correctionSignals);
    return {
      shouldPropose: true,
      proposedRule,
      confidence,
      reasoning: `Correction detected with ${temporalClassification.explicitAlways ? 'explicit' : 'implicit'} permanence signal`
    };
  }

  return {
    shouldPropose: false,
    confidence,
    reasoning: `Confidence ${confidence} below threshold 0.7`
  };
}

function detectCorrectionSignals(message: string): {
  isCorrection: boolean;
  correctionType: string;
  originalBehavior?: string;
  desiredBehavior?: string;
} {
  const correctionPatterns = [
    /no,?\s*(I\s*)?(want|need|prefer)/i,
    /don't\s+(do|say|use|include)/i,
    /instead\s+of/i,
    /not\s+like\s+that/i,
    /that's\s+not\s+(what|how)/i,
    /please\s+(don't|stop|avoid)/i,
    /I\s+said/i,
    /I\s+meant/i,
    /you\s+should\s+(have|always)/i
  ];

  const isCorrection = correctionPatterns.some(p => p.test(message));

  // Extract correction type (simplified)
  let correctionType = 'general';
  if (/format|style|structure/i.test(message)) correctionType = 'formatting';
  if (/ask|question|clarif/i.test(message)) correctionType = 'interaction_style';
  if (/code|file|snippet/i.test(message)) correctionType = 'code_output';
  if (/tone|voice|sound/i.test(message)) correctionType = 'tone';

  return { isCorrection, correctionType };
}

function classifyTemporalScope(message: string): {
  explicitAlways: boolean;
  explicitNow: boolean;
  isGeneralizable: boolean;
} {
  const alwaysPatterns = [
    /always/i,
    /from\s+now\s+on/i,
    /in\s+this\s+project/i,
    /every\s+time/i,
    /going\s+forward/i,
    /remember\s+(to|that)/i
  ];

  const nowPatterns = [
    /this\s+time/i,
    /for\s+(this|now)/i,
    /just\s+(this|here)/i,
    /right\s+now/i,
    /in\s+this\s+(case|instance)/i
  ];

  // Check for task-specific details that reduce generalizability
  const specificityPatterns = [
    /\b(line|row|column)\s+\d+/i,
    /\bthis\s+(file|function|variable)\b/i,
    /\b(here|there)\b/i
  ];

  const explicitAlways = alwaysPatterns.some(p => p.test(message));
  const explicitNow = nowPatterns.some(p => p.test(message));
  const hasSpecificity = specificityPatterns.some(p => p.test(message));

  return {
    explicitAlways,
    explicitNow,
    isGeneralizable: !hasSpecificity && !explicitNow
  };
}
```

#### Plugin Precedence Arbitration

```typescript
interface GuidanceSource {
  type: 'constitutional' | 'user_mentorscript' | 'plugin' | 'briefingscript';
  content: string;
  source_id: string;
}

function resolveGuidanceConflict(sources: GuidanceSource[]): GuidanceSource {
  // Explicit precedence order (highest to lowest)
  const precedenceOrder = ['constitutional', 'user_mentorscript', 'plugin', 'briefingscript'];

  // Sort by precedence
  sources.sort((a, b) =>
    precedenceOrder.indexOf(a.type) - precedenceOrder.indexOf(b.type)
  );

  // Return highest precedence source
  return sources[0];
}

function mergeGuidanceLayers(
  constitutional: string[],
  userMentorScript: MentorScriptItem[],
  pluginGuidance: string[],
  briefingScript: string[]
): string {
  // Constitutional always included in full
  let merged = constitutional.join('\n\n');

  // User MentorScript (may override plugin)
  merged += '\n\n## Project Guidance\n';
  merged += userMentorScript.map(item => `- ${item.rule}`).join('\n');

  // Plugin guidance (only items not overridden by user)
  const userRuleTopics = userMentorScript.map(extractTopic);
  const nonOverriddenPluginGuidance = pluginGuidance.filter(
    pg => !userRuleTopics.some(topic => pg.toLowerCase().includes(topic))
  );
  if (nonOverriddenPluginGuidance.length > 0) {
    merged += '\n\n## Plugin Defaults\n';
    merged += nonOverriddenPluginGuidance.map(g => `- ${g}`).join('\n');
  }

  // BriefingScript (session-specific)
  if (briefingScript.length > 0) {
    merged += '\n\n## This Session\n';
    merged += briefingScript.join('\n');
  }

  return merged;
}
```

## Implementation Checklist

### Phase 1: Foundation (Storage Layer)
- [ ] Create PKV schema for `project_guidance` collection
- [ ] Implement `MentorScriptItem` CRUD operations
- [ ] Implement `VCR` logging for all mutations
- [ ] Add `ProjectGuidance` retrieval by project_id
- [ ] Implement version incrementing on any change
- [ ] Add rollback function using VCR history

### Phase 2: Core Logic (Context Integration)
- [ ] Implement `selectMentorScriptItems()` with 70% budget
- [ ] Add `calculateItemScore()` with all four factors
- [ ] Integrate MentorScript loading at response generation start
- [ ] Implement `applied_count` increment when rule influences response
- [ ] Add semantic similarity function for relevance scoring
- [ ] Implement token estimation for budget calculation

### Phase 3: Inference Engine
- [ ] Implement `detectCorrectionSignals()` pattern matching
- [ ] Implement `classifyTemporalScope()` for now vs always
- [ ] Add correction history tracking per session
- [ ] Implement `generateRuleFromCorrection()`
- [ ] Set confidence threshold at 0.7
- [ ] Create `RuleProposal` generation pipeline

### Phase 4: Plugin Integration
- [ ] Implement `resolveGuidanceConflict()` precedence logic
- [ ] Implement `mergeGuidanceLayers()` for context construction
- [ ] Add topic extraction for override detection
- [ ] Test precedence: Constitutional > User > Plugin > Briefing

### Phase 5: Settings UI
- [ ] Create Project Guidance panel in Settings
- [ ] Display MentorScript items with source icons (pencil / lightbulb)
- [ ] Show "Used X times" counter per item
- [ ] Implement edit inline functionality
- [ ] Implement remove with confirmation
- [ ] Implement "Add Guidance" manual entry
- [ ] Add expandable "Learned from" for inferred items
- [ ] Create version history view
- [ ] Implement rollback action

### Phase 6: In-Chat Proposal UI
- [ ] Create proposal card component
- [ ] Wire inference engine output to card rendering
- [ ] Implement "Add to Project" action
- [ ] Implement "Edit" action with inline editing
- [ ] Implement "Dismiss" action
- [ ] Log proposal outcomes for metrics

### Phase 7: Testing & Validation
- [ ] Unit tests for context budget selection
- [ ] Unit tests for inference engine patterns
- [ ] Unit tests for precedence arbitration
- [ ] Integration test: correction → proposal → acceptance → persistence
- [ ] Integration test: rollback restores previous state
- [ ] Load test: 25 items within context budget

## API Contracts

### Inputs

```typescript
// Load project guidance
GET /api/projects/{project_id}/guidance
Response: ProjectGuidance

// Add MentorScript item
POST /api/projects/{project_id}/guidance/items
Body: { rule: string, priority?: number }
Response: MentorScriptItem

// Update MentorScript item
PUT /api/projects/{project_id}/guidance/items/{item_id}
Body: { rule?: string, priority?: number }
Response: MentorScriptItem

// Delete MentorScript item
DELETE /api/projects/{project_id}/guidance/items/{item_id}
Response: { success: boolean, vcr: VCR }

// Accept inferred rule proposal
POST /api/projects/{project_id}/guidance/items/from-proposal
Body: RuleProposal
Response: MentorScriptItem

// Get version history
GET /api/projects/{project_id}/guidance/history
Response: VCR[]

// Rollback to version
POST /api/projects/{project_id}/guidance/rollback
Body: { target_version: number }
Response: ProjectGuidance
```

### Outputs

```typescript
// Event: Rule applied during response generation
interface RuleAppliedEvent {
  item_id: string;
  project_id: string;
  session_id: string;
  timestamp: string;
}

// Event: Rule proposal generated
interface RuleProposalEvent {
  proposal: RuleProposal;
  project_id: string;
  session_id: string;
}

// Event: Guidance changed
interface GuidanceChangedEvent {
  project_id: string;
  vcr: VCR;
}
```

## Configuration

### Environment Variables

```env
OSQR_GUIDANCE_CONTEXT_BUDGET_PERCENT=70
OSQR_GUIDANCE_INFERENCE_THRESHOLD=0.7
OSQR_GUIDANCE_SOFT_LIMIT=15
OSQR_GUIDANCE_HARD_LIMIT=25
OSQR_GUIDANCE_RECENCY_DECAY_DAYS=40
```

### Default Values

| Parameter | Default | Description |
|-----------|---------|-------------|
| `context_budget_percent` | 70 | Target % of context window for guidance |
| `inference_threshold` | 0.7 | Minimum confidence to propose rule |
| `soft_limit` | 15 | Warning threshold for item count |
| `hard_limit` | 25 | Maximum items per project |
| `recency_decay_days` | 40 | Half-life for recency scoring |
| `default_priority` | 5 | Priority for new items (1-10 scale) |

## Error Handling

### Failure Modes

| Scenario | Response | Fallback |
|----------|----------|----------|
| PKV unavailable | Log error, continue without guidance | Use empty MentorScript, notify user |
| Context budget exceeded | Apply selection algorithm | Load highest-priority items only |
| Inference engine timeout | Skip proposal generation | Response proceeds without proposal |
| VCR write fails | Retry 3x, then proceed | Log to secondary store, reconcile later |
| Rollback target not found | Return error to user | Show available versions |
| Item count exceeds hard limit | Block add, show consolidation prompt | Suggest merging similar rules |

## Success Criteria

1. [ ] User can add a MentorScript item via Settings and Oscar follows it in next response
2. [ ] User corrects Oscar with "always do X" → proposal appears → acceptance persists rule
3. [ ] 25 items load within 70% context budget (selection algorithm works)
4. [ ] User removes item → Oscar stops following it immediately (no restart)
5. [ ] Rollback restores exact previous state including all item properties
6. [ ] Plugin guidance is overridden when user has conflicting MentorScript item
7. [ ] Inferred rules show "Learned from" with original correction text
8. [ ] "Used X times" counter increments correctly

## Open Questions

- [ ] **Consolidation UX**: When user hits 15+ items, how exactly should Oscar prompt for consolidation? Inline suggestion? Dedicated flow?
- [ ] **Reference docs implementation**: How do we parse and index reference documents? Chunking strategy? (Deferred to v2.0 but needs design)
- [ ] **Semantic similarity provider**: Which embedding model for relevance scoring? Local or API?
- [ ] **Cross-session inference**: Should Oscar remember corrections from previous sessions when calculating repetition count?
- [ ] **Proposal timing**: Show proposal immediately after correction, or batch at end of session? (Current design: immediate)
- [ ] **Confidence display**: Should users see the confidence score on proposals? Or just show/hide based on threshold?

## Research Foundation

This specification was informed by NotebookLM research on:

- **SASE (Structured Agentic Software Engineering)**: BriefingScript/MentorScript/LoopScript hierarchy
- **Mentorship-as-Code / ATME**: Version-controlled rulebooks, inferred mentorship from corrections
- **Context Engineering**: 70% context rule, compaction strategies, relevance-based retrieval
- **BMAD Method**: Agent customization fields, lean context management
- **MCP Documentation**: Capability negotiation, elicitation primitives
- **ACE (Agent Command Environment)**: Progressive disclosure, inbox-style review queues

Key analogies used:
- MentorScript = "Employee handbook for this project"
- BriefingScript = "Sheet music for today's performance"
- Constitutional = "Company legal policy"
- Context management = "Museum curator selecting artifacts for exhibition"

## Appendices

### A: UI Mockups

#### Settings Panel

```
┌─────────────────────────────────────────────────────────────┐
│  PROJECT SETTINGS: VoiceQuote v2 Build                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 PROJECT GUIDANCE                          [+ Add]       │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  1. ✏️ Always search existing codebase before suggesting    │
│        new files - I want to extend, not duplicate          │
│        [Edit] [Remove]                     Used 47 times    │
│                                                             │
│  2. 💡 When debugging, ask clarifying questions before      │
│        proposing solutions                                  │
│        [Edit] [Remove]                     Used 12 times    │
│        ↳ Learned from: "No, I wanted you to ask first..."  │
│                                                             │
│  3. ✏️ Format code as complete files, not snippets          │
│        [Edit] [Remove]                     Used 3 times     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  📁 REFERENCE DOCUMENTS                       [+ Add]       │
│  • /docs/api-conventions.md (API design decisions)          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  🕐 VERSION HISTORY                                         │
│  • v3 - Added "Format code..." (2 hours ago)               │
│  • v2 - Added "When debugging..." (yesterday)    [Restore] │
│  • v1 - Added "Always search..." (Dec 15)        [Restore] │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Legend: ✏️ = user-defined  |  💡 = inferred from correction
```

#### In-Chat Proposal Card

```
┌─────────────────────────────────────────────────────────────┐
│  💡 Suggested Project Guidance                              │
│                                                             │
│  "When debugging, ask clarifying questions before           │
│   proposing solutions"                                      │
│                                                             │
│  [Add to Project]  [Edit]  [Dismiss]                       │
└─────────────────────────────────────────────────────────────┘
```

### B: Example Payloads

#### Stored ProjectGuidance

```json
{
  "project_id": "voicequote-v2-build",
  "version": 3,
  "last_updated": "2025-12-19T10:30:00Z",
  "mentor_scripts": [
    {
      "id": "ms-001",
      "rule": "Always search existing codebase before suggesting new files - I want to extend, not duplicate",
      "source": "user_defined",
      "created": "2025-12-15T09:00:00Z",
      "applied_count": 47,
      "priority": 5
    },
    {
      "id": "ms-002",
      "rule": "When debugging, ask clarifying questions before proposing solutions",
      "source": "inferred",
      "original_correction": "No, I wanted you to ask first before jumping to solutions",
      "promoted_from_session": "session-abc123",
      "created": "2025-12-18T14:22:00Z",
      "applied_count": 12,
      "priority": 5
    },
    {
      "id": "ms-003",
      "rule": "Format code as complete files, not snippets",
      "source": "user_defined",
      "created": "2025-12-19T08:15:00Z",
      "applied_count": 3,
      "priority": 5
    }
  ],
  "reference_docs": [
    {
      "path": "/docs/api-conventions.md",
      "context": "For API design decisions"
    }
  ]
}
```

#### VCR Entry

```json
{
  "version": 3,
  "timestamp": "2025-12-19T08:15:00Z",
  "action": "add",
  "item_id": "ms-003",
  "previous_state": null,
  "new_state": {
    "id": "ms-003",
    "rule": "Format code as complete files, not snippets",
    "source": "user_defined",
    "created": "2025-12-19T08:15:00Z",
    "applied_count": 0,
    "priority": 5
  }
}
```

#### Rule Proposal

```json
{
  "proposed_rule": "When debugging, ask clarifying questions before proposing solutions",
  "original_correction": "No, I wanted you to ask first before jumping to solutions",
  "session_id": "session-abc123",
  "confidence": 0.82,
  "status": "pending"
}
```

### C: File Structure

```
/src/guidance/
├── index.ts                    # Public exports
├── types.ts                    # All TypeScript interfaces
├── storage/
│   ├── guidance.repository.ts  # PKV CRUD operations
│   └── vcr.repository.ts       # Version control logging
├── context/
│   ├── budget.ts               # 70% rule implementation
│   ├── scoring.ts              # Item relevance scoring
│   └── loader.ts               # Load guidance at response start
├── inference/
│   ├── detector.ts             # Correction signal detection
│   ├── classifier.ts           # Now vs Always classification
│   └── proposer.ts             # Rule proposal generation
├── arbitration/
│   ├── precedence.ts           # Layer conflict resolution
│   └── merger.ts               # Combine all guidance layers
├── api/
│   ├── routes.ts               # REST endpoints
│   └── handlers.ts             # Request handlers
└── __tests__/
    ├── budget.test.ts
    ├── inference.test.ts
    ├── precedence.test.ts
    └── integration.test.ts
```

---

**End of Specification**

*Document Version: 1.0*
*Status: Ready for Implementation*
*Next Review: Post-v1.0 Launch*
