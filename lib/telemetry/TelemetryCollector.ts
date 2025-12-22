/**
 * TelemetryCollector
 *
 * Captures behavioral events from user interactions.
 * Part of the Behavioral Intelligence Layer.
 *
 * @see docs/BEHAVIORAL_INTELLIGENCE_LAYER.md
 * @see docs/TELEMETRY_SPEC.md
 *
 * STATUS: IMPLEMENTED - Database persistence enabled
 */

import { prisma } from '@/lib/db/prisma'
import { createHash } from 'crypto'
import { PrivacyTier, PrivacyTierManager, getPrivacyTierManager } from './PrivacyTierManager'

// =============================================================================
// EVENT TYPES
// =============================================================================

export type TelemetryEventType =
  // Category A: Interaction Events
  | 'mode_selected'
  | 'session_start'
  | 'session_end'
  | 'session_active'
  | 'feature_used'
  | 'navigation'
  // Category B: Feedback Events
  | 'response_feedback'
  | 'refinement_feedback'
  | 'panel_comparison'
  // Category C: Progress Events
  | 'onboarding_progress'
  | 'capability_assessment'
  | 'subscription_change'
  // Category D: System Events
  | 'error'
  | 'performance'

export interface BaseTelemetryEvent {
  eventType: TelemetryEventType
  timestamp: Date
  userId?: string // Hashed before storage
  workspaceId?: string // Hashed before storage
  data: Record<string, unknown>
}

// =============================================================================
// EVENT PRIVACY REQUIREMENTS
// =============================================================================

const EVENT_PRIVACY_REQUIREMENTS: Record<TelemetryEventType, PrivacyTier> = {
  // Tier A events (always collected)
  session_start: 'A',
  session_end: 'A',
  session_active: 'A',
  error: 'A',
  performance: 'A',
  onboarding_progress: 'A',
  capability_assessment: 'A',
  subscription_change: 'A',

  // Tier B events (require opt-in)
  mode_selected: 'B',
  feature_used: 'B',
  navigation: 'B',
  response_feedback: 'B',
  refinement_feedback: 'B',
  panel_comparison: 'B',
}

// =============================================================================
// TELEMETRY COLLECTOR CLASS
// =============================================================================

export class TelemetryCollector {
  private privacyManager: PrivacyTierManager
  private eventQueue: BaseTelemetryEvent[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private isStarted = false

  // Configuration
  private readonly BATCH_SIZE = 100
  private readonly FLUSH_INTERVAL_MS = 60_000 // 1 minute

  constructor(privacyManager: PrivacyTierManager) {
    this.privacyManager = privacyManager
  }

  /**
   * Start the collector (begins periodic flushing)
   */
  start(): void {
    if (this.isStarted) return

    this.flushInterval = setInterval(async () => {
      await this.flush()
    }, this.FLUSH_INTERVAL_MS)

    this.isStarted = true
    console.log('[TelemetryCollector] Started with periodic flush')
  }

  /**
   * Stop the collector (flush remaining events)
   */
  async stop(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    await this.flush()
    this.isStarted = false
    console.log('[TelemetryCollector] Stopped')
  }

  /**
   * Track an event
   */
  async track(event: BaseTelemetryEvent): Promise<boolean> {
    const { eventType, userId } = event

    // Check if we should collect this event based on user's privacy tier
    if (userId) {
      const userTier = await this.privacyManager.getUserTier(userId)
      const requiredTier = EVENT_PRIVACY_REQUIREMENTS[eventType]

      if (!this.privacyManager.tierSatisfies(userTier, requiredTier)) {
        // User hasn't opted in to this level of telemetry
        return false
      }
    }

    // Hash identifiers before queueing
    const sanitizedEvent = this.sanitizeEvent(event)

    // Add to queue
    this.eventQueue.push(sanitizedEvent)

    // Flush if batch size reached
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      await this.flush()
    }

    return true
  }

  /**
   * Convenience methods for common events
   */
  async trackModeSelected(
    userId: string,
    workspaceId: string,
    mode: 'quick' | 'thoughtful' | 'contemplate',
    wasAutoSuggested: boolean
  ): Promise<void> {
    await this.track({
      eventType: 'mode_selected',
      timestamp: new Date(),
      userId,
      workspaceId,
      data: { mode, wasAutoSuggested },
    })
  }

  async trackFeatureUsed(
    userId: string,
    workspaceId: string,
    feature: string,
    action: 'opened' | 'used' | 'completed' | 'abandoned'
  ): Promise<void> {
    await this.track({
      eventType: 'feature_used',
      timestamp: new Date(),
      userId,
      workspaceId,
      data: { feature, action },
    })
  }

  async trackResponseFeedback(
    userId: string,
    workspaceId: string,
    rating: 'positive' | 'negative',
    responseMode: string
  ): Promise<void> {
    await this.track({
      eventType: 'response_feedback',
      timestamp: new Date(),
      userId,
      workspaceId,
      data: { rating, responseMode },
    })
  }

  async trackSessionStart(userId: string): Promise<string> {
    const sessionId = this.generateSessionId()
    await this.track({
      eventType: 'session_start',
      timestamp: new Date(),
      userId,
      data: { sessionId },
    })
    return sessionId
  }

  async trackSessionEnd(
    userId: string,
    sessionId: string,
    durationSeconds: number
  ): Promise<void> {
    await this.track({
      eventType: 'session_end',
      timestamp: new Date(),
      userId,
      data: { sessionId, durationSeconds },
    })
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private sanitizeEvent(event: BaseTelemetryEvent): BaseTelemetryEvent {
    return {
      ...event,
      userId: event.userId ? this.hashIdentifier(event.userId) : undefined,
      workspaceId: event.workspaceId
        ? this.hashIdentifier(event.workspaceId)
        : undefined,
    }
  }

  /**
   * Hash identifier using SHA-256 for privacy
   */
  private hashIdentifier(id: string): string {
    return createHash('sha256').update(id).digest('hex').substring(0, 32)
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Flush events to database
   */
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return

    const eventsToFlush = [...this.eventQueue]
    this.eventQueue = []

    try {
      // Batch insert events to database
      await prisma.telemetryEvent.createMany({
        data: eventsToFlush.map(event => ({
          eventType: event.eventType,
          userIdHash: event.userId || null,
          workspaceIdHash: event.workspaceId || null,
          data: event.data as object, // Cast to Prisma Json type
          timestamp: event.timestamp,
        })),
      })

      console.log(`[TelemetryCollector] Flushed ${eventsToFlush.length} events to database`)
    } catch (error) {
      console.error('[TelemetryCollector] Flush error:', error)
      // Re-queue events on failure (with limit to prevent infinite growth)
      if (this.eventQueue.length < this.BATCH_SIZE * 5) {
        this.eventQueue.unshift(...eventsToFlush)
      }
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let collectorInstance: TelemetryCollector | null = null

export function getTelemetryCollector(): TelemetryCollector {
  if (!collectorInstance) {
    const privacyManager = getPrivacyTierManager()
    collectorInstance = new TelemetryCollector(privacyManager)
  }
  return collectorInstance
}
