import { MainLayout } from '@/components/layout/MainLayout'
import { VaultStats } from '@/components/vault/VaultStats'
import { DocumentList } from '@/components/vault/DocumentList'
import { VaultPageClient } from '@/components/vault/VaultPageClient'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

// Prevent static generation at build time - this page needs database access
export const dynamic = 'force-dynamic'

export default async function VaultPage() {
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
            <h2 className="text-2xl font-bold text-slate-100">
              No Workspace Found
            </h2>
            <p className="mt-2 text-slate-400">
              Please run: npm run db:seed
            </p>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Get document count
  const totalDocuments = await prisma.document.count({ where: { workspaceId: workspace.id } })

  // Get indexed document count (documents with at least one chunk)
  const indexedDocuments = await prisma.document.count({
    where: {
      workspaceId: workspace.id,
      chunks: { some: {} },
    },
  })

  // Get initial documents
  const documents = await prisma.document.findMany({
    where: { workspaceId: workspace.id },
    select: {
      id: true,
      title: true,
      sourceType: true,
      originalFilename: true,
      mimeType: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { chunks: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  })

  const user = {
    name: workspace.owner.name || 'You',
    email: workspace.owner.email,
  }

  return (
    <MainLayout
      user={user}
      workspaceName={workspace.name}
      workspaceId={workspace.id}
      showMSC={true}
      pageTitle="Memory Vault"
      pageDescription="Your personal knowledge base for OSQR"
    >
      <VaultPageClient workspaceId={workspace.id}>
        {/* Stats overview */}
        <VaultStats totalDocuments={totalDocuments} indexedDocuments={indexedDocuments} workspaceId={workspace.id} />

        {/* Document list */}
        <div className="pt-4">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            All Documents
          </h2>
          <DocumentList
            initialDocuments={documents.map((doc) => ({
              id: doc.id,
              title: doc.title,
              sourceType: doc.sourceType,
              originalFilename: doc.originalFilename || undefined,
              mimeType: doc.mimeType || undefined,
              createdAt: doc.createdAt.toISOString(),
              updatedAt: doc.updatedAt.toISOString(),
              chunkCount: doc._count.chunks,
            }))}
            initialPagination={{
              page: 1,
              limit: 20,
              total: totalDocuments,
              totalPages: Math.ceil(totalDocuments / 20),
            }}
            workspaceId={workspace.id}
          />
        </div>
      </VaultPageClient>
    </MainLayout>
  )
}
