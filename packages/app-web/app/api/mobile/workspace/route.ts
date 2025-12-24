import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { authOptions } from '@/lib/auth/config'

/**
 * GET /api/mobile/workspace
 *
 * Returns the authenticated user's workspace ID for mobile app use.
 * Creates a workspace if one doesn't exist (shouldn't happen normally).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      )
    }

    const userId = (session.user as { id?: string }).id || session.user.email

    // Find user's workspace
    let workspace = await prisma.workspace.findFirst({
      where: { ownerId: userId },
      select: { id: true, name: true, tier: true },
    })

    // If no workspace exists, create one (edge case for mobile-first users)
    if (!workspace) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      workspace = await prisma.workspace.create({
        data: {
          name: `${user.name || 'My'}'s Workspace`,
          ownerId: user.id,
          tier: 'starter',
        },
        select: { id: true, name: true, tier: true },
      })
    }

    return NextResponse.json({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      tier: workspace.tier,
    })
  } catch (error) {
    console.error('[Mobile Workspace] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
