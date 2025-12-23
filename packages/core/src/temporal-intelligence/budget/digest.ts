/**
 * Digest Generator - Morning and evening digest creation
 */

import type {
  Commitment,
  MorningDigest,
  BubbleSuggestion,
  PriorityScore,
  TemporalPreferences,
  TemporalConfig,
} from '../types';
import { DEFAULT_TEMPORAL_CONFIG } from '../types';
import { calculatePriorityScore, sortByPriority } from '../scoring/priority';
import { getBudget, markDigestSent } from './manager';

/**
 * Generate a unique suggestion ID
 */
function generateSuggestionId(): string {
  return `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get suggested action for a commitment
 */
export function getSuggestedAction(commitment: Commitment): string {
  // Calendar-related
  if (commitment.when.parsedDate) {
    return 'Add to calendar';
  }

  // Deadline-related
  if (/deadline|due/i.test(commitment.commitmentText)) {
    return 'Set deadline reminder';
  }

  // Communication-related
  if (/send|email|call|contact/i.test(commitment.what)) {
    return 'Set reminder';
  }

  // Default
  return 'Review and plan';
}

/**
 * Create a bubble suggestion from commitment
 */
export function createBubbleSuggestion(
  commitment: Commitment,
  priorityScore: number,
  type: 'realtime' | 'digest_item' | 'one_tap' | 'notification' = 'notification'
): BubbleSuggestion {
  const suggestedAction = getSuggestedAction(commitment);

  return {
    id: generateSuggestionId(),
    type,
    commitment,
    priorityScore,
    suggestedAction,
    dismissAction: `dismiss_${commitment.id}`,
  };
}

/**
 * Generate morning digest summary
 */
export function generateDigestSummary(items: BubbleSuggestion[]): string {
  if (items.length === 0) {
    return 'No urgent items need attention today.';
  }

  const urgentCount = items.filter((i) => i.priorityScore >= 0.8).length;
  const importantCount = items.filter(
    (i) => i.priorityScore >= 0.5 && i.priorityScore < 0.8
  ).length;

  const parts: string[] = [];

  if (urgentCount > 0) {
    parts.push(`${urgentCount} urgent ${urgentCount === 1 ? 'item' : 'items'}`);
  }

  if (importantCount > 0) {
    parts.push(`${importantCount} important ${importantCount === 1 ? 'item' : 'items'}`);
  }

  if (parts.length === 0) {
    return `${items.length} items need your attention today.`;
  }

  return `Here's what needs attention today: ${parts.join(' and ')}.`;
}

/**
 * Generate morning digest
 */
export function generateMorningDigest(
  userId: string,
  commitments: Commitment[],
  prefs: Partial<TemporalPreferences> = {},
  config: Partial<TemporalConfig> = {}
): MorningDigest {
  const fullConfig = { ...DEFAULT_TEMPORAL_CONFIG, ...config };
  const budget = getBudget(userId, config);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  // Sort by priority and take top items
  const prioritized = sortByPriority(commitments, prefs, now);
  const topItems = prioritized.slice(0, fullConfig.defaultDigestSize);

  // Create suggestions
  const items: BubbleSuggestion[] = topItems.map(({ commitment, score }) =>
    createBubbleSuggestion(commitment, score.totalScore, 'digest_item')
  );

  // Generate summary
  const summary = generateDigestSummary(items);

  // Mark digest as sent
  markDigestSent(
    userId,
    items.map((i) => i.commitment.id)
  );

  return {
    userId,
    date: dateStr,
    items,
    summary,
  };
}

/**
 * Check if digest should be sent
 */
export function shouldSendDigest(
  userId: string,
  now: Date = new Date(),
  prefs: Partial<TemporalPreferences> = {},
  config: Partial<TemporalConfig> = {}
): boolean {
  const budget = getBudget(userId, config);

  // Already sent today
  if (budget.morningDigestSent) {
    return false;
  }

  // Check time
  const fullConfig = { ...DEFAULT_TEMPORAL_CONFIG, ...config };
  const [digestHours, digestMinutes] = fullConfig.digestTime.split(':').map(Number);
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  // Send if we're at or past the digest time
  if (currentHours > digestHours) {
    return true;
  }
  if (currentHours === digestHours && currentMinutes >= digestMinutes) {
    return true;
  }

  return false;
}

/**
 * Get items not yet included in digest
 */
export function getUndigestedItems(
  userId: string,
  commitments: Commitment[],
  config: Partial<TemporalConfig> = {}
): Commitment[] {
  const budget = getBudget(userId, config);
  const digestedIds = new Set(budget.morningDigestItems);

  return commitments.filter((c) => !digestedIds.has(c.id));
}

/**
 * Generate evening review (optional feature)
 */
export function generateEveningReview(
  userId: string,
  commitments: Commitment[],
  prefs: Partial<TemporalPreferences> = {},
  config: Partial<TemporalConfig> = {}
): MorningDigest | null {
  const budget = getBudget(userId, config);

  if (!budget.eveningReviewEnabled || budget.eveningReviewSent) {
    return null;
  }

  // Get items that were surfaced today but not acted on
  const unresolvedIds = new Set(budget.morningDigestItems);
  const unresolved = commitments.filter((c) => unresolvedIds.has(c.id));

  if (unresolved.length === 0) {
    return null;
  }

  const now = new Date();
  const prioritized = sortByPriority(unresolved, prefs, now);
  const items: BubbleSuggestion[] = prioritized.map(({ commitment, score }) =>
    createBubbleSuggestion(commitment, score.totalScore, 'digest_item')
  );

  budget.eveningReviewSent = true;

  return {
    userId,
    date: now.toISOString().split('T')[0],
    items,
    summary: `${items.length} items from this morning still need attention.`,
  };
}
