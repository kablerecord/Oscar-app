# The Ultimate n8n Tutorial for 2025

**Format:** Video Tutorial Transcript
**Topic:** Complete guide from beginner to advanced AI agent building with n8n

---

## Overview

This comprehensive tutorial covers building AI agents with n8n, progressing from basic setup to advanced implementations including:
- Local installation and setup
- Basic agent creation with tools
- Calendar integration
- RAG (Retrieval Augmented Generation) with vector databases
- Multi-workflow tool integration
- AI image generation

---

## Part 1: Installation and Setup

### Two Versions of n8n

| Version | Description |
|---------|-------------|
| **Cloud** | Runs 24/7 in background, paid subscription |
| **Self-hosted** | Free, runs locally on your machine |

### Installing n8n Locally (npm method)

**Prerequisites:** Node.js installed

```bash
# Install n8n globally
npm install n8n -g

# Start n8n
n8n
```

Press `o` to open n8n in your browser at localhost.

---

## Part 2: n8n Interface Basics

### Key Interface Elements

| Element | Purpose |
|---------|---------|
| **Canvas** | Main workspace for building workflows |
| **Editor Tab** | Where you build and edit |
| **Executions Tab** | View execution history and order |
| **Templates Tab** | Access predefined workflow templates |
| **Sticky Notes** | Organization and documentation |
| **Active/Inactive Toggle** | Enable or disable workflow |

### Workflow Organization

- Name workflows descriptively
- Add tags for categorization
- Use sticky notes for documentation
- Color-code different sections

---

## Part 3: Creating a Basic Agent

### Step 1: Add Chat Trigger

1. Click "Add first step"
2. Select "Chat Message" trigger
3. This allows interaction with the agent inside n8n

### Step 2: Add AI Agent

1. Click the plus button
2. Go to "Advanced AI"
3. Select "AI Agent"
4. Prompt source automatically connects to chat trigger

### Step 3: Configure Chat Model

1. Click on "Chat Model"
2. Select "OpenAI"
3. Create new credential with API key from platform.openai.com
4. Choose model (e.g., GPT-4o mini)

### Step 4: Add Memory

1. Click on "Memory"
2. Select "Window Buffer Memory"
3. Context window length: 5 (past interactions remembered)
4. Session ID connects to chat trigger

### Step 5: Add Tools

1. Click on "Tool"
2. Add "Calculator" for basic testing
3. Agent decides when to use tools

### Testing the Agent

- Click "Chat" to test
- View execution flow in the tree
- See which tools were used
- Check memory storage

---

## Part 4: Building an Advanced Calendar Agent

### Setting Up Google Calendar Integration

#### Create Google Cloud Project

1. Go to console.cloud.google.com
2. Create new project (e.g., "n8n agent")
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add redirect URI from n8n
6. Copy Client ID and Client Secret to n8n

### Tool 1: Create Events

```
Resource: Event
Operation: Create
Calendar: [Select your calendar]
```

**Dynamic Parameters (using expressions):**
- Start Date: `{{ $json.start_date }}`
- End Date: `{{ $json.end_date }}`
- Summary: `{{ $json.summary }}`
- Description: `{{ $json.description }}`

**Tool Description:** "This is the tool you use to create calendar events"

### Tool 2: Search Availability

```
Resource: Calendar
Operation: Availability
Output Format: Raw (for complete data)
```

**Tool Description:** "This tool is for searching for available time slots in my calendar"

### System Prompt for Calendar Agent

```
Your role is my calendar assistant. It's your job to add things to available
time slots on my calendar. The tools you have available will allow you to
find empty time slots first, then create new events once you've confirmed
the time slot with me.

Today's date is {{ $now.setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss') }}
```

**Key Lesson:** Always include current date/time in system prompts for time-aware agents.

---

## Part 5: RAG (Retrieval Augmented Generation)

### What is RAG?

RAG allows agents to search through your documents efficiently by:
1. Converting documents to embeddings
2. Storing in vector database
3. Retrieving relevant chunks when needed

### Setting Up Document Ingestion

#### Step 1: Google Drive Trigger

1. Create new workflow
2. Add "Google Drive" trigger
3. Select "On app event" > "File created in specific folder"
4. Enable Google Drive API in Cloud Console
5. Configure OAuth credentials

#### Step 2: Download File

1. Add "Google Drive" node
2. Operation: Download file
3. Use expression for File ID: `{{ $json.id }}`

#### Step 3: Set Up Pinecone Vector Database

1. Create account at pinecone.io
2. Create index named "n8n"
3. Select embedding model: text-embedding-3-small
4. Choose serverless option
5. Copy API key

#### Step 4: Add to Vector Store

1. Add "Pinecone Vector Store" node
2. Operation: Add documents to vector store
3. Select your index
4. Add embedding model (text-embedding-3-small)
5. Add document loader (Binary type)
6. Add text splitter

**Text Splitter Settings:**
- Chunk size: 500 characters
- Chunk overlap: 20 characters

### Connecting Agent to Vector Store

1. Add "Vector Store Tool" to agent
2. Name: "retrieve files"
3. Description: "A tool used to retrieve documents stored in the user's Google Drive"
4. Select Pinecone Vector Store
5. Add same embedding model (text-embedding-3-small)

---

## Part 6: Multi-Workflow Tool Integration

### Creating an Image Generation Workflow

#### Step 1: Create New Workflow

1. Trigger: "When called by another workflow"
2. Name: "image generator"

#### Step 2: Set Up Black Forest Labs (Flux)

1. Create account at blackforestlabs.ai
2. Get API key
3. Add credits for usage

#### Step 3: HTTP Request - Generate Image

```
Method: POST
URL: https://api.bfl.ml/v1/flux-pro-1.1

Headers:
- content-type: application/json
- x-key: [YOUR_API_KEY]

Body (JSON):
- prompt: [image description]
```

#### Step 4: Wait for Processing

Add "Wait" node: 2 minutes

#### Step 5: HTTP Request - Get Result

```
Method: GET
URL: https://api.bfl.ml/v1/get_result?id={{ $json.id }}
```

### Query-to-JSON Converter

Add OpenAI node between trigger and image request:

**System Prompt:**
```
You specialize in turning queries into a structured prompt output and
outputting your response in JSON.

The user response looks like this: {"query": "a cute bunny in a field"}

Output a JSON object of whatever is inside the query parameter.

Example output: {"prompt": "a cute bunny sitting in a lush green field"}
```

**Settings:**
- Output content as JSON: enabled

### Connecting to Main Agent

1. Add "Call n8n Workflow Tool"
2. Name: "generate image"
3. Description: "Call this tool to generate and receive an image. You must give it a prompt to generate the image. Simply describe the image for the prompt."
4. Select "image generator" workflow

---

## Key Lessons and Best Practices

### Agent Design Principles

| Principle | Description |
|-----------|-------------|
| **Keep prompts simple** | Avoid convoluted system messages |
| **Define role clearly** | State what the agent is and does |
| **List available tools** | Tell agent when to use each tool |
| **Include time context** | Add current date/time for time-aware tasks |

### Debugging Strategies

1. **Test incrementally** - Test each step before moving on
2. **Check executions** - Review data flow in execution history
3. **Use mock data** - Pin test data for consistent testing
4. **Iterate on failures** - Keep testing when things don't work

### Using AI to Build AI

> "The beauty of AI is we can use AI to help us build better AI systems."

- Use ChatGPT to help write expressions
- Generate JavaScript for n8n expressions
- Create system prompts and tool descriptions

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    MAIN AGENT                            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Calendar   │  │    RAG       │  │    Image     │  │
│  │   Tools      │  │  Retrieval   │  │  Generator   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                 │                 │           │
│         ▼                 ▼                 ▼           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Google     │  │   Pinecone   │  │  Separate    │  │
│  │  Calendar    │  │   Vector DB  │  │  Workflow    │  │
│  │     API      │  │              │  │  (Flux API)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Tools and Services Used

| Service | Purpose |
|---------|---------|
| **n8n** | Workflow automation platform |
| **OpenAI** | Chat model and embeddings |
| **Google Calendar API** | Calendar read/write |
| **Google Drive API** | Document storage and triggers |
| **Pinecone** | Vector database for RAG |
| **Black Forest Labs (Flux)** | AI image generation |

---

## Key Takeaways

1. **Start simple** - Build basic agents before adding complexity
2. **Use appropriate tools** - Give agents focused, specific tools
3. **Test continuously** - n8n's execution view is invaluable
4. **Modular design** - Separate complex tasks into dedicated workflows
5. **Dynamic expressions** - Use expressions for flexible, dynamic data
6. **RAG for documents** - Vector databases enable efficient document search
7. **Multi-workflow architecture** - Agents can call other workflows as tools
