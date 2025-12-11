# OSQR Knowledge Architecture

**Status:** Architectural Decision
**Last Updated:** 2025-12-10
**Owner:** Kable Record

---

## Overview

OSQR has **two brains** — a shared Global Knowledge Index and per-user Private Knowledge Vaults. This separation is fundamental to OSQR's privacy-first, context-rich intelligence.

### The Core Principle

> **"A privacy-first, context-rich, non-training-based intelligence engine."**

This means:
- OSQR gets smarter *for you* without turning your life into training data
- Your vault is yours — OSQR never trains on user content
- Global frameworks benefit everyone without exposing anyone

---

## The Two-Brain Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OSQR INTELLIGENCE                            │
│                                                                       │
│  ┌─────────────────────────┐    ┌─────────────────────────────────┐ │
│  │   GLOBAL KNOWLEDGE      │    │   PRIVATE KNOWLEDGE (PKV)       │ │
│  │   INDEX (GKVI)          │    │   Per-User Vault                │ │
│  │                         │    │                                 │ │
│  │ • OSQR frameworks       │    │ • User's files                  │ │
│  │ • Capability Ladder     │    │ • User's conversations          │ │
│  │ • Fourth Gen Formula    │    │ • User's MSC entries            │ │
│  │ • Core Commitments      │    │ • User's goals & projects       │ │
│  │ • Mode definitions      │    │ • User's profile answers        │ │
│  │ • Coaching philosophy   │    │ • User's uploaded documents     │ │
│  │ • UX principles         │    │ • User's reflections            │ │
│  │                         │    │                                 │ │
│  │ SHARED BY ALL USERS     │    │ ISOLATED PER USER               │ │
│  └─────────────────────────┘    └─────────────────────────────────┘ │
│                                                                       │
│                    ┌─────────────────────┐                           │
│                    │   MODEL LAYER       │                           │
│                    │   Claude / GPT-4o   │                           │
│                    │   Raw Intelligence  │                           │
│                    └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Golden Rule

### **"If it teaches OSQR how to BE OSQR, it's global."**
### **"If it teaches OSQR about YOU, it's private."**

That's the entire rule.

| Question | Answer | Why |
|----------|--------|-----|
| Capability Ladder | Global | Defines how OSQR assesses all users |
| User's capability level | Private | Specific to that user |
| Fourth Generation Formula | Global | Universal framework for growth |
| User's 90-day plan | Private | Their personal application |
| Refine → Fire logic | Global | How OSQR processes questions |
| User's refined question | Private | Their specific question |
| MSC structure | Global | Defines what MSC categories exist |
| User's MSC entries | Private | Their goals, projects, habits |

---

## Global Knowledge Index (GKVI)

### What Goes In

**1. OSQR Operating System Docs**
- How OSQR thinks and behaves
- Mode definitions (Quick, Thoughtful, Contemplate)
- Refine → Fire process
- Panel synthesis logic
- UX philosophy

**2. Foundational Frameworks**
- Fourth Generation Formula
- Capability Ladder (all 13 levels)
- Core Commitments
- Identity → Capability → Action → Persistence
- Foundational Truths

**3. Coaching Philosophy**
- How to give feedback
- Tone and voice guidelines
- Level-appropriate communication
- Challenge vs support balance

**4. System Definitions**
- MSC categories and structure
- Privacy tier definitions
- Feature explanations

### What Does NOT Go In

- Any user-generated content
- Personal business plans
- Private documents
- Proprietary systems
- Personal memories or stories
- Anything embarrassing if leaked
- Anything you wouldn't want ALL users to see

### The Test

Before adding something to global:

> **"Would I want OSQR to teach this to every user?"**

If yes → Global
If no → Keep it out (or put in your own PKV)

---

## Private Knowledge Vault (PKV)

### What Goes In

Everything personal to the user:

- Uploaded files (PDF, DOCX, TXT, JSON)
- Conversation history
- Profile answers
- MSC entries (goals, projects, habits)
- Notes and reflections
- Personal identity scripts
- Business plans
- Proprietary information
- Family/relationship details
- Health and fitness data

### Privacy Guarantees

From [PRIVACY_TIERS.md](./PRIVACY_TIERS.md):

| Guarantee | Implementation |
|-----------|----------------|
| No human access | Founder cannot read user vaults |
| No cross-user access | User A cannot see User B's data |
| No training | PKV content never trains models |
| User deletion | Users can delete all data instantly |
| Encryption | All PKV data encrypted at rest |

### Isolation Model

```
User A's PKV ──────┐
                   │
User B's PKV ──────┼──→ NEVER MIXED
                   │
User C's PKV ──────┘

Each query only accesses:
1. Global Index (shared)
2. That user's PKV (isolated)
```

---

## Query Flow

When a user asks OSQR a question:

```
1. User asks: "How do I build discipline?"
                    │
                    ▼
2. OSQR determines what knowledge is needed:
   • Global frameworks? ✓ (Capability Ladder, Core Commitments)
   • User context? ✓ (Their current level, goals, history)
                    │
                    ▼
3. OSQR retrieves relevant chunks:
   • From GKVI: Capability Ladder levels, Core Commitments list
   • From PKV: User's current level (3), their stated goals
                    │
                    ▼
4. OSQR builds prompt for model:
   "You are OSQR. Use the Fourth Generation Formula.
    User is at Level 3 (Structured Beginner).
    Their goal is [from PKV].
    Here are the Core Commitments [from GKVI].
    Answer their question about discipline."
                    │
                    ▼
5. Model generates response using OSQR's frameworks
                    │
                    ▼
6. Response delivered — PKV content never leaves user's context
```

---

## How OSQR "Learns"

OSQR improves without reading user content:

### Method 1: Framework Application (Real-time)

OSQR loads global frameworks into every conversation.
The more refined the frameworks, the better OSQR performs.
This requires updating GKVI, not reading user data.

### Method 2: Behavioral Patterns (Tier B/C Only)

From [BEHAVIORAL_INTELLIGENCE_LAYER.md](./BEHAVIORAL_INTELLIGENCE_LAYER.md):

OSQR tracks patterns like:
- "Most users ask about discipline on Mondays"
- "Users at Level 3 prefer Quick mode"
- "Contemplate mode has 40% higher satisfaction"

These are **statistical patterns**, not content.
No user text is ever stored or analyzed.

### Method 3: User Feedback (Anonymized)

Thumbs up/down on responses.
Mode preference signals.
Feature usage patterns.

All anonymized, never linked to content.

---

## Technical Implementation

### Phase 1: Global Index Foundation

**Location:** `lib/knowledge/global-index.ts`

**Structure:**
```typescript
interface GlobalKnowledgeIndex {
  // Framework documents
  frameworks: {
    capabilityLadder: Document
    fourthGenFormula: Document
    coreCommitments: Document
    foundationalTruths: Document
  }

  // OSQR system docs
  system: {
    modes: Document
    refineFire: Document
    panelLogic: Document
    mscStructure: Document
  }

  // Coaching guidelines
  coaching: {
    toneGuidelines: Document
    levelAppropriateComms: Document
  }
}
```

**Retrieval:**
```typescript
async function getGlobalContext(query: string): Promise<string[]> {
  // Vector search against GKVI
  // Return relevant chunks
  // Never touches user PKV
}
```

### Phase 2: Query Routing

**Location:** `lib/knowledge/query-router.ts`

```typescript
async function routeQuery(
  query: string,
  userId: string
): Promise<{
  globalChunks: string[]
  userChunks: string[]
}> {
  // 1. Always search global index
  const globalChunks = await searchGlobalIndex(query)

  // 2. Search user's PKV (isolated)
  const userChunks = await searchUserPKV(query, userId)

  // 3. Never mix user data across users
  return { globalChunks, userChunks }
}
```

### Database Schema

No new tables needed. Global index uses same Document/Chunk structure but with:
- `workspaceId: null` for global docs
- `isGlobal: true` flag

```prisma
model Document {
  id          String   @id
  workspaceId String?  // null = global
  isGlobal    Boolean  @default(false)
  // ... rest of fields
}
```

---

## What to Index First (V1)

Priority order for global index:

### Must Have (Alpha)
1. Capability Ladder (all 13 levels)
2. Mode definitions (Quick, Thoughtful, Contemplate)
3. Refine → Fire process
4. Basic coaching tone

### Should Have (Beta)
5. Fourth Generation Formula
6. Core Commitments
7. MSC structure
8. Level-appropriate communication

### Nice to Have (Founding Users)
9. Foundational Truths
10. Advanced coaching guidelines
11. Identity script templates
12. Book recommendations per level

---

## Privacy Enforcement

### What Founder Can See

| Data | Visible | Why |
|------|---------|-----|
| Total users | ✓ | Business metric |
| Active users | ✓ | Business metric |
| Mode usage stats | ✓ | Product analytics |
| Error logs | ✓ | Debugging (no content) |
| Feature adoption | ✓ | Product decisions |

### What Founder Cannot See

| Data | Visible | Why |
|------|---------|-----|
| User conversations | ✗ | Privacy promise |
| User questions | ✗ | Privacy promise |
| User PKV | ✗ | Privacy promise |
| User MSC entries | ✗ | Privacy promise |
| User files | ✗ | Privacy promise |

### Optional Debug Mode (Future)

If needed for support:
- User explicitly enables "Developer Mode"
- Red badge shows "Messages may be viewed"
- Auto-expires after 24 hours
- Disabled by default
- Only in Tier C with warnings

**Not implemented at launch.** Trust is the differentiator.

---

## Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) — System architecture
- [PRIVACY_TIERS.md](./PRIVACY_TIERS.md) — Privacy tier details
- [BEHAVIORAL_INTELLIGENCE_LAYER.md](./BEHAVIORAL_INTELLIGENCE_LAYER.md) — How OSQR learns
- [ROADMAP.md](../ROADMAP.md) — Implementation timeline

---

## Summary

OSQR's knowledge architecture is built on one principle:

> **Global knowledge makes OSQR smart.**
> **Private knowledge makes OSQR personal.**
> **Never mix them.**

This creates:
- Consistent OSQR behavior across all users
- Deep personalization per user
- Zero privacy risk
- Maximum trust

The result: *"A privacy-first, context-rich, non-training-based intelligence engine."*
