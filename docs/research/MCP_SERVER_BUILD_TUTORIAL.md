# Building an MCP Server: Multi-Language Tutorial

**Source:** Official MCP Documentation (modelcontextprotocol.io)
**Purpose:** Practical guide for building and integrating MCP servers
**Languages Covered:** Python, TypeScript, Java, Kotlin, C#, Rust

---

## Overview

This documentation serves as a practical guide for developers to build and integrate a Model Context Protocol (MCP) server. The tutorial demonstrates how to create functional tools—specifically for weather alerts and forecasts—that an LLM like Claude can execute to perform real-world tasks.

### What We're Building

A weather server that exposes two tools:
- `get_alerts` - Get weather alerts for a US state
- `get_forecast` - Get weather forecast for a location (latitude/longitude)

---

## Core MCP Concepts

MCP servers can provide three main types of capabilities:

| Capability | Description |
|------------|-------------|
| **Resources** | File-like data that can be read by clients (API responses, file contents) |
| **Tools** | Functions that can be called by the LLM (with user approval) |
| **Prompts** | Pre-written templates that help users accomplish specific tasks |

This tutorial focuses primarily on **Tools**.

---

## Critical: Logging in MCP Servers

### For STDIO-based Servers

**NEVER write to standard output (stdout).** This includes:
- `print()` in Python
- `console.log()` in JavaScript
- `fmt.Println()` in Go
- `println!()` in Rust
- Similar stdout functions in other languages

**Why:** Writing to stdout will corrupt the JSON-RPC messages and break your server.

### For HTTP-based Servers

Standard output logging is fine since it doesn't interfere with HTTP responses.

### Best Practices

| Language | Bad | Good |
|----------|-----|------|
| Python | `print("Processing request")` | `logging.info("Processing request")` |
| JavaScript | `console.log("Server started")` | `console.error("Server started")` |
| Rust | `println!("Processing request")` | `info!("Processing request")` via tracing |

---

## Python Implementation

### System Requirements
- Python 3.10 or higher
- MCP SDK 1.2.0 or higher

### Environment Setup

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create project
uv init weather
cd weather
uv venv
source .venv/bin/activate

# Install dependencies
uv add "mcp[cli]" httpx

# Create server file
touch weather.py
```

### Server Code

```python
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("weather")

# Constants
NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"

async def make_nws_request(url: str) -> dict[str, Any] | None:
    """Make a request to the NWS API with proper error handling."""
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/geo+json"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

@mcp.tool()
async def get_alerts(state: str) -> str:
    """Get weather alerts for a US state.

    Args:
        state: Two-letter US state code (e.g. CA, NY)
    """
    url = f"{NWS_API_BASE}/alerts/active/area/{state}"
    data = await make_nws_request(url)

    if not data or "features" not in data:
        return "Unable to fetch alerts or no alerts found."

    if not data["features"]:
        return "No active alerts for this state."

    alerts = [format_alert(feature) for feature in data["features"]]
    return "\n---\n".join(alerts)

@mcp.tool()
async def get_forecast(latitude: float, longitude: float) -> str:
    """Get weather forecast for a location.

    Args:
        latitude: Latitude of the location
        longitude: Longitude of the location
    """
    points_url = f"{NWS_API_BASE}/points/{latitude},{longitude}"
    points_data = await make_nws_request(points_url)

    if not points_data:
        return "Unable to fetch forecast data for this location."

    forecast_url = points_data["properties"]["forecast"]
    forecast_data = await make_nws_request(forecast_url)

    if not forecast_data:
        return "Unable to fetch detailed forecast."

    periods = forecast_data["properties"]["periods"]
    forecasts = []
    for period in periods[:5]:
        forecast = f"""
{period["name"]}:
Temperature: {period["temperature"]}°{period["temperatureUnit"]}
Wind: {period["windSpeed"]} {period["windDirection"]}
Forecast: {period["detailedForecast"]}
"""
        forecasts.append(forecast)
    return "\n---\n".join(forecasts)

def main():
    mcp.run(transport="stdio")

if __name__ == "__main__":
    main()
```

### Running

```bash
uv run weather.py
```

---

## TypeScript Implementation

### System Requirements
- Node.js 16 or higher

### Environment Setup

```bash
mkdir weather && cd weather
npm init -y
npm install @modelcontextprotocol/sdk zod@3
npm install -D @types/node typescript
mkdir src && touch src/index.ts
```

### package.json Updates

```json
{
  "type": "module",
  "bin": {
    "weather": "./build/index.js"
  },
  "scripts": {
    "build": "tsc && chmod 755 build/index.js"
  }
}
```

### Server Code (src/index.ts)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

// Register tools
server.registerTool(
  "get_alerts",
  {
    description: "Get weather alerts for a state",
    inputSchema: {
      state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
    },
  },
  async ({ state }) => {
    // Implementation...
  }
);

server.registerTool(
  "get_forecast",
  {
    description: "Get weather forecast for a location",
    inputSchema: {
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    },
  },
  async ({ latitude, longitude }) => {
    // Implementation...
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

### Running

```bash
npm run build
```

---

## Java Implementation (Spring AI)

### System Requirements
- Java 17 or higher
- Spring Boot 3.3.x or higher

### Dependencies

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-server</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-web</artifactId>
  </dependency>
</dependencies>
```

### Application Properties

```properties
spring.main.bannerMode=off
logging.pattern.console=
```

### Weather Service

```java
@Service
public class WeatherService {
    private final RestClient restClient;

    public WeatherService() {
        this.restClient = RestClient.builder()
            .baseUrl("https://api.weather.gov")
            .defaultHeader("Accept", "application/geo+json")
            .defaultHeader("User-Agent", "WeatherApiClient/1.0")
            .build();
    }

    @Tool(description = "Get weather forecast for a specific latitude/longitude")
    public String getWeatherForecastByLocation(
        double latitude,
        double longitude
    ) {
        // Implementation...
    }

    @Tool(description = "Get weather alerts for a US state")
    public String getAlerts(
        @ToolParam(description = "Two-letter US state code") String state
    ) {
        // Implementation...
    }
}
```

### Boot Application

```java
@SpringBootApplication
public class McpServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(McpServerApplication.class, args);
    }

    @Bean
    public ToolCallbackProvider weatherTools(WeatherService weatherService) {
        return MethodToolCallbackProvider.builder()
            .toolObjects(weatherService)
            .build();
    }
}
```

---

## Rust Implementation

### System Requirements
- Rust 1.70 or higher

### Cargo.toml Dependencies

```toml
[dependencies]
rmcp = { version = "0.3", features = ["server", "macros", "transport-io"] }
tokio = { version = "1.46", features = ["full"] }
reqwest = { version = "0.12", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
anyhow = "1.0"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "std", "fmt"] }
```

### Server Implementation

```rust
use rmcp::{
    ServerHandler, ServiceExt,
    handler::server::{router::tool::ToolRouter, tool::Parameters},
    model::*, schemars, tool, tool_handler, tool_router,
};

pub struct Weather {
    tool_router: ToolRouter<Weather>,
}

#[tool_router]
impl Weather {
    fn new() -> Self {
        Self { tool_router: Self::tool_router() }
    }

    #[tool(description = "Get weather alerts for a US state.")]
    async fn get_alerts(
        &self,
        Parameters(MCPAlertRequest { state }): Parameters<MCPAlertRequest>,
    ) -> String {
        // Implementation...
    }

    #[tool(description = "Get weather forecast for a location.")]
    async fn get_forecast(
        &self,
        Parameters(MCPForecastRequest { latitude, longitude }): Parameters<MCPForecastRequest>,
    ) -> String {
        // Implementation...
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .init();

    let server = Weather::new().serve(StdioTransport::default()).await?;
    server.waiting().await?;
    Ok(())
}
```

---

## Claude Desktop Configuration

### Configuration File Location

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### Configuration Examples

#### Python Server

```json
{
  "mcpServers": {
    "weather": {
      "command": "uv",
      "args": [
        "--directory",
        "/ABSOLUTE/PATH/TO/weather",
        "run",
        "weather.py"
      ]
    }
  }
}
```

#### TypeScript Server

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/weather/build/index.js"
      ]
    }
  }
}
```

#### Java Server

```json
{
  "mcpServers": {
    "weather": {
      "command": "java",
      "args": [
        "-Dspring.ai.mcp.server.stdio=true",
        "-jar",
        "/ABSOLUTE/PATH/TO/mcp-weather-server.jar"
      ]
    }
  }
}
```

#### Rust Server

```json
{
  "mcpServers": {
    "weather": {
      "command": "/ABSOLUTE/PATH/TO/weather/target/release/weather"
    }
  }
}
```

---

## What's Happening Under the Hood

When you interact with the MCP server through Claude:

### 1. Server Discovery
- Claude Desktop connects to your MCP server
- Server declares capabilities (tools available)

### 2. Tool Listing
- Claude discovers available tools via `tools/list`
- Tools appear in Claude's interface

### 3. Tool Execution
- When you ask about weather, Claude:
  1. Recognizes it needs weather data
  2. Calls the appropriate tool
  3. Processes the returned data
  4. Formulates a natural language response

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Server not appearing in Claude | Check absolute paths in config |
| JSON-RPC corruption | Remove all stdout logging |
| Connection timeout | Verify server starts without errors |
| Tool not found | Ensure tool is properly registered |

### Debugging Steps

1. Check Claude Desktop logs
2. Run server manually to verify it starts
3. Use MCP Inspector for debugging
4. Verify config JSON syntax

---

## Next Steps

After building your weather server:

1. **Build a client** - Create your own MCP client
2. **Add more tools** - Extend server capabilities
3. **Explore resources** - Add resource primitives
4. **Deploy remotely** - Use HTTP transport for remote servers

---

## Key Takeaways

| Concept | Description |
|---------|-------------|
| **STDIO Transport** | Primary transport for local servers |
| **No stdout logging** | Critical for STDIO servers |
| **Tool registration** | Declarative tool definitions with schemas |
| **Claude Desktop config** | JSON configuration for server discovery |
| **Cross-language support** | Python, TypeScript, Java, Kotlin, C#, Rust |
