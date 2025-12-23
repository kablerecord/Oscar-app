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

export type TierName = 'lite' | 'pro' | 'master'

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
  // Lite tier - NOT visible to users until post-500 paid users
  // Exists in config for future activation
  lite: {
    name: 'lite',
    displayName: 'OSQR Lite',
    price: 19,
    yearlyPrice: 0, // Monthly only - no annual option
    futurePrice: 29,
    description: 'Entry point with persistent memory and Quick mode',
    positioning: 'Start thinking with AI',
    features: [
      '5 documents in vault',
      '10 queries per day',
      '7-day chat history analysis',
      'Quick mode only',
      'Memory persists',
      '1GB storage',
    ],
    limits: {
      maxDocuments: 5,
      maxFileSizeMB: 25,
      maxTotalStorageMB: 1024, // 1GB
      panelQueriesPerDay: 10, // Visible limit for Lite
      refineQueriesPerDay: 10,
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
    stripePriceId: process.env.STRIPE_PRICE_LITE || undefined,
    stripeYearlyPriceId: undefined, // No yearly option
  },
  pro: {
    name: 'pro',
    displayName: 'OSQR Pro',
    price: 99,
    yearlyPrice: 948, // $79/month × 12 = $948 (2 months free)
    futurePrice: 149,
    description: 'Full OSQR experience with multi-model panel',
    positioning: 'The real product',
    features: [
      '500 documents in vault',
      '100 queries per day',
      '30-day chat history analysis',
      'Quick, Thoughtful, and Contemplate modes',
      'Full Personal Knowledge Vault',
      'Cross-interface continuity',
      '10GB storage',
      '100 image analyses per month',
    ],
    limits: {
      maxDocuments: 500,
      maxFileSizeMB: 25,
      maxTotalStorageMB: 10240, // 10GB
      panelQueriesPerDay: 100,
      refineQueriesPerDay: 100,
      contemplatePerDay: 0, // Not available at Pro
      councilPerDay: 0, // Not available at Pro
      hasRefineFire: true,
      hasMultiModel: true,
      hasMSC: true,
      hasArtifacts: true,
      hasAdvancedMemory: true,
      hasQuickMode: true,
      hasThoughtfulMode: true,
      hasContemplateMode: true,
      hasCouncilMode: false,
    },
    modelCount: 2,
    stripePriceId: process.env.STRIPE_PRICE_PRO || undefined,
    stripeYearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY || undefined,
  },
  master: {
    name: 'master',
    displayName: 'OSQR Master',
    price: 249,
    yearlyPrice: 2388, // $199/month × 12 = $2388
    futurePrice: 349,
    description: 'All modes including Council for builders and power users',
    positioning: 'Build with OSQR',
    features: [
      'Everything in Pro',
      '1,500 documents in vault',
      '300 queries per day',
      'Unlimited chat history analysis',
      'Council Mode (multi-model deliberation)',
      'Priority fast-lane processing',
      '100GB storage',
      'Unlimited image analyses',
      'Weekly automated reviews',
      'Custom Agent Builder (coming)',
      'VS Code Extension (coming)',
      'Early access to new models and features',
    ],
    limits: {
      maxDocuments: 1500,
      maxFileSizeMB: 50,
      maxTotalStorageMB: 102400, // 100GB
      panelQueriesPerDay: 300,
      refineQueriesPerDay: 300,
      contemplatePerDay: 50, // Invisible throttle
      councilPerDay: 20, // Invisible throttle
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
