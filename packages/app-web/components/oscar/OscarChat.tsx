'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Send, Brain, Loader2, ChevronDown, ChevronUp, Zap, Lightbulb, GraduationCap, PanelRight, X, Users } from 'lucide-react'
import { CompanionBubble } from '@/components/oscar/CompanionBubble'
import { ShareActions } from '@/components/share/ShareActions'
import { getNextQuestion, getTotalQuestions, type ProfileQuestion } from '@/lib/profile/questions'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import { CouncilCarousel, CouncilModeBadge, type ModelResponse } from '@/components/council/CouncilCarousel'
import { FeedbackButton } from '@/components/chat/FeedbackButton'
import type { ArtifactBlock } from '@/lib/artifacts/types'

interface CouncilData {
  responses: ModelResponse[]
  synthesis: string
  hasDisagreement: boolean
}

interface Message {
  role: 'user' | 'osqr'
  content: string
  thinking?: boolean
  artifacts?: ArtifactBlock[]
  council?: CouncilData
  debug?: {
    panelDiscussion?: any[]
    roundtableDiscussion?: any[]
  }
}

interface OscarChatProps {
  workspaceId: string
  userTier?: 'starter' | 'pro' | 'master'
}

type ResponseMode = 'quick' | 'thoughtful' | 'contemplate'

export function OscarChat({ workspaceId, userTier = 'pro' }: OscarChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useKnowledge, setUseKnowledge] = useState(true)
  const [showDebug, setShowDebug] = useState(false)
  const [expandedDebug, setExpandedDebug] = useState<number | null>(null)
  const [responseMode, setResponseMode] = useState<ResponseMode>('thoughtful')
  const [showCouncilForMessage, setShowCouncilForMessage] = useState<number | null>(null)

  // Profile question state
  const [showProfileQuestion, setShowProfileQuestion] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<ProfileQuestion | null>(null)
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([])

  // Artifact panel state
  const [showArtifacts, setShowArtifacts] = useState(false)
  const [currentArtifacts, setCurrentArtifacts] = useState<ArtifactBlock[]>([])

  // Prefetch context state
  const [prefetchedContext, setPrefetchedContext] = useState<{
    vaultStats?: { documentCount: number; chunkCount: number }
    mscProjects?: Array<{ id: string; title: string; status: string }>
    recentThreads?: Array<{ id: string; title: string }>
  } | null>(null)

  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Pre-fetch context on mount (instant awareness)
  useEffect(() => {
    async function prefetch() {
      try {
        const response = await fetch('/api/oscar/prefetch')
        if (response.ok) {
          const data = await response.json()
          setPrefetchedContext({
            vaultStats: data.vaultStats,
            mscProjects: data.mscProjects,
            recentThreads: data.recentThreads,
          })
          console.log('[OscarChat] Prefetched context:', data.meta?.totalItems, 'items')
        }
      } catch (error) {
        console.error('[OscarChat] Prefetch failed:', error)
      }
    }
    prefetch()
  }, [])

  // Load answered questions on mount
  useEffect(() => {
    async function loadAnsweredQuestions() {
      try {
        const response = await fetch(`/api/profile/answers?workspaceId=${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          const ids = data.answers.map((a: any) => a.questionId)
          setAnsweredQuestionIds(ids)
        }
      } catch (error) {
        console.error('Failed to load answered questions:', error)
      }
    }
    loadAnsweredQuestions()
  }, [workspaceId])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])

    // Add "thinking" placeholder
    setMessages((prev) => [...prev, { role: 'osqr', content: '', thinking: true }])

    setIsLoading(true)

    // Show profile question during wait time
    const nextQuestion = getNextQuestion(answeredQuestionIds)
    if (nextQuestion && responseMode !== 'quick') {
      setCurrentQuestion(nextQuestion)
      setShowProfileQuestion(true)
    }

    try {
      const response = await fetch('/api/oscar/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          workspaceId,
          useKnowledge,
          includeDebate: showDebug,
          mode: responseMode,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from OSQR')
      }

      const data = await response.json()

      // Process council data from panelDiscussion if available (for thoughtful/contemplate modes)
      let councilData: CouncilData | undefined
      if (data.panelDiscussion && data.panelDiscussion.length > 0 && responseMode !== 'quick') {
        // Transform panel discussion into council responses
        const councilResponses: ModelResponse[] = data.panelDiscussion.map((panel: any) => ({
          modelId: panel.modelId || panel.agentId || 'unknown',
          modelName: panel.agentName || panel.modelName,
          content: panel.content || '',
          confidence: panel.confidence ?? 0.75, // Default confidence if not provided
          reasoning: panel.reasoning,
          isLoading: false,
          error: panel.error,
        }))

        // Calculate disagreement (15% confidence delta)
        const confidences = councilResponses.map((r: ModelResponse) => r.confidence)
        const maxDelta = Math.max(...confidences) - Math.min(...confidences)
        const hasDisagreement = maxDelta >= 0.15

        councilData = {
          responses: councilResponses,
          synthesis: data.answer,
          hasDisagreement,
        }
      }

      // Replace thinking placeholder with actual response
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'osqr',
          content: data.answer,
          thinking: false,
          artifacts: data.artifacts,
          council: councilData,
          debug: showDebug
            ? {
                panelDiscussion: data.panelDiscussion,
                roundtableDiscussion: data.roundtableDiscussion,
              }
            : undefined,
        }
        return updated
      })

      // If artifacts were returned, show the artifact panel
      if (data.artifacts && data.artifacts.length > 0) {
        setCurrentArtifacts(data.artifacts)
        setShowArtifacts(true)
      }
    } catch (error) {
      console.error('Error asking OSQR:', error)
      // Replace thinking placeholder with error
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'osqr',
          content: 'I apologize, but I encountered an error. Please try again.',
          thinking: false,
        }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Handle profile question answer
  const handleProfileAnswer = async (answer: string) => {
    if (!currentQuestion) return

    try {
      const response = await fetch('/api/profile/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          questionId: currentQuestion.id,
          category: currentQuestion.category,
          question: currentQuestion.question,
          answer,
        }),
      })

      if (response.ok) {
        // Mark question as answered
        setAnsweredQuestionIds(prev => [...prev, currentQuestion.id])

        // Load next question
        const nextQuestion = getNextQuestion([...answeredQuestionIds, currentQuestion.id])
        if (nextQuestion) {
          setCurrentQuestion(nextQuestion)
        } else {
          // All questions answered
          setShowProfileQuestion(false)
        }
      }
    } catch (error) {
      console.error('Failed to save profile answer:', error)
    }
  }

  const handleProfileSkip = () => {
    // Load next question without saving
    const nextQuestion = getNextQuestion([...answeredQuestionIds, currentQuestion?.id || ''])
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion)
    } else {
      setShowProfileQuestion(false)
    }
  }

  const handleProfileClose = () => {
    setShowProfileQuestion(false)
  }

  // Helper to show artifacts for a specific message
  const handleShowArtifacts = (artifacts: ArtifactBlock[]) => {
    setCurrentArtifacts(artifacts)
    setShowArtifacts(true)
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-0">
      {/* Main chat area */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${showArtifacts ? 'mr-0' : ''}`}>
        {/* Messages area */}
        <div className="flex-1 space-y-6 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Brain className="mb-4 h-16 w-16 text-neutral-400" />
            <h3 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Hello, I'm OSQR
            </h3>
            <p className="max-w-md text-neutral-600 dark:text-neutral-400">
              Your personal AI assistant. I consult a panel of specialized AI experts to give you
              the best possible answers. Ask me anything.
            </p>
          </div>
        )}

        {messages.map((message, idx) => (
          <div key={idx} className="space-y-2">
            {message.role === 'user' ? (
              <div className="flex justify-end">
                <Card className="max-w-[80%] bg-blue-50 p-4 dark:bg-blue-950/20">
                  <p className="whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-100">
                    {message.content}
                  </p>
                </Card>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="max-w-[80%] space-y-2">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      OSQR
                    </span>
                    {/* Council Mode Badge - shows when multi-model responses available */}
                    {message.council && message.council.responses.length > 0 && (
                      <CouncilModeBadge
                        modelCount={message.council.responses.length}
                        hasDisagreement={message.council.hasDisagreement}
                        onClick={() => setShowCouncilForMessage(showCouncilForMessage === idx ? null : idx)}
                      />
                    )}
                  </div>
                  <Card className="p-4">
                    {message.thinking ? (
                      <div className="flex items-center space-x-2 text-sm text-neutral-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {responseMode === 'quick' && 'Quick response mode - consulting expert...'}
                          {responseMode === 'thoughtful' && 'Thoughtful mode - consulting panel...'}
                          {responseMode === 'contemplate' && 'Contemplate mode - deep analysis in progress...'}
                        </span>
                      </div>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-100">
                          {message.content}
                        </p>
                      </div>
                    )}
                  </Card>

                  {/* Council Carousel - shows individual model responses */}
                  {message.council && showCouncilForMessage === idx && (
                    <CouncilCarousel
                      responses={message.council.responses}
                      synthesis={message.council.synthesis}
                      userTier={userTier}
                      isVisible={true}
                      onUpgrade={() => {
                        // Navigate to pricing page
                        window.location.href = '/pricing'
                      }}
                      onDiscussWithOscar={(modelId, content) => {
                        // Pre-fill input with a reference to the model's response
                        const modelName = message.council?.responses.find(r => r.modelId === modelId)?.modelName || modelId
                        setInput(`Regarding what ${modelName} said about this - can you elaborate?`)
                      }}
                    />
                  )}

                  {/* Share Actions - only show for completed responses */}
                  {!message.thinking && message.content && (
                    <ShareActions
                      content={message.content}
                      agentName="OSQR"
                      isDebate={!!message.debug?.panelDiscussion}
                      panelDiscussion={message.debug?.panelDiscussion?.map((p, i) => ({
                        content: p.content,
                        agentName: `Expert ${i + 1}`
                      }))}
                      className="mt-1"
                    />
                  )}

                  {/* Artifacts button */}
                  {message.artifacts && message.artifacts.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => handleShowArtifacts(message.artifacts!)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <PanelRight className="h-3.5 w-3.5" />
                        <span>View {message.artifacts.length} artifact{message.artifacts.length > 1 ? 's' : ''}</span>
                      </button>
                    </div>
                  )}

                  {/* Debug panel discussion */}
                  {message.debug && (
                    <div className="mt-2">
                      <button
                        onClick={() =>
                          setExpandedDebug(expandedDebug === idx ? null : idx)
                        }
                        className="flex items-center space-x-1 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                      >
                        {expandedDebug === idx ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        <span>View panel discussion ({message.debug.panelDiscussion?.length || 0} experts)</span>
                      </button>

                      {expandedDebug === idx && (
                        <Card className="mt-2 bg-neutral-50 p-4 dark:bg-neutral-900">
                          <h4 className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                            Panel Discussion (Debug Mode)
                          </h4>
                          <div className="space-y-3">
                            {message.debug.panelDiscussion?.map((response, i) => (
                              <div key={i} className="border-l-2 border-neutral-300 pl-3 dark:border-neutral-700">
                                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                  Expert {i + 1}
                                </p>
                                <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">
                                  {response.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="mt-4 space-y-3">
        {/* Response Mode Buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Response Mode:
          </span>
          <div className="flex space-x-1">
            <Button
              variant={responseMode === 'quick' ? 'outline' : 'default'}
              size="sm"
              onClick={() => setResponseMode('quick')}
              disabled={isLoading}
              className="space-x-1"
            >
              <Zap className="h-3 w-3" />
              <span>Quick</span>
            </Button>
            <Button
              variant={responseMode === 'thoughtful' ? 'outline' : 'default'}
              size="sm"
              onClick={() => setResponseMode('thoughtful')}
              disabled={isLoading}
              className="space-x-1"
            >
              <Lightbulb className="h-3 w-3" />
              <span>Thoughtful</span>
            </Button>
            <Button
              variant={responseMode === 'contemplate' ? 'outline' : 'default'}
              size="sm"
              onClick={() => setResponseMode('contemplate')}
              disabled={isLoading}
              className="space-x-1"
            >
              <GraduationCap className="h-3 w-3" />
              <span>Contemplate</span>
            </Button>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {responseMode === 'quick' && '(~5-10s, simple answer)'}
            {responseMode === 'thoughtful' && '(~20-40s, balanced depth)'}
            {responseMode === 'contemplate' && '(~60-90s, deep analysis)'}
          </span>
        </div>

        {/* Options */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useKnowledge}
                onChange={(e) => setUseKnowledge(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
                disabled={isLoading}
              />
              <span className="text-neutral-700 dark:text-neutral-300">
                Use Knowledge Base
              </span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showDebug}
                onChange={(e) => setShowDebug(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
                disabled={isLoading}
              />
              <span className="text-neutral-700 dark:text-neutral-300">
                Debug Mode (show panel)
              </span>
            </label>
          </div>
        </div>

        {/* Input */}
        <div className="flex space-x-3">
          <Textarea
            placeholder="Ask OSQR anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            size="lg"
            className="px-8"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Ask
              </>
            )}
          </Button>
        </div>
      </div>
      </div>

      {/* Artifact Panel (slides in from right) */}
      {showArtifacts && currentArtifacts.length > 0 && (
        <ArtifactPanel
          artifacts={currentArtifacts}
          onClose={() => setShowArtifacts(false)}
        />
      )}

      {/* OSQR Companion Bubble */}
      <CompanionBubble
        isOpen={showProfileQuestion}
        question={currentQuestion}
        answeredCount={answeredQuestionIds.length}
        totalQuestions={getTotalQuestions()}
        onAnswer={handleProfileAnswer}
        onSkip={handleProfileSkip}
        onClose={handleProfileClose}
      />

      {/* Feedback Button (training pattern: teach users to use natural language) */}
      <FeedbackButton
        workspaceId={workspaceId}
        responseMode={responseMode}
      />
    </div>
  )
}
