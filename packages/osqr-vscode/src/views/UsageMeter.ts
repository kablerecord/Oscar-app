/**
 * Usage Meter Status Bar Item
 *
 * Shows token usage percentage in the status bar.
 */

import * as vscode from 'vscode'
import { ApiClient } from '../providers/ApiClient'
import { AuthProvider } from '../providers/AuthProvider'
import { UsageResponse } from '../types'

export class UsageMeter implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem
  private apiClient: ApiClient
  private authProvider: AuthProvider
  private refreshInterval: NodeJS.Timeout | undefined
  private disposables: vscode.Disposable[] = []

  constructor(apiClient: ApiClient, authProvider: AuthProvider) {
    this.apiClient = apiClient
    this.authProvider = authProvider

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    )
    this.statusBarItem.command = 'osqr.showUsage'
    this.statusBarItem.name = 'OSQR Usage'

    // Listen for auth changes
    this.disposables.push(
      this.authProvider.onDidSignIn(() => {
        this.show()
        this.refresh()
      }),
      this.authProvider.onDidSignOut(() => {
        this.hide()
      })
    )

    // Initial state
    if (this.authProvider.isAuthenticated()) {
      this.show()
      this.refresh()
    }

    // Start periodic refresh (every 5 minutes)
    this.refreshInterval = setInterval(() => {
      if (this.authProvider.isAuthenticated()) {
        this.refresh()
      }
    }, 5 * 60 * 1000)
  }

  /**
   * Show the status bar item
   */
  public show(): void {
    const config = vscode.workspace.getConfiguration('osqr')
    if (config.get<boolean>('showUsageMeter', true)) {
      this.statusBarItem.show()
    }
  }

  /**
   * Hide the status bar item
   */
  public hide(): void {
    this.statusBarItem.hide()
  }

  /**
   * Refresh usage data
   */
  public async refresh(): Promise<void> {
    try {
      const usage = await this.apiClient.getUsage()
      this.updateDisplay(usage)
    } catch (error) {
      console.error('Failed to refresh usage:', error)
      this.statusBarItem.text = '$(warning) OSQR'
      this.statusBarItem.tooltip = 'Failed to load usage data'
    }
  }

  /**
   * Update the status bar display
   */
  private updateDisplay(usage: UsageResponse): void {
    const percentage = usage.percentage
    const icon = this.getIcon(percentage)
    const tierIcon = this.getTierIcon(usage.tier)

    // Format token counts
    const usedFormatted = this.formatTokens(usage.used)
    const limitFormatted = this.formatTokens(usage.limit)

    this.statusBarItem.text = `${icon} ${percentage}%`

    // Build tooltip
    const resetDate = new Date(usage.resetDate)
    const daysUntilReset = Math.ceil(
      (resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    let tooltip = `OSQR Usage ${tierIcon}\n\n`
    tooltip += `Tokens: ${usedFormatted} / ${limitFormatted} (${percentage}%)\n\n`
    tooltip += `Breakdown:\n`
    tooltip += `  Web: ${this.formatTokens(usage.breakdown.web)}\n`
    tooltip += `  VS Code: ${this.formatTokens(usage.breakdown.vscode)}\n`
    tooltip += `  Mobile: ${this.formatTokens(usage.breakdown.mobile)}\n\n`
    tooltip += `Resets in ${daysUntilReset} day${daysUntilReset === 1 ? '' : 's'}`

    if (usage.overLimit) {
      tooltip += '\n\n$(warning) Over limit - upgrade for more tokens'
    }

    this.statusBarItem.tooltip = new vscode.MarkdownString(tooltip)

    // Set color based on usage
    if (percentage >= 90) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      )
    } else if (percentage >= 75) {
      this.statusBarItem.backgroundColor = undefined
    } else {
      this.statusBarItem.backgroundColor = undefined
    }
  }

  /**
   * Get icon based on usage percentage
   */
  private getIcon(percentage: number): string {
    if (percentage >= 90) return '$(warning)'
    if (percentage >= 75) return '$(circle-large-outline)'
    if (percentage >= 50) return '$(circle-large-filled)'
    return '$(check)'
  }

  /**
   * Get tier icon
   */
  private getTierIcon(tier: string): string {
    switch (tier) {
      case 'master':
        return '$(star-full)'
      case 'pro':
        return '$(star-half)'
      default:
        return '$(star-empty)'
    }
  }

  /**
   * Format token count for display
   */
  private formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(0)}K`
    }
    return tokens.toString()
  }

  /**
   * Show detailed usage modal
   */
  public async showUsageDetails(): Promise<void> {
    try {
      const usage = await this.apiClient.getUsage()

      const usedFormatted = this.formatTokens(usage.used)
      const limitFormatted = this.formatTokens(usage.limit)
      const resetDate = new Date(usage.resetDate).toLocaleDateString()

      const message = [
        `OSQR Usage (${usage.tier.toUpperCase()} tier)`,
        '',
        `Total: ${usedFormatted} / ${limitFormatted} (${usage.percentage}%)`,
        '',
        `Breakdown:`,
        `  Web: ${this.formatTokens(usage.breakdown.web)}`,
        `  VS Code: ${this.formatTokens(usage.breakdown.vscode)}`,
        `  Mobile: ${this.formatTokens(usage.breakdown.mobile)}`,
        '',
        `Resets: ${resetDate}`,
      ].join('\n')

      const action = await vscode.window.showInformationMessage(
        message,
        { modal: true },
        usage.percentage >= 75 ? 'Upgrade' : 'OK'
      )

      if (action === 'Upgrade') {
        vscode.env.openExternal(vscode.Uri.parse('https://app.osqr.ai/pricing'))
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load usage: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  public dispose(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
    this.statusBarItem.dispose()
    this.disposables.forEach((d) => d.dispose())
  }
}
