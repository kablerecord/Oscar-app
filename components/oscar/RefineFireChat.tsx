'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Send,
  Brain,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Lightbulb,
  GraduationCap,
  PanelRight,
  Sparkles,
  Target,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { ProfileQuestionModal } from '@/components/profile/ProfileQuestionModal'
import { ShareActions } from '@/components/share/ShareActions'
import { getNextQuestion, getTotalQuestions, type ProfileQuestion } from '@/lib/profile/questions'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import type { ArtifactBlock } from '@/lib/artifacts/types'

interface Message {
  role: 'user' | 'osqr'
  content: string
  thinking?: boolean
  artifacts?: ArtifactBlock[]
  debug?: {
    panelDiscussion?: any[]
    roundtableDiscussion?: any[]
  }
  refinedQuestion?: string // Store the refined question that was fired
}

interface RefineResult {
  originalQuestion: string
  analysis: string
  clarifyingQuestions: string[]
  suggestedRefinement: string
  readyToFire: boolean
}

interface RefineFireChatProps {
  workspaceId: string
}

type ResponseMode = 'quick' | 'thoughtful' | 'contemplate'
type ChatStage = 'input' | 'refining' | 'refined' | 'firing' | 'complete'

export function RefineFireChat({ workspaceId }: RefineFireChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatStage, setChatStage] = useState<ChatStage>('input')
  const [isLoading, setIsLoading] = useState(false)
  const [useKnowledge, setUseKnowledge] = useState(true)
  const [showDebug, setShowDebug] = useState(false)
  const [expandedDebug, setExpandedDebug] = useState<number | null>(null)
  const [responseMode, setResponseMode] = useState<ResponseMode>('thoughtful')

  // Refine state
  const [refineResult, setRefineResult] = useState<RefineResult | null>(null)
  const [clarifyingAnswers, setClarifyingAnswers] = useState<string[]>([])
  const [refinedQuestion, setRefinedQuestion] = useState('')

  // Profile question state
  const [showProfileQuestion, setShowProfileQuestion] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<ProfileQuestion | null>(null)
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([])

  // Artifact panel state
  const [showArtifacts, setShowArtifacts] = useState(false)
  const [currentArtifacts, setCurrentArtifacts] = useState<ArtifactBlock[]>([])

  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const refineCardRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Scroll to refine card when it appears
  useEffect(() => {
    if (chatStage === 'refined' && refineCardRef.current) {
      refineCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [chatStage])

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

  // STEP 1: Refine the question
  const handleRefine = async () => {
    if (!input.trim() || isLoading) return

    const userQuestion = input.trim()
    setChatStage('refining')
    setIsLoading(true)

    try {
      const response = await fetch('/api/oscar/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQuestion,
          workspaceId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to refine question')
      }

      const data: RefineResult = await response.json()
      setRefineResult(data)
      setRefinedQuestion(data.suggestedRefinement || userQuestion)
      setClarifyingAnswers(new Array(data.clarifyingQuestions.length).fill(''))

      // If ready to fire immediately, go straight to firing
      if (data.readyToFire) {
        setChatStage('refined')
        // Auto-fire after a brief moment so user sees the "ready" state
        setTimeout(() => handleFire(userQuestion), 500)
      } else {
        setChatStage('refined')
      }
    } catch (error) {
      console.error('Error refining question:', error)
      // Fallback: skip refine and go straight to firing
      setChatStage('input')
      handleDirectFire(userQuestion)
    } finally {
      setIsLoading(false)
    }
  }

  // STEP 2: Fire the question to the panel
  const handleFire = async (questionToFire?: string) => {
    const finalQuestion = questionToFire || refinedQuestion || input.trim()
    if (!finalQuestion || isLoading) return

    setChatStage('firing')
    setIsLoading(true)

    // Add user message with the refined question
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: finalQuestion, refinedQuestion: refineResult?.originalQuestion !== finalQuestion ? refineResult?.originalQuestion : undefined },
    ])

    // Add "thinking" placeholder
    setMessages((prev) => [...prev, { role: 'osqr', content: '', thinking: true }])

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
          message: finalQuestion,
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

      // Replace thinking placeholder with actual response
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'osqr',
          content: data.answer,
          thinking: false,
          artifacts: data.artifacts,
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
      setChatStage('complete')
      // Reset for next question
      setInput('')
      setRefineResult(null)
      setRefinedQuestion('')
      setClarifyingAnswers([])
    }
  }

  // Direct fire without refine (for quick mode or fallback)
  const handleDirectFire = async (question: string) => {
    setInput('')
    await handleFire(question)
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (chatStage === 'input' || chatStage === 'complete') {
        if (responseMode === 'quick') {
          handleDirectFire(input.trim())
        } else {
          handleRefine()
        }
      }
    }
  }

  // Start over / new question
  const handleStartOver = () => {
    setChatStage('input')
    setRefineResult(null)
    setRefinedQuestion('')
    setClarifyingAnswers([])
  }

  // Profile question handlers
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
        setAnsweredQuestionIds((prev) => [...prev, currentQuestion.id])
        const nextQuestion = getNextQuestion([...answeredQuestionIds, currentQuestion.id])
        if (nextQuestion) {
          setCurrentQuestion(nextQuestion)
        } else {
          setShowProfileQuestion(false)
        }
      }
    } catch (error) {
      console.error('Failed to save profile answer:', error)
    }
  }

  const handleProfileSkip = () => {
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
          {messages.length === 0 && chatStage === 'input' && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="relative mb-4">
                <Brain className="h-16 w-16 text-neutral-400" />
                <Sparkles className="absolute -right-2 -top-2 h-6 w-6 text-amber-500" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Hello, I'm OSQR
              </h3>
              <p className="max-w-md text-neutral-600 dark:text-neutral-400 mb-4">
                Your personal AI operating system. I'll help you sharpen your question first, then consult a panel of AI experts for the best possible answer.
              </p>
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Target className="h-4 w-4" />
                <span>Refine → Fire: Better questions, better answers</span>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, idx) => (
            <div key={idx} className="space-y-2">
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%]">
                    {message.refinedQuestion && (
                      <div className="mb-1 text-xs text-neutral-500 text-right">
                        Original: "{message.refinedQuestion}"
                      </div>
                    )}
                    <Card className="bg-blue-50 p-4 dark:bg-blue-950/20">
                      <p className="whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-100">
                        {message.content}
                      </p>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="max-w-[80%] space-y-2">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        OSQR
                      </span>
                    </div>
                    <Card className="p-4">
                      {message.thinking ? (
                        <div className="flex items-center space-x-2 text-sm text-neutral-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>
                            {responseMode === 'quick' && 'Quick response - consulting expert...'}
                            {responseMode === 'thoughtful' && 'Consulting panel and synthesizing...'}
                            {responseMode === 'contemplate' && 'Deep analysis in progress...'}
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

                    {/* Share Actions */}
                    {!message.thinking && message.content && (
                      <ShareActions
                        content={message.content}
                        agentName="OSQR"
                        isDebate={!!message.debug?.panelDiscussion}
                        panelDiscussion={message.debug?.panelDiscussion?.map((p, i) => ({
                          content: p.content,
                          agentName: `Expert ${i + 1}`,
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
                          <span>
                            View {message.artifacts.length} artifact{message.artifacts.length > 1 ? 's' : ''}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Debug panel */}
                    {message.debug && (
                      <div className="mt-2">
                        <button
                          onClick={() => setExpandedDebug(expandedDebug === idx ? null : idx)}
                          className="flex items-center space-x-1 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                        >
                          {expandedDebug === idx ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          <span>View panel discussion ({message.debug.panelDiscussion?.length || 0} experts)</span>
                        </button>

                        {expandedDebug === idx && (
                          <Card className="mt-2 bg-neutral-50 p-4 dark:bg-neutral-900">
                            <h4 className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                              Panel Discussion
                            </h4>
                            <div className="space-y-3">
                              {message.debug.panelDiscussion?.map((response, i) => (
                                <div key={i} className="border-l-2 border-neutral-300 pl-3 dark:border-neutral-700">
                                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                    Expert {i + 1}
                                  </p>
                                  <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">{response.content}</p>
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

          {/* Refine Card - Shows after refinement */}
          {chatStage === 'refined' && refineResult && !refineResult.readyToFire && (
            <div ref={refineCardRef} className="mx-auto max-w-2xl">
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Let's sharpen your question</h3>
                  </div>

                  {/* Analysis */}
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{refineResult.analysis}</p>

                  {/* Clarifying Questions */}
                  {refineResult.clarifyingQuestions.length > 0 && (
                    <div className="space-y-3 mb-4">
                      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Quick clarifications:</p>
                      {refineResult.clarifyingQuestions.map((q, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="text-sm text-neutral-700 dark:text-neutral-300">{q}</label>
                          <input
                            type="text"
                            placeholder="Your answer (optional)..."
                            value={clarifyingAnswers[idx] || ''}
                            onChange={(e) => {
                              const newAnswers = [...clarifyingAnswers]
                              newAnswers[idx] = e.target.value
                              setClarifyingAnswers(newAnswers)
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested Refinement */}
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Refined question:</p>
                    <Textarea
                      value={refinedQuestion}
                      onChange={(e) => setRefinedQuestion(e.target.value)}
                      rows={3}
                      className="bg-white dark:bg-neutral-900"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleFire()}
                      disabled={isLoading || !refinedQuestion.trim()}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Fire
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={handleStartOver} disabled={isLoading}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ready to Fire - Question is already good */}
          {chatStage === 'refined' && refineResult?.readyToFire && (
            <div ref={refineCardRef} className="mx-auto max-w-2xl">
              <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Ready to fire!</h3>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{refineResult.analysis}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="mt-4 space-y-3">
          {/* Response Mode Buttons */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Mode:</span>
            <div className="flex space-x-1">
              <Button
                variant={responseMode === 'quick' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setResponseMode('quick')}
                disabled={isLoading}
                className="space-x-1"
              >
                <Zap className="h-3 w-3" />
                <span>Quick</span>
              </Button>
              <Button
                variant={responseMode === 'thoughtful' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setResponseMode('thoughtful')}
                disabled={isLoading}
                className="space-x-1"
              >
                <Lightbulb className="h-3 w-3" />
                <span>Thoughtful</span>
              </Button>
              <Button
                variant={responseMode === 'contemplate' ? 'default' : 'outline'}
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
              {responseMode === 'quick' && '(~5-10s, skips refinement)'}
              {responseMode === 'thoughtful' && '(~30-60s, with refinement)'}
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
                <span className="text-neutral-700 dark:text-neutral-300">Use Knowledge Base</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showDebug}
                  onChange={(e) => setShowDebug(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                  disabled={isLoading}
                />
                <span className="text-neutral-700 dark:text-neutral-300">Show Panel</span>
              </label>
            </div>
          </div>

          {/* Input */}
          <div className="flex space-x-3">
            <Textarea
              placeholder={
                chatStage === 'refined'
                  ? 'Edit your refined question above, or type a new one...'
                  : 'Ask OSQR anything...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={isLoading || (chatStage === 'refined' && !refineResult?.readyToFire)}
              className="flex-1"
            />
            <div className="flex flex-col gap-2">
              {responseMode === 'quick' ? (
                // Quick mode: Direct fire
                <Button
                  onClick={() => handleDirectFire(input.trim())}
                  disabled={isLoading || !input.trim()}
                  size="lg"
                  className="px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Fire
                    </>
                  )}
                </Button>
              ) : (
                // Thoughtful/Contemplate mode: Refine first
                <Button
                  onClick={handleRefine}
                  disabled={isLoading || !input.trim() || chatStage === 'refined'}
                  size="lg"
                  className="px-6"
                >
                  {isLoading && chatStage === 'refining' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Target className="mr-2 h-4 w-4" />
                      Refine
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Artifact Panel */}
      {showArtifacts && currentArtifacts.length > 0 && (
        <ArtifactPanel artifacts={currentArtifacts} onClose={() => setShowArtifacts(false)} />
      )}

      {/* Profile Question Modal */}
      <ProfileQuestionModal
        isOpen={showProfileQuestion}
        question={currentQuestion}
        answeredCount={answeredQuestionIds.length}
        totalQuestions={getTotalQuestions()}
        onAnswer={handleProfileAnswer}
        onSkip={handleProfileSkip}
        onClose={handleProfileClose}
      />
    </div>
  )
}
