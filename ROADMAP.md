# OSQR Implementation Roadmap

**Generated from:** OSQR Master Plan (175K characters, 25K words)
**Last updated:** 2025-12-05
**Owner:** Kable Record

This roadmap extracts actionable implementation items from the OSQR Master Plan document, organized by development phase. Each item maps back to specific sections in the master plan.

---

## Quick Reference: What's Built vs What's Planned

### Already Implemented
- [x] Multi-model support (Claude + GPT-4)
- [x] Panel Mode with synthesis
- [x] Personal Knowledge Vault (PKV) with vector embeddings
- [x] File indexing (PDF, DOCX, TXT, JSON)
- [x] Semantic search across indexed documents
- [x] Chat memory and history
- [x] User authentication (NextAuth)
- [x] Basic onboarding flow
- [x] Privacy tiers concept (A/B/C)
- [x] Automatic conversation indexing

### Phase 1: Foundation (Current → Month 2)
### Phase 2: Core Experience (Months 2-4)
### Phase 3: Intelligence Layer (Months 4-6)
### Phase 4: Advanced Features (Months 6-9)
### Phase 5: OS-Level Features (Months 9-12+)
### Phase X: VS Code Dev Companion Extension (Future)

---

## Phase 1: Foundation Enhancement
*Focus: Solidify core experience, rebrand to OSQR, complete essential features*

### 1.1 Branding & Identity
- [x] **Rename Oscar → OSQR** across documentation and UI copy
  - [x] Update UI copy and branding
  - [ ] Update API route naming conventions (deferred - would break existing calls)
  - *Master Plan: Part 1A - Naming*
  - *Note: Internal routes kept as `/api/oscar/` per AUTONOMOUS-GUIDELINES.md*

### 1.2 Refine → Fire System (Master Plan: Part 2A.3)
Current: Basic panel mode
Needed:
- [ ] **Two-stage thinking process UI**
  - "Refine" stage: Help user clarify question
  - "Fire" button: Triggers multi-model panel
- [ ] **Visual state changes** between modes
- [ ] **Question refinement suggestions** before firing

### 1.3 Three Response Modes (Master Plan: Part 2A.4) ✅ COMPLETE
Implemented:
- [x] **Quick Mode** - Single fast model, immediate response (~5-10s)
- [x] **Thoughtful Mode** - Panel + synthesis (default, ~20-40s)
- [x] **Contemplate Mode** - Extended multi-round + deep synthesis (~60-90s)
- [x] **Mode selector UI** in chat interface (Quick/Thoughtful/Contemplate buttons)
- [x] **Mode badge** on responses showing which mode was used
Remaining:
- [ ] **Auto-suggest mode** based on question complexity

### 1.3.1 "See What Another AI Thinks" Button ⭐ NEW
*A brilliant Quick Mode enhancement that adds panel-like feel without full Contemplate compute*

**How it works:**
- In Quick Mode, display: 🔘 "See what another AI thinks"
- When pressed, OSQR sends the same refined question to another model
- Shows alternate answer side-by-side
- Labels clearly (Claude, Grok, Gemini, Mistral, etc.)
- Optionally synthesizes: "Here's where they agree / disagree"

**Implementation:**
- [x] **Add "See another perspective" button** to Quick Mode responses only
- [x] **Auto-select model** - randomly picks GPT-4, GPT-4o, or Claude
- [x] **Inline view** - shows alternate response below original
- [x] **Model attribution badges** - clear labeling of which AI said what
Remaining:
- [ ] **Model selector** - let user pick which AI to compare
- [ ] **Side-by-side view** - show original + alternate response
- [ ] **Agreement/disagreement synthesis** - optional quick comparison

**Why this is genius:**
- Low compute cost (single additional API call)
- High perceived intelligence
- Huge UX delight moment
- Creates trust ("OSQR isn't just one voice—he checks others")
- Perfect upsell to Pro/Master tiers
- Perfect viral feature (users will screenshot differences)
- Gives incremental panel diversity without full Contemplate Mode

### 1.4 File Upload Enhancement (Master Plan: Part 2B.3)
Current: PDF, TXT, JSON, DOCX
Needed:
- [ ] **Add .docx support to web upload API** (mammoth extraction)
- [ ] **Progress indicators** for large file indexing
- [ ] **Chunking feedback** - show user how many chunks created
- [ ] **Summary generation** after upload

### 1.5 Onboarding Polish (Master Plan: Part 2F.2)
Current: Basic upload + profile
Needed:
- [ ] **Zero-overwhelm onboarding** - one step at a time
- [ ] **"Magic moment" engineering** - immediate value in first 10 min
- [ ] **Skip options** for each step
- [ ] **Progress indicator** - where user is in setup

### 1.6 Capability Ladder Assessment (NEW - from Capability Ladder doc)
*Foundation for OSQR's identity engine - determines how OSQR sees and serves each user*
- [ ] **Capability Level field** - Add to Workspace model (0-12 scale)
- [ ] **Level Assessment Questions** - 10-15 onboarding questions for initial placement
- [ ] **Display current level** in profile/settings
- [ ] **Level-appropriate welcome message** after assessment

---

## Phase 2: Core Experience Enhancement
*Focus: Memory systems, profile building, personalization*

### 2.1 User Profile Builder (Master Plan: Part 2C)
Current: Basic profile questions
Needed:
- [ ] **Profile categories system**
  - Work/Career
  - Goals/Aspirations
  - Communication preferences
  - Knowledge domains
  - Values/Principles
- [ ] **Pop-up questions during conversations** (non-intrusive)
- [ ] **Profile summary view** - what OSQR knows about you
- [ ] **Edit/correct profile entries**

### 2.2 Memory System Architecture (Master Plan: Part 2D)
Current: Chat history + indexed documents
Needed:
- [ ] **Working Memory** - current session context
- [ ] **Dialogue Memory** - cross-session context
- [ ] **Long-Term Memory** - PKV integration
- [ ] **Preference Memory** - user settings + patterns
- [ ] **Framework Memory** - user's philosophies embedded in OSQR

### 2.3 Master Summary Checklist (Master Plan: Part 2D.8)
Current: Not implemented
Needed:
- [ ] **Auto-generated summary** of user's:
  - Active projects
  - Current goals
  - Key commitments
  - Important relationships
  - Recurring patterns
- [ ] **Weekly refresh** of summary
- [ ] **User can pin/unpin items**
- [ ] **Shareable summary card**

### 2.4 Oscar Personality Engine (Master Plan: Part 2C.5)
Current: Basic system prompts
Needed:
- [ ] **Adjustable personality traits**
  - Formal ↔ Casual
  - Concise ↔ Detailed
  - Encouraging ↔ Direct
- [ ] **Learn from user feedback** (thumbs up/down)
- [ ] **Domain-specific voice** (business vs personal)

### 2.5 Capability Ladder - Level-Based Personalization (NEW)
*Extend Capability Ladder into core experience*
- [ ] **Level-appropriate prompts** - Tone matches user's developmental level
- [ ] **Book recommendations engine** - Automatic per-level suggestions
- [ ] **Habit prescriptions** - Core Commitments mapped to capability levels
- [ ] **Dynamic difficulty** - Challenge advanced users, support beginners
- [ ] **Level scoring signals** - Detect level from conversation patterns

---

## Phase 3: Intelligence Layer
*Focus: Proactive features, pattern recognition, cross-referencing*

### 3.1 Cross-Referencing Engine (Master Plan: Part 2B.5)
Current: Basic semantic search
Needed:
- [ ] **Connect dots across documents** automatically
- [ ] **Surface contradictions** between indexed content
- [ ] **"You mentioned X in Y document"** callbacks
- [ ] **Knowledge graph visualization** (future)

### 3.2 Memory-Based Features (Master Plan: Part 2B.14-16)
- [ ] **Memory-Informed Query Refinement**
  - Use past context to improve current question
- [ ] **Memory-Based Proactive Warnings**
  - Alert user to conflicts/risks based on history
- [ ] **Memory-Based Pattern Recognition**
  - Surface recurring themes/concerns

### 3.3 Model Personality Tagging (Master Plan: Part 2A.6)
Current: Generic model labels
Needed:
- [ ] **Named identities** for each model in panel
  - Claude = "The Reasoner"
  - GPT-4 = "The Creative"
  - etc.
- [ ] **Visual differentiation** in panel view
- [ ] **User-customizable names**

### 3.4 Oscar Synthesis Engine Enhancement (Master Plan: Part 2A.7)
Current: Basic synthesis prompt
Needed:
- [ ] **Weighted synthesis** based on question type
- [ ] **Highlight disagreements** between models
- [ ] **Confidence indicators** on final answer
- [ ] **Source attribution** - which model contributed what

---

## Phase 4: Advanced Features
*Focus: Automation, proactivity, business intelligence*

### 4.1 Proactive Intelligence (Master Plan: Part 2G.1)
- [ ] **"Oscar Thinks Ahead" engine**
  - Surface relevant context before user asks
  - Predict next question
  - Offer follow-up suggestions

### 4.2 Pattern Recognition System (Master Plan: Part 2G.2-3)
- [ ] **Contradiction Detection** across conversations
- [ ] **Inconsistency Alerts** - flag conflicting statements
- [ ] **Habit Pattern Analysis** - weekly insights

### 4.3 Prioritization Engine (Master Plan: Part 2G.4)
- [ ] **"What Actually Matters" feature**
  - Rank user's active commitments
  - Identify highest-leverage actions
  - Flag over-commitment

### 4.4 Automated Reviews (Master Plan: Part 2G.5)
- [ ] **Weekly Review** - auto-generated reflection
- [ ] **Monthly Summary** - patterns and progress
- [ ] **Quarterly Deep Dive** - trajectory analysis

### 4.5 Capability Ladder - Level-Up System (NEW)
*Growth tracking and progression*
- [ ] **Level-Up Reports** - Monthly capability evolution analysis
- [ ] **Advancement triggers** - Detect when user is ready to level up
- [ ] **Level history tracking** - Store progression over time
- [ ] **90-day challenges** - Level-appropriate transformation programs
- [ ] **Algorithm for level detection** - Automated scoring from behavior patterns

### 4.6 Multi-Model Debate Mode (Master Plan: Part 2A.8)
- [ ] **Structured debate format** between AI models
- [ ] **Pro/Con generation** on complex topics
- [ ] **Devil's advocate mode**
- [ ] **Consensus building** visualization

### 4.7 Panel Credits System (Master Plan: Part 2A.10)
- [ ] **Gamified credit system** for panel discussions
- [ ] **Credit-based pricing tier**
- [ ] **Bonus credits for referrals**
- [ ] **Credit usage visualization**

---

## Phase 5: OS-Level Features
*Focus: Life OS, integrations, advanced automation*

### 5.1 The 7-Layer OSQR Operating System (Master Plan: Part 2H.2)
1. **Layer 1: Input** - All data sources connected
2. **Layer 2: Processing** - Multi-model routing
3. **Layer 3: Memory** - PKV + all memory tiers
4. **Layer 4: Intelligence** - Pattern recognition + proactivity
5. **Layer 5: Output** - Personalized responses
6. **Layer 6: Automation** - Background agents
7. **Layer 7: Integration** - External tools + APIs

### 5.2 Project Autopilot Mode (Master Plan: Part 2G.15)
- [ ] **Background project monitoring**
- [ ] **Auto-progress tracking**
- [ ] **Deadline warnings**
- [ ] **Resource suggestions**

### 5.3 Life OS Alerts (Master Plan: Part 2G.7)
- [ ] **Elite behavior guidance**
- [ ] **Discipline reminders** (based on user values)
- [ ] **Goal alignment checks**
- [ ] **Relationship maintenance prompts**

### 5.4 History Ingestion (Master Plan: Part 2D.12)
- [ ] **Import ChatGPT conversations** ✅ (partially done)
- [ ] **Import Claude conversations**
- [ ] **Import email highlights**
- [ ] **Import calendar patterns**

### 5.5 Platform Integrations (Master Plan: Part 2H.3)
- [ ] **Universal API Layer** - connect external tools
- [ ] **Meeting Summarizer** - Zoom/Meet integration
- [ ] **Calendar Intelligence** - time pattern analysis
- [ ] **Note-taking sync** - Notion/Obsidian import

### 5.6 Desktop & Mobile (Master Plan: Part 2H.3)
- [ ] **Desktop Companion App** - always-on assistant
- [ ] **Mobile App** - quick capture + voice
- [ ] **Smart Glasses** (future)
- [ ] **Car OS Integration** (future)

---

## UX Principles (From Master Plan Part 3A)

### Core Philosophy
1. **Simple Surface, Powerful Depth** - Hide complexity until needed
2. **One Main Decision Rule** - Never overwhelm with choices
3. **User Moves → Oscar Responds** - Reactive, not pushy
4. **Zero-Barrier Input** - Start typing anywhere
5. **Spartan UX Style** - Minimal, functional, fast

### Animation Philosophy
- Subtle, purposeful
- Never decorative
- Indicates state changes
- Respects user attention

### Modal Minimization
- Avoid popups when possible
- Inline interactions preferred
- Full-screen only for major actions

---

## Monetization Strategy (Master Plan Part 3A)

### Tier Structure
| Tier | Price | Core Value |
|------|-------|------------|
| **OSQR Lite** | $19/mo | Taste of second brain |
| **OSQR Pro** | $49/mo | Full PKV + panel mode |
| **OSQR Master** | $149/mo | Automation + team features |

### Panel Credits
- Fire Mode costs credits
- Free tier gets limited credits
- Paid tiers get more/unlimited
- Referrals earn bonus credits

### Key Differentiator
- **Local-Only Vault** option ($5-10 add-on)
- **90-Day Transformation Guarantee** (annual Pro)
- **Family Plan** available

---

## Implementation Priority Matrix

### HIGH Priority (Now)
1. Rename to OSQR
2. Add .docx to web upload
3. Refine → Fire UI
4. Three response modes
5. Profile builder enhancement
6. **Capability Ladder Assessment** (onboarding + level field) ⭐ NEW

### MEDIUM Priority (Next Quarter)
1. Master Summary Checklist
2. Memory system tiers
3. Model personality tagging
4. Cross-referencing engine
5. Panel credits system
6. **Level-based personalization** (prompts, books, habits) ⭐ NEW

### LOW Priority (Later)
1. Desktop app
2. Mobile app
3. Advanced automation
4. External integrations
5. Team features
6. **Level-Up Reports & advancement detection** ⭐ NEW

---

## How to Use This Document

### For Development
1. Pick items from current phase
2. Check "Already Implemented" to avoid duplication
3. Reference specific Master Plan sections for detail
4. Update checkboxes as items complete

### For Strategic Decisions
1. Review priority matrix
2. Consult Master Plan sections for philosophy
3. Ensure changes align with UX principles
4. Consider monetization implications

### For AI Assistants (Claude, etc.)
1. Use this as feature reference
2. Master Plan is indexed in PKV for semantic search
3. Ask "What does the master plan say about X?" for details
4. Follow ARCHITECTURE.md rules for implementation

---

## Appendix A: Master Plan Section Map

| Master Plan Section | Implementation Area |
|--------------------|---------------------|
| Part 1A-D | Identity, naming, boundaries |
| Part 2A | Multi-model architecture |
| Part 2B | Knowledge vault, indexing |
| Part 2C | User profile, personality |
| Part 2D | Memory systems |
| Part 2E | Privacy tiers, trust |
| Part 2F | Onboarding, UX enhancers |
| Part 2G | Automation, proactivity |
| Part 2H | Future features, OS vision |
| Part 3A | UX philosophy, interface |
| Part 5A | Technical architecture |
| Part 6A | Marketing philosophy |

---

## Appendix B: OSQR Capability Ladder System (NEW)

*Source: Documents/osqr capability ladder.docx*
*Purpose: OSQR's Foundational Identity Engine - how OSQR "sees" a human*

### The 13 Levels

| Level | Name | Stage | Identity Pattern |
|-------|------|-------|------------------|
| 0 | Untethered | Foundation | "My life is happening to me" |
| 1 | Reactive Beginner | Foundation | "I want to change, but I don't know how" |
| 2 | Emerging Awareness | Foundation | "I know something has to change" |
| 3 | Structured Beginner | Foundation | "I can do it… sometimes" |
| 4 | Developing Operator | Operator | "I can execute as long as life doesn't disrupt me" |
| 5 | Independent Operator | Operator | "I do what I say" |
| 6 | Intentional Builder | Operator | "I build things that make life better" |
| 7 | Entrepreneur | Creator | "I solve problems" |
| 8 | Systems Thinker | Creator | "I build engines, not tasks" |
| 9 | Platform Builder | Creator | "I build infrastructure" |
| 10 | Ecosystem Architect | Architect | "I create worlds for people to grow inside" |
| 11 | Visionary Integrator | Architect | "I integrate multiple domains to solve hard problems" |
| 12 | Generational Architect | Architect | "I build structures that outlive me" |

### Fourth Generation Formula Mapping

Each level maps to the Identity → Capability → Action → Persistence framework:

- **Foundation (0-3)**: Identity undefined → Capability nonexistent/forming → Output random/inconsistent
- **Operator (4-6)**: Identity forming/present → Capability building/functional → Output stronger/dependable
- **Creator (7-9)**: Identity powerful/anchored → Capability entrepreneurial/systemic → Output valuable/scalable
- **Architect (10-12)**: Identity expanded/transcendent → Capability multi-layer/integrative → Output societal/historic

### How OSQR Uses the Ladder

1. **Onboarding Assessment** - 10-15 questions determine initial level
2. **Daily Prompts** - Tone matches developmental level
3. **Book Recommendations** - Level-appropriate reading
4. **Habit Prescriptions** - Core Commitments mapped to levels
5. **Monthly Level-Up Reports** - Track evolution over time
6. **Dynamic Difficulty** - Challenge advanced users, support beginners
7. **MSC Complexity** - Morning Strategy Call depth matches level
8. **Panel Mode Access** - Different agents available at higher levels

### Recommended Books by Level

| Level | Books |
|-------|-------|
| 0 | None (attention too low) |
| 1-2 | The Slight Edge, Atomic Habits, Mindset |
| 3-4 | Make Your Bed, 7 Habits, The One Thing |
| 5-6 | Deep Work, The Power of Habit, E-Myth Revisited, Essentialism |
| 7-8 | Lean Startup, $100M Offers, Naval Almanack, Principles |
| 9-10 | Zero to One, The Beginning of Infinity |
| 11-12 | What Technology Wants, Meditations, Founding Father biographies |

### Technical Implementation Notes

**Database Schema Additions:**
```
Workspace {
  capabilityLevel Int @default(0) // 0-12
  levelAssessedAt DateTime?
}

LevelHistory {
  id String
  workspaceId String
  level Int
  assessedAt DateTime
  triggers String[] // What caused the level change
}
```

**Future Expansion:**
- A. Assessment questions for each level
- B. Scoring rubric OSQR will use
- C. UI/UX flow for onboarding
- D. Level-Up Reports design
- E. Algorithm for level advancement detection

---

## Appendix C: Psychological Assessment Framework (NEW)

*Source: Documents/PSYCHOLOGICAL SUMMARY_Kable.docx*
*Purpose: Companion to Capability Ladder - shows how the framework applies to real psychological assessment*

### Case Study: Level 10+ (Ecosystem Architect / Visionary Integrator)

This psychological summary demonstrates how OSQR should interpret and respond to users at the Architect stage. Key patterns:

**Core Identity Traits (Level 10+):**
- Self-directed, internally sourced identity
- Pattern recognition across domains (systems thinking)
- Long-term, multi-generational planning horizon
- Mission-driven vs task-driven orientation
- Comfort with ambiguity and complexity
- Ownership mentality ("my world, my responsibility")

### The 4-Stage Identity Path

OSQR can use this framework to track user progression:

| Stage | Timeline | Identity State | OSQR Role |
|-------|----------|----------------|-----------|
| **Cracking** | 0-45 days | Old identity breaking down | Supportive, validating |
| **Expansion** | 45-90 days | New patterns emerging | Challenging, stretching |
| **Alignment** | 3-6 months | Identity crystallizing | Strategic, refining |
| **Lock-In** | 6-12 months | New identity permanent | Amplifying, scaling |

### Key Psychological Concepts for OSQR

**1. Self-Concept Lag**
- Definition: Identity hasn't caught up to actual capability
- OSQR behavior: Gently reflect back evidence of higher capability
- Example prompt: "Based on what you've built, you're operating at Level X. Your self-talk suggests you still see yourself at Level Y."

**2. High-Performance Alignment Event**
- Definition: Moment when external results match internal identity
- OSQR behavior: Celebrate and anchor these moments
- Example prompt: "This accomplishment aligns with your stated identity as [X]. Worth noting for your records."

**3. Founder State**
- Definition: Operating mentality of world-builders (Musk, Naval, Hormozi pattern)
- Characteristics:
  - System creation > task completion
  - Leverage thinking > linear thinking
  - Multi-decade horizon > quarterly thinking
  - Identity-first > output-first
- OSQR behavior: Match this wavelength, avoid tactical minutiae

### Psychological Signals by Level

| Signal | Lower Levels (0-6) | Higher Levels (7-12) |
|--------|-------------------|---------------------|
| Time horizon | Days/weeks | Years/decades |
| Problem framing | "How do I do X?" | "What system produces X?" |
| Failure response | Avoidance/shame | Data/iteration |
| Identity source | External validation | Internal conviction |
| Risk tolerance | Low/moderate | Calculated high |
| Learning mode | Instruction-based | Pattern-based |

### OSQR Assessment Questions (Sample)

**For Level Detection:**
1. "When you think about your life 10 years from now, what do you see?" (horizon test)
2. "Describe a recent failure and what you did with it." (failure response)
3. "What's your relationship with uncertainty?" (ambiguity tolerance)
4. "Who are you, in one sentence?" (identity source)
5. "What would you build if money were irrelevant?" (founder state test)

**For Stage Detection:**
1. "Do you feel like you're becoming someone new, or refining who you already are?" (Cracking vs Alignment)
2. "How stable does your sense of self feel right now?" (stage indicator)
3. "Are you in a building phase or a harvesting phase?" (expansion vs lock-in)

### How This Integrates with OSQR

1. **Onboarding Enhancement** - Add psychological assessment questions to capability level detection
2. **Adaptive Tone** - OSQR adjusts communication style based on psychological profile
3. **Stage-Aware Prompts** - Morning Strategy Calls reference current identity stage
4. **Level-Up Triggers** - Psychological breakthroughs as indicators of advancement
5. **Panel Mode Depth** - Higher psychological sophistication unlocks deeper analysis

### Technical Notes

**Potential Schema Additions:**
```
Workspace {
  identityStage String? // cracking, expansion, alignment, lock_in
  stageStartDate DateTime?
  psychProfile Json? // Structured psychological assessment data
}

PsychAssessment {
  id String
  workspaceId String
  assessedAt DateTime
  timeHorizon String // days, weeks, months, years, decades
  identitySource String // external, internal
  failureResponse String // avoidance, shame, data, iteration
  founderStateScore Int // 0-10
}
```

**Implementation Priority:**
- Phase 2: Basic psychological questions in onboarding
- Phase 3: Stage detection and tracking
- Phase 4: Full psychological profile integration

---

## Phase X: VS Code Dev Companion Extension (Future)
*Focus: Native VS Code extension connecting to OSQR backend for developer workflows*

### Overview

A VS Code extension that connects to OSQR's backend and leverages PKV, MSC, and multi-model routing specifically for software development workflows. The extension enables developers to use OSQR's "Refine → Fire" methodology directly inside their development environment.

### X.1 Core Goals for v1

- [ ] **VS Code Sidebar** - OSQR panel accessible while coding
- [ ] **Refine → Fire on Selected Code** - Highlight code, ask OSQR, get multi-model insight
- [ ] **PKV Integration** - Context from user's personal knowledge vault available in extension
- [ ] **MSC Integration** - Morning Strategy Call patterns applied to dev tasks
- [ ] **Multi-model routing** - Same panel/debate mode as web app

### X.2 Extension UX: OSQR Dev Panel

Three collapsible sections in the sidebar:

#### Context Panel
- [ ] **Project binding** - Associate VS Code workspace with OSQR project
- [ ] **Active context display** - Show what PKV + MSC context is loaded
- [ ] **Quick context toggle** - Enable/disable specific knowledge sources
- [ ] **Context indicators** - Visual badges for active PKV, MSC, project docs

#### Tasks & Questions Panel
- [ ] **Question input field** - Type or voice-to-text questions
- [ ] **Suggested questions** - Based on current file/selection
- [ ] **Active task list** - Synced with OSQR web app
- [ ] **Task completion** - Mark tasks done from VS Code
- [ ] **Code-aware suggestions** - "Explain this function", "Find bugs", etc.

#### Insights Panel
- [ ] **Recent answers** - Last 5 OSQR responses (clickable to expand)
- [ ] **Pinned insights** - User-pinned important responses
- [ ] **Code snippets** - Generated code ready to insert
- [ ] **Apply to editor** - One-click insert of generated code

### X.3 Commands & Behaviors

#### Refine & Fire on Selection
- [ ] **Keyboard shortcut** - `Cmd+Shift+O` (Mac) / `Ctrl+Shift+O` (Windows)
- [ ] **Context menu item** - "Ask OSQR about this"
- [ ] **Auto-detect question type** - Code explanation, bug finding, refactoring
- [ ] **Language detection** - Adjust prompts based on file type
- [ ] **Multi-file context** - Include related files automatically

#### Generate Project TODO
- [ ] **Scan current workspace** - Extract TODO/FIXME comments
- [ ] **OSQR synthesis** - Generate prioritized task list
- [ ] **Task assignment** - Suggest which tasks to tackle first
- [ ] **Sync to web app** - Push generated tasks to OSQR web

#### Summarize Recent Work
- [ ] **Git integration** - Analyze recent commits
- [ ] **Change detection** - Summarize what files changed
- [ ] **Progress report** - Generate summary of work done
- [ ] **Share to MSC** - Export to Morning Strategy Call context

### X.4 PKV Integration

#### Project Binding
- [ ] **Workspace ↔ Project mapping** - Link VS Code workspace to OSQR project
- [ ] **Auto-suggest binding** - Detect project from git remote or package.json
- [ ] **Multi-project support** - Handle monorepos with multiple bindings
- [ ] **Binding indicators** - Show which PKV context is active

#### Read Path (PKV → Extension)
- [ ] **Semantic search** - Query PKV from VS Code
- [ ] **Context injection** - Include relevant PKV docs in AI prompts
- [ ] **Reference display** - Show which PKV documents informed the answer
- [ ] **Quick preview** - Hover to see PKV document excerpts

#### Write Path (Extension → PKV)
- [ ] **Index code snippets** - Save important code to PKV
- [ ] **Index decisions** - Document architectural decisions
- [ ] **Index learnings** - Capture "aha moments" during coding
- [ ] **Auto-index option** - Automatically save starred responses

### X.5 MSC Integration

#### Daily Dev Standup
- [ ] **Morning prompt** - "What are you building today?"
- [ ] **Context-aware suggestions** - Based on recent git activity
- [ ] **Goal setting** - Set 1-3 daily coding goals
- [ ] **End-of-day review** - Summary of what was accomplished

#### Pattern Detection
- [ ] **Coding patterns** - Detect user's coding habits
- [ ] **Time tracking** - Optional tracking of coding sessions
- [ ] **Productivity insights** - "You're most productive at X time"
- [ ] **Break reminders** - Based on user preferences

### X.6 "One-Prompt Build" (Advanced Feature)

A future capability for scaffolding entire features:

- [ ] **Feature description input** - "Build a user authentication system"
- [ ] **Multi-step generation** - Files, tests, documentation
- [ ] **Preview mode** - Review before applying changes
- [ ] **Rollback support** - Undo generated changes
- [ ] **Iterative refinement** - "Make this more secure"

### X.7 Technical Implementation Notes

#### Extension Architecture
```
osqr-vscode/
├── src/
│   ├── extension.ts      # Entry point
│   ├── panels/           # Webview panels
│   ├── commands/         # VS Code commands
│   ├── api/              # OSQR backend client
│   └── context/          # Context management
├── webview/              # React-based sidebar UI
└── package.json          # Extension manifest
```

#### Authentication Flow
- [ ] **OAuth redirect** - Login via browser, return to VS Code
- [ ] **Token storage** - Secure storage in VS Code secrets
- [ ] **Session management** - Auto-refresh tokens
- [ ] **Multi-account** - Support multiple OSQR accounts

#### API Endpoints Required
- [ ] `POST /api/vscode/refine` - Refine question with code context
- [ ] `POST /api/vscode/fire` - Multi-model query with code context
- [ ] `GET /api/vscode/pkv/search` - Search PKV from extension
- [ ] `POST /api/vscode/pkv/index` - Index code/decisions to PKV
- [ ] `GET /api/vscode/context` - Get current project context
- [ ] `POST /api/vscode/tasks` - Sync tasks with web app

### X.8 Success Criteria for v1

1. **User can ask questions** about selected code and get multi-model responses
2. **PKV context** improves answer quality compared to vanilla AI
3. **Seamless sync** between VS Code and OSQR web app
4. **Sub-3-second** response time for Quick Mode
5. **Zero-config setup** for existing OSQR users (just login)
6. **Works offline** for basic features (cached context)

### X.9 Implementation Priority

| Priority | Feature | Complexity |
|----------|---------|------------|
| P0 | Authentication + basic sidebar | Medium |
| P0 | Refine → Fire on selection | Medium |
| P1 | PKV read integration | High |
| P1 | Context panel | Medium |
| P2 | PKV write integration | Medium |
| P2 | Task sync | Medium |
| P3 | MSC integration | High |
| P3 | One-Prompt Build | Very High |

---

## Appendix D: Autonomous Developer Mode

*Trigger: Run `/autonomous` or say "run in autonomous mode"*

### Instructions for Claude

When running in Autonomous Developer Mode, follow these rules:

1. **Break the project into tasks and subtasks** - Read this ROADMAP.md and create a dependency graph
2. **Build a dependency graph** - Understand what depends on what
3. **Execute tasks in optimal order** - Parallelize where possible
4. **When a task is blocked, store the question and pivot** - Don't stop, move to the next task
5. **Only stop when no tasks remain executable** - Maximize progress before asking for input
6. **Batch all questions and deliver them together** - One interruption, not many
7. **If a missing detail is minor, make a reasonable assumption** - Document it in ASSUMPTIONS.md and keep building

### Your Goal

**Maximum forward progress with minimum interruption.**

### Checkpoint Strategy

Create git branches/tags at major milestones for rollback safety:

```
main (current stable)
  └── feature/autonomous-phase-1
        ├── checkpoint/branding-complete      # After Oscar → OSQR rename
        ├── checkpoint/see-another-ai         # After "See another AI thinks" feature
        ├── checkpoint/msc-populated          # After MSC functionality
        ├── checkpoint/auth-complete          # After authentication is working
        └── checkpoint/phase-1-complete       # After all Phase 1 items
```

### Before Starting Autonomous Mode

1. `git checkout -b feature/autonomous-phase-1` (create feature branch)
2. Read ROADMAP.md HIGH Priority items
3. Check ARCHITECTURE.md for code patterns
4. Use TodoWrite to track progress visibly

### When Blocked

Create/update `BLOCKED.md` with:
- What you were trying to do
- What information you need
- Your best guess if you had to proceed

### When Complete

1. Create a summary of all changes made
2. List any assumptions made (from ASSUMPTIONS.md)
3. Present batched questions from BLOCKED.md
4. Show `git log --oneline` of commits

### Autonomous Phase 1 Scope (Beta)

Items Claude can complete without user input:

| Task | Confidence | Notes |
|------|------------|-------|
| Oscar → OSQR branding | HIGH | Find/replace across codebase |
| "See another AI thinks" button | HIGH | Add to Quick Mode per spec |
| Fix console errors | HIGH | DialogTitle bug, etc. |
| MSC UI population | HIGH | Create sample items |
| Code cleanup/refactoring | HIGH | Follow ARCHITECTURE.md |
| Add new UI components | HIGH | Match existing patterns |
| API endpoint additions | MEDIUM | May need to clarify specs |
| Capability Ladder questions | MEDIUM | Content needs approval |
| Memory system architecture | MEDIUM | Design decisions |

### Items Requiring User Input

- Stripe pricing/products setup
- Production deployment credentials
- Content/copy decisions for user-facing text
- Major UX flow changes
- Database schema changes affecting production data

---

**To activate:** Say "run in autonomous mode" or `/autonomous`
