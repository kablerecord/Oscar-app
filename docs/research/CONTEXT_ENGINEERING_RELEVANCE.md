# The Impact of Relevance in Context Engineering for AI Agents

**Source:** Elastic Blog
**Author:** Joseph McElroy
**Date:** November 5, 2025
**Topic:** Hybrid retrieval, semantic chunking, and agentic search for LLM performance

---

## Overview

The transition from **prompt engineering** to **context engineering** represents a crucial maturation in how we build AI systems. Context engineering is the discipline of managing an AI agent's limited attention to prevent performance decline known as **context rot**.

> "An LLM's context is like a human's short-term memory. Trying to stuff it with every potentially relevant piece of information leads to context rot—where the model's 'attention budget' gets exhausted, causing it to lose focus and derail its own reasoning."

**Key Finding:** NOLIMA benchmark noted that performance "degrades significantly as context length increases"—at 32K tokens, "11 models drop below 50% of their strong short-length baselines."

---

## Beyond RAG: Just-in-Time Context

### Traditional Approach (RAG)
- Retrieval before inference
- All potentially relevant data processed upfront
- Fed into system prompt for reasoning

### Modern Approach (Just-in-Time)
- Agents use tools for iterative retrieval
- Probes sources dynamically
- Reformulates queries as it learns
- Discovers and steers toward relevant context autonomously

**Shift in Focus:** From exhaustive data pre-processing → equipping agents with the right tools

---

## Hybrid Search Strategy

Combining lexical precision with semantic recall maximizes signal-to-noise ratio.

| Search Type | Strength | Use Case |
|-------------|----------|----------|
| **Lexical (Sparse)** | Precision for specific identifiers | Exact terms, IDs, codes |
| **Vector (Dense)** | Semantic recall | Conceptual similarity |
| **Hybrid** | Best balance | Production systems |

### Benchmark Results

| Strategy | Recall@10 | MRR | Notes |
|----------|-----------|-----|-------|
| **Hybrid (ELSER + Vector)** | 84.3% | 0.53 | Most relevant doc in top 2 positions |

> "Hybrid approach acts as the first line of defense against context rot, ensuring only the most potent information enters the agent's limited working memory."

---

## Semantic Chunking

LLMs perform better with **coherent context**. Breaking content into conceptually-grouped chunks improves reasoning reliability.

### Strategy
1. Group related concepts together
2. Retrieve target chunk plus immediate surroundings
3. Link chunks with lightweight identifiers to source

### Domain Applications

| Agent Type | Chunking Strategy | Context Expansion |
|------------|-------------------|-------------------|
| **Knowledge Agent (Legal)** | By paragraphs/sections | Preceding + succeeding paragraphs for full legal argument |
| **Coding Agent** | By functions/classes/logical blocks | Entire class + imports + docstrings |

### Benchmark: Semantic Highlighting

| Configuration | Hit Rate | Context Reduction |
|---------------|----------|-------------------|
| 5 fragments from top 5 docs (K=5) | 93.3% | >40% reduction |

**Sweet Spot:** Retrieving semantic fragments rather than entire documents significantly cuts processing load while maintaining accuracy.

---

## Agentic Search

For complex questions requiring extensive exploration, simple relevance search is insufficient.

### The Problem
- Traditional retrieval tools lack intelligence for dynamic source selection
- Complex queries require discovery, filtering, and iterative exploration
- Rigid query templates can't adapt

### Sub-Agent Architecture

| Component | Role |
|-----------|------|
| **Main Agent** | High-level planning, clean working memory |
| **Search Sub-Agent** | Intensive exploration, query rewriting, noise filtering |

**Key Capability:** Sub-agent rewrites natural language requests into precise structured queries (e.g., ES|QL for Elasticsearch).

### Domain Applications

| Agent Type | Sub-Agent Task | Output to Main Agent |
|------------|----------------|---------------------|
| **Coding Agent** | Grep folders, search embeddings, trace dependencies | Concise file paths and code snippets |
| **Knowledge Agent** | Explore document store, discard irrelevant docs | Curated summary of highlights |

### Benchmark: Agentic vs Brute-Force

**Task:** "How many support tickets were created in the last 365 days and how many are still open?"
**Dataset:** 360 records, 12 fields

| Method | Success Rate |
|--------|--------------|
| **Brute-Force** (entire CSV in context) | Catastrophic failure in most cases |
| **Agentic** (ES|QL tool) | 100% |

---

## Domain-Specific Tools & Workflows

For predictable, repeatable tasks (especially in regulated domains), deterministic workflows outperform exploratory agents.

### Benefits of Workflow Tools

| Benefit | Description |
|---------|-------------|
| **Reliability** | Eliminates unpredictable agentic behavior |
| **Efficiency** | Reduced token consumption and latency |
| **Consistency** | Same criteria applied every time (essential for compliance) |

### Example: Customer Support Tool

```
Get Similar Resolved Tickets:
1. Filter for high-quality data ('resolved' status)
2. Relevance search for best solutions
3. Curate exact fields returned to model
```

### Example: KYC Workflow (Finance)

```
Know Your Customer Process:
1. Verify Identity → Check against internal bank records
2. External Screening → Query sanctions lists and adverse media APIs
3. Generate Report → Compile findings into standardized risk assessment
```

> "By enforcing a deterministic execution path, workflow-based methodology enhances operational reliability and eliminates unnecessary reasoning cycles."

---

## Context Compaction and Long-Term Memory

### Strategy
1. Condense conversation history (including tool executions) into concise summary
2. Store externally as persistent memory
3. Agent accesses later in same conversation or across sessions

### The Compression Trade-Off

| Challenge | Risk |
|-----------|------|
| Agent must decide next action based on all prior states | Minor observations might become critical later |
| Irreversible compression | May discard subtle but crucial details |

### Anthropic's Advice

> "Start by maximizing recall to ensure your compaction prompt captures every relevant piece of information from the trace, then iterate to improve precision by eliminating superfluous content."

**Solution:** Semantic search enables efficient querying of external memory to retrieve most relevant context.

---

## Dynamic Tool Discovery

As available tools explode in number, two problems emerge:

| Problem | Description |
|---------|-------------|
| **Prompt Bloat** | Describing every tool consumes enormous tokens |
| **Decision Overhead** | LLM confused by volume of choices, especially similar tools |

### Solution: Semantic Tool Retrieval

1. Understand meaning of user's query
2. Semantic search across tool index
3. Retrieve only relevant options
4. Present LLM with small, curated toolkit

**Research:** RAG-MCP paper explores mitigating prompt bloat via retrieval-augmented generation for tool selection.

---

## Key Takeaways

| Principle | Implementation |
|-----------|----------------|
| **Hybrid retrieval** | Combine lexical precision with semantic recall |
| **Semantic chunking** | Group related concepts, retrieve with surrounding context |
| **Agentic search** | Use sub-agents for exploration, keep main agent's memory clean |
| **Deterministic workflows** | For predictable tasks, pre-defined chains beat exploration |
| **Context compaction** | Maximize recall first, then refine for precision |
| **Dynamic tool discovery** | Semantic search to pre-filter tool choices |

---

## Conclusion

> "The ability to manage context will determine whether AI agents remain experimental tools or evolve into dependable systems that can tackle sophisticated, production-level tasks."

Context engineering marks the evolution from crafting perfect prompts to building and managing the environment for agents. The challenge is no longer just *what* we ask, but *how* we help the agent discover its own answers efficiently and reliably within its finite context.
