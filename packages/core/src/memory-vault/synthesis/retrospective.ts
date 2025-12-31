/**
 * Retrospective Reflection - Utility Score Updates
 *
 * Updates memory utility scores based on retrieval outcomes.
 * Implements Bayesian smoothing for reliable utility estimation.
 *
 * LEARNING LAYER ENHANCEMENTS:
 * - Recency boost for new memories
 * - Outcome-based learning from retrieval feedback
 * - Minimum score floor to prevent permanent loss
 * - Enhanced tracking and statistics
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
  bayesianAlpha: number;   // Prior successes
  bayesianBeta: number;    // Prior failures
  momentum: number;        // Blend with previous score
  decayRate: number;       // Decay for unretrieved memories
  recencyBoost: number;    // Boost for recently created memories
  minimumScore: number;    // Floor for utility scores
  outcomeWeight: number;   // How much outcomes affect score
}

const DEFAULT_CONFIG: UtilityUpdateConfig = {
  timeWindowDays: 7,
  bayesianAlpha: 1,
  bayesianBeta: 1,
  momentum: 0.7,
  decayRate: 0.05,
  recencyBoost: 0.1,
  minimumScore: 0.1,
  outcomeWeight: 0.3,
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

// ============================================================================
// Learning Layer Enhancements
// ============================================================================

/**
 * Outcome tracking for learning from retrieval results
 */
export interface OutcomeRecord {
  memoryId: string;
  conversationId: string;
  outcome: 'used' | 'helpful' | 'not_helpful' | 'ignored';
  timestamp: Date;
  context?: string;
}

/** In-memory outcome storage for learning */
const outcomeHistory: OutcomeRecord[] = [];

/**
 * Record an outcome for a retrieved memory
 * LEARNING LAYER: Explicit feedback mechanism
 */
export function recordOutcome(
  memoryId: string,
  conversationId: string,
  outcome: OutcomeRecord['outcome'],
  context?: string
): void {
  outcomeHistory.push({
    memoryId,
    conversationId,
    outcome,
    timestamp: new Date(),
    context,
  });

  // Apply immediate score adjustment based on outcome
  const memory = semanticStore.getMemory(memoryId);
  if (!memory) return;

  const adjustments: Record<OutcomeRecord['outcome'], number> = {
    used: 0.02,        // Small boost for being used
    helpful: 0.1,      // Significant boost for being helpful
    not_helpful: -0.05, // Small penalty for not being helpful
    ignored: -0.02,    // Small penalty for being ignored
  };

  const adjustment = adjustments[outcome];
  const newScore = Math.max(
    DEFAULT_CONFIG.minimumScore,
    Math.min(1, memory.utilityScore + adjustment)
  );

  semanticStore.updateUtilityScore(memoryId, newScore);
}

/**
 * Get outcome history for a memory
 */
export function getOutcomeHistory(memoryId: string): OutcomeRecord[] {
  return outcomeHistory.filter((r) => r.memoryId === memoryId);
}

/**
 * Calculate recency boost for a memory
 * Newer memories get a temporary boost to give them a chance to prove useful
 */
export function calculateRecencyBoost(
  createdAt: Date,
  config: Partial<UtilityUpdateConfig> = {}
): number {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const ageInDays = (Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000);

  // Exponential decay over 7 days
  if (ageInDays <= 7) {
    return cfg.recencyBoost * Math.exp(-ageInDays / 7);
  }

  return 0;
}

/**
 * Apply recency boosts to all memories
 */
export function applyRecencyBoosts(
  config: Partial<UtilityUpdateConfig> = {}
): number {
  const allMemories = semanticStore.getAllMemories();
  let updated = 0;

  for (const memory of allMemories) {
    const boost = calculateRecencyBoost(memory.createdAt, config);
    if (boost > 0.001) {
      const newScore = Math.min(1, memory.utilityScore + boost);
      if (newScore !== memory.utilityScore) {
        semanticStore.updateUtilityScore(memory.id, newScore);
        updated++;
      }
    }
  }

  return updated;
}

/**
 * Enhanced utility update with all Learning Layer features
 */
export async function updateUtilityScoresEnhanced(
  config: Partial<UtilityUpdateConfig> = {}
): Promise<UtilityUpdateResult & { recencyBoosts: number }> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // First, run standard utility update
  const baseResult = await updateUtilityScores(config);

  // Apply recency boosts
  const recencyBoosts = applyRecencyBoosts(config);

  // Enforce minimum score floor
  const allMemories = semanticStore.getAllMemories();
  let floored = 0;

  for (const memory of allMemories) {
    if (memory.utilityScore < cfg.minimumScore) {
      semanticStore.updateUtilityScore(memory.id, cfg.minimumScore);
      floored++;
    }
  }

  return {
    ...baseResult,
    memoriesUpdated: baseResult.memoriesUpdated + floored,
    recencyBoosts,
  };
}

/**
 * Get learning statistics
 */
export function getLearningStats(): {
  totalOutcomes: number;
  outcomeBreakdown: Record<OutcomeRecord['outcome'], number>;
  averageScoreByOutcome: Record<OutcomeRecord['outcome'], number>;
  recentOutcomes: OutcomeRecord[];
} {
  const breakdown: Record<OutcomeRecord['outcome'], number> = {
    used: 0,
    helpful: 0,
    not_helpful: 0,
    ignored: 0,
  };

  const scoreSums: Record<OutcomeRecord['outcome'], { sum: number; count: number }> = {
    used: { sum: 0, count: 0 },
    helpful: { sum: 0, count: 0 },
    not_helpful: { sum: 0, count: 0 },
    ignored: { sum: 0, count: 0 },
  };

  for (const outcome of outcomeHistory) {
    breakdown[outcome.outcome]++;

    const memory = semanticStore.getMemory(outcome.memoryId);
    if (memory) {
      scoreSums[outcome.outcome].sum += memory.utilityScore;
      scoreSums[outcome.outcome].count++;
    }
  }

  const averageScoreByOutcome: Record<OutcomeRecord['outcome'], number> = {
    used: scoreSums.used.count > 0 ? scoreSums.used.sum / scoreSums.used.count : 0,
    helpful: scoreSums.helpful.count > 0 ? scoreSums.helpful.sum / scoreSums.helpful.count : 0,
    not_helpful: scoreSums.not_helpful.count > 0 ? scoreSums.not_helpful.sum / scoreSums.not_helpful.count : 0,
    ignored: scoreSums.ignored.count > 0 ? scoreSums.ignored.sum / scoreSums.ignored.count : 0,
  };

  // Get recent outcomes (last 24 hours)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOutcomes = outcomeHistory.filter((o) => o.timestamp > dayAgo);

  return {
    totalOutcomes: outcomeHistory.length,
    outcomeBreakdown: breakdown,
    averageScoreByOutcome,
    recentOutcomes,
  };
}

/**
 * Clear outcome history (for testing)
 */
export function clearOutcomeHistory(): void {
  outcomeHistory.length = 0;
}

/**
 * Analyze memory performance over time
 */
export function analyzeMemoryPerformance(
  memoryId: string
): {
  totalRetrievals: number;
  helpfulRate: number;
  scoreHistory: Array<{ date: Date; score: number }>;
  trend: 'improving' | 'declining' | 'stable';
} | null {
  const memory = semanticStore.getMemory(memoryId);
  if (!memory) return null;

  const outcomes = getOutcomeHistory(memoryId);
  const stats = getMemoryRetrievalStats(memoryId);

  // Calculate helpful rate
  const helpfulCount = outcomes.filter((o) => o.outcome === 'helpful').length;
  const helpfulRate = outcomes.length > 0 ? helpfulCount / outcomes.length : 0;

  // Determine trend based on recent outcomes
  const recentOutcomes = outcomes.slice(-10);
  let helpfulInRecent = 0;
  let earlierHelpful = 0;

  for (let i = 0; i < recentOutcomes.length; i++) {
    if (recentOutcomes[i].outcome === 'helpful') {
      if (i >= recentOutcomes.length / 2) {
        helpfulInRecent++;
      } else {
        earlierHelpful++;
      }
    }
  }

  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (helpfulInRecent > earlierHelpful + 1) {
    trend = 'improving';
  } else if (earlierHelpful > helpfulInRecent + 1) {
    trend = 'declining';
  }

  return {
    totalRetrievals: stats.retrievals,
    helpfulRate,
    scoreHistory: [], // Would need persistent storage for full history
    trend,
  };
}
