import { prisma } from '../lib/db/prisma'

async function fixAnthropicModels() {
  console.log('Connecting to database...')

  // First show current agents
  const agents = await prisma.agent.findMany({
    select: { id: true, name: true, provider: true, modelName: true }
  })
  console.log('Current agents:', agents)

  // Update Anthropic agents with the old model name
  const result = await prisma.agent.updateMany({
    where: {
      provider: 'anthropic',
      modelName: 'claude-3-5-sonnet-20241022'
    },
    data: {
      modelName: 'claude-3-5-sonnet-latest'
    }
  })

  console.log(`Updated ${result.count} agents`)

  // Show updated agents
  const updatedAgents = await prisma.agent.findMany({
    select: { id: true, name: true, provider: true, modelName: true }
  })
  console.log('Updated agents:', updatedAgents)

  await prisma.$disconnect()
}

fixAnthropicModels()
  .catch(console.error)
