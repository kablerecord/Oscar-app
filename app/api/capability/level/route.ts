import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from 'next-auth'
import { getLevelDetails, getStageInfo, getNextLevelInfo } from '@/lib/capability/levels'

/**
 * GET /api/capability/level?workspaceId=xxx
 * Get current capability level for a workspace
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing parameter', message: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Get workspace with capability data
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        capabilityLevel: true,
        capabilityAssessedAt: true,
        identityStage: true,
      },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Not found', message: 'Workspace not found' },
        { status: 404 }
      )
    }

    const level = workspace.capabilityLevel
    const levelDetails = getLevelDetails(level)
    const stageInfo = getStageInfo(levelDetails?.stage || 'foundation')
    const nextLevel = getNextLevelInfo(level)

    return NextResponse.json({
      workspaceId: workspace.id,
      level,
      assessedAt: workspace.capabilityAssessedAt,
      identityStage: workspace.identityStage,
      levelDetails: levelDetails ? {
        name: levelDetails.name,
        stage: levelDetails.stage,
        description: levelDetails.description,
        identityPattern: levelDetails.identityPattern,
        keyBehaviors: levelDetails.keyBehaviors,
        coachingFocus: levelDetails.coachingFocus,
      } : null,
      stageInfo: stageInfo ? {
        name: stageInfo.name,
        description: stageInfo.description,
        levelRange: stageInfo.levelRange,
      } : null,
      nextLevel: nextLevel ? {
        level: nextLevel.level,
        name: nextLevel.name,
        description: nextLevel.description,
      } : null,
      needsAssessment: !workspace.capabilityAssessedAt,
    })
  } catch (error) {
    console.error('[Capability Level] Error:', error)
    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to get capability level' },
      { status: 500 }
    )
  }
}
