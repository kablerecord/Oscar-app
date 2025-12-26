'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Crown,
  Zap,
  ArrowRight,
  X,
  Brain,
  Clock,
  FileText,
  Sparkles,
  MessageCircle,
} from 'lucide-react'
import {
  type UserTier,
  type TrialState,
  type UpgradeMoment,
  TIER_INFO,
  CONVERSION_MESSAGES,
  getRecommendedUpgradeTier,
  calculateTrialState,
  detectUpgradeMoment,
  logConversionEvent,
  createConversionEvent,
} from '@/lib/conversion/conversion-events'

// ============================================
// Upgrade Prompt Component (Graceful Messaging)
// ============================================

interface UpgradePromptProps {
  userId: string
  workspaceId: string
  currentTier: UserTier
  moment: UpgradeMoment
  onUpgrade: (tier: UserTier) => void
  onDismiss: () => void
  onStayOnTier?: () => void
}

export function UpgradePrompt({
  userId,
  workspaceId,
  currentTier,
  moment,
  onUpgrade,
  onDismiss,
  onStayOnTier,
}: UpgradePromptProps) {
  const recommendedTier = getRecommendedUpgradeTier(currentTier)
  const tierInfo = TIER_INFO[recommendedTier]

  // Log that prompt was shown
  useEffect(() => {
    logConversionEvent(
      createConversionEvent(userId, workspaceId, 'upgrade_prompt_shown', currentTier, {
        feature: moment.feature,
        message: moment.message.substring(0, 100),
      })
    )
  }, [userId, workspaceId, currentTier, moment])

  const handleUpgrade = () => {
    logConversionEvent(
      createConversionEvent(userId, workspaceId, 'upgrade_prompt_clicked', currentTier, {
        toTier: recommendedTier,
      })
    )
    onUpgrade(recommendedTier)
  }

  const handleDismiss = () => {
    logConversionEvent(
      createConversionEvent(userId, workspaceId, 'upgrade_prompt_dismissed', currentTier, {
        feature: moment.feature,
      })
    )
    onDismiss()
  }

  const handleStay = () => {
    logConversionEvent(
      createConversionEvent(userId, workspaceId, 'feature_gate_stayed', currentTier, {
        feature: moment.feature,
      })
    )
    onStayOnTier?.()
  }

  // Different styles based on moment type
  const getGradient = () => {
    switch (moment.type) {
      case 'trial_ending':
        return 'from-amber-500 to-orange-500'
      case 'limit_hit':
        return 'from-blue-500 to-purple-500'
      case 'feature_gate':
        return 'from-purple-500 to-pink-500'
      case 'value_delivered':
        return 'from-emerald-500 to-teal-500'
      default:
        return 'from-blue-500 to-purple-500'
    }
  }

  const Icon = useMemo(() => {
    switch (moment.type) {
      case 'trial_ending':
        return Clock
      case 'limit_hit':
        return FileText
      case 'feature_gate':
        return Zap
      case 'value_delivered':
        return Sparkles
      default:
        return Crown
    }
  }, [moment.type])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900 overflow-hidden">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className={`bg-gradient-to-r ${getGradient()} p-6 text-white`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm opacity-80">{tierInfo.displayName}</p>
              <p className="text-lg font-bold">${tierInfo.price}/month</p>
            </div>
          </div>

          {/* OSQR's message (from spec) */}
          <p className="text-white/90 whitespace-pre-line text-sm">
            {moment.message}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Features preview */}
          <div className="mb-6 space-y-2">
            {tierInfo.features.slice(0, 4).map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <Zap className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Founder pricing note (if applicable) */}
          {tierInfo.isFounderPricing && (
            <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              Founder pricing: ${tierInfo.price}/mo locks in forever (future price: ${tierInfo.futurePrice})
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleUpgrade}
              className={`w-full bg-gradient-to-r ${getGradient()}`}
            >
              Upgrade to {tierInfo.displayName}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {/* "Stay on current tier" option - always offered (from spec) */}
            {moment.alternativeMessage && (
              <Button
                onClick={handleStay}
                variant="outline"
                className="w-full"
              >
                {moment.alternativeMessage}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Trial Banner Component
// ============================================

interface TrialBannerProps {
  trial: TrialState
  currentTier: UserTier
  onUpgrade: (tier: UserTier) => void
  onDismiss: () => void
}

export function TrialBanner({
  trial,
  currentTier,
  onUpgrade,
  onDismiss,
}: TrialBannerProps) {
  if (!trial.isActive) return null

  const isUrgent = trial.daysRemaining <= 3

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 text-sm ${
        isUrgent
          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
          : 'bg-purple-100 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>
          {trial.daysRemaining === 1
            ? 'Your trial ends tomorrow'
            : `${trial.daysRemaining} days left on your Pro trial`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => onUpgrade('pro')}
          size="sm"
          className={isUrgent
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-purple-600 hover:bg-purple-700'
          }
        >
          Keep Pro
        </Button>
        <button onClick={onDismiss} className="p-1 hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ============================================
// Inline Feature Gate Component
// ============================================

interface FeatureGateProps {
  feature: string
  featureDisplayName: string
  currentTier: UserTier
  requiredTier: UserTier
  onTryWithout?: () => void
  onUpgrade: (tier: UserTier) => void
}

export function FeatureGate({
  feature,
  featureDisplayName,
  currentTier,
  requiredTier,
  onTryWithout,
  onUpgrade,
}: FeatureGateProps) {
  const tierInfo = TIER_INFO[requiredTier]

  // OSQR's voice - companion suggesting, not vendor selling
  const getMessage = () => {
    switch (feature) {
      case 'thoughtful_mode':
        return "That needs Thoughtful Mode — I'd use Claude AND GPT-4o together. That's Pro."
      case 'contemplate_mode':
        return "Contemplate Mode lets me think deeply on this. That's a Pro feature."
      case 'council_mode':
        return "That's a Council Mode question — I'd bring in multiple models to debate it. That's Master."
      default:
        return `${featureDisplayName} requires ${tierInfo.displayName}.`
    }
  }

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-purple-900 dark:text-purple-200">
            {getMessage()}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <Button
              onClick={() => onUpgrade(requiredTier)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              Upgrade to {tierInfo.displayName}
            </Button>

            {onTryWithout && (
              <Button
                onClick={onTryWithout}
                size="sm"
                variant="ghost"
                className="text-purple-700 dark:text-purple-300"
              >
                Try without it
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Value Reinforcement Component
// ============================================

interface ValueReinforcementProps {
  tierUsed: UserTier
  actionType: 'deep_analysis' | 'council_mode' | 'thoughtful_mode'
  onDismiss: () => void
}

export function ValueReinforcement({
  tierUsed,
  actionType,
  onDismiss,
}: ValueReinforcementProps) {
  // Only show for trial/starter users
  if (tierUsed !== 'starter' && tierUsed !== 'trial') {
    return null
  }

  const getMessage = () => {
    switch (actionType) {
      case 'deep_analysis':
        return CONVERSION_MESSAGES.value_delivered
      case 'council_mode':
        return "That Council debate surfaced perspectives I wouldn't have found alone. Worth keeping access to."
      case 'thoughtful_mode':
        return "That Thoughtful analysis connected dots across your documents. Worth keeping access to."
      default:
        return CONVERSION_MESSAGES.value_delivered
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
      <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
      <p className="text-sm text-emerald-800 dark:text-emerald-200 flex-1">
        {getMessage()}
      </p>
      <button
        onClick={onDismiss}
        className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ============================================
// Post-Upgrade Welcome Component
// ============================================

interface PostUpgradeWelcomeProps {
  fromTier: UserTier
  toTier: UserTier
  onContinue: () => void
}

export function PostUpgradeWelcome({
  fromTier,
  toTier,
  onContinue,
}: PostUpgradeWelcomeProps) {
  const tierInfo = TIER_INFO[toTier]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Crown className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">
            Welcome to {tierInfo.displayName}
          </h2>
          <p className="mt-1 opacity-80">
            {CONVERSION_MESSAGES.post_upgrade}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Here's what just unlocked:
          </p>

          <div className="space-y-2 mb-6">
            {tierInfo.features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 px-3 py-2"
              >
                <Zap className="h-4 w-4 text-purple-500 flex-shrink-0" />
                <span className="text-sm text-purple-900 dark:text-purple-200">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          <Button
            onClick={onContinue}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
          >
            Let's see what I can do now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Limit Warning Component (for Budget Integration)
// ============================================

interface LimitWarningProps {
  type: 'queries' | 'documents'
  current: number
  limit: number
  currentTier: UserTier
  onUpgrade: (tier: UserTier) => void
}

export function LimitWarning({
  type,
  current,
  limit,
  currentTier,
  onUpgrade,
}: LimitWarningProps) {
  const percentUsed = Math.min(100, Math.round((current / limit) * 100))
  const isNearLimit = percentUsed >= 80

  if (!isNearLimit) return null

  const recommendedTier = getRecommendedUpgradeTier(currentTier)
  const tierInfo = TIER_INFO[recommendedTier]

  const getMessage = () => {
    if (type === 'queries') {
      return `I've used my deep thinking for today. ${tierInfo.displayName} gets ${
        recommendedTier === 'master' ? 'unlimited' : '100'
      } queries.`
    }
    return `I'm at capacity. ${tierInfo.displayName} holds ${
      recommendedTier === 'pro' ? '25' : '100'
    } documents.`
  }

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
      <div className="flex items-start gap-3">
        <MessageCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {getMessage()}
          </p>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-amber-200 dark:bg-amber-800">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            {current} of {limit} used today
          </p>

          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => onUpgrade(recommendedTier)}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-xs"
            >
              Upgrade
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-amber-700 dark:text-amber-300 text-xs"
            >
              I'll wait until tomorrow
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Founder Pricing Note (one-time mention)
// ============================================

interface FounderPricingNoteProps {
  currentTier: UserTier
  onDismiss: () => void
}

export function FounderPricingNote({
  currentTier,
  onDismiss,
}: FounderPricingNoteProps) {
  const tierInfo = TIER_INFO[currentTier]

  if (!tierInfo.isFounderPricing) return null

  return (
    <div className="flex items-center gap-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 px-4 py-3 text-sm">
      <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
      <p className="text-purple-800 dark:text-purple-200 flex-1">
        {CONVERSION_MESSAGES.founder_pricing}
      </p>
      <button
        onClick={onDismiss}
        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ============================================
// Hook for Detecting Upgrade Moments
// ============================================

interface UseConversionTouchpointsProps {
  userId: string
  workspaceId: string
  tier: UserTier
  trialStartDate: Date | null
  documentsUsed: number
  queriesUsedToday: number
}

export function useConversionTouchpoints({
  userId,
  workspaceId,
  tier,
  trialStartDate,
  documentsUsed,
  queriesUsedToday,
}: UseConversionTouchpointsProps) {
  const [currentMoment, setCurrentMoment] = useState<UpgradeMoment | null>(null)
  const [showTrial, setShowTrial] = useState(true)
  const [founderPricingShown, setFounderPricingShown] = useState(false)

  const trial = calculateTrialState(trialStartDate)

  const checkForUpgradeMoment = (
    lastActionType: 'deep_analysis' | 'quick_chat' | 'upload' | 'mode_switch' | 'other',
    isTaskComplete: boolean,
    requestedFeature?: string
  ) => {
    const moment = detectUpgradeMoment({
      tier,
      trial,
      documentsUsed,
      queriesUsedToday,
      lastActionType,
      requestedFeature,
      isTaskComplete,
    })

    if (moment?.shouldShow) {
      setCurrentMoment(moment)
    }

    return moment
  }

  const dismissMoment = () => {
    setCurrentMoment(null)
  }

  const dismissTrialBanner = () => {
    setShowTrial(false)
  }

  const showFounderPricingOnce = () => {
    if (!founderPricingShown && TIER_INFO[tier].isFounderPricing) {
      setFounderPricingShown(true)
      return true
    }
    return false
  }

  return {
    trial,
    currentMoment,
    showTrial,
    founderPricingShown,
    checkForUpgradeMoment,
    dismissMoment,
    dismissTrialBanner,
    showFounderPricingOnce,
  }
}

export default {
  UpgradePrompt,
  TrialBanner,
  FeatureGate,
  ValueReinforcement,
  PostUpgradeWelcome,
  LimitWarning,
  FounderPricingNote,
  useConversionTouchpoints,
}
