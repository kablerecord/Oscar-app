/**
 * Spec-to-Code Auditor Types
 *
 * Types for the audit system that compares specs against implementation.
 */

// =============================================================================
// REQUIREMENT TYPES
// =============================================================================

export type RequirementType =
  | 'interface'    // TypeScript interface must exist
  | 'function'     // Function must be implemented
  | 'behavior'     // Runtime behavior must work
  | 'integration'  // Must connect to other system
  | 'data'         // Database schema must exist
  | 'config'       // Configuration must be set
  | 'api'          // API endpoint must exist
  | 'ui'           // UI component must exist

export interface SpecRequirement {
  id: string                    // e.g., "RENDER-001"
  type: RequirementType
  claim: string                 // What the spec says should exist
  section: string               // Section header in spec
  line: number                  // Line number in spec file
  specPath: string              // Path to spec file
  rawText: string               // Original text from spec
}

export interface ParsedSpec {
  specPath: string
  title: string
  requirements: SpecRequirement[]
  sections: SpecSection[]
  parsedAt: Date
}

export interface SpecSection {
  title: string
  level: number                 // 1 = #, 2 = ##, etc.
  startLine: number
  endLine: number
  content: string
}

// =============================================================================
// EVIDENCE TYPES
// =============================================================================

export type EvidenceStatus =
  | 'FOUND'           // Implementation found
  | 'NOT_FOUND'       // No implementation
  | 'PARTIAL'         // Incomplete implementation
  | 'UNKNOWN'         // Could not determine

export interface CodeEvidence {
  requirementId: string
  status: EvidenceStatus
  filePath?: string
  startLine?: number
  endLine?: number
  snippet?: string
  confidence: number            // 0-100
  searchedLocations: string[]
  notes?: string
}

// =============================================================================
// FINDING TYPES
// =============================================================================

export type FindingType =
  | 'MISSING'
  | 'MISALIGNED'
  | 'BROKEN'
  | 'INCOMPLETE'
  | 'UNTESTED'
  | 'CONFLICT'
  | 'DRIFT'
  | 'DELETE'

export type Severity = 'P0' | 'P1' | 'P2'

export interface AuditFinding {
  id: string                    // e.g., "RENDER-001"
  severity: Severity
  type: FindingType
  requirement: SpecRequirement
  evidence: CodeEvidence
  specQuote: string
  codeDescription: string
  problem: string
  suggestedFix?: SuggestedFix
}

export interface SuggestedFix {
  description: string
  filePath: string
  currentCode?: string
  newCode?: string
  verification: string
  expectedResult: string
}

// =============================================================================
// AUDIT STATE TYPES
// =============================================================================

export type ResolutionStatus =
  | 'PENDING'         // Not yet processed
  | 'IN_PROGRESS'     // Claude working on it
  | 'RESOLVED'        // Fixed
  | 'DEFERRED'        // Intentionally skipped (future scope)
  | 'WONT_FIX'        // Decided not to implement
  | 'PASS'            // Requirement met, no finding

export interface FindingResolution {
  findingId: string
  status: ResolutionStatus
  resolution?: string
  notes?: string
  updatedAt: Date
  updatedBy: 'oscar' | 'claude'
}

export interface AuditCheckpoint {
  currentPosition: number       // Current requirement index
  totalRequirements: number
  lastProcessedId: string
  nextUpId?: string
}

export interface ExecutionLogEntry {
  date: Date
  actor: 'oscar' | 'claude' | 'kable'
  action: string
}

export interface ActiveAudit {
  specPath: string
  specTitle: string
  status: 'IN_PROGRESS' | 'COMPLETE' | 'PAUSED'
  startedAt: Date
  lastUpdatedAt: Date
  checkpoint: AuditCheckpoint
  resolutions: FindingResolution[]
  claudeNotes: ClaudeNote[]
  findings: AuditFinding[]
  executionLog: ExecutionLogEntry[]
}

export interface ClaudeNote {
  findingId?: string            // Specific finding, or undefined for general
  note: string
  addedAt: Date
}

// =============================================================================
// REBUILD OUTPUT TYPES
// =============================================================================

export interface RebuildDocument {
  header: RebuildHeader
  summary: RebuildSummary
  findings: AuditFinding[]
  specConflicts: SpecConflict[]
  recommendedDeletions: DeletionRecommendation[]
  executionOrder: string[]
  postFixVerification: string[]
  notesForExecutor?: string
}

export interface RebuildHeader {
  subsystem: string
  generatedAt: Date
  specPath: string
  codePath: string
  testPath?: string
}

export interface RebuildSummary {
  totalFindings: number
  bySeverity: Record<Severity, number>
  byType: Record<FindingType, number>
}

export interface SpecConflict {
  specA: { path: string; claim: string }
  specB: { path: string; claim: string }
  resolutionNeeded: string
}

export interface DeletionRecommendation {
  fileOrFeature: string
  whyDelete: string
  riskIfKept: string
  blockedBy?: string
}
