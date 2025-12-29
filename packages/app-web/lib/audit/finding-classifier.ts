/**
 * Finding Classifier
 *
 * Categorizes evidence gaps into finding types (MISSING, MISALIGNED, etc.)
 */

import type {
  SpecRequirement,
  CodeEvidence,
  AuditFinding,
  FindingType,
  Severity,
  SuggestedFix,
  RequirementType,
} from './types'

// =============================================================================
// MAIN CLASSIFIER
// =============================================================================

/**
 * Classify a requirement + evidence pair into a finding (or pass)
 */
export function classifyFinding(
  requirement: SpecRequirement,
  evidence: CodeEvidence
): AuditFinding | null {
  const findingType = determineType(requirement, evidence)

  // No finding if passes
  if (findingType === null) {
    return null
  }

  const severity = determineSeverity(requirement, findingType)

  return {
    id: requirement.id,
    severity,
    type: findingType,
    requirement,
    evidence,
    specQuote: requirement.rawText,
    codeDescription: describeCode(evidence),
    problem: describeProblem(findingType, requirement, evidence),
    suggestedFix: generateSuggestedFix(findingType, requirement, evidence),
  }
}

/**
 * Classify all requirements against their evidence
 */
export function classifyAllFindings(
  requirements: SpecRequirement[],
  evidenceList: CodeEvidence[]
): { findings: AuditFinding[]; passes: string[] } {
  const findings: AuditFinding[] = []
  const passes: string[] = []

  const evidenceMap = new Map(evidenceList.map(e => [e.requirementId, e]))

  for (const req of requirements) {
    const evidence = evidenceMap.get(req.id)

    if (!evidence) {
      findings.push({
        id: req.id,
        severity: 'P1',
        type: 'MISSING',
        requirement: req,
        evidence: {
          requirementId: req.id,
          status: 'UNKNOWN',
          confidence: 0,
          searchedLocations: [],
        },
        specQuote: req.rawText,
        codeDescription: 'Evidence search was not performed',
        problem: 'Could not search for implementation evidence',
      })
      continue
    }

    const finding = classifyFinding(req, evidence)

    if (finding) {
      findings.push(finding)
    } else {
      passes.push(req.id)
    }
  }

  return { findings, passes }
}

// =============================================================================
// TYPE DETERMINATION
// =============================================================================

/**
 * Determine finding type from evidence status
 */
function determineType(
  requirement: SpecRequirement,
  evidence: CodeEvidence
): FindingType | null {
  switch (evidence.status) {
    case 'FOUND':
      // Found but might still be misaligned - check confidence
      if (evidence.confidence >= 80) {
        return null // PASS
      } else if (evidence.confidence >= 50) {
        // Partial match - likely incomplete or misaligned
        return 'INCOMPLETE'
      } else {
        return 'MISALIGNED'
      }

    case 'NOT_FOUND':
      return 'MISSING'

    case 'PARTIAL':
      return 'INCOMPLETE'

    case 'UNKNOWN':
      return 'UNTESTED' // Can't verify = untested

    default:
      return 'MISSING'
  }
}

/**
 * Determine severity based on requirement type and finding type
 */
function determineSeverity(
  requirement: SpecRequirement,
  findingType: FindingType
): Severity {
  // P0: Security, data, core functionality
  const p0Keywords = ['security', 'auth', 'password', 'token', 'encrypt', 'privacy', 'data loss']
  const claimLower = requirement.claim.toLowerCase()

  if (p0Keywords.some(kw => claimLower.includes(kw))) {
    return 'P0'
  }

  // P0: DELETE findings that affect active code
  if (findingType === 'DELETE') {
    return 'P2' // Deletions are usually cleanup
  }

  // P0: BROKEN is always high severity
  if (findingType === 'BROKEN') {
    return 'P0'
  }

  // P1: MISSING or MISALIGNED core features
  if (findingType === 'MISSING' || findingType === 'MISALIGNED') {
    // Check if it's a core feature
    const coreTypes: RequirementType[] = ['api', 'data', 'function']
    if (coreTypes.includes(requirement.type)) {
      return 'P1'
    }
  }

  // P2: Everything else (incomplete, untested, ui)
  if (findingType === 'INCOMPLETE' || findingType === 'UNTESTED') {
    return 'P2'
  }

  // Default
  return 'P1'
}

// =============================================================================
// DESCRIPTION HELPERS
// =============================================================================

/**
 * Describe what the code does (or doesn't do)
 */
function describeCode(evidence: CodeEvidence): string {
  switch (evidence.status) {
    case 'FOUND':
      return `Found at ${evidence.filePath}:${evidence.startLine}\n\n${evidence.snippet || ''}`

    case 'NOT_FOUND':
      return `No implementation found.\nSearched: ${evidence.searchedLocations.join(', ')}`

    case 'PARTIAL':
      return `Partial implementation at ${evidence.filePath}:${evidence.startLine}\n\n${evidence.snippet || ''}`

    case 'UNKNOWN':
      return `Could not determine implementation status.\n${evidence.notes || ''}`

    default:
      return 'Unknown status'
  }
}

/**
 * Describe the problem
 */
function describeProblem(
  type: FindingType,
  requirement: SpecRequirement,
  evidence: CodeEvidence
): string {
  switch (type) {
    case 'MISSING':
      return `The spec requires "${requirement.claim.slice(0, 100)}" but no implementation was found.`

    case 'MISALIGNED':
      return `Implementation exists but doesn't match spec. Expected: "${requirement.claim.slice(0, 100)}"`

    case 'BROKEN':
      return `Implementation exists but appears non-functional or has errors.`

    case 'INCOMPLETE':
      return `Partial implementation found. Missing components to fully satisfy: "${requirement.claim.slice(0, 100)}"`

    case 'UNTESTED':
      return `Cannot verify this requirement works. No tests found and unable to trigger manually.`

    case 'CONFLICT':
      return `This requirement conflicts with another spec.`

    case 'DRIFT':
      return `Implementation differs from original design intent.`

    case 'DELETE':
      return `This code/feature should be removed - adds complexity without value.`

    default:
      return `Unknown issue with requirement.`
  }
}

/**
 * Generate a suggested fix
 */
function generateSuggestedFix(
  type: FindingType,
  requirement: SpecRequirement,
  evidence: CodeEvidence
): SuggestedFix | undefined {
  // Only generate fix suggestions for certain types
  if (type === 'UNTESTED' || type === 'CONFLICT' || type === 'DRIFT') {
    return undefined // These need manual review
  }

  const baseFix: SuggestedFix = {
    description: `Implement ${requirement.type}: ${requirement.claim.slice(0, 50)}`,
    filePath: suggestFilePath(requirement),
    verification: `grep -r "${extractKeyword(requirement.claim)}" packages/app-web/lib/`,
    expectedResult: 'Implementation should be found',
  }

  switch (type) {
    case 'MISSING':
      baseFix.description = `Create ${requirement.type} to satisfy: ${requirement.claim.slice(0, 100)}`
      break

    case 'MISALIGNED':
      baseFix.description = `Update implementation to match spec: ${requirement.claim.slice(0, 100)}`
      if (evidence.filePath) {
        baseFix.filePath = evidence.filePath
      }
      break

    case 'INCOMPLETE':
      baseFix.description = `Complete implementation: ${requirement.claim.slice(0, 100)}`
      if (evidence.filePath) {
        baseFix.filePath = evidence.filePath
      }
      break

    case 'DELETE':
      baseFix.description = `Remove unused code/feature`
      baseFix.verification = `ls ${evidence.filePath} 2>&1`
      baseFix.expectedResult = 'File should not exist'
      break
  }

  return baseFix
}

/**
 * Suggest a file path for new implementations
 */
function suggestFilePath(requirement: SpecRequirement): string {
  const base = 'packages/app-web/lib'

  switch (requirement.type) {
    case 'api':
      return 'packages/app-web/app/api/[endpoint]/route.ts'
    case 'data':
      return 'packages/app-web/prisma/schema.prisma'
    case 'ui':
      return 'packages/app-web/components/[component].tsx'
    case 'interface':
      return `${base}/[module]/types.ts`
    default:
      return `${base}/[module]/index.ts`
  }
}

/**
 * Extract a keyword for verification grep
 */
function extractKeyword(claim: string): string {
  const words = claim.match(/[A-Z][a-z]+/g) || []
  return words[0] || claim.split(' ')[0]
}
