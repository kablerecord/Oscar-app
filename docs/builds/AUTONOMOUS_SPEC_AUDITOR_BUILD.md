# Autonomous Build: Spec-to-Code Auditor System

> **Instructions:** Paste this entire document into a fresh Claude Code window and run `/autonomous` mode.
> Claude will build the complete spec auditor system, tracking time per phase.

---

## Build Overview

**What we're building:** A private developer tool that lets Oscar audit his own implementation against specs, producing REBUILD documents for Claude in VS Code to execute fixes.

**Total phases:** 8 (Phase 4 and 9 are skipped/deferred)

**Estimated time:** 11-15 hours

**Start time:** Record when you begin

---

## Pre-Build Checklist

Before starting, verify:
- [ ] You're in the `oscar-app` directory
- [ ] Run `pnpm install` if needed
- [ ] Read `CLAUDE.md` for project context

---

## Phase 1: Audit Methodology Document
**Estimated: 30 minutes**

### Goal
Create the methodology document that will be indexed into Kable's PKV, teaching Oscar HOW to audit systematically.

### Tasks

1. Create `docs/audits/AUDIT_METHODOLOGY.md` with this content:

```markdown
# OSQR Audit Methodology

> **Purpose:** This document teaches Oscar how to systematically audit specs against code.
> It lives in Kable's PKV (not GKVI) — this is private developer tooling.

---

## Core Principle: Progressive Depth

**Never start at max depth. Earn depth as uncertainty increases.**

```
Layer 1: Surface Alignment
    ↓ (if issues found)
Layer 2: Domain Coherence
    ↓ (if drift detected)
Layer 3: Gap Detection
    ↓ (if evidence needed)
Layer 4: Evidence Retrieval
    ↓ (if action required)
Layer 5: Correction
```

### Layer 1 — Surface Alignment
**Question:** "Does OSQR broadly reflect the spec's intent?"

Look for:
- Familiar framing
- Correct priorities
- Right shape of implementation

If yes → PASS, move to next requirement
If no → go deeper

### Layer 2 — Domain Coherence
**Question:** "Within this specific requirement, does code align with spec?"

Compare:
- What spec says (quote it)
- What code does (cite file:line)

If coherent → PASS
If drift → go deeper

### Layer 3 — Gap Detection
**Question:** "Is this MISSING, PARTIAL, or DRIFTED?"

Classify:
- **MISSING** — Spec says X, code has nothing
- **INCOMPLETE** — Spec says X, code has partial X
- **MISALIGNED** — Spec says X, code does Y
- **BROKEN** — Code exists but doesn't work
- **UNTESTED** — Code exists, no verification possible

### Layer 4 — Evidence Retrieval (Selective)
**Only drill down when:**
- High-severity gaps
- Disputed classifications
- Architecture-critical systems

For each gap, retrieve:
- Exact spec quote with file:line
- Exact code with file:line
- Any relevant test files

### Layer 5 — Correction
Determine action:
- Fix code to match spec
- Fix spec to match (correct) code
- Mark as DEFERRED (future scope)
- Mark as WONT_FIX (intentional deviation)

---

## The Four Alignment Checks

For each requirement, verify alignment across:

| Layer | Question |
|-------|----------|
| **Chat Intent** | What was originally discussed in AI conversations? |
| **Spec** | What does the spec document say? |
| **Code** | What does the code actually do? |
| **Runtime** | Can this be triggered and verified? |

**Any misalignment = a finding.**

---

## Systematic Process

### Starting an Audit

1. **Check for active audit file** at `docs/audits/active/[SPEC_NAME]_AUDIT.md`
2. If exists: read checkpoint, follow Claude's notes, resume
3. If not: create new active audit file

### Processing Requirements

For each requirement in the spec (top to bottom):

1. Assign ID (SPEC-001, SPEC-002, etc.)
2. Classify requirement type:
   - `interface` — TypeScript interface must exist
   - `function` — Function must be implemented
   - `behavior` — Runtime behavior must work
   - `integration` — Must connect to other system
   - `data` — Database schema must exist
3. Search codebase for evidence
4. Apply progressive depth (Layers 1-5)
5. If finding: add to REBUILD document
6. Update checkpoint

### Completing an Audit

When all requirements are:
- PASS (implemented correctly)
- RESOLVED (fixed by Claude)
- DEFERRED (intentionally skipped)
- WONT_FIX (decided not to implement)

Mark audit COMPLETE and archive active audit file.

---

## Finding Types

| Type | Definition | Example |
|------|------------|---------|
| **MISSING** | Spec promises, code doesn't have | "Spec says ImportedConversation interface, not found" |
| **MISALIGNED** | Code does something different | "Spec says 3 models, code uses 2" |
| **BROKEN** | Code exists but doesn't work | "Function exists but throws unhandled error" |
| **INCOMPLETE** | Partially implemented | "Only 2 of 5 required fields present" |
| **UNTESTED** | No way to verify | "No tests, can't trigger in app" |
| **CONFLICT** | Specs contradict each other | "Spec A says X, Spec B says not-X" |
| **DRIFT** | Original intent differs from spec/code | "Chat said 3 providers, spec says multiple" |
| **DELETE** | Should be removed | "Dead code, no references" |

---

## Severity Levels

- **P0 - Blocks Launch:** Security issue, data loss, core feature broken
- **P1 - User Visible:** Doesn't match spec, confusing behavior
- **P2 - Cleanup:** Code quality, missing tests, docs gap

---

## Output Format

Always output in REBUILD format. See `docs/audits/OSQR_SELF_AUDIT_PROTOCOL.md` for exact format.

---

## Key Rules

1. **No assumptions** — If you can't point to file:line, mark UNKNOWN
2. **No intent** — What spec intended doesn't matter if code doesn't do it
3. **No future** — "Will be fixed in v2" is not acceptable
4. **Evidence required** — Every claim needs file path and line numbers
5. **Uncertainty is a finding** — If you can't verify, report that

---

*This methodology is for Kable's private use. Do not expose to other users.*
```

2. Create the active audits directory:
```bash
mkdir -p docs/audits/active
touch docs/audits/active/.gitkeep
```

3. Create completed audits directory:
```bash
mkdir -p docs/audits/completed
touch docs/audits/completed/.gitkeep
```

### Verification
- [ ] `docs/audits/AUDIT_METHODOLOGY.md` exists
- [ ] `docs/audits/active/` directory exists
- [ ] `docs/audits/completed/` directory exists

### Record Phase 1 Time
**Phase 1 completed in: ___ minutes**

---

## Phase 2: Spec Requirement Extractor
**Estimated: 2-3 hours**

### Goal
Create code that parses a spec markdown file and extracts testable requirements.

### Tasks

1. Create `packages/app-web/lib/audit/types.ts`:

```typescript
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
```

2. Create `packages/app-web/lib/audit/spec-parser.ts`:

```typescript
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
```

### Verification
```bash
# Create a simple test
cd packages/app-web
npx tsx -e "
const { parseSpec } = require('./lib/audit/spec-parser');
const result = parseSpec('../../docs/features/RENDER_SYSTEM_SPEC.md');
console.log('Title:', result.title);
console.log('Requirements found:', result.requirements.length);
console.log('First 3:', result.requirements.slice(0, 3).map(r => r.id + ': ' + r.claim.slice(0, 50)));
"
```

- [ ] Types compile without errors
- [ ] Parser extracts requirements from a real spec
- [ ] Requirement IDs are properly formatted

### Record Phase 2 Time
**Phase 2 completed in: ___ minutes**

---

## Phase 3: Codebase Evidence Finder
**Estimated: 3-4 hours**

### Goal
Create code that searches the codebase for implementation evidence of each requirement.

### Tasks

1. Create `packages/app-web/lib/audit/evidence-finder.ts`:

```typescript
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
```

### Verification
```bash
cd packages/app-web
npx tsx -e "
const { parseSpec } = require('./lib/audit/spec-parser');
const { findAllEvidence } = require('./lib/audit/evidence-finder');

async function test() {
  const spec = await parseSpec('../../docs/features/RENDER_SYSTEM_SPEC.md');
  console.log('Requirements:', spec.requirements.length);

  const evidence = await findAllEvidence(spec.requirements.slice(0, 5));
  evidence.forEach(e => {
    console.log(e.requirementId, e.status, e.filePath || 'N/A');
  });
}
test();
"
```

- [ ] Evidence finder compiles
- [ ] Can find existing implementations
- [ ] Returns NOT_FOUND for missing implementations

### Record Phase 3 Time
**Phase 3 completed in: ___ minutes**

---

## Phase 4: Intent Comparison (SKIPPED)
**Status:** Deferred until Import Interview is built

This phase will enable DRIFT detection by comparing specs/code against original ChatGPT/Claude conversations.

For now, DRIFT findings are marked as "SKIPPED - history not indexed."

---

## Phase 5: Finding Classifier
**Estimated: 1-2 hours**

### Goal
Create code that categorizes gaps into the correct finding types.

### Tasks

1. Create `packages/app-web/lib/audit/finding-classifier.ts`:

```typescript
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
```

### Verification
```bash
cd packages/app-web
npx tsx -e "
const { parseSpec } = require('./lib/audit/spec-parser');
const { findAllEvidence } = require('./lib/audit/evidence-finder');
const { classifyAllFindings } = require('./lib/audit/finding-classifier');

async function test() {
  const spec = await parseSpec('../../docs/features/RENDER_SYSTEM_SPEC.md');
  const evidence = await findAllEvidence(spec.requirements.slice(0, 10));
  const { findings, passes } = classifyAllFindings(spec.requirements.slice(0, 10), evidence);

  console.log('Passes:', passes.length);
  console.log('Findings:', findings.length);
  findings.forEach(f => console.log(f.id, f.type, f.severity));
}
test();
"
```

- [ ] Classifier compiles
- [ ] Correctly identifies MISSING vs FOUND
- [ ] Assigns appropriate severity levels

### Record Phase 5 Time
**Phase 5 completed in: ___ minutes**

---

## Phase 6: REBUILD Document Generator
**Estimated: 2-3 hours**

### Goal
Create code that outputs findings in the exact REBUILD format from the protocol.

### Tasks

1. Create `packages/app-web/lib/audit/rebuild-generator.ts`:

```typescript
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
```

### Verification
```bash
cd packages/app-web
npx tsx -e "
const { parseSpec } = require('./lib/audit/spec-parser');
const { findAllEvidence } = require('./lib/audit/evidence-finder');
const { classifyAllFindings } = require('./lib/audit/finding-classifier');
const { generateRebuildDocument, renderRebuildMarkdown } = require('./lib/audit/rebuild-generator');

async function test() {
  const spec = await parseSpec('../../docs/features/RENDER_SYSTEM_SPEC.md');
  const evidence = await findAllEvidence(spec.requirements.slice(0, 5));
  const { findings } = classifyAllFindings(spec.requirements.slice(0, 5), evidence);
  const doc = generateRebuildDocument(spec, findings);
  const markdown = renderRebuildMarkdown(doc);
  console.log(markdown.slice(0, 2000));
}
test();
"
```

- [ ] Generator compiles
- [ ] Output matches REBUILD format from protocol
- [ ] Includes all required sections

### Record Phase 6 Time
**Phase 6 completed in: ___ minutes**

---

## Phase 7: API Endpoint & Command Detection
**Estimated: 1 hour**

### Goal
Create the API endpoint and chat command detection for triggering audits.

### Tasks

1. Create `packages/app-web/app/api/audit/spec/route.ts`:

```typescript
/**
 * Spec Audit API Endpoint
 *
 * POST /api/audit/spec
 * Body: { specPath: string }
 *
 * SECURITY: Restricted to Kable's workspace only
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { parseSpec } from '@/lib/audit/spec-parser'
import { findAllEvidence } from '@/lib/audit/evidence-finder'
import { classifyAllFindings } from '@/lib/audit/finding-classifier'
import { generateRebuildDocument, renderRebuildMarkdown } from '@/lib/audit/rebuild-generator'

// Only allow Kable to use this endpoint
const ALLOWED_EMAIL = 'kablerecord@gmail.com'

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Security: Only Kable can use this
    if (session.user.email !== ALLOWED_EMAIL) {
      return NextResponse.json(
        { error: 'This endpoint is restricted' },
        { status: 403 }
      )
    }

    // Parse request
    const body = await request.json()
    const { specPath } = body

    if (!specPath || typeof specPath !== 'string') {
      return NextResponse.json(
        { error: 'specPath is required' },
        { status: 400 }
      )
    }

    // Run audit
    console.log(`[Audit] Starting audit for: ${specPath}`)
    const startTime = Date.now()

    // 1. Parse spec
    const spec = await parseSpec(specPath)
    console.log(`[Audit] Parsed ${spec.requirements.length} requirements`)

    // 2. Find evidence
    const evidence = await findAllEvidence(spec.requirements)
    console.log(`[Audit] Found evidence for ${evidence.filter(e => e.status === 'FOUND').length} requirements`)

    // 3. Classify findings
    const { findings, passes } = classifyAllFindings(spec.requirements, evidence)
    console.log(`[Audit] ${passes.length} pass, ${findings.length} findings`)

    // 4. Generate REBUILD document
    const doc = generateRebuildDocument(spec, findings)
    const markdown = renderRebuildMarkdown(doc)

    const duration = Date.now() - startTime
    console.log(`[Audit] Complete in ${duration}ms`)

    return NextResponse.json({
      success: true,
      specPath,
      stats: {
        requirements: spec.requirements.length,
        passes: passes.length,
        findings: findings.length,
        duration,
      },
      rebuild: markdown,
    })

  } catch (error) {
    console.error('[Audit] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audit failed' },
      { status: 500 }
    )
  }
}
```

2. Create `packages/app-web/lib/audit/index.ts` (main orchestrator):

```typescript
/**
 * Spec-to-Code Auditor
 *
 * Main entry point for the audit system.
 */

export { parseSpec, getAllSpecPaths, isValidSpec } from './spec-parser'
export { findEvidence, findAllEvidence } from './evidence-finder'
export { classifyFinding, classifyAllFindings } from './finding-classifier'
export { generateRebuildDocument, renderRebuildMarkdown } from './rebuild-generator'
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
```

3. Add detection to chat (update Oscar's command detection). Add to existing chat handling:

```typescript
// In the appropriate file that handles Oscar's chat input detection
// Add these patterns to detect audit requests:

const AUDIT_PATTERNS = [
  /^\/audit\s+(.+)/i,
  /audit\s+(.+\.md)/i,
  /audit\s+(.+)\s+spec/i,
  /run\s+audit\s+on\s+(.+)/i,
]

export function isAuditRequest(message: string): boolean {
  return AUDIT_PATTERNS.some(p => p.test(message))
}

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
```

### Verification
```bash
# Test the API endpoint (requires running dev server)
curl -X POST http://localhost:3001/api/audit/spec \
  -H "Content-Type: application/json" \
  -d '{"specPath": "docs/features/RENDER_SYSTEM_SPEC.md"}'
```

- [ ] API endpoint returns 403 for non-Kable users
- [ ] API returns REBUILD markdown for valid requests
- [ ] Command detection extracts spec path correctly

### Record Phase 7 Time
**Phase 7 completed in: ___ minutes**

---

## Phase 8: Active Audit State Manager
**Estimated: 1-2 hours**

### Goal
Create code to track audit state between Oscar and Claude sessions.

### Tasks

1. Create `packages/app-web/lib/audit/active-audit-manager.ts`:

```typescript
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
```

2. Ensure directories exist:
```bash
mkdir -p docs/audits/active
mkdir -p docs/audits/completed
touch docs/audits/active/.gitkeep
touch docs/audits/completed/.gitkeep
```

### Verification
```bash
cd packages/app-web
npx tsx -e "
const { createActiveAudit, getActiveAudit, addClaudeNote, updateResolutionStatus } = require('./lib/audit/active-audit-manager');

// Test creating an audit
const mockFindings = [
  { id: 'TEST-001', type: 'MISSING', severity: 'P1' },
  { id: 'TEST-002', type: 'INCOMPLETE', severity: 'P2' },
];

const audit = createActiveAudit('docs/features/TEST_SPEC.md', 'Test Spec', mockFindings);
console.log('Created audit:', audit.specTitle);

// Test loading
const loaded = getActiveAudit('docs/features/TEST_SPEC.md');
console.log('Loaded audit:', loaded?.specTitle);

// Cleanup
require('fs').unlinkSync('docs/audits/active/TEST_AUDIT.md');
console.log('Test passed!');
"
```

- [ ] Can create active audit files
- [ ] Can load existing audit state
- [ ] Can update resolutions and add notes
- [ ] Archive moves files correctly

### Record Phase 8 Time
**Phase 8 completed in: ___ minutes**

---

## Final Verification

After all phases complete:

1. **Run full build:**
```bash
cd packages/app-web
pnpm build
```

2. **Run type check:**
```bash
pnpm tsc --noEmit
```

3. **Test complete flow:**
```bash
npx tsx -e "
const { runAudit } = require('./lib/audit');

async function test() {
  const result = await runAudit('../../docs/features/RENDER_SYSTEM_SPEC.md');
  console.log('Stats:', result.stats);
  console.log('REBUILD preview:', result.markdown.slice(0, 500));
}
test();
"
```

---

## Build Summary

**Record your times:**

| Phase | Estimated | Actual |
|-------|-----------|--------|
| Phase 1: Methodology doc | 30 min | ___ |
| Phase 2: Spec parser | 2-3 hours | ___ |
| Phase 3: Evidence finder | 3-4 hours | ___ |
| Phase 4: Intent comparison | SKIPPED | - |
| Phase 5: Finding classifier | 1-2 hours | ___ |
| Phase 6: REBUILD generator | 2-3 hours | ___ |
| Phase 7: API/Command | 1 hour | ___ |
| Phase 8: Active audit manager | 1-2 hours | ___ |
| **TOTAL** | 11-15 hours | ___ |

**Build started:** ___
**Build completed:** ___
**Total duration:** ___

---

## Post-Build: Index the Methodology

After the build is complete, run:

```bash
cd packages/app-web
npm run index-osqr-self
```

This will index the new AUDIT_METHODOLOGY.md into Oscar's knowledge base.

---

*Document created: December 29, 2025*
*For use with Claude Code /autonomous mode*
