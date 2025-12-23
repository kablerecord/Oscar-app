/**
 * Tests for Memory Vault Privacy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectPatterns,
  applyRedactionRule,
  applyRedactionRules,
  getDefaultRedactionRules,
  containsSensitiveInfo,
  cleanupRedactedText,
} from '../privacy/redaction';
import {
  logAccess,
  getAllLogs,
  getLogsByUser,
  getLogsByRequester,
  getUserAccessStats,
  getPluginAccessStats,
  pruneOldLogs,
  clearLogs,
} from '../privacy/audit';
import {
  checkAccess,
  getAllowedCategories,
  generateSanitizedSummary,
  processPluginRequest,
  getUserPrivacySettings,
  updateUserPrivacySettings,
  clearUserPrivacySettings,
} from '../privacy/gate';
import type { SemanticMemory, MemorySource, RedactionRule } from '../types';

describe('Redaction', () => {
  describe('detectPatterns', () => {
    it('should detect PII patterns', () => {
      const text = 'My SSN is 123-45-6789 and email is test@example.com';
      const matches = detectPatterns(text, 'pii');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect financial patterns', () => {
      const text = 'Revenue is $1,000,000 and profit was $50,000';
      const matches = detectPatterns(text, 'financial');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect family patterns', () => {
      const text = "My wife Sarah and my son John are coming";
      const matches = detectPatterns(text, 'family');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect medical patterns', () => {
      const text = 'I was diagnosed with diabetes last year';
      const matches = detectPatterns(text, 'medical');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should detect location patterns', () => {
      const text = 'I live at 123 Main Street, Springfield, IL 62701';
      const matches = detectPatterns(text, 'location');
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('applyRedactionRule', () => {
    it('should remove PII', () => {
      const text = 'Email me at test@example.com';
      const rule: RedactionRule = { category: 'pii', action: 'remove' };
      const result = applyRedactionRule(text, rule);
      expect(result.text).not.toContain('test@example.com');
      expect(result.redactionsApplied).toBeGreaterThan(0);
    });

    it('should generalize financial info', () => {
      const text = 'Revenue is $10,000,000';
      const rule: RedactionRule = { category: 'financial', action: 'generalize' };
      const result = applyRedactionRule(text, rule);
      expect(result.text).toContain('[');
    });

    it('should hash when requested', () => {
      const text = 'Contact test@example.com';
      const rule: RedactionRule = { category: 'pii', action: 'hash' };
      const result = applyRedactionRule(text, rule);
      expect(result.text).toContain('[REDACTED:');
    });
  });

  describe('applyRedactionRules', () => {
    it('should apply multiple rules', () => {
      const text = 'Email: test@example.com, Revenue: $1,000,000';
      const rules: RedactionRule[] = [
        { category: 'pii', action: 'remove' },
        { category: 'financial', action: 'generalize' },
      ];
      const result = applyRedactionRules(text, rules);
      expect(result.text).not.toContain('test@example.com');
      expect(result.redactionsApplied).toContain('pii');
      expect(result.redactionsApplied).toContain('financial');
    });
  });

  describe('getDefaultRedactionRules', () => {
    it('should return more rules for lower tiers', () => {
      const noneRules = getDefaultRedactionRules('none');
      const fullRules = getDefaultRedactionRules('full');
      expect(noneRules.length).toBeGreaterThan(fullRules.length);
    });
  });

  describe('containsSensitiveInfo', () => {
    it('should detect sensitive content', () => {
      const text = 'My SSN is 123-45-6789';
      const result = containsSensitiveInfo(text);
      expect(result.hasSensitive).toBe(true);
      expect(result.categories).toContain('pii');
    });

    it('should not flag clean content', () => {
      const text = 'Hello, how are you today?';
      const result = containsSensitiveInfo(text);
      expect(result.hasSensitive).toBe(false);
    });
  });

  describe('cleanupRedactedText', () => {
    it('should clean up empty brackets', () => {
      const text = 'Hello [] world  []';
      const cleaned = cleanupRedactedText(text);
      expect(cleaned).toBe('Hello world');
    });

    it('should collapse multiple spaces', () => {
      const text = 'Hello    world';
      const cleaned = cleanupRedactedText(text);
      expect(cleaned).toBe('Hello world');
    });
  });
});

describe('Audit', () => {
  beforeEach(() => {
    clearLogs();
  });

  describe('logAccess', () => {
    it('should log access events', () => {
      const entry = logAccess({
        requesterId: 'plugin-1',
        requesterType: 'plugin',
        userId: 'user-123',
        categoriesRequested: ['business_info'],
        categoriesProvided: ['business_info'],
        redactionsApplied: ['pii'],
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Query functions', () => {
    beforeEach(() => {
      logAccess({
        requesterId: 'plugin-1',
        requesterType: 'plugin',
        userId: 'user-1',
        categoriesRequested: ['business_info'],
        categoriesProvided: ['business_info'],
        redactionsApplied: [],
      });
      logAccess({
        requesterId: 'plugin-2',
        requesterType: 'plugin',
        userId: 'user-1',
        categoriesRequested: ['personal_info'],
        categoriesProvided: [],
        redactionsApplied: ['all'],
      });
      logAccess({
        requesterId: 'component-1',
        requesterType: 'component',
        userId: 'user-2',
        categoriesRequested: ['preferences'],
        categoriesProvided: ['preferences'],
        redactionsApplied: [],
      });
    });

    it('should get all logs', () => {
      expect(getAllLogs().length).toBe(3);
    });

    it('should get logs by user', () => {
      const logs = getLogsByUser('user-1');
      expect(logs.length).toBe(2);
    });

    it('should get logs by requester', () => {
      const logs = getLogsByRequester('plugin-1');
      expect(logs.length).toBe(1);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      logAccess({
        requesterId: 'plugin-1',
        requesterType: 'plugin',
        userId: 'user-1',
        categoriesRequested: ['business_info'],
        categoriesProvided: ['business_info'],
        redactionsApplied: ['pii'],
      });
      logAccess({
        requesterId: 'plugin-1',
        requesterType: 'plugin',
        userId: 'user-2',
        categoriesRequested: ['preferences'],
        categoriesProvided: ['preferences'],
        redactionsApplied: [],
      });
    });

    it('should calculate user access stats', () => {
      const stats = getUserAccessStats('user-1');
      expect(stats.totalAccesses).toBe(1);
      expect(stats.redactionCount).toBe(1);
    });

    it('should calculate plugin access stats', () => {
      const stats = getPluginAccessStats('plugin-1');
      expect(stats.totalAccesses).toBe(2);
      expect(stats.uniqueUsers).toBe(2);
    });
  });

  describe('pruneOldLogs', () => {
    it('should prune old logs', async () => {
      // Create a log
      logAccess({
        requesterId: 'test',
        requesterType: 'plugin',
        userId: 'user-1',
        categoriesRequested: [],
        categoriesProvided: [],
        redactionsApplied: [],
      });

      // Wait a tiny bit so the log is "old" relative to a 0-day retention
      await new Promise(resolve => setTimeout(resolve, 10));

      // Prune with -1 day (future cutoff, should remove all)
      const pruned = pruneOldLogs(-1);
      expect(pruned).toBe(1);
      expect(getAllLogs().length).toBe(0);
    });
  });
});

describe('Privacy Gate', () => {
  beforeEach(() => {
    clearLogs();
    clearUserPrivacySettings('user-123');
  });

  const createMemory = (content: string, category: string): SemanticMemory => {
    const source: MemorySource = {
      type: 'conversation',
      sourceId: 'conv-123',
      timestamp: new Date(),
      confidence: 0.9,
    };

    return {
      id: `mem_${Date.now()}`,
      content,
      embedding: [],
      category: category as any,
      source,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      utilityScore: 0.5,
      confidence: 0.8,
      metadata: {
        topics: [],
        relatedMemoryIds: [],
        contradicts: [],
        supersedes: [],
      },
    };
  };

  describe('checkAccess', () => {
    it('should allow user access to own data', () => {
      const decision = checkAccess(
        'user-123',
        'user',
        'user-123',
        'personal_info',
        'read'
      );
      expect(decision.allowed).toBe(true);
      expect(decision.tier).toBe('full');
    });

    it('should allow component access to allowed categories', () => {
      const decision = checkAccess(
        'component-1',
        'component',
        'user-123',
        'business_info',
        'read'
      );
      expect(decision.allowed).toBe(true);
    });

    it('should deny plugin access to personal_info', () => {
      const decision = checkAccess(
        'plugin-1',
        'plugin',
        'user-123',
        'personal_info',
        'read'
      );
      expect(decision.allowed).toBe(false);
    });

    it('should restrict write access', () => {
      const decision = checkAccess(
        'plugin-1',
        'plugin',
        'user-123',
        'business_info',
        'write'
      );
      expect(decision.allowed).toBe(false);
    });
  });

  describe('getAllowedCategories', () => {
    it('should return no categories for none tier', () => {
      const allowed = getAllowedCategories('none', ['business_info', 'preferences']);
      expect(allowed.length).toBe(0);
    });

    it('should return minimal categories', () => {
      const allowed = getAllowedCategories('minimal', ['preferences', 'business_info']);
      expect(allowed).toContain('preferences');
      expect(allowed).not.toContain('business_info');
    });

    it('should return contextual categories', () => {
      const allowed = getAllowedCategories('contextual', [
        'preferences',
        'business_info',
        'personal_info',
      ]);
      expect(allowed).toContain('preferences');
      expect(allowed).toContain('business_info');
      expect(allowed).not.toContain('personal_info');
    });
  });

  describe('generateSanitizedSummary', () => {
    it('should generate summary with redactions', () => {
      const memories = [
        createMemory('User email is test@example.com', 'business_info'),
        createMemory('Revenue is $1,000,000', 'business_info'),
      ];

      const summary = generateSanitizedSummary(memories, 'contextual');
      expect(summary.content).not.toContain('test@example.com');
      expect(summary.categories).toContain('business_info');
    });

    it('should return empty summary for no memories', () => {
      const summary = generateSanitizedSummary([], 'full');
      expect(summary.content).toBe('No relevant information available.');
    });
  });

  describe('processPluginRequest', () => {
    it('should process plugin requests with filtering', () => {
      const memories = [
        createMemory('Business info', 'business_info'),
        createMemory('Personal info', 'personal_info'),
      ];

      const summary = processPluginRequest(
        {
          pluginId: 'test-plugin',
          requestedCategories: ['business_info', 'personal_info'],
          purpose: 'testing',
        },
        'user-123',
        memories
      );

      // personal_info should be filtered out
      expect(summary.categories).not.toContain('personal_info');
    });

    it('should log the access', () => {
      processPluginRequest(
        {
          pluginId: 'test-plugin',
          requestedCategories: ['business_info'],
          purpose: 'testing',
        },
        'user-123',
        []
      );

      const logs = getLogsByRequester('test-plugin');
      expect(logs.length).toBe(1);
    });
  });

  describe('Privacy Settings', () => {
    it('should get default settings', () => {
      const settings = getUserPrivacySettings('user-123');
      expect(settings.piiRedaction).toBe(true);
      expect(settings.pluginAccessTier).toBe('contextual');
    });

    it('should update settings', () => {
      updateUserPrivacySettings('user-123', { pluginAccessTier: 'minimal' });
      const settings = getUserPrivacySettings('user-123');
      expect(settings.pluginAccessTier).toBe('minimal');
    });

    it('should preserve other settings on update', () => {
      updateUserPrivacySettings('user-123', { pluginAccessTier: 'minimal' });
      const settings = getUserPrivacySettings('user-123');
      expect(settings.piiRedaction).toBe(true); // Default preserved
    });
  });
});
