# A Deep Dive Into MCP and the Future of AI Tooling

**Source:** a16z (Andreessen Horowitz)
**Author:** Yoko Li, Partner at a16z (Enterprise and Infrastructure)
**Published:** March 20, 2025
**Contact:** yli@a16z.com

---

## Overview

Since OpenAI released function calling in 2023, the question has been: what would it take to unlock an ecosystem of agent and tool use? As foundational models get more intelligent, agents' ability to interact with external tools, data, and APIs becomes increasingly fragmented. Developers need to implement agents with special business logic for every single system the agent operates in and integrates with.

**The Problem:** There needs to be a standard interface for execution, data fetching, and tool calling. APIs were the internet's first great unifier—creating a shared language for software to communicate—but AI models lack an equivalent.

**The Solution:** Model Context Protocol (MCP), introduced in November 2024, has gained significant traction within developer and AI communities as a potential solution.

---

## What is MCP?

MCP is an open protocol that allows systems to provide context to AI models in a manner that's generalizable across integrations. The protocol defines how the AI model can call external tools, fetch data, and interact with services.

### Inspiration from LSP

The idea is not new; MCP took inspiration from the **LSP (Language Server Protocol)**. In LSP, when a user types in an editor, the client queries the language server to autocomplete suggestions or diagnostics.

### How MCP Extends Beyond LSP

Where MCP extends beyond LSP is in its **agent-centric execution model**:

| Aspect | LSP | MCP |
|--------|-----|-----|
| Behavior | Mostly reactive (responding to IDE requests) | Designed for autonomous AI workflows |
| Execution | User-initiated | AI agents decide which tools to use, in what order, and how to chain them |
| Human involvement | Direct | Human-in-the-loop capabilities for additional data and approval |

---

## Popular Use Cases Today

With the right set of MCP servers, users can turn every MCP client into an "everything app."

### Cursor as Example

Although Cursor is a code editor, it's also a well-implemented MCP client. End users can turn it into:
- A **Slack client** using the Slack MCP server
- An **email sender** using Resend MCP server
- An **image generator** using the Replicate MCP server

**More powerful:** Install multiple servers on one client to unlock new flows—generate front-end UI from Cursor while using an image-generation MCP server to generate a hero image for the site.

---

## Dev-Centric Workflows

For developers who live and breathe code every day, a common sentiment is: **"I don't want to leave my IDE to do x"**. MCP servers make this dream a reality.

### Examples

- **Postgres MCP server:** Execute read-only SQL commands without switching to Supabase
- **Upstash MCP server:** Create and manage cache indices from the IDE
- **Browsertools MCP:** Give coding agents access to a live environment for feedback and debugging

### Auto-Generated Context

A new use MCP servers unlock: adding highly accurate context to coding agents by:
- Crawling a web page
- Auto-generating an MCP server based on documentation

Instead of manually wiring up integrations, developers can spin up MCP servers straight from existing documentation or APIs.

---

## Net-New Experiences

IDEs like Cursor are not the only MCP clients available. For non-technical users, **Claude Desktop** serves as an excellent entry point, making MCP-powered tools more accessible.

### Emerging Specialized Clients

Soon, we will likely see specialized MCP clients for:
- Customer support
- Marketing copywriting
- Design
- Image editing

These fields closely align with AI's strengths in pattern recognition and creative tasks.

### UX Innovation Examples

**Highlight:** Implemented the `@` command to invoke any MCP servers on its client—a new UX pattern where the MCP client can pipe generated content into any downstream app of choice.

**Blender MCP:** Amateur users who barely know Blender can use natural language to describe the model they want to build. We're seeing the text-to-3D workflow playing out in real time as the community implements servers for Unity and Unreal engine.

---

## MCP Ecosystem Market Map

### MCP Clients
Most high-quality clients today are **coding-centric** (developers are early adopters). As the protocol matures, expect more business-centric clients.

### MCP Servers
Most servers are **local-first** and focus on single players. This is a symptom of MCP presently only supporting SSE- and command-based connections. Expect more adoption as:
- The ecosystem makes remote MCP first-class
- MCP adopts Streamable HTTP transport

### Marketplaces & Discovery
- **Mintlify's mcpt**
- **Smithery**
- **OpenTools**

These make it easier for developers to discover, share, and contribute new MCP servers—like npm for JavaScript or RapidAPI for APIs.

### Infrastructure & Tooling
- **Server generation:** Mintlify, Stainless, Speakeasy
- **Hosting:** Cloudflare, Smithery
- **Connection management:** Toolbase (local-first MCP key management and proxy)

---

## Future Possibilities: Unsolved Problems

### 1. Hosting and Multi-Tenancy

MCP supports one-to-many (agent to tools), but **multi-tenant architectures** (SaaS products) need many users accessing a shared MCP server at once.

**Needed:** A streamlined toolchain for at-scale MCP server deployment and maintenance.

### 2. Authentication

MCP does not currently define a standard authentication mechanism. Authentication is left to individual implementations.

**A unified approach should cover:**
- **Client authentication:** OAuth or API tokens for client-server interactions
- **Tool authentication:** Helper functions for authenticating with third-party APIs
- **Multi-user authentication:** Tenant-aware authentication for enterprise deployments

### 3. Authorization

Even if authenticated, who should be allowed to use a tool and how granular should permissions be?

**Current state:** Access control is at the session level—a tool is either accessible or completely restricted. This creates complexity as agents and tools multiply.

### 4. Gateway

As MCP scales, a gateway could act as a centralized layer for:
- Authentication and authorization
- Traffic management
- Tool selection
- Load balancing
- Response caching

Similar to API gateways, especially important for multi-tenant environments.

### 5. MCP Server Discoverability and Usability

Currently, finding and setting up MCP servers is manual:
- Locate endpoints or scripts
- Configure authentication
- Ensure compatibility

**Coming soon:** Based on Anthropic's talk at the AI engineer conference, an MCP server registry and discovery protocol is in development.

### 6. Execution Environment

Most AI workflows require multiple tool calls in sequence—but MCP lacks a built-in workflow concept.

**Not ideal:** Asking every client to implement resumability and retryability. Promoting stateful execution to a first-class concept would clarify the execution model.

### 7. Standard Client Experience

Common questions:
- How to think about tool selection when building an MCP client?
- Does everyone need their own RAG for tools?
- No unified UI/UX patterns for invoking tools (slash commands vs. natural language)

**Needed:** A standard client-side layer for tool discovery, ranking, and execution.

### 8. Debugging

Developers often discover it's hard to make the same MCP server work across clients. Each client has quirks, and client-side traces are missing or hard to find.

**Needed:** New tooling for streamlined dev experience across local and remote environments.

---

## Implications of AI Tooling

If MCP becomes the de facto standard for AI-powered workflows:

### 1. Competitive Advantage Evolution

Dev-first companies' advantage will evolve from shipping the best API design to **shipping the best collection of tools for agents**. Providers must ensure tooling is:
- Easily discoverable from search
- Differentiated enough for agents to select

### 2. New Pricing Models

If every app becomes an MCP client and every API becomes an MCP server:
- Agents may pick tools dynamically based on speed, cost, and relevance
- **Market-driven tool adoption** that picks the best-performing and most modular tool

### 3. Documentation Becomes Critical

Companies will need to design tools and APIs with:
- Clear, machine-readable formats (e.g., `llms.txt`)
- MCP servers as de facto artifacts based on existing documentation

### 4. APIs Alone Are No Longer Enough

The mapping from API to tools is rarely 1:1. Tools are a higher abstraction for agents at task execution time.

**Example:** Instead of `send_email()`, an agent may opt for `draft_email_and_send()` that includes multiple API calls to minimize latency.

MCP server design will be **scenario- and use-case-centric** instead of API-centric.

### 5. New Mode of Hosting

If every software becomes an MCP client by default:
- Workload characteristics differ from traditional website hosting
- Every client is multi-step, requiring execution guarantees (resumability, retries, long-running task management)
- Real-time load balancing across different MCP servers to optimize cost, latency, and performance

---

## Key Questions for This Year

- Will we see the rise of a unified MCP marketplace?
- Will authentication become seamless for AI agents?
- Can multi-step execution be formalized into the protocol?

---

## Conclusion

MCP is already reshaping the AI-agent ecosystem, but the next wave of progress will be defined by how we address foundational challenges. If done right, MCP could become the **default interface for AI-to-tool interactions** and unlock a new generation of autonomous, multi-modal, and deeply integrated AI experiences.

If adopted widely, MCPs can represent a shift in how tools are built, consumed, and monetized.

**If you are building in this space:** Reach out to yli@a16z.com

*It's time to build!*

---

## Related Reading from a16z

- Investing in Keycard
- Investing in Reducto
- The Trillion Dollar AI Software Development Stack
- Investing in Relace
- Investing in Phota Labs
- State of Consumer AI 2025
- A Roadmap for Federal AI Legislation
- State of AI: An Empirical 100 Trillion Token Study with OpenRouter
