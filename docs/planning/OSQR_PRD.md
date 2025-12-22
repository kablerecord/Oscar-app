# OSQR Product Requirements Document
## Version 1.0

**Status:** Implementation Ready
**Last Updated:** 2025-12-20
**Owner:** Kable Record

---

## 1. Functional Requirements

### FR-001: Constitutional Framework

**Purpose:** Ensure all OSQR responses are governed by immutable principles.

**Requirements:**
- Three-tier clause system (Sacred, Core, Standard)
- Real-time violation detection on all outputs
- Response blocking when sacred clauses violated
- Audit logging for all constitutional checks
- Version-controlled constitution amendments

**Implementation Status:** Complete
**Source:** `docs/governance/OSQR_CONSTITUTION.md`
**Code Location:** `lib/osqr/constitutional-wrapper.ts`

---

### FR-002: Memory Vault

**Purpose:** Provide persistent, privacy-preserving memory across sessions.

**Requirements:**
- Three-tier memory architecture:
  - **Episodic:** Conversation history, timestamped interactions
  - **Semantic:** Concepts, relationships, extracted knowledge
  - **Procedural:** User patterns, preferences, behavioral data
- PKV/GPKV separation (Personal vs Global knowledge)
- Privacy-aware retrieval (respect tier settings)
- Vector-based semantic search
- User-controlled deletion (cryptographic destruction)

**Implementation Status:** Complete
**Source:** `docs/architecture/KNOWLEDGE_ARCHITECTURE.md`
**Code Location:** `lib/osqr/memory-wrapper.ts`

---

### FR-003: Multi-Model Router

**Purpose:** Intelligently route questions to optimal AI models.

**Requirements:**
- Question type classification (factual, creative, coding, analytical, reasoning, high_stakes)
- Complexity estimation (1-5 scale)
- Model capability profiling
- Cost-aware routing
- Confidence-based escalation
- Fallback chain for model failures

**Implementation Status:** Complete
**Source:** `docs/architecture/MULTI-MODEL-ARCHITECTURE.md`
**Code Location:** `lib/osqr/router-wrapper.ts`, `lib/ai/model-router.ts`

---

### FR-004: Project Guidance

**Purpose:** Maintain project context and guide users through complex work.

**Requirements:**
- Project creation and management
- Context retrieval for current project
- Guidance limits and budget tracking
- Cross-project context awareness
- Semantic similarity calculations

**Implementation Status:** Complete
**Source:** `docs/features/JARVIS_CAPABILITIES.md`
**Code Location:** `lib/osqr/index.ts` (guidance exports)

---

### FR-005: Temporal Intelligence

**Purpose:** Track user commitments and provide time-aware guidance.

**Requirements:**
- Commitment signal detection in messages
- Temporal expression extraction (deadlines, schedules)
- Morning digest generation
- Priority calculation for temporal items
- Deadline tracking and reminders

**Implementation Status:** Complete
**Source:** `docs/features/QUEUE-SYSTEM.md`
**Code Location:** `lib/osqr/temporal-wrapper.ts`

---

### FR-006: Council Mode

**Purpose:** Enable visible multi-model deliberation for complex decisions.

**Requirements:**
- Multi-model panel configuration (2-6 models)
- Parallel model execution
- Real-time streaming per model
- OSQR moderator synthesis
- Model personality display
- User model selection controls

**Implementation Status:** Complete
**Source:** `docs/features/COUNCIL-MODE.md`
**Code Location:** Council namespace in `@osqr/core`

---

### FR-007: Bubble Interface

**Purpose:** Provide proactive, context-aware intelligence surface.

**Requirements:**
- Presence states (available, thinking, waiting, connected)
- Time-based greeting system
- Plugin prompt injection
- Surface transitions (bubble → panel → deliberation)
- Quick actions contextual to user state
- Focus mode awareness

**Implementation Status:** Complete
**Source:** `docs/features/BUBBLE-COMPONENT-SPEC.md`
**Code Location:** `lib/osqr/bubble-wrapper.ts`, `components/oscar/OSCARBubble.tsx`

---

### FR-008: Plugin Architecture

**Purpose:** Enable extensible, consent-based capability expansion.

**Requirements:**
- Plugin loading and identity management
- Consent screen before activation
- Plugin influence hooks (pre-response, post-response, memory annotation)
- On/off toggle per plugin
- Constitutional override protection (plugins cannot violate sacred clauses)
- Proactivity level configuration (laid_back, informed, forceful)

**Implementation Status:** Specified, partial implementation
**Source:** `docs/architecture/PLUGIN_ARCHITECTURE.md`

---

### FR-009: Document Indexing

**Purpose:** Process and index user documents for semantic retrieval.

**Requirements:**
- Document type detection
- Chunking and embedding generation
- Semantic search via concept queries
- Cross-project document search
- Storage in user's PKV
- Re-indexing on document updates

**Implementation Status:** Complete
**Source:** `docs/features/MEDIA-VAULT.md`
**Code Location:** `lib/osqr/document-indexing-wrapper.ts`

---

### FR-010: Throttle Architecture

**Purpose:** Manage usage limits and tier-based feature access.

**Requirements:**
- Query budget tracking per tier
- Feature gating (mode access by tier)
- Graceful degradation messaging
- Overage purchase flow
- Budget status API
- Referral bonus system

**Implementation Status:** Complete
**Source:** `docs/business/PRICING-ARCHITECTURE.md`
**Code Location:** `lib/osqr/throttle-wrapper.ts`

---

## 2. Non-Functional Requirements

### NFR-001: Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Memory retrieval | <500ms | 95th percentile |
| Constitutional checks | <50ms | Additional latency |
| Router decisions | <100ms | Per request |
| Bubble render | <100ms | First paint |
| Document indexing | <5s | Per document (async) |

---

### NFR-002: Security

| Requirement | Implementation |
|-------------|----------------|
| Zero data leakage between users | Hard tenant isolation, per-user encryption |
| Privacy tier enforcement | Checked at all access points |
| Audit logging | All sensitive operations logged |
| No founder vault access | Architectural enforcement, no exceptions |
| Cryptographic deletion | Key destruction on user delete |
| No psychological profiles | References only, runtime synthesis |

---

### NFR-003: Scalability

| Requirement | Approach |
|-------------|----------|
| Stateless core | All state in Memory Vault |
| Horizontal scaling | No shared memory between instances |
| Interface agnosticism | Core doesn't know about interfaces |
| In-memory → persistent transition | Designed for storage abstraction |

---

### NFR-004: Reliability

| Requirement | Implementation |
|-------------|----------------|
| Graceful model failures | Fallback routing chain |
| No single points of failure | Redundant model providers |
| Constitutional checks never skipped | Fail-closed on check errors |
| Budget enforcement | Blocks before threshold, warns before block |

---

## 3. Epic Hierarchy

| Epic | Components | Priority | Status |
|------|------------|----------|--------|
| E-001: Governance | Constitutional Framework | P0 | Complete |
| E-002: Memory | Memory Vault, Document Indexing | P0 | Complete |
| E-003: Intelligence | Router, Council Mode | P0 | Complete |
| E-004: Guidance | Project Guidance, Temporal Intelligence | P0 | Complete |
| E-005: Interface | Bubble, Design System | P0 | Complete |
| E-006: Business | Throttle, Conversion, Onboarding | P1 | Complete |
| E-007: Ecosystem | Plugin Architecture, Marketplace | P2 | Planned |
| E-008: Advanced | Insights System, Client-Side Keys | P2 | Planned |

---

## 4. Dependencies

### Component Dependency Graph

```
Constitutional Framework (E-001)
         │
         ├── Memory Vault (E-002) ─────────────┐
         │         │                           │
         │         ├── Document Indexing       │
         │         │                           │
         ├── Router (E-003) ───────────────────┤
         │         │                           │
         │         ├── Council Mode            │
         │         │                           │
         ├── Project Guidance (E-004) ─────────┤
         │         │                           │
         │         ├── Temporal Intelligence   │
         │         │                           │
         └── Bubble Interface (E-005) ─────────┤
                   │                           │
                   └── Design System           │
                                               │
                   Throttle (E-006) ───────────┤
                            │                  │
                            ├── Onboarding     │
                            │                  │
                            └── Conversion     │
                                               │
                   Plugin Architecture (E-007) ┘
                            │
                            └── Marketplace
```

### Critical Path

1. **Constitutional Framework** → Foundation for all components
2. **Memory Vault** → Required by Router, Guidance, Bubble
3. **Router** → Required by Council Mode, all AI interactions
4. **Throttle** → Required for tier-based feature access

---

## 5. Constraints

### Architectural Constraints

| Constraint | Rationale |
|------------|-----------|
| All state lives in core, not interfaces | Interface agnosticism |
| Constitutional checks cannot be bypassed | Trust guarantee |
| Memory Vault is single source of truth | Consistency |
| Plugins cannot violate constitutional constraints | Safety |
| No training on user content | Privacy promise |
| Founder cannot access user vaults | Trust architecture |

### Technical Constraints

| Constraint | Current State | Target State |
|------------|---------------|--------------|
| In-memory storage | Current | Persistent storage for production |
| Webpack build (Turbopack issues) | Current | Turbopack when resolved |
| chromadb optional | Current | Required for production memory |

### Business Constraints

| Constraint | Implementation |
|------------|----------------|
| Starter tier monthly only | No annual option at $20 |
| Query limits invisible | Backend guardrails, not marketing |
| Founder pricing locked | Early adopter loyalty |

---

## 6. Acceptance Criteria by Epic

### E-001: Governance
- [ ] Constitutional validation runs on every response
- [ ] Sacred clause violations block response
- [ ] Audit logs capture all checks
- [ ] Constitution version tracked

### E-002: Memory
- [ ] Messages persist across sessions
- [ ] Semantic search returns relevant context
- [ ] User deletion removes all data
- [ ] PKV isolated from other users

### E-003: Intelligence
- [ ] Questions routed to optimal model
- [ ] Council mode shows multiple perspectives
- [ ] Synthesis produces unified answer
- [ ] Fallback works on model failure

### E-004: Guidance
- [ ] Project context retrieved accurately
- [ ] Temporal commitments tracked
- [ ] Morning digest generated
- [ ] Cross-project connections surfaced

### E-005: Interface
- [ ] Bubble presence states animate correctly
- [ ] Greeting matches time of day
- [ ] Surface transitions preserve context
- [ ] Accessibility requirements met

### E-006: Business
- [ ] Tier limits enforced
- [ ] Upgrade prompts appear at appropriate moments
- [ ] Onboarding completes with document upload
- [ ] Budget status visible to users

---

### FR-011: Query Modes (V1.0)

**Purpose:** Provide tiered query processing with transparency options.

**Requirements:**
- Three query modes: Quick, Thoughtful, Contemplate
- Quick Mode: Single model, fast response
- Thoughtful Mode: Multiple models in parallel, synthesized
- Contemplate Mode: Sequential with delta critique
- Auto-routing based on query complexity
- User mode selection in UI
- Council Mode UI for Master tier (transparency layer)
- Pro tier sees blurred Council Mode (teaser)

**Implementation Status:** Specified
**Source:** `docs/features/QUERY_MODES.md`

---

### FR-012: Capture Router (V1.5)

**Purpose:** Enable natural language capture of reminders, notes, and follow-ups.

**Requirements:**
- Intent classification (reminder, note, action_item, deferred_question, follow_up)
- Three trigger types: time-based, event-based, context-based
- Confidence-based action/clarification thresholds
- Memory Vault integration for storage
- Calendar integration for event triggers
- Surfacing via Bubble at trigger time
- Natural confirmation patterns (not robotic)

**Implementation Status:** Specified
**Source:** `docs/features/CAPTURE_ROUTER.md`

---

### FR-013: Email Integration (V1.5)

**Purpose:** Extend OSQR intelligence to include email as knowledge source.

**Requirements:**
- Gmail OAuth2 connection (read-only)
- Conservative index with JIT retrieval
- Thread compaction to reduce redundancy
- Hybrid search (lexical + semantic)
- Smart filtering (Primary inbox, engaged senders)
- Trust gate messaging before connection
- Paid add-on pricing model
- User-controlled disconnect and deletion

**Implementation Status:** Specified
**Source:** `docs/features/EMAIL_INTEGRATION.md`

---

### FR-014: Plugin Creator (V1.5)

**Purpose:** Enable conversational plugin development.

**Requirements:**
- Conversational extraction of plugin spec
- Real-time control population during conversation
- Minimum viable plugin requirements
- Testing interface before publish
- Compliance check (constitutional constraints)
- Versioning with opt-in updates
- 80/20 revenue split
- Creator analytics (installs, active users)

**Implementation Status:** Specified
**Source:** `docs/plugins/PLUGIN_CREATOR_SPEC.md`

---

### FR-015: Spoken Architecture (V2.0)

**Purpose:** Enable guided software development through conversation.

**Requirements:**
- Document hierarchy (Planning → Execution → Completion)
- Auto-categorization of user input
- Gap detection and guided questioning
- Progress tracking and dashboard
- Cross-session memory integration
- MentorScript and LoopScript generation
- Minimum Viable Specification (MVS) standards

**Implementation Status:** Specified
**Source:** `docs/execution/SPOKEN_ARCHITECTURE.md`

---

## Related Documents

- [OSQR_PROJECT_BRIEF.md](./OSQR_PROJECT_BRIEF.md) — Strategic overview
- [OSQR_MENTORSCRIPT.md](../execution/OSQR_MENTORSCRIPT.md) — Development standards
- [SPOKEN_ARCHITECTURE.md](../execution/SPOKEN_ARCHITECTURE.md) — Guided development methodology
- [BUILD-LOG.md](../../BUILD-LOG.md) — Integration status
- Epic files in `docs/epics/`
