import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  try {
    // Check authentication (with dev bypass)
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    let userId: string
    if (isDev && !session?.user?.email) {
      userId = 'dev-user'
    } else if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    } else {
      userId = (session.user as { id?: string }).id || session.user.email
    }

    const body = await req.json()
    const { workspaceId, onboardingData } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Build profile questions from the new onboarding data structure
    const profileQuestions = [
      {
        id: 'personal-name',
        category: 'personal',
        question: "What's your first name?",
        answer: onboardingData?.name
      },
      {
        id: 'personal-working-on',
        category: 'personal',
        question: 'What are you currently working on?',
        answer: onboardingData?.workingOn
      },
      {
        id: 'personal-frustration',
        category: 'personal',
        question: "What's your biggest frustration with AI tools?",
        answer: onboardingData?.frustration
      },
    ]

    // Add optional data from magic moments if available
    if (onboardingData?.uploadedFile) {
      profileQuestions.push({
        id: 'onboarding-uploaded-file',
        category: 'onboarding',
        question: 'First uploaded file',
        answer: JSON.stringify({
          name: onboardingData.uploadedFile.name,
          summary: onboardingData.uploadedFile.summary,
        })
      })
    }

    if (onboardingData?.firstQuestion) {
      profileQuestions.push({
        id: 'onboarding-first-question',
        category: 'onboarding',
        question: 'First question asked during onboarding',
        answer: onboardingData.firstQuestion
      })
    }

    if (onboardingData?.panelDebate) {
      profileQuestions.push({
        id: 'onboarding-panel-topic',
        category: 'onboarding',
        question: 'Panel debate topic from onboarding',
        answer: onboardingData.panelDebate.synthesis || 'Panel debate completed'
      })
    }

    // Upsert each profile answer
    for (const q of profileQuestions) {
      if (q.answer && String(q.answer).trim()) {
        await prisma.profileAnswer.upsert({
          where: {
            workspaceId_questionId: {
              workspaceId,
              questionId: q.id,
            },
          },
          update: {
            answer: String(q.answer).trim(),
            updatedAt: new Date(),
          },
          create: {
            workspaceId,
            questionId: q.id,
            category: q.category,
            question: q.question,
            answer: String(q.answer).trim(),
          },
        })
      }
    }

    // Mark onboarding as completed
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    })
  } catch (error) {
    console.error('Onboarding completion error:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
