/**
 * OSQR Tier Configuration
 *
 * Defines features and limits for each subscription tier
 *
 * PRICING PHILOSOPHY (from PRICING-ARCHITECTURE.md):
 * - Token-based billing - uniform across all interfaces (web, VS Code, mobile)
 * - Mode-based differentiation - higher tiers unlock more powerful AI modes
 * - Document vault as value anchor - clear, tangible limits users understand
 * - VS Code requires Pro tier minimum
 *
 * TOKEN LIMITS (per month):
 * - Lite: 500K tokens (no VS Code access)
 * - Pro: 2.5M tokens
 * - Master: 12.5M tokens
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
    // Token-based billing (primary model)
    monthlyTokenLimit: number
    // Interface access
    vsCodeAccess: boolean
    mobileAccess: boolean
    // PKV limits
    maxDocuments: number
    maxFileSizeMB: number
    maxTotalStorageMB: number
    // Legacy: Usage limits (kept for backward compatibility, invisible)
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
      '500K tokens per month',
      '5 documents in vault',
      '7-day chat history analysis',
      'Quick mode only',
      'Memory persists',
      '1GB storage',
      'Web access only',
    ],
    limits: {
      // Token-based (primary)
      monthlyTokenLimit: 500_000,
      // Interface access
      vsCodeAccess: false, // Lite users cannot use VS Code extension
      mobileAccess: true,
      // PKV limits
      maxDocuments: 5,
      maxFileSizeMB: 25,
      maxTotalStorageMB: 1024, // 1GB
      // Legacy limits (backward compatibility)
      panelQueriesPerDay: 10,
      refineQueriesPerDay: 10,
      contemplatePerDay: 0,
      councilPerDay: 0,
      // Feature access
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
    description: 'Full OSQR experience with VS Code extension',
    positioning: 'The real product',
    features: [
      '2.5M tokens per month',
      '500 documents in vault',
      '30-day chat history analysis',
      'Quick, Thoughtful, and Contemplate modes',
      'Full Personal Knowledge Vault',
      'Cross-interface continuity',
      '10GB storage',
      '100 image analyses per month',
      'VS Code Extension',
    ],
    limits: {
      // Token-based (primary)
      monthlyTokenLimit: 2_500_000,
      // Interface access
      vsCodeAccess: true, // Pro users have VS Code access
      mobileAccess: true,
      // PKV limits
      maxDocuments: 500,
      maxFileSizeMB: 25,
      maxTotalStorageMB: 10240, // 10GB
      // Legacy limits (backward compatibility)
      panelQueriesPerDay: 100,
      refineQueriesPerDay: 100,
      contemplatePerDay: 0, // Not available at Pro
      councilPerDay: 0, // Not available at Pro
      // Feature access
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
      '12.5M tokens per month',
      '1,500 documents in vault',
      'Unlimited chat history analysis',
      'Council Mode (multi-model deliberation)',
      'Priority fast-lane processing',
      '100GB storage',
      'Unlimited image analyses',
      'Weekly automated reviews',
      'Custom Agent Builder (coming)',
      'VS Code Extension with priority routing',
      'Early access to new models and features',
    ],
    limits: {
      // Token-based (primary)
      monthlyTokenLimit: 12_500_000,
      // Interface access
      vsCodeAccess: true, // Master users have VS Code access
      mobileAccess: true,
      // PKV limits
      maxDocuments: 1500,
      maxFileSizeMB: 50,
      maxTotalStorageMB: 102400, // 100GB
      // Legacy limits (backward compatibility)
      panelQueriesPerDay: 300,
      refineQueriesPerDay: 300,
      contemplatePerDay: 50,
      councilPerDay: 20,
      // Feature access
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
  return TIERS[tier] || TIERS.pro // Default to pro, not starter
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

/**
 * Check if tier has VS Code access
 */
export function hasVSCodeAccess(tier: TierName): boolean {
  const config = getTierConfig(tier)
  return config.limits.vsCodeAccess
}

/**
 * Get monthly token limit for tier
 */
export function getMonthlyTokenLimit(tier: TierName): number {
  const config = getTierConfig(tier)
  return config.limits.monthlyTokenLimit
}

/**
 * Get effective monthly token limit including referral bonus
 * @param tier - User's subscription tier
 * @param referralBonusPercent - Percentage bonus from referrals (0-50)
 */
export function getEffectiveTokenLimit(tier: TierName, referralBonusPercent: number = 0): number {
  const baseLimit = getMonthlyTokenLimit(tier)
  const bonusMultiplier = 1 + (Math.min(referralBonusPercent, 50) / 100)
  return Math.floor(baseLimit * bonusMultiplier)
}

/**
 * Format token count for display (e.g., 2500000 -> "2.5M")
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`.replace('.0M', 'M')
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(0)}K`
  }
  return tokens.toString()
}
