# Epic: Interface
## Epic ID: E-005

**Status:** Complete
**Priority:** P0
**Last Updated:** 2025-12-20

---

## Overview

The Interface epic provides OSQR's presence layer—the Bubble that embodies OSQR in every surface. It handles proactive intelligence, greeting systems, surface transitions, and the visual representation of OSQR's state.

**Why it matters:** The Bubble is OSQR. Not a UI element, but his presence in the interface. Users should feel OSQR is always available, contextually aware, and ready to help.

---

## Components

| Component | Spec | Status |
|-----------|------|--------|
| Bubble Interface | `docs/features/BUBBLE-COMPONENT-SPEC.md` | Complete |
| Identity Surfaces | `docs/architecture/OSQR-IDENTITY-SURFACES.md` | Complete |
| Greeting System | `components/oscar/OSCARBubble.tsx` | Complete |
| Presence States | bubble-wrapper.ts | Complete |
| Design System | `lib/design-system/` | In Progress |

---

## Stories

| Story ID | Title | Spec | Status |
|----------|-------|------|--------|
| E-005-S001 | Presence States | BUBBLE-COMPONENT-SPEC.md | Complete |
| E-005-S002 | Time-Based Greeting | BUBBLE-COMPONENT-SPEC.md | Complete |
| E-005-S003 | Plugin Prompt Injection | BUBBLE-COMPONENT-SPEC.md | Partial |
| E-005-S004 | Surface Transitions | BUBBLE-COMPONENT-SPEC.md | Complete |
| E-005-S005 | Quick Actions | BUBBLE-COMPONENT-SPEC.md | Complete |
| E-005-S006 | Focus Mode Awareness | bubble-wrapper.ts | Complete |
| E-005-S007 | Accessibility | BUBBLE-COMPONENT-SPEC.md | Complete |
| E-005-S008 | Animation System | globals.css | Complete |

---

## Dependencies

- **Depends on:** E-001 (Governance), E-002 (Memory), E-003 (Intelligence), E-004 (Guidance)
- **Blocks:** E-007 (Ecosystem) — Plugin prompt injection

---

## Success Criteria

- [x] Presence states animate correctly (available, thinking, waiting, connected)
- [x] Greeting matches time of day and user context
- [x] Surface transitions preserve context
- [x] Quick actions are contextual to user state
- [x] Bubble remains accessible in all surfaces
- [x] Accessibility requirements met (ARIA, keyboard navigation)
- [x] Reduced motion respected

---

## Context from Architecture

### Related Components
- Guidance provides proactive content for Bubble
- Memory stores greeting context (last interaction, active project)
- Temporal surfaces time-sensitive items
- Plugins may inject prompts and greetings

### Architecture References
- See: `docs/features/BUBBLE-COMPONENT-SPEC.md` — Full component spec
- See: `docs/architecture/OSQR-IDENTITY-SURFACES.md` — Identity across surfaces
- See: `components/oscar/OSCARBubble.tsx` — Implementation

### Integration Points
- Receives from: Guidance (proactive items), Temporal (commitments), Plugins (prompts)
- Sends to: Router (user messages), Surfaces (transitions)

---

## Testable Invariants

### Pre-conditions
- User is authenticated
- Bubble component is mounted

### Post-conditions
- Presence state reflects actual OSQR status
- Greeting is appropriate for time and context

### Invariants
- Bubble is always accessible (even when other surfaces active)
- Voice activation overrides current surface
- Plugin prompts cannot exceed 3 concurrent
- Greeting plugin override takes precedence when active
- Animations respect prefers-reduced-motion
