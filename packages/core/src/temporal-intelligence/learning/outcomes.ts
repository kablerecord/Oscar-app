/**
 * Outcome Tracking - Track notification outcomes for learning
 */

import type {
  NotificationOutcome,
  NotificationType,
  EngagementType,
  ExplicitFeedback,
  TemporalPreferences,
} from '../types';
import { DEFAULT_TEMPORAL_PREFERENCES } from '../types';

// In-memory outcome storage (would be DB in production)
const outcomeStore: NotificationOutcome[] = [];

/**
 * Record a notification outcome
 */
export function recordOutcome(outcome: NotificationOutcome): void {
  outcomeStore.push(outcome);
}

/**
 * Record engagement
 */
export function recordEngagement(
  commitmentId: string,
  notificationType: NotificationType,
  engagementType: EngagementType,
  timeToEngagement?: number
): void {
  recordOutcome({
    commitmentId,
    notificationType,
    surfacedAt: new Date(),
    userEngaged: true,
    engagementType,
    timeToEngagement,
  });
}

/**
 * Record dismissal
 */
export function recordDismissal(
  commitmentId: string,
  notificationType: NotificationType
): void {
  recordOutcome({
    commitmentId,
    notificationType,
    surfacedAt: new Date(),
    userEngaged: false,
    engagementType: 'dismissed',
  });
}

/**
 * Record explicit feedback
 */
export function recordFeedback(
  commitmentId: string,
  notificationType: NotificationType,
  feedback: ExplicitFeedback
): void {
  recordOutcome({
    commitmentId,
    notificationType,
    surfacedAt: new Date(),
    userEngaged: true,
    engagementType: 'tapped',
    explicitFeedback: feedback,
  });
}

/**
 * Get outcomes for a commitment
 */
export function getOutcomesForCommitment(commitmentId: string): NotificationOutcome[] {
  return outcomeStore.filter((o) => o.commitmentId === commitmentId);
}

/**
 * Get recent outcomes
 */
export function getRecentOutcomes(
  withinDays: number = 30
): NotificationOutcome[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - withinDays);

  return outcomeStore.filter((o) => o.surfacedAt >= cutoff);
}

/**
 * Calculate engagement rate by notification type
 */
export function calculateEngagementRate(
  notificationType?: NotificationType
): number {
  let outcomes = outcomeStore;

  if (notificationType) {
    outcomes = outcomes.filter((o) => o.notificationType === notificationType);
  }

  if (outcomes.length === 0) return 0;

  const engaged = outcomes.filter((o) => o.userEngaged).length;
  return engaged / outcomes.length;
}

/**
 * Calculate dismissal rate
 */
export function calculateDismissalRate(): number {
  if (outcomeStore.length === 0) return 0;

  const dismissed = outcomeStore.filter(
    (o) => o.engagementType === 'dismissed'
  ).length;
  return dismissed / outcomeStore.length;
}

/**
 * Get average time to engagement
 */
export function getAverageTimeToEngagement(): number | null {
  const withTime = outcomeStore.filter((o) => o.timeToEngagement !== undefined);

  if (withTime.length === 0) return null;

  const total = withTime.reduce((sum, o) => sum + (o.timeToEngagement || 0), 0);
  return total / withTime.length;
}

/**
 * Count negative feedback
 */
export function countNegativeFeedback(): number {
  return outcomeStore.filter(
    (o) => o.explicitFeedback === 'stop_this_type'
  ).length;
}

/**
 * Count positive feedback
 */
export function countPositiveFeedback(): number {
  return outcomeStore.filter(
    (o) => o.explicitFeedback === 'more_like_this'
  ).length;
}

/**
 * Get outcomes by engagement type
 */
export function getOutcomesByEngagement(
  engagementType: EngagementType
): NotificationOutcome[] {
  return outcomeStore.filter((o) => o.engagementType === engagementType);
}

/**
 * Adjust preferences based on outcomes
 */
export function adjustPreferencesFromOutcomes(
  prefs: Partial<TemporalPreferences> = {},
  windowDays: number = 14
): Partial<TemporalPreferences> {
  const fullPrefs = { ...DEFAULT_TEMPORAL_PREFERENCES, ...prefs };
  const recentOutcomes = getRecentOutcomes(windowDays);

  if (recentOutcomes.length < 5) {
    // Not enough data to adjust
    return fullPrefs;
  }

  // Adjust realtime tolerance based on dismissal rate
  const dismissalRate = calculateDismissalRate();
  if (dismissalRate > 0.5) {
    // User dismisses too often, reduce realtime
    fullPrefs.realtimeTolerance = Math.max(0.2, fullPrefs.realtimeTolerance - 0.1);
  } else if (dismissalRate < 0.2) {
    // User engages well, can increase
    fullPrefs.realtimeTolerance = Math.min(0.8, fullPrefs.realtimeTolerance + 0.05);
  }

  return fullPrefs;
}

/**
 * Clear outcomes (for testing)
 */
export function clearOutcomes(): void {
  outcomeStore.length = 0;
}

/**
 * Get all outcomes (for testing)
 */
export function getAllOutcomes(): NotificationOutcome[] {
  return [...outcomeStore];
}
