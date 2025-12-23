# OSQR Throttle & Cost Architecture
## Version 2.0 | Sustainable Pricing with Graceful Degradation

---

## Document Purpose

This document defines how OSQR manages usage costs, throttling behavior, and overage pricing across tiers. The goal is to:

- Demonstrate genuine value before asking for payment
- Create daily habits without creating resentment
- Enable cost-sustainable usage at scale
- Naturally encourage upgrades without manipulation
- Provide pay-as-you-go flexibility for power users

---

## Business Model Philosophy

### What We're NOT Doing

| Strategy | Why Not |
|----------|---------|
| VC-subsidized land grab | We're not burning cash for market share |
| Data harvesting | Constitutional prohibition - users own data |
| Feature-crippled tiers | Creates resentment, not loyalty |
| Hard cutoffs | "You've run out" feels punishing |
| Artificial scarcity | Against constitutional values |

### What We ARE Doing

**Paid Tiers with Graceful Degradation + Overage Options**

- Lite tier ($19/mo) covers costs with margin
- Throttling feels like natural pause, not punishment
- Overage purchases provide flexibility without forcing tier jumps
- Memory persists across all tiers (key differentiator)
- Midnight reset creates predictable daily rhythm

---

## Tier Structure (Current)

### Launch Tiers

| Tier | Price | Future Price | Target User |
|------|-------|--------------|-------------|
| **Pro** | $99/mo | $149/mo | Professionals, primary tier |
| **Master** | $249/mo | $349/mo | Power users, teams |
| **Master Annual** | $199/mo | — | Committed power users |

### Post-1,000 Users

| Tier | Price | Purpose |
|------|-------|---------|
| **Lite** | $19/mo | Entry funnel, conversion driver |

### Trial Mechanics

- 14-day Pro trial via referral (costs nothing, creates word-of-mouth)
- No free tier at launch
- Lite launches after 1,000 paid users established
- Founder pricing locked for first 500 users

---

## Cost Analysis

### Model Pricing (Current)

| Model | Input (per 1K tokens) | Output (per 1K tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| GPT-4o | ~$0.005 | ~$0.015 | Premium insights |
| Claude Sonnet | ~$0.003 | ~$0.015 | Premium analysis |
| Groq Llama 70B | ~$0.0008 | ~$0.0008 | Standard chat |
| Gemini Flash | ~$0.000075 | ~$0.0003 | Quick responses |

### Typical Interaction Costs

| Interaction Type | Tokens (In/Out) | Premium Cost | Economy Cost |
|------------------|-----------------|--------------|--------------|
| Document insight | 2K / 500 | ~$0.02 | ~$0.002 |
| Standard chat | 500 / 300 | ~$0.007 | ~$0.0005 |
| Contemplate query | 5K / 1K | ~$0.04 | ~$0.005 |
| Council session | 8K / 2K | ~$0.08 | N/A (premium only) |

### Tier Cost Ceilings

| Tier | Monthly Price | Max Cost to OSQR | Guaranteed Margin |
|------|---------------|------------------|-------------------|
| Lite | $19 | ~$6 | 68% |
| Pro | $99 | ~$30 | 70% |
| Master | $249 | ~$75 | 70% |

---

## Tier Boundaries

### Feature Limits by Tier

| Feature | Lite | Pro | Master |
|---------|------|-----|--------|
| Documents in vault | 5 | 500 | 1,500 |
| Queries per day | 10 | 100 | 300 |
| Storage | 1GB | 10GB | 100GB |
| Thoughtful Mode | ✗ | ✓ | ✓ |
| Contemplate Mode | ✗ | ✓ | ✓ |
| Council Mode | ✗ | ✗ | ✓ |
| Image analyses/month | 10 | 100 | Unlimited |
| Plugin access | Trial only | Full | Full |
| Memory persistence | ✓ | ✓ | ✓ |
| Chat history analysis | 7 days | 30 days | All time |

### What ALL Tiers Keep

**Memory Persists** - This is the differentiator. OSQR remembers all users. They don't start over. This costs almost nothing and creates loyalty.

**Document Access** - Uploaded documents remain accessible, just limited analysis depth.

**Basic Chat** - After premium budget exhausted, falls back to economy model.

---

## The Throttle System

### How Throttling Works

Rather than hard cutoffs, OSQR uses graceful degradation:

```
Session starts: User has full daily budget
    ↓
Premium interactions consume budget
    ↓
Budget depleted → Model fallback
    ↓
Economy model maintains conversation
    ↓
Complex requests get soft gate with options
    ↓
Midnight reset (user's local time)
```

### Model Fallback Logic

| Budget State | Premium Models | Economy Models | User Experience |
|--------------|----------------|----------------|-----------------|
| Full (100%) | Available | Available | Full capability |
| >50% | Available | Available | Full capability |
| 25-50% | Rationed | Available | Slightly slower insights |
| 10-25% | Blocked | Available | Chat only, no deep analysis |
| <10% | Blocked | Rationed | Basic responses only |
| Depleted | Blocked | Emergency only | Minimal + upgrade options |

### Reset Timing

**Midnight reset in user's local timezone**

- Creates predictable daily rhythm
- Users know exactly when capacity returns
- Simpler to understand than rolling 24h
- Enables "save my queries for tomorrow" planning

---

## Overage Pricing

### Pay-As-You-Go Options

When users hit limits, they have three choices:

1. **Wait** - Resets at midnight
2. **Buy** - Instant capacity boost
3. **Upgrade** - Move to higher tier
4. **Enterprise** - Contact for custom pricing (appears after 3+ limit hits/month)

### Overage Packages

| Package | Price | Your Max Cost | Guaranteed Margin |
|---------|-------|---------------|-------------------|
| 10 Contemplate queries | $10 | $3 | 70% |
| 10 Council sessions | $20 | $6 | 70% |

### Why This Pricing Works

**User psychology:** Someone hitting limits and wanting more immediately isn't price-shopping. They're in flow, they want to keep going. The decision point is "can I keep working?" not "$10 vs $5."

**Your protection:** Even if they burn through every query purchased, you're guaranteed 70% margin. No outlier can invert your economics.

**Comparison anchor:** $10 for 10 Contemplate = $1 each (cheaper than a coffee). Council at $2 each is still impulse-buy territory.

### Overage UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Daily Limit Reached                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  I've used my deep thinking for today.                         │
│                                                                 │
│  Options:                                                       │
│                                                                 │
│  [Wait until midnight]     Resets in 4h 23m                    │
│                                                                 │
│  [Buy 10 more]             $10 - instant access                │
│                                                                 │
│  [Upgrade to Pro]          $99/mo - 100 queries/day            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

For users hitting limits 3+ times per month, add:

```
│  [Talk to us]              Enterprise pricing for heavy use    │
```

---

## Plugin Access by Tier

### Plugin Trial System (Lite Tier)

Based on industry patterns (Botpress, n8n, Figma), Lite users get plugin trials rather than hard gates:

| Tier | Plugin Access |
|------|---------------|
| **Lite** | 7-day trial per plugin, then locked until upgrade |
| **Pro** | Full access to all standard plugins |
| **Master** | Full access + priority for new plugin releases |

### How Plugin Trials Work

1. Lite user discovers a plugin
2. OSQR offers 7-day trial: "Want to try [Plugin] for a week?"
3. During trial, full functionality
4. At trial end: "Your [Plugin] trial ended. Upgrade to Pro to keep using it."
5. Plugin data persists (not deleted), just inaccessible until upgrade

### Plugin Trial Limits

- One plugin trial active at a time (prevents gaming)
- Can trial each plugin once (no re-trials)
- Trial days are consecutive (no pausing)

---

## Referral Extensions

### How Referrals Extend Limits

When a user refers someone who signs up:

| Referrer Gets | Referee Gets |
|---------------|--------------|
| +5 queries that day | 14-day Pro trial |
| Stacks up to +20/day | Standard trial experience |

### Referral Rules

- Extensions apply same day, don't carry over
- Maximum +20 queries per day from referrals
- Only counts when referee actually signs up (not just clicks link)
- Referrer must be on paid tier (Lite, Pro, or Master)

### Why This Works

- Lite users have incentive to refer (immediate benefit)
- Doesn't break economics (capped at +20)
- Creates word-of-mouth without costing trials
- Referee gets full Pro trial to experience value

---

## User-Facing Communication

### Throttle Messaging by State

**When budget is getting low (25-50%):**

> "I've used most of my deep thinking for today. Still have a few left."

**When premium is exhausted (<10%):**

> "I've hit my daily limit for deep analysis. I can still chat, or you can grab 10 more queries for $10."

**When approaching depletion:**

> "Running on fumes today. Full reset at midnight, or upgrade for unlimited."

**After overage purchase:**

> "Got it. 10 more Contemplate queries ready. Let's keep going."

### What We NEVER Say

| Phrase | Why It's Wrong |
|--------|----------------|
| "You've run out" | Punishing |
| "Upgrade to continue" | Ultimatum |
| "Your trial has ended" | We don't do surprise trial endings |
| "Buy now" | Pushy |
| "Limited time offer" | Dishonest |
| "Don't miss out" | Scarcity manipulation |

### Framing Heavy Throttling

If a power user is hitting limits hard, frame as stability, not punishment:

> "You're pushing my capabilities today - that's great. I need to pace myself to stay sharp. Midnight reset, or grab more queries now."

---

## Multi-Model Router Integration

The throttle system relies on the Multi-Model Router in OSQR v1.0:

### Routing Logic

```
Request comes in
     ↓
Classify request complexity
     ↓
Check daily budget remaining
     ↓
If simple + any budget → Economy model
If complex + budget >25% → Premium model
If complex + budget <25% → Economy with "limited" framing
If complex + budget depleted → Soft gate with options
```

### Request Classification

| Request Type | Complexity | Model Assignment |
|--------------|------------|------------------|
| Simple question | Low | Economy |
| Document summary | Medium | Premium if available |
| Cross-document analysis | High | Premium only |
| Contemplate query | High | Premium only |
| Council session | Very High | Premium only (Master) |
| Follow-up chat | Low | Economy |

---

## Conversion Triggers

### Natural Upgrade Moments

These are points where upgrade feels like an invitation, not a wall:

| Moment | What User Sees | Why It Works |
|--------|----------------|--------------|
| Third insight on a doc | "I found 4 more insights..." | Curiosity about what else exists |
| Query limit hit mid-task | Options: wait/buy/upgrade | They're invested in completing |
| Plugin trial ending | "Keep using [Plugin]?" | They've experienced the value |
| Day 3+ consistent use | "You're using me daily..." | Habit forming, ready to commit |
| Referral extension used | "Want this every day?" | Tasted the higher limit |

### Conversion Messaging

**After value delivered:**
> "That analysis took everything I had. Worth keeping access to."

**At natural pause:**
> "We've built something here. $99/month to unlock the full toolkit."

**After overage purchase pattern:**
> "You've bought overages three times this month. Pro might make more sense - $99 for 100 queries/day instead of paying per 10."

---

## Metrics to Track

### Cost Metrics

| Metric | Target | What It Tells Us |
|--------|--------|------------------|
| Cost per Lite user/month | <$6 | Margin protection |
| Premium/Economy model ratio | 30/70 | Routing efficiency |
| Overage purchase rate | 5-10% of limit hits | Is pricing right? |

### Conversion Metrics

| Metric | Target | What It Tells Us |
|--------|--------|------------------|
| Lite → Pro conversion | 15-25% | Is value clear? |
| Trial → Pro conversion | 25-40% | Is trial effective? |
| Overage → Upgrade rate | 20-30% | Are overages a bridge to upgrade? |
| Time to conversion | 7-14 days | How long to demonstrate value? |

### Experience Metrics

| Metric | Target | What It Tells Us |
|--------|--------|------------------|
| Session length after throttle | >5 min | Are they still engaged? |
| Return rate day after throttle | >60% | Did throttle damage relationship? |
| Throttle-to-churn correlation | <5% | Are limits pushing people away? |

---

## Gaming Prevention

### Potential Abuse Patterns

| Pattern | Detection | Response |
|---------|-----------|----------|
| Multiple accounts | Same device/IP patterns | Flag for review |
| Referral farming | Fake signups, immediate churn | Don't credit referral |
| Trial plugin cycling | New plugin every 7 days | Limit to 3 plugin trials per month on Lite |
| Query stuffing pre-midnight | Unusual 11pm spike | No action (legitimate use) |

### Response Philosophy

- Assume good intent first
- Soft limits before hard blocks
- Contact user before banning
- Never punish legitimate power users

---

## Document Connections

| Document | Relationship |
|----------|--------------|
| **OSQR Conversion Strategy** | User journey, messaging, upgrade psychology |
| **OSQR Insights System** | What features get throttled |
| **OSQR Character Guide** | Voice used in throttle messaging |
| **ARCHITECTURE.md (Pricing Spec)** | Source of truth for tier features |
| **Constitutional Framework** | Why we don't harvest data or manipulate |

---

## Implementation Phases

### Phase 1: Launch (Pro/Master only)
- Simple daily budget tracking
- Basic throttle messaging
- No overage purchases yet
- Referral trials only

### Phase 2: Post-1,000 Users (Add Lite + Overages)
- Lite tier launches
- Overage purchase system live
- Plugin trial system active
- Referral extension mechanic

### Phase 3: Optimization
- A/B test throttle thresholds
- Optimize model routing for cost
- Refine conversion messaging timing
- Personalize based on usage patterns

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial free tier architecture |
| 2.0 | Dec 2024 | Renamed to Throttle & Cost Architecture. Aligned with actual tier structure (Lite/Pro/Master). Added overage pricing ($10/10, $20/10). Added plugin trial system. Set midnight reset. Added referral extensions. Resolved open questions. Connected to Conversion Strategy doc. |

---

## Resolved Questions

| Question | Decision |
|----------|----------|
| Heavy user throttling | Frame as "stability," use SLA-aware prioritization for paid tiers |
| Referral extensions | Yes - +5 queries/day per referral, caps at +20 |
| Gaming prevention | Soft limits, assume good intent, 3 plugin trial cap/month |
| Pay-per-use vs subscription | Both - subscription tiers + overage purchases |
| Reset timing | Midnight in user's local timezone |
| Show what they're missing | Yes - specific ("7 more insights") converts better than vague |

## Open Questions for Future Versions

1. Should overage purchases roll over if unused? (Currently: no)
2. Should Master users be able to gift Lite subscriptions?
3. At what overage spend level do we proactively suggest Enterprise?
4. Should there be a "pause subscription" option vs. cancel?
