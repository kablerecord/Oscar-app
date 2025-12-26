'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Crown, Zap, ArrowRight, X } from 'lucide-react'
import { TIERS, type TierName } from '@/lib/tiers/config'

interface UpgradePromptProps {
  currentTier: TierName
  feature?: string
  reason?: string
  onClose?: () => void
  onUpgrade?: (tier: TierName) => void
}

export function UpgradePrompt({
  currentTier,
  feature,
  reason,
  onClose,
  onUpgrade,
}: UpgradePromptProps) {
  // Determine which tier to recommend based on current tier
  // Lite → Pro, Pro → Master
  const recommendedTier: TierName = currentTier === 'lite' ? 'pro' : 'master'
  const recommended = TIERS[recommendedTier]

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade(recommendedTier)
    } else {
      // Default: open Stripe checkout or pricing page
      window.open('/pricing', '_blank')
    }
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">Unlock More Power</CardTitle>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="cursor-pointer rounded-full p-1 hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
            >
              <X className="h-4 w-4 text-amber-600" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reason && (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {reason}
          </p>
        )}

        {feature && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <strong>{feature}</strong> requires an upgraded plan.
          </p>
        )}

        <div className="rounded-lg bg-white/50 p-3 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {recommended.displayName}
            </span>
            <span className="text-lg font-bold text-amber-600">
              ${recommended.price}/mo
            </span>
          </div>
          <ul className="space-y-1">
            {recommended.features.slice(0, 4).map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <Zap className="h-3 w-3 text-amber-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <Button
          onClick={handleUpgradeClick}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          Upgrade to {recommended.displayName}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Inline upgrade prompt for specific features
 */
interface InlineUpgradeProps {
  feature: string
  currentTier: TierName
}

export function InlineUpgrade({ feature, currentTier }: InlineUpgradeProps) {
  // Lite → Pro, Pro → Master
  const recommendedTier: TierName = currentTier === 'lite' ? 'pro' : 'master'

  return (
    <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/30">
      <Crown className="h-4 w-4 text-amber-600" />
      <span className="text-amber-800 dark:text-amber-200">
        {feature} requires {TIERS[recommendedTier].displayName}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto h-7 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
        onClick={() => window.open('/pricing', '_blank')}
      >
        Upgrade
      </Button>
    </div>
  )
}
