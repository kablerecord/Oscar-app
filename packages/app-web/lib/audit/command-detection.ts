/**
 * Audit Command Detection
 *
 * Detects audit requests in Oscar's chat input.
 */

const AUDIT_PATTERNS = [
  /^\/audit\s+(.+)/i,
  /audit\s+(.+\.md)/i,
  /audit\s+(.+)\s+spec/i,
  /run\s+audit\s+on\s+(.+)/i,
]

/**
 * Check if a message is an audit request
 */
export function isAuditRequest(message: string): boolean {
  return AUDIT_PATTERNS.some(p => p.test(message))
}

/**
 * Extract the spec path from an audit request message
 */
export function extractSpecPath(message: string): string | null {
  for (const pattern of AUDIT_PATTERNS) {
    const match = message.match(pattern)
    if (match && match[1]) {
      let specPath = match[1].trim()

      // Normalize path
      if (!specPath.startsWith('docs/')) {
        specPath = `docs/features/${specPath}`
      }
      if (!specPath.endsWith('.md')) {
        specPath = `${specPath}.md`
      }

      return specPath
    }
  }
  return null
}

/**
 * Get a list of available specs for audit
 */
export function getAvailableSpecs(): string[] {
  return [
    'docs/features/RENDER_SYSTEM_SPEC.md',
    'docs/features/OSQR_AI_HISTORY_INTERVIEW_SPEC.md',
    'docs/features/OSQR_AUTO_ORGANIZATION_SPEC.md',
    'docs/features/OSQR_SECRETARY_CHECKLIST_ADDENDUM.md',
    'docs/features/BEHAVIORAL_INTELLIGENCE_LAYER.md',
    'docs/features/EXECUTION_ORCHESTRATOR_SPEC.md',
    'docs/features/OSQR_DEEP_RESEARCH_SPEC.md',
  ]
}
