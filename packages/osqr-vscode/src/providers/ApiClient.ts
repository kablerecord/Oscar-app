/**
 * API Client for OSQR Backend
 *
 * Thin client - all intelligence stays server-side.
 * Handles chat, decisions, and usage tracking.
 */

import * as vscode from 'vscode'
import { AuthProvider } from './AuthProvider'
import { getApiUrl, getConfig } from '../utils/config'
import { captureWorkspaceContext } from '../utils/context'
import {
  ChatRequest,
  MarkDecisionRequest,
  DecisionResponse,
  UsageResponse,
  WorkspaceContext,
} from '../types'

export class ApiClient {
  private authProvider: AuthProvider

  constructor(authProvider: AuthProvider) {
    this.authProvider = authProvider
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.authProvider.getAccessToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(getApiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-OSQR-Source': 'vscode',
        ...options.headers,
      },
    })

    if (response.status === 401) {
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  /**
   * Send chat message with workspace context
   * Returns a ReadableStream for streaming responses
   */
  public async sendMessage(
    message: string,
    threadId?: string,
    mode: 'quick' | 'thoughtful' | 'contemplate' = 'quick'
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const token = await this.authProvider.getAccessToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    // Capture workspace context
    const config = getConfig()
    let workspaceContext: WorkspaceContext | undefined

    if (config.includeWorkspaceContext) {
      workspaceContext = await captureWorkspaceContext()
    }

    const body: ChatRequest = {
      message,
      threadId,
      workspaceContext,
      source: 'vscode',
      mode,
    }

    const response = await fetch(getApiUrl('/api/chat/stream'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-OSQR-Source': 'vscode',
      },
      body: JSON.stringify(body),
    })

    if (response.status === 401) {
      throw new Error('Session expired')
    }

    if (response.status === 403) {
      const error = await response.json().catch(() => ({}))
      if (error.reason === 'no_vscode_access') {
        throw new Error('VS Code access requires Pro tier or higher')
      }
      if (error.reason === 'token_limit') {
        throw new Error('Monthly token limit exceeded')
      }
      throw new Error(error.message || 'Access denied')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    return response.body.getReader()
  }

  /**
   * Send chat message without streaming (for simpler use cases)
   */
  public async sendMessageSync(
    message: string,
    threadId?: string
  ): Promise<{ response: string; threadId: string; tokensUsed: number }> {
    const config = getConfig()
    let workspaceContext: WorkspaceContext | undefined

    if (config.includeWorkspaceContext) {
      workspaceContext = await captureWorkspaceContext()
    }

    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        threadId,
        workspaceContext,
        source: 'vscode',
      }),
    })
  }

  /**
   * Mark text as a decision
   */
  public async markDecision(
    text: string,
    options: {
      messageId?: string
      conversationId?: string
      tags?: string[]
      context?: MarkDecisionRequest['context']
    } = {}
  ): Promise<DecisionResponse> {
    const request: MarkDecisionRequest = {
      text,
      source: 'vscode',
      ...options,
    }

    return this.request('/api/decisions/mark', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Get usage statistics
   */
  public async getUsage(): Promise<UsageResponse> {
    return this.request('/api/usage')
  }

  /**
   * Get recent decisions
   */
  public async getDecisions(
    limit: number = 20,
    source?: 'web' | 'vscode' | 'mobile'
  ): Promise<{ decisions: Array<{ id: string; text: string; createdAt: string; tags: string[] }>; count: number }> {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (source) {
      params.set('source', source)
    }
    return this.request(`/api/decisions/mark?${params}`)
  }

  /**
   * Create a new chat thread
   */
  public async createThread(title?: string): Promise<{ id: string; title: string }> {
    return this.request('/api/chat/threads', {
      method: 'POST',
      body: JSON.stringify({ title, source: 'vscode' }),
    })
  }

  /**
   * Get thread history
   */
  public async getThread(threadId: string): Promise<{
    id: string
    title: string
    messages: Array<{ role: string; content: string; createdAt: string }>
  }> {
    return this.request(`/api/chat/threads/${threadId}`)
  }

  /**
   * List recent threads
   */
  public async listThreads(limit: number = 10): Promise<{
    threads: Array<{ id: string; title: string; updatedAt: string }>
  }> {
    return this.request(`/api/chat/threads?limit=${limit}&source=vscode`)
  }
}
