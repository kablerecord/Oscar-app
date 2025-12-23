/**
 * Tests for Router Decision Logic
 */

import { describe, it, expect } from 'vitest';
import {
  makeRoutingDecision,
  getModelForTier,
  calculateRoutingScore,
} from '../router';
import { ComplexityTier, TaskType } from '../types';
import type { ClassificationResult, RouterConfig } from '../types';

describe('Router', () => {
  const createClassification = (
    overrides: Partial<ClassificationResult> = {}
  ): ClassificationResult => ({
    taskType: TaskType.SIMPLE_QA,
    complexityTier: ComplexityTier.SIMPLE,
    confidenceScore: 0.85,
    requiredContext: [],
    reasoning: 'Test classification',
    inputTokenEstimate: 20,
    timestamp: new Date(),
    ...overrides,
  });

  const defaultConfig: Partial<RouterConfig> = {
    escalationThreshold: 0.7,
    highConfidenceThreshold: 0.95,
    maxEscalations: 2,
  };

  describe('makeRoutingDecision', () => {
    it('should select model based on complexity tier', () => {
      const classification = createClassification({
        complexityTier: ComplexityTier.SIMPLE,
      });

      const decision = makeRoutingDecision(classification, defaultConfig);

      expect(decision.selectedModel).toBe('llama-3.3-70b-versatile');
      expect(decision.classificationResult).toEqual(classification);
    });

    it('should escalate when confidence is below threshold', () => {
      const classification = createClassification({
        complexityTier: ComplexityTier.SIMPLE,
        confidenceScore: 0.5, // Below 0.7 threshold
      });

      const decision = makeRoutingDecision(classification, defaultConfig);

      expect(decision.selectedModel).toBe('claude-sonnet-4-20250514');
      expect(decision.escalatedFrom).toBe('llama-3.3-70b-versatile');
      expect(decision.escalationReason).toContain('Confidence');
    });

    it('should use ROUTING tier model for tier 1', () => {
      const classification = createClassification({
        complexityTier: ComplexityTier.ROUTING,
      });

      const decision = makeRoutingDecision(classification, defaultConfig);

      expect(decision.selectedModel).toBe('llama-3.1-8b-instant');
    });

    it('should use COMPLEX tier model for tier 3', () => {
      const classification = createClassification({
        complexityTier: ComplexityTier.COMPLEX,
      });

      const decision = makeRoutingDecision(classification, defaultConfig);

      expect(decision.selectedModel).toBe('claude-sonnet-4-20250514');
    });

    it('should use STRATEGIC tier model for tier 4', () => {
      const classification = createClassification({
        complexityTier: ComplexityTier.STRATEGIC,
      });

      const decision = makeRoutingDecision(classification, defaultConfig);

      expect(decision.selectedModel).toBe('claude-opus-4-20250514');
    });

    it('should force STRATEGIC tier for multi-model deliberation', () => {
      const classification = createClassification({
        taskType: TaskType.MULTI_MODEL_DELIBERATION,
        complexityTier: ComplexityTier.SIMPLE,
      });

      const decision = makeRoutingDecision(classification, defaultConfig);

      expect(decision.selectedModel).toBe('claude-opus-4-20250514');
      expect(decision.escalationReason).toContain('Multi-model');
    });

    it('should route voice transcription to Whisper', () => {
      const classification = createClassification({
        taskType: TaskType.VOICE_TRANSCRIPTION,
        complexityTier: ComplexityTier.SIMPLE,
      });

      const decision = makeRoutingDecision(classification, defaultConfig);

      expect(decision.selectedModel).toBe('whisper-large-v3-turbo');
    });

    it('should not escalate beyond STRATEGIC', () => {
      const classification = createClassification({
        complexityTier: ComplexityTier.STRATEGIC,
        confidenceScore: 0.5, // Low confidence
      });

      const decision = makeRoutingDecision(classification, defaultConfig);

      expect(decision.selectedModel).toBe('claude-opus-4-20250514');
      expect(decision.escalatedFrom).toBeUndefined();
    });

    it('should include routing latency', () => {
      const classification = createClassification();

      const decision = makeRoutingDecision(classification, defaultConfig);

      expect(decision.routingLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getModelForTier', () => {
    it('should return correct model for each tier', () => {
      expect(getModelForTier(ComplexityTier.ROUTING)).toBe('llama-3.1-8b-instant');
      expect(getModelForTier(ComplexityTier.SIMPLE)).toBe('llama-3.3-70b-versatile');
      expect(getModelForTier(ComplexityTier.COMPLEX)).toBe('claude-sonnet-4-20250514');
      expect(getModelForTier(ComplexityTier.STRATEGIC)).toBe('claude-opus-4-20250514');
    });

    it('should default to SIMPLE tier model for unknown tiers', () => {
      expect(getModelForTier(99 as ComplexityTier)).toBe('llama-3.3-70b-versatile');
    });
  });

  describe('calculateRoutingScore', () => {
    it('should return higher scores for higher confidence', () => {
      const highConf = createClassification({ confidenceScore: 0.95 });
      const lowConf = createClassification({ confidenceScore: 0.5 });

      const highScore = calculateRoutingScore(highConf);
      const lowScore = calculateRoutingScore(lowConf);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should factor in complexity tier', () => {
      const simple = createClassification({
        complexityTier: ComplexityTier.SIMPLE,
        confidenceScore: 0.8,
      });
      const complex = createClassification({
        complexityTier: ComplexityTier.COMPLEX,
        confidenceScore: 0.8,
      });

      const simpleScore = calculateRoutingScore(simple);
      const complexScore = calculateRoutingScore(complex);

      // Higher tier = lower score (more expensive)
      expect(simpleScore).toBeGreaterThan(complexScore);
    });

    it('should return score between 0 and 1', () => {
      const classifications = [
        createClassification({ confidenceScore: 0, complexityTier: ComplexityTier.ROUTING }),
        createClassification({ confidenceScore: 1, complexityTier: ComplexityTier.STRATEGIC }),
        createClassification({ confidenceScore: 0.5, complexityTier: ComplexityTier.COMPLEX }),
      ];

      for (const c of classifications) {
        const score = calculateRoutingScore(c);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });
  });
});
