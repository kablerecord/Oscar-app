# OSQR Bubble Interface Specification

## Metadata
- **Version**: 1.0
- **Created**: December 19, 2024
- **Status**: Ready for Implementation
- **Dependencies**: Temporal Intelligence Layer, Memory Vault, Constitutional Layer
- **Blocked By**: Temporal Intelligence Layer (must exist to feed priority queue)
- **Enables**: VS Code Extension (v2.0), Plugin-to-Bubble Queue (v2.0), ML-based Learning (v2.0)

## Executive Summary

The Bubble Interface is OSQR's proactive intelligence layer—the mechanism by which OSQR surfaces information, suggestions, and reminders without being asked. This transforms OSQR from a reactive chatbot into a Jarvis-like intelligence partner that anticipates user needs. The core "wow" factor is timing: surfacing exactly the right information at exactly the right moment.

## Scope

### In Scope
- Web interface Bubble component
- Mobile interface Bubble component
- Voice interface (basic audio cues and conversation flow)
- Confidence scoring algorithm with fixed weights
- Interrupt budget system (user-configurable daily/hourly caps)
- Focus Mode (three user-selectable tiers)
- Cross-device synchronization (dismiss once = dismissed everywhere)
- User feedback processing ("show less like this")
- Integration with Temporal Intelligence priority queue
- Jarvis-style personality and voice guidelines

### Out of Scope (Deferred)
- VS Code extension integration (v2.0)
- IDE/editor integrations (v2.0)
- Plugin-to-Bubble queue (creator plugins adding items) (v2.0)
- Machine learning-based confidence scoring (v2.0)
- Adaptive/auto-adjusting interrupt budgets (v2.0)
- Attention pattern learning from implicit signals (v2.0)
- CRP batching (intelligent grouping of low-priority items) (v2.0)
- MentorScript integration (user-defined rules) (v2.0)
- Context-aware auto-switching of Focus Mode (v2.0)
- Ghost text / inline code suggestions (v2.0)
- Demo Recording Mode (pre-VoiceQuote demo)

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│                         OSQR CORE                           │
├─────────────────────────────────────────────────────────────┤
│  Temporal Intelligence Layer (Existing)                     │
│  ├── Priority Queue ──────────────────────┐                 │
│  ├── Deadline Tracking                    │                 │
│  ├── Commitment Extraction                │                 │
│  └── Dependency Inference                 │                 │
├───────────────────────────────────────────┼─────────────────┤
│  BUBBLE INTERFACE LAYER (THIS SPEC)       ▼                 │
│  ├── Confidence Scorer ◄── User Context, Time, Focus Mode  │
│  ├── Interrupt Budget Manager                               │
│  ├── Interface Adapters (web, mobile, voice)                │
│  ├── Cross-Device Sync                                      │
│  └── User Feedback Processor                                │
├─────────────────────────────────────────────────────────────┤
│  Memory Vault (Existing)                                    │
│  ├── PKV (Personal Knowledge Vault)                         │
│  ├── User Preferences                                       │
│  └── Bubble History (dismissals, engagements)               │
├─────────────────────────────────────────────────────────────┤
│  Constitutional Layer (Existing)                            │
│  └── Proactivity Ethics                                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Temporal Intelligence Priority Queue
            │
            ▼
    ┌───────────────┐
    │  Confidence   │◄──── User Context (current activity)
    │    Scorer     │◄──── Time of Day
    │               │◄──── Focus Mode Status
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │   Interrupt   │◄──── Daily Budget
    │    Budget     │◄──── Budget Remaining
    │   Manager     │◄──── Item Priority
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │   Interface   │───► Web Bubble Component
    │   Adapters    │───► Mobile Bubble Component
    │               │───► Voice Cue System
    └───────────────┘
            │
            ▼
    ┌───────────────┐
    │  Cross-Device │
    │     Sync      │───► Memory Vault (persist state)
    └───────────────┘
```

### Core Data Structures

```typescript
// Input from Temporal Intelligence
interface TemporalItem {
  id: string
  type: "deadline" | "commitment" | "reminder" | "connection" | "pattern"
  content: string
  source: string                    // Where OSQR learned this
  priority: number                  // 0-100 from Temporal Intelligence
  deadline?: Date
  dependencies?: string[]
  entities?: string[]               // People, projects, companies
  topics?: string[]                 // Keywords, themes
  optimalWindow?: TimeWindow        // Best time to surface
}

interface TimeWindow {
  start: Date
  end: Date
}

// Bubble-ready format
interface BubbleItem {
  id: string
  temporalItemId: string            // Link back to source

  // Display
  message: string                   // Main text (Jarvis voice)
  subtext?: string                  // Supporting detail

  // Scoring
  confidenceScore: number           // 0-100, calculated by Bubble
  basePriority: number              // From Temporal Intelligence

  // Actions
  primaryAction?: {
    label: string
    handler: () => void
  }

  // Metadata
  category: string
  surfacedAt?: number               // When shown to user
  state: "pending" | "surfaced" | "dismissed" | "engaged" | "deferred"
}

// User state stored in Memory Vault
interface BubbleUserState {
  // Preferences
  preferences: {
    focusMode: "available" | "focused" | "dnd"
    dailyBudget: number             // 10-30, default 15
    soundEnabled: boolean
    hapticEnabled: boolean
  }

  // Category weights (adjusted by feedback)
  categoryWeights: Record<string, number>

  // Current budget state
  budget: {
    daily: {
      total: number
      used: number
      lastReset: Date
    }
    hourly: {
      current: number
      windowStart: Date
    }
  }

  // Deferred items
  deferred: Array<{
    itemId: string
    deferredAt: Date
    deferredUntil: Date
  }>

  // History for learning
  history: Array<{
    itemId: string
    category: string
    confidenceScore: number
    action: "dismissed" | "engaged" | "deferred"
    timestamp: Date
    timeToAction: number            // ms from surface to action
  }>
}

// Interrupt budget structure
interface InterruptBudget {
  daily: {
    total: number           // Default 15, user-configurable (10-30)
    used: number
    remaining: number
    resetTime: string       // "00:00" midnight local time
  }

  hourly: {
    focused: number         // 2 during Focus Mode
    available: number       // 5 during Available Mode
    current: number
  }

  emergency: {
    enabled: boolean
    threshold: number       // 98 - only 98+ confidence bypasses
  }
}

// Focus mode configurations
interface FocusModeConfig {
  name: "available" | "focused" | "dnd"
  bubbleStates: Array<"passive" | "ready" | "active" | "priority">
  hourlyLimit: number
  passiveIndicators: boolean
  soundEnabled: boolean
  hapticEnabled: boolean
  queueAll?: boolean        // For DND mode
}

// Bubble feedback types
type BubbleFeedback =
  | "helpful"               // User found this valuable
  | "less_like_this"        // User wants fewer of this category
  | "wrong_time"            // Good info, bad timing
  | "not_relevant"          // Shouldn't have surfaced at all

// Bubble actions interface
interface BubbleActions {
  onExpand: () => void
  onDismiss: (feedback?: BubbleFeedback | null) => void
  onEngage: () => void
  onDefer: (until: "tonight" | "tomorrow" | "monday" | Date) => void
}

// Sync action types
interface SyncAction {
  scope: "global"
  persistence: "permanent" | "until_trigger" | "until_changed" | "until_reset"
}

// Voice cue configuration
interface VoiceCue {
  phrase: string | null
  waitForResponse?: boolean
  timeout?: number
  directSurface?: boolean
}

// Mobile haptic patterns
interface HapticPattern {
  type: "light" | "medium" | "heavy"
  duration: number          // milliseconds
}
```

### Key Algorithms

#### Confidence Scoring Algorithm

```typescript
/**
 * Calculate confidence score for a Bubble item
 * This is the brain of the Bubble - what makes timing feel magical
 *
 * CONFIDENCE SCORE =
 *   (Base Priority × 0.35) +
 *   (Time Sensitivity × 0.25) +
 *   (Context Relevance × 0.25) +
 *   (Historical Engagement × 0.15)
 *
 * Range: 0-100
 */
function calculateConfidenceScore(
  item: TemporalItem,
  currentContext: UserContext,
  userHistory: BubbleHistory[],
  userPreferences: BubbleUserState
): number {
  const basePriority = item.priority // 0-100 from Temporal Intelligence
  const timeSensitivity = calculateTimeSensitivity(item, Date.now())
  const contextRelevance = calculateContextRelevance(item, currentContext)
  const historicalEngagement = calculateHistoricalEngagement(item, userHistory)

  const rawScore =
    (basePriority * 0.35) +
    (timeSensitivity * 0.25) +
    (contextRelevance * 0.25) +
    (historicalEngagement * 0.15)

  // Apply user category weight override
  const categoryWeight = userPreferences.categoryWeights[item.category] || 1.0
  const adjustedScore = rawScore * categoryWeight

  return Math.min(100, Math.max(0, Math.round(adjustedScore)))
}

/**
 * Time Sensitivity: Is NOW the right moment?
 */
function calculateTimeSensitivity(item: TemporalItem, currentTime: number): number {
  // Deadline proximity
  if (item.deadline) {
    const hoursUntil = (item.deadline.getTime() - currentTime) / (1000 * 60 * 60)
    if (hoursUntil < 2) return 100      // Critical window
    if (hoursUntil < 24) return 80      // Today
    if (hoursUntil < 72) return 60      // Next 3 days
    if (hoursUntil < 168) return 40     // This week
    return 20                            // Further out
  }

  // Optimal timing windows
  if (item.optimalWindow && isWithinWindow(currentTime, item.optimalWindow)) {
    return 85
  }

  // Decay - how long has OSQR known without surfacing?
  const daysSinceDetected = (currentTime - item.detectedAt) / (1000 * 60 * 60 * 24)
  if (daysSinceDetected > 3) {
    return Math.min(70, 40 + (daysSinceDetected * 5))
  }

  return 30 // Default for non-time-sensitive items
}

function isWithinWindow(currentTime: number, window: TimeWindow): boolean {
  return currentTime >= window.start.getTime() && currentTime <= window.end.getTime()
}

/**
 * Context Relevance: Does this relate to current activity?
 */
function calculateContextRelevance(item: TemporalItem, currentContext: UserContext): number {
  let score = 0

  // Same project
  if (item.project === currentContext.activeProject) {
    score += 40
  }

  // Related topic (keyword/semantic match)
  if (hasTopicOverlap(item.topics, currentContext.recentTopics)) {
    score += 30
  }

  // Mentioned entity (person, company, etc.)
  if (hasEntityOverlap(item.entities, currentContext.recentEntities)) {
    score += 20
  }

  // User explicitly working on related task
  if (currentContext.activeTask && item.relatedTasks?.includes(currentContext.activeTask)) {
    score += 10
  }

  return Math.min(100, score)
}

function hasTopicOverlap(itemTopics: string[] | undefined, contextTopics: string[]): boolean {
  if (!itemTopics) return false
  return itemTopics.some(t => contextTopics.includes(t))
}

function hasEntityOverlap(itemEntities: string[] | undefined, contextEntities: string[]): boolean {
  if (!itemEntities) return false
  return itemEntities.some(e => contextEntities.includes(e))
}

/**
 * Historical Engagement: Has user engaged with similar items?
 */
function calculateHistoricalEngagement(item: TemporalItem, userHistory: BubbleHistory[]): number {
  const similarItems = userHistory.filter(h =>
    h.category === item.category ||
    h.source === item.source
  )

  if (similarItems.length === 0) return 50 // No data, neutral

  const engagementRate = similarItems.filter(i => i.wasEngaged).length / similarItems.length

  return Math.round(engagementRate * 100)
}
```

#### Interrupt Budget Management

```typescript
/**
 * Determine if an item can consume budget and surface
 */
function consumeBudget(
  item: BubbleItem,
  budget: InterruptBudget,
  confidenceScore: number,
  focusMode: FocusModeConfig
): { allowed: boolean; cost: number; reason: string } {
  // Emergency items bypass budget
  if (budget.emergency.enabled && confidenceScore >= budget.emergency.threshold) {
    return { allowed: true, cost: 0, reason: "emergency_bypass" }
  }

  // Check hourly limit first
  const hourlyLimit = focusMode.name === "focused"
    ? budget.hourly.focused
    : budget.hourly.available

  if (budget.hourly.current >= hourlyLimit) {
    return { allowed: false, cost: 0, reason: "hourly_limit" }
  }

  // Check daily limit
  if (budget.daily.remaining <= 0) {
    return { allowed: false, cost: 0, reason: "daily_limit" }
  }

  // Calculate cost based on confidence
  // Higher confidence = lower cost (rewards good predictions)
  let cost = 1
  if (confidenceScore >= 90) cost = 0.5
  if (confidenceScore >= 95) cost = 0.25

  return { allowed: true, cost, reason: "within_budget" }
}

/**
 * Reset budget at midnight local time
 */
function resetDailyBudget(budget: InterruptBudget, userPreferences: BubbleUserState): InterruptBudget {
  return {
    ...budget,
    daily: {
      total: userPreferences.preferences.dailyBudget,
      used: 0,
      remaining: userPreferences.preferences.dailyBudget,
      resetTime: "00:00"
    }
  }
}

/**
 * Reset hourly counter at top of each hour
 */
function resetHourlyBudget(budget: InterruptBudget): InterruptBudget {
  return {
    ...budget,
    hourly: {
      ...budget.hourly,
      current: 0,
      windowStart: new Date()
    }
  }
}
```

#### Feedback Processing

```typescript
/**
 * Apply user feedback to category weights
 * Stored in Memory Vault per category
 */
function applyFeedback(
  category: string,
  feedback: BubbleFeedback,
  currentWeights: Record<string, number>,
  memoryVault: MemoryVault
): Record<string, number> {
  const weights = { ...currentWeights }

  switch (feedback) {
    case "helpful":
      weights[category] = Math.min(1.5, (weights[category] || 1.0) * 1.1)
      break
    case "less_like_this":
      weights[category] = Math.max(0.3, (weights[category] || 1.0) * 0.7)
      break
    case "wrong_time":
      // Doesn't affect category weight, but logs timing data
      memoryVault.logTimingFeedback(category, getCurrentContext())
      break
    case "not_relevant":
      weights[category] = Math.max(0.3, (weights[category] || 1.0) * 0.5)
      break
  }

  return weights
}
```

#### Message Generation (Jarvis Voice)

```typescript
/**
 * Transform Temporal Intelligence data into Jarvis-voice messages
 */
function generateBubbleMessage(item: TemporalItem): { message: string; subtext?: string } {
  switch (item.type) {
    case "deadline":
      const daysUntil = getDaysUntil(item.deadline!)
      if (daysUntil <= 0) {
        return { message: `${item.content} is today.` }
      } else if (daysUntil === 1) {
        return { message: `${item.content} is tomorrow.` }
      } else if (daysUntil <= 3) {
        return { message: `${item.content} in ${daysUntil} days.` }
      } else {
        return { message: `${item.content} coming up ${formatDate(item.deadline!)}.` }
      }

    case "commitment":
      return {
        message: `You mentioned you'd ${item.content}. Still on your radar?`
      }

    case "connection":
      return {
        message: `${item.content}`,
        subtext: `Might help with what you're working on.`
      }

    case "reminder":
      return { message: item.content }

    case "pattern":
      return { message: item.content } // Already phrased by Temporal Intelligence

    default:
      return { message: item.content }
  }
}

function getDaysUntil(date: Date): number {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}
```

#### Cross-Device Sync

```typescript
/**
 * Resolve conflicts when same item has different states across devices
 * Most restrictive wins
 */
function resolveConflict(states: Array<BubbleItem['state']>): BubbleItem['state'] {
  if (states.some(s => s === "dismissed")) return "dismissed"
  if (states.some(s => s === "engaged")) return "engaged"
  if (states.some(s => s === "deferred")) return "deferred"
  return "pending"
}

/**
 * Sync configuration per action type
 */
const syncActions: Record<string, SyncAction> = {
  itemDismissed: {
    scope: "global",
    persistence: "permanent"
  },
  itemDeferred: {
    scope: "global",
    persistence: "until_trigger"
  },
  itemEngaged: {
    scope: "global",
    persistence: "permanent"
  },
  focusModeChanged: {
    scope: "global",
    persistence: "until_changed"
  },
  budgetConsumed: {
    scope: "global",
    persistence: "until_reset"
  }
}
```

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `/src/bubble/` directory structure
- [ ] Implement `types.ts` with all TypeScript interfaces
- [ ] Implement `confidenceCalculator.ts` with scoring algorithm
- [ ] Implement `interruptBudget.ts` with budget management logic
- [ ] Implement `focusMode.ts` with three tier configurations
- [ ] Create Memory Vault integration for `BubbleUserState` persistence
- [ ] Implement Temporal Intelligence queue consumer

### Phase 2: Core Logic
- [ ] Implement `messageGenerator.ts` for Jarvis-voice message creation
- [ ] Implement `feedbackProcessor.ts` for category weight adjustments
- [ ] Implement threshold-to-state mapping (0-40 silent, 41-60 passive, etc.)
- [ ] Implement budget consumption and reset logic
- [ ] Create `BubbleEngine` class that orchestrates all components
- [ ] Implement item state management (pending → surfaced → dismissed/engaged/deferred)

### Phase 3: Web Interface
- [ ] Create `BubbleContainer.tsx` - main wrapper with fixed positioning
- [ ] Create `BubbleIndicator.tsx` - passive state (subtle dot, soft pulse)
- [ ] Create `BubblePreview.tsx` - active state with message and actions
- [ ] Create `BubbleQueue.tsx` - multiple items view
- [ ] Implement CSS animations (bubbleRise, pulse, dismiss)
- [ ] Implement interaction handlers (expand, dismiss, engage, defer)
- [ ] Add feedback UI ("show less like this" option on dismiss)
- [ ] Create `useBubble.ts` hook for component state management

### Phase 4: Mobile Interface
- [ ] Create mobile `BubbleContainer` with thumb-zone positioning
- [ ] Implement gesture handlers (tap, swipe up/down/left/right)
- [ ] Implement haptic feedback patterns (light/medium/heavy)
- [ ] Implement mobile-specific suppression rules (typing, pocketed, call, low battery)
- [ ] Test bottom-sheet expansion pattern

### Phase 5: Voice Interface
- [ ] Implement audio cue system with "I have a thought when you're ready"
- [ ] Implement trigger phrase detection (proceed, dismiss, defer phrases)
- [ ] Implement conversation flow state machine
- [ ] Implement 2-second pause detection (never interrupt mid-sentence)
- [ ] Implement silence handling (don't repeat if user says nothing)

### Phase 6: Cross-Device Sync
- [ ] Implement WebSocket connection for real-time updates
- [ ] Implement state broadcast on all actions
- [ ] Implement conflict resolution logic
- [ ] Implement offline queue with sync-on-reconnect
- [ ] Test dismiss-on-one-device-dismissed-everywhere flow

### Phase 7: Integration Testing
- [ ] Test Temporal Intelligence → Bubble flow end-to-end
- [ ] Test all confidence score edge cases
- [ ] Test budget exhaustion and recovery
- [ ] Test Focus Mode switching
- [ ] Test cross-device sync scenarios
- [ ] Test feedback → weight adjustment → scoring impact

## API Contracts

### Inputs

```typescript
// Consume items from Temporal Intelligence
GET /api/temporal/priority-queue
Response: TemporalItem[]

// Get user's current context
GET /api/context/current
Response: {
  activeProject: string | null
  recentTopics: string[]
  recentEntities: string[]
  activeTask: string | null
}

// Get user's Bubble state from Memory Vault
GET /api/memory/bubble-state
Response: BubbleUserState
```

### Outputs

```typescript
// Get current bubble queue (items ready to potentially surface)
POST /api/bubble/items
Request: { focusMode: string }
Response: BubbleItem[]

// Dismiss an item
POST /api/bubble/dismiss/:id
Request: { feedback?: BubbleFeedback }
Response: { success: boolean, syncedAt: Date }

// Mark item as engaged
POST /api/bubble/engage/:id
Request: {}
Response: { success: boolean, syncedAt: Date }

// Defer item to later
POST /api/bubble/defer/:id
Request: { until: "tonight" | "tomorrow" | "monday" | Date }
Response: { success: boolean, deferredUntil: Date, syncedAt: Date }

// Submit feedback on an item
POST /api/bubble/feedback/:id
Request: { feedback: BubbleFeedback }
Response: { success: boolean, newCategoryWeight: number }

// Get user preferences
GET /api/bubble/preferences
Response: BubbleUserState['preferences']

// Update user preferences
PUT /api/bubble/preferences
Request: Partial<BubbleUserState['preferences']>
Response: BubbleUserState['preferences']

// Get current budget state
GET /api/bubble/budget
Response: InterruptBudget

// WebSocket events emitted
WS bubble_state_change: {
  type: "bubble_state_change"
  action: "dismissed" | "engaged" | "deferred" | "focus_mode_changed"
  itemId?: string
  timestamp: number
  deviceId: string
}
```

## Configuration

### Environment Variables

```env
# Bubble Interface Configuration
OSQR_BUBBLE_DEFAULT_DAILY_BUDGET=15
OSQR_BUBBLE_MIN_DAILY_BUDGET=10
OSQR_BUBBLE_MAX_DAILY_BUDGET=30
OSQR_BUBBLE_HOURLY_LIMIT_AVAILABLE=5
OSQR_BUBBLE_HOURLY_LIMIT_FOCUSED=2
OSQR_BUBBLE_EMERGENCY_THRESHOLD=98
OSQR_BUBBLE_BUDGET_RESET_HOUR=0

# Confidence Scoring Weights (fixed in v1.0)
OSQR_BUBBLE_WEIGHT_BASE_PRIORITY=0.35
OSQR_BUBBLE_WEIGHT_TIME_SENSITIVITY=0.25
OSQR_BUBBLE_WEIGHT_CONTEXT_RELEVANCE=0.25
OSQR_BUBBLE_WEIGHT_HISTORICAL_ENGAGEMENT=0.15

# Category Weight Bounds
OSQR_BUBBLE_MIN_CATEGORY_WEIGHT=0.3
OSQR_BUBBLE_MAX_CATEGORY_WEIGHT=1.5

# WebSocket
OSQR_BUBBLE_WS_RECONNECT_INTERVAL=5000
OSQR_BUBBLE_WS_MAX_RETRIES=10
```

### Default Values

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Daily Budget | 15 | 10-30 | Max interrupts per day |
| Hourly Limit (Available) | 5 | - | Max per hour in Available mode |
| Hourly Limit (Focused) | 2 | - | Max per hour in Focused mode |
| Emergency Threshold | 98 | 95-100 | Score that bypasses budget |
| Category Weight (new) | 1.0 | 0.3-1.5 | Default weight for unseen categories |
| Sound Enabled | true | - | Play audio cues |
| Haptic Enabled | true | - | Mobile haptic feedback |

### Confidence Score Thresholds

| Score Range | State | UI Manifestation |
|-------------|-------|------------------|
| 0-40 | Silent | Logged only, no UI |
| 41-60 | Passive | Ambient indicator (glow, dot) |
| 61-80 | Ready | Preview on hover/tap |
| 81-95 | Active | Bubble surfaces with preview |
| 96-100 | Priority | Immediate, uses interrupt budget |

### Focus Mode Configurations

```typescript
const FOCUS_MODES: Record<string, FocusModeConfig> = {
  available: {
    name: "available",
    bubbleStates: ["passive", "ready", "active", "priority"],
    hourlyLimit: 5,
    passiveIndicators: true,
    soundEnabled: true,
    hapticEnabled: true
  },
  focused: {
    name: "focused",
    bubbleStates: ["passive", "ready"],
    hourlyLimit: 2,
    passiveIndicators: true,
    soundEnabled: false,
    hapticEnabled: false
  },
  dnd: {
    name: "dnd",
    bubbleStates: [],
    hourlyLimit: 0,
    passiveIndicators: false,
    soundEnabled: false,
    hapticEnabled: false,
    queueAll: true
  }
}
```

## Error Handling

### Failure Modes

| Scenario | Response | Fallback |
|----------|----------|----------|
| Temporal Intelligence unavailable | Log error, surface nothing | Queue empty, retry on interval |
| Memory Vault unavailable | Use in-memory defaults | Lose persistence, warn user |
| WebSocket disconnect | Queue actions locally | Sync on reconnect |
| Confidence calculation error | Default to base priority only | Item still surfaces if priority high |
| Budget state corrupt | Reset to defaults | May over/under-interrupt briefly |
| Cross-device conflict | Most restrictive wins | Dismissed always wins |
| Voice recognition failure | Fall back to text interface | Log for improvement |
| Mobile haptic unavailable | Continue without haptic | Silent degradation |

### Error Logging

```typescript
interface BubbleError {
  code: string
  message: string
  component: "scorer" | "budget" | "sync" | "voice" | "ui"
  severity: "warning" | "error" | "critical"
  timestamp: Date
  context?: Record<string, any>
}

// Log to Memory Vault for debugging
function logBubbleError(error: BubbleError): void {
  memoryVault.logError("bubble", error)
  if (error.severity === "critical") {
    // Disable Bubble temporarily, notify user
    disableBubbleWithNotification()
  }
}
```

## Success Criteria

1. [ ] **Confidence scoring produces scores 0-100** for all Temporal Intelligence items
2. [ ] **Threshold mapping works correctly**: items at score 45 show passive indicator, score 85 surfaces actively
3. [ ] **Interrupt budget limits are enforced**: no more than daily limit surfaces, hourly caps respected
4. [ ] **Focus mode changes behavior**: DND mode surfaces nothing, Focused mode reduces frequency
5. [ ] **Cross-device sync works**: dismiss on web = dismissed on mobile within 2 seconds
6. [ ] **Feedback adjusts weights**: "less like this" reduces category score by 30% next calculation
7. [ ] **Jarvis voice is consistent**: all messages follow personality guidelines (no exclamation points, no emoji, no "REMINDER:")
8. [ ] **Web Bubble renders correctly**: fixed bottom-right, animates on surface, dismisses on swipe/click
9. [ ] **Mobile gestures work**: swipe down dismisses, swipe up expands, tap previews
10. [ ] **Voice cues trigger appropriately**: "I have a thought when you're ready" plays only for active items
11. [ ] **Budget resets at midnight**: daily counter goes to 0 at local midnight
12. [ ] **Emergency items bypass budget**: score 98+ surfaces regardless of budget state

## Open Questions

- [ ] **Exact animation timing**: What duration feels right for bubbleRise animation? (Currently 300ms)
- [ ] **Decay curve**: Linear decay scoring, or should it accelerate after certain days?
- [ ] **Voice timeout**: If user doesn't respond to "I have a thought," how long to wait? (Currently 10s)
- [ ] **Offline duration**: How long to queue actions offline before giving up on sync?
- [ ] **Category granularity**: What categories should exist? (deadline, commitment, connection, pattern, reminder) - or more specific?
- [ ] **Historical engagement window**: How far back should we look for engagement history? 30 days? 90 days? All time?
- [ ] **Multiple items**: When 3+ items are ready, surface one at a time or show queue count?
- [ ] **Defer options**: Current options are "tonight", "tomorrow", "monday", custom Date - is this sufficient?
- [ ] **Sound design**: What should the audio cues actually sound like? (Need audio files)
- [ ] **Haptic patterns**: Current durations (10ms/20ms/30ms) - need device testing to tune

## Research Foundation

This specification was informed by the following NotebookLM research:

1. **Proactive AI Interface Patterns** (December 2024)
   - Multi-Agent System (MAS) coordination layers
   - Agent Command Environment (ACE) for human oversight
   - Progressive disclosure and component-based display
   - Consultation Request Packs (CRPs) for batching

2. **Ambient Intelligence and Context Engineering** (December 2024)
   - U-shaped performance curve for context positioning
   - Surgical context inclusion to prevent context rot
   - Real-time streaming and non-intrusive overlays

3. **Learning User Attention Patterns** (December 2024)
   - Google Memory Bank retrospective reflection
   - MentorScripts for codifying user preferences
   - Context engineering for attention budget management

4. **AI Assistants in Code Editors** (December 2024)
   - Agentic Software Engineering (SE 3.0) patterns
   - Structured vs. unstructured tool comparison
   - Inline vs. panel-based interaction patterns
   - Status bar and notification best practices

5. **Jarvis Personality Analysis** (December 2024)
   - British butler sensibility, formal but warm
   - Anticipatory rather than reactive
   - Partner relationship, not tool usage
   - Calm under pressure, subtle pushback when warranted

## Appendices

### A: UI Mockups / Wireframes

#### Web Interface States

```
DORMANT (Score 0-40)
┌─────────────────────────────────────────┐
│                                         │
│  [Main Chat Area]                       │
│                                         │
│  No bubble visible                      │
│                                         │
└─────────────────────────────────────────┘

PASSIVE (Score 41-60)
┌─────────────────────────────────────────┐
│                                         │
│  [Main Chat Area]                       │
│                                    (●)  │  ← Subtle dot, soft pulse
│                                         │
└─────────────────────────────────────────┘

READY (Score 61-80)
┌─────────────────────────────────────────┐
│                                         │
│  [Main Chat Area]              ┌──────┐ │
│                                │ ●    │ │  ← Hover shows preview
│                                │2 items│ │
│                                └──────┘ │
└─────────────────────────────────────────┘

ACTIVE (Score 81-95)
┌─────────────────────────────────────────┐
│                                         │
│  [Main Chat Area]          ┌──────────┐ │
│                            │VoiceQuote│ │
│                            │demo in 3 │ │
│                            │days. 3   │ │
│                            │items left│ │
│                            │          │ │
│                            │[View]    │ │
│                            └──────────┘ │
└─────────────────────────────────────────┘

PRIORITY (Score 96-100)
┌─────────────────────────────────────────┐
│                                         │
│  [Main Chat Area]          ┌──────────┐ │
│                            │● Joe's   │ │  ← Immediate attention
│                            │proposal -│ │
│                            │he travels│ │
│                            │Thursday  │ │
│                            │          │ │
│                            │[View]    │ │
│                            └──────────┘ │
└─────────────────────────────────────────┘
```

#### Mobile Interface

```
PASSIVE
┌───────────────────────────┐
│                           │
│      [Main Content]       │
│                           │
│                           │
│                           │
│                     (●)   │  ← Bottom-right, thumb zone
│                           │
│  ┌─────────────────────┐  │
│  │    Input Area       │  │
│  └─────────────────────┘  │
└───────────────────────────┘

ACTIVE (after tap)
┌───────────────────────────┐
│                           │
│      [Main Content]       │
│                           │
│   ┌───────────────────┐   │
│   │  VoiceQuote demo  │   │
│   │  in 3 days.       │   │
│   │                   │   │
│   │  [View] [Later]   │   │
│   └───────────────────┘   │
│                           │
│  ┌─────────────────────┐  │
│  │    Input Area       │  │
│  └─────────────────────┘  │
└───────────────────────────┘
```

### B: Example Payloads

#### Temporal Intelligence Input

```json
{
  "id": "ti-001",
  "type": "deadline",
  "content": "VoiceQuote demo",
  "source": "calendar",
  "priority": 85,
  "deadline": "2025-03-20T14:00:00Z",
  "dependencies": ["payment-integration", "calendar-sync", "email-templates"],
  "entities": ["VoiceQuote", "demo"],
  "topics": ["product", "launch", "presentation"],
  "optimalWindow": null
}
```

#### Bubble Item Output

```json
{
  "id": "bubble-001",
  "temporalItemId": "ti-001",
  "message": "VoiceQuote demo in 3 days.",
  "subtext": "3 items still incomplete.",
  "confidenceScore": 88,
  "basePriority": 85,
  "primaryAction": {
    "label": "View items"
  },
  "category": "deadline",
  "state": "pending"
}
```

#### User State in Memory Vault

```json
{
  "preferences": {
    "focusMode": "available",
    "dailyBudget": 15,
    "soundEnabled": true,
    "hapticEnabled": true
  },
  "categoryWeights": {
    "deadline": 1.2,
    "meeting_reminder": 0.5,
    "connection": 1.0,
    "commitment": 1.1
  },
  "budget": {
    "daily": {
      "total": 15,
      "used": 3,
      "lastReset": "2024-12-19T00:00:00Z"
    },
    "hourly": {
      "current": 1,
      "windowStart": "2024-12-19T14:00:00Z"
    }
  },
  "deferred": [
    {
      "itemId": "bubble-002",
      "deferredAt": "2024-12-19T10:30:00Z",
      "deferredUntil": "2024-12-19T18:00:00Z"
    }
  ],
  "history": [
    {
      "itemId": "bubble-001",
      "category": "deadline",
      "confidenceScore": 88,
      "action": "engaged",
      "timestamp": "2024-12-19T14:15:00Z",
      "timeToAction": 2300
    }
  ]
}
```

#### WebSocket Sync Event

```json
{
  "type": "bubble_state_change",
  "action": "dismissed",
  "itemId": "bubble-003",
  "timestamp": 1734621300000,
  "deviceId": "web-main",
  "feedback": "less_like_this"
}
```

### C: File Structure

```
/src/bubble/
├── index.ts                    # Public exports
├── types.ts                    # All TypeScript interfaces
├── constants.ts                # Configuration defaults, thresholds
├── BubbleEngine.ts             # Main orchestrator class
├── scoring/
│   ├── confidenceCalculator.ts # Main scoring algorithm
│   ├── timeSensitivity.ts      # Time-based scoring component
│   ├── contextRelevance.ts     # Context matching component
│   └── historicalEngagement.ts # History-based component
├── budget/
│   ├── interruptBudget.ts      # Budget management
│   └── focusMode.ts            # Focus mode configurations
├── messaging/
│   ├── messageGenerator.ts     # Jarvis voice generation
│   └── voicePatterns.ts        # Voice conversation patterns
├── feedback/
│   └── feedbackProcessor.ts    # Category weight adjustments
├── sync/
│   ├── crossDeviceSync.ts      # WebSocket sync logic
│   └── conflictResolution.ts   # Multi-device conflict handling
├── components/
│   ├── web/
│   │   ├── BubbleContainer.tsx
│   │   ├── BubbleIndicator.tsx
│   │   ├── BubblePreview.tsx
│   │   ├── BubbleQueue.tsx
│   │   └── styles.css
│   ├── mobile/
│   │   ├── MobileBubble.tsx
│   │   ├── gestures.ts
│   │   └── haptics.ts
│   └── voice/
│       ├── VoiceCue.ts
│       └── triggerDetection.ts
├── hooks/
│   ├── useBubble.ts            # Main React hook
│   ├── useConfidenceScore.ts
│   ├── useInterruptBudget.ts
│   ├── useFocusMode.ts
│   └── useCrossDeviceSync.ts
├── utils/
│   ├── bubbleAnimations.ts
│   └── dateHelpers.ts
└── __tests__/
    ├── confidenceCalculator.test.ts
    ├── interruptBudget.test.ts
    ├── messageGenerator.test.ts
    ├── feedbackProcessor.test.ts
    └── crossDeviceSync.test.ts
```

### D: Personality Guidelines (Jarvis Voice)

#### DO

- First person, conversational: "I noticed...", "Your demo is..."
- Assume intelligence—never explain obvious implications
- Leave space—make suggestions, don't demand responses
- Sound like a trusted colleague who's been thinking about your situation
- Be specific: "3 days" not "soon", "Joe's proposal" not "a document"

#### DON'T

- Use exclamation points excessively
- Use emoji (unless user's established pattern includes them)
- Sound like a notification: "ALERT", "REMINDER", "ACTION REQUIRED"
- Sound like a productivity app: "You've got this!", "Great job!"
- Reference memory or systems: "Based on my records...", "I can see in your data..."
- Be vague: "something coming up", "that thing you mentioned"

#### Examples

**Deadline:**
```
✓ "Your VoiceQuote demo is in 3 days. 3 items still incomplete—want me to walk through them?"
✗ "REMINDER: Demo deadline approaching! ⚠️"
✗ "Hey! Just wanted to check in about that demo thing..."
```

**Cross-context connection:**
```
✓ "The tax calculation you built for Record Homes might help here. Similar pattern, different rates."
✗ "I found a related code snippet in another project."
✗ "Based on my analysis of your repositories..."
```

**Pattern observation:**
```
✓ "You've rescheduled this meeting three times. Should I suggest blocking focus time before it instead?"
✗ "Meeting rescheduled again."
✗ "I noticed you keep moving this meeting around!"
```

**Time-sensitive:**
```
✓ "Joe's proposal response—he's traveling Thursday. Tomorrow's the window if you want to connect."
✗ "URGENT: Respond to Joe's proposal before his travel."
✗ "Hey, just a heads up about Joe..."
```
