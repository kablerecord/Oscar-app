# Pre-Launch Checklist & Session Progress

This file tracks pre-launch items and session progress.

---

## Pre-Launch Status (Updated Dec 29, 2025)

### ✅ RESOLVED Items

| Item | Status | Notes |
|------|--------|-------|
| Claude Data Indexing | ✅ Done | 20+ Claude files indexed including conversations.json, memories.json, projects.json |
| Referral System | ✅ Done | 5% permanent bonus per referral, 50% cap. See `lib/referrals/service.ts` |
| Markdown in Responses | ✅ Done | Conversational style enforced in GKVI coaching section |
| Refine Fire Suggestions | ✅ Done | Disabled by default (opt-in only) |
| Mobile Response Time | ✅ Done | Depth-Aware Intelligence provides caching |

### 📋 AI Provider Billing (see ROADMAP.md for checklist)

Go to ROADMAP.md > Pre-Launch Checklist for billing console links and alert thresholds.

### 🔮 Future Features (Not Blocking Launch)

**Intelligent Routing Classifier (V2.0)**
- **Current state:** Pattern-based routing in `lib/ai/model-router.ts` - 9 question types, complexity estimation, auto-routing
- **Future enhancement:** ML-trained classifier based on user feedback and chat history
- **Blocked on:** Chat history analysis infrastructure, user feedback collection at scale
- **Reference:** The model router is already highly functional; ML version is optimization, not requirement

---

## Session Summary: Dec 29, 2025 - Secretary Checklist Completion

### COMPLETED THIS SESSION

1. **Secretary Checklist - All 12 Categories** ✅
   - Extended from MVP (4 categories) to full implementation (12 categories)
   - Added 8 new detection categories:
     - Contradiction, Open question, People waiting, Recurring pattern
     - Stale decision, Context decay, Unfinished work, Pattern break
   - Fixed regex patterns for edge cases (apostrophes, flexible matching)
   - Created comprehensive test suite: **65 tests, all passing**
   - Updated documentation in ROADMAP.md and build doc

2. **Type Error Fix in OSCARBubble.tsx** ✅
   - Fixed `getInsightFollowUp()` to use insight types (next_step, clarify, recall, contradiction) instead of secretary categories

3. **Test Suite Created** ✅
   - Location: `lib/til/__tests__/secretary-checklist.test.ts`
   - 65 unit tests covering all 12 detection categories
   - Tests for false positive filtering, priority assignments, confidence scores

### Files Modified This Session
- `packages/app-web/lib/til/secretary-checklist.ts` - All 12 detectors + pattern fixes
- `packages/app-web/lib/til/__tests__/secretary-checklist.test.ts` - NEW: 65 tests
- `packages/app-web/components/oscar/OSCARBubble.tsx` - Type fix
- `docs/builds/INSIGHTS_SECRETARY_BUILD.md` - Updated to "FULLY COMPLETE"
- `ROADMAP.md` - Updated Secretary Checklist section

---

## Session Summary: Autonomous Dev Session (Dec 28, 2025)

### COMPLETED (Implemented & Ready to Test)

1. **Access Code Expiration** - Added `expiresAt` field to AccessCode model and validation
2. **Password Visibility Toggle** - Added eye icon to login page
3. **Stop Button for Chat** - Added AbortController support + Stop button in UI
4. **5-Dot Spinning Animation** - Changed 3-dot bounce to 5-dot expanding/spinning ring
5. **Feedback Button Fixed** - Added TooltipProvider wrapper to fix tooltip error

### ANALYSIS COMPLETED

1. **Response Time Bottlenecks:**
   - Main bottleneck is context assembly for complex questions
   - Fast path exists for simple questions (complexity <= 2)
   - Cross-session memory, TIL, UIP all add to context time
comment:what about having some things pre loaded? we actually built this at one time but maybe we aren't using it. Look to see if there is a pre loaded set of questions that looks at the user's vault.
2. **Chat History Access:**
   - Cross-session memory IS implemented (`lib/oscar/cross-session-memory.ts`)
   - Saves conversation summaries after 3+ messages
   - Loads key facts (name, projects, goals, challenges) into context
   - If user feels OSQR doesn't remember, might need more explicit recall
comment: I asked it a question about my vault, then asked a follow up question and it had no idea what the previous question was
3. **Document Understanding:**
   - Vault documents ARE included in context via `assembleContext()`
   - Uses `smartSearch()` with vector similarity
   - Default: 5 knowledge chunks per query
   - If not working, check if documents are properly indexed
comment: how can I test it?
4. **Badge System:**
   - Located: `lib/badges/config.ts`
   - Only "First Steps" badge is active
   - 5 more badges defined but commented out (streaks, questions-100, vault-indexed)
comment: let's enable the so I can see what it looks like
5. **n8n Usage:**
   - Not currently integrated into the app
   - 23 files in `/docs/research/` contain n8n educational content
   - Researched for future workflow automation
COmment: ok, then we don't need n8n?
6. **GPKV Contents:**
   - Spec in `docs/architecture/GPKV_SPECIFICATION.md`
   - V2.0 feature for collective learning
   - Will contain: error→solution mappings, framework conventions, Oscar self-improvement
Comment: from my understanding gpkv is essentially osqr's files correct? some, like the constitution, are "findable" and others are not
7. **TIL (Temporal Intelligence Layer):**
   - Session tracking, pattern detection, insights generation
   - Secretary checklist with 12 detection categories
   - Cognitive profiler tracks 50+ behavioral dimensions
comment: is there anything we could do but are not? is there anything in the build docuents that uses til but we did not set up yet?
8. **Pricing/Tiers:**
   - 3 tiers: Lite ($19), Pro ($99), Master ($249)
   - Token-based billing (500K, 2.5M, 12.5M tokens/month)
   - Lite hidden until 500 paid users
This needs an overhaul. I want to really analyze the features that we have and how they are divided between pro and max. 
9. **"See Another AI" Feature:**
   - Shows button on Quick mode responses
   - Calls `/api/oscar/alt-opinion` endpoint
   - Gets second opinion from Claude, GPT-4, or GPT-4o
   - Shows comparison (agreements/disagreements)
Needs testing then so I can see how I like it and what benefit it has
10. **Vault Privacy Button:**
    - Already exists at lines 92-98 in VaultPageClient.tsx
    - Links to `/settings#privacy`

---

## Production Testing

| Test | Status | Notes |
|------|--------|-------|
| Document Upload | ✅ Done | 1200+ documents uploaded |
| Vault Context in Responses | ⬜ Verify | Ask OSQR about vault content, confirm it references docs |
| Stripe Payment Links | ⬜ Verify | Click pricing buttons, confirm Stripe checkout works |

---

## Resolved

### ✅ MSC Seed Script
**Date Blocked:** 2025-12-08
**Date Resolved:** 2025-12-09
**Resolution:** MSC already had 9 items seeded. Database is now reachable.

### ✅ Capability Ladder Migration
**Date Blocked:** 2025-12-08
**Date Resolved:** 2025-12-09
**Resolution:** Migration was already included in 0_init. Marked as applied with `npx prisma migrate resolve --applied 0_init`.

### ✅ OSQR Self-Indexer
**Date Blocked:** 2025-12-09
**Date Resolved:** 2025-12-09
**Resolution:** Successfully ran `npx tsx scripts/index-osqr-self.ts`. Indexed 85 files with system scope tag.

### ✅ Marketing Site Access Code (osqr.app)
**Date Blocked:** 2025-12-22
**Date Resolved:** 2025-12-22
**Resolution:** Fixed two issues:
1. Added CORS headers to `/api/access-code/validate` endpoint to allow cross-origin requests from osqr.app
2. Updated all hardcoded Railway URLs in osqr-website to use `app.osqr.app`
3. Added `osqr-alpha-2024` to fallback access codes in Hero.tsx
