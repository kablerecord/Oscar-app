# An Exploratory Study of Code Retrieval Techniques in Coding Agents

**Author:** Priyanshu Jain (73ai, India)
**Posted Date:** October 14, 2025
**DOI:** 10.20944/preprints202510.0924.v1
**License:** Creative Commons CC BY 4.0

**Keywords:** code retrieval, coding agents, agentic retrieval, semantic code search, code search benchmarking, context management

---

## Abstract

Code retrieval is central to coding agents. It is the process of sourcing relevant code snippets, documentation, or knowledge from repositories into the context for the agent to make informed actions. Thus, efficient code retrieval could have a major positive impact on the performance of coding agents and the quality of their output.

This study delves into different code retrieval techniques, their integration in agentic workflows, and how they enhance coding agent output quality. We compare how human programmers and agents interact with tools, analyze lexical versus semantic search for code retrieval, evaluate retrieval's impact, and review benchmarks focusing on metrics such as latency, tokens, context utilization, and iteration loops.

We report takeaways on the effectiveness of different retrieval tools, potential solutions, and opportunities for further research.

---

## 1. Introduction

LLM-based coding agents represent a paradigm shift in software engineering, moving beyond simple code completion to autonomously planning, implementing, and refining solutions. These agents operate through an **iterative agentic loop**:

1. **Observe** the current state of the development environment and task context
2. **Reason** about appropriate actions using the foundation model
3. **Execute** actions through tool calls (reading/writing files, running tests, searching code)
4. **Receive feedback** from the environment
5. **Repeat** until the task is complete

### The Critical Bottleneck

The critical bottleneck in this loop is the **initial observation phase**: gathering relevant code context from the target repository. Modern codebases frequently exceed thousands of files and millions of lines of code, far beyond the effective context window of even the most advanced language models.

### Code Retrieval Techniques Evolution

| Technique | Description |
|-----------|-------------|
| **Lexical Search** | Pattern-matching tools like grep and ripgrep for exact or regex-based matching |
| **Semantic Search** | RAG pipelines with vector embeddings for conceptual similarity |
| **LSP Integration** | Structured symbol navigation (go-to-definition, find-references) |
| **Agentic Search** | Models dynamically compose retrieval queries at inference time |
| **Multi-Agent** | Specialized sub-agents handle context gathering independently |

### LLM Limitations Requiring Retrieval

1. **Project-Specific Context:** Models lack awareness of unique architecture, design patterns, conventions
2. **Knowledge Cutoff Date:** Unaware of developments after training data collection
3. **Ability to Test and Debug:** Lack context on how to test within existing codebases
4. **Context Limitation:** Models with 1M context window only utilize ~100k for quality reasoning

---

## 2. Background and Related Work

### 2.1 Brief History of Development Environments

**Early era:** Command line and text editors (vi, Emacs)

**IDE Revolution:** Combined editing, building, and debugging into single applications

**LSP (2016):** Microsoft's Language Server Protocol decoupled language-specific intelligence from editors, enabling any language to gain deep IDE support in any LSP-compatible editor.

### 2.2 Lexical Search

**grep (1973):** Created by Ken Thompson at Bell Labs. Revolutionary tool for automated, powerful, fast searching across directories using regular expressions.

**ripgrep (rg):** Modern line-oriented search tool built in Rust:
- Significantly faster than grep
- Built on Rust's highly optimized regex engine (finite automata, SIMD)
- Parallel search capability
- Respects .gitignore, skips hidden files and binaries
- Used internally by VS Code for file search

### 2.3 Semantic Search

Semantic code search retrieves relevant code given a natural language query by understanding intent and contextual meaning rather than matching keywords.

**The Challenge:** Standard IR methods don't work well for code because there's often little shared vocabulary between search terms and results. Example: `deserialize_JSON_obj_from_stream` may be correct for query "read JSON data" despite no overlapping keywords.

#### 2.3.1 RAG for Code

**Pipeline:**
1. **Ingestion and Chunking:** Parse and divide code into meaningful units using syntax-aware chunkers (tree-sitter)
2. **Embedding and Indexing:** Convert chunks to vectors, store in vector database
3. **Retrieval:** Query vector database for similar chunks to user query
4. **Augmentation and Generation:** Combine retrieved chunks with query for LLM

**RAG Critique for Coding Agents:**
- Nick Pash (Head of AI at Cline) argues RAG can be a "seductive trap" for coding tasks
- Code is inherently logical and structured; doesn't always benefit from decontextualized chunks
- Differs from how senior engineers explore codebases (folder structures, import statements, whole files)
- Security risk of indexing entire codebase
- Some prominent teams abandoned RAG in favor of direct, exploratory methods

#### 2.3.2 Code Knowledge Graphs (CKG)

Represent codebases as networks of interconnected entities:
- **Nodes:** Classes, functions, variables, files
- **Edges:** Function calls, inheritance hierarchies, data dependencies

**Advantages:**
- Narrow search space through explicit relationship paths
- Expose traceable multi-hop connections
- Return compact structured context

**Challenges:**
- Substantial engineering investment
- Multi-language parsers
- Schema design
- Incremental updates
- Graph database optimization

### 2.4 Language Server Protocol (LSP)

Exposes symbol resolution (go-to-definition, find-references), type information, AST fragments, and diagnostics.

**Strengths:**
- Maintains comprehensive symbol tables and ASTs
- Enables precise code navigation understanding language semantics
- Handles complex scenarios (overloaded methods, inheritance, scopes)
- MarsCode Agent achieved 88.3% file localization accuracy across 12 languages

**Limitations:**
- Requires initial setup per project
- Optimized for human-interactive workflows, may not align with agentic patterns

### 2.5 Agentic Search

LLM-driven agent is given repository and system-level primitives (list/find files, read files, pattern search, bash commands, web lookups). The LLM decides at runtime which sequence of actions to take.

**Key Characteristics:**
- Retrieval strategy is not hand-coded
- Model synthesizes queries, selects files, composes patterns
- Core idea behind ReAct-style and tool-using agent paradigms

**Industry Validation:**
Claude Code developers made deliberate architectural choice to avoid RAG in favor of agentic search. Early experiments with off-the-shelf RAG (Voyage embeddings) were abandoned when agentic search consistently outperformed across benchmarks.

### 2.6 Multi-Agent Architectures

**Integrated vs Decomposed:**
- **Integrated:** Single agent uses retrieval tools as part of general-purpose toolkit
- **Multi-Agent:** Specialized retrieval agents invoked by coordinator

**Trade-offs:**
- Decomposition enables focused optimization but introduces coordination overhead
- Well-prompted single agents can match or exceed multi-agent performance
- Critical challenge: context fragmentation when agents operate in parallel without shared context

---

## 3. Study Design

### 3.1 Research Questions

| RQ | Question |
|----|----------|
| **RQ1** | Does semantic search provide advantages over lexical search for coding agents? |
| **RQ2** | Do agents benefit from the same retrieval tools that human programmers use? |
| **RQ3** | Does specialized retrieval delegation to sub-agents improve coding agent performance? |

### 3.2 Methodology

**Repository:** InfraGPT (open-source DevOps debugging agent)
- 50,000+ lines of code across 338 files
- Monorepo with 5 major components
- Languages: Go (12,334), TypeScript JSX (8,070), Python (5,762), TypeScript (2,700)

**Task:** Find GitHub connector interface implementations
- Multi-file code search required
- Understanding of architectural patterns
- Contextual reasoning

### 3.3 Agents Analyzed

| Agent | Architecture | Retrieval Approach |
|-------|-------------|-------------------|
| **Claude Code** | Agentic search | Custom lexical tools, whole-file reading |
| **Codex CLI** | Shell orchestration | Fuzzy file search, iterative refinement |
| **Gemini CLI** | Tool orchestration | Batch optimization, caching, sub-agent |
| **Cursor** | IDE-integrated | Hybrid semantic-lexical indexing |
| **Amp** | Multi-agent | Specialized search sub-agents |

### 3.4 Data Collection

**Models used:** Sonnet 4.5, GPT-5, Gemini 2.5 Pro

**Metrics collected:**
- Context window utilization (primary metric)
- Cost per run
- Tool call counts (categorized)
- Task completion status
- Execution traces

---

## 4. Analysis

### 4.1 Claude Code

**Strategy:** Multi-stage refinement
1. **Broad discovery:** General keyword searches
2. **Progressive refinement:** More specific patterns
3. **Targeted examination:** Selective file reading

**Architecture:**
- Tool-first approach with transparent lexical search
- Pattern matching (grep search) + file discovery (glob search)
- **Whole-file reading:** Retrieves entire file contents (higher tokens, complete context)
- Tool inventory consumes ~25.5k tokens (12.7% of context) before retrieval begins

**LSP Experiment:** LSP operations frequently failed due to coordinate precision requirements. Agent fell back to lexical search.

### 4.2 Codex CLI

**Strategy:** Iterative refinement with broad keyword discovery
- Leverages negative evidence (zero-result searches inform understanding)
- Progressive pattern specificity for spatial reasoning
- Fuzzy file search with scoring for prefix matches, contiguous sequences

### 4.3 Gemini CLI

**Strategy:** Batch-optimized orchestration
- Parallel batch file reading
- Multi-level caching
- **Codebase Investigator Agent:** Sub-agent with autonomous exploration

**Notable:** Reads multiple files per operation, strategic glob patterns, cross-referencing

### 4.4 Cursor

**Strategy:** Hybrid semantic-lexical
- **Codebase tool:** Semantic searches against pre-indexed embeddings
- **Grep tool:** Exact keyword matching
- Background indexing (1-15 minutes depending on project size)

**Transparency:** High-level tool usage visible, but specific embedding matches, similarity scores, patterns not exposed

### 4.5 Amp

**Strategy:** Two-layer delegation model
- Main agent identifies needs, invokes search sub-agents
- Sub-agents have isolated contexts and tool access
- Structured result marshaling for information transfer

---

## 5. Results

### 5.1 Token Consumption Comparison

| Agent | Input Tokens | Output Tokens | Total Tokens |
|-------|-------------|---------------|--------------|
| **Amp** | 147,028 | 9,929 | 156,957 |
| **Cursor** | 168,917 | 2,756 | 171,673 |
| **Claude Code** | 188,636 | 12,890 | 201,526 |
| **Claude Code + LSP** | 247,019 | 34,920 | 281,939 |
| **Gemini CLI** | 344,313 | 14,308 | 358,621 |
| **Codex CLI** | 1,030,929 | 15,574 | 1,046,503 |

### 5.2 Cost Analysis

| Agent | Input Cost | Output Cost | Total Cost |
|-------|-----------|-------------|------------|
| **Cursor** | $0.507 | $0.028 | **$0.535** |
| **Claude Code** | $0.566 | $0.129 | **$0.695** |
| **Amp** | $0.441 | $0.100 | **$0.541** |
| **Gemini CLI** | $0.430 | $0.179 | **$0.609** |
| **Codex CLI** | $1.237 | $0.156 | **$1.393** |

### 5.3 Tool Usage Patterns

| Agent | File Reads | Searches | Other Tools |
|-------|-----------|----------|-------------|
| **Claude Code** | 7 | 11 grep, 1 glob | 1 task (sub-agent) |
| **Claude Code + LSP** | 17 | 8 grep, 3 glob | 6 LSP ops, 1 bash |
| **Codex CLI** | 12 | 29 shell | - |
| **Gemini CLI** | 6 (batch) | 10 grep, 4 glob | 3 sub-agent |
| **Cursor** | 5 | 5 codebase, 3 grep | 1 list dir |
| **Amp** | 7 | 5 grep, 2 glob | 2 sub-agent |

---

## 6. Discussion

### RQ1: Semantic vs Lexical Search

**Finding:** Hybrid approaches (Cursor) achieved lowest total token consumption (171,673 tokens) through efficient context selection.

**Key Insight:** Semantic search overhead may be justified when it enables more precise initial retrieval, reducing iterative refinement cycles.

**Trade-off:**
- RAG pre-indexing creates fixed cost but enables conceptual queries
- Lexical search has no preprocessing but requires pattern expertise
- Hybrid approaches combine benefits but add implementation complexity

### RQ2: Human Tools for Agents

**Finding:** LSP integration (designed for humans) increased token consumption by 40% without task completion improvement.

**Key Insight:** Tools designed for interactive human workflows don't transfer directly to autonomous agent operation. LSP provides precision but requires:
- Exact coordinate positioning
- Interactive refinement
- Tolerance for partial failures

**Recommendation:** Agents need tools designed for their operational characteristics rather than adapted human tools.

### RQ3: Multi-Agent vs Single-Agent

**Finding:** Amp (multi-agent) achieved lowest token consumption (156,957 tokens) through efficient sub-agent delegation.

**Key Insight:** Architectural overhead of multi-agent coordination may be offset by:
- Context isolation preventing pollution
- Focused search within constrained windows
- Structured result synthesis

**Caveat:** Benefits depend on task complexity and search breadth requirements.

---

## 7. Recommendations

### 7.1 For Agent Developers

1. **Iterative refinement patterns** should be core architectural primitives
2. **Whole-file vs. snippet retrieval** requires careful consideration
3. **Tool inventory optimization** is essential (Claude Code's 25.5k token baseline)
4. **Batch operations** provide efficiency gains (Gemini CLI pattern)

### 7.2 For Researchers

1. **Standardized retrieval benchmarks** are urgently needed
2. **Isolated variable testing** required for causal claims
3. **Context efficiency metrics** should complement accuracy measures
4. **Agent-native tools** deserve dedicated research attention

### 7.3 For Practitioners

1. **Match retrieval strategy to task characteristics**
2. **Monitor token consumption** as primary efficiency metric
3. **Consider hybrid approaches** for complex codebases
4. **Evaluate preprocessing costs** against runtime benefits

---

## 8. Future Work

### Proposed Benchmark Framework

**Dimensions:**
- Task diversity (bug fixing, feature addition, refactoring, documentation)
- Repository characteristics (language, size, architecture)
- Retrieval technique isolation
- Model capability normalization

**Metrics:**
- Retrieval precision/recall
- Context efficiency (relevant tokens / total tokens)
- Task completion rate
- Time to first relevant context
- Iteration count to completion

### Research Directions

1. **Agent-native retrieval tools** designed for autonomous operation
2. **Adaptive retrieval strategies** that adjust based on task and codebase characteristics
3. **Retrieval-generation co-optimization** treating retrieval and generation as coupled system
4. **Cross-repository transfer** of retrieval strategies

---

## 9. Key Takeaways

### Technique Comparison

| Technique | Strengths | Weaknesses | Best For |
|-----------|-----------|------------|----------|
| **Lexical (grep/rg)** | No preprocessing, transparent | Requires pattern expertise | Known patterns, quick searches |
| **Semantic (RAG)** | Conceptual queries, natural language | Indexing overhead, opacity | Unfamiliar codebases, conceptual searches |
| **LSP** | Precise symbol navigation | Setup overhead, human-oriented | Type-aware navigation |
| **Agentic** | Flexible, adaptive | Model-dependent quality | Complex, multi-step retrieval |
| **Multi-Agent** | Context isolation, focused search | Coordination overhead | Large-scale, parallel retrieval |

### Critical Findings

1. **Context quality > Context quantity:** 100k effective window regardless of 1M advertised
2. **Hybrid approaches win:** Best performing agents combine techniques
3. **Human tools ≠ Agent tools:** LSP designed for interactive use didn't help agents
4. **Retrieval is the bottleneck:** Not model capability, but context gathering

---

## Appendix Summary

The full paper includes detailed execution traces for:
- **Appendix A:** Claude Code execution traces
- **Appendix B:** Codex CLI execution traces
- **Appendix C:** Gemini CLI execution traces
- **Appendix D:** Cursor execution traces
- **Appendix E:** Amp execution traces

---

**Note:** Document was truncated during import. Full paper contains additional appendices with complete execution traces.
