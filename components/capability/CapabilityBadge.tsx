'use client'

import { cn } from '@/lib/utils'
import { getLevelDetails, getStageInfo, type CapabilityStage } from '@/lib/capability/levels'

interface CapabilityBadgeProps {
  level: number
  showName?: boolean
  showStage?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const stageColors: Record<CapabilityStage, string> = {
  foundation: 'bg-slate-100 text-slate-700 border-slate-300',
  operator: 'bg-blue-100 text-blue-700 border-blue-300',
  creator: 'bg-purple-100 text-purple-700 border-purple-300',
  architect: 'bg-amber-100 text-amber-700 border-amber-300',
}

const stageGradients: Record<CapabilityStage, string> = {
  foundation: 'from-slate-400 to-slate-600',
  operator: 'from-blue-400 to-blue-600',
  creator: 'from-purple-400 to-purple-600',
  architect: 'from-amber-400 to-amber-600',
}

export function CapabilityBadge({
  level,
  showName = true,
  showStage = false,
  size = 'md',
  className,
}: CapabilityBadgeProps) {
  const levelDetails = getLevelDetails(level)
  const stage = levelDetails?.stage || 'foundation'
  const stageInfo = getStageInfo(stage)

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  const levelSizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border',
        stageColors[stage],
        sizeClasses[size],
        className
      )}
    >
      {/* Level number badge */}
      <span
        className={cn(
          'flex items-center justify-center rounded-full font-bold text-white bg-gradient-to-br',
          stageGradients[stage],
          levelSizeClasses[size]
        )}
      >
        {level}
      </span>

      {/* Level name */}
      {showName && levelDetails && (
        <span className="font-medium">{levelDetails.name}</span>
      )}

      {/* Stage indicator */}
      {showStage && stageInfo && (
        <span className="text-xs opacity-75">({stageInfo.name})</span>
      )}
    </div>
  )
}

/**
 * Compact version showing just the level number
 */
export function CapabilityLevelIndicator({
  level,
  size = 'md',
  className,
}: {
  level: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const levelDetails = getLevelDetails(level)
  const stage = levelDetails?.stage || 'foundation'

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold text-white bg-gradient-to-br shadow-sm',
        stageGradients[stage],
        sizeClasses[size],
        className
      )}
      title={levelDetails ? `Level ${level}: ${levelDetails.name}` : `Level ${level}`}
    >
      {level}
    </div>
  )
}
