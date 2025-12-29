/**
 * REBUILD Document Generator
 *
 * Generates REBUILD documents in the exact format specified by
 * docs/audits/OSQR_SELF_AUDIT_PROTOCOL.md
 */

import type {
  AuditFinding,
  RebuildDocument,
  RebuildHeader,
  RebuildSummary,
  SpecConflict,
  DeletionRecommendation,
  Severity,
  FindingType,
  ParsedSpec,
} from './types'

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate a complete REBUILD document
 */
export function generateRebuildDocument(
  spec: ParsedSpec,
  findings: AuditFinding[],
  codePath: string = 'packages/app-web/lib'
): RebuildDocument {
  const header = generateHeader(spec, codePath)
  const summary = generateSummary(findings)
  const specConflicts = extractConflicts(findings)
  const deletions = extractDeletions(findings)
  const executionOrder = determineExecutionOrder(findings)
  const postFixVerification = generateVerificationSteps(spec)

  return {
    header,
    summary,
    findings,
    specConflicts,
    recommendedDeletions: deletions,
    executionOrder,
    postFixVerification,
  }
}

/**
 * Generate markdown string from REBUILD document
 */
export function renderRebuildMarkdown(doc: RebuildDocument): string {
  const lines: string[] = []

  // Header
  lines.push(`# REBUILD: ${doc.header.subsystem}`)
  lines.push(`Generated: ${doc.header.generatedAt.toISOString()}`)
  lines.push(`Auditor: OSQR Self-Audit`)
  lines.push(`Spec: ${doc.header.specPath}`)
  lines.push(`Code: ${doc.header.codePath}`)
  if (doc.header.testPath) {
    lines.push(`Tests: ${doc.header.testPath}`)
  } else {
    lines.push(`Tests: NO TESTS FOUND`)
  }
  lines.push('')

  // Summary
  lines.push(`## Summary`)
  lines.push(`- Total Findings: ${doc.summary.totalFindings}`)
  lines.push(`- P0 (Blocks Launch): ${doc.summary.bySeverity.P0 || 0}`)
  lines.push(`- P1 (User Visible): ${doc.summary.bySeverity.P1 || 0}`)
  lines.push(`- P2 (Cleanup): ${doc.summary.bySeverity.P2 || 0}`)
  lines.push('')
  lines.push(`### By Type`)
  for (const [type, count] of Object.entries(doc.summary.byType)) {
    if (count > 0) {
      lines.push(`- ${type}: ${count}`)
    }
  }
  lines.push('')

  // Findings
  for (const finding of doc.findings) {
    lines.push(`---`)
    lines.push('')
    lines.push(`## FINDING: ${finding.id}`)
    lines.push('')
    lines.push(`**Severity:** ${finding.severity}`)
    lines.push(`**Type:** ${finding.type}`)
    lines.push('')

    // What Chat/Original Intent Said (for DRIFT)
    lines.push(`### What Chat/Original Intent Said (if DRIFT type)`)
    if (finding.type === 'DRIFT') {
      lines.push(`> [DRIFT detection requires indexed history - SKIPPED]`)
    } else {
      lines.push(`> N/A`)
    }
    lines.push('')
    lines.push(`Source: N/A`)
    lines.push('')

    // What Spec Says
    lines.push(`### What Spec Says`)
    lines.push(`> ${finding.specQuote}`)
    lines.push('')
    lines.push(`Source: ${finding.requirement.specPath}#L${finding.requirement.line}`)
    lines.push('')

    // What Other Spec Says (for CONFLICT)
    lines.push(`### What Other Spec Says (if CONFLICT type)`)
    if (finding.type === 'CONFLICT') {
      lines.push(`> [Conflicting spec details would go here]`)
    } else {
      lines.push(`> N/A`)
    }
    lines.push('')
    lines.push(`Source: N/A`)
    lines.push('')

    // What Code Does
    lines.push(`### What Code Does`)
    if (finding.evidence.filePath) {
      lines.push(`File: ${finding.evidence.filePath}`)
      lines.push(`Lines: ${finding.evidence.startLine}-${finding.evidence.endLine}`)
    } else {
      lines.push(`File: NO EVIDENCE FOUND`)
      lines.push(`Searched: ${finding.evidence.searchedLocations.join(', ')}`)
    }
    lines.push('')
    lines.push(finding.codeDescription)
    lines.push('')

    if (finding.evidence.snippet) {
      lines.push('```typescript')
      lines.push(finding.evidence.snippet)
      lines.push('```')
      lines.push('')
    }

    // Evidence
    lines.push(`### Evidence`)
    lines.push(`- Searched locations: ${finding.evidence.searchedLocations.join(', ')}`)
    lines.push(`- Confidence: ${finding.evidence.confidence}%`)
    if (finding.evidence.notes) {
      lines.push(`- Notes: ${finding.evidence.notes}`)
    }
    lines.push('')

    // The Problem
    lines.push(`### The Problem`)
    lines.push(finding.problem)
    lines.push('')

    // Required Fix
    lines.push(`### Required Fix`)
    lines.push('')
    if (finding.suggestedFix) {
      lines.push(`**Change:** ${finding.suggestedFix.description}`)
      lines.push('')
      lines.push(`**File:** ${finding.suggestedFix.filePath}`)
      lines.push('')

      if (finding.suggestedFix.currentCode) {
        lines.push(`**Current Code:**`)
        lines.push('```typescript')
        lines.push(finding.suggestedFix.currentCode)
        lines.push('```')
        lines.push('')
      }

      if (finding.suggestedFix.newCode) {
        lines.push(`**New Code:**`)
        lines.push('```typescript')
        lines.push(finding.suggestedFix.newCode)
        lines.push('```')
        lines.push('')
      }

      lines.push(`### Verification`)
      lines.push('```bash')
      lines.push(finding.suggestedFix.verification)
      lines.push('```')
      lines.push('')
      lines.push(`**Expected Result:** ${finding.suggestedFix.expectedResult}`)
    } else {
      lines.push(`Manual review required - no automated fix suggested.`)
    }
    lines.push('')
  }

  // Spec Conflicts
  lines.push(`---`)
  lines.push('')
  lines.push(`## Spec Conflicts Detected`)
  lines.push('')
  if (doc.specConflicts.length > 0) {
    lines.push(`| Spec A | Says | Spec B | Says | Resolution Needed |`)
    lines.push(`|--------|------|--------|------|-------------------|`)
    for (const conflict of doc.specConflicts) {
      lines.push(`| ${conflict.specA.path} | ${conflict.specA.claim} | ${conflict.specB.path} | ${conflict.specB.claim} | ${conflict.resolutionNeeded} |`)
    }
  } else {
    lines.push(`No spec conflicts detected.`)
  }
  lines.push('')

  // Recommended Deletions
  lines.push(`## Recommended Deletions`)
  lines.push('')
  lines.push(`**"The best part is no part."** List code/features that should be removed:`)
  lines.push('')
  if (doc.recommendedDeletions.length > 0) {
    lines.push(`| File/Feature | Why Delete | Risk if Kept | Blocked By |`)
    lines.push(`|--------------|------------|--------------|------------|`)
    for (const del of doc.recommendedDeletions) {
      lines.push(`| ${del.fileOrFeature} | ${del.whyDelete} | ${del.riskIfKept} | ${del.blockedBy || 'nothing'} |`)
    }
  } else {
    lines.push(`No deletions recommended.`)
  }
  lines.push('')

  // Execution Order
  lines.push(`## Execution Order`)
  lines.push('')
  lines.push(`Apply fixes in this order (dependencies noted):`)
  lines.push('')
  doc.executionOrder.forEach((id, i) => {
    lines.push(`${i + 1}. ${id}`)
  })
  lines.push('')

  // Post-Fix Verification
  lines.push(`## Post-Fix Verification`)
  lines.push('')
  lines.push(`After all fixes applied:`)
  doc.postFixVerification.forEach(step => {
    lines.push(`- [ ] ${step}`)
  })
  lines.push('')

  // Notes for Executor
  if (doc.notesForExecutor) {
    lines.push(`## Notes for Executor`)
    lines.push(doc.notesForExecutor)
    lines.push('')
  }

  return lines.join('\n')
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateHeader(spec: ParsedSpec, codePath: string): RebuildHeader {
  return {
    subsystem: spec.title.replace(/ Spec$/i, '').replace(/OSQR /i, ''),
    generatedAt: new Date(),
    specPath: spec.specPath,
    codePath,
    testPath: undefined, // Would need to search for test files
  }
}

function generateSummary(findings: AuditFinding[]): RebuildSummary {
  const bySeverity: Record<Severity, number> = { P0: 0, P1: 0, P2: 0 }
  const byType: Record<FindingType, number> = {
    MISSING: 0, MISALIGNED: 0, BROKEN: 0, INCOMPLETE: 0,
    UNTESTED: 0, CONFLICT: 0, DRIFT: 0, DELETE: 0,
  }

  for (const finding of findings) {
    bySeverity[finding.severity]++
    byType[finding.type]++
  }

  return {
    totalFindings: findings.length,
    bySeverity,
    byType,
  }
}

function extractConflicts(findings: AuditFinding[]): SpecConflict[] {
  return findings
    .filter(f => f.type === 'CONFLICT')
    .map(f => ({
      specA: { path: f.requirement.specPath, claim: f.specQuote },
      specB: { path: 'unknown', claim: 'unknown' },
      resolutionNeeded: 'Manual review required',
    }))
}

function extractDeletions(findings: AuditFinding[]): DeletionRecommendation[] {
  return findings
    .filter(f => f.type === 'DELETE')
    .map(f => ({
      fileOrFeature: f.evidence.filePath || 'unknown',
      whyDelete: f.problem,
      riskIfKept: 'Maintenance burden, confusion',
      blockedBy: undefined,
    }))
}

function determineExecutionOrder(findings: AuditFinding[]): string[] {
  // Sort by severity (P0 first), then by type (MISSING before MISALIGNED)
  const sorted = [...findings].sort((a, b) => {
    const severityOrder = { P0: 0, P1: 1, P2: 2 }
    const typeOrder = {
      BROKEN: 0, MISSING: 1, MISALIGNED: 2, INCOMPLETE: 3,
      UNTESTED: 4, CONFLICT: 5, DRIFT: 6, DELETE: 7
    }

    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (sevDiff !== 0) return sevDiff

    return typeOrder[a.type] - typeOrder[b.type]
  })

  return sorted.map(f => f.id)
}

function generateVerificationSteps(spec: ParsedSpec): string[] {
  return [
    'Run: `pnpm build`',
    'Run: `pnpm test`',
    `Manual check: Verify ${spec.title} works in app`,
  ]
}
