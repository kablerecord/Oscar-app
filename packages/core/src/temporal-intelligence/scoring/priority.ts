/**
 * Priority Scoring - Calculate priority for commitments
 *
 * Uses urgency, importance, decay, and user affinity.
 */

import type {
  Commitment,
  PriorityScore,
  PriorityComponents,
  TemporalPreferences,
  TemporalReference,
  UrgencyCategory,
  CommitmentCategory,
} from '../types';
import {
  DEFAULT_TEMPORAL_PREFERENCES,
  DEFAULT_CATEGORY_IMPORTANCE,
} from '../types';

// Weights for priority components
const URGENCY_WEIGHT = 0.4;
const IMPORTANCE_WEIGHT = 0.3;
const DECAY_WEIGHT = 0.2;
const AFFINITY_WEIGHT = 0.1;

/**
 * Calculate urgency score based on temporal reference
 */
export function calculateUrgency(when: TemporalReference, now: Date = new Date()): number {
  // If we have a parsed date, use days until
  if (when.parsedDate) {
    const daysUntil = (when.parsedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntil <= 0) return 1.0; // Past due or today
    if (daysUntil <= 1) return 0.95; // Tomorrow
    if (daysUntil <= 3) return 0.8;
    if (daysUntil <= 7) return 0.65;
    if (daysUntil <= 14) return 0.5;
    if (daysUntil <= 30) return 0.35;
    return 0.1;
  }

  // Use urgency category if no specific date
  switch (when.urgencyCategory) {
    case 'TODAY':
      return 1.0;
    case 'TOMORROW':
      return 0.85;
    case 'THIS_WEEK':
      return 0.7;
    case 'THIS_MONTH':
      return 0.4;
    case 'LATER':
      return 0.1;
    default:
      return 0.3; // Unknown/vague
  }
}

/**
 * Infer category from commitment content
 */
export function inferCategory(commitment: Commitment): CommitmentCategory {
  const text = `${commitment.what} ${commitment.commitmentText}`.toLowerCase();

  // Financial keywords
  if (/\b(pay|bill|invoice|tax|bank|money|salary|payment|debt|loan)\b/.test(text)) {
    return 'financial';
  }

  // Legal keywords
  if (/\b(contract|legal|lawyer|court|lawsuit|document|sign|agreement)\b/.test(text)) {
    return 'legal';
  }

  // Family keywords
  if (/\b(mom|dad|parent|child|kid|family|wedding|birthday|anniversary)\b/.test(text)) {
    return 'family';
  }

  // Health keywords
  if (/\b(doctor|hospital|medicine|health|appointment|medical|dentist|checkup)\b/.test(text)) {
    return 'health';
  }

  // Work client keywords
  if (/\b(client|customer|deadline|deliverable|project|presentation|meeting)\b/.test(text)) {
    return 'work_client';
  }

  // Work internal keywords
  if (/\b(team|standup|sync|internal|sprint|review)\b/.test(text)) {
    return 'work_internal';
  }

  // Social keywords
  if (/\b(party|dinner|lunch|drinks|hangout|friend|gathering)\b/.test(text)) {
    return 'social';
  }

  // Personal keywords
  if (/\b(gym|exercise|hobby|personal|self)\b/.test(text)) {
    return 'personal';
  }

  return 'unknown';
}

/**
 * Calculate importance score based on category
 */
export function calculateImportance(
  commitment: Commitment,
  prefs: Partial<TemporalPreferences> = {}
): number {
  const fullPrefs = { ...DEFAULT_TEMPORAL_PREFERENCES, ...prefs };
  const category = inferCategory(commitment);

  // Check for category-specific learned weights first
  if (fullPrefs.categoryWeights[category] !== undefined) {
    return fullPrefs.categoryWeights[category];
  }

  // Use default weights by category
  return DEFAULT_CATEGORY_IMPORTANCE[category] || 0.3;
}

/**
 * Calculate decay score based on how long we've known
 */
export function calculateDecay(createdAt: Date, now: Date = new Date()): number {
  const daysSinceDetection = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceDetection < 1) return 1.0;
  if (daysSinceDetection < 3) return 0.7;
  if (daysSinceDetection < 7) return 0.4;
  return 0.1;
}

/**
 * Calculate user affinity score
 */
export function calculateAffinity(
  commitment: Commitment,
  prefs: Partial<TemporalPreferences> = {}
): number {
  const fullPrefs = { ...DEFAULT_TEMPORAL_PREFERENCES, ...prefs };
  const category = inferCategory(commitment);

  // Look up historical engagement rate for this category
  const affinityKey = `${category}_affinity`;
  if (fullPrefs.categoryWeights[affinityKey] !== undefined) {
    return fullPrefs.categoryWeights[affinityKey];
  }

  // Default affinity
  return 0.5;
}

/**
 * Calculate complete priority score
 */
export function calculatePriorityScore(
  commitment: Commitment,
  prefs: Partial<TemporalPreferences> = {},
  currentDate: Date = new Date()
): PriorityScore {
  const urgency = calculateUrgency(commitment.when, currentDate);
  const importance = calculateImportance(commitment, prefs);
  const decay = calculateDecay(commitment.createdAt, currentDate);
  const userAffinity = calculateAffinity(commitment, prefs);

  const totalScore =
    urgency * URGENCY_WEIGHT +
    importance * IMPORTANCE_WEIGHT +
    decay * DECAY_WEIGHT +
    userAffinity * AFFINITY_WEIGHT;

  return {
    commitmentId: commitment.id,
    totalScore,
    components: {
      urgency,
      importance,
      decay,
      userAffinity,
    },
    calculatedAt: currentDate,
  };
}

/**
 * Calculate priority scores for multiple commitments
 */
export function calculatePriorityScores(
  commitments: Commitment[],
  prefs: Partial<TemporalPreferences> = {},
  currentDate: Date = new Date()
): PriorityScore[] {
  return commitments.map((c) => calculatePriorityScore(c, prefs, currentDate));
}

/**
 * Sort commitments by priority (highest first)
 */
export function sortByPriority(
  commitments: Commitment[],
  prefs: Partial<TemporalPreferences> = {},
  currentDate: Date = new Date()
): { commitment: Commitment; score: PriorityScore }[] {
  return commitments
    .map((commitment) => ({
      commitment,
      score: calculatePriorityScore(commitment, prefs, currentDate),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore);
}

/**
 * Get commitments above priority threshold
 */
export function filterByPriority(
  commitments: Commitment[],
  minScore: number,
  prefs: Partial<TemporalPreferences> = {},
  currentDate: Date = new Date()
): Commitment[] {
  return sortByPriority(commitments, prefs, currentDate)
    .filter((item) => item.score.totalScore >= minScore)
    .map((item) => item.commitment);
}

/**
 * Get top N priority commitments
 */
export function getTopPriority(
  commitments: Commitment[],
  count: number,
  prefs: Partial<TemporalPreferences> = {},
  currentDate: Date = new Date()
): Commitment[] {
  return sortByPriority(commitments, prefs, currentDate)
    .slice(0, count)
    .map((item) => item.commitment);
}

/**
 * Get priority score breakdown as string
 */
export function formatPriorityBreakdown(score: PriorityScore): string {
  const { components, totalScore } = score;
  return (
    `Priority: ${(totalScore * 100).toFixed(0)}% ` +
    `(U:${(components.urgency * 100).toFixed(0)}% ` +
    `I:${(components.importance * 100).toFixed(0)}% ` +
    `D:${(components.decay * 100).toFixed(0)}% ` +
    `A:${(components.userAffinity * 100).toFixed(0)}%)`
  );
}
