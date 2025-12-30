/**
 * Learning Layer Scheduler Initialization
 *
 * Starts the OSQR background scheduler for:
 * - Processing synthesis queue (extract facts from conversations)
 * - Updating utility scores (memory relevance learning)
 * - Checking for orphaned conversations (never synthesized)
 *
 * Call ensureSchedulerRunning() on first request to start background processing.
 */

import { MemoryVault } from '@osqr/core';
import { featureFlags } from './config';

let schedulerStarted = false;
let schedulerStartTime: Date | null = null;

/**
 * Start the scheduler if not already running
 */
export function ensureSchedulerRunning(): boolean {
  if (!featureFlags.enableMemoryVault) {
    return false;
  }

  if (schedulerStarted) {
    return true;
  }

  try {
    MemoryVault.startScheduler({
      synthesisIntervalMs: 10_000,        // Process queue every 10 seconds
      utilityUpdateIntervalMs: 86400_000, // Update utility scores daily
      orphanCheckIntervalMs: 3600_000,    // Check for unprocessed conversations hourly
      batchSize: 10,                      // Process up to 10 jobs per interval
      verbose: process.env.NODE_ENV === 'development',
    });

    schedulerStarted = true;
    schedulerStartTime = new Date();
    console.log('[OSQR] Learning Layer scheduler started');

    return true;
  } catch (error) {
    console.error('[OSQR] Failed to start scheduler:', error);
    return false;
  }
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopScheduler(): void {
  if (!schedulerStarted) {
    return;
  }

  try {
    MemoryVault.stopScheduler();
    schedulerStarted = false;
    console.log('[OSQR] Learning Layer scheduler stopped');
  } catch (error) {
    console.error('[OSQR] Failed to stop scheduler:', error);
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return schedulerStarted;
}

/**
 * Get scheduler status
 */
export function getSchedulerInfo(): {
  running: boolean;
  startedAt: Date | null;
  uptime: number | null;
} {
  return {
    running: schedulerStarted,
    startedAt: schedulerStartTime,
    uptime: schedulerStartTime ? Date.now() - schedulerStartTime.getTime() : null,
  };
}

/**
 * Force process synthesis queue now (for manual triggers)
 */
export async function triggerSynthesisNow(): Promise<void> {
  if (!featureFlags.enableMemoryVault) {
    return;
  }

  try {
    await MemoryVault.triggerSynthesisProcessing();
  } catch (error) {
    console.error('[OSQR] Manual synthesis trigger failed:', error);
  }
}

/**
 * Force update utility scores now (for manual triggers)
 */
export async function triggerUtilityUpdateNow(): Promise<void> {
  if (!featureFlags.enableMemoryVault) {
    return;
  }

  try {
    await MemoryVault.triggerUtilityUpdate();
  } catch (error) {
    console.error('[OSQR] Manual utility update failed:', error);
  }
}
