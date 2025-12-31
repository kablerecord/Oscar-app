'use client'

import * as React from 'react'
import { CheckCircle2, X, Clock, AlertCircle, Lightbulb, Bell, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tokens } from '@/lib/design-system/tokens'
import { Button } from '@/components/ui/button'

export interface BubbleSuggestionProps {
  suggestion: {
    id: string
    commitmentId?: string
    title: string
    body: string
    priority: number
    actions: string[] // ['act', 'dismiss', 'snooze']
    type?: 'reminder' | 'insight' | 'suggestion' | 'notification'
  }
  onAction: (action: string, suggestionId: string, commitmentId?: string) => void
  isLoading?: boolean
  disabled?: boolean
}

const priorityStyles = {
  high: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/5',
    glow: 'shadow-amber-500/20',
    icon: 'text-amber-400',
  },
  medium: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    glow: 'shadow-blue-500/10',
    icon: 'text-blue-400',
  },
  low: {
    border: 'border-slate-600/30',
    bg: 'bg-slate-800/50',
    glow: 'shadow-slate-500/5',
    icon: 'text-slate-400',
  },
}

const typeIcons = {
  reminder: AlertCircle,
  insight: Lightbulb,
  suggestion: Bell,
  notification: Bell,
}

const actionConfig = {
  act: {
    label: 'Act',
    icon: CheckCircle2,
    variant: 'default' as const,
  },
  dismiss: {
    label: 'Dismiss',
    icon: X,
    variant: 'ghost' as const,
  },
  snooze: {
    label: 'Snooze',
    icon: Clock,
    variant: 'secondary' as const,
  },
}

export function BubbleSuggestion({
  suggestion,
  onAction,
  isLoading = false,
  disabled = false,
}: BubbleSuggestionProps) {
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null)

  // Determine priority level
  const priorityLevel = suggestion.priority >= 8 ? 'high' : suggestion.priority >= 5 ? 'medium' : 'low'
  const styles = priorityStyles[priorityLevel]

  // Get type icon
  const TypeIcon = typeIcons[suggestion.type || 'notification']

  const handleAction = async (action: string) => {
    if (isLoading || disabled || loadingAction) return

    setLoadingAction(action)
    try {
      await onAction(action, suggestion.id, suggestion.commitmentId)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 transition-all duration-300',
        'hover:shadow-lg',
        styles.border,
        styles.bg,
        styles.glow,
        disabled && 'opacity-50 pointer-events-none'
      )}
      role="article"
      aria-label={`Suggestion: ${suggestion.title}`}
    >
      {/* Priority indicator bar */}
      {priorityLevel === 'high' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-xl" />
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('p-2 rounded-lg bg-slate-800/50', styles.icon)}>
          <TypeIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-100 text-sm leading-tight">
            {suggestion.title}
          </h3>
          {priorityLevel === 'high' && (
            <span className="text-xs text-amber-400 font-medium">Urgent</span>
          )}
        </div>
      </div>

      {/* Body */}
      <p className="text-sm text-slate-300 mb-4 leading-relaxed">
        {suggestion.body}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {suggestion.actions.map((action) => {
          const config = actionConfig[action as keyof typeof actionConfig]
          if (!config) return null

          const Icon = config.icon
          const isCurrentLoading = loadingAction === action

          return (
            <Button
              key={action}
              variant={config.variant}
              size="sm"
              onClick={() => handleAction(action)}
              disabled={disabled || isLoading || !!loadingAction}
              className={cn(
                'gap-1.5',
                action === 'act' && priorityLevel === 'high' && 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
              )}
            >
              {isCurrentLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              {config.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export default BubbleSuggestion
