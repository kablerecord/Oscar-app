/**
 * UIP (User Intelligence Profile) Module
 * Mentorship-as-Code layer for adaptive AI behavior
 * @see docs/architecture/UIP_SPEC.md
 */

// Types
export * from './types'

// Core service (main entry point)
export {
  getUIPContext,
  processSignalsForUser,
  getOrCreateProfile,
  getFullProfile,
  incrementSessionCount,
  assembleUIP,
  formatUIPForPrompt,
} from './service'

// Signal processing
export {
  extractSignalsFromMessage,
  analyzeMessageStyle,
  detectFeedbackSignals,
  detectPreferenceStatements,
  analyzeQuestionSophistication,
  detectGoalReferences,
  detectDecisionMentions,
  createModeSelectionSignal,
  createRetrySignal,
} from './signal-processor'

// Dimension inference
export {
  inferAllDimensions,
  calculateDecayedConfidence,
} from './dimension-inference'

// Progressive elicitation
export {
  ELICITATION_QUESTIONS,
  shouldAskQuestion,
  shouldAskGapQuestion,
  formatElicitationQuestion,
  formatShortPrompt,
  processElicitationResponse,
} from './elicitation'

// Prospective reflection
export {
  shouldRunReflection,
  runReflection,
  runBatchReflection,
  onSessionClose,
  onDecisionCluster,
  onManualTrigger,
} from './reflection'
