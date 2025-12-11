import { NextRequest, NextResponse } from 'next/server'
import { ProviderRegistry } from '@/lib/ai/providers'
import { z } from 'zod'
import { checkRateLimit, recordRequest } from '@/lib/security'
import { getServerSession } from 'next-auth'
import { searchKnowledge } from '@/lib/knowledge/search'
import { getProfileContext } from '@/lib/profile/context'

const RequestSchema = z.object({
  question: z.string().min(1),
  workspaceId: z.string(),
})

// Helper to get client IP
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = req.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

const REFINE_SYSTEM_PROMPT = `You are the Refine engine for OSQR, an AI operating system for capability and reasoning.

Your ONLY job is to help the user sharpen their question BEFORE it goes to the AI panel.

## Why This Matters
The quality of AI responses depends entirely on the quality of the question. Most people ask vague, unfocused questions and get vague, unfocused answers. Your job is to fix that.

## What You Do
When a user submits a question, you:
1. Identify what's unclear, vague, or missing
2. Ask 2-3 SHORT clarifying questions that would dramatically improve the response
3. Suggest a refined version of their question

## Your Response Format
Always respond with this JSON structure:
{
  "analysis": "Brief 1-2 sentence assessment of the original question",
  "clarifyingQuestions": [
    "Short question 1?",
    "Short question 2?",
    "Short question 3?"
  ],
  "suggestedRefinement": "A better version of their question incorporating likely answers",
  "readyToFire": false
}

## Rules
- Keep clarifying questions SHORT (under 15 words each)
- Max 3 clarifying questions
- Focus on: constraints, goals, context, timeframe, resources
- If the question is already excellent, set readyToFire: true and explain why
- Be conversational, not formal
- Never ask obvious questions the user would have mentioned
- Think about what would make the AI panel give 10x better answers

## Examples

User: "How do I grow my business?"
{
  "analysis": "Too vague - could mean anything from revenue to team size to market expansion.",
  "clarifyingQuestions": [
    "What's your current revenue or stage?",
    "What does 'grow' mean to you - revenue, team, customers?",
    "What's your timeline - next quarter or next year?"
  ],
  "suggestedRefinement": "How can I increase revenue from $X to $Y in the next 6 months, given my constraints of [budget/team/market]?",
  "readyToFire": false
}

User: "I want to write a Python function that validates email addresses using regex, handles edge cases like subdomains, and returns a boolean"
{
  "analysis": "Clear, specific, and actionable. Ready to fire.",
  "clarifyingQuestions": [],
  "suggestedRefinement": "",
  "readyToFire": true
}

Remember: You're the thinking partner that makes users smarter BEFORE they even get their answer.`

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

    // 2. Check rate limits (refine is cheaper, so use higher limits)
    const rateLimitResult = await checkRateLimit({
      userId,
      ip,
      endpoint: 'oscar/refine',
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
          headers: { 'Retry-After': retryAfter.toString() },
        }
      )
    }

    await recordRequest({ userId, ip, endpoint: 'oscar/refine' })

    const body = await req.json()
    const { question, workspaceId } = RequestSchema.parse(body)

    // Get user context to make refinement smarter
    let userContext = ''

    // Get knowledge base context
    const kbContext = await searchKnowledge({
      workspaceId,
      query: question,
      topK: 3,
    })
    if (kbContext) {
      userContext += `\n\nUser's Knowledge Base (relevant context):\n${kbContext}`
    }

    // Get profile context
    const profileContext = await getProfileContext(workspaceId)
    if (profileContext) {
      userContext += `\n\nUser Profile:\n${profileContext}`
    }

    // Use GPT-4 for refinement (fast and good at structured output)
    const refineProvider = ProviderRegistry.getProvider('openai', {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo',
    })

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: REFINE_SYSTEM_PROMPT },
    ]

    if (userContext) {
      messages.push({
        role: 'system',
        content: `Context about this user (use to ask better clarifying questions):${userContext}`,
      })
    }

    messages.push({
      role: 'user',
      content: `User's question: "${question}"\n\nAnalyze this question and provide your refinement response as JSON.`,
    })

    const response = await refineProvider.generate({
      messages,
      temperature: 0.3, // Lower temp for more consistent structured output
    })

    // Parse the JSON response
    let refinement
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        refinement = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse refine response:', parseError)
      // Fallback response
      refinement = {
        analysis: 'Your question is clear enough to proceed.',
        clarifyingQuestions: [],
        suggestedRefinement: question,
        readyToFire: true,
      }
    }

    return NextResponse.json({
      originalQuestion: question,
      ...refinement,
    })
  } catch (error) {
    console.error('OSQR refine error:', error)

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
