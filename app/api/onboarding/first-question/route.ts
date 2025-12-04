import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ProviderRegistry } from '@/lib/ai/providers'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  try {
    // Check authentication (with dev bypass)
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { question, workspaceId, context } = await req.json()

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    // Get any knowledge base context if available
    let knowledgeContext = ''
    if (workspaceId) {
      try {
        const { searchKnowledge } = await import('@/lib/knowledge/search')
        knowledgeContext = await searchKnowledge({
          workspaceId,
          query: question,
          topK: 3,
        }) || ''
      } catch (e) {
        console.log('No knowledge base context available:', e)
      }
    }

    // Build personalized context
    const personalContext = context ? `
User context:
- Name: ${context.name || 'User'}
- Working on: ${context.workingOn || 'Not specified'}
- Current challenge: ${context.frustration || 'Not specified'}
` : ''

    // Use GPT-4 for a quick, personalized response
    const gptProvider = ProviderRegistry.getProvider('openai', {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo',
    })

    const answer = await gptProvider.generate({
      messages: [
        {
          role: 'system',
          content: `You are Oscar, a helpful AI assistant. Give a thoughtful, personalized response based on what you know about the user. Be conversational and helpful. Keep your response focused and under 200 words.

${personalContext}

${knowledgeContext ? `Relevant information from their knowledge base:\n${knowledgeContext}` : 'Note: The user hasn\'t uploaded any documents yet, so give a thoughtful general response based on their question and the context they provided.'}`
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.7,
    })

    return NextResponse.json({
      success: true,
      answer,
    })

  } catch (error) {
    console.error('First question error:', error)

    // Return a helpful fallback response
    return NextResponse.json({
      success: true,
      answer: "That's a great question! Based on what you've shared about what you're working on, I'd suggest breaking it down into smaller, actionable steps. The key is to focus on the highest-impact activities first. Once you upload more documents and context, my responses will become much more personalized to your specific situation.",
      isFallback: true
    })
  }
}
