/**
 * OSQR Bubble Onboarding System - Cold Open Edition
 *
 * PHILOSOPHY: Get them into the action fast, then guide contextually.
 *
 * The Cold Open onboarding (ColdOpenOnboarding.tsx) handles the initial
 * introduction. This file manages the contextual tips that appear
 * AFTER the user is in the panel.
 *
 * Flow:
 * 1. Cold Open → Get name + workingOn (handled by ColdOpenOnboarding)
 * 2. Panel Intro → OSQR explains where he lives, suggests a question
 * 3. After 2-3 questions → Privacy/Vault tip
 * 4. Contextual tips based on behavior (modes, features)
 */

// Onboarding stages (post-cold-open)
export type OnboardingStage =
  // Phase 1: Panel Introduction (after cold open)
  | 'panel_intro'           // OSQR explains where he lives, suggests first question
  | 'waiting_first_question' // Waiting for user to ask something

  // Phase 2: Discovery (triggered by behavior)
  | 'vault_discovery'       // After 2-3 questions - introduce privacy + Vault
  | 'vault_highlight'       // Highlight the Vault icon
  | 'first_upload'          // After they upload something
  | 'mode_discovery'        // After 5 questions - suggest deeper modes

  // Phase 3: Ongoing
  | 'idle'                  // Normal operation
  | 'thoughtful_discovery'  // First time using Thoughtful
  | 'contemplate_discovery' // First time using Contemplate
  | 'completed'             // Full onboarding done

  // Legacy stages (kept for backwards compatibility)
  | 'welcome'
  | 'got_name'

// Contextual tips that can appear at any time
export type ContextualTip =
  | 'panel_explanation'
  | 'knowledge_base_tip'
  | 'mode_upgrade_prompt'
  | 'profile_prompt'
  | 'chat_history_tip'
  | 'privacy_tip'

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
  hasSeenPanelIntro: boolean
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
  highlightTarget?: 'vault' | 'sidebar' | 'modes' | 'tips' | 'osqr_bubble'
  suggestQuestion?: boolean
}> = {
  // ===== Phase 1: Panel Introduction =====
  panel_intro: {
    message: "This is where we work together.",
    subMessage: "I live over here. When I turn amber, I have something to say. Ask me anything.",
    inputType: 'choice',
    choices: ["Got it"],
    nextStage: 'waiting_first_question',
    highlightTarget: 'osqr_bubble',
    suggestQuestion: true,
  },

  waiting_first_question: {
    message: "I'm ready when you are.",
    inputType: 'none',
    nextStage: 'idle',
  },

  // ===== Phase 2: Discovery (triggered contextually) =====
  vault_discovery: {
    message: "Quick note on privacy — anything you share with me stays yours.",
    subMessage: "I don't train on it, and you can delete it all anytime. There's a Vault icon where you can upload documents I can reference.",
    inputType: 'choice',
    choices: ["Show me the Vault", "Got it"],
    nextStage: 'idle',
    highlightTarget: 'vault',
  },

  vault_highlight: {
    message: "That's your Memory Vault.",
    subMessage: "Upload notes, PDFs, anything — I'll reference it when we talk.",
    inputType: 'choice',
    choices: ["Got it"],
    nextStage: 'idle',
    highlightTarget: 'vault',
  },

  first_upload: {
    message: "Now I can draw from what you've shared.",
    subMessage: "The more you add, the more useful I become.",
    inputType: 'none',
    autoAdvanceDelay: 3000,
    nextStage: 'idle',
  },

  mode_discovery: {
    message: "When you need me to really think through something, I can go deeper.",
    subMessage: "Try saying 'think harder' or use Thoughtful mode for important decisions.",
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
    message: "Taking my time with this one.",
    subMessage: "Bringing in different perspectives.",
    inputType: 'none',
    autoAdvanceDelay: 3000,
    nextStage: 'idle',
  },

  contemplate_discovery: {
    message: "This deserves deep thought.",
    subMessage: "Exploring from every angle — give me a minute.",
    inputType: 'none',
    autoAdvanceDelay: 4000,
    nextStage: 'idle',
  },

  completed: {
    message: "Ready when you are.",
    inputType: 'none',
  },

  // ===== Legacy stages (backwards compatibility) =====
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

// Initial state for new users (post-cold-open)
export function getInitialOnboardingState(): OnboardingState {
  return {
    stage: 'panel_intro',
    hasAskedFirstQuestion: false,
    hasTriedThoughtful: false,
    hasTriedContemplate: false,
    hasSeenVaultTip: false,
    hasUploadedDocument: false,
    hasSeenModeTip: false,
    hasSeenChatHistoryTip: false,
    hasSeenPanelIntro: false,
    questionsAsked: 0,
    completedStages: [],
  }
}

// Get state for users who completed cold open (starts at panel_intro)
export function getPostColdOpenState(userName?: string, workingOn?: string): OnboardingState {
  return {
    stage: 'panel_intro',
    userName,
    workingOn,
    hasAskedFirstQuestion: false,
    hasTriedThoughtful: false,
    hasTriedContemplate: false,
    hasSeenVaultTip: false,
    hasUploadedDocument: false,
    hasSeenModeTip: false,
    hasSeenChatHistoryTip: false,
    hasSeenPanelIntro: false,
    questionsAsked: 0,
    completedStages: [],
  }
}

// Get state for users who already completed onboarding
export function getCompletedOnboardingState(): OnboardingState {
  return {
    stage: 'idle',
    hasAskedFirstQuestion: true,
    hasTriedThoughtful: false,
    hasTriedContemplate: false,
    hasSeenVaultTip: true,
    hasUploadedDocument: false,
    hasSeenModeTip: false,
    hasSeenChatHistoryTip: false,
    hasSeenPanelIntro: true,
    questionsAsked: 0,
    completedStages: ['panel_intro', 'waiting_first_question'],
  }
}

// Check if user should see onboarding bubble (takeover mode)
export function shouldShowOnboarding(state: OnboardingState): boolean {
  const activeStages: OnboardingStage[] = [
    'panel_intro', 'waiting_first_question',
    'vault_discovery', 'vault_highlight', 'first_upload', 'mode_discovery',
    'thoughtful_discovery', 'contemplate_discovery',
    // Legacy
    'welcome', 'got_name',
  ]
  return activeStages.includes(state.stage)
}

// Check if we're in the intro phase (shows as prominent bubble)
export function isIntroPhase(state: OnboardingState): boolean {
  return state.stage === 'panel_intro' || state.stage === 'welcome' || state.stage === 'got_name'
}

// Check if we're in a discovery phase (corner bubble with highlight)
export function isDiscoveryPhase(state: OnboardingState): boolean {
  return ['vault_discovery', 'vault_highlight', 'first_upload', 'mode_discovery'].includes(state.stage)
}

// Generate a suggested first question based on what user is working on
export function getSuggestedFirstQuestion(workingOn?: string): string {
  if (!workingOn) {
    return "What's the most important thing on your mind right now?"
  }

  // Generate a contextual suggestion based on their work
  const lower = workingOn.toLowerCase()

  if (lower.includes('project') || lower.includes('build')) {
    return `What's the biggest blocker on ${workingOn.split(' ').slice(0, 4).join(' ')}?`
  }
  if (lower.includes('learn') || lower.includes('study')) {
    return `What concept about ${workingOn.split(' ').slice(0, 3).join(' ')} is hardest to grasp?`
  }
  if (lower.includes('decision') || lower.includes('choose') || lower.includes('deciding')) {
    return `What factors matter most in this decision?`
  }
  if (lower.includes('problem') || lower.includes('issue') || lower.includes('fix')) {
    return `Walk me through what you've already tried.`
  }

  // Default: reference what they said
  return `Tell me more about ${workingOn.split(' ').slice(0, 5).join(' ')}.`
}

// Progress to next stage
export function progressOnboarding(
  state: OnboardingState,
  action: {
    type: 'answer' | 'skip' | 'auto_advance' | 'asked_question' | 'mode_changed' | 'answer_received' | 'document_uploaded' | 'trigger_discovery' | 'dismiss_intro'
    answer?: string
    mode?: 'quick' | 'thoughtful' | 'contemplate' | 'supreme'
    discovery?: 'vault' | 'modes'
  }
): OnboardingState {
  const newState = { ...state }

  switch (action.type) {
    case 'answer':
      switch (state.stage) {
        case 'panel_intro':
          newState.stage = 'waiting_first_question'
          newState.hasSeenPanelIntro = true
          break
        case 'waiting_first_question':
          newState.stage = 'idle'
          break
        case 'vault_discovery':
          if (action.answer === 'Show me the Vault') {
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
        // Legacy
        case 'welcome':
          newState.userName = action.answer
          newState.stage = 'got_name'
          break
        case 'got_name':
          newState.stage = 'idle'
          break
      }
      break

    case 'dismiss_intro':
      if (state.stage === 'panel_intro' || state.stage === 'waiting_first_question') {
        newState.stage = 'idle'
        newState.hasSeenPanelIntro = true
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
        // If they were waiting for first question, move to idle
        if (state.stage === 'waiting_first_question') {
          newState.stage = 'idle'
        }
      }
      break

    case 'answer_received':
      // After 2-3 questions, trigger vault/privacy discovery (if not seen)
      if (state.questionsAsked >= 2 && state.questionsAsked <= 4 && !state.hasSeenVaultTip && state.stage === 'idle') {
        newState.stage = 'vault_discovery'
      }
      // After 5 questions, suggest deeper modes (if not seen)
      else if (state.questionsAsked >= 5 && !state.hasSeenModeTip && !state.hasTriedThoughtful && state.stage === 'idle') {
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
    state.hasSeenPanelIntro &&
    state.hasAskedFirstQuestion &&
    state.hasSeenVaultTip
  )
}

// Get a contextual tip based on usage (for passive suggestions)
export function getContextualTip(state: OnboardingState): ContextualTip | null {
  // After 5 questions without trying thoughtful, suggest modes
  if (state.questionsAsked >= 5 && !state.hasTriedThoughtful && !state.hasSeenModeTip) {
    return 'mode_upgrade_prompt'
  }

  // After seeing vault but not uploading, gentle nudge
  if (state.hasSeenVaultTip && !state.hasUploadedDocument && state.questionsAsked >= 4) {
    return 'knowledge_base_tip'
  }

  return null
}
