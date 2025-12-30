/**
 * OSQR Tier Configuration
 *
 * Defines features and limits for each subscription tier
 *
 * PRICING UPDATED: December 2024
 * Source of truth: https://www.osqr.app/pricing
 *
 * PRICING PHILOSOPHY:
 * - Lead with VALUE, not limits (what users get, not what they're capped at)
 * - Hide internal metrics (tokens, query counts) - use graceful degradation
 * - Mode-based differentiation - higher tiers unlock more powerful AI modes
 * - Document vault as value anchor - clear, tangible limits users understand
 * - VS Code requires Pro tier minimum
 *
 * INTERNAL LIMITS (not shown to users):
 * - Token limits exist but are handled via graceful degradation
 * - Query limits exist but are invisible to users
 */

export type TierName = 'lite' | 'pro' | 'master'

export interface TierLimits {
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

export interface TierConfig {
  name: TierName
  displayName: string
  price: number // Monthly price in USD (regular price)
  yearlyPrice: number // Yearly price in USD (0 = not available)
  futurePrice: number // Future price after founder period (same as price now)
  founderPrice?: number // Founder pricing (locked for life for first 500 users)
  description: string
  positioning: string // Marketing positioning phrase
  features: string[]
  limits: TierLimits
  // Model access
  modelCount: number // Number of AI models available
}

/**
 * Base tier configuration without Stripe IDs
 * Stripe IDs should be added at runtime from environment variables
 */
export const TIERS: Record<TierName, TierConfig> = {
  // Lite tier - NOT visible to users until post-500 paid users
  lite: {
    name: 'lite',
    displayName: 'OSQR Lite',
    price: 29,
    yearlyPrice: 0, // Monthly only - no annual option
    futurePrice: 49,
    description: 'Get started with AI that actually thinks',
    positioning: 'Start thinking with AI',
    features: [
      '50 documents in your Knowledge Vault',
      '2GB storage for your files',
      'Conversation history',
      'Quick mode for fast answers',
      'Web access',
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
  },
  pro: {
    name: 'pro',
    displayName: 'OSQR Pro',
    price: 49,
    yearlyPrice: 468, // $39/month × 12 = $468 (2 months free)
    futurePrice: 49, // $49 is regular price, $39 is founder price
    founderPrice: 39, // Founder pricing locked for life
    description: 'The essentials for serious thinking',
    positioning: 'The real product',
    features: [
      '75 queries per day',
      'Council Mode (5/day)',
      '500 documents in your Knowledge Vault',
      '10GB storage for your files',
      'Full conversation history',
      'Thoughtful Mode for deeper reasoning',
      'Voice input',
      'Image understanding',
      'VS Code extension',
      'Cross-device continuity',
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
      panelQueriesPerDay: 75,
      refineQueriesPerDay: 75,
      contemplatePerDay: 0, // Not available at Pro
      councilPerDay: 5, // Pro gets 5 council sessions per day
      // Feature access
      hasRefineFire: true,
      hasMultiModel: true,
      hasMSC: true,
      hasArtifacts: true,
      hasAdvancedMemory: true,
      hasQuickMode: true,
      hasThoughtfulMode: true,
      hasContemplateMode: false, // Contemplate not at Pro
      hasCouncilMode: true, // Council Mode now available at Pro
    },
    modelCount: 2,
  },
  master: {
    name: 'master',
    displayName: 'OSQR Master',
    price: 149,
    yearlyPrice: 1428, // $119/month × 12 = $1,428 (2 months free)
    futurePrice: 149, // $149 is regular price, $119 is founder price
    founderPrice: 119, // Founder pricing locked for life
    description: 'A room of minds. One final voice.',
    positioning: 'Build with OSQR',
    features: [
      'Everything in Pro, plus:',
      '200 queries per day',
      'Council Mode (15/day)',
      '1,500 documents in vault',
      '100GB storage',
      'Priority processing',
      'Weekly automated reviews',
      'Custom Agent Builder (coming)',
      'Early access to new features',
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
      panelQueriesPerDay: 200,
      refineQueriesPerDay: 200,
      contemplatePerDay: 50,
      councilPerDay: 15, // Master gets 15 council sessions per day
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
export function hasFeature(tier: TierName, feature: keyof TierLimits): boolean {
  const config = getTierConfig(tier)
  const value = config.limits[feature]
  return typeof value === 'boolean' ? value : value > 0
}

/**
 * Get the limit value for a feature
 */
export function getLimit(tier: TierName, limit: keyof TierLimits): number | boolean {
  const config = getTierConfig(tier)
  return config.limits[limit]
}

/**
 * Check if user has exceeded a limit
 */
export function isOverLimit(tier: TierName, limit: keyof TierLimits, currentValue: number): boolean {
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
