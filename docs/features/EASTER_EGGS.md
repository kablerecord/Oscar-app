# Discoverable Pages & Easter Eggs

**Last Updated:** 2025-12-29

This document tracks hidden/discoverable pages and easter eggs in OSQR that reward curious users.

---

## Philosophy

Easter eggs create brand mystique and reward the curious. They're not advertised but can be found by users who:
- Explore the site structure
- Inspect elements in DevTools
- Open the browser console
- Pay close attention to subtle details

---

## Discoverable Pages

### /vision

**Purpose:** Public-facing philosophy page explaining OSQR's vision
**Locations:**
- `packages/app-web/app/vision/page.tsx`
- `websites/marketing/src/app/vision/page.tsx`

**Content:**
- The Core Thesis (compounding intelligence)
- The One Voice Principle (Witnesses/Judge/Owner)
- The Stack Effect (features multiply each other)
- How Value Compounds (Day 1 → Month 6 timeline)
- What OSQR Becomes (6 capability cards)
- The Multiplier Principle
- The Long Arc

**Footer text:** "If you found this page, you're paying attention. Welcome."

**How users find it:**
1. Easter eggs on /manifesto page (see below)
2. Guessing the URL
3. Word of mouth

---

### /manifesto

**Purpose:** Trust & Privacy Manifesto
**Locations:**
- `packages/app-web/app/manifesto/page.tsx`
- `websites/marketing/src/app/manifesto/page.tsx`

**Status:** Linked from footer (not hidden, but not prominent)

---

## Easter Eggs on /manifesto

Four layers of discovery, from easiest to hardest:

### Layer 1: Infinity Symbol (∞)
**Location:** Footer, after "Last updated: December 2025 ·"
**Visibility:** Visible but subtle (`text-slate-600`, very dark)
**Behavior:**
- On hover, transitions to `text-purple-400` over 500ms
- Links to `/vision`

**Code:**
```tsx
<Link
  href="/vision"
  className="text-slate-600 hover:text-purple-400 transition-colors duration-500"
>
  ∞
</Link>
```

### Layer 2: HTML Comment
**Location:** Top of page component, visible only in DevTools Elements panel
**Content:**
```
═══════════════════════════════════════════════════════════

If you're reading this, you're the kind of person we built
OSQR for. The curious ones. The ones who look deeper.

There's more to discover: /vision

═══════════════════════════════════════════════════════════
```

### Layer 3: Invisible Text
**Location:** Footer, below the version text
**Visibility:** Completely invisible (1px transparent text, 0 height)
**Discovery methods:**
- Cmd+A (select all) reveals it
- Inspecting elements in DevTools

**Content:** "The curious find /vision"

**Code:**
```tsx
<span
  className="select-all text-transparent text-[1px] leading-none block h-0 overflow-hidden"
  aria-hidden="true"
>
  The curious find /vision
</span>
```

### Layer 4: Console Message
**Location:** Browser developer console
**Trigger:** 500ms after page load
**Files:**
- `packages/app-web/app/manifesto/easter-egg.tsx`
- `websites/marketing/src/app/manifesto/easter-egg.tsx`

**Output:**
```
👁️ You found the console.
Most people never look here. You did.
/vision
```

**Styling:** Purple emoji header, gray description, amber path

---

## OSQR Knowledge Integration

OSQR can mention `/vision` when users ask about philosophy or "what makes OSQR different" because the GKVI (Global Knowledge & Value Index) contains the vision content. OSQR synthesizes this naturally — it doesn't explicitly say "go to /vision" but the philosophy is baked into its responses.

**Relevant files:**
- `packages/app-web/lib/knowledge/gkvi.ts` — Contains constitution, identity, capability ladder, etc.
- `packages/app-web/lib/ai/oscar.ts` — Builds system prompt from GKVI

---

## Future Easter Eggs (Ideas)

- [ ] Konami code on homepage → special message
- [ ] Hidden page at `/42` or `/meaning`
- [ ] Console art when visiting certain pages
- [ ] Secret theme toggle
- [ ] Anniversary messages on special dates

---

## Related Documents

- [OSQR_FOUNDER_VISION.md](../vision/OSQR_FOUNDER_VISION.md) — Full internal vision document (private)
- `/vision` page — Public-facing subset of the vision
- `/manifesto` page — Trust & Privacy focus
