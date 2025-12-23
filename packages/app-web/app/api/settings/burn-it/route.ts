import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Start a transaction to delete all user data
    await prisma.$transaction(async (tx) => {
      // First, find the user's workspace
      const workspace = await tx.workspace.findFirst({
        where: { ownerId: userId },
      })

      if (workspace) {
        // Delete all workspace-related data in order (to handle foreign keys)

        // Delete chat messages first (child of threads)
        await tx.chatMessage.deleteMany({
          where: {
            thread: {
              workspaceId: workspace.id,
            },
          },
        })

        // Delete chat threads
        await tx.chatThread.deleteMany({
          where: { workspaceId: workspace.id },
        })

        // Delete document chunks (child of documents)
        await tx.documentChunk.deleteMany({
          where: {
            document: {
              workspaceId: workspace.id,
            },
          },
        })

        // Delete documents
        await tx.document.deleteMany({
          where: { workspaceId: workspace.id },
        })

        // Delete agents
        await tx.agent.deleteMany({
          where: { workspaceId: workspace.id },
        })

        // Delete MSC items
        await tx.mSCItem.deleteMany({
          where: { workspaceId: workspace.id },
        })

        // Delete profile answers
        await tx.profileAnswer.deleteMany({
          where: { workspaceId: workspace.id },
        })

        // Delete projects
        await tx.project.deleteMany({
          where: { workspaceId: workspace.id },
        })

        // Delete the workspace itself
        await tx.workspace.delete({
          where: { id: workspace.id },
        })
      }

      // Delete user settings
      await tx.userSetting.deleteMany({
        where: { userId },
      })

      // Delete usage records
      await tx.usageRecord.deleteMany({
        where: { userId },
      })

      // Delete sessions (NextAuth)
      await tx.session.deleteMany({
        where: { userId },
      })

      // Delete accounts (OAuth connections)
      await tx.account.deleteMany({
        where: { userId },
      })

      // Finally, delete the user
      await tx.user.delete({
        where: { id: userId },
      })
    })

    // Return success - the frontend will redirect to home
    return NextResponse.json({
      success: true,
      message: 'All data has been permanently deleted'
    })
  } catch (error) {
    console.error('Failed to delete user data:', error)
    return NextResponse.json(
      { error: 'Failed to delete data. Please try again.' },
      { status: 500 }
    )
  }
}
