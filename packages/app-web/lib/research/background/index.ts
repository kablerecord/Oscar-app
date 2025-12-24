/**
 * Background Research Execution
 *
 * Allows users to start research (especially Tribunal) and leave.
 * Research continues in background, user notified on completion.
 *
 * Architecture Options:
 * - Redis + Bull (job queue)
 * - Inngest (serverless workflows)
 * - Trigger.dev (background jobs)
 *
 * @see docs/features/OSQR_DEEP_RESEARCH_SPEC.md
 */

import type { ResearchDocument, ResearchStatus, TribunalProgress } from '../types';

// =============================================================================
// Background Job Types
// =============================================================================

export interface BackgroundResearchJob {
  id: string;
  userId: string;
  sessionId: string;
  status: ResearchStatus;
  progress: TribunalProgress | null;
  startedAt: Date;
  completedAt: Date | null;
  result: ResearchDocument | null;
  error: string | null;
}

export interface NotificationPayload {
  userId: string;
  sessionId: string;
  topic: string;
  status: 'completed' | 'failed';
  summary?: string;
  modelAgreement?: 'high' | 'medium' | 'low' | 'divergent';
}

// =============================================================================
// Background Executor (Skeleton)
// =============================================================================

/**
 * BackgroundExecutor
 *
 * Manages background research jobs.
 *
 * TODO: Implement with chosen job queue technology
 */
export class BackgroundExecutor {
  /**
   * Queue a research job for background execution
   */
  async enqueue(
    sessionId: string,
    userId: string
  ): Promise<string> {
    // TODO: Add job to queue
    // TODO: Return job ID
    throw new Error('Not implemented');
  }

  /**
   * Get status of a background job
   */
  async getStatus(jobId: string): Promise<BackgroundResearchJob | null> {
    // TODO: Query job status from queue
    throw new Error('Not implemented');
  }

  /**
   * Cancel a background job
   */
  async cancel(jobId: string): Promise<boolean> {
    // TODO: Cancel job in queue
    throw new Error('Not implemented');
  }

  /**
   * List all jobs for a user
   */
  async listUserJobs(
    userId: string,
    options?: { status?: ResearchStatus; limit?: number }
  ): Promise<BackgroundResearchJob[]> {
    // TODO: Query user's jobs
    throw new Error('Not implemented');
  }

  /**
   * Clean up completed jobs older than X days
   */
  async cleanup(olderThanDays: number): Promise<number> {
    // TODO: Remove old completed jobs
    throw new Error('Not implemented');
  }
}

// =============================================================================
// Notification Service (Skeleton)
// =============================================================================

/**
 * NotificationService
 *
 * Handles notifying users when background research completes.
 *
 * Channels:
 * - In-app (bubble pulse)
 * - Email (optional)
 * - Push notification (future)
 */
export class NotificationService {
  /**
   * Notify user of research completion
   */
  async notifyCompletion(payload: NotificationPayload): Promise<void> {
    // TODO: Update in-app notification state (bubble pulse)
    // TODO: Optionally send email
    throw new Error('Not implemented');
  }

  /**
   * Get pending notifications for user
   */
  async getPendingNotifications(userId: string): Promise<NotificationPayload[]> {
    // TODO: Query pending notifications
    throw new Error('Not implemented');
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, sessionId: string): Promise<void> {
    // TODO: Update notification status
    throw new Error('Not implemented');
  }

  /**
   * Generate completion message
   *
   * Example: "Your Tribunal research on [topic] is ready.
   *           Found some interesting tensions between what Claude and GPT-4o concluded.
   *           Want to take a look?"
   */
  generateCompletionMessage(payload: NotificationPayload): string {
    if (payload.status === 'failed') {
      return `Your research on "${payload.topic}" encountered an issue. Want to try again?`;
    }

    const agreementText = {
      high: 'All three models reached similar conclusions.',
      medium: 'The models mostly agreed with some nuances.',
      low: 'The models had some interesting disagreements.',
      divergent: 'Found significant tensions between what the models concluded.',
    };

    const agreement = payload.modelAgreement
      ? agreementText[payload.modelAgreement]
      : '';

    return `Your Tribunal research on "${payload.topic}" is ready. ${agreement} Want to take a look?`;
  }
}

// =============================================================================
// Exports
// =============================================================================

export const backgroundExecutor = new BackgroundExecutor();
export const notificationService = new NotificationService();
