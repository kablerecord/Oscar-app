/**
 * Guidance Repository - PKV CRUD Operations
 *
 * Manages project guidance storage with version control.
 */

import type {
  ProjectGuidance,
  MentorScriptItem,
  ReferenceDoc,
  VCR,
  CreateItemRequest,
  UpdateItemRequest,
  GuidanceConfig,
} from '../types';
import { DEFAULT_GUIDANCE_CONFIG } from '../types';
import { logVCR, getVCRHistory } from './vcr.repository';

// In-memory storage (would be PKV in production)
const guidanceStore = new Map<string, ProjectGuidance>();

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `ms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get project guidance by project ID
 */
export function getProjectGuidance(projectId: string): ProjectGuidance | null {
  return guidanceStore.get(projectId) || null;
}

/**
 * Create or initialize project guidance
 */
export function createProjectGuidance(projectId: string): ProjectGuidance {
  const guidance: ProjectGuidance = {
    projectId,
    version: 0,
    lastUpdated: new Date(),
    mentorScripts: [],
    referenceDocs: [],
  };

  guidanceStore.set(projectId, guidance);
  return guidance;
}

/**
 * Ensure project guidance exists
 */
export function ensureProjectGuidance(projectId: string): ProjectGuidance {
  const existing = getProjectGuidance(projectId);
  if (existing) {
    return existing;
  }
  return createProjectGuidance(projectId);
}

/**
 * Add a MentorScript item
 */
export function addMentorScriptItem(
  projectId: string,
  request: CreateItemRequest,
  config: Partial<GuidanceConfig> = {}
): MentorScriptItem {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  const guidance = ensureProjectGuidance(projectId);

  // Check hard limit
  if (guidance.mentorScripts.length >= cfg.hardLimit) {
    throw new Error(
      `Cannot add item: hard limit of ${cfg.hardLimit} items reached`
    );
  }

  const item: MentorScriptItem = {
    id: generateId(),
    rule: request.rule,
    source: request.source || 'user_defined',
    originalCorrection: request.originalCorrection,
    promotedFromSession: request.sessionId,
    created: new Date(),
    appliedCount: 0,
    priority: request.priority ?? cfg.defaultPriority,
  };

  // Log VCR
  const vcr = logVCR(projectId, guidance.version + 1, 'add', item.id, undefined, item);

  // Update guidance
  guidance.mentorScripts.push(item);
  guidance.version = vcr.version;
  guidance.lastUpdated = new Date();

  return item;
}

/**
 * Update a MentorScript item
 */
export function updateMentorScriptItem(
  projectId: string,
  itemId: string,
  request: UpdateItemRequest
): MentorScriptItem | null {
  const guidance = getProjectGuidance(projectId);
  if (!guidance) {
    return null;
  }

  const itemIndex = guidance.mentorScripts.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) {
    return null;
  }

  const previousState = { ...guidance.mentorScripts[itemIndex] };
  const item = guidance.mentorScripts[itemIndex];

  // Apply updates
  if (request.rule !== undefined) {
    item.rule = request.rule;
  }
  if (request.priority !== undefined) {
    item.priority = Math.max(1, Math.min(10, request.priority));
  }

  // Log VCR
  const vcr = logVCR(
    projectId,
    guidance.version + 1,
    'edit',
    itemId,
    previousState,
    item
  );

  // Update guidance
  guidance.version = vcr.version;
  guidance.lastUpdated = new Date();

  return item;
}

/**
 * Remove a MentorScript item
 */
export function removeMentorScriptItem(
  projectId: string,
  itemId: string
): VCR | null {
  const guidance = getProjectGuidance(projectId);
  if (!guidance) {
    return null;
  }

  const itemIndex = guidance.mentorScripts.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) {
    return null;
  }

  const previousState = guidance.mentorScripts[itemIndex];

  // Log VCR
  const vcr = logVCR(
    projectId,
    guidance.version + 1,
    'remove',
    itemId,
    previousState,
    undefined
  );

  // Remove item
  guidance.mentorScripts.splice(itemIndex, 1);
  guidance.version = vcr.version;
  guidance.lastUpdated = new Date();

  return vcr;
}

/**
 * Get a specific MentorScript item
 */
export function getMentorScriptItem(
  projectId: string,
  itemId: string
): MentorScriptItem | null {
  const guidance = getProjectGuidance(projectId);
  if (!guidance) {
    return null;
  }

  return guidance.mentorScripts.find((i) => i.id === itemId) || null;
}

/**
 * Increment applied count for an item
 */
export function incrementAppliedCount(
  projectId: string,
  itemId: string
): number {
  const guidance = getProjectGuidance(projectId);
  if (!guidance) {
    return 0;
  }

  const item = guidance.mentorScripts.find((i) => i.id === itemId);
  if (!item) {
    return 0;
  }

  item.appliedCount++;
  return item.appliedCount;
}

/**
 * Batch increment applied counts
 */
export function batchIncrementAppliedCount(
  projectId: string,
  itemIds: string[]
): number {
  let updated = 0;
  for (const itemId of itemIds) {
    if (incrementAppliedCount(projectId, itemId) > 0) {
      updated++;
    }
  }
  return updated;
}

/**
 * Add a reference document
 */
export function addReferenceDoc(
  projectId: string,
  path: string,
  context: string
): ReferenceDoc {
  const guidance = ensureProjectGuidance(projectId);

  const doc: ReferenceDoc = {
    path,
    context,
  };

  guidance.referenceDocs.push(doc);
  guidance.lastUpdated = new Date();

  return doc;
}

/**
 * Remove a reference document
 */
export function removeReferenceDoc(
  projectId: string,
  path: string
): boolean {
  const guidance = getProjectGuidance(projectId);
  if (!guidance) {
    return false;
  }

  const index = guidance.referenceDocs.findIndex((d) => d.path === path);
  if (index === -1) {
    return false;
  }

  guidance.referenceDocs.splice(index, 1);
  guidance.lastUpdated = new Date();

  return true;
}

/**
 * Rollback to a specific version
 */
export function rollbackToVersion(
  projectId: string,
  targetVersion: number
): ProjectGuidance | null {
  const history = getVCRHistory(projectId);
  const guidance = getProjectGuidance(projectId);

  if (!guidance || history.length === 0) {
    return null;
  }

  // Find VCRs newer than target version (to undo)
  const toUndo = history
    .filter((vcr) => vcr.version > targetVersion)
    .sort((a, b) => b.version - a.version); // Newest first

  // Undo each VCR in reverse order
  for (const vcr of toUndo) {
    undoVCR(guidance, vcr);
  }

  // Update version
  guidance.version = targetVersion;
  guidance.lastUpdated = new Date();

  return guidance;
}

/**
 * Undo a single VCR
 */
function undoVCR(guidance: ProjectGuidance, vcr: VCR): void {
  switch (vcr.action) {
    case 'add':
      // Remove the added item
      const addIndex = guidance.mentorScripts.findIndex(
        (i) => i.id === vcr.itemId
      );
      if (addIndex !== -1) {
        guidance.mentorScripts.splice(addIndex, 1);
      }
      break;

    case 'edit':
      // Restore previous state
      if (vcr.previousState) {
        const editIndex = guidance.mentorScripts.findIndex(
          (i) => i.id === vcr.itemId
        );
        if (editIndex !== -1) {
          guidance.mentorScripts[editIndex] = { ...vcr.previousState };
        }
      }
      break;

    case 'remove':
      // Restore the removed item
      if (vcr.previousState) {
        guidance.mentorScripts.push({ ...vcr.previousState });
      }
      break;
  }
}

/**
 * Get items by source
 */
export function getItemsBySource(
  projectId: string,
  source: 'user_defined' | 'inferred'
): MentorScriptItem[] {
  const guidance = getProjectGuidance(projectId);
  if (!guidance) {
    return [];
  }

  return guidance.mentorScripts.filter((i) => i.source === source);
}

/**
 * Get items sorted by priority
 */
export function getItemsByPriority(projectId: string): MentorScriptItem[] {
  const guidance = getProjectGuidance(projectId);
  if (!guidance) {
    return [];
  }

  return [...guidance.mentorScripts].sort((a, b) => b.priority - a.priority);
}

/**
 * Get items sorted by applied count
 */
export function getItemsByUsage(projectId: string): MentorScriptItem[] {
  const guidance = getProjectGuidance(projectId);
  if (!guidance) {
    return [];
  }

  return [...guidance.mentorScripts].sort(
    (a, b) => b.appliedCount - a.appliedCount
  );
}

/**
 * Check if guidance is at or over soft limit
 */
export function isAtSoftLimit(
  projectId: string,
  config: Partial<GuidanceConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  const guidance = getProjectGuidance(projectId);
  if (!guidance) {
    return false;
  }

  return guidance.mentorScripts.length >= cfg.softLimit;
}

/**
 * Check if guidance is at hard limit
 */
export function isAtHardLimit(
  projectId: string,
  config: Partial<GuidanceConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  const guidance = getProjectGuidance(projectId);
  if (!guidance) {
    return false;
  }

  return guidance.mentorScripts.length >= cfg.hardLimit;
}

/**
 * Clear all guidance for a project (for testing)
 */
export function clearProjectGuidance(projectId: string): void {
  guidanceStore.delete(projectId);
}

/**
 * Clear all guidance (for testing)
 */
export function clearAllGuidance(): void {
  guidanceStore.clear();
}
