# OSQR Browser Extension

**Vision & Exploration Specification — OSQR Everywhere**

| Component | OSQR Browser Extension (Chrome/Firefox/Safari) |
|-----------|------------------------------------------------|
| Version | Vision Document v1.0 |
| Status | Exploration — Not Ready for Implementation |
| Date | December 22, 2025 |
| Author | Kable Record |
| Target Release | OSQR V3.0 (Post-iOS) |

---

## Document Purpose

This document captures the vision and potential capabilities for the OSQR browser extension. It is an **exploration document**, not an implementation spec. The goal is to:

- Document the opportunities a browser extension unlocks
- Identify privacy and security considerations early
- Outline potential feature tiers and phasing
- Capture open questions for future planning

This document will evolve into a full implementation spec when Browser OSQR moves into active development.

---

## The Vision

### OSQR Escapes the Tab

Today, OSQR lives at app.osqr.app. Users must navigate to OSQR to interact with him. The browser extension changes this:

**OSQR is present on every page. He sees what you see. He's one click away, always.**

This is a major capability unlock. OSQR gains ambient context — he knows what you're reading, researching, shopping for, or working on without you telling him.

### The Jarvis Parallel

Tony Stark doesn't narrate his screen to Jarvis. Jarvis can see it. When Tony pulls up schematics, Jarvis knows. When Tony is browsing news, Jarvis can reference it.

Browser OSQR creates this ambient awareness for desktop browsing. Combined with Mobile OSQR (thought capture on the go) and the web app (deep work), OSQR becomes truly omnipresent.

---

## What Browser Extensions Can Do

Capabilities that a web app cannot provide:

| Capability | What It Enables for OSQR |
|------------|--------------------------|
| See the current page | OSQR knows context without being told — reading, shopping, researching |
| Inject UI on any page | OSQR bubble floats everywhere, not just on osqr.app |
| Capture text selections | Highlight → right-click → "Send to OSQR" workflow |
| Access browser history | "What was that article I read last week?" — OSQR finds it |
| Tab awareness | OSQR knows what you're working on across all open tabs |
| Auto-fill and actions | OSQR fills forms, clicks buttons, navigates for you |
| Persistent sidebar | OSQR panel stays open as you browse |
| Screenshot capture | Visual context for pages that are hard to parse |
| Keyboard shortcuts | Global hotkeys for quick capture (Cmd+Shift+O) |
| Push to OSQR | Any page, any content, instant capture |

---

## Opportunity Categories

### 1. Ambient Context

OSQR passively understands your browsing without explicit input.

- You're on a competitor's website → OSQR notes it for later strategic reference
- You're reading a research article → OSQR can summarize and file to relevant project
- You're on your bank's site → OSQR knows not to interrupt (sensitive context)
- You're on LinkedIn viewing someone → OSQR preps you for an upcoming meeting
- You're shopping → OSQR remembers for wish lists or budgeting

**The value**: You don't have to tell OSQR what you're doing. He already knows.

### 2. Capture Anything

Web clipping on steroids — capture with intelligence.

- **Selected text** → "Save this" or "Add to [project]" via right-click
- **Full page** → Save and summarize entire articles
- **Screenshot** → Visual capture with OCR for non-text content
- **Link** → OSQR fetches, reads, summarizes, stores
- **Quote + source** → Academic/research citation capture

**Better than bookmarks**: You're not saving URLs to forget. OSQR processes, categorizes, and connects to existing knowledge.

### 3. The Floating Bubble

OSQR's familiar interface, everywhere.

- Small bubble in corner of any page (position configurable)
- Click to expand chat panel
- Voice input works (same as mobile)
- Context-aware: "Summarize this page" works because OSQR can see the page
- Same simple interface from mobile and web app

This unifies the OSQR experience across all interfaces.

### 4. Research Mode

Deep research across multiple sources.

- "Research the top 5 competitors in [space]"
- OSQR opens tabs, reads pages, synthesizes findings
- Returns a summary without you reading 20 articles
- Can work in background while you do other things
- Sources cited and saved to PKV

OSQR becomes a research assistant, not just a chat interface.

### 5. Agentic Browser Control (Advanced)

OSQR takes actions on your behalf.

- "Book me a flight to Miami" → OSQR navigates Kayak, searches, presents options
- "Schedule a meeting with John" → OSQR opens calendar, creates event
- "Order more coffee" → OSQR goes to Amazon, adds to cart (you approve)
- "Fill out this application" → OSQR auto-fills from your PKV
- "Buy this" → OSQR handles checkout with saved payment (with confirmation)

This is the end-state Jarvis vision. Requires significant trust and safety infrastructure.

### 6. Memory Everywhere

OSQR's memory extends across your browsing.

- "What did I read about this topic last month?" → OSQR searches browsing history + PKV
- "Remind me about this page tomorrow" → Works from any tab
- Browsing patterns feed into OSQR's understanding of your interests
- Cross-reference: "I saw something about X on a site I visited..." → OSQR finds it

Your browsing becomes part of your knowledge base, not ephemeral history you'll never find again.

---

## Privacy & Security Considerations

Browser extensions have significant privacy implications. This section outlines concerns that must be addressed before implementation.

### Data OSQR Could Access

| Data Type | Privacy Level | Consideration |
|-----------|---------------|---------------|
| Current page URL | Medium | Reveals browsing habits |
| Page content | High | May contain sensitive information |
| Form inputs | Critical | Passwords, financial data, personal info |
| Browsing history | High | Complete picture of online activity |
| Cookies/sessions | Critical | Could enable account access |
| Screenshots | High | Visual capture of anything on screen |
| Keystrokes | Critical | **NOT NEEDED — don't implement** |

### Constitutional Alignment

OSQR's Constitutional Framework applies to Browser OSQR:

1. **User Data Sovereignty**: User controls what OSQR sees and stores. Nothing captured without consent.
2. **Identity Transparency**: Clear indication when OSQR is observing vs. dormant.
3. **No Training on User Data**: Browsing data used only for that user, never for model training.
4. **Deletion Rights**: User can delete any captured browsing data permanently.

### Privacy Controls Required

- **Site allowlist/blocklist** — User specifies where OSQR can/cannot observe
- **Incognito exclusion** — OSQR never active in private browsing
- **Sensitive site detection** — Auto-disable on banking, health, email login pages
- **Visual indicator** — Clear badge/icon showing OSQR's current state
- **Data retention controls** — User chooses how long browsing context is stored
- **Audit log** — User can see what OSQR has captured and when
- **One-click disable** — Easy way to turn OSQR off entirely
- **Granular permissions** — Page content vs. URL only vs. nothing

### What OSQR Should Never Do

- Capture passwords or form fields on login pages
- Access financial account pages without explicit permission
- Record keystrokes
- Capture content in incognito/private mode
- Share browsing data with third parties
- Operate without visible indicator
- Auto-enable on sensitive sites

### Trust Tiers

OSQR could offer different permission levels:

| Tier | What OSQR Can See |
|------|-------------------|
| Minimal | Nothing unless explicitly invoked (click bubble, use right-click menu) |
| URL Only | Knows what site you're on, but doesn't read page content |
| Content Read | Can read page content when you ask ("summarize this") |
| Ambient | Passively aware of browsing context, remembers for future reference |
| Agentic | Can take actions in browser with user approval |

User chooses their comfort level. Can adjust per-site.

---

## Potential Feature Tiers

### Tier A: Minimal (Bubble Only)

- Floating bubble on all pages
- Click to chat (same as mobile)
- Manual capture only (right-click → Send to OSQR)
- No ambient awareness
- No browsing history access

**Essentially**: Mobile OSQR as an extension. Low privacy concern.

### Tier B: Context-Aware Assistant

- Everything in Tier A
- OSQR knows current page URL
- Can read page content when asked ("summarize this")
- Right-click menu for selected text
- Keyboard shortcut for quick capture

**Middle ground**: Useful context without passive surveillance.

### Tier C: Ambient Intelligence

- Everything in Tier B
- Passive awareness of browsing (with user consent)
- Browsing patterns inform OSQR's memory
- "What was that article?" queries work
- Proactive: "I noticed you were researching X..."

**Higher value, higher privacy consideration**. Requires trust.

### Tier D: Agentic Control

- Everything in Tier C
- OSQR can navigate, click, fill forms
- Executes tasks across websites
- Requires explicit approval for actions
- Full audit trail

**Maximum capability**. Requires robust safety infrastructure.

### Recommended Starting Point

For Browser OSQR V1, recommend **Tier B: Context-Aware Assistant**.

This provides:
- OSQR everywhere (bubble on all pages)
- Useful capture workflows (right-click, hotkeys)
- Page context when asked ("summarize this")
- Same simple interface users know

Without:
- Passive surveillance concerns
- Complex agentic infrastructure
- High-risk permissions

Tier B proves the value before expanding to ambient/agentic features.

---

## Technical Considerations

### Platform Support

| Browser | Extension API | Notes |
|---------|---------------|-------|
| Chrome | Manifest V3 | Primary target, largest market share |
| Firefox | WebExtensions | Compatible with Chrome extensions |
| Safari | Safari Web Extensions | Requires Xcode, separate submission |
| Edge | Chromium-based | Uses Chrome extension directly |
| Arc | Chromium-based | Uses Chrome extension directly |

**Recommendation**: Build for Chrome first (Manifest V3), then adapt for Firefox and Safari.

### Architecture

- **Background service worker** — Handles OSQR API communication
- **Content script** — Injects bubble UI, captures page content
- **Popup** — Quick access panel from toolbar icon
- **Options page** — Settings, permissions, privacy controls
- **Shared auth** — Uses same Clerk session as web app

### Integration Points

- **OSQR API** — Same backend as web and mobile
- **Memory Vault** — Captured content goes to user's PKV
- **Subscription** — Verify Pro/Master status for extension features

---

## Relationship to Other OSQR Interfaces

| Interface | Primary Use | Unique Capability |
|-----------|-------------|-------------------|
| Web App | Deep work, projects, documents | Full feature access |
| Mobile App | Thought capture on the go | Voice-first, anywhere |
| Browser Extension | Ambient desktop assistant | Context from any page |
| VS Code Extension | Development companion | Codebase awareness |

Each interface serves a different context. All share the same backend, memory, and identity.

---

## Timeline & Dependencies

Browser OSQR is planned for **OSQR V3.0**, after:

- **OSQR V1.0** — Core web app stable
- **OSQR V1.5** — Mobile web demo + VS Code extension
- **OSQR V2.0** — Native iOS app + Mobile PWA for Android
- **OSQR V3.0** — Browser extension

**Dependencies before starting Browser OSQR**:
- Stable API that extension can use
- Memory Vault capable of storing browsing captures
- Privacy framework documented and implemented
- Subscription system supports extension-specific features

---

## Open Questions

To be resolved before implementation:

1. Should extension be available on all tiers, or Pro/Master only?
2. How do we handle the extension when user's subscription lapses?
3. Should ambient browsing data count against storage quotas?
4. How long should browsing context be retained by default?
5. Do we need separate privacy policies for extension users?
6. How do we handle enterprise/work browsers with IT policies?
7. Should extension work offline with local queue?
8. How do we prevent the extension from being used for surveillance of others?
9. What's the approval UX for agentic actions?
10. How do we handle sites that block extensions or content scripts?

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 22, 2025 | Initial vision document |

**Document Status**: Exploration — Not Ready for Implementation

**Next Steps**:
1. Complete Mobile OSQR (V1.5 / V2.0)
2. Revisit this document when Browser OSQR moves to planning
3. Conduct privacy review before implementation
4. User research on desired extension features
