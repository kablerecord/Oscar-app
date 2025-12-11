import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

/**
 * POST /api/onboarding/reset
 *
 * Resets onboarding status for a workspace so you can see the flow again.
 * DEV ONLY - should be removed or protected in production.
 */
export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Only available in development' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const { workspaceId } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Reset onboarding status
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        onboardingCompleted: false,
        onboardingCompletedAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding has been reset. Visit /onboarding to see the flow again.',
      workspace: {
        id: workspace.id,
        onboardingCompleted: workspace.onboardingCompleted,
      },
    })
  } catch (error) {
    console.error('Reset onboarding error:', error)
    return NextResponse.json(
      { error: 'Failed to reset onboarding' },
      { status: 500 }
    )
  }
}
