import { prisma } from '@/lib/db/prisma'
import { getTierConfig, type TierName, type TierConfig } from './config'

export interface TierCheckResult {
  tier: TierName
  config: TierConfig
  allowed: boolean
  reason?: string
  currentUsage?: number
  limit?: number
}

/**
 * Get workspace tier
 */
export async function getWorkspaceTier(workspaceId: string): Promise<TierName> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { tier: true },
  })
  return (workspace?.tier as TierName) || 'starter'
}

/**
 * Check if user can upload more documents
 */
export async function canUploadDocument(workspaceId: string): Promise<TierCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  const documentCount = await prisma.document.count({
    where: { workspaceId },
  })

  const allowed = documentCount < config.limits.maxDocuments

  return {
    tier,
    config,
    allowed,
    reason: allowed ? undefined : `You've reached the ${config.limits.maxDocuments} document limit for ${config.displayName}. Upgrade to add more.`,
    currentUsage: documentCount,
    limit: config.limits.maxDocuments,
  }
}

/**
 * Check if file size is within limits
 */
export async function canUploadFileSize(workspaceId: string, fileSizeBytes: number): Promise<TierCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  const fileSizeMB = fileSizeBytes / (1024 * 1024)
  const allowed = fileSizeMB <= config.limits.maxFileSizeMB

  return {
    tier,
    config,
    allowed,
    reason: allowed ? undefined : `File exceeds the ${config.limits.maxFileSizeMB}MB limit for ${config.displayName}. Upgrade for larger files.`,
    currentUsage: Math.round(fileSizeMB * 10) / 10,
    limit: config.limits.maxFileSizeMB,
  }
}

/**
 * Check daily panel query usage
 */
export async function canUsePanelQuery(workspaceId: string, userId: string): Promise<TierCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const todayUsage = await prisma.usageRecord.findUnique({
    where: {
      userId_endpoint_date: {
        userId,
        endpoint: 'oscar/ask',
        date: startOfDay,
      },
    },
  })

  const currentCount = todayUsage?.requestCount || 0
  const allowed = currentCount < config.limits.panelQueriesPerDay

  return {
    tier,
    config,
    allowed,
    reason: allowed ? undefined : `You've used all ${config.limits.panelQueriesPerDay} panel queries for today. Upgrade for more.`,
    currentUsage: currentCount,
    limit: config.limits.panelQueriesPerDay,
  }
}

/**
 * Check if multi-model panel is available
 */
export async function hasMultiModel(workspaceId: string): Promise<TierCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  return {
    tier,
    config,
    allowed: config.limits.hasMultiModel,
    reason: config.limits.hasMultiModel ? undefined : 'Multi-model panel requires Pro or Master tier.',
  }
}

/**
 * Check if Contemplate mode is available
 */
export async function hasContemplateMode(workspaceId: string): Promise<TierCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  return {
    tier,
    config,
    allowed: config.limits.hasContemplateMode,
    reason: config.limits.hasContemplateMode ? undefined : 'Contemplate mode requires Master tier.',
  }
}

/**
 * Check if Council mode is available
 */
export async function hasCouncilMode(workspaceId: string): Promise<TierCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  return {
    tier,
    config,
    allowed: config.limits.hasCouncilMode,
    reason: config.limits.hasCouncilMode ? undefined : 'Council mode requires Master tier.',
  }
}

/**
 * Check daily Contemplate usage (invisible throttle for Master tier)
 */
export async function canUseContemplate(workspaceId: string, userId: string): Promise<TierCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  // Not available for this tier
  if (!config.limits.hasContemplateMode) {
    return {
      tier,
      config,
      allowed: false,
      reason: 'Contemplate mode requires Master tier.',
    }
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const todayUsage = await prisma.usageRecord.findUnique({
    where: {
      userId_endpoint_date: {
        userId,
        endpoint: 'oscar/contemplate',
        date: startOfDay,
      },
    },
  })

  const currentCount = todayUsage?.requestCount || 0
  const allowed = currentCount < config.limits.contemplatePerDay

  return {
    tier,
    config,
    allowed,
    reason: allowed ? undefined : `Daily Contemplate limit reached. Resets at midnight. Or purchase more: $10 for 10 queries.`,
    currentUsage: currentCount,
    limit: config.limits.contemplatePerDay,
  }
}

/**
 * Check daily Council usage (invisible throttle for Master tier)
 */
export async function canUseCouncil(workspaceId: string, userId: string): Promise<TierCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  // Not available for this tier
  if (!config.limits.hasCouncilMode) {
    return {
      tier,
      config,
      allowed: false,
      reason: 'Council mode requires Master tier.',
    }
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const todayUsage = await prisma.usageRecord.findUnique({
    where: {
      userId_endpoint_date: {
        userId,
        endpoint: 'oscar/council',
        date: startOfDay,
      },
    },
  })

  const currentCount = todayUsage?.requestCount || 0
  const allowed = currentCount < config.limits.councilPerDay

  return {
    tier,
    config,
    allowed,
    reason: allowed ? undefined : `Daily Council limit reached. Resets at midnight. Or purchase more: $20 for 10 sessions.`,
    currentUsage: currentCount,
    limit: config.limits.councilPerDay,
  }
}

/**
 * Check if advanced memory features are available
 */
export async function hasAdvancedMemory(workspaceId: string): Promise<TierCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  return {
    tier,
    config,
    allowed: config.limits.hasAdvancedMemory,
    reason: config.limits.hasAdvancedMemory ? undefined : 'Advanced memory requires Pro or Master tier.',
  }
}

/**
 * Get all tier info for a workspace (for UI display)
 */
export async function getWorkspaceTierInfo(workspaceId: string) {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  const [documentCount] = await Promise.all([
    prisma.document.count({ where: { workspaceId } }),
  ])

  return {
    tier,
    config,
    usage: {
      documents: {
        current: documentCount,
        limit: config.limits.maxDocuments,
        percentage: Math.round((documentCount / config.limits.maxDocuments) * 100),
      },
    },
  }
}

// Enterprise threshold - uploads above this trigger enterprise contact modal
export const ENTERPRISE_FILE_THRESHOLD = 1500

/**
 * Check if a bulk upload requires enterprise tier
 * Returns enterprise info if the upload exceeds even Master tier limits
 */
export interface EnterpriseCheckResult {
  requiresEnterprise: boolean
  filesAttempted: number
  maxAllowed: number
  tier: TierName
  suggestion?: 'upgrade_to_master' | 'contact_enterprise'
}

export async function checkBulkUploadEnterprise(
  workspaceId: string,
  newFileCount: number
): Promise<EnterpriseCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  const currentDocumentCount = await prisma.document.count({
    where: { workspaceId },
  })

  const totalAfterUpload = currentDocumentCount + newFileCount

  // Check if it exceeds even Master tier limits (enterprise territory)
  if (totalAfterUpload > ENTERPRISE_FILE_THRESHOLD) {
    return {
      requiresEnterprise: true,
      filesAttempted: newFileCount,
      maxAllowed: ENTERPRISE_FILE_THRESHOLD,
      tier,
      suggestion: 'contact_enterprise',
    }
  }

  // Check if it exceeds current tier but fits in a higher tier
  if (totalAfterUpload > config.limits.maxDocuments) {
    // Lite users should upgrade to Pro first
    if (tier === 'lite') {
      return {
        requiresEnterprise: false,
        filesAttempted: newFileCount,
        maxAllowed: config.limits.maxDocuments,
        tier,
        suggestion: 'upgrade_to_master', // Generic upgrade suggestion
      }
    }
    // Pro users should upgrade to Master
    if (tier === 'pro') {
      return {
        requiresEnterprise: false,
        filesAttempted: newFileCount,
        maxAllowed: config.limits.maxDocuments,
        tier,
        suggestion: 'upgrade_to_master',
      }
    }
  }

  return {
    requiresEnterprise: false,
    filesAttempted: newFileCount,
    maxAllowed: config.limits.maxDocuments,
    tier,
  }
}
