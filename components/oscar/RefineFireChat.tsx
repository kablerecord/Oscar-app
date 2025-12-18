'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
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
  Mic,
  MicOff,
} from 'lucide-react'
import { OSCARBubble, type PendingInsight, type OSCARBubbleHandle } from '@/components/oscar/OSCARBubble'
import { RoutingNotification } from '@/components/oscar/RoutingNotification'
import { ShareActions } from '@/components/share/ShareActions'
import { ResponseActions } from '@/components/chat/ResponseActions'
import { getNextQuestion, getTotalQuestions, type ProfileQuestion } from '@/lib/profile/questions'
import {
  type OnboardingState,
  getInitialOnboardingState,
  progressOnboarding,
} from '@/lib/onboarding/oscar-onboarding'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import type { ArtifactBlock } from '@/lib/artifacts/types'
import { CouncilPanel, CouncilBadge, type PanelMemberResponse } from '@/components/council/CouncilPanel'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  }
  // v1.1: Message tracking for feedback
  messageId?: string
  tokensUsed?: number
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
  onboardingCompleted?: boolean
  userTier?: 'free' | 'pro' | 'master'
}

type ResponseMode = 'quick' | 'thoughtful' | 'contemplate' | 'supreme'
type ChatStage = 'input' | 'gating' | 'gatekeeper-prompt' | 'refining' | 'refined' | 'firing' | 'complete'

// Gatekeeper classification result
interface GatekeeperResult {
  question: string
  selectedMode: ResponseMode
  scores: {
    clarity: number
    intentDepth: number
    knowledgeRequirement: number
    consequenceWeight: number
  }
  totalScore: number
  recommendation: 'quick' | 'refine' | 'fire' | 'suggest_thoughtful'
  reasoning: string
  refinedVersions?: {
    precision: string
    bigPicture: string
  } | null
}

// Question complexity detection
interface ComplexityAnalysis {
  level: 'simple' | 'moderate' | 'complex'
  suggestedMode: ResponseMode
  reason: string
}

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

function analyzeQuestionComplexity(question: string): ComplexityAnalysis {
  const q = question.toLowerCase().trim()
  const wordCount = q.split(/\s+/).length

  // Complex indicators
  const complexPatterns = [
    /how (should|can|do) i (decide|choose|evaluate|analyze|compare)/,
    /what('s| is| are) the (best|right|optimal) (way|approach|strategy)/,
    /pros and cons/,
    /trade.?offs?/,
    /long.?term/,
    /implications/,
    /strategy|strategic/,
    /architecture|design pattern/,
    /should i (start|build|create|implement)/,
    /how do (successful|great|top)/,
    /what makes/,
    /explain.+(in depth|thoroughly|comprehensively)/,
  ]

  // Simple indicators
  const simplePatterns = [
    /^what (is|are|was|were) /,
    /^who (is|are|was|were) /,
    /^when (is|are|was|were|did|does) /,
    /^where (is|are|was|were) /,
    /^define /,
    /^list /,
    /^name /,
    /syntax/,
    /example of/,
    /how to (install|setup|configure|run|start)/,
  ]

  // Check for complex patterns
  const hasComplexPattern = complexPatterns.some(p => p.test(q))
  const hasSimplePattern = simplePatterns.some(p => p.test(q))

  // Determine complexity
  if (hasComplexPattern || wordCount > 25) {
    return {
      level: 'complex',
      suggestedMode: 'contemplate',
      reason: 'This question involves strategic thinking or multiple considerations',
    }
  }

  if (hasSimplePattern || wordCount < 8) {
    return {
      level: 'simple',
      suggestedMode: 'quick',
      reason: 'This is a straightforward factual question',
    }
  }

  return {
    level: 'moderate',
    suggestedMode: 'thoughtful',
    reason: 'This question could benefit from some analysis',
  }
}

// localStorage keys for persistence
const DRAFT_KEY = (workspaceId: string) => `osqr-draft-${workspaceId}`
const PENDING_REQUEST_KEY = (workspaceId: string) => `osqr-pending-${workspaceId}`

// Ref handle type for external control
export interface RefineFireChatHandle {
  setInputAndFocus: (text: string) => void
  askAndShowInBubble: (prompt: string) => Promise<void>
}

export const RefineFireChat = forwardRef<RefineFireChatHandle, RefineFireChatProps>(
  function RefineFireChat({ workspaceId, onboardingCompleted = false, userTier = 'free' }, ref) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatStage, setChatStage] = useState<ChatStage>('input')
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [useKnowledge, setUseKnowledge] = useState(true)
  const [showDebug, setShowDebug] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showSupremeLockedModal, setShowSupremeLockedModal] = useState(false)

  // Voice input state
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

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
  useEffect(() => {
    const stored = localStorage.getItem('osqr-show-refinement-hints')
    if (stored !== null) {
      setShowRefinementHints(stored === 'true')
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
  const [responseMode, setResponseMode] = useState<ResponseMode>('quick')

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

  // Alt opinion state
  const [selectedAltModel, setSelectedAltModel] = useState<AltModelId>('random')
  const [showAltModelDropdown, setShowAltModelDropdown] = useState<number | null>(null)
  const [comparisonViewIdx, setComparisonViewIdx] = useState<number | null>(null)

  // Mode suggestion state
  const [modeSuggestion, setModeSuggestion] = useState<ComplexityAnalysis | null>(null)
  const [showModeSuggestion, setShowModeSuggestion] = useState(false)

  // Refinement suggestion state
  const [refinementSuggestion, setRefinementSuggestion] = useState<RefinementSuggestion | null>(null)
  const [showRefinementHints, setShowRefinementHints] = useState(true)
  const [justDismissedHints, setJustDismissedHints] = useState(false)

  // Gatekeeper state
  const [gatekeeperResult, setGatekeeperResult] = useState<GatekeeperResult | null>(null)
  const [autoDowngradedQuestion, setAutoDowngradedQuestion] = useState<string | null>(null)

  // OSCAR bubble onboarding state
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(() => {
    // If onboarding is already completed in the database, skip to idle
    if (onboardingCompleted) {
      return {
        ...getInitialOnboardingState(),
        stage: 'idle',
        hasAskedFirstQuestion: true,
        completedStages: ['welcome', 'explain_purpose', 'explain_how', 'ask_ready', 'explain_modes', 'invite_first_question', 'post_first_answer'],
      }
    }
    return getInitialOnboardingState()
  })

  // Save onboarding completion to database when user finishes the intro
  useEffect(() => {
    // Check if we just transitioned to 'idle' from an onboarding stage
    // This means the user completed the onboarding flow
    if (onboardingState.stage === 'idle' && !onboardingCompleted && onboardingState.completedStages.includes('invite_first_question')) {
      // Mark onboarding as completed in the database
      fetch('/api/workspace/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, completed: true }),
      }).catch(err => console.error('Failed to save onboarding status:', err))
    }
  }, [onboardingState.stage, workspaceId, onboardingCompleted, onboardingState.completedStages])

  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const refineCardRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const oscarBubbleRef = useRef<OSCARBubbleHandle>(null)

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    setInputAndFocus: (text: string) => {
      setInput(text)
      // OSQR bubble handles its own state now
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    },
    askAndShowInBubble: async (prompt: string) => {
      // Open the bubble first
      if (oscarBubbleRef.current) {
        oscarBubbleRef.current.openBubble()
        // Show a "thinking" message
        oscarBubbleRef.current.addMessage("Thinking...", 'tip')
      }

      try {
        // Call the quick answer API
        const response = await fetch('/api/osqr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: prompt,
            mode: 'quick',
            useKnowledge: false,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to get response')
        }

        const data = await response.json()
        const answer = data.answer || data.response || "I couldn't generate a response. Try asking in a different way."

        // Remove the "thinking" message and add the real response
        if (oscarBubbleRef.current) {
          oscarBubbleRef.current.addMessage(answer, 'tip')
        }
      } catch (error) {
        console.error('Error asking OSQR:', error)
        if (oscarBubbleRef.current) {
          oscarBubbleRef.current.addMessage("Sorry, I had trouble with that. Try asking in the main chat.", 'tip')
        }
      }
    }
  }), [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Analyze question complexity and refinement when input changes (debounced)
  useEffect(() => {
    if (input.trim().length < 3) {
      setModeSuggestion(null)
      setShowModeSuggestion(false)
      setRefinementSuggestion(null)
      return
    }

    const timer = setTimeout(() => {
      // Analyze for mode suggestion
      const analysis = analyzeQuestionComplexity(input)
      if (analysis.suggestedMode !== responseMode) {
        setModeSuggestion(analysis)
        setShowModeSuggestion(true)
      } else {
        setShowModeSuggestion(false)
      }

      // Analyze for refinement suggestions
      const refinement = analyzeForRefinement(input)
      setRefinementSuggestion(refinement)
    }, 300) // 300ms debounce for snappier feedback

    return () => clearTimeout(timer)
  }, [input, responseMode])

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

  // STEP 0: Gatekeeper - classify question before allowing expensive modes
  const handleGatekeeper = async () => {
    if (!input.trim() || isLoading) return

    const userQuestion = input.trim()

    // Quick mode always bypasses gatekeeper
    if (responseMode === 'quick') {
      handleDirectFire(userQuestion)
      return
    }

    setChatStage('gating')
    setIsLoading(true)

    try {
      const response = await fetch('/api/oscar/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQuestion,
          selectedMode: responseMode,
        }),
      })

      if (!response.ok) {
        // If gatekeeper fails, fall through to normal refine flow
        console.warn('Gatekeeper failed, proceeding with refine')
        handleRefine()
        return
      }

      const data: GatekeeperResult = await response.json()
      setGatekeeperResult(data)

      // Handle the recommendation
      if (data.recommendation === 'fire') {
        // Question is deep enough, proceed to refine or fire
        handleRefine()
      } else if (data.recommendation === 'quick') {
        // Question is too shallow - auto-answer in Quick mode silently
        // Track that we auto-downgraded so we can offer "go deeper" after
        setAutoDowngradedQuestion(userQuestion)
        setResponseMode('quick')
        handleDirectFire(userQuestion)
      } else if (data.recommendation === 'refine') {
        // Question needs refinement - show refinement options
        setChatStage('gatekeeper-prompt')
        setIsLoading(false)
      } else if (data.recommendation === 'suggest_thoughtful') {
        // Contemplate overkill, suggest Thoughtful
        setChatStage('gatekeeper-prompt')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Gatekeeper error:', error)
      // Fallback: proceed with normal refine flow
      handleRefine()
    }
  }

  // Handle gatekeeper actions
  const handleGatekeeperAction = (action: 'refine' | 'quick' | 'fire' | 'use-precision' | 'use-bigpicture' | 'switch-thoughtful') => {
    if (!gatekeeperResult) return

    if (action === 'quick') {
      setResponseMode('quick')
      handleDirectFire(gatekeeperResult.question)
    } else if (action === 'fire') {
      // User insists, proceed with their chosen mode
      handleRefine()
    } else if (action === 'refine') {
      // User wants to refine themselves
      setChatStage('input')
      setGatekeeperResult(null)
      setIsLoading(false)
    } else if (action === 'use-precision' && gatekeeperResult.refinedVersions?.precision) {
      setInput(gatekeeperResult.refinedVersions.precision)
      setChatStage('input')
      setGatekeeperResult(null)
    } else if (action === 'use-bigpicture' && gatekeeperResult.refinedVersions?.bigPicture) {
      setInput(gatekeeperResult.refinedVersions.bigPicture)
      setChatStage('input')
      setGatekeeperResult(null)
    } else if (action === 'switch-thoughtful') {
      setResponseMode('thoughtful')
      handleRefine()
    }
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

  // STEP 2: Fire the question to the panel
  const handleFire = async (questionToFire?: string) => {
    const finalQuestion = questionToFire || refinedQuestion || input.trim()
    if (!finalQuestion || isLoading) return

    setChatStage('firing')
    setIsLoading(true)

    // PERSISTENCE: Save pending request in case user leaves
    if (typeof window !== 'undefined') {
      localStorage.setItem(PENDING_REQUEST_KEY(workspaceId), JSON.stringify({
        question: finalQuestion,
        mode: responseMode,
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

    // Add "thinking" placeholder with mode
    setMessages((prev) => [...prev, { role: 'osqr', content: '', thinking: true, mode: responseMode }])

    // Show profile question during wait time (even in quick mode - bubble will be there when they need it)
    const nextQuestion = getNextQuestion(answeredQuestionIds)
    if (nextQuestion) {
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
      // J-4: Transform panel discussion into structured council responses
      const councilResponses: PanelMemberResponse[] = (data.panelDiscussion || []).map((p: any, i: number) => ({
        agentId: p.agentId || `agent-${i}`,
        agentName: `Expert ${i + 1}`,
        modelId: p.modelId || 'unknown',
        provider: p.provider || 'unknown',
        content: p.content || '',
        error: p.error,
      }))
      const councilRoundtable: PanelMemberResponse[] = (data.roundtableDiscussion || []).map((p: any, i: number) => ({
        agentId: p.agentId || `agent-${i}`,
        agentName: `Expert ${i + 1}`,
        modelId: p.modelId || 'unknown',
        provider: p.provider || 'unknown',
        content: p.content || '',
        error: p.error,
      }))

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'osqr',
          content: data.answer,
          thinking: false,
          artifacts: data.artifacts,
          mode: responseMode, // Preserve the mode used for this response
          routing: data.routing, // Include routing metadata for Alt-Opinion suggestions
          // J-4: Include structured council data for visible reasoning
          councilResponses: showDebug && councilResponses.length > 0 ? councilResponses : undefined,
          councilRoundtable: showDebug && councilRoundtable.length > 0 ? councilRoundtable : undefined,
          debug: showDebug
            ? {
                panelDiscussion: data.panelDiscussion,
                roundtableDiscussion: data.roundtableDiscussion,
              }
            : undefined,
          // v1.1: Message tracking for feedback
          messageId: data.messageId,
          tokensUsed: data.tokensUsed,
        }
        return updated
      })

      // If artifacts were returned, show the artifact panel
      if (data.artifacts && data.artifacts.length > 0) {
        setCurrentArtifacts(data.artifacts)
        setShowArtifacts(true)
      }

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

      // Trigger onboarding progress for first question asked (will show post_first_answer stage)
      setOnboardingState(prev => progressOnboarding(prev, { type: 'asked_question' }))
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
      // PERSISTENCE: Clear pending request since we got a response
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PENDING_REQUEST_KEY(workspaceId))
      }
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
        // Route through gatekeeper for Thoughtful/Contemplate
        handleGatekeeper()
      }
    }
  }

  // Start over / new question
  const handleStartOver = () => {
    setChatStage('input')
    setRefineResult(null)
    setGatekeeperResult(null)
    setAutoDowngradedQuestion(null)
    setRefinedQuestion('')
    setClarifyingAnswers([])
  }

  // Handle "go deeper" on auto-downgraded questions
  const handleGoDeeper = (question: string) => {
    setInput(question)
    setResponseMode('thoughtful')
    setAutoDowngradedQuestion(null)
    // Don't auto-submit - let user review and hit Ask
    setChatStage('input')
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

  // Handle proactive insight "Tell me more" - starts a conversation from the insight
  const handleInsightConversation = (insight: PendingInsight) => {
    // Convert insight to a conversation starter question
    const conversationStarter = `Tell me more about this: "${insight.title}" - ${insight.message}`

    // Set the input and immediately fire
    setInput(conversationStarter)
    // Use thoughtful mode for insight follow-ups (more detailed response)
    setResponseMode('thoughtful')

    // Fire after a brief delay to let state update
    setTimeout(() => {
      handleFire(conversationStarter)
    }, 100)
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
    <div className="flex h-[calc(100vh-12rem)] gap-0">
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
                Your workspace is ready
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Ask OSQR anything below, or click the OSQR bubble to continue your conversation.
              </p>
            </div>
          )}

          {/* Gating indicator */}
          {chatStage === 'gating' && (
            <div className="relative flex h-full flex-col items-center justify-center text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20 mb-4">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              </div>
              <p className="text-slate-400">Evaluating question depth...</p>
            </div>
          )}

          {/* Gatekeeper Prompt */}
          {chatStage === 'gatekeeper-prompt' && gatekeeperResult && (
            <div className="relative flex h-full flex-col items-center justify-center animate-fade-in">
              <Card className="max-w-xl w-full bg-slate-800/80 border-slate-700/50 p-6">
                {/* Header with score visualization */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                      <Target className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="font-semibold text-slate-200">Question Analysis</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Depth Score:</span>
                    <span className={`text-sm font-bold ${
                      gatekeeperResult.totalScore >= 9 ? 'text-purple-400' :
                      gatekeeperResult.totalScore >= 6 ? 'text-blue-400' :
                      'text-amber-400'
                    }`}>
                      {gatekeeperResult.totalScore}/12
                    </span>
                  </div>
                </div>

                {/* User's question */}
                <div className="mb-4 p-3 rounded-lg bg-slate-700/50 border border-slate-600/50">
                  <p className="text-sm text-slate-300">"{gatekeeperResult.question}"</p>
                </div>

                {/* Reasoning */}
                <p className="text-sm text-slate-400 mb-5">{gatekeeperResult.reasoning}</p>

                {/* Actions based on recommendation */}
                {gatekeeperResult.recommendation === 'quick' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300 mb-3">
                      I can answer this instantly in <span className="text-amber-400 font-medium">Quick</span> mode, or we can explore deeper. What's your goal?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleGatekeeperAction('quick')}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        <Zap className="h-4 w-4 mr-1.5" />
                        Answer in Quick Mode
                      </Button>
                      <Button
                        onClick={() => handleGatekeeperAction('refine')}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Let me refine my question
                      </Button>
                    </div>
                  </div>
                )}

                {gatekeeperResult.recommendation === 'refine' && gatekeeperResult.refinedVersions && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300 mb-3">
                      Here are two stronger versions of your question:
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleGatekeeperAction('use-precision')}
                        className="w-full text-left p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 hover:border-blue-500/50 hover:bg-slate-700 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-xs font-medium text-blue-400">Precision</span>
                        </div>
                        <p className="text-sm text-slate-300 group-hover:text-slate-100">
                          {gatekeeperResult.refinedVersions.precision}
                        </p>
                      </button>
                      <button
                        onClick={() => handleGatekeeperAction('use-bigpicture')}
                        className="w-full text-left p-3 rounded-lg bg-slate-700/50 border border-slate-600/50 hover:border-purple-500/50 hover:bg-slate-700 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                          <span className="text-xs font-medium text-purple-400">Big Picture</span>
                        </div>
                        <p className="text-sm text-slate-300 group-hover:text-slate-100">
                          {gatekeeperResult.refinedVersions.bigPicture}
                        </p>
                      </button>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/50">
                      <Button
                        onClick={() => handleGatekeeperAction('fire')}
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-200"
                      >
                        Use my original question anyway
                      </Button>
                    </div>
                  </div>
                )}

                {gatekeeperResult.recommendation === 'suggest_thoughtful' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300 mb-3">
                      This question would get a great answer in <span className="text-blue-400 font-medium">Thoughtful</span> mode.
                      <span className="text-purple-400 font-medium"> Contemplate</span> mode is best for high-stakes decisions.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleGatekeeperAction('switch-thoughtful')}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Lightbulb className="h-4 w-4 mr-1.5" />
                        Use Thoughtful Mode
                      </Button>
                      <Button
                        onClick={() => handleGatekeeperAction('fire')}
                        variant="outline"
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      >
                        <GraduationCap className="h-4 w-4 mr-1.5" />
                        Proceed with Contemplate
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cancel option */}
                <button
                  onClick={handleStartOver}
                  className="cursor-pointer mt-4 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                >
                  ← Start over
                </button>
              </Card>
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
                      {/* Mode badge */}
                      {message.mode && !message.thinking && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ring-1 ${
                          message.mode === 'quick'
                            ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                            : message.mode === 'thoughtful'
                            ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 ring-purple-500/20'
                        }`}>
                          {message.mode === 'quick' && 'Quick'}
                          {message.mode === 'thoughtful' && 'Thoughtful'}
                          {message.mode === 'contemplate' && 'Contemplate'}
                        </span>
                      )}
                    </div>
                    <Card className="bg-slate-700/50 border-slate-600/50 p-4">
                      {message.thinking ? (
                        <div className="flex items-center space-x-2 text-sm text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                          <span>
                            {responseMode === 'quick' && 'Quick response - consulting expert...'}
                            {responseMode === 'thoughtful' && 'Consulting panel and synthesizing...'}
                            {responseMode === 'contemplate' && 'Deep analysis in progress...'}
                          </span>
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
                        <button
                          onClick={() => setExpandedDebug(expandedDebug === idx ? null : idx)}
                          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 mb-2"
                        >
                          <CouncilBadge
                            modelCount={message.councilResponses.length}
                            onClick={() => setExpandedDebug(expandedDebug === idx ? null : idx)}
                          />
                          {expandedDebug === idx ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          <span>
                            {expandedDebug === idx ? 'Hide council discussion' : 'View council discussion'}
                          </span>
                        </button>

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
          {/* Response Mode Buttons with visual state indicators */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="hidden sm:block text-sm font-medium text-slate-400">Mode:</span>
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-2">
                {/* Group 1: Quick / Thoughtful / Contemplate */}
                <div className="flex p-1 bg-slate-800 rounded-xl ring-1 ring-slate-700/50">
                  {/* Quick Mode */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setResponseMode('quick')
                          setOnboardingState(prev => progressOnboarding(prev, { type: 'mode_changed', mode: 'quick' }))
                        }}
                        disabled={isLoading}
                        className={`group relative flex items-center justify-center sm:justify-start space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex-1 sm:flex-initial ${
                          responseMode === 'quick'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Zap className={`h-4 w-4 transition-transform duration-300 ${responseMode === 'quick' ? 'animate-pulse' : 'group-hover:scale-110'}`} />
                        <span className="hidden sm:inline">Quick</span>
                        {responseMode === 'quick' && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300"></span>
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-800 border-slate-700 max-w-[200px]">
                      <p className="font-medium text-amber-400">Quick Mode</p>
                      <p className="text-xs text-slate-400">~5-10s • Direct answer without refinement</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Thoughtful Mode */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setResponseMode('thoughtful')
                          setOnboardingState(prev => progressOnboarding(prev, { type: 'mode_changed', mode: 'thoughtful' }))
                        }}
                        disabled={isLoading}
                        className={`group relative flex items-center justify-center sm:justify-start space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex-1 sm:flex-initial ${
                          responseMode === 'thoughtful'
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Lightbulb className={`h-4 w-4 transition-transform duration-300 ${responseMode === 'thoughtful' ? 'animate-pulse' : 'group-hover:scale-110'}`} />
                        <span className="hidden sm:inline">Thoughtful</span>
                        {responseMode === 'thoughtful' && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-300"></span>
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-800 border-slate-700 max-w-[200px]">
                      <p className="font-medium text-blue-400">Thoughtful Mode</p>
                      <p className="text-xs text-slate-400">~30-60s • Refine → Fire for better answers</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Contemplate Mode - Master tier only */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (!canUseContemplate) {
                            setShowUpgradeModal(true)
                            return
                          }
                          setResponseMode('contemplate')
                          setOnboardingState(prev => progressOnboarding(prev, { type: 'mode_changed', mode: 'contemplate' }))
                        }}
                        disabled={isLoading}
                        className={`group relative flex items-center justify-center sm:justify-start space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex-1 sm:flex-initial ${
                          !canUseContemplate
                            ? 'text-slate-500 opacity-60 cursor-pointer'
                            : responseMode === 'contemplate'
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 scale-[1.02]'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {canUseContemplate ? (
                          <GraduationCap className={`h-4 w-4 transition-transform duration-300 ${responseMode === 'contemplate' ? 'animate-pulse' : 'group-hover:scale-110'}`} />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Contemplate</span>
                        {!canUseContemplate && (
                          <Crown className="h-3 w-3 text-amber-400 ml-1" />
                        )}
                        {responseMode === 'contemplate' && canUseContemplate && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-300"></span>
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-800 border-slate-700 max-w-[220px]">
                      <p className="font-medium text-purple-400">Contemplate Mode</p>
                      <p className="text-xs text-slate-400">~60-90s • Deep analysis with multiple perspectives</p>
                      {!canUseContemplate && (
                        <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                          <Crown className="h-3 w-3" /> Master tier only
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Group 2: Panel (standalone) */}
                <div className="flex p-1 bg-slate-800 rounded-xl ring-1 ring-slate-700/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowDebug(!showDebug)}
                        disabled={isLoading}
                        className={`group relative flex items-center justify-center sm:justify-start space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex-1 sm:flex-initial ${
                          showDebug
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <PanelRight className={`h-4 w-4 transition-transform duration-300 ${showDebug ? 'animate-pulse' : 'group-hover:scale-110'}`} />
                        <span className="hidden sm:inline">Panel</span>
                        {showDebug && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300"></span>
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-800 border-slate-700 max-w-[200px]">
                      <p className="font-medium text-emerald-400">Debug Panel</p>
                      <p className="text-xs text-slate-400">Show the thinking process and refinement steps</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Group 3: Supreme Court (standalone) - Earned through usage, not purchased */}
                <div className={`flex p-1 rounded-xl ring-1 transition-all duration-300 ${
                  hasEarnedSupreme && responseMode === 'supreme'
                    ? 'bg-slate-800 ring-slate-700/50'
                    : hasEarnedSupreme
                      ? 'bg-gradient-to-r from-rose-950/50 to-red-950/50 ring-rose-500/30 shadow-sm shadow-rose-500/10'
                      : 'bg-slate-800/50 ring-slate-700/30'
                }`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          // Supreme Court is earned through usage patterns, not purchased
                          if (!hasEarnedSupreme) {
                            setShowSupremeLockedModal(true)
                            return
                          }
                          setResponseMode('supreme')
                          setOnboardingState(prev => progressOnboarding(prev, { type: 'mode_changed', mode: 'supreme' }))
                        }}
                        disabled={isLoading}
                        className={`group relative flex items-center justify-center sm:justify-start space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex-1 sm:flex-initial ${
                          !hasEarnedSupreme
                            ? 'text-slate-500/70 cursor-pointer hover:text-slate-400'
                            : responseMode === 'supreme'
                              ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30 scale-[1.02]'
                              : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {hasEarnedSupreme ? (
                          <Scale className={`h-4 w-4 transition-all duration-300 ${responseMode === 'supreme' ? 'animate-pulse' : 'group-hover:scale-110 group-hover:rotate-3'}`} />
                        ) : (
                          <Scale className="h-4 w-4 opacity-50" />
                        )}
                        <span className="hidden sm:inline">Supreme</span>
                        {!hasEarnedSupreme && (
                          <Lock className="h-3 w-3 text-slate-500 ml-1" />
                        )}
                        {responseMode === 'supreme' && hasEarnedSupreme && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-300"></span>
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-800 border-slate-700 max-w-[240px]">
                      <p className="font-medium text-rose-400">Supreme Court Mode</p>
                      {hasEarnedSupreme ? (
                        <p className="text-xs text-slate-400">~2-3 min • AI justices deliberate with majority, concurring & dissenting opinions</p>
                      ) : (
                        <p className="text-xs text-slate-400">This mode is earned through mastery. Keep asking great questions.</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
          </div>

          {/* Mode Suggestion Banner */}
          {showModeSuggestion && modeSuggestion && (
            <div className="flex items-center gap-3 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Sparkles className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-blue-300">
                  {modeSuggestion.reason}.{' '}
                </span>
                <button
                  onClick={() => {
                    setResponseMode(modeSuggestion.suggestedMode)
                    setShowModeSuggestion(false)
                    // Trigger onboarding discovery for mode change
                    setOnboardingState(prev => progressOnboarding(prev, { type: 'mode_changed', mode: modeSuggestion.suggestedMode }))
                  }}
                  className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Try {modeSuggestion.suggestedMode} mode?
                </button>
              </div>
              <button
                onClick={() => setShowModeSuggestion(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

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


          {/* Input */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
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
              {/* Voice input button */}
              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  disabled={isLoading}
                  className={`absolute right-2 bottom-2 p-2 rounded-full transition-all ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Start voice input'}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            <div className="flex sm:flex-col gap-2">
              {/* Context-aware button: Fire (orange) for refined/good questions, Send (default) otherwise */}
              {(() => {
                // Fire button is the "reward" - only shown when question is ready
                const showFireButton = refinementSuggestion?.type === 'good' || chatStage === 'refined'

                if (responseMode === 'quick') {
                  // Quick mode
                  if (showFireButton) {
                    // Good question - show Fire button
                    return (
                      <Button
                        onClick={() => handleGatekeeper()}
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
                    // Simple/unrefined question - show Send button
                    return (
                      <Button
                        onClick={() => handleGatekeeper()}
                        disabled={isLoading || !input.trim()}
                        size="lg"
                        className="flex-1 sm:flex-initial px-4 sm:px-6"
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send
                          </>
                        )}
                      </Button>
                    )
                  }
                } else {
                  // Thoughtful/Contemplate mode
                  if (showFireButton) {
                    return (
                      <Button
                        onClick={handleGatekeeper}
                        disabled={isLoading || !input.trim() || chatStage === 'gatekeeper-prompt'}
                        size="lg"
                        className="flex-1 sm:flex-initial px-4 sm:px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        {isLoading && (chatStage === 'refining' || chatStage === 'gating') ? (
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
                    // Send/Ask button for unrefined questions
                    // Note: chatStage can't be 'refined' here since that's handled by showFireButton
                    return (
                      <Button
                        onClick={handleGatekeeper}
                        disabled={isLoading || !input.trim() || chatStage === 'gatekeeper-prompt'}
                        size="lg"
                        className="flex-1 sm:flex-initial px-4 sm:px-6"
                      >
                        {isLoading && (chatStage === 'refining' || chatStage === 'gating') ? (
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

      {/* OSCAR Bubble - Handles onboarding + profile questions */}
      <OSCARBubble
        ref={oscarBubbleRef}
        onboardingState={onboardingState}
        onOnboardingProgress={setOnboardingState}
        profileQuestion={currentQuestion}
        answeredCount={answeredQuestionIds.length}
        totalQuestions={getTotalQuestions()}
        onProfileAnswer={handleProfileAnswer}
        onProfileSkip={handleProfileSkip}
        onModeChanged={(mode) => {
          // Trigger onboarding discovery when user tries new modes
          setOnboardingState(prev =>
            progressOnboarding(prev, { type: 'mode_changed', mode })
          )
        }}
        onQuestionAsked={() => {
          // Trigger onboarding progress when user asks first question
          setOnboardingState(prev =>
            progressOnboarding(prev, { type: 'asked_question' })
          )
        }}
        alwaysVisible={true}
        workspaceId={workspaceId}
        isFocusMode={responseMode === 'contemplate'}
        onStartConversation={handleInsightConversation}
        isGreetingCentered={false}
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
    </div>
  )
})
