import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { authOptions } from '@/lib/auth/config'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find user and their workspace
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspaces: {
          take: 1, // Get the first workspace (users typically have one)
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const workspace = user.workspaces[0] || null

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      workspace: workspace
        ? {
            id: workspace.id,
            name: workspace.name,
            tier: workspace.tier,
            onboardingCompleted: workspace.onboardingCompleted,
          }
        : null,
    })
  } catch (error) {
    console.error('Workspace fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    )
  }
}
