import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import OpenAI from 'openai'

// Get time-based greeting (fallback)
function getTimeGreeting(): { greeting: string; emoji: string } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return { greeting: 'Good morning', emoji: '☀️' }
  if (hour >= 12 && hour < 17) return { greeting: 'Good afternoon', emoji: '🌤️' }
  if (hour >= 17 && hour < 21) return { greeting: 'Good evening', emoji: '🌅' }
  return { greeting: 'Burning the midnight oil', emoji: '🌙' }
}

// Generate AI-powered contextual greeting
async function generateAIGreeting(context: {
  firstName: string
  timeOfDay: string
  recentTopics: string[]
  currentProjects: string[]
  goals: string[]
  lastConversation?: { topic: string; timestamp: Date }
  daysSinceLastVisit: number
  streak: number
  isNewUser: boolean
}): Promise<string[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const systemPrompt = `You are OSQR, a warm AI thinking partner. Generate a brief, personalized greeting for the user.

Your greeting should:
- Be conversational and warm, like a friend
- Reference something specific to THEIR context if available
- Be 1-2 short sentences max
- Feel natural, not scripted or robotic
- NEVER be generic like "How can I help you today?"

OSQR's voice:
- Conversational, not formal
- Brief, not verbose
- Warm, not clinical
- Uses contractions (you're, let's, don't)
- Sometimes starts with "Hey" or just dives in

Examples of good greetings:
- "Hey. Still wrestling with that API integration?"
- "Back for more. Want to pick up where we left off on the pricing strategy?"
- "Morning. That deadline for the investor deck is tomorrow - want to run through it?"
- "You've been on a roll this week. What's next?"
- "Haven't seen you in a few days. Everything okay?"`

  const userPrompt = `Generate a personalized greeting for ${context.firstName}.

Context:
- Time: ${context.timeOfDay}
- Recent conversation topics: ${context.recentTopics.length > 0 ? context.recentTopics.join(', ') : 'None yet'}
- Current projects: ${context.currentProjects.length > 0 ? context.currentProjects.join(', ') : 'None specified'}
- Their goals: ${context.goals.length > 0 ? context.goals.join(', ') : 'Not specified'}
- Last conversation: ${context.lastConversation ? `"${context.lastConversation.topic}" (${Math.floor((Date.now() - context.lastConversation.timestamp.getTime()) / (1000 * 60 * 60))} hours ago)` : 'None'}
- Days since last visit: ${context.daysSinceLastVisit}
- Current streak: ${context.streak} days
- New user: ${context.isNewUser ? 'Yes' : 'No'}

Return ONLY the greeting text, nothing else. 1-2 sentences max.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 100,
      temperature: 0.8,
    })

    const greeting = response.choices[0]?.message?.content?.trim()
    if (greeting) {
      return [greeting]
    }
  } catch (error) {
    console.error('AI greeting generation failed:', error)
  }

  // Fallback to empty - will use static greeting
  return []
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        createdAt: true,
      },
    })

    // Get workspace info
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        name: true,
        tier: true,
        capabilityLevel: true,
        onboardingCompleted: true,
      },
    })

    // Get vault stats (document count, recent docs)
    const documentCount = await prisma.document.count({
      where: { workspaceId },
    })

    const recentDocuments = await prisma.document.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        title: true,
        createdAt: true,
      },
    })

    // Get TIL (Today I Learned) insights - recent insights surfaced
    let recentInsights: { title: string; category: string; surfacedAt: Date | null }[] = []
    try {
      recentInsights = await prisma.insight.findMany({
        where: {
          workspaceId,
          status: 'surfaced'
        },
        orderBy: { surfacedAt: 'desc' },
        take: 3,
        select: {
          title: true,
          category: true,
          surfacedAt: true,
        },
      })
    } catch {
      // Insight table query failed - that's fine
      recentInsights = []
    }

    // Get profile answers for context
    const profileAnswers = await prisma.profileAnswer.findMany({
      where: { workspaceId },
      select: {
        questionId: true,
        answer: true,
      },
    })

    // Extract key profile info
    const profileContext = {
      workingOn: profileAnswers.find(a => a.questionId === 'v1-working-on')?.answer,
      goal: profileAnswers.find(a => a.questionId === 'v1-goal')?.answer,
      challenge: profileAnswers.find(a => a.questionId === 'v1-constraint')?.answer,
    }

    // Get recent MSC items (pinned items, goals, etc.)
    const pinnedItems = await prisma.mSCItem.findMany({
      where: {
        workspaceId,
        isPinned: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: {
        content: true,
        category: true,
      },
    })

    // Get usage stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayUsage = await prisma.usageRecord.count({
      where: {
        userId: session.user.id,
        date: { gte: today },
      },
    })

    const totalUsage = await prisma.usageRecord.count({
      where: { userId: session.user.id },
    })

    // Calculate streak
    let currentStreak = 0
    const checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate)
      dayStart.setDate(dayStart.getDate() - i)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const hadActivity = await prisma.usageRecord.count({
        where: {
          userId: session.user.id,
          date: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })

      if (hadActivity > 0) {
        currentStreak++
      } else if (i > 0) {
        break
      }
    }

    // Get time-based greeting
    const timeGreeting = getTimeGreeting()

    // Build personalized message
    const firstName = user?.name?.split(' ')[0] || 'there'

    // Get recent chat history for context
    let recentConversations: { title: string; updatedAt: Date }[] = []
    let lastUserMessage: { content: string; createdAt: Date } | null = null
    try {
      // Get recent chat threads
      recentConversations = await prisma.chatThread.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          title: true,
          updatedAt: true,
        },
      })

      // Get the most recent user message to understand what they were working on
      const recentThread = await prisma.chatThread.findFirst({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        select: {
          messages: {
            where: { role: 'user' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              content: true,
              createdAt: true,
            },
          },
        },
      })
      if (recentThread?.messages?.[0]) {
        lastUserMessage = recentThread.messages[0]
      }
    } catch {
      // Chat history query failed - that's fine
    }

    // Calculate days since last visit
    let daysSinceLastVisit = 0
    if (recentConversations.length > 0) {
      const lastActivity = recentConversations[0].updatedAt
      daysSinceLastVisit = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Determine if this is a new user
    const isNewUser = !workspace?.onboardingCompleted || totalUsage < 5

    // Generate AI-powered greeting for returning users with context
    let contextualMessages: string[] = []

    if (!isNewUser && (recentConversations.length > 0 || profileContext.workingOn || profileContext.goal)) {
      // Build context for AI greeting
      const recentTopics = recentConversations
        .map(c => c.title)
        .filter(t => t && t !== 'New conversation')
        .slice(0, 3)

      const currentProjects = [
        profileContext.workingOn,
        ...pinnedItems.filter(p => p.category === 'project').map(p => p.content),
      ].filter(Boolean) as string[]

      const goals = [
        profileContext.goal,
        ...pinnedItems.filter(p => p.category === 'goal').map(p => p.content),
      ].filter(Boolean) as string[]

      // Try AI greeting
      const aiGreeting = await generateAIGreeting({
        firstName,
        timeOfDay: timeGreeting.greeting.toLowerCase(),
        recentTopics,
        currentProjects,
        goals,
        lastConversation: lastUserMessage ? {
          topic: lastUserMessage.content.slice(0, 100),
          timestamp: lastUserMessage.createdAt,
        } : undefined,
        daysSinceLastVisit,
        streak: currentStreak,
        isNewUser,
      })

      if (aiGreeting.length > 0) {
        contextualMessages = aiGreeting
      }
    }

    // Fallback to static greeting if AI failed or for new users
    if (contextualMessages.length === 0) {
      if (isNewUser) {
        contextualMessages = [
          "Welcome! I'm your personal AI thinking partner.",
          "Ask me anything - I'll help you sharpen your question first, then get the best answer.",
        ]
      } else {
        // Static fallback
        if (timeGreeting.emoji === '🌙') {
          contextualMessages.push("Late night thinking session? I'm here for it.")
        }
        if (currentStreak >= 7) {
          contextualMessages.push(`${currentStreak} day streak - you're building something good here.`)
        } else if (currentStreak >= 3) {
          contextualMessages.push(`${currentStreak} days in a row. Momentum is building.`)
        }
        if (profileContext.workingOn) {
          contextualMessages.push(`Still working on "${profileContext.workingOn}"? Let's make progress.`)
        }
        if (contextualMessages.length === 0) {
          contextualMessages.push("What's on your mind?")
        }
      }
    }

    // Pick 2-3 messages that feel most relevant
    const selectedMessages = contextualMessages.slice(0, 3)

    return NextResponse.json({
      timeGreeting,
      firstName,
      contextualMessages: selectedMessages,
      stats: {
        vaultDocuments: documentCount,
        recentDocuments,
        currentStreak,
        todayQuestions: todayUsage,
        totalQuestions: totalUsage,
        capabilityLevel: workspace?.capabilityLevel || 1,
      },
      profile: profileContext,
      pinnedItems,
      recentInsights,
      isNewUser: !workspace?.onboardingCompleted || totalUsage < 5,
    })
  } catch (error) {
    console.error('Failed to fetch greeting data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
