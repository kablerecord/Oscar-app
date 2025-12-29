/**
 * Active Audit State Manager
 *
 * Manages the state files that track progress between Oscar and Claude.
 * These files live at docs/audits/active/[SPEC_NAME]_AUDIT.md
 */

import * as fs from 'fs'
import * as path from 'path'
import type {
  ActiveAudit,
  AuditCheckpoint,
  FindingResolution,
  ClaudeNote,
  ExecutionLogEntry,
  AuditFinding,
  ResolutionStatus,
} from './types'

// =============================================================================
// CONFIGURATION
// =============================================================================

const ACTIVE_AUDITS_DIR = 'docs/audits/active'
const COMPLETED_AUDITS_DIR = 'docs/audits/completed'

// =============================================================================
// FILE OPERATIONS
// =============================================================================

/**
 * Get the active audit file path for a spec
 */
function getActiveAuditPath(specPath: string): string {
  const specName = path.basename(specPath, '.md')
    .replace(/_SPEC$/i, '')
    .toUpperCase()
  return path.join(ACTIVE_AUDITS_DIR, `${specName}_AUDIT.md`)
}

/**
 * Check if an active audit exists for a spec
 */
export function hasActiveAudit(specPath: string): boolean {
  return fs.existsSync(getActiveAuditPath(specPath))
}

/**
 * Create a new active audit
 */
export function createActiveAudit(
  specPath: string,
  specTitle: string,
  findings: AuditFinding[]
): ActiveAudit {
  const audit: ActiveAudit = {
    specPath,
    specTitle,
    status: 'IN_PROGRESS',
    startedAt: new Date(),
    lastUpdatedAt: new Date(),
    checkpoint: {
      currentPosition: 0,
      totalRequirements: findings.length,
      lastProcessedId: findings[0]?.id || '',
      nextUpId: findings[1]?.id,
    },
    resolutions: findings.map(f => ({
      findingId: f.id,
      status: 'PENDING' as ResolutionStatus,
      updatedAt: new Date(),
      updatedBy: 'oscar',
    })),
    claudeNotes: [],
    findings,
    executionLog: [{
      date: new Date(),
      actor: 'oscar',
      action: `Initial audit, ${findings.length} findings`,
    }],
  }

  saveActiveAudit(audit)
  return audit
}

/**
 * Load an existing active audit
 */
export function getActiveAudit(specPath: string): ActiveAudit | null {
  const auditPath = getActiveAuditPath(specPath)

  if (!fs.existsSync(auditPath)) {
    return null
  }

  const content = fs.readFileSync(auditPath, 'utf-8')
  return parseActiveAuditMarkdown(content, specPath)
}

/**
 * Save an active audit to file
 */
export function saveActiveAudit(audit: ActiveAudit): void {
  const auditPath = getActiveAuditPath(audit.specPath)
  const markdown = renderActiveAuditMarkdown(audit)

  // Ensure directory exists
  const dir = path.dirname(auditPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(auditPath, markdown)
}

// =============================================================================
// STATE UPDATES
// =============================================================================

/**
 * Update checkpoint position
 */
export function updateCheckpoint(
  specPath: string,
  position: number,
  lastProcessedId: string,
  nextUpId?: string
): void {
  const audit = getActiveAudit(specPath)
  if (!audit) return

  audit.checkpoint = {
    currentPosition: position,
    totalRequirements: audit.checkpoint.totalRequirements,
    lastProcessedId,
    nextUpId,
  }
  audit.lastUpdatedAt = new Date()

  saveActiveAudit(audit)
}

/**
 * Add a note from Claude for Oscar
 */
export function addClaudeNote(
  specPath: string,
  note: string,
  findingId?: string
): void {
  const audit = getActiveAudit(specPath)
  if (!audit) return

  audit.claudeNotes.push({
    findingId,
    note,
    addedAt: new Date(),
  })
  audit.lastUpdatedAt = new Date()

  appendToExecutionLog(specPath, 'claude', `Added note${findingId ? ` for ${findingId}` : ''}`)
  saveActiveAudit(audit)
}

/**
 * Update resolution status for a finding
 */
export function updateResolutionStatus(
  specPath: string,
  findingId: string,
  status: ResolutionStatus,
  resolution?: string,
  notes?: string
): void {
  const audit = getActiveAudit(specPath)
  if (!audit) return

  const resolutionIndex = audit.resolutions.findIndex(r => r.findingId === findingId)

  if (resolutionIndex >= 0) {
    audit.resolutions[resolutionIndex] = {
      findingId,
      status,
      resolution,
      notes,
      updatedAt: new Date(),
      updatedBy: 'claude',
    }
  }

  audit.lastUpdatedAt = new Date()
  appendToExecutionLog(specPath, 'claude', `${findingId}: ${status}`)
  saveActiveAudit(audit)
}

/**
 * Append to execution log
 */
export function appendToExecutionLog(
  specPath: string,
  actor: 'oscar' | 'claude' | 'kable',
  action: string
): void {
  const audit = getActiveAudit(specPath)
  if (!audit) return

  audit.executionLog.push({
    date: new Date(),
    actor,
    action,
  })

  saveActiveAudit(audit)
}

/**
 * Check if audit is complete
 */
export function isAuditComplete(specPath: string): boolean {
  const audit = getActiveAudit(specPath)
  if (!audit) return false

  const terminalStatuses: ResolutionStatus[] = ['RESOLVED', 'DEFERRED', 'WONT_FIX', 'PASS']

  return audit.resolutions.every(r => terminalStatuses.includes(r.status))
}

/**
 * Archive completed audit
 */
export function archiveAudit(specPath: string): void {
  const audit = getActiveAudit(specPath)
  if (!audit) return

  audit.status = 'COMPLETE'
  audit.lastUpdatedAt = new Date()
  appendToExecutionLog(specPath, 'oscar', 'Audit complete, archiving')

  // Move to completed directory
  const activePath = getActiveAuditPath(specPath)
  const completedPath = activePath.replace(ACTIVE_AUDITS_DIR, COMPLETED_AUDITS_DIR)

  // Ensure completed directory exists
  const dir = path.dirname(completedPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Save to completed and remove from active
  fs.writeFileSync(completedPath, renderActiveAuditMarkdown(audit))
  fs.unlinkSync(activePath)
}

// =============================================================================
// MARKDOWN RENDERING
// =============================================================================

/**
 * Render active audit to markdown format
 */
function renderActiveAuditMarkdown(audit: ActiveAudit): string {
  const lines: string[] = []

  // Header
  lines.push(`# ACTIVE AUDIT: ${audit.specTitle}`)
  lines.push('')
  lines.push(`**Spec:** ${audit.specPath}`)
  lines.push(`**Started:** ${audit.startedAt.toISOString().split('T')[0]}`)
  lines.push(`**Last Updated:** ${audit.lastUpdatedAt.toISOString().replace('T', ' ').slice(0, 16)}`)
  lines.push(`**Status:** ${audit.status}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Checkpoint
  lines.push('## Checkpoint')
  lines.push('')
  lines.push(`**Current Position:** Requirement ${audit.checkpoint.currentPosition + 1} of ${audit.checkpoint.totalRequirements}`)
  lines.push(`**Last Processed:** ${audit.checkpoint.lastProcessedId}`)
  if (audit.checkpoint.nextUpId) {
    lines.push(`**Next Up:** ${audit.checkpoint.nextUpId}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  // Resolution Status
  lines.push('## Resolution Status')
  lines.push('')
  lines.push('| Finding ID | Status | Resolution | Notes |')
  lines.push('|------------|--------|------------|-------|')
  for (const res of audit.resolutions) {
    lines.push(`| ${res.findingId} | ${res.status} | ${res.resolution || '-'} | ${res.notes || '-'} |`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  // Claude's Notes
  lines.push("## Claude's Notes for Oscar")
  lines.push('')
  if (audit.claudeNotes.length === 0) {
    lines.push('*No notes yet.*')
  } else {
    for (const note of audit.claudeNotes) {
      if (note.findingId) {
        lines.push(`> **${note.findingId}:** ${note.note}`)
      } else {
        lines.push(`> **General:** ${note.note}`)
      }
      lines.push('')
    }
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  // Oscar's Findings (just IDs, not full REBUILD - that goes in separate output)
  lines.push("## Oscar's Findings (Current Pass)")
  lines.push('')
  lines.push(`*${audit.findings.length} findings. See REBUILD output for details.*`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Execution Log
  lines.push('## Execution Log')
  lines.push('')
  lines.push('| Date | Actor | Action |')
  lines.push('|------|-------|--------|')
  for (const entry of audit.executionLog.slice(-20)) { // Last 20 entries
    const dateStr = entry.date.toISOString().replace('T', ' ').slice(0, 16)
    lines.push(`| ${dateStr} | ${entry.actor} | ${entry.action} |`)
  }
  lines.push('')

  return lines.join('\n')
}

/**
 * Parse active audit from markdown (basic parser)
 */
function parseActiveAuditMarkdown(content: string, specPath: string): ActiveAudit {
  // This is a simplified parser - in practice might need more robust parsing
  const lines = content.split('\n')

  // Extract basic info from header
  const specMatch = content.match(/\*\*Spec:\*\* (.+)/)
  const startedMatch = content.match(/\*\*Started:\*\* (.+)/)
  const statusMatch = content.match(/\*\*Status:\*\* (.+)/)

  // Extract checkpoint
  const positionMatch = content.match(/\*\*Current Position:\*\* Requirement (\d+) of (\d+)/)
  const lastProcessedMatch = content.match(/\*\*Last Processed:\*\* (.+)/)

  // Parse resolution table
  const resolutions: FindingResolution[] = []
  const tableMatch = content.match(/\| Finding ID \| Status \| Resolution \| Notes \|\n\|[-|]+\|\n([\s\S]*?)\n\n/)
  if (tableMatch) {
    const tableRows = tableMatch[1].trim().split('\n')
    for (const row of tableRows) {
      const cells = row.split('|').map(c => c.trim()).filter(c => c)
      if (cells.length >= 4) {
        resolutions.push({
          findingId: cells[0],
          status: cells[1] as ResolutionStatus,
          resolution: cells[2] === '-' ? undefined : cells[2],
          notes: cells[3] === '-' ? undefined : cells[3],
          updatedAt: new Date(),
          updatedBy: 'oscar',
        })
      }
    }
  }

  return {
    specPath: specMatch?.[1] || specPath,
    specTitle: lines[0]?.replace('# ACTIVE AUDIT: ', '') || 'Unknown',
    status: (statusMatch?.[1] as 'IN_PROGRESS' | 'COMPLETE' | 'PAUSED') || 'IN_PROGRESS',
    startedAt: startedMatch ? new Date(startedMatch[1]) : new Date(),
    lastUpdatedAt: new Date(),
    checkpoint: {
      currentPosition: positionMatch ? parseInt(positionMatch[1]) - 1 : 0,
      totalRequirements: positionMatch ? parseInt(positionMatch[2]) : 0,
      lastProcessedId: lastProcessedMatch?.[1] || '',
    },
    resolutions,
    claudeNotes: [], // Would need to parse these too
    findings: [], // Would need to load from REBUILD output
    executionLog: [], // Would need to parse these
  }
}
