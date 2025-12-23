import { prisma } from '../lib/db/prisma'

const TARGET_EMAIL = 'kablerecord@gmail.com'

async function main() {
  const workspace = await prisma.workspace.findFirst({
    where: { owner: { email: TARGET_EMAIL } },
    include: { owner: true }
  })
  console.log('Workspace:', workspace?.id, workspace?.name)
  
  if (workspace) {
    const agents = await prisma.agent.findMany({
      where: { workspaceId: workspace.id, isActive: true }
    })
    console.log('Active agents:', agents.length)
    agents.forEach(a => console.log(' -', a.name, a.provider))
  }
}
main().finally(() => prisma.$disconnect())
