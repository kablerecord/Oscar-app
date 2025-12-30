'use client'

import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, Target, MessageSquare, Beaker, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuickReactionExpanded } from './QuickReactionExpanded'
import { ReactionType } from '@/lib/lab/types'

const WIDGET_SEEN_KEY = 'osqr_reaction_widget_seen'
const NUDGE_DISMISSED_KEY = 'osqr_reaction_nudge_dismissed'
const LAB_PROMPTS_DISABLED_KEY = 'osqr_lab_prompts_disabled'

interface QuickReactionWidgetProps {
  messageId: string
  threadId?: string
  responseMode?: string
  modelUsed?: string
  hadPanelDiscussion?: boolean
  retrievalUsed?: boolean
  onReactionSubmit?: (reaction: ReactionType) => void
}

export function QuickReactionWidget({
  messageId,
  threadId,
  responseMode,
  modelUsed,
  hadPanelDiscussion = false,
  retrievalUsed = false,
  onReactionSubmit,
}: QuickReactionWidgetProps) {
  const [submitted, setSubmitted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [selectedReaction, setSelectedReaction] = useState<ReactionType | null>(null)
  const [isLabMember, setIsLabMember] = useState<boolean | null>(null)
  const [showNudge, setShowNudge] = useState(false)

  // Check if we should show the enhanced nudge for non-members
  useEffect(() => {
    // Check if prompts are globally disabled
    const promptsDisabled = localStorage.getItem(LAB_PROMPTS_DISABLED_KEY) === 'true'
    if (promptsDisabled) return

    const seenCount = parseInt(localStorage.getItem(WIDGET_SEEN_KEY) || '0', 10)
    const nudgeDismissed = localStorage.getItem(NUDGE_DISMISSED_KEY)

    // Show nudge on 3rd, 5th, 10th view if not dismissed
    if (!nudgeDismissed && [3, 5, 10].includes(seenCount + 1)) {
      setShowNudge(true)
    }

    // Increment seen count
    localStorage.setItem(WIDGET_SEEN_KEY, String(seenCount + 1))
  }, [])

  const submitReaction = async (
    reaction: ReactionType,
    category?: string,
    comment?: string
  ) => {
    try {
      const response = await fetch('/api/lab/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          threadId,
          reaction,
          category,
          comment,
          responseMode,
          modelUsed,
          hadPanelDiscussion,
          retrievalUsed,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setExpanded(false)
        onReactionSubmit?.(reaction)
      } else if (response.status === 404) {
        // Not a lab member
        setIsLabMember(false)
      }
    } catch (error) {
      console.error('Failed to submit reaction:', error)
    }
  }

  const handleQuickReaction = (reaction: ReactionType) => {
    if (reaction === 'THUMBS_DOWN' || reaction === 'MISSED_SOMETHING') {
      setSelectedReaction(reaction)
      setExpanded(true)
    } else {
      submitReaction(reaction)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <span className="text-green-400">Thanks for your feedback!</span>
      </div>
    )
  }

  const dismissNudge = () => {
    localStorage.setItem(NUDGE_DISMISSED_KEY, 'true')
    setShowNudge(false)
  }

  if (isLabMember === false) {
    // Check if prompts are globally disabled - hide everything if so
    const promptsDisabled = typeof window !== 'undefined' && localStorage.getItem(LAB_PROMPTS_DISABLED_KEY) === 'true'
    if (promptsDisabled) {
      return null
    }

    // Show enhanced nudge on specific views
    if (showNudge) {
      return (
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700/30 rounded-lg p-3 my-2">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
              <Beaker className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">Was this response helpful?</span>
                <button onClick={dismissNudge} className="text-gray-500 hover:text-gray-300 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-2">
                Join Oscar Lab to share feedback and help shape OSQR.
              </p>
              <a
                href="/lab"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                Join the Lab <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <a href="/lab" className="text-blue-400 hover:underline">
          Join Oscar Lab
        </a>
        <span>to share feedback</span>
      </div>
    )
  }

  if (expanded && selectedReaction) {
    return (
      <QuickReactionExpanded
        reaction={selectedReaction}
        onSubmit={(category, comment) =>
          submitReaction(selectedReaction, category, comment)
        }
        onCancel={() => {
          setExpanded(false)
          setSelectedReaction(null)
        }}
      />
    )
  }

  return (
    <div className="flex items-center gap-1 py-1">
      <span className="text-xs text-gray-500 mr-2">Was this helpful?</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-gray-400 hover:text-green-400 hover:bg-green-900/20"
        onClick={() => handleQuickReaction('THUMBS_UP')}
        title="Helpful"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
        onClick={() => handleQuickReaction('THUMBS_DOWN')}
        title="Not helpful"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-gray-400 hover:text-amber-400 hover:bg-amber-900/20 text-xs"
        onClick={() => handleQuickReaction('MISSED_SOMETHING')}
        title="Missed something"
      >
        <Target className="h-3 w-3 mr-1" />
        Missed
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20"
        onClick={() => {
          setSelectedReaction('THUMBS_UP')
          setExpanded(true)
        }}
        title="Add note"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
    </div>
  )
}
