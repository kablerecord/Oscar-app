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

    const { question, context, userName, documentId, workspaceId: _workspaceId } = await req.json()

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    // Get document content if we have a documentId
    let documentContext = ''
    if (documentId) {
      try {
        const document = await prisma.document.findUnique({
          where: { id: documentId },
          select: {
            title: true,
            textContent: true,
            originalFilename: true
          }
        })
        if (document?.textContent) {
          const docName = document.originalFilename || document.title
          // Truncate to avoid token limits (use less than first-question since we have 3 AI calls)
          const truncatedContent = document.textContent.slice(0, 8000)
          documentContext = `
IMPORTANT - The user uploaded this document: "${docName}"
Here is the content they want you to discuss:
---
${truncatedContent}
---
When answering, reference SPECIFIC things from this document. Don't be generic.
`
          console.log(`[Panel Debate] Using document content from ${docName} (${truncatedContent.length} chars)`)
        }
      } catch (e) {
        console.log('Error fetching document for panel debate:', e)
      }
    }

    // Create debate context
    const debateContext = `${context ? `
The user (${userName || 'the user'}) has shared some information about themselves:
- What they're working on: ${context.workingOn || 'Not specified'}
- Their main frustration: ${context.frustration || 'Not specified'}
` : ''}
${documentContext}`

    // Get GPT-4's perspective
    const gptProvider = ProviderRegistry.getProvider('openai', {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo',
    })

    const gptResponse = await gptProvider.generate({
      messages: [
        {
          role: 'system',
          content: `You're GPT-4. Give ONE sharp insight in 2-3 sentences MAX.

RULES:
- NO bullet points or numbered lists
- NO "The key takeaways are..."
- NO long explanations
- Sound like a smart friend at a coffee shop, not a consultant

Pick THE most interesting thing and say it conversationally. That's it.

${debateContext}`
        },
        {
          role: 'user',
          content: `Question: "${question}"

Give ONE punchy insight. 2-3 sentences. No lists. No formality. Just the good stuff.`
        }
      ],
      temperature: 0.85,
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
          content: `You're Claude. GPT-4 just said: "${gptResponse}"

Now add ONE different angle they missed. 2-3 sentences MAX.

RULES:
- NO bullet points or numbered lists
- NO "Additionally..." or "Furthermore..."
- NO repeating what GPT said
- Sound like you're adding to a conversation, not writing a report

What's the one thing GPT missed that would actually be useful?

${debateContext}`
        },
        {
          role: 'user',
          content: `Question: "${question}"

Add ONE thing GPT missed. Keep it short and conversational.`
        }
      ],
      temperature: 0.85,
    })

    // Generate synthesis
    const synthesisResponse = await gptProvider.generate({
      messages: [
        {
          role: 'system',
          content: `You're OSQR. Combine GPT and Claude's points into ONE punchy takeaway.

1-2 sentences MAXIMUM. Like a text message from a smart friend.

BANNED:
- "To effectively..."
- "Insight:" or "Action:"
- Anything longer than 2 sentences
- Bullet points
- Formal language

Just tell them the one thing that matters most. Make it hit.`
        },
        {
          role: 'user',
          content: `GPT said: ${gptResponse}

Claude added: ${claudeResponse}

Now give the bottom line in 1-2 sentences. Like you're texting a friend the key point.`
        }
      ],
      temperature: 0.85,
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
