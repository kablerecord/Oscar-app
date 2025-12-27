# Background Indexing Build Plan

**Status:** Ready to implement
**Priority:** V1.0 Critical Feature
**Purpose:** Ensure document indexing completes even if user closes browser or loses connection

---

## What We're Building

A resilient background job system that ensures all uploaded documents get indexed (embeddings generated) regardless of browser state. Once a user sees "Upload 100%", the indexing will complete server-side without requiring them to keep the page open.

**Current Problem:**
- User uploads 100 documents → Upload completes (100%)
- Browser calls API to index → User closes tab
- Indexing stops at 42% → Documents are stuck without embeddings
- OSQR can't search those documents

**After This Feature:**
- User uploads 100 documents → Upload completes (100%)
- Server queues indexing jobs → User can close browser
- Cron job processes queue → All documents indexed
- User returns → Sees 100% indexed

---

## Existing Infrastructure (Already Built)

| Component | Location | What It Does |
|-----------|----------|--------------|
| **Task Queue** | `lib/tasks/queue.ts` | PostgreSQL-backed job queue |
| **Task Executor** | `lib/tasks/executor.ts` | Processes jobs with handlers, retries, timeouts |
| **BackgroundTask Model** | `prisma/schema.prisma` | Job storage with status, retries, priority |
| **Task API** | `app/api/tasks/route.ts` | Create, list, cancel tasks |
| **Process API** | `app/api/tasks/process/route.ts` | Trigger job processing |
| **Embedding Generation** | `lib/ai/embeddings.ts` | Creates vector embeddings |
| **Index Document API** | `app/api/vault/index-document/route.ts` | Current SSE-based indexing (to be replaced) |
| **Fast Upload API** | `app/api/vault/upload-fast/route.ts` | Saves docs with `needsIndexing: true` |

---

## Files to Create/Modify

```
packages/app-web/lib/tasks/
├── handlers/
│   └── index-document.ts        # NEW: Task handler for document indexing

packages/app-web/app/api/
├── cron/
│   └── process-indexing/
│       └── route.ts             # NEW: Cron endpoint to trigger processing
├── vault/
│   ├── upload-fast/route.ts     # MODIFY: Enqueue task after upload
│   ├── indexing-status/
│   │   └── route.ts             # NEW: Get indexing status for UI polling
│   └── reindex-pending/route.ts # MODIFY: Use task queue instead of SSE

packages/app-web/components/vault/
└── VaultStats.tsx               # MODIFY: Poll status instead of SSE
```

---

## Implementation Phases

### Phase 1: Create Document Indexing Task Handler
**Goal:** Register a task handler that indexes a single document

**File:** `lib/tasks/handlers/index-document.ts`

```typescript
import { TaskHandler, TaskContext } from '../executor'
import { prisma } from '@/lib/db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '@/lib/ai/embeddings'

export interface IndexDocumentPayload {
  documentId: string
  workspaceId: string
}

export const indexDocumentHandler: TaskHandler<IndexDocumentPayload> = {
  type: 'index-document',

  async execute(payload: IndexDocumentPayload, context: TaskContext) {
    const { documentId, workspaceId } = payload

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { _count: { select: { chunks: true } } }
    })

    if (!document) {
      throw new Error(`Document ${documentId} not found`)
    }

    // Skip if already indexed
    if (document._count.chunks > 0) {
      return { status: 'skipped', reason: 'already indexed' }
    }

    const fileContent = document.textContent || ''
    if (!fileContent.trim()) {
      throw new Error('Document has no content')
    }

    // Chunk the text
    const chunks = chunkText(fileContent, 1000, 100)

    context.updateProgress(10, `Indexing ${document.title}`)

    // Generate embeddings for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await generateEmbedding(chunk)
      const embeddingStr = formatEmbeddingForPostgres(embedding)

      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, "documentId", content, "chunkIndex", embedding, "createdAt")
        VALUES (
          gen_random_uuid(),
          ${documentId},
          ${chunk},
          ${i},
          ${embeddingStr}::vector,
          NOW()
        )
      `

      // Update progress
      const progress = 10 + Math.round((i + 1) / chunks.length * 85)
      context.updateProgress(progress, `Chunk ${i + 1}/${chunks.length}`)
    }

    // Update document metadata
    const metadata = (document.metadata as Record<string, unknown>) || {}
    await prisma.document.update({
      where: { id: documentId },
      data: {
        metadata: {
          ...metadata,
          needsIndexing: false,
          indexedAt: new Date().toISOString(),
        }
      }
    })

    context.updateProgress(100, 'Complete')

    return {
      status: 'indexed',
      documentId,
      chunksCreated: chunks.length
    }
  }
}

// Chunk text helper (same as existing)
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  const maxChunks = Math.ceil(text.length / (chunkSize - overlap)) + 10
  let iterations = 0

  while (start < text.length && iterations < maxChunks) {
    iterations++
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastPeriod, lastNewline)
      if (breakPoint > chunkSize / 2) {
        chunk = chunk.slice(0, breakPoint + 1)
      }
    }

    const trimmedChunk = chunk.trim()
    if (trimmedChunk.length > 0) {
      chunks.push(trimmedChunk)
    }

    const advance = Math.max(chunk.length - overlap, 1)
    start += advance

    if (start <= iterations - 1) {
      start = end
    }
  }

  return chunks
}
```

**Checklist:**
- [ ] Create `lib/tasks/handlers/index-document.ts`
- [ ] Implement document fetching and validation
- [ ] Implement chunking logic
- [ ] Implement embedding generation with progress updates
- [ ] Register handler in `lib/tasks/executor.ts`
- [ ] Write unit tests

---

### Phase 2: Register Handler in Executor
**Goal:** Add the new handler to the task executor

**File:** `lib/tasks/executor.ts` (modify)

```typescript
// Add import
import { indexDocumentHandler } from './handlers/index-document'

// Register in handlers map
const handlers: Record<string, TaskHandler> = {
  'research': researchHandler,
  'summary-update': summaryHandler,
  'process-document': processDocumentHandler,
  'index-document': indexDocumentHandler,  // ADD THIS
}
```

**Checklist:**
- [ ] Import handler in executor.ts
- [ ] Add to handlers map
- [ ] Verify handler is callable

---

### Phase 3: Modify Upload Flow to Enqueue Tasks
**Goal:** After fast upload, enqueue an indexing task instead of relying on browser

**File:** `app/api/vault/upload-fast/route.ts` (modify)

```typescript
// At the end of successful upload, add:
import { enqueueTask } from '@/lib/tasks/queue'

// After document creation:
await enqueueTask({
  type: 'index-document',
  payload: {
    documentId: document.id,
    workspaceId,
  },
  workspaceId,
  priority: 'normal',
})

return Response.json({
  success: true,
  documentId: document.id,
  fileName,
  wordCount,
  charCount,
  indexingQueued: true,  // NEW: indicate background indexing
})
```

**Checklist:**
- [ ] Import enqueueTask in upload-fast route
- [ ] Add task enqueue after document creation
- [ ] Update response to indicate indexing is queued
- [ ] Test upload creates task in BackgroundTask table

---

### Phase 4: Create Cron Endpoint
**Goal:** Endpoint that Railway/external cron can hit to process pending tasks

**File:** `app/api/cron/process-indexing/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { processNextTask } from '@/lib/tasks/executor'

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Process multiple tasks in one cron run (batch processing)
  const batchSize = 5
  const results = []

  for (let i = 0; i < batchSize; i++) {
    const result = await processNextTask('index-document')
    if (!result) break  // No more tasks
    results.push(result)
  }

  return Response.json({
    success: true,
    processed: results.length,
    results,
  })
}

// Also support GET for health checks
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Return queue status
  const pending = await prisma.backgroundTask.count({
    where: { type: 'index-document', status: 'pending' }
  })
  const running = await prisma.backgroundTask.count({
    where: { type: 'index-document', status: 'running' }
  })
  const completed = await prisma.backgroundTask.count({
    where: { type: 'index-document', status: 'completed' }
  })
  const failed = await prisma.backgroundTask.count({
    where: { type: 'index-document', status: 'failed' }
  })

  return Response.json({
    status: 'healthy',
    queue: { pending, running, completed, failed }
  })
}
```

**Checklist:**
- [ ] Create `app/api/cron/process-indexing/route.ts`
- [ ] Add CRON_SECRET authentication
- [ ] Implement batch processing
- [ ] Add queue status endpoint
- [ ] Test with manual curl request

---

### Phase 5: Create Indexing Status API
**Goal:** API for UI to poll indexing progress

**File:** `app/api/vault/indexing-status/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return Response.json({ error: 'workspaceId required' }, { status: 400 })
  }

  // Get document counts
  const totalDocuments = await prisma.document.count({
    where: { workspaceId }
  })

  const indexedDocuments = await prisma.document.count({
    where: {
      workspaceId,
      chunks: { some: {} }
    }
  })

  // Get pending tasks
  const pendingTasks = await prisma.backgroundTask.count({
    where: {
      workspaceId,
      type: 'index-document',
      status: 'pending'
    }
  })

  const runningTasks = await prisma.backgroundTask.count({
    where: {
      workspaceId,
      type: 'index-document',
      status: 'running'
    }
  })

  const failedTasks = await prisma.backgroundTask.count({
    where: {
      workspaceId,
      type: 'index-document',
      status: 'failed'
    }
  })

  // Get current running task info
  const currentTask = await prisma.backgroundTask.findFirst({
    where: {
      workspaceId,
      type: 'index-document',
      status: 'running'
    },
    select: {
      id: true,
      payload: true,
      startedAt: true
    }
  })

  let currentDocument = null
  if (currentTask) {
    const payload = currentTask.payload as { documentId?: string }
    if (payload.documentId) {
      currentDocument = await prisma.document.findUnique({
        where: { id: payload.documentId },
        select: { title: true }
      })
    }
  }

  return Response.json({
    totalDocuments,
    indexedDocuments,
    indexedPercent: totalDocuments > 0
      ? Math.round((indexedDocuments / totalDocuments) * 100)
      : 100,
    pendingTasks,
    runningTasks,
    failedTasks,
    isIndexing: runningTasks > 0 || pendingTasks > 0,
    currentDocument: currentDocument?.title || null
  })
}
```

**Checklist:**
- [ ] Create `app/api/vault/indexing-status/route.ts`
- [ ] Add authentication
- [ ] Return comprehensive status
- [ ] Include current document being indexed
- [ ] Test endpoint

---

### Phase 6: Update VaultStats to Poll
**Goal:** Replace SSE with polling for status updates

**File:** `components/vault/VaultStats.tsx` (modify)

```typescript
// Replace the SSE-based reindexing with polling

const [indexingStatus, setIndexingStatus] = useState({
  totalDocuments: totalDocuments,
  indexedDocuments: indexedDocuments,
  isIndexing: false,
  pendingTasks: 0,
  currentDocument: null as string | null,
})

// Poll for status every 2 seconds when indexing is in progress
useEffect(() => {
  let interval: NodeJS.Timeout | null = null

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/vault/indexing-status?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setIndexingStatus(data)

        // If indexing just completed, refresh the page
        if (!data.isIndexing && indexingStatus.isIndexing) {
          window.location.reload()
        }
      }
    } catch (error) {
      console.error('Failed to fetch indexing status:', error)
    }
  }

  // Initial fetch
  fetchStatus()

  // Start polling if not fully indexed
  if (indexedDocuments < totalDocuments) {
    interval = setInterval(fetchStatus, 2000)
  }

  return () => {
    if (interval) clearInterval(interval)
  }
}, [workspaceId, totalDocuments, indexedDocuments])

// Use indexingStatus for display instead of reindexState
```

**Checklist:**
- [ ] Remove SSE-based reindexing logic
- [ ] Add polling with useEffect
- [ ] Update UI to use polled status
- [ ] Auto-refresh when complete
- [ ] Handle errors gracefully
- [ ] Test polling works

---

### Phase 7: Backfill Existing Unindexed Documents
**Goal:** Create tasks for documents that are already uploaded but not indexed

**File:** `scripts/backfill-indexing-tasks.ts`

```typescript
import { prisma } from '../packages/app-web/lib/db/prisma'
import { enqueueTask } from '../packages/app-web/lib/tasks/queue'

async function backfillIndexingTasks() {
  // Find all documents without chunks
  const unindexedDocs = await prisma.document.findMany({
    where: {
      chunks: { none: {} }
    },
    select: {
      id: true,
      workspaceId: true,
      title: true
    }
  })

  console.log(`Found ${unindexedDocs.length} unindexed documents`)

  for (const doc of unindexedDocs) {
    // Check if task already exists
    const existingTask = await prisma.backgroundTask.findFirst({
      where: {
        type: 'index-document',
        payload: { path: ['documentId'], equals: doc.id },
        status: { in: ['pending', 'running'] }
      }
    })

    if (!existingTask) {
      await enqueueTask({
        type: 'index-document',
        payload: { documentId: doc.id, workspaceId: doc.workspaceId },
        workspaceId: doc.workspaceId,
        priority: 'low',  // Lower priority than new uploads
      })
      console.log(`Queued: ${doc.title}`)
    }
  }

  console.log('Backfill complete')
}

backfillIndexingTasks()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
```

**Checklist:**
- [ ] Create backfill script
- [ ] Handle existing tasks (no duplicates)
- [ ] Use low priority for backfill
- [ ] Test script locally
- [ ] Document how to run

---

### Phase 8: Configure Cron Trigger
**Goal:** Set up automatic cron execution

**Options:**
1. **Railway Cron** (if available on your plan)
2. **External service** (EasyCron, cron-job.org, Uptime Robot)
3. **Vercel Cron** (if using Vercel)

**Cron schedule:** Every 30 seconds or every minute

**Curl command for testing:**
```bash
curl -X POST https://app.osqr.ai/api/cron/process-indexing \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Environment variable needed:**
```env
CRON_SECRET=your-secure-random-string
```

**Checklist:**
- [ ] Add CRON_SECRET to Railway environment
- [ ] Choose cron provider
- [ ] Configure cron job (every 30-60 seconds)
- [ ] Verify cron is hitting endpoint
- [ ] Monitor for errors

---

### Phase 9: Cleanup Old SSE Endpoints
**Goal:** Remove or deprecate browser-dependent endpoints

**Files to clean up:**
- `app/api/vault/reindex-pending/route.ts` - Can be simplified or removed
- `app/api/vault/index-document/route.ts` - Keep for single-doc manual indexing, or remove

**Checklist:**
- [ ] Decide what to keep vs remove
- [ ] Update or remove old endpoints
- [ ] Update any other code referencing them

---

## Testing Plan

### Unit Tests
```typescript
describe('index-document handler', () => {
  it('should index a document with content', async () => {
    // Create test document
    // Run handler
    // Verify chunks created
  })

  it('should skip already indexed documents', async () => {
    // Create document with chunks
    // Run handler
    // Verify no duplicate chunks
  })

  it('should handle empty documents gracefully', async () => {
    // Create empty document
    // Run handler
    // Expect error or skip
  })

  it('should retry on transient failures', async () => {
    // Mock embedding API failure
    // Verify retry logic
  })
})
```

### Integration Tests
```typescript
describe('background indexing flow', () => {
  it('upload creates background task', async () => {
    // Upload file via API
    // Check BackgroundTask table
    // Verify task exists with correct payload
  })

  it('cron endpoint processes tasks', async () => {
    // Create pending task
    // Call cron endpoint
    // Verify task completed
    // Verify document has chunks
  })

  it('status API returns accurate counts', async () => {
    // Create mix of indexed/unindexed docs
    // Create pending tasks
    // Call status API
    // Verify counts match
  })
})
```

### Manual Test Scenarios
1. Upload 10 files, close browser immediately → Return later, verify all indexed
2. Upload during slow network, disconnect → Verify indexing continues
3. Simulate API rate limit → Verify retry works
4. Upload duplicate file → Verify no duplicate indexing tasks

**Checklist:**
- [ ] Write unit tests for handler
- [ ] Write integration tests for flow
- [ ] Manual test: browser close scenario
- [ ] Manual test: network disconnect
- [ ] All tests passing

---

## Error Handling

| Error | Handling |
|-------|----------|
| Document not found | Fail task, no retry |
| Embedding API rate limit | Retry with exponential backoff |
| Embedding API error | Retry up to 3 times |
| Database error | Retry up to 3 times |
| Timeout (>5 min) | Fail task, mark for investigation |

---

## Monitoring

### Key Metrics to Track
- Tasks pending count
- Tasks failed count
- Average task duration
- Indexing completion rate

### Alerts to Set Up
- Failed tasks > 10 in 1 hour
- Pending tasks > 100 (queue backup)
- No tasks processed in 10 minutes (cron failure)

---

## Success Criteria

The feature is complete when:

1. [ ] User uploads documents → Indexing queued as background task
2. [ ] User can close browser → Indexing continues server-side
3. [ ] Cron job processes pending tasks reliably
4. [ ] UI shows accurate indexing progress via polling
5. [ ] Existing 1,223 documents can be backfilled
6. [ ] Failed tasks are retried automatically
7. [ ] All tests passing

---

## Environment Variables

```env
# Required
CRON_SECRET=your-secure-random-string

# Already configured
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
```

---

## Deployment Steps

1. Deploy code changes to Railway
2. Add CRON_SECRET to Railway environment variables
3. Run backfill script for existing documents
4. Configure external cron service
5. Monitor for 24 hours
6. Clean up old SSE endpoints

---

## Autonomous Execution Notes

When building autonomously:

1. **Check existing task queue code** - Match patterns in `lib/tasks/`
2. **Reuse chunking logic** - Copy from existing `index-document/route.ts`
3. **Test locally first** - Run handler directly before wiring to API
4. **Commit after each phase** - Clean git history
5. **Document blockers** - Note any issues for Kable to resolve

---

## Version History

| Date | Changes |
|------|---------|
| 2024-12-26 | Initial build plan created |
