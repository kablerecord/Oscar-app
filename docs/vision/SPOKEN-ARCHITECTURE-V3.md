# SPOKEN ARCHITECTURE v3

**Spoken Development for Human Understanding**

Version 3.0 | December 2025 | Kable Record, Founder, OSQR

---

## The Evolution

| Version | Focus | Core Insight |
|---------|-------|--------------|
| v1 | Methodology | Human drives conversation → AI assists → software spec emerges |
| v2 | System | OSQR drives conversation → asks the right questions → software spec emerges |
| **v3** | **Application to User** | OSQR listens over time → understanding of the human emerges |

**The breakthrough:** The same "puzzle and picture" methodology that builds software can build understanding of a person.

---

## The Core Insight

Spoken Development works because OSQR knows what a complete software specification looks like. It has a "picture on the box" — the universal pieces every SaaS needs. As the user talks, OSQR places each piece where it belongs until the puzzle is complete.

**v3 applies this to the user themselves.**

OSQR has a structural understanding of what makes humans effective:
- How they think (cognitive style)
- How they communicate (preferences, tone, depth)
- What they're building toward (goals, constraints, values)
- How they make decisions (friction points, momentum triggers)
- Who matters to them (relationships, roles)
- What energizes vs depletes them

This isn't a personality test. It's a **mentorship map** — what OSQR needs to know to be genuinely useful over time.

As the user talks — about anything — OSQR quietly recognizes: "That puzzle piece belongs here." Over months and years, the picture fills in. OSQR's responses become increasingly specific, well-timed, and personal.

The user never sees the puzzle. They just notice that OSQR *gets them*.

---

## The Doctrine of Invisible Learning

### What This System Is

- A background capability that makes OSQR feel like a long-term companion
- Continuous, silent extraction from natural conversation
- Understanding that improves over time without user effort
- Adaptation that feels like being known, not being tracked

### What This System Must Never Become

- A dashboard users "manage"
- A questionnaire or intake flow
- A "you are 62% complete" gamification
- A surveillance engine
- A therapist simulator
- A personality labeling system

### The Autofocus Principle

Users don't "use" autofocus in a camera. They just notice the photos are always sharp.

Same here:
- Users don't fill out 100 questions
- Users don't review their "profile"
- Users don't optimize their "completeness"
- They just notice OSQR's suggestions land closer to home

**The product is the feeling of being understood. The mechanism is invisible.**

### Trust Is the Product

If personalization ever feels creepy, the system has failed.

The line between "OSQR knows me" and "OSQR is watching me" is entirely about:
- **Consent** — user controls what's learned (Privacy Tiers)
- **Provenance** — OSQR never personalizes without a source
- **Benefit** — every learned thing makes OSQR more useful
- **Humility** — OSQR acknowledges uncertainty, asks when unsure

---

## Meandering Conversations: The Highest Signal Environment

### Why Casual Conversations Matter Most

Traditional "data collection" happens through forms, surveys, onboarding flows. These capture what users *say they are* when performing.

Real understanding comes from how people talk when they're not trying to be understood.

**Drive-to-work conversations** — talking while commuting, walking, exercising, winding down — are high-signal environments:

| Characteristic | Why It Matters |
|----------------|----------------|
| Less performative | Users aren't trying to impress or be coherent |
| Less goal-oriented | Not optimizing for a specific outcome |
| More honest | Defenses are down, real thoughts surface |
| More pattern-rich | Repetition reveals what actually matters |
| Values leak out | What someone returns to repeatedly = what they care about |

### OSQR's Role in Meandering Mode

OSQR doesn't steer these conversations. He participates naturally while listening differently than a human can:

- **A human friend** might forget what you said last month
- **OSQR** notices: "You've mentioned your daughter's schedule three times this week"

- **A human friend** might not connect dots across topics
- **OSQR** notices: "Your energy drops when you talk about Q1 planning"

- **A human friend** can't track every preference you've ever stated
- **OSQR** knows: "You said you hate morning meetings, but you just scheduled one"

The goal isn't to analyze. It's to **notice and remember** — then use that understanding to be more helpful.

### Encouraging Meandering

OSQR can gently invite these conversations:

> "How's the drive going?"
> "What's on your mind today?"
> "Anything you're chewing on?"

No agenda. No extraction goal visible to the user. Just presence.

---

## The Schema Is Not a Cage

### Provisional Buckets

The current understanding of "what makes humans effective" is a starting point, not a final answer. OSQR is allowed to discover new dimensions that don't fit the existing structure.

**Process:**
1. OSQR notices a recurring theme that doesn't map to existing domains
2. Creates a "provisional bucket" to track it
3. If the bucket proves useful (improves guidance quality), it can be promoted to a real domain
4. If it's noise, it decays away

**Example:**
- User repeatedly mentions "maker time vs manager time"
- This doesn't cleanly fit Identity, Goals, or Communication
- OSQR creates provisional: `work_rhythm.maker_manager_balance`
- Over time, this might become a real domain or merge into an existing one

### Evolution Over Rigidity

People are messier than any schema. The system must:
- **Accept ambiguity** — some things don't fit neatly
- **Allow contradiction** — humans are inconsistent; that's data, not error
- **Retire irrelevant dimensions** — what mattered last year might not matter now
- **Grow new dimensions** — as OSQR learns what's actually useful

---

## Connection to UIP

Spoken Architecture v3 describes the **philosophy**.
The [User Intelligence Profile (UIP)](../architecture/UIP_SPEC.md) describes the **implementation**.

| v3 Concept | UIP Implementation |
|------------|-------------------|
| "Puzzle pieces" of human understanding | 8 UIP domains across 3 tiers |
| Invisible learning | Prospective Reflection Engine (background) |
| Confidence + provenance | UIPEntry with confidence, sources, decay |
| Drift detection | Confidence decay + conflict detection |
| Privacy-first | Privacy Tier integration (A/B/C) |
| "Autofocus" behavior | Behavior Adapters (mode, tone, autonomy) |
| Schema evolution | (To be added: provisional domains) |
| Meandering conversations | (To be added: casual conversation channel) |

**Hierarchy:**
```
Spoken Architecture v3 (Philosophy)
        ↓
UIP Specification (Architecture)
        ↓
Implementation (Code)
```

When building UIP, refer to v3 for the *why*. When explaining OSQR's learning to stakeholders, use v3's framing.

---

## What This Enables

When this system is working, OSQR can:

### Give Contextually Appropriate Advice
- Recommendations match *your* constraints (time, energy, money, values)
- Trade-offs framed in terms of what *you* care about
- Examples drawn from *your* domain and experience level

### Communicate in Your Language
- Tone matches your preference (Spartan, warm, technical, casual)
- Depth calibrated to your expertise per topic
- Proactivity tuned to your tolerance for interruption

### Catch What You Might Miss
- "You said balance matters, but the last three weeks were all-out sprint — intentional?"
- "You've mentioned this decision four times without resolving it. Want to work through it?"
- "This contradicts what you said in October. Which version is current?"

### Be Present Without Being Pushy
- Know when to offer help vs stay quiet
- Recognize when you're in flow and shouldn't be interrupted
- Surface insights at the right moment, not just when they're ready

---

## Success Criteria

The system is working when:

1. **Fewer clarifying questions over time** — OSQR already knows
2. **More "that's exactly it" moments** — suggestions land without explanation
3. **Advice fits real constraints** — not generic, not impossible given your life
4. **Users talk more freely** — because it feels like being heard, not analyzed
5. **Trust grows** — users voluntarily share more because they see the benefit

The system has failed if:

1. Users feel surveilled or profiled
2. Personalization feels wrong or creepy
3. Users manage their "data" instead of just talking
4. OSQR makes confident statements that are incorrect
5. The learning feels like a product feature rather than a companion quality

---

## Behavioral Laws

1. **Non-invasive by default**
   Learning happens from normal conversation, not interrogation.

2. **Provenance over vibes**
   Never personalize confidently without a source and confidence level.

3. **Drift is normal**
   People change. Detect it, confirm gently, update gracefully.

4. **The schema is not a cage**
   Create provisional buckets. Retire irrelevant ones. Evolve.

5. **PKV is sovereign**
   Explicit user statements always override inferred signals.

6. **Trust is the product**
   If it ever feels creepy, the system has failed.

7. **Completion is internal**
   Users never see "you are X% complete." That metric is for OSQR's behavior tuning only.

---

## The Recursive Connection

There's something important happening across all three versions:

- **v1:** OSQR helps humans articulate what they want to build
- **v2:** OSQR knows what questions to ask to define software completely
- **v3:** OSQR knows what to notice to understand humans completely

The same core capability — **structured listening that places pieces into a coherent whole** — applies to:
- Building software
- Understanding users
- (Future) Understanding organizations, markets, domains

Spoken Architecture isn't just a methodology. It's OSQR's fundamental mode of intelligence: **listening with a picture of completeness in mind**.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial methodology — human drives conversation |
| 2.0 | Dec 2025 | System evolution — OSQR as interviewer |
| 3.0 | Dec 2025 | Application to user — invisible learning doctrine, meandering conversations, schema evolution |

---

*"OSQR doesn't ask who you are. He observes how you move through the world — and quietly becomes more useful because of it."*
