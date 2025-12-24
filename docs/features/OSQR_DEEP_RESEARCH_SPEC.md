# OSQR Deep Research System Specification

**Component**: Deep Research Subsystem  
**Version**: 1.1 DRAFT  
**Status**: Design Phase  
**Dependencies**: Multi-Model Router, Memory Vault, Document Indexing Subsystem, Temporal Intelligence  
**Priority**: V1.5 Feature

---

## Executive Summary

The Deep Research System transforms OSQR from a conversational assistant into a compounding intelligence layer. Unlike traditional AI research (Claude, ChatGPT) where outputs are ephemeral, OSQR's research becomes a permanent asset in the user's Personal Knowledge Vault (PKV) - indexed, cross-referenced, and available for future insights.

**Core Differentiator**: Research you do today becomes smarter context for questions you ask six months from now.

**V1.1 Additions**: Tribunal Mode, Research Templates, Background Execution, Cost Analysis

---

## Problem Statement

### Current AI Research Limitations

```
Traditional Deep Research (Claude/ChatGPT):
Query → Search → Synthesize → Output → Gone

User gets: A great answer they'll never find again
```

Users repeatedly:
- Lose valuable research in conversation history
- Re-research the same topics months later
- Fail to connect findings across different projects
- Never see how new information relates to old research
- Manually orchestrate multiple AI models to get comprehensive research

### OSQR Solution

```
OSQR Deep Research:
Query → Search → Synthesize → Output
                     ↓
              Document Indexing Subsystem
                     ↓
              PKV (chunked, embedded, cross-referenced)
                     ↓
              Available for all future conversations
                     ↓
              Proactive insights surface connections later
```

---

## Mode Hierarchy

OSQR Deep Research builds on the existing Multi-Model Router modes:

| Mode | What Happens | When to Use | Tier |
|------|--------------|-------------|------|
| **Quick** | Single model, fast response | Simple questions | Pro, Master |
| **Thoughtful** | Multiple models in parallel, basic synthesis | Standard research | Pro, Master |
| **Contemplate** | Deep single-model reasoning | Complex reasoning | Pro, Master |
| **Council** | Models debate a decision point | Decision points | Master |
| **Tribunal** | Models research → critique → revise → synthesize | Deep research (NEW) | Master |

---

## Tier Structure

| Feature | Pro ($49/mo) | Master ($149/mo) |
|---------|--------------|------------------|
| **Models Used** | Single (Claude OR GPT-4o) | Multi-model (Claude + GPT-4o + Gemini) |
| **Output** | One research report | Multiple perspectives + synthesized report |
| **PKV Storage** | Report indexed | All reports + synthesis indexed |
| **Summary** | Yes | Yes + cross-model comparison |
| **Carousel View** | No | Yes (swipe between model outputs) |
| **Council Mode** | No | Yes (for decision points) |
| **Tribunal Mode** | No | Yes (deep research with cross-critique) |
| **Research Depth Levels** | Quick, Standard | Quick, Standard, Comprehensive, Tribunal |
| **Research Templates** | Basic | Full library |
| **Background Execution** | No | Yes (leave and return) |
| **Tribunal Sessions/Month** | N/A | 3 included (packs available) |

### Why This Tier Split Works

**Pro users** still get massive value:
- Research persists in PKV forever
- Cross-referencing to existing content
- Summary-first delivery
- Staleness detection and refresh prompts

**Master users** get the premium experience:
- Multiple model perspectives reveal blind spots
- Synthesis report captures best of all models
- Council mode for decision points
- **Tribunal mode for comprehensive research**
- Carousel UI for comparing approaches
- Background execution for long-running research

---

## Tribunal Mode (Master Only)

### What It Is

Tribunal Mode is OSQR's most comprehensive research capability. It replicates the manual process of running multiple AI models, having them critique each other, and synthesizing the best insights - but automated.

**The Manual Process It Replaces:**

```
What users do today (manually):
Step 1: Prompt Claude with research request
Step 2: Take output to ChatGPT with same prompt
Step 3: Bring ChatGPT's output back to Claude for analysis
Step 4: Synthesize insights from both
Step 5: Iterate - asking each to critique/refine
Step 6: Create final artifact manually

Time: 2-4 hours of active work
```

**What Tribunal Mode Does Automatically:**

```
Step 1: User initiates Tribunal research
     ↓
Step 2: Claude, GPT-4o, Gemini each generate independent reports
     ↓
Step 3: Each model receives the OTHER models' reports
     ↓
Step 4: Each model critiques others + rewrites their own report
     ↓
Step 5: OSQR synthesizes all revised reports into master report
     ↓
Step 6: OSQR provides summary + key findings
     ↓
Step 7: All artifacts available in carousel
     ↓
Step 8: Everything lands in PKV, cross-referenced

Time: 5-10 minutes (can run in background)
```

### Tribunal Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TRIBUNAL MODE FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PHASE 1: Independent Research (Parallel)                           │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                         │
│  │ Claude  │    │  GPT-4o │    │ Gemini  │                         │
│  │Research │    │Research │    │Research │                         │
│  │   v1    │    │   v1    │    │   v1    │                         │
│  └────┬────┘    └────┬────┘    └────┬────┘                         │
│       │              │              │                               │
│       └──────────────┼──────────────┘                               │
│                      ↓                                               │
│  PHASE 2: Cross-Critique (Each sees others' work)                   │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                         │
│  │ Claude  │    │  GPT-4o │    │ Gemini  │                         │
│  │Critiques│    │Critiques│    │Critiques│                         │
│  │GPT+Gem  │    │Cla+Gem  │    │Cla+GPT  │                         │
│  └────┬────┘    └────┬────┘    └────┬────┘                         │
│       │              │              │                               │
│       └──────────────┼──────────────┘                               │
│                      ↓                                               │
│  PHASE 3: Revision (Incorporating critique insights)                │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                         │
│  │ Claude  │    │  GPT-4o │    │ Gemini  │                         │
│  │ Report  │    │ Report  │    │ Report  │                         │
│  │   v2    │    │   v2    │    │   v2    │                         │
│  └────┬────┘    └────┬────┘    └────┬────┘                         │
│       │              │              │                               │
│       └──────────────┼──────────────┘                               │
│                      ↓                                               │
│  PHASE 4: Final Synthesis (OSQR combines all)                       │
│  ┌─────────────────────────────────────────┐                        │
│  │              OSQR Synthesis              │                        │
│  │  • Master report from all v2 reports    │                        │
│  │  • Summary + key findings               │                        │
│  │  • Consensus and dissent noted          │                        │
│  └─────────────────────────────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Tribunal Progress Indicator

Because Tribunal takes 5-10 minutes, users need clear progress feedback:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚖️ Tribunal Research: "Enterprise AI adoption in hospitality"      │
│                                                                      │
│  Phase 2 of 4: Cross-Critique                                       │
│  ████████████████░░░░░░░░░░░░░░  52%                                │
│                                                                      │
│  ✓ Phase 1: Independent research complete                          │
│    • Claude: 12 sources analyzed                                    │
│    • GPT-4o: 15 sources analyzed                                    │
│    • Gemini: 11 sources analyzed                                    │
│                                                                      │
│  → Phase 2: Models reviewing each other's findings...               │
│    • Claude critiquing GPT-4o and Gemini...                         │
│                                                                      │
│  ○ Phase 3: Revision (pending)                                      │
│  ○ Phase 4: Final synthesis (pending)                               │
│                                                                      │
│  Estimated time remaining: ~4 minutes                               │
│                                                                      │
│  [Run in Background]  [Cancel]                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Background Execution

Users can leave and return:

```
User clicks [Run in Background]
     ↓
OSQR continues processing
     ↓
User navigates away, does other work
     ↓
Research completes
     ↓
Bubble pulses with notification
     ↓
User returns to view results
```

**Notification when complete:**
> "Your Tribunal research on [topic] is ready. Found some interesting tensions between what Claude and GPT-4o concluded. Want to take a look?"

### Tribunal Carousel Display

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚖️ Tribunal Complete: "Enterprise AI adoption in hospitality"      │
│  Mode: Tribunal • 3 models • Cross-critique • 38 sources           │
│  Completed: Dec 24, 2024 • Duration: 7m 23s                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SUMMARY                                                            │
│                                                                      │
│  "All three models agree the hospitality sector is 18-24 months     │
│   behind enterprise AI adoption curves, but they diverge on why.    │
│   Claude emphasizes regulatory caution, GPT-4o points to legacy     │
│   tech debt, Gemini highlights workforce training gaps. The         │
│   synthesis suggests all three factors compound - addressing any    │
│   one alone won't unlock adoption."                                 │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  CAROUSEL: Final Reports (v2 - post-critique)                       │
│                                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ Claude  │ │  GPT-4o │ │ Gemini  │ │  Final  │                   │
│  │ Report  │ │ Report  │ │ Report  │ │Synthesis│                   │
│  │  (v2)   │ │  (v2)   │ │  (v2)   │ │         │                   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                   │
│      ●           ○           ○           ○                          │
│                                                                      │
│  [View Original Reports (v1)]  [View Critiques]                     │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  KEY FINDINGS                                                       │
│                                                                      │
│  • Hospitality AI adoption lags 18-24 months behind other sectors  │
│  • Three compounding barriers: regulatory, tech debt, workforce    │
│  • Early adopters seeing 23% efficiency gains (GPT-4o finding)     │
│  • Privacy concerns dominate guest-facing AI hesitation            │
│                                                                      │
│  CONSENSUS POINTS (All 3 agreed)                                   │
│  • Back-office AI adoption is outpacing guest-facing              │
│  • Training investment correlates with successful adoption         │
│                                                                      │
│  DISSENT POINTS (Models disagreed)                                 │
│  • Primary barrier: Claude=regulatory, GPT-4o=tech, Gemini=people │
│  • Timeline to mainstream: Claude=3yr, GPT-4o=2yr, Gemini=4yr     │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  WHAT WOULD YOU LIKE TO DO?                                         │
│                                                                      │
│  [Add to PKV]                                                       │
│  [Generate Enterprise Account Plan from this]                       │
│  [Go deeper on "workforce training gaps"]                          │
│  [Remind me to refresh in 90 days]                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### What Gets Stored in PKV (Tribunal Mode)

| Artifact | Stored | Viewable | Notes |
|----------|--------|----------|-------|
| Original Claude report (v1) | ✓ | Via "View Original" | Pre-critique |
| Original GPT-4o report (v1) | ✓ | Via "View Original" | Pre-critique |
| Original Gemini report (v1) | ✓ | Via "View Original" | Pre-critique |
| Claude's critique of others | ✓ | Via "View Critiques" | What Claude noticed |
| GPT-4o's critique of others | ✓ | Via "View Critiques" | What GPT-4o noticed |
| Gemini's critique of others | ✓ | Via "View Critiques" | What Gemini noticed |
| Revised Claude report (v2) | ✓ | Main carousel | Post-critique |
| Revised GPT-4o report (v2) | ✓ | Main carousel | Post-critique |
| Revised Gemini report (v2) | ✓ | Main carousel | Post-critique |
| Final synthesis | ✓ | Main carousel | OSQR combined |
| Consensus points | ✓ | Key findings | Where models agreed |
| Dissent points | ✓ | Key findings | Where models disagreed |
| OSQR summary | ✓ | Always visible | 2-3 sentence takeaway |

---

## Research Templates

Research Templates provide structured output formats for common research types. Instead of generic reports, OSQR produces consistently actionable artifacts.

### Available Templates (V1.5)

| Template | Description | Default Staleness | Pro | Master |
|----------|-------------|-------------------|-----|--------|
| **General Research** | Freeform research on any topic | 180 days | ✓ | ✓ |
| **Competitor Analysis** | Structured competitive landscape | 90 days | ✓ | ✓ |
| **Market Sizing** | TAM/SAM/SOM with methodology | 180 days | ✓ | ✓ |
| **Technical Evaluation** | Tech stack/tool comparison | 120 days | ✓ | ✓ |
| **Enterprise Account Plan** | Full account strategy | 90 days | — | ✓ |
| **Legal/Compliance** | Regulatory landscape | 90 days | — | ✓ |
| **Investment Research** | Company/opportunity analysis | 30 days | — | ✓ |

### Enterprise Account Plan Template

This template produces a complete account strategy document, automating what typically takes 4-8 hours of manual research.

**Output Structure:**

```markdown
# Enterprise Account Plan: [Company Name]

## Executive Summary
[2-3 sentence strategic positioning]

## Company Snapshot
- Industry: 
- Revenue (est): 
- Employees: 
- Locations: 
- Growth trajectory: 
- Key news/developments:

## Decision Makers & Champions
| Name | Role | Influence | Notes |
|------|------|-----------|-------|
| [Name] | [Title] | High/Med/Low | [Context] |

## Priority Pain Points
1. [Pain point + evidence]
2. [Pain point + evidence]
3. [Pain point + evidence]

## Wedge Pilot Recommendation
- Recommended entry point:
- Why this wedge:
- Required resources:
- Timeline: 

## Proof Plan (90-Day Pilot)
| KPI | Baseline | Target | Measurement |
|-----|----------|--------|-------------|
| [KPI] | [Current] | [Goal] | [How to measure] |

## Objection Handling
| Objection | Response |
|-----------|----------|
| "[Objection]" | [Response] |

## Outreach Sequence
1. [Step 1 + timing]
2. [Step 2 + timing]
3. [Step 3 + timing]

## Next Artifacts to Generate
- [ ] Outreach templates
- [ ] Demo script
- [ ] Pilot proposal
- [ ] Pricing discussion guide

## Sources & Confidence
[List of sources with confidence levels]
```

### Template Selection Flow

```
User initiates Deep Research
     ↓
OSQR: "What kind of research is this?"
     ↓
[General]  [Competitor]  [Market]  [Technical]  [Enterprise Account]  [Other]
     ↓
Template selected → Scoping questions tailored to template
     ↓
Research executed → Output matches template structure
```

---

## User Flow (Updated)

### Phase 1: Initiation

Three entry points:

**Explicit Entry (Dedicated Button)**
```
User clicks "Deep Research" button in main interface
     ↓
Opens focused research flow
```

**Inline Detection (Conversational)**
```
User asks complex research question
     ↓
OSQR detects research-worthy query
     ↓
"This sounds like deep research. Want me to go comprehensive?"
     ↓
User confirms → Research flow begins
```

**Tribunal Entry (Master Only)**
```
User clicks "Tribunal" button or says "Run a Tribunal on..."
     ↓
OSQR confirms: "Tribunal mode - 3 models will research, critique each other, and synthesize. Takes 5-10 minutes. Proceed?"
     ↓
User confirms → Tribunal flow begins
```

### Phase 2: Template & Scoping

```
OSQR: "What kind of research is this?"
     ↓
User selects template (or "General")
     ↓
OSQR asks template-specific scoping questions
     ↓
Research parameters locked
```

**Example: Enterprise Account Plan scoping:**
- "What company are we researching?"
- "What's your product/service you'd be selling them?"
- "Any existing relationship or cold outreach?"
- "What's your ideal entry point - department or use case?"

### Phase 3: Research Execution

**Pro Tier (Single Model)**
```
Selected model executes research
     ↓
Progress indicator: "Researching... found threads on [subtopic]"
     ↓
Report generated matching template structure
```

**Master Tier - Standard (Multi-Model)**
```
All models execute research in parallel
     ↓
Progress indicator with model-by-model status
     ↓
Individual reports generated
     ↓
Synthesis model combines findings
     ↓
All reports + synthesis available in carousel
```

**Master Tier - Tribunal**
```
Phase 1: Independent research (parallel)
     ↓
Phase 2: Cross-critique (each reviews others)
     ↓
Phase 3: Revision (each rewrites incorporating insights)
     ↓
Phase 4: Final synthesis
     ↓
All artifacts available in carousel
```

### Phase 4: Delivery (Summary-First Principle)

**Critical Design Decision**: Users want OSQR to *have* the knowledge, not to read full reports themselves.

**Delivery Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  SUMMARY (Always visible first)                             │
│                                                             │
│  "Here's what I uncovered: [2-3 sentence synthesis]"        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  KEY FINDINGS (Bullet points, expandable)                   │
│                                                             │
│  • Finding 1 - [one line]                       [expand ▼]  │
│  • Finding 2 - [one line]                       [expand ▼]  │
│  • Finding 3 - [one line]                       [expand ▼]  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  FULL REPORT (Collapsed by default)                         │
│                                                             │
│  [Expand to read full report]                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  CAROUSEL (Master only - if multi-model)                    │
│                                                             │
│  [Claude]  [GPT-4o]  [Gemini]  [Synthesis]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 5: Post-Delivery Actions

OSQR doesn't dead-end the interaction. Actions vary by template:

**General Research:**
```
[Add to PKV]
[Go deeper on {section}]
[Set reminder to refresh]
```

**Enterprise Account Plan:**
```
[Add to PKV]
[Generate Outreach Templates]
[Generate Demo Script]
[Generate Pilot Proposal]
[Create Deal Workspace] (V2)
[Set reminder to refresh in 90 days]
```

**Competitor Analysis:**
```
[Add to PKV]
[Track these competitors] (ongoing monitoring)
[Generate positioning doc]
[Set reminder to refresh]
```

---

## Cost Analysis

### Token Cost Estimates by Mode

| Mode | Models | Rounds | Est. Tokens | Est. Cost | Notes |
|------|--------|--------|-------------|-----------|-------|
| **Quick** | 1 | 1 | ~2K | $0.02-0.05 | Simple query |
| **Standard** | 1 | 1 | ~8K | $0.10-0.25 | Full research |
| **Thoughtful** | 3 | 1 | ~24K | $0.30-0.60 | Parallel, no critique |
| **Comprehensive** | 3 | 1 + synth | ~35K | $1.00-2.00 | Parallel + synthesis |
| **Tribunal** | 3 | 4 rounds | ~120K | $3.00-5.00 | Full cross-critique |

### Tribunal Cost Breakdown

```
Phase 1 - Independent Research (3 models × ~10K tokens each)
  Claude:  ~10K tokens = ~$0.35
  GPT-4o:  ~10K tokens = ~$0.25
  Gemini:  ~10K tokens = ~$0.15
  Subtotal: ~$0.75

Phase 2 - Cross-Critique (3 models × ~8K tokens each)
  Each model reads 2 reports (~20K input) + writes critique (~8K output)
  Claude:  ~$0.50
  GPT-4o:  ~$0.40
  Gemini:  ~$0.20
  Subtotal: ~$1.10

Phase 3 - Revision (3 models × ~12K tokens each)
  Each model reads critiques + rewrites report
  Claude:  ~$0.45
  GPT-4o:  ~$0.35
  Gemini:  ~$0.20
  Subtotal: ~$1.00

Phase 4 - Final Synthesis (1 model)
  Claude synthesizes all v2 reports
  ~$0.60

TOTAL ESTIMATED COST: $3.45-5.00 per Tribunal session
```

### Tribunal Pricing Model

**Option A: Included Allocation**
- Master tier includes 3 Tribunal sessions/month
- Additional sessions: $5 each or 5-pack for $20

**Option B: Token Budget**
- Tribunal draws from daily token budget
- Tribunal = 25 queries worth
- If budget exhausted, purchase Tribunal pack

**Recommendation: Option A**

Rationale:
- Simpler to understand ("you get 3 deep dives per month")
- Creates clear value differentiation for Master tier
- Overage pricing is straightforward
- Prevents accidental budget depletion

### Tribunal Pack Pricing

| Pack | Price | Per-Session Cost | Savings |
|------|-------|------------------|---------|
| Single | $5 | $5.00 | — |
| 5-pack | $20 | $4.00 | 20% |
| 10-pack | $35 | $3.50 | 30% |

At $3.50-5.00 cost, these prices maintain 30-40% margin even on heavy usage.

---

## PKV Integration

### Research Document Schema (Updated)

```typescript
interface ResearchDocument {
  id: string;
  userId: string;
  
  // Query Context
  query: {
    original: string;
    refined: string;
    template: ResearchTemplate;
    depth: 'quick' | 'standard' | 'comprehensive' | 'tribunal';
    sourcePreferences: string[];
    timeframeFilter: string | null;
  };
  
  // Results (varies by mode)
  reports: {
    model: 'claude' | 'gpt4o' | 'gemini';
    version: 1 | 2;  // v1 = original, v2 = post-critique
    content: string;
    sources: SourceReference[];
    generatedAt: Date;
  }[];
  
  // Critiques (Tribunal only)
  critiques: {
    critic: 'claude' | 'gpt4o' | 'gemini';
    targetModel: 'claude' | 'gpt4o' | 'gemini';
    content: string;
    keyPoints: string[];
  }[] | null;
  
  // Synthesis
  synthesis: {
    summary: string;
    keyFindings: string[];
    consensusPoints: string[];
    dissentPoints: string[];
    fullReport: string;
    generatedAt: Date;
  };
  
  // Metadata
  metadata: {
    tier: 'pro' | 'master';
    mode: 'quick' | 'standard' | 'thoughtful' | 'comprehensive' | 'tribunal';
    modelsUsed: string[];
    executionTime: number;
    tokenCost: number;
    projectId: string | null;
    templateUsed: ResearchTemplate;
  };
  
  // Cross-References
  crossReferences: {
    relatedDocuments: string[];
    relatedConversations: string[];
    detectedEntities: string[];
    generatedArtifacts: string[];  // IDs of outreach templates, proposals, etc.
  };
  
  // Temporal
  createdAt: Date;
  stalenessConfig: {
    decayDays: number;
    refreshPromptAt: Date;
    autoRefresh: boolean;
    triggers: string[];  // e.g., "leadership_change", "acquisition"
  };
  
  // User Engagement
  engagement: {
    viewedSummary: boolean;
    viewedFullReport: boolean;
    carouselItemsViewed: string[];
    critiquesViewed: boolean;
    actionsToken: string[];
  };
}

type ResearchTemplate = 
  | 'general'
  | 'competitor_analysis'
  | 'market_sizing'
  | 'technical_evaluation'
  | 'enterprise_account_plan'
  | 'legal_compliance'
  | 'investment_research';
```

### Staleness Detection (Updated)

| Research Type | Default Decay | Special Triggers |
|---------------|---------------|------------------|
| General | 180 days | — |
| Competitor Analysis | 90 days | New funding round, product launch |
| Market Sizing | 180 days | Major market event |
| Technical Evaluation | 120 days | Major version release |
| Enterprise Account Plan | 90 days | Leadership change, acquisition, org restructure |
| Legal/Compliance | 90 days | New regulation, court ruling |
| Investment Research | 30 days | Earnings, news event |

---

## OSQR Voice During Research

### Initiating Tribunal
> "Tribunal mode - this is my most thorough research. Three models will independently research, critique each other's findings, revise their conclusions, and I'll synthesize the best of everything. Takes about 5-10 minutes. Worth it for big decisions. Ready?"

### During Tribunal (Progress Updates)
> "Phase 1 complete - all three models finished their initial research. Claude found 12 sources, GPT-4o found 15, Gemini found 11. Now they're reviewing each other's work..."

> "Interesting - GPT-4o is pushing back on Claude's regulatory emphasis. Gemini is siding with Claude but adding nuance. This tension usually produces the best insights."

> "Phase 3 starting - each model is revising their report based on the critiques. Almost there."

### Background Notification
> "Your Tribunal research on [topic] is ready. The models had some interesting disagreements worth seeing."

### Delivering Tribunal Results
> "Here's what three models concluded after critiquing each other. Short version: [synthesis]. They agreed on [X] but split on [Y] - I've captured both the consensus and the tensions. The carousel lets you see each model's final thinking, plus my combined synthesis."

### Post-Delivery
> "What do you want to do with this? For an Enterprise Account Plan like this, I can also generate outreach templates, a demo script, or a pilot proposal - just say the word."

---

## UI Components (Updated)

### Mode Selection (Master)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 Deep Research                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Choose research depth:                                             │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │    Quick    │  │  Standard   │  │Comprehensive│                 │
│  │   1 model   │  │  1 model    │  │  3 models   │                 │
│  │   ~1 min    │  │  ~5 min     │  │  ~8 min     │                 │
│  │   1 query   │  │  3 queries  │  │  10 queries │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ⚖️ Tribunal                                                 │   │
│  │  3 models research → critique each other → revise → synth   │   │
│  │  ~10 min • Uses 1 of 3 monthly Tribunal sessions            │   │
│  │  Best for: Major decisions, strategic research, deep dives  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Tribunal sessions remaining: 2 of 3 this month                     │
│  [Buy more sessions]                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Template Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│  What kind of research is this?                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │    General    │  │  Competitor   │  │    Market     │           │
│  │   Research    │  │   Analysis    │  │    Sizing     │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│                                                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │   Technical   │  │  Enterprise   │  │    Legal/     │           │
│  │  Evaluation   │  │ Account Plan  │  │  Compliance   │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│                                                                      │
│  [Other - describe what you need]                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases (Updated)

### Phase 1: Core Research Flow (V1.5)
- [ ] Research initiation (button + inline detection)
- [ ] Scoping questions flow
- [ ] Single-model research execution (Pro)
- [ ] Summary-first delivery UI
- [ ] Basic PKV storage
- [ ] General Research template

### Phase 2: Multi-Model & Templates (V1.5)
- [ ] Parallel model execution (Master)
- [ ] Basic synthesis generation
- [ ] Carousel UI for model comparison
- [ ] Enhanced PKV storage with all outputs
- [ ] Research Templates: Competitor, Market, Technical

### Phase 3: Tribunal Mode (V1.5)
- [ ] Cross-critique orchestration
- [ ] Revision round execution
- [ ] Advanced synthesis with consensus/dissent
- [ ] Detailed progress indicator
- [ ] Background execution + notification
- [ ] Session tracking and pack purchases
- [ ] Enterprise Account Plan template

### Phase 4: Intelligence Integration (V2.0)
- [ ] Staleness detection with special triggers
- [ ] Auto-refresh option (Master)
- [ ] Insight generation from research
- [ ] Cross-project research discovery
- [ ] Deal Workspace object (links research to pipeline)

---

## Future Considerations (V2.0+)

### Enterprise Deal Workspace

Research should eventually feed into a deal management object:

```typescript
interface EnterpriseDealWorkspace {
  id: string;
  accountName: string;
  primaryContact: string | null;
  stage: 'prospecting' | 'demo' | 'pilot' | 'negotiation' | 'closed_won' | 'closed_lost';
  artifacts: {
    strategyDocId: string;
    demoScriptId?: string;
    proposalDocId?: string;
    outreachTemplatesId?: string;
    meetingNotesIds?: string[];
  };
  stakeholders: { name: string; role: string; confidence: 'low'|'med'|'high' }[];
  pilot: { wedge: string; kpis: string[]; startDate?: Date; endDate?: Date } | null;
  nextActions: { action: string; owner: 'user'|'osqr'; due?: Date }[];
  staleness: { refreshPromptAt: Date; triggers: string[] };
}
```

This is V2.0 scope - bridges research → deal execution.

---

## Success Metrics (Updated)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Research completion rate | >90% | Started vs. finished |
| Tribunal completion rate | >95% | Higher bar - users committed more |
| Summary engagement | >80% read summary | View tracking |
| Full report engagement | >30% expand full | Click tracking |
| Carousel usage (Master) | >60% view 2+ models | Click tracking |
| Critique viewing (Tribunal) | >40% view critiques | Click tracking |
| PKV storage rate | >70% add to vault | Action tracking |
| Template usage | >50% use non-General | Selection tracking |
| Artifact generation | >30% generate follow-up docs | Action tracking |
| Tribunal pack purchases | >10% of Master users | Purchase tracking |
| Refresh acceptance | >40% accept refresh prompt | Action tracking |
| Research reuse | >20% referenced later | Retrieval tracking |

---

## Open Questions (Resolved)

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Tribunal model selection** | Locked to Claude/GPT-4o/Gemini for V1.5 | Simplifies implementation, model customization in V2.0 |
| **Partial Tribunal** | Complete with 2 models, note failure in synthesis | Users get value even with partial results |
| **Tribunal on existing content** | V2.0 feature | Focus V1.5 on new research flow |
| **Tribunal scheduling** | Not in V1.5 | Background execution covers async use case |
| **Team Tribunals** | Enterprise tier, V2.0+ | Requires multi-user architecture first |
| **Export formats** | Markdown only in V1.5, PDF in V2.0 | MVP scope |
| **Research history view** | Dedicated `/research` tab in sidebar | Clear UX, separates from general chat |

---

## Technical Decisions (Dec 2024)

| Decision | Choice | Notes |
|----------|--------|-------|
| **Web search provider** | Tavily | Cost + API simplicity (not Perplexity) |
| **Sources per model** | 10-15 | Balance quality vs. cost |
| **Timeout per phase** | 2 min per model | 8 min max Tribunal total |
| **Background jobs** | Inngest | Trigger.dev as fallback |
| **Tribunal vs token budget** | Separate allocation | 3/month independent of daily budget |
| **Carousel UX** | Tabs + keyboard (desktop), swipe (mobile) | |
| **Min models for synthesis** | 2 of 3 | If <2 succeed, Tribunal fails |

---

## API Endpoints

```
POST /api/oscar/research                    # Initiate research
GET  /api/oscar/research/[id]               # Get results
GET  /api/oscar/research/[id]/status        # Poll progress (background)
POST /api/oscar/research/[id]/cancel        # Cancel in-progress
GET  /api/oscar/research/templates          # List available templates
GET  /api/oscar/research/tribunal/usage     # Check sessions remaining
POST /api/oscar/research/tribunal/purchase  # Buy pack (Stripe)
```

---

## Database Schema

See: `packages/app-web/prisma/schema.prisma`

- `ResearchSession` - Individual research requests
- `TribunalUsage` - Monthly usage tracking
- `TribunalPackPurchase` - Stripe purchase records

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 DRAFT | Dec 2024 | Initial specification |
| 1.1 DRAFT | Dec 2024 | Added Tribunal Mode, Research Templates, Background Execution, Cost Analysis, Enterprise Account Plan template, Updated PKV schema |
| 1.2 | Dec 2024 | Resolved open questions, added technical decisions, API endpoints, database schema |

---

## Document Connections

| Document | Relationship |
|----------|--------------|
| **Multi-Model Router Spec** | Underlying model orchestration |
| **Memory Vault Spec** | Storage layer for research |
| **Document Indexing Spec** | How research gets chunked/embedded |
| **Insights System Spec** | Research feeds insight generation |
| **Temporal Intelligence Spec** | Staleness detection |
| **Free Tier Architecture** | Budget/throttle integration |
| **Character Guide** | OSQR voice during research |
| **Conversion Strategy** | Tribunal as premium feature driver |

---

**End of Specification**

*Document Version: 1.2*
*Status: Ready for Implementation*
