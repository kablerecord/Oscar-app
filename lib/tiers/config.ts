/**
 * OSQR Tier Configuration
 *
 * Defines features and limits for each subscription tier
 *
 * PRICING PHILOSOPHY (from PRICING-ARCHITECTURE.md):
 * - No visible query limits - users shouldn't feel constrained
 * - Mode-based differentiation - higher tiers unlock more powerful AI modes
 * - Document vault as value anchor - clear, tangible limits users understand
 * - Invisible throttling - protect margins without marketing complexity
 */

export type TierName = 'starter' | 'pro' | 'master'

export interface TierConfig {
  name: TierName
  displayName: string
  price: number // Monthly price in USD
  yearlyPrice: number // Yearly price in USD (0 = not available)
  futurePrice: number // Future price after founder period
  description: string
  positioning: string // Marketing positioning phrase
  features: string[]
  limits: {
    // PKV limits
    maxDocuments: number
    maxFileSizeMB: number
    maxTotalStorageMB: number
    // Usage limits (invisible - not shown in UI)
    panelQueriesPerDay: number
    refineQueriesPerDay: number
    contemplatePerDay: number
    councilPerDay: number
    // Feature access
    hasRefineFire: boolean
    hasMultiModel: boolean // Multi-model panel
    hasMSC: boolean
    hasArtifacts: boolean
    hasAdvancedMemory: boolean
    // Mode access
    hasQuickMode: boolean
    hasThoughtfulMode: boolean
    hasContemplateMode: boolean
    hasCouncilMode: boolean
  }
  // Model access
  modelCount: number // Number of AI models available
  // Stripe Price IDs (will be set from env or hardcoded for MVP)
  stripePriceId?: string
  stripeYearlyPriceId?: string
}

export const TIERS: Record<TierName, TierConfig> = {
  starter: {
    name: 'starter',
    displayName: 'OSQR Starter',
    price: 20,
    yearlyPrice: 0, // Monthly only - no annual option
    futurePrice: 20, // No founder pricing for Starter
    description: 'Try the difference with single-model AI and basic vault',
    positioning: 'Try the difference',
    features: [
      'Single AI model (Claude OR GPT-4o)',
      '5 documents in vault',
      'Basic memory',
      'Refine → Fire workflow',
      'Quick mode',
    ],
    limits: {
      maxDocuments: 5,
      maxFileSizeMB: 25,
      maxTotalStorageMB: 125, // 5 files × 25MB
      panelQueriesPerDay: 100, // Invisible limit
      refineQueriesPerDay: 100, // Invisible limit
      contemplatePerDay: 0, // Not available
      councilPerDay: 0, // Not available
      hasRefineFire: true,
      hasMultiModel: false,
      hasMSC: false,
      hasArtifacts: false,
      hasAdvancedMemory: false,
      hasQuickMode: true,
      hasThoughtfulMode: false,
      hasContemplateMode: false,
      hasCouncilMode: false,
    },
    modelCount: 1,
    stripePriceId: process.env.STRIPE_PRICE_STARTER || undefined,
    stripeYearlyPriceId: undefined, // No yearly option
  },
  pro: {
    name: 'pro',
    displayName: 'OSQR Pro',
    price: 49,
    yearlyPrice: 468, // $39/month × 12 = $468 (2 months free)
    futurePrice: 79,
    description: 'Multi-model panel with full Personal Knowledge Vault',
    positioning: 'The real product',
    features: [
      'Multi-model panel (Claude + GPT-4o)',
      '500 documents in vault',
      'Full Personal Knowledge Vault',
      'Advanced memory',
      'Unlimited Refine → Fire',
      'Quick + Thoughtful modes',
      '90-day transformation guarantee',
    ],
    limits: {
      maxDocuments: 500,
      maxFileSizeMB: 25,
      maxTotalStorageMB: 2500, // 500 files × 5MB avg
      panelQueriesPerDay: 999, // Effectively unlimited (invisible)
      refineQueriesPerDay: 999, // Effectively unlimited (invisible)
      contemplatePerDay: 0, // Not available
      councilPerDay: 0, // Not available
      hasRefineFire: true,
      hasMultiModel: true,
      hasMSC: true,
      hasArtifacts: true,
      hasAdvancedMemory: true,
      hasQuickMode: true,
      hasThoughtfulMode: true,
      hasContemplateMode: false,
      hasCouncilMode: false,
    },
    modelCount: 2,
    stripePriceId: process.env.STRIPE_PRICE_PRO || undefined,
    stripeYearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY || undefined,
  },
  master: {
    name: 'master',
    displayName: 'OSQR Master',
    price: 149,
    yearlyPrice: 1428, // $119/month × 12 = $1428 (2 months free)
    futurePrice: 249,
    description: 'All modes including Contemplate and Council for builders',
    positioning: 'Build with OSQR',
    features: [
      'Everything in Pro',
      'Contemplate mode (deep reasoning)',
      'Council Mode (multi-model deliberation)',
      '1,500 documents in vault',
      '50MB max file size',
      '4+ AI models',
    ],
    limits: {
      maxDocuments: 1500,
      maxFileSizeMB: 50,
      maxTotalStorageMB: 7500, // 1500 files × 5MB avg
      panelQueriesPerDay: 999, // Effectively unlimited (invisible)
      refineQueriesPerDay: 999, // Effectively unlimited (invisible)
      contemplatePerDay: 20, // Invisible throttle
      councilPerDay: 10, // Invisible throttle
      hasRefineFire: true,
      hasMultiModel: true,
      hasMSC: true,
      hasArtifacts: true,
      hasAdvancedMemory: true,
      hasQuickMode: true,
      hasThoughtfulMode: true,
      hasContemplateMode: true,
      hasCouncilMode: true,
    },
    modelCount: 4,
    stripePriceId: process.env.STRIPE_PRICE_MASTER || undefined,
    stripeYearlyPriceId: process.env.STRIPE_PRICE_MASTER_YEARLY || undefined,
  },
}

/**
 * Get tier config by name
 */
export function getTierConfig(tier: TierName): TierConfig {
  return TIERS[tier] || TIERS.starter
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: TierName, feature: keyof TierConfig['limits']): boolean {
  const config = getTierConfig(tier)
  const value = config.limits[feature]
  return typeof value === 'boolean' ? value : value > 0
}

/**
 * Get the limit value for a feature
 */
export function getLimit(tier: TierName, limit: keyof TierConfig['limits']): number | boolean {
  const config = getTierConfig(tier)
  return config.limits[limit]
}

/**
 * Check if user has exceeded a limit
 */
export function isOverLimit(tier: TierName, limit: keyof TierConfig['limits'], currentValue: number): boolean {
  const config = getTierConfig(tier)
  const maxValue = config.limits[limit]
  if (typeof maxValue === 'boolean') return false
  return currentValue >= maxValue
}

/**
 * Check if a tier supports yearly billing
 */
export function hasYearlyOption(tier: TierName): boolean {
  const config = getTierConfig(tier)
  return config.yearlyPrice > 0
}

/**
 * Get effective monthly price for yearly billing
 */
export function getYearlyMonthlyPrice(tier: TierName): number {
  const config = getTierConfig(tier)
  if (config.yearlyPrice === 0) return config.price
  return Math.round(config.yearlyPrice / 12)
}
