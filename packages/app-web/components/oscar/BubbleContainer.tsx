'use client'

import * as React from 'react'
import { RefreshCw, Bell, BellOff, ChevronDown, ChevronUp, Moon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tokens } from '@/lib/design-system/tokens'
import { Button } from '@/components/ui/button'
import { BubbleSuggestion } from './BubbleSuggestion'

interface Suggestion {
  id: string
  commitmentId?: string
  title: string
  body: string
  priority: number
  actions: string[]
  type?: 'reminder' | 'insight' | 'suggestion' | 'notification'
}

interface BubbleContainerProps {
  className?: string
  defaultExpanded?: boolean
  autoRefreshInterval?: number // in milliseconds, 0 to disable
}

interface DigestResponse {
  suggestions: Array<{
    id: string
    type: string
    commitment: {
      id: string
      what: string
      when: {
        rawText: string
        urgencyCategory: string
      }
    }
    priorityScore: number
    suggestedAction: string
  }>
  summary: string
  totalItems: number
  urgentCount: number
}

interface BubbleStateResponse {
  canShow: boolean
  isQuietHours?: boolean
  remainingBudget: number
  bubblesShownToday: number
}

export function BubbleContainer({
  className,
  defaultExpanded = true,
  autoRefreshInterval = 5 * 60 * 1000, // 5 minutes default
}: BubbleContainerProps) {
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  const [canShow, setCanShow] = React.useState(true)
  const [isQuietHours, setIsQuietHours] = React.useState(false)
  const [summary, setSummary] = React.useState<string>('')
  const [urgentCount, setUrgentCount] = React.useState(0)

  const fetchStartTime = React.useRef<number>(0)

  // Fetch suggestions from the digest API
  const fetchSuggestions = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    fetchStartTime.current = Date.now()

    try {
      // First check if we can show bubbles
      const stateRes = await fetch('/api/temporal/bubble-state')
      if (stateRes.ok) {
        const stateData: BubbleStateResponse = await stateRes.json()
        setCanShow(stateData.canShow)
        setIsQuietHours(stateData.isQuietHours || false)
      }

      // Fetch suggestions
      const res = await fetch('/api/temporal/digest')
      if (!res.ok) {
        if (res.status === 503) {
          // Feature disabled
          setSuggestions([])
          setSummary('Temporal Intelligence is disabled')
          return
        }
        throw new Error('Failed to fetch suggestions')
      }

      const data: DigestResponse = await res.json()

      // Transform API response to component format
      const transformedSuggestions: Suggestion[] = data.suggestions.map((s) => ({
        id: s.id,
        commitmentId: s.commitment.id,
        title: getTitleForUrgency(s.commitment.when.urgencyCategory),
        body: `${s.commitment.what} (${s.commitment.when.rawText})`,
        priority: Math.round(s.priorityScore * 10),
        actions: ['act', 'dismiss', 'snooze'],
        type: s.type === 'realtime' ? 'reminder' : 'suggestion',
      }))

      setSuggestions(transformedSuggestions)
      setSummary(data.summary)
      setUrgentCount(data.urgentCount)
    } catch (err) {
      console.error('[BubbleContainer] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load suggestions')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Initial fetch
  React.useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  // Auto-refresh
  React.useEffect(() => {
    if (autoRefreshInterval <= 0) return

    const interval = setInterval(() => {
      fetchSuggestions(true)
    }, autoRefreshInterval)

    return () => clearInterval(interval)
  }, [autoRefreshInterval, fetchSuggestions])

  // Refresh on window focus
  React.useEffect(() => {
    const handleFocus = () => {
      fetchSuggestions(true)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchSuggestions])

  // Handle action on a suggestion
  const handleAction = async (action: string, suggestionId: string, commitmentId?: string) => {
    const timeToEngagement = Date.now() - fetchStartTime.current

    try {
      const res = await fetch('/api/temporal/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentId: commitmentId || suggestionId,
          engagement: mapActionToEngagement(action),
          timeToEngagement,
        }),
      })

      if (!res.ok) {
        console.error('[BubbleContainer] Failed to record outcome')
      }

      // Remove suggestion from list on act or dismiss
      if (action === 'act' || action === 'dismiss') {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
      } else if (action === 'snooze') {
        // For snooze, we could move it to the end or temporarily hide it
        setSuggestions((prev) => {
          const idx = prev.findIndex((s) => s.id === suggestionId)
          if (idx === -1) return prev
          const snoozed = prev[idx]
          return [...prev.slice(0, idx), ...prev.slice(idx + 1), snoozed]
        })
      }
    } catch (err) {
      console.error('[BubbleContainer] Action error:', err)
    }
  }

  // Empty state
  if (!isLoading && suggestions.length === 0 && !error) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-slate-800/50 mb-3">
            <Bell className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-sm font-medium text-slate-300 mb-1">No pending suggestions</h3>
          <p className="text-xs text-slate-500 max-w-[200px]">
            {summary || 'Your commitments will appear here when detected in conversations.'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchSuggestions(true)}
            className="mt-4 text-slate-400"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  // Quiet hours state
  if (isQuietHours && !isLoading) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-purple-500/10 mb-3">
            <Moon className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-300 mb-1">Quiet Hours Active</h3>
          <p className="text-xs text-slate-500 max-w-[200px]">
            Suggestions are paused during quiet hours to avoid interruptions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-slate-700/50 cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">Suggestions</span>
          {urgentCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
              {urgentCount} urgent
            </span>
          )}
          {suggestions.length > 0 && urgentCount === 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-slate-700 text-slate-300 rounded-full">
              {suggestions.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              fetchSuggestions(true)
            }}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchSuggestions()}
                  className="mt-2 text-red-400 hover:text-red-300"
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {summary && (
                <p className="text-xs text-slate-400 px-1 mb-2">{summary}</p>
              )}
              {suggestions.map((suggestion) => (
                <BubbleSuggestion
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper functions
function getTitleForUrgency(urgencyCategory: string): string {
  switch (urgencyCategory) {
    case 'immediate':
      return 'Action Needed Now'
    case 'today':
      return 'Due Today'
    case 'this_week':
      return 'Coming Up This Week'
    case 'this_month':
      return 'This Month'
    default:
      return 'Reminder'
  }
}

function mapActionToEngagement(action: string): string {
  const map: Record<string, string> = {
    act: 'acted',
    dismiss: 'dismissed',
    snooze: 'snoozed',
    view: 'opened',
  }
  return map[action] || 'opened'
}

export default BubbleContainer
