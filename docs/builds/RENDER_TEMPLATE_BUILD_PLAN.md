# Render + Template System Build Plan

**Status:** Ready for Build
**Estimated Build Time:** 2-3 hours (Claude)
**Human Equivalent:** 2-4 weeks
**Date Created:** 2025-12-27

---

## Overview

This build completes the Render System (v1.5) and adds the Template System foundation (v1.5.1). The backend is 95% complete — this build focuses on frontend wiring and template infrastructure.

### What's Already Built

| Component | Status | Location |
|-----------|--------|----------|
| Database schema (Artifact model) | ✅ | `prisma/schema.prisma` |
| Intent detection | ✅ | `lib/render/intent-detection.ts` |
| Types & interfaces | ✅ | `lib/render/types.ts` |
| CRUD service | ✅ | `lib/render/service.ts` |
| Image generator (DALL-E 3) | ✅ | `lib/render/image-generator.ts` |
| Chart generator | ✅ | `lib/render/chart-generator.ts` |
| Render API | ✅ | `app/api/render/route.ts` |
| Artifact API | ✅ | `app/api/artifacts/[id]/route.ts` |
| Render surface page | ✅ | `app/r/[artifactId]/page.tsx` |
| Image renderer | ✅ | `components/render/ImageRenderer.tsx` |
| Chart renderer | ✅ | `components/render/ChartRenderer.tsx` |
| Ask route intent detection | ✅ | `app/api/oscar/ask/route.ts` lines 294-325 |

### What Needs to Be Built

| Component | Priority | Estimated Time |
|-----------|----------|----------------|
| Frontend render flow wiring | P0 | 30 min |
| Bubble "Rendering..." state | P0 | 20 min |
| Bubble "Would you like to see it?" consent | P0 | 20 min |
| Template type infrastructure | P1 | 30 min |
| Listings template | P1 | 45 min |
| Table template | P1 | 30 min |
| Game controls component | P2 | 20 min |
| Tic-tac-toe template | P2 | 30 min |
| Testing & verification | P0 | 30 min |

---

## Specifications

### Primary Specs (Read These First)

1. **[RENDER_SYSTEM_SPEC.md](../features/RENDER_SYSTEM_SPEC.md)** — Core render system architecture
2. **[TEMPLATE_SYSTEM_SPEC.md](../features/TEMPLATE_SYSTEM_SPEC.md)** — Template extension (just created)

### Supporting Specs

3. **[BUBBLE-COMPONENT-SPEC.md](../features/BUBBLE-COMPONENT-SPEC.md)** — Bubble orchestration patterns
4. **CLAUDE.md** (root) — Codebase context and conventions

---

## Phase 1: Complete Render System Frontend (P0)

### 1.1 Wire Frontend to Call /api/render

**Location:** Find where `renderPending: true` is handled in frontend

**Current Flow:**
```
User sends message → /api/oscar/ask → returns { renderPending: true, renderIntent: {...} }
```

**Needed Flow:**
```
User sends message → /api/oscar/ask → returns { renderPending: true }
                                           ↓
                   Frontend calls → /api/render with message
                                           ↓
                   Returns { artifact, renderComplete: true }
                                           ↓
                   Bubble shows "Render complete. Would you like to see it?"
```

**Files to Modify:**
- `components/oscar/OscarChat.tsx` or wherever ask response is handled
- May need to check `lib/hooks/` for chat handling

### 1.2 Add Bubble Render States

**Location:** `components/oscar/OSCARBubble.tsx` or related

**States to Add:**
1. `RENDERING` — Show "Rendering..." with subtle animation
2. `RENDER_COMPLETE` — Show "Render complete. Would you like to see it?" with Yes/No buttons
3. On Yes → Navigate to `/r/:artifactId`
4. On No → Dismiss, artifact saved but not viewed

**Reference:** RENDER_SYSTEM_SPEC.md Section 2 (Canonical Render Loop)

### 1.3 Add Retry Flow for Errors

**Location:** `app/r/[artifactId]/page.tsx` (already has ERROR state display)

**Add:**
- "Retry" button → calls `/api/render` again with same params
- "Retry (Simplify)" button → calls with simplified prompt
- "Cancel" button → updates artifact state to CANCELLED

---

## Phase 2: Template Infrastructure (P1)

### 2.1 Extend Types

**Location:** `lib/render/types.ts`

**Add:**
```typescript
// Template types
export type TemplateType =
  | 'listings'
  | 'table'
  | 'gallery'
  | 'timeline'
  | 'game-simple'
  | 'dashboard'
  | 'comparison'

export interface TemplateArtifactContent {
  type: 'template'
  template: TemplateType
  content: unknown  // Template-specific data
  config: unknown   // Template-specific config
  state?: unknown   // For interactive templates
}
```

### 2.2 Update ArtifactType Enum

**Location:** `prisma/schema.prisma`

**Add to enum:**
```prisma
enum ArtifactType {
  IMAGE
  CHART
  TEMPLATE  // Add this
}
```

**Then run:** `pnpm --filter @osqr/app-web prisma migrate dev --name add_template_type`

### 2.3 Create Template Selector

**Location:** `lib/render/templates/selector.ts` (new file)

**Purpose:** Given user message and data, select appropriate template

```typescript
export function selectTemplate(message: string, data?: unknown): TemplateType | null
export function inferTemplateFromData(data: unknown): TemplateType
```

### 2.4 Create Template Renderers Directory

**Location:** `components/render/templates/` (new directory)

**Structure:**
```
components/render/templates/
├── index.ts
├── ListingsTemplate.tsx
├── TableTemplate.tsx
├── GameSimpleTemplate.tsx
└── TemplateDispatcher.tsx  // Routes to correct template
```

---

## Phase 3: Listings Template (P1)

### 3.1 Create ListingsTemplate Component

**Location:** `components/render/templates/ListingsTemplate.tsx`

**Features:**
- Card grid layout (responsive)
- Filter sidebar/bar
- Sort dropdown
- Pagination
- Card shows: image, title, price, secondary info

**Props:**
```typescript
interface ListingsTemplateProps {
  items: ListingItem[]
  config: ListingsConfig
  onFilterChange: (filters: Record<string, unknown>) => void
  onSortChange: (sort: { field: string; order: 'asc' | 'desc' }) => void
  onPageChange: (page: number) => void
}
```

### 3.2 Create Listings Schema

**Location:** `lib/render/templates/listings.ts`

**Contains:**
- `ListingsContent` interface
- `validateListingsData()` function
- `inferListingsConfig()` — auto-detect fields

---

## Phase 4: Table Template (P1)

### 4.1 Create TableTemplate Component

**Location:** `components/render/templates/TableTemplate.tsx`

**Features:**
- Sortable columns (click header)
- Filterable columns (filter row or sidebar)
- Search box
- Pagination
- Column resize (optional)
- Export to CSV button

**Consider Using:** `@tanstack/react-table` for heavy lifting

### 4.2 Create Table Schema

**Location:** `lib/render/templates/table.ts`

---

## Phase 5: Game Template Foundation (P2)

### 5.1 Create GameControls Component

**Location:** `components/render/templates/GameControls.tsx`

**Features:**
- D-pad (up/down/left/right)
- A and B buttons
- Start/Pause button
- Keyboard support (arrow keys, Z/X or A/S)
- Touch support (virtual buttons)
- Gamepad support (optional, v2)

**Interface:**
```typescript
interface GameControlsProps {
  scheme: 'dpad-ab' | 'arrows-only' | 'touch'
  onUp?: () => void
  onDown?: () => void
  onLeft?: () => void
  onRight?: () => void
  onA?: () => void
  onB?: () => void
  onStart?: () => void
  disabled?: boolean
}
```

### 5.2 Create TicTacToe Template

**Location:** `components/render/templates/TicTacToeTemplate.tsx`

**Features:**
- 3x3 grid
- Click/tap to place X or O
- Turn indicator
- Win detection
- Reset button
- Uses GameControls (optional) or direct click

**Game State:**
```typescript
interface TicTacToeState {
  board: (null | 'X' | 'O')[][]
  turn: 'X' | 'O'
  status: 'playing' | 'won' | 'draw'
  winner?: 'X' | 'O'
}
```

---

## Phase 6: Update Render Surface

### 6.1 Add Template Dispatcher

**Location:** `app/r/[artifactId]/page.tsx`

**Modify:** Add handling for `type === 'TEMPLATE'`

```typescript
{artifact.type === 'TEMPLATE' && (
  <TemplateDispatcher
    template={content.template}
    content={content.content}
    config={content.config}
    state={content.state}
    onModify={handleTemplateModify}
  />
)}
```

### 6.2 Add Bubble to Render Surface

**Consideration:** Should Bubble appear on `/r/:artifactId`?

Per spec: Yes — Bubble is the continuity layer, present for iteration.

**Add:** Minimized Bubble in bottom-right, expands for commands like:
- "Filter by price under 5000"
- "Make it a bar chart"
- "Reset the game"

---

## Phase 7: Testing

### 7.1 Unit Tests

**Location:** `lib/render/__tests__/`

**Tests to Add:**
- `template-selector.test.ts` — template selection logic
- `listings.test.ts` — listings schema validation
- `table.test.ts` — table schema validation

### 7.2 Integration Tests

**Test Scenarios:**

1. **Image Render Flow:**
   - Send "render a sunset" message
   - Verify renderPending: true returned
   - Call /api/render
   - Verify artifact created with state RENDERING
   - Verify image generated (mock DALL-E)
   - Verify state → COMPLETE_AWAITING_VIEW
   - Navigate to /r/:id
   - Verify image displays

2. **Chart Render Flow:**
   - Send "visualize this data" with chart data
   - Verify chart artifact created
   - Verify chart renders correctly

3. **Template Selection:**
   - Send data with images/prices → should select listings
   - Send structured array → should select table
   - Send "build tic tac toe" → should select game-simple

4. **Iteration Flow:**
   - Create image
   - Send "make it more colorful"
   - Verify new version created with parent link
   - Verify version number incremented

### 7.3 E2E Tests (Optional)

**Location:** `e2e/render.spec.ts`

- Full flow from chat to render to iteration

---

## Phase 8: Verification Checklist

### Render System (v1.5)

- [ ] "Render a sunset" → shows "Rendering..." → "Render complete" → image displays
- [ ] "Visualize this data" with data → chart displays
- [ ] "Make it more colorful" → creates new version
- [ ] Error state shows retry options
- [ ] Cancel works correctly
- [ ] Version history navigation works

### Template System (v1.5.1)

- [ ] ArtifactType.TEMPLATE exists in Prisma
- [ ] Template selector identifies listings/table/game correctly
- [ ] Listings template renders with filters and sort
- [ ] Table template renders with sort and pagination
- [ ] Tic-tac-toe is playable
- [ ] Game controls work (keyboard + touch)
- [ ] Bubble commands work on render surface

---

## Files to Create/Modify Summary

### New Files

```
lib/render/templates/
├── index.ts
├── types.ts
├── selector.ts
├── listings.ts
└── table.ts

lib/render/__tests__/
├── template-selector.test.ts
├── listings.test.ts
└── table.test.ts

components/render/templates/
├── index.ts
├── TemplateDispatcher.tsx
├── ListingsTemplate.tsx
├── TableTemplate.tsx
├── GameControls.tsx
└── TicTacToeTemplate.tsx
```

### Modified Files

```
prisma/schema.prisma                    # Add TEMPLATE to ArtifactType
lib/render/types.ts                     # Add template types
lib/render/index.ts                     # Export new modules
app/r/[artifactId]/page.tsx             # Add template rendering
components/oscar/OscarChat.tsx          # Wire render flow (or equivalent)
components/oscar/OSCARBubble.tsx        # Add render states
```

---

## Success Criteria

### Minimum Viable (P0)

1. User can say "render a sunset" and see generated image
2. User can say "visualize this data" and see chart
3. Bubble shows "Rendering..." and "Would you like to see it?"
4. User can navigate to /r/:id and see artifact

### Full Build (P0 + P1)

All P0 plus:
5. Listings template works with filters/sort
6. Table template works with sort/pagination
7. Template selection infers correct type from data

### Complete (P0 + P1 + P2)

All above plus:
8. Tic-tac-toe is playable
9. Game controls component works
10. All tests pass

---

## Notes for Autonomous Mode

- Read RENDER_SYSTEM_SPEC.md first — follow it exactly
- Read TEMPLATE_SYSTEM_SPEC.md second
- The canonical render loop (Section 2 of render spec) is **locked** — don't change the UX pattern
- Use existing component patterns from the codebase
- Run `pnpm typecheck` frequently to catch type errors
- Run existing tests to ensure nothing breaks

---

## Version Notes

- **v1.5**: Render System (image + chart) — THIS BUILD
- **v1.5.1**: Template System foundation — THIS BUILD
- **v1.6**: Additional templates, sandbox for games
- **v2.0**: OSQR writes to external systems
- **v2.1**: "Find It" aggregator (data fetching from external APIs)

---

*Build plan created December 27, 2025*
