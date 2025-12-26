import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'

/**
 * GET /api/auth/vscode/authorize
 *
 * OAuth 2.0 Authorization endpoint for VS Code extension.
 * Initiates the PKCE authorization flow.
 *
 * Query params:
 *   - client_id: 'osqr-vscode'
 *   - redirect_uri: vscode://osqr.osqr-vscode/callback
 *   - response_type: 'code'
 *   - scope: 'read write'
 *   - code_challenge: PKCE code challenge (base64url encoded SHA256)
 *   - code_challenge_method: 'S256'
 *   - state: Optional state parameter for CSRF protection
 *
 * If user is authenticated, generates authorization code and redirects.
 * If not authenticated, redirects to sign-in page first.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Validate required parameters
    const clientId = searchParams.get('client_id')
    const redirectUri = searchParams.get('redirect_uri')
    const responseType = searchParams.get('response_type')
    const codeChallenge = searchParams.get('code_challenge')
    const codeChallengeMethod = searchParams.get('code_challenge_method')
    const scope = searchParams.get('scope')
    const state = searchParams.get('state')

    // Validate client_id
    if (clientId !== 'osqr-vscode') {
      return NextResponse.json(
        { error: 'invalid_client', message: 'Unknown client_id' },
        { status: 400 }
      )
    }

    // Validate redirect_uri
    if (!redirectUri || !redirectUri.startsWith('vscode://osqr.osqr-vscode/')) {
      return NextResponse.json(
        { error: 'invalid_redirect_uri', message: 'Invalid redirect URI' },
        { status: 400 }
      )
    }

    // Validate response_type
    if (responseType !== 'code') {
      return NextResponse.json(
        { error: 'unsupported_response_type', message: 'Only code response type is supported' },
        { status: 400 }
      )
    }

    // Validate PKCE (required for public clients)
    if (!codeChallenge || codeChallengeMethod !== 'S256') {
      return NextResponse.json(
        { error: 'invalid_request', message: 'PKCE code_challenge with S256 method is required' },
        { status: 400 }
      )
    }

    // Check if user is authenticated
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      // User not authenticated - redirect to sign in with return URL
      const returnUrl = req.url
      const signInUrl = new URL('/auth/signin', req.nextUrl.origin)
      signInUrl.searchParams.set('callbackUrl', returnUrl)

      return NextResponse.redirect(signInUrl)
    }

    // User is authenticated - generate authorization code
    const authorizationCode = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store authorization code with PKCE challenge
    await prisma.userSetting.create({
      data: {
        userId: session.user.id,
        key: `vscode_auth_code_${authorizationCode}`,
        value: {
          codeChallenge,
          codeChallengeMethod,
          redirectUri,
          scope: scope || 'read write',
          state,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
        },
      },
    })

    // Build redirect URL with authorization code
    const callbackUrl = new URL(redirectUri)
    callbackUrl.searchParams.set('code', authorizationCode)
    if (state) {
      callbackUrl.searchParams.set('state', state)
    }

    return NextResponse.redirect(callbackUrl)
  } catch (error) {
    console.error('VS Code authorize error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'Authorization failed' },
      { status: 500 }
    )
  }
}
