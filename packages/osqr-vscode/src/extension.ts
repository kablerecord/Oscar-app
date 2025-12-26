/**
 * OSQR VS Code Extension
 *
 * Your AI thinking companion - brings persistent memory and multi-model reasoning to VS Code.
 *
 * Key features:
 * - Thin client: All intelligence stays server-side
 * - Every conversation auto-saves to PKV (no ephemeral mode)
 * - Captures workspace context with every message
 * - "Mark as Decision" command for capturing important choices
 * - Usage meter showing token percentage
 * - Pro tier minimum required for VS Code access
 */

import * as vscode from 'vscode'
import { AuthProvider } from './providers/AuthProvider'
import { ApiClient } from './providers/ApiClient'
import { ChatViewProvider } from './views/ChatViewProvider'
import { UsageMeter } from './views/UsageMeter'
import { MarkDecisionCommand } from './commands/markDecision'
import { getSelectionText } from './utils/context'

let authProvider: AuthProvider
let apiClient: ApiClient
let usageMeter: UsageMeter
let markDecisionCommand: MarkDecisionCommand

export async function activate(context: vscode.ExtensionContext) {
  console.log('OSQR extension activating...')

  // Initialize auth provider
  authProvider = AuthProvider.getInstance(context)
  await authProvider.initialize()

  // Initialize API client
  apiClient = new ApiClient(authProvider)

  // Initialize mark decision command
  markDecisionCommand = new MarkDecisionCommand(apiClient, authProvider)

  // Initialize usage meter
  usageMeter = new UsageMeter(apiClient, authProvider)
  context.subscriptions.push(usageMeter)

  // Register chat view provider
  const chatViewProvider = new ChatViewProvider(
    context.extensionUri,
    apiClient,
    authProvider,
    markDecisionCommand
  )

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      chatViewProvider
    )
  )

  // Register commands
  context.subscriptions.push(
    // Sign in
    vscode.commands.registerCommand('osqr.signIn', async () => {
      await authProvider.signIn()
    }),

    // Sign out
    vscode.commands.registerCommand('osqr.signOut', async () => {
      await authProvider.signOut()
    }),

    // Mark as decision (from command palette or keyboard shortcut)
    vscode.commands.registerCommand('osqr.markDecision', async () => {
      const selection = getSelectionText()
      if (selection) {
        await markDecisionCommand.execute(selection)
      } else {
        await markDecisionCommand.execute()
      }
    }),

    // Explain selection
    vscode.commands.registerCommand('osqr.explainSelection', async () => {
      const selection = getSelectionText()
      if (!selection) {
        vscode.window.showWarningMessage('Please select code to explain.')
        return
      }

      if (!authProvider.isAuthenticated()) {
        const action = await vscode.window.showWarningMessage(
          'Please sign in to OSQR to explain code.',
          'Sign In'
        )
        if (action === 'Sign In') {
          await authProvider.signIn()
        }
        return
      }

      // Open sidebar and send message
      await vscode.commands.executeCommand('osqr.chatView.focus')
      // The chat view will handle sending the message with context
    }),

    // Ask OSQR (opens chat with optional selection)
    vscode.commands.registerCommand('osqr.askOsqr', async () => {
      if (!authProvider.isAuthenticated()) {
        const action = await vscode.window.showWarningMessage(
          'Please sign in to OSQR.',
          'Sign In'
        )
        if (action === 'Sign In') {
          await authProvider.signIn()
        }
        return
      }

      await vscode.commands.executeCommand('osqr.chatView.focus')
    }),

    // Show usage details
    vscode.commands.registerCommand('osqr.showUsage', async () => {
      if (!authProvider.isAuthenticated()) {
        vscode.window.showWarningMessage('Please sign in to view usage.')
        return
      }
      await usageMeter.showUsageDetails()
    }),

    // Refresh usage (called after API requests)
    vscode.commands.registerCommand('osqr.refreshUsage', async () => {
      await usageMeter.refresh()
    }),

    // Refine question (placeholder for future)
    vscode.commands.registerCommand('osqr.refineQuestion', async () => {
      vscode.window.showInformationMessage(
        'Refine Question feature coming soon!'
      )
    })
  )

  // Register auth provider disposal
  context.subscriptions.push(authProvider)

  // Show welcome message for first-time users
  const hasShownWelcome = context.globalState.get('osqr.hasShownWelcome')
  if (!hasShownWelcome) {
    const action = await vscode.window.showInformationMessage(
      'Welcome to OSQR! Sign in to start chatting with your AI thinking companion.',
      'Sign In',
      'Later'
    )
    if (action === 'Sign In') {
      await authProvider.signIn()
    }
    await context.globalState.update('osqr.hasShownWelcome', true)
  }

  console.log('OSQR extension activated')
}

export function deactivate() {
  console.log('OSQR extension deactivated')
}
