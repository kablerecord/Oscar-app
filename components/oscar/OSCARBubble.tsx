'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Minus, Send, MessageCircle, Brain, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ProfileQuestion } from '@/lib/profile/questions'
import {
  type OnboardingState,
  type OnboardingStage,
  OSCAR_MESSAGES,
  getInitialOnboardingState,
  progressOnboarding,
  getPersonalizedGreeting,
  shouldShowOnboarding,
  isIntroPhase,
} from '@/lib/onboarding/oscar-onboarding'

interface OSCARBubbleProps {
  // Onboarding state
  onboardingState: OnboardingState
  onOnboardingProgress: (newState: OnboardingState) => void

  // Profile questions (for after onboarding)
  profileQuestion?: ProfileQuestion | null
  answeredCount?: number
  totalQuestions?: number
  onProfileAnswer?: (answer: string) => Promise<void>
  onProfileSkip?: () => void

  // Mode discovery callbacks
  onModeChanged?: (mode: 'quick' | 'thoughtful' | 'contemplate') => void
  onQuestionAsked?: () => void

  // UI control
  alwaysVisible?: boolean
}

export function OSCARBubble({
  onboardingState,
  onOnboardingProgress,
  profileQuestion,
  answeredCount = 0,
  totalQuestions = 0,
  onProfileAnswer,
  onProfileSkip,
  onModeChanged,
  onQuestionAsked,
  alwaysVisible = true,
}: OSCARBubbleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Determine what to show in the bubble
  const isOnboarding = shouldShowOnboarding(onboardingState)
  const currentMessage = OSCAR_MESSAGES[onboardingState.stage]
  const isIntro = isIntroPhase(onboardingState)

  // Auto-open for onboarding stages that need attention
  useEffect(() => {
    // All active onboarding stages should auto-open
    if (isOnboarding) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        setIsMinimized(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [onboardingState.stage, isOnboarding])

  // Auto-advance for stages with autoAdvanceDelay
  useEffect(() => {
    if (isOpen && currentMessage?.autoAdvanceDelay && !isMinimized) {
      const timer = setTimeout(() => {
        onOnboardingProgress(
          progressOnboarding(onboardingState, { type: 'auto_advance' })
        )
      }, currentMessage.autoAdvanceDelay)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isMinimized, onboardingState.stage, currentMessage, onOnboardingProgress, onboardingState])

  // Handle answer submission (both onboarding and profile)
  const handleSubmit = useCallback(async () => {
    if (!answer.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      if (isOnboarding) {
        // Handle onboarding answer
        onOnboardingProgress(
          progressOnboarding(onboardingState, { type: 'answer', answer: answer.trim() })
        )
        setAnswer('')
      } else if (profileQuestion && onProfileAnswer) {
        // Handle profile question answer
        await onProfileAnswer(answer.trim())
        setAnswer('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [answer, isSubmitting, isOnboarding, onOnboardingProgress, onboardingState, profileQuestion, onProfileAnswer])

  // Handle choice selection (for onboarding)
  const handleChoiceSelect = (choice: string) => {
    onOnboardingProgress(
      progressOnboarding(onboardingState, { type: 'answer', answer: choice })
    )
  }

  // Handle skip
  const handleSkip = () => {
    if (isOnboarding) {
      onOnboardingProgress(
        progressOnboarding(onboardingState, { type: 'skip' })
      )
    } else if (onProfileSkip) {
      onProfileSkip()
    }
  }

  // Handle close
  const handleClose = () => {
    setIsOpen(false)
  }

  // Handle minimize
  const handleMinimize = () => {
    setIsMinimized(true)
  }

  // Handle pill click
  const handlePillClick = () => {
    setIsMinimized(false)
    setIsOpen(true)
  }

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Get the current message content
  const getMessage = () => {
    if (isOnboarding && currentMessage) {
      return {
        greeting: currentMessage.greeting || (onboardingState.userName ? getPersonalizedGreeting(onboardingState.userName) : undefined),
        message: currentMessage.message,
        subMessage: currentMessage.subMessage,
        inputType: currentMessage.inputType,
        choices: currentMessage.choices,
        showBrain: currentMessage.showBrain,
      }
    }

    // Profile question mode
    if (profileQuestion) {
      return {
        greeting: getPersonalizedGreeting(onboardingState.userName),
        message: getConversationalQuestion(profileQuestion),
        inputType: profileQuestion.type === 'choice' ? 'choice' : 'text',
        choices: profileQuestion.choices,
      }
    }

    // Idle state
    return {
      greeting: getPersonalizedGreeting(onboardingState.userName),
      message: "I'm here when you need me!",
      inputType: 'none' as const,
    }
  }

  const content = getMessage()
  const showInput = content.inputType !== 'none'
  const hasUnansweredQuestions = answeredCount < totalQuestions

  // Show minimized pill when closed or minimized
  if (!isOpen || isMinimized) {
    if (!alwaysVisible && !isOnboarding) return null

    return (
      <button
        onClick={handlePillClick}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2.5 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl animate-subtle-pulse"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          {isOnboarding ? "Hey there!" : "Chat with OSQR"}
        </span>
        {(isOnboarding || hasUnansweredQuestions) && (
          <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
        )}
      </button>
    )
  }

  // Check if this is a "hero" stage (welcome, explain_purpose, explain_how)
  const isHeroStage = ['welcome', 'explain_purpose', 'explain_how'].includes(onboardingState.stage)

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative overflow-hidden rounded-[28px] bg-slate-900 shadow-xl shadow-blue-500/10 border border-slate-700/50">
        {/* Animated background blobs */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Header buttons - only show minimize during onboarding intro, show close later */}
        <div className="absolute top-3 right-3 flex items-center gap-0.5 z-10">
          <button
            onClick={handleMinimize}
            className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
            aria-label="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          {!isIntro && (
            <button
              onClick={handleClose}
              className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Chat content */}
        <div className="relative px-5 py-5">
          {/* Hero stages - centered with brain icon */}
          {isHeroStage ? (
            <div className="flex flex-col items-center text-center animate-in fade-in duration-500">
              {/* Brain icon with glow */}
              {content.showBrain && (
                <div className="relative mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 animate-pulse-glow">
                    <Brain className="h-7 w-7 text-blue-400" />
                  </div>
                  <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-blue-400" />
                </div>
              )}

              {/* Greeting */}
              {content.greeting && (
                <p className="text-sm text-slate-400 mb-1">{content.greeting}</p>
              )}

              {/* Main message */}
              <h3 className="mb-2 text-lg font-bold text-white">
                {onboardingState.stage === 'welcome' ? (
                  <>I'm <span className="shimmer-text">OSQR</span> — your AI thinking partner.</>
                ) : (
                  content.message
                )}
              </h3>

              {/* Sub message */}
              {content.subMessage && (
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  {content.subMessage}
                </p>
              )}

              {/* Choice buttons */}
              {content.choices && content.choices.length > 0 && (
                <div className="w-full space-y-2">
                  {content.choices.map((choice) => (
                    <button
                      key={choice}
                      onClick={() => handleChoiceSelect(choice)}
                      disabled={isSubmitting}
                      className="w-full rounded-xl px-4 py-3 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Regular stages - left-aligned conversation style */
            <>
              {/* OSQR's message */}
              <div className="mb-4 animate-in fade-in duration-500">
                {content.greeting && (
                  <p className="text-base font-medium text-white mb-1">
                    {content.greeting}
                  </p>
                )}
                <p className="text-sm text-slate-300 leading-relaxed">
                  {content.message}
                </p>
                {content.subMessage && (
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                    {content.subMessage}
                  </p>
                )}
              </div>

              {/* Input area */}
              {showInput && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {content.inputType === 'choice' && content.choices ? (
                    // Choice buttons
                    <div className="space-y-2 mb-3">
                      {content.choices.map((choice) => (
                        <button
                          key={choice}
                          onClick={() => handleChoiceSelect(choice)}
                          disabled={isSubmitting}
                          className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-all ${
                            answer === choice
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 ring-1 ring-slate-700'
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
                        className="pr-10 resize-none rounded-xl border-slate-700 bg-slate-800 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
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

                  {/* Skip option (only for certain stages) */}
                  {['get_name', 'get_working_on', 'get_challenge'].includes(onboardingState.stage) && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleSkip}
                        disabled={isSubmitting}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Skip for now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Auto-advancing indicator */}
              {currentMessage?.autoAdvanceDelay && !showInput && (
                <div className="flex items-center justify-center pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="flex space-x-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Conversational question rewrites for profile questions
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
