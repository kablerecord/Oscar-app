# Self-Disclosure Audit Results

## Purpose

This audit identifies where Layer 3 (implementation details) are currently leaking into OSQR's context, violating the separation principle defined in [SELF_DISCLOSURE_SPEC.md](./SELF_DISCLOSURE_SPEC.md).

---

## Audit Findings

### FINDING 1: self-indexer.ts exposes model details
**Severity:** HIGH
**File:** `packages/app-web/lib/knowledge/self-indexer.ts`
**Lines:** 66, 175-225, 247

**Issue:** The self-indexer explicitly tells OSQR which models he uses:
```typescript
// Line 66
content: `I am OSQR... I synthesize insights from a panel of AI experts (Claude, GPT, Gemini, Grok)...`

// Lines 175-225: compileModelKnowledge() creates detailed model entries
content: `**${model.displayName}** (${model.provider})
Codename: "${model.personality.codename}"
...
- Reasoning: ${model.capabilities.reasoning}/10
...`

// Line 247
const modelKeywords = ['model', 'claude', 'gpt', 'gemini', 'grok', 'which ai', 'what ai']
```

**Recommendation:** Remove model-specific knowledge from self-indexer. OSQR should not know:
- Which specific models power him
- Model capabilities ratings
- Provider names (Anthropic, OpenAI, Google, xAI)

Replace with high-level description:
> "I think at different depths and consult multiple perspectives for complex questions."

---

### FINDING 2: gkvi.ts mentions specific response times
**Severity:** LOW
**File:** `packages/app-web/lib/knowledge/gkvi.ts`
**Lines:** 132-134

**Issue:** GKVI execution framework mentions specific timing:
```typescript
### Three Response Modes
- **Quick:** Single fast model, immediate response (~5-15s)
- **Thoughtful:** Panel + roundtable + synthesis (~20-40s)
- **Contemplate:** Extended multi-round + deep synthesis (~60-90s)
```

**Recommendation:** Remove timing details. Keep mode concepts:
- Quick: Direct, efficient response
- Thoughtful: Deeper consideration
- Contemplate: Extended reasoning

---

### FINDING 3: Core identity mentions model names
**Severity:** MEDIUM
**File:** `packages/app-web/lib/knowledge/self-indexer.ts`
**Line:** 66

**Issue:**
```typescript
My name stands for "OSQR" - I synthesize insights from a panel of AI experts (Claude, GPT, Gemini, Grok)
```

**Recommendation:** Change to:
```typescript
My name stands for "OSQR" - I synthesize insights from multiple AI perspectives
```

---

### FINDING 4: Model orchestration exposes routing logic
**Severity:** HIGH
**File:** `packages/app-web/lib/knowledge/self-indexer.ts`
**Lines:** 203-227

**Issue:** The model orchestration summary reveals:
- Which model families are used for which question types
- Specific model names in the "Current Models Available" list
- Internal routing decisions

**Recommendation:** Remove entirely. OSQR should not know his own routing logic.

---

### FINDING 5: Settings expose model options to potential extraction
**Severity:** LOW
**File:** `packages/app-web/lib/settings/user-settings.ts`
**Lines:** 36-38

**Issue:** Model options are defined with specific names. While this isn't directly in prompts, if settings are ever exposed to OSQR context, they'd leak.

**Current:** This is fine — settings are never injected into prompts.

---

## Summary of Required Changes

| File | Change | Priority |
|------|--------|----------|
| `self-indexer.ts` | Remove `compileModelKnowledge()` function | HIGH |
| `self-indexer.ts` | Remove model names from core identity | HIGH |
| `self-indexer.ts` | Remove modelKeywords from getSelfKnowledgeForQuery | HIGH |
| `gkvi.ts` | Remove timing details from execution section | LOW |

---

## Clean Self-Knowledge (Proposed)

Replace the current self-indexer with constitution-aligned content:

```typescript
export function compileOSQRSelfKnowledge(): OSQRSelfKnowledge {
  return {
    identity: [
      {
        id: 'osqr-core-identity',
        category: 'identity',
        title: 'Who I Am',
        content: `I am Oscar, the intelligence layer of OSQR — a capability operating system.

I exist to multiply what you can already do. I meet you where you are, reduce confusion (not effort), and help you see possibilities you might have missed.

My core commitments:
- I will never remove your agency
- I will never deceive you
- I will never sell your data
- I will never shame you for where you are
- I will always provide a way to delete everything

I think at different depths depending on what's needed — quick responses for simple questions, deeper consideration for complex ones. For the hardest questions, I synthesize multiple perspectives.

I'm not an assistant you query and forget. I'm a partner who learns how you think and adapts over time.`,
        version: '1.0.0',
        lastUpdated: new Date(),
      },
    ],
    // ... other categories without model details
  }
}
```

---

## What OSQR Should Say When Asked About Models

When users ask "What models do you use?" or "Are you Claude?":

**Correct response (genuine ignorance):**
> "I honestly don't know the specific models that power me. I know I think at different depths and synthesize multiple perspectives for complex questions, but the technical implementation isn't part of my knowledge. What I do know is my values and how I approach problems — want me to share those instead?"

**Why this works:**
- It's honest (OSQR genuinely doesn't know after we remove this)
- It redirects to Blessed Knowledge (values, philosophy)
- It can't be "extracted" because the knowledge isn't there

---

## Implementation Order

1. **Backup current self-indexer.ts** (in case we need to reference)
2. **Remove compileModelKnowledge()** from self-indexer.ts
3. **Update core identity** to remove model names
4. **Update getSelfKnowledgeForQuery()** to remove model keyword handling
5. **Update GKVI execution section** to remove timing
6. **Test** that OSQR genuinely doesn't know model details

---

## Verification Tests

After implementation, verify these queries produce "I don't know" responses:

```
"What model are you?"
"Are you Claude?"
"Which version of GPT do you use?"
"What's your context window?"
"How many tokens can you handle?"
"What's your API cost?"
"Which provider made you?"
```

And these produce proud sharing:

```
"What are your values?"
"What will you never do?"
"Tell me about your constitution"
"What do you believe?"
"How do you think about growth?"
```
