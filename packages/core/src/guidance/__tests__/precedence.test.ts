/**
 * Tests for Precedence Arbitration
 */

import { describe, it, expect } from 'vitest';
import {
  PRECEDENCE_ORDER,
  getPrecedenceRank,
  comparePrecedence,
  resolveGuidanceConflict,
  groupSourcesByType,
  canOverride,
  isConstitutional,
  isUserDefined,
  isPluginGuidance,
  isBriefingScript,
  filterOverriddenSources,
  detectConflicts,
  getPrecedenceExplanation,
  formatPrecedenceChain,
} from '../arbitration/precedence';
import {
  mergeGuidanceLayers,
  extractTopic,
  buildGuidanceSources,
  getOverriddenPluginGuidance,
  countByLayer,
  getMergedSummary,
  validateMergedGuidance,
  formatMergedGuidanceDebug,
} from '../arbitration/merger';
import type { GuidanceSource, MentorScriptItem } from '../types';

describe('Precedence', () => {
  describe('PRECEDENCE_ORDER', () => {
    it('should have correct order', () => {
      expect(PRECEDENCE_ORDER[0]).toBe('constitutional');
      expect(PRECEDENCE_ORDER[1]).toBe('user_mentorscript');
      expect(PRECEDENCE_ORDER[2]).toBe('plugin');
      expect(PRECEDENCE_ORDER[3]).toBe('briefingscript');
    });
  });

  describe('getPrecedenceRank', () => {
    it('should return correct ranks', () => {
      expect(getPrecedenceRank('constitutional')).toBe(0);
      expect(getPrecedenceRank('user_mentorscript')).toBe(1);
      expect(getPrecedenceRank('plugin')).toBe(2);
      expect(getPrecedenceRank('briefingscript')).toBe(3);
    });
  });

  describe('comparePrecedence', () => {
    it('should compare correctly', () => {
      expect(comparePrecedence('constitutional', 'user_mentorscript')).toBeLessThan(0);
      expect(comparePrecedence('plugin', 'constitutional')).toBeGreaterThan(0);
      expect(comparePrecedence('user_mentorscript', 'user_mentorscript')).toBe(0);
    });
  });

  describe('resolveGuidanceConflict', () => {
    it('should return highest precedence source', () => {
      const sources: GuidanceSource[] = [
        { type: 'plugin', content: 'Plugin rule', sourceId: 'p1' },
        { type: 'constitutional', content: 'Constitutional rule', sourceId: 'c1' },
        { type: 'user_mentorscript', content: 'User rule', sourceId: 'u1' },
      ];

      const winner = resolveGuidanceConflict(sources);
      expect(winner.type).toBe('constitutional');
    });

    it('should throw for empty sources', () => {
      expect(() => resolveGuidanceConflict([])).toThrow();
    });

    it('should return single source', () => {
      const sources: GuidanceSource[] = [
        { type: 'plugin', content: 'Plugin rule', sourceId: 'p1' },
      ];

      const winner = resolveGuidanceConflict(sources);
      expect(winner.type).toBe('plugin');
    });
  });

  describe('groupSourcesByType', () => {
    it('should group sources correctly', () => {
      const sources: GuidanceSource[] = [
        { type: 'plugin', content: 'Plugin 1', sourceId: 'p1' },
        { type: 'plugin', content: 'Plugin 2', sourceId: 'p2' },
        { type: 'user_mentorscript', content: 'User 1', sourceId: 'u1' },
      ];

      const grouped = groupSourcesByType(sources);
      expect(grouped.get('plugin')).toHaveLength(2);
      expect(grouped.get('user_mentorscript')).toHaveLength(1);
    });
  });

  describe('canOverride', () => {
    it('should correctly determine override capability', () => {
      expect(canOverride('constitutional', 'user_mentorscript')).toBe(true);
      expect(canOverride('user_mentorscript', 'plugin')).toBe(true);
      expect(canOverride('plugin', 'constitutional')).toBe(false);
    });
  });

  describe('Type Checks', () => {
    const constitutional: GuidanceSource = { type: 'constitutional', content: '', sourceId: '' };
    const user: GuidanceSource = { type: 'user_mentorscript', content: '', sourceId: '' };
    const plugin: GuidanceSource = { type: 'plugin', content: '', sourceId: '' };
    const briefing: GuidanceSource = { type: 'briefingscript', content: '', sourceId: '' };

    it('should identify constitutional', () => {
      expect(isConstitutional(constitutional)).toBe(true);
      expect(isConstitutional(user)).toBe(false);
    });

    it('should identify user defined', () => {
      expect(isUserDefined(user)).toBe(true);
      expect(isUserDefined(plugin)).toBe(false);
    });

    it('should identify plugin guidance', () => {
      expect(isPluginGuidance(plugin)).toBe(true);
      expect(isPluginGuidance(briefing)).toBe(false);
    });

    it('should identify briefing script', () => {
      expect(isBriefingScript(briefing)).toBe(true);
      expect(isBriefingScript(constitutional)).toBe(false);
    });
  });

  describe('filterOverriddenSources', () => {
    it('should filter out overridden sources', () => {
      const sources: GuidanceSource[] = [
        { type: 'user_mentorscript', content: 'Use code style X', sourceId: 'u1' },
        { type: 'plugin', content: 'Use code style Y', sourceId: 'p1' },
      ];

      const filtered = filterOverriddenSources(sources, extractTopic);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('user_mentorscript');
    });

    it('should keep non-conflicting sources', () => {
      const sources: GuidanceSource[] = [
        { type: 'user_mentorscript', content: 'Code formatting rules', sourceId: 'u1' },
        { type: 'plugin', content: 'Security guidelines', sourceId: 'p1' },
      ];

      const filtered = filterOverriddenSources(sources, extractTopic);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicts on same topic', () => {
      const sources: GuidanceSource[] = [
        { type: 'user_mentorscript', content: 'Format code with tabs', sourceId: 'u1' },
        { type: 'plugin', content: 'Format code with spaces', sourceId: 'p1' },
      ];

      const conflicts = detectConflicts(sources, extractTopic);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should not detect conflicts on different topics', () => {
      const sources: GuidanceSource[] = [
        { type: 'user_mentorscript', content: 'Security requirements', sourceId: 'u1' },
        { type: 'plugin', content: 'API design patterns', sourceId: 'p1' },
      ];

      const conflicts = detectConflicts(sources, extractTopic);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getPrecedenceExplanation', () => {
    it('should provide explanations', () => {
      expect(getPrecedenceExplanation('constitutional')).toContain('cannot be overridden');
      expect(getPrecedenceExplanation('user_mentorscript')).toContain('overrides');
      expect(getPrecedenceExplanation('plugin')).toContain('overridden');
      expect(getPrecedenceExplanation('briefingscript')).toContain('lowest');
    });
  });

  describe('formatPrecedenceChain', () => {
    it('should format chain in order', () => {
      const sources: GuidanceSource[] = [
        { type: 'briefingscript', content: 'Briefing content', sourceId: 'b1' },
        { type: 'constitutional', content: 'Constitutional content', sourceId: 'c1' },
      ];

      const formatted = formatPrecedenceChain(sources);
      expect(formatted.indexOf('constitutional')).toBeLessThan(
        formatted.indexOf('briefingscript')
      );
    });
  });
});

describe('Merger', () => {
  const createItem = (id: string, rule: string): MentorScriptItem => ({
    id,
    rule,
    source: 'user_defined',
    created: new Date(),
    appliedCount: 0,
    priority: 5,
  });

  describe('extractTopic', () => {
    it('should extract code topic', () => {
      expect(extractTopic('Format code with tabs')).toBe('code');
      expect(extractTopic('Implement function correctly')).toBe('code');
    });

    it('should extract formatting topic', () => {
      expect(extractTopic('Use proper formatting')).toBe('formatting');
      expect(extractTopic('Structure the output')).toBe('formatting');
    });

    it('should extract other topics', () => {
      expect(extractTopic('Ask clarifying questions')).toBe('interaction');
      expect(extractTopic('Be more formal in tone')).toBe('tone');
      expect(extractTopic('Debug the error')).toBe('debugging');
    });
  });

  describe('mergeGuidanceLayers', () => {
    it('should merge all layers', () => {
      const constitutional = ['Never violate privacy'];
      const userMentorScript = [createItem('u1', 'Use full files')];
      const pluginGuidance = ['Default formatting'];
      const briefingScript = ['Focus on testing'];

      const merged = mergeGuidanceLayers(
        constitutional,
        userMentorScript,
        pluginGuidance,
        briefingScript
      );

      expect(merged.merged).toContain('Constitutional');
      expect(merged.merged).toContain('Project Guidance');
      expect(merged.merged).toContain('Plugin Defaults');
      expect(merged.merged).toContain('This Session');
    });

    it('should exclude overridden plugin guidance', () => {
      const userMentorScript = [createItem('u1', 'Format code with tabs')];
      const pluginGuidance = ['Format code with spaces']; // Same topic

      const merged = mergeGuidanceLayers([], userMentorScript, pluginGuidance, []);

      expect(merged.merged).toContain('tabs');
      expect(merged.merged).not.toContain('spaces');
    });

    it('should handle empty layers', () => {
      const merged = mergeGuidanceLayers([], [], [], []);
      expect(merged.merged).toBe('');
    });
  });

  describe('buildGuidanceSources', () => {
    it('should build sources array', () => {
      const sources = buildGuidanceSources(
        ['Constitutional rule'],
        [createItem('u1', 'User rule')],
        ['Plugin rule'],
        ['Briefing rule']
      );

      expect(sources).toHaveLength(4);
      expect(sources.map((s) => s.type)).toContain('constitutional');
      expect(sources.map((s) => s.type)).toContain('user_mentorscript');
      expect(sources.map((s) => s.type)).toContain('plugin');
      expect(sources.map((s) => s.type)).toContain('briefingscript');
    });
  });

  describe('getOverriddenPluginGuidance', () => {
    it('should identify overridden plugins', () => {
      const userMentorScript = [createItem('u1', 'Format code properly')];
      const pluginGuidance = ['Format code differently'];

      const overridden = getOverriddenPluginGuidance(userMentorScript, pluginGuidance);

      expect(overridden).toHaveLength(1);
      expect(overridden[0].plugin).toContain('differently');
      expect(overridden[0].overriddenBy.id).toBe('u1');
    });
  });

  describe('countByLayer', () => {
    it('should count items per layer', () => {
      const merged = mergeGuidanceLayers(
        ['Rule 1', 'Rule 2'],
        [createItem('u1', 'User 1')],
        ['Plugin 1', 'Plugin 2', 'Plugin 3'],
        []
      );

      const counts = countByLayer(merged);
      expect(counts.constitutional).toBe(2);
      expect(counts.user_mentorscript).toBe(1);
      expect(counts.plugin).toBe(3);
      expect(counts.briefingscript).toBe(0);
    });
  });

  describe('getMergedSummary', () => {
    it('should provide summary', () => {
      const merged = mergeGuidanceLayers(
        ['Constitutional'],
        [createItem('u1', 'User')],
        [],
        []
      );

      const summary = getMergedSummary(merged);
      expect(summary).toContain('2 guidance items');
      expect(summary).toContain('1 constitutional');
      expect(summary).toContain('1 user');
    });
  });

  describe('validateMergedGuidance', () => {
    it('should validate valid guidance', () => {
      const merged = mergeGuidanceLayers(
        ['Constitutional rule'],
        [createItem('u1', 'User rule')],
        [],
        []
      );

      const validation = validateMergedGuidance(merged);
      expect(validation.isValid).toBe(true);
    });

    it('should flag empty guidance', () => {
      const merged = mergeGuidanceLayers([], [], [], []);
      const validation = validateMergedGuidance(merged);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Merged guidance is empty');
    });
  });

  describe('formatMergedGuidanceDebug', () => {
    it('should format debug output', () => {
      const merged = mergeGuidanceLayers(
        ['Constitutional rule'],
        [createItem('u1', 'User rule')],
        ['Plugin rule'],
        ['Briefing rule']
      );

      const debug = formatMergedGuidanceDebug(merged);
      expect(debug).toContain('Constitutional (1)');
      expect(debug).toContain('User MentorScript (1)');
      expect(debug).toContain('Plugin (1)');
      expect(debug).toContain('BriefingScript (1)');
    });
  });
});
