/**
 * Configuration utilities for OSQR VS Code extension
 */

import * as vscode from 'vscode'

export interface OsqrConfig {
  apiEndpoint: string
  autoSaveConversations: boolean
  includeWorkspaceContext: boolean
  showUsageMeter: boolean
}

/**
 * Get the current extension configuration
 */
export function getConfig(): OsqrConfig {
  const config = vscode.workspace.getConfiguration('osqr')

  return {
    apiEndpoint: config.get<string>('apiEndpoint', 'https://app.osqr.ai'),
    autoSaveConversations: config.get<boolean>('autoSaveConversations', true),
    includeWorkspaceContext: config.get<boolean>('includeWorkspaceContext', true),
    showUsageMeter: config.get<boolean>('showUsageMeter', true),
  }
}

/**
 * Get API URL for a specific endpoint
 */
export function getApiUrl(path: string): string {
  const config = getConfig()
  const baseUrl = config.apiEndpoint.replace(/\/$/, '')
  return `${baseUrl}${path}`
}

/**
 * OAuth configuration
 */
export const OAUTH_CONFIG = {
  clientId: 'osqr-vscode',
  // Using authorization code flow with PKCE
  authorizationEndpoint: '/api/auth/vscode/authorize',
  tokenEndpoint: '/api/auth/vscode/token',
  redirectUri: 'vscode://osqr.osqr-vscode/callback',
  scopes: ['read', 'write'],
}
