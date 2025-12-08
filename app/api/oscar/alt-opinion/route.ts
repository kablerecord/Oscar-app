import { NextRequest, NextResponse } from 'next/server'
import { ProviderRegistry } from '@/lib/ai/providers'
import { z } from 'zod'
import { checkRateLimit, recordRequest } from '@/lib/security'
import { getServerSession } from 'next-auth'

const RequestSchema = z.object({
  message: z.string().min(1),
  workspaceId: z.string(),
  originalProvider: z.enum(['openai', 'anthropic']).optional(),
  context: z.string().optional(),
})

// Available alternate models to query
const ALTERNATE_MODELS = [
  { provider: 'anthropic' as const, model: 'claude-3-5-sonnet-20241022', name: 'Claude' },
  { provider: 'openai' as const, model: 'gpt-4-turbo', name: 'GPT-4' },
  { provider: 'openai' as const, model: 'gpt-4o', name: 'GPT-4o' },
]

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
      userId = 'dev-user'
    } else if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      )
    } else {
      userId = (session.user as { id?: string }).id || session.user.email
    }

    const ip = getClientIP(req)

    // 2. Check rate limits (use a separate endpoint limit)
    const rateLimitResult = await checkRateLimit({
      userId,
      ip,
      endpoint: 'oscar/alt-opinion',
      tier: 'free',
    })

    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait a moment.',
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      )
    }

    await recordRequest({ userId, ip, endpoint: 'oscar/alt-opinion' })

    const body = await req.json()
    const { message, originalProvider, context } = RequestSchema.parse(body)

    // Pick an alternate model (different from the original if specified)
    const availableModels = originalProvider
      ? ALTERNATE_MODELS.filter((m) => m.provider !== originalProvider)
      : ALTERNATE_MODELS

    // Randomly select from available models for variety
    const selectedModel = availableModels[Math.floor(Math.random() * availableModels.length)]

    // Build system prompt for alternate opinion
    const systemPrompt = `You are ${selectedModel.name}, providing a fresh perspective on a question.
Be concise but insightful. If you have a different view than typical responses, share it.
Focus on practical, actionable advice where applicable.
${context ? `\nRelevant context:\n${context}` : ''}`

    // Get the provider and generate response
    const provider = ProviderRegistry.getProvider(selectedModel.provider, {
      model: selectedModel.model,
    })

    const response = await provider.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      maxTokens: 1000,
      temperature: 0.7,
    })

    return NextResponse.json({
      answer: response.content,
      model: selectedModel.name,
      provider: selectedModel.provider,
    })
  } catch (error) {
    console.error('Alt opinion error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get alternate opinion', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
