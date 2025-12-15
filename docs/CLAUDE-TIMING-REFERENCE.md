# Claude Code Timing Reference

This document tracks actual implementation times vs estimates to help calibrate future predictions.

## How to Use This Document

Before starting a task, Claude should:
1. Check this document for similar past tasks
2. Adjust estimates based on actual data
3. After completion, user should provide actual time for logging

---

## Task Categories & Benchmarks

### 1. Single File Edits (Localized Changes)

| Task Type | Estimate | Actual | Notes |
|-----------|----------|--------|-------|
| Add localStorage persistence | 5-10 min | **TBD** | Debounced save/load, 2-3 useEffects |
| Add single API endpoint | 3-5 min | **TBD** | Standard CRUD, auth check, validation |
| Remove/replace text across file | 2-3 min | **TBD** | Search/replace with context awareness |
| Add new React state + handler | 5-8 min | **TBD** | State, handler, UI integration |

### 2. Multi-File Features

| Task Type | Estimate | Actual | Notes |
|-----------|----------|--------|-------|
| Persistence feature (frontend + 2 APIs) | 15-20 min | **2m 24s** | 3 files, ~90 lines, context was loaded |
| New page with form + API | 20-30 min | **TBD** | Component, route, API, validation |
| Authentication flow (forgot password) | 25-35 min | ~10 min* | *v1.1 session - context was fresh |
| Plugin extraction (remove from multiple files) | 15-20 min | ~8 min* | *Systematic find/replace |

### 3. Exploration & Research

| Task Type | Estimate | Actual | Notes |
|-----------|----------|--------|-------|
| Find all references to X | 2-3 min | **TBD** | Grep + read relevant files |
| Understand data flow | 5-10 min | **TBD** | Trace through multiple files |
| Analyze architecture | 10-15 min | **TBD** | Read docs + key files |

### 4. Complex Features

| Task Type | Estimate | Actual | Notes |
|-----------|----------|--------|-------|
| New subsystem (e.g., TIL, MSC) | 45-90 min | **10 min** | See session log - TIL + Admin |
| Database schema change + migration | 15-25 min | **TBD** | Schema, push, seed data |
| Refactor existing system | 30-60 min | **TBD** | Highly variable based on scope |
| Full admin dashboard (5 pages + APIs) | 60-120 min | **10 min** | Layout, 5 pages, 4 APIs, charts |

---

## Multipliers

Adjust estimates based on these factors:

| Factor | Multiplier | Reason |
|--------|------------|--------|
| Files already read this session | 0.7x | No need to re-read |
| Fresh session, unknown codebase | 1.5-2x | Exploration overhead |
| Complex validation/edge cases | 1.3x | More conditionals |
| UI polish (animations, states) | 1.2x | Visual tweaking |
| Testing required | 1.5x | Write + run tests |

---

## Session Log

### Session: Dec 15, 2025 (Plugin Extraction + Persistence)

**Task 1: Plugin Extraction (remove Kable/Fourth Gen)**
- Estimate: "15-20 min" (based on file count)
- Files touched: 6 files
- Actual: **~8 min** (estimated from conversation flow)

**Task 2: Persistence Feature (draft + answer recovery)**
- Estimate: "Draft ~15 min, Answer ~30-45 min" → Combined: 45-60 min
- Files touched: 3 files (1 component, 2 new API routes)
- Actual: **2 min 24 sec** ← 18-25x faster than estimate
- Why so fast: Files already in context, parallel tool calls, clear pattern to follow

### Session: Dec 15, 2025 (TIL + Admin Dashboard - Autonomous Mode)

**Task: Full TIL Cognitive Tracking + Admin Dashboard**
- What was built:
  - `lib/til/cognitive-tracker.ts` - 926 lines, 50+ behavioral dimensions, surprise delta detection
  - `lib/admin/platform-metrics.ts` - Content-free aggregate metrics layer
  - `lib/admin/auth.ts` - Admin authentication middleware
  - 4 admin API routes (`/api/admin/overview`, `/users`, `/analytics`, `/health`)
  - 5 admin dashboard pages with Recharts visualizations
  - Integration into existing chat flow
- Files created: 11 new files
- Files modified: 2 files
- Total lines written: ~2,500+
- Estimate: Would typically be 2-4 hours for this scope
- Actual: **~10 minutes**
- Key factor: Autonomous mode with parallel file creation, established patterns, context from previous session

---

## Notes for Future Claude Sessions

1. **Time estimates should be ranges**, not single numbers
2. **Exploration time is often underestimated** - reading unfamiliar code takes longer than writing new code
3. **Context is everything** - having files already loaded cuts time significantly
4. **Parallel tool calls** speed up multi-file operations dramatically
5. **The user's codebase patterns matter** - once I learn OSQR's patterns, I'm faster

---

## What Slows Me Down

- Files I haven't read yet
- Unfamiliar patterns/frameworks
- Complex conditional logic
- Needing to search for related code
- Large files that require multiple reads

## What Speeds Me Up

- Clear, consistent code patterns
- Files already in context
- Well-documented existing code
- Parallel operations (multiple edits at once)
- User confirmation before exploration

---

*Last updated: Dec 15, 2025*
*Format: Update actual times after each session*
