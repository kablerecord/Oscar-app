/**
 * Display Module Index
 *
 * Export all display-related functionality.
 */

export {
  determineDisplayState,
  mapToConsensusLevel,
  generateConsensusDescription,
  buildModelCards,
  buildDisagreementSummaries,
  buildCouncilSummary,
  canTransitionTo,
  getAvailableTransitions,
  stateTransitions,
} from './states';

export {
  formatDefaultView,
  formatExpandedView,
  formatDisagreementView,
  formatFullLog,
  formatForState,
  formatAsJSON,
  type FormatOptions,
} from './formatters';
