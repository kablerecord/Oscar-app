# @osqr/shared

Shared configuration and types for OSQR packages.

## Purpose

This package contains the **source of truth** for pricing tiers and configuration used across:
- `@osqr/app-web` (main application)
- `@osqr/marketing` (marketing website)

## Usage

```typescript
import { TIERS, getTierConfig, type TierName } from '@osqr/shared'

// Get tier pricing
console.log(TIERS.pro.price) // 99
console.log(TIERS.master.yearlyPrice) // 2388

// Get config for a specific tier
const config = getTierConfig('pro')
console.log(config.limits.maxDocuments) // 500
```

## What's Included

### Tiers Config (`@osqr/shared/tiers`)

- `TIERS` - Full tier configuration (lite, pro, master)
- `getTierConfig(tier)` - Get config for a tier
- `hasFeature(tier, feature)` - Check if feature is available
- `getLimit(tier, limit)` - Get limit value
- `isOverLimit(tier, limit, value)` - Check if over limit
- `hasYearlyOption(tier)` - Check if tier has yearly billing
- `getYearlyMonthlyPrice(tier)` - Get effective monthly price for yearly
- `hasVSCodeAccess(tier)` - Check VS Code access
- `getMonthlyTokenLimit(tier)` - Get token limit
- `getEffectiveTokenLimit(tier, bonus)` - Get limit with referral bonus
- `formatTokenCount(tokens)` - Format for display

### Types

- `TierName` - `'lite' | 'pro' | 'master'`
- `TierConfig` - Full tier configuration type
- `TierLimits` - Limits/features type

## Building

```bash
pnpm build
```

## Notes

- Stripe IDs are NOT in this package (they're environment-specific)
- The app-web package re-exports from here and adds Stripe integration
- Marketing-specific display config (tooltips, styles) stays in the marketing package
