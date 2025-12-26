# Agentic Software Engineering: Foundational Pillars and a Research Roadmap

**Authors:**
- Ahmed E. Hassan (Queen's University, Kingston ON, Canada)
- Hao Li (Queen's University, Kingston ON, Canada)
- Dayi Lin (Huawei Canada, Kingston ON, Canada)
- Bram Adams (Queen's University, Kingston ON, Canada)
- Tse-Hsun Chen (Concordia University, Montreal, Canada)
- Yutaro Kashiwa (Nara Institute of Science and Technology, Ikoma, Japan)
- Dong Qiu (Huawei Canada, Kingston ON, Canada)

**Year:** 2025

**Keywords:** Agentic Software Engineering, AI Agent, Agentic AI, Coding Agent

---

## Abstract

Agentic Software Engineering (SE 3.0) represents a new era where intelligent agents are tasked not with simple code generation, but with achieving complex, goal-oriented SE objectives. To harness these new capabilities while ensuring trustworthiness, we must recognize a fundamental duality within the SE field in the Agentic SE era, comprising two symbiotic modalities: **SE for Humans** and **SE for Agents**.

This duality demands a radical reimagining of the foundational pillars of SE (actors, processes, tools, and artifacts) which manifest differently across each modality.

### The SASE Vision

This new vision requires two distinct, purpose-built workbenches:

1. **Agent Command Environment (ACE):** A command center where humans orchestrate, mentor, and oversee agent teams while managing an inbox of agent-generated events like Merge-Readiness Packs (MRPs) and Consultation Request Packs (CRPs).

2. **Agent Execution Environment (AEE):** A digital workbench where agents not only execute tasks but can proactively invoke human expertise when facing complex trade-offs or ambiguity.

This bi-directional partnership supports agent-initiated human callbacks and handovers, giving rise to new, structured engineering activities that redefine human-AI collaboration, elevating the practice from agentic coding to true agentic software engineering.

---

## 1. Introduction

The emergence of powerful autonomous agents (AI teammates) capable of writing, testing, and submitting code has moved Software Engineering beyond AI-Augmented development (SE 2.0) into **Agentic Software Engineering (SE 3.0)**.

### The Speed vs. Trust Gap

While autonomous coding agents (Google's Jules, OpenAI's Codex, Anthropic's Claude Code, Cognition's Devin) are already responsible for hundreds of thousands of merged pull requests, their hyper-productivity reveals a significant gap:

- Large percentage of agent efforts fail to meet "merge-ready" quality
- Often contain subtle regressions, superficial fixes, or lack of engineering hygiene
- Creates critical bottleneck requiring demanding human-in-the-loop review

### The 100x/1000x Developer Phenomenon

A new class of practitioners is emerging: developers achieving 100x or even 1000x productivity by mastering nascent best practices of this new agentic era. However, the SE field exists because we cannot assume every team is composed of "super developers."

### The SASE Core Thesis: A Structured Duality

- **SE for Humans (SE4H):** Redefines human's role to focus on high-level intent, strategy, and mentorship as an Agent Coach
- **SE for Agents (SE4A):** Establishes a structured and predictable environment where multiple agents can operate effectively

### The Four Pillars Reimagined

| Pillar | Traditional | Agentic Era |
|--------|-------------|-------------|
| **Actors** | Human developers | Hybrid team of human "Agent Coaches" and specialized software agents |
| **Processes** | Ad-hoc prompting | Structured, repeatable engineering activities governing human-agent collaborations |
| **Artifacts** | Transient prompts | Durable machine-readable structured artifacts (BriefingScript, CRPs, MRPs) |
| **Tools** | Human-centric IDE | Specialized workbenches (ACE for humans, AEE for agents) |

---

## 2. From Agency to Autonomy: A Hierarchical Framework

### Level 0: Manual Coding (No-AI SE) [SE 1.0]
- **Use Case:** Human manually translates ideas into tokens by typing
- **Tools:** Plain text editors (Notepad, vi, emacs)
- **Car Parallel (SAE Level 0):** No Automation

### Level 1: Token Assistance (AI-Augmented Coding) [SE 1.5]
- **Use Case:** Maps developer's immediate editing intent to predicted tokens
- **Tools:** Standard auto-complete in modern IDEs
- **Car Parallel (SAE Level 1):** Driver Assistance

### Level 2: Task-Agentic (AI-Augmented SE) [SE 2.0]
- **Use Case:** Maps planned code change to complete generated code block
- **Tools:** GitHub Copilot, Amazon CodeWhisperer
- **Car Parallel (SAE Level 2):** Partial Automation

### Level 3: Goal-Agentic (Agentic SE) [SE 3.0]
- **Use Case:** Maps technical goal to detailed plan of code changes
- **Tools:** Cognition's Devin, Anthropic's Claude Code, Google's Jules, OpenAI's Codex
- **Car Parallel (SAE Level 3):** Conditional Automation

### Level 4: Specialized Domain Autonomy [SE 4.0]
- **Use Case:** Maps broad technical mandate for specific domain to concrete goals
- **Specialization Axes:** Technical stack OR Quality attributes
- **Car Parallel (SAE Level 4):** High Driving Automation (geo-fenced)

### Level 5: General Domain Autonomy [SE 5.0]
- **Use Case:** Maps general technical mandate to domain-specific mandates across any domain
- **Status:** Conceptual/research stage (does not yet exist)
- **Car Parallel (SAE Level 5):** Full Driving Automation

---

## 3. The Emergence of Agentic Software Engineering

### 3.1 Industrial Relevance

SE has emerged as a primary proving ground for demonstrating ROI on large-scale generative AI models due to:

1. **High-Cost Workforce:** Software engineers command premium salaries
2. **Rich Training Data:** Code repositories, issue tickets, commit histories
3. **Measurable Outcomes:** Clear metrics (compiler errors, test outcomes, defect rates)
4. **Robust Safety Nets:** Automated testing and CI pipelines mitigate failure risk
5. **Transferable Benefits:** Foundation models honed on SE workflows generalize well

### 3.2 What is an Agent?

**Spectrum Definition:**
- **Agency:** Capacity to act and execute plans to achieve a given goal
- **Autonomy:** Capacity to self-govern and independently formulate goals

**Agent Types:**
- **Workflow Agents (High Agency):** Predefined orchestrations with hardcoded logic
- **Autonomous Agents (High Autonomy):** Systems that plan, reason, and formulate their own path

### 3.3 Survey of Agentic Solutions on Benchmarks

Recent examinations of SWE-Bench results reveal:

- **29.6%** of "plausible" fixes introduced behavioral regressions
- True solve rates for GPT-4 patches dropped from **12.47% to 3.97%** after manual audits
- AI agents frequently produced superficial patches limited to single files
- Many patches passing unit tests failed broader CI checks

**Key Insight:** Passing tests alone is no longer enough. Merge-ready status requires deeper understanding of context, intent, and broader system.

### 3.4 Survey of Agentic Solutions in the Wild (GitHub Data)

**Productivity Metrics:**
- Median time to complete a PR by GitHub Copilot: **13.2 minutes**
- **49.5%** of Claude Code's accepted PRs focus on new features
- **42.2%** of Copilot's target bug fixes
- Agent-authored code shows only **9.1%** increase in cyclomatic complexity (vs 23.3% human)

**Challenges:**
- Over **68%** of agent-generated PRs face long delays or remain unreviewed
- Critical need for scalable review automation

---

## 4. Motivational Example: Anatomy of an Agentic SE Workflow

### 4.1 The New Workflow

**Scenario:** Developer resolving seven distinct pull requests

1. Developer spends ~1.5 hours authoring detailed natural-language specifications
2. Specifications trigger autonomous agents working asynchronously
3. Agents generate **28 distinct PRs in parallel** (4 per ticket) - N-version programming
4. Developer evaluates solutions, selects promising ones or refines specifications
5. Acceptable solutions submitted for review and merged

### 4.2 Process and Artifact Gaps

#### 4.2.1 The Art of the Briefing

**Problem:** Raw tickets with ambiguity lead to failures

**Solution:** **Briefing Pack** - comprehensive work order including:
- **What & Success Criteria:** Verifiable checklist with testable properties
- **Architectural Context:** Where work fits in the system
- **Strategic Advice:** Implementation approaches, libraries, patterns
- **Potential 'Gotchas':** Known pitfalls, constraints, dependencies

Briefing Packs are living documents - versioned updates capture ongoing feedback.

#### 4.2.2 Multidimensional Nature of Agentic Feedback

- **Explicit & Durable Mentorship:** Direct, generalizable guidance captured in MentorScript
- **Inferred Mentorship:** Agent infers broader principles from specific corrections
- **Holistic Process Feedback:** Beyond code to entire SE lifecycle
- **Feedback on Multiple Solutions:** Synthesizing from N-versions

#### 4.2.3 From Ambiguous Control to Explicit Orchestration

**LoopScript:** Declarative language for defining agent workflow, allowing coaches to:
- Grant full autonomy for some tickets
- Enforce strict processes for others
- Record overrides for auditing

#### 4.2.4 From Code Review to Evidence-Based Oversight

**Merge-Readiness Pack (MRP)** must prove trustworthiness via five criteria:

1. **Functional Completeness:** End-to-end test results proving feature completeness
2. **Sound Verification:** Test plan and new test cases proving verification strategy
3. **Exemplary SE Hygiene:** Static analysis, linting, complexity reports
4. **Clear Rationale:** Human-readable summary of approach and trade-offs
5. **Full Auditability:** Frozen audit trail with versioned links

### 4.3 Tooling Gaps

#### 4.3.1 Agent Command Environment (ACE) for Humans

New command center capabilities needed:
- N-version programming visualization and mix-and-match
- Advanced program comprehension and visualization
- First-class authoring support for BriefingScript, MentorScript, LoopScript
- Strategic management of agent teams
- Seamless transition to traditional IDE for surgical changes
- Voice as primary interaction modality

#### 4.3.2 Agent Execution Environment (AEE) for Agents

Specialized environment for agent capabilities:
- Agent-native tools (hyper-debuggers, semantic search, structural editors)
- Robust monitoring infrastructure
- Self-monitoring for security vulnerabilities, cost management, environment repair
- Only significant problems surfaced to humans

---

## 5. The Engineering Activities of SASE

### 5.1 Briefing Engineering (BriefingEng)

**Purpose:** Move beyond vague tickets to comprehensive, actionable work orders

**Actor:** Human Agent Coach

**Workbenches:** Agent Command Environment (ACE)

**Artifacts:** BriefingScripts - structured, version-controlled documents

**BriefingScript Sections:**
- **Goal & Why:** High-level objective and business value
- **What & Success Criteria:** Scope with verifiable checklist, pre/post-conditions, invariants
- **Architectural Context:** Key modules, data models, APIs
- **Strategic Advice:** Libraries, patterns, implementation approaches
- **Potential Gotchas:** Known pitfalls, performance constraints, dependency issues
- **Test Strategy:** Types of tests expected, coverage requirements

**Emerging Industry Efforts:** Product Requirement Prompt (PRP), Amazon's Kiro

---

## Key Concepts Summary

### Core Artifacts

| Artifact | Purpose | Author |
|----------|---------|--------|
| **BriefingScript** | Mission plan/work order | Human Coach |
| **LoopScript** | Workflow playbook | Human Coach |
| **MentorScript** | Best-practices guide | Human Coach |
| **Consultation Request Pack (CRP)** | Request for human expertise | Agent |
| **Merge-Readiness Pack (MRP)** | Evidence-backed deliverable | Agent |
| **Version Controlled Resolutions (VCR)** | Formal responses to CRPs/MRPs | Human Coach |

### Two Workbenches

| Environment | For | Purpose |
|-------------|-----|---------|
| **ACE (Agent Command Environment)** | Humans | Command center for orchestration, mentorship, oversight |
| **AEE (Agent Execution Environment)** | Agents | Digital workbench optimized for agent capabilities |

### The Duality

- **SE for Humans (SE4H):** High-level intent, strategy, mentorship
- **SE for Agents (SE4A):** Structured, predictable execution environment

---

## Implications for SE Education

The paper discusses resulting impact on SE education, emphasizing that:
- The primary creative output evolves from implementation logic to articulation of unambiguous intent
- New skills needed: briefing engineering, agent coaching, evidence-based oversight
- Understanding of agent capabilities and limitations becomes essential

---

## Conclusion

The SASE framework is intentionally visionary, serving as a conceptual scaffold to catalyze urgent dialogue throughout the SE community. As autonomous agents become first-class actors in the SE lifecycle, we must re-evaluate foundational tenets beyond:
- Source code as the canonical artifact
- Human as the sole actor

The goal is to build new processes and tools essential for a collaborative, agentic future - pushing beyond classic, human-centric tenets toward a disciplined, scalable, and trustworthy agentic future.

---

**Note:** This document was truncated during import. The full paper contains additional sections on research roadmap, detailed engineering activities, and extended discussion of SE education implications.
