/**
 * Tests for Audit Logging
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createViolationEntry,
  logViolation,
  getViolationsByUser,
  getViolationsByRequest,
  getViolationsByType,
  getViolationsByClause,
  getAllViolations,
  getViolationCount,
  clearAllViolations,
  onViolation,
  pruneOldViolations,
  exportViolations,
  importViolations,
} from '../logging/audit';
import type { ViolationLogEntry, ConstitutionalViolationEvent } from '../types';

describe('Audit Logging', () => {
  beforeEach(() => {
    clearAllViolations();
  });

  describe('createViolationEntry', () => {
    it('should create a violation entry with all fields', () => {
      const entry = createViolationEntry(
        'DATA_ACCESS_ATTEMPT',
        'USER_INPUT',
        'INTENT_FILTER',
        undefined,
        'test input',
        'req_123',
        'user_456'
      );

      expect(entry.violationType).toBe('DATA_ACCESS_ATTEMPT');
      expect(entry.sourceType).toBe('USER_INPUT');
      expect(entry.context.detectionMethod).toBe('INTENT_FILTER');
      expect(entry.requestId).toBe('req_123');
      expect(entry.userId).toBe('user_456');
      expect(entry.timestamp).toBeDefined();
      expect(entry.clauseViolated).toBe('USER_DATA_SOVEREIGNTY');
    });

    it('should infer clause from violation type', () => {
      const dataEntry = createViolationEntry(
        'DATA_ACCESS_ATTEMPT',
        'USER_INPUT',
        'INTENT_FILTER'
      );
      expect(dataEntry.clauseViolated).toBe('USER_DATA_SOVEREIGNTY');

      const identityEntry = createViolationEntry(
        'IDENTITY_MASKING_ATTEMPT',
        'MODEL_OUTPUT',
        'OUTPUT_VALIDATION'
      );
      expect(identityEntry.clauseViolated).toBe('IDENTITY_TRANSPARENCY');

      const honestyEntry = createViolationEntry(
        'HONESTY_BYPASS_ATTEMPT',
        'MODEL_OUTPUT',
        'OUTPUT_VALIDATION'
      );
      expect(honestyEntry.clauseViolated).toBe('BASELINE_HONESTY');
    });

    it('should sanitize input snippets', () => {
      const entry = createViolationEntry(
        'DATA_ACCESS_ATTEMPT',
        'USER_INPUT',
        'INTENT_FILTER',
        undefined,
        'Contact me at test@example.com or 555-123-4567'
      );

      expect(entry.context.inputSnippet).not.toContain('test@example.com');
      expect(entry.context.inputSnippet).not.toContain('555-123-4567');
      expect(entry.context.inputSnippet).toContain('[REDACTED]');
    });

    it('should truncate long snippets', () => {
      const longInput = 'x'.repeat(500);
      const entry = createViolationEntry(
        'DATA_ACCESS_ATTEMPT',
        'USER_INPUT',
        'INTENT_FILTER',
        undefined,
        longInput
      );

      expect(entry.context.inputSnippet!.length).toBeLessThan(250);
      expect(entry.context.inputSnippet).toContain('[truncated]');
    });
  });

  describe('logViolation', () => {
    it('should store violations', async () => {
      const entry = createViolationEntry(
        'DATA_ACCESS_ATTEMPT',
        'USER_INPUT',
        'INTENT_FILTER'
      );

      await logViolation(entry);

      expect(getViolationCount()).toBe(1);
    });

    it('should emit events to listeners', async () => {
      const events: ConstitutionalViolationEvent[] = [];
      onViolation((event) => events.push(event));

      const entry = createViolationEntry(
        'DATA_ACCESS_ATTEMPT',
        'USER_INPUT',
        'INTENT_FILTER'
      );

      await logViolation(entry);

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('CONSTITUTIONAL_VIOLATION');
      expect(events[0].violation).toBe(entry);
    });
  });

  describe('Query functions', () => {
    beforeEach(async () => {
      // Add some test violations
      await logViolation(
        createViolationEntry(
          'DATA_ACCESS_ATTEMPT',
          'USER_INPUT',
          'INTENT_FILTER',
          undefined,
          undefined,
          'req_1',
          'user_a'
        )
      );

      await logViolation(
        createViolationEntry(
          'IDENTITY_MASKING_ATTEMPT',
          'MODEL_OUTPUT',
          'OUTPUT_VALIDATION',
          undefined,
          undefined,
          'req_2',
          'user_a'
        )
      );

      await logViolation(
        createViolationEntry(
          'DATA_ACCESS_ATTEMPT',
          'PLUGIN',
          'SANDBOX_BOUNDARY',
          'plugin_x',
          undefined,
          'req_3',
          'user_b'
        )
      );
    });

    it('should filter by user', () => {
      const violations = getViolationsByUser('user_a');
      expect(violations).toHaveLength(2);
    });

    it('should filter by request', () => {
      const violations = getViolationsByRequest('req_1');
      expect(violations).toHaveLength(1);
    });

    it('should filter by type', () => {
      const violations = getViolationsByType('DATA_ACCESS_ATTEMPT');
      expect(violations).toHaveLength(2);
    });

    it('should filter by clause', () => {
      const violations = getViolationsByClause('USER_DATA_SOVEREIGNTY');
      expect(violations).toHaveLength(2);
    });

    it('should return all violations', () => {
      const violations = getAllViolations();
      expect(violations).toHaveLength(3);
    });
  });

  describe('Event subscription', () => {
    it('should allow unsubscribing', async () => {
      const events: ConstitutionalViolationEvent[] = [];
      const unsubscribe = onViolation((event) => events.push(event));

      await logViolation(
        createViolationEntry('DATA_ACCESS_ATTEMPT', 'USER_INPUT', 'INTENT_FILTER')
      );

      expect(events).toHaveLength(1);

      unsubscribe();

      await logViolation(
        createViolationEntry('DATA_ACCESS_ATTEMPT', 'USER_INPUT', 'INTENT_FILTER')
      );

      expect(events).toHaveLength(1); // Should not have increased
    });
  });

  describe('Maintenance functions', () => {
    it('should clear all violations', async () => {
      await logViolation(
        createViolationEntry('DATA_ACCESS_ATTEMPT', 'USER_INPUT', 'INTENT_FILTER')
      );

      expect(getViolationCount()).toBe(1);

      clearAllViolations();

      expect(getViolationCount()).toBe(0);
    });

    it('should export and import violations', async () => {
      await logViolation(
        createViolationEntry('DATA_ACCESS_ATTEMPT', 'USER_INPUT', 'INTENT_FILTER')
      );

      const exported = exportViolations();
      clearAllViolations();

      expect(getViolationCount()).toBe(0);

      importViolations(exported);

      expect(getViolationCount()).toBe(1);
    });
  });
});
