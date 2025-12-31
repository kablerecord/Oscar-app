'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  PanelRight,
  Sparkles,
  Target,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  MessageSquare,
  Users,
  Columns,
  Check,
  X,
  Shuffle,
  AlertCircle,
  HelpCircle,
  Lock,
  Crown,
  Scale, // Supreme Court icon
  Gavel, // Council Mode icon
  Mic,
  MicOff,
  ThumbsUp,
  ThumbsDown,
  Square, // Stop button icon
} from 'lucide-react'
import { RoutingNotification } from '@/components/oscar/RoutingNotification'
import { ShareActions } from '@/components/share/ShareActions'
import { ResponseActions } from '@/components/chat/ResponseActions'
import { QuickReactionWidget } from '@/components/lab/QuickReactionWidget'
import {
  type OnboardingState,
  getInitialOnboardingState,
  getPostColdOpenState,
  getCompletedOnboardingState,
  progressOnboarding,
  getSuggestedFirstQuestion,
} from '@/lib/onboarding/oscar-onboarding'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import type { ArtifactBlock } from '@/lib/artifacts/types'
import { CouncilPanel, CouncilBadge, type PanelMemberResponse } from '@/components/council/CouncilPanel'
import { CouncilFullView, type CouncilResponse, type CouncilSynthesisData } from '@/components/council/CouncilFullView'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ArtifactPreview } from '@/components/render/ArtifactPreview'
import { CapabilityBar, DEFAULT_CAPABILITY_STATE, type CapabilityBarState } from '@/components/oscar/CapabilityBar'
import { AttachmentArea } from '@/components/oscar/AttachmentArea'
import { IntentHint } from '@/components/oscar/IntentHint'
import { VoiceInput, VoiceOutput } from '@/components/oscar/VoiceComponents'
import { useCapabilities, type Attachment } from '@/hooks/useCapabilities'

interface AltOpinion {
  answer: string
  model: string
  provider: string
  loading?: boolean
  comparison?: {
    agreements: string[]
    disagreements: string[]
  }
}

// Available models for "See Another AI" feature
const AVAILABLE_ALT_MODELS = [
  { id: 'random', name: 'Surprise me', provider: null },
  { id: 'claude', name: 'Claude', provider: 'anthropic' },
  { id: 'gpt4', name: 'GPT-4', provider: 'openai' },
  { id: 'gpt4o', name: 'GPT-4o', provider: 'openai' },
] as const

type AltModelId = typeof AVAILABLE_ALT_MODELS[number]['id']

interface Message {
  role: 'user' | 'osqr'
  content: string
  thinking?: boolean
  artifacts?: ArtifactBlock[]
  debug?: {
    panelDiscussion?: any[]
    roundtableDiscussion?: any[]
  }
  // J-4: Council Mode - structured panel responses for visible reasoning
  councilResponses?: PanelMemberResponse[]
  councilRoundtable?: PanelMemberResponse[]
  refinedQuestion?: string // Store the refined question that was fired
  altOpinion?: AltOpinion // Alternate AI's opinion
  mode?: ResponseMode // Which mode was used for this response
  // Routing metadata from model router - "OSQR knows when to think"
  routing?: {
    questionType: string
    modelUsed: { provider: string; model: string }
    confidence: number
    shouldSuggestAltOpinion: boolean
    autoRouted?: boolean
    autoRoutedReason?: string
    requestedMode?: string
    effectiveMode?: string
    complexity?: number
  }
  // v1.1: Message tracking for feedback
  messageId?: string
  tokensUsed?: number
  // v1.5: Render system - indicates a render artifact was created
  renderComplete?: {
    artifactId: string
    type: 'IMAGE' | 'CHART' | 'TEMPLATE'
  }
  // I-9: Cross-project memory - indicates response used context from other projects
  usedCrossProjectContext?: boolean
  // I-10: Throttle - indicates response was degraded due to budget
  degraded?: boolean
}

interface RefineResult {
  originalQuestion: string
  analysis: string
  clarifyingQuestions: string[]
  suggestedRefinement: string
  readyToFire: boolean
}

import type { HighlightTarget } from '@/components/layout/RightPanelBar'

interface RefineFireChatProps {
  workspaceId: string
  onboardingCompleted?: boolean
  justCompletedColdOpen?: boolean
  coldOpenData?: { name: string; workingOn: string } | null
  userTier?: 'free' | 'pro' | 'master'
  onHighlightElement?: (target: HighlightTarget) => void
}

type ResponseMode = 'quick' | 'thoughtful' | 'contemplate' | 'supreme'
type ChatStage = 'input' | 'refining' | 'refined' | 'firing' | 'complete'

// Question refinement suggestions
interface RefinementSuggestion {
  type: 'add_context' | 'be_specific' | 'add_goal' | 'clarify_scope' | 'add_constraints' | 'good'
  message: string
  example?: string
}

function analyzeForRefinement(question: string): RefinementSuggestion | null {
  const q = question.toLowerCase().trim()
  const words = q.split(/\s+/)
  const wordCount = words.length

  // Too short - needs more context
  if (wordCount < 3 && q.length > 0) {
    return {
      type: 'add_context',
      message: 'Add more context for a better answer',
      example: 'Try: "How do I [your question] for [your specific situation]?"',
    }
  }

  // Simple factual questions - these are fine as-is, don't need Fire
  const simpleFactualPatterns = [
    /^what (is|are|was|were) \d/,           // "what is 2 x 2"
    /^how (much|many|old|long|tall|far)/,   // "how much is..."
    /^when (is|was|did|does|will)/,         // "when is..."
    /^where (is|are|was|were|do|does)/,     // "where is..."
    /^who (is|was|are|were)/,               // "who is..."
    /^define\b/,                             // "define X"
    /^what does .+ mean/,                    // "what does X mean"
    /^\d+ [\+\-\*\/x×÷] \d+/,               // math expressions
  ]
  if (simpleFactualPatterns.some(p => p.test(q))) {
    return null // Simple questions don't need refinement hints, show Send
  }

  // Vague questions that could use specificity
  const vagueStarters = [
    /^what do you think/,
    /^what about/,
    /^how about/,
    /^tell me about/,
    /^explain/,
    /^help me with/,
    /^i need help/,
  ]
  if (vagueStarters.some(p => p.test(q)) && wordCount < 8) {
    return {
      type: 'be_specific',
      message: 'Be more specific about what you want to know',
      example: 'Instead of "tell me about X", try "what are the key considerations for X when Y?"',
    }
  }

  // Very broad questions that need scope
  const broadPatterns = [
    /^how (do|can|should) (i|we|you) (start|begin|get started)/,
    /best (way|approach|practice)/,
    /everything about/,
    /all about/,
  ]
  if (broadPatterns.some(p => p.test(q)) && !q.includes('specific') && wordCount < 10) {
    return {
      type: 'clarify_scope',
      message: 'This is broad - consider narrowing the scope',
      example: 'Add constraints like timeline, budget, skill level, or specific aspect',
    }
  }

  // Decision questions without constraints
  const decisionPatterns = [
    /should (i|we)/,
    /which (one|should|is better)/,
    /\bor\b.*\?$/,
    /choose between/,
  ]
  if (decisionPatterns.some(p => p.test(q)) && wordCount < 15) {
    const hasConstraints = /\b(budget|time|cost|deadline|experience|skill|goal|priority|because|for my|for our)\b/.test(q)
    if (!hasConstraints) {
      return {
        type: 'add_constraints',
        message: 'Decision questions work better with constraints',
        example: 'Add your priorities, constraints, or what matters most to you',
      }
    }
  }

  // Signals of a thoughtful question - Fire worthy
  const thoughtfulSignals = [
    /\b(my|our|i'm|we're|i am|we are)\b/,     // Personal context
    /\b(because|since|given that|considering)\b/, // Reasoning
    /\b(goal|objective|trying to|want to|need to)\b/, // Intent
    /\b(situation|context|scenario|case)\b/,   // Context awareness
    /\b(specifically|in particular|especially)\b/, // Specificity
    /\b(business|project|team|company|product)\b/, // Domain context
    /\b(strategy|approach|framework|system)\b/, // Strategic thinking
  ]

  const thoughtfulCount = thoughtfulSignals.filter(p => p.test(q)).length

  // Good question if:
  // - Has 2+ thoughtful signals, OR
  // - Has 1 thoughtful signal AND 5+ words, OR
  // - Has a question mark AND 6+ words AND isn't a simple factual question
  if (thoughtfulCount >= 2 ||
      (thoughtfulCount >= 1 && wordCount >= 5) ||
      (q.includes('?') && wordCount >= 6)) {
    return {
      type: 'good',
      message: 'Looking good!',
    }
  }

  return null
}

// localStorage keys for persistence
const DRAFT_KEY = (workspaceId: string) => `osqr-draft-${workspaceId}`
const PENDING_REQUEST_KEY = (workspaceId: string) => `osqr-pending-${workspaceId}`

// Ref handle type for external control
export interface RefineFireChatHandle {
  setInputAndFocus: (text: string) => void
  askAndShowInBubble: (prompt: string) => Promise<void>
  focusInput: () => void
  clearChat: () => void
}

export const RefineFireChat = forwardRef<RefineFireChatHandle, RefineFireChatProps>(
  function RefineFireChat({ workspaceId, onboardingCompleted = false, justCompletedColdOpen = false, coldOpenData = null, userTier = 'free', onHighlightElement }, ref) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatStage, setChatStage] = useState<ChatStage>('input')
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [useKnowledge, setUseKnowledge] = useState(true)
  // One-shot toggle to force panel mode for a single question (auto-resets after response)
  // Also shows the council deliberation when panel responses are returned
  const [forcePanel, setForcePanel] = useState(false)
  // Council Mode - full multi-model deliberation with Oscar synthesis
  const [forceCouncil, setForceCouncil] = useState(false)
  // Council Full View state
  const [councilViewOpen, setCouncilViewOpen] = useState(false)
  const [councilViewQuery, setCouncilViewQuery] = useState('')
  const [councilViewResponses, setCouncilViewResponses] = useState<CouncilResponse[]>([])
  const [councilViewSynthesis, setCouncilViewSynthesis] = useState<CouncilSynthesisData | undefined>(undefined)
  const [councilViewProcessing, setCouncilViewProcessing] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showSupremeLockedModal, setShowSupremeLockedModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showTeachingModal, setShowTeachingModal] = useState(false)
  const [hasSeenFeedbackTip, setHasSeenFeedbackTip] = useState(true) // Default true to avoid flash
  const [dontShowFeedbackTipAgain, setDontShowFeedbackTipAgain] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSentiment, setFeedbackSentiment] = useState<'positive' | 'negative' | null>(null)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  // Streaming state for bubble presence
  const [streamingState, setStreamingState] = useState<'idle' | 'thinking' | 'streaming'>('idle')

  // Render state for image/chart generation
  const [renderState, setRenderState] = useState<{
    isRendering: boolean
    artifactId: string | null
    error: string | null
  }>({ isRendering: false, artifactId: null, error: null })

  // Voice input state
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Capability bar state - AI capabilities (search, code, image, etc.)
  const [capabilityState, setCapabilityState] = useState<CapabilityBarState>(DEFAULT_CAPABILITY_STATE)

  // Attachments state for file uploads
  const [attachments, setAttachments] = useState<Attachment[]>([])

  // Capabilities hook for API calls
  const {
    uploadAttachments,
    isUploading,
    synthesizeSpeech,
    isSynthesizing,
  } = useCapabilities()

  // Notification state for errors/success
  const [notification, setNotification] = useState<{
    type: 'error' | 'success' | 'info'
    message: string
  } | null>(null)

  // AbortController for stopping streaming requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // OSQR bubble is now the primary greeting - no centered state needed

  // Client-side time greeting (instant, no API needed)
  const getTimeGreeting = (): { greeting: string; emoji: string } => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return { greeting: 'Good morning', emoji: '☀️' }
    if (hour >= 12 && hour < 17) return { greeting: 'Good afternoon', emoji: '🌤️' }
    if (hour >= 17 && hour < 21) return { greeting: 'Good evening', emoji: '🌅' }
    return { greeting: 'Burning the midnight oil', emoji: '🌙' }
  }

  // Initialize with instant default greeting (no loading state)
  const [greetingData, setGreetingData] = useState<{
    timeGreeting?: { greeting: string; emoji: string }
    firstName?: string
    contextualMessages?: string[]
    stats?: {
      vaultDocuments: number
      currentStreak: number
      todayQuestions: number
      totalQuestions: number
      capabilityLevel: number
    }
    isNewUser?: boolean
  }>({
    timeGreeting: getTimeGreeting(),
    contextualMessages: [
      "Ask me any questions you have, or we can work together in the panel."
    ],
    isNewUser: true,
  })

  // Auto-routing notification state
  const [routingNotification, setRoutingNotification] = useState<{
    autoRouted: boolean
    autoRoutedReason: string
    requestedMode: 'quick' | 'thoughtful' | 'contemplate'
    effectiveMode: 'quick' | 'thoughtful' | 'contemplate'
    questionType: string
    complexity: number
  } | null>(null)

  // Check if user can access Contemplate mode (master tier only)
  const canUseContemplate = userTier === 'master'

  // Supreme Court is earned through usage patterns, not purchased
  // For now, always false until we implement the earning system
  // TODO: Check workspace.hasEarnedSupreme or similar flag from backend
  const hasEarnedSupreme = false

  // ==========================================================================
  // RENDER HANDLER: Calls /api/render when renderPending is detected
  // This handles the flow: "Rendering..." -> generate -> "Would you like to see it?"
  // ==========================================================================
  const handleRenderRequest = useCallback(async (
    renderIntent: {
      type: 'image' | 'chart' | 'template' | null
      prompt: string
      confidence?: string
    } | null,
    iterationIntent: {
      modification: string
      conversationId: string
      type?: 'image' | 'chart' | null
    } | null,
    messageId?: string
  ) => {
    if (!renderIntent && !iterationIntent) return

    setRenderState({ isRendering: true, artifactId: null, error: null })

    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: renderIntent?.prompt || iterationIntent?.modification || '',
          workspaceId,
          conversationId: iterationIntent?.conversationId,
          messageId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Render failed')
      }

      const data = await response.json()

      if (data.artifact) {
        setRenderState({ isRendering: false, artifactId: data.artifact.id, error: null })

        const completionMessage = data.message || "Render complete. Would you like to see it?"

        // Update the database message if we have a messageId
        if (messageId) {
          try {
            await fetch(`/api/messages/${messageId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: completionMessage,
                metadata: {
                  renderComplete: true,
                  artifactId: data.artifact.id,
                  artifactType: data.artifact.type,
                },
              }),
            })
          } catch (err) {
            console.error('Failed to update message:', err)
          }
        }

        // Update the message to show render complete with action
        setMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (lastIdx >= 0 && updated[lastIdx].role === 'osqr') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: completionMessage,
              thinking: false,
              // Store render info for the UI to display action buttons
              renderComplete: {
                artifactId: data.artifact.id,
                type: data.artifact.type,
              },
            }
          }
          return updated
        })
      }
    } catch (error) {
      console.error('Render error:', error)
      setRenderState({
        isRendering: false,
        artifactId: null,
        error: error instanceof Error ? error.message : 'Render failed',
      })

      const errorMessage = `Render failed: ${error instanceof Error ? error.message : 'Unknown error'}. Would you like me to try again?`

      // Update the database message with error if we have a messageId
      if (messageId) {
        try {
          await fetch(`/api/messages/${messageId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: errorMessage,
              metadata: { renderError: true },
            }),
          })
        } catch (err) {
          console.error('Failed to update message:', err)
        }
      }

      setMessages((prev) => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (lastIdx >= 0 && updated[lastIdx].role === 'osqr') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: errorMessage,
            thinking: false,
          }
        }
        return updated
      })
    }
  }, [workspaceId])

  // Navigate to render surface when user clicks "Yes, show me"
  const handleViewRender = useCallback((artifactId: string) => {
    router.push(`/r/${artifactId}`)
  }, [router])

  // Check localStorage for feedback tip dismissal on mount
  useEffect(() => {
    const dismissed = localStorage.getItem('osqr-feedback-tip-dismissed')
    setHasSeenFeedbackTip(dismissed === 'true')
  }, [])

  // Load useKnowledge from localStorage (synced with Settings page)
  useEffect(() => {
    const stored = localStorage.getItem('osqr-use-knowledge-base')
    if (stored !== null) {
      setUseKnowledge(stored === 'true')
    }
    // Listen for storage changes from Settings page
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'osqr-use-knowledge-base' && e.newValue !== null) {
        setUseKnowledge(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Load refinement hints preference from localStorage (synced with Settings page)
  // Default is now FALSE - hints are opt-in, not opt-out
  useEffect(() => {
    const stored = localStorage.getItem('osqr-show-refinement-hints')
    if (stored !== null) {
      setShowRefinementHints(stored === 'true')
    } else {
      // Default to false if no preference is set
      setShowRefinementHints(false)
    }
    // Listen for storage changes from Settings page
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'osqr-show-refinement-hints' && e.newValue !== null) {
        setShowRefinementHints(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Handler for dismissing refinement hints
  const handleDismissRefinementHints = () => {
    setShowRefinementHints(false)
    setJustDismissedHints(true)
    localStorage.setItem('osqr-show-refinement-hints', 'false')
    // Clear the "just dismissed" message after 5 seconds
    setTimeout(() => setJustDismissedHints(false), 5000)
  }

  // Initialize speech recognition
  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setIsVoiceSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')

        // Update input with transcript (append to existing text)
        setInput(prev => {
          const separator = prev.trim() ? ' ' : ''
          return prev.trim() + separator + transcript
        })
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  // Toggle voice recording
  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) return

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch (error) {
        console.error('Failed to start voice recognition:', error)
      }
    }
  }

  const [expandedDebug, setExpandedDebug] = useState<number | null>(null)

  // Refine state
  const [refineResult, setRefineResult] = useState<RefineResult | null>(null)
  const [clarifyingAnswers, setClarifyingAnswers] = useState<string[]>([])
  const [refinedQuestion, setRefinedQuestion] = useState('')

  // Artifact panel state
  const [showArtifacts, setShowArtifacts] = useState(false)
  const [currentArtifacts, setCurrentArtifacts] = useState<ArtifactBlock[]>([])

  // Alt opinion state
  const [selectedAltModel, setSelectedAltModel] = useState<AltModelId>('random')
  const [showAltModelDropdown, setShowAltModelDropdown] = useState<number | null>(null)
  const [comparisonViewIdx, setComparisonViewIdx] = useState<number | null>(null)

  // Refinement suggestion state
  const [refinementSuggestion, setRefinementSuggestion] = useState<RefinementSuggestion | null>(null)
  const [showRefinementHints, setShowRefinementHints] = useState(false) // Default to false - opt-in
  const [justDismissedHints, setJustDismissedHints] = useState(false)

  const [autoDowngradedQuestion, setAutoDowngradedQuestion] = useState<string | null>(null)

  // OSCAR bubble onboarding state
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(() => {
    // If onboarding is already completed in the database, skip to idle
    if (onboardingCompleted) {
      return getCompletedOnboardingState()
    }
    // If user just completed cold open, start at panel_intro with their data
    if (justCompletedColdOpen && coldOpenData) {
      return getPostColdOpenState(coldOpenData.name, coldOpenData.workingOn)
    }
    // New users who haven't done cold open yet (shouldn't happen normally)
    return getInitialOnboardingState()
  })

  // Generate suggested first question based on what user is working on
  const suggestedQuestion = getSuggestedFirstQuestion(onboardingState.workingOn || coldOpenData?.workingOn)

  // Save onboarding completion to database when user finishes panel intro
  useEffect(() => {
    // Check if we just transitioned to 'idle' from an onboarding stage
    // This means the user completed the panel intro
    if (onboardingState.stage === 'idle' && !onboardingCompleted && onboardingState.completedStages.includes('panel_intro')) {
      // Already saved by cold open, no need to save again
    }
  }, [onboardingState.stage, workspaceId, onboardingCompleted, onboardingState.completedStages])

  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const refineCardRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    setInputAndFocus: (text: string) => {
      setInput(text)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    },
    askAndShowInBubble: async (prompt: string) => {
      // Now just puts the question in the main input since OSQR is in the right panel
      setInput(prompt)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    },
    focusInput: () => {
      textareaRef.current?.focus()
    },
    clearChat: () => {
      setMessages([])
      setInput('')
      setChatStage('input')
      setRefineResult(null)
      setRefinedQuestion('')
    }
  }), [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Analyze refinement suggestions when input changes (debounced)
  // Mode suggestion removed - OSQR now auto-routes based on question complexity
  useEffect(() => {
    if (input.trim().length < 3) {
      setRefinementSuggestion(null)
      return
    }

    const timer = setTimeout(() => {
      // Analyze for refinement suggestions
      const refinement = analyzeForRefinement(input)
      setRefinementSuggestion(refinement)
    }, 300) // 300ms debounce for snappier feedback

    return () => clearTimeout(timer)
  }, [input])

  // Scroll to refine card when it appears
  useEffect(() => {
    if (chatStage === 'refined' && refineCardRef.current) {
      refineCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [chatStage])

  // Fetch personalized greeting data (updates default greeting when ready)
  useEffect(() => {
    async function fetchGreeting() {
      try {
        const response = await fetch(`/api/greeting?workspaceId=${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          // Merge API data with current time greeting
          setGreetingData(prev => ({
            ...data,
            timeGreeting: data.timeGreeting || prev.timeGreeting,
          }))
        }
      } catch (error) {
        console.error('Failed to fetch greeting:', error)
        // Keep default greeting on error
      }
    }
    fetchGreeting()
  }, [workspaceId])

  // Handle input focus (OSQR greeting is now in the bubble, not centered)
  const handleInputFocus = () => {
    // OSQR bubble handles its own state now
  }

  // PERSISTENCE: Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedDraft = localStorage.getItem(DRAFT_KEY(workspaceId))
    if (savedDraft) {
      setInput(savedDraft)
    }
  }, [workspaceId])

  // PERSISTENCE: Save draft to localStorage on input change (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const timer = setTimeout(() => {
      if (input.trim()) {
        localStorage.setItem(DRAFT_KEY(workspaceId), input)
      } else {
        localStorage.removeItem(DRAFT_KEY(workspaceId))
      }
    }, 500) // 500ms debounce
    return () => clearTimeout(timer)
  }, [input, workspaceId])

  // PERSISTENCE: Load recent thread history on mount
  useEffect(() => {
    async function loadRecentHistory() {
      try {
        const response = await fetch(`/api/threads/recent?workspaceId=${workspaceId}&limit=10`)
        if (response.ok) {
          const data = await response.json()
          if (data.messages && data.messages.length > 0) {
            // Transform DB messages to UI format
            const loadedMessages: Message[] = data.messages.map((msg: any) => ({
              role: msg.role === 'user' ? 'user' : 'osqr',
              content: msg.content,
              thinking: false,
              messageId: msg.id,
              mode: msg.metadata?.mode,
              artifacts: msg.artifacts,
            }))
            setMessages(loadedMessages)
            setChatStage('complete')
          }
        }
      } catch (error) {
        console.error('Failed to load recent history:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    loadRecentHistory()
  }, [workspaceId])

  // PERSISTENCE: Check for pending request that was interrupted
  useEffect(() => {
    if (typeof window === 'undefined') return
    const pendingData = localStorage.getItem(PENDING_REQUEST_KEY(workspaceId))
    if (pendingData) {
      try {
        const pending = JSON.parse(pendingData)
        // If there's a pending request from within the last 5 minutes, show the question
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        if (pending.timestamp > fiveMinutesAgo && pending.question) {
          // Check if the answer has arrived in the database
          fetch(`/api/threads/check-pending?workspaceId=${workspaceId}&question=${encodeURIComponent(pending.question)}`)
            .then(res => res.json())
            .then(data => {
              if (data.found && data.answer) {
                // Answer arrived! Show it
                setMessages(prev => [
                  ...prev,
                  { role: 'user', content: pending.question },
                  { role: 'osqr', content: data.answer, thinking: false, mode: pending.mode }
                ])
                setChatStage('complete')
              }
              // Clear the pending request either way
              localStorage.removeItem(PENDING_REQUEST_KEY(workspaceId))
            })
            .catch(() => {
              localStorage.removeItem(PENDING_REQUEST_KEY(workspaceId))
            })
        } else {
          // Too old, clear it
          localStorage.removeItem(PENDING_REQUEST_KEY(workspaceId))
        }
      } catch {
        localStorage.removeItem(PENDING_REQUEST_KEY(workspaceId))
      }
    }
  }, [workspaceId])

  // Simplified: Just send the question directly based on mode
  // Quick mode: direct fire, Thoughtful/Contemplate: go through panel
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userQuestion = input.trim()

    // All modes now just fire directly - OSQR can ask clarifying questions naturally in its response
    handleDirectFire(userQuestion)
  }

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

  // STEP 2: Fire the question to the panel (with streaming support)
  const handleFire = async (questionToFire?: string) => {
    const finalQuestion = questionToFire || refinedQuestion || input.trim()
    if (!finalQuestion || isLoading) return

    setChatStage('firing')
    setIsLoading(true)

    // PERSISTENCE: Save pending request in case user leaves
    if (typeof window !== 'undefined') {
      localStorage.setItem(PENDING_REQUEST_KEY(workspaceId), JSON.stringify({
        question: finalQuestion,
        timestamp: Date.now(),
      }))
      // Clear the draft since we're submitting
      localStorage.removeItem(DRAFT_KEY(workspaceId))
    }

    // Add user message with the refined question
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: finalQuestion, refinedQuestion: refineResult?.originalQuestion !== finalQuestion ? refineResult?.originalQuestion : undefined },
    ])

    // Add "thinking" placeholder (mode will be set when response arrives)
    setMessages((prev) => [...prev, { role: 'osqr', content: '', thinking: true }])

    // Set bubble to thinking state (purple pulse)
    setStreamingState('thinking')

    // If council mode, open the full view immediately
    if (forceCouncil) {
      setCouncilViewQuery(finalQuestion)
      setCouncilViewResponses([])
      setCouncilViewSynthesis(undefined)
      setCouncilViewProcessing(true)
      setCouncilViewOpen(true)
    }

    try {
      // Build conversation history from current messages (excluding the thinking placeholder we just added)
      const conversationHistory = messages
        .filter(m => !m.thinking && m.content) // Exclude thinking placeholders and empty messages
        .map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        }))

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      // Use streaming endpoint - OSQR auto-routes unless user forced panel mode
      const response = await fetch('/api/oscar/ask-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalQuestion,
          workspaceId,
          useKnowledge,
          includeDebate: forcePanel || forceCouncil, // Show council when panel or council is forced
          // Only send mode if user explicitly requested panel/council mode
          ...(forceCouncil && { mode: 'council' }),
          ...(forcePanel && !forceCouncil && { mode: 'thoughtful' }),
          conversationHistory,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to get response from OSQR')
      }

      // Handle SSE stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let streamedContent = ''
      let metadata: {
        threadId?: string
        routing?: any
        contextSources?: any
        usedCrossProjectContext?: boolean
        degraded?: boolean
        renderPending?: boolean
        messageId?: string
        renderIntent?: { type: 'image' | 'chart' | 'template' | null; prompt: string; confidence?: string } | null
        iterationIntent?: { modification: string; conversationId: string; type?: 'image' | 'chart' | null } | null
      } = {}
      let finalData: {
        messageId?: string
        artifacts?: any[]
      } = {}

      // Read the stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7)
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6))

              switch (currentEvent) {
                case 'metadata':
                  // Store metadata for later use
                  metadata = data

                  // Handle special cases (redirect, throttled, blocked)
                  if (data.redirect) {
                    // Fall back to non-streaming endpoint
                    throw new Error('REDIRECT_TO_NON_STREAMING')
                  }
                  if (data.throttled || data.blocked || data.featureLocked) {
                    // These are handled in the text event
                  }

                  // Transition from thinking to streaming (connected state)
                  setStreamingState('streaming') // Bubble: purple breathing

                  setMessages((prev) => {
                    const updated = [...prev]
                    if (updated[updated.length - 1]?.thinking) {
                      updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        thinking: false, // No longer "thinking", now streaming
                        routing: data.routing,
                        usedCrossProjectContext: data.usedCrossProjectContext,
                        degraded: data.degraded,
                      }
                    }
                    return updated
                  })

                  // Show routing notification if auto-routed
                  if (data.routing?.autoRouted) {
                    setRoutingNotification({
                      autoRouted: data.routing.autoRouted,
                      autoRoutedReason: data.routing.autoRoutedReason,
                      requestedMode: data.routing.requestedMode,
                      effectiveMode: data.routing.effectiveMode,
                      questionType: data.routing.questionType,
                      complexity: data.routing.complexity,
                    })
                  }
                  break

                case 'council':
                  // Council mode: received model panel responses before synthesis
                  // Transform to PanelMemberResponse format for the UI
                  const councilResponses: PanelMemberResponse[] = (data.modelOpinions || []).map((opinion: any) => ({
                    agentId: opinion.modelId,
                    agentName: opinion.model,
                    modelId: opinion.modelId, // Use the short ID (claude, gpt4, gemini, groq)
                    provider: opinion.provider,
                    content: opinion.content,
                  }))

                  // Update council view with the responses - use modelId for lookup
                  const councilViewData: CouncilResponse[] = councilResponses.map(r => ({
                    modelId: r.modelId, // This is what CouncilFullView expects
                    content: r.content,
                    reasoning: r.content.slice(0, 200) + '...',
                  }))
                  setCouncilViewResponses(councilViewData)

                  // Store in metadata for later use when finalizing the message
                  ;(metadata as any).councilResponses = councilResponses
                  break

                case 'text':
                  // Append streamed text chunk
                  streamedContent += data.chunk || ''

                  // Update message content progressively
                  setMessages((prev) => {
                    const updated = [...prev]
                    const lastIdx = updated.length - 1
                    if (lastIdx >= 0 && updated[lastIdx].role === 'osqr') {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: streamedContent,
                        thinking: false,
                      }
                    }
                    return updated
                  })
                  break

                case 'done':
                  // Stream complete, finalize the message
                  finalData = data

                  // Check if this is a render request that needs further processing
                  if (data.renderPending && metadata.renderPending) {
                    // Call the render API to actually generate the artifact
                    handleRenderRequest(
                      metadata.renderIntent || null,
                      metadata.iterationIntent || null,
                      data.messageId || metadata.messageId // Pass messageId for persistence
                    )
                    // Don't update the message here - handleRenderRequest will do it
                    break
                  }

                  setMessages((prev) => {
                    const updated = [...prev]
                    const lastIdx = updated.length - 1
                    if (lastIdx >= 0 && updated[lastIdx].role === 'osqr') {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: streamedContent,
                        thinking: false,
                        artifacts: data.artifacts,
                        messageId: data.messageId,
                        // Use effectiveMode from routing (auto-routed by OSQR)
                        mode: metadata.routing?.effectiveMode || 'quick',
                        // Include council responses if present (from council event)
                        councilResponses: (metadata as any).councilResponses,
                      }
                    }
                    return updated
                  })

                  // Show artifacts if any
                  if (data.artifacts && data.artifacts.length > 0) {
                    setCurrentArtifacts(data.artifacts)
                    setShowArtifacts(true)
                  }

                  // Update council view synthesis when in council mode
                  if ((metadata as any).councilResponses) {
                    setCouncilViewSynthesis({
                      content: streamedContent, // Use 'content' not 'synthesis'
                      agreements: [],
                      disagreements: [],
                    })
                    setCouncilViewProcessing(false)
                  }
                  break

                case 'error':
                  throw new Error(data.error || 'Stream error')
              }
            } catch (parseError) {
              // Ignore JSON parse errors for incomplete data
              if (parseError instanceof Error && parseError.message !== 'REDIRECT_TO_NON_STREAMING') {
                console.warn('SSE parse warning:', parseError)
              } else {
                throw parseError
              }
            }
            currentEvent = ''
          }
        }
      }

      // Trigger onboarding progress for question asked AND answer received
      setOnboardingState(prev => {
        const afterQuestion = progressOnboarding(prev, { type: 'asked_question' })
        return progressOnboarding(afterQuestion, { type: 'answer_received' })
      })
    } catch (error) {
      console.error('Error asking OSQR:', error)

      // If redirected to non-streaming, fall back
      if (error instanceof Error && error.message === 'REDIRECT_TO_NON_STREAMING') {
        // Fall back to non-streaming endpoint for special modes
        await handleFireNonStreaming(finalQuestion)
        return
      }

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
      setStreamingState('idle') // Reset bubble to idle state
      abortControllerRef.current = null
      // Reset for next question
      setInput('')
      setRefineResult(null)
      setRefinedQuestion('')
      setClarifyingAnswers([])
      // Reset one-shot panel/council toggles (user must re-enable for next question)
      setForcePanel(false)
      setForceCouncil(false)
      // PERSISTENCE: Clear pending request since we got a response
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PENDING_REQUEST_KEY(workspaceId))
      }
    }
  }

  // Stop streaming response
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      setStreamingState('idle')
      setChatStage('complete')

      // Mark the last message as stopped
      setMessages((prev) => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (lastIdx >= 0 && updated[lastIdx].role === 'osqr') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            thinking: false,
            content: updated[lastIdx].content + (updated[lastIdx].content ? '\n\n[Stopped]' : '[Stopped by user]'),
          }
        }
        return updated
      })
    }
  }

  // Non-streaming fallback for special modes (planning, audit)
  const handleFireNonStreaming = async (finalQuestion: string) => {
    try {
      const conversationHistory = messages
        .filter(m => !m.thinking && m.content)
        .map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        }))

      const response = await fetch('/api/oscar/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalQuestion,
          workspaceId,
          useKnowledge,
          includeDebate: forcePanel || forceCouncil, // Show council when panel or council is forced
          // Only send mode if user explicitly requested panel/council mode
          ...(forceCouncil && { mode: 'council' }),
          ...(forcePanel && !forceCouncil && { mode: 'thoughtful' }),
          conversationHistory,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from OSQR')
      }

      const data = await response.json()

      // Transform council data or panel discussion into structured council responses
      // If we have rich council data from @osqr/core, use that; otherwise fall back to panel discussion
      let councilResponses: PanelMemberResponse[] = []
      if (data.council?.modelOpinions) {
        // Rich council data from @osqr/core Council mode
        councilResponses = data.council.modelOpinions.map((opinion: any, i: number) => ({
          agentId: opinion.model || `council-${i}`,
          agentName: opinion.model,
          modelId: opinion.model,
          provider: 'council',
          content: opinion.content || '',
          confidence: opinion.confidence,
          reasoning: opinion.reasoning,
        }))
      } else if (data.panelDiscussion) {
        // Fallback to panel discussion (thoughtful/contemplate modes)
        councilResponses = (data.panelDiscussion || []).map((p: any, i: number) => ({
          agentId: p.agentId || `agent-${i}`,
          agentName: `Expert ${i + 1}`,
          modelId: p.modelId || 'unknown',
          provider: p.provider || 'unknown',
          content: p.content || '',
          error: p.error,
        }))
      }

      const councilRoundtable: PanelMemberResponse[] = (data.roundtableDiscussion || []).map((p: any, i: number) => ({
        agentId: p.agentId || `agent-${i}`,
        agentName: `Expert ${i + 1}`,
        modelId: p.modelId || 'unknown',
        provider: p.provider || 'unknown',
        content: p.content || '',
        error: p.error,
      }))

      // Update council full view if open
      if (forceCouncil && councilViewOpen) {
        const councilViewData: CouncilResponse[] = councilResponses.map(r => ({
          modelId: r.modelId,
          content: r.content,
          error: r.error,
          confidence: r.confidence ? Math.round(r.confidence * 100) : undefined,
        }))
        setCouncilViewResponses(councilViewData)
        // Use council consensus data if available, otherwise fall back to synthesis
        const consensusLevel = data.council?.consensus?.level === 'full' ? 'high' :
                              data.council?.consensus?.level === 'partial' ? 'moderate' :
                              data.council?.consensus?.level === 'none' ? 'low' : 'moderate'
        setCouncilViewSynthesis({
          content: data.answer,
          agreements: data.council?.consensus?.divergentPoints?.length === 0 ? ['Models reached consensus'] : [],
          disagreements: data.council?.consensus?.divergentPoints || [],
          consensusLevel: consensusLevel as 'high' | 'moderate' | 'low' | 'split',
        })
        setCouncilViewProcessing(false)
      }

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'osqr',
          content: data.answer,
          thinking: false,
          artifacts: data.artifacts,
          // Use effectiveMode from routing (auto-routed by OSQR)
          mode: data.routing?.effectiveMode || 'quick',
          routing: data.routing,
          councilResponses: (forcePanel || forceCouncil) && councilResponses.length > 0 ? councilResponses : undefined,
          councilRoundtable: (forcePanel || forceCouncil) && councilRoundtable.length > 0 ? councilRoundtable : undefined,
          debug: forcePanel || forceCouncil
            ? {
                panelDiscussion: data.panelDiscussion,
                roundtableDiscussion: data.roundtableDiscussion,
              }
            : undefined,
          messageId: data.messageId,
          tokensUsed: data.tokensUsed,
          usedCrossProjectContext: data.usedCrossProjectContext,
          degraded: data.degraded,
        }
        return updated
      })

      if (data.artifacts && data.artifacts.length > 0) {
        setCurrentArtifacts(data.artifacts)
        setShowArtifacts(true)
      }

      if (data.routing?.autoRouted) {
        setRoutingNotification({
          autoRouted: data.routing.autoRouted,
          autoRoutedReason: data.routing.autoRoutedReason,
          requestedMode: data.routing.requestedMode,
          effectiveMode: data.routing.effectiveMode,
          questionType: data.routing.questionType,
          complexity: data.routing.complexity,
        })
      }

      setOnboardingState(prev => {
        const afterQuestion = progressOnboarding(prev, { type: 'asked_question' })
        return progressOnboarding(afterQuestion, { type: 'answer_received' })
      })
    } catch (error) {
      console.error('Error in non-streaming fallback:', error)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'osqr',
          content: 'I apologize, but I encountered an error. Please try again.',
          thinking: false,
        }
        return updated
      })
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
        handleSend()
      }
    }
  }

  // Start over / new question
  const handleStartOver = () => {
    setChatStage('input')
    setRefineResult(null)
    setAutoDowngradedQuestion(null)
    setRefinedQuestion('')
    setClarifyingAnswers([])
  }

  // Handle "go deeper" on auto-downgraded questions
  // Note: Since mode is now auto-routed, we just re-submit the question
  // The "go deeper" prompt implies user wants more thorough answer
  const handleGoDeeper = (question: string) => {
    setInput(question)
    setAutoDowngradedQuestion(null)
    // Don't auto-submit - let user review and hit Ask
    setChatStage('input')
  }

  const handleShowArtifacts = (artifacts: ArtifactBlock[]) => {
    setCurrentArtifacts(artifacts)
    setShowArtifacts(true)
  }

  // Get alternate AI opinion
  const handleGetAltOpinion = async (messageIdx: number, question: string, modelId?: AltModelId) => {
    const useModel = modelId || selectedAltModel
    const originalAnswer = messages[messageIdx]?.content || ''

    // Close dropdown
    setShowAltModelDropdown(null)

    // Set loading state on the message
    setMessages((prev) => {
      const updated = [...prev]
      updated[messageIdx] = {
        ...updated[messageIdx],
        altOpinion: { answer: '', model: '', provider: '', loading: true },
      }
      return updated
    })

    try {
      const response = await fetch('/api/oscar/alt-opinion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          workspaceId,
          preferredModel: useModel,
          originalAnswer, // Send original for comparison
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get alternate opinion')
      }

      const data = await response.json()

      setMessages((prev) => {
        const updated = [...prev]
        updated[messageIdx] = {
          ...updated[messageIdx],
          altOpinion: {
            answer: data.answer,
            model: data.model,
            provider: data.provider,
            loading: false,
            comparison: data.comparison,
          },
        }
        return updated
      })
    } catch (error) {
      console.error('Error getting alt opinion:', error)
      setMessages((prev) => {
        const updated = [...prev]
        updated[messageIdx] = {
          ...updated[messageIdx],
          altOpinion: undefined,
        }
        return updated
      })
    }
  }

  // Find the user question for a given OSQR response (look at previous message)
  const getQuestionForResponse = (responseIdx: number): string => {
    if (responseIdx > 0 && messages[responseIdx - 1]?.role === 'user') {
      return messages[responseIdx - 1].content
    }
    return ''
  }

  return (
    <div className="flex h-full min-h-[500px] gap-0">
      {/* Main chat area */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${showArtifacts ? 'mr-0' : ''}`}>
        {/* Messages area */}
        <div className="relative flex-1 space-y-6 overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />

          {messages.length === 0 && chatStage === 'input' && (
            <div className="relative flex h-full flex-col items-center justify-center text-center">
              {/* Animated background blobs */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-20 -left-20 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

              {/* Empty state - OSQR greeting is in the bubble */}
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700/50 ring-1 ring-slate-600/50 mb-4">
                  <Target className="h-8 w-8 text-slate-500" />
                </div>
              </div>

              <h3 className="text-lg font-medium text-slate-400 mb-2">
                Ready to work with OSQR
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Ask OSQR anything below, or click the OSQR bubble to continue your conversation with him there.
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, idx) => (
            <div key={idx} className="relative space-y-2 animate-fade-in">
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%]">
                    {message.refinedQuestion && (
                      <div className="mb-1 text-xs text-slate-500 text-right">
                        Original: "{message.refinedQuestion}"
                      </div>
                    )}
                    <Card className="bg-blue-500/10 border-blue-500/20 p-4">
                      <p className="whitespace-pre-wrap text-sm text-slate-100">
                        {message.content}
                      </p>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="max-w-[80%] space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 ring-1 ring-blue-500/20">
                        <Brain className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <span className="text-sm font-semibold text-slate-200">
                        OSQR
                      </span>
                      {/* Mode badge - shows how OSQR responded */}
                      {message.routing && !message.thinking && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ring-1 ${
                          message.mode === 'quick'
                            ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                            : message.mode === 'thoughtful'
                            ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 ring-purple-500/20'
                        }`}>
                          {message.routing.autoRoutedReason || (message.mode === 'quick' ? 'Quick response' : 'Consulted the panel')}
                        </span>
                      )}
                    </div>
                    <Card className="bg-slate-700/50 border-slate-600/50 p-4">
                      {message.thinking ? (
                        <div className="flex items-center space-x-3 text-sm text-slate-400">
                          {/* Expanding and spinning dots animation - 5 dots */}
                          <div className="relative flex items-center justify-center w-8 h-8">
                            <div className="absolute inset-0 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
                              <div className="h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 absolute" style={{ transform: 'translateY(-10px)' }} />
                              <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50 absolute" style={{ transform: 'rotate(72deg) translateY(-10px)' }} />
                              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 absolute" style={{ transform: 'rotate(144deg) translateY(-10px)' }} />
                              <div className="h-2 w-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50 absolute" style={{ transform: 'rotate(216deg) translateY(-10px)' }} />
                              <div className="h-2 w-2 rounded-full bg-pink-500 shadow-sm shadow-pink-500/50 absolute" style={{ transform: 'rotate(288deg) translateY(-10px)' }} />
                            </div>
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
                          </div>
                          <span>Thinking...</span>
                        </div>
                      ) : (
                        <div className="prose prose-sm prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-slate-100">
                          <p className="whitespace-pre-wrap text-sm text-slate-300">
                            {message.content}
                          </p>
                        </div>
                      )}
                    </Card>

                    {/* Response Actions - Copy, Read Aloud, Good/Bad feedback */}
                    {!message.thinking && message.content && (
                      <ResponseActions
                        content={message.content}
                        messageId={message.messageId}
                        workspaceId={workspaceId}
                        tokensUsed={message.tokensUsed}
                      />
                    )}

                    {/* Oscar Lab Quick Reaction Widget */}
                    {!message.thinking && message.content && message.messageId && (
                      <QuickReactionWidget
                        messageId={message.messageId}
                        responseMode={message.mode || 'quick'}
                        modelUsed={message.routing?.modelUsed?.model || 'unknown'}
                        hadPanelDiscussion={(message.councilResponses?.length || 0) > 0}
                        retrievalUsed={useKnowledge}
                      />
                    )}

                    {/* Render Complete Actions - Preview + "Would you like to see it?" buttons */}
                    {!message.thinking && message.renderComplete && (
                      <div className="mt-3 space-y-3">
                        {/* Artifact Preview */}
                        <ArtifactPreview
                          artifactId={message.renderComplete.artifactId}
                          type={message.renderComplete.type}
                        />

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleViewRender(message.renderComplete!.artifactId)}
                            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 text-sm"
                            size="sm"
                          >
                            View full render
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 text-sm"
                            onClick={() => {
                              setMessages((prev) => {
                                const updated = [...prev]
                                const lastIdx = updated.length - 1
                                if (lastIdx >= 0 && updated[lastIdx].renderComplete) {
                                  updated[lastIdx] = {
                                    ...updated[lastIdx],
                                    content: "Okay, I've saved it for later. Just let me know when you'd like to see it.",
                                    renderComplete: undefined,
                                  }
                                }
                                return updated
                              })
                            }}
                          >
                            Not now
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* I-9: Cross-project context indicator */}
                    {!message.thinking && message.usedCrossProjectContext && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs">
                        <Columns className="h-3.5 w-3.5 text-purple-400" />
                        <span className="text-purple-300">
                          This response includes context from other projects
                        </span>
                      </div>
                    )}

                    {/* I-10: Degraded response indicator */}
                    {!message.thinking && message.degraded && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-amber-300">
                          Response optimized for current usage tier
                        </span>
                      </div>
                    )}

                    {/* "Go Deeper" prompt for auto-downgraded questions */}
                    {!message.thinking && message.content && message.mode === 'quick' && autoDowngradedQuestion && idx === messages.length - 1 && (
                      <div className="mt-3 flex items-center gap-3 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-fade-in">
                        <Zap className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-300">
                            Answered with one model.{' '}
                          </span>
                          <button
                            onClick={() => handleGoDeeper(autoDowngradedQuestion)}
                            className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            Want to explore this deeper?
                          </button>
                        </div>
                        <button
                          onClick={() => setAutoDowngradedQuestion(null)}
                          className="text-slate-500 hover:text-slate-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
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

                    {/* J-4: Council Panel - Visible Multi-Model Reasoning */}
                    {message.councilResponses && message.councilResponses.length > 0 && (
                      <div className="mt-4">
                        <div
                          onClick={() => setExpandedDebug(expandedDebug === idx ? null : idx)}
                          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 mb-2 cursor-pointer"
                        >
                          <CouncilBadge
                            modelCount={message.councilResponses.length}
                          />
                          {expandedDebug === idx ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          <span>
                            {expandedDebug === idx ? 'Hide council discussion' : 'View council discussion'}
                          </span>
                        </div>

                        {expandedDebug === idx && (
                          <CouncilPanel
                            isVisible={true}
                            responses={message.councilResponses}
                            roundtableResponses={message.councilRoundtable}
                            mode={message.mode === 'contemplate' ? 'contemplate' : 'thoughtful'}
                          />
                        )}
                      </div>
                    )}

                    {/* Legacy debug panel fallback (if no structured council data) */}
                    {message.debug && !message.councilResponses && (
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

                    {/* "See what another AI thinks" button with model selector - Quick Mode only */}
                    {!message.thinking && message.content && !message.altOpinion && message.mode === 'quick' && (
                      <div className="mt-3 relative">
                        {/* Proactive Alt-Opinion suggestion when confidence is low or stakes are high */}
                        {message.routing?.shouldSuggestAltOpinion && (
                          <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg animate-fade-in">
                            <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
                            <span className="text-sm text-purple-300">
                              {message.routing.questionType === 'high_stakes'
                                ? 'High-stakes question - '
                                : message.routing.questionType === 'analytical'
                                ? 'Analytical question - '
                                : message.routing.confidence < 0.7
                                ? 'This topic has nuance - '
                                : ''}
                              <button
                                onClick={() => handleGetAltOpinion(idx, getQuestionForResponse(idx))}
                                className="font-medium text-purple-400 hover:text-purple-300 hover:underline"
                              >
                                get a second opinion?
                              </button>
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleGetAltOpinion(idx, getQuestionForResponse(idx))}
                            className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 transition-colors"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>
                              {selectedAltModel === 'random' ? 'See another AI' : `Ask ${AVAILABLE_ALT_MODELS.find(m => m.id === selectedAltModel)?.name}`}
                            </span>
                          </button>
                          <button
                            onClick={() => setShowAltModelDropdown(showAltModelDropdown === idx ? null : idx)}
                            className="flex items-center space-x-1 px-2 py-1.5 rounded-md text-xs bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
                            title="Choose AI model"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Model Selector Dropdown */}
                        {showAltModelDropdown === idx && (
                          <div className="absolute top-full left-0 mt-1 z-10 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
                            {AVAILABLE_ALT_MODELS.map((model) => (
                              <button
                                key={model.id}
                                onClick={() => {
                                  setSelectedAltModel(model.id)
                                  handleGetAltOpinion(idx, getQuestionForResponse(idx), model.id)
                                }}
                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                                  selectedAltModel === model.id ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-neutral-700 dark:text-neutral-300'
                                }`}
                              >
                                {model.id === 'random' ? (
                                  <Shuffle className="h-3.5 w-3.5" />
                                ) : (
                                  <Brain className="h-3.5 w-3.5" />
                                )}
                                <span>{model.name}</span>
                                {selectedAltModel === model.id && <Check className="h-3.5 w-3.5 ml-auto" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Alternate AI Opinion Display */}
                    {message.altOpinion && (
                      <div className="mt-4 space-y-3">
                        {/* View Toggle */}
                        {!message.altOpinion.loading && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setComparisonViewIdx(comparisonViewIdx === idx ? null : idx)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                                comparisonViewIdx === idx
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                              }`}
                            >
                              <Columns className="h-3.5 w-3.5" />
                              <span>{comparisonViewIdx === idx ? 'Hide comparison' : 'Compare side-by-side'}</span>
                            </button>
                          </div>
                        )}

                        {/* Side-by-side Comparison View */}
                        {comparisonViewIdx === idx && !message.altOpinion.loading && (
                          <div className="grid grid-cols-2 gap-4">
                            {/* OSQR Panel Response */}
                            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Brain className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                                    OSQR Panel
                                  </span>
                                </div>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                                  {message.content}
                                </p>
                              </CardContent>
                            </Card>

                            {/* Alternate AI Response */}
                            <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <MessageSquare className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                                    {message.altOpinion.model}
                                  </span>
                                </div>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                                  {message.altOpinion.answer}
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Agreement/Disagreement Synthesis */}
                        {message.altOpinion.comparison && comparisonViewIdx === idx && (
                          <Card className="border-neutral-200 dark:border-neutral-700">
                            <CardContent className="p-4">
                              <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                                Synthesis Analysis
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                {/* Agreements */}
                                <div>
                                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 mb-2">
                                    <Check className="h-4 w-4" />
                                    <span className="text-xs font-medium uppercase tracking-wide">Agreements</span>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {message.altOpinion.comparison.agreements.map((point, i) => (
                                      <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-1.5">
                                        <span className="text-green-500 mt-0.5">•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                    {message.altOpinion.comparison.agreements.length === 0 && (
                                      <li className="text-xs text-neutral-500 italic">No major agreements identified</li>
                                    )}
                                  </ul>
                                </div>

                                {/* Disagreements */}
                                <div>
                                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-2">
                                    <X className="h-4 w-4" />
                                    <span className="text-xs font-medium uppercase tracking-wide">Different Views</span>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {message.altOpinion.comparison.disagreements.map((point, i) => (
                                      <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-1.5">
                                        <span className="text-amber-500 mt-0.5">•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                    {message.altOpinion.comparison.disagreements.length === 0 && (
                                      <li className="text-xs text-neutral-500 italic">No major differences identified</li>
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Default Single View (when not in comparison mode) */}
                        {comparisonViewIdx !== idx && (
                          <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                                  {message.altOpinion.loading ? 'Getting another perspective...' : `${message.altOpinion.model} says:`}
                                </span>
                              </div>
                              {message.altOpinion.loading ? (
                                <div className="flex items-center space-x-2 text-sm text-neutral-500">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Consulting alternate AI...</span>
                                </div>
                              ) : (
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                                  {message.altOpinion.answer}
                                </p>
                              )}
                            </CardContent>
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
              <Card className="border-amber-500/30 bg-slate-800/90 dark:border-amber-500/30 dark:bg-slate-800/90">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-white">Let's sharpen your question</h3>
                  </div>

                  {/* Analysis */}
                  <p className="text-sm text-slate-300 mb-4">{refineResult.analysis}</p>

                  {/* Clarifying Questions */}
                  {refineResult.clarifyingQuestions.length > 0 && (
                    <div className="space-y-3 mb-4">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Quick clarifications:</p>
                      {refineResult.clarifyingQuestions.map((q, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="text-sm text-slate-200">{q}</label>
                          <input
                            type="text"
                            placeholder="Your answer (optional)..."
                            value={clarifyingAnswers[idx] || ''}
                            onChange={(e) => {
                              const newAnswers = [...clarifyingAnswers]
                              newAnswers[idx] = e.target.value
                              setClarifyingAnswers(newAnswers)
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-slate-800 border-neutral-200 dark:border-slate-600 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-slate-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested Refinement */}
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Refined question:</p>
                    <Textarea
                      value={refinedQuestion}
                      onChange={(e) => setRefinedQuestion(e.target.value)}
                      rows={3}
                      className="bg-white dark:bg-slate-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-slate-600"
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
          {/* Capability Bar - AI capabilities selection */}
          <CapabilityBar
            state={capabilityState}
            onStateChange={setCapabilityState}
            disabled={isLoading}
            userTier={userTier}
          />

          {/* One-shot panel toggle and Feedback button - OSQR auto-routes by default */}
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <TooltipProvider delayDuration={200}>
                {/* One-shot "Ask the panel" toggle - forces Thoughtful mode for this question only */}
                <div className="flex p-1 bg-slate-800 rounded-xl ring-1 ring-slate-700/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setForcePanel(!forcePanel)}
                        disabled={isLoading}
                        className={`group relative flex items-center justify-center sm:justify-start space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex-1 sm:flex-initial ${
                          forcePanel
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <Users className={`h-4 w-4 transition-transform duration-300 ${forcePanel ? 'animate-pulse' : 'group-hover:scale-110'}`} />
                        <span className="hidden sm:inline">Ask the panel</span>
                        {forcePanel && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-300"></span>
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-800 border-slate-700 max-w-[220px]">
                      <p className="font-medium text-blue-400">Ask the panel</p>
                      <p className="text-xs text-slate-400">Get multiple AI perspectives for this question. Resets after each response.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Council Mode Button - Full multi-model deliberation */}
                <div className="flex p-1 bg-slate-800 rounded-xl ring-1 ring-slate-700/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setForceCouncil(!forceCouncil)}
                        disabled={isLoading}
                        className={`group relative flex items-center justify-center sm:justify-start space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex-1 sm:flex-initial ${
                          forceCouncil
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <Gavel className={`h-4 w-4 transition-transform duration-300 ${forceCouncil ? 'animate-pulse' : 'group-hover:scale-110'}`} />
                        <span className="hidden sm:inline">Council</span>
                        {forceCouncil && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-300"></span>
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-800 border-slate-700 max-w-[220px]">
                      <p className="font-medium text-purple-400">Council Mode</p>
                      <p className="text-xs text-slate-400">Full multi-model deliberation. Claude, GPT-4, and Gemini discuss, then Oscar synthesizes.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Supreme Court Button - Greyed out until earned, creates mythology */}
                <div className="flex p-1 bg-slate-800/50 rounded-xl ring-1 ring-slate-700/30">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !hasEarnedSupreme && setShowSupremeLockedModal(true)}
                        className={`group relative flex items-center justify-center sm:justify-start space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                          hasEarnedSupreme
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 cursor-pointer'
                            : 'text-slate-600 cursor-pointer hover:text-slate-500'
                        }`}
                      >
                        <Scale className={`h-4 w-4 transition-transform duration-300 ${hasEarnedSupreme ? '' : 'opacity-50'}`} />
                        <span className="hidden sm:inline opacity-60">Supreme Court</span>
                        {!hasEarnedSupreme && (
                          <Lock className="h-3 w-3 ml-1 opacity-40" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-800 border-slate-700 max-w-[200px]">
                      <p className="text-xs text-slate-400 italic">
                        {hasEarnedSupreme ? 'Adversarial multi-model deliberation' : 'Earned, not purchased'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            {/* Feedback Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (!hasSeenFeedbackTip) {
                        setShowTeachingModal(true)
                      } else {
                        setShowFeedbackModal(true)
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-400 hover:text-cyan-400 bg-slate-800 hover:bg-slate-700 rounded-lg ring-1 ring-slate-700/50 transition-all cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Feedback</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-slate-800 border-slate-700">
                  <p className="text-xs">Share feedback about OSQR</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Refinement Suggestion - Real-time question improvement hints */}
          {showRefinementHints && refinementSuggestion && refinementSuggestion.type !== 'good' && input.trim().length > 0 && (
            <div className="flex items-start gap-3 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg animate-fade-in">
              <HelpCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-300 font-medium">
                  {refinementSuggestion.message}
                </p>
                {refinementSuggestion.example && (
                  <p className="text-xs text-amber-400/70 mt-1">
                    {refinementSuggestion.example}
                  </p>
                )}
              </div>
              <button
                onClick={handleDismissRefinementHints}
                className="cursor-pointer text-xs text-amber-400/60 hover:text-amber-300 whitespace-nowrap flex-shrink-0"
              >
                See less
              </button>
            </div>
          )}

          {/* Dismissal message */}
          {justDismissedHints && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 animate-fade-in">
              <span>Hints hidden. You can turn them back on in Settings.</span>
            </div>
          )}

          {/* Good question indicator */}
          {refinementSuggestion?.type === 'good' && input.trim().length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-green-400 animate-fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Good question - ready to fire!</span>
            </div>
          )}

          {/* Intent hints - shows what OSQR will do based on query */}
          {input.trim().length > 5 && (
            <IntentHint
              query={input}
              capabilityState={capabilityState}
              onDismiss={(cap) => {
                // Add capability to disabled list
                setCapabilityState(prev => ({
                  ...prev,
                  disabledCapabilities: [...(prev.disabledCapabilities || []), cap],
                }))
              }}
              className="px-3 py-1"
            />
          )}

          {/* Attachments area - for uploading files */}
          <AttachmentArea
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            onUpload={uploadAttachments}
            isUploading={isUploading}
            disabled={isLoading}
            className="px-3"
          />

          {/* Notification toast */}
          {notification && (
            <div className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg mx-3 ${
              notification.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              notification.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto p-0.5 hover:bg-slate-700 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div data-highlight-id="chat-input" className="relative flex-1">
              <Textarea
                ref={textareaRef}
                placeholder={
                  isRecording
                    ? 'Listening...'
                    : chatStage === 'refined'
                    ? 'Edit your refined question above, or type a new one...'
                    : 'Ask OSQR anything...'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                rows={2}
                disabled={isLoading || (chatStage === 'refined' && !refineResult?.readyToFire)}
                className="flex-1 min-h-[60px] sm:min-h-[80px] pr-12 w-full"
              />
              {/* Voice input button - using VoiceInput component */}
              <div className="absolute right-2 bottom-2">
                <VoiceInput
                  onTranscript={(text) => {
                    setInput(prev => {
                      const separator = prev.trim() ? ' ' : ''
                      return prev.trim() + separator + text
                    })
                  }}
                  onError={(error) => {
                    setNotification({
                      type: 'error',
                      message: error.message,
                    })
                    // Clear notification after 5 seconds
                    setTimeout(() => setNotification(null), 5000)
                  }}
                  onStateChange={(state) => {
                    setIsRecording(state === 'listening')
                  }}
                  disabled={isLoading}
                  size="sm"
                />
              </div>
            </div>
            <div className="flex sm:flex-col gap-2">
              {/* Stop button - shows when loading */}
              {isLoading && (
                <Button
                  onClick={handleStopStreaming}
                  size="lg"
                  variant="destructive"
                  className="flex-1 sm:flex-initial px-4 sm:px-6"
                  title="Stop generating"
                >
                  <Square className="mr-2 h-4 w-4 fill-current" />
                  Stop
                </Button>
              )}
              {/* Context-aware button: Fire (orange) for refined/good questions, Ask otherwise */}
              {!isLoading && (() => {
                // Fire button is the "reward" - only shown when question is ready
                const showFireButton = refinementSuggestion?.type === 'good' || chatStage === 'refined'

                if (showFireButton) {
                  // Good question - show Fire button
                  return (
                    <Button
                      onClick={() => handleSend()}
                      disabled={isLoading || !input.trim()}
                      size="lg"
                      className="flex-1 sm:flex-initial px-4 sm:px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
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
                  )
                } else {
                  // Unrefined question - show Ask button
                  return (
                    <Button
                      onClick={() => handleSend()}
                      disabled={isLoading || !input.trim()}
                      size="lg"
                      className="flex-1 sm:flex-initial px-4 sm:px-6"
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
                  )
                }
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Artifact Panel */}
      {showArtifacts && currentArtifacts.length > 0 && (
        <ArtifactPanel artifacts={currentArtifacts} onClose={() => setShowArtifacts(false)} />
      )}

      {/* Council Full View - Multi-panel deliberation display */}
      <CouncilFullView
        isOpen={councilViewOpen}
        onClose={() => {
          setCouncilViewOpen(false)
          setCouncilViewProcessing(false)
        }}
        query={councilViewQuery}
        responses={councilViewResponses}
        synthesis={councilViewSynthesis}
        isProcessing={councilViewProcessing}
      />

      {/* Upgrade Modal for Contemplate Mode */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowUpgradeModal(false)}
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl animate-in zoom-in-95 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl ring-1 ring-purple-500/30">
                <Crown className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Unlock Contemplate Mode</h3>
                <p className="text-sm text-slate-400">Master tier exclusive feature</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4 mb-6">
              <p className="text-slate-300">
                Contemplate mode provides deep, multi-perspective analysis for complex questions.
              </p>
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>60-90 second deep analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>Multiple AI perspectives on every question</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>Strategic decision-making support</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>Priority processing and unlimited queries</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Maybe Later
              </button>
              <a
                href="/pricing"
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium text-center transition-all shadow-lg shadow-purple-500/25"
              >
                Upgrade to Master
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Supreme Court Locked Modal - Mysterious, not a purchase prompt */}
      {showSupremeLockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSupremeLockedModal(false)}
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl ring-1 ring-slate-700/50">
                  <Scale className="h-10 w-10 text-slate-500" />
                </div>
                <Lock className="absolute -bottom-1 -right-1 h-5 w-5 text-slate-400 bg-slate-900 rounded-full p-0.5" />
              </div>
            </div>

            {/* Message */}
            <div className="text-center space-y-3 mb-8">
              <h3 className="text-xl font-semibold text-white">Not Yet</h3>
              <p className="text-slate-400 leading-relaxed">
                The Supreme Court is earned, not purchased. Continue asking great questions.
              </p>
              <p className="text-sm text-slate-500 italic">
                When you're ready, it will find you.
              </p>
            </div>

            {/* Action */}
            <button
              onClick={() => setShowSupremeLockedModal(false)}
              className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Routing Notification - shows when OSQR auto-routes to a different mode */}
      <RoutingNotification
        routing={routingNotification}
        onDismiss={() => setRoutingNotification(null)}
      />

      {/* Teaching Modal - Gentle explanation about natural language feedback */}
      {showTeachingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (dontShowFeedbackTipAgain) {
                localStorage.setItem('osqr-feedback-tip-dismissed', 'true')
                setHasSeenFeedbackTip(true)
              }
              setShowTeachingModal(false)
              setDontShowFeedbackTipAgain(false)
            }}
          />
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl animate-in zoom-in-95 fade-in duration-200">
            {/* Header with icon */}
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-cyan-500/10 rounded-lg shrink-0">
                <Sparkles className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-medium text-white mb-1">Quick tip</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
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

            <p className="text-sm text-slate-400 mb-4 ml-11">
              I&apos;ll take care of the rest.
            </p>

            {/* Don't show again checkbox */}
            <label className="flex items-center gap-2 mb-4 ml-11 cursor-pointer group">
              <input
                type="checkbox"
                checked={dontShowFeedbackTipAgain}
                onChange={(e) => setDontShowFeedbackTipAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                Got it, don&apos;t show this again
              </span>
            </label>

            {/* Action buttons */}
            <div className="flex gap-2 ml-11">
              <button
                onClick={() => {
                  if (dontShowFeedbackTipAgain) {
                    localStorage.setItem('osqr-feedback-tip-dismissed', 'true')
                    setHasSeenFeedbackTip(true)
                  }
                  setShowTeachingModal(false)
                  setDontShowFeedbackTipAgain(false)
                }}
                className="flex-1 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (dontShowFeedbackTipAgain) {
                    localStorage.setItem('osqr-feedback-tip-dismissed', 'true')
                    setHasSeenFeedbackTip(true)
                  }
                  setShowTeachingModal(false)
                  setShowFeedbackModal(true)
                }}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Use form anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowFeedbackModal(false)
              setFeedbackMessage('')
              setFeedbackSentiment(null)
              setFeedbackSubmitted(false)
            }}
          />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl animate-in zoom-in-95 fade-in duration-200">
            {feedbackSubmitted ? (
              // Success state
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Thank you!</h3>
                <p className="text-slate-400 text-center mb-6">
                  Your feedback helps make OSQR better for everyone.
                </p>
                <button
                  onClick={() => {
                    setShowFeedbackModal(false)
                    setFeedbackMessage('')
                    setFeedbackSentiment(null)
                    setFeedbackSubmitted(false)
                  }}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              // Form state
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Share Feedback</h3>
                      <p className="text-sm text-slate-400">Help us improve OSQR</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowFeedbackModal(false)
                      setFeedbackMessage('')
                      setFeedbackSentiment(null)
                    }}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Sentiment Selection */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-300 mb-2">How's your experience?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFeedbackSentiment(feedbackSentiment === 'positive' ? null : 'positive')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                        feedbackSentiment === 'positive'
                          ? 'bg-green-500/20 text-green-400 ring-2 ring-green-500/50'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <ThumbsUp className="h-5 w-5" />
                      <span>Good</span>
                    </button>
                    <button
                      onClick={() => setFeedbackSentiment(feedbackSentiment === 'negative' ? null : 'negative')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                        feedbackSentiment === 'negative'
                          ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/50'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <ThumbsDown className="h-5 w-5" />
                      <span>Needs work</span>
                    </button>
                  </div>
                </div>

                {/* Message Input */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    What's on your mind? <span className="text-slate-500">(optional)</span>
                  </label>
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Tell us about bugs, feature requests, or anything else..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                    rows={4}
                  />
                </div>

                {/* Tip */}
                <p className="text-xs text-slate-500 mb-4">
                  You can also leave feedback on any response using the 👍 👎 buttons below each answer.
                </p>

                {/* Submit Button */}
                <button
                  onClick={async () => {
                    if (!feedbackSentiment && !feedbackMessage.trim()) return
                    setIsSubmittingFeedback(true)
                    try {
                      await fetch('/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          source: 'MODAL',
                          sentiment: feedbackSentiment || undefined,
                          message: feedbackMessage.trim() || undefined,
                          workspaceId,
                        }),
                      })
                      setFeedbackSubmitted(true)
                    } catch (error) {
                      console.error('Failed to submit feedback:', error)
                    } finally {
                      setIsSubmittingFeedback(false)
                    }
                  }}
                  disabled={isSubmittingFeedback || (!feedbackSentiment && !feedbackMessage.trim())}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmittingFeedback ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* OSQR Onboarding Bubble removed - earlier version, no longer needed */}
    </div>
  )
})
