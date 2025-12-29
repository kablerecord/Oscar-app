/**
 * Mark as Decision Command
 *
 * Allows users to mark selected text or conversation excerpts as decisions.
 */

import * as vscode from 'vscode'
import { ApiClient } from '../providers/ApiClient'
import { AuthProvider } from '../providers/AuthProvider'
import { getSelectionText, getCurrentFilePath } from '../utils/context'

export class MarkDecisionCommand {
  private apiClient: ApiClient
  private authProvider: AuthProvider

  constructor(apiClient: ApiClient, authProvider: AuthProvider) {
    this.apiClient = apiClient
    this.authProvider = authProvider
  }

  /**
   * Execute the mark decision command
   */
  public async execute(
    text?: string,
    options?: {
      messageId?: string
      conversationId?: string
    }
  ): Promise<void> {
    // Check authentication
    if (!this.authProvider.isAuthenticated()) {
      const action = await vscode.window.showWarningMessage(
        'Please sign in to OSQR to mark decisions.',
        'Sign In'
      )
      if (action === 'Sign In') {
        await vscode.commands.executeCommand('osqr.signIn')
      }
      return
    }

    // Get text from selection if not provided
    let decisionText = text
    if (!decisionText) {
      decisionText = getSelectionText()
    }

    // If still no text, prompt user
    if (!decisionText) {
      decisionText = await vscode.window.showInputBox({
        prompt: 'Enter the decision to save',
        placeHolder: 'e.g., Use PostgreSQL for the database',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Decision text is required'
          }
          if (value.length > 2000) {
            return 'Decision text must be less than 2000 characters'
          }
          return null
        },
      })
    }

    if (!decisionText || decisionText.trim().length === 0) {
      return // User cancelled
    }

    // Prompt for tags
    const tagsInput = await vscode.window.showInputBox({
      prompt: 'Add tags (optional, comma-separated)',
      placeHolder: 'e.g., architecture, database, priority',
    })

    const tags = tagsInput
      ? tagsInput.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
      : []

    // Get context
    const filePath = getCurrentFilePath()

    try {
      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Saving decision...',
          cancellable: false,
        },
        async () => {
          await this.apiClient.markDecision(decisionText!, {
            messageId: options?.messageId,
            conversationId: options?.conversationId,
            tags,
            context: filePath ? { file: filePath } : undefined,
          })

          vscode.window.showInformationMessage(
            `Decision saved! ${tags.length > 0 ? `Tags: ${tags.join(', ')}` : ''}`,
            'View Decisions'
          ).then((action) => {
            if (action === 'View Decisions') {
              vscode.env.openExternal(
                vscode.Uri.parse('https://app.osqr.ai/decisions')
              )
            }
          })
        }
      )
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save decision: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Execute from editor context menu (uses selection)
   */
  public async executeFromSelection(): Promise<void> {
    const selection = getSelectionText()
    if (!selection) {
      vscode.window.showWarningMessage('Please select text to mark as a decision.')
      return
    }
    await this.execute(selection)
  }
}
