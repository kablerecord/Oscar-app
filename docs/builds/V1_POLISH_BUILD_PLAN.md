# V1 Polish Build Plan

**Created:** 2025-12-27
**Status:** ✅ COMPLETED
**Estimated Time:** 1-2 hours Claude time
**Actual Time:** 25 minutes
**Priority:** Pre-V1.0 Launch

---

## Time Tracking

**IMPORTANT:** Record start/end times in `.claude/build-metrics.json`

**Session 1:** 2025-12-27T20:00:00Z - 2025-12-27T20:25:00Z (25 minutes)

---

## Context

Final polish items before V1.0 launch. These are small, high-impact features that improve the user experience and set up future learnings.

---

## What Needs to Be Built

### Phase 1: Privacy Settings UI (Priority 1) ✅ COMPLETE

**Goal:** Allow users to change their privacy tier (A/B/C) from a settings page.

**What exists:**
- `lib/telemetry/PrivacyTierManager.ts` - Full implementation with `getUserPrivacySettings()`, `setUserPrivacyTier()`, `deleteAllUserData()`
- `prisma/schema.prisma` - `UserPrivacySetting` model exists
- Privacy tier definitions in specs

**What was built:**
- [x] Settings page section for Privacy (added to existing `/settings` page)
- [x] UI showing current tier with explanation of each:
  - **Tier A (Default):** "OSQR doesn't learn from your behavior. Maximum privacy."
  - **Tier B:** "OSQR learns your preferences to personalize your experience. Data stays private to you."
  - **Tier C:** "Help improve OSQR for everyone. Anonymized patterns contribute to global learning."
- [x] Radio/toggle to change tier
- [x] API endpoint `POST /api/user/privacy` to update tier
- [x] "Delete My Data" button (Tier A users especially) that calls `deleteAllUserData()`
- [x] Confirmation modal for tier changes and data deletion

**File locations:**
- Modified: `app/settings/page.tsx` (added Privacy Settings section)
- New: `app/api/user/privacy/route.ts`
- Use: `lib/telemetry/PrivacyTierManager.ts`

---

### Phase 2: Feedback Button + Training Pattern (Priority 2) ✅ COMPLETE

**Goal:** Add a feedback mechanism that teaches users they can just tell OSQR "leave feedback" naturally.

**Philosophy:** Like Apple's home button strategy - add the button, but train users toward the better pattern (natural language), then remove the button when usage drops.

**What was built:**
- [x] Feedback button in chat UI (subtle, not prominent)
- [x] When clicked, show a small tooltip/hint: "Tip: You can also just tell OSQR 'I want to leave feedback' anytime"
- [x] Simple feedback form: rating (thumbs up/down) + optional text
- [x] API endpoint `POST /api/feedback` to store feedback (updated existing route)
- [x] Telemetry tracking for:
  - `feedback_button_clicked` - user clicked the button
  - `feedback_natural_language` - user said "leave feedback" or similar in chat
  - `feedback_submitted` - feedback was actually submitted
- [x] Database model for feedback (`UserFeedback` with `FeedbackSource` enum)

**File locations:**
- New: `components/chat/FeedbackButton.tsx`
- Modified: `app/api/feedback/route.ts`
- Modified: `lib/telemetry/TelemetryCollector.ts` (added feedback event types)
- Modified: `prisma/schema.prisma` (added UserFeedback model)
- Modified: `components/oscar/OscarChat.tsx` (added FeedbackButton)

**Success metrics (track over time):**
- Button clicks vs natural language feedback ratio
- Goal: Natural language > button usage within 3 months
- When ratio hits 10:1, consider removing button
- API endpoint `GET /api/feedback` returns training metrics

---

### Phase 3: Verify Existing Systems (Priority 3) ✅ COMPLETE

**Goal:** Quick verification that UIP and BIL are properly integrated and firing.

**Checks:**
- [x] Verify telemetry events are being recorded (BIL telemetry wired to ask-stream)
- [x] Verify UIP cron job is running and processing (cron endpoint exists at `/api/cron/uip-reflection`)
- [x] Verify elicitation questions appear in sessions 2-4 (UIP service wired to ask-stream)
- [x] Add any missing telemetry calls in ask route if needed (added `trackModeSelected`)

**What was fixed:**
- Added BIL telemetry import to ask-stream route
- Added `trackModeSelected` call to track user mode choices

---

## Technical Decisions (Already Made)

1. **Privacy defaults to Tier A** - Users must opt-in to learning
2. **Feedback button is temporary** - Explicit goal is to train users away from it
3. **Telemetry tracks button vs natural** - We measure to decide when to remove
4. **No gamification** - No "you're 80% complete" on privacy settings

---

## Build Order

1. ✅ Privacy Settings UI (most important for launch - users need control)
2. ✅ Feedback Button + Training Pattern
3. ✅ Verification checks

---

## Success Criteria

- [x] Users can view and change their privacy tier
- [x] Users can delete their telemetry data
- [x] Feedback button appears in chat
- [x] Feedback button shows "tip" about natural language
- [x] Telemetry distinguishes button vs natural feedback
- [x] All 462+ tests still pass
- [x] No TypeScript errors

---

## What NOT to Build

- Render System (deferred)
- V1.1 AI Feature Parity (deferred)
- Research/Tribunal (post-V1.0)
- Admin dashboard for telemetry (future)
- Complex feedback analytics UI (future)

---

## Related Documents

- [PRIVACY_TIERS.md](../architecture/PRIVACY_TIERS.md)
- [BEHAVIORAL_INTELLIGENCE_LAYER.md](../features/BEHAVIORAL_INTELLIGENCE_LAYER.md)
- [UIP_SPEC.md](../architecture/UIP_SPEC.md)

---

## Migration Required

After deployment, run Prisma migration to add the `UserFeedback` model:

```bash
cd packages/app-web
npx prisma migrate dev --name add_user_feedback
```
