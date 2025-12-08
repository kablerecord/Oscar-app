#!/usr/bin/env tsx

import { prisma } from '../lib/db/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('Creating admin account for Kable...')

  const email = 'kable@osqr.app'
  const password = 'OSQR2025Builder!'
  const name = 'Kable Record'

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    console.log('User already exists, updating password...')
    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    })
    console.log('Password updated!')
  } else {
    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    })

    // Create workspace with pro tier
    const workspace = await prisma.workspace.create({
      data: {
        name: "Kable's OSQR",
        ownerId: user.id,
        tier: 'master', // Give admin master tier
        onboardingCompleted: true, // Skip onboarding for admin
        onboardingCompletedAt: new Date(),
      },
    })

    // Seed default agents
    const defaultAgents = [
      {
        name: 'Builder Strategist',
        description: 'Strategic thinking and business planning',
        provider: 'anthropic',
        modelName: 'claude-sonnet-4-20250514',
        systemPrompt: `You are the Builder Strategist on the OSQR panel. Your role is to help users think strategically about building businesses, systems, and legacies.`,
        isDefault: true,
        isActive: true,
      },
      {
        name: 'Dev Architect',
        description: 'Technical implementation and architecture',
        provider: 'openai',
        modelName: 'gpt-4o',
        systemPrompt: `You are the Dev Architect on the OSQR panel. Your role is to provide technical guidance on software architecture and implementation.`,
        isDefault: true,
        isActive: true,
      },
      {
        name: 'Creative Catalyst',
        description: 'Innovation and creative problem-solving',
        provider: 'anthropic',
        modelName: 'claude-sonnet-4-20250514',
        systemPrompt: `You are the Creative Catalyst on the OSQR panel. Your role is to bring fresh perspectives and challenge conventional thinking.`,
        isDefault: true,
        isActive: true,
      },
      {
        name: 'Practical Operator',
        description: 'Execution and operational excellence',
        provider: 'openai',
        modelName: 'gpt-4o',
        systemPrompt: `You are the Practical Operator on the OSQR panel. Your role is to ground discussions in reality and create actionable plans.`,
        isDefault: true,
        isActive: true,
      },
    ]

    await prisma.agent.createMany({
      data: defaultAgents.map((agent) => ({
        ...agent,
        workspaceId: workspace.id,
      })),
    })

    console.log('Admin account created!')
    console.log(`  Email: ${email}`)
    console.log(`  Password: ${password}`)
    console.log(`  Workspace ID: ${workspace.id}`)
  }

  await prisma.$disconnect()
}

main().catch(console.error)
