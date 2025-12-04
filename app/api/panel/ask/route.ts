import { NextRequest, NextResponse } from 'next/server'
import { PanelOrchestrator, type PanelAgent } from '@/lib/ai/panel'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const RequestSchema = z.object({
  threadId: z.string().optional(),
  workspaceId: z.string(),
  userMessage: z.string().min(1),
  agentIds: z.array(z.string()).min(1),
  useRag: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { threadId, workspaceId, userMessage, agentIds, useRag } = RequestSchema.parse(body)

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
    const panelAgents: PanelAgent[] = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      provider: agent.provider as 'openai' | 'anthropic',
      modelName: agent.modelName,
      systemPrompt: agent.systemPrompt,
    }))

    // TODO: If useRag is true, fetch RAG context
    let context: string | undefined
    if (useRag) {
      // Placeholder for RAG integration
      // context = await getRagContext({ workspaceId, query: userMessage, topK: 5 })
      context = undefined
    }

    // Get responses from panel
    const responses = await PanelOrchestrator.askPanel({
      userMessage,
      agents: panelAgents,
      context,
    })

    // Save to database
    let thread
    if (threadId) {
      // Update existing thread
      thread = await prisma.chatThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      })
    } else {
      // Create new thread
      thread = await prisma.chatThread.create({
        data: {
          workspaceId,
          title: userMessage.slice(0, 100),
          mode: 'panel',
        },
      })
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'user',
        content: userMessage,
      },
    })

    // Save agent responses
    await Promise.all(
      responses.map((response) =>
        prisma.chatMessage.create({
          data: {
            threadId: thread.id,
            role: 'assistant',
            agentId: response.agentId,
            provider: agents.find((a) => a.id === response.agentId)?.provider,
            content: response.content || (response.error ? `Error: ${response.error}` : ''),
            metadata: response.error ? { error: response.error } : {},
          },
        })
      )
    )

    return NextResponse.json({
      threadId: thread.id,
      responses,
    })
  } catch (error) {
    console.error('Panel ask error:', error)

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
