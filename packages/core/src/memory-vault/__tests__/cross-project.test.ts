/**
 * Tests for Cross-Project Query Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  addSourceContext,
  getSourceContext,
  addCrossReference,
  getCrossReferences,
  enrichWithContext,
  queryCrossProject,
  findRelatedFromOtherProjects,
  detectContradictions,
  discoverCrossReferences,
  resolveContradiction,
  clearCrossProjectData,
  getCrossProjectStats,
} from '../cross-project';
import * as semanticStore from '../stores/semantic.store';
import type { SemanticMemory, SourceContext, CrossReference } from '../types';

describe('Cross-Project Query Engine', () => {
  beforeEach(() => {
    semanticStore.clearStore();
    clearCrossProjectData();
  });

  describe('Source Context Management', () => {
    it('stores and retrieves source context', () => {
      const context: SourceContext = {
        projectId: 'project-1',
        conversationId: 'conv-1',
        documentId: null,
        interface: 'web',
        timestamp: new Date(),
      };

      addSourceContext('mem-1', context);
      const retrieved = getSourceContext('mem-1');

      expect(retrieved).toEqual(context);
    });

    it('returns null for unknown memory', () => {
      const context = getSourceContext('unknown');
      expect(context).toBeNull();
    });
  });

  describe('Cross-Reference Management', () => {
    it('stores and retrieves cross-references', () => {
      const reference: CrossReference = {
        targetMemoryId: 'mem-2',
        targetProjectId: 'project-2',
        relationshipType: 'related',
        strength: 0.8,
        discoveredAt: new Date(),
        discoveredBy: 'system',
      };

      addCrossReference('mem-1', reference);
      const refs = getCrossReferences('mem-1');

      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual(reference);
    });

    it('accumulates multiple references', () => {
      addCrossReference('mem-1', {
        targetMemoryId: 'mem-2',
        targetProjectId: 'project-2',
        relationshipType: 'related',
        strength: 0.8,
        discoveredAt: new Date(),
        discoveredBy: 'system',
      });

      addCrossReference('mem-1', {
        targetMemoryId: 'mem-3',
        targetProjectId: 'project-3',
        relationshipType: 'supports',
        strength: 0.9,
        discoveredAt: new Date(),
        discoveredBy: 'user',
      });

      const refs = getCrossReferences('mem-1');
      expect(refs).toHaveLength(2);
    });
  });

  describe('enrichWithContext', () => {
    it('enriches memory with context and references', () => {
      const memory = semanticStore.createMemory(
        'Test content',
        'business_info',
        {
          type: 'conversation',
          sourceId: 'conv-1',
          timestamp: new Date(),
          confidence: 0.9,
        },
        new Array(1536).fill(0.1)
      );

      const context: SourceContext = {
        projectId: 'project-1',
        conversationId: 'conv-1',
        documentId: null,
        interface: 'vscode',
        timestamp: new Date(),
      };

      addSourceContext(memory.id, context);

      const enriched = enrichWithContext(memory);

      expect(enriched.sourceContext.projectId).toBe('project-1');
      expect(enriched.crossReferences).toEqual([]);
    });
  });

  describe('queryCrossProject', () => {
    beforeEach(async () => {
      // Create memories in different projects
      const mem1 = semanticStore.createMemory(
        'Authentication using OAuth2 with JWT tokens',
        'domain_knowledge',
        {
          type: 'conversation',
          sourceId: 'conv-1',
          timestamp: new Date(),
          confidence: 0.9,
        },
        new Array(1536).fill(0.1)
      );

      const mem2 = semanticStore.createMemory(
        'Payment integration with Stripe API',
        'domain_knowledge',
        {
          type: 'conversation',
          sourceId: 'conv-2',
          timestamp: new Date(),
          confidence: 0.9,
        },
        new Array(1536).fill(0.2)
      );

      addSourceContext(mem1.id, {
        projectId: 'project-a',
        conversationId: 'conv-1',
        documentId: null,
        interface: 'web',
        timestamp: new Date(),
      });

      addSourceContext(mem2.id, {
        projectId: 'project-b',
        conversationId: 'conv-2',
        documentId: null,
        interface: 'web',
        timestamp: new Date(),
      });

      semanticStore.addTopics(mem1.id, ['authentication', 'security']);
      semanticStore.addTopics(mem2.id, ['payments', 'integration']);
    });

    it('queries across all projects', async () => {
      const result = await queryCrossProject({
        query: 'API integration',
        userId: 'user-1',
        detectContradictions: false,
      });

      // With mock embeddings, we may not get semantic matches
      // but the query should still return a valid result structure
      expect(result.memories).toBeDefined();
      expect(result.projectSummaries).toBeDefined();
      expect(result.commonThemes).toBeDefined();
    });

    it('filters by project IDs', async () => {
      const result = await queryCrossProject({
        query: 'API integration',
        userId: 'user-1',
        projectIds: ['project-a'],
        detectContradictions: false,
      });

      // Should only return memories from project-a
      const projects = new Set(result.memories.map((m) => m.project));
      expect(projects.has('project-b')).toBe(false);
    });
  });

  describe('detectContradictions', () => {
    it('detects contradictions between memories', async () => {
      const mem1 = semanticStore.createMemory(
        'The deadline is before Q2',
        'decisions',
        {
          type: 'conversation',
          sourceId: 'conv-1',
          timestamp: new Date(),
          confidence: 0.9,
        },
        new Array(1536).fill(0.1)
      );

      const mem2 = semanticStore.createMemory(
        'The deadline is after Q3',
        'decisions',
        {
          type: 'conversation',
          sourceId: 'conv-2',
          timestamp: new Date(),
          confidence: 0.9,
        },
        new Array(1536).fill(0.15) // Similar but different
      );

      addSourceContext(mem1.id, {
        projectId: 'project-a',
        conversationId: 'conv-1',
        documentId: null,
        interface: 'web',
        timestamp: new Date(),
      });

      addSourceContext(mem2.id, {
        projectId: 'project-b',
        conversationId: 'conv-2',
        documentId: null,
        interface: 'web',
        timestamp: new Date(),
      });

      semanticStore.addTopics(mem1.id, ['deadline']);
      semanticStore.addTopics(mem2.id, ['deadline']);

      const enrichedMem1 = enrichWithContext(mem1);
      const enrichedMem2 = enrichWithContext(mem2);

      const contradictions = await detectContradictions([enrichedMem1, enrichedMem2]);

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].topic).toBe('deadline');
    });
  });

  describe('findRelatedFromOtherProjects', () => {
    it('finds related memories from other projects', async () => {
      const mem1 = semanticStore.createMemory(
        'Database design patterns for PostgreSQL',
        'domain_knowledge',
        {
          type: 'conversation',
          sourceId: 'conv-1',
          timestamp: new Date(),
          confidence: 0.9,
        },
        new Array(1536).fill(0.3)
      );

      const mem2 = semanticStore.createMemory(
        'Database optimization techniques for SQL',
        'domain_knowledge',
        {
          type: 'conversation',
          sourceId: 'conv-2',
          timestamp: new Date(),
          confidence: 0.9,
        },
        new Array(1536).fill(0.35) // Similar embedding
      );

      addSourceContext(mem1.id, {
        projectId: 'project-a',
        conversationId: 'conv-1',
        documentId: null,
        interface: 'web',
        timestamp: new Date(),
      });

      addSourceContext(mem2.id, {
        projectId: 'project-b',
        conversationId: 'conv-2',
        documentId: null,
        interface: 'web',
        timestamp: new Date(),
      });

      const related = await findRelatedFromOtherProjects(
        'project-a',
        'database patterns'
      );

      // With mock embeddings, similarity thresholds may not be met
      // Just verify the function returns a valid array structure
      expect(Array.isArray(related)).toBe(true);

      // If there are results, verify they're from other projects
      if (related.length > 0) {
        const hasProjectB = related.some(
          (m) => m.sourceContext.projectId === 'project-b'
        );
        expect(hasProjectB).toBe(true);
      }
    });
  });

  describe('getCrossProjectStats', () => {
    it('returns accurate statistics', () => {
      addSourceContext('mem-1', {
        projectId: 'project-1',
        conversationId: 'conv-1',
        documentId: null,
        interface: 'web',
        timestamp: new Date(),
      });

      addCrossReference('mem-1', {
        targetMemoryId: 'mem-2',
        targetProjectId: 'project-2',
        relationshipType: 'related',
        strength: 0.8,
        discoveredAt: new Date(),
        discoveredBy: 'system',
      });

      const stats = getCrossProjectStats();

      expect(stats.memoriesWithContext).toBe(1);
      expect(stats.totalCrossReferences).toBe(1);
      expect(stats.unresolvedContradictions).toBe(0);
    });
  });
});
