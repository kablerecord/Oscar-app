import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const body = await request.json()
    const { type, message, email } = body

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Store feedback in database
    // For now, we'll store it in the Insight table with a special category
    // In production, you might want a dedicated Feedback table

    const userId = session?.user?.id
    let workspaceId: string | null = null

    if (userId) {
      const workspace = await prisma.workspace.findFirst({
        where: { ownerId: userId },
        select: { id: true },
      })
      workspaceId = workspace?.id || null
    }

    // Create a feedback record
    // Using Insight table with 'feedback' category for simplicity
    if (workspaceId) {
      await prisma.insight.create({
        data: {
          workspaceId,
          category: 'feedback',
          type: type || 'general',
          title: `${type || 'Feedback'}: ${message.slice(0, 50)}${message.length > 50 ? '...' : ''}`,
          message: message,
          priority: 0,
          status: 'new',
          metadata: {
            feedbackType: type,
            userEmail: email || session?.user?.email || null,
            submittedAt: new Date().toISOString(),
          },
        },
      })
    }

    // Also log to console for immediate visibility during development
    console.log('[Feedback Received]', {
      type,
      message,
      email: email || session?.user?.email,
      userId,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API/feedback] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
