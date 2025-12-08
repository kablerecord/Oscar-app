# Assumptions Made During Autonomous Development

*This file tracks assumptions made when information was unclear or minor.*
*Review these when you return.*

---

## Branding: Oscar → OSQR

**Assumption:** Rename all user-facing "Oscar" references to "OSQR" while keeping:
- API route paths as `/api/oscar/` (to avoid breaking changes)
- Component folder as `components/oscar/` (internal organization)
- File names can stay (OscarChat.tsx → remains, just internal naming)

**Reasoning:** Changing route paths would break existing API calls. UI copy should change, internal code organization is less critical.

---

## MSC (Master Summary Checklist) Initial Items

**Assumption:** Will create sample MSC items based on the Capability Ladder framework:
- Goals
- Projects
- Ideas
- Principles
- Habits

**Reasoning:** These categories are defined in the prisma schema and align with the ROADMAP.md specification.

---

## "See Another AI Thinks" Button

**Assumption:** Will add to Quick Mode responses only (per ROADMAP.md section 1.3.1)
- Button appears after OSQR's Quick Mode response
- Clicking queries a different model (GPT-4 if Claude was used, or vice versa)
- Shows comparison side-by-side

**Reasoning:** Follows the exact specification in ROADMAP.md Phase 1.

---

*Last updated: 2025-12-08*
