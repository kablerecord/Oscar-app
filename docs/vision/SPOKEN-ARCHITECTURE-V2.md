# SPOKEN ARCHITECTURE v2

**From Methodology to System: OSQR as the Interviewer**

Version 2.0 | December 2025 | Kable Record, Founder, OSQR

---

## What Changed from V1

Version 1 described Spoken Architecture as a *methodology* - a way for humans to work with AI to produce executable specifications. The human drives the conversation, the AI assists.

Version 2 describes Spoken Architecture as a *system* - where OSQR itself becomes the interviewer, knowing what questions to ask based on a learned understanding of software architecture. The human provides the vision, OSQR extracts the specification.

---

## The Puzzle Analogy

Building software with Spoken Architecture is like assembling a puzzle:

1. **The Picture** = The finished product (what it does, who it's for, how it works)
2. **The Pieces** = The universal building blocks every SaaS needs
3. **Spoken Development** = The process of describing the picture until every piece is defined
4. **VS Code OSQR** = The assembler that puts the pieces together

### How It Works

```
User: "I want to build X for Y people"
           ↓
OSQR asks clarifying questions
           ↓
Each question defines a "piece"
           ↓
When all pieces are defined → specification complete
           ↓
VS Code OSQR assembles pieces into code
```

The key insight: **OSQR doesn't need to understand infinite possibilities. It needs to understand the finite set of pieces that compose every SaaS.**

---

## The Universal SaaS Structure

By analyzing how OSQR was built (342,000 lines across 11 subsystems), we can extract the pieces that every SaaS contains:

### Foundation Pieces (Every SaaS)

| Piece | What It Defines | Example Questions |
|-------|-----------------|-------------------|
| **Authentication** | Who can access, how they prove identity | OAuth? Email/password? Magic links? |
| **Authorization** | What users can do based on role/tier | Free vs paid? Admin vs user? |
| **Data Model** | What entities exist and how they relate | What's the core object? What belongs to what? |
| **API Layer** | How frontend talks to backend | REST? GraphQL? tRPC? |
| **Storage** | Where data lives | Postgres? Document DB? File storage? |
| **Payments** | How money flows | Subscription? One-time? Usage-based? |

### Experience Pieces (Most SaaS)

| Piece | What It Defines | Example Questions |
|-------|-----------------|-------------------|
| **Onboarding** | First-time user journey | What's the magic moment? How fast to value? |
| **Dashboard** | Primary user interface | What do users see first? What actions matter? |
| **Notifications** | How system communicates | Email? In-app? Push? What triggers them? |
| **Settings** | User customization | What can users control? |
| **Search** | Finding things | Full-text? Semantic? Filtered? |

### Differentiation Pieces (Your Unique Value)

| Piece | What It Defines | Example Questions |
|-------|-----------------|-------------------|
| **Core Feature** | The thing that makes you different | What does your product do that others don't? |
| **Integrations** | How you connect to other tools | What external systems matter? |
| **AI/Intelligence** | If applicable, how AI adds value | What decisions should AI make? |

---

## OSQR as the Interviewer

### Current State (V1 - Human Drives)

```
Human: "I want to build a tool that helps people track their habits"
AI: "Tell me more about what you're thinking..."
Human: [explains for 30 minutes]
AI: [takes notes, asks occasional questions]
Human: [eventually produces spec through iteration]
```

The human must know what to explain. The AI is reactive.

### Future State (V2 - OSQR Drives)

```
Human: "I want to build a tool that helps people track their habits"
OSQR: "Got it. Let me ask you some questions to define this completely."

OSQR: "Authentication - how will users sign up?"
Human: "Email and Google OAuth"
OSQR: [marks Authentication piece as defined]

OSQR: "Data Model - what's the core entity? A 'habit'?"
Human: "Yes, habits with daily check-ins"
OSQR: [marks Data Model piece as partially defined]
OSQR: "Does a habit belong to a user, or can habits be shared?"
Human: "Private to each user"
OSQR: [marks Data Model piece as defined]

[continues until all pieces are defined]

OSQR: "All pieces defined. Here's your specification. Ready to build?"
```

OSQR knows what pieces exist and asks until each is defined. The human provides judgment, OSQR provides structure.

---

## Learning the Pieces from OSQR's Own Build

The key to V2 is extracting the universal structure from a real, complete codebase. OSQR analyzing its own build produces:

### 1. Piece Inventory

What components exist in a complete SaaS? OSQR can catalog:
- Every API route and what it does
- Every database model and its relationships
- Every UI component and its purpose
- Every integration and how it connects

### 2. Piece Dependencies

What order must pieces be built? OSQR can map:
- Auth must exist before user-owned resources
- Data model must exist before API routes
- API routes must exist before UI

### 3. Piece Templates

What does a typical piece look like? OSQR can extract:
- Common patterns for auth (NextAuth setup)
- Common patterns for API routes (validation → business logic → response)
- Common patterns for UI (components → hooks → pages)

### 4. Question Trees

What questions fully define each piece? OSQR can derive:
- For Authentication: provider options, session handling, role system
- For Payments: billing model, tier structure, trial handling
- For each piece: the minimum questions to eliminate ambiguity

---

## The Build Process

### Phase 1: Picture Description

User describes what they want in natural language. No structure required.

*"I want to build an app where fitness coaches can create workout programs and sell them to clients. Clients buy a program, get access to the workouts, and can track their progress."*

### Phase 2: Piece Extraction

OSQR identifies which pieces this picture requires:
- Authentication (coaches + clients = two user types)
- Authorization (coach creates, client consumes)
- Data Model (programs, workouts, progress)
- Payments (clients pay for programs)
- Dashboard (different for coach vs client)
- ...

### Phase 3: Piece Definition

OSQR asks questions until each piece is fully defined:

```
OSQR: "Payments - how do clients pay for programs?"
User: "One-time purchase"
OSQR: "Can coaches set their own prices?"
User: "Yes"
OSQR: "Do you take a platform fee?"
User: "15%"
OSQR: "Stripe for processing?"
User: "Yes"
OSQR: [Payments piece fully defined]
```

### Phase 4: Specification Generation

Once all pieces are defined, OSQR generates the complete specification document - the same quality as V1, but arrived at through structured interview rather than freeform conversation.

### Phase 5: Assembly

VS Code OSQR takes the specification and assembles the pieces into working code. Because the pieces are known patterns, assembly is mechanical.

---

## Why This Is Different from No-Code/Low-Code

No-code tools give you predefined pieces that can only connect in predefined ways. You're constrained to what the tool supports.

Spoken Architecture gives you *understanding* of the pieces. The actual implementation is full code, infinitely customizable. You get the speed of no-code with the flexibility of custom development.

| Aspect | No-Code | Spoken Architecture |
|--------|---------|---------------------|
| Flexibility | Limited to platform | Unlimited (it's code) |
| Ownership | Platform-dependent | You own everything |
| Ceiling | Hits walls fast | No ceiling |
| Output | Proprietary runtime | Standard codebase |
| Learning | Learn the tool | Learn software architecture |

---

## Implementation Path

### Near-Term (V1.0-V1.5)

- Index OSQR codebase into PKV
- Use web panel to ask questions about architecture
- Manually copy guidance to Claude Code for execution
- **Human is the bridge between OSQR (brain) and Claude Code (hands)**

### Mid-Term (V2.0-V3.0)

- VS Code OSQR gains file editing capabilities
- OSQR can both advise AND execute
- Piece templates extracted and stored
- Question trees formalized
- **OSQR becomes both brain and hands**

### Long-Term (V3.0+)

- OSQR interviews users for new projects
- Generates specifications from structured Q&A
- Assembles code from piece templates
- **"Describe your app" → working SaaS**

---

## Connection to OSQR's Mission

OSQR's stated mission is to be "the intelligence layer between humans and every application they use."

Spoken Architecture V2 makes OSQR the intelligence layer between *ideas* and *software*. The same principles apply:

- **Persistent memory** across the entire project lifecycle
- **Constitutional framework** ensuring quality and safety
- **Multi-model reasoning** for complex architectural decisions
- **Interface agnostic** - describe your app anywhere, build it in VS Code

This isn't a pivot from OSQR's mission. It's the natural extension: if OSQR can understand and assist with any application, it can understand and assist with building applications.

---

## Proof Point: OSQR Building OSQR

The strongest evidence this works is OSQR itself:

| Metric | Value |
|--------|-------|
| Lines of code | 342,000 |
| Development time | ~6 weeks |
| Development cost | ~$675 (API) |
| Traditional equivalent | $1.7M - $6M |
| Test coverage | 1,665+ passing tests |
| Documentation | 120K lines |

This wasn't vibe coding. Every feature has a specification. Every specification came from conversation. The methodology produced both the product AND the documentation to understand it.

Now, by analyzing what was built, we can extract the pattern and apply it to any SaaS.

---

## The Recursive Loop

There's something important happening here that's easy to miss:

1. **OSQR was built with Spoken Architecture** - The methodology produced the product
2. **OSQR is the tool that enables Spoken Architecture** - The product delivers the methodology
3. **OSQR will analyze itself to improve Spoken Architecture** - The product refines the methodology

This isn't just proof. It's a **self-improving system**.

Every time OSQR builds something:
- It can analyze what it built
- Extract new patterns
- Refine piece definitions
- Improve question trees

The methodology gets better with use. The more OSQR builds, the better it understands what "pieces" exist and what questions define them.

This is why mining OSQR's own codebase matters. It's not a one-time extraction - it's the beginning of a feedback loop.

---

## What This Is NOT

Spoken Architecture does not claim to replace developers.

It claims to:
- **Lower the bar** to become a developer (clarity of thought > syntax memorization)
- **Accelerate existing developers** (skip the translation layers, go straight to implementation)
- **Make solo founders competitive** with funded teams

The limiting factor in software is not coding ability. It's clarity of thought. Those who can articulate what they want with precision will build faster than those who can only code.

Spoken Architecture is for them.

---

## Open Questions

1. **How granular are pieces?** Is "Authentication" one piece or five (signup, login, logout, password reset, OAuth)?

2. **How do we handle novel pieces?** What if someone wants something that doesn't fit the pattern?

3. **How do we version piece templates?** As best practices evolve, how do templates update?

4. **How do we handle existing codebases?** Can OSQR analyze a codebase and identify which pieces exist vs are missing?

5. **How do we measure specification quality?** What's the metric for "this spec is complete enough to build from"?

6. **What happens when a piece is defined poorly?** The spec fails, the build halts, the system asks better questions. Ambiguity is handled systemically, not magically.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial methodology - human drives conversation |
| 2.0 | Dec 2025 | System evolution - OSQR as interviewer, puzzle analogy, piece extraction from codebase analysis |
| 2.1 | Dec 2025 | Added recursive loop concept, clarified positioning (lowers bar, accelerates developers), added failure mode to open questions |

---

*"The picture on the box makes the puzzle solvable. Spoken Architecture gives every builder the picture."*
