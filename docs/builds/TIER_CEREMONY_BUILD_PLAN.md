# Tier Upgrade Ceremony Build Plan

**Created:** 2025-12-27
**Status:** READY TO BUILD
**Estimated Time:** 45-90 minutes Claude time
**Human Estimate:** 6-9 hours (from spec)
**Priority:** V1.0 Launch Polish

---

## Time Tracking

**IMPORTANT:** Record start/end times in `.claude/build-metrics.json`

**Session 1:** ____-__-__T__:__:__Z - ____-__-__T__:__:__Z (____ minutes)

---

## Context

A premium "crossing the threshold" ceremony that plays **once per tier, per account** when a user upgrades to Pro or Master. This is not gamification - it's an acknowledgment of arrival. The correct user reaction is "Oh, nice." - not "Wow, look at all these effects."

**Spec:** `docs/features/TIER_CEREMONY_SPEC.md`

---

## What Needs to Be Built

### Phase 1: Database + Types (Priority 1)

**Goal:** Add ceremonySeen field to User model and create type definitions.

**Database change:**
- Add `ceremonySeen Json?` field to User model (schema: `{ pro?: boolean, master?: boolean }`)

**Files to create/modify:**
- [ ] `prisma/schema.prisma` - Add ceremonySeen field to User model
- [ ] `lib/ceremony/types.ts` - Type definitions:
  ```typescript
  export type Tier = 'lite' | 'pro' | 'master'
  export type CeremonySeen = { pro?: boolean; master?: boolean }
  export type CeremonyState = {
    tier: Tier
    ceremonySeen: CeremonySeen
    shouldShowCeremony: boolean
    ceremonyTier: Tier | null
  }
  ```

**Verification:**
- [ ] Run `npx prisma migrate dev --name add_ceremony_seen`
- [ ] TypeScript compiles without errors

---

### Phase 2: API Routes (Priority 2)

**Goal:** Create GET/POST endpoints for ceremony state management.

**Files to create:**
- [ ] `app/api/user/ceremony/route.ts`

**GET `/api/user/ceremony`:**
```typescript
// Returns current user's ceremony state
{
  "tier": "master",
  "ceremonySeen": { "pro": true, "master": false },
  "shouldShowCeremony": true,
  "ceremonyTier": "master"
}
```

**POST `/api/user/ceremony`:**
```typescript
// Mark ceremony as seen
// Body: { "tier": "master" }
// Response: { "success": true }
```

**Logic:**
- Get user's current tier from Workspace (or User if we move it)
- Check ceremonySeen JSON for which ceremonies are complete
- Determine if ceremony should show based on tier > seen
- Pro ceremony shows for first paid upgrade (including future Lite tier)

**Verification:**
- [ ] GET returns correct state for test user
- [ ] POST updates ceremonySeen correctly

---

### Phase 3: Install Framer Motion (Priority 3)

**Goal:** Add Framer Motion dependency for animations.

```bash
cd packages/app-web && pnpm add framer-motion
```

**Verification:**
- [ ] `framer-motion` appears in package.json dependencies
- [ ] Build still works

---

### Phase 4: Ceremony Animation Component (Priority 4)

**Goal:** Create the core animation component using Framer Motion.

**Files to create:**
- [ ] `lib/ceremony/CeremonyAnimation.tsx`

**Timeline (3.2 seconds total):**
| Phase | Time | Description |
|-------|------|-------------|
| 1. Black | 0 → 250ms | Pure black screen |
| 2. Mark appears | 250ms → 800ms | OSQR wordmark fades in (dim) |
| 3. Shimmer | 800ms → 1600ms | Gradient sweep left → right |
| 4. Beat | 1600ms → 1900ms | Brief darkness/settle |
| 5. Tier name | 1900ms → 2400ms | "Pro." or "Master." appears |
| 6. Fade to app | 2400ms → 3200ms | Ceremony dissolves |

**Visual specs:**
- Background: Pure black (#000000) → subtle charcoal (#0a0a0a)
- OSQR Mark: System sans-serif, weight 500-600, 0.15em letter-spacing
- Shimmer: Gradient bar (transparent → 20% white → transparent), 30% of mark width
- Tier name: Below mark, 24px gap, 60% white opacity
- Master variant: Shimmer 900ms (vs 800ms for Pro)

**Props:**
```typescript
interface CeremonyAnimationProps {
  tier: 'pro' | 'master'
  onComplete: () => void
}
```

**Accessibility:**
- Check `prefers-reduced-motion: reduce` → skip animation, show final state 1.5s
- Include `<span role="status" aria-live="polite">Pro unlocked</span>`

---

### Phase 5: Ceremony Hook (Priority 5)

**Goal:** Create hook that manages ceremony state and gating logic.

**Files to create:**
- [ ] `lib/ceremony/useCeremony.ts`

**Responsibilities:**
1. Check if ceremony is needed on mount
2. Handle localStorage guard for refresh glitches:
   ```typescript
   // Set at ceremony start
   localStorage.setItem('osqr_ceremony_active', '1')
   // Clear at ceremony end
   localStorage.removeItem('osqr_ceremony_active')
   // If present on load, skip animation → show final state
   ```
3. Call POST API when ceremony completes
4. Provide `shouldShowCeremony`, `ceremonyTier`, `markCeremonyComplete` to consumers

---

### Phase 6: Ceremony Page (Priority 6)

**Goal:** Create the ceremony page route.

**Files to create:**
- [ ] `app/ceremony/page.tsx`

**Behavior:**
1. Check if user is authenticated (redirect to login if not)
2. Check if ceremony is needed (redirect to app if not)
3. Support testing overrides: `?force=1`, `?tier=pro`, `?tier=master`
4. Play ceremony animation
5. On complete, mark as seen and redirect to main app (`/`)

**Testing:**
- `/ceremony?force=1&tier=pro` - Preview Pro ceremony
- `/ceremony?force=1&tier=master` - Preview Master ceremony

---

### Phase 7: Integration Points (Priority 7)

**Goal:** Wire ceremony into app flow.

**Approach:** Option A from spec (Dedicated Route) - cleaner for V1.

**Integration points:**
1. **Post-checkout redirect** - When Stripe confirms upgrade, redirect to `/ceremony` instead of `/`
   - Note: Stripe webhook may not exist yet - add TODO or create basic webhook
2. **Layout/middleware check** - On app load, check if ceremony needed
   - If yes, redirect to `/ceremony`

**Files to modify:**
- [ ] `app/page.tsx` or `components/Layout.tsx` - Add ceremony check
- [ ] `middleware.ts` (if exists) - Or create new ceremony check hook in layout

**Note:** If no Stripe webhook exists, document the integration point for when it's built.

---

## Technical Decisions (Already Made in Spec)

1. **Same animation for all tiers** - Only timing differs slightly (Master shimmer is 100ms slower)
2. **Not skippable** - It's only 3.2 seconds
3. **No sound** - V1 is silent
4. **No ceremony for downgrade** - Only upgrades
5. **Server-side gating** - Device guard is secondary (refresh glitch prevention only)
6. **Dedicated route, not overlay** - Cleaner for V1

---

## Build Order

1. [ ] Database schema + migration
2. [ ] Types file
3. [ ] API route (GET + POST)
4. [ ] Install Framer Motion
5. [ ] Animation component
6. [ ] Ceremony hook
7. [ ] Ceremony page
8. [ ] Layout integration (redirect to ceremony if needed)
9. [ ] Verification + testing

---

## Success Criteria

- [ ] `/ceremony?force=1&tier=pro` shows Pro ceremony
- [ ] `/ceremony?force=1&tier=master` shows Master ceremony
- [ ] Ceremony plays exactly once per tier (database-backed)
- [ ] Page refresh during ceremony doesn't break (localStorage guard)
- [ ] Reduced motion users see static version
- [ ] All existing tests still pass
- [ ] No TypeScript errors
- [ ] Build completes successfully

---

## What NOT to Build

- Stripe webhook (document integration point, build separately if needed)
- Sound design
- Haptic feedback
- "Watch again" in settings
- Milestone ceremonies (OG badge, 100th question)
- Lite tier ceremony (hidden until 500 users)

---

## Dependencies

**Already available:**
- NextAuth for user session
- Prisma for database
- User/Workspace models

**Needs install:**
- `framer-motion` (Phase 3)

---

## Related Documents

- [TIER_CEREMONY_SPEC.md](../features/TIER_CEREMONY_SPEC.md) - Full specification
- [OSQR-PRICING-SPEC.md](../business/OSQR-PRICING-SPEC.md) - Tier definitions

---

## Migration Required

After building, run Prisma migration:

```bash
cd packages/app-web
npx prisma migrate dev --name add_ceremony_seen
```

---

## Testing Overrides

For development testing without needing a real upgrade:

| Query Param | Effect |
|-------------|--------|
| `?force=1` | Always show ceremony, ignore `ceremonySeen` |
| `?tier=pro` | Preview Pro ceremony |
| `?tier=master` | Preview Master ceremony |

Example: `http://localhost:3001/ceremony?force=1&tier=master`
