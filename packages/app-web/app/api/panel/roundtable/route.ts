import { NextRequest, NextResponse } from 'next/server'
import { PanelOrchestrator, type PanelAgent, type PanelResponse } from '@/lib/ai/panel'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const RequestSchema = z.object({
  threadId: z.string(),
  workspaceId: z.string(),
  userMessage: z.string(),
  agentIds: z.array(z.string()).min(1),
  initialResponses: z.array(
    z.object({
      agentId: z.string(),
      content: z.string(),
    })
  ),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { threadId, workspaceId, userMessage, agentIds, initialResponses } =
      RequestSchema.parse(body)

    // Fetch agents from database
    const agents = await prisma.agent.findMany({
      where: {
        id: { in: agentIds },
        workspaceId,
        isActive: true,
      },
    })

    if (agents.length === 0) {
      return NextResponse.json({ error: 'No valid agents found' }, { status: 400 })
    }

    // Transform to panel agents
    type AgentRow = (typeof agents)[number]
    const panelAgents: PanelAgent[] = agents.map((agent: AgentRow) => ({
      id: agent.id,
      name: agent.name,
      provider: agent.provider as 'openai' | 'anthropic',
      modelName: agent.modelName,
      systemPrompt: agent.systemPrompt,
    }))

    // Get roundtable responses
    const responses = await PanelOrchestrator.roundtable(
      {
        userMessage,
        agents: panelAgents,
      },
      initialResponses as PanelResponse[]
    )

    // Save roundtable responses to database
    await Promise.all(
      responses.map((response) =>
        prisma.chatMessage.create({
          data: {
            threadId,
            role: 'assistant',
            agentId: response.agentId,
            provider: agents.find((a: AgentRow) => a.id === response.agentId)?.provider,
            content: response.content || (response.error ? `Error: ${response.error}` : ''),
            metadata: {
              roundtable: true,
              error: response.error,
            },
          },
        })
      )
    )

    return NextResponse.json({
      responses,
    })
  } catch (error) {
    console.error('Roundtable error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
