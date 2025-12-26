/**
 * OSQR VS Code Extension Types
 */

// API Response types
export interface UsageResponse {
  used: number
  limit: number
  percentage: number
  overLimit: boolean
  resetDate: string
  tier: 'lite' | 'pro' | 'master'
  vsCodeAccess: boolean
  breakdown: {
    web: number
    vscode: number
    mobile: number
  }
}

export interface DecisionResponse {
  id: string
  createdAt: string
  success: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface ChatThread {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

// Workspace context sent with every message
export interface WorkspaceContext {
  // Active file info
  activeFile?: {
    path: string
    language: string
    selection?: {
      text: string
      startLine: number
      endLine: number
    }
  }
  // Open files in editor
  openFiles: string[]
  // Git context
  git?: {
    branch: string
    repoName: string
    uncommittedChanges: boolean
  }
  // Project structure hints
  project?: {
    hasPackageJson: boolean
    hasTsConfig: boolean
    hasGitIgnore: boolean
    rootPath: string
    workspaceName: string
  }
}

// API request types
export interface ChatRequest {
  message: string
  threadId?: string
  workspaceContext?: WorkspaceContext
  source: 'vscode'
  mode?: 'quick' | 'thoughtful' | 'contemplate'
}

export interface MarkDecisionRequest {
  messageId?: string
  text: string
  conversationId?: string
  source: 'vscode'
  tags?: string[]
  context?: {
    file?: string
    gitBranch?: string
    selection?: string
  }
}

// Auth types
export interface AuthSession {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  user: {
    id: string
    email: string
    name?: string
    tier: 'lite' | 'pro' | 'master'
  }
}

// Extension state
export interface ExtensionState {
  isAuthenticated: boolean
  session?: AuthSession
  currentThread?: ChatThread
  usage?: UsageResponse
}

// Events
export type ExtensionEventType =
  | 'auth:signedIn'
  | 'auth:signedOut'
  | 'auth:sessionExpired'
  | 'chat:messageReceived'
  | 'chat:threadCreated'
  | 'usage:updated'
  | 'error:occurred'

export interface ExtensionEvent {
  type: ExtensionEventType
  payload?: unknown
  timestamp: Date
}
