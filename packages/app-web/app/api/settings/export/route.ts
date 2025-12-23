import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch workspace and all related data
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      include: {
        threads: {
          include: {
            messages: true,
          },
        },
        documents: true,
        agents: true,
        mscItems: true,
        profileAnswers: true,
        projects: true,
      },
    })

    // Fetch user settings
    const userSettings = await prisma.userSetting.findMany({
      where: { userId: session.user.id },
    })

    // Fetch usage records
    const usageRecords = await prisma.usageRecord.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
      take: 1000, // Limit to last 1000 records
    })

    // Build export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      settings: userSettings.map(s => ({
        key: s.key,
        value: s.value,
      })),
      workspace: workspace ? {
        name: workspace.name,
        tier: workspace.tier,
        createdAt: workspace.createdAt,
        threads: workspace.threads.map(t => ({
          id: t.id,
          title: t.title,
          mode: t.mode,
          createdAt: t.createdAt,
          messages: t.messages.map(m => ({
            role: m.role,
            content: m.content,
            provider: m.provider,
            createdAt: m.createdAt,
          })),
        })),
        documents: workspace.documents.map(d => ({
          title: d.title,
          originalFilename: d.originalFilename,
          mimeType: d.mimeType,
          sourceType: d.sourceType,
          createdAt: d.createdAt,
        })),
        agents: workspace.agents.map(a => ({
          name: a.name,
          systemPrompt: a.systemPrompt,
          createdAt: a.createdAt,
        })),
        mscItems: workspace.mscItems.map(m => ({
          category: m.category,
          content: m.content,
          description: m.description,
          status: m.status,
          isPinned: m.isPinned,
          sortOrder: m.sortOrder,
          createdAt: m.createdAt,
        })),
        profileAnswers: workspace.profileAnswers.map(p => ({
          questionId: p.questionId,
          category: p.category,
          question: p.question,
          answer: p.answer,
          updatedAt: p.updatedAt,
        })),
        projects: workspace.projects.map(p => ({
          name: p.name,
          description: p.description,
          createdAt: p.createdAt,
        })),
      } : null,
      usageSummary: {
        totalRecords: usageRecords.length,
        recentUsage: usageRecords.slice(0, 100).map(r => ({
          endpoint: r.endpoint,
          date: r.date,
          requestCount: r.requestCount,
          tokenCount: r.tokenCount,
        })),
      },
    }

    // Return as downloadable JSON file
    const jsonString = JSON.stringify(exportData, null, 2)

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="osqr-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Failed to export user data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
