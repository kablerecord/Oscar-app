/**
 * VS Code Extension Authentication Utilities
 *
 * Validates Bearer tokens from VS Code extension requests.
 */

import { prisma } from '@/lib/db/prisma'
import { getTierConfig, type TierName } from '@/lib/tiers/config'

export interface VSCodeUser {
  id: string
  email: string
  name: string | null
  tier: TierName
  vsCodeAccess: boolean
  workspaceId: string
}

/**
 * Validate VS Code access token from Authorization header
 */
export async function validateVSCodeToken(
  authHeader: string | null
): Promise<VSCodeUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)

  // Check if it's a VS Code token
  if (!token.startsWith('osqr_vscode_')) {
    return null
  }

  try {
    // Find the stored access token
    const storedToken = await prisma.userSetting.findFirst({
      where: {
        key: 'vscode_access_token',
        value: {
          path: ['token'],
          equals: token,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            workspaces: {
              select: { id: true, tier: true },
              take: 1,
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })

    if (!storedToken) {
      return null
    }

    // Check if token is expired
    const tokenData = storedToken.value as { expiresAt: string }
    if (new Date(tokenData.expiresAt) < new Date()) {
      return null
    }

    const workspace = storedToken.user.workspaces[0]
    const tier = (workspace?.tier || 'pro') as TierName
    const tierConfig = getTierConfig(tier)

    return {
      id: storedToken.user.id,
      email: storedToken.user.email,
      name: storedToken.user.name,
      tier,
      vsCodeAccess: tierConfig.limits.vsCodeAccess,
      workspaceId: workspace?.id || '',
    }
  } catch (error) {
    console.error('VS Code token validation error:', error)
    return null
  }
}

/**
 * Check if user has VS Code access based on tier
 */
export function checkVSCodeAccess(tier: TierName): boolean {
  const config = getTierConfig(tier)
  return config.limits.vsCodeAccess
}

/**
 * Get user from either NextAuth session or VS Code token
 */
export async function getAuthenticatedUser(
  headers: Headers,
  session?: { user?: { id?: string } } | null
): Promise<{ userId: string; source: 'web' | 'vscode'; tier: TierName; workspaceId: string } | null> {
  // First check for VS Code token
  const authHeader = headers.get('authorization')
  if (authHeader?.startsWith('Bearer osqr_vscode_')) {
    const vsCodeUser = await validateVSCodeToken(authHeader)
    if (vsCodeUser) {
      return {
        userId: vsCodeUser.id,
        source: 'vscode',
        tier: vsCodeUser.tier,
        workspaceId: vsCodeUser.workspaceId,
      }
    }
  }

  // Fall back to NextAuth session
  if (session?.user?.id) {
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true, tier: true },
      orderBy: { createdAt: 'asc' },
    })

    return {
      userId: session.user.id,
      source: 'web',
      tier: (workspace?.tier || 'pro') as TierName,
      workspaceId: workspace?.id || '',
    }
  }

  return null
}
