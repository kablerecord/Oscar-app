/**
 * Quick Chat API - Lightweight chat endpoint for the OSQR bubble
 *
 * This endpoint provides fast, simple responses for casual bubble conversations.
 * It uses a smaller context window and simpler prompt for quick responses.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// OSQR's personality for bubble conversations
const OSQR_BUBBLE_SYSTEM = `You are OSQR (pronounced "Oscar"), a friendly AI thinking partner. You're having a quick, casual conversation in your bubble chat.

Personality:
- Warm, approachable, and genuinely curious
- Keep responses SHORT (1-3 sentences max for most messages)
- Be conversational, not formal
- Use occasional humor when appropriate
- If they ask something complex, suggest they "open the full chat" for a deeper conversation

Remember: This is the bubble chat - keep it light and quick. Save deep analysis for the main panel.`

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Quick response with smaller context
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256, // Keep responses short
      system: OSQR_BUBBLE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    })

    // Extract text response
    const textContent = response.content.find((c) => c.type === 'text')
    const responseText = textContent?.type === 'text' ? textContent.text : "I'm here! What's on your mind?"

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('[Quick Chat] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    )
  }
}
