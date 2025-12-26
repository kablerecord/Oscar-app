# BMAD Method + MCP Server: Building N8N Workflows with Context Engineering

**Format:** Video Transcript
**Topic:** Using BMAD Method with Claude Code and MCP Server to build N8N workflows

---

## Overview

This video demonstrates what the creator calls "the most powerful coding workflow" - combining the BMAD method for context generation with an MCP server connected to N8N documentation, then using Claude Code to one-shot build an entire workflow.

**Target Workflow:** A sales pipeline that:
- Collects leads
- Enriches lead data
- Automates email sending
- Updates CRM system

---

## The Core Problem: Lack of Context

### The "7-Year-Old at the Store" Analogy

> "Imagine you're telling your 7-year-old child to go to the store and buy every ingredient necessary for dinner. He's going to come back with gummy bears, nachos, and all that kind of stuff. The problem is not malicious intent or incompetency - it's just a lack of context."

**What's Missing:** The information that you're cooking a lasagna.

### How This Applies to AI Coding

When you give an AI a small task and get poor results:
- The model doesn't know what it doesn't know
- It hallucinations to fill gaps
- It makes assumptions without guidance

**Solution:** Give the model more context.

---

## The Context Engineering Approach

### Traditional Prompt

```
"Build XYZ feature"
```

**Problems:**
- Model hallucinates missing details
- Makes incorrect assumptions
- Results in errors

### Context-Engineered Prompt

Instead of a simple request, generate multiple documents:
- What the tool is supposed to do
- What it's NOT supposed to do
- Detailed requirements
- Architectural overviews
- Product requirement documents
- Project briefs

Then instruct the model:

> "Look at these requirements and do exactly that."

This minimizes potential errors significantly.

---

## The BMAD Method

**BMAD** = AI development workflow and tool that utilizes agents to generate context documents.

### Documents Generated

| Document Type | Purpose |
|--------------|---------|
| Requirement Files | What the system must do |
| Architectural Overviews | System structure and design |
| Product Requirement Documents (PRD) | Detailed product specifications |
| Project Briefs | High-level project context |

### Workflow Used

1. Create a custom **Gemini Gem** with the entire compiled BMAD method
2. Include all agents in the gem
3. Use this custom model for interactive document generation
4. Answer all questions about what the tool should/shouldn't do
5. Review each document thoroughly

---

## Critical Success Factor: Deep Review

> "The most important thing here is to really go step by step and review everything the model is doing. Because if there are slight mistakes or slight changes to what you are imagining and what the model is basically saying in this document, then the results are going to be way worse."

**Key Actions:**
- Review deeply anything being said
- Clarify everything you expect as a requirement
- Don't rush through document generation
- Spend time on accuracy (the creator spent ~2 hours)

---

## The Technical Setup

### Components

1. **BMAD-Generated Documents** - All context files from 2 hours of requirements gathering
2. **MCP Server** - Connected to N8N documentation in Claude Code
3. **Claude Code** - The AI coding agent

### Why This Works

| Component | Contribution |
|-----------|--------------|
| MCP Server | Claude has access to N8N documentation |
| BMAD Documents | Claude knows exactly what to build and what NOT to build |
| Combined | No need for elaborate prompt engineering |

### The Final Prompt

Instead of complex prompt engineering:

> "Hey, do what's in these documents. Read these documents and then do what they tell you to do."

---

## Results

> "This is the workflow we got as a result. From a first glance it looks absolutely amazing and very spectacular. I'm really flashed by the results we achieved."

**Success Factors:**
- Pure context engineering (not prompt engineering)
- MCP server providing N8N documentation
- Granular explanation of needs and expectations
- Clear definition of what's NOT needed

---

## Key Takeaways

| Principle | Application |
|-----------|-------------|
| **Context > Prompting** | Detailed context documents beat clever prompts |
| **Define Negatives** | Specify what you DON'T want, not just what you want |
| **Review Thoroughly** | Spend time validating generated documents |
| **Use Documentation** | MCP servers give models access to official docs |
| **Combine Methods** | BMAD + MCP + Claude Code = powerful workflow |

---

## The 10x Developer Formula

1. **Generate context** using BMAD method (~2 hours investment)
2. **Set up MCP server** for relevant documentation
3. **Simple instruction** to Claude Code referencing the documents
4. **One-shot generation** of complex workflows

This approach transforms complex, tedious setup tasks (like a full sales pipeline) into achievable one-shot generations.
