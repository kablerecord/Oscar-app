/**
 * Guidance Wrapper - Real Implementation with Database Integration
 *
 * Connects oscar-app to the OSQR guidance system via Prisma.
 * Implements the "Mentorship-as-Code" paradigm for project-specific context.
 *
 * ERROR RECOVERY: On any error, returns empty guidance (fail safe).
 *
 * @see osqr/src/guidance/ for the core implementation
 */

import { prisma } from '@/lib/db/prisma';
import { featureFlags, guidanceConfig } from './config';

// ============================================================================
// Types
// ============================================================================

export interface GuidanceItem {
  id: string;
  type: 'rule' | 'preference' | 'constraint';
  content: string;
  priority: number;
  scope: string;
  active: boolean;
  source?: 'user_defined' | 'inferred';
  appliedCount?: number;
  fallback?: boolean;
  error?: string;
}

export interface GuidanceContext {
  items: GuidanceItem[];
  tokenCount: number;
  atLimit: boolean;
  suggestedConsolidations?: string[];
  fallback?: boolean;
  error?: string;
}

export interface BriefingItem {
  id: string;
  content: string;
  sessionId?: string;
  expiresAt?: Date;
}

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estimate token count for text
 * Rough estimate: ~4 characters per token
 */
export function estimateTokens(content: string): number {
  try {
    return Math.ceil(content.length / 4);
  } catch (error) {
    console.error('[Guidance] estimateTokens error:', error);
    return 0;
  }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get all guidance for a project
 * Loads MentorScripts and checks limits
 */
export async function getProjectGuidance(projectId: string): Promise<GuidanceContext> {
  if (!featureFlags.enableGuidance) {
    return { items: [], tokenCount: 0, atLimit: false };
  }

  try {
    // Load active mentor scripts for this project
    const mentorScripts = await prisma.mentorScript.findMany({
      where: {
        projectId,
        isActive: true,
      },
      orderBy: [
        { priority: 'desc' },
        { appliedCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Transform to GuidanceItems
    const items: GuidanceItem[] = mentorScripts.map(ms => ({
      id: ms.id,
      type: 'rule' as const,
      content: ms.content,
      priority: ms.priority,
      scope: 'project',
      active: ms.isActive,
      source: ms.source as 'user_defined' | 'inferred',
      appliedCount: ms.appliedCount,
    }));

    // Calculate token count
    const tokenCount = items.reduce(
      (sum, item) => sum + estimateTokens(item.content) + 5, // +5 for formatting overhead
      0
    );

    // Check limits
    const atLimit = items.length >= guidanceConfig.hardLimit;
    const nearLimit = items.length >= guidanceConfig.softLimit;

    // Suggest consolidations if near limit
    let suggestedConsolidations: string[] | undefined;
    if (nearLimit && !atLimit) {
      suggestedConsolidations = [
        `You have ${items.length} guidance rules. Consider consolidating similar rules.`,
        `${guidanceConfig.hardLimit - items.length} slots remaining before the limit.`,
      ];
    }

    return {
      items,
      tokenCount,
      atLimit,
      suggestedConsolidations,
    };
  } catch (error) {
    console.error('[Guidance] getProjectGuidance error:', error);
    return {
      items: [],
      tokenCount: 0,
      atLimit: false,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get guidance relevant to a specific query
 * Uses scoring to select most relevant items
 */
export async function getRelevantGuidance(
  projectId: string,
  query: string,
  maxItems: number = 5
): Promise<GuidanceItem[]> {
  if (!featureFlags.enableGuidance) {
    return [];
  }

  try {
    // Load all active mentor scripts
    const mentorScripts = await prisma.mentorScript.findMany({
      where: {
        projectId,
        isActive: true,
      },
    });

    if (mentorScripts.length === 0) {
      return [];
    }

    // Score each item for relevance
    const scored = mentorScripts.map(ms => ({
      item: ms,
      score: calculateRelevanceScore(ms.content, query, ms.priority, ms.appliedCount),
    }));

    // Sort by score and take top N
    scored.sort((a, b) => b.score - a.score);
    const topItems = scored.slice(0, maxItems);

    // Transform to GuidanceItems
    return topItems.map(({ item: ms }) => ({
      id: ms.id,
      type: 'rule' as const,
      content: ms.content,
      priority: ms.priority,
      scope: 'project',
      active: ms.isActive,
      source: ms.source as 'user_defined' | 'inferred',
      appliedCount: ms.appliedCount,
    }));
  } catch (error) {
    console.error('[Guidance] getRelevantGuidance error:', error);
    return [];
  }
}

/**
 * Calculate relevance score for a guidance item
 * Uses simplified Jaccard similarity + priority + frequency boosts
 */
function calculateRelevanceScore(
  ruleContent: string,
  query: string,
  priority: number,
  appliedCount: number
): number {
  // Extract significant words (3+ chars)
  const ruleWords = new Set(
    ruleContent
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 2)
  );
  const queryWords = new Set(
    query
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 2)
  );

  // Jaccard similarity for relevance
  const intersection = new Set([...ruleWords].filter(x => queryWords.has(x)));
  const union = new Set([...ruleWords, ...queryWords]);
  const relevance = union.size > 0 ? intersection.size / union.size : 0;

  // Keyword boosting
  let boost = 0;
  const codeKeywords = ['code', 'function', 'file', 'debug', 'error', 'fix', 'implement'];
  const formatKeywords = ['format', 'style', 'structure', 'layout'];
  const interactionKeywords = ['ask', 'question', 'clarify', 'explain'];

  if (codeKeywords.some(k => queryWords.has(k) && ruleWords.has(k))) boost += 0.2;
  if (formatKeywords.some(k => queryWords.has(k) && ruleWords.has(k))) boost += 0.15;
  if (interactionKeywords.some(k => queryWords.has(k) && ruleWords.has(k))) boost += 0.15;

  // Weights from config
  const { relevance: relevanceWeight, priority: priorityWeight } = guidanceConfig.scoringWeights;

  // Calculate weighted score
  const score =
    (relevance + boost) * relevanceWeight +
    (priority / 10) * priorityWeight +
    Math.min(appliedCount / 100, 1) * (1 - relevanceWeight - priorityWeight);

  return Math.min(1, score);
}

/**
 * Format guidance items for inclusion in system prompt
 * Respects 70% context budget
 */
export function formatGuidanceForPrompt(
  items: GuidanceItem[],
  maxTokens?: number
): string {
  try {
    if (items.length === 0) {
      return '';
    }

    const budget = maxTokens || guidanceConfig.maxTokens;
    const targetBudget = Math.floor(budget * 0.7); // 70% rule

    const lines: string[] = ['## Project Guidance', ''];
    let usedTokens = estimateTokens(lines.join('\n'));

    for (const item of items) {
      const line = `- ${item.content}`;
      const lineTokens = estimateTokens(line) + 2; // +2 for newline

      if (usedTokens + lineTokens > targetBudget) {
        // Budget exceeded, add truncation note
        lines.push('- (Additional guidance truncated due to context limits)');
        break;
      }

      lines.push(line);
      usedTokens += lineTokens;
    }

    return lines.join('\n');
  } catch (error) {
    console.error('[Guidance] formatGuidanceForPrompt error:', error);
    return '';
  }
}

/**
 * Get briefings for a project/session
 * Briefings are session-scoped, temporary guidance
 */
export async function getActiveBriefings(
  projectId: string,
  sessionId?: string
): Promise<BriefingItem[]> {
  if (!featureFlags.enableGuidance) {
    return [];
  }

  try {
    const now = new Date();

    const briefings = await prisma.briefingScript.findMany({
      where: {
        projectId,
        ...(sessionId ? { sessionId } : {}),
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return briefings.map(b => ({
      id: b.id,
      content: b.content,
      sessionId: b.sessionId ?? undefined,
      expiresAt: b.expiresAt ?? undefined,
    }));
  } catch (error) {
    console.error('[Guidance] getActiveBriefings error:', error);
    return [];
  }
}

/**
 * Format briefings for prompt inclusion
 */
export function formatBriefingsForPrompt(briefings: BriefingItem[]): string {
  if (briefings.length === 0) {
    return '';
  }

  const lines = ['## This Session', ''];
  for (const briefing of briefings) {
    lines.push(briefing.content);
  }

  return lines.join('\n');
}

// ============================================================================
// Limit Checking
// ============================================================================

/**
 * Check if project is at or near guidance limits
 */
export async function checkLimits(projectId: string): Promise<{
  nearSoftLimit: boolean;
  atHardLimit: boolean;
  itemsRemaining: number;
  currentCount: number;
}> {
  try {
    const count = await prisma.mentorScript.count({
      where: {
        projectId,
        isActive: true,
      },
    });

    return {
      nearSoftLimit: count >= guidanceConfig.softLimit,
      atHardLimit: count >= guidanceConfig.hardLimit,
      itemsRemaining: Math.max(0, guidanceConfig.hardLimit - count),
      currentCount: count,
    };
  } catch (error) {
    console.error('[Guidance] checkLimits error:', error);
    return {
      nearSoftLimit: false,
      atHardLimit: false,
      itemsRemaining: 0,
      currentCount: 0,
    };
  }
}

/**
 * Get context budget allocation
 */
export function getContextBudget(totalTokens: number): {
  guidanceBudget: number;
  remainingBudget: number;
} {
  try {
    const guidanceBudget = Math.floor(totalTokens * 0.7); // 70% for guidance
    return {
      guidanceBudget,
      remainingBudget: totalTokens - guidanceBudget,
    };
  } catch (error) {
    console.error('[Guidance] getContextBudget error:', error);
    return {
      guidanceBudget: 0,
      remainingBudget: totalTokens,
    };
  }
}

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Increment applied count for guidance items that were used in a response
 * Call this after a response is generated to track which rules are being applied
 */
export async function recordGuidanceUsage(itemIds: string[]): Promise<void> {
  if (!featureFlags.enableGuidance || itemIds.length === 0) {
    return;
  }

  try {
    await prisma.mentorScript.updateMany({
      where: {
        id: { in: itemIds },
      },
      data: {
        appliedCount: { increment: 1 },
      },
    });
  } catch (error) {
    console.error('[Guidance] recordGuidanceUsage error:', error);
  }
}

// ============================================================================
// CRUD Operations (for admin/UI)
// ============================================================================

/**
 * Add a new mentor script rule
 */
export async function addMentorScript(
  projectId: string,
  name: string,
  content: string,
  options: { priority?: number; source?: 'user_defined' | 'inferred' } = {}
): Promise<GuidanceItem | null> {
  try {
    // Check limit
    const { atHardLimit } = await checkLimits(projectId);
    if (atHardLimit) {
      console.warn('[Guidance] Cannot add: at hard limit');
      return null;
    }

    const created = await prisma.mentorScript.create({
      data: {
        projectId,
        name,
        content,
        priority: options.priority ?? 5,
        source: options.source ?? 'user_defined',
      },
    });

    return {
      id: created.id,
      type: 'rule',
      content: created.content,
      priority: created.priority,
      scope: 'project',
      active: created.isActive,
      source: created.source as 'user_defined' | 'inferred',
      appliedCount: created.appliedCount,
    };
  } catch (error) {
    console.error('[Guidance] addMentorScript error:', error);
    return null;
  }
}

/**
 * Add a briefing for a session
 */
export async function addBriefing(
  projectId: string,
  content: string,
  options: { sessionId?: string; expiresAt?: Date } = {}
): Promise<BriefingItem | null> {
  try {
    const created = await prisma.briefingScript.create({
      data: {
        projectId,
        content,
        sessionId: options.sessionId,
        expiresAt: options.expiresAt,
      },
    });

    return {
      id: created.id,
      content: created.content,
      sessionId: created.sessionId ?? undefined,
      expiresAt: created.expiresAt ?? undefined,
    };
  } catch (error) {
    console.error('[Guidance] addBriefing error:', error);
    return null;
  }
}

/**
 * Deactivate a mentor script (soft delete)
 */
export async function deactivateMentorScript(id: string): Promise<boolean> {
  try {
    await prisma.mentorScript.update({
      where: { id },
      data: { isActive: false },
    });
    return true;
  } catch (error) {
    console.error('[Guidance] deactivateMentorScript error:', error);
    return false;
  }
}

/**
 * Delete a briefing
 */
export async function deleteBriefing(id: string): Promise<boolean> {
  try {
    await prisma.briefingScript.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error('[Guidance] deleteBriefing error:', error);
    return false;
  }
}
