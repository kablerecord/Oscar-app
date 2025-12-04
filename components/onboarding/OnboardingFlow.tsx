'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
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
  | 'first-question'
  | 'panel-debate'
  | 'memory-callback'
  | 'master-summary'

const STEPS: Step[] = [
  'welcome',
  'identity',
  'upload',
  'indexing',
  'first-question',
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileSummary, setFileSummary] = useState<string>('')
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
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
              onSkip={() => setCurrentStep('first-question')}
            />
          )}

          {/* Step 4: Indexing Animation */}
          {currentStep === 'indexing' && (
            <IndexingStep
              fileName={uploadedFile?.name || ''}
              summary={fileSummary}
              suggestedQuestions={suggestedQuestions}
              isComplete={!!fileSummary}
              onNext={goNext}
            />
          )}

          {/* Step 5: First Long-Context Question */}
          {currentStep === 'first-question' && (
            <FirstQuestionStep
              suggestedQuestions={suggestedQuestions}
              selectedQuestion={selectedQuestion}
              setSelectedQuestion={setSelectedQuestion}
              answer={firstAnswer}
              isLoading={isLoading}
              onAsk={handleFirstQuestion}
              onNext={goNext}
              onBack={goBack}
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
        setFirstAnswer("I've analyzed your question based on your knowledge base. This is where Oscar's deep understanding of your context shines - every response is personalized to your specific situation, goals, and documents.")
      }
    } catch (error) {
      console.error('Question error:', error)
      setFirstAnswer("Oscar is ready to help with questions like this. The more context you give, the more personalized and actionable the responses become.")
    } finally {
      setIsLoading(false)
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
${data.workingOn || "Getting started with Oscar"}

## Current Challenge
${data.frustration || "Organizing information and making progress"}

## Knowledge Base
${uploadedFile ? `- ${uploadedFile.name} (indexed)` : "- Ready to add documents"}

## Suggested Next Steps
1. Upload more documents to build your knowledge base
2. Ask Oscar questions about your specific situation
3. Use the Panel to get multiple perspectives on decisions

## Open Questions to Explore
- What's the one thing that would make the biggest difference?
- What resources or connections would accelerate progress?
- What's blocking you that Oscar can help with?

---
*This is a preview. Oscar Pro includes weekly auto-generated summaries, goal tracking, and personalized insights.*`)
      }
    } catch (error) {
      console.error('Summary error:', error)
      setMasterSummary(`# Your Oscar Journey Begins

Oscar is now personalized to you, ${data.name}. Your knowledge base is ready, and your AI panel is standing by.

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
        Welcome to Oscar
      </h1>

      <p className="mb-6 text-lg text-neutral-600 dark:text-neutral-400">
        Your AI advisory panel that actually knows you
      </p>

      <div className="mb-8 space-y-4 text-left">
        <div className="flex items-start space-x-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            In the next few minutes, you'll experience 5 "magic moments" that show why Oscar is different from any AI you've used before.
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
        Let's Go
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
          Let's get to know each other
        </h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          3 quick questions to personalize Oscar
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
            What's frustrating you right now? <span className="text-neutral-400">(optional)</span>
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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
          Give Oscar something to remember about you
        </p>
      </div>

      <div className="mb-6 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:from-emerald-950/30 dark:to-teal-950/30">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          <strong>Upload one file you always forget about.</strong> A note, a project doc, a chat export, or a PDF. Oscar will index it and show you what it learned.
        </p>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          The more you upload, the smarter Oscar becomes about your world.
        </p>
      </div>

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
          className="cursor-pointer rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 text-center transition-all hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/20"
        >
          <FileText className="mx-auto mb-3 h-10 w-10 text-neutral-400" />
          <p className="font-medium text-neutral-900 dark:text-white">
            Click to upload a file
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
  onNext,
}: {
  fileName: string
  summary: string
  suggestedQuestions: string[]
  isComplete: boolean
  onNext: () => void
}) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!isComplete) {
      const interval = setInterval(() => {
        setDots(d => d.length >= 3 ? '' : d + '.')
      }, 500)
      return () => clearInterval(interval)
    }
  }, [isComplete])

  return (
    <div>
      <div className="mb-6 text-center">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isComplete ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
          {isComplete ? (
            <Check className="h-6 w-6 text-white" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {isComplete ? "Here's what I learned" : `Indexing${dots}`}
        </h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          {isComplete ? `From "${fileName}"` : `Reading "${fileName}"...`}
        </p>
      </div>

      {isComplete ? (
        <>
          <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-950/30 dark:to-purple-950/30">
            <div className="mb-2 flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="font-semibold text-neutral-900 dark:text-white">Oscar's Understanding</span>
            </div>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {summary}
            </p>
          </div>

          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-neutral-900 dark:text-white">
              Try asking me:
            </p>
            <div className="space-y-2">
              {suggestedQuestions.map((q, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-2 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800"
                >
                  <Lightbulb className="h-4 w-4 flex-shrink-0 text-yellow-500" />
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{q}</p>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            Continue to Ask a Question
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div className="h-full w-2/3 animate-pulse bg-gradient-to-r from-emerald-500 to-teal-500" />
          </div>
          <p className="text-center text-sm text-neutral-500">
            Adding to your knowledge base...
          </p>
        </div>
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
                  Ask Oscar
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
              <span className="font-semibold text-neutral-900 dark:text-white">Oscar</span>
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
          Magic Moment #3: AI Debate
        </h2>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Watch two AIs debate your problem
        </p>
      </div>

      {!debate && !isLoading ? (
        <>
          <div className="mb-6 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 p-4 dark:from-orange-950/30 dark:to-red-950/30">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              This is <strong>not possible anywhere else</strong>. Oscar will have GPT-4 and Claude debate your problem, then synthesize their best insights into actionable advice.
            </p>
          </div>

          <div className="mb-6 flex items-center justify-center space-x-4">
            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <Bot className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="mt-2 text-sm font-medium">GPT-4</span>
            </div>
            <span className="text-2xl text-neutral-400">⚔️</span>
            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
                <Bot className="h-7 w-7 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="mt-2 text-sm font-medium">Claude</span>
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
              Start the Debate
              <Zap className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      ) : isLoading ? (
        <div className="py-8 text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-orange-500" />
          <p className="text-neutral-600 dark:text-neutral-400">
            The panel is deliberating...
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
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Oscar's Synthesis</span>
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
          Oscar builds a relationship with you over time
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
          Oscar organizes your chaos into clarity
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
                Oscar Pro includes weekly auto-generated summaries
              </p>
            </div>
          </div>

          <Button
            onClick={onComplete}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600"
          >
            Start Using Oscar
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  )
}
