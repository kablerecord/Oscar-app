# OSQR Tier Ceremony Specification
## Version 1.0 | Paid Upgrade Threshold Moment

---

## What This Is

A premium "crossing the threshold" ceremony that plays **once per tier, per account** when a user upgrades.

This is not a splash screen. It is an **acknowledgment of arrival**.

---

## Design Philosophy

### The Feeling

The correct user reaction is:

> "Oh, nice."

Not:

> "Wow, look at all these effects."

### What This Is Not

- Gamification
- A flex
- An explanation of features
- Tier-based visual escalation
- Showing internal mechanics (council, multi-model, etc.)

### Brand Alignment

From the Character Guide:

> "OSQR doesn't explain its philosophy unless asked—but always acts in alignment with it."

The ceremony demonstrates restraint. OSQR doesn't justify the upgrade. The tier name is enough.

---

## When It Plays

| Transition | Ceremony |
|------------|----------|
| No subscription → Pro | Pro ceremony |
| Pro → Master | Master ceremony |
| Any tier (already seen) | Skip, go to app |

Each ceremony plays **exactly once per account**, across all devices.

---

## Tier Types

```ts
// Matches packages/app-web/lib/tiers/config.ts
export type Tier = 'lite' | 'pro' | 'master'

export type CeremonySeen = {
  pro?: boolean
  master?: boolean
}
```

**Note:** Lite tier is hidden until 500 paid users. No ceremony for Lite—users upgrading to Lite get Pro-level ceremony since it's their first paid moment.

---

## Gating Architecture

### Server-Side (Required)

Ceremony state lives on the account, not the device.

**User model addition:**
```prisma
model User {
  // ... existing fields
  ceremonySeen Json? // { pro?: boolean, master?: boolean }
}
```

**Gating logic (on app load or post-checkout):**
```ts
if (user.tier === 'pro' && !user.ceremonySeen?.pro) {
  // Show Pro ceremony
  // Then POST to mark pro as seen
}

if (user.tier === 'master' && !user.ceremonySeen?.master) {
  // Show Master ceremony
  // Then POST to mark master as seen
}
```

### Device Guard (Secondary)

Prevent refresh glitches mid-animation:

```ts
// Set at ceremony start
localStorage.setItem('osqr_ceremony_active', '1')

// Clear at ceremony end
localStorage.removeItem('osqr_ceremony_active')

// If present on load, skip animation → show final state
```

This does **not** replace server-side gating.

---

## API Contract

### GET `/api/user/ceremony`

Returns current user's ceremony state:

```json
{
  "tier": "master",
  "ceremonySeen": {
    "pro": true,
    "master": false
  }
}
```

### POST `/api/user/ceremony`

Marks a ceremony as seen:

```json
{ "tier": "master" }
```

Response: `{ "success": true }`

---

## Testing Overrides

For development and QA:

| Query Param | Effect |
|-------------|--------|
| `?force=1` | Always show ceremony, ignore `ceremonySeen` |
| `?tier=pro` | Preview Pro ceremony |
| `?tier=master` | Preview Master ceremony |

Example: `/ceremony?force=1&tier=master`

---

## Ceremony Timeline

**Total duration: ~3.2 seconds**

All tiers use the **same structure**:

| Phase | Time | Description |
|-------|------|-------------|
| 1. Black | 0 → 250ms | Pure black screen |
| 2. Mark appears | 250ms → 800ms | OSQR wordmark fades in (dim) |
| 3. Shimmer | 800ms → 1600ms | Gradient sweep left → right across mark |
| 4. Beat | 1600ms → 1900ms | Brief darkness/settle |
| 5. Tier name | 1900ms → 2400ms | "Pro." or "Master." appears below mark |
| 6. Fade to app | 2400ms → 3200ms | Ceremony dissolves into real app |

---

## Visual Specifications

### Background
- Start: Pure black (`#000000`)
- End: Charcoal (`#0a0a0a`) — extremely subtle shift

### OSQR Mark
- Font: System sans-serif, weight 500-600
- Letter-spacing: `0.15em` (wide tracking)
- Color: Start at 30% opacity white, end at 100%
- Position: Centered horizontally and vertically

### Shimmer
- Gradient bar: Transparent → white (20% opacity) → transparent
- Width: ~30% of mark width
- Movement: Left edge to right edge over 800ms
- Easing: `ease-in-out`
- Implementation: CSS mask or `background-clip: text`

### Tier Name
- Text: "Pro." or "Master." (with period)
- Font: Same as mark, slightly smaller
- Position: Below mark, ~24px gap
- Fade in: 300ms ease-out
- Color: White at 60% opacity

### Grain Overlay (Optional)
- Noise texture at 2-3% opacity
- Adds subtle texture without distraction

---

## Tier Variants

### Pro Ceremony

**Feeling:** "I'm in."

- Standard shimmer speed
- Text: "Pro."
- No additional elements

### Master Ceremony

**Feeling:** "Deeper."

- Shimmer slightly slower (900ms instead of 800ms)
- Text: "Master."
- Optional: Shimmer has slightly more weight (gradient more pronounced)

**What Master does NOT have:**
- Multi-mind echoes
- Council silhouettes
- Rings or seals
- Different colors
- More visual complexity

The differentiation is **felt**, not **seen**. Same ceremony, slightly more gravitas in timing.

---

## Accessibility

### Reduced Motion

If `prefers-reduced-motion: reduce`:
- Skip animation entirely
- Show final state instantly (OSQR mark + tier name)
- Hold for 1.5 seconds
- Fade to app

### Screen Readers

- Mark up tier announcement: `<span role="status" aria-live="polite">Pro unlocked</span>`
- Ensure focus moves to main app content after ceremony

---

## Implementation Files

```
app/
  ceremony/
    page.tsx          # Main ceremony page

lib/
  ceremony/
    types.ts          # Tier, CeremonySeen types
    useCeremony.ts    # Hook for ceremony logic
    CeremonyAnimation.tsx  # Framer Motion animation component

app/api/
  user/
    ceremony/
      route.ts        # GET + POST handlers
```

---

## Routing

### Option A: Dedicated Route (Recommended)

1. After Stripe webhook confirms upgrade → redirect to `/ceremony`
2. Ceremony page validates eligibility
3. Plays ceremony
4. Redirects to `/` (main app)

### Option B: Overlay

1. App loads normally
2. If ceremony needed, overlay appears
3. Ceremony plays
4. Overlay dissolves, app is already loaded beneath

Option A is cleaner for V1. Option B is smoother UX for V2.

---

## Integration Points

### Stripe Webhook

After successful subscription:

```ts
// In webhook handler
if (subscriptionActive && tierUpgraded) {
  // Don't mark ceremony seen here
  // Let the ceremony page handle it after playing

  // Redirect URL should include ceremony trigger
  return redirectTo('/ceremony')
}
```

### Session Check

On app load:

```ts
// In layout or middleware
const { tier, ceremonySeen } = await getCeremonyState(userId)

if (tier === 'pro' && !ceremonySeen.pro) {
  redirect('/ceremony')
}
if (tier === 'master' && !ceremonySeen.master) {
  redirect('/ceremony')
}
```

---

## Dependencies

```bash
pnpm add framer-motion
```

Framer Motion is required for:
- Sequenced animations
- Spring-based easing
- `AnimatePresence` for exit animations

---

## Future Considerations

### Not in V1

- Milestone ceremonies (OG badge, 100th question, etc.)
- Sound design
- Haptic feedback (mobile)
- Ceremony replay in settings ("Watch again")

### Open Questions

1. Should ceremony be skippable? (Current answer: No—it's 3 seconds)
2. Should there be a ceremony for downgrade? (Current answer: No)
3. Enterprise tier ceremony? (Decide when Enterprise tier is built)

---

## Success Criteria

The ceremony is successful if:

1. Users don't skip it (because it's short and not annoying)
2. Users don't screenshot it (because it's not trying to impress)
3. Users feel slightly more committed after seeing it
4. Users never see it twice for the same tier

---

## Implementation Plan

### Files to Create

| File | Purpose | Complexity |
|------|---------|------------|
| `app/ceremony/page.tsx` | Main ceremony route | Medium |
| `lib/ceremony/types.ts` | Type definitions | Simple |
| `lib/ceremony/useCeremony.ts` | Hook for gating logic | Medium |
| `lib/ceremony/CeremonyAnimation.tsx` | Framer Motion component | Medium |
| `app/api/user/ceremony/route.ts` | GET/POST handlers | Simple |

### Database Change

Add to Prisma schema:
```prisma
model User {
  ceremonySeen Json? // { pro?: boolean, master?: boolean }
}
```

### Effort Breakdown

| Task | Effort |
|------|--------|
| Types + API route | ~30 min |
| Prisma migration | ~15 min |
| Ceremony animation component | 2-3 hours |
| Ceremony page + hook | 1-2 hours |
| Stripe webhook integration | ~1 hour |
| Middleware/layout ceremony check | ~30 min |
| Testing + polish | 1-2 hours |
| **Total** | **6-9 hours** |

### Prerequisites

1. Framer Motion installed (`pnpm add framer-motion`)
2. Stripe webhooks working
3. User tier accessible in session
4. Prisma schema access

### Build Timing

- **Alpha:** Not required
- **Beta:** Build during polish phase
- **V1.0 Launch:** Should be included

This is a "last 5%" feature—high impact, low urgency. Perfect for the final polish phase before V1.0.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial specification |

