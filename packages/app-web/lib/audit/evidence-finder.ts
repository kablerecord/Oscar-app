/**
 * Codebase Evidence Finder
 *
 * Searches the OSQR codebase for implementation evidence of spec requirements.
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import type {
  SpecRequirement,
  CodeEvidence,
  EvidenceStatus,
  RequirementType
} from './types'

// =============================================================================
// CONFIGURATION
// =============================================================================

const SEARCH_ROOTS = [
  'packages/app-web/lib',
  'packages/app-web/app',
  'packages/app-web/components',
  'packages/app-web/prisma',
  'packages/core/src',
]

const FILE_EXTENSIONS = ['.ts', '.tsx', '.prisma']

const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  '__tests__',
  '.test.',
  '.spec.',
]

// =============================================================================
// MAIN FINDER
// =============================================================================

/**
 * Find evidence for a single requirement
 */
export async function findEvidence(requirement: SpecRequirement): Promise<CodeEvidence> {
  const searchStrategies = getSearchStrategies(requirement)
  const searchedLocations: string[] = []

  for (const strategy of searchStrategies) {
    searchedLocations.push(strategy.description)

    const result = await executeSearch(strategy, requirement)

    if (result.status === 'FOUND' || result.status === 'PARTIAL') {
      return {
        ...result,
        requirementId: requirement.id,
        searchedLocations,
      }
    }
  }

  return {
    requirementId: requirement.id,
    status: 'NOT_FOUND',
    confidence: 0,
    searchedLocations,
    notes: 'No implementation evidence found after exhaustive search',
  }
}

/**
 * Find evidence for all requirements in a spec
 */
export async function findAllEvidence(
  requirements: SpecRequirement[]
): Promise<CodeEvidence[]> {
  const results: CodeEvidence[] = []

  for (const req of requirements) {
    const evidence = await findEvidence(req)
    results.push(evidence)
  }

  return results
}

// =============================================================================
// SEARCH STRATEGIES
// =============================================================================

interface SearchStrategy {
  description: string
  type: 'grep' | 'file' | 'prisma' | 'ast'
  patterns: string[]
  locations: string[]
}

/**
 * Get search strategies based on requirement type
 */
function getSearchStrategies(requirement: SpecRequirement): SearchStrategy[] {
  const strategies: SearchStrategy[] = []
  const claim = requirement.claim.toLowerCase()

  // Extract key terms from claim
  const keyTerms = extractKeyTerms(requirement.claim)

  switch (requirement.type) {
    case 'interface':
      strategies.push({
        description: `Search for interface/type definitions`,
        type: 'grep',
        patterns: [
          `interface\\s+${keyTerms.primary}`,
          `type\\s+${keyTerms.primary}`,
          `export\\s+(interface|type)\\s+${keyTerms.primary}`,
        ],
        locations: ['packages/app-web/lib', 'packages/core/src'],
      })
      break

    case 'function':
      strategies.push({
        description: `Search for function implementations`,
        type: 'grep',
        patterns: [
          `function\\s+${keyTerms.primary}`,
          `const\\s+${keyTerms.primary}\\s*=`,
          `async\\s+function\\s+${keyTerms.primary}`,
          `export\\s+(async\\s+)?function\\s+${keyTerms.primary}`,
        ],
        locations: ['packages/app-web/lib', 'packages/app-web/app/api'],
      })
      break

    case 'api':
      strategies.push({
        description: `Search for API route handlers`,
        type: 'grep',
        patterns: [
          `export\\s+(async\\s+)?function\\s+(GET|POST|PUT|DELETE|PATCH)`,
          `route\\.ts`,
        ],
        locations: ['packages/app-web/app/api'],
      })
      // Also search by endpoint path if present
      const endpointMatch = requirement.claim.match(/\/api\/[\w\/-]+/)
      if (endpointMatch) {
        const routePath = endpointMatch[0].replace('/api/', 'app/api/') + '/route.ts'
        strategies.push({
          description: `Check for route file at ${routePath}`,
          type: 'file',
          patterns: [routePath],
          locations: ['packages/app-web'],
        })
      }
      break

    case 'data':
      strategies.push({
        description: `Search Prisma schema`,
        type: 'prisma',
        patterns: [
          `model\\s+${keyTerms.primary}`,
          keyTerms.primary,
        ],
        locations: ['packages/app-web/prisma/schema.prisma'],
      })
      break

    case 'behavior':
    case 'integration':
      strategies.push({
        description: `Search for behavioral implementation`,
        type: 'grep',
        patterns: keyTerms.all.map(t => t),
        locations: SEARCH_ROOTS,
      })
      break

    case 'ui':
      strategies.push({
        description: `Search for UI components`,
        type: 'grep',
        patterns: [
          `${keyTerms.primary}`,
          `export\\s+(default\\s+)?function\\s+${keyTerms.primary}`,
        ],
        locations: ['packages/app-web/components', 'packages/app-web/app'],
      })
      break

    case 'config':
      strategies.push({
        description: `Search for configuration`,
        type: 'grep',
        patterns: keyTerms.all,
        locations: ['packages/app-web/lib', 'packages/app-web'],
      })
      break
  }

  // Always add a fallback broad search
  strategies.push({
    description: `Broad search for key terms: ${keyTerms.all.join(', ')}`,
    type: 'grep',
    patterns: keyTerms.all,
    locations: SEARCH_ROOTS,
  })

  return strategies
}

/**
 * Extract searchable key terms from a claim
 */
function extractKeyTerms(claim: string): { primary: string; all: string[] } {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once',
    'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
  ])

  // Extract words, filter, and sort by relevance
  const words = claim
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()))
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)) // PascalCase for likely type names

  // Unique words
  const unique = [...new Set(words)]

  // Primary term is usually the first significant capitalized word
  const primary = unique.find(w => /^[A-Z]/.test(w)) || unique[0] || 'Unknown'

  return {
    primary,
    all: unique.slice(0, 5), // Limit to 5 terms
  }
}

// =============================================================================
// SEARCH EXECUTION
// =============================================================================

/**
 * Execute a search strategy
 */
async function executeSearch(
  strategy: SearchStrategy,
  requirement: SpecRequirement
): Promise<Omit<CodeEvidence, 'requirementId' | 'searchedLocations'>> {
  switch (strategy.type) {
    case 'grep':
      return executeGrepSearch(strategy)
    case 'file':
      return executeFileSearch(strategy)
    case 'prisma':
      return executePrismaSearch(strategy)
    default:
      return { status: 'UNKNOWN', confidence: 0 }
  }
}

/**
 * Execute grep-based search
 */
function executeGrepSearch(
  strategy: SearchStrategy
): Omit<CodeEvidence, 'requirementId' | 'searchedLocations'> {
  for (const pattern of strategy.patterns) {
    for (const location of strategy.locations) {
      try {
        const result = execSync(
          `grep -rn --include="*.ts" --include="*.tsx" -E "${pattern}" ${location} 2>/dev/null || true`,
          { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
        )

        if (result.trim()) {
          const lines = result.trim().split('\n')
          const firstMatch = lines[0]
          const [filePath, lineNum, ...codeParts] = firstMatch.split(':')

          return {
            status: 'FOUND',
            filePath: filePath,
            startLine: parseInt(lineNum, 10),
            endLine: parseInt(lineNum, 10) + 10, // Approximate
            snippet: codeParts.join(':').trim().slice(0, 200),
            confidence: calculateConfidence(lines.length, pattern),
          }
        }
      } catch {
        // Continue to next pattern
      }
    }
  }

  return { status: 'NOT_FOUND', confidence: 0 }
}

/**
 * Execute file existence search
 */
function executeFileSearch(
  strategy: SearchStrategy
): Omit<CodeEvidence, 'requirementId' | 'searchedLocations'> {
  for (const pattern of strategy.patterns) {
    for (const location of strategy.locations) {
      const fullPath = path.join(location, pattern)

      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        const lines = content.split('\n')

        return {
          status: 'FOUND',
          filePath: fullPath,
          startLine: 1,
          endLine: Math.min(lines.length, 20),
          snippet: lines.slice(0, 10).join('\n'),
          confidence: 90,
        }
      }
    }
  }

  return { status: 'NOT_FOUND', confidence: 0 }
}

/**
 * Execute Prisma schema search
 */
function executePrismaSearch(
  strategy: SearchStrategy
): Omit<CodeEvidence, 'requirementId' | 'searchedLocations'> {
  const schemaPath = 'packages/app-web/prisma/schema.prisma'

  if (!fs.existsSync(schemaPath)) {
    return { status: 'NOT_FOUND', confidence: 0, notes: 'Prisma schema not found' }
  }

  const content = fs.readFileSync(schemaPath, 'utf-8')
  const lines = content.split('\n')

  for (const pattern of strategy.patterns) {
    const regex = new RegExp(pattern, 'i')

    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        // Find the full model block
        let endLine = i
        for (let j = i; j < lines.length; j++) {
          if (lines[j].trim() === '}') {
            endLine = j
            break
          }
        }

        return {
          status: 'FOUND',
          filePath: schemaPath,
          startLine: i + 1,
          endLine: endLine + 1,
          snippet: lines.slice(i, endLine + 1).join('\n'),
          confidence: 95,
        }
      }
    }
  }

  return { status: 'NOT_FOUND', confidence: 0 }
}

/**
 * Calculate confidence based on match quality
 */
function calculateConfidence(matchCount: number, pattern: string): number {
  let confidence = 50

  // More matches = higher confidence
  if (matchCount >= 3) confidence += 20
  else if (matchCount >= 1) confidence += 10

  // Specific patterns = higher confidence
  if (pattern.includes('export')) confidence += 15
  if (pattern.includes('interface') || pattern.includes('type')) confidence += 10
  if (pattern.includes('function')) confidence += 10

  return Math.min(confidence, 100)
}
