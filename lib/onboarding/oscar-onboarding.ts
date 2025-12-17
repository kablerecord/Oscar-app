/**
 * OSQR Bubble Onboarding System
 *
 * The bubble IS the onboarding. OSQR introduces himself conversationally,
 * explains his capabilities, and gets to know the user - all through the
 * same interface they'll use to interact with him going forward.
 *
 * This creates continuity: the first conversation with OSQR is also the onboarding.
 */

// Onboarding stages - a natural conversation flow
export type OnboardingStage =
  // Phase 1: Introduction
  | 'welcome'              // OSQR says hello, introduces himself
  | 'explain_purpose'      // What OSQR does and why he's different
  | 'explain_how'          // How he works (panel, modes, knowledge)

  // Phase 2: Get to know user
  | 'ask_ready'            // Ready to get started?
  | 'get_name'             // What should I call you?
  | 'get_working_on'       // What are you working on?
  | 'get_challenge'        // What's your biggest challenge?

  // Phase 3: First experience
  | 'explain_modes'        // Explain Quick/Thoughtful/Contemplate
  | 'invite_first_question' // Encourage first question
  | 'first_question_asked' // Waiting for their question
  | 'post_first_answer'    // After first answer - celebrate & explain more

  // Phase 4: Ongoing discovery
  | 'idle'                 // Normal operation
  | 'thoughtful_discovery' // First time using Thoughtful
  | 'contemplate_discovery' // First time using Contemplate
  | 'upload_discovery'     // First time they could upload
  | 'chat_history_discovery' // Suggest importing AI chat history
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
  hasSeenUploadTip: boolean
  hasSeenChatHistoryTip: boolean
  questionsAsked: number
  lastTipShown?: ContextualTip
  completedStages: OnboardingStage[]
}

// Messages OSQR says at each stage
//
// DESIGN PRINCIPLE (from OSQR-IDENTITY-SURFACES.md):
// "OSQR is someone, not something."
//
// The first session teaches the identity model through experience, not explanation.
// No tooltips. No tutorials. Just OSQR being OSQR.
// Users learn that OSQR initiates surface transitions. They don't "navigate"—
// they converse, and OSQR decides when to shift gears.
//
export const OSCAR_MESSAGES: Record<OnboardingStage, {
  greeting?: string
  message: string
  subMessage?: string  // Secondary text, smaller
  inputType?: 'text' | 'choice' | 'none'
  choices?: string[]
  nextStage?: OnboardingStage
  autoAdvanceDelay?: number
  showBrain?: boolean  // Show the brain icon
}> = {
  // ===== Phase 1: Introduction (Relationship First) =====
  // Per identity doc: "Hey. I'm OSQR. What's on your mind?"
  // Warm, not robotic. A friend looking up when you walk in.
  welcome: {
    greeting: getTimeBasedGreeting(),
    message: "I'm OSQR.",
    subMessage: "I'll be your thinking partner — someone to work through problems with, not just a tool to get answers from.",
    inputType: 'choice',
    choices: ["Hey OSQR"],
    nextStage: 'explain_purpose',
    showBrain: true,
  },

  explain_purpose: {
    message: "I'm here whenever you need to think something through — big decisions, stuck problems, or just getting clarity on what matters.",
    subMessage: "The more we work together, the better I'll understand how you think.",
    inputType: 'choice',
    choices: ["What can you help with?", "Let's get started"],
    nextStage: 'explain_how',
  },

  explain_how: {
    message: "Anything, really. Work problems, personal decisions, creative projects, learning something new...",
    subMessage: "I flex to what you need. Some days that's quick answers, other days it's deep thinking.",
    inputType: 'choice',
    choices: ["Got it"],
    nextStage: 'ask_ready',
  },

  // ===== Phase 2: Get to know user (Conversational) =====
  // Per identity doc: Users learn through natural conversation, not forms
  ask_ready: {
    message: "Quick thing — I'd love to know a bit about you. Helps me be more useful.",
    inputType: 'choice',
    choices: ["Sure", "Skip for now"],
    nextStage: 'get_name',
  },

  get_name: {
    message: "What should I call you?",
    inputType: 'text',
    nextStage: 'get_working_on',
  },

  get_working_on: {
    message: "What's on your mind these days? What are you working on?",
    subMessage: "Could be a project, a decision, learning something — whatever's taking up headspace.",
    inputType: 'text',
    nextStage: 'get_challenge',
  },

  get_challenge: {
    message: "And what's the hard part? Where do you get stuck?",
    inputType: 'text',
    nextStage: 'explain_modes',
  },

  // ===== Phase 3: First experience (Teach by Doing) =====
  // Per identity doc: "The first session IS real use. OSQR just happens to be meeting someone new."
  // Don't explain modes upfront — let them discover naturally
  explain_modes: {
    message: "Perfect. Now I have some context.",
    subMessage: "One thing — when you need me to really think through something important, just ask. I'll take more time and dig deeper.",
    inputType: 'choice',
    choices: ["Sounds good"],
    nextStage: 'invite_first_question',
  },

  invite_first_question: {
    greeting: "Alright.",
    message: "What's on your mind?",
    subMessage: "Type something you're actually thinking about — I work best with real problems.",
    inputType: 'choice',
    choices: ["Let me think..."],
    nextStage: 'idle',
  },

  first_question_asked: {
    message: "Thinking...",
    inputType: 'none',
    nextStage: 'post_first_answer',
  },

  // Per identity doc: OSQR initiates surface transitions
  // After first answer, gently mention capabilities without being pushy
  post_first_answer: {
    message: "By the way — when you have something really important to work through, I can go deeper. Just say so and I'll take my time with it.",
    inputType: 'none',
    autoAdvanceDelay: 5000,
    nextStage: 'idle',
  },

  // ===== Phase 4: Ongoing (Quiet Availability) =====
  // Per identity doc: "Silence is not absence—it's companionship."
  idle: {
    message: "I'm here when you need me.",
    inputType: 'none',
  },

  // Discovery moments — gentle, not tutorial-like
  // Per identity doc: "Sometimes being there matters more than saying something"
  thoughtful_discovery: {
    message: "I'm going to take my time with this one. Bringing in different perspectives to make sure I give you something useful.",
    inputType: 'none',
    autoAdvanceDelay: 4000,
    nextStage: 'idle',
  },

  contemplate_discovery: {
    message: "This deserves deep thought. I'll explore this from every angle — give me a minute.",
    inputType: 'none',
    autoAdvanceDelay: 5000,
    nextStage: 'idle',
  },

  upload_discovery: {
    message: "The more I know about your world, the more I can help. You can add documents to your Vault whenever you want.",
    inputType: 'none',
    autoAdvanceDelay: 5000,
    nextStage: 'idle',
  },

  chat_history_discovery: {
    message: "If you've used other AIs, you can import those conversations. Gives me years of context about how you think.",
    inputType: 'none',
    autoAdvanceDelay: 6000,
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
    hasSeenUploadTip: false,
    hasSeenChatHistoryTip: false,
    questionsAsked: 0,
    completedStages: [],
  }
}

// Check if user should see onboarding bubble
export function shouldShowOnboarding(state: OnboardingState): boolean {
  // Show during active onboarding stages
  const activeStages: OnboardingStage[] = [
    'welcome', 'explain_purpose', 'explain_how', 'ask_ready',
    'get_name', 'get_working_on', 'get_challenge',
    'explain_modes', 'invite_first_question',
    'post_first_answer', 'thoughtful_discovery', 'contemplate_discovery',
    'upload_discovery', 'chat_history_discovery'
  ]
  return activeStages.includes(state.stage)
}

// Check if we're in the intro phase (before getting user info)
export function isIntroPhase(state: OnboardingState): boolean {
  const introStages: OnboardingStage[] = [
    'welcome', 'explain_purpose', 'explain_how', 'ask_ready'
  ]
  return introStages.includes(state.stage)
}

// Progress to next stage
export function progressOnboarding(
  state: OnboardingState,
  action: {
    type: 'answer' | 'skip' | 'auto_advance' | 'asked_question' | 'mode_changed' | 'answer_received'
    answer?: string
    mode?: 'quick' | 'thoughtful' | 'contemplate' | 'supreme'
  }
): OnboardingState {
  const newState = { ...state }

  switch (action.type) {
    case 'answer':
      // Handle user answering/clicking in the bubble
      switch (state.stage) {
        case 'welcome':
          newState.stage = 'explain_purpose'
          break
        case 'explain_purpose':
          newState.stage = 'explain_how'
          break
        case 'explain_how':
          newState.stage = 'ask_ready'
          break
        case 'ask_ready':
          if (action.answer === 'Skip for now') {
            newState.stage = 'invite_first_question'
          } else {
            newState.stage = 'get_name'
          }
          break
        case 'get_name':
          newState.userName = action.answer
          newState.stage = 'get_working_on'
          break
        case 'get_working_on':
          newState.workingOn = action.answer
          newState.stage = 'get_challenge'
          break
        case 'get_challenge':
          newState.challenge = action.answer
          newState.stage = 'explain_modes'
          break
        case 'explain_modes':
          newState.stage = 'invite_first_question'
          break
        case 'invite_first_question':
          newState.stage = 'idle'
          break
      }
      break

    case 'skip':
      // User skipped - go to invite first question
      if (['get_name', 'get_working_on', 'get_challenge'].includes(state.stage)) {
        newState.stage = 'explain_modes'
      } else {
        newState.stage = 'idle'
      }
      break

    case 'auto_advance':
      const currentMessage = OSCAR_MESSAGES[state.stage]
      if (currentMessage.nextStage) {
        newState.stage = currentMessage.nextStage
      }
      break

    case 'asked_question':
      // User typed a question and fired
      newState.questionsAsked += 1
      if (state.stage === 'invite_first_question' || state.stage === 'first_question_asked') {
        newState.stage = 'first_question_asked'
      }
      if (!state.hasAskedFirstQuestion) {
        newState.hasAskedFirstQuestion = true
      }
      break

    case 'answer_received':
      // Response came back from AI
      if (state.stage === 'first_question_asked' && !state.completedStages.includes('post_first_answer')) {
        newState.stage = 'post_first_answer'
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

// Check if core onboarding is complete (user can use the app fully)
export function isCoreOnboardingComplete(state: OnboardingState): boolean {
  return state.hasAskedFirstQuestion
}

// Check if full onboarding is complete (all discovery done)
export function isOnboardingComplete(state: OnboardingState): boolean {
  return (
    state.hasAskedFirstQuestion &&
    state.hasTriedThoughtful &&
    state.hasTriedContemplate &&
    !!state.userName
  )
}

// Get a contextual tip based on usage
export function getContextualTip(state: OnboardingState): ContextualTip | null {
  // After 3 questions in quick mode, suggest thoughtful
  if (state.questionsAsked >= 3 && !state.hasTriedThoughtful) {
    return 'mode_upgrade_prompt'
  }

  // After first answer, suggest uploading documents
  if (state.hasAskedFirstQuestion && !state.hasSeenUploadTip && state.questionsAsked >= 2) {
    return 'knowledge_base_tip'
  }

  // After 5 questions, suggest importing chat history from other AIs
  if (state.questionsAsked >= 5 && !state.hasSeenChatHistoryTip && state.hasSeenUploadTip) {
    return 'chat_history_tip'
  }

  return null
}
