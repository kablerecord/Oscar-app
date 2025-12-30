'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X, Loader2, ThumbsUp, ThumbsDown, Check, Sparkles } from 'lucide-react'
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

type FeedbackStep = 'button' | 'teaching' | 'form' | 'submitted'

const STORAGE_KEY = 'osqr-feedback-tip-dismissed'

/**
 * FeedbackButton Component
 *
 * Part of the training pattern: Add button, but train users toward natural language.
 * When clicked for the first time, shows a gentle teaching modal explaining
 * that users can just talk to OSQR instead of using buttons.
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
  const [hasSeenTip, setHasSeenTip] = useState(true) // Default true to avoid flash
  const [dontShowAgain, setDontShowAgain] = useState(false)

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    setHasSeenTip(dismissed === 'true')
  }, [])

  const handleButtonClick = async () => {
    // Track button click
    try {
      await fetch('/api/telemetry/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'feedback_button_clicked',
          data: { hasSeenTip },
        }),
      })
    } catch {
      // Silent fail - don't block UX
    }

    // Show teaching modal if user hasn't dismissed it permanently
    if (!hasSeenTip) {
      setStep('teaching')
    } else {
      setStep('form')
    }
  }

  const handleTeachingContinue = () => {
    // Save preference if checkbox was checked
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setHasSeenTip(true)
    }
    setStep('form')
  }

  const handleTeachingDismiss = () => {
    // Save preference if checkbox was checked
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setHasSeenTip(true)
    }
    setStep('button')
    setDontShowAgain(false)
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
    setDontShowAgain(false)
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
        {/* Button State */}
        {step === 'button' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleButtonClick}
                className="p-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-full shadow-lg transition-all hover:scale-105 group cursor-pointer"
              >
                <MessageCircle className="h-5 w-5 text-neutral-400 group-hover:text-cyan-400 transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-neutral-800 border-neutral-700">
              <p className="text-xs">Leave feedback</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Teaching Modal - Gentle explanation about natural language */}
        {step === 'teaching' && (
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-5 w-80 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {/* Header with icon */}
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-cyan-500/10 rounded-lg shrink-0">
                <Sparkles className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Quick tip</h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  You can share feedback just by talking to me. Try saying things like:
                </p>
              </div>
            </div>

            {/* Example phrases */}
            <div className="space-y-2 mb-4 ml-11">
              <p className="text-sm text-cyan-300">&quot;I want to leave some feedback&quot;</p>
              <p className="text-sm text-cyan-300">&quot;That response was really helpful&quot;</p>
              <p className="text-sm text-cyan-300">&quot;This isn&apos;t working for me&quot;</p>
            </div>

            <p className="text-sm text-neutral-400 mb-4 ml-11">
              I&apos;ll take care of the rest.
            </p>

            {/* Don't show again checkbox */}
            <label className="flex items-center gap-2 mb-4 ml-11 cursor-pointer group">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">
                Got it, don&apos;t show this again
              </span>
            </label>

            {/* Action buttons */}
            <div className="flex gap-2 ml-11">
              <button
                onClick={handleTeachingDismiss}
                className="flex-1 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleTeachingContinue}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Use form anyway
              </button>
            </div>
          </div>
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
