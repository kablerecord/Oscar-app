# OSQR Plugin Creator Specification
## Version 1.0 | Conversational Plugin Development

**Component:** Plugin Creator
**Version:** 1.0
**Status:** Ready for Implementation
**Target Release:** v1.5
**Dependencies:** Plugin Architecture, Character Guide, Constitutional Framework

---

## Document Purpose

This document defines how creators build plugins through conversation with OSQR. The plugin creation process uses the same "spoken development" pattern as OSQR's core architecture—dialogue extracts structured specification, specification enables execution.

**Core Principle:** Creators don't fill out forms. They have a conversation. OSQR builds the plugin as they talk.

---

## The Pattern

The plugin creation flow mirrors OSQR's documentation-first development approach:

1. Creator has idea (vague or clear)
2. OSQR asks questions, listens
3. Answers map to Plugin Control Inventory
4. Controls populate in real-time (visible to creator)
5. Creator adjusts anything OSQR inferred wrong
6. Plugin spec complete → Test → Publish

The creator never realizes they're going through a structured extraction process. They feel like they're having a conversation with a collaborator who happens to be building the thing as they talk.

---

## Entry Point

### Trigger

Creator clicks "Build a Plugin" or expresses intent ("I want to create a plugin").

### UI Shift

- Control panel becomes visible (sliders, fields, upload zones)
- All controls start empty/default
- Conversation panel remains primary focus

### OSQR Opens

> "Let's build something. What do you want to create—and who's it for?"

---

## The Extraction Conversation

OSQR guides the creator through phases, but the conversation feels natural, not sequential. OSQR reads context and asks what's relevant.

### Phase 1: Identity (Required)

OSQR must capture these before anything else. These are the minimum fields required for any plugin.

| Field | Question Pattern | Maps To |
|-------|------------------|---------|
| Purpose | "What does this plugin do?" | Short Description |
| Audience | "Who's it for?" | Target User |
| Problem | "What problem does it solve for them?" | Problem Statement |
| Outcome | "When it works, what's different for the user?" | Transformation Promise |

**Checkpoint 1:**
> "Let me make sure I've got this: [summary]. Does that capture it?"

Controls populated: Plugin Name (suggested), Short Description, Target User, Problem Statement, Transformation Promise

### Phase 2: Personality (Contextual)

Only asked if relevant. OSQR reads the use case and asks selectively.

| If plugin seems... | OSQR asks... | Maps To |
|--------------------|--------------|---------|
| Coaching/methodology | "How tough should I be with users? Supportive or challenging?" | Challenge Level, Pushback |
| Professional tool | "Formal or casual tone?" | Formality slider |
| Creative/fun | "How playful can I get?" | Humor, Energy |

If creator doesn't have opinions: OSQR leaves sliders at 50 (baseline).

**Checkpoint 2:**
> "I'll be [tone summary]. Want to adjust that, or does it feel right?"

### Phase 3: Knowledge

OSQR asks:
> "Do you have existing material—documents, frameworks, templates—or are we building from scratch?"

| Response | OSQR Action |
|----------|-------------|
| "I have a book/course/framework" | Opens upload flow, asks what each doc is for |
| "I have some templates" | Asks to upload, marks as deliverables |
| "Building from scratch" | Proceeds to behavior, may return to knowledge later |
| "Just personality, no methodology" | Skips knowledge, marks as Voice Pack type |

### Phase 4: Behavior (If Applicable)

For methodology plugins, OSQR probes for rules:
> "Are there situations where the plugin should do something specific? Like check in after silence, or redirect off-topic conversations?"

Captures as natural language, parses into behavior rules:
- Time-based triggers
- Pattern-based triggers
- Redirect rules
- Boundary rules

### Phase 5: Workflow (If Applicable)

> "Does this plugin guide users through steps over time, or is it always-available?"

If steps exist:
- OSQR maps the sequence
- Asks about dependencies
- Asks about progress tracking

---

## Real-Time Control Population

As conversation progresses, creator sees:
- Fields filling in with OSQR's interpretation
- Sliders moving from default positions
- Uploaded docs appearing in knowledge section
- Behavior rules appearing as parsed statements

**Visual feedback principle:** Creator always sees what OSQR understood. No black box.

**Override principle:** Creator can click any control and manually adjust. OSQR acknowledges: "Got it, updated."

---

## Checkpoints & Context Rot Prevention

Every 5-7 exchanges, OSQR compacts:
> "Here's where we are: [summary of captured spec]. What's missing or wrong?"

This prevents:
- Context rot in long sessions
- Misunderstandings compounding
- Creator losing track of what's defined

---

## Minimum Viable Plugin

A plugin can publish when it meets the minimum requirements:

| Required | Why |
|----------|-----|
| Plugin Name | Marketplace display |
| Short Description | Users understand what it is |
| Target User | Users self-select |
| Transformation Promise | Clear value proposition |
| At least ONE of: Personality adjustment, Knowledge upload, Behavior rule, or Workflow | Otherwise it's just OSQR baseline |

Everything else is optional. The filter is: did they finish the conversation? If someone can't articulate their plugin through dialogue with OSQR, they weren't ready anyway.

---

## Testing Before Publish

OSQR offers:
> "Want to test how this feels? Give me a prompt your user might send."

Creator enters test prompt. OSQR responds as the plugin would.

**Side-by-side available:** Show response with plugin active vs. OSQR baseline.

**Edge case prompts:** OSQR suggests scenarios:
- User is frustrated
- User goes off-topic
- User wants to skip ahead
- User asks something out of scope

---

## Publishing

When creator is satisfied:
> "Ready to publish? You can keep it private or list it in the marketplace."

| Option | What Happens |
|--------|--------------|
| Private | Only creator can activate, useful for personal use or testing with select users |
| Marketplace | Listed publicly, subject to constitutional compliance check |

### Compliance Check (Automated)

- No data exploitation instructions
- No dishonesty instructions
- No impersonation of real people
- Identity fields complete

If passes: Published immediately.
If fails: OSQR explains what needs to change.

---

## Versioning & Updates

When creator updates plugin:
1. New version created
2. Existing users stay on their version
3. Users see "Update available" notification
4. User chooses to update or stay

**Why opt-in:**
- Prevents breaking changes mid-workflow
- User trust preserved
- Creator can iterate without fear

---

## Creator Analytics

### What creators see:
- Install count
- Active users (used in last 7 days)
- Engagement patterns (which features used most)
- User ratings (if implemented)

### What creators don't see:
- Individual user data
- Specific conversations
- Personal information

---

## Revenue

- **80%** to creator
- **20%** to OSQR
- No upfront fees
- Paid monthly based on subscription revenue attributed to plugin

This removes all friction from creation. The only filter is: can they articulate what they're building? OSQR bets on volume and marketplace network effects over per-creator revenue.

---

## Quality Signals (No Gatekeeping)

Instead of upfront review, quality emerges from usage data:
- Install count
- Active user ratio (installs → active)
- Engagement rate
- User ratings

High-quality plugins surface naturally. Abandoned plugins fade. No curation required.

---

## Integration Points

| Component | Integration |
|-----------|-------------|
| [Plugin Architecture](../architecture/PLUGIN_ARCHITECTURE.md) | Structure and boundaries for all plugins |
| [Plugin Control Inventory](./FOURTH-GEN-PLUGIN-SPEC.md) | Source of all available controls |
| [OSQR Character Guide](../governance/OSQR_PHILOSOPHY.md) | Baseline personality (sliders at 50) |
| [Constitutional Framework](../governance/OSQR_CONSTITUTION.md) | Immutable constraints for compliance check |
| [Conversion Strategy](../business/PRICING-ARCHITECTURE.md) | How plugin trials work for Lite users |
| [Spoken Architecture](../execution/SPOKEN_ARCHITECTURE.md) | Same conversational development pattern |

---

## Open Questions

1. **Multi-plugin installs:** If user has multiple plugins, how do they interact? (Deferred per Control Inventory)
2. **Plugin discovery:** Categories? Search? Recommendations? (Needs marketplace spec)
3. **Creator reputation:** Do successful plugins unlock benefits? Verification badge?
4. **Collaboration:** Can multiple creators co-build a plugin?

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial specification |

---

**End of Specification**

*Document Version: 1.0*
*Status: Ready for Implementation*
