'use client'

import { useState, useEffect } from 'react'
import { X, Minus, Send, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ProfileQuestion } from '@/lib/profile/questions'

interface CompanionBubbleProps {
  isOpen: boolean
  question: ProfileQuestion | null
  answeredCount: number
  totalQuestions: number
  onAnswer: (answer: string) => Promise<void>
  onSkip: () => void
  onClose: () => void
  // New props for checklist/contextual awareness
  pendingItems?: { type: string; message: string }[]
  userName?: string
  // Always show the minimized bubble, even when not "open"
  alwaysVisible?: boolean
}

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Hey there, night owl'
}

// Get friendly intro message based on context
function getIntroMessage(
  answeredCount: number,
  totalQuestions: number,
  pendingItems?: { type: string; message: string }[],
  userName?: string
): { greeting: string; message: string } {
  const greeting = getGreeting()
  const name = userName ? `, ${userName}` : ''

  // If there are pending checklist items, mention those
  if (pendingItems && pendingItems.length > 0) {
    return {
      greeting: `${greeting}${name}!`,
      message: `You have ${pendingItems.length} thing${pendingItems.length > 1 ? 's' : ''} we should go over when you have a moment.`
    }
  }

  // Conversational messages - not "building profile"
  if (answeredCount === 0) {
    return {
      greeting: `${greeting}${name}!`,
      message: "I'd love to get to know you a bit. Mind if I ask a few questions?"
    }
  }

  if (answeredCount < 3) {
    return {
      greeting: `${greeting}${name}!`,
      message: "Great start! A couple more and I'll have a much better sense of who you are."
    }
  }

  if (answeredCount < 5) {
    return {
      greeting: `Hey${name}!`,
      message: "We're getting somewhere! One more quick one..."
    }
  }

  if (answeredCount < 10) {
    return {
      greeting: `${greeting}${name}!`,
      message: "Nice, I'm learning a lot about you. Quick question..."
    }
  }

  if (answeredCount < totalQuestions * 0.75) {
    return {
      greeting: `Hey${name}!`,
      message: "You're really helping me understand you better. One more?"
    }
  }

  if (answeredCount < totalQuestions) {
    return {
      greeting: `${greeting}${name}!`,
      message: "Almost there! Just a few more and I'll really know my stuff."
    }
  }

  return {
    greeting: `${greeting}${name}!`,
    message: "I feel like I know you pretty well now. Ready when you are!"
  }
}

// Conversational question rewrites - make them feel like a friend asking
function getConversationalQuestion(question: ProfileQuestion): string {
  const rewrites: Record<string, string> = {
    'personal-name': "What should I call you?",
    'personal-industry': "What kind of work do you do?",
    'personal-role': "And what's your role?",
    'personal-experience': "How long have you been doing this?",
    'personal-location': "Where are you based?",
    'goals-primary': "What's the big thing you're focused on right now?",
    'goals-building': "What are you trying to build or create?",
    'goals-challenge': "What's getting in your way?",
    'goals-timeline': "What's your timeline looking like?",
    'goals-success': "What would a win look like in 6 months?",
    'context-project': "What projects are on your plate?",
    'context-audience': "Who are you building this for?",
    'context-company': "Are you solo, at a company, or building something?",
    'context-team': "Working with a team?",
    'context-skills': "What are you really good at?",
    'context-learning': "What are you trying to get better at?",
    'prefs-detail-level': "Do you like the quick version or the full story?",
    'prefs-tone': "How should I talk to you - casual, professional, or somewhere in between?",
    'v1-working-on': "So, what are you working on?",
    'v1-goal': "What's the main thing you're trying to accomplish?",
    'v1-constraint': "What's the biggest thing slowing you down?",
  }

  return rewrites[question.id] || question.question
}

export function CompanionBubble({
  isOpen,
  question,
  answeredCount,
  totalQuestions,
  onAnswer,
  onSkip,
  onClose,
  pendingItems,
  userName,
  alwaysVisible = false,
}: CompanionBubbleProps) {
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showIntro, setShowIntro] = useState(true)

  // Reset answer when question changes
  useEffect(() => {
    setAnswer('')
  }, [question?.id])

  // Show intro when bubble opens - user must click to proceed
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setShowIntro(true)
    }
  }, [isOpen, isMinimized])

  if (!isOpen) return null

  const { greeting, message } = getIntroMessage(answeredCount, totalQuestions, pendingItems, userName)

  const handleSubmit = async () => {
    if (!answer.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAnswer(answer.trim())
      setAnswer('')
      setShowIntro(true) // Show intro again for next question
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Minimized pill - always visible when alwaysVisible is true, subtle pulse to remind user
  const showMinimizedPill = isMinimized || (!isOpen && alwaysVisible)

  if (showMinimizedPill) {
    return (
      <button
        onClick={() => {
          setIsMinimized(false)
          // If we're clicking from fully closed state, we need the parent to open us
          if (!isOpen && question) {
            // The button click will draw attention, the subtle glow animates
          }
        }}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-purple-500 p-3 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl animate-subtle-pulse"
        title="Chat with OSQR"
      >
        <MessageCircle className="h-5 w-5" />
        {answeredCount < totalQuestions && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full bg-white shadow-sm" />
        )}
      </button>
    )
  }

  // If not open and not alwaysVisible, don't render anything
  if (!isOpen) return null

  // Full bubble - chat-like, not form-like
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Speech bubble shape with OSQR gradient glow */}
      <div className="relative rounded-[28px] bg-white dark:bg-slate-900 ring-1 ring-blue-500/30 dark:ring-blue-400/30 shadow-lg shadow-blue-500/10 dark:shadow-blue-500/20">
        {/* Minimal header - just close buttons, no formal header bar */}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 z-10">
          <button
            onClick={() => setIsMinimized(true)}
            className="cursor-pointer rounded-full p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500 dark:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-400"
            aria-label="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500 dark:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-400"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Chat content area */}
        <div className="px-5 py-5">
          {/* OSQR's message bubble */}
          <div className="mb-4">
            {showIntro ? (
              // Intro greeting with action buttons
              <div className="animate-in fade-in duration-500">
                <p className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                  {greeting}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                  {message}
                </p>
                {question && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setShowIntro(false)}
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                      Sure, let's do it
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                )}
              </div>
            ) : question ? (
              // Question
              <div className="animate-in fade-in duration-300">
                <p className="text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed">
                  {getConversationalQuestion(question)}
                </p>
              </div>
            ) : (
              // All done
              <div className="animate-in fade-in duration-300">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  All caught up! I'm here when you need me.
                </p>
              </div>
            )}
          </div>

          {/* Input area - only show when there's a question and not showing intro */}
          {question && !showIntro && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {question.type === 'choice' && question.choices ? (
                // Choice buttons
                <div className="space-y-2 mb-3">
                  {question.choices.map((choice) => (
                    <button
                      key={choice}
                      onClick={() => setAnswer(choice)}
                      disabled={isSubmitting}
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-all ${
                        answer === choice
                          ? 'bg-blue-500 text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                // Text input
                <div className="relative mb-3">
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer..."
                    rows={2}
                    disabled={isSubmitting}
                    className="pr-10 resize-none rounded-xl border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:border-blue-400 focus:ring-blue-400 dark:border-neutral-700 dark:bg-neutral-800"
                    autoFocus
                  />
                  {answer.trim() && (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="absolute bottom-2 right-2 rounded-full bg-blue-500 p-1.5 text-white transition-all hover:bg-blue-600 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={onSkip}
                  disabled={isSubmitting}
                  className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  Skip this one
                </button>
                {question.type === 'choice' && answer && (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    size="sm"
                    className="rounded-full bg-blue-500 hover:bg-blue-600 text-xs px-4"
                  >
                    {isSubmitting ? 'Saving...' : 'Continue'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
