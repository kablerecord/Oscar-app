# Model Context Protocol: A Universal Connection Standard for AI

**Format:** Presentation Slides
**Presenter:** Yusuf Ozuysal
**Topic:** MCP overview, architecture, and ecosystem

---

## Why MCP?

### Tool Calling Expands Application Surface

> "Best AI applications utilize tools as experts: o3 with search, Claude Code with planning, bash, file access, ChatGPT Agent with browser-use..."

### Key Insight

| Domain | Built By |
|--------|----------|
| **AI models, harnesses** | Frontier labs |
| **Tools** | Vertical-specific enterprises |

**Question:** Could MCP become the foundation for a new App Store?

---

## What is MCP?

| Aspect | Description |
|--------|-------------|
| **Universal Standard** | "USB-C for AI applications" — a common interface enabling seamless connections |
| **Open Protocol** | Connects LLMs to tools, data sources, and workflows via stateful, bidirectional communication |
| **Client-Server Architecture** | Hosts (AI apps) use MCP Clients to connect to MCP servers (context providers) via JSON-RPC 2.0 |

**Latest spec:** 2025-06-18 includes OAuth 2.1, elicitation capabilities, and enhanced security features

---

## Core Primitives

### Server-Side Capabilities

| Primitive | Description |
|-----------|-------------|
| **Tools** | Executable functions like web search and database queries |
| **Resources** | Structured data sources including files, logs, and documents |
| **Prompts** | Reusable interaction templates for consistent workflows |

### Client-Side Capabilities

| Primitive | Description |
|-----------|-------------|
| **Sampling** | Servers request LLM completions from clients |
| **Elicitation** | Request structured user input with validation schemas |
| **Notifications** | Real-time updates for resource changes and progress |

---

## The Killer MCP Use Case: Closing The Agentic Loop

MCP enables the transition from static reasoning to active execution, creating complete agentic workflows.

---

## Resources & Notifications

### Semantic Information Sources

| Feature | Description |
|---------|-------------|
| **Resources** | Files, database records, live logs, screenshots, and other contextual data |
| **URI-Based Identification** | Unique identifiers like `file:///path/to/doc` or `db://table/record` |
| **Dynamic Templates** | Resource templates with parameters enable flexible access patterns |

---

## Elicitation

Servers request structured user input with JSON schema validation.

**Three possible outcomes:**
1. Accept
2. Decline
3. Cancel

**Use cases:** GitHub usernames, configuration preferences, sensitive parameters

---

## Transport Mechanisms

### STDIO (Standard Input/Output)

| Aspect | Details |
|--------|---------|
| **Use case** | Local integrations, server runs as subprocess |
| **Messages** | Over stdin/stdout, newline-delimited |
| **Examples** | Claude Desktop, VS Code local servers |
| **Security** | Inherently local and secure |

### Streamable HTTP (Remote Connections)

| Aspect | Details |
|--------|---------|
| **Replaces** | HTTP+SSE approach |
| **Method** | POST for requests, GET with SSE for streaming |
| **Process** | Independent server process for remote access |
| **Requirement** | Authentication layer (OAuth 2.1 is the spec) |

**Note:** Currently in transition period — support both transport methods for compatibility.

---

## Applications with MCP Support

| Application | Status |
|-------------|--------|
| **Claude Desktop** | First local MCP server support with native integration |
| **Claude Code** | Add MCP servers or use Claude Code itself as a server |
| **ChatGPT Developer Mode** | Remote MCP servers laying groundwork for apps |
| **Claude.ai Connectors** | Remote MCP servers |
| **VS Code** | June 2025: Full spec support including auth, prompts, resources, and sampling |
| **Cursor** | MCP integration for enhanced development workflows |

---

## APIs with MCP Support

| Provider | API/SDK | Features |
|----------|---------|----------|
| **Anthropic** | Messages API | Streaming MCP support with tool calling handled server-side |
| **Anthropic** | Agent SDK | Same harness as Claude Code with more capabilities |
| **OpenAI** | Responses API | Handles first-party tools |
| **OpenAI** | Realtime API | Real-time audio controlled interactions |
| **Google** | Gemini SDK | Native capability to call MCP servers |

---

## ChatGPT Apps & New Use Cases

### ChatGPT Apps SDK

Announced at OpenAI Dev Day — enables explicit brand invocation in prompts.

**Question:** AI's App Store moment? Brands prioritizing AI visibility over traditional web traffic?

### Key Features

| Feature | Description |
|---------|-------------|
| **Resources** | Being used in core flow for building UI components |
| **Agentic Workflows** | Persistent agents with session management and async tool calls |

### ChatGPT Apps Architecture

| Component | Description |
|-----------|-------------|
| **UI** | React component runs in iframe inside ChatGPT; talks to host via `window.openai` |
| **Dataflow** | MCP tool links to UI template; `structuredContent` injected as `window.openai.toolOutput` |
| **Tandem loop** | Component can `callTool`, `sendFollowUpMessage`, and `setWidgetState` to iterate |

---

## Content Creation: Jade

**MCP as creative infrastructure — Beyond coding into media production**

| Capability | Description |
|------------|-------------|
| **AI-Powered Video Generation** | Tools for media generation using diffusion/flow matching models |
| **Video editing and graphics** | Programmatic video generation for precision use cases |
| **Video understanding** | Closing the loop — "unit tests but for video" |

---

## MCP Governance Model

| Structure | Purpose |
|-----------|---------|
| **SEPs** | Specification Enhancement Proposals provide clear process for spec changes |
| **Working Groups** | Push forward specific solutions with concrete deliverables |
| **Interest Groups** | Define problems MCP should solve and facilitate community discussions |
| **Community-Driven** | PulseMCP, Block, GitHub, Anthropic collaborating from inception |

> "Key principle: Open, collaborative project not controlled by any single vendor. The community shapes the protocol's evolution through transparent governance."

---

## Get Involved

1. **Build and publish MCP servers** — Create tools, resources, and prompts for the ecosystem
2. **Contribute to the registry** — Pull requests welcome for server discovery and sharing
3. **Join working and interest groups** — Shape the future direction of the protocol
4. **Provide feedback via GitHub** — Report issues, suggest enhancements, share use cases

**MCP Registry:** September 2025 launch — Open catalog and API at github.com/modelcontextprotocol/registry

---

## Connection Lifecycle

| Phase | Description |
|-------|-------------|
| **Initialization** | Protocol version verification and capability negotiation |
| **Identity Exchange** | Client and server identify capabilities: tools, resources, sampling support |
| **Stateful Session** | Maintains context throughout entire session lifecycle |

> "The lifecycle is transport layer agnostic — the same connection pattern works across STDIO, HTTP, and SSE implementations."

---

## Request/Response Flow

| Step | Description |
|------|-------------|
| **1. Tool Discovery** | Client queries available capabilities from the server |
| **2. Tool Execution** | Client invokes discovered tools with parameters |
| **3. Progress Tracking** | Long-running operations report real-time status via notifications |
| **4. Resource Updates** | Subscribed clients receive automatic notifications on changes |

> "All communication follows JSON-RPC 2.0 message patterns: requests expect responses, while notifications flow without requiring acknowledgment. Bidirectional channels enable servers to request sampling or elicitation from clients."

---

## Sampling

Servers request LLM completions from the client, enabling:

- Multi-agent coordination without exposing API keys
- Client control over costs, security, and model selection
- Sub-agents delegating complex reasoning to main LLM

---

## Key Takeaways

1. **Universal standard** — "USB-C for AI" enables seamless tool connections
2. **Bidirectional** — Not just request/response, but tool-initiated events
3. **Vendor-neutral** — Community-driven governance, not controlled by single vendor
4. **Ecosystem growing** — Major players (Anthropic, OpenAI, Google) all supporting
5. **Beyond coding** — MCP expanding into creative, media, and enterprise workflows
6. **App Store potential** — Could become foundation for AI-native application ecosystem
