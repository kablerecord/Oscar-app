# Epic: Business
## Epic ID: E-006

**Status:** Complete
**Priority:** P1
**Last Updated:** 2025-12-20

---

## Overview

The Business epic provides OSQR's monetization and user lifecycle infrastructure. It handles tier-based access, throttling, conversion touchpoints, and onboarding—ensuring sustainable growth while respecting OSQR's values.

**Why it matters:** OSQR must be sustainable. The business layer ensures revenue while never compromising trust or user agency. Upgrade prompts must feel like help, not manipulation.

---

## Components

| Component | Spec | Status |
|-----------|------|--------|
| Throttle Architecture | `docs/business/PRICING-ARCHITECTURE.md` | Complete |
| Conversion Strategy | `lib/conversion/conversion-events.ts` | Complete |
| Onboarding Flow | `components/onboarding/SpecOnboardingFlow.tsx` | Complete |
| Budget Indicator | `components/oscar/BudgetIndicator.tsx` | Complete |

---

## Stories

| Story ID | Title | Spec | Status |
|----------|-------|------|--------|
| E-006-S001 | Tier-Based Query Limits | PRICING-ARCHITECTURE.md | Complete |
| E-006-S002 | Feature Gating by Tier | throttle-wrapper.ts | Complete |
| E-006-S003 | Graceful Degradation | throttle-wrapper.ts | Complete |
| E-006-S004 | Budget Status API | api/oscar/budget/route.ts | Complete |
| E-006-S005 | Conversion Touchpoints | ConversionTouchpoints.tsx | Complete |
| E-006-S006 | Trial Management | conversion-events.ts | Complete |
| E-006-S007 | Onboarding Phases | SpecOnboardingFlow.tsx | Complete |
| E-006-S008 | Overage Purchases | PRICING-ARCHITECTURE.md | Specified |

---

## Dependencies

- **Depends on:** E-001 (Governance), E-003 (Intelligence) — Mode access requires tier check
- **Blocks:** None (leaf epic)

---

## Success Criteria

- [x] Tier limits enforced (invisible to users, visible to backend)
- [x] Mode access gated by tier (Starter: Quick only, Pro: +Thoughtful, Master: All)
- [x] Upgrade prompts appear at natural moments (never mid-task)
- [x] Budget status visible to users
- [x] Onboarding completes with document upload or demo mode
- [x] Trial state tracked (14-day, with checkpoints)
- [x] Founder pricing displayed when applicable

---

## Context from Architecture

### Related Components
- Router checks tier before mode selection
- Bubble shows budget status
- Constitutional ensures upgrade messaging is honest

### Architecture References
- See: `docs/business/PRICING-ARCHITECTURE.md` — Tier structure
- See: `BUILD-LOG.md` — Onboarding/Conversion UX section
- See: `lib/conversion/conversion-events.ts` — Event tracking

### Integration Points
- Receives from: All AI requests (for throttle check), User actions (for conversion events)
- Sends to: Router (tier context), UI (budget status, upgrade prompts)

---

## Testable Invariants

### Pre-conditions
- User has assigned tier (lite/trial/pro/master/enterprise)
- Tier defaults are correct ("lite" not "free")

### Post-conditions
- Query is processed or gracefully declined with options
- Upgrade prompts always include "Stay on current tier" option

### Invariants
- Query limits are invisible in marketing (backend guardrails only)
- Upgrade prompts never interrupt mid-task
- Trial is 14 days, no extensions
- Starter tier has no annual option
- Founder pricing is locked for life once claimed
- OSQR's voice in upgrades: honest, not manipulative
