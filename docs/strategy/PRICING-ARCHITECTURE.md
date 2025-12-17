# OSQR Pricing Architecture v1.0

**Status:** Strategic Framework
**Owner:** Kable Record
**Created:** December 2024
**For:** VS Code OSQR Supporting Documentation

---

## Executive Summary

OSQR delivers $2M+ in value (traditional startup development cost) for under $5,000. The pricing challenge: the better OSQR performs, the faster users finish, the less they pay on traditional subscription models.

Solution: Stop charging for time. Charge for throughput, capacity, and commitment.

---

## The Pricing Problem

### Traditional Subscription Fails

| OSQR Performance | Time to V1 | Revenue at $500/mo |
|------------------|------------|-------------------|
| Good | 6 months | $3,000 |
| Great | 3 months | $1,500 |
| Exceptional | 1 month | $500 |
| Insane | 2 weeks | $250 |

The better OSQR works, the less revenue per customer. This inverts normal SaaS incentives.

### The Extremes Don't Work

**Premium pricing ($1M - split the savings):**
- 2 customers
- No adoption
- No GPKV learning
- Competitor undercuts immediately

**Free/cheap ($20/month or free):**
- Mass adoption
- Market presence
- Zero revenue
- Can't sustain compute costs
- Training competitors' future dataset for free

### The Anchor Problem

Pricing on "savings vs traditional development" is a trap:
- Unverifiable (can't prove what they would have spent)
- Heterogeneous (solo hacker vs funded team)
- Invites skepticism
- Makes price feel like a tax, not value

---

## The Right Mental Model

### OSQR Is Not Software

OSQR is:
- A virtual dev team you allocate across tasks
- With institutional memory
- With governance (checkpoints, branches, audit trail)
- With factory output: shipped increments

**Price it like team capacity, not software subscription.**

### What Users Actually Pay For

People don't pay for time spent. They pay for time removed.

Charge for:
- Speed + certainty + parallel labor replacement
- Throughput (how much gets done)
- Capacity (how much can happen simultaneously)
- Commitment (the decision to build)

---

## Pricing Components

### 1. Subscription (The Relationship)

Base access that covers:
- Always-on platform access
- Memory continuity (PKV/MSC)
- Updates and improvements
- Basic orchestration
- GPKV access

This is the cover charge, not the value capture.

### 2. Project Activation (The Commitment)

One-time fee when starting a new project:
- Repository indexing
- Decision log creation
- Standards and test setup
- Autonomy rail configuration
- Institutional memory establishment

**This is where users commit. This is where compute costs spike.**

Captures value at the moment of highest intent, regardless of how fast they build.

### 3. Build Runs (The Output)

Units of completed work:
- One run = spec → tasks → code → tests → docs → checkpoint
- Predictable bundles, not token metering
- Correlates price with impact, not time

Users understand "runs" better than tokens. No bill shock.

### 4. Parallel Lanes (The Speed)

How many agents can work simultaneously:
- More lanes = faster completion
- Speed becomes a premium feature
- Fast builders pay more, not less

### 5. Autonomy Depth (The Trust)

How far OSQR goes without checkpointing:
- Higher autonomy = faster execution
- Higher autonomy = more compute
- Trust is earned and paid for

---

## Pricing Tiers

### Starter (Monthly) - $99/month
- Single builder
- 1 parallel lane
- 5 build runs/month
- Basic autonomy (frequent checkpoints)
- PKV storage (limited)
- No project activations included

**For:** Hobbyists, exploration, proof of concept

### Builder (Annual) - $2,400/year ($200/month effective)
- Single builder
- 2 parallel lanes
- 24 build runs/year
- 2 project activations included
- Standard autonomy
- Full PKV storage

**For:** Solo founders building real products

### Studio (Annual) - $6,000/year ($500/month effective)
- 3 seats
- 5 parallel lanes
- 120 build runs/year
- 6 project activations included
- Enhanced autonomy
- Shared team PKV
- Priority model routing

**For:** Small teams, multiple products

### Scale (Annual) - $18,000/year ($1,500/month effective)
- 10 seats
- 10 parallel lanes
- 500 build runs/year
- 20 project activations included
- Maximum autonomy
- Enterprise PKV controls
- Priority queue + SLA
- Audit logging

**For:** Larger teams replacing development capacity

### Enterprise (Custom) - $50,000+/year
- Unlimited seats
- Custom lane allocation
- Unlimited build runs
- Private GPKV (learnings stay internal)
- Dedicated infrastructure
- Compliance features (SOC2, etc.)
- Custom integrations

**For:** Organizations with security/compliance requirements

---

## Overage Pricing

When users exceed included capacity:

| Item | Overage Price |
|------|---------------|
| Additional Build Run | $25 each |
| Build Run Pack (10) | $200 ($20 each) |
| Build Run Pack (50) | $750 ($15 each) |
| Additional Project Activation | $1,500 each |
| Lane upgrade (per lane/month) | $100 |

Predictable packs, not per-token chaos.

---

## Founding Builder Program

### Purpose

Early users are disproportionately valuable:
- Their usage trains GPKV
- Their feedback shapes the product
- Their success stories sell OSQR
- They can't be acquired later at any price

### Structure

**Founding Builder Tier** - $5,000 one-time (limited to 100)
- Lifetime price lock at Builder tier
- 5 project activations included
- 100 build runs included
- Priority feature input
- "Founding Builder" designation
- Explicit GPKV contribution agreement

**Founding Studio Tier** - $12,000 one-time (limited to 50)
- Lifetime price lock at Studio tier
- 15 project activations included
- 300 build runs included
- Direct access to founder
- Early feature access
- Explicit GPKV contribution agreement

### The Exchange

Founding members get massive value at locked prices.
OSQR gets cash, commitment, usage data, and proof.

Not a discount. A partnership.

---

## Why This Solves "Faster = Less Revenue"

### Old Model (Time-Based)
- Fast builder: 2 weeks × $500/month = $250
- Slow builder: 6 months × $500/month = $3,000
- OSQR penalized for own success

### New Model (Capacity-Based)
- Fast builder needs: More lanes + higher autonomy + same activation fee
- Fast builder pays: $1,500 activation + higher tier for lanes = $2,000+
- Slow builder pays: $1,500 activation + lower tier = $1,700+
- Revenue correlates with value delivered, not time elapsed

Speed is now a premium feature. Users who want to build fast pay for the capacity to do so.

---

## Competitive Positioning

### vs Traditional Development ($2-2.5M)
- OSQR at any tier: 99%+ savings
- No comparison shopping possible

### vs Dev Agencies ($50-500k)
- OSQR Scale tier: 96-99% savings
- Faster delivery
- User maintains control

### vs Other AI Dev Tools ($20-200/month)
- OSQR delivers complete products, not assistance
- Memory and continuity others lack
- Multi-agent orchestration others can't match
- Price premium justified by outcome difference

### vs Technical Co-founder (20-50% equity)
- OSQR: $5-18k/year
- Equity retained: 100%
- No co-founder conflicts

---

## Revenue Projections

### Year 1: Prove and Position
- 50 Founding Builders: $250,000
- 25 Founding Studios: $300,000
- 200 Builder annual: $480,000
- 50 Studio annual: $300,000
- Overage revenue: $100,000
- **Year 1 Total: ~$1.4M**

### Year 2: Scale Adoption
- 1,000 Builder annual: $2.4M
- 300 Studio annual: $1.8M
- 50 Scale annual: $900,000
- Enterprise (10): $500,000
- Overage revenue: $400,000
- **Year 2 Total: ~$6M**

### Year 3: Market Position
- 3,000 Builder annual: $7.2M
- 1,000 Studio annual: $6M
- 200 Scale annual: $3.6M
- Enterprise (50): $2.5M
- Marketplace revenue: $1M
- Overage revenue: $1.2M
- **Year 3 Total: ~$21.5M**

---

## Pricing Psychology

### Why These Numbers Work

**$99/month Starter:**
- Low enough to try without approval
- High enough to signal "serious tool"
- Filters out tire-kickers

**$200/month effective Builder:**
- Less than one contractor hour
- Less than 0.1% of traditional dev cost
- Obvious ROI for anyone building

**$500/month effective Studio:**
- Cost of one mediocre freelancer
- Delivers team-level output
- No-brainer for funded startups

**$1,500/month effective Scale:**
- Cost of one junior developer
- Delivers senior team output
- Enterprise procurement friendly

### The Anchor

Never anchor to other dev tools ($20-200/month).

Always anchor to:
- What a technical co-founder costs (equity)
- What an agency charges ($50-500k)
- What a dev team costs ($1-2M/year)

OSQR is always 10-100x cheaper than the real alternative.

---

## Risk Mitigation

### "What if users game build runs?"

Build runs are defined units of work with clear scope. Gaming requires breaking work into tiny pieces, which adds overhead that negates the benefit.

### "What if compute costs spike?"

Pricing tiers include margin. Overage pricing covers burst usage. Annual commitments provide cash buffer.

### "What if competitors undercut?"

GPKV is the moat. Price cuts without the learning dataset deliver inferior results. Early users can't be replicated.

### "What if we underprice?"

Founding tiers are limited quantity. Annual commitments lock in relationships. Overage captures heavy usage regardless of tier.

---

## Implementation Phases

### Phase 1: Founding Program (Months 1-3)
- Launch Founding Builder and Founding Studio tiers
- Limited quantity, high touch
- Validate pricing acceptance
- Build case studies

### Phase 2: Public Tiers (Months 4-6)
- Launch Starter, Builder, Studio, Scale
- Refine based on Founding usage patterns
- Establish overage pricing

### Phase 3: Enterprise (Months 7-12)
- Custom enterprise tier
- Compliance features
- Private GPKV options

### Phase 4: Marketplace Integration (Year 2)
- Plugin creator revenue share
- Marketplace as pricing lever
- Ecosystem lock-in

---

## Plugin Creator Economics

### Revenue Split

**Standard split: 70/30 (creator keeps 70%)**

This is the industry standard that signals "we want creators to win":
- Apple App Store: 70/30
- Shopify App Store: 70/30 (80/20 after first $1M)
- Gumroad: 70/30

**Founding Creator Bonus: 80/20**

First 50 plugin creators get 80/20 split locked for life. Incentivizes early ecosystem building.

### What Creators Get

| Benefit | Description |
|---------|-------------|
| GPKV namespace | Their own intelligence layer that compounds |
| 70% revenue | On all subscriptions through their plugin |
| Distribution | Access to OSQR's user base |
| Defensible moat | Patterns can't be copied overnight |
| Analytics | Usage data, retention, conversion |

### What Creators Provide

| Contribution | Description |
|--------------|-------------|
| Domain expertise | Deep knowledge in their vertical |
| Workflow design | How users should work |
| Ongoing refinement | Updates based on user feedback |
| Community | Bring their audience to OSQR |

### Example Economics

A React Development plugin with 500 subscribers at $20/month:
- Monthly revenue: $10,000
- Creator share (70%): $7,000/month
- OSQR share (30%): $3,000/month

At scale (2,000 subscribers): $28,000/month creator income.

### Why This Works

1. **Creators have skin in the game** - More usage = more revenue
2. **OSQR gets ecosystem** - Plugins bring users who wouldn't otherwise come
3. **Users get specialization** - Better experience in their domain
4. **Network effects compound** - Plugin GPKV patterns make OSQR smarter for everyone

### Split Governance

Revenue split is revisable after marketplace proves out, but:
- Existing creators keep their locked rate
- Any changes apply only to new creators
- 60 days notice before any policy change
- Founder commits to never going below 60/40

---

## Key Principles

1. **Never price on time.** Price on capacity, output, and commitment.

2. **Speed is premium.** More lanes and higher autonomy cost more.

3. **Activation captures intent.** The decision to build is worth paying for.

4. **Annual locks relationships.** Monthly is for exploration only.

5. **Founders are partners.** Early users get lifetime value for lifetime contribution.

6. **Overage is predictable.** Packs, not tokens. No bill shock.

7. **Anchor to alternatives.** Compare to teams and agencies, never to tools.

---

## Summary

| Problem | Solution |
|---------|----------|
| Faster = less revenue | Charge for capacity, not time |
| Value hard to capture | Project activation fees |
| Speed penalized | Parallel lanes as premium |
| Subscription misprices | Build runs as output units |
| Early users undervalued | Founding program with lifetime lock |
| Competitors could undercut | GPKV moat from early usage |

OSQR pricing aligns incentives: users pay for what they get (capacity and output), OSQR earns more when it delivers more, and speed becomes a feature to pay for rather than a revenue leak.

---

*Document Version: 1.0*
*For: VS Code OSQR Supporting Documentation*
