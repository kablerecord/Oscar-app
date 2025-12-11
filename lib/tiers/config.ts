/**
 * OSQR Tier Configuration
 *
 * Defines features and limits for each subscription tier
 */

export type TierName = 'pro' | 'master'

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
  pro: {
    name: 'pro',
    displayName: 'OSQR Pro',
    price: 49,
    description: 'For high-performers who want elite clarity and multi-model thinking',
    features: [
      'Multi-model panel (Claude + GPT-4o)',
      'Quick, Thoughtful & Contemplate modes',
      'Full Personal Knowledge Vault',
      'Unlimited Refine → Fire',
      '25 documents in vault',
      '100 panel queries/day',
      'Advanced memory',
      '90-day transformation guarantee',
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
    description: 'For founders, operators, and elite thinkers who want OS-level intelligence',
    features: [
      'Everything in Pro',
      'Advanced memory & personalized intelligence',
      'Priority fast-lane processing',
      '100 documents in vault',
      'Weekly automated reviews',
      'Custom Agent Builder (coming)',
      'Council Mode (coming)',
      'VS Code Extension (coming)',
      'Early access to new models & features',
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
  return TIERS[tier] || TIERS.pro
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
