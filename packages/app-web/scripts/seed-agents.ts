import { prisma } from '../lib/db/prisma'

const TARGET_EMAIL = 'kablerecord@gmail.com'

async function main() {
  const workspace = await prisma.workspace.findFirst({
    where: { owner: { email: TARGET_EMAIL } },
  })
  
  if (!workspace) {
    console.error('Workspace not found')
    process.exit(1)
  }
  
  console.log('Seeding agents for workspace:', workspace.id)
  
  // Create the panel agents (same as seed.ts)
  const agents = [
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
  
  for (const agent of agents) {
    await prisma.agent.create({
      data: {
        ...agent,
        workspaceId: workspace.id,
        isActive: true,
      },
    })
    console.log('Created agent:', agent.name)
  }
  
  console.log('Done! Created', agents.length, 'agents')
}

main().finally(() => prisma.$disconnect())
