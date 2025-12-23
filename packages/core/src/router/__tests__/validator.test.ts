/**
 * Tests for Response Validator
 */

import { describe, it, expect } from 'vitest';
import {
  quickValidate,
  shouldSkipValidation,
  mergeValidationResults,
  getIssueCountByType,
  getIssueCountBySeverity,
  formatValidationResult,
  VALIDATION_SYSTEM_PROMPT,
} from '../validator';
import type { ValidationResult, ValidationIssue } from '../types';

describe('Validator', () => {
  describe('VALIDATION_SYSTEM_PROMPT', () => {
    it('should contain validation criteria', () => {
      expect(VALIDATION_SYSTEM_PROMPT).toContain('FORMAT');
      expect(VALIDATION_SYSTEM_PROMPT).toContain('HALLUCINATION');
      expect(VALIDATION_SYSTEM_PROMPT).toContain('COMPLETENESS');
      expect(VALIDATION_SYSTEM_PROMPT).toContain('RELEVANCE');
      expect(VALIDATION_SYSTEM_PROMPT).toContain('SAFETY');
    });

    it('should specify JSON response format', () => {
      expect(VALIDATION_SYSTEM_PROMPT).toContain('isValid');
      expect(VALIDATION_SYSTEM_PROMPT).toContain('issues');
      expect(VALIDATION_SYSTEM_PROMPT).toContain('shouldEscalate');
    });
  });

  describe('quickValidate', () => {
    it('should pass valid responses', () => {
      const result = quickValidate(
        'What is 2+2?',
        'The answer is 4. Two plus two equals four.'
      );

      expect(result.isValid).toBe(true);
      expect(result.issues.length).toBe(0);
      expect(result.validationModel).toBe('quick-validate');
    });

    it('should fail empty responses', () => {
      const result = quickValidate('What is 2+2?', '');

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('incomplete');
      expect(result.issues[0].severity).toBe('error');
    });

    it('should fail whitespace-only responses', () => {
      const result = quickValidate('What is 2+2?', '   \n\t  ');

      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.type === 'incomplete')).toBe(true);
    });

    it('should warn about very short responses', () => {
      const result = quickValidate(
        'Please explain the theory of relativity in detail and its implications',
        'E=mc2'
      );

      expect(result.issues.some((i) => i.type === 'incomplete')).toBe(true);
    });

    it('should detect error indicators', () => {
      const result = quickValidate(
        'What is 2+2?',
        'Error: Could not process your request'
      );

      expect(result.issues.some((i) => i.description.includes('error'))).toBe(true);
    });

    it('should detect "I cannot" responses', () => {
      const result = quickValidate(
        'What is 2+2?',
        "I'm sorry, I cannot help with that request"
      );

      expect(result.issues.some((i) => i.type === 'incomplete')).toBe(true);
    });

    it('should detect safety concerns not in input', () => {
      const result = quickValidate(
        'Tell me a story',
        'Here is a story about illegal hacking activities'
      );

      expect(result.issues.some((i) => i.type === 'safety')).toBe(true);
    });

    it('should not flag safety terms that were in input', () => {
      const result = quickValidate(
        'Explain the harm of social media',
        'Social media can cause harm through addiction and misinformation'
      );

      expect(result.issues.filter((i) => i.type === 'safety').length).toBe(0);
    });

    it('should set shouldEscalate for errors', () => {
      const result = quickValidate('Test', '');

      expect(result.shouldEscalate).toBe(true);
    });
  });

  describe('shouldSkipValidation', () => {
    it('should skip validation for high confidence', () => {
      expect(shouldSkipValidation(0.96, { highConfidenceThreshold: 0.95 })).toBe(true);
      expect(shouldSkipValidation(0.99, {})).toBe(true);
    });

    it('should not skip validation for low confidence', () => {
      expect(shouldSkipValidation(0.8, { highConfidenceThreshold: 0.95 })).toBe(false);
      expect(shouldSkipValidation(0.5, {})).toBe(false);
    });

    it('should use default threshold of 0.95', () => {
      expect(shouldSkipValidation(0.94, {})).toBe(false);
      expect(shouldSkipValidation(0.96, {})).toBe(true);
    });
  });

  describe('mergeValidationResults', () => {
    const createResult = (
      overrides: Partial<ValidationResult> = {}
    ): ValidationResult => ({
      isValid: true,
      validationModel: 'test',
      issues: [],
      shouldEscalate: false,
      ...overrides,
    });

    it('should merge issues from multiple results', () => {
      const results = [
        createResult({
          issues: [{ type: 'format', severity: 'warning', description: 'A' }],
        }),
        createResult({
          issues: [{ type: 'incomplete', severity: 'error', description: 'B' }],
        }),
      ];

      const merged = mergeValidationResults(results);

      expect(merged.issues.length).toBe(2);
    });

    it('should deduplicate issues by description', () => {
      const results = [
        createResult({
          issues: [{ type: 'format', severity: 'warning', description: 'Same issue' }],
        }),
        createResult({
          issues: [{ type: 'format', severity: 'warning', description: 'Same issue' }],
        }),
      ];

      const merged = mergeValidationResults(results);

      expect(merged.issues.length).toBe(1);
    });

    it('should set shouldEscalate if any result has it', () => {
      const results = [
        createResult({ shouldEscalate: false }),
        createResult({ shouldEscalate: true }),
      ];

      const merged = mergeValidationResults(results);

      expect(merged.shouldEscalate).toBe(true);
    });

    it('should combine suggested repairs', () => {
      const results = [
        createResult({ suggestedRepair: 'Fix A' }),
        createResult({ suggestedRepair: 'Fix B' }),
      ];

      const merged = mergeValidationResults(results);

      expect(merged.suggestedRepair).toContain('Fix A');
      expect(merged.suggestedRepair).toContain('Fix B');
    });

    it('should set isValid to false if any error exists', () => {
      const results = [
        createResult({ isValid: true, issues: [] }),
        createResult({
          isValid: true,
          issues: [{ type: 'format', severity: 'error', description: 'Error' }],
        }),
      ];

      const merged = mergeValidationResults(results);

      expect(merged.isValid).toBe(false);
    });

    it('should set validation model to merged', () => {
      const results = [createResult()];
      const merged = mergeValidationResults(results);
      expect(merged.validationModel).toBe('merged');
    });
  });

  describe('getIssueCountByType', () => {
    it('should count issues by type', () => {
      const issues: ValidationIssue[] = [
        { type: 'format', severity: 'error', description: 'A' },
        { type: 'format', severity: 'warning', description: 'B' },
        { type: 'incomplete', severity: 'error', description: 'C' },
      ];

      const counts = getIssueCountByType(issues);

      expect(counts.format).toBe(2);
      expect(counts.incomplete).toBe(1);
    });

    it('should return empty object for no issues', () => {
      const counts = getIssueCountByType([]);
      expect(Object.keys(counts).length).toBe(0);
    });
  });

  describe('getIssueCountBySeverity', () => {
    it('should count warnings and errors', () => {
      const issues: ValidationIssue[] = [
        { type: 'format', severity: 'error', description: 'A' },
        { type: 'format', severity: 'warning', description: 'B' },
        { type: 'incomplete', severity: 'warning', description: 'C' },
      ];

      const counts = getIssueCountBySeverity(issues);

      expect(counts.errors).toBe(1);
      expect(counts.warnings).toBe(2);
    });

    it('should return zeros for no issues', () => {
      const counts = getIssueCountBySeverity([]);
      expect(counts.errors).toBe(0);
      expect(counts.warnings).toBe(0);
    });
  });

  describe('formatValidationResult', () => {
    it('should format valid result', () => {
      const result: ValidationResult = {
        isValid: true,
        validationModel: 'test-model',
        issues: [],
        shouldEscalate: false,
      };

      const formatted = formatValidationResult(result);

      expect(formatted).toContain('Valid: Yes');
      expect(formatted).toContain('Validator: test-model');
    });

    it('should format invalid result with issues', () => {
      const result: ValidationResult = {
        isValid: false,
        validationModel: 'test-model',
        issues: [
          { type: 'format', severity: 'error', description: 'Bad format' },
        ],
        shouldEscalate: true,
        suggestedRepair: 'Fix the format',
      };

      const formatted = formatValidationResult(result);

      expect(formatted).toContain('Valid: No');
      expect(formatted).toContain('Issues (1)');
      expect(formatted).toContain('[ERROR]');
      expect(formatted).toContain('format');
      expect(formatted).toContain('Bad format');
      expect(formatted).toContain('Escalation recommended');
      expect(formatted).toContain('Fix the format');
    });

    it('should format multiple issues', () => {
      const result: ValidationResult = {
        isValid: false,
        validationModel: 'test-model',
        issues: [
          { type: 'format', severity: 'error', description: 'A' },
          { type: 'incomplete', severity: 'warning', description: 'B' },
        ],
        shouldEscalate: false,
      };

      const formatted = formatValidationResult(result);

      expect(formatted).toContain('Issues (2)');
      expect(formatted).toContain('[ERROR]');
      expect(formatted).toContain('[WARNING]');
    });
  });
});
