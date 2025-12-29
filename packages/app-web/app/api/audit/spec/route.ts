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
