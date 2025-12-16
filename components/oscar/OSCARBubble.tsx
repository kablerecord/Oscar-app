'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Minus, Send, MessageCircle, Brain, Sparkles, Lightbulb, ChevronRight, ArrowRight } from 'lucide-react'
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
import type { InsightCategory } from '@/lib/til/insight-queue'

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

  // Proactive insights
  workspaceId?: string

  // Focus mode integration - bubble goes dormant during focus
  isFocusMode?: boolean

  // Panel integration - for "Tell me more" flow
  onStartConversation?: (insight: PendingInsight) => void
}

/**
 * Bubble State Machine
 *
 * States:
 * - hidden: Bubble not visible (focus mode, etc.)
 * - idle: Blue pulse, waiting for insights or user
 * - holding: Has insight queued, amber pulse
 * - expanded: Showing insight message in bubble
 * - connected: Flowing into panel (insight became conversation)
 *
 * Transitions:
 * - hidden → idle: Focus mode ends
 * - idle → holding: Insight queued and engagement allows
 * - holding → expanded: User clicks bubble
 * - expanded → connected: User clicks "Tell me more"
 * - expanded → idle: User dismisses
 * - any → hidden: Focus mode starts
 */
type BubbleState = 'hidden' | 'idle' | 'holding' | 'expanded' | 'connected'

// Types for proactive insights - exported for use by parent components
export interface PendingInsight {
  id: string
  category: InsightCategory
  title: string
  message: string
  priority: number
  hasExpandedContent: boolean
}

// Category display config
const CATEGORY_CONFIG: Record<InsightCategory, { icon: string; label: string; color: string }> = {
  contradiction: { icon: '⚠️', label: 'Pattern noticed', color: 'text-amber-400' },
  clarify: { icon: '💡', label: 'Quick thought', color: 'text-blue-400' },
  next_step: { icon: '→', label: 'Next step', color: 'text-green-400' },
  recall: { icon: '💭', label: 'Remember', color: 'text-purple-400' },
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
  workspaceId,
  isFocusMode = false,
  onStartConversation,
}: OSCARBubbleProps) {
  // Legacy state (for onboarding compatibility)
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New state machine for proactive insights
  const [bubbleState, setBubbleState] = useState<BubbleState>('idle')
  const [pendingInsight, setPendingInsight] = useState<PendingInsight | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  // Engagement tracking
  const lastActivityRef = useRef<number>(Date.now())
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const typingVelocityRef = useRef<number[]>([]) // Recent keystroke timestamps
  const lastKeystrokeRef = useRef<number>(0)

  // Focus mode integration - go dormant when in focus mode
  useEffect(() => {
    if (isFocusMode) {
      setBubbleState('hidden')
    } else if (bubbleState === 'hidden') {
      // Coming out of focus mode - check for queued insights
      setBubbleState(pendingInsight ? 'holding' : 'idle')
    }
  }, [isFocusMode, bubbleState, pendingInsight])

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

  // Track activity for idle detection AND typing velocity for engagement
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const trackKeystroke = () => {
      const now = Date.now()
      lastActivityRef.current = now

      // Track typing velocity (rolling window of last 10 keystrokes)
      typingVelocityRef.current.push(now)
      if (typingVelocityRef.current.length > 10) {
        typingVelocityRef.current.shift()
      }
      lastKeystrokeRef.current = now
    }

    // Listen for user activity
    window.addEventListener('mousemove', updateActivity)
    window.addEventListener('keydown', trackKeystroke)
    window.addEventListener('click', updateActivity)

    return () => {
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', trackKeystroke)
      window.removeEventListener('click', updateActivity)
    }
  }, [])

  // Calculate current typing velocity (chars per second)
  const getTypingVelocity = useCallback(() => {
    const timestamps = typingVelocityRef.current
    if (timestamps.length < 2) return 0

    const timespan = timestamps[timestamps.length - 1] - timestamps[0]
    if (timespan === 0) return 0

    return (timestamps.length - 1) / (timespan / 1000)
  }, [])

  // Determine engagement level based on typing velocity
  const getEngagementLevel = useCallback(() => {
    const velocity = getTypingVelocity()
    const timeSinceLastKeystroke = Date.now() - lastKeystrokeRef.current

    // If actively typing fast (> 2 chars/sec), they're deeply engaged
    if (velocity > 2 && timeSinceLastKeystroke < 2000) return 'deep'

    // If typed recently (within 10s), actively engaged
    if (timeSinceLastKeystroke < 10000) return 'active'

    // If some activity in last 60s, idle but present
    const timeSinceActivity = Date.now() - lastActivityRef.current
    if (timeSinceActivity < 60000) return 'idle'

    // No activity for a while
    return 'away'
  }, [getTypingVelocity])

  // Check for pending insights based on engagement level
  useEffect(() => {
    // Don't check during onboarding or focus mode
    if (!workspaceId || isOnboarding || isFocusMode) return
    // Don't check if already holding/expanded
    if (bubbleState === 'holding' || bubbleState === 'expanded') return

    const checkForInsights = async () => {
      const engagementLevel = getEngagementLevel()

      // Don't interrupt during deep engagement
      if (engagementLevel === 'deep') return

      const idleSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000)

      try {
        const res = await fetch(
          `/api/insights/pending?trigger=idle&idleSeconds=${idleSeconds}&engagement=${engagementLevel}&isFocusMode=${isFocusMode}`
        )
        if (!res.ok) return

        const data = await res.json()
        if (data.hasInsight && data.insight) {
          setPendingInsight(data.insight)
          // Transition to holding state (amber pulse)
          setBubbleState('holding')
        }
      } catch (error) {
        console.error('[OSCARBubble] Failed to check insights:', error)
      }
    }

    // Check every 10 seconds
    idleCheckIntervalRef.current = setInterval(checkForInsights, 10000)

    // Also check on session start (only if idle/away)
    const sessionStartCheck = async () => {
      const engagementLevel = getEngagementLevel()
      if (engagementLevel === 'deep' || engagementLevel === 'active') return

      try {
        const res = await fetch(`/api/insights/pending?trigger=session_start&deliver=false&isFocusMode=${isFocusMode}`)
        if (!res.ok) return

        const data = await res.json()
        if (data.hasInsight && data.insight) {
          setPendingInsight(data.insight)
          setBubbleState('holding')
        }
      } catch (error) {
        console.error('[OSCARBubble] Failed to check session insights:', error)
      }
    }
    sessionStartCheck()

    return () => {
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current)
      }
    }
  }, [workspaceId, isOnboarding, isFocusMode, bubbleState, getEngagementLevel])

  // Handle showing an insight (holding → expanded)
  const handleShowInsight = useCallback(async () => {
    if (!pendingInsight) return

    // Transition: holding → expanded
    setBubbleState('expanded')
    setIsOpen(true)
    setIsMinimized(false)

    // Mark as delivered/surfaced
    try {
      await fetch(`/api/insights/pending?trigger=idle&deliver=true`)
    } catch (error) {
      console.error('[OSCARBubble] Failed to mark insight delivered:', error)
    }
  }, [pendingInsight])

  // Handle "Tell me more" - transitions to panel conversation
  const handleTellMeMore = useCallback(async () => {
    if (!pendingInsight) return

    setInsightLoading(true)
    try {
      // Record engagement
      await fetch(`/api/insights/${pendingInsight.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'engage' }),
      })

      // Transition: expanded → connected
      setBubbleState('connected')

      // Trigger panel conversation with the insight
      if (onStartConversation) {
        onStartConversation(pendingInsight)
      }

      // Clean up after a brief delay (let animation play)
      setTimeout(() => {
        setPendingInsight(null)
        setBubbleState('idle')
      }, 500)
    } catch (error) {
      console.error('[OSCARBubble] Failed to engage insight:', error)
    } finally {
      setInsightLoading(false)
    }
  }, [pendingInsight, onStartConversation])

  // Handle dismissing an insight (expanded → idle)
  const handleDismissInsight = useCallback(async () => {
    if (!pendingInsight) return

    try {
      await fetch(`/api/insights/${pendingInsight.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
    } catch (error) {
      console.error('[OSCARBubble] Failed to dismiss insight:', error)
    }

    // Transition: expanded → idle
    setPendingInsight(null)
    setBubbleState('idle')
  }, [pendingInsight])

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

  // Get the current message content based on state machine
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

    // State machine-based content
    if (bubbleState === 'expanded' && pendingInsight) {
      const categoryConfig = CATEGORY_CONFIG[pendingInsight.category]
      return {
        greeting: getPersonalizedGreeting(onboardingState.userName),
        message: pendingInsight.message,
        inputType: 'insight' as const,
        insightTitle: pendingInsight.title,
        insightCategory: pendingInsight.category,
        categoryIcon: categoryConfig.icon,
        categoryLabel: categoryConfig.label,
        categoryColor: categoryConfig.color,
        hasExpandedContent: pendingInsight.hasExpandedContent,
      }
    }

    // Connected state - transitioning to panel
    if (bubbleState === 'connected') {
      return {
        greeting: getPersonalizedGreeting(onboardingState.userName),
        message: "Opening conversation...",
        inputType: 'none' as const,
      }
    }

    // Idle/holding state
    return {
      greeting: getPersonalizedGreeting(onboardingState.userName),
      message: "I'm here when you need me!",
      inputType: 'none' as const,
    }
  }

  const content = getMessage()
  const showInput = content.inputType !== 'none' && content.inputType !== 'insight'
  const showInsightActions = content.inputType === 'insight'
  const hasUnansweredQuestions = answeredCount < totalQuestions

  // Check if this is a "hero" stage (welcome, explain_purpose, explain_how)
  const isHeroStage = ['welcome', 'explain_purpose', 'explain_how'].includes(onboardingState.stage)

  // Determine if we should show the full-screen onboarding takeover
  const isOnboardingTakeover = isOnboarding && ['welcome', 'explain_purpose', 'explain_how', 'ask_ready', 'get_name', 'get_working_on', 'get_challenge', 'explain_modes', 'invite_first_question'].includes(onboardingState.stage)

  // Hidden state - don't render anything (focus mode)
  if (bubbleState === 'hidden' && !isOnboarding) {
    return null
  }

  // Show minimized pill when closed or minimized (but NEVER during onboarding takeover)
  if ((!isOpen || isMinimized) && !isOnboardingTakeover) {
    if (!alwaysVisible && !isOnboarding) return null

    // State-based pill rendering
    const isHolding = bubbleState === 'holding'
    const categoryConfig = pendingInsight ? CATEGORY_CONFIG[pendingInsight.category] : null

    // Get category-specific pill message
    const getPillMessage = () => {
      if (!pendingInsight || !categoryConfig) return null
      switch (pendingInsight.category) {
        case 'contradiction':
          return "I noticed something..."
        case 'clarify':
          return "Quick thought..."
        case 'next_step':
          return "Ready for next step?"
        case 'recall':
          return "Remember this?"
        default:
          return "I have a thought..."
      }
    }

    return (
      <button
        onClick={isHolding ? handleShowInsight : handlePillClick}
        className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl ${
          isHolding
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse-glow-amber'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 animate-subtle-pulse'
        }`}
      >
        {isHolding && pendingInsight ? (
          <>
            <Lightbulb className="h-4 w-4" />
            <span className="text-sm font-medium">{getPillMessage()}</span>
            <span className="flex h-2 w-2 rounded-full bg-white animate-ping" />
          </>
        ) : (
          <>
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isOnboarding ? "Hey there!" : "Chat with OSQR"}
            </span>
            {(isOnboarding || hasUnansweredQuestions) && (
              <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
            )}
          </>
        )}
      </button>
    )
  }

  // Full-screen onboarding takeover mode
  if (isOnboardingTakeover) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-sm animate-in fade-in duration-500">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Main content card */}
        <div className="relative w-full max-w-md mx-4 animate-in slide-in-from-bottom-8 duration-700">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 shadow-2xl shadow-blue-500/10 border border-slate-700/50 backdrop-blur-xl">
            {/* Animated background blobs inside card */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Chat content */}
            <div className="relative px-8 py-10">
              {/* Hero stages - centered with brain icon */}
              {isHeroStage ? (
                <div className="flex flex-col items-center text-center animate-in fade-in duration-500">
                  {/* Brain icon with glow */}
                  {content.showBrain && (
                    <div className="relative mb-6">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20 animate-pulse-glow">
                        <Brain className="h-10 w-10 text-blue-400" />
                      </div>
                      <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-blue-400" />
                    </div>
                  )}

                  {/* Greeting */}
                  {content.greeting && (
                    <p className="text-base text-slate-400 mb-2">{content.greeting}</p>
                  )}

                  {/* Main message */}
                  <h3 className="mb-3 text-2xl font-bold text-white leading-tight">
                    {onboardingState.stage === 'welcome' ? (
                      <>I'm <span className="shimmer-text">OSQR</span> — your AI thinking partner.</>
                    ) : (
                      content.message
                    )}
                  </h3>

                  {/* Sub message */}
                  {content.subMessage && (
                    <p className="text-base text-slate-400 leading-relaxed mb-6 max-w-sm">
                      {content.subMessage}
                    </p>
                  )}

                  {/* Choice buttons */}
                  {content.choices && content.choices.length > 0 && (
                    <div className="w-full space-y-3 max-w-xs">
                      {content.choices.map((choice) => (
                        <button
                          key={choice}
                          onClick={() => handleChoiceSelect(choice)}
                          disabled={isSubmitting}
                          className="w-full rounded-xl px-6 py-4 text-base font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] cursor-pointer disabled:cursor-not-allowed"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Regular onboarding stages - conversation style */
                <>
                  {/* OSQR's message */}
                  <div className="mb-6 animate-in fade-in duration-500 text-center">
                    {content.greeting && (
                      <p className="text-lg font-medium text-white mb-2">
                        {content.greeting}
                      </p>
                    )}
                    <p className="text-base text-slate-300 leading-relaxed">
                      {content.message}
                    </p>
                    {content.subMessage && (
                      <p className="mt-3 text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                        {content.subMessage}
                      </p>
                    )}
                  </div>

                  {/* Input area */}
                  {showInput && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {content.inputType === 'choice' && content.choices ? (
                        // Choice buttons
                        <div className="space-y-3 mb-4">
                          {content.choices.map((choice) => (
                            <button
                              key={choice}
                              onClick={() => handleChoiceSelect(choice)}
                              disabled={isSubmitting}
                              className={`w-full rounded-xl px-5 py-3.5 text-left text-base transition-all cursor-pointer disabled:cursor-not-allowed ${
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
                        <div className="relative mb-4">
                          <Textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your answer..."
                            rows={2}
                            disabled={isSubmitting}
                            className="pr-12 resize-none rounded-xl border-slate-700 bg-slate-800 text-base text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                            autoFocus
                          />
                          {answer.trim() && (
                            <button
                              onClick={handleSubmit}
                              disabled={isSubmitting}
                              className="absolute bottom-3 right-3 rounded-full bg-blue-500 p-2 text-white transition-all hover:bg-blue-600 disabled:opacity-50"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Skip option (only for certain stages) */}
                      {['get_name', 'get_working_on', 'get_challenge'].includes(onboardingState.stage) && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={handleSkip}
                            disabled={isSubmitting}
                            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
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
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <div className="flex space-x-1">
                          <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center mt-6 gap-2">
            {['welcome', 'explain_purpose', 'explain_how', 'ask_ready', 'get_name', 'explain_modes', 'invite_first_question'].map((stage, index) => {
              const completedStages = onboardingState.completedStages || []
              const isCompleted = completedStages.includes(stage as OnboardingStage)
              const isCurrent = onboardingState.stage === stage ||
                (stage === 'get_name' && ['get_name', 'get_working_on', 'get_challenge'].includes(onboardingState.stage))
              return (
                <div
                  key={stage}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isCompleted ? 'w-6 bg-blue-500' : isCurrent ? 'w-6 bg-blue-400 animate-pulse' : 'w-1.5 bg-slate-700'
                  }`}
                />
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Normal corner bubble mode (after onboarding)
  // Positioned higher on mobile to avoid browser navigation bars
  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] max-w-[380px] animate-in slide-in-from-bottom-4 fade-in duration-300">
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

              {/* Insight action buttons */}
              {showInsightActions && pendingInsight && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
                  {/* Category-aware insight badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{CATEGORY_CONFIG[pendingInsight.category].icon}</span>
                    <span className={`text-xs font-medium ${CATEGORY_CONFIG[pendingInsight.category].color}`}>
                      {CATEGORY_CONFIG[pendingInsight.category].label}
                    </span>
                  </div>

                  {/* Action buttons - "Tell me more" flows to panel */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleTellMeMore}
                      disabled={insightLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50"
                    >
                      {insightLoading ? (
                        <span className="flex space-x-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      ) : (
                        <>
                          Tell me more
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDismissInsight}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 ring-1 ring-slate-700 transition-all"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}

              {/* Auto-advancing indicator */}
              {currentMessage?.autoAdvanceDelay && !showInput && !showInsightActions && (
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
