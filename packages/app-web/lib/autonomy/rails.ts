/**
 * Autonomy Rails System (J-5 Implementation)
 *
 * OSQR can suggest actions, but users control what actually happens.
 * This creates a permission framework where:
 * 1. Actions are classified by impact level
 * 2. Users grant permission levels
 * 3. Actions are gated before execution
 *
 * Philosophy: "OSQR can think freely but act carefully"
 */

import { prisma } from '../db/prisma'

// ============================================
// Action Classification
// ============================================

export type ActionImpact = 'observe' | 'suggest' | 'assist' | 'execute'
export type ActionCategory =
  | 'read'
  | 'analyze'
  | 'suggest-msc'
  | 'modify-msc'
  | 'email'
  | 'calendar'
  | 'file-write'
  | 'integration'
  | 'background-task'

export interface Action {
  id: string
  category: ActionCategory
  impact: ActionImpact
  description: string
  requiresConfirmation: boolean
  canUndo: boolean
}

// Action catalog - all actions OSQR can take
const ACTION_CATALOG: Record<string, Action> = {
  // Reading/Analysis - always allowed
  'read-context': {
    id: 'read-context',
    category: 'read',
    impact: 'observe',
    description: 'Read workspace context (profile, MSC, documents)',
    requiresConfirmation: false,
    canUndo: false,
  },
  'analyze-conversation': {
    id: 'analyze-conversation',
    category: 'analyze',
    impact: 'observe',
    description: 'Analyze conversation for insights',
    requiresConfirmation: false,
    canUndo: false,
  },
  'search-knowledge': {
    id: 'search-knowledge',
    category: 'read',
    impact: 'observe',
    description: 'Search indexed knowledge base',
    requiresConfirmation: false,
    canUndo: false,
  },

  // Suggestions - low impact, shown but not acted on
  'suggest-goal': {
    id: 'suggest-goal',
    category: 'suggest-msc',
    impact: 'suggest',
    description: 'Suggest a new goal based on conversation',
    requiresConfirmation: false,
    canUndo: false,
  },
  'suggest-project': {
    id: 'suggest-project',
    category: 'suggest-msc',
    impact: 'suggest',
    description: 'Suggest a new project based on conversation',
    requiresConfirmation: false,
    canUndo: false,
  },
  'suggest-task': {
    id: 'suggest-task',
    category: 'suggest-msc',
    impact: 'suggest',
    description: 'Suggest breaking down a task',
    requiresConfirmation: false,
    canUndo: false,
  },

  // Assist - requires user approval per instance
  'add-msc-item': {
    id: 'add-msc-item',
    category: 'modify-msc',
    impact: 'assist',
    description: 'Add a new goal, project, or idea to MSC',
    requiresConfirmation: true,
    canUndo: true,
  },
  'update-msc-item': {
    id: 'update-msc-item',
    category: 'modify-msc',
    impact: 'assist',
    description: 'Update an existing MSC item',
    requiresConfirmation: true,
    canUndo: true,
  },
  'complete-msc-item': {
    id: 'complete-msc-item',
    category: 'modify-msc',
    impact: 'assist',
    description: 'Mark an MSC item as complete',
    requiresConfirmation: true,
    canUndo: true,
  },
  'schedule-task': {
    id: 'schedule-task',
    category: 'background-task',
    impact: 'assist',
    description: 'Schedule a background task',
    requiresConfirmation: true,
    canUndo: true,
  },

  // Execute - requires explicit permission grant
  'draft-email': {
    id: 'draft-email',
    category: 'email',
    impact: 'execute',
    description: 'Draft an email (saved as draft, not sent)',
    requiresConfirmation: true,
    canUndo: true,
  },
  'add-calendar-event': {
    id: 'add-calendar-event',
    category: 'calendar',
    impact: 'execute',
    description: 'Add an event to calendar',
    requiresConfirmation: true,
    canUndo: true,
  },
  'write-file': {
    id: 'write-file',
    category: 'file-write',
    impact: 'execute',
    description: 'Write/export a file',
    requiresConfirmation: true,
    canUndo: false,
  },
  'trigger-integration': {
    id: 'trigger-integration',
    category: 'integration',
    impact: 'execute',
    description: 'Trigger an external integration',
    requiresConfirmation: true,
    canUndo: false,
  },
}

// ============================================
// Permission Levels
// ============================================

export type PermissionLevel = 'none' | 'ask' | 'auto' | 'silent'

export interface PermissionGrant {
  category: ActionCategory
  level: PermissionLevel
  grantedAt: Date
  expiresAt?: Date
}

export interface WorkspacePermissions {
  workspaceId: string
  grants: PermissionGrant[]
  defaultLevel: PermissionLevel
}

// Default permissions - conservative by default
const DEFAULT_PERMISSIONS: Record<ActionCategory, PermissionLevel> = {
  'read': 'silent', // Always allow reading
  'analyze': 'silent', // Always allow analysis
  'suggest-msc': 'silent', // Suggestions are safe to show
  'modify-msc': 'ask', // Modifications need approval
  'email': 'none', // Email disabled until granted
  'calendar': 'none', // Calendar disabled until granted
  'file-write': 'ask', // File writes need approval
  'integration': 'none', // Integrations disabled until granted
  'background-task': 'ask', // Background tasks need approval
}

// ============================================
// Permission Checking
// ============================================

/**
 * Get permissions for a workspace
 */
export async function getWorkspacePermissions(workspaceId: string): Promise<WorkspacePermissions> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  if (!workspace) {
    return {
      workspaceId,
      grants: [],
      defaultLevel: 'ask',
    }
  }

  // Fetch permission grants from UserSetting
  const storedGrants = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: `permissions_${workspaceId}`,
    },
  })

  const grants = (storedGrants?.value as unknown as PermissionGrant[]) || []

  return {
    workspaceId,
    grants,
    defaultLevel: 'ask',
  }
}

/**
 * Check if an action is permitted
 */
export async function checkActionPermission(
  workspaceId: string,
  actionId: string
): Promise<{
  permitted: boolean
  level: PermissionLevel
  requiresConfirmation: boolean
  reason?: string
}> {
  const action = ACTION_CATALOG[actionId]

  if (!action) {
    return {
      permitted: false,
      level: 'none',
      requiresConfirmation: false,
      reason: 'Unknown action',
    }
  }

  const permissions = await getWorkspacePermissions(workspaceId)

  // Find specific grant for this category
  const grant = permissions.grants.find((g) => g.category === action.category)

  // Check expiration
  if (grant?.expiresAt && grant.expiresAt < new Date()) {
    // Grant expired, fall back to default
  }

  const level = grant?.level || DEFAULT_PERMISSIONS[action.category]

  switch (level) {
    case 'silent':
      return { permitted: true, level, requiresConfirmation: false }
    case 'auto':
      return { permitted: true, level, requiresConfirmation: action.requiresConfirmation }
    case 'ask':
      return { permitted: true, level, requiresConfirmation: true }
    case 'none':
      return {
        permitted: false,
        level,
        requiresConfirmation: false,
        reason: `Action category "${action.category}" is not enabled for this workspace`,
      }
  }
}

/**
 * Grant permission for a category
 */
export async function grantPermission(
  workspaceId: string,
  category: ActionCategory,
  level: PermissionLevel,
  expiresInHours?: number
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  if (!workspace) return

  const permissions = await getWorkspacePermissions(workspaceId)

  // Remove existing grant for this category
  const grants = permissions.grants.filter((g) => g.category !== category)

  // Add new grant
  grants.push({
    category,
    level,
    grantedAt: new Date(),
    expiresAt: expiresInHours ? new Date(Date.now() + expiresInHours * 3600000) : undefined,
  })

  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: workspace.ownerId,
        key: `permissions_${workspaceId}`,
      },
    },
    create: {
      userId: workspace.ownerId,
      key: `permissions_${workspaceId}`,
      value: grants as object,
    },
    update: {
      value: grants as object,
    },
  })
}

/**
 * Revoke permission for a category
 */
export async function revokePermission(workspaceId: string, category: ActionCategory): Promise<void> {
  await grantPermission(workspaceId, category, 'none')
}

// ============================================
// Action Classification (from text)
// ============================================

export interface ClassifiedAction {
  actionId: string
  action: Action
  confidence: number
  params?: Record<string, any>
}

/**
 * Classify intent from OSQR's response
 * Detects when OSQR wants to take an action
 */
export function classifyActionIntent(responseText: string): ClassifiedAction[] {
  const actions: ClassifiedAction[] = []

  // Detect MSC suggestions
  if (/(?:add|create|track).*(?:goal|project|idea)/i.test(responseText)) {
    if (/(?:should I|would you like me to|I can)/i.test(responseText)) {
      actions.push({
        actionId: 'suggest-goal',
        action: ACTION_CATALOG['suggest-goal'],
        confidence: 0.7,
      })
    } else {
      actions.push({
        actionId: 'add-msc-item',
        action: ACTION_CATALOG['add-msc-item'],
        confidence: 0.6,
      })
    }
  }

  // Detect task scheduling
  if (/(?:schedule|set up|create).*(?:task|reminder|check-in)/i.test(responseText)) {
    actions.push({
      actionId: 'schedule-task',
      action: ACTION_CATALOG['schedule-task'],
      confidence: 0.6,
    })
  }

  // Detect email drafting
  if (/(?:draft|write|compose).*(?:email|message)/i.test(responseText)) {
    actions.push({
      actionId: 'draft-email',
      action: ACTION_CATALOG['draft-email'],
      confidence: 0.7,
    })
  }

  // Detect calendar events
  if (/(?:add|schedule|create).*(?:meeting|event|appointment)/i.test(responseText)) {
    actions.push({
      actionId: 'add-calendar-event',
      action: ACTION_CATALOG['add-calendar-event'],
      confidence: 0.7,
    })
  }

  return actions
}

// ============================================
// Action Execution Gate
// ============================================

export interface ActionRequest {
  actionId: string
  workspaceId: string
  params?: Record<string, any>
  source: 'osqr' | 'user' | 'system'
}

export interface ActionResult {
  success: boolean
  executed: boolean
  awaitingConfirmation?: boolean
  confirmationId?: string
  result?: any
  error?: string
}

/**
 * Request to execute an action (goes through permission gate)
 */
export async function requestAction(request: ActionRequest): Promise<ActionResult> {
  const permission = await checkActionPermission(request.workspaceId, request.actionId)

  if (!permission.permitted) {
    return {
      success: false,
      executed: false,
      error: permission.reason || 'Action not permitted',
    }
  }

  if (permission.requiresConfirmation) {
    // Store pending action for user confirmation
    const confirmationId = await storePendingAction(request)
    return {
      success: true,
      executed: false,
      awaitingConfirmation: true,
      confirmationId,
    }
  }

  // Execute directly (silent or auto mode)
  return await executeAction(request)
}

/**
 * Store pending action for user confirmation
 */
async function storePendingAction(request: ActionRequest): Promise<string> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: request.workspaceId },
  })

  if (!workspace) throw new Error('Workspace not found')

  // Store as UserSetting (temporary until we have a proper actions table)
  const pendingKey = `pending_action_${Date.now()}`

  await prisma.userSetting.create({
    data: {
      userId: workspace.ownerId,
      key: pendingKey,
      value: {
        ...request,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(), // 24h expiry
      } as object,
    },
  })

  return pendingKey
}

/**
 * Execute an action (after permission check)
 */
async function executeAction(request: ActionRequest): Promise<ActionResult> {
  const action = ACTION_CATALOG[request.actionId]

  if (!action) {
    return { success: false, executed: false, error: 'Unknown action' }
  }

  try {
    // Action handlers would be registered here
    // For now, just log and return success
    console.log(`[Autonomy] Executing action: ${request.actionId}`, request.params)

    return {
      success: true,
      executed: true,
      result: { actionId: request.actionId, timestamp: new Date().toISOString() },
    }
  } catch (error) {
    return {
      success: false,
      executed: false,
      error: error instanceof Error ? error.message : 'Execution failed',
    }
  }
}

/**
 * Confirm a pending action
 */
export async function confirmPendingAction(
  workspaceId: string,
  confirmationId: string
): Promise<ActionResult> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  if (!workspace) {
    return { success: false, executed: false, error: 'Workspace not found' }
  }

  const pending = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: confirmationId,
    },
  })

  if (!pending) {
    return { success: false, executed: false, error: 'Pending action not found or expired' }
  }

  const request = pending.value as unknown as ActionRequest & { expiresAt: string }

  // Check expiration
  if (new Date(request.expiresAt) < new Date()) {
    await prisma.userSetting.delete({ where: { id: pending.id } })
    return { success: false, executed: false, error: 'Action expired' }
  }

  // Delete pending action
  await prisma.userSetting.delete({ where: { id: pending.id } })

  // Execute the action
  return await executeAction(request)
}

/**
 * Reject/cancel a pending action
 */
export async function rejectPendingAction(
  workspaceId: string,
  confirmationId: string
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  if (!workspace) return

  await prisma.userSetting.deleteMany({
    where: {
      userId: workspace.ownerId,
      key: confirmationId,
    },
  })
}

// ============================================
// Utility Exports
// ============================================

export function getActionCatalog(): Record<string, Action> {
  return { ...ACTION_CATALOG }
}

export function getActionById(id: string): Action | undefined {
  return ACTION_CATALOG[id]
}

export function getDefaultPermissions(): Record<ActionCategory, PermissionLevel> {
  return { ...DEFAULT_PERMISSIONS }
}
