/**
 * VCR Repository - Version Control Resolution Logging
 *
 * Tracks all changes to project guidance with full audit history.
 */

import type { VCR, VCRAction, MentorScriptItem } from '../types';

// In-memory storage (would be PKV in production)
const vcrStore = new Map<string, VCR[]>();

/**
 * Log a VCR entry
 */
export function logVCR(
  projectId: string,
  version: number,
  action: VCRAction,
  itemId: string,
  previousState?: MentorScriptItem,
  newState?: MentorScriptItem
): VCR {
  const vcr: VCR = {
    version,
    timestamp: new Date(),
    action,
    itemId,
    previousState: previousState ? { ...previousState } : undefined,
    newState: newState ? { ...newState } : undefined,
  };

  // Get or create history
  const history = vcrStore.get(projectId) || [];
  history.push(vcr);
  vcrStore.set(projectId, history);

  return vcr;
}

/**
 * Get VCR history for a project
 */
export function getVCRHistory(projectId: string): VCR[] {
  return vcrStore.get(projectId) || [];
}

/**
 * Get VCR history in reverse order (newest first)
 */
export function getVCRHistoryReversed(projectId: string): VCR[] {
  const history = getVCRHistory(projectId);
  return [...history].reverse();
}

/**
 * Get a specific VCR by version
 */
export function getVCRByVersion(projectId: string, version: number): VCR | null {
  const history = getVCRHistory(projectId);
  return history.find((vcr) => vcr.version === version) || null;
}

/**
 * Get the latest VCR entry
 */
export function getLatestVCR(projectId: string): VCR | null {
  const history = getVCRHistory(projectId);
  if (history.length === 0) {
    return null;
  }
  return history[history.length - 1];
}

/**
 * Get VCRs for a specific item
 */
export function getVCRsForItem(projectId: string, itemId: string): VCR[] {
  const history = getVCRHistory(projectId);
  return history.filter((vcr) => vcr.itemId === itemId);
}

/**
 * Get VCRs since a specific version
 */
export function getVCRsSinceVersion(
  projectId: string,
  sinceVersion: number
): VCR[] {
  const history = getVCRHistory(projectId);
  return history.filter((vcr) => vcr.version > sinceVersion);
}

/**
 * Get VCRs by action type
 */
export function getVCRsByAction(
  projectId: string,
  action: VCRAction
): VCR[] {
  const history = getVCRHistory(projectId);
  return history.filter((vcr) => vcr.action === action);
}

/**
 * Get VCRs within a time range
 */
export function getVCRsInTimeRange(
  projectId: string,
  startTime: Date,
  endTime: Date
): VCR[] {
  const history = getVCRHistory(projectId);
  return history.filter(
    (vcr) => vcr.timestamp >= startTime && vcr.timestamp <= endTime
  );
}

/**
 * Count VCRs by action type
 */
export function countVCRsByAction(projectId: string): Record<VCRAction, number> {
  const history = getVCRHistory(projectId);
  const counts: Record<VCRAction, number> = { add: 0, edit: 0, remove: 0 };

  for (const vcr of history) {
    counts[vcr.action]++;
  }

  return counts;
}

/**
 * Get the current version number for a project
 */
export function getCurrentVersion(projectId: string): number {
  const latestVCR = getLatestVCR(projectId);
  return latestVCR ? latestVCR.version : 0;
}

/**
 * Check if a version exists
 */
export function versionExists(projectId: string, version: number): boolean {
  const history = getVCRHistory(projectId);
  return history.some((vcr) => vcr.version === version);
}

/**
 * Get all available versions
 */
export function getAvailableVersions(projectId: string): number[] {
  const history = getVCRHistory(projectId);
  return history.map((vcr) => vcr.version);
}

/**
 * Clear VCR history for a project (for testing)
 */
export function clearVCRHistory(projectId: string): void {
  vcrStore.delete(projectId);
}

/**
 * Clear all VCR history (for testing)
 */
export function clearAllVCRHistory(): void {
  vcrStore.clear();
}
