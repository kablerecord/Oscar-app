#!/usr/bin/env tsx

import { prisma } from '../lib/db/prisma'

async function main() {
  console.log('Disabling Claude (Anthropic) agents temporarily...')

  const result = await prisma.agent.updateMany({
    where: {
      provider: 'anthropic',
    },
    data: {
      isActive: false,
    },
  })

  console.log(`✅ Disabled ${result.count} Claude agents`)
  console.log('\nOscar will now use only GPT-4 agents.')
  console.log('Once Anthropic credits are active, run: npx tsx scripts/enable-claude-agents.ts')

  await prisma.$disconnect()
}

main()
