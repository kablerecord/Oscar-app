# MCP vs REST APIs: A Fundamental Distinction

**Source:** Roo Code Documentation
**Topic:** Understanding the difference between MCP and REST APIs

---

## The Core Insight

> "Comparing REST APIs to the Model Context Protocol (MCP) is a category error. They operate at different layers of abstraction and serve fundamentally different purposes in AI systems."

---

## Architectural Differences

| Feature | MCP | REST APIs |
|---------|-----|-----------|
| **State Management** | Stateful - maintains context across interactions | Stateless - each request is independent |
| **Connection Type** | Persistent, bidirectional connections | One-way request/response |
| **Communication Style** | JSON-RPC based with ongoing sessions | HTTP-based with discrete requests |
| **Context Handling** | Context is intrinsic to the protocol | Context must be manually managed |
| **Tool Discovery** | Runtime discovery of available tools | Design-time integration requiring prior knowledge |
| **Integration Approach** | Runtime integration with dynamic capabilities | Design-time integration requiring code changes |

---

## Different Layers, Different Purposes

REST APIs and MCP serve different tiers in the technology stack:

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Low-level** | REST | Web communication pattern that exposes operations on resources |
| **High-level** | MCP | AI protocol that orchestrates tool usage and maintains context |

> "MCP often uses REST APIs internally, but abstracts them away for the AI. Think of MCP as middleware that turns discrete web services into a cohesive environment the AI can operate within."

---

## Context Preservation: Critical for AI Workflows

MCP's stateful design solves a key limitation of REST in AI applications:

| Approach | How Context Works |
|----------|-------------------|
| **REST** | Each call is isolated, requiring manual context passing between steps |
| **MCP** | One conversation context persists across multiple tool uses |

**Example:** An AI debugging a codebase can open a file, run tests, and identify errors without losing context between steps. The MCP session maintains awareness of previous actions and results.

---

## Dynamic Tool Discovery

MCP enables an AI to discover and use tools at runtime:

```json
{
  "tools": [
    {
      "name": "readFile",
      "description": "Reads content from a file",
      "parameters": {
        "path": {
          "type": "string",
          "description": "File path"
        }
      }
    },
    {
      "name": "createTicket",
      "description": "Creates a ticket in issue tracker",
      "parameters": {
        "title": { "type": "string" },
        "description": { "type": "string" }
      }
    }
  ]
}
```

> "This 'plug-and-play' capability allows new tools to be added without redeploying or modifying the AI itself."

---

## Real-World Example: Multi-Tool Workflow

**Task:** "Check recent commits, create a JIRA ticket for the bug fix, and post to Slack."

### REST-based Approach

| Challenge | Impact |
|-----------|--------|
| Requires separate integrations | Git, JIRA, and Slack APIs each need custom code |
| Manual context management | Custom code needed to pass state between calls |
| Brittle to changes | Breaks if any service changes its API |

### MCP-based Approach

| Advantage | Benefit |
|-----------|---------|
| Unified protocol | One standard for all tools |
| Context persistence | Maintains awareness across entire workflow |
| Flexible tooling | New tools can be swapped in without code changes |

---

## Why AI Coding Tools Use MCP

MCP provides:

| Capability | Description |
|------------|-------------|
| **Extensibility** | Add unlimited custom tools without waiting for official integration |
| **Contextual awareness** | Tools can access conversation history and project context |
| **Simplified integration** | One standard protocol rather than numerous API patterns |
| **Runtime flexibility** | Discover and use new capabilities on-the-fly |

> "MCP creates a universal connector between AI tools and external services, with REST APIs often powering those services behind the scenes."

---

## Conclusion: Complementary, Not Competing

**MCP doesn't replace REST APIs—it builds upon them.**

| Technology | Strength |
|------------|----------|
| **REST** | Excels at providing discrete services |
| **MCP** | Excels at orchestrating those services for AI agents |

### The Critical Distinction

> "MCP is AI-native: it treats the model as a first-class user, providing the contextual, stateful interaction layer that AI agents need to function effectively in complex environments."

---

## Summary Table

| Aspect | REST | MCP |
|--------|------|-----|
| **Design philosophy** | Resource-oriented | Agent-oriented |
| **Target user** | Developers | AI models |
| **State model** | Stateless | Stateful |
| **Discovery** | Documentation-based | Runtime introspection |
| **Integration** | Compile-time | Runtime |
| **Context** | External | Built-in |
