# Insights Secretary Checklist - Build Document

**Created:** 2025-12-27
**Status:** Ready to Execute
**Scope:** MVP (Core 4 detectors + Bubble integration)
**Estimated Time:** 4-7 hours

---

## Time Tracking

| Phase | Started | Completed | Duration | Notes |
|-------|---------|-----------|----------|-------|
| Phase 1: Secretary Checklist | 2025-12-27 10:00 | 2025-12-27 10:30 | ~30 min | Core 4 detectors built |
| Phase 2: Bubble Integration | 2025-12-27 10:30 | 2025-12-27 10:30 | 0 min | Already exists |
| Phase 3: Testing & Iteration | 2025-12-27 10:30 | | | In progress |
| **Total** | | | | |

---

## Executive Summary

Build the "Secretary Checklist" - OSQR's ability to detect and surface commitments, deadlines, follow-ups, and dependencies from user conversations. This is the missing piece that makes the existing Temporal Intelligence Layer (TIL) actually useful to users.

**What exists:** Full TIL infrastructure (tracking, cognitive profiling, insight queue, API routes)
**What's missing:** Detection logic that extracts actionable items from conversations
**End result:** OSQR proactively says things like "You mentioned following up with Sarah 3 days ago. Did that happen?"

---

## Architecture Context

### Existing Infrastructure (DO NOT REBUILD)

```
packages/app-web/lib/til/
├── index.ts              # Main exports - trackConversation(), getTILContext()
├── session-tracker.ts    # Records events, builds daily snapshots
├── cognitive-tracker.ts  # 50+ behavioral dimensions (1083 lines)
├── pattern-detector.ts   # Velocity trends, recurring themes
├── insights-generator.ts # Generates natural language insights
├── insight-queue.ts      # Priority queue with smart delivery (713 lines)
├── planner.ts           # 90-day planning
└── self-audit.ts        # Self-audit capabilities
```

### Existing API Routes (USE THESE)

```
/api/insights/pending     # GET - Returns next insight to show
/api/insights/preferences # GET/POST - User preferences
/api/insights/[id]/feedback # POST - Record engagement
/api/til/insights         # GET - Full insights, patterns, velocity
```

### Key Integration Points

1. **Ask Route Already Wired:**
   - `packages/app-web/app/api/oscar/ask-stream/route.ts:13` imports `trackConversation`, `getTILContext`
   - Line 413: `tilContext = await getTILContext(workspaceId, message)`
   - Line 640: `await trackConversation(workspaceId, message, cleanAnswer, { mode })`

2. **Insight Queue Already Built:**
   - `queueInsight()` - Add insight to queue
   - `getNextInsight()` - Get next insight based on trigger
   - `markDelivered()` - Mark as shown
   - `recordEngagement()` - Track user response
   - Categories: `contradiction`, `clarify`, `next_step`, `recall`

3. **Database Models:**
   - `UserInsightPreferences` - bubbleMode, maxPerHour, categoryStats
   - `Insight` - Stored insights
   - `ConversationSummary` - Cross-session memory

---

## Build Phases

### Phase 1: Secretary Checklist (Core 4 Categories)

**Goal:** Create detection logic for commitments, deadlines, follow-ups, and dependencies.

#### Step 1.1: Create secretary-checklist.ts

**Location:** `packages/app-web/lib/til/secretary-checklist.ts`

```typescript
// Types needed
interface SecretaryInsight {
  id: string
  category: 'commitment' | 'deadline' | 'follow_up' | 'dependency'
  content: string           // The detected item
  context: string           // Surrounding context from conversation
  sourceThreadId: string    // Where it was detected
  sourceMessageId?: string
  detectedAt: Date
  surfaceAfter: Date        // When to show user
  priority: number          // 1-10
  confidence: number        // 0-1
  resolved: boolean
  resolvedAt?: Date
}

interface DetectionResult {
  found: boolean
  items: SecretaryInsight[]
}
```

**Detection patterns:**

1. **Commitments** - Things user said they'd do:
   - `"I'll..."`, `"I need to..."`, `"I should..."`, `"I'm going to..."`
   - `"Let me..."`, `"I have to..."`, `"I must..."`
   - `"I promised..."`, `"I committed to..."`

2. **Deadlines** - Dates and timeframes:
   - Explicit dates: `"January 15"`, `"12/27"`, `"2025-01-15"`
   - Relative: `"by Friday"`, `"next week"`, `"end of month"`, `"in 3 days"`
   - Events: `"before the meeting"`, `"after launch"`

3. **Follow-ups** - Conversations that stopped mid-decision:
   - Questions without answers: `"Should we...?"`, `"What if...?"`
   - Deferred decisions: `"Let's think about that"`, `"We'll figure that out"`
   - No resolution signal after deliberation

4. **Dependencies** - Things waiting on other things:
   - `"Once X is done"`, `"After we..."`, `"When X happens"`
   - `"Blocked by..."`, `"Waiting on..."`, `"Depends on..."`
   - `"Can't do X until Y"`

#### Step 1.2: Implement Detection Functions

```typescript
// Core functions to implement
export async function detectCommitments(
  workspaceId: string,
  message: string,
  threadId: string
): Promise<DetectionResult>

export async function detectDeadlines(
  workspaceId: string,
  message: string,
  threadId: string
): Promise<DetectionResult>

export async function detectFollowUps(
  workspaceId: string,
  threadId: string
): Promise<DetectionResult>

export async function detectDependencies(
  workspaceId: string,
  message: string,
  threadId: string
): Promise<DetectionResult>

// Run all detectors
export async function runSecretaryCheck(
  workspaceId: string,
  message: string,
  threadId: string
): Promise<SecretaryInsight[]>
```

#### Step 1.3: Scheduling Logic

| Category | Surface Timing |
|----------|----------------|
| Commitments | 2-3 days after if no completion signal |
| Deadlines | 7 days, 3 days, 1 day before |
| Follow-ups | 7+ days of inactivity on topic |
| Dependencies | When blocking item resolves, or 7+ days stale |

#### Step 1.4: Wire to Insight Queue

After detection, push to existing queue:

```typescript
import { queueInsight } from './insight-queue'

// After detecting a commitment
queueInsight(workspaceId, {
  type: 'next_step',  // Use existing category
  title: 'Commitment reminder',
  message: `You mentioned "${commitment.content}" ${daysAgo} days ago. Did that happen?`,
  priority: calculatePriority(commitment),
  trigger: 'idle',
  minIdleSeconds: 30,
  contextTags: ['commitment', commitment.sourceThreadId],
  expiryHours: 72,
})
```

#### Step 1.5: Hook into Ask Route

Modify `packages/app-web/app/api/oscar/ask-stream/route.ts` to run detection after each conversation:

```typescript
// After trackConversation() call (~line 640)
import { runSecretaryCheck } from '@/lib/til/secretary-checklist'

// Run secretary check asynchronously (don't block response)
runSecretaryCheck(workspaceId, message, threadId).catch(err => {
  console.error('[Secretary] Detection failed:', err)
})
```

---

### Phase 2: Bubble Integration

**Goal:** Make insights visible to users in the chat interface.

#### Step 2.1: Verify Bubble Polling

Check `packages/app-web/components/oscar/OSCARBubble.tsx` or `CompanionBubble.tsx`:
- Does it poll `/api/insights/pending`?
- Does it display returned insights?
- Does it have UI for expand/dismiss/act?

If not, add:

```typescript
// Poll for insights on idle
useEffect(() => {
  const checkInsights = async () => {
    if (isIdle && !isTyping) {
      const res = await fetch(`/api/insights/pending?trigger=idle&idleSeconds=${idleSeconds}&deliver=true`)
      const data = await res.json()
      if (data.hasInsight) {
        setActiveInsight(data.insight)
      }
    }
  }

  const interval = setInterval(checkInsights, 30000) // Check every 30s
  return () => clearInterval(interval)
}, [isIdle, isTyping])
```

#### Step 2.2: Insight Display Component

If not exists, create a simple insight card:

```typescript
interface InsightCardProps {
  insight: {
    id: string
    title: string
    message: string
    priority: number
    hasExpandedContent: boolean
  }
  onDismiss: () => void
  onAct: () => void
  onExpand: () => void
}
```

#### Step 2.3: Wire Feedback

When user interacts:

```typescript
const recordFeedback = async (insightId: string, action: 'expanded' | 'acted' | 'dismissed') => {
  await fetch(`/api/insights/${insightId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ engagement: action, rating: action === 'acted' ? 1 : 0 })
  })
}
```

---

### Phase 3: Testing & Iteration

#### Manual Test Cases

1. **Commitment Detection:**
   - Say "I'll send the proposal to Mike tomorrow"
   - Wait 3+ days (or adjust timing for testing)
   - Expect insight: "You mentioned sending a proposal to Mike..."

2. **Deadline Detection:**
   - Say "The launch is scheduled for next Friday"
   - Check insights at 7 days, 3 days, 1 day before
   - Expect countdown reminders

3. **Follow-up Detection:**
   - Start a conversation: "Should we use Stripe or PayPal?"
   - Don't resolve it
   - Wait 7+ days
   - Expect: "You were deciding between Stripe and PayPal..."

4. **Dependency Detection:**
   - Say "Once the auth is done, we can build the dashboard"
   - Mark auth as complete (or mention it's done)
   - Expect: "Auth is done - ready to build the dashboard?"

#### Testing Commands

```bash
# Run the dev server
cd packages/app-web && pnpm dev

# Check database for insights
npx prisma studio

# View logs
# Look for [Secretary] and [TIL] prefixes
```

---

## File Inventory

### Files to CREATE

| File | Purpose |
|------|---------|
| `lib/til/secretary-checklist.ts` | Core detection logic |
| `lib/til/date-parser.ts` | Date extraction utilities (optional, can inline) |

### Files to MODIFY

| File | Changes |
|------|---------|
| `lib/til/index.ts` | Export secretary functions |
| `app/api/oscar/ask-stream/route.ts` | Add secretary check after trackConversation |
| `app/api/oscar/ask/route.ts` | Same as above (non-streaming route) |
| `components/oscar/OSCARBubble.tsx` OR `CompanionBubble.tsx` | Add insight polling/display if missing |

### Files to READ (for context)

| File | Why |
|------|-----|
| `lib/til/insight-queue.ts` | Understand queue API |
| `lib/til/cognitive-tracker.ts` | See existing detection patterns |
| `app/api/insights/pending/route.ts` | Understand API contract |
| `docs/features/OSQR_SECRETARY_CHECKLIST_ADDENDUM.md` | Full spec for all 12 categories |

---

## Database Considerations

### Option A: Use Existing Models (Recommended for MVP)

Store secretary insights in the existing insight queue (in-memory) and `Insight` model.

### Option B: New Model (If Needed Later)

```prisma
model SecretaryItem {
  id            String   @id @default(cuid())
  workspaceId   String
  category      String   // commitment, deadline, follow_up, dependency
  content       String
  context       String?
  sourceThreadId String
  detectedAt    DateTime @default(now())
  surfaceAfter  DateTime
  priority      Int      @default(5)
  confidence    Float    @default(0.8)
  resolved      Boolean  @default(false)
  resolvedAt    DateTime?

  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([category])
  @@index([resolved])
  @@index([surfaceAfter])
}
```

---

## Success Criteria

- [x] Commitments are detected from "I'll...", "I need to..." patterns
- [x] Deadlines are extracted from dates and relative time phrases
- [x] Follow-ups are detected for unresolved conversations
- [x] Dependencies are detected from "blocked by", "once X is done" patterns
- [x] Insights appear in the Bubble after appropriate delay (existing OSCARBubble)
- [x] Users can dismiss insights (existing OSCARBubble)
- [x] Feedback is recorded (existing API routes)
- [ ] No regressions in existing TIL functionality (needs testing)
- [x] All detection runs asynchronously (doesn't slow down responses)

---

## Known Gotchas

1. **Date parsing is tricky** - Consider using `chrono-node` library or keep patterns simple
2. **False positives** - Start with high confidence threshold (0.8+)
3. **Insight fatigue** - Respect existing interrupt budget (3/hour default)
4. **Async execution** - Don't block the ask route response
5. **Privacy** - Secretary insights should respect privacy tier settings

---

## Questions to Ask Kable During Testing

1. What's the preferred UX for insight display? (Toast, inline, sidebar?)
2. Should insights persist across sessions or be ephemeral?
3. What's the acceptable false positive rate?
4. Should we add a "snooze" option for insights?
5. Do you want a daily briefing mode that batches insights?

---

## Future Phases (Not This Build)

After MVP is working:

- **Phase 4:** Remaining 8 categories (recurring patterns, contradictions, etc.)
- **Phase 5:** Settings UI for category toggles
- **Phase 6:** Auto-title conversations
- **Phase 7:** ChatGPT import interview

---

## References

- Full spec: `docs/features/OSQR_SECRETARY_CHECKLIST_ADDENDUM.md`
- Build plan: `docs/features/INSIGHTS_BUILD_PLAN.md`
- TIL architecture: `docs/architecture/ARCHITECTURE.md` (section 9.6)
- Insight queue: `lib/til/insight-queue.ts`

---

**End of Build Document**
