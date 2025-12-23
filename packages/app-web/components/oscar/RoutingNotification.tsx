'use client'

import { useState, useEffect } from 'react'
import { X, Info, Check, RotateCcw, Zap, Brain, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RoutingInfo {
  autoRouted: boolean
  autoRoutedReason: string
  requestedMode: 'quick' | 'thoughtful' | 'contemplate'
  effectiveMode: 'quick' | 'thoughtful' | 'contemplate'
  questionType: string
  complexity: number
}

interface RoutingNotificationProps {
  routing: RoutingInfo | null
  onDismiss: () => void
  onRequestOriginalMode?: () => void // Callback to re-ask with original mode
  className?: string
}

const MODE_ICONS = {
  quick: Zap,
  thoughtful: Brain,
  contemplate: GraduationCap,
}

const MODE_LABELS = {
  quick: 'Quick',
  thoughtful: 'Thoughtful',
  contemplate: 'Contemplate',
}

export function RoutingNotification({
  routing,
  onDismiss,
  onRequestOriginalMode,
  className,
}: RoutingNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (routing?.autoRouted) {
      // Slight delay before showing to let the response appear first
      const showTimer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(showTimer)
    } else {
      setIsVisible(false)
    }
  }, [routing])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsExiting(false)
      setIsVisible(false)
      onDismiss()
    }, 200)
  }

  const handleRequestOriginal = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsExiting(false)
      setIsVisible(false)
      onRequestOriginalMode?.()
    }, 200)
  }

  if (!routing?.autoRouted || !isVisible) {
    return null
  }

  const RequestedIcon = MODE_ICONS[routing.requestedMode]
  const EffectiveIcon = MODE_ICONS[routing.effectiveMode]
  const wasDowngraded = routing.requestedMode !== 'quick' && routing.effectiveMode === 'quick'
  const wasUpgraded = routing.requestedMode === 'quick' && routing.effectiveMode !== 'quick'

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg',
        'px-4 py-3 max-w-md',
        'transition-all duration-200',
        isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Info className="h-5 w-5 text-blue-500" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Mode change indicator */}
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <span className="flex items-center gap-1 text-muted-foreground">
              <RequestedIcon className="h-3.5 w-3.5" />
              {MODE_LABELS[routing.requestedMode]}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className={cn(
              'flex items-center gap-1',
              wasDowngraded ? 'text-green-600' : 'text-blue-600'
            )}>
              <EffectiveIcon className="h-3.5 w-3.5" />
              {MODE_LABELS[routing.effectiveMode]}
            </span>
          </div>

          {/* Reason */}
          <p className="text-sm text-muted-foreground leading-snug">
            {routing.autoRoutedReason}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-7 px-2 text-xs"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Got it
            </Button>

            {onRequestOriginalMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRequestOriginal}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Use {MODE_LABELS[routing.requestedMode]} anyway
              </Button>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-6 w-6 flex-shrink-0 -mr-1 -mt-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
