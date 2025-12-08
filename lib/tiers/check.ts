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
  return (workspace?.tier as TierName) || 'free'
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
 * Check if full panel (4 models) is available
 */
export async function hasFullPanel(workspaceId: string): Promise<TierCheckResult> {
  const tier = await getWorkspaceTier(workspaceId)
  const config = getTierConfig(tier)

  return {
    tier,
    config,
    allowed: config.limits.hasFullPanel,
    reason: config.limits.hasFullPanel ? undefined : 'Full panel mode requires Pro or Master tier.',
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
