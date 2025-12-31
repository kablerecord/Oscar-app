/**
 * OSQR Throttle - Messaging
 *
 * Generates user-facing messages for throttle states.
 * Maintains OSQR's voice and avoids punishing language.
 */

import {
  Tier,
  BudgetState,
  ThrottleMessage,
  ThrottleOption,
  TIER_CONFIGS,
  OVERAGE_PACKAGES,
} from './types';
import { getBudgetStatus } from './budget-tracker';

// ============================================================================
// Throttle Messages
// ============================================================================

/**
 * Get throttle message for current state
 */
export function getThrottleMessage(
  userId: string,
  tier: Tier
): ThrottleMessage {
  const status = getBudgetStatus(userId, tier);
  const timeUntilReset = formatTimeUntilReset(status.nextResetAt);

  switch (status.state) {
    case 'full':
    case 'high':
      return {
        state: status.state,
        message: `${status.premiumRemaining} deep thinking queries available today.`,
        showOptions: false,
      };

    case 'medium':
      return {
        state: 'medium',
        message: `I've used most of my deep thinking for today. Still have ${status.premiumRemaining} left.`,
        showOptions: false,
      };

    case 'low':
      return {
        state: 'low',
        message: `I've hit my daily limit for deep analysis. I can still chat, or you can grab 10 more queries for $10.`,
        showOptions: true,
        options: buildOptions(tier, timeUntilReset),
      };

    case 'critical':
      return {
        state: 'critical',
        message: `Running on fumes today. Full reset at midnight, or upgrade for unlimited.`,
        showOptions: true,
        options: buildOptions(tier, timeUntilReset),
      };

    case 'depleted':
      return {
        state: 'depleted',
        message: `I've used my deep thinking for today.`,
        showOptions: true,
        options: buildOptions(tier, timeUntilReset),
      };

    default:
      return {
        state: 'full',
        message: 'Ready to help.',
        showOptions: false,
      };
  }
}

/**
 * Build throttle options based on tier
 */
function buildOptions(tier: Tier, timeUntilReset: string): ThrottleOption[] {
  const options: ThrottleOption[] = [
    {
      action: 'wait',
      label: 'Wait until midnight',
      description: `Resets ${timeUntilReset}`,
    },
  ];

  // Add buy option
  const contemplatePackage = OVERAGE_PACKAGES.find(p => p.type === 'contemplate');
  if (contemplatePackage) {
    options.push({
      action: 'buy',
      label: `Buy ${contemplatePackage.queries} more`,
      description: `$${contemplatePackage.price} - instant access`,
      metadata: { packageId: contemplatePackage.id },
    });
  }

  // Add upgrade option based on current tier
  const upgradeOption = getUpgradeOption(tier);
  if (upgradeOption) {
    options.push(upgradeOption);
  }

  return options;
}

/**
 * Get upgrade option based on current tier
 */
function getUpgradeOption(currentTier: Tier): ThrottleOption | null {
  switch (currentTier) {
    case 'lite':
      return {
        action: 'upgrade',
        label: 'Upgrade to Pro',
        description: `$${TIER_CONFIGS.pro.monthlyPrice}/mo - ${TIER_CONFIGS.pro.queriesPerDay} queries/day`,
        metadata: { targetTier: 'pro' },
      };

    case 'pro':
      return {
        action: 'upgrade',
        label: 'Upgrade to Master',
        description: `$${TIER_CONFIGS.master.monthlyPrice}/mo - unlimited queries`,
        metadata: { targetTier: 'master' },
      };

    case 'master':
    case 'enterprise':
      return null; // Already at top tier

    default:
      return null;
  }
}

/**
 * Format time until reset
 */
function formatTimeUntilReset(resetAt: Date): string {
  const now = new Date();
  const diffMs = resetAt.getTime() - now.getTime();

  if (diffMs < 0) return 'now';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes}m`;
}

// ============================================================================
// Contextual Messages
// ============================================================================

/**
 * Message for when premium model is unavailable
 */
export function getPremiumUnavailableMessage(tier: Tier): string {
  const status = getBudgetStatus('', tier);
  const timeUntilReset = formatTimeUntilReset(status.nextResetAt);

  return `I've used my deep thinking for today. I can still chat and help with quick stuff, but for another full analysis, check back ${timeUntilReset} - or upgrade and I'll go deeper right now.`;
}

/**
 * Message for feature not available on tier
 */
export function getFeatureUnavailableMessage(
  feature: 'contemplate' | 'council',
  currentTier: Tier
): string {
  switch (feature) {
    case 'contemplate':
      return `Deep thinking mode is available on Pro tier and above. I can still help with your question using my quick thinking.`;

    case 'council':
      return `Council mode - where I think through multiple perspectives - is available on Master tier. I can still give you my analysis.`;
  }
}

/**
 * Message after overage purchase
 */
export function getOveragePurchaseMessage(queries: number, type: string): string {
  return `Got it. ${queries} more ${type} queries ready. Let's keep going.`;
}

/**
 * Message for heavy user hitting limits
 */
export function getHeavyUserMessage(): string {
  return `You're pushing my capabilities today - that's great. I need to pace myself to stay sharp. Midnight reset, or grab more queries now.`;
}

/**
 * Message for referral bonus
 */
export function getReferralBonusMessage(bonusQueries: number): string {
  return `Your referral just signed up! +${bonusQueries} queries for today.`;
}

// ============================================================================
// Conversion Messages
// ============================================================================

/**
 * Get conversion prompt based on usage pattern
 */
export function getConversionMessage(
  tier: Tier,
  context: {
    hitsThisMonth?: number;
    overagesPurchased?: number;
    daysUsed?: number;
  }
): string | null {
  // Suggest enterprise after multiple hits
  if (context.hitsThisMonth && context.hitsThisMonth >= 3) {
    return `You've hit limits ${context.hitsThisMonth} times this month. Pro might make more sense - $49 for 100 queries/day instead of paying per 10.`;
  }

  // After multiple overage purchases
  if (context.overagesPurchased && context.overagesPurchased >= 3) {
    return `You've bought overages ${context.overagesPurchased} times. Consider upgrading to get more included queries.`;
  }

  // After consistent daily use
  if (context.daysUsed && context.daysUsed >= 3 && tier === 'lite') {
    return `You're using me daily. $49/month for Pro unlocks the full toolkit.`;
  }

  return null;
}

// ============================================================================
// Phrases to Never Use
// ============================================================================

// These are documented for code review purposes
export const FORBIDDEN_PHRASES = [
  "You've run out",
  "Upgrade to continue",
  "Your trial has ended",
  "Buy now",
  "Limited time offer",
  "Don't miss out",
  "You must upgrade",
  "Expired",
  "Blocked",
  "Restricted",
];

// ============================================================================
// Test Compatibility API
// ============================================================================

import { getQueriesRemaining, getDailyBudget } from './budget-tracker';

/**
 * Get budget status as simple string message
 */
export function getBudgetStatusMessage(userId: string, tier: Tier): string {
  const remaining = getQueriesRemaining(userId, tier);
  return `${remaining} queries available today.`;
}

// Deprecated: Use getBudgetStatus from budget-tracker for BudgetStatus object
// or getBudgetStatusMessage for string message

/**
 * Get graceful degradation message
 */
export function getGracefulDegradationMessage(userId: string, tier: Tier): string {
  const remaining = getQueriesRemaining(userId, tier);

  if (remaining <= 0) {
    return "I've used my deep thinking for today. Let's work together efficiently, or you can upgrade for unlimited access tomorrow.";
  }

  if (remaining <= 2) {
    return `I'm conserving energy to stay sharp. Let's work together efficiently with ${remaining} deep queries left.`;
  }

  return `I'm switching to smart mode to extend our session. ${remaining} deep queries remaining.`;
}

/**
 * Get upgrade prompt without pressure
 */
export function getUpgradePrompt(tier: Tier): string {
  switch (tier) {
    case 'lite':
      return 'Pro tier offers 100 queries per day and unlocks Contemplate mode for deeper analysis.';
    case 'pro':
      return 'Master tier includes unlimited queries and Council mode for multi-perspective thinking.';
    case 'master':
      return 'Enterprise tier adds dedicated support and custom SLA options.';
    default:
      return 'Consider exploring our tier options for more capabilities.';
  }
}

/**
 * Get overage purchase prompt
 */
export function getOveragePrompt(tier: Tier): string {
  return 'Need more queries today? You can grab a query pack to continue working.';
}

/**
 * Get referral prompt
 */
export function getReferralPrompt(tier: Tier): string {
  return 'Share OSQR with a friend and earn bonus queries when they sign up.';
}

/**
 * Get feature lock message
 */
export function getFeatureLockMessage(
  feature: 'councilMode' | 'contemplateMode' | 'voiceMode' | 'priorityProcessing' | 'weeklyReviews' | 'vscodeExtension' | 'apiAccess',
  tier: Tier
): string {
  const featureNames: Record<string, string> = {
    councilMode: 'Council mode',
    contemplateMode: 'Contemplate mode',
    voiceMode: 'Voice mode',
    priorityProcessing: 'Priority processing',
    weeklyReviews: 'Weekly automated reviews',
    vscodeExtension: 'VS Code extension',
    apiAccess: 'API access',
  };

  const featureTiers: Record<string, Tier> = {
    councilMode: 'master',
    contemplateMode: 'pro',
    voiceMode: 'pro',
    priorityProcessing: 'master',
    weeklyReviews: 'master',
    vscodeExtension: 'pro',
    apiAccess: 'enterprise',
  };

  const featureName = featureNames[feature] || feature;
  const requiredTier = featureTiers[feature] || 'pro';

  return `${featureName} is available on ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} tier and above.`;
}

/**
 * Get welcome message for tier
 */
export function getWelcomeMessage(tier: Tier): string {
  const config = TIER_CONFIGS[tier];

  switch (tier) {
    case 'lite':
      return `Welcome to OSQR Lite. You have ${config.queriesPerDay} queries per day to explore.`;
    case 'pro':
      return `Welcome to OSQR Pro. You have ${config.queriesPerDay} queries per day, plus Contemplate mode for deep analysis.`;
    case 'master':
      return 'Welcome to OSQR Master. Unlimited queries, Contemplate mode, and Council mode are all at your fingertips.';
    case 'enterprise':
      return 'Welcome to OSQR Enterprise. Full access with dedicated support and custom SLA.';
    default:
      return 'Welcome to OSQR.';
  }
}

/**
 * Get query count message
 */
export function getQueryCountMessage(userId: string, tier: Tier): string {
  const budget = getDailyBudget(userId, tier);
  return `${budget.premiumQueriesUsed} of ${budget.premiumQueriesLimit} queries used today.`;
}
