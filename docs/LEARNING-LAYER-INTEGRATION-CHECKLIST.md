# Learning Layer Integration Checklist

**Created:** December 30, 2024
**Status:** Ready to Implement
**Purpose:** Connect OSQR's Learning Layer to oscar-app

---

## Summary

The Learning Layer in `@osqr/core` is fully built and tested. This checklist documents exactly what needs to be connected in oscar-app to make it work.

| Feature | OSQR Status | oscar-app Status |
|---------|-------------|------------------|
| LLM-based fact extraction | ✅ Built | ⬜ Not connected |
| Conversation end hook | ✅ Built | ⬜ Not connected |
| Synthesis queue & scheduler | ✅ Built | ⬜ Not started |
| External chat ingestion | ✅ Built | ⬜ No API endpoint |
| Utility score updates | ✅ Built | ⬜ Not scheduled |

---

## Integration Tasks

### 1. Start Scheduler on App Boot

**What:** Call `startScheduler()` when the app starts to enable background synthesis processing.

**Where:** `/packages/app-web/lib/osqr/scheduler-init.ts` (new file)

**Code:**
```typescript
import { MemoryVault } from '@osqr/core';

let schedulerStarted = false;

export function ensureSchedulerRunning() {
  if (schedulerStarted) return;

  MemoryVault.startScheduler({
    synthesisIntervalMs: 10_000,      // Process queue every 10s
    utilityUpdateIntervalMs: 86400_000, // Update utility scores daily
    orphanCheckIntervalMs: 3600_000,   // Check for unprocessed conversations hourly
    verbose: process.env.NODE_ENV === 'development',
  });

  schedulerStarted = true;
  console.log('[OSQR] Learning Layer scheduler started');
}
```

**Call from:** `/packages/app-web/app/api/oscar/ask-stream/route.ts` (first request initializes)

- [ ] Create `scheduler-init.ts`
- [ ] Import and call `ensureSchedulerRunning()` in ask-stream route
- [ ] Verify scheduler starts on first chat

---

### 2. End Conversation Hook

**What:** Call `endConversation()` when a user stops chatting to trigger fact extraction.

**Where:** Multiple integration points needed.

#### 2a. Add thread end API endpoint

**File:** `/packages/app-web/app/api/chat/threads/[threadId]/end/route.ts` (new)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MemoryVault } from '@osqr/core';

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { threadId } = params;
  const { synthesizeImmediately = false } = await req.json().catch(() => ({}));

  // Verify ownership
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, workspace: { userId: session.user.id } },
    include: { workspace: true },
  });

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  // End conversation in OSQR
  const result = await MemoryVault.endConversationForUser(
    thread.workspace.id,
    { synthesizeImmediately }
  );

  // Update thread status in database
  await prisma.chatThread.update({
    where: { id: threadId },
    data: {
      status: 'ended',
      endedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    synthesized: result.synthesisResult ? true : false,
    queued: result.queued || false,
  });
}
```

- [ ] Create `/app/api/chat/threads/[threadId]/end/route.ts`
- [ ] Add `status` and `endedAt` fields to ChatThread schema
- [ ] Run `prisma db push` to update schema

#### 2b. Add client-side idle detection

**File:** `/packages/app-web/components/oscar/RefineFireChat.tsx` (modify)

```typescript
// Add to RefineFireChat component
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

// Reset timer on any user activity
const resetIdleTimer = useCallback(() => {
  if (idleTimerRef.current) {
    clearTimeout(idleTimerRef.current);
  }
  idleTimerRef.current = setTimeout(async () => {
    // End conversation after idle
    if (threadId) {
      await fetch(`/api/chat/threads/${threadId}/end`, { method: 'POST' });
    }
  }, IDLE_TIMEOUT_MS);
}, [threadId]);

// Call resetIdleTimer on message send, input change, etc.
useEffect(() => {
  resetIdleTimer();
  return () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  };
}, [messages]); // Reset on new messages
```

- [ ] Add idle timer to RefineFireChat
- [ ] Call end API on timeout
- [ ] Also call end API when user navigates away (beforeunload)

#### 2c. Add cron job for orphaned conversations

**File:** `/packages/app-web/app/api/cron/conversation-cleanup/route.ts` (new)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MemoryVault } from '@osqr/core';

// Called by Vercel cron every 5 minutes
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  // Find threads that haven't been updated in 30 minutes and aren't ended
  const staleThreads = await prisma.chatThread.findMany({
    where: {
      status: 'active',
      updatedAt: { lt: thirtyMinutesAgo },
    },
    include: { workspace: true },
  });

  let processed = 0;
  for (const thread of staleThreads) {
    // End conversation in OSQR (queued, not immediate)
    await MemoryVault.endConversationForUser(thread.workspace.id);

    // Update status
    await prisma.chatThread.update({
      where: { id: thread.id },
      data: { status: 'ended', endedAt: new Date() },
    });

    processed++;
  }

  return NextResponse.json({ processed, total: staleThreads.length });
}
```

- [ ] Create `/app/api/cron/conversation-cleanup/route.ts`
- [ ] Add to `vercel.json` cron config (or use external cron service)

---

### 3. External Chat Ingestion API

**What:** API endpoint to import conversations from Claude, ChatGPT, Slack, etc.

**File:** `/packages/app-web/app/api/chat/ingest/route.ts` (new)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MemoryVault } from '@osqr/core';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    workspaceId,
    source,      // 'claude' | 'chatgpt' | 'slack' | 'custom'
    transcript,  // Raw text or JSON
    projectId,   // Optional: link to a project
  } = body;

  // Verify workspace ownership
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: session.user.id },
  });

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  // Use OSQR's ingestion function
  const result = await MemoryVault.ingestConversation(workspaceId, {
    source,
    transcript,
    metadata: { projectId },
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Also create a ChatThread record for UI visibility
  const thread = await prisma.chatThread.create({
    data: {
      workspaceId,
      projectId,
      title: `Imported from ${source}`,
      mode: 'imported',
      status: 'ended',
      endedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    threadId: thread.id,
    osqrConversationId: result.conversationId,
    messageCount: result.messageCount,
    synthesisJobId: result.jobId,
  });
}
```

- [ ] Create `/app/api/chat/ingest/route.ts`
- [ ] Add UI for importing conversations (optional, can start with API-only)
- [ ] Test with sample Claude/ChatGPT transcripts

---

### 4. Wire Memory Retrieval into Chat

**What:** Use stored memories when generating responses.

**Where:** `/packages/app-web/lib/osqr/memory-wrapper.ts` (already exists, verify it's used)

**Check these files call `getContextForQuery()`:**
- [ ] `/app/api/oscar/ask-stream/route.ts`
- [ ] `/app/api/oscar/ask/route.ts`
- [ ] `/app/api/chat/stream/route.ts`

If not, add:
```typescript
import { getContextForQuery, formatMemoriesForPrompt } from '@/lib/osqr/memory-wrapper';

// Before LLM call
const memories = await getContextForQuery(userMessage, workspaceId);
const memoryContext = formatMemoriesForPrompt(memories);

// Include in system prompt
const systemPrompt = `
${baseSystemPrompt}

## Relevant memories about this user:
${memoryContext}
`;
```

---

### 5. Database Schema Updates

**File:** `/packages/app-web/prisma/schema.prisma`

Add to ChatThread model:
```prisma
model ChatThread {
  // ... existing fields
  status    String   @default("active")  // "active" | "ended" | "archived"
  endedAt   DateTime?
}
```

- [ ] Update schema.prisma
- [ ] Run `pnpm prisma db push` or create migration
- [ ] Update any queries that filter by status

---

### 6. Environment Variables

Add to `.env`:
```bash
# Already should exist for LLM calls
ANTHROPIC_API_KEY=sk-ant-...

# For cron job authentication
CRON_SECRET=your-secret-here
```

- [ ] Verify `ANTHROPIC_API_KEY` is set
- [ ] Add `CRON_SECRET` if using cron cleanup

---

## Verification Steps

After implementing, verify each feature works:

### Test 1: Scheduler Starts
```bash
# Start the app, make a chat request, check logs for:
[OSQR] Learning Layer scheduler started
```

### Test 2: Conversation End
```bash
# In browser console after chatting:
fetch('/api/chat/threads/YOUR_THREAD_ID/end', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
# Should return { success: true, queued: true } or { success: true, synthesized: true }
```

### Test 3: External Ingestion
```bash
curl -X POST http://localhost:3001/api/chat/ingest \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "workspaceId": "your-workspace-id",
    "source": "claude",
    "transcript": "Human: I am building a product called TestWidget.\n\nAssistant: Tell me more!"
  }'
# Should return { success: true, messageCount: 2, ... }
```

### Test 4: Memory Retrieval
```bash
# After ingesting a conversation, ask a question that should trigger memory recall:
"What product am I building?"
# Response should reference "TestWidget" from ingested conversation
```

---

## Files to Create/Modify Summary

| File | Action | Priority |
|------|--------|----------|
| `lib/osqr/scheduler-init.ts` | Create | P0 |
| `app/api/chat/threads/[threadId]/end/route.ts` | Create | P0 |
| `app/api/chat/ingest/route.ts` | Create | P1 |
| `app/api/cron/conversation-cleanup/route.ts` | Create | P2 |
| `app/api/oscar/ask-stream/route.ts` | Modify (add scheduler init) | P0 |
| `components/oscar/RefineFireChat.tsx` | Modify (add idle timer) | P1 |
| `prisma/schema.prisma` | Modify (add status/endedAt) | P0 |
| `lib/osqr/memory-wrapper.ts` | Verify usage | P1 |

---

**Next Steps:** Implement in priority order (P0 first), test each feature, then move to next.
