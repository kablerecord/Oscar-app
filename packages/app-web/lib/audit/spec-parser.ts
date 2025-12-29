/**
 * Spec Requirement Extractor
 *
 * Parses markdown spec files and extracts testable requirements.
 */

import * as fs from 'fs'
import * as path from 'path'
import type {
  ParsedSpec,
  SpecRequirement,
  SpecSection,
  RequirementType
} from './types'

// =============================================================================
// CONFIGURATION
// =============================================================================

const REQUIREMENT_PATTERNS = {
  // Explicit requirement markers
  must: /\b(must|shall|required|needs to|has to)\b/i,
  should: /\b(should|expected to|supposed to)\b/i,

  // Interface/type indicators
  interface: /\b(interface|type|schema|model)\s+(\w+)/i,

  // Function indicators
  function: /\b(function|method|handler|endpoint|route)\s+(\w+)/i,

  // API indicators
  api: /\b(GET|POST|PUT|DELETE|PATCH)\s+[\/\w]+/i,

  // Database indicators
  data: /\b(table|column|field|migration|prisma)\b/i,
}

// =============================================================================
// MAIN PARSER
// =============================================================================

/**
 * Parse a spec file and extract requirements
 */
export async function parseSpec(specPath: string): Promise<ParsedSpec> {
  const absolutePath = path.isAbsolute(specPath)
    ? specPath
    : path.resolve(process.cwd(), specPath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Spec file not found: ${absolutePath}`)
  }

  const content = fs.readFileSync(absolutePath, 'utf-8')
  const lines = content.split('\n')

  // Extract title from first H1
  const title = extractTitle(lines)

  // Parse sections
  const sections = parseSections(lines)

  // Extract requirements from each section
  const requirements = extractRequirements(lines, sections, specPath)

  return {
    specPath,
    title,
    requirements,
    sections,
    parsedAt: new Date(),
  }
}

/**
 * Extract title from spec (first H1)
 */
function extractTitle(lines: string[]): string {
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)/)
    if (match) {
      return match[1].trim()
    }
  }
  return 'Untitled Spec'
}

/**
 * Parse markdown sections
 */
function parseSections(lines: string[]): SpecSection[] {
  const sections: SpecSection[] = []
  let currentSection: SpecSection | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/)

    if (headerMatch) {
      // Close previous section
      if (currentSection) {
        currentSection.endLine = i - 1
        currentSection.content = lines
          .slice(currentSection.startLine, i)
          .join('\n')
        sections.push(currentSection)
      }

      // Start new section
      currentSection = {
        title: headerMatch[2].trim(),
        level: headerMatch[1].length,
        startLine: i,
        endLine: lines.length - 1,
        content: '',
      }
    }
  }

  // Close final section
  if (currentSection) {
    currentSection.content = lines
      .slice(currentSection.startLine)
      .join('\n')
    sections.push(currentSection)
  }

  return sections
}

/**
 * Extract requirements from spec content
 */
function extractRequirements(
  lines: string[],
  sections: SpecSection[],
  specPath: string
): SpecRequirement[] {
  const requirements: SpecRequirement[] = []
  const specName = getSpecName(specPath)
  let reqCounter = 1

  for (const section of sections) {
    const sectionLines = lines.slice(section.startLine, section.endLine + 1)

    for (let i = 0; i < sectionLines.length; i++) {
      const line = sectionLines[i]
      const lineNumber = section.startLine + i + 1 // 1-indexed

      // Skip empty lines and headers
      if (!line.trim() || line.startsWith('#')) continue

      // Check for requirement patterns
      const reqType = detectRequirementType(line, section.title)

      if (reqType) {
        const id = `${specName}-${String(reqCounter).padStart(3, '0')}`

        requirements.push({
          id,
          type: reqType,
          claim: extractClaim(line),
          section: section.title,
          line: lineNumber,
          specPath,
          rawText: line,
        })

        reqCounter++
      }
    }
  }

  return requirements
}

/**
 * Detect requirement type from line content
 */
function detectRequirementType(line: string, sectionTitle: string): RequirementType | null {
  const lowerLine = line.toLowerCase()
  const lowerSection = sectionTitle.toLowerCase()

  // Check for explicit interface/type definitions
  if (REQUIREMENT_PATTERNS.interface.test(line)) {
    return 'interface'
  }

  // Check for API endpoints
  if (REQUIREMENT_PATTERNS.api.test(line)) {
    return 'api'
  }

  // Check for function/method definitions
  if (REQUIREMENT_PATTERNS.function.test(line)) {
    return 'function'
  }

  // Check for database-related
  if (REQUIREMENT_PATTERNS.data.test(line)) {
    return 'data'
  }

  // Check section context for UI
  if (lowerSection.includes('ui') || lowerSection.includes('component')) {
    if (REQUIREMENT_PATTERNS.must.test(line) || REQUIREMENT_PATTERNS.should.test(line)) {
      return 'ui'
    }
  }

  // Check for behavioral requirements
  if (lowerSection.includes('behavior') || lowerSection.includes('flow')) {
    if (REQUIREMENT_PATTERNS.must.test(line) || REQUIREMENT_PATTERNS.should.test(line)) {
      return 'behavior'
    }
  }

  // Check for integration requirements
  if (lowerSection.includes('integration') || lowerLine.includes('connect')) {
    return 'integration'
  }

  // Check for config requirements
  if (lowerSection.includes('config') || lowerLine.includes('environment')) {
    return 'config'
  }

  // Generic must/should requirements
  if (REQUIREMENT_PATTERNS.must.test(line)) {
    return 'behavior'
  }

  // Check for bullet points with actionable content
  if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
    if (REQUIREMENT_PATTERNS.should.test(line)) {
      return 'behavior'
    }
  }

  return null
}

/**
 * Extract the claim from a requirement line
 */
function extractClaim(line: string): string {
  // Remove markdown formatting
  let claim = line
    .replace(/^[-*]\s*/, '')     // Remove bullet
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
    .replace(/`([^`]+)`/g, '$1')  // Remove code ticks
    .trim()

  // Truncate if too long
  if (claim.length > 200) {
    claim = claim.slice(0, 197) + '...'
  }

  return claim
}

/**
 * Get short spec name from path for requirement IDs
 */
function getSpecName(specPath: string): string {
  const filename = path.basename(specPath, '.md')

  // Common patterns to shorten
  const shortenings: Record<string, string> = {
    'OSQR_AI_HISTORY_INTERVIEW_SPEC': 'INTERVIEW',
    'RENDER_SYSTEM_SPEC': 'RENDER',
    'UIP_SPEC': 'UIP',
    'BEHAVIORAL_INTELLIGENCE_LAYER': 'BIL',
    'OSQR_AUTO_ORGANIZATION_SPEC': 'AUTO_ORG',
    'OSQR_SECRETARY_CHECKLIST_ADDENDUM': 'SECRETARY',
  }

  return shortenings[filename] || filename
    .replace(/_SPEC$/, '')
    .replace(/^OSQR_/, '')
    .slice(0, 12)
    .toUpperCase()
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get all spec files in docs/features/
 */
export function getAllSpecPaths(): string[] {
  const featuresDir = path.resolve(process.cwd(), 'docs/features')

  if (!fs.existsSync(featuresDir)) {
    return []
  }

  return fs.readdirSync(featuresDir)
    .filter(f => f.endsWith('.md') && f.includes('SPEC'))
    .map(f => path.join(featuresDir, f))
}

/**
 * Quick validation of spec file
 */
export function isValidSpec(specPath: string): boolean {
  try {
    const content = fs.readFileSync(specPath, 'utf-8')
    return content.includes('#') && content.length > 100
  } catch {
    return false
  }
}
