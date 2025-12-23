# OSQR Pricing Implementation Prompt (Corrected for Monorepo)

Use this prompt in VS Code Claude with the oscar-app workspace.

---

## PROJECT STRUCTURE

This is a **monorepo** with the following structure:

| Component | Location |
|-----------|----------|
| Main App (oscar-app) | `packages/app-web/` |
| Core Library (osqr-core) | `packages/core/` |
| Marketing Website | `websites/marketing/` |
| Documentation | `docs/` and `packages/core/specs/` |

---

## THE PROMPT

```
I need to update OSQR pricing across the monorepo. Before making any changes, I need you to discover what currently exists.

## Source of Truth

The new pricing specification is at: docs/business/OSQR-PRICING-SPEC.md

Read this file first - it contains the complete pricing structure, rationale, and implementation checklist.

## Phase 0: Discovery (Do This First)

### Find All Pricing Documentation
Search the monorepo for:
- Any files with "pricing" in the filename
- Any files with "tier" in the filename
- Any markdown files containing "$49" or "$149" or "subscription"
- Any config files with price definitions

Check these specific locations:
- docs/business/PRICING-ARCHITECTURE.md
- docs/strategy/PRICING-ARCHITECTURE.md
- packages/core/specs/conversion-strategy-v1.md
- packages/core/specs/throttle-architecture-v1.md

For each file found, report:
- File path
- What pricing info it contains
- Whether it's documentation, code, or config
- Current prices listed

### Find All Code References
Search for:
- Stripe price IDs (usually start with "price_")
- Hardcoded dollar amounts in UI components
- Tier definitions in TypeScript/JavaScript
- Environment variables related to pricing

Key locations to check:
- packages/app-web/app/pricing/ (pricing page)
- packages/app-web/lib/tiers/ (tier definitions)
- packages/app-web/components/tiers/ (tier UI components)
- websites/marketing/src/app/pricing/ (marketing pricing page)

### Find All Environment Variables
Check these files for Stripe/pricing config:
- packages/app-web/.env.example
- packages/app-web/.env (if accessible)
- websites/marketing/.env.example (if exists)

Look for:
- STRIPE_* variables
- PRICE_* variables
- Any tier or subscription related config

### Report Back
Give me a summary of everything you found before proceeding. I want to see:
1. List of all pricing-related files
2. Current prices in each location
3. Any inconsistencies between files
4. What Stripe integration currently exists

Wait for my confirmation before making any changes.

---

## Phase 1: Apply New Pricing

Once discovery is complete and I confirm, apply pricing from docs/business/OSQR-PRICING-SPEC.md:

### New Pricing Structure

**Lite Tier (launches post-1,000 users):**
- Price: $19/month
- Future price: $29/month

**Pro Tier:**
- Price: $99/month (founder pricing, locked forever for first 500 users)
- Future price: $149/month

**Master Tier:**
- Price: $249/month (founder pricing, locked forever for first 500 users)
- Future price: $349/month
- Annual option: $199/month billed annually

**Enterprise:**
- Custom pricing
- Appears after user hits limits 3+ times per month

---

## Implementation Tasks

### 1. Stripe Configuration (Manual - I'll do this)
Document what Stripe products/prices need to be created:
- List the exact Stripe product names and price IDs I need to create
- Include both monthly and annual options for Master
- Note any existing Stripe products that need to be archived

### 2. packages/app-web Updates

**Environment variables:**
- Check packages/app-web/.env.example
- Search for any hardcoded price IDs
- List all STRIPE_PRICE_* environment variables that need updating

**Pricing page (packages/app-web/app/pricing/):**
- Update all displayed prices: $99 Pro, $249 Master
- Update "future price" displays: $149 Pro, $349 Master
- Add founder pricing messaging
- Ensure Stripe checkout links use correct price IDs

**Tier logic (packages/app-web/lib/tiers/):**
- Find tier checking logic
- Update any hardcoded price comparisons
- Ensure Pro tier maps to $99 product
- Ensure Master tier maps to $249 product

**Feature gating:**
- Search for tier-based feature flags
- Document current limits per tier
- Do NOT change feature limits, just pricing

### 3. websites/marketing Updates

**Pricing page (websites/marketing/src/app/pricing/):**
- Update all displayed prices
- Update founder pricing messaging
- Add "500 founder spots" language (but don't show counter yet)
- Update comparison with future pricing

**Marketing copy:**
- Search entire websites/marketing/ for "$49", "$149", "49/month", "149/month"
- Replace with new pricing

### 4. packages/core Updates

Check if any pricing constants exist:
- packages/core/src/
- packages/core/specs/

Update any tier definitions or pricing references.

### 5. Documentation Updates

Update these specific documents to reflect new pricing:

**Primary docs:**
- docs/business/PRICING-ARCHITECTURE.md
- docs/strategy/PRICING-ARCHITECTURE.md

**Spec files:**
- packages/core/specs/conversion-strategy-v1.md
- packages/core/specs/throttle-architecture-v1.md

**Find/replace across all docs:**
- $49/mo or $49/month → $99/month
- $79/mo (future Pro) → $149/month
- $149/mo or $149/month → $249/month
- $249/mo (future Master) → $349/month
- $119/mo (annual Master) → $199/month

### 6. 90-Day Guarantee Implementation

Add this guarantee text to pricing pages (from OSQR-PRICING-SPEC.md):

"Use OSQR for 90 days. If you don't make at least one decision faster than you would have alone, surface at least one insight you wouldn't have found, and save at least 5 hours of mental load, I'll refund every dollar. No questions. No hassle. You keep everything Oscar learned about you."

### 7. Founder Pricing Counter (Prep Only)

Prepare but don't activate:
- Create database field to track founder signups count
- Create component to display "X founder spots remaining"
- Set cap at 500
- DO NOT display counter yet - activate when 100 spots remain

---

## Output Format

For each package, provide:

1. **Files to modify** - exact file paths
2. **Changes needed** - specific code changes or search/replace
3. **Environment variables** - what needs to be set
4. **Stripe setup** - what I need to create manually in Stripe dashboard

Work in this order:
1. packages/app-web (checkout happens here)
2. websites/marketing (public pricing display)
3. packages/core (if applicable)
4. docs/ and specs/
```

---

## AFTER CLAUDE RESPONDS

### Stripe Dashboard Steps (Manual)

You'll need to do these yourself in Stripe:

1. **Create new products** (or update existing):
   - Product: "OSQR Pro"
     - Price: $99/month (set as default)
     - Metadata: tier=pro, founder=true

   - Product: "OSQR Master"
     - Price: $249/month (set as default)
     - Price: $199/month billed annually ($2,388/year)
     - Metadata: tier=master, founder=true

   - Product: "OSQR Lite" (create but don't activate)
     - Price: $19/month
     - Metadata: tier=lite

2. **Copy the new price IDs** to your environment variables

3. **Archive old prices** (don't delete, just archive so existing subscriptions continue)

### Environment Variables to Update

Based on typical Next.js + Stripe setup:

```env
# Old (archive these prices in Stripe, but keep for existing subs)
STRIPE_PRO_PRICE_ID=price_old_pro_id
STRIPE_MASTER_PRICE_ID=price_old_master_id

# New
STRIPE_PRO_MONTHLY_PRICE_ID=price_new_pro_monthly
STRIPE_MASTER_MONTHLY_PRICE_ID=price_new_master_monthly
STRIPE_MASTER_ANNUAL_PRICE_ID=price_new_master_annual
STRIPE_LITE_MONTHLY_PRICE_ID=price_new_lite_monthly  # For later
```

---

## VERIFICATION CHECKLIST

After implementation, verify:

**Stripe:**
- [ ] New Pro price exists at $99/month
- [ ] New Master price exists at $249/month
- [ ] Master annual price exists at $199/month ($2,388/year)
- [ ] Old prices archived (not deleted)
- [ ] Price IDs copied to environment variables

**packages/app-web:**
- [ ] Pricing page shows $99 Pro, $249 Master
- [ ] Future prices show $149 Pro, $349 Master
- [ ] Checkout redirects to correct Stripe prices
- [ ] Founder pricing messaging visible
- [ ] 90-day guarantee text added

**websites/marketing:**
- [ ] Marketing pricing page updated
- [ ] No old prices anywhere in copy
- [ ] Founder pricing messaging consistent with app

**Documentation:**
- [ ] docs/business/PRICING-ARCHITECTURE.md updated
- [ ] docs/strategy/PRICING-ARCHITECTURE.md updated
- [ ] packages/core/specs/conversion-strategy-v1.md updated
- [ ] No stale pricing references remain

**Test:**
- [ ] Click Pro checkout → Stripe shows $99
- [ ] Click Master checkout → Stripe shows $249
- [ ] Click Master Annual → Stripe shows $199/mo ($2,388 total)

---

## Key Differences from Original Prompt

1. **Single repo, not three** - All paths reference locations within the monorepo
2. **Correct file names** - Uses actual file names found in the codebase
3. **Source of truth defined** - Points to docs/business/OSQR-PRICING-SPEC.md
4. **Specific paths** - Provides exact paths like `packages/app-web/app/pricing/` instead of vague references
5. **Removed Phase 0.5** - The pricing spec is already copied to docs/business/
