/**
 * Tests for Secondary Rules Management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRuleset,
  getRuleById,
  getRulesByCategory,
  addRule,
  updateRule,
  deleteRule,
  getRuleHistory,
  getChangeLog,
  getRuleAtTime,
  rollbackRule,
  onRulesetModified,
  exportRuleset,
  importRuleset,
  resetRuleset,
  initializeDefaultRules,
} from '../rules/secondary';
import type { RulesetModifiedEvent } from '../types';

describe('Secondary Rules Management', () => {
  beforeEach(() => {
    resetRuleset();
  });

  describe('Basic CRUD operations', () => {
    it('should add a new rule', () => {
      const rule = addRule(
        'PLUGIN_BOUNDARY',
        'Test rule content',
        'test_user'
      );

      expect(rule.id).toBeDefined();
      expect(rule.category).toBe('PLUGIN_BOUNDARY');
      expect(rule.rule).toBe('Test rule content');
      expect(rule.createdAt).toBeDefined();
    });

    it('should get a rule by ID', () => {
      const added = addRule('DATA_ACCESS', 'Test rule', 'test_user');
      const retrieved = getRuleById(added.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(added.id);
    });

    it('should return undefined for unknown rule ID', () => {
      const result = getRuleById('unknown_id');
      expect(result).toBeUndefined();
    });

    it('should get rules by category', () => {
      addRule('PLUGIN_BOUNDARY', 'Rule 1', 'test_user');
      addRule('PLUGIN_BOUNDARY', 'Rule 2', 'test_user');
      addRule('DATA_ACCESS', 'Rule 3', 'test_user');

      const pluginRules = getRulesByCategory('PLUGIN_BOUNDARY');
      expect(pluginRules).toHaveLength(2);

      const dataRules = getRulesByCategory('DATA_ACCESS');
      expect(dataRules).toHaveLength(1);
    });

    it('should update a rule', async () => {
      const original = addRule('PLUGIN_BOUNDARY', 'Original content', 'test_user');
      const originalCreatedAt = original.createdAt;

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 5));

      const updated = updateRule(
        original.id,
        'Updated content',
        'Testing update',
        'test_user'
      );

      expect(updated).toBeDefined();
      expect(updated!.rule).toBe('Updated content');
      // Check modifiedAt is different from original createdAt (not from returned createdAt)
      expect(updated!.modifiedAt).not.toBe(originalCreatedAt);
    });

    it('should return null when updating unknown rule', () => {
      const result = updateRule('unknown', 'content', 'reason', 'user');
      expect(result).toBeNull();
    });

    it('should delete a rule', () => {
      const rule = addRule('PLUGIN_BOUNDARY', 'To be deleted', 'test_user');

      const deleted = deleteRule(rule.id, 'No longer needed', 'test_user');
      expect(deleted).toBe(true);

      const retrieved = getRuleById(rule.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return false when deleting unknown rule', () => {
      const result = deleteRule('unknown', 'reason', 'user');
      expect(result).toBe(false);
    });
  });

  describe('Version control', () => {
    it('should increment version on changes', () => {
      const initialVersion = getRuleset().version;

      addRule('PLUGIN_BOUNDARY', 'Test', 'user');

      const newVersion = getRuleset().version;
      expect(newVersion).not.toBe(initialVersion);
    });

    it('should track rule history', () => {
      const rule = addRule('PLUGIN_BOUNDARY', 'Version 1', 'user');
      updateRule(rule.id, 'Version 2', 'First update', 'user');
      updateRule(rule.id, 'Version 3', 'Second update', 'user');

      const history = getRuleHistory(rule.id);
      expect(history).toHaveLength(3); // Creation + 2 updates
    });

    it('should get full change log', () => {
      addRule('PLUGIN_BOUNDARY', 'Rule 1', 'user');
      addRule('DATA_ACCESS', 'Rule 2', 'user');

      const log = getChangeLog();
      expect(log).toHaveLength(2);
    });

    it('should get rule value at specific time', async () => {
      const rule = addRule('PLUGIN_BOUNDARY', 'Original', 'user');

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      const timeAfterCreation = new Date();

      await new Promise((resolve) => setTimeout(resolve, 10));
      updateRule(rule.id, 'Updated', 'reason', 'user');

      const valueAtTime = getRuleAtTime(rule.id, timeAfterCreation);
      expect(valueAtTime).toBe('Original');
    });

    it('should rollback to previous version', () => {
      const rule = addRule('PLUGIN_BOUNDARY', 'Version 1', 'user');
      const firstResolution = getRuleHistory(rule.id)[0];

      updateRule(rule.id, 'Version 2', 'update', 'user');

      const rolledBack = rollbackRule(
        rule.id,
        firstResolution.resolutionId,
        'Rolling back',
        'user'
      );

      expect(rolledBack).toBeDefined();
      expect(rolledBack!.rule).toBe('Version 1');
    });
  });

  describe('Event subscription', () => {
    it('should emit events on rule changes', () => {
      const events: RulesetModifiedEvent[] = [];
      onRulesetModified((event) => events.push(event));

      addRule('PLUGIN_BOUNDARY', 'Test', 'user');

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('RULESET_MODIFIED');
    });

    it('should allow unsubscribing', () => {
      const events: RulesetModifiedEvent[] = [];
      const unsubscribe = onRulesetModified((event) => events.push(event));

      addRule('PLUGIN_BOUNDARY', 'Test 1', 'user');
      expect(events).toHaveLength(1);

      unsubscribe();

      addRule('PLUGIN_BOUNDARY', 'Test 2', 'user');
      expect(events).toHaveLength(1); // Should not have increased
    });
  });

  describe('Persistence', () => {
    it('should export and import ruleset', () => {
      addRule('PLUGIN_BOUNDARY', 'Rule 1', 'user');
      addRule('DATA_ACCESS', 'Rule 2', 'user');

      const exported = exportRuleset();
      resetRuleset();

      expect(getRuleset().rules).toHaveLength(0);

      importRuleset(exported);

      expect(getRuleset().rules).toHaveLength(2);
    });

    it('should throw on invalid import', () => {
      expect(() => importRuleset('invalid json')).toThrow();
      expect(() => importRuleset('{}')).toThrow();
    });
  });

  describe('Default rules', () => {
    it('should initialize default rules', () => {
      initializeDefaultRules();

      const ruleset = getRuleset();
      expect(ruleset.rules.length).toBeGreaterThan(0);

      // Check we have rules in each category
      expect(getRulesByCategory('PLUGIN_BOUNDARY').length).toBeGreaterThan(0);
      expect(getRulesByCategory('DATA_ACCESS').length).toBeGreaterThan(0);
      expect(getRulesByCategory('HONESTY_TIER').length).toBeGreaterThan(0);
    });

    it('should not re-initialize if rules exist', () => {
      addRule('PLUGIN_BOUNDARY', 'Existing rule', 'user');
      const countBefore = getRuleset().rules.length;

      initializeDefaultRules();

      expect(getRuleset().rules.length).toBe(countBefore);
    });
  });
});
