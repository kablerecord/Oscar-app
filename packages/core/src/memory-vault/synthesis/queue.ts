/**
 * Synthesis Queue
 *
 * Manages async processing of conversations for fact extraction.
 * Supports retries, prioritization, and batch processing.
 *
 * AUTONOMOUS DECISION: Using in-memory queue for simplicity.
 * In production, this would use Redis, Bull, or a database-backed queue.
 */

import type { Conversation, SynthesisResult, SemanticMemory, MemorySource } from '../types';
import * as episodicStore from '../stores/episodic.store';
import * as semanticStore from '../stores/semantic.store';
import { generateEmbedding } from '../retrieval/embedding';
import { synthesizeWithLLM } from './llm-extractor';

// ============================================================================
// Types
// ============================================================================

/**
 * Priority levels for synthesis jobs
 */
export type SynthesisPriority = 'high' | 'normal' | 'low';

/**
 * Job status
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Synthesis job definition
 */
export interface SynthesisJob {
  id: string;
  conversationId: string;
  userId: string;
  priority: SynthesisPriority;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttemptAt: Date | null;
  status: JobStatus;
  error?: string;
  result?: SynthesisResult;
}

/**
 * Batch processing result
 */
export interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{
    jobId: string;
    success: boolean;
    result?: SynthesisResult;
    error?: string;
  }>;
}

// ============================================================================
// Queue Storage
// ============================================================================

/** In-memory job storage */
const jobs = new Map<string, SynthesisJob>();

/** Pending queue (job IDs ordered by priority and time) */
const pendingQueue: string[] = [];

/** Queue event callbacks */
type QueueEventCallback = (job: SynthesisJob) => void;
const eventCallbacks: Map<string, QueueEventCallback[]> = new Map();

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `synth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Enqueue a conversation for synthesis
 */
export async function enqueue(
  conversationId: string,
  userId: string,
  priority: SynthesisPriority = 'normal'
): Promise<string> {
  const jobId = generateJobId();

  const job: SynthesisJob = {
    id: jobId,
    conversationId,
    userId,
    priority,
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
    lastAttemptAt: null,
    status: 'pending',
  };

  jobs.set(jobId, job);

  // Insert based on priority
  if (priority === 'high') {
    pendingQueue.unshift(jobId);
  } else if (priority === 'low') {
    pendingQueue.push(jobId);
  } else {
    // Normal priority: insert after high priority items
    const insertIndex = pendingQueue.findIndex((id) => {
      const j = jobs.get(id);
      return j && j.priority === 'low';
    });
    if (insertIndex === -1) {
      pendingQueue.push(jobId);
    } else {
      pendingQueue.splice(insertIndex, 0, jobId);
    }
  }

  emitEvent('enqueued', job);
  return jobId;
}

/**
 * Dequeue the next job for processing
 */
export function dequeue(): SynthesisJob | null {
  const jobId = pendingQueue.shift();
  if (!jobId) return null;

  const job = jobs.get(jobId);
  if (!job) return null;

  job.status = 'processing';
  job.lastAttemptAt = new Date();
  jobs.set(jobId, job);

  return job;
}

/**
 * Get a job by ID
 */
export function getJob(jobId: string): SynthesisJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Get all jobs for a user
 */
export function getJobsForUser(userId: string): SynthesisJob[] {
  return Array.from(jobs.values()).filter((j) => j.userId === userId);
}

// ============================================================================
// Processing
// ============================================================================

/**
 * Process the next job in the queue
 */
export async function processNext(): Promise<SynthesisResult | null> {
  const job = dequeue();
  if (!job) return null;

  job.attempts++;

  try {
    // Get conversation
    const conversation = episodicStore.getConversation(job.conversationId);
    if (!conversation) {
      job.status = 'failed';
      job.error = 'conversation_not_found';
      jobs.set(job.id, job);
      emitEvent('failed', job);
      return null;
    }

    // Get existing memories for contradiction detection
    const existingMemories = semanticStore.getAllMemories();

    // Synthesize using LLM
    const llmResult = await synthesizeWithLLM(conversation, existingMemories);

    // Create semantic memories from facts
    const newMemories: SemanticMemory[] = [];
    for (const fact of llmResult.facts) {
      const { embedding } = await generateEmbedding(fact.content);
      const source: MemorySource = {
        type: 'conversation',
        sourceId: conversation.id,
        timestamp: new Date(),
        confidence: fact.confidence,
      };

      const memory = semanticStore.createMemory(
        fact.content,
        fact.category,
        source,
        embedding,
        fact.confidence
      );

      // Add topics
      if (fact.topics.length > 0) {
        semanticStore.addTopics(memory.id, fact.topics);
      }

      // Mark supersessions
      if (fact.supersedes) {
        for (const supersededId of fact.supersedes) {
          semanticStore.markSupersession(memory.id, supersededId);
        }
      }

      newMemories.push(memory);
    }

    // Update conversation summary
    if (llmResult.summary) {
      episodicStore.updateConversationSummary(job.conversationId, llmResult.summary);
    }

    const result: SynthesisResult = {
      newMemories,
      conversationSummary: llmResult.summary,
      contradictionsResolved: llmResult.contradictions.filter(
        (c) => c.resolution === 'replace_with_new'
      ).length,
    };

    job.status = 'completed';
    job.result = result;
    jobs.set(job.id, job);
    emitEvent('completed', job);

    return result;
  } catch (error) {
    console.error(`[SynthesisQueue] Job ${job.id} failed:`, error);

    if (job.attempts < job.maxAttempts) {
      // Re-queue with exponential backoff
      job.status = 'pending';
      job.error = error instanceof Error ? error.message : 'unknown_error';
      jobs.set(job.id, job);

      // Add back to queue with delay
      const delay = Math.pow(2, job.attempts) * 1000;
      setTimeout(() => {
        if (job.status === 'pending') {
          pendingQueue.push(job.id);
          emitEvent('requeued', job);
        }
      }, delay);
    } else {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'unknown_error';
      jobs.set(job.id, job);
      emitEvent('failed', job);
    }

    return null;
  }
}

/**
 * Process multiple jobs in batch
 */
export async function processAll(batchSize: number = 10): Promise<BatchResult> {
  const results: BatchResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    results: [],
  };

  for (let i = 0; i < batchSize && pendingQueue.length > 0; i++) {
    const jobId = pendingQueue[0]; // Peek at next job
    const job = jobs.get(jobId);

    if (!job) {
      pendingQueue.shift();
      continue;
    }

    const result = await processNext();
    results.processed++;

    if (result) {
      results.succeeded++;
      results.results.push({ jobId: job.id, success: true, result });
    } else {
      const updatedJob = jobs.get(job.id);
      if (updatedJob?.status === 'failed') {
        results.failed++;
        results.results.push({
          jobId: job.id,
          success: false,
          error: updatedJob.error,
        });
      }
    }
  }

  return results;
}

// ============================================================================
// Status & Monitoring
// ============================================================================

/**
 * Get count of pending jobs
 */
export function getPendingCount(): number {
  return pendingQueue.length;
}

/**
 * Get all failed jobs
 */
export function getFailedJobs(): SynthesisJob[] {
  return Array.from(jobs.values()).filter((j) => j.status === 'failed');
}

/**
 * Retry all failed jobs
 */
export async function retryFailed(): Promise<number> {
  const failed = getFailedJobs();
  let requeued = 0;

  for (const job of failed) {
    if (job.attempts < job.maxAttempts + 1) {
      // Allow one more attempt
      job.status = 'pending';
      job.attempts = 0; // Reset attempts
      jobs.set(job.id, job);
      pendingQueue.push(job.id);
      requeued++;
    }
  }

  return requeued;
}

/**
 * Get queue statistics
 */
export function getQueueStats(): {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
} {
  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  };

  for (const job of jobs.values()) {
    stats.total++;
    stats[job.status]++;
  }

  return stats;
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clear completed jobs older than a given date
 */
export function clearCompleted(olderThan?: Date): number {
  const cutoff = olderThan || new Date(0);
  let cleared = 0;

  for (const [id, job] of jobs) {
    if (job.status === 'completed' && job.createdAt <= cutoff) {
      jobs.delete(id);
      cleared++;
    }
  }

  return cleared;
}

/**
 * Clear all jobs (for testing)
 */
export function clearQueue(): void {
  jobs.clear();
  pendingQueue.length = 0;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Emit a queue event
 */
function emitEvent(event: string, job: SynthesisJob): void {
  const callbacks = eventCallbacks.get(event) || [];
  for (const callback of callbacks) {
    try {
      callback(job);
    } catch (error) {
      console.error(`[SynthesisQueue] Event callback error:`, error);
    }
  }
}

/**
 * Subscribe to queue events
 */
export function on(event: string, callback: QueueEventCallback): () => void {
  const callbacks = eventCallbacks.get(event) || [];
  callbacks.push(callback);
  eventCallbacks.set(event, callbacks);

  // Return unsubscribe function
  return () => {
    const currentCallbacks = eventCallbacks.get(event) || [];
    const index = currentCallbacks.indexOf(callback);
    if (index > -1) {
      currentCallbacks.splice(index, 1);
    }
  };
}

// ============================================================================
// Exports for scheduler
// ============================================================================

export {
  enqueue as enqueueSynthesis,
  processNext as processNextSynthesis,
  processAll as processAllSynthesis,
  getPendingCount as getSynthesisPendingCount,
  getQueueStats as getSynthesisQueueStats,
};
