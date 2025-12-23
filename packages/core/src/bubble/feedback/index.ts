/**
 * Feedback Module
 *
 * Exports feedback handling and category weight management.
 */

export {
  createHistoryEntry,
  adjustCategoryWeight,
  processDismiss,
  processEngage,
  processDefer,
  calculateDeferDate,
  isItemDeferred,
  getReadyDeferredItems,
  cleanupDeferredItems,
  getCategoryEngagementRate,
  getCategoryResponseTime,
  processHelpfulFeedback,
  resetCategoryWeights,
  getCategoryWeight,
} from './feedbackHandler';
