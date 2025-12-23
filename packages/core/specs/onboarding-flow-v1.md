# OSQR Onboarding Flow
## Version 1.1 | First-Touch Experience Specification

## Document Purpose

This document defines how OSQR introduces himself to new users. The onboarding experience is critical because it:

- Creates the first impression of OSQR as a "thing" not just software
- Demonstrates value before asking for commitment
- Establishes trust through transparent data handling
- Begins building the Personal Knowledge Vault (PKV) naturally
- Sets expectations for what OSQR can do

---

## Core Philosophy

### Traditional SaaS Onboarding
"Sign up → Fill out form → See empty dashboard → Figure it out"

### OSQR Onboarding
"Meet OSQR → Understand trust → Have a conversation → See what he can do → Want more"

### Key Principles

- **Conversation, Not Configuration** — No forms, no lengthy setup wizards
- **Trust Before Upload** — Permission gate appears before document upload
- **Show, Don't Tell** — Demonstrate capability through action
- **Value First** — User gets something useful before any commitment
- **Transparent Reasoning** — Show how insights are generated
- **Natural PKV Building** — Onboarding IS the first memory
- **OSQR Leads** — He guides the experience with personality intact

---

## The Onboarding Journey

### Phase 1: First Contact

**Trigger:** User lands on OSQR for the first time

OSQR appears (Bubble, gentle pulse)

> "Hi. I'm OSQR."
>
> "I'm different from other AI tools you've used. I don't wait for questions — I think about your stuff and surface what matters."
>
> "Want to see what I mean?"

**User options:**
- [Yes, show me] → Proceeds to Phase 2
- [Tell me more first] → Brief capability overview, then Phase 2
- [Skip for now] → Minimal setup, passive onboarding later

---

### Phase 2: The Trust Gate (NEW)

**Goal:** Establish data sovereignty before asking for documents

**Research backing:** MCP protocols show permission-first approaches build significantly higher trust. Users need to see "clear warning lights and override switches" before the AI touches their data.

> "Before you share anything, you should know how I handle your stuff."
>
> "Everything you upload stays yours. I don't train on it. I don't share it. I don't even see it unless you're actively working with me."
>
> "You can delete anything, anytime, and it's gone. Not archived. Gone."

**Visual element:** Simple trust badges or expandable "How your data is protected" panel

**User options:**
- [Got it, let's go] → Proceeds to Phase 3
- [Tell me more about privacy] → Expands to Constitutional Framework summary
- [I'm not comfortable yet] → Offers demo mode with sample document

#### Demo Mode (For Hesitant Users)

> "That's fair. Want to see what I do with a sample document instead? You can try me without uploading anything personal."
>
> [Shows analysis on pre-loaded sample document]
>
> "That's what I'd do with your stuff — if you ever decide to share it."

---

### Phase 3: The Demonstration

**Goal:** Show OSQR's insight capability immediately

> "Upload something you're working on. A document, a note, anything. I'll show you what I notice."

User uploads document

OSQR analyzes (thinking animation, 3-5 seconds)

> "Interesting. Here's what I found..."

**Displays 3-5 insights as cards:**
- Pattern detected
- Question worth asking
- Connection to consider
- Potential issue flagged
- Action item surfaced

#### Reasoning Transparency (NEW)

**Research backing:** Users report higher trust when they can view Chain-of-Thought artifacts showing how the AI reached conclusions.

Each insight card includes expandable reasoning:

| Element | Purpose |
|---------|---------|
| Insight headline | What OSQR found (visible by default) |
| [How I found this →] | Expandable reasoning trail |
| Source reference | Link to specific document section |
| Confidence indicator | Visual cue for insight certainty |

**Example expanded reasoning:**

> "I noticed 'Q2 deadline' mentioned in paragraph 3, but your timeline section shows Q3. I flagged this as a potential conflict. [View in document]"

> "That's what I do. I find things you might miss when you're deep in the work."
>
> "Click any of those to dig deeper. Or..."

---

### Phase 4: Getting to Know You

**Goal:** Begin PKV construction through natural conversation

**Research backing:** Five semantic fragments from top five documents achieves 93.3% accuracy. Fewer, sharper questions outperform lengthy surveys.

> "I could do more with context. Mind if I ask a couple questions about what you're working on?"

**Conversational Q&A (2-3 questions maximum, selected based on document analysis):**

| If Document Is... | OSQR Asks... |
|-------------------|--------------|
| Business/Strategy | "What's the one metric that tells you this is working?" |
| Creative/Writing | "Who's the person you most want to read this?" |
| Technical/Code | "What breaks if this doesn't ship on time?" |
| Planning/Roadmap | "What's the thing most likely to derail this plan?" |
| Any document | "What would make you say 'OSQR really gets it' a month from now?" |

**Note:** Questions should themselves demonstrate intelligence — not generic intake, but evidence that OSQR has already processed the document.

> "Got it. That helps me understand what matters to you."

---

### Phase 5: The Deeper Insight

**Goal:** Demonstrate personalized value

> "Now that I know more... here's something I wouldn't have caught before:"

**Displays 1-2 deeper insights that connect:**
- Their document + their stated goals
- Their document + their context
- A question they should be asking but aren't

> "This is what I do — I think about your stuff so you don't have to hold it all in your head."

---

### Phase 6: Invitation + Limits Disclosure (UPDATED)

**Goal:** Natural transition to continued use with transparent constraints

**Research backing:** Revealing limits after the "aha moment" converts better than upfront disclosure, but must happen before user hits a wall.

> "I'll remember everything we just talked about. Next time you upload something, I'll have this context."
>
> "Right now I can hold onto 5 documents at a time. If you want me to remember more, or go deeper on insights, there's a way to unlock that."
>
> "Want to keep going, or take a break and come back?"

**User options:**
- [Keep going] → Opens main interface, can upload more
- [I'll come back] → Explains what happens next time they return
- [Tell me about plans] → Pricing/tier information with clear feature comparison

---

## Mobile-First Onboarding (NEW SECTION)

**Research backing:** For document-centric products on mobile, messaging-based triggers outperform file upload interfaces. Users expect to "share" or "forward" content rather than navigate file systems.

### Mobile Entry Points

| Input Type | How It Works | OSQR Response |
|------------|--------------|---------------|
| Share/Forward | User shares doc from another app to OSQR | "Got it. Give me a moment..." [analyzes] |
| Voice Note | User records thought, OSQR transcribes | "I heard [summary]. Here's what I notice..." |
| Photo/Screenshot | User photographs document or whiteboard | "Let me read this..." [OCR + analysis] |
| Link Share | User pastes URL to article/doc | "Pulling that up now..." [fetches + analyzes] |
| Text Message | User types quick thought or question | Responds conversationally, offers to go deeper |

### Mobile Onboarding Flow (Condensed)

Trust gate and core value demonstration in 4 screens:

**Screen 1: Meet OSQR**
> "I'm OSQR. I notice things you miss."
> [Swipe to continue]

**Screen 2: Trust Gate**
> "Your stuff stays yours. I don't train on it or share it."
> [Privacy details expandable] [Continue]

**Screen 3: First Input**
> "Share something with me — a doc, a photo, even a voice note."
> [Share button] [Voice button] [Camera button] [Try with sample]

**Screen 4: Value Demonstration**
> [2-3 insight cards with reasoning expandable]
> "That's what I do. Ready for more?"

### Technical Requirements for Mobile

- Share extension for iOS/Android
- Voice transcription pipeline (Whisper or equivalent)
- OCR for image-to-text
- Dynamic input routing (Switch node pattern)
- Offline queue for analysis when reconnected

---

## Onboarding Variants

### Quick Start (User Skips)

If user clicks "Skip for now":

> "No problem. I'll be over here when you're ready. Upload anything and I'll show you what I find."

OSQR moves to Bubble position, passive but present. First document upload triggers abbreviated insight demo.

### Skip Recovery Mechanism (NEW)

**Research backing:** Users who skip structured onboarding often experience "context rot" after ~10 turns, where OSQR becomes less useful without baseline context.

After 5 interactions without PKV context:

> "I've been helping without really knowing your context. Want to take 60 seconds to help me understand what you're working on? I'll be a lot more useful."
>
> [Yes, let's do that] → Abbreviated Q&A (2 questions)
> [Not now] → Continue, but remind again after 10 more interactions

### Return User (Lapsed)

If user returns after extended absence:

> "Hey, welcome back. It's been a while."
>
> "Want to pick up where we left off, or start fresh?"

---

## What Gets Stored (PKV Initialization)

During onboarding, OSQR captures:

| Data Point | Source | Privacy Tier |
|------------|--------|--------------|
| Document insights | Upload analysis | Private |
| Stated goals | Q&A responses | Private |
| Context preferences | Q&A responses | Private |
| Work type | Document + Q&A | Private |
| Trust gate response | Privacy choice | System |
| Interaction patterns | How they engage | System |
| Input preferences | Mobile: voice/photo/text | System |

This becomes the seed of their Personal Knowledge Vault.

---

## Onboarding Metrics

### Success Indicators

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Completion rate | >70% | Users finish the full flow |
| Trust gate pass-through | >85% | Users feel comfortable proceeding |
| Document upload rate | >80% | They engage with core feature |
| Insight click rate | >50% | Insights resonate |
| Reasoning expansion rate | >30% | Users value transparency |
| Return within 24 hours | >40% | Value was demonstrated |
| Conversion to paid (30 day) | >5% | Business sustainability |

### Failure Indicators

| Metric | Concern Threshold | Intervention |
|--------|-------------------|--------------|
| Drop-off at trust gate | >20% | Simplify messaging, add demo mode |
| Drop-off at upload | >40% | Add more input options, sample doc |
| Zero insight clicks | >60% | Improve insight quality/relevance |
| Immediate bounce | >50% | Faster value demonstration |
| No return (7 day) | >70% | Follow-up trigger, re-engagement |
| Context rot complaints | >10% | Trigger skip recovery flow earlier |

---

## OSQR Voice During Onboarding

### Tone Calibration

- Slightly warmer than baseline (slider ~60)
- Slightly more casual (slider ~45)
- Minimally formal — this is first meeting
- Confident but not arrogant
- Curious about the user

### Pacing

- Doesn't rush
- Allows silence between sections
- Responds to user pace (faster users get faster flow)
- Never overwhelming

### Personality Moments

- The first insight display is a mini "ta-da" moment
- The deeper insight after Q&A should feel like a revelation
- Subtle humor okay if natural opportunity arises
- Reasoning transparency adds credibility, not roboticism

### Naming Convention (CLARIFIED)

**Research backing:** Role-based naming with clear functional descriptors builds trust. The name should set expectations for expertise and boundaries.

- First introduction: "I'm OSQR" — establishes the name
- In conversation: Natural use, no forced repetition
- Never: "Oscar" or variations — consistency matters
- Position: OSQR is not an assistant, he's a thinking partner

---

## Technical Requirements

### Dependencies

- Bubble Interface (animation, presence)
- Document upload handling (web)
- Share extension (mobile)
- Voice transcription pipeline (mobile)
- OCR processing (mobile photo input)
- Insight generation engine
- Reasoning trace generator (NEW)
- PKV write access
- Temporal Intelligence (for return user handling)

### Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| First OSQR message | <1 second | On page load |
| Trust gate render | <500ms | After user proceeds |
| Document analysis | <5 seconds | Standard doc size |
| Insight generation | <3 seconds | After analysis |
| Reasoning trace | <1 second | On expand click |
| Voice transcription (mobile) | <3 seconds | For 30-sec clip |
| OCR processing (mobile) | <4 seconds | Single page |
| Animation framerate | 60fps | Throughout |

---

## Edge Cases

### No Document Uploaded

User proceeds without uploading:

> "That's okay — I can show you with an example instead."
>
> [Shows demo document with insights]
>
> "Imagine that's your document. That's what I'd find."

### Very Large Document

Document exceeds quick-analysis threshold:

> "This one's substantial. Give me a moment..."
>
> [Extended analysis animation]
>
> "Worth the wait. Here's what I found..."

### Empty/Unusable Document

Document has no extractable content:

> "I couldn't read that one — might be the format. Want to try another, or should I show you with an example?"

### User Asks Complex Question Mid-Onboarding

User goes off-script with real question:

> "Good question — let me actually answer that..."
>
> [Answers question fully, then:]
>
> "Now, back to showing you around — or should we just keep going naturally?"

### Privacy Concern at Trust Gate

User wants more detail before proceeding:

> "Fair question. Here's exactly how it works..."
>
> [Expands to show: Constitutional Framework principles, data deletion process, what OSQR can/cannot access]
>
> "Still not comfortable? You can try me with a sample document — no personal data required."

### Mobile: Failed Transcription

Voice note couldn't be transcribed:

> "I couldn't quite catch that — noisy background maybe? Want to try again, or type it out?"

### Mobile: Unreadable Photo

OCR fails on image:

> "That image is tricky to read — maybe try a clearer shot, or share the actual file if you have it?"

---

## Transition to Main Experience

### After Onboarding Completes

- OSQR moves to Bubble position
- Main Panel becomes available
- Insights page populates with initial findings
- User can upload more documents or explore
- "Surprise Me" button becomes visible (teaser for power users)

### Memory Persistence

- Everything from onboarding persists
- Next session, OSQR references what he learned
- No "starting over" feeling
- Reasoning traces remain accessible for reviewed insights

---

## Plugin Ecosystem Teaser (NEW)

Near end of onboarding, after value is established:

> "By the way — I can do more than just this. There are plugins that extend what I notice and how I think."
>
> "But that's for later. Right now, let's focus on your stuff."

This plants the seed without overwhelming. Users who explore will find the marketplace.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial onboarding flow |
| 1.1 | Dec 2024 | Added: Pre-upload Trust Gate (Phase 2), Reasoning transparency on insight cards, Mobile-first onboarding section, Skip recovery mechanism, Free tier limits disclosure timing, Plugin ecosystem teaser. Clarified: OSQR naming convention. Updated: Q&A questions (sharper, fewer), Metrics to include new phases |

---

## Open Questions for Future Versions

1. Should onboarding differ by user type (business vs personal)?
2. How much should OSQR remember if user doesn't convert to paid?
3. Should there be a "tour" of features or just natural discovery?
4. How do we handle onboarding for users coming from plugins/partners?
5. Should first insight be guaranteed to impress (cherry-picked) or authentic?
6. How do we handle users who want to onboard via voice only (accessibility)?
7. Should reasoning traces be opt-in or opt-out by default?
8. How does trust gate language adapt for enterprise/regulated users?

---

**End of Document**
