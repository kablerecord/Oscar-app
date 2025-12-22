# OSQR Email Integration Specification
## Version 1.0 | Gmail Integration for Unified Intelligence

**Component:** Email Integration Subsystem
**Version:** 1.0
**Status:** Ready for Implementation
**Target Release:** V1.5
**Dependencies:** Memory Vault, Document Indexing Subsystem, Constitutional Framework
**Priority:** Core Feature - Paid Add-on

---

## Executive Summary

The Email Integration Subsystem extends OSQR's unified intelligence layer to include email as a knowledge source. Users connect their Gmail account once and OSQR maintains awareness of their email communications without requiring manual context-sharing or repeated explanations.

**Core Principle:** Connect once, OSQR handles the rest. No configuration, no folder selection, no ongoing maintenance. Email becomes part of what OSQR knows.

---

## Problem Statement

### Current Reality

Users frequently have information trapped in email that their brain can't retrieve on demand. They know they discussed something, received a commitment, or have details somewhere in their inbox—but finding it requires manual search and context reconstruction.

**Example:** "When is that Playa Bowls conference?" The user knows the information exists in an email but cannot locate it quickly. Without email integration, OSQR cannot help.

### With Email Integration

```
User: "When is that Playa Bowls conference?"

OSQR: "The Playa Bowls franchise conference is March 15-17 in Orlando.
       I found this in an email from [sender] dated [date]. There's a
       registration deadline next week—want me to pull those details?"
```

---

## Architecture

### Design Philosophy: Conservative Index, Just-in-Time Retrieval

Rather than indexing every email upfront, OSQR uses a hybrid approach that balances cost, performance, and privacy:

1. **Index lightweight metadata:** Thread summaries, sender relationships, key dates, detected entities
2. **Retrieve full content on-demand:** When a query requires actual email content, fetch it just-in-time
3. **Promote based on usage:** Content retrieved repeatedly gets elevated to the index

This approach:
- Reduces embedding costs by an order of magnitude
- Prevents context rot from noise emails
- Strengthens the privacy story—full email content only flows when explicitly requested

### Thread Compaction Strategy

Email threads create redundant content as conversations grow. The same text appears in 15 emails as the thread expands. OSQR handles this through incremental compaction:

1. New reply arrives → Integrate with existing thread summary (not append)
2. Store compacted summary plus most recent message
3. Retrieve full thread content only when query requires specifics
4. Re-compact when context limits approach or performance degrades

**Analogy:** Managing email threads is like maintaining meeting minutes. You keep a running summary of decisions and only pull the full transcript when a specific detail is disputed.

### Hybrid Search Strategy

Different query components require different search approaches:

| Search Type | Use Case | Example |
|-------------|----------|---------|
| Lexical (Exact) | Sender names, dates, specific keywords | "emails from Sarah" "invoice #4521" |
| Semantic (Intent) | Conceptual queries, topic-based retrieval | "that conversation about the fence project" |
| Hybrid | Combined precision and understanding | "what did Mike say about the deadline" |

---

## User Experience

### Connection Flow

The connection experience is intentionally minimal:

1. User clicks "Connect Gmail"
2. OAuth consent screen appears (Google's standard flow)
3. Done

No configuration wizard, no folder selection, no "what do you want to index" questionnaire. OSQR begins building understanding in the background. The user notices value organically—a week later when they ask a question and OSQR knows the answer.

### Trust Gate Messaging

Before the OAuth flow, OSQR presents a trust gate:

> "I can connect to your email. I won't send anything, ever. I just read and remember so you don't have to. Everything stays encrypted in your vault. Want to connect?"

Users who want more detail can expand to see: Constitutional Framework principles, data deletion process, what OSQR can and cannot access, read-only scope confirmation.

### Retrieval Latency Handling

When OSQR needs to fetch email content that isn't in the index, there's a latency difference:

- **Indexed content:** ~500ms retrieval
- **Live Gmail search:** 2-5 seconds

**User experience:** For searches over 2 seconds, display brief "Checking your email..." indicator. Silent for faster retrievals. This follows the character guide principle—honest but not verbose.

---

## Smart Filtering

### Default Behavior (No Configuration Required)

OSQR applies intelligent filtering automatically:

- Index Primary inbox only (skip Promotions, Social, Updates categories)
- Skip emails older than 2 years on initial sync
- Skip emails with unsubscribe links from senders user has never replied to
- Prioritize emails user has replied to, starred, or spent time reading
- Higher weight for senders in contacts or with established conversation history

### On-Demand Gap Filling

When a user asks about something not in the index:

1. OSQR searches Gmail directly
2. Finds the email and answers the question
3. Indexes that email for future queries

Over time, OSQR learns: "This user asks about contractor emails frequently. Expand indexing to include that category." The system self-tunes based on actual behavior rather than predicted behavior.

### Optional User Controls

For users who want control, a "Customize what I see" panel provides:

- Category toggles (Promotions: off, Social: off, etc.)
- Label inclusion/exclusion
- Specific sender or domain blocking
- Time range adjustment
- "Index everything" toggle for power users

These controls are progressive disclosure—hidden until requested. Most users never need them.

---

## Security Architecture

### The Three User Personas

| Persona | Mindset | What They Need |
|---------|---------|----------------|
| The Unaware | "Sure, connect everything" | Strong defaults, protection without asking |
| The Skeptical | "Show me why I should trust you" | Clear documentation, verifiable claims |
| The Paranoid | "I'll watch first" | Reputation over time, client-side options (v2.0) |

### MCP Isolation Pattern

Email integration follows the Model Context Protocol isolation pattern:

- OSQR (the Host) does not have direct database access
- Email data flows through containerized MCP Servers
- Explicit permission gates before data access
- Full email content only retrieved when query requires it

**Analogy:** Think of your email archive like a high-security vault. The AI never enters the vault. Instead, a clerk (the MCP Server) stays inside. The AI knocks on the window and asks for a specific document; you sign a permission slip for the clerk to hand it over. The AI only sees the specific page it asked for.

### Security Risks and Mitigations

| Risk | Description | Mitigation |
|------|-------------|------------|
| Credential Storage | OAuth tokens stored insecurely | Proper secrets management, never plaintext config |
| Tool Chaining | AI chains read + export to exfiltrate data | Constitutional constraint: email content never forwarded without explicit user action |
| Prompt Injection | Malicious email content hijacks AI behavior | Sanitization layer between retrieved content and model context |

---

## Monetization

### Pricing Model

Email integration is a paid add-on feature. Two options under consideration:

**Option A - Bundle into tiers:**
- Lite: No connections
- Pro ($49): 2 connections included
- Master ($149): Unlimited connections

**Option B - Separate add-on:**
- $10/month per connection
- Or $25-30/month for unlimited connections

**Recommendation:** Option B provides clearer value exchange, pure margin, and removes "what are they getting from my data" concerns. Users who pay understand the business model.

### Trust Psychology

Charging for connections actually increases trust for privacy-conscious users. Free email access feels suspicious ("What are they getting out of this?"). Paid email access feels transactional ("I'm paying for a service. The business model is clear.")

---

## What OSQR Can Know

With email integration, OSQR can surface:

- **Commitments made to you:** "I'll send that over Monday" - did they? OSQR tracks.
- **Commitments you made:** "Let me get back to you on that" - did you? OSQR reminds.
- **Relationship context:** Before a meeting, surface: "Last time you spoke with Sarah, the conversation was about expanding to a second location. That was 6 weeks ago."
- **Document trail:** "Where's that contract version?" OSQR finds the attachment, knows which email thread it came from, remembers the negotiation context.
- **Temporal patterns:** "Your insurance renewal emails always come in February. It's January 28th. Nothing yet this year - might want to follow up."

### The Compound Effect

Email alone is powerful. Email combined with everything else in the PKV creates something new.

- User uploads a business plan. OSQR notices it references a partnership discussed in emails from October. Surfaces the connection.
- User asks about a vendor. OSQR pulls from: the quote document they uploaded, the email thread negotiating terms, the calendar showing three past meetings, and the chat where the user said "these guys are slow but their quality is worth it."

That's not search. That's institutional memory for an individual.

---

## Technical Requirements

### Gmail API Integration

- OAuth2 connection with read-only scope
- Centralized token refresh for background sync
- Poll mode for checking new messages (configurable frequency)
- Rate limit handling with automatic retry

### Indexing Pipeline

**Initial sync:** Background indexing with recency priority. New emails index immediately. Historical emails index gradually over days, newest first.

**Ongoing sync:** Poll for new messages, process incrementally, compact threads as they grow.

**Deletion propagation:** When user deletes email in Gmail, remove from OSQR index.

### Cost Estimates

With thread compaction and JIT retrieval, costs are manageable:

- Thread summary embedding: ~$0.00005 per thread
- User with 1,000 email threads: ~$0.05 initial index
- Power user with 10,000 threads: ~$0.50 initial index

Background indexing spreads this over time, preventing compute spikes.

---

## Integration Points

| Component | Integration |
|-----------|-------------|
| [Memory Vault](../architecture/KNOWLEDGE_ARCHITECTURE.md) | Email summaries stored in PKV semantic store, same encryption and privacy tiers |
| [Document Indexing](./MEDIA-VAULT.md) | Parallel pattern - email as another source type in the unified knowledge layer |
| [Constitutional Framework](../governance/OSQR_CONSTITUTION.md) | Privacy gates, data sovereignty, read-only scope enforcement |
| [Onboarding Flow](../features/PERSONALIZED-GREETING.md) | Trust gate for email connection, progressive disclosure |
| [Conversion Strategy](../business/PRICING-ARCHITECTURE.md) | Connections as paid feature, trust accumulation milestone |
| [Insights System](./BEHAVIORAL_INTELLIGENCE_LAYER.md) | Email-derived insights (commitments, stale threads, upcoming events) |
| [Capture Router](./CAPTURE_ROUTER.md) | Email can trigger context-based captures |

---

## Implementation Phases

### Phase 1: Core Gmail Integration (Weeks 1-3)
- [ ] OAuth2 connection flow
- [ ] Conservative initial index (Primary, last 6 months, engaged senders)
- [ ] Thread compaction pipeline
- [ ] Basic hybrid search (lexical + semantic)

### Phase 2: Just-in-Time Retrieval (Weeks 4-5)
- [ ] Real-time Gmail search fallback
- [ ] Index-on-retrieval for searched items
- [ ] "Checking your email..." latency indicator
- [ ] Cache management for retrieved content

### Phase 3: Usage-Based Expansion (Weeks 6-7)
- [ ] Track queries that require fallback search
- [ ] Automatic index expansion based on patterns
- [ ] User notification: "You frequently ask about X - want me to include those?"

### Phase 4: User Controls & Polish (Week 8)
- [ ] Settings UI for customization
- [ ] Security documentation for skeptical users
- [ ] Disconnect and delete flow
- [ ] Monetization integration

---

## Future Connections (Same Pattern)

The email integration pattern extends to other data sources:

| Connection | Priority | Notes |
|------------|----------|-------|
| Google Calendar | V1.5 (with Email) | Natural pairing, enables temporal intelligence properly |
| Google Drive | V1.5 Fast Follow | Documents user references but didn't upload |
| Slack/Teams | V2.0 | High volume, enterprise-focused |
| Financial Accounts | V2.0+ | Read-only, "how much did I spend on X" |
| CRM | V2.0+ | Sales-focused users |

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Connection rate | >30% of Pro users | Are users trusting OSQR with email? |
| Query success rate | >85% answered | Can OSQR find what users ask about? |
| Fallback rate | <20% of queries | Is conservative indexing too conservative? |
| Disconnect rate | <5% in first 30 days | Are users satisfied with the experience? |
| Zero "creepy" complaints | 0 | Is the experience feeling helpful vs invasive? |

---

## Competitive Moat

Email integration creates significant competitive advantage:

- **Switching cost goes vertical.** Every day that passes, OSQR knows more. Leaving means losing accumulated intelligence. This isn't lock-in through manipulation—it's genuine value accumulation.

- **The "I told you this" problem disappears.** Everyone has information trapped in email that their brain can't retrieve on demand. OSQR becomes the retrieval layer.

- **No one else is building this.** Google won't (their AI features are bolt-ons to existing products). Apple has privacy positioning but not AI capability. Microsoft is enterprise-focused. The solo operator, the small business owner—nobody is building unified intelligence for them.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial email integration specification |

---

## Open Questions for Future Versions

1. Should overage purchases for connections roll over if unused?
2. How do we handle shared/team inboxes? (Likely business tier with consent requirements)
3. Should calendar integration be free with Pro since it enables temporal intelligence?
4. At what point do we proactively suggest Enterprise pricing for heavy users?
5. How do we handle email providers beyond Gmail? (Outlook, Yahoo, etc.)

---

**End of Specification**

*Document Version: 1.0*
*Status: Ready for Implementation*
