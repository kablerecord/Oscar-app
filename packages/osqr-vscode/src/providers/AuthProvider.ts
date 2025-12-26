/**
 * Authentication Provider for OSQR VS Code Extension
 *
 * Handles OAuth flow and token management using VS Code's SecretStorage.
 */

import * as vscode from 'vscode'
import { AuthSession, UsageResponse } from '../types'
import { getApiUrl, OAUTH_CONFIG } from '../utils/config'

const AUTH_SECRET_KEY = 'osqr.authSession'

export class AuthProvider implements vscode.Disposable {
  private static instance: AuthProvider
  private context: vscode.ExtensionContext
  private session: AuthSession | undefined
  private disposables: vscode.Disposable[] = []

  // Event emitters
  private _onDidSignIn = new vscode.EventEmitter<AuthSession>()
  private _onDidSignOut = new vscode.EventEmitter<void>()
  private _onDidSessionExpire = new vscode.EventEmitter<void>()

  public readonly onDidSignIn = this._onDidSignIn.event
  public readonly onDidSignOut = this._onDidSignOut.event
  public readonly onDidSessionExpire = this._onDidSessionExpire.event

  private constructor(context: vscode.ExtensionContext) {
    this.context = context

    // Register URI handler for OAuth callback
    this.disposables.push(
      vscode.window.registerUriHandler({
        handleUri: (uri) => this.handleOAuthCallback(uri),
      })
    )
  }

  public static getInstance(context: vscode.ExtensionContext): AuthProvider {
    if (!AuthProvider.instance) {
      AuthProvider.instance = new AuthProvider(context)
    }
    return AuthProvider.instance
  }

  /**
   * Initialize auth provider and restore session
   */
  public async initialize(): Promise<void> {
    await this.restoreSession()
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.session && !this.isSessionExpired()
  }

  /**
   * Get current session
   */
  public getSession(): AuthSession | undefined {
    if (this.session && this.isSessionExpired()) {
      this.handleSessionExpired()
      return undefined
    }
    return this.session
  }

  /**
   * Get access token for API calls
   */
  public async getAccessToken(): Promise<string | undefined> {
    const session = this.getSession()
    if (!session) {
      return undefined
    }

    // Check if token needs refresh
    if (this.shouldRefreshToken()) {
      await this.refreshToken()
    }

    return this.session?.accessToken
  }

  /**
   * Start OAuth sign-in flow
   */
  public async signIn(): Promise<void> {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = this.generateCodeVerifier()
      const codeChallenge = await this.generateCodeChallenge(codeVerifier)

      // Store code verifier for token exchange
      await this.context.secrets.store('osqr.codeVerifier', codeVerifier)

      // Build authorization URL
      const authUrl = new URL(getApiUrl(OAUTH_CONFIG.authorizationEndpoint))
      authUrl.searchParams.set('client_id', OAUTH_CONFIG.clientId)
      authUrl.searchParams.set('redirect_uri', OAUTH_CONFIG.redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', OAUTH_CONFIG.scopes.join(' '))
      authUrl.searchParams.set('code_challenge', codeChallenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')

      // Open browser for authentication
      await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()))

      vscode.window.showInformationMessage(
        'Opening browser for OSQR sign in...'
      )
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to start sign in: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Handle OAuth callback from browser
   */
  private async handleOAuthCallback(uri: vscode.Uri): Promise<void> {
    try {
      const query = new URLSearchParams(uri.query)
      const code = query.get('code')
      const error = query.get('error')

      if (error) {
        throw new Error(`OAuth error: ${error}`)
      }

      if (!code) {
        throw new Error('No authorization code received')
      }

      // Exchange code for tokens
      await this.exchangeCodeForTokens(code)

      vscode.window.showInformationMessage('Successfully signed in to OSQR!')
    } catch (error) {
      vscode.window.showErrorMessage(
        `Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<void> {
    const codeVerifier = await this.context.secrets.get('osqr.codeVerifier')
    if (!codeVerifier) {
      throw new Error('Code verifier not found')
    }

    const response = await fetch(getApiUrl(OAUTH_CONFIG.tokenEndpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        client_id: OAUTH_CONFIG.clientId,
        code_verifier: codeVerifier,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Token exchange failed')
    }

    const data = await response.json()

    // Create session
    this.session = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      user: data.user,
    }

    // Store session securely
    await this.storeSession()

    // Clean up code verifier
    await this.context.secrets.delete('osqr.codeVerifier')

    // Emit sign in event
    this._onDidSignIn.fire(this.session)
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<void> {
    if (!this.session?.refreshToken) {
      this.handleSessionExpired()
      return
    }

    try {
      const response = await fetch(getApiUrl(OAUTH_CONFIG.tokenEndpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.session.refreshToken,
          client_id: OAUTH_CONFIG.clientId,
        }),
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()

      this.session = {
        ...this.session,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.session.refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000,
      }

      await this.storeSession()
    } catch (error) {
      console.error('Token refresh failed:', error)
      this.handleSessionExpired()
    }
  }

  /**
   * Sign out
   */
  public async signOut(): Promise<void> {
    this.session = undefined
    await this.context.secrets.delete(AUTH_SECRET_KEY)
    this._onDidSignOut.fire()
    vscode.window.showInformationMessage('Signed out of OSQR')
  }

  /**
   * Check if user has VS Code access based on tier
   */
  public async checkVSCodeAccess(): Promise<{ hasAccess: boolean; tier: string }> {
    const token = await this.getAccessToken()
    if (!token) {
      return { hasAccess: false, tier: 'none' }
    }

    try {
      const response = await fetch(getApiUrl('/api/usage'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        return { hasAccess: false, tier: 'unknown' }
      }

      const usage: UsageResponse = await response.json()
      return {
        hasAccess: usage.vsCodeAccess,
        tier: usage.tier,
      }
    } catch (error) {
      console.error('Failed to check VS Code access:', error)
      return { hasAccess: false, tier: 'unknown' }
    }
  }

  // Helper methods

  private async storeSession(): Promise<void> {
    if (this.session) {
      await this.context.secrets.store(
        AUTH_SECRET_KEY,
        JSON.stringify(this.session)
      )
    }
  }

  private async restoreSession(): Promise<void> {
    try {
      const stored = await this.context.secrets.get(AUTH_SECRET_KEY)
      if (stored) {
        this.session = JSON.parse(stored)
        if (this.session && !this.isSessionExpired()) {
          this._onDidSignIn.fire(this.session)
        } else {
          // Session expired, try to refresh
          await this.refreshToken()
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
    }
  }

  private isSessionExpired(): boolean {
    if (!this.session) return true
    return Date.now() >= this.session.expiresAt
  }

  private shouldRefreshToken(): boolean {
    if (!this.session) return false
    // Refresh if token expires in less than 5 minutes
    return Date.now() >= this.session.expiresAt - 5 * 60 * 1000
  }

  private handleSessionExpired(): void {
    this.session = undefined
    this._onDidSessionExpire.fire()
    vscode.window.showWarningMessage(
      'Your OSQR session has expired. Please sign in again.',
      'Sign In'
    ).then((selection) => {
      if (selection === 'Sign In') {
        this.signIn()
      }
    })
  }

  // PKCE helpers

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return this.base64UrlEncode(array)
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return this.base64UrlEncode(new Uint8Array(hash))
  }

  private base64UrlEncode(buffer: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i])
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose())
    this._onDidSignIn.dispose()
    this._onDidSignOut.dispose()
    this._onDidSessionExpire.dispose()
  }
}
