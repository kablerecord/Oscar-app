#!/usr/bin/env tsx

import { prisma } from '../lib/db/prisma'

async function main() {
  console.log('Updating Claude agents to use claude-sonnet-4...')

  const result = await prisma.agent.updateMany({
    where: {
      provider: 'anthropic',
    },
    data: {
      modelName: 'claude-sonnet-4',
      isActive: true,
    },
  })

  console.log(`✅ Updated ${result.count} Claude agents to claude-sonnet-4`)
  console.log('\nOscar will now use:')
  console.log('  - 2x Claude Sonnet 4 agents')
  console.log('  - 2x GPT-4 Turbo agents')
  console.log('\nFull 4-agent panel is now active!')

  await prisma.$disconnect()
}

main()
