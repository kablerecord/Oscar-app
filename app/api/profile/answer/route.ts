import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const AnswerSchema = z.object({
  workspaceId: z.string(),
  questionId: z.string(),
  category: z.string(),
  question: z.string(),
  answer: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspaceId, questionId, category, question, answer } = AnswerSchema.parse(body)

    // Upsert (create or update) the answer
    const profileAnswer = await prisma.profileAnswer.upsert({
      where: {
        workspaceId_questionId: {
          workspaceId,
          questionId,
        },
      },
      update: {
        answer,
        updatedAt: new Date(),
      },
      create: {
        workspaceId,
        questionId,
        category,
        question,
        answer,
      },
    })

    return NextResponse.json({ success: true, answer: profileAnswer })
  } catch (error) {
    console.error('Error saving profile answer:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to save answer', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
