/**
 * Temporal Intelligence Wrapper for oscar-app
 *
 * Wraps the @osqr/core Temporal system for commitment tracking.
 * This provides proactive reminders and time-aware context.
 */

import { Temporal } from '@osqr/core';
import { featureFlags } from './config';

export interface ExtractedCommitment {
  id: string;
  text: string;
  who: string;
  what: string;
  when: {
    rawText: string;
    parsed?: Date;
    isVague: boolean;
    urgencyCategory: Temporal.UrgencyCategory;
  };
  confidence: number;
  source: Temporal.CommitmentSource;
}

export interface DigestItem {
  commitment: ExtractedCommitment;
  priorityScore: number;
  suggestedAction: string;
  isUrgent: boolean;
}

export interface MorningDigest {
  items: DigestItem[];
  summary: string;
  date: string;
}

/**
 * Check if a message contains commitment signals.
 */
export function hasCommitmentSignals(message: string): boolean {
  if (!featureFlags.enableTemporalIntelligence) return false;

  try {
    return Temporal.containsCommitmentSignals(message);
  } catch (error) {
    console.error('[Temporal] Signal detection error:', error);
    return false;
  }
}

/**
 * Convert internal commitment to extracted format.
 */
function toExtractedCommitment(c: Temporal.Commitment): ExtractedCommitment {
  return {
    id: c.id,
    text: c.commitmentText,
    who: c.who,
    what: c.what,
    when: {
      rawText: c.when.rawText,
      parsed: c.when.parsedDate,
      isVague: c.when.isVague,
      urgencyCategory: c.when.urgencyCategory,
    },
    confidence: c.confidence,
    source: c.source,
  };
}

/**
 * Convert extracted commitment to internal format.
 */
function toInternalCommitment(c: ExtractedCommitment): Temporal.Commitment {
  return {
    id: c.id,
    commitmentText: c.text,
    who: c.who,
    what: c.what,
    when: {
      rawText: c.when.rawText,
      parsedDate: c.when.parsed,
      isVague: c.when.isVague,
      urgencyCategory: c.when.urgencyCategory,
    },
    source: c.source,
    confidence: c.confidence,
    reasoning: '',
    createdAt: new Date(),
    validated: false,
  };
}

/**
 * Extract commitments from a message.
 */
export async function extractCommitments(
  message: string,
  source: Temporal.CommitmentSource
): Promise<ExtractedCommitment[]> {
  if (!featureFlags.enableTemporalIntelligence) return [];

  try {
    const result = await Temporal.extractCommitments(message, source);
    return result.map(toExtractedCommitment);
  } catch (error) {
    console.error('[Temporal] Extraction error:', error);
    return [];
  }
}

/**
 * Generate morning digest for a user.
 */
export function generateMorningDigest(
  userId: string,
  commitments: ExtractedCommitment[]
): MorningDigest {
  if (!featureFlags.enableTemporalIntelligence) {
    return {
      items: [],
      summary: 'Temporal intelligence is disabled.',
      date: new Date().toISOString().split('T')[0],
    };
  }

  try {
    const internalCommitments = commitments.map(toInternalCommitment);
    const digest = Temporal.generateMorningDigest(userId, internalCommitments);

    return {
      items: digest.items.map((item: Temporal.BubbleSuggestion) => ({
        commitment: toExtractedCommitment(item.commitment),
        priorityScore: item.priorityScore,
        suggestedAction: item.suggestedAction,
        isUrgent: item.priorityScore >= 0.8,
      })),
      summary: digest.summary,
      date: digest.date,
    };
  } catch (error) {
    console.error('[Temporal] Digest generation error:', error);
    return {
      items: [],
      summary: 'Error generating digest.',
      date: new Date().toISOString().split('T')[0],
    };
  }
}

/**
 * Check if morning digest should be sent.
 */
export function shouldSendDigest(userId: string): boolean {
  if (!featureFlags.enableTemporalIntelligence) return false;

  try {
    return Temporal.shouldSendDigest(userId);
  } catch (error) {
    console.error('[Temporal] Digest check error:', error);
    return false;
  }
}

/**
 * Calculate priority score for a commitment.
 */
export function calculatePriority(commitment: ExtractedCommitment): number {
  try {
    const internal = toInternalCommitment(commitment);
    const score = Temporal.calculatePriorityScore(internal);
    return score.totalScore;
  } catch (error) {
    console.error('[Temporal] Priority calculation error:', error);
    return 0.5; // Default fallback
  }
}

/**
 * Format commitments for display.
 */
export function formatCommitmentsForDisplay(
  commitments: ExtractedCommitment[]
): string {
  if (commitments.length === 0) return 'No commitments tracked.';

  const lines = commitments.map((c) => {
    const when = c.when.parsed
      ? c.when.parsed.toLocaleDateString()
      : c.when.rawText;
    return `- **${c.what}** (${when}) - Confidence: ${(c.confidence * 100).toFixed(0)}%`;
  });

  return `## Your Commitments\n${lines.join('\n')}`;
}

/**
 * Format morning digest for display.
 */
export function formatDigestForDisplay(digest: MorningDigest): string {
  const lines: string[] = [];

  lines.push(`## Good Morning! - ${digest.date}`);
  lines.push('');
  lines.push(digest.summary);
  lines.push('');

  if (digest.items.length > 0) {
    lines.push('### Today\'s Priorities');
    for (const item of digest.items) {
      const urgentMark = item.isUrgent ? '🔴 ' : '';
      lines.push(
        `${urgentMark}**${item.commitment.what}** - ${item.suggestedAction}`
      );
    }
  }

  return lines.join('\n');
}
