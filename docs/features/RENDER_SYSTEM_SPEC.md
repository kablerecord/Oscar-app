# OSQR v1.5 Render System

**Status:** Planned
**Target Version:** v1.5
**Owner:** Kable Record
**Category:** Core UX / Execution Surfaces

---

## 1. Purpose & Intent

OSQR v1.5 introduces the **Render System** — the first execution surface where OSQR moves beyond text responses and into **visible, inspectable artifacts**.

The core realization driving this system:

> **AI intelligence is no longer the bottleneck.**
> **Surface area is.**

OSQR already knows how to reason, design, and generate. The missing layer is a controlled place where that intelligence can *land* — safely, visibly, and iteratively.

The Render System establishes OSQR as:
- Not just a chat interface
- Not an autonomous agent acting invisibly
- But an **AI Operating System** that turns intent into artifacts

This system is intentionally **bounded** in v1.5:
- OSQR may **render and visualize**
- OSQR may **not act outside itself**

This sequencing is deliberate and foundational.

---

## 2. The Canonical Render Loop (Locked Pattern)

This interaction pattern becomes a **core OSQR primitive** and should remain consistent across all artifact types.

### Canonical Flow

1. **User (Bubble):**
   "Build a tic tac toe game."

2. **OSQR (Bubble):**
   "Rendering..."
   *(subtle busy animation)*

3. **OSQR (Bubble):**
   **"Render complete. Would you like to see it?"**

4. **User:**
   "Yes."

5. **OSQR:**
   Opens a new page at `/r/<artifactId>` and renders the artifact.

6. **OSQR (Bubble):**
   "How does that look? Want anything changed?"

7. **Iteration:**
   - User requests changes
   - OSQR updates the artifact
   - OSQR announces: **"Render complete."**

### Why This Matters

- **Feels physical** — something was built
- **Preserves user agency** — no forced context switch
- **Creates explicit system states** — no ambiguity
- **Prevents silent autonomy** — everything is visible and consent-driven

---

## 3. Bubble OSQR as the Continuity Layer

Bubble OSQR is the **orchestrator**, not the executor.

Its responsibilities:
- Maintain conversational continuity
- Announce render states
- Ask for consent before showing artifacts
- Collect iteration feedback
- Bridge multiple screens without fragmenting context

From the user's perspective:
- There is **one conversation**
- Outputs appear, update, and evolve
- There is never a feeling of switching tools or modes

This prevents the common failure mode of "two separate products."

---

## 4. Artifact Pages (Render Surfaces)

### Route Pattern

```
/r/:artifactId
```

This is a **universal render surface** controlled entirely by OSQR.

### Artifact Characteristics

Each artifact:
- Has a **type**
- Is **versioned**
- Is **inspectable**
- Is **iterable** via conversation

Artifacts are *not* ephemeral chat outputs. They are durable, reversible objects.

---

## 5. Artifact Types — Render v1 (v1.5 Scope)

Render v1 is intentionally small and safe.

### Supported Types (v1.5)

1. **image**
   - Generated visuals (e.g., car drawings, concept art, mockups)
   - Rendered via simple image display

2. **chart**
   - Data visualizations
   - Default bias toward **line graphs / curves**
   - Reflects the founder's core thinking model

### Deferred Types (v1.6+)

- **ui / game** — Interactive artifacts require sandboxing complexity that doesn't prove the core render loop. Defer until image + chart are solid.

### Explicit Non-Goals (v1.5)

- No filesystem writes
- No deployments
- No external side effects
- No arbitrary code execution
- No silent background actions
- No sandboxed iframe execution (yet)

OSQR v1.5 **shows**, it does not **act in the world**.

---

## 6. Generation & Rendering Mechanics (v1.5)

This section defines exactly how each artifact type is generated, stored, and rendered.

### Render Intent Detection

**v1.5 Approach: Explicit triggers only.**

OSQR recognizes render intent when:

| Trigger | Example |
|---------|---------|
| Explicit command | `/render a line chart of sales data` |
| "render" keyword | "Render me a futuristic car" |
| "visualize" keyword | "Visualize this data" |
| "draw" keyword | "Draw a concept for the logo" |
| "show as chart/image" | "Show this as a chart" |
| "create an image of" | "Create an image of a mountain landscape" |

**Not recognized as render intent (v1.5):**
- "Build me a tic tac toe game" (ambiguous — could be code or visual)
- "Make a website" (execution, not visualization)
- Fuzzy/implicit requests

**Rationale:** Start explicit, add fuzzy detection later once telemetry shows common patterns. Predictable > magical.

---

### IMAGE Artifact

**Generation:**
- API: OpenAI Image API (DALL-E 3)
- Model: `dall-e-3`
- Size: `1024x1024` (default), `1792x1024` or `1024x1792` for wide/tall

**Storage:**
- Store the URL returned by the API (not base64)
- Store the prompt for iteration context

**Content Schema:**
```typescript
interface ImageArtifactContent {
  type: 'image'
  prompt: string              // User's request, refined by OSQR
  revisedPrompt?: string      // DALL-E's revised prompt (if different)
  model: 'dall-e-3'
  size: '1024x1024' | '1792x1024' | '1024x1792'
  imageUrl: string            // URL from OpenAI
  style?: 'vivid' | 'natural' // DALL-E style parameter
}
```

**Rendering:**
- Simple `<img>` tag with the URL
- Lightbox for full-size viewing
- Download button

**Iteration:**
- "Make it more colorful" → New DALL-E call with modified prompt
- Creates new version, links to parent

---

### CHART Artifact

**Generation:**
- OSQR extracts structured data from conversation context
- OSQR generates a **chart spec**, not code
- Spec is deterministic and controlled

**Library:** Recharts (React-native, client-side)

**Supported Chart Types (v1.5):**
- `line` (default)
- `bar`
- `area`

**Content Schema:**
```typescript
interface ChartArtifactContent {
  type: 'chart'
  chartType: 'line' | 'bar' | 'area'
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  xKey: string                // Key in data for X axis
  yKey: string | string[]     // Key(s) in data for Y axis (multiple for multi-line)
  data: Record<string, unknown>[]  // Array of data points
  colors?: string[]           // Line/bar colors
  showLegend?: boolean
  showGrid?: boolean
}
```

**Example Content:**
```json
{
  "type": "chart",
  "chartType": "line",
  "title": "Revenue Growth",
  "xKey": "month",
  "yKey": "revenue",
  "xAxisLabel": "Month",
  "yAxisLabel": "Revenue ($)",
  "data": [
    { "month": "Jan", "revenue": 10000 },
    { "month": "Feb", "revenue": 15000 },
    { "month": "Mar", "revenue": 22000 }
  ],
  "showGrid": true
}
```

**Rendering:**
- Client-side React component reads spec
- Maps spec → Recharts `<LineChart>`, `<BarChart>`, or `<AreaChart>`
- Responsive container

**Iteration:**
- "Add April data" → Update data array, create new version
- "Make it a bar chart" → Change `chartType`, create new version
- "Change title to Q1 Performance" → Update `title`, create new version

---

### Rendering Location

**Decision: Client-side rendering from stored spec.**

Flow:
1. OSQR generates artifact **spec** (JSON)
2. Spec is stored in database (`content` field)
3. User navigates to `/r/:artifactId`
4. Page reads spec from API
5. React component renders based on spec type

**No server-side execution.** No sandboxing. No iframe complexity.

This keeps v1.5 firmly in "visualization, not execution."

---

### Error Handling

**Render Failures:**

| Failure | State | User Message |
|---------|-------|--------------|
| API timeout | `ERROR` | "Render failed. Want me to retry?" |
| API error (rate limit, etc.) | `ERROR` | "Render failed. I can simplify the request and try again." |
| Invalid chart data | `ERROR` | "I couldn't make sense of that data for a chart. Can you clarify?" |
| Image URL expired | `ERROR` | "That image is no longer available. Want me to regenerate it?" |

**Recovery Actions (Bubble buttons):**
- **Retry** → OSQR retries with same parameters
- **Retry (Simplify)** → OSQR reduces complexity (fewer details, simpler chart, fewer series) and retries
- **Cancel** → Artifact moves to `CANCELLED` state

**CANCELLED State:**
- User says "never mind" during RENDERING or after ERROR
- Bubble says: "Cancelled."
- Artifact state = `CANCELLED`
- CANCELLED artifacts not shown in artifact library
- Prompt + settings are preserved for potential future retry

**Recovery behavior:**
- ERROR artifacts are not shown in artifact library
- User can return to ERROR/CANCELLED artifacts via conversation history

---

## 7. Render v2 (Post–v1.5 Evolution)

Render v2 expands capability *after* primitives are proven.

### Additions

- Live updates (SSE / websockets)
- Smooth in-place re-rendering
- Side-by-side version comparison
- Highlighted diffs between versions
- Artifact library ("My Renders")
- Additional chart types (scatter, funnel, timeline)
- Reusable artifact templates

Render v2 does not change the canonical render loop — it deepens it.

---

## 7. Render States (System-Level)

The Render System is a state machine, not magic.

### Core States

- `IDLE`
- `RENDERING`
- `COMPLETE_AWAITING_VIEW`
- `VIEWING`
- `UPDATING`

These states:
- Drive UX
- Enable telemetry
- Prevent ambiguous behavior
- Support future autonomy safely

### State Transitions

```
IDLE
  │ User requests render
  ▼
RENDERING
  │ Generation complete
  ▼
COMPLETE_AWAITING_VIEW
  │ User confirms "yes, show me"
  ▼
VIEWING
  │ User requests changes
  ▼
UPDATING
  │ Update complete
  ▼
COMPLETE_AWAITING_VIEW (or back to VIEWING if auto-show enabled)
```

---

## 8. Why This Is Safe (and Intentional)

Many AI companies avoid "agents acting in the world" because:
- Persistence increases responsibility
- Execution implies accountability
- Silent autonomy erodes trust

OSQR v1.5 avoids these risks by design:
- All actions are visible
- All outputs are consent-gated
- All changes are versioned
- Nothing happens silently

This is **sequenced autonomy**, not reckless autonomy.

### The Responsibility Shift (Acknowledged)

| Mode | Responsibility Model |
|------|---------------------|
| **Chat (advice)** | "Here's how you might do X" — interpretation is user's |
| **Render (artifact)** | "I built X" — OSQR produced something that exists |

OSQR accepts this shift deliberately, with mitigations:
- Consent gates ("Would you like to see it?")
- Versioning (never overwrites, always reversible)
- Visible busy states (not instant magic)
- Clear separation between thinking and output

---

## 9. Relationship to VS Code OSQR & Spoken Development

### Near-Term (v1.5)

- Rendering lives entirely inside OSQR
- Visual artifacts are the execution boundary
- No external side effects

### Long-Term Vision

- VS Code OSQR becomes a background execution engine
- Users never "switch tools"
- The same conversation continues
- The same render surface updates

This enables **Spoken Development**:

> Building software by talking to a persistent intelligence that understands context, renders results, and iterates conversationally — without breaking flow.

VS Code is eventually invisible.

### The Bridge

```
v1.5: OSQR renders → User sees artifact
v2.0: OSQR renders → User approves → OSQR writes to VS Code project
v3.0: OSQR + VS Code are unified → User just talks, things get built
```

---

## 10. Legal & Terms Implications (Forward-Looking)

Because OSQR renders and persists artifacts, it is no longer "just chat."

Future Terms of Use must reflect:
- Visualization vs execution boundaries
- Assistive (not guaranteed) outputs
- User consent gates
- Versioning and reversibility

Importantly: the product design already enforces these principles. The ToS will reflect reality, not constrain it.

### Key Concepts for Future ToS

1. **Rendered artifacts are assistive outputs** — not guarantees, not final products
2. **User confirmation gates matter** — "Would you like to see it?" is UX and legal boundary
3. **Execution vs visualization** — v1.5 is visualization only
4. **Versioning as safety** — nothing is silently overwritten

---

## 11. Implementation Checklist

### Phase 1: Full Core System (v1.5) ← BUILD THIS

**Scope:** Build the complete Render System for image + chart. No sub-phasing.

**Build Order:**

1. **Database & API**
   - [ ] Prisma schema (Artifact model with conversation linking)
   - [ ] Migration
   - [ ] CRUD API routes (`/api/artifacts/`)

2. **Render Intent Detection**
   - [ ] Keyword detection in message processing (`render`, `visualize`, `draw`, etc.)
   - [ ] Route detected intent to render pipeline

3. **Image Artifact**
   - [ ] OpenAI DALL-E 3 integration
   - [ ] Image generation service (`lib/render/image-generator.ts`)
   - [ ] Image content schema validation
   - [ ] Image renderer component

4. **Chart Artifact**
   - [ ] Data extraction from conversation (OSQR generates chart spec)
   - [ ] Chart content schema validation
   - [ ] Recharts-based renderer component (line, bar, area)

5. **Render Surface**
   - [ ] `/r/:artifactId` page
   - [ ] Type-based renderer dispatch
   - [ ] Lightbox for images
   - [ ] Responsive chart container

6. **State Machine**
   - [ ] State transitions (IDLE → RENDERING → COMPLETE_AWAITING_VIEW → VIEWING → UPDATING → ERROR)
   - [ ] State persistence in database
   - [ ] State-driven UI updates

7. **Bubble Integration**
   - [ ] "Rendering..." busy state
   - [ ] "Render complete. Would you like to see it?" announcement
   - [ ] Consent gate before navigation
   - [ ] "How does that look?" follow-up

8. **Iteration Flow**
   - [ ] Detect iteration intent ("make it blue", "add April data")
   - [ ] Create new version linked to parent
   - [ ] Re-announce "Render complete"

9. **Error Handling**
   - [ ] ERROR state handling
   - [ ] User-friendly error messages
   - [ ] Retry flow

**Excluded (v1.6+):**
- UI/Game artifacts (sandbox complexity)
- Live updates (SSE/websockets)
- Side-by-side version comparison
- Artifact library ("My Renders")

### Phase 2: Render v2 (Post-v1.5)

- [ ] UI/Game artifacts with sandboxing
- [ ] Live updates (SSE/websockets)
- [ ] Side-by-side version comparison
- [ ] Diff highlighting
- [ ] Artifact library ("My Renders")
- [ ] Additional chart types (scatter, funnel, timeline)
- [ ] Reusable templates

---

## 12. Database Schema (Prisma)

```prisma
model Artifact {
  id            String   @id @default(cuid())
  userId        String
  workspaceId   String?

  // Type and content
  type          ArtifactType
  title         String?
  content       Json     // Type-specific content (see Content Schemas above)
  metadata      Json?    // Additional metadata

  // Conversation linking
  conversationId String?  // Links to originating conversation
  messageId      String?  // Links to specific message that created it

  // Versioning
  version       Int      @default(1)
  parentId      String?  // Previous version
  parent        Artifact? @relation("ArtifactVersions", fields: [parentId], references: [id])
  children      Artifact[] @relation("ArtifactVersions")

  // State
  state         RenderState @default(IDLE)

  // Telemetry (for debugging and future implicit detection)
  provider      String?      // 'openai', etc.
  model         String?      // 'dall-e-3', etc.
  latencyMs     Int?         // Time to generate
  attemptCount  Int          @default(1)  // Number of attempts (retries)
  errorCode     String?      // Sanitized error code
  errorMessage  String?      // Sanitized error message
  promptHash    String?      // Hash of prompt for duplicate detection

  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  viewedAt      DateTime?

  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace     Workspace? @relation(fields: [workspaceId], references: [id])

  @@index([userId])
  @@index([workspaceId])
  @@index([type])
  @@index([conversationId])
}

enum ArtifactType {
  IMAGE
  CHART
  // UI_GAME — deferred to v1.6+
}

enum RenderState {
  IDLE
  RENDERING
  COMPLETE_AWAITING_VIEW
  VIEWING
  UPDATING
  ERROR
  CANCELLED
}
```

### Conversation Linking Rules

1. **Artifact belongs to conversation** — `conversationId` links to the conversation that created it
2. **Default update target** — When user says "make it blue":
   - First: Update the **most recently VIEWED** artifact in this conversation
   - Fallback: Update the **most recently CREATED** artifact in this conversation
3. **Explicit selection (future)** — "Update the chart from earlier" allows selecting a specific artifact
4. **Cross-conversation reference (future)** — Artifacts can be referenced from other conversations but ownership stays with originating conversation

---

## 13. Core Truth (Lock This In)

> **OSQR v1.5 does not make AI smarter.**
> **It gives intelligence a place to land.**

This is the foundation for everything that follows.

---

## 14. Related Documents

- [BUBBLE-COMPONENT-SPEC.md](./BUBBLE-COMPONENT-SPEC.md) — Bubble orchestration and presence states
- [EXECUTION_ORCHESTRATOR_SPEC.md](./EXECUTION_ORCHESTRATOR_SPEC.md) — V3.0 execution layer (post-Render)
- [VSCODE-DEV-COMPANION.md](../vision/VSCODE-DEV-COMPANION.md) — VS Code integration vision
- [OSQR-JARVIS-CONTINUUM.md](../governance/OSQR-JARVIS-CONTINUUM.md) — Long-term vision

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-26 | Initial specification |
