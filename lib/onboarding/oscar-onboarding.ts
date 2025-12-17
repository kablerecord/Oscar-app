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
  // ===== Phase 1: Introduction =====
  welcome: {
    greeting: getTimeBasedGreeting(),
    message: "I'm OSQR — your AI thinking partner.",
    subMessage: "I help you work through problems, make better decisions, and get things done faster.",
    inputType: 'choice',
    choices: ["Nice to meet you!"],
    nextStage: 'explain_purpose',
    showBrain: true,
  },

  explain_purpose: {
    message: "I'm not like other AI assistants. I don't just give you one answer — I consult a panel of AI experts, synthesize their best insights, and give you something actually useful.",
    subMessage: "Think of me as having GPT-4, Claude, and other top AIs all working together for you.",
    inputType: 'choice',
    choices: ["How does that work?", "Sounds powerful"],
    nextStage: 'explain_how',
  },

  explain_how: {
    message: "When you ask me something important, I'll run it by my panel. Each AI thinks about it differently. Then I synthesize the best parts into one clear answer.",
    subMessage: "You get multiple perspectives without having to manage multiple AI subscriptions.",
    inputType: 'choice',
    choices: ["Got it, let's go!"],
    nextStage: 'ask_ready',
  },

  // ===== Phase 2: Get to know user =====
  ask_ready: {
    message: "Before we dive in, I'd love to learn a bit about you. The more I know, the more helpful I can be.",
    subMessage: "Just a few quick questions — takes about 30 seconds.",
    inputType: 'choice',
    choices: ["Sure, let's do it", "Skip for now"],
    nextStage: 'get_name',
  },

  get_name: {
    message: "What should I call you?",
    inputType: 'text',
    nextStage: 'get_working_on',
  },

  get_working_on: {
    message: "What are you working on right now?",
    subMessage: "A project, business, learning something new, career transition...",
    inputType: 'text',
    nextStage: 'get_challenge',
  },

  get_challenge: {
    message: "What's the biggest thing slowing you down or frustrating you?",
    subMessage: "This helps me understand where I can help most.",
    inputType: 'text',
    nextStage: 'explain_modes',
  },

  // ===== Phase 3: First experience =====
  explain_modes: {
    message: "Perfect! Now you're set up. One more thing — I have three modes:",
    subMessage: "**Quick** → Fast answers for simple questions\n**Thoughtful** → Panel discussion for important decisions\n**Contemplate** → Deep analysis for your biggest challenges",
    inputType: 'choice',
    choices: ["Got it!"],
    nextStage: 'invite_first_question',
  },

  invite_first_question: {
    greeting: "You're all set!",
    message: "Let's try it out. I'll step aside so you can ask your first question.",
    subMessage: "Type something you're actually working on in the chat — I work best with real problems.",
    inputType: 'choice',
    choices: ["Let's go!"],
    nextStage: 'idle',
  },

  first_question_asked: {
    message: "Thinking...",
    inputType: 'none',
    nextStage: 'post_first_answer',
  },

  post_first_answer: {
    greeting: "Nice!",
    message: "That was Quick mode — great for everyday questions. When you need deeper thinking, switch to 'Thoughtful' and I'll consult my panel.",
    subMessage: "The button is right above the input box. Try it on your next important question!",
    inputType: 'none',
    autoAdvanceDelay: 6000,
    nextStage: 'idle',
  },

  // ===== Phase 4: Ongoing =====
  idle: {
    message: "I'm here when you need me.",
    inputType: 'none',
  },

  thoughtful_discovery: {
    greeting: "You found Thoughtful mode!",
    message: "This is where it gets interesting. I'm consulting multiple AI perspectives right now and will synthesize their best insights.",
    subMessage: "Takes a bit longer, but you'll get a much richer answer. Worth it for important decisions.",
    inputType: 'none',
    autoAdvanceDelay: 5000,
    nextStage: 'idle',
  },

  contemplate_discovery: {
    greeting: "Welcome to Contemplate mode!",
    message: "This is for your biggest decisions — career moves, major investments, strategic pivots. I'll do multiple rounds of deep analysis.",
    subMessage: "I'll explore every angle. This takes time, but the output is worth it.",
    inputType: 'none',
    autoAdvanceDelay: 6000,
    nextStage: 'idle',
  },

  upload_discovery: {
    message: "Pro tip: You can upload documents to your knowledge base. The more context I have about your world, the better I can help.",
    subMessage: "Click 'Vault' in the sidebar to add files, notes, or even chat exports.",
    inputType: 'none',
    autoAdvanceDelay: 5000,
    nextStage: 'idle',
  },

  chat_history_discovery: {
    greeting: "Quick tip!",
    message: "Power users upload their ChatGPT and Claude conversation exports. It gives me years of context about how you think and what you're working on.",
    subMessage: "For best practices, ask me any questions about what and how to upload in the Vault.",
    inputType: 'none',
    autoAdvanceDelay: 7000,
    nextStage: 'idle',
  },

  completed: {
    message: "I know you pretty well now. Ready when you are!",
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
