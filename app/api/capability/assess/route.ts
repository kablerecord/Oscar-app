import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { calculateLevel, ASSESSMENT_QUESTIONS } from '@/lib/capability/assessment'
import { getLevelDetails } from '@/lib/capability/levels'

const AssessmentSchema = z.object({
  workspaceId: z.string(),
  answers: z.record(z.string(), z.number()), // { questionId: selectedOptionIndex }
  trigger: z.string().optional(), // What triggered this assessment (e.g., 'onboarding', 'manual', 'periodic')
})

/**
 * POST /api/capability/assess
 * Submit assessment answers and calculate capability level
 */
export async function POST(req: NextRequest) {
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

    // Parse and validate request
    const body = await req.json()
    const { workspaceId, answers, trigger = 'manual' } = AssessmentSchema.parse(body)

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Not found', message: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Calculate capability level from answers
    const result = calculateLevel(answers)
    const levelDetails = getLevelDetails(result.level)

    // Update workspace with new capability level
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        capabilityLevel: result.level,
        capabilityAssessedAt: new Date(),
        identityStage: result.stage,
      },
    })

    // Record assessment in history
    await prisma.capabilityAssessment.create({
      data: {
        workspaceId,
        level: result.level,
        stage: result.stage,
        triggers: [trigger],
        answers: answers,
        notes: `Confidence: ${Math.round(result.confidence * 100)}%`,
      },
    })

    return NextResponse.json({
      success: true,
      result: {
        level: result.level,
        stage: result.stage,
        confidence: result.confidence,
        breakdown: result.breakdown,
        levelDetails: levelDetails ? {
          name: levelDetails.name,
          description: levelDetails.description,
          identityPattern: levelDetails.identityPattern,
          keyBehaviors: levelDetails.keyBehaviors,
        } : null,
      },
    })
  } catch (error) {
    console.error('[Capability Assess] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal error', message: 'Failed to process assessment' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/capability/assess
 * Get assessment questions
 */
export async function GET() {
  return NextResponse.json({
    questions: ASSESSMENT_QUESTIONS,
    totalQuestions: ASSESSMENT_QUESTIONS.length,
  })
}
