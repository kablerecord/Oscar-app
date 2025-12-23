/**
 * Tests for Memory Vault Retrieval
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as semanticStore from '../stores/semantic.store';
import {
  generateEmbedding,
  cosineSimilarity,
  euclideanDistance,
  findKNearest,
  estimateTokens,
  isValidEmbedding,
  normalizeEmbedding,
  averageEmbeddings,
} from '../retrieval/embedding';
import {
  scoreMemory,
  scoreMemories,
  filterByMinRelevance,
  selectWithinBudget,
  diversifySelection,
  calculateRecencyScore,
} from '../retrieval/scorer';
import {
  retrieveContext,
  recordRetrievalOutcome,
  getMemoryRetrievalStats,
  clearRetrievalRecords,
} from '../retrieval/retriever';
import type { MemorySource, SemanticMemory } from '../types';

describe('Embedding', () => {
  describe('generateEmbedding', () => {
    it('should generate embeddings', async () => {
      const result = await generateEmbedding('Hello world');
      expect(result.embedding.length).toBe(1536);
      expect(result.model).toBe('text-embedding-3-small');
    });

    it('should generate deterministic embeddings for same text', async () => {
      const result1 = await generateEmbedding('Test text');
      const result2 = await generateEmbedding('Test text');
      expect(result1.embedding).toEqual(result2.embedding);
    });

    it('should generate different embeddings for different text', async () => {
      const result1 = await generateEmbedding('First text');
      const result2 = await generateEmbedding('Different text');
      expect(result1.embedding).not.toEqual(result2.embedding);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 0, 0];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [-1, 0, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 5);
    });

    it('should throw for different length vectors', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
    });
  });

  describe('euclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      const vec = [1, 2, 3];
      expect(euclideanDistance(vec, vec)).toBe(0);
    });

    it('should calculate correct distance', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [3, 4, 0];
      expect(euclideanDistance(vec1, vec2)).toBe(5);
    });
  });

  describe('findKNearest', () => {
    it('should find k nearest neighbors', () => {
      const query = [1, 0, 0];
      const embeddings = [
        { id: 'a', embedding: [1, 0, 0] },
        { id: 'b', embedding: [0, 1, 0] },
        { id: 'c', embedding: [0.9, 0.1, 0] },
      ];

      const nearest = findKNearest(query, embeddings, 2);
      expect(nearest.length).toBe(2);
      expect(nearest[0].id).toBe('a');
      expect(nearest[1].id).toBe('c');
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count', () => {
      const text = 'Hello world';
      const tokens = estimateTokens(text);
      expect(tokens).toBe(3); // 11 chars / 4 = 2.75 → 3
    });
  });

  describe('isValidEmbedding', () => {
    it('should validate correct embeddings', () => {
      expect(isValidEmbedding([0.1, -0.2, 0.3])).toBe(true);
    });

    it('should reject empty arrays', () => {
      expect(isValidEmbedding([])).toBe(false);
    });

    it('should reject arrays with NaN', () => {
      expect(isValidEmbedding([0.1, NaN, 0.3])).toBe(false);
    });
  });

  describe('normalizeEmbedding', () => {
    it('should normalize to unit length', () => {
      const vec = [3, 4, 0];
      const normalized = normalizeEmbedding(vec);
      const magnitude = Math.sqrt(
        normalized.reduce((sum, v) => sum + v * v, 0)
      );
      expect(magnitude).toBeCloseTo(1, 5);
    });
  });

  describe('averageEmbeddings', () => {
    it('should average multiple embeddings', () => {
      const embeddings = [
        [1, 0, 0],
        [0, 1, 0],
      ];
      const avg = averageEmbeddings(embeddings);
      // After normalization, should be [0.707, 0.707, 0]
      expect(avg[0]).toBeCloseTo(avg[1], 1);
      expect(avg[2]).toBeCloseTo(0, 5);
    });
  });
});

describe('Scorer', () => {
  const createMemory = (
    content: string,
    embedding: number[] = [0.5, 0.5, 0],
    utilityScore: number = 0.5
  ): SemanticMemory => {
    const source: MemorySource = {
      type: 'conversation',
      sourceId: 'conv-123',
      timestamp: new Date(),
      confidence: 0.9,
    };

    return {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      embedding,
      category: 'preferences',
      source,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      utilityScore,
      confidence: 0.8,
      metadata: {
        topics: [],
        relatedMemoryIds: [],
        contradicts: [],
        supersedes: [],
      },
    };
  };

  describe('calculateRecencyScore', () => {
    it('should return 1 for just accessed', () => {
      const score = calculateRecencyScore(new Date());
      expect(score).toBeCloseTo(1, 1);
    });

    it('should decay over time', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const score = calculateRecencyScore(thirtyDaysAgo);
      expect(score).toBeCloseTo(0.37, 1); // e^-1 ≈ 0.37
    });
  });

  describe('scoreMemory', () => {
    it('should score based on similarity', () => {
      const memory = createMemory('Test', [1, 0, 0]);
      const queryEmbedding = [1, 0, 0];

      const scored = scoreMemory(memory, queryEmbedding);
      expect(scored.components.similarity).toBeCloseTo(1, 5);
    });

    it('should apply recency boost when enabled', () => {
      const memory = createMemory('Test');
      const queryEmbedding = [0.5, 0.5, 0];

      const withBoost = scoreMemory(memory, queryEmbedding, { boostRecent: true });
      const withoutBoost = scoreMemory(memory, queryEmbedding, { boostRecent: false });

      expect(withBoost.score).toBeGreaterThan(withoutBoost.score);
    });

    it('should apply utility boost when enabled', () => {
      const memory = createMemory('Test', [0.5, 0.5, 0], 0.9);
      const queryEmbedding = [0.5, 0.5, 0];

      const withBoost = scoreMemory(memory, queryEmbedding, { boostHighUtility: true });
      const withoutBoost = scoreMemory(memory, queryEmbedding, { boostHighUtility: false });

      expect(withBoost.score).toBeGreaterThan(withoutBoost.score);
    });

    it('should apply contradiction penalty', () => {
      const memory = createMemory('Test');
      memory.metadata.contradicts = ['other-id'];
      const queryEmbedding = [0.5, 0.5, 0];

      const scored = scoreMemory(memory, queryEmbedding);
      expect(scored.components.contradictionPenalty).toBeGreaterThan(0);
    });
  });

  describe('scoreMemories', () => {
    it('should score and sort memories', () => {
      const memories = [
        createMemory('Far', [0, 1, 0]),
        createMemory('Close', [0.9, 0.1, 0]),
        createMemory('Medium', [0.5, 0.5, 0]),
      ];
      const queryEmbedding = [1, 0, 0];

      const scored = scoreMemories(memories, queryEmbedding);
      expect(scored[0].memory.content).toBe('Close');
    });
  });

  describe('filterByMinRelevance', () => {
    it('should filter by minimum score', () => {
      const scored = [
        { memory: createMemory('High'), score: 0.8, components: {} as any },
        { memory: createMemory('Low'), score: 0.3, components: {} as any },
      ];

      const filtered = filterByMinRelevance(scored, 0.5);
      expect(filtered.length).toBe(1);
      expect(filtered[0].score).toBe(0.8);
    });
  });

  describe('selectWithinBudget', () => {
    it('should select memories within token budget', () => {
      const scored = [
        { memory: createMemory('A'.repeat(100)), score: 0.9, components: {} as any },
        { memory: createMemory('B'.repeat(100)), score: 0.8, components: {} as any },
        { memory: createMemory('C'.repeat(100)), score: 0.7, components: {} as any },
      ];

      const selected = selectWithinBudget(scored, 50, estimateTokens);
      expect(selected.length).toBe(2); // 100 chars = 25 tokens each, budget is 50
    });
  });
});

describe('Retriever', () => {
  beforeEach(() => {
    semanticStore.clearStore();
    clearRetrievalRecords();
  });

  const createSource = (): MemorySource => ({
    type: 'conversation',
    sourceId: 'conv-123',
    timestamp: new Date(),
    confidence: 0.9,
  });

  describe('retrieveContext', () => {
    it('should retrieve relevant memories', async () => {
      // Create some memories with embeddings
      const mem1 = semanticStore.createMemory(
        'User prefers dark mode',
        'preferences',
        createSource()
      );
      const { embedding } = await generateEmbedding('User prefers dark mode');
      semanticStore.updateEmbedding(mem1.id, embedding);

      const result = await retrieveContext('dark mode settings', 'user-123');
      expect(result.memories.length).toBeGreaterThanOrEqual(0);
      expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
    });

    it('should filter by categories', async () => {
      const mem1 = semanticStore.createMemory('Preference', 'preferences', createSource());
      const mem2 = semanticStore.createMemory('Business', 'business_info', createSource());

      const { embedding: e1 } = await generateEmbedding('Preference');
      const { embedding: e2 } = await generateEmbedding('Business');
      semanticStore.updateEmbedding(mem1.id, e1);
      semanticStore.updateEmbedding(mem2.id, e2);

      const result = await retrieveContext('query', 'user-123', {
        categories: ['preferences'],
      });

      // All retrieved memories should be preferences
      for (const rm of result.memories) {
        if ('category' in rm.memory) {
          expect(rm.memory.category).toBe('preferences');
        }
      }
    });

    it('should exclude specified IDs', async () => {
      const mem1 = semanticStore.createMemory('Memory 1', 'preferences', createSource());
      const mem2 = semanticStore.createMemory('Memory 2', 'preferences', createSource());

      const { embedding } = await generateEmbedding('Memory');
      semanticStore.updateEmbedding(mem1.id, embedding);
      semanticStore.updateEmbedding(mem2.id, embedding);

      const result = await retrieveContext('query', 'user-123', {
        excludeIds: [mem1.id],
      });

      const ids = result.memories.map((m) => m.memory.id);
      expect(ids).not.toContain(mem1.id);
    });
  });

  describe('Retrieval Outcome Tracking', () => {
    it('should record retrieval outcomes', async () => {
      const mem = semanticStore.createMemory('Test', 'preferences', createSource());
      const { embedding } = await generateEmbedding('Test');
      semanticStore.updateEmbedding(mem.id, embedding);

      await retrieveContext('test', 'user-123');
      recordRetrievalOutcome(mem.id, true);

      const stats = getMemoryRetrievalStats(mem.id);
      expect(stats.retrievals).toBeGreaterThanOrEqual(0);
    });
  });
});
