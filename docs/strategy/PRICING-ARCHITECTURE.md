# OSQR Pricing Architecture v1.0

**Status:** Implementation Ready
**Owner:** Kable Record
**Updated:** December 2024
**For:** OSQR v1 Launch

---

## Executive Summary

OSQR v1 pricing is designed for simplicity and clear value differentiation. Four tiers serve distinct user needs: Starter for trial users, Pro as the core product, Master for builders, and Enterprise for teams.

Key principles:
- **No visible query limits** - Users shouldn't feel constrained
- **Mode-based differentiation** - Higher tiers unlock more powerful AI modes
- **Document vault as value anchor** - Clear, tangible limits users understand
- **Invisible throttling** - Protect margins without marketing complexity

---

## Tier Structure

### Mode Availability by Tier

| Tier | Quick | Thoughtful | Contemplate | Council |
|------|-------|------------|-------------|---------|
| Starter | Yes | No | No | No |
| Pro | Yes | Yes | No | No |
| Master | Yes | Yes | Yes | Yes |
| Enterprise | Yes | Yes | Yes | Yes |

---

## Tier Details

### Starter - $20/month

**Positioning:** "Try the difference"

**Includes:**
- Single model (Claude OR GPT-4o, not both)
- 5 documents in vault
- Basic memory
- Refine → Fire workflow
- Quick mode only

**Restrictions:**
- Monthly billing only (no annual option)
- No multi-model panel
- No Thoughtful/Contemplate modes

**Why monthly-only:** Drive upgrades to Pro. The 5-doc limit creates natural friction. Don't let users lock in a year at $20.

**Comparison Card:**
```
5 docs
25MB max file
1 AI model
```

---

### Pro - $49/month ($39/month annual)

**Positioning:** "The real product"

**Includes:**
- Multi-model panel (Claude + GPT-4o)
- 500 documents in vault
- Full Personal Knowledge Vault
- Advanced memory
- Unlimited Refine → Fire
- Quick + Thoughtful modes
- 25MB max file size
- 90-day transformation guarantee

**Founder pricing:** $49/month locked for life (future price $79/month)

**Comparison Card:**
```
500 docs
25MB max file
2 AI models
```

---

### Master - $149/month ($119/month annual)

**Positioning:** "Build with OSQR"

**Includes:**
- Everything in Pro
- Contemplate mode
- Council Mode (multi-model deliberation)
- 1,500 documents in vault
- 50MB max file size
- 4+ AI models
- Priority processing (backend only, don't advertise)

**Founder pricing:** $149/month locked for life (future price $249/month)

**Comparison Card:**
```
1500 docs
50MB max file
4+ AI models
```

---

### Enterprise - Custom

**Positioning:** "For teams and organizations"

**Includes:**
- Everything in Master
- Unlimited documents
- Dedicated support
- Custom model access
- API access for integrations
- Team collaboration (coming)
- SSO & advanced security
- 100MB max file size

**Comparison Card:**
```
Unlimited docs
100MB max file
All AI models
```

---

## What to REMOVE from Marketing

Delete these from tier descriptions - they're either filler or create unnecessary friction:

| Remove | Reason |
|--------|--------|
| "100 queries/day" | Makes users feel limited even though <1% hit it. Keep as backend guardrail only. |
| "300 queries/day" | Same reason |
| "Weekly automated reviews" | Filler - doesn't drive purchase decisions |
| "Priority fast-lane processing" | Filler - keep as backend reality, don't advertise |
| "Early access to new models & features" | Filler - everyone gets updates |
| Query limits in comparison cards | Remove entirely from UI |

---

## Margin Protection: Throttling Strategy

### Philosophy

Price for premium, throttle the outliers, let them buy more. Don't downgrade AI quality—users who max out will pay for more, not accept dumber models.

### Invisible Limits (Don't Advertise)

| Tier | Contemplate/Day | Council/Day | Standard Queries |
|------|-----------------|-------------|------------------|
| Starter | N/A | N/A | Unlimited |
| Pro | N/A | N/A | Unlimited |
| Master | 20 | 10 | Unlimited |
| Enterprise | Custom SLA | Custom SLA | Custom SLA |

### When Users Hit Limits

Display three options every time:

1. **Wait** - "Resets at midnight"
2. **Buy** - "$10 for 10 Contemplate queries" / "$20 for 10 Council sessions"
3. **Enterprise** - "Using OSQR heavily? Talk to us about Enterprise pricing →"

Show all three options to every user who hits a limit. No conditional logic. Simple code, natural sales filter—users who need Enterprise will self-identify.

### Overage Pricing (Self-Serve in UI)

Priced for 70% guaranteed margin floor, regardless of usage.

| Add-On | Price | Your Max Cost | Guaranteed Margin |
|--------|-------|---------------|-------------------|
| 10 Contemplate queries | $10 | ~$3 | 70% |
| 10 Council sessions | $20 | ~$6 | 70% |

**Why these prices work:**
- User hitting limits is in flow, wants to keep working—not price shopping
- $1/Contemplate query is less than a coffee
- $2/Council session is still impulse-buy territory
- You're protected even if they burn through every query

---

## Margin Summary

| Tier | Price | Avg Cost | Gross Margin |
|------|-------|----------|--------------|
| Starter | $20 | ~$6 | ~70% |
| Pro | $49 | ~$18 | ~63% |
| Master | $149 | ~$50-60 | ~65-70% |

Without throttling, Master margin ranged 11-58% due to outliers. Throttling + overages stabilizes at 65-70%.

---

## Billing Rules

| Tier | Monthly | Annual |
|------|---------|--------|
| Starter | $20/month | Not available |
| Pro | $49/month | $39/month (2 months free) |
| Master | $149/month | $119/month (2 months free) |
| Enterprise | Custom | Custom |

---

## Pricing Psychology

**Why this works:**

- $20 Starter competes directly with ChatGPT Plus / Claude Pro
- $20 → $49 upgrade is the real conversion (5-doc limit drives it)
- $49 Pro = "everything you pay $40 for (ChatGPT + Claude), integrated"
- $149 Master = builder tools, justified when VS Code ships
- Query limits invisible = users don't feel constrained
- Founder pricing creates urgency and loyalty

**Anchoring:**
- Never compare to other AI tools ($20)
- Compare to: hiring help, saving time, consolidating subscriptions

---

## v2 Pricing Strategy

When v2 ships (VS Code extension, marketplace):

1. **Existing users keep v1 pricing** at their locked founder rate
2. **v1 tiers do NOT automatically include v2 features**
3. **v2 features are add-ons:**
   - VS Code Extension: +$50/month (or included in new v2 Master tier)
   - Marketplace Access: +$30/month (or included in new v2 tiers)
4. **New tier structure introduced for v2** - existing users can upgrade or stay on v1

This rewards early adopters (locked pricing) while allowing repricing based on learned value.

---

## Implementation Checklist

### Pricing Page Updates
- [ ] Add Starter tier ($20/month, monthly only)
- [ ] Update Pro features (remove query limit display)
- [ ] Move Contemplate mode to Master
- [ ] Update Master features (remove query limit display)
- [ ] Remove "queries/day" from all comparison cards
- [ ] Remove filler features from descriptions

### Backend
- [ ] Keep query limits as backend guardrails (don't remove functionality)
- [ ] Implement soft limit warnings rather than hard blocks
- [ ] Track usage for <1% who hit limits

### Billing
- [ ] Starter tier: monthly only, no annual option
- [ ] Pro tier: monthly + annual (2 months free)
- [ ] Master tier: monthly + annual (2 months free)

---

## Summary

| Tier | Price | Docs | Models | Modes |
|------|-------|------|--------|-------|
| Starter | $20/mo | 5 | 1 | Quick |
| Pro | $49/mo | 500 | 2 | Quick, Thoughtful |
| Master | $149/mo | 1,500 | 4+ | All modes |
| Enterprise | Custom | Unlimited | All | All modes |

---

*Document Version: 1.1*
*Updated: December 2024*
*For: OSQR v1 Launch*
