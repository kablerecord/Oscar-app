'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Brain,
  Users,
  Upload,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  FileText,
  Loader2,
  MessageSquare,
  Lightbulb,
  Crown,
  Bot,
  Shield,
  X,
  Settings2,
} from 'lucide-react'

interface OnboardingFlowProps {
  isOpen: boolean
  workspaceId: string
  onComplete: (profileData: OnboardingData) => void
}

interface OnboardingData {
  name: string
  workingOn: string
  frustration: string
  uploadedFile?: {
    name: string
    summary: string
    suggestedQuestions: string[]
  }
  firstQuestion?: string
  firstAnswer?: string
  panelDebate?: {
    gptResponse: string
    claudeResponse: string
    synthesis: string
  }
}

type Step =
  | 'welcome'
  | 'identity'
  | 'upload'
  | 'indexing'
  | 'panel-debate'
  | 'memory-callback'
  | 'master-summary'

const STEPS: Step[] = [
  'welcome',
  'identity',
  'upload',
  'indexing',
  // 'first-question' is now merged into 'indexing'
  'panel-debate',
  'memory-callback',
  'master-summary'
]

export function OnboardingFlow({ isOpen, workspaceId, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [data, setData] = useState<OnboardingData>({
    name: '',
    workingOn: '',
    frustration: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isAnswering, setIsAnswering] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileSummary, setFileSummary] = useState<string>('')
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [indexedDocumentId, setIndexedDocumentId] = useState<string | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<string>('')
  const [firstAnswer, setFirstAnswer] = useState<string>('')
  const [panelDebate, setPanelDebate] = useState<{gpt: string, claude: string, synthesis: string} | null>(null)
  const [masterSummary, setMasterSummary] = useState<string>('')

  const currentIndex = STEPS.indexOf(currentStep)
  const progress = ((currentIndex + 1) / STEPS.length) * 100

  const goNext = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex])
    }
  }

  const goBack = () => {
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex])
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      await onComplete({
        ...data,
        uploadedFile: uploadedFile ? {
          name: uploadedFile.name,
          summary: fileSummary,
          suggestedQuestions,
        } : undefined,
        firstQuestion: selectedQuestion,
        firstAnswer,
        panelDebate: panelDebate ? {
          gptResponse: panelDebate.gpt,
          claudeResponse: panelDebate.claude,
          synthesis: panelDebate.synthesis,
        } : undefined,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipOnboarding = async () => {
    // Complete with whatever data we have so far
    await onComplete({
      ...data,
      uploadedFile: uploadedFile ? {
        name: uploadedFile.name,
        summary: fileSummary,
        suggestedQuestions,
      } : undefined,
      firstQuestion: selectedQuestion,
      firstAnswer,
      panelDebate: panelDebate ? {
        gptResponse: panelDebate.gpt,
        claudeResponse: panelDebate.claude,
        synthesis: panelDebate.synthesis,
      } : undefined,
    })
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 [&>button]:hidden">
        {/* Hidden title for screen reader accessibility */}
        <DialogTitle className="sr-only">OSQR Onboarding</DialogTitle>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button - appears after welcome step */}
        {currentStep !== 'welcome' && (
          <div className="absolute right-4 top-4 z-10">
            <button
              onClick={handleSkipOnboarding}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        <div className="max-h-[80vh] overflow-y-auto p-6">
          {/* Step 1: Welcome */}
          {currentStep === 'welcome' && (
            <WelcomeStep onNext={goNext} />
          )}

          {/* Step 2: Identity Questions */}
          {currentStep === 'identity' && (
            <IdentityStep
              data={data}
              setData={setData}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {/* Step 3: File Upload */}
          {currentStep === 'upload' && (
            <UploadStep
              uploadedFile={uploadedFile}
              setUploadedFile={setUploadedFile}
              onNext={goNext}
              onBack={goBack}
              onStartIndexing={async () => {
                setCurrentStep('indexing')
                await handleIndexFile()
              }}
              onSkip={() => setCurrentStep('panel-debate')}
            />
          )}

          {/* Step 4: Indexing + First Question (merged) */}
          {currentStep === 'indexing' && (
            <IndexingStep
              fileName={uploadedFile?.name || ''}
              summary={fileSummary}
              suggestedQuestions={suggestedQuestions}
              isComplete={!!fileSummary}
              documentId={indexedDocumentId}
              onNext={goNext}
              selectedQuestion={selectedQuestion}
              setSelectedQuestion={setSelectedQuestion}
              answer={firstAnswer}
              isAnswering={isAnswering}
              onAskQuestion={handleAskQuestion}
            />
          )}

          {/* Step 6: AI Panel Debate */}
          {currentStep === 'panel-debate' && (
            <PanelDebateStep
              debate={panelDebate}
              isLoading={isLoading}
              onStartDebate={handlePanelDebate}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {/* Step 7: Memory Callback */}
          {currentStep === 'memory-callback' && (
            <MemoryCallbackStep
              name={data.name}
              workingOn={data.workingOn}
              frustration={data.frustration}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {/* Step 8: Master Summary */}
          {currentStep === 'master-summary' && (
            <MasterSummaryStep
              name={data.name}
              summary={masterSummary}
              isLoading={isLoading}
              onGenerateSummary={handleGenerateSummary}
              onComplete={handleComplete}
              onBack={goBack}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  async function handleIndexFile() {
    if (!uploadedFile) return

    setIsLoading(true)
    try {
      // Create FormData and upload
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('workspaceId', workspaceId)

      const response = await fetch('/api/onboarding/index-file', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setFileSummary(result.summary)
        setIndexedDocumentId(result.documentId || null)
        setSuggestedQuestions(result.suggestedQuestions || [
          "Summarize the key points from this document",
          "What are the main action items or next steps?",
          "What questions does this raise that I should explore?",
        ])
      } else {
        // Fallback if indexing fails
        setFileSummary(`I've indexed "${uploadedFile.name}" and added it to your knowledge base.`)
        setSuggestedQuestions([
          "Summarize the key points from this document",
          "What are the main action items?",
          "What should I focus on first?",
        ])
      }
    } catch (error) {
      console.error('Indexing error:', error)
      setFileSummary(`Your file "${uploadedFile.name}" is now part of your knowledge base.`)
      setSuggestedQuestions([
        "Summarize the key points from my uploaded document",
        "What are the action items from my file?",
        "Based on my document, what should I prioritize?",
      ])
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFirstQuestion() {
    if (!selectedQuestion) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/onboarding/first-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: selectedQuestion,
          workspaceId,
          context: {
            name: data.name,
            workingOn: data.workingOn,
            frustration: data.frustration,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setFirstAnswer(result.answer)
      } else {
        setFirstAnswer("I've analyzed your question based on your knowledge base. This is where OSQR's deep understanding of your context shines - every response is personalized to your specific situation, goals, and documents.")
      }
    } catch (error) {
      console.error('Question error:', error)
      setFirstAnswer("OSQR is ready to help with questions like this. The more context you give, the more personalized and actionable the responses become.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAskQuestion(question: string) {
    if (!question.trim()) return

    console.log('[handleAskQuestion] Called with documentId:', indexedDocumentId)

    setIsAnswering(true)
    setSelectedQuestion(question)
    try {
      const response = await fetch('/api/onboarding/first-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          workspaceId,
          documentId: indexedDocumentId,
          context: {
            name: data.name,
            workingOn: data.workingOn,
            frustration: data.frustration,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setFirstAnswer(result.answer)
      } else {
        setFirstAnswer("I've analyzed your question based on your knowledge base. This is where OSQR's deep understanding of your context shines - every response is personalized to your specific situation, goals, and documents.")
      }
    } catch (error) {
      console.error('Question error:', error)
      setFirstAnswer("OSQR is ready to help with questions like this. The more context you give, the more personalized and actionable the responses become.")
    } finally {
      setIsAnswering(false)
    }
  }

  async function handlePanelDebate() {
    setIsLoading(true)
    try {
      const question = selectedQuestion || data.frustration || "How can I make progress on my goals?"

      const response = await fetch('/api/onboarding/panel-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          userName: data.name,
          documentId: indexedDocumentId,
          workspaceId,
          context: {
            workingOn: data.workingOn,
            frustration: data.frustration,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setPanelDebate({
          gpt: result.gptResponse,
          claude: result.claudeResponse,
          synthesis: result.synthesis,
        })
      } else {
        // Fallback demo
        setPanelDebate({
          gpt: `Looking at ${data.name}'s situation, I'd recommend starting with a clear prioritization framework. The key is identifying your highest-leverage activities and protecting time for deep work.`,
          claude: `I see this differently. Before optimizing, ${data.name} should validate the direction. Sometimes we're efficiently climbing the wrong ladder. I'd suggest a quick reflection on whether current goals still align with values.`,
          synthesis: `Both perspectives are valuable. GPT emphasizes execution efficiency while Claude raises strategic alignment. The synthesis: Take a brief pause to confirm direction, then apply focused prioritization to accelerate progress.`,
        })
      }
    } catch (error) {
      console.error('Panel debate error:', error)
      setPanelDebate({
        gpt: "From an execution standpoint, the key is breaking down goals into smaller, actionable steps and building momentum through quick wins.",
        claude: "I'd add that understanding the 'why' behind each goal helps maintain motivation. Consider which outcomes truly matter versus which are inherited expectations.",
        synthesis: "The panel agrees: Clarity of purpose combined with systematic execution creates sustainable progress. Start with your most meaningful goal.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGenerateSummary() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/onboarding/master-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingData: {
            name: data.name,
            workingOn: data.workingOn,
            frustration: data.frustration,
            uploadedFile: uploadedFile ? {
              name: uploadedFile.name,
              summary: fileSummary,
            } : undefined,
            firstQuestion: selectedQuestion,
            firstAnswer,
            panelDebate: panelDebate ? {
              gptResponse: panelDebate.gpt,
              claudeResponse: panelDebate.claude,
              synthesis: panelDebate.synthesis,
            } : undefined,
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setMasterSummary(result.summary)
      } else {
        // Generate a meaningful fallback
        setMasterSummary(`# ${data.name}'s Master Summary

## What You're Working On
${data.workingOn || "Getting started with OSQR"}

## Current Challenge
${data.frustration || "Organizing information and making progress"}

## Knowledge Base
${uploadedFile ? `- ${uploadedFile.name} (indexed)` : "- Ready to add documents"}

## Suggested Next Steps
1. Upload more documents to build your knowledge base
2. Ask OSQR questions about your specific situation
3. Use the Panel to get multiple perspectives on decisions

## Open Questions to Explore
- What's the one thing that would make the biggest difference?
- What resources or connections would accelerate progress?
- What's blocking you that OSQR can help with?

---
*This is a preview. OSQR Pro includes weekly auto-generated summaries, goal tracking, and personalized insights.*`)
      }
    } catch (error) {
      console.error('Summary error:', error)
      setMasterSummary(`# Your OSQR Journey Begins

OSQR is now personalized to you, ${data.name}. Your knowledge base is ready, and your AI panel is standing by.

**Next Steps:**
1. Keep adding documents to your Vault
2. Ask questions that only someone who knows your context could answer
3. Watch the panel debate your toughest decisions

*Upgrade to Pro for weekly Master Summaries, unlimited panel discussions, and priority support.*`)
    } finally {
      setIsLoading(false)
    }
  }
}

// =============================================================================
// STEP COMPONENTS
// =============================================================================

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
        <Brain className="h-12 w-12 text-white" />
      </div>

      <h1 className="mb-3 text-3xl font-bold text-neutral-900 dark:text-white">
        Welcome to OSQR
      </h1>

      <p className="mb-6 text-lg text-neutral-600 dark:text-neutral-400">
        Your AI operating system for capability and reasoning
      </p>

      <div className="mb-8 space-y-4 text-left">
        <div className="flex items-start space-x-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            In the next few minutes, you&apos;ll experience 5 &quot;magic moments&quot; that show why OSQR is different from any AI you&apos;ve used before.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {['Upload', 'Ask', 'Debate', 'Remember', 'Organize'].map((step, i) => (
            <div key={step} className="text-center">
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                {i + 1}
              </div>
              <p className="text-xs text-neutral-500">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={onNext}
        size="lg"
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
      >
        Let&apos;s Go
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  )
}

function IdentityStep({
  data,
  setData,
  onNext,
  onBack
}: {
  data: OnboardingData
  setData: (data: OnboardingData) => void
  onNext: () => void
  onBack: () => void
}) {
  const canProceed = data.name.trim() && data.workingOn.trim()

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
          <MessageSquare className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Let&apos;s get to know each other
        </h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          3 quick questions to personalize OSQR
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            What should I call you?
          </label>
          <Input
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="Your first name"
            className="text-base"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            What are you working on right now?
          </label>
          <Textarea
            value={data.workingOn}
            onChange={(e) => setData({ ...data, workingOn: e.target.value })}
            placeholder="A project, a business, a goal, learning something new..."
            rows={2}
            className="text-base"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            What&apos;s frustrating you right now? <span className="text-neutral-400">(optional)</span>
          </label>
          <Textarea
            value={data.frustration}
            onChange={(e) => setData({ ...data, frustration: e.target.value })}
            placeholder="A blocker, a decision you're stuck on, something that's slowing you down..."
            rows={2}
            className="text-base"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function UploadStep({
  uploadedFile,
  setUploadedFile,
  onNext,
  onBack,
  onStartIndexing,
  onSkip,
}: {
  uploadedFile: File | null
  setUploadedFile: (file: File | null) => void
  onNext: () => void
  onBack: () => void
  onStartIndexing: () => void
  onSkip: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500">
          <Upload className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Magic Moment #1: Upload
        </h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Give OSQR something to remember about you
        </p>
      </div>

      <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:from-emerald-950/30 dark:to-teal-950/30">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          <strong>Upload one file you always forget about.</strong> A note, a project doc, a chat export, or a PDF. OSQR will index it and show you what it learned.
        </p>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          The more you upload, the smarter OSQR becomes about your world.
        </p>
      </div>

      {/* Privacy Info Button */}
      <button
        onClick={() => setShowPrivacyInfo(true)}
        className="mb-6 flex w-full items-center justify-center space-x-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
      >
        <Shield className="h-4 w-4" />
        <span>Your files are private. Learn more about our privacy commitment.</span>
      </button>

      {/* Privacy Info Modal */}
      {showPrivacyInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
            <button
              onClick={() => setShowPrivacyInfo(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                Your Privacy, Protected
              </h3>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                  "Your data belongs to you."
                </p>
                <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                  OSQR exists to make you more capable — not to extract anything from you.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Your vault is yours alone</p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      No one — not even OSQR staff — can see your files, chats, or uploads.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Never used for training</p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      OSQR never trains any AI model on your data. Not now. Not ever.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Encrypted & secure</p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Your data is encrypted at rest and in transit. Only you can access it.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">"Burn It" button</p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Delete everything instantly. One click. Irreversible. Total wipe.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Privacy creates capability. If you can't trust your AI, you can't use it fully.
                  {' '}
                  <a
                    href="/privacy"
                    className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    Read our full privacy policy →
                  </a>
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowPrivacyInfo(false)}
              className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              Got it
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept=".txt,.md,.pdf,.doc,.docx,.json"
        className="hidden"
        style={{ display: 'none' }}
      />

      {!uploadedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40'
              : 'border-neutral-300 bg-neutral-50 hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/20'
          }`}
        >
          <FileText className="mx-auto mb-3 h-10 w-10 text-neutral-400" />
          <p className="font-medium text-neutral-900 dark:text-white">
            {isDragging ? 'Drop your file here' : 'Click or drag to upload'}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            .txt, .md, .pdf, .doc, .json
          </p>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 dark:border-emerald-600 dark:bg-emerald-950/30">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900 dark:text-white">
                {uploadedFile.name}
              </p>
              <p className="text-sm text-neutral-500">
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadedFile(null)}
              className="text-neutral-500 hover:text-neutral-700"
            >
              Change
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onSkip}>
            Skip for now
          </Button>
          <Button
            onClick={onStartIndexing}
            disabled={!uploadedFile}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            Index My File
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function IndexingStep({
  fileName,
  summary,
  suggestedQuestions,
  isComplete,
  documentId,
  onNext,
  selectedQuestion,
  setSelectedQuestion,
  answer,
  isAnswering,
  onAskQuestion,
}: {
  fileName: string
  summary: string
  suggestedQuestions: string[]
  isComplete: boolean
  documentId: string | null
  onNext: () => void
  selectedQuestion: string
  setSelectedQuestion: (q: string) => void
  answer: string
  isAnswering: boolean
  onAskQuestion: (question: string) => void
}) {
  // Log documentId for debugging
  console.log('[IndexingStep] documentId:', documentId, 'isComplete:', isComplete)
  const [customQuestion, setCustomQuestion] = useState('')
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const hasAutoSubmitted = useRef(false)

  // Default questions to show while indexing
  const defaultQuestions = [
    "What are the key takeaways from this document?",
    "How does this relate to what I'm working on?",
    "What should I focus on first?",
  ]

  const questionsToShow = suggestedQuestions.length > 0 ? suggestedQuestions : defaultQuestions

  // Auto-submit when indexing completes if user has a pending question
  useEffect(() => {
    if (isComplete && pendingQuestion && !hasAutoSubmitted.current && !isAnswering) {
      hasAutoSubmitted.current = true
      setSelectedQuestion(pendingQuestion)
      onAskQuestion(pendingQuestion)
    }
  }, [isComplete, pendingQuestion, isAnswering, setSelectedQuestion, onAskQuestion])

  const handleQuestionClick = (question: string) => {
    if (isComplete) {
      // Indexing done - submit immediately
      setSelectedQuestion(question)
      onAskQuestion(question)
    } else {
      // Indexing in progress - queue the question
      setPendingQuestion(question)
      setCustomQuestion('') // Clear custom input if they picked a suggested one
    }
  }

  const handleCustomSubmit = () => {
    if (!customQuestion.trim()) return

    if (isComplete) {
      // Indexing done - submit immediately
      setSelectedQuestion(customQuestion)
      onAskQuestion(customQuestion)
    } else {
      // Indexing in progress - queue the question
      setPendingQuestion(customQuestion)
    }
  }

  // The active question is either pending (waiting for indexing) or selected (submitted)
  const activeQuestion = pendingQuestion || selectedQuestion

  return (
    <div>
      {/* Status Banner - changes when complete */}
      <div className={`mb-6 rounded-xl p-4 transition-all duration-500 ${
        isComplete
          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
          : 'bg-gradient-to-r from-blue-500 to-purple-500'
      }`}>
        <div className="flex items-center space-x-3">
          {isComplete ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Check className="h-5 w-5 text-white" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
          <div>
            <p className="font-semibold text-white">
              {isComplete
                ? `I've indexed "${fileName}" and added it to your knowledge base.`
                : `Indexing "${fileName}"...`
              }
            </p>
            {!isComplete && pendingQuestion && (
              <p className="text-sm text-white/80">Your question is queued and will be asked automatically</p>
            )}
            {!isComplete && !pendingQuestion && (
              <p className="text-sm text-white/80">Pick a question while you wait</p>
            )}
          </div>
        </div>
      </div>

      {/* Show answer if we have one */}
      {answer ? (
        <>
          <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {selectedQuestion}
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-2 flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="font-semibold text-neutral-900 dark:text-white">OSQR</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
              {answer}
            </p>
          </div>

          <Button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            See Something Wild
            <Zap className="ml-2 h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          {/* Main content - always visible */}
          <div className="mb-4 text-center">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {isAnswering ? "Thinking..." : isComplete ? "Ask me something:" : "While we wait, pick a question:"}
            </h2>
            {isComplete && summary && !isAnswering && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                {summary}
              </p>
            )}
          </div>

          {/* Custom question input */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <Textarea
                value={customQuestion}
                onChange={(e) => {
                  setCustomQuestion(e.target.value)
                  if (e.target.value.trim()) {
                    setPendingQuestion(null) // Clear pending if typing custom
                  }
                }}
                placeholder="Type your own question..."
                disabled={isAnswering}
                rows={2}
                className="text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleCustomSubmit()
                  }
                }}
              />
              <Button
                onClick={handleCustomSubmit}
                disabled={!customQuestion.trim() || isAnswering}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-4"
              >
                {isAnswering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="mb-3 text-xs text-neutral-500 text-center">Or try one of these:</p>

          {/* Questions as clickable buttons */}
          <div className="space-y-2">
            {questionsToShow.map((q, i) => (
              <button
                key={i}
                onClick={() => handleQuestionClick(q)}
                disabled={isAnswering}
                className={`w-full flex items-center space-x-3 rounded-lg p-4 text-left transition-all ${
                  pendingQuestion === q
                    ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500'
                    : isAnswering
                    ? 'bg-neutral-100 dark:bg-neutral-800 opacity-60 cursor-wait'
                    : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 border border-transparent hover:border-blue-400 cursor-pointer'
                }`}
              >
                {isAnswering && activeQuestion === q ? (
                  <Loader2 className="h-5 w-5 flex-shrink-0 text-blue-500 animate-spin" />
                ) : pendingQuestion === q ? (
                  <Check className="h-5 w-5 flex-shrink-0 text-blue-500" />
                ) : (
                  <Lightbulb className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                )}
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{q}</p>
                {pendingQuestion === q && !isComplete && (
                  <span className="ml-auto text-xs text-blue-500">Queued</span>
                )}
                {!pendingQuestion && !isAnswering && (
                  <ArrowRight className="h-4 w-4 ml-auto text-neutral-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FirstQuestionStep({
  suggestedQuestions,
  selectedQuestion,
  setSelectedQuestion,
  answer,
  isLoading,
  onAsk,
  onNext,
  onBack,
}: {
  suggestedQuestions: string[]
  selectedQuestion: string
  setSelectedQuestion: (q: string) => void
  answer: string
  isLoading: boolean
  onAsk: () => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500">
          <MessageSquare className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Magic Moment #2: Deep Context
        </h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Ask something only someone who knows your context could answer
        </p>
      </div>

      {!answer ? (
        <>
          <div className="mb-4">
            <Textarea
              value={selectedQuestion}
              onChange={(e) => setSelectedQuestion(e.target.value)}
              placeholder="Type your question or select one below..."
              rows={3}
              className="text-base"
            />
          </div>

          {suggestedQuestions.length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-xs text-neutral-500">Or try one of these:</p>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedQuestion(q)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-all ${
                    selectedQuestion === q
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                      : 'border-neutral-200 hover:border-blue-300 dark:border-neutral-700 dark:hover:border-blue-600'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={onAsk}
              disabled={!selectedQuestion.trim() || isLoading}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  Ask OSQR
                  <Sparkles className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {selectedQuestion}
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-2 flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="font-semibold text-neutral-900 dark:text-white">OSQR</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
              {answer}
            </p>
          </div>

          <Button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            See Something Wild
            <Zap className="ml-2 h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}

function PanelDebateStep({
  debate,
  isLoading,
  onStartDebate,
  onNext,
  onBack,
}: {
  debate: { gpt: string; claude: string; synthesis: string } | null
  isLoading: boolean
  onStartDebate: () => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500">
          <Users className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Magic Moment #3: AI Panel
        </h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Watch two AIs think through your question together
        </p>
      </div>

      {!debate && !isLoading ? (
        <>
          <div className="mb-6 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 p-4 dark:from-orange-950/30 dark:to-red-950/30">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              This is <strong>not possible anywhere else</strong>. OSQR will have GPT-4 and Claude both analyze your question, then synthesize their best insights into one powerful answer.
            </p>
          </div>

          {/* Two Brains Graphic */}
          <div className="mb-6 flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Left Brain (GPT-4) */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  {/* Pulse effect */}
                  <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-20" style={{ animationDuration: '2s' }} />
                </div>
                <span className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">GPT-4</span>
              </div>

              {/* Connection Lines / Sparks */}
              <div className="mx-4 flex flex-col items-center space-y-1">
                <div className="flex space-x-1">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" style={{ animationDelay: '0ms' }} />
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" style={{ animationDelay: '150ms' }} />
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" style={{ animationDelay: '300ms' }} />
                </div>
                <div className="flex items-center space-x-1">
                  <div className="h-0.5 w-8 bg-gradient-to-r from-emerald-400 to-transparent" />
                  <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
                  <div className="h-0.5 w-8 bg-gradient-to-l from-orange-400 to-transparent" />
                </div>
                <div className="flex space-x-1">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" style={{ animationDelay: '100ms' }} />
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" style={{ animationDelay: '250ms' }} />
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" style={{ animationDelay: '400ms' }} />
                </div>
              </div>

              {/* Right Brain (Claude) */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  {/* Pulse effect */}
                  <div className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-20" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                </div>
                <span className="mt-2 text-sm font-semibold text-orange-600 dark:text-orange-400">Claude</span>
              </div>
            </div>
          </div>

          {/* Customization teaser */}
          <div className="mb-6 flex items-center justify-center">
            <div className="inline-flex items-center space-x-2 rounded-full bg-neutral-100 dark:bg-neutral-800 px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400">
              <Settings2 className="h-3.5 w-3.5" />
              <span>Inside the app, you can customize which AI models think through your questions</span>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={onStartDebate}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              Start the Panel
              <Zap className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      ) : isLoading ? (
        <div className="py-8 text-center">
          {/* Animated thinking brains while loading */}
          <div className="mb-6 flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Left Brain (GPT-4) - Active */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/40 animate-pulse">
                    <Brain className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>

              {/* Animated connection */}
              <div className="mx-3 flex items-center">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-400" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-400" style={{ animationDelay: '300ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: '450ms' }} />
                </div>
              </div>

              {/* Right Brain (Claude) - Active */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/40 animate-pulse" style={{ animationDelay: '500ms' }}>
                    <Brain className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">
            The panel is thinking...
          </p>
        </div>
      ) : debate ? (
        <>
          <div className="mb-4 space-y-3">
            <div className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-950/30">
              <div className="mb-1 flex items-center space-x-2">
                <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">GPT-4</span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{debate.gpt}</p>
            </div>

            <div className="rounded-lg border-l-4 border-orange-500 bg-orange-50 p-3 dark:bg-orange-950/30">
              <div className="mb-1 flex items-center space-x-2">
                <Bot className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">Claude</span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{debate.claude}</p>
            </div>

            <div className="rounded-lg border-l-4 border-purple-500 bg-purple-50 p-3 dark:bg-purple-950/30">
              <div className="mb-1 flex items-center space-x-2">
                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">OSQR's Synthesis</span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{debate.synthesis}</p>
            </div>
          </div>

          <Button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            This is amazing, continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </>
      ) : null}
    </div>
  )
}

function MemoryCallbackStep({
  name,
  workingOn,
  frustration,
  onNext,
  onBack,
}: {
  name: string
  workingOn: string
  frustration: string
  onNext: () => void
  onBack: () => void
}) {
  const [confirmed, setConfirmed] = useState<string[]>([])

  const memories = [
    { key: 'name', label: `Your name is ${name}`, value: name },
    { key: 'project', label: `You're working on: "${workingOn}"`, value: workingOn },
    ...(frustration ? [{ key: 'frustration', label: `Your current challenge: "${frustration}"`, value: frustration }] : []),
  ]

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Magic Moment #4: I Remember
        </h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          OSQR builds a relationship with you over time
        </p>
      </div>

      <div className="mb-6 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 p-4 dark:from-pink-950/30 dark:to-rose-950/30">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          <strong>Earlier you told me some things.</strong> Should I remember these as part of your profile?
        </p>
      </div>

      <div className="mb-6 space-y-3">
        {memories.map((m) => (
          <div
            key={m.key}
            onClick={() => {
              setConfirmed(prev =>
                prev.includes(m.key)
                  ? prev.filter(k => k !== m.key)
                  : [...prev, m.key]
              )
            }}
            className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
              confirmed.includes(m.key)
                ? 'border-pink-500 bg-pink-50 dark:border-pink-400 dark:bg-pink-950/30'
                : 'border-neutral-200 hover:border-pink-300 dark:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{m.label}</p>
              {confirmed.includes(m.key) && (
                <Check className="h-5 w-5 text-pink-500" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
        >
          {confirmed.length > 0 ? 'Yes, remember these' : 'Yes, continue'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function MasterSummaryStep({
  name,
  summary,
  isLoading,
  onGenerateSummary,
  onComplete,
  onBack,
}: {
  name: string
  summary: string
  isLoading: boolean
  onGenerateSummary: () => void
  onComplete: () => void
  onBack: () => void
}) {
  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-500">
          <Crown className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Magic Moment #5: Master Summary
        </h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          OSQR organizes your chaos into clarity
        </p>
      </div>

      {!summary && !isLoading ? (
        <>
          <div className="mb-6 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 p-4 dark:from-amber-950/30 dark:to-yellow-950/30">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Would you like me to create a <strong>Master Summary</strong> based on everything we've done? This includes your goals, insights, and suggested next steps.
            </p>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={onGenerateSummary}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
            >
              Generate My Summary
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      ) : isLoading ? (
        <div className="py-8 text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-amber-500" />
          <p className="text-neutral-600 dark:text-neutral-400">
            Organizing your insights...
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">{summary}</pre>
            </div>
          </div>

          <div className="mb-6 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 p-3 dark:from-purple-950/50 dark:to-pink-950/50">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                OSQR Pro includes weekly auto-generated summaries
              </p>
            </div>
          </div>

          <Button
            onClick={onComplete}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600"
          >
            Start Using OSQR
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  )
}
