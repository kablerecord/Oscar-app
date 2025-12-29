import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and their workspace
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspaces: {
          take: 1,
        },
      },
    })

    if (!user || !user.workspaces[0]) {
      return NextResponse.json({
        totalQuestions: 0,
        streak: 0,
        profileComplete: false,
        documentsIndexed: 0,
      })
    }

    const workspaceId = user.workspaces[0].id

    // Count total questions (messages from user in threads)
    const totalQuestions = await prisma.chatMessage.count({
      where: {
        thread: {
          workspaceId,
        },
        role: 'user',
      },
    })

    // Count documents indexed (documents that have chunks are considered indexed)
    const documentsIndexed = await prisma.document.count({
      where: {
        workspaceId,
        chunks: {
          some: {}, // Has at least one chunk = indexed
        },
      },
    })

    // Check if profile is complete (has at least 3 profile answers)
    const profileAnswerCount = await prisma.profileAnswer.count({
      where: { workspaceId },
    })
    const profileComplete = profileAnswerCount >= 3

    // Calculate streak (consecutive days with activity)
    // For now, simplified: check if there's activity in the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentActivity = await prisma.chatMessage.findMany({
      where: {
        thread: {
          workspaceId,
        },
        role: 'user',
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate streak by counting consecutive days with activity
    let streak = 0
    if (recentActivity.length > 0) {
      const activityDays = new Set(
        recentActivity.map((m) => m.createdAt.toISOString().split('T')[0])
      )

      const today = new Date()
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dateStr = checkDate.toISOString().split('T')[0]

        if (activityDays.has(dateStr)) {
          streak++
        } else if (i > 0) {
          // Allow missing today, but break on other gaps
          break
        }
      }
    }

    return NextResponse.json({
      totalQuestions,
      streak,
      profileComplete,
      documentsIndexed,
    })
  } catch (error) {
    console.error('Failed to fetch user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
