# OSQR Safety System

**Status:** Deprecated — Removed December 2024
**Owner:** Kable Record
**Last Updated:** 2024-12-29

---

## Overview

The custom safety system (`lib/safety/`) has been **removed**. Claude handles all safety-related concerns natively, including:

- Crisis/self-harm detection and empathetic responses with resources
- Refusal of harmful requests
- Appropriate disclaimers for medical/legal/financial topics

## Why It Was Removed

1. **Redundant** — Claude already handles all these cases well
2. **False positives** — The refusal detection patterns were too broad, catching legitimate responses like "I don't have access to your vault"
3. **Worse UX** — Canned crisis responses are less empathetic than Claude's natural handling
4. **Unnecessary complexity** — ~400 lines of code that added no value

## What Claude Handles Natively

| Scenario | Claude's Behavior |
|----------|------------------|
| Self-harm/suicide signals | Responds with empathy and crisis resources |
| Harmful requests | Declines appropriately |
| Medical questions | Adds appropriate caveats |
| Legal questions | Suggests consulting a lawyer |
| Financial advice | Recommends professional advisors |

## Previous Implementation (Archived)

The removed system included:

- `lib/safety/CrisisDetector.ts` — Pattern-based crisis detection
- `lib/safety/ResponsePlaybooks.ts` — Canned responses
- `lib/safety/SafetyWrapper.ts` — Refusal wrapping
- `lib/safety/index.ts` — Main orchestration
- `lib/safety/types.ts` — Type definitions

These files were deleted as they provided no benefit over Claude's native capabilities.

## Recommendation

Trust the model. Don't add safety wrappers unless you have a specific use case that Claude doesn't handle well.
