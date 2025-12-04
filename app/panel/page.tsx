import { MainLayout } from '@/components/layout/MainLayout'
import { OscarChat } from '@/components/oscar/OscarChat'
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper'
import { prisma } from '@/lib/db/prisma'

export default async function PanelPage() {
  // Get the first workspace (for single-user MVP)
  const workspace = await prisma.workspace.findFirst({
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
    <OnboardingWrapper
      workspaceId={workspace.id}
      initialOnboardingCompleted={workspace.onboardingCompleted}
    >
      <MainLayout user={user} workspaceName={workspace.name}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Chat with Oscar
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Your personal AI assistant. Oscar consults a panel of AI experts behind the scenes to give you the best possible answers.
            </p>
          </div>

          <OscarChat workspaceId={workspace.id} />
        </div>
      </MainLayout>
    </OnboardingWrapper>
  )
}
