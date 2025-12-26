import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'
import { getTierConfig } from '@/lib/tiers/config'

/**
 * POST /api/auth/vscode/token
 *
 * OAuth 2.0 Token endpoint for VS Code extension.
 * Exchanges authorization code or refresh token for access tokens.
 *
 * Grant types:
 *   - authorization_code: Exchange code for tokens (with PKCE verification)
 *   - refresh_token: Refresh an expired access token
 *
 * Request body:
 *   - grant_type: 'authorization_code' | 'refresh_token'
 *   - code: Authorization code (for authorization_code grant)
 *   - redirect_uri: Must match the original redirect URI
 *   - client_id: 'osqr-vscode'
 *   - code_verifier: PKCE code verifier (for authorization_code grant)
 *   - refresh_token: Refresh token (for refresh_token grant)
 *
 * Response:
 *   - access_token: JWT access token
 *   - refresh_token: Refresh token for getting new access tokens
 *   - token_type: 'Bearer'
 *   - expires_in: Token lifetime in seconds
 *   - user: { id, email, name, tier }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { grant_type, client_id } = body

    // Validate client_id
    if (client_id !== 'osqr-vscode') {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Unknown client_id' },
        { status: 400 }
      )
    }

    if (grant_type === 'authorization_code') {
      return handleAuthorizationCodeGrant(body)
    } else if (grant_type === 'refresh_token') {
      return handleRefreshTokenGrant(body)
    } else {
      return NextResponse.json(
        { error: 'unsupported_grant_type', error_description: 'Only authorization_code and refresh_token grants are supported' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('VS Code token error:', error)
    return NextResponse.json(
      { error: 'server_error', error_description: 'Token exchange failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle authorization_code grant type
 */
async function handleAuthorizationCodeGrant(body: {
  code: string
  redirect_uri: string
  code_verifier: string
}) {
  const { code, redirect_uri, code_verifier } = body

  if (!code || !redirect_uri || !code_verifier) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing required parameters' },
      { status: 400 }
    )
  }

  // Find the stored authorization code
  const storedAuth = await prisma.userSetting.findFirst({
    where: {
      key: `vscode_auth_code_${code}`,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          workspaces: {
            select: { tier: true },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  if (!storedAuth) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' },
      { status: 400 }
    )
  }

  const authData = storedAuth.value as {
    codeChallenge: string
    codeChallengeMethod: string
    redirectUri: string
    expiresAt: string
  }

  // Check if code is expired
  if (new Date(authData.expiresAt) < new Date()) {
    await prisma.userSetting.delete({ where: { id: storedAuth.id } })
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Authorization code has expired' },
      { status: 400 }
    )
  }

  // Verify redirect_uri matches
  if (authData.redirectUri !== redirect_uri) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Redirect URI mismatch' },
      { status: 400 }
    )
  }

  // Verify PKCE code_verifier
  const expectedChallenge = crypto
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url')

  if (expectedChallenge !== authData.codeChallenge) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Invalid code_verifier' },
      { status: 400 }
    )
  }

  // Delete the used authorization code
  await prisma.userSetting.delete({ where: { id: storedAuth.id } })

  // Generate tokens
  const accessToken = generateAccessToken()
  const refreshToken = generateRefreshToken()
  const expiresIn = 3600 // 1 hour

  // Get user tier
  const tier = (storedAuth.user.workspaces[0]?.tier || 'pro') as 'lite' | 'pro' | 'master'
  const tierConfig = getTierConfig(tier)

  // Store refresh token
  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: storedAuth.userId,
        key: 'vscode_refresh_token',
      },
    },
    create: {
      userId: storedAuth.userId,
      key: 'vscode_refresh_token',
      value: {
        token: refreshToken,
        createdAt: new Date().toISOString(),
      },
    },
    update: {
      value: {
        token: refreshToken,
        createdAt: new Date().toISOString(),
      },
    },
  })

  // Store access token for validation
  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: storedAuth.userId,
        key: 'vscode_access_token',
      },
    },
    create: {
      userId: storedAuth.userId,
      key: 'vscode_access_token',
      value: {
        token: accessToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      },
    },
    update: {
      value: {
        token: accessToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      },
    },
  })

  return NextResponse.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    user: {
      id: storedAuth.user.id,
      email: storedAuth.user.email,
      name: storedAuth.user.name,
      tier,
      vsCodeAccess: tierConfig.limits.vsCodeAccess,
    },
  })
}

/**
 * Handle refresh_token grant type
 */
async function handleRefreshTokenGrant(body: { refresh_token: string }) {
  const { refresh_token } = body

  if (!refresh_token) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing refresh_token' },
      { status: 400 }
    )
  }

  // Find the stored refresh token
  const storedRefresh = await prisma.userSetting.findFirst({
    where: {
      key: 'vscode_refresh_token',
      value: {
        path: ['token'],
        equals: refresh_token,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          workspaces: {
            select: { tier: true },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  if (!storedRefresh) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Invalid refresh token' },
      { status: 400 }
    )
  }

  // Generate new tokens
  const accessToken = generateAccessToken()
  const newRefreshToken = generateRefreshToken()
  const expiresIn = 3600 // 1 hour

  // Get user tier
  const tier = (storedRefresh.user.workspaces[0]?.tier || 'pro') as 'lite' | 'pro' | 'master'
  const tierConfig = getTierConfig(tier)

  // Update refresh token
  await prisma.userSetting.update({
    where: { id: storedRefresh.id },
    data: {
      value: {
        token: newRefreshToken,
        createdAt: new Date().toISOString(),
      },
    },
  })

  // Update access token
  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: storedRefresh.userId,
        key: 'vscode_access_token',
      },
    },
    create: {
      userId: storedRefresh.userId,
      key: 'vscode_access_token',
      value: {
        token: accessToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      },
    },
    update: {
      value: {
        token: accessToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      },
    },
  })

  return NextResponse.json({
    access_token: accessToken,
    refresh_token: newRefreshToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    user: {
      id: storedRefresh.user.id,
      email: storedRefresh.user.email,
      name: storedRefresh.user.name,
      tier,
      vsCodeAccess: tierConfig.limits.vsCodeAccess,
    },
  })
}

/**
 * Generate a secure access token
 */
function generateAccessToken(): string {
  return `osqr_vscode_${crypto.randomBytes(32).toString('hex')}`
}

/**
 * Generate a secure refresh token
 */
function generateRefreshToken(): string {
  return `osqr_refresh_${crypto.randomBytes(32).toString('hex')}`
}
