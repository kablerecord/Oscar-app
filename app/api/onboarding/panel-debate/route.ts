import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ProviderRegistry } from '@/lib/ai/providers'

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

    const { question, context, userName } = await req.json()

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    // Create debate context
    const debateContext = context ? `
The user (${userName || 'the user'}) has shared some information about themselves:
- What they're working on: ${context.workingOn || 'Not specified'}
- Their main frustration: ${context.frustration || 'Not specified'}

This debate should be personalized to their situation when relevant.
` : ''

    // Get GPT-4's perspective
    const gptProvider = ProviderRegistry.getProvider('openai', {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo',
    })

    const gptResponse = await gptProvider.generate({
      messages: [
        {
          role: 'system',
          content: `You are GPT-4, participating in a friendly intellectual debate with Claude. Be direct, practical, and action-oriented. Share your perspective confidently but respectfully. Keep your response focused and under 150 words.

${debateContext}`
        },
        {
          role: 'user',
          content: `The user asked: "${question}"

Give your perspective on this. Be helpful, practical, and speak directly to the user. Don't be overly formal.`
        }
      ],
      temperature: 0.7,
    })

    // Get Claude's perspective
    const claudeProvider = ProviderRegistry.getProvider('anthropic', {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-sonnet-4-20250514',
    })

    const claudeResponse = await claudeProvider.generate({
      messages: [
        {
          role: 'system',
          content: `You are Claude, participating in a friendly intellectual debate with GPT-4. Be thoughtful, nuanced, and consider multiple angles. Share your perspective while acknowledging complexity. Keep your response focused and under 150 words.

${debateContext}

GPT-4 just shared this perspective: "${gptResponse}"`
        },
        {
          role: 'user',
          content: `The user asked: "${question}"

Share your perspective. You can agree, disagree, or add nuance to GPT-4's response. Speak directly to the user.`
        }
      ],
      temperature: 0.7,
    })

    // Generate synthesis
    const synthesisResponse = await gptProvider.generate({
      messages: [
        {
          role: 'system',
          content: `You are Oscar, synthesizing insights from a panel debate between GPT-4 and Claude. Create a brief, helpful synthesis that captures the best insights from both perspectives. Be conversational and actionable. Keep it under 100 words.`
        },
        {
          role: 'user',
          content: `The user asked: "${question}"

GPT-4's perspective:
${gptResponse}

Claude's perspective:
${claudeResponse}

Now synthesize these perspectives into a clear, helpful answer for the user. What are the key takeaways they should know?`
        }
      ],
      temperature: 0.7,
    })

    return NextResponse.json({
      success: true,
      gptResponse,
      claudeResponse,
      synthesis: synthesisResponse,
    })

  } catch (error) {
    console.error('Panel debate error:', error)

    // Return fallback responses if APIs fail
    return NextResponse.json({
      success: true,
      gptResponse: "Great question! I'd suggest starting with clear goals and breaking things down into actionable steps. Focus on what you can control and build momentum with small wins.",
      claudeResponse: "I'd add that it's worth considering the broader context and potential obstacles. Sometimes the best approach isn't the most obvious one - look for creative solutions that align with your values.",
      synthesis: "Both perspectives highlight the importance of clarity and intentionality. Start with clear goals, but stay flexible and open to creative approaches as you learn more.",
      isFallback: true
    })
  }
}
