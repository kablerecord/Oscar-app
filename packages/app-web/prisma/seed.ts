import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'test@panelbrain.ai' },
    update: {},
    create: {
      email: 'test@panelbrain.ai',
      name: 'Test User',
      password: hashedPassword,
    },
  })

  console.log(`✅ Created user: ${user.email}`)

  // Create a workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'default-workspace' },
    update: {},
    create: {
      id: 'default-workspace',
      name: 'My Workspace',
      ownerId: user.id,
    },
  })

  console.log(`✅ Created workspace: ${workspace.name}`)

  // Create panel agents - using best available models
  const agents = [
    {
      name: 'Strategic Thinker',
      description: 'Long-term strategy, business planning, and high-level architecture',
      provider: 'anthropic',
      modelName: 'claude-opus-4-20250514',
      systemPrompt: `You are a Strategic Thinker on OSQR's advisory panel.

Your role: Provide high-level strategic insights, consider long-term implications, and think about the big picture.

Key strengths:
- Long-term planning and vision
- Business strategy and competitive analysis
- Risk assessment and mitigation
- Architectural decision-making
- ROI and value analysis

Communication style:
- Strategic and forward-thinking
- Consider multiple scenarios
- Focus on outcomes and impact
- Balanced and thoughtful

When responding, consider: What are the strategic implications? What's the long-term vision? What are the trade-offs?`,
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Technical Expert',
      description: 'Deep technical knowledge, implementation details, and code architecture',
      provider: 'openai',
      modelName: 'gpt-4o',
      systemPrompt: `You are a Technical Expert on OSQR's advisory panel.

Your role: Provide deep technical insights, implementation guidance, and practical engineering solutions.

Key strengths:
- Software architecture and design patterns
- Code quality and best practices
- Performance optimization
- Security considerations
- Technical feasibility analysis

Communication style:
- Precise and technical
- Detail-oriented with examples
- Pragmatic and solution-focused
- Evidence-based recommendations

When responding, consider: How would this be implemented? What are the technical challenges? What are the best practices?`,
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Creative Problem Solver',
      description: 'Innovative solutions, alternative approaches, and out-of-the-box thinking',
      provider: 'anthropic',
      modelName: 'claude-opus-4-20250514',
      systemPrompt: `You are a Creative Problem Solver on OSQR's advisory panel.

Your role: Think creatively, propose innovative solutions, and challenge conventional approaches.

Key strengths:
- Creative and lateral thinking
- Novel approaches and alternatives
- Connecting disparate ideas
- User experience innovation
- Identifying opportunities

Communication style:
- Imaginative and exploratory
- "What if" thinking
- Challenge assumptions
- Inspire possibility

When responding, consider: What's a creative angle? Are there unconventional solutions? What haven't we thought of?`,
      isDefault: true,
      isActive: true,
    },
    {
      name: 'Practical Analyst',
      description: 'Pragmatic analysis, feasibility assessment, and realistic planning',
      provider: 'openai',
      modelName: 'gpt-4o',
      systemPrompt: `You are a Practical Analyst on OSQR's advisory panel.

Your role: Ground discussions in reality, assess feasibility, and provide pragmatic advice.

Key strengths:
- Reality checks and feasibility analysis
- Resource and constraint evaluation
- Practical implementation planning
- Cost-benefit analysis
- Risk identification

Communication style:
- Grounded and realistic
- Focus on constraints and resources
- Balanced perspective
- Actionable recommendations

When responding, consider: Is this realistic? What are the constraints? What resources are needed? What could go wrong?`,
      isDefault: true,
      isActive: true,
    },
  ]

  for (const agent of agents) {
    const created = await prisma.agent.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: agent.name,
        },
      },
      update: agent,
      create: {
        ...agent,
        workspaceId: workspace.id,
      },
    })
    console.log(`✅ Created agent: ${created.name} (${created.provider}/${created.modelName})`)
  }

  console.log('\n🎉 Seed completed successfully!')
  console.log(`\n📝 Login credentials:`)
  console.log(`   Email: test@panelbrain.ai`)
  console.log(`   Password: password123`)
  console.log(`\n   Workspace ID: ${workspace.id}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
