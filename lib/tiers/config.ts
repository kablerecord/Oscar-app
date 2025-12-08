/**
 * OSQR Tier Configuration
 *
 * Defines features and limits for each subscription tier
 */

export type TierName = 'free' | 'pro' | 'master'

export interface TierConfig {
  name: TierName
  displayName: string
  price: number // Monthly price in USD
  description: string
  features: string[]
  limits: {
    // PKV limits
    maxDocuments: number
    maxFileSizeMB: number
    maxTotalStorageMB: number
    // Usage limits
    panelQueriesPerDay: number
    refineQueriesPerDay: number
    // Feature access
    hasRefineFire: boolean
    hasFullPanel: boolean
    hasMSC: boolean
    hasArtifacts: boolean
    hasAdvancedMemory: boolean
    hasWeeklyReviews: boolean
  }
  // Stripe Price IDs (will be set from env or hardcoded for MVP)
  stripePriceId?: string
}

export const TIERS: Record<TierName, TierConfig> = {
  free: {
    name: 'free',
    displayName: 'OSQR Lite',
    price: 0,
    description: 'Get a taste of the OSQR experience',
    features: [
      'Quick mode responses',
      '5 documents in vault',
      '10 panel queries/day',
      'Basic memory',
    ],
    limits: {
      maxDocuments: 5,
      maxFileSizeMB: 10,
      maxTotalStorageMB: 25,
      panelQueriesPerDay: 10,
      refineQueriesPerDay: 20,
      hasRefineFire: true, // Let free users experience the magic
      hasFullPanel: false, // Limited to 2 models
      hasMSC: true, // Basic version
      hasArtifacts: true,
      hasAdvancedMemory: false,
      hasWeeklyReviews: false,
    },
    stripePriceId: process.env.STRIPE_PRICE_FREE || undefined,
  },
  pro: {
    name: 'pro',
    displayName: 'OSQR Pro',
    price: 49,
    description: 'Full OSQR power for serious builders',
    features: [
      'Everything in Lite',
      'Unlimited Refine → Fire',
      'Full 4-model panel',
      '25 documents in vault',
      '100 panel queries/day',
      'Master Summary Checklist',
      'Advanced memory',
    ],
    limits: {
      maxDocuments: 25,
      maxFileSizeMB: 25,
      maxTotalStorageMB: 250,
      panelQueriesPerDay: 100,
      refineQueriesPerDay: 200,
      hasRefineFire: true,
      hasFullPanel: true,
      hasMSC: true,
      hasArtifacts: true,
      hasAdvancedMemory: true,
      hasWeeklyReviews: false,
    },
    stripePriceId: process.env.STRIPE_PRICE_PRO || undefined,
  },
  master: {
    name: 'master',
    displayName: 'OSQR Master',
    price: 149,
    description: 'For legacy architects and serious operators',
    features: [
      'Everything in Pro',
      'Unlimited everything',
      '100 documents in vault',
      'Weekly automated reviews',
      'Priority support',
      'Early access to new features',
    ],
    limits: {
      maxDocuments: 100,
      maxFileSizeMB: 50,
      maxTotalStorageMB: 1000,
      panelQueriesPerDay: 1000,
      refineQueriesPerDay: 2000,
      hasRefineFire: true,
      hasFullPanel: true,
      hasMSC: true,
      hasArtifacts: true,
      hasAdvancedMemory: true,
      hasWeeklyReviews: true,
    },
    stripePriceId: process.env.STRIPE_PRICE_MASTER || undefined,
  },
}

/**
 * Get tier config by name
 */
export function getTierConfig(tier: TierName): TierConfig {
  return TIERS[tier] || TIERS.free
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
