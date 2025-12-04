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

    const { onboardingData } = await req.json()

    if (!onboardingData) {
      return NextResponse.json(
        { error: 'Onboarding data is required' },
        { status: 400 }
      )
    }

    const { name, workingOn, frustration, uploadedFile, firstQuestion, firstAnswer, panelDebate } = onboardingData

    // Build context from the entire onboarding journey
    const journeyContext = `
User Profile:
- Name: ${name || 'Not provided'}
- Currently working on: ${workingOn || 'Not specified'}
- Main frustration: ${frustration || 'Not specified'}

${uploadedFile ? `
Uploaded Document:
- File: ${uploadedFile.name}
- Summary: ${uploadedFile.summary}
` : ''}

${firstQuestion && firstAnswer ? `
First Question Asked:
Q: ${firstQuestion}
A: ${firstAnswer}
` : ''}

${panelDebate ? `
Panel Discussion Topic & Insights:
- GPT-4's view: ${panelDebate.gptResponse}
- Claude's view: ${panelDebate.claudeResponse}
- Synthesis: ${panelDebate.synthesis}
` : ''}
`

    // Generate personalized master summary
    const gptProvider = ProviderRegistry.getProvider('openai', {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo',
    })

    const summaryResponse = await gptProvider.generate({
      messages: [
        {
          role: 'system',
          content: `You are Oscar, creating a personalized "Master Summary" for a new user who just completed onboarding. This summary should make them feel understood and excited about what Oscar can do for them.

Your summary should:
1. Show that you "get" them and their situation
2. Connect their frustrations to how Oscar can help
3. Be warm, personal, and encouraging
4. Highlight 2-3 specific ways Oscar can help based on what you've learned
5. End with an encouraging note about their journey ahead

IMPORTANT:
- Keep the tone conversational and genuine - not salesy or over-the-top
- About 150-200 words
- Do NOT add any sign-off like "Cheers" or signatures at the end
- Do NOT use placeholders like [Your Name]
- End with a forward-looking statement, then stop`
        },
        {
          role: 'user',
          content: `Create a personalized Master Summary based on everything we learned during onboarding:

${journeyContext}

Write a summary that shows you understand this person and are excited to help them. Remember: no sign-offs or signatures.`
        }
      ],
      temperature: 0.8,
    })

    // Append Oscar's signature and Kable's personal note
    const personalNote = `

---

*— Oscar*

---

**A note from Kable, Oscar's creator:**

I built Oscar because I believe everyone deserves an AI that truly knows them—not just another chatbot that forgets you exist the moment the conversation ends. Your ideas, your context, your journey... they matter.

Welcome to something different.

*— Kable*`

    const fullSummary = summaryResponse + personalNote

    // Generate specific action suggestions
    const suggestionsResponse = await gptProvider.generate({
      messages: [
        {
          role: 'system',
          content: `Based on the user's profile and onboarding journey, suggest 3 specific things they could do next with Oscar. Be specific and actionable, not generic. Each suggestion should be one sentence.

Return as JSON: { "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"] }`
        },
        {
          role: 'user',
          content: `User context:
${journeyContext}

What are 3 specific things this user could do next with Oscar?`
        }
      ],
      temperature: 0.7,
      // response_format: { type: "json_object" }  // Commented out as not all models support this
    })

    let suggestions: string[] = []
    try {
      // Try to parse as JSON, handling potential markdown code blocks
      let jsonContent = suggestionsResponse
      if (jsonContent.includes('```')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      }
      const parsed = JSON.parse(jsonContent)
      suggestions = parsed.suggestions || []
    } catch {
      suggestions = [
        `Ask Oscar about your ${workingOn || 'project'} and get personalized insights`,
        'Upload more documents to build your knowledge base',
        'Try a panel debate on a decision you\'re wrestling with'
      ]
    }

    return NextResponse.json({
      success: true,
      summary: fullSummary,
      suggestions,
    })

  } catch (error) {
    console.error('Master summary error:', error)

    // Return fallback if API fails
    const { onboardingData } = await req.json().catch(() => ({ onboardingData: {} }))
    const name = onboardingData?.name || 'there'

    return NextResponse.json({
      success: true,
      summary: `Hey ${name}! I'm excited to be your AI partner. From what you've shared, I can see you're someone who values getting things done and wants AI that actually helps, not just impresses. That's exactly what I'm here for.

Whether it's brainstorming ideas, diving deep into your documents, or getting multiple perspectives on tough decisions - I've got your back. The more you use Oscar, the more personalized and helpful I become.

Let's build something great together.`,
      suggestions: [
        'Start a conversation about what you\'re working on',
        'Upload more documents to expand your knowledge base',
        'Ask Oscar to help you think through a current challenge'
      ],
      isFallback: true
    })
  }
}
