# Auto-Mode Routing Build Spec

**Status:** COMPLETE
**Completed:** 2025-12-29
**Priority:** Alpha Launch Blocker
**Estimated Time:** 2-3 hours
**Purpose:** Remove mode selector buttons, let OSQR auto-route based on question complexity

---

## The Problem

Currently, users must choose between Quick, Thoughtful, and Contemplate modes. This creates:
- Cognitive load ("which mode should I use?")
- Suboptimal choices (users pick Quick when they need Thoughtful)
- Friction in the UX

## The Solution

Remove mode buttons. OSQR decides automatically based on:
- Question complexity (already detected in `model-router.ts`)
- Question type (factual, creative, analytical, etc.)
- User tier (free users may be limited to Quick)

---

## Implementation Steps

### Phase 1: Backend - Make Mode Optional (30 min)

**File:** `packages/app-web/app/api/oscar/ask-stream/route.ts`

The routing logic already exists (lines 443-474). Currently it only *downgrades* from user-selected mode. Change to:

1. If `mode` is provided in request, use it (backwards compatibility)
2. If `mode` is NOT provided, auto-select based on `routeQuestion()` result

```typescript
// Current (line 451)
let effectiveMode: ResponseMode = mode

// New logic
let effectiveMode: ResponseMode
if (mode) {
  // User explicitly requested a mode - respect it
  effectiveMode = mode
} else {
  // Auto-route based on question analysis
  if (complexity <= 2 && (questionType === 'factual' || questionType === 'conversational')) {
    effectiveMode = 'quick'
  } else if (complexity >= 4 || questionType === 'high_stakes' || questionType === 'analytical') {
    effectiveMode = 'thoughtful'
  } else {
    effectiveMode = 'quick' // Default to fast
  }
}
```

**Tier enforcement:** Keep existing tier checks - if user doesn't have access to Thoughtful, downgrade to Quick silently.

### Phase 2: Frontend - Remove Mode Selector (45 min)

**File:** `packages/app-web/components/oscar/RefineFireChat.tsx`

1. Remove the mode selector dropdown/buttons
2. Remove `mode` from component state
3. Stop sending `mode` in the API request (let backend auto-decide)
4. Keep `mode` in the API response metadata so we can show "Used Quick mode" or "Consulted the panel" after the fact

**Keep for later:** The mode selector could become a "force mode" option in settings for power users who want control.

### Phase 3: Show What Happened (30 min)

After response completes, show a subtle indicator of what mode was used:

**In response metadata area:**
- "Quick response" (for Quick mode)
- "Consulted the panel" (for Thoughtful mode)
- "Deep analysis" (for Contemplate mode - if we keep it)

This provides transparency without requiring upfront decisions.

### Phase 4: Simplify Mode Structure (Optional, 30 min)

Consider collapsing to just two modes:
- **Quick:** Single model (Claude Sonnet 4)
- **Panel:** Multi-model + synthesis

Remove Contemplate mode for alpha. It's 2x the cost of Thoughtful with marginal improvement. Can add back later based on user demand.

---

## Files to Modify

| File | Change |
|------|--------|
| `app/api/oscar/ask-stream/route.ts` | Add auto-routing logic when mode not specified |
| `components/oscar/RefineFireChat.tsx` | Remove mode selector UI |
| `components/oscar/OSCARBubble.tsx` | Remove mode selector if present |
| `lib/ai/oscar.ts` | No changes needed - already handles all modes |

---

## Testing Checklist

- [ ] Simple question ("what time is it in Tokyo?") uses Quick mode
- [ ] Complex question ("should I pivot my startup?") uses Thoughtful mode
- [ ] Self-referential question ("who are you?") uses Quick mode
- [ ] Code question with complexity uses appropriate mode
- [ ] Tier restrictions still enforced (Starter can't use Thoughtful)
- [ ] Response metadata shows which mode was used
- [ ] No regressions in streaming behavior

---

## Rollback Plan

Keep `mode` as optional parameter in API. If auto-routing causes issues:
1. Re-add mode selector to UI
2. Send explicit mode in requests
3. No backend changes needed

---

## Success Criteria

1. Users no longer see mode selector
2. Simple questions get fast responses (~2-5 seconds)
3. Complex questions get thorough responses (panel synthesis)
4. No user complaints about "wrong mode" being chosen
5. Response metadata shows transparency about routing decision

---

## Not In Scope

- Contemplate mode improvements
- Council mode (Master tier feature)
- Custom mode preferences in settings
- Per-workspace mode defaults

These can be added post-alpha based on user feedback.
