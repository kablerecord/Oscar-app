/**
 * OSQR Onboarding State Management
 *
 * Implements the onboarding flow from onboarding-flow-v1.md spec:
 * - Phase 1: First Contact - "Hi. I'm OSQR."
 * - Phase 2: Trust Gate - Data sovereignty messaging before uploads
 * - Phase 3: Value Demonstration - Upload + insight cards with reasoning
 * - Phase 4: Getting to Know You - 2-3 contextual questions
 * - Phase 5: Deeper Insight - Personalized connections
 * - Phase 6: Invitation + Limits Disclosure
 *
 * State is stored in PKV (onboarding IS the first memory)
 */

// ============================================
// Onboarding Phases (from spec)
// ============================================

export type OnboardingPhase =
  | 'first_contact'      // Phase 1: "Hi. I'm OSQR."
  | 'trust_gate'         // Phase 2: Data sovereignty before upload
  | 'demo_mode'          // Phase 2 alt: Sample document for hesitant users
  | 'value_demo'         // Phase 3: Upload + insight cards
  | 'getting_to_know'    // Phase 4: 2-3 contextual questions
  | 'deeper_insight'     // Phase 5: Personalized insight
  | 'limits_disclosure'  // Phase 6: Tier info + invitation
  | 'completed'          // Done with onboarding
  | 'skipped'            // User skipped, passive onboarding later

// User response at first contact
export type FirstContactResponse = 'yes_show_me' | 'tell_me_more' | 'skip_for_now'

// User response at trust gate
export type TrustGateResponse = 'proceed' | 'more_privacy_info' | 'try_demo'

// ============================================
// Insight Card (Phase 3)
// ============================================

export interface InsightCard {
  id: string
  headline: string
  category: 'pattern' | 'question' | 'connection' | 'issue' | 'action'
  reasoning: string // The "How I found this" explanation
  sourceReference?: string // Link to specific document section
  confidence: 'high' | 'medium' | 'low'
  expanded: boolean // User has expanded the reasoning
}

// ============================================
// Document Context Questions (Phase 4)
// ============================================

export type DocumentType =
  | 'business_strategy'
  | 'creative_writing'
  | 'technical_code'
  | 'planning_roadmap'
  | 'general'

export interface ContextQuestion {
  id: string
  question: string
  documentType: DocumentType
  answer?: string
  asked: boolean
}

// Question mapping from spec
export const CONTEXT_QUESTIONS: Record<DocumentType, string[]> = {
  business_strategy: [
    "What's the one metric that tells you this is working?",
    "What would success look like in 90 days?",
  ],
  creative_writing: [
    "Who's the person you most want to read this?",
    "What feeling do you want to leave them with?",
  ],
  technical_code: [
    "What breaks if this doesn't ship on time?",
    "Who else needs to touch this code?",
  ],
  planning_roadmap: [
    "What's the thing most likely to derail this plan?",
    "What's your biggest unknown right now?",
  ],
  general: [
    "What would make you say 'OSQR really gets it' a month from now?",
    "What's taking up the most headspace right now?",
  ],
}

// ============================================
// Onboarding State
// ============================================

export interface OnboardingState {
  // Current phase
  phase: OnboardingPhase

  // Phase 1: First Contact
  firstContactResponse?: FirstContactResponse

  // Phase 2: Trust Gate
  trustGateResponse?: TrustGateResponse
  trustGateExpanded: boolean // User clicked "Tell me more about privacy"

  // Phase 3: Value Demo
  uploadedDocument?: {
    id: string
    name: string
    type: string
    uploadedAt: Date
  }
  insights: InsightCard[]
  usedDemoDocument: boolean // User chose sample document

  // Phase 4: Getting to Know You
  detectedDocumentType: DocumentType
  contextQuestions: ContextQuestion[]
  questionsAsked: number

  // Phase 5: Deeper Insight
  deeperInsights: InsightCard[]

  // Phase 6: Limits Disclosure
  seenLimitsDisclosure: boolean
  upgradeInterest?: 'keep_going' | 'come_back' | 'see_plans'

  // Meta
  startedAt: Date
  completedAt?: Date
  userName?: string

  // Skip recovery (from spec)
  interactionsSinceSkip: number
  skipRecoveryPrompted: boolean

  // Engagement tracking
  insightClickCount: number
  reasoningExpandCount: number

  // Mobile-specific
  inputMethod?: 'upload' | 'share' | 'voice' | 'photo' | 'link' | 'text'
}

// ============================================
// Initial State
// ============================================

export function getInitialOnboardingState(): OnboardingState {
  return {
    phase: 'first_contact',
    trustGateExpanded: false,
    insights: [],
    usedDemoDocument: false,
    detectedDocumentType: 'general',
    contextQuestions: [],
    questionsAsked: 0,
    deeperInsights: [],
    seenLimitsDisclosure: false,
    startedAt: new Date(),
    interactionsSinceSkip: 0,
    skipRecoveryPrompted: false,
    insightClickCount: 0,
    reasoningExpandCount: 0,
  }
}

// ============================================
// Phase Transitions
// ============================================

export type OnboardingAction =
  | { type: 'first_contact_response'; response: FirstContactResponse }
  | { type: 'trust_gate_response'; response: TrustGateResponse }
  | { type: 'toggle_privacy_info' }
  | { type: 'document_uploaded'; document: OnboardingState['uploadedDocument'] }
  | { type: 'use_demo_document' }
  | { type: 'insights_generated'; insights: InsightCard[] }
  | { type: 'insight_clicked'; insightId: string }
  | { type: 'reasoning_expanded'; insightId: string }
  | { type: 'set_document_type'; documentType: DocumentType }
  | { type: 'question_answered'; questionId: string; answer: string }
  | { type: 'deeper_insights_generated'; insights: InsightCard[] }
  | { type: 'limits_seen' }
  | { type: 'upgrade_interest'; interest: OnboardingState['upgradeInterest'] }
  | { type: 'set_user_name'; name: string }
  | { type: 'skip_onboarding' }
  | { type: 'resume_from_skip' }
  | { type: 'increment_interaction' }
  | { type: 'complete' }

export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState {
  switch (action.type) {
    case 'first_contact_response':
      if (action.response === 'skip_for_now') {
        return { ...state, phase: 'skipped', firstContactResponse: action.response }
      }
      return {
        ...state,
        phase: 'trust_gate',
        firstContactResponse: action.response,
      }

    case 'trust_gate_response':
      if (action.response === 'try_demo') {
        return { ...state, phase: 'demo_mode', trustGateResponse: action.response }
      }
      return {
        ...state,
        phase: 'value_demo',
        trustGateResponse: action.response,
      }

    case 'toggle_privacy_info':
      return { ...state, trustGateExpanded: !state.trustGateExpanded }

    case 'document_uploaded':
      return {
        ...state,
        uploadedDocument: action.document,
        usedDemoDocument: false,
      }

    case 'use_demo_document':
      return {
        ...state,
        usedDemoDocument: true,
        phase: 'value_demo',
      }

    case 'insights_generated':
      return {
        ...state,
        insights: action.insights,
        phase: 'getting_to_know',
      }

    case 'insight_clicked':
      return {
        ...state,
        insightClickCount: state.insightClickCount + 1,
        insights: state.insights.map(i =>
          i.id === action.insightId ? { ...i, expanded: true } : i
        ),
      }

    case 'reasoning_expanded':
      return {
        ...state,
        reasoningExpandCount: state.reasoningExpandCount + 1,
      }

    case 'set_document_type':
      const questions = CONTEXT_QUESTIONS[action.documentType].slice(0, 2).map((q, i) => ({
        id: `q_${i}`,
        question: q,
        documentType: action.documentType,
        asked: false,
      }))
      return {
        ...state,
        detectedDocumentType: action.documentType,
        contextQuestions: questions,
      }

    case 'question_answered':
      const updatedQuestions = state.contextQuestions.map(q =>
        q.id === action.questionId
          ? { ...q, answer: action.answer, asked: true }
          : q
      )
      const answeredCount = updatedQuestions.filter(q => q.asked).length
      const shouldAdvance = answeredCount >= 2 || answeredCount >= state.contextQuestions.length

      return {
        ...state,
        contextQuestions: updatedQuestions,
        questionsAsked: answeredCount,
        phase: shouldAdvance ? 'deeper_insight' : state.phase,
      }

    case 'deeper_insights_generated':
      return {
        ...state,
        deeperInsights: action.insights,
        phase: 'limits_disclosure',
      }

    case 'limits_seen':
      return { ...state, seenLimitsDisclosure: true }

    case 'upgrade_interest':
      return {
        ...state,
        upgradeInterest: action.interest,
        phase: 'completed',
        completedAt: new Date(),
      }

    case 'set_user_name':
      return { ...state, userName: action.name }

    case 'skip_onboarding':
      return { ...state, phase: 'skipped' }

    case 'resume_from_skip':
      return {
        ...state,
        phase: 'trust_gate',
        skipRecoveryPrompted: true,
      }

    case 'increment_interaction':
      const newCount = state.interactionsSinceSkip + 1
      return {
        ...state,
        interactionsSinceSkip: newCount,
      }

    case 'complete':
      return {
        ...state,
        phase: 'completed',
        completedAt: new Date(),
      }

    default:
      return state
  }
}

// ============================================
// Helper Functions
// ============================================

export function shouldShowSkipRecovery(state: OnboardingState): boolean {
  // From spec: After 5 interactions without PKV context, prompt recovery
  return (
    state.phase === 'skipped' &&
    state.interactionsSinceSkip >= 5 &&
    !state.skipRecoveryPrompted
  )
}

export function isOnboardingActive(state: OnboardingState): boolean {
  return state.phase !== 'completed' && state.phase !== 'skipped'
}

export function getOnboardingProgress(state: OnboardingState): number {
  const phases: OnboardingPhase[] = [
    'first_contact',
    'trust_gate',
    'value_demo',
    'getting_to_know',
    'deeper_insight',
    'limits_disclosure',
    'completed',
  ]
  const currentIndex = phases.indexOf(state.phase)
  if (currentIndex === -1) return 0
  return Math.round((currentIndex / (phases.length - 1)) * 100)
}

// ============================================
// OSQR Messages (from spec)
// ============================================

export const ONBOARDING_MESSAGES = {
  first_contact: {
    greeting: "Hi. I'm OSQR.",
    message: "I'm different from other AI tools you've used. I don't wait for questions — I think about your stuff and surface what matters.",
    cta: "Want to see what I mean?",
    options: [
      { id: 'yes_show_me', label: 'Yes, show me' },
      { id: 'tell_me_more', label: 'Tell me more first' },
      { id: 'skip_for_now', label: 'Skip for now' },
    ],
  },

  trust_gate: {
    message: "Before you share anything, you should know how I handle your stuff.",
    details: [
      "Everything you upload stays yours. I don't train on it. I don't share it. I don't even see it unless you're actively working with me.",
      "You can delete anything, anytime, and it's gone. Not archived. Gone.",
    ],
    options: [
      { id: 'proceed', label: "Got it, let's go" },
      { id: 'more_privacy_info', label: 'Tell me more about privacy' },
      { id: 'try_demo', label: "I'm not comfortable yet" },
    ],
  },

  demo_mode: {
    message: "That's fair. Want to see what I do with a sample document instead? You can try me without uploading anything personal.",
    cta: "That's what I'd do with your stuff — if you ever decide to share it.",
  },

  value_demo: {
    prompt: "Upload something you're working on. A document, a note, anything. I'll show you what I notice.",
    thinking: "Interesting. Here's what I found...",
    followup: "That's what I do. I find things you might miss when you're deep in the work.",
  },

  getting_to_know: {
    prompt: "I could do more with context. Mind if I ask a couple questions about what you're working on?",
    acknowledgment: "Got it. That helps me understand what matters to you.",
  },

  deeper_insight: {
    intro: "Now that I know more... here's something I wouldn't have caught before:",
    summary: "This is what I do — I think about your stuff so you don't have to hold it all in your head.",
  },

  limits_disclosure: {
    memory: "I'll remember everything we just talked about. Next time you upload something, I'll have this context.",
    limits: "Right now I can hold onto 5 documents at a time. If you want me to remember more, or go deeper on insights, there's a way to unlock that.",
    cta: "Want to keep going, or take a break and come back?",
    options: [
      { id: 'keep_going', label: 'Keep going' },
      { id: 'come_back', label: "I'll come back" },
      { id: 'see_plans', label: 'Tell me about plans' },
    ],
  },

  skip_recovery: {
    message: "I've been helping without really knowing your context. Want to take 60 seconds to help me understand what you're working on? I'll be a lot more useful.",
    options: [
      { id: 'yes', label: "Yes, let's do that" },
      { id: 'not_now', label: 'Not now' },
    ],
  },

  return_user: {
    message: "Hey, welcome back. It's been a while.",
    cta: "Want to pick up where we left off, or start fresh?",
  },
}

// ============================================
// Document Type Detection
// ============================================

export function detectDocumentType(content: string, mimeType?: string): DocumentType {
  const lowerContent = content.toLowerCase()

  // Technical/Code indicators
  if (
    mimeType?.includes('javascript') ||
    mimeType?.includes('typescript') ||
    mimeType?.includes('python') ||
    lowerContent.includes('function') ||
    lowerContent.includes('import ') ||
    lowerContent.includes('class ') ||
    lowerContent.includes('def ') ||
    lowerContent.includes('const ') ||
    lowerContent.includes('let ') ||
    lowerContent.includes('```')
  ) {
    return 'technical_code'
  }

  // Business/Strategy indicators
  if (
    lowerContent.includes('revenue') ||
    lowerContent.includes('metric') ||
    lowerContent.includes('kpi') ||
    lowerContent.includes('strategy') ||
    lowerContent.includes('market') ||
    lowerContent.includes('customer') ||
    lowerContent.includes('growth') ||
    lowerContent.includes('quarterly')
  ) {
    return 'business_strategy'
  }

  // Planning/Roadmap indicators
  if (
    lowerContent.includes('timeline') ||
    lowerContent.includes('milestone') ||
    lowerContent.includes('roadmap') ||
    lowerContent.includes('phase') ||
    lowerContent.includes('deadline') ||
    lowerContent.includes('q1') ||
    lowerContent.includes('q2') ||
    lowerContent.includes('q3') ||
    lowerContent.includes('q4')
  ) {
    return 'planning_roadmap'
  }

  // Creative/Writing indicators
  if (
    lowerContent.includes('chapter') ||
    lowerContent.includes('character') ||
    lowerContent.includes('story') ||
    lowerContent.includes('narrative') ||
    lowerContent.includes('draft') ||
    lowerContent.includes('scene')
  ) {
    return 'creative_writing'
  }

  return 'general'
}
