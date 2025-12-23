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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        workspaces: {
          select: {
            tier: true,
          },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get tier from workspace (default to free)
    const tier = user.workspaces[0]?.tier || 'free'

    return NextResponse.json({
      name: user.name || 'Not set',
      email: user.email,
      tier,
      createdAt: user.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch user data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
