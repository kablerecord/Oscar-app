# Model Context Protocol (MCP) Architecture Overview

**Source:** Official MCP Documentation (modelcontextprotocol.io)
**Topics:** Architecture, Specification, Data Layer Protocol

---

## Scope

The Model Context Protocol includes the following projects:

1. **MCP Specification:** A specification of MCP that outlines the implementation requirements for clients and servers
2. **MCP SDKs:** SDKs for different programming languages that implement MCP
3. **MCP Development Tools:** Tools for developing MCP servers and clients, including the MCP Inspector
4. **MCP Reference Server Implementations:** Reference implementations of MCP servers

**Important:** MCP focuses solely on the protocol for context exchange—it does not dictate how AI applications use LLMs or manage the provided context.

---

## Concepts of MCP

### Participants

MCP follows a client-server architecture where an **MCP host** — an AI application like Claude Code or Claude Desktop — establishes connections to one or more MCP servers. The MCP host accomplishes this by creating one MCP client for each MCP server.

| Participant | Role |
|-------------|------|
| **MCP Host** | The AI application that coordinates and manages one or multiple MCP clients |
| **MCP Client** | A component that maintains a connection to an MCP server and obtains context from an MCP server for the MCP host to use |
| **MCP Server** | A program that provides context to MCP clients |

**Example:** Visual Studio Code acts as an MCP host. When Visual Studio Code establishes a connection to an MCP server (such as the Sentry MCP server), the Visual Studio Code runtime instantiates an MCP client object that maintains the connection. When Visual Studio Code subsequently connects to another MCP server (such as the local filesystem server), the Visual Studio Code runtime instantiates an additional MCP client object.

**Local vs Remote Servers:**
- **Local MCP Server:** Uses STDIO transport, runs on same machine (e.g., filesystem server launched by Claude Desktop)
- **Remote MCP Server:** Uses Streamable HTTP transport, runs on external platform (e.g., Sentry MCP server)

---

## Layers

MCP consists of two layers:

### 1. Data Layer (Inner Layer)

Defines the JSON-RPC based protocol for client-server communication, including:

- **Lifecycle management:** Handles connection initialization, capability negotiation, and connection termination
- **Server features:** Tools for AI actions, resources for context data, prompts for interaction templates
- **Client features:** Sampling from host LLM, user elicitation, logging
- **Utility features:** Notifications for real-time updates, progress tracking

### 2. Transport Layer (Outer Layer)

Defines the communication mechanisms and channels:

| Transport | Description | Use Case |
|-----------|-------------|----------|
| **Stdio Transport** | Uses standard input/output streams for direct process communication | Local processes, optimal performance, no network overhead |
| **Streamable HTTP Transport** | Uses HTTP POST with optional Server-Sent Events for streaming | Remote server communication, supports OAuth/bearer tokens/API keys |

---

## Data Layer Protocol

MCP uses **JSON-RPC 2.0** as its underlying RPC protocol. Clients and servers send requests to each other and respond accordingly. Notifications can be used when no response is required.

### Lifecycle Management

The purpose of lifecycle management is to negotiate the capabilities that both client and server support.

### Primitives

MCP primitives define the types of contextual information that can be shared with AI applications and the range of actions that can be performed.

#### Server Primitives

| Primitive | Description | Methods |
|-----------|-------------|---------|
| **Tools** | Executable functions that AI applications can invoke (file operations, API calls, database queries) | `tools/list`, `tools/call` |
| **Resources** | Data sources that provide contextual information (file contents, database records, API responses) | `resources/list`, `resources/read` |
| **Prompts** | Reusable templates that help structure interactions with language models | `prompts/list`, `prompts/get` |

#### Client Primitives

| Primitive | Description | Method |
|-----------|-------------|--------|
| **Sampling** | Allows servers to request language model completions from the client's AI application | `sampling/complete` |
| **Elicitation** | Allows servers to request additional information from users | `elicitation/request` |
| **Logging** | Enables servers to send log messages to clients for debugging | — |

#### Utility Primitives

| Primitive | Description |
|-----------|-------------|
| **Tasks (Experimental)** | Durable execution wrappers for deferred result retrieval and status tracking (expensive computations, workflow automation, batch processing) |

### Notifications

The protocol supports real-time notifications to enable dynamic updates between servers and clients. Notifications are sent as JSON-RPC 2.0 notification messages (without expecting a response).

---

## Example: Data Layer Walkthrough

### Step 1: Initialization (Lifecycle Management)

**Client sends initialize request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "elicitation": {}
    },
    "clientInfo": {
      "name": "example-client",
      "version": "1.0.0"
    }
  }
}
```

**Understanding the Initialization Exchange:**

1. **Protocol Version Negotiation:** The `protocolVersion` field ensures compatibility between client and server
2. **Capability Discovery:** The `capabilities` object declares supported features and primitives
3. **Identity Exchange:** `clientInfo` and `serverInfo` provide identification for debugging

**Client Capabilities:**
- `"elicitation": {}` - Client can work with user interaction requests

**Server Capabilities:**
- `"tools": {"listChanged": true}` - Server supports tools AND can send `tools/list_changed` notifications
- `"resources": {}` - Server supports resources primitive

**Client confirms ready:**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

**Pseudo-code for AI Application Initialization:**

```python
# Pseudo Code
async with stdio_client(server_config) as (read, write):
    async with ClientSession(read, write) as session:
        init_response = await session.initialize()
        if init_response.capabilities.tools:
            app.register_mcp_server(session, supports_tools=True)
        app.set_server_ready(session)
```

---

### Step 2: Tool Discovery (Primitives)

**Client requests available tools:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Response contains tools array with metadata:**

| Field | Purpose |
|-------|---------|
| `name` | Unique identifier for tool execution |
| `title` | Human-readable display name |
| `description` | Explanation of what the tool does |
| `inputSchema` | JSON Schema defining expected input parameters |

**Pseudo-code for Tool Discovery:**

```python
# Pseudo-code using MCP Python SDK patterns
available_tools = []
for session in app.mcp_server_sessions():
    tools_response = await session.list_tools()
    available_tools.extend(tools_response.tools)
conversation.register_available_tools(available_tools)
```

---

### Step 3: Tool Execution (Primitives)

**Client executes a tool:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "weather_current",
    "arguments": {
      "location": "San Francisco",
      "units": "imperial"
    }
  }
}
```

**Key Elements:**

| Element | Description |
|---------|-------------|
| `name` | Must match exactly the tool name from discovery response |
| `arguments` | Input parameters as defined by tool's `inputSchema` |
| `content` Array | Responses return array of content objects (text, images, resources) |

**Pseudo-code for Tool Execution:**

```python
# Pseudo-code for AI application tool execution
async def handle_tool_call(conversation, tool_name, arguments):
    session = app.find_mcp_session_for_tool(tool_name)
    result = await session.call_tool(tool_name, arguments)
    conversation.add_tool_result(result.content)
```

---

### Step 4: Real-time Updates (Notifications)

**Server sends tool list change notification:**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

**Key Features of MCP Notifications:**

| Feature | Description |
|---------|-------------|
| **No Response Required** | No `id` field - follows JSON-RPC 2.0 notification semantics |
| **Capability-Based** | Only sent by servers declaring `"listChanged": true` |
| **Event-Driven** | Server decides when to send based on internal state changes |

**Client Response to Notifications:**

Upon receiving a notification, the client typically requests the updated list:

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/list"
}
```

**Why Notifications Matter:**

1. **Dynamic Environments:** Tools may come and go based on server state, external dependencies, or user permissions
2. **Efficiency:** Clients don't need to poll for changes
3. **Consistency:** Ensures clients always have accurate information about available capabilities
4. **Real-time Collaboration:** Enables responsive AI applications that adapt to changing contexts

---

## How This Works in AI Applications

| Phase | AI Application Behavior |
|-------|------------------------|
| **Initialization** | MCP client manager establishes connections, stores server capabilities |
| **Discovery** | Fetches available tools from all connected servers, builds unified tool registry |
| **Execution** | Intercepts LLM tool calls, routes to appropriate MCP server, returns results |
| **Updates** | Listens for notifications, refreshes capabilities when changes occur |

---

## Summary

| Concept | Description |
|---------|-------------|
| **MCP Host** | AI application (Claude Code, VS Code) managing multiple MCP clients |
| **MCP Client** | Maintains connection to single MCP server |
| **MCP Server** | Program providing context (local or remote) |
| **Data Layer** | JSON-RPC 2.0 protocol for primitives and lifecycle |
| **Transport Layer** | STDIO (local) or Streamable HTTP (remote) |
| **Primitives** | Tools, Resources, Prompts (server) + Sampling, Elicitation, Logging (client) |
| **Notifications** | Real-time updates for dynamic synchronization |
