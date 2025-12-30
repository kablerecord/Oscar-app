/**
 * OSQR Tier Configuration
 *
 * Re-exports base tier config from @osqr/shared and adds Stripe integration
 *
 * PRICING UPDATED: December 2024
 * Source of truth: packages/shared/src/tiers/config.ts
 */

// Re-export everything from shared
export {
  TIERS,
  getTierConfig,
  hasFeature,
  getLimit,
  isOverLimit,
  hasYearlyOption,
  getYearlyMonthlyPrice,
  hasVSCodeAccess,
  getMonthlyTokenLimit,
  getEffectiveTokenLimit,
  formatTokenCount,
} from '@osqr/shared'

export type { TierName, TierConfig, TierLimits } from '@osqr/shared'

/**
 * Extended tier config with Stripe IDs (app-web specific)
 */
export interface TierConfigWithStripe {
  stripePriceId?: string
  stripeYearlyPriceId?: string
}

/**
 * Get Stripe Price IDs for a tier
 * These are loaded from environment variables at runtime
 */
export function getStripePriceIds(tier: 'lite' | 'pro' | 'master'): TierConfigWithStripe {
  switch (tier) {
    case 'lite':
      return {
        stripePriceId: process.env.STRIPE_PRICE_LITE || undefined,
        stripeYearlyPriceId: undefined, // No yearly option
      }
    case 'pro':
      return {
        stripePriceId: process.env.STRIPE_PRICE_PRO || undefined,
        stripeYearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY || undefined,
      }
    case 'master':
      return {
        stripePriceId: process.env.STRIPE_PRICE_MASTER || undefined,
        stripeYearlyPriceId: process.env.STRIPE_PRICE_MASTER_YEARLY || undefined,
      }
  }
}
