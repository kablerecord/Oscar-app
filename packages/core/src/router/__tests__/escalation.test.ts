/**
 * Tests for Escalation Handler
 */

import { describe, it, expect } from 'vitest';
import {
  handleEscalation,
  needsEscalation,
  getEscalationChain,
  calculateEscalationCost,
  canEscalate,
  getNextTierModel,
  isImmediateEscalationIssue,
  analyzeForEscalation,
} from '../escalation';
import { ComplexityTier, TaskType } from '../types';
import type { RoutingDecision, ValidationResult, RouterRequest } from '../types';

describe('Escalation', () => {
  const createRequest = (overrides: Partial<RouterRequest> = {}): RouterRequest => ({
    input: 'Test input',
    inputType: 'text',
    sessionId: 'session-123',
    ...overrides,
  });

  const createDecision = (
    modelId: string = 'llama-3.3-70b-versatile'
  ): RoutingDecision => ({
    selectedModel: modelId,
    classificationResult: {
      taskType: TaskType.SIMPLE_QA,
      complexityTier: ComplexityTier.SIMPLE,
      confidenceScore: 0.8,
      requiredContext: [],
      reasoning: 'Test',
      inputTokenEstimate: 10,
      timestamp: new Date(),
    },
    routingLatencyMs: 10,
  });

  const createValidationResult = (
    overrides: Partial<ValidationResult> = {}
  ): ValidationResult => ({
    isValid: true,
    validationModel: 'llama-3.1-8b-instant',
    issues: [],
    shouldEscalate: false,
    ...overrides,
  });

  describe('needsEscalation', () => {
    it('should return false for valid result', () => {
      const result = createValidationResult({ isValid: true });
      expect(needsEscalation(result)).toBe(false);
    });

    it('should return true when shouldEscalate is true', () => {
      const result = createValidationResult({ shouldEscalate: true });
      expect(needsEscalation(result)).toBe(true);
    });

    it('should return true when there are errors', () => {
      const result = createValidationResult({
        isValid: true,
        issues: [
          {
            type: 'format',
            severity: 'error',
            description: 'Invalid JSON',
          },
        ],
      });
      expect(needsEscalation(result)).toBe(true);
    });

    it('should return true when isValid is false', () => {
      const result = createValidationResult({ isValid: false });
      expect(needsEscalation(result)).toBe(true);
    });

    it('should return false for warnings only', () => {
      const result = createValidationResult({
        isValid: true,
        issues: [
          {
            type: 'incomplete',
            severity: 'warning',
            description: 'Could be more detailed',
          },
        ],
      });
      expect(needsEscalation(result)).toBe(false);
    });
  });

  describe('handleEscalation', () => {
    it('should escalate from SIMPLE to COMPLEX', () => {
      const request = createRequest();
      const decision = createDecision('llama-3.3-70b-versatile');
      const validation = createValidationResult({ isValid: false });

      const result = handleEscalation(request, decision, validation, {}, 0);

      expect(result.shouldEscalate).toBe(true);
      expect(result.newDecision?.selectedModel).toBe('claude-sonnet-4-20250514');
      expect(result.newDecision?.escalatedFrom).toBe('llama-3.3-70b-versatile');
    });

    it('should escalate from COMPLEX to STRATEGIC', () => {
      const request = createRequest();
      const decision = createDecision('claude-sonnet-4-20250514');
      const validation = createValidationResult({ isValid: false });

      const result = handleEscalation(request, decision, validation, {}, 0);

      expect(result.shouldEscalate).toBe(true);
      expect(result.newDecision?.selectedModel).toBe('claude-opus-4-20250514');
    });

    it('should not escalate beyond STRATEGIC', () => {
      const request = createRequest();
      const decision = createDecision('claude-opus-4-20250514');
      const validation = createValidationResult({ isValid: false });

      const result = handleEscalation(request, decision, validation, {}, 0);

      expect(result.shouldEscalate).toBe(false);
      expect(result.newDecision).toBeNull();
      expect(result.reason).toContain('highest tier');
    });

    it('should respect max escalations', () => {
      const request = createRequest();
      const decision = createDecision('llama-3.3-70b-versatile');
      const validation = createValidationResult({ isValid: false });

      const result = handleEscalation(request, decision, validation, { maxEscalations: 2 }, 2);

      expect(result.shouldEscalate).toBe(false);
      expect(result.newDecision).toBeNull();
      expect(result.reason).toContain('Max escalations');
    });

    it('should include suggested repair in reason', () => {
      const request = createRequest();
      const decision = createDecision('llama-3.3-70b-versatile');
      const validation = createValidationResult({
        isValid: false,
        suggestedRepair: 'Add more detail',
      });

      const result = handleEscalation(request, decision, validation, {}, 0);

      expect(result.reason).toContain('Add more detail');
    });

    it('should handle unknown model gracefully', () => {
      const request = createRequest();
      const decision = createDecision('unknown-model');
      const validation = createValidationResult({ isValid: false });

      const result = handleEscalation(request, decision, validation, {}, 0);

      expect(result.shouldEscalate).toBe(false);
      expect(result.reason).toContain('Unknown model');
    });
  });

  describe('getEscalationChain', () => {
    it('should return full chain from ROUTING', () => {
      const chain = getEscalationChain('llama-3.1-8b-instant');
      expect(chain).toEqual([
        'llama-3.1-8b-instant',
        'llama-3.3-70b-versatile',
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
      ]);
    });

    it('should return shorter chain from SIMPLE', () => {
      const chain = getEscalationChain('llama-3.3-70b-versatile');
      expect(chain).toEqual([
        'llama-3.3-70b-versatile',
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
      ]);
    });

    it('should return single element for STRATEGIC', () => {
      const chain = getEscalationChain('claude-opus-4-20250514');
      expect(chain).toEqual(['claude-opus-4-20250514']);
    });

    it('should handle unknown model', () => {
      const chain = getEscalationChain('unknown-model');
      expect(chain).toEqual(['unknown-model']);
    });
  });

  describe('calculateEscalationCost', () => {
    it('should calculate cost for escalation chain', () => {
      const chain = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
      const cost = calculateEscalationCost(chain, 1000, 500);
      expect(cost).toBeGreaterThan(0);
    });

    it('should return 0 for empty chain', () => {
      const cost = calculateEscalationCost([], 1000, 500);
      expect(cost).toBe(0);
    });

    it('should handle unknown models', () => {
      const chain = ['unknown-model'];
      const cost = calculateEscalationCost(chain, 1000, 500);
      expect(cost).toBe(0);
    });
  });

  describe('canEscalate', () => {
    it('should return true for lower tier models', () => {
      expect(canEscalate('llama-3.1-8b-instant')).toBe(true);
      expect(canEscalate('llama-3.3-70b-versatile')).toBe(true);
      expect(canEscalate('claude-sonnet-4-20250514')).toBe(true);
    });

    it('should return false for STRATEGIC tier', () => {
      expect(canEscalate('claude-opus-4-20250514')).toBe(false);
    });

    it('should return false for unknown model', () => {
      expect(canEscalate('unknown-model')).toBe(false);
    });
  });

  describe('getNextTierModel', () => {
    it('should return next tier model', () => {
      expect(getNextTierModel('llama-3.1-8b-instant')).toBe('llama-3.3-70b-versatile');
      expect(getNextTierModel('llama-3.3-70b-versatile')).toBe('claude-sonnet-4-20250514');
      expect(getNextTierModel('claude-sonnet-4-20250514')).toBe('claude-opus-4-20250514');
    });

    it('should return null for STRATEGIC tier', () => {
      expect(getNextTierModel('claude-opus-4-20250514')).toBeNull();
    });

    it('should return null for unknown model', () => {
      expect(getNextTierModel('unknown-model')).toBeNull();
    });
  });

  describe('isImmediateEscalationIssue', () => {
    it('should return true for safety issues', () => {
      expect(isImmediateEscalationIssue('safety')).toBe(true);
    });

    it('should return true for hallucination issues', () => {
      expect(isImmediateEscalationIssue('hallucination')).toBe(true);
    });

    it('should return false for other issues', () => {
      expect(isImmediateEscalationIssue('format')).toBe(false);
      expect(isImmediateEscalationIssue('incomplete')).toBe(false);
      expect(isImmediateEscalationIssue('off_topic')).toBe(false);
    });
  });

  describe('analyzeForEscalation', () => {
    it('should set critical priority for safety issues', () => {
      const result = createValidationResult({
        issues: [
          { type: 'safety', severity: 'error', description: 'Unsafe content' },
        ],
      });

      const analysis = analyzeForEscalation(result);

      expect(analysis.priority).toBe('critical');
      expect(analysis.shouldEscalate).toBe(true);
    });

    it('should set high priority for errors', () => {
      const result = createValidationResult({
        issues: [
          { type: 'format', severity: 'error', description: 'Invalid JSON' },
        ],
      });

      const analysis = analyzeForEscalation(result);

      expect(analysis.priority).toBe('high');
      expect(analysis.shouldEscalate).toBe(true);
    });

    it('should set medium priority for warnings', () => {
      const result = createValidationResult({
        isValid: true,
        issues: [
          { type: 'incomplete', severity: 'warning', description: 'Could be better' },
        ],
      });

      const analysis = analyzeForEscalation(result);

      expect(analysis.priority).toBe('medium');
      expect(analysis.shouldEscalate).toBe(false);
    });

    it('should set low priority for no issues', () => {
      const result = createValidationResult({
        isValid: true,
        issues: [],
      });

      const analysis = analyzeForEscalation(result);

      expect(analysis.priority).toBe('low');
      expect(analysis.shouldEscalate).toBe(false);
    });
  });
});
