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

    const { question, workspaceId, documentId, context } = await req.json()

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    // Get document context - prioritize direct document fetch if we have documentId
    let knowledgeContext = ''

    // If we have a specific documentId (from onboarding), fetch that document directly
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
          // Truncate to avoid token limits
          const truncatedContent = document.textContent.slice(0, 12000)
          knowledgeContext = `[Document: ${docName}]\n${truncatedContent}`
          console.log(`[First Question] Using direct document content from ${docName} (${truncatedContent.length} chars)`)
        }
      } catch (e) {
        console.log('Error fetching document by ID:', e)
      }
    }

    // Fallback to semantic search if no direct document content
    if (!knowledgeContext && workspaceId) {
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
          content: `You're OSQR. Give ONE surprising insight about their document in 3-4 sentences MAX.

RULES:
- NO bullet points or numbered lists
- NO "The key takeaways are..."
- NO "Based on the document..."
- Sound like a smart friend who just read their stuff and noticed something interesting

Start with something like "Oh interesting..." or "The thing that jumped out to me..." or just dive right into the insight.

Make them think "wow, that's a good point" — not "thanks for the summary."

${personalContext}

${knowledgeContext ? `THEIR DOCUMENT:\n${knowledgeContext}\n\nPick ONE interesting angle. Be conversational. 3-4 sentences max.` : 'No doc uploaded — give them something sharp based on what they shared about themselves.'}`
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.85,
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
