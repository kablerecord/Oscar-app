'use client'

import { useFounderStatus } from '@/lib/hooks/useFounderStatus'
import { Sparkles, Loader2 } from 'lucide-react'

/**
 * FounderCountdown Component
 * Displays the number of founder spots remaining with locked pricing
 */
export function FounderCountdown() {
  const { spotsRemaining, isFounderPeriodActive, isLoading, error } = useFounderStatus()

  // Don't show if founder period is over
  if (!isFounderPeriodActive && !isLoading) {
    return null
  }

  return (
    <div className="founder-countdown bg-gradient-to-r from-purple-600/90 to-pink-600/90 rounded-xl p-5 text-white text-center shadow-lg shadow-purple-500/20 border border-purple-400/20">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-yellow-300" />
        <span className="text-sm font-semibold uppercase tracking-wide text-purple-100">
          Founder Edition
        </span>
        <Sparkles className="h-5 w-5 text-yellow-300" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : error ? (
        <>
          <span className="text-4xl font-bold">500</span>
          <span className="block text-lg font-medium mt-1">founder spots available</span>
        </>
      ) : (
        <>
          <span className="text-4xl font-bold">{spotsRemaining}</span>
          <span className="text-lg font-medium"> of 500</span>
          <span className="block text-lg font-medium mt-1">founder spots remaining</span>
        </>
      )}

      <div className="mt-3 pt-3 border-t border-white/20">
        <span className="block text-sm font-medium text-purple-100">
          Lock in <span className="text-white font-bold">$39/mo Pro</span> or{' '}
          <span className="text-white font-bold">$119/mo Master</span> for life
        </span>
        <span className="block text-xs text-purple-200 mt-1">
          Price increases to $49/$149 after 500 founders
        </span>
      </div>
    </div>
  )
}
