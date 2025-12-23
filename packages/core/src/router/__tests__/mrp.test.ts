/**
 * Tests for MRP (Merge-Readiness Pack) Generator
 */

import { describe, it, expect } from 'vitest';
import {
  MrpBuilder,
  createMrpBuilder,
  createMinimalMrp,
  summarizeMrp,
  calculateMrpCost,
  getMrpMetrics,
  exportMrp,
  parseMrp,
} from '../mrp';
import { ComplexityTier, TaskType } from '../types';
import type { RouterRequest, ClassificationResult, RoutingDecision, ValidationResult } from '../types';

describe('MRP', () => {
  const createRequest = (): RouterRequest => ({
    input: 'Test input query',
    inputType: 'text',
    sessionId: 'session-123',
  });

  const createClassification = (): ClassificationResult => ({
    taskType: TaskType.SIMPLE_QA,
    complexityTier: ComplexityTier.SIMPLE,
    confidenceScore: 0.85,
    requiredContext: [],
    reasoning: 'Simple question',
    inputTokenEstimate: 15,
    timestamp: new Date(),
  });

  const createRoutingDecision = (): RoutingDecision => ({
    selectedModel: 'llama-3.3-70b-versatile',
    classificationResult: createClassification(),
    routingLatencyMs: 15,
  });

  const createValidation = (): ValidationResult => ({
    isValid: true,
    validationModel: 'llama-3.1-8b-instant',
    issues: [],
    shouldEscalate: false,
  });

  describe('MrpBuilder', () => {
    it('should create builder with request info', () => {
      const builder = new MrpBuilder(createRequest());
      const mrp = builder.build();

      expect(mrp.id).toMatch(/^mrp_/);
      expect(mrp.originalInput).toBe('Test input query');
      expect(mrp.timestamp).toBeInstanceOf(Date);
    });

    it('should set classification', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setClassification(createClassification(), 50);
      const mrp = builder.build();

      expect(mrp.classificationResult).toBeDefined();
      expect(mrp.classificationLatencyMs).toBe(50);
    });

    it('should set routing decision', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setRoutingDecision(createRoutingDecision());
      const mrp = builder.build();

      expect(mrp.routingDecision).toBeDefined();
      expect(mrp.selectedModel).toBe('llama-3.3-70b-versatile');
      expect(mrp.escalationChain).toContain('llama-3.3-70b-versatile');
    });

    it('should record escalations', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setRoutingDecision(createRoutingDecision());
      builder.recordEscalation(
        'llama-3.3-70b-versatile',
        'claude-sonnet-4-20250514',
        'Validation failed'
      );
      const mrp = builder.build();

      expect(mrp.escalationChain).toContain('llama-3.3-70b-versatile');
      expect(mrp.escalationChain).toContain('claude-sonnet-4-20250514');
      expect(mrp.decisionJustification).toContain('Escalated');
    });

    it('should set validation', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setValidation(createValidation(), 100);
      const mrp = builder.build();

      expect(mrp.validationResult).toBeDefined();
      expect(mrp.validationLatencyMs).toBe(100);
    });

    it('should set actual model', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setActualModel('claude-sonnet-4-20250514');
      const mrp = builder.build();

      expect(mrp.actualModelUsed).toBe('claude-sonnet-4-20250514');
    });

    it('should set execution latency', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setExecutionLatency(200);
      const mrp = builder.build();

      expect(mrp.executionLatencyMs).toBe(200);
    });

    it('should add token usage', () => {
      const builder = createMrpBuilder(createRequest());
      builder.addTokenUsage(100, 50);
      builder.addTokenUsage(50, 25);
      const mrp = builder.build();

      expect(mrp.inputTokens).toBe(150);
      expect(mrp.outputTokens).toBe(75);
    });

    it('should calculate cost', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setRoutingDecision(createRoutingDecision());
      builder.addTokenUsage(1000, 500);
      builder.calculateCost();
      const mrp = builder.build();

      expect(mrp.estimatedCostUsd).toBeGreaterThan(0);
    });

    it('should set functional completeness', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setFunctionalCompleteness(true);
      const mrp = builder.build();

      expect(mrp.functionalCompleteness).toBe(true);
    });

    it('should set justification', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setJustification('Manual override');
      const mrp = builder.build();

      expect(mrp.decisionJustification).toBe('Manual override');
    });

    it('should append justification', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setJustification('Part 1');
      builder.appendJustification('Part 2');
      const mrp = builder.build();

      expect(mrp.decisionJustification).toContain('Part 1');
      expect(mrp.decisionJustification).toContain('Part 2');
    });

    it('should calculate total latency on build', async () => {
      const builder = createMrpBuilder(createRequest());

      // Wait a tiny bit to ensure measurable latency
      await new Promise(resolve => setTimeout(resolve, 10));

      const mrp = builder.build();

      expect(mrp.totalLatencyMs).toBeGreaterThanOrEqual(10);
    });

    it('should generate default justification', () => {
      const builder = createMrpBuilder(createRequest());
      builder.setClassification(createClassification(), 50);
      builder.setValidation(createValidation(), 100);
      const mrp = builder.build();

      expect(mrp.decisionJustification).toContain('simple_qa');
      expect(mrp.decisionJustification).toContain('Confidence');
    });

    it('should support method chaining', () => {
      const mrp = createMrpBuilder(createRequest())
        .setClassification(createClassification(), 50)
        .setRoutingDecision(createRoutingDecision())
        .setActualModel('llama-3.3-70b-versatile')
        .setExecutionLatency(200)
        .setFunctionalCompleteness(true)
        .build();

      expect(mrp.classificationResult).toBeDefined();
      expect(mrp.routingDecision).toBeDefined();
      expect(mrp.actualModelUsed).toBe('llama-3.3-70b-versatile');
    });
  });

  describe('createMinimalMrp', () => {
    it('should create minimal MRP', () => {
      const mrp = createMinimalMrp(
        createRequest(),
        'llama-3.3-70b-versatile',
        100
      );

      expect(mrp.id).toMatch(/^mrp_/);
      expect(mrp.selectedModel).toBe('llama-3.3-70b-versatile');
      expect(mrp.actualModelUsed).toBe('llama-3.3-70b-versatile');
      expect(mrp.totalLatencyMs).toBe(100);
      expect(mrp.functionalCompleteness).toBe(true);
    });
  });

  describe('summarizeMrp', () => {
    it('should create readable summary', () => {
      const mrp = createMrpBuilder(createRequest())
        .setClassification(createClassification(), 50)
        .setRoutingDecision(createRoutingDecision())
        .setActualModel('llama-3.3-70b-versatile')
        .setFunctionalCompleteness(true)
        .build();

      const summary = summarizeMrp(mrp);

      expect(summary).toContain('MRP');
      expect(summary).toContain('Model: llama-3.3-70b-versatile');
      expect(summary).toContain('Complete: true');
    });

    it('should show escalation count', () => {
      const mrp = createMrpBuilder(createRequest())
        .setRoutingDecision(createRoutingDecision())
        .recordEscalation(
          'llama-3.3-70b-versatile',
          'claude-sonnet-4-20250514',
          'Escalated'
        )
        .build();

      const summary = summarizeMrp(mrp);

      expect(summary).toContain('Escalations: 1');
    });
  });

  describe('calculateMrpCost', () => {
    it('should calculate cost from escalation chain', () => {
      const mrp = createMrpBuilder(createRequest())
        .setRoutingDecision(createRoutingDecision())
        .addTokenUsage(1000, 500)
        .build();

      mrp.escalationChain = ['llama-3.3-70b-versatile'];

      const cost = calculateMrpCost(mrp);

      expect(cost).toBeGreaterThan(0);
    });

    it('should return 0 for empty chain', () => {
      const mrp = createMinimalMrp(createRequest(), 'test', 100);
      mrp.escalationChain = [];

      const cost = calculateMrpCost(mrp);

      expect(cost).toBe(0);
    });
  });

  describe('getMrpMetrics', () => {
    it('should extract metrics', () => {
      const mrp = createMrpBuilder(createRequest())
        .setClassification(createClassification(), 50)
        .setRoutingDecision(createRoutingDecision())
        .setExecutionLatency(200)
        .setValidation(createValidation(), 100)
        .build();

      const metrics = getMrpMetrics(mrp);

      expect(metrics.totalLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.classificationLatency).toBe(50);
      expect(metrics.executionLatency).toBe(200);
      expect(metrics.validationLatency).toBe(100);
      expect(metrics.escalationCount).toBe(0);
      expect(metrics.wasEscalated).toBe(false);
      expect(metrics.wasValidated).toBe(true);
    });

    it('should detect escalation', () => {
      const mrp = createMrpBuilder(createRequest())
        .setRoutingDecision(createRoutingDecision())
        .recordEscalation(
          'llama-3.3-70b-versatile',
          'claude-sonnet-4-20250514',
          'Test'
        )
        .build();

      const metrics = getMrpMetrics(mrp);

      expect(metrics.wasEscalated).toBe(true);
      expect(metrics.escalationCount).toBe(1);
    });
  });

  describe('exportMrp / parseMrp', () => {
    it('should round-trip MRP through JSON', () => {
      const original = createMrpBuilder(createRequest())
        .setClassification(createClassification(), 50)
        .setRoutingDecision(createRoutingDecision())
        .setFunctionalCompleteness(true)
        .build();

      const json = exportMrp(original);
      const parsed = parseMrp(json);

      expect(parsed.id).toBe(original.id);
      expect(parsed.originalInput).toBe(original.originalInput);
      expect(parsed.timestamp).toEqual(original.timestamp);
      expect(parsed.functionalCompleteness).toBe(original.functionalCompleteness);
    });

    it('should export as formatted JSON', () => {
      const mrp = createMinimalMrp(createRequest(), 'test', 100);
      const json = exportMrp(mrp);

      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });
});
