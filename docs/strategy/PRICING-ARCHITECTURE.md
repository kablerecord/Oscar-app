# OSQR Pricing Architecture v2.0

**Status:** Implementation Ready
**Owner:** Kable Record
**Updated:** December 2024
**For:** OSQR v1 Launch
**Source of Truth:** docs/business/OSQR-PRICING-SPEC.md

---

## Executive Summary

OSQR pricing reflects transformation delivered, not features listed. There is no replacement stack for OSQR—even paying for ChatGPT, Claude, Mem.ai, Notion AI, Cursor, and Otter combined wouldn't provide unified memory, cross-interface continuity, or methodology delivery.

Key principles:
- **No visible query limits** - Users shouldn't feel constrained
- **Mode-based differentiation** - Higher tiers unlock more powerful AI modes
- **Document vault as value anchor** - Clear, tangible limits users understand
- **Invisible throttling** - Protect margins without marketing complexity

---

## Tier Structure

### Current Tiers (Visible to Users)

| Tier | Price | Future Price | Annual | Key Unlock |
|------|-------|--------------|--------|------------|
| **Pro** | $99/mo | $149/mo | N/A | Full OSQR experience |
| **Master** | $249/mo | $349/mo | $199/mo | Council Mode, power user limits |
| **Enterprise** | Custom | Custom | Custom | Teams, unlimited, API access |

### Future Tier (Post-1,000 Users)

| Tier | Price | Future Price | Key Unlock |
|------|-------|--------------|------------|
| **Lite** | $19/mo | $29/mo | Entry funnel, conversion driver |

### Mode Availability by Tier

| Tier | Quick | Thoughtful | Contemplate | Council |
|------|-------|------------|-------------|---------|
| Lite | Yes | No | No | No |
| Pro | Yes | Yes | Yes | No |
| Master | Yes | Yes | Yes | Yes |
| Enterprise | Yes | Yes | Yes | Yes |

---

## Tier Details

### Lite - $19/month (Post-1,000 Users)

**Positioning:** "Start thinking with AI"

**Purpose:** Conversion funnel entry point. Profitable on its own with 68% margin. Not a loss leader.

**Includes:**
- 5 documents in vault
- 10 queries per day
- 7-day chat history analysis
- Quick mode only
- Memory persists (key differentiator)
- 1GB storage

**What It's Missing:**
- Thoughtful mode (multi-model)
- Contemplate mode (deep reasoning)
- Council mode
- Full document capacity

**Launch timing:** Activates after 1,000 paid users to avoid cannibalizing Pro conversions.

---

### Pro - $99/month

**Positioning:** "The real product"

**Purpose:** Primary revenue tier. The sweet spot for professionals and solo founders.

**Includes:**
- 500 documents in vault
- 100 queries per day
- 30-day chat history analysis
- Quick, Thoughtful, and Contemplate modes
- Full Personal Knowledge Vault
- Cross-interface continuity
- 10GB storage
- 100 image analyses per month

**Founder pricing:** $99/month locked for life (future price $149/month)
**Annual option:** None - only Master has annual pricing

**Comparison Card:**
```
500 docs
25MB max file
2 AI models
3 modes
```

---

### Master - $249/month ($199/month annual)

**Positioning:** "Build with OSQR"

**Purpose:** Power users who push the limits. Highest margin tier.

**Includes:**
- Everything in Pro
- 1,500 documents in vault
- 300 queries per day (covers any human usage pattern)
- Unlimited chat history analysis
- Council Mode (multi-model deliberation)
- Priority fast-lane processing
- 100GB storage
- Unlimited image analyses
- Weekly automated reviews
- Custom Agent Builder (coming)
- VS Code Extension (coming)
- Early access to new models and features

**Founder pricing:** $249/month locked for life (future price $349/month)
**Annual option:** $199/month billed annually ($2,388/year)

**Comparison Card:**
```
1500 docs
50MB max file
4+ AI models
All modes
```

---

### Enterprise - Custom

**Positioning:** "For teams and organizations"

**Trigger:** Appears after user hits limits 3+ times per month

**Includes:**
- Everything in Master
- Unlimited documents
- Unlimited queries
- Dedicated support
- Custom model access
- API access for integrations
- Team collaboration (coming)
- SSO & advanced security
- 100MB max file size
- Volume discounts

**Comparison Card:**
```
Unlimited docs
100MB max file
All AI models
All modes
```

---

## Founder Pricing

### Structure

First 500 users lock in launch pricing forever.

- Pro: $99/month locked (future $149)
- Master: $249/month locked (future $349)

### Counter Display

Do not show counter at launch. Begin displaying when approaching cap.

- Show counter when 100 spots remain
- Or show counter when 50 spots remain
- Creates urgency without feeling like launch-day gimmick

### Why 500

At 70% Pro ($99) and 30% Master ($249):
- 350 Pro users at $99 = $34,650 MRR
- 150 Master users at $249 = $37,350 MRR
- **Total: $72,000 MRR / $864,000 ARR**

This is enough to:
- Validate product-market fit
- Fund first hires
- Prove the model before full-price customers
- Create genuine scarcity without limiting early traction

---

## 90-Day Guarantee

### Language

"Use OSQR for 90 days. If you don't make at least one decision faster than you would have alone, surface at least one insight you wouldn't have found, and save at least 5 hours of mental load, I'll refund every dollar. No questions. No hassle. You keep everything Oscar learned about you."

### Why This Works

Specific outcomes beat vague promises. "Think better" is unmeasurable. "One decision faster" is concrete.

Keeping the memory even after refund builds goodwill. They might come back later. And they'll tell people you were fair.

### Expected Impact

- Refund rate: ~7%
- Conversion rate increase: 30-50%
- Net revenue impact: Strongly positive

---

## Margin Protection: Throttling Strategy

### Philosophy

Price for premium, throttle the outliers, let them buy more. Don't downgrade AI quality—users who max out will pay for more, not accept dumber models.

### Invisible Limits (Don't Advertise)

| Tier | Contemplate/Day | Council/Day | Standard Queries |
|------|-----------------|-------------|------------------|
| Lite | N/A | N/A | 10 |
| Pro | N/A | N/A | 100 |
| Master | 50 | 20 | 300 |
| Enterprise | Custom SLA | Custom SLA | Custom SLA |

### When Users Hit Limits

Display three options every time:

1. **Wait** - "Resets at midnight"
2. **Buy** - "$10 for 10 Contemplate queries" / "$20 for 10 Council sessions"
3. **Enterprise** - "Using OSQR heavily? Talk to us about Enterprise pricing →"

### Overage Pricing (Self-Serve in UI)

Priced for 70% guaranteed margin floor, regardless of usage.

| Add-On | Price | Your Max Cost | Guaranteed Margin |
|--------|-------|---------------|-------------------|
| 10 Contemplate queries | $10 | ~$3 | 70% |
| 10 Council sessions | $20 | ~$6 | 70% |

---

## Cost Structure

### Model Costs by Tier

**Lite ($19/month):**
- Max cost to OSQR: ~$6
- Guaranteed margin: 68%

**Pro ($99/month):**
- Max cost to OSQR: ~$30
- Guaranteed margin: 70%

**Master ($249/month):**
- Max cost to OSQR: ~$75
- Guaranteed margin: 70%

---

## Billing Rules

| Tier | Monthly | Annual |
|------|---------|--------|
| Lite | $19/month | Not available |
| Pro | $99/month | Not available |
| Master | $249/month | $199/month (2 months free) |
| Enterprise | Custom | Custom |

---

## Pricing Psychology

### Why This Works

- $99 Pro is above "tool" price range ($20-50), signaling this is different
- $99 is below $100 psychological threshold
- $249 Master matches full replacement stack cost
- Future prices 50% higher creates real founder pricing value
- Query limits invisible = users don't feel constrained

### Replacement Stack Analysis

To approximate OSQR's capabilities, a user would need:

- ChatGPT Plus: $20/month
- Claude Pro: $20/month
- Mem.ai or Personal.ai: $15-30/month
- Notion AI: $10/month
- Cursor or Copilot: $20/month
- Otter.ai: $16/month
- Zapier or Make: $20-50/month

**Total replacement stack: $140-200/month**

And even with all these tools, users still lack unified memory, cross-interface continuity, and methodology delivery.

**OSQR Pro at $99 delivers more value than a $200 stack that doesn't fully work.**

---

## Implementation Checklist

### Pricing Page Updates
- [x] Remove Starter tier from visible tiers
- [x] Update Pro price to $99/month (future $149)
- [x] Update Master price to $249/month (future $349)
- [x] Update Master annual to $199/month
- [x] Remove Pro annual option
- [x] Update founder cap to 500 users
- [x] Update 90-day guarantee text

### Backend
- [ ] Keep query limits as backend guardrails
- [ ] Implement soft limit warnings rather than hard blocks
- [ ] Track usage for those who hit limits

### Billing
- [ ] Pro tier: monthly only
- [ ] Master tier: monthly + annual ($199/month)
- [ ] Lite tier: prepared but hidden until 1,000 users

---

## Summary

| Tier | Price | Docs | Storage | Models | Modes |
|------|-------|------|---------|--------|-------|
| Lite | $19/mo | 5 | 1GB | 1 | Quick |
| Pro | $99/mo | 500 | 10GB | 2 | Quick, Thoughtful, Contemplate |
| Master | $249/mo | 1,500 | 100GB | 4+ | All modes |
| Enterprise | Custom | Unlimited | Custom | All | All modes |

---

*Document Version: 2.0*
*Updated: December 2024*
*For: OSQR v1 Launch*
