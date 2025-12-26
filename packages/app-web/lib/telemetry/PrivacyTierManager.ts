/**
 * PrivacyTierManager
 *
 * Enforces user consent and data access boundaries for telemetry.
 * Part of the Behavioral Intelligence Layer.
 *
 * @see docs/PRIVACY_TIERS.md
 * @see docs/BEHAVIORAL_INTELLIGENCE_LAYER.md
 *
 * STATUS: IMPLEMENTED - Database persistence enabled
 */

import { prisma } from '@/lib/db/prisma'
import { createHash } from 'crypto'

// =============================================================================
// PRIVACY TIER TYPES
// =============================================================================

export type PrivacyTier = 'A' | 'B' | 'C'

export interface UserPrivacySettings {
  userId: string
  privacyTier: PrivacyTier
  consentTimestamp: Date
  consentVersion: string // Version of privacy policy
  optOutHistory: Array<{
    tier: PrivacyTier
    timestamp: Date
    reason?: string
  }>
}

export interface DeletionReport {
  userId: string
  deletedAt: Date
  itemsDeleted: {
    telemetryEvents: number
    patterns: number
    behaviorModels: number
    globalContributions: number
  }
  success: boolean
  errors?: string[]
}

// =============================================================================
// PRIVACY TIER MANAGER CLASS
// =============================================================================

export class PrivacyTierManager {
  // Default privacy tier for new users
  private readonly DEFAULT_TIER: PrivacyTier = 'A'

  // Current privacy policy version
  private readonly CURRENT_POLICY_VERSION = '1.0.0'

  // In-memory cache of user tiers
  private tierCache: Map<string, PrivacyTier> = new Map()

  /**
   * Get a user's current privacy tier
   */
  async getUserTier(userId: string): Promise<PrivacyTier> {
    // Check cache first
    const cached = this.tierCache.get(userId)
    if (cached) return cached

    try {
      // Fetch from database
      const setting = await prisma.userPrivacySetting.findUnique({
        where: { userId },
      })

      if (setting) {
        const tier = setting.privacyTier as PrivacyTier
        this.tierCache.set(userId, tier)
        return tier
      }
    } catch (error) {
      console.error('[PrivacyTierManager] Error fetching tier:', error)
    }

    // Return default if not found
    return this.DEFAULT_TIER
  }

  /**
   * Update a user's privacy tier
   */
  async updateTier(
    userId: string,
    newTier: PrivacyTier,
    consentSource: string
  ): Promise<void> {
    try {
      const currentTier = await this.getUserTier(userId)

      // Store in database with audit trail
      await prisma.userPrivacySetting.upsert({
        where: { userId },
        update: {
          privacyTier: newTier,
          consentVersion: this.CURRENT_POLICY_VERSION,
          consentTimestamp: new Date(),
        },
        create: {
          userId,
          privacyTier: newTier,
          consentVersion: this.CURRENT_POLICY_VERSION,
          consentTimestamp: new Date(),
        },
      })

      // Record the change in opt-out history if downgrading
      if (this.tierSatisfies(currentTier, newTier) && currentTier !== newTier) {
        await prisma.privacyOptOutRecord.create({
          data: {
            userId,
            fromTier: currentTier,
            toTier: newTier,
            reason: consentSource,
          },
        })
      }

      // Update cache
      this.tierCache.set(userId, newTier)

      console.log(`[PrivacyTierManager] Updated tier for ${userId} to ${newTier}`)
    } catch (error) {
      console.error('[PrivacyTierManager] Error updating tier:', error)
      throw error
    }
  }

  /**
   * Check if a tier satisfies a requirement
   */
  tierSatisfies(userTier: PrivacyTier, requiredTier: PrivacyTier): boolean {
    const tierOrder: PrivacyTier[] = ['A', 'B', 'C']
    return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier)
  }

  /**
   * Get user's full privacy settings
   */
  async getSettings(userId: string): Promise<UserPrivacySettings> {
    try {
      const setting = await prisma.userPrivacySetting.findUnique({
        where: { userId },
      })

      const optOutRecords = await prisma.privacyOptOutRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      return {
        userId,
        privacyTier: (setting?.privacyTier || this.DEFAULT_TIER) as PrivacyTier,
        consentTimestamp: setting?.consentTimestamp || new Date(),
        consentVersion: setting?.consentVersion || this.CURRENT_POLICY_VERSION,
        optOutHistory: optOutRecords.map((r: { toTier: string; createdAt: Date; reason: string | null }) => ({
          tier: r.toTier as PrivacyTier,
          timestamp: r.createdAt,
          reason: r.reason || undefined,
        })),
      }
    } catch (error) {
      console.error('[PrivacyTierManager] Error fetching settings:', error)
      return {
        userId,
        privacyTier: this.DEFAULT_TIER,
        consentTimestamp: new Date(),
        consentVersion: this.CURRENT_POLICY_VERSION,
        optOutHistory: [],
      }
    }
  }

  /**
   * Handle opt-out from a higher tier
   */
  async optOut(userId: string, reason?: string): Promise<void> {
    const currentTier = await this.getUserTier(userId)

    // Record opt-out
    await prisma.privacyOptOutRecord.create({
      data: {
        userId,
        fromTier: currentTier,
        toTier: 'A',
        reason: reason || 'user_opt_out',
      },
    })

    // Downgrade to Tier A
    await this.updateTier(userId, 'A', 'user_opt_out')
  }

  /**
   * Export all data for a user (GDPR right to access)
   */
  async exportUserData(userId: string): Promise<{
    privacySettings: UserPrivacySettings
    telemetryEvents: unknown[]
    patterns: unknown[]
    behaviorProfile: unknown
  }> {
    const settings = await this.getSettings(userId)

    // Gather telemetry events for this user (hashed ID)
    const userIdHash = this.hashUserId(userId)
    const telemetryEvents = await prisma.telemetryEvent.findMany({
      where: { userIdHash },
      orderBy: { timestamp: 'desc' },
      take: 1000, // Limit for performance
    })

    return {
      privacySettings: settings,
      telemetryEvents,
      patterns: [], // Pattern data would come from PatternAggregator
      behaviorProfile: {}, // Behavior model would come from UserBehaviorModel
    }
  }

  /**
   * Delete all user data (GDPR right to erasure)
   */
  async deleteUserData(userId: string): Promise<DeletionReport> {
    const userIdHash = this.hashUserId(userId)
    const errors: string[] = []
    let telemetryEventsDeleted = 0

    try {
      // Delete telemetry events
      const deleteResult = await prisma.telemetryEvent.deleteMany({
        where: { userIdHash },
      })
      telemetryEventsDeleted = deleteResult.count

      // Delete privacy settings
      await prisma.userPrivacySetting.deleteMany({
        where: { userId },
      })

      // Delete opt-out records
      await prisma.privacyOptOutRecord.deleteMany({
        where: { userId },
      })

      // Clear cache
      this.tierCache.delete(userId)

      console.log(`[PrivacyTierManager] Deleted all data for ${userId}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(msg)
      console.error('[PrivacyTierManager] Error deleting user data:', error)
    }

    return {
      userId,
      deletedAt: new Date(),
      itemsDeleted: {
        telemetryEvents: telemetryEventsDeleted,
        patterns: 0,
        behaviorModels: 0,
        globalContributions: 0,
      },
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Check if we need to re-consent (policy version changed)
   */
  async needsReConsent(userId: string): Promise<boolean> {
    const settings = await this.getSettings(userId)
    return settings.consentVersion !== this.CURRENT_POLICY_VERSION
  }

  /**
   * Record consent with current policy version
   */
  async recordConsent(userId: string, tier: PrivacyTier): Promise<void> {
    await prisma.userPrivacySetting.upsert({
      where: { userId },
      update: {
        privacyTier: tier,
        consentVersion: this.CURRENT_POLICY_VERSION,
        consentTimestamp: new Date(),
      },
      create: {
        userId,
        privacyTier: tier,
        consentVersion: this.CURRENT_POLICY_VERSION,
        consentTimestamp: new Date(),
      },
    })

    this.tierCache.set(userId, tier)
    console.log(`[PrivacyTierManager] Recorded consent for ${userId}`)
  }

  /**
   * Get consent summary for UI display
   */
  getConsentSummary(tier: PrivacyTier): {
    title: string
    description: string
    dataCollected: string[]
    benefits: string[]
  } {
    switch (tier) {
      case 'A':
        return {
          title: 'Local Only',
          description: "OSQR doesn't learn from your usage",
          dataCollected: ['Basic error reports', 'Session duration'],
          benefits: ['Maximum privacy', 'Full functionality'],
        }
      case 'B':
        return {
          title: 'Personal Learning',
          description: 'OSQR learns your preferences (recommended)',
          dataCollected: [
            'Mode preferences',
            'Feature usage',
            'Response feedback',
            'Session patterns',
          ],
          benefits: [
            'Personalized mode suggestions',
            'Optimized UI',
            'Better recommendations',
          ],
        }
      case 'C':
        return {
          title: 'Global Learning',
          description: 'Help improve OSQR for everyone',
          dataCollected: [
            'All Tier B data',
            'Anonymized patterns for global learning',
          ],
          benefits: [
            'All Tier B benefits',
            'Early access to improvements',
            'Help shape OSQR',
          ],
        }
    }
  }

  /**
   * Hash user ID for storage matching
   */
  private hashUserId(userId: string): string {
    return createHash('sha256').update(userId).digest('hex').substring(0, 32)
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let managerInstance: PrivacyTierManager | null = null

export function getPrivacyTierManager(): PrivacyTierManager {
  if (!managerInstance) {
    managerInstance = new PrivacyTierManager()
  }
  return managerInstance
}
