/**
 * Scoring Module
 *
 * Exports confidence scoring and related utilities.
 */

export {
  calculateConfidenceScore,
  calculateConfidenceBreakdown,
  calculateTimeSensitivity,
  calculateContextRelevance,
  calculateHistoricalEngagement,
  isWithinWindow,
  hasTopicOverlap,
  hasEntityOverlap,
  getVisualState,
  formatConfidenceBreakdown,
} from './confidenceCalculator';
