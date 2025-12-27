'use client'

import { useState } from 'react'
import { MessageCircle, X, Loader2, ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface FeedbackButtonProps {
  workspaceId?: string
  responseMode?: string
  // Position config
  position?: 'bottom-right' | 'bottom-left' | 'inline'
}

type FeedbackStep = 'button' | 'form' | 'submitted'

/**
 * FeedbackButton Component
 *
 * Part of the training pattern: Add button, but train users toward natural language.
 * When clicked, shows a hint that users can just say "leave feedback" in chat.
 *
 * Success metric: Natural language feedback > button feedback (10:1 ratio removes button)
 *
 * @see docs/builds/V1_POLISH_BUILD_PLAN.md
 */
export function FeedbackButton({
  workspaceId,
  responseMode,
  position = 'bottom-right',
}: FeedbackButtonProps) {
  const [step, setStep] = useState<FeedbackStep>('button')
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTip, setShowTip] = useState(false)

  const handleButtonClick = async () => {
    // Track button click
    try {
      await fetch('/api/telemetry/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'feedback_button_clicked',
          data: {},
        }),
      })
    } catch {
      // Silent fail - don't block UX
    }

    // Show tip first, then form
    setShowTip(true)
    setTimeout(() => {
      setShowTip(false)
      setStep('form')
    }, 3000)
  }

  const handleSubmit = async () => {
    if (!sentiment && !message.trim()) return

    setIsSubmitting(true)

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'BUTTON',
          sentiment: sentiment || undefined,
          message: message.trim() || undefined,
          workspaceId,
          responseMode,
        }),
      })

      setStep('submitted')

      // Reset after delay
      setTimeout(() => {
        setStep('button')
        setSentiment(null)
        setMessage('')
      }, 2000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep('button')
    setSentiment(null)
    setMessage('')
    setShowTip(false)
  }

  // Position classes
  const positionClasses =
    position === 'bottom-right'
      ? 'fixed bottom-6 right-6'
      : position === 'bottom-left'
      ? 'fixed bottom-6 left-6'
      : 'relative'

  return (
    <TooltipProvider>
      <div className={`z-40 ${positionClasses}`}>
        {/* Tip Toast */}
        {showTip && (
          <div className="absolute bottom-14 right-0 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 shadow-xl max-w-xs">
              <p className="text-sm text-neutral-200">
                <span className="text-cyan-400 font-medium">Tip:</span> You can also just tell OSQR{' '}
                <span className="text-cyan-300">&quot;I want to leave feedback&quot;</span> anytime in the chat.
              </p>
            </div>
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-neutral-800 border-b border-r border-neutral-700 transform rotate-45" />
          </div>
        )}

        {/* Button State */}
        {step === 'button' && !showTip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleButtonClick}
                className="p-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-full shadow-lg transition-all hover:scale-105 group"
              >
                <MessageCircle className="h-5 w-5 text-neutral-400 group-hover:text-cyan-400 transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-neutral-800 border-neutral-700">
              <p className="text-xs">Leave feedback</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Tip showing with button visible but disabled */}
        {showTip && (
          <button
            disabled
            className="p-3 bg-neutral-800 border border-cyan-500/50 rounded-full shadow-lg cursor-default"
          >
            <MessageCircle className="h-5 w-5 text-cyan-400" />
          </button>
        )}

        {/* Form State */}
        {step === 'form' && (
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-4 w-72 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Share Feedback</h3>
              <button
                onClick={handleClose}
                className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sentiment Selection */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSentiment(sentiment === 'positive' ? null : 'positive')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                  sentiment === 'positive'
                    ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                <span className="text-sm">Good</span>
              </button>
              <button
                onClick={() => setSentiment(sentiment === 'negative' ? null : 'negative')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                  sentiment === 'negative'
                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
                <span className="text-sm">Bad</span>
              </button>
            </div>

            {/* Message Input */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us more (optional)..."
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
              rows={3}
            />

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!sentiment && !message.trim())}
              className="w-full mt-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </div>
        )}

        {/* Submitted State */}
        {step === 'submitted' && (
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-4 w-72 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex flex-col items-center py-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-white font-medium">Thank you!</p>
              <p className="text-sm text-neutral-400 mt-1">Your feedback helps us improve.</p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
