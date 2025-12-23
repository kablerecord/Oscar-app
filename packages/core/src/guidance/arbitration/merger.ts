/**
 * Guidance Merger - Combine all guidance layers
 *
 * Merges Constitutional, User MentorScript, Plugin, and BriefingScript layers.
 */

import type {
  MentorScriptItem,
  MergedGuidance,
  GuidanceSource,
  GuidanceSourceType,
} from '../types';
import {
  PRECEDENCE_ORDER,
  filterOverriddenSources,
  detectConflicts,
} from './precedence';

/**
 * Extract topic from guidance content
 * Used to detect when user guidance overrides plugin guidance
 */
export function extractTopic(content: string): string {
  const lowerContent = content.toLowerCase();

  // Common topic categories
  const topicPatterns: [RegExp, string][] = [
    [/code|function|file|implement/i, 'code'],
    [/format|style|structure|layout/i, 'formatting'],
    [/ask|question|clarif|confirm/i, 'interaction'],
    [/tone|voice|formal|casual/i, 'tone'],
    [/debug|error|fix|bug/i, 'debugging'],
    [/test|testing|spec/i, 'testing'],
    [/document|comment|explain/i, 'documentation'],
    [/api|endpoint|request|response/i, 'api'],
    [/database|db|query|sql/i, 'database'],
    [/security|auth|permission/i, 'security'],
  ];

  for (const [pattern, topic] of topicPatterns) {
    if (pattern.test(lowerContent)) {
      return topic;
    }
  }

  // Default: use first few significant words
  const words = content
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)
    .slice(0, 3);

  return words.join('_') || 'general';
}

/**
 * Merge guidance layers into a single context string
 */
export function mergeGuidanceLayers(
  constitutional: string[],
  userMentorScript: MentorScriptItem[],
  pluginGuidance: string[],
  briefingScript: string[]
): MergedGuidance {
  // Constitutional always included in full
  let merged = '';

  if (constitutional.length > 0) {
    merged = '## Constitutional Framework\n';
    merged += constitutional.join('\n\n');
    merged += '\n\n';
  }

  // User MentorScript (may override plugin)
  if (userMentorScript.length > 0) {
    merged += '## Project Guidance\n';
    merged += userMentorScript.map((item) => `- ${item.rule}`).join('\n');
    merged += '\n\n';
  }

  // Plugin guidance (only items not overridden by user)
  const userRuleTopics = userMentorScript.map((item) => extractTopic(item.rule));
  const nonOverriddenPluginGuidance = pluginGuidance.filter(
    (pg) => !userRuleTopics.some((topic) => extractTopic(pg) === topic)
  );

  if (nonOverriddenPluginGuidance.length > 0) {
    merged += '## Plugin Defaults\n';
    merged += nonOverriddenPluginGuidance.map((g) => `- ${g}`).join('\n');
    merged += '\n\n';
  }

  // BriefingScript (session-specific)
  if (briefingScript.length > 0) {
    merged += '## This Session\n';
    merged += briefingScript.join('\n');
    merged += '\n';
  }

  return {
    constitutional,
    userMentorScript,
    pluginGuidance,
    briefingScript,
    merged: merged.trim(),
  };
}

/**
 * Build guidance sources array for conflict detection
 */
export function buildGuidanceSources(
  constitutional: string[],
  userMentorScript: MentorScriptItem[],
  pluginGuidance: string[],
  briefingScript: string[]
): GuidanceSource[] {
  const sources: GuidanceSource[] = [];

  for (let i = 0; i < constitutional.length; i++) {
    sources.push({
      type: 'constitutional',
      content: constitutional[i],
      sourceId: `const_${i}`,
    });
  }

  for (const item of userMentorScript) {
    sources.push({
      type: 'user_mentorscript',
      content: item.rule,
      sourceId: item.id,
    });
  }

  for (let i = 0; i < pluginGuidance.length; i++) {
    sources.push({
      type: 'plugin',
      content: pluginGuidance[i],
      sourceId: `plugin_${i}`,
    });
  }

  for (let i = 0; i < briefingScript.length; i++) {
    sources.push({
      type: 'briefingscript',
      content: briefingScript[i],
      sourceId: `briefing_${i}`,
    });
  }

  return sources;
}

/**
 * Get overridden plugin guidance (for debugging)
 */
export function getOverriddenPluginGuidance(
  userMentorScript: MentorScriptItem[],
  pluginGuidance: string[]
): { plugin: string; overriddenBy: MentorScriptItem }[] {
  const overridden: { plugin: string; overriddenBy: MentorScriptItem }[] = [];

  for (const pg of pluginGuidance) {
    const pluginTopic = extractTopic(pg);

    for (const item of userMentorScript) {
      if (extractTopic(item.rule) === pluginTopic) {
        overridden.push({ plugin: pg, overriddenBy: item });
        break;
      }
    }
  }

  return overridden;
}

/**
 * Count guidance by layer
 */
export function countByLayer(merged: MergedGuidance): Record<GuidanceSourceType, number> {
  return {
    constitutional: merged.constitutional.length,
    user_mentorscript: merged.userMentorScript.length,
    plugin: merged.pluginGuidance.length,
    briefingscript: merged.briefingScript.length,
  };
}

/**
 * Get merged guidance summary
 */
export function getMergedSummary(merged: MergedGuidance): string {
  const counts = countByLayer(merged);
  const total =
    counts.constitutional +
    counts.user_mentorscript +
    counts.plugin +
    counts.briefingscript;

  return (
    `${total} guidance items: ` +
    `${counts.constitutional} constitutional, ` +
    `${counts.user_mentorscript} user, ` +
    `${counts.plugin} plugin, ` +
    `${counts.briefingscript} session`
  );
}

/**
 * Validate merged guidance
 */
export function validateMergedGuidance(merged: MergedGuidance): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for empty merge
  if (merged.merged.trim().length === 0) {
    issues.push('Merged guidance is empty');
  }

  // Check for very long merged content
  const wordCount = merged.merged.split(/\s+/).length;
  if (wordCount > 2000) {
    issues.push(`Merged guidance is very long (${wordCount} words)`);
  }

  // Check for potential conflicts
  const sources = buildGuidanceSources(
    merged.constitutional,
    merged.userMentorScript,
    merged.pluginGuidance,
    merged.briefingScript
  );

  const conflicts = detectConflicts(sources, extractTopic);
  if (conflicts.length > 0) {
    for (const conflict of conflicts) {
      issues.push(
        `Potential conflict on topic "${conflict.topic}" between ${conflict.sources.length} sources`
      );
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Format merged guidance for debugging
 */
export function formatMergedGuidanceDebug(merged: MergedGuidance): string {
  const lines: string[] = ['=== Merged Guidance Debug ===', ''];

  lines.push(`Constitutional (${merged.constitutional.length}):`);
  for (const c of merged.constitutional) {
    lines.push(`  - ${c.substring(0, 50)}...`);
  }

  lines.push('');
  lines.push(`User MentorScript (${merged.userMentorScript.length}):`);
  for (const item of merged.userMentorScript) {
    lines.push(`  - [${item.source}] ${item.rule.substring(0, 50)}...`);
  }

  lines.push('');
  lines.push(`Plugin (${merged.pluginGuidance.length}):`);
  for (const p of merged.pluginGuidance) {
    lines.push(`  - ${p.substring(0, 50)}...`);
  }

  lines.push('');
  lines.push(`BriefingScript (${merged.briefingScript.length}):`);
  for (const b of merged.briefingScript) {
    lines.push(`  - ${b.substring(0, 50)}...`);
  }

  lines.push('');
  lines.push(`Total merged length: ${merged.merged.length} chars`);

  return lines.join('\n');
}
