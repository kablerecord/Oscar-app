/**
 * OSQR Self-Audit System
 *
 * Hooks TIL into system PKV (architecture decisions, priorities) to enable
 * OSQR to audit its own implementation against its design principles.
 *
 * Use cases:
 * - "Am I following my architecture principles?"
 * - "What Jarvis capabilities are missing?"
 * - "Are my priorities still aligned with my roadmap?"
 * - "Audit my system against AUTONOMOUS-GUIDELINES.md"
 */

import { prisma } from '../db/prisma'
import { searchKnowledge } from '../knowledge/search'
import { getSnapshotRange, getThemes } from './session-tracker'
import { runPatternAnalysis } from './pattern-detector'
import { ProviderRegistry } from '../ai/providers'

// ============================================
// Types
// ============================================

export interface AuditRequest {
  workspaceId: string
  auditType: 'architecture' | 'roadmap' | 'priorities' | 'autonomous' | 'comprehensive'
  focusArea?: string // Optional specific area to audit
}

export interface AuditFinding {
  category: 'alignment' | 'deviation' | 'gap' | 'recommendation'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  source: string // Which doc/principle this relates to
  suggested_action?: string
}

export interface AuditReport {
  summary: string
  score: number // 0-100 alignment score
  findings: AuditFinding[]
  metadata: {
    auditType: string
    generatedAt: string
    systemDocsUsed: string[]
    tilDataPoints: number
  }
}

// ============================================
// System Document Retrieval
// ============================================

/**
 * Key system documents for each audit type
 */
const AUDIT_DOC_MAP: Record<string, string[]> = {
  architecture: ['ARCHITECTURE.md', 'ASSUMPTIONS.md', 'lib/ai/oscar.ts'],
  roadmap: ['ROADMAP.md', 'PROGRESS.md', 'docs/JARVIS_CAPABILITIES.md'],
  priorities: ['ROADMAP.md', 'PROGRESS.md', 'BLOCKED.md'],
  autonomous: ['AUTONOMOUS-GUIDELINES.md', 'lib/autonomy/rails.ts'],
  comprehensive: [
    'ARCHITECTURE.md',
    'ROADMAP.md',
    'AUTONOMOUS-GUIDELINES.md',
    'ASSUMPTIONS.md',
    'PROGRESS.md',
  ],
}

/**
 * Retrieve system docs relevant for the audit type
 */
async function getSystemDocs(
  workspaceId: string,
  auditType: string
): Promise<{ content: string; sources: string[] }> {
  const docNames = AUDIT_DOC_MAP[auditType] || AUDIT_DOC_MAP.comprehensive
  const sources: string[] = []
  const contents: string[] = []

  for (const docName of docNames) {
    const result = await searchKnowledge({
      workspaceId,
      query: docName,
      topK: 3,
      scope: 'system',
    })

    if (result) {
      contents.push(result)
      sources.push(docName)
    }
  }

  return {
    content: contents.join('\n\n---\n\n'),
    sources,
  }
}

// ============================================
// TIL Data Collection for Audit
// ============================================

interface TILAuditData {
  recentThemes: string[]
  momentum: string
  completionRate: number
  totalSessions: number
  topPatterns: string[]
}

async function collectTILForAudit(workspaceId: string): Promise<TILAuditData> {
  const [snapshots, themes, patterns] = await Promise.all([
    getSnapshotRange(workspaceId, 30), // Last 30 days
    getThemes(workspaceId),
    runPatternAnalysis(workspaceId),
  ])

  const totalSessions = snapshots.reduce((sum, s) => sum + s.sessions, 0)
  const totalMscAdded = snapshots.reduce((sum, s) => sum + s.metrics.msc_additions, 0)
  const totalMscCompleted = snapshots.reduce((sum, s) => sum + s.metrics.msc_completions, 0)
  const completionRate = totalMscAdded > 0 ? totalMscCompleted / totalMscAdded : 0

  return {
    recentThemes: themes.slice(0, 5).map((t) => t.theme),
    momentum: patterns.overall_momentum,
    completionRate,
    totalSessions,
    topPatterns: patterns.velocity_trends.slice(0, 3).map((t) => t.metric),
  }
}

// ============================================
// Audit Generation
// ============================================

const AUDIT_PROMPT = `You are OSQR's Self-Audit System. You analyze OSQR's actual implementation and behavior against its documented architecture, principles, and roadmap.

Your job is to identify:
1. **Alignments** - Where implementation matches design principles
2. **Deviations** - Where behavior differs from documented intentions
3. **Gaps** - Missing capabilities or features from the roadmap
4. **Recommendations** - Specific improvements to increase alignment

AUDIT TYPE: {{AUDIT_TYPE}}
FOCUS AREA: {{FOCUS_AREA}}

---

SYSTEM DOCUMENTATION:
{{SYSTEM_DOCS}}

---

RECENT TIL DATA (Execution Patterns):
{{TIL_DATA}}

---

Based on this analysis, generate an audit report in JSON format:

{
  "summary": "2-3 sentence overview of alignment status",
  "score": 85, // 0-100 alignment score
  "findings": [
    {
      "category": "alignment|deviation|gap|recommendation",
      "severity": "info|warning|critical",
      "title": "Brief finding title",
      "description": "Detailed explanation",
      "source": "Which doc/principle this relates to",
      "suggested_action": "What to do about it (optional)"
    }
  ]
}

Be specific and actionable. Reference exact documents and code paths when possible.`

export async function runSelfAudit(request: AuditRequest): Promise<AuditReport> {
  const { workspaceId, auditType, focusArea } = request

  // Collect all context
  const [systemDocs, tilData] = await Promise.all([
    getSystemDocs(workspaceId, auditType),
    collectTILForAudit(workspaceId),
  ])

  // Build the prompt
  const tilDataStr = `
- Recent work themes: ${tilData.recentThemes.join(', ') || 'None tracked'}
- Current momentum: ${tilData.momentum}
- MSC completion rate: ${(tilData.completionRate * 100).toFixed(0)}%
- Total sessions (30d): ${tilData.totalSessions}
- Top patterns: ${tilData.topPatterns.join(', ') || 'None detected'}`

  const prompt = AUDIT_PROMPT
    .replace('{{AUDIT_TYPE}}', auditType)
    .replace('{{FOCUS_AREA}}', focusArea || 'General system audit')
    .replace('{{SYSTEM_DOCS}}', systemDocs.content || 'No system docs found')
    .replace('{{TIL_DATA}}', tilDataStr)

  // Call the model
  const provider = ProviderRegistry.getProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-sonnet-4-20250514',
  })

  const response = await provider.generate({
    messages: [{ role: 'user', content: prompt }],
  })

  // Parse response
  let report: Omit<AuditReport, 'metadata'>

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    report = JSON.parse(jsonMatch[0])
  } catch {
    // Fallback
    report = {
      summary: response.slice(0, 200),
      score: 50,
      findings: [
        {
          category: 'recommendation',
          severity: 'warning',
          title: 'Audit parsing failed',
          description: 'Unable to parse structured audit. Review raw response.',
          source: 'System',
        },
      ],
    }
  }

  return {
    ...report,
    metadata: {
      auditType,
      generatedAt: new Date().toISOString(),
      systemDocsUsed: systemDocs.sources,
      tilDataPoints: tilData.totalSessions,
    },
  }
}

// ============================================
// Chat Command Detection
// ============================================

/**
 * Detect if a message is requesting a self-audit
 */
export function isAuditRequest(message: string): boolean {
  const auditPatterns = [
    /^\/audit/i,
    /audit.*yourself/i,
    /audit.*system/i,
    /self.?audit/i,
    /check.*alignment/i,
    /review.*architecture/i,
    /am i following/i,
    /are.*principles.*aligned/i,
    /validate.*against.*roadmap/i,
  ]
  return auditPatterns.some((p) => p.test(message))
}

/**
 * Extract audit parameters from message
 */
export function extractAuditParams(message: string): Partial<AuditRequest> {
  const params: Partial<AuditRequest> = {}

  // Detect audit type
  if (/architect/i.test(message)) {
    params.auditType = 'architecture'
  } else if (/roadmap/i.test(message)) {
    params.auditType = 'roadmap'
  } else if (/priorit/i.test(message)) {
    params.auditType = 'priorities'
  } else if (/autonom/i.test(message)) {
    params.auditType = 'autonomous'
  } else {
    params.auditType = 'comprehensive'
  }

  // Extract focus area
  const focusMatch = message.match(/(?:focus(?:ing)?\s+on|about)\s+([^,.]+)/i)
  if (focusMatch) {
    params.focusArea = focusMatch[1].trim()
  }

  return params
}

// ============================================
// Format for Chat
// ============================================

export function formatAuditForChat(report: AuditReport): string {
  const lines: string[] = []

  // Header
  lines.push(`## Self-Audit Report (${report.metadata.auditType})`)
  lines.push('')

  // Score
  const scoreEmoji = report.score >= 80 ? '🟢' : report.score >= 60 ? '🟡' : '🔴'
  lines.push(`**Alignment Score:** ${scoreEmoji} ${report.score}/100`)
  lines.push('')

  // Summary
  lines.push(`### Summary`)
  lines.push(report.summary)
  lines.push('')

  // Findings by severity
  const critical = report.findings.filter((f) => f.severity === 'critical')
  const warnings = report.findings.filter((f) => f.severity === 'warning')
  const info = report.findings.filter((f) => f.severity === 'info')

  if (critical.length > 0) {
    lines.push('### 🔴 Critical Findings')
    critical.forEach((f) => {
      lines.push(`**${f.title}** (${f.category})`)
      lines.push(`> ${f.description}`)
      if (f.suggested_action) {
        lines.push(`> *Action: ${f.suggested_action}*`)
      }
      lines.push('')
    })
  }

  if (warnings.length > 0) {
    lines.push('### 🟡 Warnings')
    warnings.forEach((f) => {
      lines.push(`**${f.title}** (${f.category})`)
      lines.push(`> ${f.description}`)
      if (f.suggested_action) {
        lines.push(`> *Action: ${f.suggested_action}*`)
      }
      lines.push('')
    })
  }

  if (info.length > 0) {
    lines.push('### ℹ️ Information')
    info.forEach((f) => {
      lines.push(`- **${f.title}**: ${f.description}`)
    })
    lines.push('')
  }

  // Metadata
  lines.push('---')
  lines.push(
    `*Sources: ${report.metadata.systemDocsUsed.join(', ')} | Data points: ${report.metadata.tilDataPoints} | Generated: ${new Date(report.metadata.generatedAt).toLocaleDateString()}*`
  )

  return lines.join('\n')
}
