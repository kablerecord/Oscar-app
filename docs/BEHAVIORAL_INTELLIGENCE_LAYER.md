# OSQR Behavioral Intelligence Layer

**Status:** Architecture Defined | Implementation: Stubs Only
**Last Updated:** 2025-12-10
**Owner:** Kable Record

---

## Overview

The Behavioral Intelligence Layer (BIL) is OSQR's self-improvement engine. It allows OSQR to learn from user interactions and improve over time — **without ever accessing user content or documents**.

This is the system that transforms OSQR from a static AI tool into an adaptive, self-improving OS.

---

## Core Philosophy

> "OSQR learns from behavior, not content."

**What OSQR DOES collect:**
- Interaction patterns (clicks, mode selections, session duration)
- Feature usage signals (which modes, how often)
- Feedback signals (thumbs up/down, refinement clicks)
- Progress indicators (onboarding completion, feature adoption)

**What OSQR NEVER collects:**
- Document contents
- Chat message text
- PKV data
- Personal details
- Project names or goals

This approach maintains user privacy while enabling OS-level intelligence.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BEHAVIORAL INTELLIGENCE LAYER                 │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Telemetry   │   │    Pattern    │   │    Privacy    │
│   Collector   │   │   Aggregator  │   │  Tier Manager │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Raw Events   │   │   Patterns    │   │  User Consent │
│   Database    │   │   Database    │   │   Settings    │
└───────────────┘   └───────────────┘   └───────────────┘
                              │
                              ▼
                    ┌───────────────┐
                    │  User Behavior│
                    │     Model     │
                    └───────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │   OSQR Adaptation Engine  │
              │   - Mode suggestions      │
              │   - UI optimizations      │
              │   - Personalization       │
              │   - Global improvements   │
              └───────────────────────────┘
```

---

## Components

### 1. TelemetryCollector

**Purpose:** Captures raw behavioral events from user interactions.

**Events Tracked:**
| Event Type | Data Captured | Privacy Level |
|------------|---------------|---------------|
| `mode_selected` | mode name, timestamp | Tier A |
| `session_started` | timestamp, duration | Tier A |
| `feature_used` | feature name, count | Tier A |
| `feedback_given` | positive/negative, context type | Tier B |
| `refinement_clicked` | click count, before/after | Tier B |
| `panel_comparison` | model names viewed | Tier B |
| `onboarding_step` | step name, completed | Tier A |

**Implementation:** `lib/telemetry/TelemetryCollector.ts`

### 2. PatternAggregator

**Purpose:** Transforms raw events into meaningful patterns.

**Patterns Detected:**
- Mode preference patterns ("User prefers Thoughtful for decisions")
- Time-of-day usage patterns ("Most active 9-11am")
- Feature adoption curves ("Discovered panel comparison on day 3")
- Engagement trends ("Usage increasing week over week")
- Friction points ("Often abandons during X flow")

**Implementation:** `lib/telemetry/PatternAggregator.ts`

### 3. UserBehaviorModel

**Purpose:** Per-user behavioral profile for personalization.

**Profile Contains:**
```typescript
interface UserBehaviorModel {
  // Mode preferences
  preferredMode: 'quick' | 'thoughtful' | 'contemplate'
  modeUsageDistribution: Record<string, number>

  // Engagement patterns
  averageSessionDuration: number
  sessionsPerWeek: number
  peakUsageHours: number[]

  // Feature adoption
  featuresDiscovered: string[]
  featuresUsedRegularly: string[]

  // Feedback patterns
  satisfactionTrend: 'improving' | 'stable' | 'declining'
  feedbackFrequency: number

  // Learning signals
  refinementUsageRate: number
  followUpQuestionRate: number
}
```

**Implementation:** `lib/telemetry/UserBehaviorModel.ts`

### 4. PrivacyTierManager

**Purpose:** Enforces user consent and data access boundaries.

**Privacy Tiers:**
- **Tier A (Default):** Local improvement only, minimal telemetry
- **Tier B (Opt-in):** Personalized experience, behavioral learning
- **Tier C (Opt-in+):** Anonymized global learning, helps improve OSQR for everyone

**Implementation:** `lib/telemetry/PrivacyTierManager.ts`

See [PRIVACY_TIERS.md](./PRIVACY_TIERS.md) for full specification.

---

## How OSQR Uses This Data

### Local Improvements (Tier A/B)

1. **Mode Suggestions**
   - "Based on your question complexity, I recommend Thoughtful mode"
   - Learns which modes work best for each user's question types

2. **UI Personalization**
   - Reorder features based on usage frequency
   - Highlight underutilized features
   - Adapt information density to user preference

3. **Timing Optimization**
   - Schedule proactive insights at peak engagement times
   - Reduce interruptions during focus periods

4. **Response Calibration**
   - Adjust verbosity based on engagement patterns
   - Match tone to user's feedback history

### Global Improvements (Tier C)

1. **Model Routing Optimization**
   - Which models produce highest satisfaction for question types
   - Optimal panel composition for different use cases

2. **Feature Discovery**
   - What features drive retention
   - Optimal onboarding sequence

3. **UX Refinement**
   - Friction point identification
   - Conversion optimization

---

## Data Retention

| Data Type | Retention Period | Anonymization |
|-----------|-----------------|---------------|
| Raw events | 30 days | User ID hashed |
| Aggregated patterns | 1 year | Anonymized |
| User behavior models | While subscribed | Deleted on account deletion |
| Global patterns | Indefinite | Fully anonymized |

---

## Implementation Status

| Component | Status | File |
|-----------|--------|------|
| TelemetryCollector | Stub | `lib/telemetry/TelemetryCollector.ts` |
| PatternAggregator | Stub | `lib/telemetry/PatternAggregator.ts` |
| UserBehaviorModel | Stub | `lib/telemetry/UserBehaviorModel.ts` |
| PrivacyTierManager | Stub | `lib/telemetry/PrivacyTierManager.ts` |
| Event database schema | Not started | - |
| Admin dashboard | Not started | - |

---

## Security Considerations

1. **No PII in telemetry** - Events contain IDs, not names/emails
2. **Encrypted at rest** - All telemetry data encrypted
3. **No cross-user correlation** - Tier A/B data never leaves user context
4. **Audit logging** - All data access logged
5. **Right to delete** - Users can request full data deletion

---

## Future Expansions

1. **A/B Testing Framework** - Test UI changes with telemetry feedback
2. **Anomaly Detection** - Identify unusual patterns (potential issues)
3. **Cohort Analysis** - Understand user segments (by tier, usage pattern)
4. **Predictive Churn** - Identify at-risk users before they leave
5. **Feedback Loop** - Automated prompt optimization based on satisfaction

---

## Related Documents

- [TELEMETRY_SPEC.md](./TELEMETRY_SPEC.md) - Detailed event specifications
- [PRIVACY_TIERS.md](./PRIVACY_TIERS.md) - Privacy tier implementation
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall system architecture
- [ROADMAP.md](../ROADMAP.md) - Implementation timeline
