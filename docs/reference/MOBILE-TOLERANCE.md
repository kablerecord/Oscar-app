# OSQR Mobile Tolerance Spec (v1)

**Goal:**
OSQR should NOT be fully mobile-optimized, but it MUST be **mobile tolerant**:
- Nothing is visually broken on a phone.
- All core flows are usable.
- Heavy / complex UI can be hidden or simplified on small screens.

We are *desktop-first*. Mobile just needs to be safe, readable, and functional.

---

## 1. Breakpoints & General Rules

We're using Tailwind-style breakpoints:

- `sm` < 640px — phones (small)
- `md` ≥ 768px — tablets / small laptops
- `lg` ≥ 1024px — primary desktop experience (OSQR is designed for this)

**Rules:**

1. **No horizontal scrolling** on any primary page (chat, PKV, settings) at `sm`.
2. Text must be readable at `sm`:
   - No overlapping, cut-off text, or zero-width overflow.
3. Buttons / inputs must be tap-able:
   - Minimum tap target ~40px height.
4. If something is too complex for mobile (multi-panel, heavy layouts), it is fine to:
   - Stack vertically, **or**
   - Hide / replace with a simple message:
     "This feature is desktop-only for now. Please use OSQR on a larger screen."

---

## 2. Pages & Minimum Requirements

### 2.1 Chat Page (Core)

**Desktop:** Full experience (all modes, panel UI, etc).

**Mobile (`sm`): Minimum requirements**
- Single-column layout.
- Chat messages stack full-width.
- Input bar pinned at bottom or clearly visible at bottom (no overlap).
- Mode selector:
  - Use icons-only on mobile (hide text labels).
  - Must be reachable without weird scrolling.

**What to avoid on mobile:**
- Side-by-side columns.
- Inline visible multi-model panel (if present); use a toggle or hide it.

---

### 2.2 Vault / Knowledge Base (PKV)

**Desktop:** Full table/grid with metadata.

**Mobile (`sm`): Minimum requirements**
- Simple list view:
  - One file per row (title + small metadata).
- Tapping a row opens the detail view / actions.

**Allowed shortcuts for v1:**
- Hiding advanced filters on mobile.
- Hiding upload drag-and-drop UI (just show a small "Upload" button).

---

### 2.3 Settings Page

**Mobile (`sm`): Minimum requirements**
- Settings sections stacked vertically.
- No complex side navigation.
- All text readable and form fields usable.

It's fine if the layout is basic; it just can't be broken.

---

### 2.4 Onboarding Flow

**Mobile (`sm`): Already responsive**
- Full-screen modal is centered and max-width constrained (`max-w-md mx-4`)
- Buttons and text inputs already stack vertically
- Progress dots remain visible

**No major changes needed** — just verify it doesn't break.

---

### 2.5 OSQR Bubble (post-onboarding)

**Mobile considerations:**
- Position: `bottom-20` on mobile to avoid browser navigation bars
- Width: Full-width minus padding on mobile, fixed width on desktop
- When keyboard is open, bubble should not cover the chat input

---

## 3. Feature Visibility Rules by Screen Size

### 3.1 Always available (even on mobile)

- Chat + Quick/Thoughtful/Contemplate modes.
- Basic PKV list.
- Basic Settings (profile, privacy tiers).
- Onboarding flow.

### 3.2 Desktop-only (hide at < `md` or `lg`)

These can be hidden on small screens **for now**:

- Any visible **multi-model council / panel grid**.
- Debug / developer-only panels.
- Very wide, data-dense layouts.
- Side-by-side comparison views.

When hidden, the feature simply doesn't appear. No error message needed unless it's a primary action.

---

## 4. Implementation Notes

### Responsive patterns used:

1. **Flex direction switching:**
   ```css
   flex-col sm:flex-row
   ```

2. **Width constraints:**
   ```css
   w-full sm:w-auto
   max-w-full sm:max-w-[380px]
   ```

3. **Spacing adjustments:**
   ```css
   p-4 sm:p-6
   gap-2 sm:gap-4
   ```

4. **Show/hide elements:**
   ```css
   hidden sm:block  /* Hide on mobile, show on sm+ */
   sm:hidden        /* Show on mobile, hide on sm+ */
   ```

5. **Text size scaling:**
   ```css
   text-sm sm:text-base
   ```

---

## 5. Acceptance Criteria

For OSQR to be considered "mobile tolerant":

1. **Chat page:**
   - ✅ Works on phone (send/receive messages, change mode).
   - ✅ No horizontal scroll.
   - ✅ No overlapping or cut-off UI.
   - ✅ Mode buttons are tappable (icons on mobile).

2. **Vault page:**
   - ✅ Files listed in a readable format.
   - ✅ Upload functionality accessible.
   - ✅ No layout explosions.

3. **Settings page:**
   - ✅ Usable on mobile.
   - ✅ Controls are not cut off or hidden behind non-scrollable areas.

4. **Onboarding:**
   - ✅ Full-screen modal works on all screen sizes.
   - ✅ Buttons and inputs are tappable.
   - ✅ Progress indicator visible.

5. **OSQR Bubble:**
   - ✅ Positioned correctly on mobile (not hidden by browser chrome).
   - ✅ Readable and usable.

---

## 6. Test Viewports

- iPhone SE: 375×667
- iPhone 14: 390×844
- Small Android: 360×800
- iPad Mini: 768×1024
- Desktop: 1280×800+
