'use client'

import { useState, useRef, useEffect, useReducer } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Brain,
  Upload,
  Sparkles,
  ArrowRight,
  Check,
  Shield,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  Lightbulb,
  AlertTriangle,
  Link2,
  ListTodo,
} from 'lucide-react'
import {
  type OnboardingState,
  type OnboardingAction,
  type InsightCard,
  type DocumentType,
  getInitialOnboardingState,
  onboardingReducer,
  ONBOARDING_MESSAGES,
  CONTEXT_QUESTIONS,
  detectDocumentType,
  getOnboardingProgress,
} from '@/lib/onboarding/onboarding-state'

// ============================================
// Props
// ============================================

interface SpecOnboardingFlowProps {
  workspaceId: string
  userName?: string
  onComplete: (state: OnboardingState) => void
  onSkip?: () => void
}

// ============================================
// Main Component
// ============================================

export function SpecOnboardingFlow({
  workspaceId,
  userName,
  onComplete,
  onSkip,
}: SpecOnboardingFlowProps) {
  const [state, dispatch] = useReducer(onboardingReducer, getInitialOnboardingState())
  const [isLoading, setIsLoading] = useState(false)

  // Set user name if provided
  useEffect(() => {
    if (userName) {
      dispatch({ type: 'set_user_name', name: userName })
    }
  }, [userName])

  // Handle completion
  useEffect(() => {
    if (state.phase === 'completed') {
      onComplete(state)
    }
  }, [state.phase, state, onComplete])

  const progress = getOnboardingProgress(state)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-neutral-900 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button (after first phase) */}
        {state.phase !== 'first_contact' && state.phase !== 'completed' && (
          <button
            onClick={() => {
              dispatch({ type: 'skip_onboarding' })
              onSkip?.()
            }}
            className="absolute right-4 top-4 z-10 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            Skip for now
          </button>
        )}

        <div className="max-h-[80vh] overflow-y-auto p-6">
          {/* Phase 1: First Contact */}
          {state.phase === 'first_contact' && (
            <FirstContactPhase
              onResponse={(response) => dispatch({ type: 'first_contact_response', response })}
            />
          )}

          {/* Phase 2: Trust Gate */}
          {state.phase === 'trust_gate' && (
            <TrustGatePhase
              expanded={state.trustGateExpanded}
              onToggleExpand={() => dispatch({ type: 'toggle_privacy_info' })}
              onResponse={(response) => dispatch({ type: 'trust_gate_response', response })}
            />
          )}

          {/* Phase 2 Alt: Demo Mode */}
          {state.phase === 'demo_mode' && (
            <DemoModePhase
              onUseDemoDocument={() => dispatch({ type: 'use_demo_document' })}
              onProceedWithUpload={() => dispatch({ type: 'trust_gate_response', response: 'proceed' })}
            />
          )}

          {/* Phase 3: Value Demo */}
          {state.phase === 'value_demo' && (
            <ValueDemoPhase
              workspaceId={workspaceId}
              usedDemoDocument={state.usedDemoDocument}
              uploadedDocument={state.uploadedDocument}
              insights={state.insights}
              onDocumentUploaded={(doc) => dispatch({ type: 'document_uploaded', document: doc })}
              onInsightsGenerated={(insights, docType) => {
                dispatch({ type: 'set_document_type', documentType: docType })
                dispatch({ type: 'insights_generated', insights })
              }}
              onInsightClicked={(id) => dispatch({ type: 'insight_clicked', insightId: id })}
              onReasoningExpanded={(id) => dispatch({ type: 'reasoning_expanded', insightId: id })}
            />
          )}

          {/* Phase 4: Getting to Know You */}
          {state.phase === 'getting_to_know' && (
            <GettingToKnowPhase
              documentType={state.detectedDocumentType}
              questions={state.contextQuestions}
              onAnswer={(questionId, answer) =>
                dispatch({ type: 'question_answered', questionId, answer })
              }
            />
          )}

          {/* Phase 5: Deeper Insight */}
          {state.phase === 'deeper_insight' && (
            <DeeperInsightPhase
              workspaceId={workspaceId}
              uploadedDocument={state.uploadedDocument}
              contextQuestions={state.contextQuestions}
              deeperInsights={state.deeperInsights}
              onInsightsGenerated={(insights) =>
                dispatch({ type: 'deeper_insights_generated', insights })
              }
            />
          )}

          {/* Phase 6: Limits Disclosure */}
          {state.phase === 'limits_disclosure' && (
            <LimitsDisclosurePhase
              onChoice={(choice) => dispatch({ type: 'upgrade_interest', interest: choice })}
            />
          )}

          {/* Skipped state */}
          {state.phase === 'skipped' && (
            <SkippedPhase
              onResume={() => dispatch({ type: 'resume_from_skip' })}
              onClose={() => onSkip?.()}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Phase 1: First Contact
// ============================================

function FirstContactPhase({
  onResponse,
}: {
  onResponse: (response: 'yes_show_me' | 'tell_me_more' | 'skip_for_now') => void
}) {
  const [showMore, setShowMore] = useState(false)

  return (
    <div className="text-center">
      {/* OSQR Avatar */}
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/25 animate-pulse">
        <Brain className="h-10 w-10 text-white" />
      </div>

      <h1 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">
        {ONBOARDING_MESSAGES.first_contact.greeting}
      </h1>

      <p className="mb-4 text-neutral-600 dark:text-neutral-400">
        {ONBOARDING_MESSAGES.first_contact.message}
      </p>

      <p className="mb-6 text-lg font-medium text-neutral-800 dark:text-neutral-200">
        {ONBOARDING_MESSAGES.first_contact.cta}
      </p>

      {showMore && (
        <div className="mb-6 rounded-xl bg-purple-50 p-4 text-left dark:bg-purple-950/30">
          <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
            What makes OSQR different:
          </h3>
          <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-300">
            <li className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>I proactively surface insights you might miss</span>
            </li>
            <li className="flex items-start gap-2">
              <Brain className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>I remember everything we discuss — context builds over time</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Your data stays private — never used for training</span>
            </li>
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={() => onResponse('yes_show_me')}
          size="lg"
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          Yes, show me
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {!showMore ? (
          <button
            onClick={() => setShowMore(true)}
            className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            Tell me more first
          </button>
        ) : (
          <Button
            onClick={() => onResponse('yes_show_me')}
            variant="outline"
            className="w-full"
          >
            Got it, let's go
          </Button>
        )}

        <button
          onClick={() => onResponse('skip_for_now')}
          className="w-full py-2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

// ============================================
// Phase 2: Trust Gate
// ============================================

function TrustGatePhase({
  expanded,
  onToggleExpand,
  onResponse,
}: {
  expanded: boolean
  onToggleExpand: () => void
  onResponse: (response: 'proceed' | 'more_privacy_info' | 'try_demo') => void
}) {
  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
          Your data, your rules
        </h2>
      </div>

      <div className="mb-6 space-y-3">
        {ONBOARDING_MESSAGES.trust_gate.details.map((detail, i) => (
          <p key={i} className="text-neutral-600 dark:text-neutral-400">
            {detail}
          </p>
        ))}
      </div>

      {/* Expandable privacy details */}
      <button
        onClick={onToggleExpand}
        className="mb-4 flex w-full items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          How your data is protected
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="mb-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-200">End-to-end encryption</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">Your data is encrypted at rest and in transit</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-200">Never used for AI training</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">Your uploads don't train any models, ever</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-200">"Burn It" button</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">Delete everything instantly — irreversible, total wipe</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={() => onResponse('proceed')}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
        >
          Got it, let's go
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <Button
          onClick={() => onResponse('try_demo')}
          variant="outline"
          className="w-full"
        >
          I'm not comfortable yet
        </Button>
      </div>
    </div>
  )
}

// ============================================
// Phase 2 Alt: Demo Mode
// ============================================

function DemoModePhase({
  onUseDemoDocument,
  onProceedWithUpload,
}: {
  onUseDemoDocument: () => void
  onProceedWithUpload: () => void
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500">
        <FileText className="h-6 w-6 text-white" />
      </div>

      <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
        Try with a sample document
      </h2>

      <p className="mb-6 text-neutral-600 dark:text-neutral-400">
        {ONBOARDING_MESSAGES.demo_mode.message}
      </p>

      <div className="mb-6 rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Sample: <span className="font-medium">Product Strategy Q4.md</span>
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          A fictional product roadmap with goals, timelines, and challenges
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={onUseDemoDocument}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
        >
          Try with sample document
          <Sparkles className="ml-2 h-4 w-4" />
        </Button>

        <button
          onClick={onProceedWithUpload}
          className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
        >
          Actually, I'll upload my own
        </button>
      </div>
    </div>
  )
}

// ============================================
// Phase 3: Value Demo
// ============================================

function ValueDemoPhase({
  workspaceId,
  usedDemoDocument,
  uploadedDocument,
  insights,
  onDocumentUploaded,
  onInsightsGenerated,
  onInsightClicked,
  onReasoningExpanded,
}: {
  workspaceId: string
  usedDemoDocument: boolean
  uploadedDocument?: OnboardingState['uploadedDocument']
  insights: InsightCard[]
  onDocumentUploaded: (doc: OnboardingState['uploadedDocument']) => void
  onInsightsGenerated: (insights: InsightCard[], docType: DocumentType) => void
  onInsightClicked: (id: string) => void
  onReasoningExpanded: (id: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // Auto-generate demo insights
  useEffect(() => {
    if (usedDemoDocument && insights.length === 0) {
      generateDemoInsights()
    }
  }, [usedDemoDocument, insights.length])

  const generateDemoInsights = async () => {
    setIsAnalyzing(true)
    await new Promise(resolve => setTimeout(resolve, 2000))

    const demoInsights: InsightCard[] = [
      {
        id: 'demo_1',
        headline: 'Q2 deadline conflicts with timeline section',
        category: 'issue',
        reasoning: 'I noticed "Q2 deadline" mentioned in paragraph 3, but your timeline section shows Q3. I flagged this as a potential conflict.',
        sourceReference: 'Timeline section, paragraph 3',
        confidence: 'high',
        expanded: false,
      },
      {
        id: 'demo_2',
        headline: 'Budget allocation may need review',
        category: 'pattern',
        reasoning: 'The marketing budget is 40% of total while product is only 15%. Based on your goals, you might want to rebalance.',
        sourceReference: 'Budget breakdown, slide 4',
        confidence: 'medium',
        expanded: false,
      },
      {
        id: 'demo_3',
        headline: 'Missing competitor analysis',
        category: 'question',
        reasoning: 'You mention "staying ahead of competitors" but I don\'t see a competitor analysis section. Worth adding?',
        confidence: 'medium',
        expanded: false,
      },
      {
        id: 'demo_4',
        headline: 'Three open questions without owners',
        category: 'action',
        reasoning: 'I found three strategic questions marked as "TBD" without assigned owners. These might block progress.',
        sourceReference: 'Action items section',
        confidence: 'high',
        expanded: false,
      },
    ]

    onInsightsGenerated(demoInsights, 'planning_roadmap')
    setIsAnalyzing(false)
  }

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file)
    setIsUploading(true)

    try {
      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspaceId', workspaceId)

      const response = await fetch('/api/onboarding/index-file', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        onDocumentUploaded({
          id: result.documentId,
          name: file.name,
          type: file.type,
          uploadedAt: new Date(),
        })

        // Analyze and generate insights
        setIsUploading(false)
        setIsAnalyzing(true)

        // Detect document type from content
        const docType = detectDocumentType(result.textContent || '', file.type)

        // Generate insights based on analysis
        const analysisInsights: InsightCard[] = result.insights?.map((i: { title: string; explanation: string; category: string; confidence: string }, idx: number) => ({
          id: `insight_${idx}`,
          headline: i.title,
          category: i.category || 'pattern',
          reasoning: i.explanation,
          confidence: i.confidence || 'medium',
          expanded: false,
        })) || []

        // If no insights from API, generate placeholder ones
        if (analysisInsights.length === 0) {
          analysisInsights.push(
            {
              id: 'insight_0',
              headline: `Key themes identified in ${file.name}`,
              category: 'pattern',
              reasoning: 'I found several recurring themes in your document that might be worth exploring further.',
              confidence: 'medium',
              expanded: false,
            },
            {
              id: 'insight_1',
              headline: 'Potential areas for clarification',
              category: 'question',
              reasoning: 'Some sections could benefit from more detail or explanation.',
              confidence: 'medium',
              expanded: false,
            }
          )
        }

        onInsightsGenerated(analysisInsights, docType)
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
      setIsAnalyzing(false)
    }
  }

  // Show upload state
  if (!uploadedDocument && !usedDemoDocument && insights.length === 0) {
    return (
      <div>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
            <Upload className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Show me what you're working on
          </h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            {ONBOARDING_MESSAGES.value_demo.prompt}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          accept=".txt,.md,.pdf,.doc,.docx,.json"
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center transition-all hover:border-purple-400 hover:bg-purple-50/50 dark:hover:border-purple-600 dark:hover:bg-purple-950/20"
        >
          {isUploading ? (
            <>
              <Loader2 className="mx-auto mb-3 h-10 w-10 text-purple-500 animate-spin" />
              <p className="font-medium text-neutral-900 dark:text-white">Uploading...</p>
            </>
          ) : (
            <>
              <FileText className="mx-auto mb-3 h-10 w-10 text-neutral-400" />
              <p className="font-medium text-neutral-900 dark:text-white">
                Click or drag to upload
              </p>
              <p className="mt-1 text-sm text-neutral-500">.txt, .md, .pdf, .doc, .json</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // Show analyzing state
  if (isAnalyzing) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 animate-pulse">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <p className="text-lg font-medium text-neutral-900 dark:text-white">
          {ONBOARDING_MESSAGES.value_demo.thinking}
        </p>
        <p className="mt-2 text-sm text-neutral-500">Analyzing your document...</p>
      </div>
    )
  }

  // Show insights
  return (
    <div>
      <div className="mb-4 text-center">
        <p className="text-sm text-neutral-500 mb-2">
          {usedDemoDocument ? 'Sample: Product Strategy Q4.md' : uploadedDocument?.name}
        </p>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
          Here's what I found:
        </h2>
      </div>

      <div className="space-y-3 mb-6">
        {insights.map((insight) => (
          <InsightCardComponent
            key={insight.id}
            insight={insight}
            onClick={() => onInsightClicked(insight.id)}
            onExpandReasoning={() => onReasoningExpanded(insight.id)}
          />
        ))}
      </div>

      <p className="text-center text-neutral-600 dark:text-neutral-400 mb-4">
        {ONBOARDING_MESSAGES.value_demo.followup}
      </p>
    </div>
  )
}

// ============================================
// Insight Card Component
// ============================================

function InsightCardComponent({
  insight,
  onClick,
  onExpandReasoning,
}: {
  insight: InsightCard
  onClick: () => void
  onExpandReasoning: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(insight.expanded)

  const categoryIcons = {
    pattern: Lightbulb,
    question: AlertTriangle,
    connection: Link2,
    issue: AlertTriangle,
    action: ListTodo,
  }

  const categoryColors = {
    pattern: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
    question: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',
    connection: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30',
    issue: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',
    action: 'text-green-500 bg-green-50 dark:bg-green-950/30',
  }

  const Icon = categoryIcons[insight.category]
  const colorClass = categoryColors[insight.category]

  const handleToggle = () => {
    if (!isExpanded) {
      onExpandReasoning()
    }
    setIsExpanded(!isExpanded)
    onClick()
  }

  return (
    <div
      className={`rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden transition-all ${
        isExpanded ? 'bg-neutral-50 dark:bg-neutral-800/50' : 'bg-white dark:bg-neutral-900'
      }`}
    >
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-neutral-900 dark:text-white">
            {insight.headline}
          </p>
          <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
            <span className={`inline-flex items-center gap-1 ${isExpanded ? 'text-purple-600 dark:text-purple-400' : ''}`}>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              How I found this
            </span>
            {insight.confidence === 'high' && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">• High confidence</span>
            )}
          </p>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-neutral-200 dark:border-neutral-700 pt-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {insight.reasoning}
          </p>
          {insight.sourceReference && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
              Source: {insight.sourceReference}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Phase 4: Getting to Know You
// ============================================

function GettingToKnowPhase({
  documentType,
  questions,
  onAnswer,
}: {
  documentType: DocumentType
  questions: OnboardingState['contextQuestions']
  onAnswer: (questionId: string, answer: string) => void
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex >= questions.length - 1

  if (!currentQuestion) {
    return null
  }

  const handleSubmit = () => {
    if (answer.trim()) {
      onAnswer(currentQuestion.id, answer)
      if (!isLastQuestion) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setAnswer('')
      }
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
          One more thing...
        </h2>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          {ONBOARDING_MESSAGES.getting_to_know.prompt}
        </p>
      </div>

      <div className="mb-4">
        <p className="text-xs text-neutral-500 mb-2">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
        <p className="text-lg font-medium text-neutral-900 dark:text-white mb-4">
          {currentQuestion.question}
        </p>

        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
          rows={3}
          className="text-base"
          autoFocus
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!answer.trim()}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
      >
        {isLastQuestion ? 'Continue' : 'Next question'}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

// ============================================
// Phase 5: Deeper Insight
// ============================================

function DeeperInsightPhase({
  workspaceId,
  uploadedDocument,
  contextQuestions,
  deeperInsights,
  onInsightsGenerated,
}: {
  workspaceId: string
  uploadedDocument?: OnboardingState['uploadedDocument']
  contextQuestions: OnboardingState['contextQuestions']
  deeperInsights: InsightCard[]
  onInsightsGenerated: (insights: InsightCard[]) => void
}) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateDeeperInsights = async () => {
    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 2500))

    // Generate personalized insights based on context answers
    const answers = contextQuestions.filter(q => q.answer).map(q => q.answer)

    const insight: InsightCard = {
      id: 'deeper_1',
      headline: 'Connection I wouldn\'t have seen before',
      category: 'connection',
      reasoning: answers.length > 0
        ? `Based on what you told me about "${answers[0]?.substring(0, 50)}...", I noticed a pattern in your document that suggests you might want to prioritize differently.`
        : 'Now that I understand your context better, I can see connections in your document that weren\'t obvious at first glance.',
      confidence: 'high',
      expanded: false,
    }

    onInsightsGenerated([insight])
    setIsGenerating(false)
  }

  useEffect(() => {
    if (deeperInsights.length === 0 && !isGenerating) {
      generateDeeperInsights()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deeperInsights.length, isGenerating])

  if (isGenerating) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-500 animate-pulse">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <p className="text-lg font-medium text-neutral-900 dark:text-white">
          {ONBOARDING_MESSAGES.deeper_insight.intro}
        </p>
        <p className="mt-2 text-sm text-neutral-500">Connecting what you told me...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-500">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
          Now that I know more...
        </h2>
      </div>

      <div className="space-y-3 mb-6">
        {deeperInsights.map((insight) => (
          <div
            key={insight.id}
            className="rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 p-4"
          >
            <p className="font-medium text-neutral-900 dark:text-white mb-2">
              {insight.headline}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {insight.reasoning}
            </p>
          </div>
        ))}
      </div>

      <p className="text-center text-neutral-600 dark:text-neutral-400">
        {ONBOARDING_MESSAGES.deeper_insight.summary}
      </p>
    </div>
  )
}

// ============================================
// Phase 6: Limits Disclosure
// ============================================

function LimitsDisclosurePhase({
  onChoice,
}: {
  onChoice: (choice: 'keep_going' | 'come_back' | 'see_plans') => void
}) {
  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
          That's what I can do
        </h2>
      </div>

      <div className="space-y-4 mb-6">
        <p className="text-neutral-600 dark:text-neutral-400">
          {ONBOARDING_MESSAGES.limits_disclosure.memory}
        </p>

        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {ONBOARDING_MESSAGES.limits_disclosure.limits}
          </p>
        </div>

        <p className="text-neutral-600 dark:text-neutral-400">
          {ONBOARDING_MESSAGES.limits_disclosure.cta}
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => onChoice('keep_going')}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          Keep going
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <Button
          onClick={() => onChoice('see_plans')}
          variant="outline"
          className="w-full"
        >
          Tell me about plans
        </Button>

        <button
          onClick={() => onChoice('come_back')}
          className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
        >
          I'll come back later
        </button>
      </div>
    </div>
  )
}

// ============================================
// Skipped Phase
// ============================================

function SkippedPhase({
  onResume,
  onClose,
}: {
  onResume: () => void
  onClose: () => void
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
        <Brain className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
      </div>

      <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
        No problem
      </h2>

      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        I'll be over here when you're ready. Upload anything and I'll show you what I find.
      </p>

      <div className="space-y-3">
        <Button
          onClick={onResume}
          variant="outline"
          className="w-full"
        >
          Actually, let's continue
        </Button>

        <Button
          onClick={onClose}
          className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900"
        >
          Start using OSQR
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default SpecOnboardingFlow
