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
  preferredModel: z.enum(['random', 'claude', 'gpt4', 'gpt4o']).optional(),
  originalAnswer: z.string().optional(), // For comparison synthesis
})

// Available alternate models to query
const ALTERNATE_MODELS = [
  { id: 'claude', provider: 'anthropic' as const, model: 'claude-3-5-sonnet-20241022', name: 'Claude' },
  { id: 'gpt4', provider: 'openai' as const, model: 'gpt-4-turbo', name: 'GPT-4' },
  { id: 'gpt4o', provider: 'openai' as const, model: 'gpt-4o', name: 'GPT-4o' },
]

// Model ID to model config mapping
const MODEL_MAP: Record<string, typeof ALTERNATE_MODELS[number]> = {
  claude: ALTERNATE_MODELS[0],
  gpt4: ALTERNATE_MODELS[1],
  gpt4o: ALTERNATE_MODELS[2],
}

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
      tier: 'pro', // TODO: Get user's actual tier from database
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
    const { message, originalProvider, context, preferredModel, originalAnswer } = RequestSchema.parse(body)

    // Pick the model based on preference or randomly
    let selectedModel: typeof ALTERNATE_MODELS[number]

    if (preferredModel && preferredModel !== 'random' && MODEL_MAP[preferredModel]) {
      selectedModel = MODEL_MAP[preferredModel]
    } else {
      // Pick an alternate model (different from the original if specified)
      const availableModels = originalProvider
        ? ALTERNATE_MODELS.filter((m) => m.provider !== originalProvider)
        : ALTERNATE_MODELS

      // Randomly select from available models for variety
      selectedModel = availableModels[Math.floor(Math.random() * availableModels.length)]
    }

    // Build system prompt for alternate opinion
    const systemPrompt = `You are ${selectedModel.name}, providing a fresh perspective on a question.
Be concise but insightful. If you have a different view than typical responses, share it.
Focus on practical, actionable advice where applicable.
${context ? `\nRelevant context:\n${context}` : ''}`

    // Get the provider and generate response
    const apiKey = selectedModel.provider === 'openai'
      ? process.env.OPENAI_API_KEY || ''
      : process.env.ANTHROPIC_API_KEY || ''

    const provider = ProviderRegistry.getProvider(selectedModel.provider, {
      apiKey,
      model: selectedModel.model,
    })

    const response = await provider.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      maxTokens: 1000,
      temperature: 0.7,
    })

    // If original answer provided, generate comparison synthesis
    let comparison: { agreements: string[]; disagreements: string[] } | undefined

    if (originalAnswer) {
      const comparisonPrompt = `Compare these two AI responses to the same question and identify key agreements and disagreements.

Question: "${message}"

RESPONSE 1 (OSQR Panel):
${originalAnswer}

RESPONSE 2 (${selectedModel.name}):
${response}

Provide a JSON response with this exact format:
{
  "agreements": ["point 1", "point 2"],
  "disagreements": ["point 1", "point 2"]
}

Focus on substantive differences in advice, perspective, or conclusions. Be concise - max 3 points each.`

      try {
        const comparisonResponse = await provider.generate({
          messages: [
            { role: 'system', content: 'You are a comparison analyst. Return only valid JSON.' },
            { role: 'user', content: comparisonPrompt },
          ],
          maxTokens: 500,
          temperature: 0.3,
        })

        // Parse the JSON response
        const jsonMatch = comparisonResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          comparison = JSON.parse(jsonMatch[0])
        }
      } catch (compError) {
        console.error('Comparison synthesis error:', compError)
        // Continue without comparison - not critical
      }
    }

    return NextResponse.json({
      answer: response,
      model: selectedModel.name,
      provider: selectedModel.provider,
      comparison,
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
