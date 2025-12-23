/**
 * Tests for Constitutional Clauses
 */

import { describe, it, expect } from 'vitest';
import {
  IMMUTABLE_CONSTITUTION,
  USER_DATA_SOVEREIGNTY,
  IDENTITY_TRANSPARENCY,
  BASELINE_HONESTY,
  CLAUSE_MAP,
  getClauseById,
  isImmutableClause,
  getClauseIds,
} from '../clauses';

describe('Constitutional Clauses', () => {
  describe('IMMUTABLE_CONSTITUTION', () => {
    it('should contain exactly 3 clauses', () => {
      expect(IMMUTABLE_CONSTITUTION).toHaveLength(3);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(IMMUTABLE_CONSTITUTION)).toBe(true);
    });

    it('should contain all three required clauses', () => {
      const ids = IMMUTABLE_CONSTITUTION.map((c) => c.id);
      expect(ids).toContain('USER_DATA_SOVEREIGNTY');
      expect(ids).toContain('IDENTITY_TRANSPARENCY');
      expect(ids).toContain('BASELINE_HONESTY');
    });
  });

  describe('USER_DATA_SOVEREIGNTY', () => {
    it('should be immutable', () => {
      expect(USER_DATA_SOVEREIGNTY.immutable).toBe(true);
    });

    it('should use SILENT_INTERCEPT action', () => {
      expect(USER_DATA_SOVEREIGNTY.violationResponse.action).toBe(
        'SILENT_INTERCEPT'
      );
    });

    it('should have CRITICAL log level', () => {
      expect(USER_DATA_SOVEREIGNTY.violationResponse.logLevel).toBe('CRITICAL');
    });

    it('should NOT disclose reason', () => {
      expect(USER_DATA_SOVEREIGNTY.violationResponse.discloseReason).toBe(
        false
      );
    });

    it('should enforce via INTENT_FILTER and SANDBOX_BOUNDARY', () => {
      expect(USER_DATA_SOVEREIGNTY.enforcement).toContain('INTENT_FILTER');
      expect(USER_DATA_SOVEREIGNTY.enforcement).toContain('SANDBOX_BOUNDARY');
    });
  });

  describe('IDENTITY_TRANSPARENCY', () => {
    it('should be immutable', () => {
      expect(IDENTITY_TRANSPARENCY.immutable).toBe(true);
    });

    it('should use GRACEFUL_DECLINE action', () => {
      expect(IDENTITY_TRANSPARENCY.violationResponse.action).toBe(
        'GRACEFUL_DECLINE'
      );
    });

    it('should have a user message', () => {
      expect(IDENTITY_TRANSPARENCY.violationResponse.userMessage).toBeDefined();
      expect(IDENTITY_TRANSPARENCY.violationResponse.userMessage).toBe(
        'I need to be upfront with you about something.'
      );
    });

    it('should enforce via OUTPUT_VALIDATION', () => {
      expect(IDENTITY_TRANSPARENCY.enforcement).toContain('OUTPUT_VALIDATION');
    });
  });

  describe('BASELINE_HONESTY', () => {
    it('should be immutable', () => {
      expect(BASELINE_HONESTY.immutable).toBe(true);
    });

    it('should use ABSTAIN action', () => {
      expect(BASELINE_HONESTY.violationResponse.action).toBe('ABSTAIN');
    });

    it('should enforce via OUTPUT_VALIDATION', () => {
      expect(BASELINE_HONESTY.enforcement).toContain('OUTPUT_VALIDATION');
    });
  });

  describe('CLAUSE_MAP', () => {
    it('should be frozen', () => {
      expect(Object.isFrozen(CLAUSE_MAP)).toBe(true);
    });

    it('should contain all three clauses', () => {
      expect(CLAUSE_MAP.USER_DATA_SOVEREIGNTY).toBe(USER_DATA_SOVEREIGNTY);
      expect(CLAUSE_MAP.IDENTITY_TRANSPARENCY).toBe(IDENTITY_TRANSPARENCY);
      expect(CLAUSE_MAP.BASELINE_HONESTY).toBe(BASELINE_HONESTY);
    });
  });

  describe('getClauseById', () => {
    it('should return the correct clause', () => {
      expect(getClauseById('USER_DATA_SOVEREIGNTY')).toBe(USER_DATA_SOVEREIGNTY);
      expect(getClauseById('IDENTITY_TRANSPARENCY')).toBe(IDENTITY_TRANSPARENCY);
      expect(getClauseById('BASELINE_HONESTY')).toBe(BASELINE_HONESTY);
    });

    it('should return undefined for unknown clause', () => {
      expect(getClauseById('UNKNOWN_CLAUSE')).toBeUndefined();
    });
  });

  describe('isImmutableClause', () => {
    it('should return true for immutable clauses', () => {
      expect(isImmutableClause('USER_DATA_SOVEREIGNTY')).toBe(true);
      expect(isImmutableClause('IDENTITY_TRANSPARENCY')).toBe(true);
      expect(isImmutableClause('BASELINE_HONESTY')).toBe(true);
    });

    it('should return false for unknown clauses', () => {
      expect(isImmutableClause('UNKNOWN_CLAUSE')).toBe(false);
    });
  });

  describe('getClauseIds', () => {
    it('should return all clause IDs', () => {
      const ids = getClauseIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('USER_DATA_SOVEREIGNTY');
      expect(ids).toContain('IDENTITY_TRANSPARENCY');
      expect(ids).toContain('BASELINE_HONESTY');
    });
  });
});
