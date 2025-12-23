/**
 * Tests for Dependencies Inference Layer
 */

import { describe, it, expect } from 'vitest';
import {
  inferDependencies,
  getHighConfidenceDependencies,
  getDependenciesDueSoon,
  getPendingDependencies,
  markDependencyCompleted,
  markDependencyDismissed,
  formatDependencyChain,
  enrichWithDependencies,
  enrichAllWithDependencies,
} from '../inference/dependencies';
import type { Commitment, DependencyChain } from '../types';

describe('Dependency Inference', () => {
  const createCommitment = (
    what: string,
    daysUntil: number = 14
  ): Commitment => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysUntil);

    return {
      id: `test-${Date.now()}`,
      commitmentText: what,
      who: 'user',
      what,
      when: {
        rawText: `in ${daysUntil} days`,
        isVague: false,
        urgencyCategory: 'THIS_WEEK',
        parsedDate: futureDate,
      },
      source: {
        type: 'email',
        sourceId: 'test',
        extractedAt: new Date(),
      },
      confidence: 0.8,
      reasoning: 'Test',
      createdAt: new Date(),
      validated: false,
    };
  };

  describe('inferDependencies', () => {
    it('should infer wedding dependencies', () => {
      const commitment = createCommitment('Attend wedding in Austin', 30);
      const chain = inferDependencies(commitment);

      expect(chain.primaryEvent).toBe('Attend wedding in Austin');
      expect(chain.inferredDependencies.length).toBeGreaterThan(0);

      const actions = chain.inferredDependencies.map((d) => d.action);
      expect(actions).toContain('Book travel');
      expect(actions).toContain('Book accommodation');
    });

    it('should infer conference dependencies', () => {
      const commitment = createCommitment('Attend tech conference', 21);
      const chain = inferDependencies(commitment);

      const actions = chain.inferredDependencies.map((d) => d.action);
      expect(actions).toContain('Book travel');
      expect(actions).toContain('Book hotel');
    });

    it('should infer vacation dependencies', () => {
      const commitment = createCommitment('Family vacation trip to Hawaii', 45);
      const chain = inferDependencies(commitment);

      const actions = chain.inferredDependencies.map((d) => d.action);
      expect(actions).toContain('Book flights');
      expect(actions).toContain('Pack bags');
    });

    it('should infer interview dependencies', () => {
      const commitment = createCommitment('Job interview at Google', 7);
      const chain = inferDependencies(commitment);

      const actions = chain.inferredDependencies.map((d) => d.action);
      expect(actions).toContain('Research company');
      expect(actions).toContain('Prepare answers');
    });

    it('should infer generic dependencies for unknown events', () => {
      const commitment = createCommitment('Something random', 14);
      const chain = inferDependencies(commitment);

      // Should still have at least generic preparation
      expect(chain.inferredDependencies.length).toBeGreaterThan(0);
    });

    it('should calculate suggested deadlines', () => {
      const commitment = createCommitment('Wedding ceremony', 30);
      const chain = inferDependencies(commitment);

      const bookTravel = chain.inferredDependencies.find(
        (d) => d.action === 'Book travel'
      );
      expect(bookTravel?.suggestedDeadline).toBeDefined();

      // Deadline should be before the event
      if (bookTravel?.suggestedDeadline && commitment.when.parsedDate) {
        expect(bookTravel.suggestedDeadline < commitment.when.parsedDate).toBe(
          true
        );
      }
    });
  });

  describe('getHighConfidenceDependencies', () => {
    it('should filter by confidence', () => {
      const commitment = createCommitment('Wedding ceremony', 30);
      const chain = inferDependencies(commitment);

      const highConfidence = getHighConfidenceDependencies(chain, 0.8);

      for (const dep of highConfidence) {
        expect(dep.confidence).toBeGreaterThanOrEqual(0.8);
      }
    });

    it('should use default threshold', () => {
      const commitment = createCommitment('Wedding ceremony', 30);
      const chain = inferDependencies(commitment);

      const highConfidence = getHighConfidenceDependencies(chain);

      for (const dep of highConfidence) {
        expect(dep.confidence).toBeGreaterThanOrEqual(0.7);
      }
    });
  });

  describe('getDependenciesDueSoon', () => {
    it('should filter by deadline', () => {
      const commitment = createCommitment('Wedding ceremony', 10);
      const chain = inferDependencies(commitment);

      const dueSoon = getDependenciesDueSoon(chain, 7);

      for (const dep of dueSoon) {
        if (dep.suggestedDeadline) {
          const daysUntil =
            (dep.suggestedDeadline.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24);
          expect(daysUntil).toBeLessThanOrEqual(7);
        }
      }
    });
  });

  describe('getPendingDependencies', () => {
    it('should return only pending dependencies', () => {
      const commitment = createCommitment('Wedding ceremony', 30);
      const chain = inferDependencies(commitment);

      const pending = getPendingDependencies(chain);

      for (const dep of pending) {
        expect(dep.status).toBe('pending');
      }
    });
  });

  describe('markDependencyCompleted', () => {
    it('should mark dependency as completed', () => {
      const commitment = createCommitment('Wedding ceremony', 30);
      let chain = inferDependencies(commitment);

      const action = chain.inferredDependencies[0].action;
      chain = markDependencyCompleted(chain, action);

      const dep = chain.inferredDependencies.find((d) => d.action === action);
      expect(dep?.status).toBe('completed');
    });

    it('should not affect other dependencies', () => {
      const commitment = createCommitment('Wedding ceremony', 30);
      let chain = inferDependencies(commitment);

      const action = chain.inferredDependencies[0].action;
      const originalCount = chain.inferredDependencies.length;

      chain = markDependencyCompleted(chain, action);

      expect(chain.inferredDependencies.length).toBe(originalCount);
      expect(
        chain.inferredDependencies.filter((d) => d.status === 'pending').length
      ).toBe(originalCount - 1);
    });
  });

  describe('markDependencyDismissed', () => {
    it('should mark dependency as dismissed', () => {
      const commitment = createCommitment('Wedding ceremony', 30);
      let chain = inferDependencies(commitment);

      const action = chain.inferredDependencies[0].action;
      chain = markDependencyDismissed(chain, action);

      const dep = chain.inferredDependencies.find((d) => d.action === action);
      expect(dep?.status).toBe('dismissed');
    });
  });

  describe('formatDependencyChain', () => {
    it('should format chain as string', () => {
      const commitment = createCommitment('Wedding ceremony', 30);
      const chain = inferDependencies(commitment);

      const formatted = formatDependencyChain(chain);

      expect(formatted).toContain('Dependencies for:');
      expect(formatted).toContain('Wedding ceremony');
    });

    it('should include status and confidence', () => {
      const commitment = createCommitment('Wedding ceremony', 30);
      const chain = inferDependencies(commitment);

      const formatted = formatDependencyChain(chain);

      expect(formatted).toContain('%');
      expect(formatted).toContain('[pending]');
    });
  });

  describe('enrichWithDependencies', () => {
    it('should add dependencies to commitment', () => {
      const commitment = createCommitment('Wedding ceremony', 30);
      expect(commitment.dependencies).toBeUndefined();

      const enriched = enrichWithDependencies(commitment);

      expect(enriched.dependencies).toBeDefined();
      expect(enriched.dependencies?.inferredDependencies.length).toBeGreaterThan(0);
    });
  });

  describe('enrichAllWithDependencies', () => {
    it('should enrich multiple commitments', () => {
      const commitments = [
        createCommitment('Wedding ceremony', 30),
        createCommitment('Tech conference', 21),
        createCommitment('Vacation trip', 45),
      ];

      const enriched = enrichAllWithDependencies(commitments);

      expect(enriched.length).toBe(3);
      for (const c of enriched) {
        expect(c.dependencies).toBeDefined();
      }
    });
  });
});
