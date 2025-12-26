# OSQR Self-Discovery Questions

**Purpose:** A structured set of questions OSQR can work through to understand itself, improve itself, and develop Spoken Architecture.

**How to use:** Feed these to OSQR once the codebase is indexed. Work through them in order - each answer informs the next question.

---

## Phase 1: Understanding What Exists

### 1.1 Codebase Structure
- [ ] What are all the top-level directories and what does each contain?
- [ ] What is the dependency graph between packages (core → app-web → marketing)?
- [ ] What external dependencies does OSQR rely on and why?
- [ ] What files have the most imports (highest coupling)?
- [ ] What files have zero imports from other project files (leaf nodes)?

### 1.2 Feature Inventory
- [ ] List every API endpoint and what it does
- [ ] List every React component and its purpose
- [ ] List every database model and its relationships
- [ ] What features are fully implemented vs partially implemented vs stubbed?
- [ ] What features exist in specs but not in code?

### 1.3 Pattern Recognition
- [ ] What patterns repeat across the codebase? (e.g., API route structure, component patterns)
- [ ] What naming conventions are used consistently?
- [ ] What error handling patterns exist?
- [ ] How is authentication checked across different routes?
- [ ] How is authorization (tier-based access) enforced?

---

## Phase 2: Extracting the Pieces

### 2.1 Universal SaaS Pieces
- [ ] What are all the "pieces" that make up OSQR?
- [ ] Which pieces would exist in ANY SaaS? (auth, payments, etc.)
- [ ] Which pieces are OSQR-specific? (constitutional, council, etc.)
- [ ] For each universal piece, what files implement it?
- [ ] For each universal piece, what configuration options exist?

### 2.2 Piece Dependencies
- [ ] What order must pieces be built in? (dependency graph)
- [ ] Which pieces can be built in parallel?
- [ ] Which pieces have circular dependencies?
- [ ] What's the minimum viable set of pieces for a working app?

### 2.3 Piece Templates
- [ ] For each universal piece, what does a "standard implementation" look like?
- [ ] What questions fully define each piece?
- [ ] What are the decision points within each piece? (e.g., for auth: OAuth providers, session handling, etc.)
- [ ] Can you generate a template for each piece type?

---

## Phase 3: Understanding the Build Process

### 3.1 How OSQR Was Built
- [ ] What order were features built in? (analyze git history or BUILD-LOG)
- [ ] What decisions were made early that affected everything after?
- [ ] What was refactored and why?
- [ ] What would you build differently knowing what you know now?

### 3.2 Specification → Implementation
- [ ] For each major feature, find its spec document and its implementation
- [ ] How closely does implementation match spec?
- [ ] Where did implementation deviate and why?
- [ ] What spec details were missing that had to be figured out during implementation?

### 3.3 Test Coverage
- [ ] What is tested vs not tested?
- [ ] What types of tests exist? (unit, integration, E2E)
- [ ] What patterns do the tests follow?
- [ ] What would break if tests didn't exist?

---

## Phase 4: Improving OSQR

### 4.1 Gaps and Inconsistencies
- [ ] What features are documented but not built?
- [ ] What features are built but not documented?
- [ ] What code is dead (never called)?
- [ ] What error paths are unhandled?
- [ ] What edge cases are untested?

### 4.2 Performance and Quality
- [ ] What are the slowest API endpoints?
- [ ] What queries could be optimized?
- [ ] What components re-render unnecessarily?
- [ ] Where is technical debt accumulating?

### 4.3 Security
- [ ] Where is user input not validated?
- [ ] Where could injection attacks occur?
- [ ] What sensitive data is logged?
- [ ] What API routes lack proper authorization checks?

---

## Phase 5: Developing Spoken Architecture

### 5.1 Question Trees
- [ ] For each universal piece, what is the complete question tree?
- [ ] What is the minimum set of questions to fully define a SaaS?
- [ ] What questions have dependent follow-ups? (if X, then ask Y)
- [ ] What questions can be answered with defaults?

### 5.2 Piece Generation
- [ ] Given answers to piece questions, can you generate the spec?
- [ ] Given the spec, can you generate the file structure?
- [ ] Given the file structure, can you generate the code?
- [ ] What's the gap between generated code and production-ready code?

### 5.3 Interview Flow
- [ ] What's the optimal order to ask questions?
- [ ] How do you handle "I don't know" answers?
- [ ] How do you handle contradictory answers?
- [ ] When is a specification "complete enough" to build from?

---

## Phase 6: VS Code OSQR Development

### 6.1 Current Extension
- [ ] What does the VS Code extension currently do?
- [ ] What's missing for it to be a chat companion?
- [ ] What's missing for it to have file editing capabilities?
- [ ] What's the gap between current extension and Claude Code?

### 6.2 Agentic Capabilities
- [ ] What file operations would OSQR need to perform?
- [ ] How would OSQR read and understand file context?
- [ ] How would OSQR propose and apply edits?
- [ ] How would OSQR run terminal commands?
- [ ] How would OSQR handle errors during execution?

### 6.3 Self-Modification
- [ ] Can OSQR read its own codebase in VS Code?
- [ ] Can OSQR propose changes to itself?
- [ ] How do you prevent OSQR from breaking itself?
- [ ] What guardrails are needed for self-modification?

---

## Phase 7: The Recursive Loop

### 7.1 Self-Improvement
- [ ] After OSQR builds something, how does it analyze what it built?
- [ ] How does OSQR update its piece templates from new builds?
- [ ] How does OSQR improve its question trees from experience?
- [ ] How does OSQR measure if it's getting better?

### 7.2 Knowledge Accumulation
- [ ] What should OSQR remember from every build?
- [ ] How does OSQR avoid repeating mistakes?
- [ ] How does OSQR share learnings across users (without sharing private data)?
- [ ] What's the feedback loop from implementation back to methodology?

### 7.3 Convergence
- [ ] Is there a "final form" of the piece library?
- [ ] Do question trees stabilize or keep evolving?
- [ ] At what point does OSQR "know" how to build any SaaS?
- [ ] What remains irreducibly human?

---

## Meta Questions

- [ ] Which of these questions can OSQR answer right now?
- [ ] Which require capabilities OSQR doesn't have yet?
- [ ] What's the right order to work through these?
- [ ] Which answers would have the highest leverage?
- [ ] What questions are missing from this list?

---

## Progress Tracking

| Phase | Questions | Answered | Remaining |
|-------|-----------|----------|-----------|
| 1. Understanding | 15 | 0 | 15 |
| 2. Pieces | 14 | 0 | 14 |
| 3. Build Process | 11 | 0 | 11 |
| 4. Improving | 11 | 0 | 11 |
| 5. Spoken Architecture | 12 | 0 | 12 |
| 6. VS Code OSQR | 12 | 0 | 12 |
| 7. Recursive Loop | 12 | 0 | 12 |
| **Total** | **87** | **0** | **87** |

---

*Last updated: December 26, 2025*

*"OSQR asking OSQR about OSQR to improve OSQR."*
