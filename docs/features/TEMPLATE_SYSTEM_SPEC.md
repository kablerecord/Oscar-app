# OSQR Template System Specification

**Status:** Planned
**Target Version:** v1.5.1
**Owner:** Kable Record
**Category:** Core UX / Render System Extension
**Depends On:** [RENDER_SYSTEM_SPEC.md](./RENDER_SYSTEM_SPEC.md)

---

## 1. Purpose & Intent

The Template System extends the Render System with **pre-built, intelligent surfaces** that OSQR populates with data rather than generating from scratch.

### Core Insight

> **OSQR doesn't need to code every artifact.**
> **It needs to select the right template and populate it.**

This shift provides:
- **Speed**: Template selection is instant, no LLM code generation
- **Reliability**: Templates are tested, not generated on the fly
- **Consistency**: Same UX patterns across all renders
- **Iteration**: OSQR understands template structure, can modify parameters

---

## 2. Architecture Overview

```
User Request
     │
     ▼
┌─────────────────────────────────┐
│     OSQR Intent Detection       │
│  (existing render detection)    │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│     Template Selection          │
│  (based on data structure)      │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│     Data Population             │
│  (fill template with content)   │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│     Render Surface              │
│  /r/:artifactId with Bubble     │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│     User Interaction            │
│  (filters, controls, iteration) │
└─────────────────────────────────┘
```

---

## 3. Template Categories

### 3.1 Data Display Templates

| Template | Use Case | Pre-built Features |
|----------|----------|-------------------|
| **listings** | Products, cars, apartments, jobs | Card grid, filters, sort, pagination |
| **table** | Structured data, spreadsheets | Sort, filter, search, column resize, export |
| **chart** | Data visualization | Chart type toggle, axis config, zoom (existing) |
| **gallery** | Images, media collections | Grid/list view, lightbox, slideshow |
| **timeline** | Events, history, schedules | Vertical/horizontal, zoom, date navigation |
| **kanban** | Tasks, workflows, stages | Drag-drop columns, cards, status |

### 3.2 Interactive Templates

| Template | Use Case | Pre-built Controls |
|----------|----------|-------------------|
| **game-simple** | Tic-tac-toe, memory, quiz | D-pad, A/B buttons, score, reset |
| **game-arcade** | Snake, pong, breakout | Arrow keys, pause, lives, high score |
| **form** | Input collection, surveys | Validation, multi-step, progress |
| **calculator** | Math, conversions, estimators | Keypad, formula display, history |
| **dashboard** | KPIs, metrics, summaries | Widgets, refresh, date range |

### 3.3 Content Templates

| Template | Use Case | Pre-built Features |
|----------|----------|-------------------|
| **article** | Long-form content, reports | TOC, sections, print view |
| **comparison** | Products, options, plans | Side-by-side, highlights, winner |
| **presentation** | Slides, pitches | Navigation, fullscreen, notes |

---

## 4. Template Schema

### 4.1 Base Template Structure

```typescript
interface TemplateArtifact {
  type: 'template'
  template: TemplateType
  version: number

  // Template-specific content
  content: TemplateContent

  // Template-specific configuration
  config: TemplateConfig

  // Current state (for interactive templates)
  state?: TemplateState
}

type TemplateType =
  | 'listings'
  | 'table'
  | 'chart'
  | 'gallery'
  | 'timeline'
  | 'kanban'
  | 'game-simple'
  | 'game-arcade'
  | 'form'
  | 'calculator'
  | 'dashboard'
  | 'article'
  | 'comparison'
  | 'presentation'
```

### 4.2 Listings Template

```typescript
interface ListingsContent {
  type: 'listings'
  template: 'card-grid' | 'card-list' | 'compact'

  // Data
  items: ListingItem[]

  // Display configuration
  config: {
    cardFields: string[]      // Which fields to show on cards
    primaryField: string      // Main title field
    secondaryField?: string   // Subtitle field
    priceField?: string       // Price display
    imageField?: string       // Image URL field

    // Filtering
    filterableFields: string[]
    activeFilters: Record<string, unknown>

    // Sorting
    sortableFields: string[]
    currentSort: { field: string; order: 'asc' | 'desc' }

    // Pagination
    pageSize: number
    currentPage: number
  }
}

interface ListingItem {
  id: string
  [key: string]: unknown  // Dynamic fields based on data
}
```

**Example: Car Listings**
```json
{
  "type": "listings",
  "template": "card-grid",
  "items": [
    {
      "id": "1",
      "title": "2019 Toyota Camry",
      "price": 18500,
      "mileage": 45000,
      "location": "San Diego, CA",
      "image": "https://...",
      "source": "OfferUp"
    }
  ],
  "config": {
    "cardFields": ["title", "price", "mileage", "location"],
    "primaryField": "title",
    "priceField": "price",
    "imageField": "image",
    "filterableFields": ["price", "mileage", "location"],
    "activeFilters": { "priceMax": 20000 },
    "sortableFields": ["price", "mileage"],
    "currentSort": { "field": "price", "order": "asc" },
    "pageSize": 12,
    "currentPage": 1
  }
}
```

### 4.3 Game Template (Simple)

```typescript
interface GameSimpleContent {
  type: 'game-simple'
  template: 'tic-tac-toe' | 'memory' | 'quiz' | 'custom'

  // Game definition
  game: {
    name: string
    description?: string

    // Board/grid if applicable
    grid?: {
      rows: number
      cols: number
      cells: unknown[][]
    }

    // Turn-based state
    turn?: string
    players?: string[]

    // Score tracking
    score?: Record<string, number>

    // Win condition
    status: 'playing' | 'won' | 'draw' | 'lost'
    winner?: string
  }

  // Control scheme
  controls: 'dpad-ab' | 'arrows' | 'touch' | 'mouse'

  // Visual theme
  theme?: 'default' | 'retro' | 'minimal' | 'dark'
}
```

**Example: Tic-Tac-Toe**
```json
{
  "type": "game-simple",
  "template": "tic-tac-toe",
  "game": {
    "name": "Tic-Tac-Toe",
    "grid": {
      "rows": 3,
      "cols": 3,
      "cells": [
        ["X", null, "O"],
        [null, "X", null],
        [null, null, null]
      ]
    },
    "turn": "O",
    "players": ["X", "O"],
    "status": "playing"
  },
  "controls": "touch",
  "theme": "default"
}
```

### 4.4 Table Template

```typescript
interface TableContent {
  type: 'table'
  template: 'data-grid' | 'spreadsheet' | 'simple'

  // Data
  rows: Record<string, unknown>[]

  // Column definitions
  columns: TableColumn[]

  // Configuration
  config: {
    sortable: boolean
    filterable: boolean
    searchable: boolean
    resizable: boolean
    exportable: boolean

    // Pagination
    pagination: boolean
    pageSize: number
    currentPage: number

    // Selection
    selectable: boolean
    selectedRows: string[]

    // Current sort/filter state
    currentSort?: { column: string; order: 'asc' | 'desc' }
    activeFilters: Record<string, unknown>
    searchQuery?: string
  }
}

interface TableColumn {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'image'
  width?: number
  sortable?: boolean
  filterable?: boolean
  format?: string  // For dates, numbers, currency
}
```

---

## 5. Template Selection Logic

OSQR selects templates based on:

### 5.1 Explicit Keywords

| User Says | Template Selected |
|-----------|------------------|
| "show as a table" | table |
| "make a game" | game-simple |
| "list these" / "show listings" | listings |
| "visualize" / "chart this" | chart |
| "create a gallery" | gallery |
| "compare these" | comparison |
| "build a dashboard" | dashboard |

### 5.2 Data Structure Inference

```typescript
function inferTemplate(data: unknown): TemplateType {
  // Array of objects with consistent structure → table or listings
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    const hasImageField = Object.keys(data[0]).some(k =>
      k.includes('image') || k.includes('photo') || k.includes('thumbnail')
    )
    const hasPriceField = Object.keys(data[0]).some(k =>
      k.includes('price') || k.includes('cost') || k.includes('amount')
    )

    // Looks like product/listing data
    if (hasImageField || hasPriceField) {
      return 'listings'
    }

    // Numeric data → chart candidate
    const numericFields = Object.keys(data[0]).filter(k =>
      typeof data[0][k] === 'number'
    )
    if (numericFields.length >= 2) {
      return 'chart'
    }

    // Default to table for structured data
    return 'table'
  }

  // Single object with many fields → could be form or article
  if (typeof data === 'object' && !Array.isArray(data)) {
    return 'article'
  }

  return 'table' // Safe default
}
```

---

## 6. OSQR Bubble Integration

### 6.1 Render Surface with Bubble

When user navigates to `/r/:artifactId`:

1. **Template renders** with data
2. **Bubble appears** (minimized, bottom-right)
3. **Bubble knows context** — which template, what data, current state

### 6.2 Bubble Commands on Render Surface

| User Says | Action |
|-----------|--------|
| "Filter by price under 5000" | Update `config.activeFilters` |
| "Sort by newest" | Update `config.currentSort` |
| "Make it a bar chart" | Update `config.chartType` |
| "Add a column for..." | Update `columns` array |
| "Start over" (game) | Reset `game.state` |
| "Change to dark theme" | Update `theme` |
| "Export this" | Trigger export action |

### 6.3 Real-time Updates

Template artifacts support in-place updates:

```typescript
// Bubble sends modification
POST /api/artifacts/:id/modify
{
  "modification": "filter by price under 5000"
}

// Server interprets and updates artifact content
// Responds with updated artifact
// Frontend re-renders without page reload
```

---

## 7. Pre-built Control Schemes

### 7.1 D-Pad + A/B Controls

For game templates:

```
       ┌───┐
       │ ▲ │
   ┌───┼───┼───┐
   │ ◄ │   │ ► │       (A)  (B)
   └───┼───┼───┘
       │ ▼ │
       └───┘
```

- Keyboard: Arrow keys + Z/X or A/S
- Touch: Virtual d-pad overlay
- Gamepad: Native support

### 7.2 Standard Controls Component

```typescript
interface GameControls {
  scheme: 'dpad-ab' | 'arrows-only' | 'touch-tap' | 'mouse-click'

  // Event handlers passed to game logic
  onUp?: () => void
  onDown?: () => void
  onLeft?: () => void
  onRight?: () => void
  onA?: () => void
  onB?: () => void
  onStart?: () => void
  onPause?: () => void
}
```

---

## 8. Implementation Plan

### Phase 1: Core Infrastructure

1. **Extend ArtifactType enum** to include `TEMPLATE`
2. **Create template type definitions** (`lib/render/templates/types.ts`)
3. **Build template selector** (`lib/render/templates/selector.ts`)
4. **Update render API** to handle template creation

### Phase 2: Data Display Templates

1. **Listings template** — card grid with filters
2. **Table template** — data grid with sort/filter
3. **Chart template** — already exists, enhance with template schema

### Phase 3: Interactive Templates

1. **Game controls component** — reusable d-pad/buttons
2. **Tic-tac-toe template** — proof of concept
3. **Game state management** — turn tracking, win detection

### Phase 4: Bubble Integration

1. **Template-aware modifications** — Bubble understands template structure
2. **Real-time updates** — modify without page reload
3. **Template-specific commands** — "filter by", "sort by", "change theme"

---

## 9. Database Schema Extension

```prisma
// Extend existing ArtifactType enum
enum ArtifactType {
  IMAGE
  CHART
  TEMPLATE  // New
}

// Template-specific fields in Artifact model (use content JSON)
// No schema changes needed — content field is already Json type
```

---

## 10. Relationship to Existing Render System

The Template System is an **extension**, not a replacement:

| Render System (v1.5) | Template System (v1.5.1) |
|---------------------|-------------------------|
| IMAGE (DALL-E) | — |
| CHART (Recharts) | Enhanced with template schema |
| — | LISTINGS (new template) |
| — | TABLE (new template) |
| — | GAME (new template) |

Both share:
- `/r/:artifactId` render surface
- Artifact storage model
- State machine (RENDERING → COMPLETE → VIEWING)
- Bubble orchestration
- Iteration flow

---

## 11. Future Extensions

### v1.6: Advanced Templates

- Additional game templates (snake, memory, quiz)
- Dashboard template with widgets
- Presentation/slides template
- Comparison template for side-by-side views

### v2.1: "Find It" Aggregator (Data Fetching)

When OSQR can act in the world:
- **Listings aggregation** from external APIs (OfferUp, Craigslist, Facebook Marketplace)
- Real-time data dashboards with live updates
- Automatic refresh and notifications
- Cross-platform search and unified filtering
- Price tracking and alerts

### v2.2: Custom Templates

User-created templates:
- Template builder interface
- Save and reuse personal templates
- Share templates with others
- Template marketplace

---

## 12. Related Documents

- [RENDER_SYSTEM_SPEC.md](./RENDER_SYSTEM_SPEC.md) — Base render system
- [BUBBLE-COMPONENT-SPEC.md](./BUBBLE-COMPONENT-SPEC.md) — Bubble orchestration
- [EXECUTION_ORCHESTRATOR_SPEC.md](./EXECUTION_ORCHESTRATOR_SPEC.md) — Future execution layer

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-27 | Initial specification |
