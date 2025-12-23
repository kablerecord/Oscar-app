import { MainLayout } from '@/components/layout/MainLayout'
import { PanelClientWrapper } from '@/components/panel/PanelClientWrapper'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

// Prevent static generation at build time - this page needs database access
export const dynamic = 'force-dynamic'

/**
 * Panel Page - Main chat interface with OSQR
 *
 * The OSQR bubble handles onboarding directly within this page.
 * New users will see the bubble introduce OSQR, explain how he works,
 * and guide them through their first interaction - all conversationally.
 */
export default async function PanelPage() {
  // Get the logged-in user's session
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Get the workspace owned by the logged-in user
  const workspace = await prisma.workspace.findFirst({
    where: {
      ownerId: session.user.id,
    },
    include: {
      owner: true,
    },
  })

  if (!workspace) {
    return (
      <MainLayout user={{ name: 'Guest', email: 'guest@example.com' }} workspaceName="No Workspace">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              No Workspace Found
            </h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Please run: npm run db:seed
            </p>
          </div>
        </div>
      </MainLayout>
    )
  }

  const user = {
    name: workspace.owner.name || 'You',
    email: workspace.owner.email,
  }

  return (
    <PanelClientWrapper
      user={user}
      workspaceName={workspace.name}
      workspaceId={workspace.id}
      capabilityLevel={workspace.capabilityLevel}
      onboardingCompleted={workspace.onboardingCompleted}
      userTier={workspace.tier as 'free' | 'pro' | 'master'}
    />
  )
}
