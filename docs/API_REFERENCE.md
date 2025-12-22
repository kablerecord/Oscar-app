# OSQR API Reference

**Version:** 1.0
**Updated:** 2025-12-20

---

## Overview

The OSQR API provides endpoints for AI interactions, document management, and budget tracking. All endpoints require authentication via NextAuth session.

---

## Base URL

```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

---

## Authentication

All API routes require an authenticated session. Include the session cookie from NextAuth:

```typescript
// Automatic with fetch in Next.js
const response = await fetch('/api/oscar/ask', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello' }),
})
```

---

## Endpoints

### POST /api/oscar/ask

Send a message to OSQR and receive an AI response.

**Request:**
```typescript
{
  message: string       // User message (required)
  workspaceId: string   // Workspace context (required)
  threadId?: string     // Existing thread to continue
  projectId?: string    // Project context
  mode?: 'quick' | 'thoughtful' | 'contemplate' | 'council'
}
```

**Response:**
```typescript
{
  response: string      // AI response
  threadId: string      // Thread ID for continuation
  model: string         // Model used
  tokens: {
    input: number
    output: number
  }
  routing: {
    taskType: string
    complexity: string
    confidence: number
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/oscar/ask \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"message": "What is machine learning?", "workspaceId": "ws123"}'
```

**Error Responses:**
| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Missing message` | Message field required |
| 401 | `Unauthorized` | No valid session |
| 403 | `Constitutional violation` | Input blocked |
| 429 | `Budget exhausted` | Daily limit reached |

---

### POST /api/oscar/ask-stream

Streaming version of the ask endpoint. Returns Server-Sent Events.

**Request:** Same as `/api/oscar/ask`

**Response:** SSE stream
```
data: {"type": "chunk", "content": "Machine"}
data: {"type": "chunk", "content": " learning"}
data: {"type": "chunk", "content": " is..."}
data: {"type": "done", "threadId": "th123", "model": "claude-sonnet-4"}
```

**Example (JavaScript):**
```typescript
const eventSource = new EventSource('/api/oscar/ask-stream?...')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'chunk') {
    appendToResponse(data.content)
  } else if (data.type === 'done') {
    closeStream()
  }
}
```

---

### GET /api/oscar/budget

Get current budget status for the authenticated user.

**Response:**
```typescript
{
  tier: 'lite' | 'pro' | 'master' | 'enterprise'
  canQuery: boolean
  queriesRemaining: number
  queriesTotal: number
  budgetState: 'healthy' | 'warning' | 'depleted'
  statusMessage: string
  upgradeAvailable: boolean
  featureAccess: {
    contemplateMode: boolean
    councilMode: boolean
    voiceMode: boolean
    customPersona: boolean
    prioritySupport: boolean
  }
}
```

**Example:**
```bash
curl http://localhost:3001/api/oscar/budget \
  -H "Cookie: next-auth.session-token=..."
```

---

### POST /api/vault/upload

Upload a document to the user's vault.

**Request:** Multipart form data
```
file: File           // Document file (required)
workspaceId: string  // Workspace context (required)
projectId?: string   // Optional project association
```

**Response:**
```typescript
{
  success: boolean
  documentId: string
  filename: string
  chunks: number           // Number of chunks created
  processingTimeMs: number
}
```

**Supported file types:**
- `.md`, `.txt` - Text documents
- `.ts`, `.js`, `.py`, `.go`, etc. - Code files
- `.json`, `.yaml`, `.yml` - Data files
- `.pdf`, `.docx` - Binary documents (text extracted)

**Example:**
```bash
curl -X POST http://localhost:3001/api/vault/upload \
  -H "Cookie: next-auth.session-token=..." \
  -F "file=@document.md" \
  -F "workspaceId=ws123"
```

**Error Responses:**
| Status | Error | Description |
|--------|-------|-------------|
| 400 | `No file provided` | File required |
| 400 | `Unsupported file type` | File type not supported |
| 413 | `File too large` | Exceeds tier limit |

---

### GET /api/vault/search

Search documents in the user's vault.

**Query Parameters:**
```
q: string            // Search query (required)
workspaceId: string  // Workspace context (required)
projectId?: string   // Filter by project
limit?: number       // Max results (default: 10)
```

**Response:**
```typescript
{
  results: Array<{
    documentId: string
    documentName: string
    chunkContent: string
    relevanceScore: number
    projectId: string | null
    createdAt: string
  }>
}
```

**Example:**
```bash
curl "http://localhost:3001/api/vault/search?q=API%20design&workspaceId=ws123" \
  -H "Cookie: next-auth.session-token=..."
```

---

### DELETE /api/vault/[documentId]

Delete a document from the vault.

**Response:**
```typescript
{
  success: boolean
  deletedId: string
}
```

---

### GET /api/oscar/bubble

Get current bubble suggestions for the user.

**Query Parameters:**
```
workspaceId: string  // Workspace context (required)
```

**Response:**
```typescript
{
  canShow: boolean
  currentFocusMode: 'available' | 'focused' | 'dnd'
  suggestions: Array<{
    id: string
    type: 'reminder' | 'insight' | 'suggestion'
    title: string
    message: string
    priority: number
    action?: {
      label: string
      type: 'dismiss' | 'snooze' | 'act' | 'view'
    }
  }>
}
```

---

### POST /api/oscar/bubble/dismiss

Dismiss a bubble suggestion.

**Request:**
```typescript
{
  bubbleId: string   // Bubble to dismiss (required)
  reason?: string    // Optional feedback
}
```

**Response:**
```typescript
{
  success: boolean
}
```

---

## Error Response Format

All errors follow this format:

```typescript
{
  error: {
    code: string        // Machine-readable error code
    message: string     // Human-readable message
    details?: object    // Additional context
  }
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONSTITUTIONAL_VIOLATION` | 403 | Content blocked |
| `BUDGET_EXHAUSTED` | 429 | Daily limit reached |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

Rate limits are enforced per user:

| Tier | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Lite | 30 | 50 |
| Pro | 60 | 100 |
| Master | 120 | 200 |
| Enterprise | Custom | Custom |

When rate limited, the API returns `429 Too Many Requests` with:
```typescript
{
  error: {
    code: "RATE_LIMITED",
    message: "Too many requests",
    retryAfter: 60  // Seconds until next request allowed
  }
}
```

---

## Webhook Events

OSQR can send webhooks for certain events (Enterprise tier only):

### Document Indexed
```typescript
{
  event: "document.indexed",
  timestamp: "2024-01-01T00:00:00Z",
  data: {
    documentId: string
    workspaceId: string
    filename: string
    chunks: number
  }
}
```

### Budget Warning
```typescript
{
  event: "budget.warning",
  timestamp: "2024-01-01T00:00:00Z",
  data: {
    userId: string
    tier: string
    remaining: number
    threshold: number
  }
}
```

---

## SDK Usage

### lib/osqr/index.ts Exports

For internal usage, import from the OSQR core library:

```typescript
import {
  // Constitutional
  validateUserInput,
  validateAIOutput,
  quickScreenInput,

  // Router
  classifyQuestion,
  getRecommendedModel,
  routeRequest,

  // Memory
  retrieveContext,
  storeMessage,
  searchMemories,
  queryCrossProjectMemories,

  // Documents
  indexDocumentToVault,
  searchDocuments,

  // Throttle
  canMakeQuery,
  getThrottleStatus,
  processThrottledQuery,
  hasFeatureAccess,

  // Config
  featureFlags,
} from '@/lib/osqr'
```

---

## Versioning

The API is currently at v1 (implicit). Future versions will use URL prefixes:

```
/api/v1/oscar/ask
/api/v2/oscar/ask
```

Deprecation notices will be announced 90 days before breaking changes.
