# OSQR Auto-Organization Specification

**Component**: Auto-Organization Subsystem  
**Version**: 1.0  
**Status**: Ready for Implementation  
**Dependencies**: Memory Vault, Document Indexing Subsystem  
**Priority**: V1.5 Feature

---

## Executive Summary

Oscar automatically organizes conversations into chats and projects without user intervention. Users retain full control to override, but most will never need to. The organizing principle is simple:

> **Organization is a fallback for when retrieval fails. If Oscar always surfaces the right information at the right time, users don't need to browse—they just talk to Oscar.**

Projects and chats remain visible in the UI (familiar UX), but Oscar handles creation, naming, and linking automatically. A small indicator shows Oscar's organizational decisions; users can click to verify, change, or simply ignore.

---

## Core Philosophy

### The Retrieval-First Principle

Oscar's unified memory means he knows everything regardless of where it's stored. Users don't need organizational structure to find information—Oscar finds it for them. Projects exist for two secondary purposes:

1. **Navigation fallback**: When users want to browse rather than ask
2. **Context view**: When users want to see "everything about X" in one place

Neither is the primary interaction. Primary interaction is conversation with Oscar, who already knows where everything is.

### What This Means for Users

| User Who Cares About Organization | User Who Doesn't Care |
|-----------------------------------|----------------------|
| Sees Oscar's auto-organization | Talks to Oscar, ignores sidebar |
| Clicks indicator to verify/edit | Never clicks indicator |
| Creates own projects manually | Lets Oscar create projects |
| Browses projects to find things | Asks Oscar to find things |
| **Both experiences are fully supported** | **Both experiences are fully supported** |

---

## Auto-Organization Behaviors

### 1. Chat Segmentation

Oscar automatically creates new chats when conversation context shifts significantly. This prevents single chats from becoming unwieldy while preserving continuity.

**Segmentation Triggers (Weighted)**

| Trigger | Weight | Description |
|---------|--------|-------------|
| Topic shift | 0.4 | Embedding similarity drops below 0.6 |
| Temporal gap | 0.3 | User returns after 4+ hours |
| Intent shift | 0.2 | Moves from planning → execution |
| Explicit user action | 1.0 | User says "new topic" or clicks New Chat |

**Threshold**: Combined weight ≥ 0.7 triggers new chat creation.

A topic shift alone (0.4) won't create a new chat—could be a quick tangent. But topic shift + temporal gap (0.7) = definitely new chat.

### 2. Chat Titling

Oscar generates titles based on conversation content. Titles are set after the first substantive exchange (not immediately on first message).

**Titling Rules**

- Maximum 50 characters
- Describes the topic, not the action ("VoiceQuote Auth Flow" not "Discussing Authentication")
- Uses user's terminology when possible
- Updates if conversation evolves significantly (rare)

### 3. Project Matching

Oscar automatically links chats to relevant projects based on semantic similarity. A chat can link to multiple projects.

**Matching Algorithm**

1. Extract topics/entities from chat content
2. Compare against existing project signatures (name + description + linked content)
3. Calculate confidence score for each potential match
4. Link to all projects above threshold (0.7)

**Multi-Project Linking**

A chat about "authentication patterns" might link to both OSQR and VoiceQuote projects. This happens automatically—user sees the chat in both project views. No prompt, no approval required.

### 4. Project Creation

Oscar creates new projects when patterns emerge that don't fit existing ones.

**Creation Triggers**

- 5+ chats about same topic, no matching project exists
- User mentions "my [X] project" but no project named X exists
- Document upload with distinct topic cluster

**Project Naming**

- Uses user's terminology ("VoiceQuote" not "Voice-Based Quoting System")
- Short, scannable names (under 30 characters)
- Matches how user refers to the topic in conversation

---

## The Indicator

Every auto-organized chat/project displays a small indicator showing Oscar made the decision. This is the only UI element added by this feature.

### Visual Design

- Small icon (Oscar's mark or subtle "auto" badge)
- Positioned near chat/project title
- Non-intrusive—doesn't compete with content
- Disappears after user verifies (optional)

### Click Behavior

Clicking the indicator reveals options:

| Option | What It Does |
|--------|--------------|
| **Looks good** | Confirms Oscar's choice, removes indicator |
| **Rename** | Edit chat/project title |
| **Move** | Change which project(s) this chat belongs to |
| **Unlink** | Remove from current project (for multi-linked chats) |

### Ignore Behavior

If user never clicks the indicator, nothing happens. Oscar's organization stands. The indicator may fade after 7 days of no interaction (configurable).

---

## Learning From Corrections

When users do correct Oscar's organization, he learns from it. This is expected to be rare but valuable.

### What Oscar Learns

| User Action | Oscar Learns |
|-------------|--------------|
| Renames chat | User's naming preferences (terminology, length, style) |
| Moves to different project | How user categorizes this type of content |
| Unlinks from project | Project boundaries are narrower than Oscar assumed |
| Adds to additional project | Project boundaries are wider—these topics relate |
| Creates manual project | This topic matters enough for explicit organization |

### Learning Mechanism

Follows the Inferred Mentorship pattern from Insights System:

1. Oscar detects correction
2. Proposes a rule: "Skip linking auth discussions to general OSQR project"
3. Applies rule to future organization
4. If user corrects again, refines the rule

Rules are stored in user's PKV (Personal Knowledge Vault) under organizational preferences.

---

## Data Model

### Chat Schema Extension

```typescript
interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  createdBy: 'user' | 'oscar';
  titleConfidence: number;  // 0-1
  projectLinks: ProjectLink[];
  userVerified: boolean;  // User clicked 'Looks good'
}
```

### ProjectLink Schema

```typescript
interface ProjectLink {
  projectId: string;
  confidence: number;  // 0-1
  source: 'auto' | 'user';
  linkedAt: Date;
}
```

### Project Schema Extension

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  createdBy: 'user' | 'oscar';
  signature: number[];  // Embedding for matching
  userVerified: boolean;
}
```

---

## Integration Points

### Memory Vault

Auto-Organization uses Memory Vault for:

- Storing organizational preferences learned from corrections
- Retrieving project signatures for matching
- Accessing chat embeddings for similarity comparison

Key principle from Memory Vault Addendum: "User organizational structures are metadata, not access controls." This feature implements that principle at the UI level.

### Document Indexing Subsystem

When documents are uploaded, DIS triggers Auto-Organization:

- New document → Check for project matches
- Document cluster detected → Consider new project creation
- Document linked to chat → Chat inherits document's project links

### Insights System

Auto-Organization can trigger insights:

- "You've been working on payment integration across 3 projects. Want me to create a dedicated project?"
- "This chat seems unrelated to VoiceQuote. Should I move it?"

These are surfaced through the normal Insights pipeline, not as separate notifications.

---

## UI/UX Requirements

### Sidebar Behavior

- Projects remain visible in sidebar (familiar UX)
- Auto-created projects appear in same list as manual projects
- No visual distinction needed beyond the indicator
- Chats grouped under projects they're linked to
- Multi-linked chats appear under each linked project

### Manual Controls Preserved

Users can still:

- Create new chats manually
- Create new projects manually
- Rename anything
- Move chats between projects
- Delete chats and projects

Auto-Organization supplements, never replaces, manual control.

### Future Consideration: Hidden Sidebar

When data shows users rarely interact with the sidebar:

- Consider making it collapsible by default
- Or hidden until requested ("Show me my projects")
- This is not V1—preserve familiar UX first

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Correction rate | < 10% | Oscar gets it right most of the time |
| Indicator ignore rate | > 70% | Users trust Oscar's organization |
| Manual project creation | < 20% | Oscar anticipates user needs |
| Retrieval success rate | > 95% | Users find info via conversation, not browsing |
| Sidebar interaction rate | Decreasing | Validates retrieval-first hypothesis |

---

## Implementation Phases

### Phase 1: Chat Segmentation & Titling (Week 1-2)

- [ ] Implement segmentation triggers
- [ ] Build title generation
- [ ] Add createdBy field to chat schema
- [ ] Display indicator on auto-created chats

### Phase 2: Project Matching (Week 3-4)

- [ ] Build project signature generation
- [ ] Implement matching algorithm
- [ ] Enable multi-project linking
- [ ] Display indicator on auto-linked chats

### Phase 3: Project Creation (Week 5)

- [ ] Implement creation triggers
- [ ] Build project naming logic
- [ ] Display indicator on auto-created projects

### Phase 4: Learning Loop (Week 6)

- [ ] Track user corrections
- [ ] Implement rule inference
- [ ] Store preferences in PKV
- [ ] Apply learned rules to future organization

---

## Document Connections

| Document | Relationship |
|----------|--------------|
| **Memory Vault Addendum** | Foundational principle: organization is metadata |
| **Document Indexing Spec** | Triggers from document uploads |
| **Insights System** | Organizational suggestions via insights pipeline |
| **Character Guide** | Inferred Mentorship pattern for learning |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial specification |

---

## Open Questions for Future Versions

1. Should there be project hierarchy (sub-projects)?
2. When sidebar usage drops, at what threshold do we hide it by default?
3. Should auto-created projects have a different visual treatment?
4. How do we handle project archiving? Can Oscar detect dormant projects?
5. Should users be able to "pin" certain chats to always appear at top?

---

**End of Specification**
