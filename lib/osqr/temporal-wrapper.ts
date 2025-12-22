/**
 * Temporal Intelligence Wrapper - Stub Implementation
 *
 * NOTE: @osqr/core package is not yet available.
 * This file provides stub implementations.
 */

import { featureFlags } from './config';

export interface CommitmentSource {
  type: string;
  sourceId: string;
  extractedAt: Date;
}

export interface ExtractedCommitment {
  id: string;
  text: string;
  who: string;
  what: string;
  when: {
    rawText: string;
    parsed?: Date;
    isVague: boolean;
    urgencyCategory: string;
  };
  confidence: number;
  source: CommitmentSource;
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

export function hasCommitmentSignals(_message: string): boolean {
  if (!featureFlags.enableTemporalIntelligence) return false;
  // Stub: basic heuristic
  return /\b(will|should|must|need to|have to|tomorrow|next week|deadline)\b/i.test(_message);
}

export async function extractCommitments(
  _message: string,
  _source: CommitmentSource
): Promise<ExtractedCommitment[]> {
  if (!featureFlags.enableTemporalIntelligence) return [];
  // Stub: return empty
  return [];
}

export function generateMorningDigest(
  _userId: string,
  _commitments: ExtractedCommitment[]
): MorningDigest {
  return {
    items: [],
    summary: 'Temporal intelligence is disabled.',
    date: new Date().toISOString().split('T')[0],
  };
}

export function shouldSendDigest(_userId: string): boolean {
  return false;
}

export function calculatePriority(_commitment: ExtractedCommitment): number {
  return 0.5;
}

export function formatCommitmentsForDisplay(_commitments: ExtractedCommitment[]): string {
  return 'No commitments tracked.';
}

export function formatDigestForDisplay(_digest: MorningDigest): string {
  return '## Good Morning!\n\nNo scheduled items for today.';
}
