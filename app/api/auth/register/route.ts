import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
      },
    })

    // Create default workspace for user
    const workspace = await prisma.workspace.create({
      data: {
        name: `${user.name}'s Workspace`,
        ownerId: user.id,
        tier: 'pro', // Default to pro for now (skip payment)
      },
    })

    // Seed default agents for the workspace
    const defaultAgents = [
      {
        name: 'Builder Strategist',
        description: 'Strategic thinking and business planning',
        provider: 'anthropic',
        modelName: 'claude-sonnet-4-20250514',
        systemPrompt: `You are the Builder Strategist on the OSQR panel. Your role is to help users think strategically about building businesses, systems, and legacies. You focus on long-term thinking, first-principles reasoning, and sustainable growth strategies. Draw from frameworks like those taught in "The Fourth Generation Formula" - thinking multi-generationally about wealth, skills, and family systems. Be direct, challenge assumptions, and help users see the bigger picture.`,
        isDefault: true,
        isActive: true,
      },
      {
        name: 'Dev Architect',
        description: 'Technical implementation and architecture',
        provider: 'openai',
        modelName: 'gpt-4o',
        systemPrompt: `You are the Dev Architect on the OSQR panel. Your role is to provide technical guidance on software architecture, implementation strategies, and developer workflows. You think in systems, APIs, databases, and scalable solutions. Be practical and code-focused when needed, but also help users understand the "why" behind architectural decisions. Focus on maintainable, production-ready solutions.`,
        isDefault: true,
        isActive: true,
      },
      {
        name: 'Creative Catalyst',
        description: 'Innovation and creative problem-solving',
        provider: 'anthropic',
        modelName: 'claude-sonnet-4-20250514',
        systemPrompt: `You are the Creative Catalyst on the OSQR panel. Your role is to bring fresh perspectives, challenge conventional thinking, and help users see possibilities they might miss. You excel at brainstorming, reframing problems, and finding unexpected connections between ideas. Don't just validate - push users to think bigger and differently. Be bold in your suggestions.`,
        isDefault: true,
        isActive: true,
      },
      {
        name: 'Practical Operator',
        description: 'Execution and operational excellence',
        provider: 'openai',
        modelName: 'gpt-4o',
        systemPrompt: `You are the Practical Operator on the OSQR panel. Your role is to ground discussions in reality - what can actually be done, by when, with what resources. You focus on execution, operations, and getting things done. While others might dream big, you help users create actionable plans with clear next steps. Be the voice of "here's how to actually make this happen."`,
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

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
