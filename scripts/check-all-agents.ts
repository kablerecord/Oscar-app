import { prisma } from '../lib/db/prisma'

async function main() {
  const workspaces = await prisma.workspace.findMany({
    include: { owner: true }
  })
  
  for (const ws of workspaces) {
    const agents = await prisma.agent.findMany({
      where: { workspaceId: ws.id, isActive: true }
    })
    console.log(`${ws.owner.email}: ${agents.length} agents`)
  }
}

main().finally(() => prisma.$disconnect())
