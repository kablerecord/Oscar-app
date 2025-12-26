import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { validateVSCodeToken } from '@/lib/auth/vscode-auth'
import { prisma } from '@/lib/db/prisma'
import { checkRateLimit, recordRequest, type Source } from '@/lib/security/rate-limit'
import { getTierConfig, type TierName } from '@/lib/tiers/config'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * POST /api/chat/stream
 *
 * Streaming chat endpoint for VS Code extension and other clients.
 * Simpler than /api/oscar/ask-stream but with full VS Code support.
 *
 * Request body:
 *   - message: string (required)
 *   - threadId: string (optional, creates new thread if not provided)
 *   - workspaceContext: object (optional, VS Code sends this)
 *   - source: 'web' | 'vscode' | 'mobile' (required)
 *   - mode: 'quick' | 'thoughtful' | 'contemplate' (default: 'quick')
 *
 * SSE Events:
 *   - type: 'content' - Streaming text chunk
 *   - type: 'threadId' - Thread ID for the conversation
 *   - type: 'tokensUsed' - Token count after response complete
 *   - type: 'error' - Error occurred
 *   - data: '[DONE]' - Stream complete
 */
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendEvent = async (data: object | string) => {
    const payload = typeof data === 'string' ? data : JSON.stringify(data)
    await writer.write(encoder.encode(`data: ${payload}\n\n`))
  }

  const sendError = async (message: string, status: number) => {
    await sendEvent({ type: 'error', message, status })
    await sendEvent('[DONE]')
    await writer.close()
  }

  // Process in background
  ;(async () => {
    try {
      // 1. Authenticate - check VS Code token or NextAuth session
      const authHeader = req.headers.get('authorization')
      let userId: string
      let tier: TierName = 'pro'
      let workspaceId: string
      let source: Source = 'web'

      // Check for VS Code token first
      if (authHeader?.startsWith('Bearer osqr_vscode_')) {
        const vsCodeUser = await validateVSCodeToken(authHeader)
        if (!vsCodeUser) {
          await sendError('Invalid or expired token', 401)
          return
        }

        // Check VS Code access
        if (!vsCodeUser.vsCodeAccess) {
          await sendEvent({
            type: 'error',
            message: 'VS Code access requires Pro tier or higher',
            reason: 'no_vscode_access',
            status: 403,
          })
          await sendEvent('[DONE]')
          await writer.close()
          return
        }

        userId = vsCodeUser.id
        tier = vsCodeUser.tier
        workspaceId = vsCodeUser.workspaceId
        source = 'vscode'
      } else {
        // Fall back to NextAuth session
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
          await sendError('Unauthorized', 401)
          return
        }

        userId = session.user.id

        // Get workspace
        const workspace = await prisma.workspace.findFirst({
          where: { ownerId: userId },
          select: { id: true, tier: true },
          orderBy: { createdAt: 'asc' },
        })

        if (!workspace) {
          await sendError('No workspace found', 404)
          return
        }

        workspaceId = workspace.id
        tier = (workspace.tier || 'pro') as TierName
      }

      // 2. Parse request body
      const body = await req.json()
      const {
        message,
        threadId: existingThreadId,
        workspaceContext,
        mode = 'quick',
      } = body

      // Override source from request body if provided
      if (body.source && ['web', 'vscode', 'mobile'].includes(body.source)) {
        source = body.source
      }

      if (!message || typeof message !== 'string') {
        await sendError('Message is required', 400)
        return
      }

      // 3. Check rate limits (including token limit)
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
      const rateLimitResult = await checkRateLimit({
        userId,
        ip,
        endpoint: 'chat/stream',
        tier,
        source,
        checkTokens: true,
      })

      if (!rateLimitResult.allowed) {
        if (rateLimitResult.reason === 'no_vscode_access') {
          await sendEvent({
            type: 'error',
            message: 'VS Code access requires Pro tier or higher',
            reason: 'no_vscode_access',
            status: 403,
          })
        } else if (rateLimitResult.reason === 'token_limit') {
          await sendEvent({
            type: 'error',
            message: 'Monthly token limit exceeded',
            reason: 'token_limit',
            status: 403,
          })
        } else {
          await sendError('Rate limit exceeded', 429)
        }
        await sendEvent('[DONE]')
        await writer.close()
        return
      }

      // 4. Get or create thread
      let threadId = existingThreadId
      if (!threadId) {
        const thread = await prisma.chatThread.create({
          data: {
            workspaceId,
            title: message.slice(0, 100),
            mode: source === 'vscode' ? 'vscode' : 'panel',
          },
        })
        threadId = thread.id
      }

      // Send thread ID to client
      await sendEvent({ type: 'threadId', threadId })

      // 5. Save user message
      await prisma.chatMessage.create({
        data: {
          threadId,
          role: 'user',
          content: message,
          metadata: workspaceContext ? { workspaceContext } : undefined,
        },
      })

      // 6. Build context from workspace context
      let contextString = ''
      if (workspaceContext) {
        const parts: string[] = []

        if (workspaceContext.activeFile) {
          parts.push(`Current file: ${workspaceContext.activeFile.path} (${workspaceContext.activeFile.language})`)
          if (workspaceContext.activeFile.selection) {
            parts.push(`Selected code:\n\`\`\`\n${workspaceContext.activeFile.selection.text}\n\`\`\``)
          }
        }

        if (workspaceContext.git) {
          parts.push(`Git branch: ${workspaceContext.git.branch}`)
        }

        if (workspaceContext.project) {
          parts.push(`Project: ${workspaceContext.project.workspaceName}`)
        }

        if (parts.length > 0) {
          contextString = `## Workspace Context\n${parts.join('\n')}`
        }
      }

      // 7. Build system prompt
      const systemPrompt = `You are OSQR (pronounced "Oscar"), an AI thinking companion helping a developer in VS Code.

${contextString ? contextString + '\n\n' : ''}Guidelines:
- Be concise and helpful
- When code is selected, focus on explaining or improving it
- Reference specific files and line numbers when relevant
- For complex questions, break down your reasoning
- If asked to make changes, explain what you would do and why`

      // 8. Get conversation history
      const recentMessages = await prisma.chatMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { role: true, content: true },
      })

      type RecentMessage = (typeof recentMessages)[number]
      const conversationHistory = recentMessages
        .reverse()
        .slice(0, -1) // Exclude the message we just added
        .map((m: RecentMessage) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

      // 9. Stream response from Claude
      const _tierConfig = getTierConfig(tier) // Reserved for future token limit enforcement
      const maxTokens = mode === 'quick' ? 1024 : mode === 'thoughtful' ? 2048 : 4096

      let fullResponse = ''
      let tokensUsed = 0

      const response = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          { role: 'user', content: message },
        ],
      })

      for await (const event of response) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text
          fullResponse += text
          await sendEvent({ type: 'content', text })
        }

        if (event.type === 'message_delta' && event.usage) {
          tokensUsed = (event.usage as { output_tokens?: number }).output_tokens || 0
        }
      }

      // Get final token count
      const finalMessage = await response.finalMessage()
      tokensUsed = finalMessage.usage.input_tokens + finalMessage.usage.output_tokens

      // 10. Save assistant message
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          threadId,
          role: 'assistant',
          provider: 'anthropic',
          content: fullResponse,
          metadata: {
            model: 'claude-sonnet-4-20250514',
            tokensUsed,
            source,
          },
        },
      })

      // 11. Record token usage
      await recordRequest({
        userId,
        ip,
        endpoint: 'chat/stream',
        tokenCount: tokensUsed,
        source,
      })

      // 12. Send completion events
      await sendEvent({ type: 'tokensUsed', tokensUsed, messageId: assistantMessage.id })
      await sendEvent('[DONE]')
      await writer.close()

    } catch (error) {
      console.error('[Chat Stream] Error:', error)
      try {
        await sendEvent({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          status: 500,
        })
        await sendEvent('[DONE]')
        await writer.close()
      } catch {
        // Writer may already be closed
      }
    }
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
