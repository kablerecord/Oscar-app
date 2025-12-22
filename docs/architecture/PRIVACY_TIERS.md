# OSQR Privacy Tiers

**Status:** Specification Complete | Implementation: Partial (existing A/B/C concept)
**Last Updated:** 2025-12-10
**Related:** [BEHAVIORAL_INTELLIGENCE_LAYER.md](../features/BEHAVIORAL_INTELLIGENCE_LAYER.md)

---

## Overview

OSQR uses a three-tier privacy system that gives users control over how their behavioral data is used. This system is fundamental to the Behavioral Intelligence Layer and all telemetry collection.

**Key Principle:** Users choose their comfort level. OSQR respects boundaries completely.

---

## The Three Tiers

### Tier A: Local Only (Default)

**What it means:** OSQR learns within your session only. Minimal data leaves your browser.

**Data Collected:**
- Basic usage metrics (for rate limiting)
- Error reports (anonymized)
- Session duration (for product health)

**Data NOT Collected:**
- Feature usage patterns
- Mode preferences
- Feedback signals
- Any behavioral learning signals

**Who should use this:**
- Privacy-maximalist users
- Users in highly regulated industries
- Anyone who prefers maximum data minimization

**OSQR Behavior:**
- No personalization between sessions
- No mode suggestions
- No proactive insights based on patterns
- Full functionality, just no learning

---

### Tier B: Personal Learning (Opt-in)

**What it means:** OSQR learns YOUR patterns to personalize YOUR experience. Data stays within your account context.

**Data Collected (in addition to Tier A):**
- Mode selection patterns
- Feature usage frequency
- Response feedback (thumbs up/down)
- Refinement behavior
- Session patterns (time of day, duration)
- Onboarding progress

**Data NOT Shared:**
- Nothing leaves your account context
- No cross-user aggregation
- No global learning contribution

**Who should use this:**
- Users who want a personalized OSQR
- Users comfortable with behavioral tracking for their benefit
- Most Pro/Master subscribers

**OSQR Behavior:**
- Suggests optimal modes based on your history
- Learns your feedback patterns
- Optimizes UI based on your usage
- Provides personalized insights
- Remembers your preferences across sessions

---

### Tier C: Global Learning (Opt-in with Explanation)

**What it means:** Your anonymized patterns help improve OSQR for everyone.

**Data Collected (in addition to Tier B):**
- All Tier B data, PLUS
- Anonymized contribution to global patterns
- Aggregated model satisfaction scores
- Feature effectiveness signals

**Anonymization Process:**
1. User ID → SHA-256 hash
2. Workspace ID → SHA-256 hash
3. Timestamps → Rounded to nearest hour
4. All data aggregated with 100+ other users before analysis

**What OSQR Learns Globally:**
- Which models produce best results for question types
- Optimal panel compositions
- Feature discovery patterns
- Onboarding optimization signals
- Friction point identification

**Who should use this:**
- Users who want to help improve OSQR
- Users comfortable with anonymized data sharing
- Community-minded builders

**OSQR Behavior:**
- All Tier B benefits
- Contributes to making OSQR better for everyone
- Early access to improvements driven by global learning

---

## Implementation

### User Settings Schema

```typescript
interface UserPrivacySettings {
  userId: string
  privacyTier: 'A' | 'B' | 'C'
  consentTimestamp: Date
  consentVersion: string // Version of privacy policy they agreed to
  optOutHistory: Array<{
    tier: string
    timestamp: Date
    reason?: string
  }>
}
```

### Consent Flow

```
New User Signup
      │
      ▼
┌─────────────────────────────────────────────┐
│  "OSQR respects your privacy."              │
│                                             │
│  Choose how OSQR learns from your usage:    │
│                                             │
│  ○ Tier A: No learning (default)            │
│  ○ Tier B: Learn my preferences             │
│  ○ Tier C: Help improve OSQR                │
│                                             │
│  [Learn More] [Continue]                    │
└─────────────────────────────────────────────┘
      │
      ▼
  Settings saved
      │
      ▼
  Can change anytime in Settings
```

### Privacy Tier Manager

```typescript
// lib/telemetry/PrivacyTierManager.ts

export class PrivacyTierManager {
  /**
   * Check if an event should be collected based on user's privacy tier
   */
  shouldCollect(eventType: string, userTier: PrivacyTier): boolean {
    const requiredTier = EVENT_PRIVACY_REQUIREMENTS[eventType]
    return this.tierSatisfies(userTier, requiredTier)
  }

  /**
   * Get user's current privacy tier
   */
  async getUserTier(userId: string): Promise<PrivacyTier> {
    // Implementation
  }

  /**
   * Update user's privacy tier with proper consent tracking
   */
  async updateTier(userId: string, newTier: PrivacyTier, consentSource: string): Promise<void> {
    // Implementation
  }

  /**
   * Handle data deletion request (GDPR/CCPA)
   */
  async deleteUserData(userId: string): Promise<DeletionReport> {
    // Implementation
  }
}
```

### Event Privacy Requirements

```typescript
const EVENT_PRIVACY_REQUIREMENTS: Record<string, PrivacyTier> = {
  // Tier A events (always collected)
  'session_start': 'A',
  'session_end': 'A',
  'error': 'A',
  'performance': 'A',

  // Tier B events (require opt-in)
  'mode_selected': 'B',
  'feature_used': 'B',
  'response_feedback': 'B',
  'refinement_feedback': 'B',
  'panel_comparison': 'B',
  'onboarding_progress': 'B',

  // Tier C events (require explicit consent)
  'global_pattern_contribution': 'C',
  'model_satisfaction_report': 'C',
}
```

---

## UI Components

### Privacy Settings Panel

Location: Settings → Privacy

```
┌─────────────────────────────────────────────────────────────┐
│  Privacy Settings                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current Tier: [B] Personal Learning                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Tier A: Local Only                                │   │
│  │   OSQR doesn't learn from your usage                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● Tier B: Personal Learning                         │   │
│  │   OSQR learns your preferences (recommended)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Tier C: Global Learning                           │   │
│  │   Help improve OSQR for everyone                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Download My Data]  [Delete My Data]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tier Change Confirmation

When upgrading to Tier C:

```
┌─────────────────────────────────────────────────────────────┐
│  Enable Global Learning?                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  By enabling Tier C, you're helping make OSQR better        │
│  for the entire community. Here's what happens:             │
│                                                             │
│  ✓ Your usage patterns are anonymized                       │
│  ✓ No personal information is ever shared                   │
│  ✓ Data is aggregated with 100+ other users                │
│  ✓ You can opt out anytime                                  │
│                                                             │
│  We will NEVER:                                             │
│  ✗ Access your documents or chat content                    │
│  ✗ Sell your data                                           │
│  ✗ Share identifiable information                           │
│                                                             │
│  [Cancel]  [Enable Global Learning]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Rights (GDPR/CCPA Compliance)

### Right to Access

Users can download all data OSQR has about them:
- Raw telemetry events (Tier A/B)
- Derived patterns
- Privacy settings history

**Implementation:** `GET /api/privacy/export`

### Right to Deletion

Users can request complete deletion:
- All telemetry events
- All derived patterns
- All behavioral models
- Removal from any global aggregations (Tier C)

**Implementation:** `DELETE /api/privacy/data`

### Right to Rectification

Users can correct inaccurate data:
- Privacy tier settings
- Consent timestamps

**Implementation:** `PATCH /api/privacy/settings`

### Right to Portability

Data export in machine-readable format (JSON).

---

## Implementation Status

| Component | Status |
|-----------|--------|
| Privacy tier concept | ✅ Defined |
| Database schema | ❌ Not started |
| PrivacyTierManager class | ❌ Stub only |
| Settings UI | ❌ Not started |
| Consent flow | ❌ Not started |
| Data export endpoint | ❌ Not started |
| Data deletion endpoint | ❌ Not started |
| Onboarding integration | ❌ Not started |

---

## Security Posture

### The Core Principle

> **There is no such thing as "OSQR user data." There is only "this user's vault."**

This principle governs all security architecture decisions.

### Why Mass Data Theft Is Structurally Useless

Raw OSQR data has almost zero value outside of its owner because:

- **No shared social graph** — No followers, no cross-user context, no shared timelines
- **No aggregation of meaning** — Each user is a sealed cognitive universe
- **No standardized schema** — Unlike "likes" or "politics," meaning only exists in relation to that one person's life
- **Context-dependent** — Even stolen data is fragmented and uninterpretable without the user

Bulk data theft yields millions of unsorted personal journals written in different languages. Hard to analyze, hard to monetize, hard to weaponize.

### Per-User Isolation Requirements

| Requirement | Description |
|-------------|-------------|
| **Per-user encryption** | Each vault encrypted with a unique key; keys never reused or derivable from each other |
| **Hard tenant isolation** | Separate logical partitions; no shared memory tables; no cross-user queries possible |
| **No lateral movement** | Compromising one vault gives zero leverage on another |

### Internal Access Rules (Absolute)

- **Founder cannot read user vaults** — No exceptions
- **Admin tools operate on metadata only** — Usage counts, health metrics, never content
- **No "break glass" content access** — If a feature requires human review of user content, it is not allowed

### No Psychological Profiles

OSQR will **never** store:
- Personality summaries
- Belief models
- Emotional profiles
- Predictive psychological data

Instead:
- Store **references**, not conclusions
- Reconstruct meaning at runtime
- User Intelligence Artifacts inform OSQR's behavior but are never exported as dossiers

This ensures:
- No exploitable centralized profiles
- No high-value targets for extraction
- Legal defensibility ("we cannot meaningfully interpret this alone")

### Deletion = Destruction

When a user deletes their data:
- **Cryptographic key destruction** — Renders data unreadable instantly
- **No soft-delete** — Data is gone, not archived
- **No recovery** — This is a feature, not a limitation

Users always have an escape hatch.

### The Defensible Statement

OSQR is architected so we can truthfully say:

> **"Your thoughts are only valuable to you. OSQR is designed so no one else can use them — even us."**

This is achieved through:
- Per-user encryption
- No global meaning layer
- Runtime-only synthesis
- User-controlled deletion
- No internal content access

---

## Context from Architecture

### Related Components
- Constitutional Framework — Enforces privacy principles from constitution
- Memory Vault — Respects tier settings on all retrievals
- Behavioral Intelligence — Collects data per tier settings
- Telemetry — Event collection gated by tier
- Knowledge Architecture — PKV isolation enforced

### Architecture References
- See: `docs/governance/OSQR_CONSTITUTION.md` — Privacy principles (Part 2.4)
- See: `docs/architecture/KNOWLEDGE_ARCHITECTURE.md` — Two-brain model
- See: `docs/features/BEHAVIORAL_INTELLIGENCE_LAYER.md` — Learning tiers

### Integration Points
- Receives from: User settings, Consent flow
- Sends to: All data collection points, Memory queries, Telemetry events

### Tech Stack Constraints
- User settings stored in database
- Tier check on every data collection
- GDPR/CCPA compliance required

---

## Testable Invariants

### Pre-conditions
- User has made tier selection (defaults to Tier A)
- Consent version is tracked

### Post-conditions
- Data collection respects selected tier exactly
- User can upgrade/downgrade tier at any time

### Invariants
- Tier A: No behavioral data leaves browser
- Tier B: Data stays within user's account context
- Tier C: Anonymization before any aggregation
- No event collected without checking tier first
- Founder cannot access user vault contents regardless of tier
- Deletion is cryptographic destruction
- No psychological profiles stored at any tier

---

## Related Documents

- [BEHAVIORAL_INTELLIGENCE_LAYER.md](../features/BEHAVIORAL_INTELLIGENCE_LAYER.md)
- [TELEMETRY_SPEC.md](./TELEMETRY_SPEC.md)
- [OSQR_CONSTITUTION.md](../governance/OSQR_CONSTITUTION.md) — Privacy principles (Part 2.4)
- [USER_INTELLIGENCE_ARTIFACTS.md](../features/USER_INTELLIGENCE_ARTIFACTS.md) — What OSQR infers (invisibly)
