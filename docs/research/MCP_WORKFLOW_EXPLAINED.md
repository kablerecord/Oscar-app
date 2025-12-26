# How Does an MCP Work Under the Hood? MCP Workflow Explained

**Source:** freeCodeCamp
**Author:** Ajay Patel
**Published:** December 16, 2025

---

## The Problem

> "We've all faced that awkward limitation with AI: it can write code or explain complex topics in seconds, but the moment you ask it to check a local file or run a quick database query, it hits a wall. It's like having a genius assistant who is locked in an empty room—smart, but completely cut off from your actual work."

### The MxN Problem

LLMs possess impressive knowledge and reasoning skills, but their knowledge is limited to initial training data. They can't:
- Access your calendar
- Run SQL queries
- Send an email

To give LLMs real-world capabilities, developers had to build and maintain custom integrations for every combination of **M models** and **N tools**—the classic MxN problem.

### Function Calling Limitations

Function calling (tool calling) provides a way for OpenAI models to interface with external systems, but this creates **vendor lock-in** as it's exclusive to OpenAI models.

---

## What is MCP (Model Context Protocol)?

MCP is an **open-source standard**, developed by Anthropic, for connecting AI applications to external systems.

### The "Write Once, Use Anywhere" Approach

- An app developer writes a **single MCP server** for any AI system to use
- Exposes a set of tools and data
- Any AI system can implement the protocol and connect to any MCP server

### The USB-C Analogy

> "Think of an MCP like a USB-C port for AI applications. Just as USB-C provides a standardized way to connect electronic devices, an MCP provides a standardized way to connect AI applications to external systems."

---

## Architecture of MCP

MCP follows a simple **client-server architecture** with three key components:

### 1. MCP Host

The user-facing AI application where the AI model lives and interacts with the user.

**Responsibilities:**
- Discovery management
- Permission handling
- Communication between clients and servers

**Examples:**
- Chat applications (ChatGPT, Claude Desktop)
- AI-enhanced IDEs (Cursor, Windsurf)

### 2. MCP Client

A component within the host that handles low-level communication with the MCP server.

**Key Points:**
- Instantiated by host applications
- Communicates with particular MCP servers
- Each client handles **one direct communication with one server**

> "The host is the application users interact with, while clients are the components that enable server connections."

### 3. MCP Server

The external program or service that exposes capabilities (tools, data) to the application.

**Characteristics:**
- Wrapper around functionality
- Exposes tools/resources in standardized way
- Can run **locally** or **remotely** (cloud service)

---

## MCP Server Capabilities

An MCP server can expose one or more capabilities:

| Capability | Description | Trigger |
|------------|-------------|---------|
| **Tools** | Functions that do something on behalf of the AI model | AI model's choice (LLM decides when needed) |
| **Resources** | Read-only data (database records, knowledge bases) | AI can query but not modify |
| **Prompts** | Predefined templates or workflows | Server provides to client |

### Tool Example
```
send_email -> send the email to the user
```

---

## Transport Layer

Uses **JSON-RPC 2.0** messages for client-server communication.

| Transport Method | Best For | Characteristics |
|-----------------|----------|-----------------|
| **Standard Input/Output (stdio)** | Local environments | Fast, synchronous transmission |
| **Server-Sent Events (SSE)** | Remote resources | Real-time, one-way streaming |

---

## How Does MCP Work? Step-by-Step Example

**User Query:** "Find the latest sales report in our database and email it to my manager."

### Step 1: Tool Discovery

When MCP client (Claude Desktop) launches, it connects to configured MCP servers:

**Client asks:** "What can I do with available tools?"

**Servers respond with available tools:**
- `database_query`
- `email_sender`
- `file_browser`

Now Claude knows its available tools.

### Step 2: Understanding Your Requirement

Claude reads the query and realizes:
1. Needs to **retrieve information** → `database_query`
2. Needs to **take external action** → `email_sender`

Claude plans a 2-step tool sequence.

### Step 3: Ask for Permission

**Before any external action:**

> "Claude wants to query your sales database. Allow?"

**Nothing proceeds without your approval.** This is core to MCP's security model.

### Step 4: Querying the Database

Once permission granted:
1. Claude sends structured MCP tool call to `database_query` server
2. Server runs secure database lookup
3. Returns latest sales report data

**Important:** Claude doesn't get direct database access.

### Step 5: Sending the Email

**Second permission prompt:**
> "Claude wants to send an email on your behalf. Approve?"

Once approved:
1. MCP sends information to `email_sender` server
2. Claude formats and delivers email

### Step 6: Natural Answer

Claude responds:
> "Done! I found the latest sales report and emailed it to your manager."

---

## The Security Model

| Principle | Implementation |
|-----------|----------------|
| **Explicit Permission** | Every external action requires user approval |
| **No Direct Access** | Server acts as intermediary |
| **Step-by-Step Control** | User approves each stage |
| **Transparency** | User sees what Claude wants to do |

---

## MCP vs RAG

| Aspect | RAG | MCP |
|--------|-----|-----|
| **Purpose** | Supply relevant knowledge from vector database | Enable real-world actions with tools |
| **How it works** | Query → Vector embedding → Similarity search → Context to LLM | Connect to tools and services |
| **Best for** | Answering questions from large documents | Performing actions (databases, APIs, email, calendar) |
| **Data flow** | Read-only retrieval | Bidirectional interaction |

**RAG:** Great for company wikis, knowledge bases, research papers
**MCP:** Enables database queries, API calls, sending emails

---

## MCP vs A2A (Agent-to-Agent)

Both are complementary open standards serving different purposes:

| Protocol | Purpose | Communication Type |
|----------|---------|-------------------|
| **MCP** | Single AI agent connects to tools, data, external systems | Agent-to-Tool |
| **A2A** | Multiple independent AI agents communicate and collaborate | Agent-to-Agent |

---

## Popular MCP Servers

| Server | Description |
|--------|-------------|
| **Brave Search** | Web and local search capabilities |
| **Sentry** | Inspect error reports, stacktraces, debugging info |
| **Google Maps** | Maps API integration |
| **Tailwind by FlyonUI** | Generate UIs/themes with prompts |
| **Git** | Repository interaction and automation |
| **GitHub** | File operations, repo management, search |
| **Shadcn** | Generate UIs with shadcn/studio |

**Full list:** https://github.com/punkpeye/awesome-mcp-servers

---

## Key Benefits

1. **Solves MxN Problem** - Build MCP server once, all AI systems can integrate
2. **Standardization** - Universal protocol like USB-C
3. **Security** - Explicit user permission at every step
4. **Flexibility** - Local or remote servers
5. **Vendor Independence** - Works with any AI system implementing the protocol

---

## Conclusion

> "MCP is the revolution in how AI systems can interact with the real world. As the ecosystem of the MCP continues to grow, it will enable AI agents to become more powerful assistants that can operate across diverse environments with reliability and security."

**The transformation:** AI assistants evolve from isolated conversational tools into genuine productivity partners that can interact with your entire digital ecosystem—safely and with explicit permission every step of the way.

---

## Resources

- **Official Documentation:** modelcontextprotocol.io
- **MCP Course:** https://huggingface.co/mcp-course
- **Awesome MCP Servers:** https://github.com/punkpeye/awesome-mcp-servers
