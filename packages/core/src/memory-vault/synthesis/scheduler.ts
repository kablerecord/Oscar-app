/**
 * Synthesis Scheduler
 *
 * Runs background jobs for synthesis and utility updates.
 * In production, this would be replaced with proper job scheduling (Bull, Agenda, etc.)
 *
 * AUTONOMOUS DECISION: Using setInterval for simplicity.
 * Production deployment should use a proper job queue with persistence.
 */

import * as synthesisQueue from './queue';
import { updateUtilityScores } from './retrospective';
import { getUnsynthesizedConversations, getAllVaults } from '../vault';

// ============================================================================
// Types
// ============================================================================

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  /** How often to process synthesis queue (ms) */
  synthesisIntervalMs: number;
  /** How often to update utility scores (ms) */
  utilityUpdateIntervalMs: number;
  /** How often to check for orphaned conversations (ms) */
  orphanCheckIntervalMs: number;
  /** Maximum jobs to process per interval */
  batchSize: number;
  /** Enable verbose logging */
  verbose: boolean;
}

/**
 * Scheduler status
 */
export interface SchedulerStatus {
  running: boolean;
  startedAt: Date | null;
  synthesisJobsProcessed: number;
  utilityUpdatesRun: number;
  orphansQueued: number;
  lastSynthesisRun: Date | null;
  lastUtilityRun: Date | null;
  lastOrphanRun: Date | null;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: SchedulerConfig = {
  synthesisIntervalMs: 10_000,       // Every 10 seconds
  utilityUpdateIntervalMs: 86400_000, // Daily (24 hours)
  orphanCheckIntervalMs: 3600_000,   // Hourly
  batchSize: 10,
  verbose: false,
};

// ============================================================================
// Scheduler State
// ============================================================================

let config: SchedulerConfig = { ...DEFAULT_CONFIG };
let synthesisTimer: ReturnType<typeof setInterval> | null = null;
let utilityTimer: ReturnType<typeof setInterval> | null = null;
let orphanTimer: ReturnType<typeof setInterval> | null = null;

const status: SchedulerStatus = {
  running: false,
  startedAt: null,
  synthesisJobsProcessed: 0,
  utilityUpdatesRun: 0,
  orphansQueued: 0,
  lastSynthesisRun: null,
  lastUtilityRun: null,
  lastOrphanRun: null,
};

// ============================================================================
// Scheduler Control
// ============================================================================

/**
 * Start the scheduler
 */
export function startScheduler(userConfig: Partial<SchedulerConfig> = {}): void {
  if (status.running) {
    log('Scheduler already running');
    return;
  }

  config = { ...DEFAULT_CONFIG, ...userConfig };
  status.running = true;
  status.startedAt = new Date();

  log(`Starting scheduler with config:`, config);

  // Synthesis queue processor
  synthesisTimer = setInterval(async () => {
    await processSynthesisQueue();
  }, config.synthesisIntervalMs);

  // Utility score updater
  utilityTimer = setInterval(async () => {
    await runUtilityUpdate();
  }, config.utilityUpdateIntervalMs);

  // Orphan conversation detector
  orphanTimer = setInterval(async () => {
    await checkOrphanedConversations();
  }, config.orphanCheckIntervalMs);

  log('Scheduler started');
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (!status.running) {
    log('Scheduler not running');
    return;
  }

  if (synthesisTimer) {
    clearInterval(synthesisTimer);
    synthesisTimer = null;
  }

  if (utilityTimer) {
    clearInterval(utilityTimer);
    utilityTimer = null;
  }

  if (orphanTimer) {
    clearInterval(orphanTimer);
    orphanTimer = null;
  }

  status.running = false;
  log('Scheduler stopped');
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): SchedulerStatus {
  return { ...status };
}

/**
 * Update scheduler configuration (requires restart)
 */
export function updateSchedulerConfig(newConfig: Partial<SchedulerConfig>): void {
  const wasRunning = status.running;

  if (wasRunning) {
    stopScheduler();
  }

  config = { ...config, ...newConfig };

  if (wasRunning) {
    startScheduler(config);
  }
}

// ============================================================================
// Job Processors
// ============================================================================

/**
 * Process pending synthesis jobs
 */
async function processSynthesisQueue(): Promise<void> {
  const pending = synthesisQueue.getPendingCount();

  if (pending === 0) {
    return;
  }

  log(`Processing ${pending} pending synthesis jobs`);
  status.lastSynthesisRun = new Date();

  try {
    const result = await synthesisQueue.processAll(config.batchSize);
    status.synthesisJobsProcessed += result.processed;

    log(`Processed ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed`);
  } catch (error) {
    console.error('[Scheduler] Synthesis queue processing error:', error);
  }
}

/**
 * Run utility score updates
 */
async function runUtilityUpdate(): Promise<void> {
  log('Running utility score update');
  status.lastUtilityRun = new Date();

  try {
    const result = await updateUtilityScores();
    status.utilityUpdatesRun++;

    log(`Utility update complete: ${result.memoriesUpdated} memories updated, avg change: ${result.averageScoreChange.toFixed(4)}`);
  } catch (error) {
    console.error('[Scheduler] Utility update error:', error);
  }
}

/**
 * Check for orphaned conversations (ended but never synthesized)
 */
async function checkOrphanedConversations(): Promise<void> {
  log('Checking for orphaned conversations');
  status.lastOrphanRun = new Date();

  try {
    const vaults = getAllVaults();
    let totalOrphans = 0;

    for (const vault of vaults) {
      const orphans = getUnsynthesizedConversations(
        vault.userId,
        new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      );

      for (const conversation of orphans) {
        await synthesisQueue.enqueue(conversation.id, vault.userId, 'low');
        totalOrphans++;
      }

      if (orphans.length > 0) {
        log(`Queued ${orphans.length} orphaned conversations for user ${vault.userId}`);
      }
    }

    status.orphansQueued += totalOrphans;

    if (totalOrphans > 0) {
      log(`Total orphans queued: ${totalOrphans}`);
    }
  } catch (error) {
    console.error('[Scheduler] Orphan check error:', error);
  }
}

// ============================================================================
// Manual Triggers
// ============================================================================

/**
 * Manually trigger synthesis queue processing
 */
export async function triggerSynthesisProcessing(): Promise<void> {
  await processSynthesisQueue();
}

/**
 * Manually trigger utility score update
 */
export async function triggerUtilityUpdate(): Promise<void> {
  await runUtilityUpdate();
}

/**
 * Manually trigger orphan check
 */
export async function triggerOrphanCheck(): Promise<void> {
  await checkOrphanedConversations();
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Log message if verbose mode enabled
 */
function log(...args: unknown[]): void {
  if (config.verbose) {
    console.log('[Scheduler]', ...args);
  }
}

