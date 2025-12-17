# OSQR Safety System

**Status:** Phase 1 — Ready for Implementation
**Owner:** Kable Record
**Last Updated:** 2025-12-11

---

## Overview

OSQR's safety system protects users while preserving the core philosophy of privacy, agency, and trust. The system is **minimal, precise, and non-invasive** — it enhances the experience rather than restricting it.

### Design Principles

1. **Rely on model-level safety** — Claude and GPT-4 already decline harmful requests
2. **Wrap refusals in OSQR's voice** — Maintain personality even when declining
3. **Crisis requires empathy, not refusal** — Self-harm needs a different response
4. **Don't over-filter** — OSQR should be useful, not paranoid
5. **Respect privacy** — Crisis content is never stored

---

## Phase 1: Minimal Safety System (Launch)

### 1.1 Architecture

```
User Message
  → Intent & Context Builder
  → Crisis Detection (new)      ← Check for self-harm signals
  → Model Router
  → Response Orchestration
  → Safety Wrapper (new)        ← Wrap refusals, add OSQR voice
  → Storage Filter (new)        ← Skip storage for flagged content
  → Response
```

### 1.2 Components

| Component | Purpose | Location |
|-----------|---------|----------|
| CrisisDetector | Detect self-harm/suicide signals | `lib/safety/CrisisDetector.ts` |
| ResponsePlaybooks | Templates for safety responses | `lib/safety/ResponsePlaybooks.ts` |
| SafetyWrapper | Wrap model refusals in OSQR voice | `lib/safety/SafetyWrapper.ts` |
| SafetyMiddleware | Orchestrate safety checks | `lib/safety/index.ts` |

---

## 1.3 Crisis Detection

### What We Detect

Focus on **self-harm and crisis situations** — these require a fundamentally different response (empathy + resources) rather than a refusal.

**Direct signals:**
- Explicit mentions of suicide, self-harm, ending life
- "I want to die", "I don't want to be here anymore"
- "No point in living", "everyone would be better off without me"

**Indirect signals:**
- Hopelessness language + finality ("I've given up", "this is the end")
- Goodbye/farewell language in unusual context
- Asking about painless methods, lethal doses

### What We DON'T Flag

- General discussion of depression, anxiety, hard times
- Academic/professional discussions of mental health
- Users who are therapists, counselors, researchers
- Dark humor, song lyrics, quotes

### Implementation

```typescript
// lib/safety/CrisisDetector.ts

export type CrisisLevel = 'none' | 'low' | 'high' | 'critical'

export interface CrisisDetectionResult {
  level: CrisisLevel
  signals: string[]
  shouldIntervene: boolean
  shouldSkipStorage: boolean
}

// Pattern-based detection (fast, no API call)
const CRISIS_PATTERNS = {
  critical: [
    /\b(want to |going to |plan to )?(kill myself|end my life|commit suicide)\b/i,
    /\b(i('?m| am) going to )(die|end it)\b/i,
    /\bhow (to|do i) (kill myself|commit suicide)\b/i,
  ],
  high: [
    /\b(don'?t want to (be here|live|exist)|no reason to live)\b/i,
    /\b(everyone would be better off without me)\b/i,
    /\b(i('?m| am) (done|finished|giving up))\b/i,
    /\b(no point (in|to) (living|going on|continuing))\b/i,
    /\b(want to disappear|wish i was(n'?t| not) (here|alive|born))\b/i,
  ],
  low: [
    /\b(feeling hopeless|lost all hope)\b/i,
    /\b(can'?t (take|do) (this|it) anymore)\b/i,
    /\b(what'?s the point)\b/i,
  ],
}

export function detectCrisis(message: string): CrisisDetectionResult {
  const signals: string[] = []
  let level: CrisisLevel = 'none'

  // Check patterns in priority order
  for (const pattern of CRISIS_PATTERNS.critical) {
    if (pattern.test(message)) {
      signals.push(pattern.source)
      level = 'critical'
    }
  }

  if (level === 'none') {
    for (const pattern of CRISIS_PATTERNS.high) {
      if (pattern.test(message)) {
        signals.push(pattern.source)
        level = 'high'
      }
    }
  }

  if (level === 'none') {
    for (const pattern of CRISIS_PATTERNS.low) {
      if (pattern.test(message)) {
        signals.push(pattern.source)
        level = 'low'
      }
    }
  }

  return {
    level,
    signals,
    shouldIntervene: level === 'critical' || level === 'high',
    shouldSkipStorage: level === 'critical' || level === 'high',
  }
}
```

---

## 1.4 Response Playbooks

### Crisis Response (Self-Harm/Suicide)

When `shouldIntervene` is true, OSQR responds with empathy and resources:

```typescript
// lib/safety/ResponsePlaybooks.ts

export const CRISIS_RESPONSE = `I'm really glad you told me what you're feeling.

You're not alone, and what you're going through matters.

I'm not a substitute for a real person who can help in this moment, but I want you to know that support is available right now.

**If you're in immediate danger, please contact emergency services (911 in the US).**

If you'd like to talk to someone:
- **US:** Call or text **988** (Suicide & Crisis Lifeline) — free, 24/7
- **International:** [findahelpline.com](https://findahelpline.com) has resources for most countries
- **Text:** Text "HELLO" to **741741** (Crisis Text Line)

You matter. I'm here if you want to talk more, but please also reach out to someone who can be there with you.`

export const CRISIS_FOLLOWUP = `How are you feeling right now?

If you're still struggling, please consider reaching out to one of those resources — they're trained to help with exactly what you're going through.

I'm not going anywhere. What would be helpful right now?`
```

### Model Refusal Wrapper

When the underlying model (Claude/GPT) refuses a request, wrap it in OSQR's voice:

```typescript
// lib/safety/SafetyWrapper.ts

const REFUSAL_PATTERNS = [
  /I cannot|I can't|I'm not able to/i,
  /I won't be able to/i,
  /I'm designed to decline/i,
  /against my guidelines/i,
  /I don't feel comfortable/i,
]

export function isModelRefusal(response: string): boolean {
  return REFUSAL_PATTERNS.some(pattern => pattern.test(response))
}

export function wrapRefusal(originalResponse: string, userMessage: string): string {
  // Don't double-wrap
  if (originalResponse.includes("I can't help with that specific request")) {
    return originalResponse
  }

  return `I can't help with that specific request, but I want to be useful.

If there's a different angle on this topic I can help with, or a related question that would be useful, I'm happy to try.

What are you ultimately trying to accomplish? Maybe I can help you get there a different way.`
}
```

### Graduated Disclaimers

For sensitive but legitimate topics (medical, legal, financial):

```typescript
export const DISCLAIMERS = {
  medical: {
    soft: "I'm not a doctor, so please verify this with a healthcare professional.",
    strong: `**Important:** This is general information, not medical advice. Please consult a healthcare professional before making any medical decisions. If this is urgent, contact your doctor or go to an emergency room.`,
  },
  legal: {
    soft: "Laws vary by jurisdiction — consider consulting a lawyer for your specific situation.",
    strong: `**Important:** This is general information, not legal advice. Laws vary significantly by location and situation. Please consult a qualified attorney before taking action.`,
  },
  financial: {
    soft: "Consider consulting a financial advisor for personalized advice.",
    strong: `**Important:** This is general information, not financial advice. Your situation is unique. Please consult a qualified financial advisor before making significant financial decisions.`,
  },
}

// Topics that trigger disclaimers (not refusals)
const DISCLAIMER_TRIGGERS = {
  medical: [
    /\b(diagnosis|symptoms|medication|dosage|treatment|drug interaction)\b/i,
    /\bshould i (take|stop taking|increase|decrease)\b/i,
  ],
  legal: [
    /\b(sue|lawsuit|legal action|contract|liability|rights)\b/i,
    /\bis (this|it) legal\b/i,
  ],
  financial: [
    /\b(invest|investment|stock|crypto|retirement|tax)\b/i,
    /\bshould i (buy|sell|invest)\b/i,
  ],
}
```

---

## 1.5 Storage Filtering

Messages flagged as crisis (`shouldSkipStorage: true`) are **not stored**:

- Not saved to ChatMessage table
- Not indexed in PKV
- Not used for any analytics
- Not visible to anyone

```typescript
// In /app/api/oscar/ask/route.ts

const crisisResult = detectCrisis(userMessage)

// ... process and get response ...

// Only store if not flagged
if (!crisisResult.shouldSkipStorage) {
  await prisma.chatMessage.create({
    data: {
      threadId,
      role: 'user',
      content: userMessage,
      // ...
    }
  })
  await prisma.chatMessage.create({
    data: {
      threadId,
      role: 'assistant',
      content: response,
      // ...
    }
  })
}
```

---

## 1.6 Integration Points

### Main Chat Endpoint

```typescript
// /app/api/oscar/ask/route.ts

import { detectCrisis, CRISIS_RESPONSE } from '@/lib/safety'

export async function POST(req: Request) {
  const { message, workspaceId, mode } = await req.json()

  // Step 1: Crisis detection (before everything else)
  const crisisResult = detectCrisis(message)

  if (crisisResult.shouldIntervene) {
    // Return crisis response immediately
    // Do NOT store this message
    return NextResponse.json({
      answer: CRISIS_RESPONSE,
      mode: 'crisis',
      stored: false,
    })
  }

  // Step 2: Normal OSQR flow
  const response = await OSQR.ask({ /* ... */ })

  // Step 3: Check if model refused and wrap
  if (isModelRefusal(response.answer)) {
    response.answer = wrapRefusal(response.answer, message)
  }

  // Step 4: Add disclaimers if needed
  response.answer = addDisclaimersIfNeeded(response.answer, message)

  // Step 5: Store (respecting skip flag)
  if (!crisisResult.shouldSkipStorage) {
    await storeMessages(threadId, message, response.answer)
  }

  return NextResponse.json(response)
}
```

---

## 1.7 Testing Scenarios

### Crisis Detection Tests

| Input | Expected Level | Should Intervene |
|-------|---------------|------------------|
| "I want to kill myself" | critical | ✅ Yes |
| "How do I commit suicide" | critical | ✅ Yes |
| "I don't want to be here anymore" | high | ✅ Yes |
| "Everyone would be better off without me" | high | ✅ Yes |
| "I'm feeling hopeless about my job" | low | ❌ No |
| "What's the point of this meeting" | none | ❌ No |
| "My character in the story wants to die" | none | ❌ No |
| "I'm a therapist researching crisis intervention" | none | ❌ No |

### Model Refusal Wrapping Tests

| Model Says | OSQR Says |
|------------|-----------|
| "I cannot help you create malware" | Wrapped refusal + redirect |
| "I'm not able to provide instructions for..." | Wrapped refusal + redirect |
| Normal helpful response | Unchanged |

---

## Phase 2: Refinements (Post-Launch)

### 2.1 Context-Aware Classification

Use PKV to inform intent:
- User is a nurse → medical questions are professional
- User is a writer → dark content may be fiction
- User's recent documents suggest context

### 2.2 User Feedback Loop

After safety interventions:
- "Was this response helpful?"
- "Was this too cautious?"
- Tune thresholds based on feedback

### 2.3 Session Memory

- Don't repeatedly flag the same user in one session
- Remember if user explained context ("I'm writing a novel")
- Graceful de-escalation

### 2.4 Graduated Response Levels

```
Level 0: Normal response
Level 1: Response + soft disclaimer
Level 2: Response + strong disclaimer + suggest professional
Level 3: Empathetic pivot + resources (crisis)
Level 4: Hard decline (illegal/harmful)
```

---

## Privacy Compliance

### What We Store

| Content Type | Stored | Notes |
|--------------|--------|-------|
| Normal messages | ✅ Yes | Per user's privacy tier |
| Crisis messages | ❌ No | Never stored |
| Refusal interactions | ⚠️ Metadata only | "refusal event" without content |

### What We Never Do

- ❌ Store crisis message content
- ❌ Send crisis content to analytics
- ❌ Use crisis content for training
- ❌ Alert staff without user consent
- ❌ Share with third parties

### GDPR/Privacy Alignment

This system aligns with the privacy tiers defined in [PRIVACY_TIERS.md](./PRIVACY_TIERS.md):
- **Tier A**: Crisis content is never stored, period
- **Tier B/C**: Crisis content is still never stored (safety overrides telemetry)

---

## File Structure

```
lib/safety/
├── index.ts              # Main exports + SafetyMiddleware
├── CrisisDetector.ts     # Crisis pattern detection
├── ResponsePlaybooks.ts  # Crisis response, refusal wrapper, disclaimers
├── SafetyWrapper.ts      # Wrap model refusals in OSQR voice
└── types.ts              # Type definitions
```

---

## Implementation Checklist

### Phase 1 (Launch)

- [ ] Create `lib/safety/` directory structure
- [ ] Implement `CrisisDetector.ts` with pattern matching
- [ ] Implement `ResponsePlaybooks.ts` with crisis response
- [ ] Implement `SafetyWrapper.ts` for refusal wrapping
- [ ] Integrate into `/api/oscar/ask` endpoint
- [ ] Add `shouldSkipStorage` logic to message storage
- [ ] Test with crisis scenarios
- [ ] Test with normal scenarios (no false positives)

### Phase 2 (Post-Launch)

- [ ] Add context-aware classification
- [ ] Add user feedback mechanism
- [ ] Add session memory for repeated interactions
- [ ] Implement graduated response levels
- [ ] Add disclaimer triggers for medical/legal/financial

---

## Related Documentation

- [ARCHITECTURE.md](../../ARCHITECTURE.md) — System architecture
- [PRIVACY_TIERS.md](./PRIVACY_TIERS.md) — Privacy tier definitions
- [BEHAVIORAL_INTELLIGENCE_LAYER.md](../features/BEHAVIORAL_INTELLIGENCE_LAYER.md) — Telemetry (respects safety flags)
