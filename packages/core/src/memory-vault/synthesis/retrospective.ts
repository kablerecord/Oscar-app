/**
 * Retrospective Reflection - Utility Score Updates
 *
 * Updates memory utility scores based on retrieval outcomes.
 * Implements Bayesian smoothing for reliable utility estimation.
 */

import type {
  UtilityUpdate,
  UtilityUpdateResult,
  RetrievalRecord,
} from '../types';
import * as semanticStore from '../stores/semantic.store';
import { getRetrievalRecords, getMemoryRetrievalStats } from '../retrieval/retriever';

/**
 * Configuration for utility updates
 */
export interface UtilityUpdateConfig {
  timeWindowDays: number;
  bayesianAlpha: number; // Prior successes
  bayesianBeta: number;  // Prior failures
  momentum: number;      // Blend with previous score
  decayRate: number;     // Decay for unretrieved memories
}

const DEFAULT_CONFIG: UtilityUpdateConfig = {
  timeWindowDays: 7,
  bayesianAlpha: 1,
  bayesianBeta: 1,
  momentum: 0.7,
  decayRate: 0.05,
};

/**
 * Get date N days ago
 */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Calculate utility score using Bayesian smoothing
 */
export function calculateBayesianUtility(
  helpful: number,
  total: number,
  alpha: number = 1,
  beta: number = 1
): number {
  // Bayesian estimate: (successes + alpha) / (total + alpha + beta)
  return (helpful + alpha) / (total + alpha + beta);
}

/**
 * Blend new score with old score using momentum
 */
export function blendScores(
  oldScore: number,
  newScore: number,
  momentum: number = 0.7
): number {
  return momentum * oldScore + (1 - momentum) * newScore;
}

/**
 * Update utility scores for recently retrieved memories
 */
export async function updateUtilityScores(
  config: Partial<UtilityUpdateConfig> = {}
): Promise<UtilityUpdateResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const since = daysAgo(cfg.timeWindowDays);

  // Get retrieval records from time window
  const records = getRetrievalRecords(since);

  // Aggregate by memory ID
  const stats = new Map<string, { retrieved: number; helpful: number }>();

  for (const record of records) {
    const existing = stats.get(record.memoryId) || { retrieved: 0, helpful: 0 };
    existing.retrieved++;
    if (record.wasHelpful === true) {
      existing.helpful++;
    }
    stats.set(record.memoryId, existing);
  }

  // Calculate and apply updates
  const updates: UtilityUpdate[] = [];

  for (const [memoryId, stat] of stats) {
    const memory = semanticStore.getMemory(memoryId);
    if (!memory) continue;

    // Calculate new utility score
    const bayesianScore = calculateBayesianUtility(
      stat.helpful,
      stat.retrieved,
      cfg.bayesianAlpha,
      cfg.bayesianBeta
    );

    // Blend with previous score
    const newScore = blendScores(
      memory.utilityScore,
      bayesianScore,
      cfg.momentum
    );

    updates.push({
      memoryId,
      oldScore: memory.utilityScore,
      newScore,
    });
  }

  // Apply decay to unretrieved memories
  const retrievedIds = new Set(stats.keys());
  const allMemories = semanticStore.getAllMemories();

  for (const memory of allMemories) {
    if (!retrievedIds.has(memory.id)) {
      // Apply decay
      const decayedScore = memory.utilityScore * (1 - cfg.decayRate);
      if (Math.abs(decayedScore - memory.utilityScore) > 0.001) {
        updates.push({
          memoryId: memory.id,
          oldScore: memory.utilityScore,
          newScore: decayedScore,
        });
      }
    }
  }

  // Batch update
  semanticStore.batchUpdateUtility(updates);

  // Calculate average score change
  let totalChange = 0;
  for (const update of updates) {
    totalChange += update.newScore - update.oldScore;
  }

  return {
    memoriesUpdated: updates.length,
    averageScoreChange: updates.length > 0 ? totalChange / updates.length : 0,
  };
}

/**
 * Get utility statistics for a memory
 */
export function getMemoryUtilityStats(memoryId: string): {
  currentScore: number;
  retrievals: number;
  helpful: number;
  helpfulRate: number;
} | null {
  const memory = semanticStore.getMemory(memoryId);
  if (!memory) return null;

  const stats = getMemoryRetrievalStats(memoryId);
  const helpfulRate =
    stats.retrievals > 0 ? stats.helpful / stats.retrievals : 0;

  return {
    currentScore: memory.utilityScore,
    retrievals: stats.retrievals,
    helpful: stats.helpful,
    helpfulRate,
  };
}

/**
 * Get memories with declining utility
 */
export function getDecliningMemories(
  threshold: number = 0.3
): Array<{ memory: typeof semanticStore.getMemory extends (id: string) => infer R ? NonNullable<R> : never; score: number }> {
  const allMemories = semanticStore.getAllMemories();

  return allMemories
    .filter((m) => m.utilityScore < threshold)
    .map((m) => ({ memory: m, score: m.utilityScore }))
    .sort((a, b) => a.score - b.score);
}

/**
 * Get memories with high utility
 */
export function getHighUtilityMemories(
  minScore: number = 0.7,
  limit: number = 10
): Array<{ memory: typeof semanticStore.getMemory extends (id: string) => infer R ? NonNullable<R> : never; score: number }> {
  const allMemories = semanticStore.getAllMemories();

  return allMemories
    .filter((m) => m.utilityScore >= minScore)
    .map((m) => ({ memory: m, score: m.utilityScore }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Suggest memories for pruning (very low utility)
 */
export function suggestPruning(
  threshold: number = 0.1,
  minAge: number = 30 // days
): string[] {
  const cutoffDate = daysAgo(minAge);
  const allMemories = semanticStore.getAllMemories();

  return allMemories
    .filter(
      (m) =>
        m.utilityScore < threshold &&
        m.createdAt < cutoffDate &&
        m.accessCount < 3
    )
    .map((m) => m.id);
}

/**
 * Get utility distribution statistics
 */
export function getUtilityDistribution(): {
  min: number;
  max: number;
  mean: number;
  median: number;
  quartiles: [number, number, number];
} {
  const allMemories = semanticStore.getAllMemories();

  if (allMemories.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      quartiles: [0, 0, 0],
    };
  }

  const scores = allMemories.map((m) => m.utilityScore).sort((a, b) => a - b);

  const min = scores[0];
  const max = scores[scores.length - 1];
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  const getPercentile = (p: number) => {
    const index = Math.floor(scores.length * p);
    return scores[Math.min(index, scores.length - 1)];
  };

  return {
    min,
    max,
    mean,
    median: getPercentile(0.5),
    quartiles: [getPercentile(0.25), getPercentile(0.5), getPercentile(0.75)],
  };
}

/**
 * Reset utility scores to default
 */
export function resetUtilityScores(defaultScore: number = 0.5): number {
  const allMemories = semanticStore.getAllMemories();
  const updates: UtilityUpdate[] = allMemories.map((m) => ({
    memoryId: m.id,
    oldScore: m.utilityScore,
    newScore: defaultScore,
  }));

  return semanticStore.batchUpdateUtility(updates);
}
