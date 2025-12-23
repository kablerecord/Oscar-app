/**
 * Self-Audit API (TIL)
 *
 * Runs OSQR self-audits against its architecture, roadmap, and principles.
 *
 * POST /api/til/audit
 * Body: { workspaceId, auditType: "architecture" | "roadmap" | "priorities" | "autonomous" | "comprehensive", focusArea?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import {
  runSelfAudit,
  formatAuditForChat,
  type AuditRequest,
} from '@/lib/til/self-audit'

const RequestSchema = z.object({
  workspaceId: z.string(),
  auditType: z
    .enum(['architecture', 'roadmap', 'priorities', 'autonomous', 'comprehensive'])
    .default('comprehensive'),
  focusArea: z.string().optional(),
  format: z.enum(['json', 'chat']).default('json'),
})

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const params = RequestSchema.parse(body)

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.workspaceId },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Run the audit
    const auditRequest: AuditRequest = {
      workspaceId: params.workspaceId,
      auditType: params.auditType,
      focusArea: params.focusArea,
    }

    console.log('[Self-Audit] Running audit:', {
      type: params.auditType,
      focusArea: params.focusArea || 'general',
    })

    const report = await runSelfAudit(auditRequest)

    console.log('[Self-Audit] Audit complete:', {
      score: report.score,
      findings: report.findings.length,
      systemDocs: report.metadata.systemDocsUsed.length,
    })

    // Return in requested format
    if (params.format === 'chat') {
      return NextResponse.json({
        formatted: formatAuditForChat(report),
        report,
      })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('[Self-Audit] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to run audit',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint for available audit types
export async function GET() {
  return NextResponse.json({
    availableTypes: [
      {
        id: 'architecture',
        name: 'Architecture Audit',
        description: 'Check alignment with ARCHITECTURE.md and ASSUMPTIONS.md',
      },
      {
        id: 'roadmap',
        name: 'Roadmap Audit',
        description: 'Check progress against ROADMAP.md and PROGRESS.md',
      },
      {
        id: 'priorities',
        name: 'Priorities Audit',
        description: 'Check current work aligns with stated priorities',
      },
      {
        id: 'autonomous',
        name: 'Autonomous Guidelines Audit',
        description: 'Check compliance with AUTONOMOUS-GUIDELINES.md',
      },
      {
        id: 'comprehensive',
        name: 'Comprehensive Audit',
        description: 'Full system audit across all principles',
      },
    ],
    commands: [
      '/audit - Run comprehensive audit',
      '/audit architecture - Audit against architecture',
      '/audit roadmap - Audit against roadmap',
      'audit yourself - Natural language trigger',
      'check my alignment - Natural language trigger',
    ],
  })
}
