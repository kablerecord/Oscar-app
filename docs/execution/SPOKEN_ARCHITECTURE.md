# OSQR Spoken Architecture
## Version 2.0 | Guided Software Development Through Conversation

**Component:** Spoken Architecture Platform
**Version:** 2.0
**Status:** Ready for Implementation
**Target Release:** v2.0 (VS Code Extension)
**Dependencies:** Memory Vault, Document Indexing, Project Guidance

---

## Executive Summary

Spoken Architecture is a guided software development methodology where users build complete applications through natural conversation with OSQR. Rather than requiring users to know how to structure projects, write specifications, or manage development workflows, OSQR leads the conversation—asking the right questions, organizing scattered ideas, and assembling everything into implementation-ready specifications.

The core insight: building software is like assembling a puzzle. The picture is on the box (project structure, document types, file organization). OSQR knows what the finished puzzle looks like. The user just provides the pieces—their ideas, requirements, decisions—and OSQR places each piece where it belongs.

This enables two user types to succeed:
- **Expert users** who already think in structures get 10-50x acceleration
- **Beginners** who have scattered ideas across weeks or months still produce professional-grade software

---

## The Problem

### Why Most People Fail to Build Software

Most people lack the imagination or structure to ask the right questions. They don't know what they don't know. Traditional development requires:
- Understanding what a PRD should contain
- Knowing how to structure architecture documents
- Breaking features into implementable units
- Managing dependencies and sequencing
- Translating ideas into technical specifications

This is why hiring developers fails. The person with the idea can't articulate it precisely enough, and the developer builds the wrong thing. $50,000 later, there's no MVP.

### Current AI Tools Don't Solve This

Existing AI assistants (ChatGPT, Claude, Copilot) are reactive. They wait for prompts. They don't:
- Remember what you said three weeks ago
- Notice when your current idea contradicts a previous decision
- Ask the questions you didn't know to ask
- Organize scattered thoughts into coherent structure
- Guide you through a methodology

They're tools for people who already know what they're doing. That's a small market.

---

## The Solution: OSQR as Guide

### The Puzzle Analogy

**Traditional Development:** Assembling a puzzle with no picture on the box. You don't know what you're building until you're deep into it. Pieces get lost. You realize halfway through that pieces don't fit together.

**Spoken Architecture in OSQR:** The picture is on the box from day one. The structure exists before the code. Every conversation, every spec, every decision is a puzzle piece—OSQR knows where it goes because the finished picture is already defined.

You're not figuring out what to build. You're finding where each piece fits.

### How OSQR Leads

OSQR doesn't wait for the right prompt. He asks:
- "You mentioned payments twice but haven't defined pricing. What do you want to charge?"
- "I see you have an onboarding flow but no login system. Should users create accounts?"
- "You've described 3 different user types. Which one are we building for first?"
- "This contradicts what you said on October 15th. Which version do you want?"

He takes scattered puzzle pieces—even from months ago—and says:
> "Based on everything you've told me, here's what you're building. Here are the gaps. Let's fill them."

---

## Core Philosophy

### The Specification IS the Development

Unlike "vibe coding" (skip specs, embrace chaos), Spoken Architecture produces specifications so precise that code becomes inevitable. The conversation produces the artifact. Code is the output, not the work.

### Two User Types, One Product

| Aspect | Expert User | Beginner |
|--------|-------------|----------|
| Starting State | Already thinks in structures | Ideas scattered across notes, voice memos, half-finished docs |
| OSQR's Role | Accelerator (10-50x speed) | Guide (asks questions, organizes, fills gaps) |
| Outcome | Builds faster than ever possible | Builds something they couldn't have built alone |

Same product. Same methodology. OSQR meets users where they are and elevates them.

### You Don't Need to Know AI

Just like OSQR the assistant enables people with no AI experience to work effectively with AI, Spoken Architecture enables people with no development experience to build software.

> "You don't need to know AI. That's OSQR's job."
> "You don't need to know software development. That's OSQR's job."

---

## Document Hierarchy

OSQR knows this structure. When users provide ideas, OSQR automatically categorizes and files them.

### Phase 1: Planning Documents (Strategic)

| Document | Purpose | Owner |
|----------|---------|-------|
| Project Brief | Market gap, competitive analysis, value proposition | OSQR extracts from conversation |
| PRD | Functional/Non-Functional Requirements, Epic hierarchy | OSQR + User |
| Architecture | Tech stack, system components, data flow | OSQR + User |

**Gate:** Document Alignment verification before Phase 2

### Phase 2: Execution Documents (Surgical)

| Document | Purpose | Owner |
|----------|---------|-------|
| Epic Files | Feature groups sharded from PRD | OSQR generates |
| Story Files | Hyper-detailed implementation units | OSQR generates |
| MentorScripts | Behavioral rules, coding standards, gotchas | OSQR + User |
| LoopScripts | SOPs, autonomy boundaries, rigor levels | OSQR + User |

### Phase 3: Completion Documents

| Document | Purpose | Owner |
|----------|---------|-------|
| MRP | Merge-Readiness Pack: tests, linting, rationale | OSQR generates |
| VCR | Version Controlled Resolution: auditable decisions | User approves |

---

## Auto-Categorization System

When users provide information through conversation, OSQR automatically determines where it belongs.

### How It Works

1. User provides input (idea, decision, requirement, concern)
2. OSQR classifies the input type (market insight, feature request, technical decision, etc.)
3. OSQR identifies destination (which document this belongs in)
4. OSQR files automatically (updates the appropriate document)
5. OSQR confirms ("I've added that to your Architecture doc under Authentication")

### Classification Examples

| User Says | OSQR Classifies | Files To |
|-----------|-----------------|----------|
| "Competitors charge $50/month" | Market insight | Project Brief |
| "Users should be able to export as PDF" | Feature request | PRD → FR |
| "Let's use Stripe for payments" | Technical decision | Architecture |
| "The app needs to load in under 2 seconds" | Performance req | PRD → NFR |
| "Actually, let's do $29/month instead" | Decision change | VCR + Update |

---

## Guided Questioning System

OSQR proactively identifies gaps and asks the questions users don't know to ask.

### Gap Detection

OSQR continuously monitors the document structure for:
- **Missing sections** — "You have features but no pricing. What will you charge?"
- **Contradictions** — "On October 15th you said free tier, now you're saying paid only. Which is it?"
- **Incomplete requirements** — "You mentioned user authentication but haven't specified how they log in."
- **Dependency gaps** — "The payment feature requires user accounts, but accounts aren't in the PRD yet."
- **Ambiguous decisions** — "You said 'simple pricing' but haven't defined what that means."

### Question Timing

OSQR asks questions:
- During natural conversation pauses — not interrupting flow
- When gaps would block progress — can't proceed without this answer
- When detecting contradictions — immediately, to prevent compounding errors
- At phase transitions — "Before we move to implementation, let's fill these gaps"

### Question Framing

Questions are framed to elicit specific, actionable answers:

| Bad Question | Good Question |
|--------------|---------------|
| What's your pricing strategy? | What's the monthly price for your core tier? |
| How should auth work? | Email/password, Google OAuth, or both? |
| Tell me about your users | Who's your first 100 users? Job title? |

---

## Progress Tracking

Users can see exactly where they are in the build process.

### Visual Progress Indicators

OSQR shows:
- **Document completion percentage** — "Project Brief: 80% complete"
- **Missing sections** — "PRD needs: Pricing, User Roles, Error Handling"
- **Epic status** — "E-001 Governance: Complete | E-002 Memory: In Progress"
- **Story status** — "12 of 28 stories complete"
- **Blocking items** — "Payment integration blocked by: Pricing decision needed"

### The Dashboard View

A single view showing:
- Overall project status (Phase 1 / Phase 2 / Implementation)
- Document health (complete / gaps / contradictions)
- Current sprint (what's being worked on now)
- Next actions ("Answer these 3 questions to unblock progress")
- Time estimate ("At current pace, MVP in ~4 weeks")

---

## Cross-Session Memory

Unlike other AI tools, OSQR remembers everything across sessions—even months apart.

### What Gets Remembered

- Every decision made — and when it was made
- Every requirement stated — even casual mentions
- Every contradiction detected — and how it was resolved
- User preferences — communication style, technical depth
- Context from other projects — patterns that might apply

### Temporal Intelligence Integration

OSQR can say:
- "Three months ago you decided on $29/month. You're now discussing $49. Want to update the decision record?"
- "You've changed the auth approach three times. Here's the history. Which version is final?"
- "In your VoiceQuote project, you solved this with OAuth. Want to use the same pattern here?"

---

## Implementation Workflow

Once specifications are complete, OSQR hands off to implementation.

### The Handoff

1. Specs complete — all documents at "Hardened" status
2. OSQR generates Story Files — implementation-ready units
3. VS Code Claude receives — Story File + MentorScript + LoopScript
4. Implementation proceeds — following Spoken Architecture methodology
5. MRP generated — proving implementation matches spec
6. User reviews — approves or requests changes

### The Minimum Viable Specification (MVS)

For autonomous implementation, every spec must have:
- **Goal & Why** — purpose and business value
- **Success Criteria** — verifiable Definition of Done
- **Surgical Context** — relevant files, dependencies, gotchas
- **Implementation Blueprint** — strategic constraints
- **Validation Loop** — how to verify correctness

**Test:** "If I hand this spec to an agent and walk away, will it build what I actually want without asking questions?"

---

## Beginner-First Design

OSQR is designed to grow with users.

### The Learning Curve

| Stage | User Capability | OSQR Behavior |
|-------|-----------------|---------------|
| Day 1 | Scattered ideas, no structure | Maximum guidance, frequent questions |
| Week 2 | Understands document types | Moderate guidance, explains less |
| Month 2 | Thinks in Epics and Stories | Minimal guidance, accelerator mode |
| Month 6+ | Expert, drives own structure | Pure acceleration, questions only on gaps |

### OSQR Learns Too

As more users build software through Spoken Architecture:
- OSQR learns which questions are most valuable
- Pattern library grows with successful implementations
- Gap detection becomes more accurate
- Time-to-MVP decreases across all user types

The easy apps today get even easier. Complex apps become possible for beginners.

---

## Marketing Positioning

### The Competitive Landscape

| Tool | What It Is | Who It's For |
|------|------------|--------------|
| ChatGPT/Claude | Reactive chat, no memory | People who know what to ask |
| GitHub Copilot | Code completion | Developers who write code |
| Cursor/Windsurf | AI-powered IDE | Developers who want AI help |
| OSQR | Guided development through conversation | Anyone with an idea |

### Taglines

- "You don't need to know AI. That's OSQR's job."
- "You don't need to know software development. That's OSQR's job."
- "You bring the idea. OSQR brings everything else."
- "The picture's on the box. Just find where the pieces fit."
- "Stop building software blind."

---

## Integration Points

Spoken Architecture relies on these OSQR systems:

| System | Role in Spoken Architecture |
|--------|----------------------------|
| Memory Vault | Stores all documents, decisions, context across sessions |
| Document Indexing | Enables cross-project awareness, pattern detection |
| Project Guidance | Understands document hierarchy, tracks completion |
| Temporal Intelligence | References past decisions with timestamps, detects contradictions |
| Insights System | Surfaces gaps, contradictions, stale threads proactively |
| VS Code Extension | Receives Story Files, executes implementation, generates MRPs |

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Time to first spec | <30 minutes | Proves immediate value |
| Time to MVP | <4 weeks | Proves full methodology |
| Beginner completion rate | >60% | Proves accessibility |
| Questions asked by OSQR | >80% useful | Proves guidance quality |
| Auto-categorization accuracy | >90% | Proves intelligent filing |
| Spec-to-implementation match | >95% | Proves spec quality |

---

## Document Connections

| Document | Relationship |
|----------|--------------|
| [OSQR_MENTORSCRIPT.md](./OSQR_MENTORSCRIPT.md) | Development standards used during implementation |
| [OSQR_LOOPSCRIPT.md](./OSQR_LOOPSCRIPT.md) | SOPs for autonomous development |
| [KNOWLEDGE_ARCHITECTURE.md](../architecture/KNOWLEDGE_ARCHITECTURE.md) | Memory system enabling cross-session awareness |
| [PLUGIN_CREATOR_SPEC.md](../plugins/PLUGIN_CREATOR_SPEC.md) | Conversational plugin development (same pattern) |
| [OSQR_PROJECT_BRIEF.md](../planning/OSQR_PROJECT_BRIEF.md) | Strategic context for OSQR itself |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial methodology white paper |
| 2.0 | Dec 2024 | Added: Auto-categorization, Guided questioning, Progress tracking, Beginner-first design, Marketing positioning, Puzzle analogy |

---

**End of Specification**

*Document Version: 2.0*
*Status: Ready for Implementation*
