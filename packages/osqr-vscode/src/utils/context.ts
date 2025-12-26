/**
 * Workspace Context Capture
 *
 * Captures contextual information about the user's workspace to send with messages.
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceContext } from '../types'

/**
 * Capture current workspace context
 */
export async function captureWorkspaceContext(): Promise<WorkspaceContext> {
  const context: WorkspaceContext = {
    openFiles: [],
  }

  // Get active editor info
  const activeEditor = vscode.window.activeTextEditor
  if (activeEditor) {
    const document = activeEditor.document
    const selection = activeEditor.selection

    context.activeFile = {
      path: getRelativePath(document.uri.fsPath),
      language: document.languageId,
    }

    // Include selection if any
    if (!selection.isEmpty) {
      const selectedText = document.getText(selection)
      context.activeFile.selection = {
        text: truncateText(selectedText, 2000), // Limit selection size
        startLine: selection.start.line + 1,
        endLine: selection.end.line + 1,
      }
    }
  }

  // Get open files
  context.openFiles = vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .filter((tab) => tab.input instanceof vscode.TabInputText)
    .map((tab) => {
      const input = tab.input as vscode.TabInputText
      return getRelativePath(input.uri.fsPath)
    })
    .slice(0, 10) // Limit to 10 files

  // Get git context
  context.git = await getGitContext()

  // Get project context
  context.project = getProjectContext()

  return context
}

/**
 * Get Git repository context
 */
async function getGitContext(): Promise<WorkspaceContext['git'] | undefined> {
  try {
    const gitExtension = vscode.extensions.getExtension('vscode.git')
    if (!gitExtension) return undefined

    const git = gitExtension.isActive
      ? gitExtension.exports
      : await gitExtension.activate()

    const api = git.getAPI(1)
    if (!api || api.repositories.length === 0) return undefined

    const repo = api.repositories[0]
    const head = repo.state.HEAD

    return {
      branch: head?.name || 'unknown',
      repoName: path.basename(repo.rootUri.fsPath),
      uncommittedChanges:
        repo.state.workingTreeChanges.length > 0 ||
        repo.state.indexChanges.length > 0,
    }
  } catch (error) {
    console.error('Failed to get git context:', error)
    return undefined
  }
}

/**
 * Get project structure context
 */
function getProjectContext(): WorkspaceContext['project'] | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders || workspaceFolders.length === 0) return undefined

  const rootPath = workspaceFolders[0].uri.fsPath
  const workspaceName = workspaceFolders[0].name

  return {
    hasPackageJson: fileExists(path.join(rootPath, 'package.json')),
    hasTsConfig: fileExists(path.join(rootPath, 'tsconfig.json')),
    hasGitIgnore: fileExists(path.join(rootPath, '.gitignore')),
    rootPath: rootPath,
    workspaceName: workspaceName,
  }
}

/**
 * Get relative path from workspace root
 */
function getRelativePath(absolutePath: string): string {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return absolutePath
  }

  const rootPath = workspaceFolders[0].uri.fsPath
  if (absolutePath.startsWith(rootPath)) {
    return absolutePath.substring(rootPath.length + 1)
  }

  return absolutePath
}

/**
 * Check if file exists
 */
function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

/**
 * Truncate text to max length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '... [truncated]'
}

/**
 * Get current selection text from active editor
 */
export function getSelectionText(): string | undefined {
  const editor = vscode.window.activeTextEditor
  if (!editor) return undefined

  const selection = editor.selection
  if (selection.isEmpty) return undefined

  return editor.document.getText(selection)
}

/**
 * Get current file path
 */
export function getCurrentFilePath(): string | undefined {
  const editor = vscode.window.activeTextEditor
  if (!editor) return undefined

  return getRelativePath(editor.document.uri.fsPath)
}
