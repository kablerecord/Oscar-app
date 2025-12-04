#!/usr/bin/env tsx

import { prisma } from '../lib/db/prisma'

async function main() {
  const agents = await prisma.agent.findMany({
    where: { workspaceId: 'default-workspace' },
    select: { name: true, provider: true, modelName: true, isActive: true }
  })

  console.log('Current agents:')
  console.table(agents)

  await prisma.$disconnect()
}

main()
