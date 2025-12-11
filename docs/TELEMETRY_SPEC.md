# OSQR Telemetry Specification

**Status:** Specification Complete | Implementation: Not Started
**Last Updated:** 2025-12-10
**Related:** [BEHAVIORAL_INTELLIGENCE_LAYER.md](./BEHAVIORAL_INTELLIGENCE_LAYER.md)

---

## Overview

This document defines the exact telemetry events OSQR collects, their schemas, and how they flow through the system. All telemetry is behavioral — **no content is ever captured**.

---

## Event Categories

### Category A: Interaction Events
Basic usage signals that help OSQR understand how features are used.

### Category B: Feedback Events
Explicit user feedback that indicates satisfaction or issues.

### Category C: Progress Events
Signals that track user journey and feature adoption.

### Category D: System Events
Internal signals for debugging and performance monitoring.

---

## Event Definitions

### A1: Mode Selection

**Trigger:** User selects Quick, Thoughtful, or Contemplate mode
**Privacy Tier:** A (Default)

```typescript
interface ModeSelectedEvent {
  eventType: 'mode_selected'
  timestamp: Date
  userId: string // Hashed
  workspaceId: string // Hashed
  data: {
    mode: 'quick' | 'thoughtful' | 'contemplate'
    wasAutoSuggested: boolean
    questionComplexityScore?: number // If auto-suggest was available
  }
}
```

### A2: Session Activity

**Trigger:** Session start, end, or significant activity
**Privacy Tier:** A (Default)

```typescript
interface SessionEvent {
  eventType: 'session_start' | 'session_end' | 'session_active'
  timestamp: Date
  userId: string
  workspaceId: string
  data: {
    sessionId: string
    durationSeconds?: number // On session_end
    pageViews?: number // On session_end
    queriesCount?: number // On session_end
  }
}
```

### A3: Feature Usage

**Trigger:** User interacts with a feature
**Privacy Tier:** A (Default)

```typescript
interface FeatureUsedEvent {
  eventType: 'feature_used'
  timestamp: Date
  userId: string
  workspaceId: string
  data: {
    feature: string // e.g., 'panel_comparison', 'refine_fire', 'pkv_upload'
    action: 'opened' | 'used' | 'completed' | 'abandoned'
    context?: string // e.g., 'onboarding', 'main_chat', 'settings'
  }
}
```

### A4: Navigation

**Trigger:** User navigates between pages/sections
**Privacy Tier:** A (Default)

```typescript
interface NavigationEvent {
  eventType: 'navigation'
  timestamp: Date
  userId: string
  data: {
    from: string // Route or section
    to: string
    trigger: 'click' | 'keyboard' | 'auto'
  }
}
```

---

### B1: Response Feedback

**Trigger:** User rates a response (thumbs up/down)
**Privacy Tier:** B (Opt-in)

```typescript
interface ResponseFeedbackEvent {
  eventType: 'response_feedback'
  timestamp: Date
  userId: string
  workspaceId: string
  data: {
    rating: 'positive' | 'negative'
    responseMode: 'quick' | 'thoughtful' | 'contemplate'
    modelUsed?: string // Which model generated the response
    questionType?: string // Detected question category (not the question itself)
    responseLength?: number // Token count
  }
}
```

### B2: Refinement Feedback

**Trigger:** User accepts, modifies, or rejects a refinement suggestion
**Privacy Tier:** B (Opt-in)

```typescript
interface RefinementFeedbackEvent {
  eventType: 'refinement_feedback'
  timestamp: Date
  userId: string
  data: {
    action: 'accepted' | 'modified' | 'rejected'
    refinementCount: number // How many refinements before fire
    modificationDegree?: 'minor' | 'major' // If modified
  }
}
```

### B3: Panel Comparison Feedback

**Trigger:** User views alternate AI opinion
**Privacy Tier:** B (Opt-in)

```typescript
interface PanelComparisonEvent {
  eventType: 'panel_comparison'
  timestamp: Date
  userId: string
  data: {
    primaryModel: string
    alternateModel: string
    viewDuration: number // Seconds spent viewing comparison
    clickedSynthesis: boolean // Did they view the agreement/disagreement summary
  }
}
```

---

### C1: Onboarding Progress

**Trigger:** User completes an onboarding step
**Privacy Tier:** A (Default)

```typescript
interface OnboardingEvent {
  eventType: 'onboarding_progress'
  timestamp: Date
  userId: string
  data: {
    step: string // e.g., 'welcome', 'first_upload', 'first_question'
    status: 'started' | 'completed' | 'skipped'
    timeInStep?: number // Seconds
  }
}
```

### C2: Capability Assessment

**Trigger:** User completes capability assessment
**Privacy Tier:** A (Default)

```typescript
interface CapabilityAssessmentEvent {
  eventType: 'capability_assessment'
  timestamp: Date
  userId: string
  workspaceId: string
  data: {
    previousLevel?: number
    newLevel: number
    questionsAnswered: number
    timeToComplete: number // Seconds
  }
}
```

### C3: Subscription Events

**Trigger:** Subscription status changes
**Privacy Tier:** A (Default)

```typescript
interface SubscriptionEvent {
  eventType: 'subscription_change'
  timestamp: Date
  userId: string
  data: {
    action: 'started' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed'
    fromTier?: 'pro' | 'master'
    toTier?: 'pro' | 'master'
    reason?: string // Only for cancellations, predefined options
  }
}
```

---

### D1: Error Events

**Trigger:** System error occurs
**Privacy Tier:** A (Default)

```typescript
interface ErrorEvent {
  eventType: 'error'
  timestamp: Date
  userId?: string
  data: {
    errorType: string // Categorized error type
    endpoint?: string
    statusCode?: number
    // NO stack traces or detailed error messages that might contain user data
  }
}
```

### D2: Performance Events

**Trigger:** Response time thresholds exceeded
**Privacy Tier:** A (Default)

```typescript
interface PerformanceEvent {
  eventType: 'performance'
  timestamp: Date
  data: {
    metric: 'response_time' | 'model_latency' | 'embedding_time'
    value: number // Milliseconds
    endpoint?: string
    modelUsed?: string
  }
}
```

---

## Event Flow

```
User Action
    │
    ▼
┌─────────────────────┐
│  TelemetryCollector │  ← Validates event schema
│                     │  ← Checks privacy tier consent
│                     │  ← Hashes identifiers
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│   Event Queue       │  ← Batches events (100 events or 60 seconds)
│   (In-Memory)       │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Event Writer       │  ← Writes to database
│                     │  ← Triggers pattern detection
└─────────────────────┘
    │
    ├────────────────────────┐
    ▼                        ▼
┌─────────────────┐   ┌─────────────────┐
│  Raw Events DB  │   │ PatternAggregator│
│  (30 day TTL)   │   │                 │
└─────────────────┘   └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Patterns DB    │
                    │  (1 year TTL)   │
                    └─────────────────┘
```

---

## Database Schema (Proposed)

```sql
-- Raw telemetry events
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id_hash VARCHAR(64), -- SHA-256 of user ID
  workspace_id_hash VARCHAR(64),
  timestamp TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL,
  privacy_tier CHAR(1) NOT NULL, -- A, B, or C
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX idx_events_user_time ON telemetry_events(user_id_hash, timestamp);
CREATE INDEX idx_events_type_time ON telemetry_events(event_type, timestamp);

-- Aggregated patterns
CREATE TABLE user_patterns (
  id UUID PRIMARY KEY,
  user_id_hash VARCHAR(64) NOT NULL,
  pattern_type VARCHAR(50) NOT NULL,
  pattern_data JSONB NOT NULL,
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  first_detected TIMESTAMPTZ,
  last_updated TIMESTAMPTZ,
  sample_size INT
);

-- Global anonymous patterns (Tier C only)
CREATE TABLE global_patterns (
  id UUID PRIMARY KEY,
  pattern_type VARCHAR(50) NOT NULL,
  pattern_data JSONB NOT NULL,
  sample_size INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Privacy Enforcement

### Before Event Collection

```typescript
function shouldCollectEvent(event: TelemetryEvent, userConsent: PrivacyTier): boolean {
  const requiredTier = getEventPrivacyTier(event.eventType)

  // Tier A events always collected (basic telemetry)
  if (requiredTier === 'A') return true

  // Tier B/C events require explicit consent
  return userConsent >= requiredTier
}
```

### Data Sanitization

All events are sanitized before storage:

1. **User IDs** → SHA-256 hashed
2. **Workspace IDs** → SHA-256 hashed
3. **Timestamps** → Rounded to nearest minute (Tier C only)
4. **No free-text fields** → All data is structured/enumerated

---

## Implementation Checklist

- [ ] Create `TelemetryEvent` base type
- [ ] Implement event collectors for each type
- [ ] Add privacy tier checking
- [ ] Create event queue with batching
- [ ] Set up database tables
- [ ] Implement TTL cleanup job
- [ ] Create pattern aggregation pipeline
- [ ] Add admin dashboard for viewing patterns
- [ ] Implement user data export (GDPR)
- [ ] Implement user data deletion (GDPR)

---

## Related Documents

- [BEHAVIORAL_INTELLIGENCE_LAYER.md](./BEHAVIORAL_INTELLIGENCE_LAYER.md)
- [PRIVACY_TIERS.md](./PRIVACY_TIERS.md)
