/**
 * Developer Analytics Report API
 *
 * GET /api/analytics/report
 * Returns analytics summary for the authenticated user's workspace
 *
 * Only works for dev workspaces (Joe's account)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { isDevWorkspace, generateAnalyticsReport } from '@/lib/analytics/dev-analytics'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Check if this is a dev workspace
    if (!isDevWorkspace(workspace.id)) {
      return NextResponse.json(
        { error: 'Analytics only available for developer accounts' },
        { status: 403 }
      )
    }

    // Generate the report
    const report = await generateAnalyticsReport(workspace.id)

    return NextResponse.json({
      workspaceId: workspace.id,
      generatedAt: new Date().toISOString(),
      ...report,
    })
  } catch (error) {
    console.error('[Analytics] Report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
