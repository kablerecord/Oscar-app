import { prisma } from '../lib/db/prisma'

async function main() {
  const workspaces = await prisma.workspace.findMany({
    include: { owner: true }
  })
  
  const defaultAgents = [
    {
      name: 'First Principles',
      provider: 'anthropic',
      modelName: 'claude-sonnet-4-20250514',
      systemPrompt: 'You analyze from first principles. Break down problems to their fundamental truths.',
    },
    {
      name: 'Devil\'s Advocate',
      provider: 'openai',
      modelName: 'gpt-4o',
      systemPrompt: 'You challenge assumptions. Find weaknesses and alternative viewpoints.',
    },
    {
      name: 'Creative Explorer',
      provider: 'anthropic',
      modelName: 'claude-sonnet-4-20250514',
      systemPrompt: 'You think creatively. Explore unconventional solutions and make connections.',
    },
  ]
  
  for (const ws of workspaces) {
    const agents = await prisma.agent.findMany({
      where: { workspaceId: ws.id, isActive: true }
    })
    
    if (agents.length === 0) {
      console.log(`Creating agents for ${ws.owner.email}...`)
      for (const agent of defaultAgents) {
        await prisma.agent.create({
          data: {
            ...agent,
            workspaceId: ws.id,
            isActive: true,
          },
        })
      }
      console.log(`  Created ${defaultAgents.length} agents`)
    } else {
      console.log(`${ws.owner.email}: OK (${agents.length} agents)`)
    }
  }
}

main().finally(() => prisma.$disconnect())
