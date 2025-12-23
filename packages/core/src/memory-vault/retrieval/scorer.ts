/**
 * Relevance Scorer
 *
 * Scores memories for retrieval based on:
 * - Vector similarity
 * - Recency boost
 * - Utility score
 * - Contradiction penalty
 */

import type { SemanticMemory, RetrievalOptions } from '../types';
import { cosineSimilarity } from './embedding';

/**
 * Scored memory for retrieval
 */
export interface ScoredMemory {
  memory: SemanticMemory;
  score: number;
  components: ScoreComponents;
}

/**
 * Score component breakdown
 */
export interface ScoreComponents {
  similarity: number;
  recencyBoost: number;
  utilityBoost: number;
  contradictionPenalty: number;
}

/**
 * Scoring configuration
 */
export interface ScoringConfig {
  similarityWeight: number;
  recencyWeight: number;
  utilityWeight: number;
  recencyDecayDays: number;
  contradictionPenaltyFactor: number;
}

const DEFAULT_CONFIG: ScoringConfig = {
  similarityWeight: 0.5,
  recencyWeight: 0.2,
  utilityWeight: 0.3,
  recencyDecayDays: 30,
  contradictionPenaltyFactor: 0.7,
};

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const ms = Math.abs(date2.getTime() - date1.getTime());
  return ms / (1000 * 60 * 60 * 24);
}

/**
 * Calculate recency score with exponential decay
 */
export function calculateRecencyScore(
  lastAccessedAt: Date,
  decayDays: number = 30
): number {
  const daysSinceAccess = daysBetween(lastAccessedAt, new Date());
  return Math.exp(-daysSinceAccess / decayDays);
}

/**
 * Score a single memory against a query embedding
 */
export function scoreMemory(
  memory: SemanticMemory,
  queryEmbedding: number[],
  options: Partial<RetrievalOptions> = {},
  config: Partial<ScoringConfig> = {}
): ScoredMemory {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Base similarity score
  const similarity =
    memory.embedding.length > 0
      ? cosineSimilarity(queryEmbedding, memory.embedding)
      : 0;

  // Recency boost
  let recencyBoost = 0;
  if (options.boostRecent) {
    recencyBoost =
      calculateRecencyScore(memory.lastAccessedAt, cfg.recencyDecayDays) *
      cfg.recencyWeight;
  }

  // Utility boost
  let utilityBoost = 0;
  if (options.boostHighUtility) {
    utilityBoost = memory.utilityScore * cfg.utilityWeight;
  }

  // Contradiction penalty
  let contradictionPenalty = 0;
  if (memory.metadata.contradicts.length > 0) {
    contradictionPenalty = 1 - cfg.contradictionPenaltyFactor;
  }

  // Calculate final score
  const baseScore = similarity * cfg.similarityWeight + recencyBoost + utilityBoost;
  const finalScore = baseScore * (1 - contradictionPenalty);

  return {
    memory,
    score: Math.max(0, Math.min(1, finalScore)),
    components: {
      similarity,
      recencyBoost,
      utilityBoost,
      contradictionPenalty,
    },
  };
}

/**
 * Score multiple memories
 */
export function scoreMemories(
  memories: SemanticMemory[],
  queryEmbedding: number[],
  options: Partial<RetrievalOptions> = {},
  config: Partial<ScoringConfig> = {}
): ScoredMemory[] {
  return memories
    .map((memory) => scoreMemory(memory, queryEmbedding, options, config))
    .sort((a, b) => b.score - a.score);
}

/**
 * Filter scored memories by minimum relevance
 */
export function filterByMinRelevance(
  scoredMemories: ScoredMemory[],
  minRelevance: number
): ScoredMemory[] {
  return scoredMemories.filter((sm) => sm.score >= minRelevance);
}

/**
 * Select memories within token budget
 */
export function selectWithinBudget(
  scoredMemories: ScoredMemory[],
  maxTokens: number,
  estimateTokens: (text: string) => number
): ScoredMemory[] {
  const selected: ScoredMemory[] = [];
  let tokensUsed = 0;

  for (const sm of scoredMemories) {
    const memoryTokens = estimateTokens(sm.memory.content);
    if (tokensUsed + memoryTokens <= maxTokens) {
      selected.push(sm);
      tokensUsed += memoryTokens;
    }
  }

  return selected;
}

/**
 * Diversify memory selection to avoid redundancy
 */
export function diversifySelection(
  scoredMemories: ScoredMemory[],
  diversityFactor: number = 0.3
): ScoredMemory[] {
  if (scoredMemories.length <= 1) {
    return scoredMemories;
  }

  const selected: ScoredMemory[] = [scoredMemories[0]];
  const remaining = [...scoredMemories.slice(1)];

  while (remaining.length > 0) {
    // Find memory most different from already selected
    let bestIndex = 0;
    let bestDiversityScore = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      // Calculate minimum similarity to selected memories
      let minSimilarity = 1;
      for (const sel of selected) {
        if (candidate.memory.embedding.length > 0 && sel.memory.embedding.length > 0) {
          const sim = cosineSimilarity(
            candidate.memory.embedding,
            sel.memory.embedding
          );
          minSimilarity = Math.min(minSimilarity, sim);
        }
      }

      // Diversity score: blend of relevance and dissimilarity
      const diversityScore =
        candidate.score * (1 - diversityFactor) +
        (1 - minSimilarity) * diversityFactor;

      if (diversityScore > bestDiversityScore) {
        bestDiversityScore = diversityScore;
        bestIndex = i;
      }
    }

    selected.push(remaining[bestIndex]);
    remaining.splice(bestIndex, 1);
  }

  return selected;
}

/**
 * Explain why a memory was scored a certain way
 */
export function explainScore(scoredMemory: ScoredMemory): string {
  const { components, score } = scoredMemory;
  const parts: string[] = [];

  parts.push(`Similarity: ${(components.similarity * 100).toFixed(1)}%`);

  if (components.recencyBoost > 0) {
    parts.push(`Recency boost: +${(components.recencyBoost * 100).toFixed(1)}%`);
  }

  if (components.utilityBoost > 0) {
    parts.push(`Utility boost: +${(components.utilityBoost * 100).toFixed(1)}%`);
  }

  if (components.contradictionPenalty > 0) {
    parts.push(
      `Contradiction penalty: -${(components.contradictionPenalty * 100).toFixed(1)}%`
    );
  }

  parts.push(`Final score: ${(score * 100).toFixed(1)}%`);

  return parts.join(' | ');
}

/**
 * Group memories by category and score
 */
export function groupByCategory(
  scoredMemories: ScoredMemory[]
): Map<string, ScoredMemory[]> {
  const groups = new Map<string, ScoredMemory[]>();

  for (const sm of scoredMemories) {
    const category = sm.memory.category;
    const existing = groups.get(category) || [];
    existing.push(sm);
    groups.set(category, existing);
  }

  return groups;
}

/**
 * Get top N memories per category
 */
export function getTopPerCategory(
  scoredMemories: ScoredMemory[],
  n: number = 3
): ScoredMemory[] {
  const groups = groupByCategory(scoredMemories);
  const selected: ScoredMemory[] = [];

  for (const memories of groups.values()) {
    selected.push(...memories.slice(0, n));
  }

  // Re-sort by score
  return selected.sort((a, b) => b.score - a.score);
}
