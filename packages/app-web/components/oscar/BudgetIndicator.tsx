"use client"

import { useState, useEffect } from "react"
import { BatteryLow, BatteryMedium, BatteryFull, Zap, Crown, ArrowRight } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { type UserTier, TIER_INFO, getRecommendedUpgradeTier, CONVERSION_MESSAGES } from "@/lib/conversion/conversion-events"

interface BudgetStatus {
  tier: string
  canQuery: boolean
  queriesRemaining: number
  queriesTotal: number
  budgetState: "healthy" | "warning" | "depleted" | "overage"
  statusMessage: string
  degraded: boolean
  upgradeAvailable: boolean
  percentRemaining: number
}

interface BudgetIndicatorProps {
  workspaceId: string
  compact?: boolean
  onUpgrade?: (tier: UserTier) => void
}

export function BudgetIndicator({ workspaceId, compact = false, onUpgrade }: BudgetIndicatorProps) {
  const [status, setStatus] = useState<BudgetStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUpgradePanel, setShowUpgradePanel] = useState(false)

  useEffect(() => {
    async function fetchBudget() {
      try {
        const response = await fetch(`/api/oscar/budget?workspaceId=${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error("[BudgetIndicator] Failed to fetch budget:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBudget()
    const interval = setInterval(fetchBudget, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [workspaceId])

  if (loading || !status) {
    return null
  }

  const shouldHighlight = status.budgetState !== "healthy"

  const getIcon = () => {
    switch (status.budgetState) {
      case "depleted":
        return <BatteryLow className="h-4 w-4 text-amber-400" />
      case "warning":
        return <BatteryMedium className="h-4 w-4 text-amber-400" />
      case "overage":
        return <Zap className="h-4 w-4 text-purple-400" />
      default:
        return <BatteryFull className="h-4 w-4 text-emerald-400" />
    }
  }

  const getColorClasses = () => {
    switch (status.budgetState) {
      case "depleted":
        return "text-amber-400 bg-amber-400/10 border-amber-400/20"
      case "warning":
        return "text-amber-300 bg-amber-400/5 border-amber-400/10"
      case "overage":
        return "text-purple-400 bg-purple-400/10 border-purple-400/20"
      default:
        return "text-slate-400 bg-slate-400/5 border-slate-400/10"
    }
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`p-1.5 rounded-md border ${getColorClasses()} cursor-default`}>
              {getIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{status.statusMessage}</p>
            {status.queriesTotal > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                {status.queriesRemaining} of {status.queriesTotal} queries remaining today
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (!shouldHighlight) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getColorClasses()}`}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{status.statusMessage}</p>
        {status.queriesTotal > 0 && (
          <div className="mt-1 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                status.budgetState === "depleted"
                  ? "bg-amber-500"
                  : status.budgetState === "warning"
                  ? "bg-amber-400"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${status.percentRemaining}%` }}
            />
          </div>
        )}
      </div>
      {status.upgradeAvailable && (
        <button
          onClick={() => setShowUpgradePanel(true)}
          className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
        >
          Upgrade
        </button>
      )}

      {/* Upgrade Panel */}
      {showUpgradePanel && status.upgradeAvailable && (
        <UpgradePanel
          currentTier={status.tier as UserTier}
          budgetState={status.budgetState}
          queriesRemaining={status.queriesRemaining}
          queriesTotal={status.queriesTotal}
          onUpgrade={(tier) => {
            onUpgrade?.(tier)
            setShowUpgradePanel(false)
          }}
          onDismiss={() => setShowUpgradePanel(false)}
        />
      )}
    </div>
  )
}

/**
 * Upgrade Panel - Inline upgrade prompt with OSQR's voice
 * Follows conversion spec: "Companion suggesting, not vendor selling"
 */
interface UpgradePanelProps {
  currentTier: UserTier
  budgetState: BudgetStatus["budgetState"]
  queriesRemaining: number
  queriesTotal: number
  onUpgrade: (tier: UserTier) => void
  onDismiss: () => void
}

function UpgradePanel({
  currentTier,
  budgetState,
  queriesRemaining,
  queriesTotal,
  onUpgrade,
  onDismiss,
}: UpgradePanelProps) {
  const recommendedTier = getRecommendedUpgradeTier(currentTier)
  const tierInfo = TIER_INFO[recommendedTier]

  // OSQR's voice - matches conversion spec messaging
  const getMessage = () => {
    if (budgetState === "depleted") {
      return CONVERSION_MESSAGES.limit_hit("queries", recommendedTier)
    }
    if (budgetState === "warning") {
      return `${queriesRemaining} queries left today. ${tierInfo.displayName} gets ${
        recommendedTier === "master" ? "unlimited" : "100"
      }.`
    }
    return `Upgrade to unlock more capacity.`
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="h-4 w-4" />
          <span className="font-semibold">{tierInfo.displayName}</span>
          <span className="ml-auto">${tierInfo.price}/mo</span>
        </div>
        <p className="text-sm text-white/90">{getMessage()}</p>
      </div>

      {/* Features */}
      <div className="p-3 space-y-1.5">
        {tierInfo.features.slice(0, 3).map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <Zap className="h-3 w-3 text-purple-500 flex-shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {/* Founder pricing note */}
      {tierInfo.isFounderPricing && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-amber-600 dark:text-amber-400">
            Founder pricing: locks in at ${tierInfo.price}/mo forever
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="p-3 pt-0 flex gap-2">
        <Button
          onClick={() => onUpgrade(recommendedTier)}
          size="sm"
          className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-xs"
        >
          Upgrade
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
        <Button
          onClick={onDismiss}
          size="sm"
          variant="ghost"
          className="text-xs"
        >
          Not now
        </Button>
      </div>
    </div>
  )
}
