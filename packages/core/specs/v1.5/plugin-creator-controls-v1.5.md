# OSQR Plugin Creator Control Inventory
## Version 2.0 | Complete Parameter Reference

---

## Document Purpose

This document is the **master inventory of every control a plugin creator can adjust**. It serves as the source of truth for:

1. What OSQR exposes to creators
2. How controls are organized and categorized
3. Which controls are required vs optional
4. What happens when controls aren't explicitly set (defaults)

OSQR's guided plugin creation flow will surface relevant subsets of these controls based on creator intent. Creators see all controls, but irrelevant ones are greyed out with an "Enable" option.

---

## Core Philosophy

**"OSQR is the tool. Creators define how it's used."**

We don't prescribe how plugins should behave. We provide the controls, let creators experiment, and learn from what they build. The only hard constraints are constitutional (user data sovereignty, identity transparency, baseline honesty).

**From NotebookLM Research:**
- Minimum viable: Goal, success criteria, core principles
- Maximum before overload: ~70% context window utilization
- Every instruction must "earn its place"

---

## Control Categories

| Category | What It Controls | Required? |
|----------|------------------|-----------|
| **Identity** | Who the plugin is, what transformation it delivers | Yes |
| **Personality** | How OSQR communicates when plugin is active | No (defaults apply) |
| **Knowledge** | What OSQR knows (uploaded documentation) | Varies by plugin type |
| **Behavior** | When and how OSQR engages proactively | No (defaults apply) |
| **Autonomy** | What OSQR can do without asking permission | No (defaults apply) |
| **Output** | How responses are structured and formatted | No (defaults apply) |
| **Workflow** | Multi-step processes and progress tracking | No |
| **Triggers** | When plugin activates vs stays dormant | No (always-on default) |

---

## Category 1: Identity (Required)

These fields define the plugin's core purpose. OSQR's guided flow starts here.

### 1.1 Basic Information

| Field | Description | Example | Required |
|-------|-------------|---------|----------|
| **Plugin Name** | Display name in marketplace | "Fourth Generation Formula" | Yes |
| **Short Description** | One-line summary (max 100 chars) | "Build a legacy worth transferring" | Yes |
| **Long Description** | Full marketplace description | [paragraph] | Yes |
| **Creator Name** | Who built this plugin | "Kable Record" | Yes |
| **Icon** | Visual identifier (uploaded image) | [image] | Yes |
| **Category** | Primary classification | Methodology / Voice Pack / Tool | Yes |

### 1.2 Transformation Definition

| Field | Description | Example | Required |
|-------|-------------|---------|----------|
| **Target User** | Who is this for? | "Fathers building businesses they want to transfer" | Yes |
| **Problem Statement** | What pain does this solve? | "97% of family wealth disappears by generation 4" | Yes |
| **Transformation Promise** | What outcome do users get? | "A documented system for generational transfer" | Yes |
| **Success Criteria** | How do we know it worked? | "User completes Transfer Blueprint" | Yes |

### 1.3 Core Principles (3-10 required)

The foundational beliefs that guide plugin behavior. OSQR references these when making decisions.

| Field | Description | Example |
|-------|-------------|---------|
| **Principle 1** | Core belief | "Transfer is taught, not caught" |
| **Principle 2** | Core belief | "Productive struggle builds capability" |
| **Principle 3** | Core belief | "Documentation creates clarity" |
| ... | Up to 10 | ... |

---

## Category 2: Personality Sliders

All sliders default to 50 (OSQR baseline). Creators adjust from there. Changes are visible in real-time via the test prompt feature.

### 2.1 Communication Style

| Slider | 0 (Low) | 50 (Default) | 100 (High) | Notes |
|--------|---------|--------------|------------|-------|
| **Formality** | "Hey, quick thought..." | "Here's something to consider..." | "I would advise the following..." | Affects vocabulary, sentence structure |
| **Warmth** | Matter-of-fact, clinical | Friendly but professional | Nurturing, emotionally present | Affects emotional language |
| **Energy** | Calm, minimal animation | Responsive to context | Highly expressive always | Affects enthusiasm markers |
| **Humor** | None, all business | Dry wit when natural | Playful, jokes often | Affects levity in responses |

### 2.2 Engagement Style

| Slider | 0 (Low) | 50 (Default) | 100 (High) | Notes |
|--------|---------|--------------|------------|-------|
| **Praise** | Never comments on user | Acknowledges wins when earned | Celebrates everything | When to recognize progress |
| **Concern** | User handles their own emotions | Notices and gently acknowledges | "I'm worried about you" | Emotional attunement level |
| **Directness** | Hints, lets user discover | Offers opinion when helpful | "You're wrong, here's why" | How bluntly to communicate |
| **Pushback** | Goes along with user | Questions gently if needed | Challenges actively | How much to resist user direction |

### 2.3 Specialized Sliders

| Slider | 0 (Low) | 50 (Default) | 100 (High) | Notes |
|--------|---------|--------------|------------|-------|
| **Proactivity** | Only responds when asked | Offers suggestions contextually | Initiates frequently | How often OSQR starts conversations |
| **Detail Level** | Brief, minimal responses | Balanced depth | Comprehensive, thorough | Response length tendency |
| **Question Frequency** | Rarely asks clarifying questions | Asks when genuinely unclear | Asks frequently to understand deeply | How often to probe |
| **Framework Adherence** | Flexible interpretation | Balanced application | Strict methodology enforcement | How rigidly to follow uploaded docs |
| **Encouragement** | Minimal positive reinforcement | Balanced support | High encouragement | Motivational language frequency |
| **Challenge Level** | Accepts user at face value | Gentle accountability | Pushes hard for growth | How much to demand of user |

### 2.4 Slider Interaction Notes

Sliders can create interesting tensions. Examples:
- High Warmth + High Directness = "Tough love" personality
- Low Formality + High Challenge = "Casual drill sergeant"
- High Praise + High Pushback = "Celebrates effort, demands excellence"

**We don't define "correct" combinations.** Creators experiment to find what works for their methodology.

---

## Category 3: Knowledge (Documentation)

What OSQR knows when this plugin is active. Different plugin types need different depths.

### 3.1 Document Types

| Type | Description | Use Case | Format |
|------|-------------|----------|--------|
| **Framework Documents** | Core methodology content | Books, courses, systems | PDF, DOCX, MD |
| **Reference Materials** | Supporting information | FAQs, glossaries, examples | PDF, DOCX, MD |
| **Templates** | Structured outputs | Workbooks, assessments, blueprints | PDF, DOCX |
| **Conversation Examples** | Sample dialogues | How OSQR should respond in scenarios | MD, TXT |

### 3.2 Document Processing Options

| Option | Description | Default |
|--------|-------------|---------|
| **Index for retrieval** | Make searchable in conversations | Yes |
| **Use for response generation** | Inform OSQR's language/concepts | Yes |
| **Deliver as content** | Present to users directly (lessons, exercises) | No |
| **Track progress through** | Monitor user completion | No |

### 3.3 Knowledge Depth Spectrum

| Plugin Type | Documentation Needed | Example |
|-------------|---------------------|---------|
| **Voice Pack** | None required | Movie Quotes plugin - just personality sliders |
| **Light Methodology** | 1-5 documents | Simple framework, few templates |
| **Full Methodology** | 10-50+ documents | Complete book, workbook, course materials |
| **Tool Plugin** | API/integration docs | MCP server connection, tool definitions |

---

## Category 4: Behavior Rules

When and how OSQR acts proactively. These are the "MentorScripts" from the research.

### 4.1 Proactive Engagement Rules

Define conditions that trigger OSQR to initiate or suggest.

| Rule Type | Description | Example |
|-----------|-------------|---------|
| **Time-based** | Trigger on schedule | "Check in every Monday morning" |
| **Progress-based** | Trigger on milestone | "When user completes Week 3, celebrate" |
| **Pattern-based** | Trigger on repeated behavior | "If user mentions 'busy' 3+ times, address time management" |
| **Inactivity-based** | Trigger on absence | "If no engagement for 7 days, reach out" |
| **Keyword-based** | Trigger on specific terms | "When user mentions 'inheritance', activate transfer module" |

### 4.2 Response Rules

Define how OSQR should handle specific situations.

| Rule Type | Description | Example |
|-----------|-------------|---------|
| **Redirect rules** | When to steer conversation | "If user asks about investing, acknowledge but return to transfer planning" |
| **Escalation rules** | When to increase intensity | "If user repeatedly skips exercises, increase challenge level" |
| **De-escalation rules** | When to back off | "If user expresses frustration, reduce proactivity temporarily" |
| **Boundary rules** | What's out of scope | "Don't provide legal or tax advice - suggest professional consultation" |

### 4.3 Rule Builder Interface

Creators define rules in natural language. OSQR parses into actionable triggers.

```
IF [condition]
THEN [action]
UNLESS [exception]
```

Example:
```
IF user hasn't completed their Daily Foundations for 3 days
THEN send encouraging check-in with specific prompt
UNLESS user has marked "vacation mode" active
```

---

## Category 5: Autonomy Controls

What OSQR can do without explicit permission. The "LoopScripts" from research.

### 5.1 Autonomy Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| **Ask First** | Always get permission before acting | Sensitive actions, new users |
| **Suggest Then Act** | Propose action, proceed if no objection in X seconds | Routine tasks, established users |
| **Act Then Report** | Take action, inform user afterward | Low-risk, time-sensitive |
| **Silent** | Act without notification | Background maintenance, logging |

### 5.2 Action Categories

| Action Type | Default Autonomy | Can Override? |
|-------------|------------------|---------------|
| **Store memory** | Act Then Report | Yes |
| **Reference past conversations** | Silent | Yes |
| **Suggest next steps** | Suggest Then Act | Yes |
| **Send reminders** | Ask First | Yes |
| **Create artifacts (docs, plans)** | Suggest Then Act | Yes |
| **Access external tools** | Ask First | Yes |
| **Share with other plugins** | Never (Constitutional) | No |

### 5.3 Trust Progression

Creators can define how autonomy changes over time.

| Stage | Criteria | Autonomy Adjustment |
|-------|----------|---------------------|
| **New User** | First 7 days | Maximum permission-seeking |
| **Established** | 8-30 days active | Moderate autonomy |
| **Trusted** | 30+ days, high engagement | Higher autonomy |
| **Custom** | Creator-defined milestones | Creator-defined levels |

---

## Category 6: Output Formatting

How OSQR structures responses when this plugin is active.

### 6.1 Response Structure

| Setting | Options | Default |
|---------|---------|---------|
| **Length preference** | Brief / Standard / Comprehensive | Standard |
| **List usage** | Never / When helpful / Frequently | When helpful |
| **Header usage** | Never / For long responses / Always | For long responses |
| **Emoji usage** | Never / Sparse / Moderate / Frequent | Sparse |

### 6.2 Specialized Outputs

| Output Type | Description | Trigger |
|-------------|-------------|---------|
| **Assessment summary** | Structured evaluation | After completing assessment |
| **Progress report** | Status overview | On request or scheduled |
| **Action plan** | Next steps document | After planning conversation |
| **Workbook entry** | Formatted exercise response | During workbook completion |

### 6.3 Template System

Creators can upload output templates for specific deliverables.

| Template Field | Description |
|----------------|-------------|
| **Template name** | Identifier (e.g., "Transfer Blueprint") |
| **Trigger phrase** | What activates this template |
| **Structure** | Markdown/YAML defining output format |
| **Required fields** | What must be filled before generating |

---

## Category 7: Workflow Definitions

Multi-step processes the plugin guides users through.

### 7.1 Workflow Structure

| Component | Description | Example |
|-----------|-------------|---------|
| **Workflow name** | Identifier | "13-Week Transfer Journey" |
| **Steps** | Ordered sequence | Week 1: Identity, Week 2: Assessment... |
| **Dependencies** | What must complete before next step | "Complete Builder's Creed before Transfer Blueprint" |
| **Estimated duration** | Time per step | "1 week per module" |

### 7.2 Progress Tracking

| Tracking Type | Description |
|---------------|-------------|
| **Completion flags** | Binary done/not done per step |
| **Quality gates** | Minimum criteria to advance |
| **Branching paths** | Different routes based on user input |
| **Restart capability** | Can user redo steps? |

### 7.3 Workflow Persistence

Progress data is stored in user's encrypted PKV (Private Knowledge Vault). Plugin can read progress when active but cannot access when deactivated.

---

## Category 8: Trigger Configuration

When the plugin activates vs stays dormant.

### 8.1 Activation Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Always On** | Plugin always active when installed | Primary methodology plugins |
| **Keyword Triggered** | Activates on specific topics | Specialty plugins |
| **Manual Toggle** | User explicitly activates | Situational tools |
| **Scheduled** | Activates at specific times | Daily practice plugins |

### 8.2 Trigger Keywords

For keyword-triggered plugins, creators define activation terms.

| Field | Description | Example |
|-------|-------------|---------|
| **Primary keywords** | High-confidence triggers | "legacy", "transfer", "generational" |
| **Secondary keywords** | Medium-confidence triggers | "kids", "inheritance", "business" |
| **Exclusion keywords** | Don't activate even if others match | "estate tax", "lawyer" (out of scope) |
| **Confidence threshold** | How certain before activating | 0.7 (70%) |

### 8.3 Multi-Plugin Handling

*[Deferred - to be designed after marketplace launch]*

When user has multiple plugins, how do we determine which activates? Options under consideration:
- Most relevant based on context
- Most recently used
- User explicitly chooses
- Plugins can coexist (blended mode)

---

## Constitutional Constraints

These cannot be modified by any plugin. They are enforced at the infrastructure layer.

| Constraint | Description | Why Protected |
|------------|-------------|---------------|
| **User Data Sovereignty** | User owns their data, can export/delete anytime | Core trust |
| **Identity Transparency** | OSQR must identify as OSQR if directly asked | Prevents deception |
| **Baseline Honesty** | Cannot instruct OSQR to lie or deceive | Foundational integrity |
| **No Cross-Plugin Data Sharing** | Plugins cannot access each other's data | Privacy boundary |
| **No Harmful Output** | Cannot enable content that harms users | Safety |
| **Audit Trail** | All significant actions are logged | Accountability |

Even at slider extremes, OSQR maintains:
- Basic respect for user
- Honest communication
- Constitutional compliance
- Safety awareness

---

## Default Values

When creators don't set a control, these defaults apply.

### Personality Defaults (All = 50)

Neutral, balanced, professional OSQR baseline.

### Behavior Defaults

| Setting | Default |
|---------|---------|
| Proactive engagement | Off (responds only when asked) |
| Progress tracking | Off |
| Scheduled check-ins | Off |
| Reminder frequency | None |

### Autonomy Defaults

| Action | Default |
|--------|---------|
| Store memory | Act Then Report |
| Create artifacts | Suggest Then Act |
| Send reminders | Ask First |
| Access tools | Ask First |

### Output Defaults

| Setting | Default |
|---------|---------|
| Length | Standard |
| Emoji | Sparse |
| Lists | When helpful |
| Headers | For long responses |

---

## The Creator Flow

OSQR guides creators through relevant controls based on their answers to initial questions.

### Opening Questions

1. "What kind of plugin are you creating?"
   - Voice/Personality modifier
   - Methodology/Framework
   - Tool/Integration
   - Something else (describe)

2. "Do you have existing documentation to upload?"
   - Yes, extensive (book, course, etc.)
   - Yes, some (templates, frameworks)
   - No, building from scratch

3. "What transformation does your plugin deliver?"
   - [Free text]

### Control Visibility Logic

Based on answers, OSQR shows/hides/greys controls:

| Creator Type | Visible Controls | Greyed (Enableable) | Hidden |
|--------------|------------------|---------------------|--------|
| **Voice Pack** | Identity basics, Personality sliders | Behavior rules, Workflows | Knowledge upload |
| **Light Methodology** | Identity, Personality, Basic knowledge | Workflows, Advanced triggers | Complex autonomy |
| **Full Methodology** | All controls | None | None |
| **Tool Plugin** | Identity, Integration config, Autonomy | Personality sliders | Workflow tracking |

### Iterative Refinement

1. Creator adjusts controls
2. Tests with sample prompts
3. Sees OSQR respond in real-time
4. Iterates until satisfied
5. Publishes to marketplace (or keeps private)

---

## Testing Interface

### Test Prompt Library

Creators can test with:
- Custom prompts they write
- Pre-built scenario prompts (provided by OSQR)
- Edge case prompts (pushback, emotional, off-topic)
- Prompts from their uploaded documentation

### Side-by-Side Comparison

Show how OSQR would respond:
- With plugin active (current slider settings)
- With base OSQR (all sliders at 50)

This helps creators understand what their adjustments actually change.

### Scenario Testing

Pre-built scenarios for common situations:
- User is struggling with the methodology
- User wants to skip ahead
- User is frustrated
- User is succeeding
- User goes off-topic
- User asks something out of scope

---

## Quality Review (For Marketplace Publishing)

Before a plugin can be published to the marketplace, OSQR reviews for:

| Check | What We Look For |
|-------|------------------|
| **Constitutional compliance** | No data exploitation, no dishonesty instructions |
| **Identity fields complete** | Name, description, transformation defined |
| **Minimum substance** | Either meaningful documentation OR significant slider customization |
| **No impersonation** | Not claiming to be a real person |
| **Clear value proposition** | User understands what they're getting |
| **Appropriate slider ranges** | No extreme settings without justification |

### Review Tiers

| Tier | Process | Badge |
|------|---------|-------|
| **Self-Published** | Automated checks only | None |
| **Community Reviewed** | Automated + user ratings threshold | Community |
| **Verified** | Full OSQR team review | ✓ Verified |

---

## Revenue & Pricing

### Creator-Set Pricing

Creators choose their price point:
- Free
- $5-10 (Voice packs, simple tools)
- $20-50 (Light methodologies)
- $100+ (Full methodologies, premium content)
- Subscription options (monthly/annual)

### Revenue Split

| Party | Share | Notes |
|-------|-------|-------|
| Creator | 80% | Their methodology, their audience |
| OSQR | 20% | Platform, infrastructure, distribution |

---

## Data & Analytics

*[Dashboard design deferred - placeholder for creator metrics]*

Creators will have access to:
- Install count
- Active user count
- Usage patterns (which features used most)
- User feedback/ratings
- Revenue tracking

User privacy maintained - creators see aggregate data, not individual user details.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial personality interface concept |
| 2.0 | Dec 2024 | Complete control inventory rebuild |

---

## Open Items (Future Versions)

| Item | Status | Notes |
|------|--------|-------|
| Multi-plugin conflict resolution | Deferred | Design after marketplace launch |
| User-side adjustment toggles | Deferred | Focus on creator controls first |
| Slider presets library | V2.0 | "Supportive Coach", "Drill Sergeant", etc. |
| A/B testing for creators | Future | Test different configurations |
| Creator analytics dashboard | Future | Build with marketplace |
| Book-in-a-Box plugin template | Future | Specialized workflow for book creation plugins |

---

## Integration Notes

This document is the source of truth. Other specs derive from it:

- **Plugin Architecture Spec**: Technical implementation of these controls
- **Marketplace Spec**: UI for browsing/purchasing plugins with these settings
- **OSQR Character Guide**: Baseline personality (all sliders = 50)
- **Constitutional Framework**: The immutable constraints listed above

When conflicts arise, this inventory defines what's possible. Other specs define how it's built.
