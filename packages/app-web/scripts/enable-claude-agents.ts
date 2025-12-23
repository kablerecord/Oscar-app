#!/usr/bin/env tsx

import { prisma } from '../lib/db/prisma'

async function main() {
  console.log('Re-enabling Claude (Anthropic) agents...')

  const result = await prisma.agent.updateMany({
    where: {
      provider: 'anthropic',
    },
    data: {
      isActive: true,
    },
  })

  console.log(`✅ Enabled ${result.count} Claude agents`)
  console.log('\nOSQR will now use both GPT-4 and Claude agents!')

  await prisma.$disconnect()
}

main()
