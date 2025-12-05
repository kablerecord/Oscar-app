import { MainLayout } from '@/components/layout/MainLayout'
import { VaultStats } from '@/components/vault/VaultStats'
import { DocumentList } from '@/components/vault/DocumentList'
import { prisma } from '@/lib/db/prisma'

// Prevent static generation at build time - this page needs database access
export const dynamic = 'force-dynamic'

export default async function VaultPage() {
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

  // Get stats
  const [totalDocuments, totalChunks, sourceBreakdown] = await Promise.all([
    prisma.document.count({ where: { workspaceId: workspace.id } }),
    prisma.documentChunk.count({
      where: { document: { workspaceId: workspace.id } },
    }),
    prisma.document.groupBy({
      by: ['sourceType'],
      _count: { _all: true },
      where: { workspaceId: workspace.id },
    }),
  ])

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
    <MainLayout user={user} workspaceName={workspace.name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Memory Vault
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Browse and manage your indexed documents. OSQR uses this knowledge to give you personalized answers.
          </p>
        </div>

        {/* Stats overview */}
        <VaultStats
          totalDocuments={totalDocuments}
          totalChunks={totalChunks}
          sourceBreakdown={sourceBreakdown.map((s) => ({
            type: s.sourceType,
            count: s._count._all,
          }))}
        />

        {/* Document list */}
        <div className="pt-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
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
            filters={{
              sourceTypes: sourceBreakdown.map((s) => ({
                type: s.sourceType,
                count: s._count._all,
              })),
            }}
            workspaceId={workspace.id}
          />
        </div>
      </div>
    </MainLayout>
  )
}
