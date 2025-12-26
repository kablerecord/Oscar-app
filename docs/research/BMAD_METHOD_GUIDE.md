# A Look into the BMAD Method

**Or: Bringing the Agile Methodology to AI Development**

**Author:** Brian King
**Published:** July 30, 2025
**Reading Time:** ~15 minutes
**Attribution:** [BMAD GitHub Repository](https://github.com/bmadcode/BMAD-METHOD)

---

## TL;DR

This post provides an overview of how the BMAD Method works, identifies key markdown files and their purpose, explains how these files can be changed to meet specific requirements, details the impact of making specific changes, and walks through installing and systematically applying the BMAD Method to produce a comprehensive suite of documents—from high-level requirements to executable code and user-facing guides, all driven by intelligent AI agents.

---

## Introduction

Using AI for software development is a constantly evolving process. The BMAD method is yet another approach to keeping AI models focused on their programming tasks.

---

## The Big Picture

The **Breakthrough Method of Agile AI-Driven Development (BMAD Method)** is a powerful natural language framework designed to enhance software development and other domains through specialized AI agents.

---

## What is the BMAD Method?

The BMAD Method integrates AI with agile methodologies to streamline software development. It utilizes specialized AI agents to manage various roles in the development process, enhancing efficiency and organization.

### Two Core Innovations

The BMAD Method addresses common challenges in AI-assisted development, such as planning inconsistency and context loss:

#### 1. Agentic Planning

Dedicated AI agents (Analyst, Product Manager, Architect) collaborate to create highly detailed and consistent:
- Product Requirement Documents (PRDs)
- Architecture documents

This planning can optionally be performed using web-based agents for cost efficiency, leveraging powerful models and human-in-the-loop refinement.

#### 2. Context-Engineered Development

A Scrum Master (SM) agent transforms detailed plans into **hyper-detailed development stories**. These story files embed:
- Full context
- Implementation details
- Architectural guidance

The Development (Dev) agent then uses these self-contained story files to implement code, ensuring complete understanding of **what, how, and why** to build.

---

## The BMAD Workflow

### Phase 1: Planning Workflow (Web UI or Powerful IDE Agents)

| Step | Agent | Action |
|------|-------|--------|
| 1 | Analyst | Project idea, brainstorming, market research, competitor analysis → Project Brief |
| 2 | PM | Creates PRD from Project Brief (FRs, NFRs, Epics, Stories) |
| 3 | UX Expert (Optional) | Creates Front End Specification and UI prompts |
| 4 | Architect | Designs system architecture based on PRD and UX specs |
| 5 | PO | Runs Master Checklist to ensure document alignment |
| 6 | PO | Shards PRD and Architecture documents for IDE transition |

### Phase 2: Core Development Cycle (IDE)

| Step | Agent | Action |
|------|-------|--------|
| 1 | SM | Reviews previous notes, drafts next story from sharded documents |
| 2 | QA (Optional) | Reviews story draft against existing artifacts |
| 3 | User | Approves story (or requests SM revision) |
| 4 | Dev | Executes tasks, implements code and tests, runs validations |
| 5 | Dev | Marks story as "Ready for Review," adds notes |
| 6 | User | Verifies work, decides on QA review |
| 7 | QA | Performs senior developer review, refactors, adds tests |
| 8 | QA | Decides if more Dev work needed or story approved |
| 9 | — | **Commit all changes** |
| 10 | — | Mark story as "Done," repeat cycle |

---

## Key Components and Customization

### 1. Agent Definition Files (`bmad-core/agents/*.md`)

**Purpose:** Each Markdown file defines a specific AI agent's persona, role, style, identity, focus, and core principles.

**How to Customize:**
- **Refine Persona:** Modify role, style, identity, focus sections
- **Adjust Core Principles:** Add/remove/modify bullet points
- **Update Commands & Dependencies:** Map to relevant tasks/templates
- **Apply Customization Overrides:** Use `agent.customization` field for explicit overrides

**Impact:** Directly alters agent behavior, capabilities, and output.

---

### 2. Checklists (`bmad-core/checklists/*.md`)

**Purpose:** Structured lists of criteria or step-by-step procedures ensuring quality, completeness, or standards adherence.

**How to Customize:**
- Add/remove/modify list items
- Update `[[LLM: ...]]` instruction blocks

**Impact:** Directly impacts quality and completeness of deliverables.

---

### 3. Technical Preferences (`bmad-core/data/technical-preferences.md`)

**Purpose:** Inject preferred technologies, design patterns, or technical biases into planning agents.

**How to Customize:** Add markdown describing preferences (frameworks, languages, database types, architectural styles).

**Impact:** Planning agents will consider these when generating PRDs and architecture documents.

---

### 4. Core Configuration (`bmad-core/core-config.yaml`)

**Purpose:** Critical configurations including the `devLoadAlwaysFiles` list.

**How to Customize:** Modify `devLoadAlwaysFiles` to specify which documents the Dev agent should always load.

**Impact:** Crucial for managing Dev agent context—lean, focused documents lead to efficient, compliant code generation.

---

### 5. Tasks (`bmad-core/tasks/*.md`)

**Purpose:** Step-by-step procedures that agents follow to complete specific work—the "how-to" guides.

**How to Customize:** Modify instructions within task files.

**Impact:** Directly affects execution flow and output of specific agent commands.

---

### 6. Templates (`bmad-core/templates/*.yaml`)

**Purpose:** Define structured output format for documents (PRD, Architecture, Story).

**How to Customize:** Modify YAML structure for new sections, titles, or instruction fields.

**Impact:** Determines structure and content of agent-produced documents.

---

## Best Practices

1. **Keep Dev Agents Lean:** Minimal context for development agents—only load essential files
2. **Leverage Natural Language:** Clear, concise, unambiguous instructions
3. **Use Expansion Packs:** For domain-specific needs (game dev, DevOps) without bloating core agents
4. **Iterative Refinement:** Continuously refine based on output quality
5. **Commit Regularly:** Especially during development cycle
6. **Understand the Workflows:** Familiarize with both Planning and Development workflows

---

## Installation and Configuration

### Prerequisites

- Python 3.9+
- pip
- Git
- An IDE (e.g., VS Code)
- Access to an LLM API (OpenAI, Anthropic, Google Gemini)

### Setup Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/bmadcode/BMAD-METHOD.git
cd BMAD-METHOD
```

#### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 4. Configure LLM API Key

```bash
export OPENAI_API_KEY="your_openai_api_key_here"
```

#### 5. Review Core Configuration

Familiarize with `bmad-core/core-config.yaml`, especially `devLoadAlwaysFiles`.

---

## Step-by-Step Document Generation

### Phase 1: Planning Documents

#### 1. Initiate Project Research (Analyst)

```bash
python bmad.py analyst --task "research_project_idea" --output "ProjectBrief.md"
```

#### 2. Generate PRD (Product Manager)

```bash
python bmad.py pm --task "create_prd" --input "ProjectBrief.md" --output "PRD.md"
```

#### 3. Design Architecture (Architect)

```bash
python bmad.py architect --task "design_architecture" --input "PRD.md" --output "Architecture.md"
```

#### 4. Align Documents (Product Owner)

```bash
python bmad.py po --task "align_documents" --input "PRD.md,Architecture.md"
```

### Phase 2: Development Documents

#### 1. Shard Planning Documents (Product Owner)

```bash
python bmad.py po --task "shard_documents" --input "PRD.md,Architecture.md" --output-dir "sharded_docs/"
```

#### 2. Draft Development Stories (Scrum Master)

```bash
python bmad.py sm --task "draft_story" --input "sharded_docs/epic_1_part_1.md" --output "Story_FeatureX_01.md"
```

#### 3. Generate Code and Tests (Development)

```bash
python bmad.py dev --task "implement_story" --input "Story_FeatureX_01.md" --output-dir "src/feature_x/"
```

#### 4. Quality Assurance (QA)

```bash
python bmad.py qa --task "review_code" --input "src/feature_x/" --story "Story_FeatureX_01.md"
```

---

## Agent Reference

| Agent | Purpose |
|-------|---------|
| **Analyst** | Initial project research, brainstorming, market/competitor analysis → Project Brief |
| **Product Manager (PM)** | Creates PRD with FRs, NFRs, Epics, Stories |
| **Architect** | Designs system architecture, technical stack, data flow |
| **UX Expert** (Optional) | Creates Front End Specification and UI prompts |
| **Product Owner (PO)** | Ensures document alignment, shards documents for development |
| **Scrum Master (SM)** | Drafts development stories from sharded documents |
| **Development (Dev)** | Implements code and tests from story files |
| **QA** | Reviews code, refactors, adds tests, approves stories |

---

## Conclusion

The BMAD Method offers a transformative approach to software development by integrating AI with Agile methodologies. By understanding and customizing its key components—agent definitions, checklists, and templates—you can streamline processes and achieve higher quality outcomes.

The method's flexibility and emphasis on natural language make it accessible and adaptable to various project needs, ensuring that AI-assisted development is both efficient and effective.

**Key takeaways:**
- Two-phase approach (Planning → Development) ensures clear, consistent vision
- Self-contained story files minimize misinterpretations
- Natural language components (Markdown/YAML) enable easy customization
- Continuous iteration and refinement maximize benefits

*Until next time: Be safe, be kind, be awesome.*

---

## Tags

`#BMAD` `#AI-Development` `#Agile` `#LLM` `#Software-Engineering` `#Automation`
