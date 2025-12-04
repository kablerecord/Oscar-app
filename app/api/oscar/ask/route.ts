import { NextRequest, NextResponse } from 'next/server'
import { Oscar, type OscarRequest } from '@/lib/ai/oscar'
import { type PanelAgent } from '@/lib/ai/panel'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { checkRateLimit, recordRequest } from '@/lib/security'
import { getServerSession } from 'next-auth'
import { parseArtifacts } from '@/lib/artifacts'

const RequestSchema = z.object({
  message: z.string().min(1),
  workspaceId: z.string(),
  useKnowledge: z.boolean().default(true),
  includeDebate: z.boolean().default(false), // Debug mode to see panel discussion
  mode: z.enum(['quick', 'thoughtful', 'contemplate']).default('thoughtful'), // Response complexity mode
})

// Helper to get client IP
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = req.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

export async function POST(req: NextRequest) {
  try {
    // 1. Check authentication (bypass in development)
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    let userId: string
    if (isDev && !session?.user?.email) {
      // Dev bypass - use a test user ID
      userId = 'dev-user'
      console.log('[DEV] Auth bypassed - using dev-user')
    } else if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      )
    } else {
      userId = (session.user as { id?: string }).id || session.user.email
    }

    const ip = getClientIP(req)

    // 2. Check rate limits
    const rateLimitResult = await checkRateLimit({
      userId,
      ip,
      endpoint: 'oscar/ask',
      tier: 'free', // TODO: Get user's actual tier from database
    })

    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: rateLimitResult.reason === 'daily_limit'
            ? "You've reached your daily limit. Try again tomorrow or upgrade for more."
            : 'Too many requests. Please wait a moment.',
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          },
        }
      )
    }

    // 3. Record this request for tracking
    await recordRequest({ userId, ip, endpoint: 'oscar/ask' })

    const body = await req.json()
    const { message, workspaceId, useKnowledge, includeDebate, mode } = RequestSchema.parse(body)

    // Fetch active agents from database
    const agents = await prisma.agent.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    if (agents.length === 0) {
      return NextResponse.json(
        { error: 'No active agents found. Please configure agents first.' },
        { status: 400 }
      )
    }

    // Transform to panel agents
    const panelAgents: PanelAgent[] = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      provider: agent.provider as 'openai' | 'anthropic',
      modelName: agent.modelName,
      systemPrompt: agent.systemPrompt,
    }))

    // Get RAG context if requested
    let context: string | undefined
    if (useKnowledge) {
      const { searchKnowledge } = await import('@/lib/knowledge/search')
      context = await searchKnowledge({
        workspaceId,
        query: message,
        topK: 5,
      })
    }

    // Get user profile context
    const { getProfileContext } = await import('@/lib/profile/context')
    const profileContext = await getProfileContext(workspaceId)

    // Combine profile with knowledge base context
    if (profileContext) {
      context = context
        ? `${context}\n\n--- User Profile ---\n${profileContext}`
        : `--- User Profile ---\n${profileContext}`
    }

    // Ask Oscar
    const oscarRequest: OscarRequest = {
      userMessage: message,
      panelAgents,
      context,
      includeDebate,
      mode,
    }

    const response = await Oscar.ask(oscarRequest)

    // Parse artifacts from Oscar's response
    const parsedResponse = parseArtifacts(response.answer)
    const { text: cleanAnswer, artifacts } = parsedResponse

    // Save conversation to database
    const thread = await prisma.chatThread.create({
      data: {
        workspaceId,
        title: message.slice(0, 100),
        mode: 'panel',
      },
    })

    // Save user message
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'user',
        content: message,
      },
    })

    // Save Oscar's response
    const oscarMessage = await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'assistant',
        provider: 'mixed', // Oscar synthesizes from multiple providers
        content: cleanAnswer,
        metadata: {
          panelSize: panelAgents.length,
          hadDebate: !!response.panelDiscussion,
          usedKnowledge: useKnowledge && !!context,
          hasArtifacts: artifacts.length > 0,
        },
      },
    })

    // Save artifacts to database if any were generated
    if (artifacts.length > 0) {
      await Promise.all(
        artifacts.map((artifact, index) =>
          prisma.artifact.create({
            data: {
              workspaceId,
              messageId: oscarMessage.id,
              threadId: thread.id,
              type: artifact.type,
              title: artifact.title,
              content: artifact.content,
              language: artifact.language,
              description: artifact.description,
              version: 1,
            },
          })
        )
      )
    }

    // Optionally save panel discussion for transparency/debugging
    if (includeDebate && response.panelDiscussion) {
      await Promise.all(
        response.panelDiscussion.map((panelResponse) =>
          prisma.chatMessage.create({
            data: {
              threadId: thread.id,
              role: 'assistant',
              agentId: panelResponse.agentId,
              provider: agents.find((a) => a.id === panelResponse.agentId)?.provider,
              content: panelResponse.content || `Error: ${panelResponse.error}`,
              metadata: {
                isPanelMember: true,
                phase: 'initial',
              },
            },
          })
        )
      )

      if (response.roundtableDiscussion) {
        await Promise.all(
          response.roundtableDiscussion.map((panelResponse) =>
            prisma.chatMessage.create({
              data: {
                threadId: thread.id,
                role: 'assistant',
                agentId: panelResponse.agentId,
                provider: agents.find((a) => a.id === panelResponse.agentId)?.provider,
                content: panelResponse.content || `Error: ${panelResponse.error}`,
                metadata: {
                  isPanelMember: true,
                  phase: 'roundtable',
                },
              },
            })
          )
        )
      }
    }

    return NextResponse.json(
      {
        answer: cleanAnswer,
        artifacts: artifacts.length > 0 ? artifacts : undefined,
        threadId: thread.id,
        panelDiscussion: response.panelDiscussion,
        roundtableDiscussion: response.roundtableDiscussion,
      },
      {
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
        },
      }
    )
  } catch (error) {
    console.error('Oscar ask error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
