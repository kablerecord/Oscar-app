/**
 * Just-In-Time Retriever
 *
 * Retrieves relevant memories based on query, applying:
 * - Vector similarity search
 * - Relevance scoring with boosts
 * - Token budget management
 * - Utility tracking
 */

import type {
  SemanticMemory,
  RetrievedMemory,
  RetrievalOptions,
  MemoryCategory,
  EpisodicSummary,
} from '../types';
import * as semanticStore from '../stores/semantic.store';
import * as episodicStore from '../stores/episodic.store';
import { generateEmbedding, estimateTokens } from './embedding';
import {
  scoreMemories,
  filterByMinRelevance,
  selectWithinBudget,
  diversifySelection,
  ScoredMemory,
} from './scorer';

/**
 * Default retrieval options
 */
const DEFAULT_OPTIONS: Required<RetrievalOptions> = {
  maxTokens: 4000,
  minRelevance: 0.6,
  boostRecent: true,
  boostHighUtility: true,
  categories: [],
  excludeIds: [],
};

/**
 * Retrieval result with metadata
 */
export interface RetrievalResult {
  memories: RetrievedMemory[];
  tokensUsed: number;
  totalCandidates: number;
  retrievalTimeMs: number;
}

/**
 * Retrieval record for utility tracking
 */
const retrievalRecords: Map<
  string,
  { memoryId: string; query: string; timestamp: Date; wasHelpful: boolean | null }
> = new Map();

/**
 * Retrieve relevant context for a query
 */
export async function retrieveContext(
  query: string,
  userId: string,
  options: Partial<RetrievalOptions> = {}
): Promise<RetrievalResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Generate query embedding
  const { embedding: queryEmbedding } = await generateEmbedding(query);

  // 2. Get candidate memories
  let candidates = semanticStore.getAllMemories();

  // Filter by categories if specified
  if (opts.categories && opts.categories.length > 0) {
    candidates = candidates.filter((m) =>
      opts.categories!.includes(m.category)
    );
  }

  // Exclude specified IDs
  if (opts.excludeIds && opts.excludeIds.length > 0) {
    candidates = candidates.filter((m) => !opts.excludeIds!.includes(m.id));
  }

  // Filter by minimum confidence
  candidates = candidates.filter((m) => m.confidence >= 0.5);

  const totalCandidates = candidates.length;

  // 3. Score each candidate
  const scored = scoreMemories(candidates, queryEmbedding, opts);

  // 4. Filter by minimum relevance
  const relevant = filterByMinRelevance(scored, opts.minRelevance);

  // 5. Diversify selection to avoid redundancy
  const diversified = diversifySelection(relevant);

  // 6. Select within token budget
  const selected = selectWithinBudget(
    diversified,
    opts.maxTokens,
    estimateTokens
  );

  // 7. Convert to RetrievedMemory format
  const now = new Date();
  const memories: RetrievedMemory[] = selected.map((sm) => ({
    memory: sm.memory,
    relevanceScore: sm.score,
    retrievedAt: now,
    wasHelpful: null,
  }));

  // 8. Record retrievals for utility tracking
  for (const rm of memories) {
    const recordId = `ret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    retrievalRecords.set(recordId, {
      memoryId: rm.memory.id,
      query,
      timestamp: now,
      wasHelpful: null,
    });

    // Update memory access tracking
    semanticStore.recordAccess(rm.memory.id);
  }

  // 9. Calculate tokens used
  const tokensUsed = memories.reduce(
    (sum, rm) => {
      const text = 'content' in rm.memory ? rm.memory.content : rm.memory.summary;
      return sum + estimateTokens(text);
    },
    0
  );

  return {
    memories,
    tokensUsed,
    totalCandidates,
    retrievalTimeMs: Date.now() - startTime,
  };
}

/**
 * Retrieve episodic summaries (recent conversation context)
 */
export async function retrieveEpisodicContext(
  userId: string,
  limit: number = 5
): Promise<EpisodicSummary[]> {
  return episodicStore.getRecentSummaries(userId, limit);
}

/**
 * Search memories by text content
 */
export async function searchMemories(
  query: string,
  options: Partial<RetrievalOptions> = {}
): Promise<RetrievedMemory[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Text-based search
  const textMatches = semanticStore.searchByContent(query);

  // Also do semantic search
  const { embedding: queryEmbedding } = await generateEmbedding(query);
  const allMemories = semanticStore.getAllMemories();
  const scored = scoreMemories(allMemories, queryEmbedding, opts);

  // Merge results, prioritizing semantic matches
  const seen = new Set<string>();
  const merged: ScoredMemory[] = [];

  // Add text matches with a bonus
  for (const memory of textMatches) {
    const scoredVersion = scored.find((s) => s.memory.id === memory.id);
    if (scoredVersion) {
      merged.push({
        ...scoredVersion,
        score: Math.min(1, scoredVersion.score * 1.2), // 20% bonus for text match
      });
      seen.add(memory.id);
    }
  }

  // Add remaining scored memories
  for (const sm of scored) {
    if (!seen.has(sm.memory.id) && sm.score >= opts.minRelevance) {
      merged.push(sm);
    }
  }

  // Sort and select
  merged.sort((a, b) => b.score - a.score);
  const selected = selectWithinBudget(merged, opts.maxTokens, estimateTokens);

  const now = new Date();
  return selected.map((sm) => ({
    memory: sm.memory,
    relevanceScore: sm.score,
    retrievedAt: now,
    wasHelpful: null,
  }));
}

/**
 * Get memories by category
 */
export function getByCategory(
  category: MemoryCategory,
  limit: number = 10
): SemanticMemory[] {
  const memories = semanticStore.getByCategory(category);
  return memories.slice(0, limit);
}

/**
 * Get top memories by utility
 */
export function getTopByUtility(
  category?: MemoryCategory,
  limit: number = 10
): SemanticMemory[] {
  return semanticStore.getTopByUtility(category, limit);
}

/**
 * Record retrieval outcome for utility tracking
 */
export function recordRetrievalOutcome(
  memoryId: string,
  wasHelpful: boolean
): void {
  // Find the most recent retrieval record for this memory
  for (const [recordId, record] of retrievalRecords) {
    if (record.memoryId === memoryId && record.wasHelpful === null) {
      record.wasHelpful = wasHelpful;
      retrievalRecords.set(recordId, record);
      break;
    }
  }
}

/**
 * Get retrieval statistics for a memory
 */
export function getMemoryRetrievalStats(
  memoryId: string
): { retrievals: number; helpful: number; unhelpful: number } {
  let retrievals = 0;
  let helpful = 0;
  let unhelpful = 0;

  for (const record of retrievalRecords.values()) {
    if (record.memoryId === memoryId) {
      retrievals++;
      if (record.wasHelpful === true) helpful++;
      if (record.wasHelpful === false) unhelpful++;
    }
  }

  return { retrievals, helpful, unhelpful };
}

/**
 * Get all retrieval records within a time window
 */
export function getRetrievalRecords(
  since: Date
): Array<{
  memoryId: string;
  query: string;
  timestamp: Date;
  wasHelpful: boolean | null;
}> {
  const records: Array<{
    memoryId: string;
    query: string;
    timestamp: Date;
    wasHelpful: boolean | null;
  }> = [];

  for (const record of retrievalRecords.values()) {
    if (record.timestamp >= since) {
      records.push(record);
    }
  }

  return records;
}

/**
 * Clear retrieval records (for testing)
 */
export function clearRetrievalRecords(): void {
  retrievalRecords.clear();
}

/**
 * Get retrieval record statistics
 */
export function getRetrievalStats(): {
  totalRetrievals: number;
  helpfulRate: number;
  pendingFeedback: number;
} {
  let total = 0;
  let helpful = 0;
  let pending = 0;

  for (const record of retrievalRecords.values()) {
    total++;
    if (record.wasHelpful === true) helpful++;
    if (record.wasHelpful === null) pending++;
  }

  return {
    totalRetrievals: total,
    helpfulRate: total > 0 ? helpful / (total - pending) : 0,
    pendingFeedback: pending,
  };
}
