/**
 * Spec-to-Code Auditor
 *
 * Main entry point for the audit system.
 */

export { parseSpec, getAllSpecPaths, isValidSpec } from './spec-parser'
export { findEvidence, findAllEvidence } from './evidence-finder'
export { classifyFinding, classifyAllFindings } from './finding-classifier'
export { generateRebuildDocument, renderRebuildMarkdown } from './rebuild-generator'
export { isAuditRequest, extractSpecPath, getAvailableSpecs } from './command-detection'
export {
  hasActiveAudit,
  createActiveAudit,
  getActiveAudit,
  saveActiveAudit,
  updateCheckpoint,
  addClaudeNote,
  updateResolutionStatus,
  appendToExecutionLog,
  isAuditComplete,
  archiveAudit,
} from './active-audit-manager'
export * from './types'

import { parseSpec } from './spec-parser'
import { findAllEvidence } from './evidence-finder'
import { classifyAllFindings } from './finding-classifier'
import { generateRebuildDocument, renderRebuildMarkdown } from './rebuild-generator'

/**
 * Run a complete audit on a spec file
 */
export async function runAudit(specPath: string): Promise<{
  markdown: string
  stats: {
    requirements: number
    passes: number
    findings: number
  }
}> {
  // 1. Parse spec
  const spec = await parseSpec(specPath)

  // 2. Find evidence
  const evidence = await findAllEvidence(spec.requirements)

  // 3. Classify findings
  const { findings, passes } = classifyAllFindings(spec.requirements, evidence)

  // 4. Generate REBUILD document
  const doc = generateRebuildDocument(spec, findings)
  const markdown = renderRebuildMarkdown(doc)

  return {
    markdown,
    stats: {
      requirements: spec.requirements.length,
      passes: passes.length,
      findings: findings.length,
    },
  }
}
