/**
 * Prisma Privacy Settings Adapter
 *
 * Persists user privacy settings to database for vault encryption behavior.
 * These settings control plugin access, data retention, and synthesis permissions.
 *
 * @see docs/BUILD-ENCRYPTION-REMEDIATION.md
 */

import { prisma } from '@/lib/db/prisma'

/** Privacy tier for plugin access */
export type PrivacyTier = 'none' | 'minimal' | 'contextual' | 'full'

export interface PrivacySettings {
  pluginAccessTier: PrivacyTier
  dataRetentionDays: number
  allowCrossProject: boolean
  allowSynthesis: boolean
}

/**
 * Load privacy settings for a user
 */
export async function loadPrivacySettings(
  userId: string
): Promise<PrivacySettings | null> {
  const settings = await prisma.userPrivacySettings.findUnique({
    where: { userId },
  })

  if (!settings) return null

  return {
    pluginAccessTier: settings.pluginAccessTier as PrivacyTier,
    dataRetentionDays: settings.dataRetentionDays,
    allowCrossProject: settings.allowCrossProject,
    allowSynthesis: settings.allowSynthesis,
  }
}

/**
 * Save privacy settings for a user (upsert)
 */
export async function savePrivacySettings(
  userId: string,
  settings: Partial<PrivacySettings>
): Promise<void> {
  await prisma.userPrivacySettings.upsert({
    where: { userId },
    create: {
      userId,
      pluginAccessTier: settings.pluginAccessTier ?? 'minimal',
      dataRetentionDays: settings.dataRetentionDays ?? 365,
      allowCrossProject: settings.allowCrossProject ?? true,
      allowSynthesis: settings.allowSynthesis ?? true,
    },
    update: {
      ...(settings.pluginAccessTier !== undefined && {
        pluginAccessTier: settings.pluginAccessTier,
      }),
      ...(settings.dataRetentionDays !== undefined && {
        dataRetentionDays: settings.dataRetentionDays,
      }),
      ...(settings.allowCrossProject !== undefined && {
        allowCrossProject: settings.allowCrossProject,
      }),
      ...(settings.allowSynthesis !== undefined && {
        allowSynthesis: settings.allowSynthesis,
      }),
    },
  })
}

/**
 * Delete privacy settings for a user
 */
export async function deletePrivacySettings(userId: string): Promise<void> {
  await prisma.userPrivacySettings.deleteMany({
    where: { userId },
  })
}

/**
 * Get default privacy settings
 */
export function getDefaultPrivacySettings(): PrivacySettings {
  return {
    pluginAccessTier: 'minimal',
    dataRetentionDays: 365,
    allowCrossProject: true,
    allowSynthesis: true,
  }
}
