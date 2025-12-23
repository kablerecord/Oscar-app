/**
 * OSQR Bubble Onboarding System
 *
 * PHILOSOPHY: Progressive discovery through moments of relevance.
 *
 * The bubble IS OSQR's voice. It's not a tutorial overlay - it's OSQR
 * literally pointing and saying "hey, check this out." That feels personal,
 * not like software onboarding.
 *
 * Flow:
 * 1. Welcome → Get name (quick, warm intro)
 * 2. Got name → They're in the app
 * 3. After first question → Vault discovery (highlight, explain)
 * 4. Contextual tips based on behavior
 */

// Onboarding stages
export type OnboardingStage =
  // Phase 1: Meet (quick intro, get name)
  | 'welcome'              // "Hey. I'm OSQR." + get name
  | 'got_name'             // Acknowledge name, invite to chat

  // Phase 2: Discovery (triggered by behavior)
  | 'vault_discovery'      // After first question - introduce the Vault
  | 'vault_highlight'      // Highlight the Vault icon
  | 'first_upload'         // After they upload something
  | 'mode_discovery'       // After 3 quick questions - suggest deeper modes

  // Phase 3: Ongoing
  | 'idle'                 // Normal operation
  | 'thoughtful_discovery' // First time using Thoughtful
  | 'contemplate_discovery' // First time using Contemplate
  | 'completed'            // Full onboarding done

// Contextual tips that can appear at any time
export type ContextualTip =
  | 'panel_explanation'
  | 'knowledge_base_tip'
  | 'mode_upgrade_prompt'
  | 'profile_prompt'
  | 'chat_history_tip'

export interface OnboardingState {
  stage: OnboardingStage
  userName?: string
  workingOn?: string
  challenge?: string
  hasAskedFirstQuestion: boolean
  hasTriedThoughtful: boolean
  hasTriedContemplate: boolean
  hasSeenVaultTip: boolean
  hasUploadedDocument: boolean
  hasSeenModeTip: boolean
  hasSeenChatHistoryTip: boolean
  questionsAsked: number
  lastTipShown?: ContextualTip
  completedStages: OnboardingStage[]
}

// Messages OSQR says at each stage
export const OSCAR_MESSAGES: Record<OnboardingStage, {
  greeting?: string
  message: string
  subMessage?: string
  inputType?: 'text' | 'choice' | 'none'
  choices?: string[]
  nextStage?: OnboardingStage
  autoAdvanceDelay?: number
  showBrain?: boolean
  highlightTarget?: 'vault' | 'sidebar' | 'modes' | 'tips'
}> = {
  // ===== Phase 1: Meet =====
  welcome: {
    greeting: getTimeBasedGreeting(),
    message: "I'm OSQR.",
    subMessage: "What should I call you?",
    inputType: 'text',
    nextStage: 'got_name',
    showBrain: true,
  },

  got_name: {
    message: "Nice to meet you!",
    subMessage: "I'll be in the right panel when you need me.",
    inputType: 'choice',
    choices: ["Got it"],
    nextStage: 'idle',
  },

  // ===== Phase 2: Discovery (triggered contextually) =====
  vault_discovery: {
    message: "Quick tip — I can learn a lot more about you if you add things to your Vault.",
    subMessage: "Notes, PDFs, past projects... the more context I have, the better I can help.",
    inputType: 'choice',
    choices: ["Show me", "Maybe later"],
    nextStage: 'vault_highlight',
    highlightTarget: 'vault',
  },

  vault_highlight: {
    message: "See that purple icon? That's your Memory Vault.",
    subMessage: "Upload something and I'll be able to reference it when we talk.",
    inputType: 'choice',
    choices: ["Got it"],
    nextStage: 'idle',
    highlightTarget: 'vault',
  },

  first_upload: {
    message: "Perfect! Now when you ask me questions, I can draw from what you've shared.",
    subMessage: "The more you add, the more useful I become.",
    inputType: 'none',
    autoAdvanceDelay: 4000,
    nextStage: 'idle',
  },

  mode_discovery: {
    message: "By the way — when you need me to really think through something, just ask.",
    subMessage: "I can go deeper on important decisions. Just say 'think harder' or try a different mode.",
    inputType: 'choice',
    choices: ["Good to know"],
    nextStage: 'idle',
    highlightTarget: 'modes',
  },

  // ===== Phase 3: Ongoing =====
  idle: {
    message: "I'm here when you need me.",
    inputType: 'none',
  },

  thoughtful_discovery: {
    message: "I'm going to take my time with this one.",
    subMessage: "Bringing in different perspectives to make sure I give you something useful.",
    inputType: 'none',
    autoAdvanceDelay: 4000,
    nextStage: 'idle',
  },

  contemplate_discovery: {
    message: "This deserves deep thought.",
    subMessage: "I'll explore this from every angle — give me a minute.",
    inputType: 'none',
    autoAdvanceDelay: 5000,
    nextStage: 'idle',
  },

  completed: {
    message: "Ready when you are.",
    inputType: 'none',
  },
}

// Time-based greeting
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning!'
  if (hour < 17) return 'Good afternoon!'
  if (hour < 21) return 'Good evening!'
  return 'Hey there, night owl!'
}

// Get personalized greeting
export function getPersonalizedGreeting(userName?: string): string {
  const base = getTimeBasedGreeting()
  if (userName) {
    return base.replace('!', `, ${userName}!`)
  }
  return base
}

// Initial state for new users
export function getInitialOnboardingState(): OnboardingState {
  return {
    stage: 'welcome',
    hasAskedFirstQuestion: false,
    hasTriedThoughtful: false,
    hasTriedContemplate: false,
    hasSeenVaultTip: false,
    hasUploadedDocument: false,
    hasSeenModeTip: false,
    hasSeenChatHistoryTip: false,
    questionsAsked: 0,
    completedStages: [],
  }
}

// Check if user should see onboarding bubble (takeover mode)
export function shouldShowOnboarding(state: OnboardingState): boolean {
  const activeStages: OnboardingStage[] = [
    'welcome', 'got_name',
    'vault_discovery', 'vault_highlight', 'first_upload', 'mode_discovery',
    'thoughtful_discovery', 'contemplate_discovery'
  ]
  return activeStages.includes(state.stage)
}

// Check if we're in the intro phase (full-screen takeover)
export function isIntroPhase(state: OnboardingState): boolean {
  return state.stage === 'welcome' || state.stage === 'got_name'
}

// Check if we're in a discovery phase (corner bubble with highlight)
export function isDiscoveryPhase(state: OnboardingState): boolean {
  return ['vault_discovery', 'vault_highlight', 'first_upload', 'mode_discovery'].includes(state.stage)
}

// Progress to next stage
export function progressOnboarding(
  state: OnboardingState,
  action: {
    type: 'answer' | 'skip' | 'auto_advance' | 'asked_question' | 'mode_changed' | 'answer_received' | 'document_uploaded' | 'trigger_discovery'
    answer?: string
    mode?: 'quick' | 'thoughtful' | 'contemplate' | 'supreme'
    discovery?: 'vault' | 'modes'
  }
): OnboardingState {
  const newState = { ...state }

  switch (action.type) {
    case 'answer':
      switch (state.stage) {
        case 'welcome':
          newState.userName = action.answer
          newState.stage = 'got_name'
          break
        case 'got_name':
          newState.stage = 'idle'
          break
        case 'vault_discovery':
          if (action.answer === 'Show me') {
            newState.stage = 'vault_highlight'
          } else {
            newState.stage = 'idle'
          }
          newState.hasSeenVaultTip = true
          break
        case 'vault_highlight':
          newState.stage = 'idle'
          break
        case 'mode_discovery':
          newState.stage = 'idle'
          newState.hasSeenModeTip = true
          break
      }
      break

    case 'skip':
      newState.stage = 'idle'
      break

    case 'auto_advance':
      const currentMessage = OSCAR_MESSAGES[state.stage]
      if (currentMessage.nextStage) {
        newState.stage = currentMessage.nextStage
      }
      break

    case 'asked_question':
      newState.questionsAsked += 1
      if (!state.hasAskedFirstQuestion) {
        newState.hasAskedFirstQuestion = true
      }
      break

    case 'answer_received':
      // After first answer, trigger vault discovery (if not seen)
      if (state.questionsAsked === 1 && !state.hasSeenVaultTip && state.stage === 'idle') {
        newState.stage = 'vault_discovery'
      }
      // After 3 questions, suggest deeper modes (if not seen)
      else if (state.questionsAsked >= 3 && !state.hasSeenModeTip && !state.hasTriedThoughtful && state.stage === 'idle') {
        newState.stage = 'mode_discovery'
      }
      break

    case 'document_uploaded':
      if (!state.hasUploadedDocument) {
        newState.hasUploadedDocument = true
        if (state.stage === 'idle' || state.stage === 'vault_highlight') {
          newState.stage = 'first_upload'
        }
      }
      break

    case 'trigger_discovery':
      if (action.discovery === 'vault' && !state.hasSeenVaultTip) {
        newState.stage = 'vault_discovery'
      } else if (action.discovery === 'modes' && !state.hasSeenModeTip) {
        newState.stage = 'mode_discovery'
      }
      break

    case 'mode_changed':
      if (action.mode === 'thoughtful' && !state.hasTriedThoughtful) {
        newState.hasTriedThoughtful = true
        newState.stage = 'thoughtful_discovery'
      } else if (action.mode === 'contemplate' && !state.hasTriedContemplate) {
        newState.hasTriedContemplate = true
        newState.stage = 'contemplate_discovery'
      }
      break
  }

  // Track completed stages
  if (newState.stage !== state.stage && !newState.completedStages.includes(state.stage)) {
    newState.completedStages = [...newState.completedStages, state.stage]
  }

  return newState
}

// Check if core onboarding is complete
export function isCoreOnboardingComplete(state: OnboardingState): boolean {
  return state.stage === 'idle' || state.stage === 'completed'
}

// Check if full onboarding is complete
export function isOnboardingComplete(state: OnboardingState): boolean {
  return (
    state.hasAskedFirstQuestion &&
    state.hasSeenVaultTip &&
    state.hasUploadedDocument &&
    !!state.userName
  )
}

// Get a contextual tip based on usage (for passive suggestions)
export function getContextualTip(state: OnboardingState): ContextualTip | null {
  // After 5 questions without trying thoughtful, suggest modes
  if (state.questionsAsked >= 5 && !state.hasTriedThoughtful && !state.hasSeenModeTip) {
    return 'mode_upgrade_prompt'
  }

  // After seeing vault but not uploading, gentle nudge
  if (state.hasSeenVaultTip && !state.hasUploadedDocument && state.questionsAsked >= 3) {
    return 'knowledge_base_tip'
  }

  return null
}
