/**
 * Precedence Arbitration - Layer conflict resolution
 *
 * Resolves conflicts between guidance sources:
 * Constitutional > User MentorScript > Plugin > BriefingScript
 */

import type { GuidanceSource, GuidanceSourceType } from '../types';

/**
 * Precedence order (highest to lowest)
 */
export const PRECEDENCE_ORDER: GuidanceSourceType[] = [
  'constitutional',
  'user_mentorscript',
  'plugin',
  'briefingscript',
];

/**
 * Get precedence rank (lower = higher priority)
 */
export function getPrecedenceRank(type: GuidanceSourceType): number {
  const index = PRECEDENCE_ORDER.indexOf(type);
  return index === -1 ? PRECEDENCE_ORDER.length : index;
}

/**
 * Compare two source types by precedence
 * Returns negative if a has higher precedence, positive if b has higher
 */
export function comparePrecedence(
  a: GuidanceSourceType,
  b: GuidanceSourceType
): number {
  return getPrecedenceRank(a) - getPrecedenceRank(b);
}

/**
 * Resolve conflict between guidance sources
 * Returns the source with highest precedence
 */
export function resolveGuidanceConflict(
  sources: GuidanceSource[]
): GuidanceSource {
  if (sources.length === 0) {
    throw new Error('Cannot resolve conflict with empty sources array');
  }

  if (sources.length === 1) {
    return sources[0];
  }

  // Sort by precedence (highest first)
  const sorted = [...sources].sort((a, b) => comparePrecedence(a.type, b.type));

  return sorted[0];
}

/**
 * Group sources by type
 */
export function groupSourcesByType(
  sources: GuidanceSource[]
): Map<GuidanceSourceType, GuidanceSource[]> {
  const grouped = new Map<GuidanceSourceType, GuidanceSource[]>();

  for (const source of sources) {
    const existing = grouped.get(source.type) || [];
    existing.push(source);
    grouped.set(source.type, existing);
  }

  return grouped;
}

/**
 * Check if source type can override another
 */
export function canOverride(
  higherType: GuidanceSourceType,
  lowerType: GuidanceSourceType
): boolean {
  return getPrecedenceRank(higherType) < getPrecedenceRank(lowerType);
}

/**
 * Check if constitutional clause
 */
export function isConstitutional(source: GuidanceSource): boolean {
  return source.type === 'constitutional';
}

/**
 * Check if user-defined
 */
export function isUserDefined(source: GuidanceSource): boolean {
  return source.type === 'user_mentorscript';
}

/**
 * Check if plugin guidance
 */
export function isPluginGuidance(source: GuidanceSource): boolean {
  return source.type === 'plugin';
}

/**
 * Check if briefing script
 */
export function isBriefingScript(source: GuidanceSource): boolean {
  return source.type === 'briefingscript';
}

/**
 * Filter sources that are overridden by higher precedence sources
 */
export function filterOverriddenSources(
  sources: GuidanceSource[],
  getTopicFn: (content: string) => string
): GuidanceSource[] {
  const grouped = groupSourcesByType(sources);
  const result: GuidanceSource[] = [];
  const topicsUsed = new Set<string>();

  // Process in precedence order
  for (const type of PRECEDENCE_ORDER) {
    const typeSources = grouped.get(type) || [];

    for (const source of typeSources) {
      const topic = getTopicFn(source.content);

      // Only add if topic not already claimed by higher precedence
      if (!topicsUsed.has(topic)) {
        result.push(source);
        topicsUsed.add(topic);
      }
    }
  }

  return result;
}

/**
 * Detect conflicting sources (same topic, different types)
 */
export function detectConflicts(
  sources: GuidanceSource[],
  getTopicFn: (content: string) => string
): { topic: string; sources: GuidanceSource[] }[] {
  const topicMap = new Map<string, GuidanceSource[]>();

  for (const source of sources) {
    const topic = getTopicFn(source.content);
    const existing = topicMap.get(topic) || [];
    existing.push(source);
    topicMap.set(topic, existing);
  }

  // Return only topics with multiple sources
  const conflicts: { topic: string; sources: GuidanceSource[] }[] = [];

  for (const [topic, topicSources] of topicMap) {
    if (topicSources.length > 1) {
      conflicts.push({ topic, sources: topicSources });
    }
  }

  return conflicts;
}

/**
 * Get precedence explanation for a source type
 */
export function getPrecedenceExplanation(type: GuidanceSourceType): string {
  switch (type) {
    case 'constitutional':
      return 'Constitutional rules cannot be overridden and always take precedence.';
    case 'user_mentorscript':
      return 'User-defined project guidance overrides plugin defaults.';
    case 'plugin':
      return 'Plugin guidance applies unless overridden by user rules.';
    case 'briefingscript':
      return 'Session-specific guidance has lowest precedence.';
    default:
      return 'Unknown guidance type.';
  }
}

/**
 * Format precedence chain for debugging
 */
export function formatPrecedenceChain(sources: GuidanceSource[]): string {
  const sorted = [...sources].sort((a, b) => comparePrecedence(a.type, b.type));

  return sorted
    .map((s, i) => `${i + 1}. [${s.type}] ${s.content.substring(0, 50)}...`)
    .join('\n');
}
